// ARGestures.js
import * as THREE from "three";

export class ARGestures {
  constructor(core) {
    this.core = core;
    this.el = core.renderer.domElement;
    this.enabled = false;

    this.target = null;
    this.targetRot = null;

    this._activePointers = new Map();
    this.active = false;
    this.mode = null; // "place" | "rotate" | "pan"

    this.hasPlacedModel = false;
    this.initialDistance = 1.15;
    this.initialYOffset = -0.25;
    this.previousTouchAction = "";
    this.previousPointerEvents = "";

    this.lastX = 0;
    this.lastY = 0;

    this.panLastCenterX = 0;
    this.panLastCenterY = 0;
    this.panSpeed = 0.0015;

    this.right = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.worldUp = new THREE.Vector3(0, 1, 0);
    this.cameraPosition = new THREE.Vector3();
    this.cameraDirection = new THREE.Vector3();

    this.tapStartX = 0;
    this.tapStartY = 0;
    this.tapStartTime = 0;
    this.tapMoved = false;
    this.tapMaxMovePx = 10;
    this.tapMaxDurationMs = 320;

    this.debugEl = document.querySelector("#gesture-debug");

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
  }

  setTarget(posObj3d, rotObj3d = posObj3d) {
    this.target = posObj3d;
    this.targetRot = rotObj3d;
  }

  setInputElement(nextEl) {
    if (!nextEl || nextEl === this.el) return;
    const wasEnabled = this.enabled;
    if (wasEnabled) this.detachListeners();
    this.el = nextEl;
    if (wasEnabled) this.attachListeners();
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.hasPlacedModel = false;
    if (this.target) this.target.visible = false;
    this.attachListeners();
    this.debug("Tocca lo schermo per posizionare il modello");
  }

  dispose() {
    if (!this.enabled) return;
    this.enabled = false;
    this.detachListeners();
    this._activePointers.clear();
    this.active = false;
    this.mode = null;
    if (this.target) this.target.visible = true;
  }

  attachListeners() {
    this.previousTouchAction = this.el.style.touchAction;
    this.previousPointerEvents = this.el.style.pointerEvents;
    this.el.style.touchAction = "none";
    this.el.style.pointerEvents = "auto";
    this.el.addEventListener("pointerdown", this.onPointerDown);
    this.el.addEventListener("pointermove", this.onPointerMove);
    this.el.addEventListener("pointerup", this.onPointerUp);
    this.el.addEventListener("pointercancel", this.onPointerCancel);
  }

  detachListeners() {
    this.el.style.touchAction = this.previousTouchAction;
    this.el.style.pointerEvents = this.previousPointerEvents;
    this.el.removeEventListener("pointerdown", this.onPointerDown);
    this.el.removeEventListener("pointermove", this.onPointerMove);
    this.el.removeEventListener("pointerup", this.onPointerUp);
    this.el.removeEventListener("pointercancel", this.onPointerCancel);
  }

  debug(msg) {
    if (!this.debugEl || !this.debugEl.isConnected) {
      this.debugEl = document.querySelector("#gesture-debug");
    }
    if (this.debugEl) this.debugEl.textContent = msg;
  }

  onPointerDown(e) {
    this.el.setPointerCapture?.(e.pointerId);
    this._activePointers.set(e.pointerId, e);
    this.active = true;

    const pointers = this.getPointers();

    if (!this.hasPlacedModel) {
      if (pointers.length === 1) this.startPlacementTap(pointers[0]);
      return;
    }

    if (pointers.length === 1) {
      this.startRotate(pointers[0]);
      return;
    }

    if (pointers.length >= 2) {
      this.startPan(pointers);
    }
  }

  onPointerMove(e) {
    if (!this.active) return;
    if (this._activePointers.has(e.pointerId)) {
      this._activePointers.set(e.pointerId, e);
    }
    if (!this.target) return;

    const pointers = this.getPointers();

    if (!this.hasPlacedModel && this.mode === "place" && pointers.length === 1) {
      this.updatePlacementTap(pointers[0]);
      return;
    }

    if (!this.hasPlacedModel) return;

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

  startPlacementTap(pointer) {
    this.mode = "place";
    this.tapStartX = pointer.clientX;
    this.tapStartY = pointer.clientY;
    this.tapStartTime = performance.now();
    this.tapMoved = false;
  }

  updatePlacementTap(pointer) {
    const moved = Math.hypot(
      pointer.clientX - this.tapStartX,
      pointer.clientY - this.tapStartY
    );
    if (moved > this.tapMaxMovePx) this.tapMoved = true;
  }

  placeModelInFrontOfCamera() {
    if (!this.target || !this.core.renderer.xr.isPresenting) return false;

    const xrCamera = this.core.renderer.xr.getCamera(this.core.camera);
    xrCamera.getWorldPosition(this.cameraPosition);
    xrCamera.getWorldDirection(this.cameraDirection);

    this.target.position.copy(this.cameraPosition);
    this.target.position.addScaledVector(this.cameraDirection, this.initialDistance);
    this.target.position.y = this.cameraPosition.y + this.initialYOffset;
    this.target.visible = true;
    this.target.updateMatrixWorld(true);

    this.hasPlacedModel = true;
    this.core.hasPlacedModel = true;
    this.debug("Modello posizionato");
    return true;
  }

  startRotate(pointer) {
    this.mode = "rotate";
    this.lastX = pointer.clientX;
    this.lastY = pointer.clientY;
  }

  startPan(pointers) {
    this.mode = "pan";
    const c = this.getCenter(pointers);
    this.panLastCenterX = c.x;
    this.panLastCenterY = c.y;
  }

  handleRotateMove(pointer) {
    if (!this.core.renderer.xr.isPresenting || !this.targetRot) return;

    const dx = pointer.clientX - this.lastX;
    this.lastX = pointer.clientX;
    this.lastY = pointer.clientY;

    this.targetRot.rotation.y += dx * 0.01;
  }

  handlePanMove(pointers) {
    if (!this.core.renderer.xr.isPresenting || !this.target) return;

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

    this.target.position.addScaledVector(this.right, dx * this.panSpeed);
    this.target.position.addScaledVector(this.forward, -dy * this.panSpeed);
  }

  handlePointerEnd(e, allowPlacement) {
    const prevCount = this._activePointers.size;
    this._activePointers.delete(e.pointerId);
    const pointers = this.getPointers();
    const nextCount = pointers.length;

    if (!this.hasPlacedModel && this.mode === "place") {
      const isTap = allowPlacement
        && !this.tapMoved
        && performance.now() - this.tapStartTime <= this.tapMaxDurationMs;

      if (isTap) this.placeModelInFrontOfCamera();

      this._activePointers.clear();
      this.active = false;
      this.mode = null;
      return;
    }

    if (prevCount >= 2 && nextCount < 2) {
      if (nextCount > 0) {
        this.mode = "rotate";
        this.lastX = pointers[0].clientX;
        this.lastY = pointers[0].clientY;
        return;
      }

      this._activePointers.clear();
      this.active = false;
      this.mode = null;
      return;
    }

    if (nextCount === 0) {
      this._activePointers.clear();
      this.active = false;
      this.mode = null;
      return;
    }

    if (nextCount >= 2) this.handlePanMove(pointers);
  }

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
}
