import { ARPlacementService } from "./ARPlacementService.js";
import { ARReticleController } from "./ARReticleController.js";
import { ARPlacementDebug } from "./ARPlacementDebug.js";
import { ARReticleValidityController } from "./ARReticleValidityController.js";
import { ARPlacementSessionController } from "./ARPlacementSessionController.js";
import { ARPlacementFrameController } from "./ARPlacementFrameController.js";
import { ARModelPlacer } from "./ARModelPlacer.js";

export class ARPlacementDetection {
  constructor(core, options = {}) {
    this.core = core;

    // Opzioni di comportamento ad alto livello del placement.
    this.autoPlaceOnFirstValid = options.autoPlaceOnFirstValid ?? false;
    this.allowTapPlacement = options.allowTapPlacement ?? true;
    this.hideModelUntilPlacement = options.hideModelUntilPlacement ?? true;
    this.debugRelaxed = options.debugRelaxed ?? false;

    // Componenti specializzati:
    // - service: regole di validazione hit/reticle
    // - reticleCtrl: rendering e stato reticle
    // - session/frame: lifecycle e loop per-frame
    this.service = new ARPlacementService(options);
    this.reticleCtrl = new ARReticleController(this.core.scene);
    this.debugUI = new ARPlacementDebug();
    this.reticleValidity = new ARReticleValidityController(options);
    this.modelPlacer = new ARModelPlacer();

    // Stato condiviso tra controller sessione/frame.
    this.state = {
      lastValidHit: null,
      hasPlacedModel: false,
      debugFrameCount: 0,
    };

    this.instanceId = Math.random().toString(16).slice(2, 8);

    this.onSessionStart = this.onSessionStart.bind(this);
    this.onSessionEnd = this.onSessionEnd.bind(this);
    this.onSelect = this.onSelect.bind(this);

    this.session = new ARPlacementSessionController({
      core: this.core,
      allowTapPlacement: this.allowTapPlacement,
      onSelect: this.onSelect,
    });

    this.frame = new ARPlacementFrameController({
      core: this.core,
      service: this.service,
      reticleCtrl: this.reticleCtrl,
      reticleValidity: this.reticleValidity,
      modelPlacer: this.modelPlacer,
      debug: (msg) => this.debug(msg),
      debugRelaxed: this.debugRelaxed,
      state: this.state,
    });

    this.core.renderer.xr.addEventListener("sessionstart", this.onSessionStart);
    this.core.renderer.xr.addEventListener("sessionend", this.onSessionEnd);
  }

  get hitTestSource() {
    return this.session.hitTestSource;
  }

  get referenceSpace() {
    return this.session.referenceSpace;
  }

  get viewerSpace() {
    return this.session.viewerSpace;
  }

  get isReady() {
    return this.session.isReady;
  }

  get isStarting() {
    return this.session.isStarting;
  }

  get ignoreSelectUntil() {
    return this.session.ignoreSelectUntil;
  }

  get lastValidHit() {
    return this.state.lastValidHit;
  }

  get hasPlacedModel() {
    return this.state.hasPlacedModel;
  }

  debug(msg) {
    this.debugUI.write(msg);
  }

  resetReticleValidationState() {
    this.reticleValidity.reset();
  }

  getReticleWorldPosition(out) {
    return this.frame.getReticleWorldPosition(out);
  }

  async onSessionStart() {
    // Guard: se non esiste sessione XR non possiamo inizializzare hit-test.
    const session = this.core.renderer.xr.getSession?.();
    if (!session) return;
    await this.start(session);
  }

  onSessionEnd() {
    this.stop();
  }

  async start(session) {
    try {
      // start() puo essere chiamato piu volte, la guardia sta nel session controller.
      const started = await this.session.start(session);
      if (!started) return;

      // Reset stato placement all'inizio sessione.
      this.state.hasPlacedModel = false;
      this.state.lastValidHit = null;
      this.state.debugFrameCount = 0;
      this.resetReticleValidationState();

      // In AR possiamo nascondere il modello finche non viene piazzato.
      if (this.hideModelUntilPlacement && this.core.modelRoot) {
        this.core.modelRoot.visible = false;
      }

      this.debug(`placement ready (inst ${this.instanceId})`);
    } catch (err) {
      console.warn("[ARPlacementDetection] start failed", err);
      this.stop();
    }
  }

  stop() {
    // Stop idempotente: pulisce sempre sessione + stato visuale.
    this.session.stop();
    this.frame.resetState();
    this.reticleCtrl.hide();
    this.service.reset();

    // In uscita AR mostriamo di nuovo il modello nel viewer.
    if (this.core.modelRoot) {
      this.core.modelRoot.visible = true;
    }
  }

  update(frame) {
    // Guardia principale: niente update finche sessione/hit-test non sono pronti.
    if (!this.session.canUpdate(frame)) return;

    this.frame.update(frame, {
      referenceSpace: this.referenceSpace,
      hitTestSource: this.hitTestSource,
    });
  }

  onSelect() {
    // Se gia piazzato, ignore.
    if (this.hasPlacedModel) return;

    this.debug(`select -> place (inst ${this.instanceId})`);
    // Debounce iniziale per evitare trigger accidentali appena entra AR.
    if (performance.now() < this.ignoreSelectUntil) return;
    this.placeModel();
  }

  placeModel() {
    const result = this.frame.placeModel();
    if (!result.ok) {
      this.debug(`place skipped: ${result.reason}`);
      return false;
    }

    return true;
  }

  getLastValidHitTrasformMatrix() {
    return this.lastValidHit?.transform?.matrix ?? null;
  }

  dispose() {
    this.stop();
    this.core.renderer.xr.removeEventListener("sessionstart", this.onSessionStart);
    this.core.renderer.xr.removeEventListener("sessionend", this.onSessionEnd);
    this.reticleCtrl.dispose();
  }
}
