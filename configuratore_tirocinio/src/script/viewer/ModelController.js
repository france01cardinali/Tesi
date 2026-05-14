import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


export class ModelController {
    constructor(core, events){
        this.core = core;
        this.events = events;

        this.baseSizeMeters = null;
        // Scala minima per asse: evita collapse quasi a zero.
        this.minScaleRatio = 1 / 11;

        this.loader = new GLTFLoader();

        this.defaultDimension = new THREE.Vector3();
    }



  async loadGLB(url){
    // Reset stato modello prima di un nuovo load.
    this.core.modelRoot.clear();
    this.baseSizeMeters = null;
    this.core.modelRoot.position.set(0, 0, 0);
    this.core.modelRoot.rotation.set(0, 0, 0);
    this.core.modelRoot.scale.set(1, 1, 1);

    const gltf = await this.loader.loadAsync(url);
    this.model = gltf.scene;
    this.core.modelRoot.add(this.model);
    // 2) bbox del MODELLO (non del modelRoot)
    const box = new THREE.Box3().setFromObject(this.model);
    const centerWorld = box.getCenter(new THREE.Vector3());

    // 3) converti il centro in coordinate LOCALI di modelRoot
    const centerLocal = this.core.modelRoot.worldToLocal(centerWorld.clone());

    // 4) crea pivot e mettilo al centro (in local)
    this.pivot = new THREE.Group();
    this.pivot.name = "__pivot_center__";
    this.pivot.position.copy(centerLocal);

// 5) sposta model sotto il pivot, compensando
this.core.modelRoot.remove(this.model);
this.pivot.add(this.model);
this.model.position.sub(centerLocal);  // porta il centro sull'origine del pivot
this.core.modelRoot.add(this.pivot);
    this.model.traverse((child) => {
      if (!child.isMesh) return;
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          if (!mat) return;
          mat.depthTest = true;
          mat.depthWrite = true;
          mat.needsUpdate = true;
        });
      } else {
        const mat = child.material;
        if (!mat) return;
        mat.depthTest = true;
        mat.depthWrite = true;
        mat.needsUpdate = true;
      }
    });

    this.baseSizeMeters = this.getDimensions();

    // Dimensioni base usate come riferimento per scaling non uniforme.
    this.defaultDimension = this.baseSizeMeters;

    const b = new THREE.Box3().setFromObject(this.core.modelRoot);
    const center = b.getCenter(new THREE.Vector3());




    // fit camera
    // Fit camera al volume attuale del modello.
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    this.core.camera.near = Math.max(0.001, maxDim / 100);
    this.core.camera.far = maxDim * 100;
    this.core.camera.updateProjectionMatrix();
    this.core.camera.position.set(
      center.x,
      center.y + maxDim * 0.8,
      center.z + maxDim * 1.8
    );

    // OrbitControls are desktop-only. In AR, placement must be driven by hit-test/tap.
    if (!this.core.renderer.xr.isPresenting && this.core.controls) {
      this.core.controls.target.copy(center);
      this.core.controls.update();
    }

    this.events.dispatchEvent(new CustomEvent("model:loaded", { detail: { gltf } }));
    }

    getDimensions() {
    const box = new THREE.Box3().setFromObject(this.core.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    return { x: size.x, y: size.y, z: size.z };
  }

  updateControlsTargetToModelCenter() {
    if (this.core.renderer.xr.isPresenting || !this.core.controls) return;
    const box = new THREE.Box3().setFromObject(this.core.modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    this.core.controls.target.copy(center);
    this.core.controls.update();
  }

  setNonUniformScaleByCm({ xCm, yCm, zCm }) {
    // Converte cm target -> ratio rispetto alle dimensioni base (in metri).
    if (!this.baseSizeMeters) this.baseSizeMeters = this.getDimensions();
    const sx = (xCm / 100) / this.baseSizeMeters.x;
    const sy = (yCm / 100) / this.baseSizeMeters.y;
    const sz = (zCm / 100) / this.baseSizeMeters.z;

    const clampScale = (value) => {
      // Guardia numerica + soglia minima.
      if (!Number.isFinite(value)) return 1;
      return Math.max(this.minScaleRatio, value);
    };

    this.core.modelRoot.scale.set(
      clampScale(sx),
      clampScale(sy),
      clampScale(sz)
    );

    this.updateControlsTargetToModelCenter();
  }


  setDefaultDim(){
    this.core.modelRoot.scale.set(1,1,1);
    this.updateControlsTargetToModelCenter();
  }


  //test
  testDim(){
    this.core.modelRoot.scale.set(0.1,0.1,0.1);
    this.updateControlsTargetToModelCenter();
  }

}