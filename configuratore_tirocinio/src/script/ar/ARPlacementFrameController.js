import * as THREE from "three";

export class ARPlacementFrameController {
  constructor({
    core,
    service,
    reticleCtrl,
    reticleValidity,
    modelPlacer,
    debug,
    debugRelaxed,
    state,
  }) {
    this.core = core;
    this.service = service;
    this.reticleCtrl = reticleCtrl;
    this.reticleValidity = reticleValidity;
    this.modelPlacer = modelPlacer;
    this.debug = debug;
    this.debugRelaxed = debugRelaxed;
    this.state = state;

    this.tmpCamPos = new THREE.Vector3();
    this.tmpReticlePos = new THREE.Vector3();
  }

  resetState() {
    // Reset completo stato runtime quando sessione finisce o viene riavviata.
    this.state.lastValidHit = null;
    this.state.hasPlacedModel = false;
    this.state.debugFrameCount = 0;
    this.reticleValidity.reset();
  }

  getReticleWorldPosition(out) {
    const matrixElements = this.reticleCtrl.reticle.matrix.elements;
    out.set(matrixElements[12], matrixElements[13], matrixElements[14]);
    return out;
  }

  update(frame, { referenceSpace, hitTestSource }) {
    // Guardia: dopo il placement, se reticle e nascosto non serve continuare.
    if (this.state.hasPlacedModel && !this.reticleCtrl.reticle.visible) {
      return;
    }

    const results = frame.getHitTestResults(hitTestSource);
    // Nessuna hit: lascia stato coerente e aggiorna solo validita linea.
    if (!results?.length) {
      this._handleNoHits();
      return;
    }

    // Primo placement: scegli il best hit e imposta reticle.
    if (!this.state.hasPlacedModel) {
      this._firstPlaceReticle(results, referenceSpace);
      this.reticleValidity.forceValidity(true);
      this.reticleCtrl.setLineInvalid(false);
      return;
    }

    // Dopo il primo placement: rivalida posizione reticle solo quando serve.
    this._setCameraWorldPosition();
    if (this.reticleValidity.shouldRecheck(this.reticleCtrl?.reticle, this.tmpCamPos, this.tmpReticlePos)) {
      const isValid = this._checkReticlePosition(results, referenceSpace, this.tmpCamPos);
      const isReticleValid = this.reticleValidity.applySample(isValid);
      this.reticleCtrl.setLineInvalid(!isReticleValid);
    } else {
      this.reticleCtrl.setLineInvalid(!this.reticleValidity.getCurrentValidity());
    }

    this._debugSample(
      `retVis=${this.reticleCtrl.reticle.visible} hasLine=${!!this.reticleCtrl.reticleLine}`
    );
  }

  placeModel() {
    // ARModelPlacer contiene la logica geometrica di commit posizione finale.
    const result = this.modelPlacer.place({
      lastValidHit: this.state.lastValidHit,
      modelRoot: this.core.modelRoot,
      reticleCtrl: this.reticleCtrl,
      getReticleWorldPosition: (out) => this.getReticleWorldPosition(out),
    });

    if (!result.ok) return result;

    // Una volta piazzato rendiamo visibile il modello se era nascosto.
    if (this.core.modelRoot) {
      this.core.modelRoot.visible = true;
    }

    // Stato "placed": reset validatore e nascondi reticle.
    this.state.hasPlacedModel = true;
    this.reticleValidity.reset();
    this.reticleCtrl.hide();
    return result;
  }

  _setCameraWorldPosition() {
    const xrCam = this.core.renderer.xr.getCamera(this.core.camera);
    this.tmpCamPos.setFromMatrixPosition(xrCam.matrixWorld);
  }

  _handleNoHits() {
    // Senza hit attive, non abbiamo candidata valida corrente.
    this.state.lastValidHit = null;

    if (this.state.hasPlacedModel && this.reticleCtrl.reticle.visible) {
      this._setCameraWorldPosition();
      // Se siamo in pan con reticle visibile, invalidiamo gradualmente la linea.
      if (this.reticleValidity.shouldRecheck(this.reticleCtrl?.reticle, this.tmpCamPos, this.tmpReticlePos)) {
        const isReticleValid = this.reticleValidity.applySample(false);
        this.reticleCtrl.setLineInvalid(!isReticleValid);
      } else {
        this.reticleCtrl.setLineInvalid(!this.reticleValidity.getCurrentValidity());
      }
    } else {
      this.reticleCtrl.hide();
    }

    this._debugSample("debug: hits=0");
  }

  _firstPlaceReticle(results, referenceSpace) {
    this._setCameraWorldPosition();
    // Allinea dimensione rettangolo reticle all'ingombro attuale modello.
    this.reticleCtrl.syncWithModel(this.core.modelRoot);

    const best = this.service.selectBest(results, referenceSpace, this.tmpCamPos);
    if (!best) {
      this.state.lastValidHit = null;
      this.reticleCtrl.hide();
      this._debugSample(`debug: hits=${results.length}, valid=0`);
      return;
    }

    this.state.lastValidHit = best;
    // Aggiorna floor estimate con la hit accettata.
    this.service.acceptBest(best);
    this.reticleCtrl.setPoseFromArray(best.transform.matrix);
  }

  _checkReticlePosition(results, referenceSpace, camPos = null) {
    const evalCamPos = camPos ?? this.tmpCamPos;
    if (!camPos) this._setCameraWorldPosition();

    // Usa la pipeline di validazione "reticle anchored".
    const validHit = this.service.checkReticlePosition(
      results,
      this.reticleCtrl.reticle,
      referenceSpace,
      evalCamPos
    );

    if (validHit) {
      this.state.lastValidHit = validHit;
      return true;
    }

    return false;
  }

  _debugSample(message) {
    // Log campionato per non saturare il debug overlay ogni frame.
    if (!this.debugRelaxed) return;
    this.state.debugFrameCount += 1;
    if (this.state.debugFrameCount % 20 === 0) {
      this.debug(message);
    }
  }
}
