import * as THREE from "three";

export class ARModelPlacer {
  constructor() {
    this.tmpReticlePos = new THREE.Vector3();
    this.tmpOffsetLocal = new THREE.Vector3();
    this.tmpOffsetWorld = new THREE.Vector3();
    this.tmpReticleQuat = new THREE.Quaternion();
    this.tmpBox = new THREE.Box3();
  }

  place({ lastValidHit, modelRoot}) {
    // Guardie: placement possibile solo con hit valida e modelRoot disponibile.
    if (!lastValidHit) {
      return { ok: false, reason: "no valid hit" };
    }
    if (!modelRoot) {
      return { ok: false, reason: "no modelRoot" };
    }

    

    // Centro locale del footprint reticle (utile per modelli non centrati).
    const centerXLocal = Number.isFinite(reticleCtrl?.reticleCenterX) ? reticleCtrl.reticleCenterX : 0;
    const centerZLocal = Number.isFinite(reticleCtrl?.reticleCenterZ) ? reticleCtrl.reticleCenterZ : 0;

    if (reticleCtrl?.reticle?.visible) {
      // Se il reticle e visibile, usa quella posa come sorgente prioritaria.
      getReticleWorldPosition(this.tmpReticlePos);
      targetCenterX = this.tmpReticlePos.x;
      targetCenterZ = this.tmpReticlePos.z;
      yFloor = this.tmpReticlePos.y;

      if (centerXLocal !== 0 || centerZLocal !== 0) {
        // Trasforma offset centro reticle da locale a world.
        this.tmpReticleQuat.setFromRotationMatrix(reticleCtrl.reticle.matrix);
        this.tmpOffsetLocal.set(centerXLocal, 0, centerZLocal);
        this.tmpOffsetWorld.copy(this.tmpOffsetLocal).applyQuaternion(this.tmpReticleQuat);
        targetCenterX += this.tmpOffsetWorld.x;
        targetCenterZ += this.tmpOffsetWorld.z;
      }
    }

    // Compensa anche con orientamento corrente del modelRoot.
    this.tmpOffsetLocal.set(centerXLocal, 0, centerZLocal);
    this.tmpOffsetWorld.copy(this.tmpOffsetLocal).applyQuaternion(modelRoot.quaternion);

    modelRoot.position.set(
      targetCenterX - this.tmpOffsetWorld.x,
      yFloor,
      targetCenterZ - this.tmpOffsetWorld.z
    );
    modelRoot.updateMatrixWorld(true);

    // "Snap to floor": alza/abbassa il modello in modo che il bbox.min.y tocchi yFloor.
    const box = this.tmpBox.setFromObject(modelRoot);
    const lift = yFloor - box.min.y;

    if (Number.isFinite(lift)) {
      modelRoot.position.y += lift;
      modelRoot.updateMatrixWorld(true);
    }

    return { ok: true };
  }
}
