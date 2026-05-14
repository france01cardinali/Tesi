export class ARPlacementSessionController {
  constructor({ core, allowTapPlacement, onSelect }) {
    this.core = core;
    this.allowTapPlacement = allowTapPlacement;
    this.onSelect = onSelect;

    // Risorse WebXR create all'avvio sessione.
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.viewerSpace = null;

    // Guardie di stato:
    // - isReady evita update prima del setup completo.
    // - isStarting evita doppi start concorrenti.
    this.isReady = false;
    this.isStarting = false;

    // Finestra anti-tap iniziale: ignora select subito dopo session start.
    this.ignoreSelectUntil = 0;
    this.boundSession = null;
  }

  async start(session) {
    // Guard: se la sessione e gia pronta o sta partendo, non ripetere init.
    if (this.isReady || this.isStarting) return false;
    this.isStarting = true;

    try {
      try {
        // Preferiamo local-floor: origine piu stabile rispetto al pavimento.
        this.referenceSpace = await session.requestReferenceSpace("local-floor");
      } catch {
        // Fallback robusto per device che non supportano local-floor.
        this.referenceSpace = await session.requestReferenceSpace("local");
      }

      // viewer space serve per creare hit test dal punto di vista camera.
      this.viewerSpace = await session.requestReferenceSpace("viewer");
      this.hitTestSource = await session.requestHitTestSource({
        space: this.viewerSpace,
      });

      // Evita che il primo "tap fantasma" piazzi subito il modello.
      this.ignoreSelectUntil = performance.now() + 800;
      this.boundSession = session;

      // Tap placement opzionale: listener registrato solo se richiesto.
      if (this.allowTapPlacement) {
        session.addEventListener("select", this.onSelect);
      }

      this.isReady = true;
      return true;
    } finally {
      // Sempre riportato a false anche se fallisce una richiesta async.
      this.isStarting = false;
    }
  }

  stop() {
    // Usa la sessione bindata in start; fallback alla sessione XR corrente.
    const session = this.boundSession ?? this.core.renderer.xr.getSession?.();
    if (session && this.allowTapPlacement) {
      session.removeEventListener("select", this.onSelect);
    }

    this.boundSession = null;

    // Cleanup risorse hit-test.
    this.hitTestSource?.cancel?.();
    this.hitTestSource = null;
    this.referenceSpace = null;
    this.viewerSpace = null;
    this.isReady = false;
  }

  canUpdate(frame) {
    // Guardie runtime: update valido solo con sessione XR attiva e risorse pronte.
    if (!this.core.renderer.xr.isPresenting) return false;
    if (!frame) return false;
    if (!this.isReady) return false;
    if (!this.referenceSpace) return false;
    if (!this.hitTestSource) return false;
    return true;
  }
}
