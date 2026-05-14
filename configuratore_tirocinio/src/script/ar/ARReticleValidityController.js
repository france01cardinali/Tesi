import * as THREE from "three";

export class ARReticleValidityController {
  constructor(options = {}) {
    // Soglie per decidere quando rivalutare la validita del reticle.
    this.reticleRecheckMoveThreshold = options.reticleRecheckMoveThreshold ?? 0.01;
    this.reticleRecheckCamMoveThreshold = options.reticleRecheckCamMoveThreshold ?? 0.03;

    // Isteresi anti-flicker: richiede N frame coerenti prima di cambiare colore.
    this.reticleColorHysteresisFrames = options.reticleColorHysteresisFrames ?? 2;

    this.lastReticleEvalPos = new THREE.Vector3();
    this.lastCameraEvalPos = new THREE.Vector3();
    this.reset();
  }

  reset() {
    // Stato neutro: consideriamo valido fino a prime misure reali.
    this.reticleEvalInitialized = false;
    this.cameraEvalInitialized = false;
    this.lastReticleValid = true;
    this.reticleValidStreak = 0;
    this.reticleInvalidStreak = 0;
  }

  forceValidity(isValid) {
    // Forza immediatamente uno stato e pre-carica gli streak per evitare rimbalzi.
    this.lastReticleValid = !!isValid;
    if (this.lastReticleValid) {
      this.reticleValidStreak = this.reticleColorHysteresisFrames;
      this.reticleInvalidStreak = 0;
    } else {
      this.reticleInvalidStreak = this.reticleColorHysteresisFrames;
      this.reticleValidStreak = 0;
    }
  }

  getCurrentValidity() {
    return this.lastReticleValid;
  }

  shouldRecheck(reticle, camPos, outReticlePos) {
    // Guardie base.
    if (!reticle?.visible) return false;
    if (!outReticlePos) return false;

    const m = reticle.matrix.elements;
    outReticlePos.set(m[12], m[13], m[14]);

    const reticleMovedSq = this.reticleEvalInitialized
      ? outReticlePos.distanceToSquared(this.lastReticleEvalPos)
      : Infinity;
    const camMovedSq = this.cameraEvalInitialized
      ? camPos.distanceToSquared(this.lastCameraEvalPos)
      : Infinity;

    const reticleThresholdSq = this.reticleRecheckMoveThreshold * this.reticleRecheckMoveThreshold;
    const camThresholdSq = this.reticleRecheckCamMoveThreshold * this.reticleRecheckCamMoveThreshold;

    const reticleMoved = !this.reticleEvalInitialized || reticleMovedSq >= reticleThresholdSq;
    const camTranslated = !this.cameraEvalInitialized || camMovedSq >= camThresholdSq;

    // Se ne reticle ne camera si sono mossi abbastanza, evita nuova validazione.
    if (!reticleMoved && !camTranslated) return false;

    this.lastReticleEvalPos.copy(outReticlePos);
    this.lastCameraEvalPos.copy(camPos);
    this.reticleEvalInitialized = true;
    this.cameraEvalInitialized = true;
    return true;
  }

  applySample(isValid) {
    // Applica isteresi: cambia stato solo dopo streak minimo di campioni coerenti.
    if (isValid) {
      this.reticleValidStreak += 1;
      this.reticleInvalidStreak = 0;
      if (!this.lastReticleValid && this.reticleValidStreak >= this.reticleColorHysteresisFrames) {
        this.lastReticleValid = true;
      }
    } else {
      this.reticleInvalidStreak += 1;
      this.reticleValidStreak = 0;
      if (this.lastReticleValid && this.reticleInvalidStreak >= this.reticleColorHysteresisFrames) {
        this.lastReticleValid = false;
      }
    }

    return this.lastReticleValid;
  }
}
