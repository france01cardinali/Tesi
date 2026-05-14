// ARGestures.js
import * as THREE from "three";


export class ARGestures {
  constructor(core) {
    this.core = core;
    this.el = core.renderer.domElement;
    this.enabled = false;

    this.target = null;
    this.targetRot = null;
    this.onTap = null;

    this._activePointers = new Map();
    this.active = false;
    this.mode = null; // "rotate" | "pan"

    // Rotate state
    this.lastX = 0;
    this.lastY = 0;

    // Pan state
    this.panLastCenterX = 0;
    this.panLastCenterY = 0;
    this.panPlaneY = 0;
    this.panSpeed = 0.0015; // world meters per screen pixel
    this.heightOffset = 0.05;
    this.yAcceptError = 0.01;
    this.initialPosition = new THREE.Vector3();
    this.lastPanReticlePos = new THREE.Vector3();

    // Reused vectors
    this.right = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.worldUp = new THREE.Vector3(0, 1, 0);

    // Tap state
    this.tapStartX = 0;
    this.tapStartY = 0;
    this.tapStartTime = 0;
    this.tapMoved = false;
    this.tapMaxMovePx = 10;
    this.tapMaxDurationMs = 280;

    this.debugEl = document.querySelector("#gesture-debug");

    this.placementDetection;
    this.reticleCtrl;
    this.anchorCtrl = null;
    this.onAnchorResumeRequested = null;
    this._anchorSuspendedByGesture = false;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
  }





  setTarget(posObj3d, rotObj3d = posObj3d) {
    // target: oggetto traslato durante pan; targetRot: oggetto ruotato su rotate.
    this.target = posObj3d;
    this.targetRot = rotObj3d;
  }

  setPlacementDetection(pd){
    // Recupera reticle controller dal modulo placement.
    this.placementDetection = pd;
    this.reticleCtrl = this.placementDetection.reticleCtrl;
  }

  setAnchorController(anchorCtrl) {
    this.anchorCtrl = anchorCtrl;
  }

  setOnAnchorResumeRequested(callback) {
    this.onAnchorResumeRequested = callback;
  }







  setInputElement(nextEl) {
    if (!nextEl || nextEl === this.el) return;
    const wasEnabled = this.enabled;
    if (wasEnabled) this.detachListeners();
    this.el = nextEl;
    if (wasEnabled) this.attachListeners();
  }






  enable() {
    // Idempotente: evita doppia registrazione listeners.
    if (this.enabled) return;
    this.enabled = true;
    this.attachListeners();
  }





  dispose() {
    // Cleanup completo stato gesture.
    if (!this.enabled) return;
    this.enabled = false;
    this.detachListeners();
    this._activePointers.clear();
    this.active = false;
    this.mode = null;
    this._anchorSuspendedByGesture = false;
  }





  attachListeners() {
    // Avoid browser scroll/zoom gestures on input surface.
    this.el.style.touchAction = "none";
    this.el.addEventListener("pointerdown", this.onPointerDown);
    this.el.addEventListener("pointermove", this.onPointerMove);
    this.el.addEventListener("pointerup", this.onPointerUp);
    this.el.addEventListener("pointercancel", this.onPointerCancel);

  }




  detachListeners() {
    this.el.removeEventListener("pointerdown", this.onPointerDown);
    this.el.removeEventListener("pointermove", this.onPointerMove);
    this.el.removeEventListener("pointerup", this.onPointerUp);
    this.el.removeEventListener("pointercancel", this.onPointerCancel);

  }





  debug(msg) {
    if (!this.debugEl) return;
    this.debugEl.textContent = msg;
  }

  suspendAnchorIfNeeded() {
    // Durante gesto, sospende temporaneamente anchor follow.
    if (this._anchorSuspendedByGesture) return;
    this.anchorCtrl?.suspendAnchoring?.();
    this._anchorSuspendedByGesture = true;
  }

  requestAnchorResumeIfNeeded() {
    // A fine gesto, richiede re-anchor tramite coordinator esterno.
    if (!this._anchorSuspendedByGesture) return;
    this._anchorSuspendedByGesture = false;
    this.onAnchorResumeRequested?.();
  }





  // ---- handlers ----
  onPointerDown(e) {
    // Manteniamo mappa pointer attivi per distinguere 1 dito (rotate) da 2+ (pan).
    this.el.setPointerCapture?.(e.pointerId);
    this._activePointers.set(e.pointerId, e);
    this.active = true;

    const pointers = this.getPointers();
    if (pointers.length === 1) {
      this.startRotate(pointers[0]);
      return;
    }

    if (pointers.length >= 2) {
      this.startPan(pointers);
    }
  }





  onPointerMove(e) {
    // Se non c'e un gesto attivo, ignora.
    if (!this.active) return;
    if (this._activePointers.has(e.pointerId)) {
      this._activePointers.set(e.pointerId, e);
    }
    if (!this.target) return;

    const pointers = this.getPointers();
    if (this.mode === "rotate" && pointers.length === 1) {
      this.handleRotateMove(pointers[0]);
      return;
    }

    if (this.mode === "pan" && pointers.length >= 2) {
      this.handlePanMove(pointers);
    }
  }




  onPointerUp(e) {
    this.handlePointerEnd(e, true);
  }




  onPointerCancel(e) {
    this.handlePointerEnd(e, false);
  }




