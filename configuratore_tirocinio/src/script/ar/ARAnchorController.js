// ARAnchorController.js
import * as THREE from "three";

export class ARAnchorController {
  constructor(core) {
    this.core = core;                         // ViewerCore (renderer, camera, modelRoot)

    //stato XR
    this.session = null;
    this.refSpace = null;

    //anchor state
    this.anchor = null;        // XRAnchor
    this.anchorSpace = null;   // XRSpace

    // temp
    this._tmpM4 = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();

    // policy: vuoi mantenere un offset Y (es: +5cm) dopo l’ancoraggio?
    // nel tuo gestures tu usi heightOffset=0.05 durante pan :contentReference[oaicite:5]{index=5}
    this.keepYOffset = 0.0; // metti 0.05 se vuoi
  }

  //chiamala su sessionstart dopo che placement ha creato referenceSpace
  attachToCurrentSession() {
    // Aggancio lazy alla sessione corrente: utile se il controller nasce prima della sessione.
    const s = this.core?.renderer?.xr?.getSession?.();
    const rs = this.core?.renderer?.xr?.getReferenceSpace?.();

    this.session = s || null;
    this.refSpace = rs || null;

    //se manca qualcosa, niente anchors
    return !!(this.session && this.refSpace);
  }

  // chiamala su sessionend / stop
  detach() {
    // Stacca completamente anchor + riferimenti session/refSpace.
    this.clearAnchor();
    this.session = null;
    this.refSpace = null;
  }

  // true se stai effettivamente seguendo un anchor
  isAnchored() {
    return !!this.anchorSpace;
  }

  // per evitare che l’anchor “tiri indietro” mentre fai pan
  suspendAnchoring() {
    // Usato durante gesture: evita che l'anchor "trascini indietro" il modello.
    this.clearAnchor();
  }

  // crea anchor dal "lastValidHit" usato dal tuo placement (prima posa)
  async anchorFromLastValidHit(frame, lastvalidHit) {
    // (12) prerequisiti
    if (!frame) return false;
    if (!this.refSpace) this.attachToCurrentSession();
    if (!this.refSpace) return false;

    const hit = lastvalidHit; // :contentReference[oaicite:6]{index=6}
    if (!hit) return false;

    //se l'hit supporta createAnchor -> top
    if (typeof hit.createAnchor === "function") {
      try {
        // Path preferito: anchor creato direttamente dalla hit XR.
        this.clearAnchor();
        const a = await hit.createAnchor();
        this.anchor = a;
        this.anchorSpace = a.anchorSpace;
        return true;
      } catch (e) {
        //fallback: niente anchor
        this.clearAnchor();
        return false;
      }
    }

    //fallback: prova createAnchor via frame (più raro / non sempre supportato)
    try {
      const pose = hit.getPose(this.refSpace);
      if (!pose) return false;

      if (typeof frame.createAnchor === "function") {
        this.clearAnchor();
        const a = await frame.createAnchor(pose.transform, this.refSpace);
        this.anchor = a;
        this.anchorSpace = a.anchorSpace;
        return true;
      }
    } catch (e) {}

    return false;
  }

  // crea anchor dalla posizione attuale dell’oggetto (utile a fine pan)
  async anchorFromObjectPose(frame, object3D = null) {
    // Crea anchor dalla posa corrente dell'oggetto (tipico "commit" dopo pan).
    if (!frame) return false;
    if (!this.refSpace) this.attachToCurrentSession();
    if (!this.refSpace) return false;

    const obj = object3D || this.core?.modelRoot; // :contentReference[oaicite:7]{index=7}
    if (!obj) return false;

    // ricavo una XRRigidTransform equivalente dalla matrixWorld
    obj.updateMatrixWorld(true);
    obj.matrixWorld.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);

    // applica eventuale offset Y voluto (es. +5cm post-ancoraggio)
    if (this.keepYOffset) this._tmpPos.y += this.keepYOffset;

    // createAnchor da frame (se supportato)
    if (typeof frame.createAnchor !== "function") return false;

    try {
      this.clearAnchor();
      // Conversione da trasformazione Three.js a XRRigidTransform WebXR.
      const transform = new XRRigidTransform(
        { x: this._tmpPos.x, y: this._tmpPos.y, z: this._tmpPos.z },
        { x: this._tmpQuat.x, y: this._tmpQuat.y, z: this._tmpQuat.z, w: this._tmpQuat.w }
      );
      const a = await frame.createAnchor(transform, this.refSpace);
      this.anchor = a;
      this.anchorSpace = a.anchorSpace;
      return true;
    } catch (e) {
      this.clearAnchor();
      return false;
    }
  }

  // update per-frame: se c’è anchor, “segue” l’anchor
  update(frame, object3D = null) {
    // Segue l'anchor ogni frame applicando matrix/pose all'oggetto target.
    if (!frame) return;
    if (!this.anchorSpace || !this.refSpace) return;

    const obj = object3D || this.core?.modelRoot;
    if (!obj) return;

    const pose = frame.getPose(this.anchorSpace, this.refSpace);
    if (!pose) return;

    // applica matrix dell’anchor
    this._tmpM4.fromArray(pose.transform.matrix);
    obj.matrix.copy(this._tmpM4);
    obj.matrix.decompose(obj.position, obj.quaternion, this._tmpScale);
  }

  // cleanup anchor
  clearAnchor() {
    // Delete protetto: alcuni runtime possono lanciare eccezioni.
    try {
      this.anchor?.delete?.();
    } catch (e) {}
    this.anchor = null;
    this.anchorSpace = null;
  }
}
