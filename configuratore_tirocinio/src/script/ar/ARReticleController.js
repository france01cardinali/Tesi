import * as THREE from "three";

export class ARReticleController {
  constructor(scene) {
    this.scene = scene;
    this.tmpMat = new THREE.Matrix4(); // Matrice temporanea riusata.
    this.reticleLine = null;
    this.reticleSizeX = 0;
    this.reticleSizeZ = 0;
    this.isLineInvalid = false;

    // crea materiale linea verde/rosso
    // Materiali linea reticle: verde valido, rosso invalido.
    this.reticleLineMatGreen = new THREE.LineBasicMaterial({
      color: 0x00b838,
      transparent: true,
      opacity: 0.95, 
      depthTest: false,
    
    });

    this.reticleLineMatRed = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.95, 
      depthTest: false,
    });

    // fornisce direttamente reticle.matrix (in update)
    // Group "reticle": viene guidato direttamente via matrice (no auto-update).
    this.reticle = new THREE.Group();
    this.reticle.matrixAutoUpdate = false;

    this.reticle.visible = false;
    this.scene.add(this.reticle);
    this.reticle.frustumCulled = false;
    this.reticle.renderOrder = 10000;
    this.reticleLineMatGreen.depthTest = false;
    this.reticleLineMatGreen.depthWrite = false;
    this.reticleLineMatRed.depthTest = false;
    this.reticleLineMatRed.depthWrite = false;


     this.reticleCenterX = 0;
     this.reticleCenterZ = 0;
 
     // temp per evitare allocazioni continue
     // Temp riusati in syncWithModel per evitare allocazioni per-frame.
     this._tmpBox = new THREE.Box3();
     this._tmpMin = new THREE.Vector3();
     this._tmpMax = new THREE.Vector3();
     this._tmpP = new THREE.Vector3();
     this._tmpScale = new THREE.Vector3();
    this._tmpTR = new THREE.Matrix4();
    this._tmpInvTR = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpEuler = new THREE.Euler();
    this._one = new THREE.Vector3(1, 1, 1);
  }

  get visible() {
    return this.reticle.visible;
  }

  hide() {
    this.reticle.visible = false;
  }

  setLineInvalid(isInvalid) {
    // Stato visuale della linea rettangolo in base alla validita corrente.
    this.isLineInvalid = !!isInvalid;
    if (!this.reticleLine) return;

    const nextMaterial = this.isLineInvalid
      ? this.reticleLineMatRed
      : this.reticleLineMatGreen;

    if (this.reticleLine.material !== nextMaterial) {
      this.reticleLine.material = nextMaterial;
    }
  }

  setPoseFromArray(matrixArray) {
    // Pose ricevuta da WebXR hit-test (matrix 4x4 in world space).
    this.tmpMat.fromArray(matrixArray);
    this.reticle.matrix.copy(this.tmpMat);
    
    this.reticle.matrixWorldNeedsUpdate = true;

    this.reticle.visible = true;
  }

  setPoseFromObjectNoScale(obj) {
    obj.updateMatrixWorld(true);
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    obj.matrixWorld.decompose(pos, quat, scl);

    this.reticle.matrix.compose(pos, quat, new THREE.Vector3(1,1,1));
    this.reticle.visible = true;
  }