  // ---- state transitions ----
  startRotate(pointer) {
    // Rotate mode: memorizza stato tap/move iniziale.
    this.mode = "rotate";
    this.lastX = pointer.clientX;
    this.lastY = pointer.clientY;
    this.tapStartX = pointer.clientX;
    this.tapStartY = pointer.clientY;
    this.tapStartTime = performance.now();
    this.tapMoved = false;
    this.reticleCtrl.hide();
  }




  startPan(pointers) {
    // Pan mode: fissa quota di pan e posizione iniziale.
    this.mode = "pan";
    const c = this.getCenter(pointers);
    this.panLastCenterX = c.x;
    this.panLastCenterY = c.y;
    this.tapMoved = true;

    if (!this.target) return;
    this.panPlaneY = this.target.position.y;
    this.initialPosition.copy(this.target.position);

    // Keep a valid fallback commit position even if no pointermove is fired.
    this.lastPanReticlePos.copy(this.target.position);
    this.lastPanReticlePos.y = this.panPlaneY;
  }




  //andler rotazione
  handleRotateMove(pointer) {
    // Guard: gesture rotate valida solo durante sessione XR.
    if (!this.core.renderer.xr.isPresenting) return;
    this.suspendAnchorIfNeeded();

    const dx = pointer.clientX - this.lastX;
    this.lastX = pointer.clientX;
    this.lastY = pointer.clientY;

    const moved = Math.hypot(
      pointer.clientX - this.tapStartX,
      pointer.clientY - this.tapStartY
    );
    if (moved > this.tapMaxMovePx) this.tapMoved = true;

    this.targetRot.rotation.y += dx * 0.01;
  }





  //handler movimento con pan
  handlePanMove(pointers) {
    // Guard: gesture pan valida solo in XR.
    if (!this.core.renderer.xr.isPresenting) return;
    this.suspendAnchorIfNeeded();

    const reticleRefObj = this.targetRot || this.target;
    this.reticleCtrl?.syncWithModel(reticleRefObj);
    this.reticleCtrl?.setPanPoseFromObject(reticleRefObj, this.panPlaneY);

    // Keep model at chosen pan height policy.
    // Mantieni il modello alla quota pan scelta (+ offset se desiderato).
    this.target.position.y = this.panPlaneY + this.heightOffset;

    const c = this.getCenter(pointers);
    const dx = c.x - this.panLastCenterX;
    const dy = c.y - this.panLastCenterY;
    this.panLastCenterX = c.x;
    this.panLastCenterY = c.y;

    const xrCam = this.core.renderer.xr.getCamera(this.core.camera);
    xrCam.getWorldDirection(this.forward);

    this.forward.y = 0;
    if (this.forward.lengthSq() < 1e-6) this.forward.set(0, 0, -1);
    this.forward.normalize();

    this.right.crossVectors(this.forward, this.worldUp).normalize();

    // Delta schermo -> movimento metrico sul piano camera.
    const mx = dx * this.panSpeed;
    const mz = -dy * this.panSpeed;
    this.target.position.addScaledVector(this.right, mx);
    this.target.position.addScaledVector(this.forward, mz);

    this.reticleCtrl?.setPanPoseFromObject(reticleRefObj, this.panPlaneY);
    if (!this.reticleCtrl?.isLineInvalid) {
      this.lastPanReticlePos.copy(this.target.position);
      this.lastPanReticlePos.y = this.panPlaneY;
    }

  }






  //handler 
  handlePointerEnd(e) {
    const prevCount = this._activePointers.size; //prendo il numero pointer prima di togliere quello che non è più attivo
    this._activePointers.delete(e.pointerId); //rimuove il pointer non più attivo

    const pointers = this.getPointers(); //prende i pointer attivi
    const nextCount = pointers.length; // prende il numero di pointer attivi

    // Fine pan: quando scendi sotto 2 dita, conferma posizione e riporta il modello alla quota base.
    // Sotto 2 dita conferma posizione e chiude reticle.
    if (prevCount >= 2 && nextCount < 2) {
      this.setPosition();
      this.reticleCtrl.hide();

      if (nextCount > 0) {
        this.mode = "rotate";
        this.lastX = pointers[0].clientX;
        this.lastY = pointers[0].clientY;
        return;
      }

      this._activePointers.clear();
      this.active = false;
      this.mode = null;
      this.requestAnchorResumeIfNeeded();
      return;
    }

    //se non ci sono pointer attivi
    if (nextCount === 0) {
      this.requestAnchorResumeIfNeeded();
      this._activePointers.clear();
      this.active = false;
      this.mode = null;
      return;
    }

    //se c'erano più di due pointer attivi e rimani comunque con due o più, per rimanere in pan
    this.handlePanMove(pointers);
  }
  // ---- utils ----
  getPointers() {
    return Array.from(this._activePointers.values());
  }




  getCenter(pointers) {
    let x = 0;
    let y = 0;
    for (const p of pointers) {
      x += p.clientX;
      y += p.clientY;
    }
    return { x: x / pointers.length, y: y / pointers.length };
  }




  

  setPosition() {
    // Commit finale posizione: usa ultimo punto valido del pan.
    if (!this.target) return;
    if (!this.reticleCtrl?.isLineInvalid) {
      this.lastPanReticlePos.copy(this.target.position);
      this.lastPanReticlePos.y = this.panPlaneY;
    }
    this.target.position.copy(this.lastPanReticlePos);
    this.target.position.y = this.panPlaneY;
 
  }
}
