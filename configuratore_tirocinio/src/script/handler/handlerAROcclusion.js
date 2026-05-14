import * as THREE from "three";

export class handlerAROcclusion {
  constructor({ renderer, modelRoot }) {
    this.renderer = renderer;
    this.modelRoot = modelRoot;

    // Collezione materiali patchati con uniform xrOccUniforms.
    this._materials = new Set();

    // Risorse depth runtime.
    this._depthTex = null;
    this._depthW = 0;
    this._depthH = 0;
    this._depthBytesRG = null;
    this._warnedNoDepthInfo = false;
    this._warnedNoRefSpace = false;
    this._loggedDepthInfo = false;
  }

  onSessionStart() {
    // Reset flag diagnostici ad ogni nuova sessione.
    this._warnedNoDepthInfo = false;
    this._warnedNoRefSpace = false;
    this._loggedDepthInfo = false;
  }

  onSessionEnd() {
    this.setHasDepth(false);
  }

  registerMaterial(material) {
    // Idempotente grazie a Set.
    this._materials.add(material);
  }

  setHasDepth(on) {
    // Uniform globale "availability": attiva/disattiva blocco discard shader.
    const value = on ? 1.0 : 0.0;
    for (const material of this._materials) {
      const uniforms = material.userData?.xrOccUniforms;
      if (uniforms) uniforms.uHasDepth.value = value;
    }
  }

  updateFromXRFrame(frame, cameraToUse) {
    // 1) Guard reference space.
    const refSpace = this.renderer.xr.getReferenceSpace();
    if (!refSpace) {
      this.setHasDepth(false);
      if (!this._warnedNoRefSpace) {
        this._warnedNoRefSpace = true;
        console.warn("[XROcclusion] XR reference space non disponibile.");
      }
      return;
    }

    // 2) Guard viewer pose.
    const pose = frame.getViewerPose(refSpace);
    if (!pose?.views?.length) {
      this.setHasDepth(false);
      return;
    }

    const view = pose.views[0];

    // 3) Lettura depth CPU dal frame corrente.
    let depthInfo = null;
    try {
      depthInfo = frame.getDepthInformation?.(view);
    } catch {
      depthInfo = null;
    }

    // Se non c'e depth, disattiva occlusione e mantieni rendering normale.
    if (!depthInfo?.data) {
      this.setHasDepth(false);
      if (!this._warnedNoDepthInfo) {
        this._warnedNoDepthInfo = true;
        console.warn("[XROcclusion] Nessuna depth CPU disponibile dalla sessione XR.");
      }
      return;
    }

    if (!this._loggedDepthInfo) {
      this._loggedDepthInfo = true;
      console.info("[XROcclusion] Depth attiva:", {
        width: depthInfo.width,
        height: depthInfo.height,
        rawToMeters: depthInfo.rawValueToMeters,
        hasUvTransform: !!depthInfo.normDepthBufferFromNormView,
      });
    }

    const w = depthInfo.width;
    const h = depthInfo.height;

    // Alloca/realloca texture RG8 solo quando risoluzione depth cambia.
    if (!this._depthTex || this._depthW !== w || this._depthH !== h) {
      this._depthW = w;
      this._depthH = h;
      this._depthBytesRG = new Uint8Array(w * h * 2);

      // RGFormat + UnsignedByteType: 2 byte per pixel (low/high).
      this._depthTex = new THREE.DataTexture(
        this._depthBytesRG,
        w,
        h,
        THREE.RGFormat,
        THREE.UnsignedByteType
      );
      this._depthTex.minFilter = THREE.NearestFilter;
      this._depthTex.magFilter = THREE.NearestFilter;
      this._depthTex.generateMipmaps = false;
      this._depthTex.flipY = false;
      this._depthTex.needsUpdate = true;
    }

    const raw16 = new Uint16Array(depthInfo.data);
    const out = this._depthBytesRG;
    const modelScale = new THREE.Vector3();
    this.modelRoot.getWorldScale(modelScale);

    // Conversione raw16 -> RG8 (little-endian split).
    for (let i = 0; i < raw16.length; i++) {
      const value = raw16[i];
      out[2 * i] = value & 0xff;
      out[2 * i + 1] = (value >> 8) & 0xff;
    }
    this._depthTex.needsUpdate = true;

    // Viewport renderer in pixel per mappare gl_FragCoord -> UV.
    const viewport = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(viewport);

    const cam = cameraToUse.isArrayCamera ? cameraToUse.cameras[0] : cameraToUse;
    const depthUvTransformSrc = depthInfo.normDepthBufferFromNormView;
    const depthUvTransform = depthUvTransformSrc?.matrix ?? depthUvTransformSrc;
    const hasDepthUvTransform =
      !!depthUvTransform &&
      typeof depthUvTransform.length === "number" &&
      depthUvTransform.length === 16;

    // Aggiorna uniform su tutti i materiali registrati.
    for (const material of this._materials) {
      const uniforms = material.userData?.xrOccUniforms;
      if (!uniforms) continue;

      uniforms.uDepthTex.value = this._depthTex;
      uniforms.uViewport.value.copy(viewport);
      uniforms.uHasDepth.value = 1.0;
      uniforms.uNear.value = cam.near;
      uniforms.uFar.value = cam.far;
      uniforms.uRawToMeters.value = depthInfo.rawValueToMeters;

      if (uniforms.uDepthUvTransform && uniforms.uUseDepthUvTransform) {
        if (hasDepthUvTransform) {
          uniforms.uDepthUvTransform.value.fromArray(depthUvTransform);
          uniforms.uUseDepthUvTransform.value = 1.0;
        } else {
          uniforms.uDepthUvTransform.value.identity();
          uniforms.uUseDepthUvTransform.value = 0.0;
        }
      }

      if (uniforms.uModelScale) uniforms.uModelScale.value.copy(modelScale);
    }
  }

  dispose() {
    // Rilascio risorse GPU/CPU.
    this._materials.clear();
    if (this._depthTex) {
      this._depthTex.dispose();
      this._depthTex = null;
    }
    this._depthBytesRG = null;
  }
}