/* 
  //reticle grande quanto il modello, per far vedere un rettangolo coerente con l'ingombro del modello
  syncWithModel(modelRoot) {
    //valori di default
    let sx = 0.3;
    let sz = 0.3;

    //se esite:
      //bounding box e size
      //aggiorna sx/sz da size.x e size.z
    if (modelRoot) {
      modelRoot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(modelRoot);
      const size = box.getSize(new THREE.Vector3());
      if (Number.isFinite(size.x) && size.x > 0.001) sx = size.x;
      if (Number.isFinite(size.z) && size.z > 0.001) sz = size.z;
    }

    // Stabilizza i rebuild evitando oscillazioni minime floating point.
    //quantizza a 1mm per evitare rebuild continui
    const qx = Math.round(sx * 1000) / 1000;
    const qz = Math.round(sz * 1000) / 1000;
    if (Math.abs(qx - this.reticleSizeX) < 1e-6 && Math.abs(qz - this.reticleSizeZ) < 1e-6) {
      return;
    }

    this.reticleSizeX = qx;
    this.reticleSizeZ = qz;

    //se la dimansione è cambiata:
      //1) rimuove la vecchia lineloop
    if (this.reticleLine) {
      this.reticle.remove(this.reticleLine);
      this.reticleLine.geometry.dispose();
      this.reticleLine = null;
    }

    const hx = qx * 0.5;
    const hz = qz * 0.5;
    const y = 0.01;

    //2) crea 4 punti del rettangolo a Y=0.01
    const pts = [
      new THREE.Vector3(-hx, y, -hz),
      new THREE.Vector3(hx, y, -hz),
      new THREE.Vector3(hx, y, hz),
      new THREE.Vector3(-hx, y, hz),
    ];

    //3) crea BufferGeometry e lineLoop
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    this.reticleLine = new THREE.LineLoop(geom, this.reticleLineMat);
    /* this.reticleLine.frustumCulled = false;
    this.reticleLine.renderOrder = 10000; 
    //4) aggiunge al reticle group
    this.reticle.add(this.reticleLine);
  }

 */



 syncWithModel(modelRoot) {
  // Ricostruisce il rettangolo reticle sulla base dell'ingombro reale del modello.
  // Obiettivo: avere un footprint coerente con mesh e scala correnti.
  // default
  let sx = 0.3, sz = 0.3, cx = 0.0, cz = 0.0;
  let hasMesh = false;

  if (modelRoot) {
    modelRoot.updateMatrixWorld(true);

    // Costruisco inv(TR): rimuove traslazione+rotazione del root, MA mantiene la scala
    // Costruisco inv(TR): rimuove traslazione+rotazione del root, ma mantiene scala.
    modelRoot.matrixWorld.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);
    this._tmpTR.compose(this._tmpPos, this._tmpQuat, this._one);
    this._tmpInvTR.copy(this._tmpTR).invert();

    this._tmpMin.set(+Infinity, +Infinity, +Infinity);
    this._tmpMax.set(-Infinity, -Infinity, -Infinity);

    // bounds reali: unisco le bbox delle mesh
    // Bounds reali: unisco bounding box mesh in spazio root "stabilizzato".
    modelRoot.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      hasMesh = true;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      if (!bb) return;

      const xs = [bb.min.x, bb.max.x];
      const ys = [bb.min.y, bb.max.y];
      const zs = [bb.min.z, bb.max.z];

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          for (let k = 0; k < 2; k++) {
            this._tmpP.set(xs[i], ys[j], zs[k]);

            // mesh local -> world
            this._tmpP.applyMatrix4(o.matrixWorld);

            // world -> spazio root "senza rotazione/traslazione" (ma con scala)
            // world -> spazio root senza T/R (ma con scala).
            this._tmpP.applyMatrix4(this._tmpInvTR);

            this._tmpMin.min(this._tmpP);
            this._tmpMax.max(this._tmpP);
          }
        }
      }
    });

    if (hasMesh) {
      const sizeX = this._tmpMax.x - this._tmpMin.x;
      const sizeZ = this._tmpMax.z - this._tmpMin.z;

      if (Number.isFinite(sizeX) && sizeX > 0.001) sx = sizeX;
      if (Number.isFinite(sizeZ) && sizeZ > 0.001) sz = sizeZ;

      cx = (this._tmpMin.x + this._tmpMax.x) * 0.5;
      cz = (this._tmpMin.z + this._tmpMax.z) * 0.5;
      if (!Number.isFinite(cx)) cx = 0;
      if (!Number.isFinite(cz)) cz = 0;
    }
  }

  // quantizza a 1mm
  // Quantizzazione a 1mm: evita rebuild continui da floating point noise.
  const qx = Math.round(sx * 1000) / 1000;
  const qz = Math.round(sz * 1000) / 1000;
  const qcx = Math.round(cx * 1000) / 1000;
  const qcz = Math.round(cz * 1000) / 1000;

  if (
    Math.abs(qx - this.reticleSizeX) < 1e-6 &&
    Math.abs(qz - this.reticleSizeZ) < 1e-6 &&
    Math.abs(qcx - this.reticleCenterX) < 1e-6 &&
    Math.abs(qcz - this.reticleCenterZ) < 1e-6
  ) return;

  this.reticleSizeX = qx;
  this.reticleSizeZ = qz;
  this.reticleCenterX = qcx;
  this.reticleCenterZ = qcz;

  if (this.reticleLine) {
    this.reticle.remove(this.reticleLine);
    this.reticleLine.geometry.dispose();
    this.reticleLine = null;
  }

  const hx = qx * 0.5;
  const hz = qz * 0.5;
  const y = 0.001; // Quasi a terra per ridurre z-fighting.

  const pts = [
    new THREE.Vector3(qcx - hx, y, qcz - hz),
    new THREE.Vector3(qcx + hx, y, qcz - hz),
    new THREE.Vector3(qcx + hx, y, qcz + hz),
    new THREE.Vector3(qcx - hx, y, qcz + hz),
  ];

  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const lineMaterial = this.isLineInvalid
    ? this.reticleLineMatRed
    : this.reticleLineMatGreen;
  this.reticleLine = new THREE.LineLoop(geom, lineMaterial);
  this.reticle.add(this.reticleLine);
}



setPanPoseFromObject(obj, yLocked) {
  obj.updateMatrixWorld(true);

  obj.matrixWorld.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);

  // vogliamo reticle piatto: solo yaw (rotazione attorno a Y)
  // Reticle sempre piatto: conserva solo yaw (rotazione attorno a Y).
  this._tmpEuler.setFromQuaternion(this._tmpQuat, "YXZ");
  this._tmpEuler.x = 0;
  this._tmpEuler.z = 0;
  this._tmpQuat.setFromEuler(this._tmpEuler);

  // Y bloccata al piano pan (prima del +5cm)
  // Y bloccata al piano pan.
  this._tmpPos.y = yLocked;

  // niente scala sul reticle (la dimensione la gestisci con la geometria)
  // Niente scala sul reticle: la dimensione sta nella geometria rettangolo.
  this.reticle.matrix.compose(this._tmpPos, this._tmpQuat, this._one);
  this.reticle.visible = true;
}

















  dispose() {
    // rimuove reticle dalla scena
    // Cleanup geometria/materiali reticle.
    this.scene.remove(this.reticle);
    if (this.reticleLine) {
      this.reticleLine.geometry.dispose();
      this.reticleLine = null;
    }
    this.reticleLineMatGreen.dispose(); //pulisce geometria
    this.reticleLineMatRed.dispose(); //pulisce geometria

  }




}

