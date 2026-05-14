```js
// ThreeViewer.js
// Viewer 3D basato su three.js per:
// - caricare un modello GLB/GLTF
// - gestire OrbitControls + luci + ambiente HDR
// - leggere e applicare le varianti di materiale (KHR_materials_variants)
// - scalare il modello in modo non uniforme a cm

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { materialStore } from "../CreateMaterial";
import { ARButton } from 'three/addons/webxr/ARButton.js';


// Estensione per leggere KHR_materials_variants (da package "three-gltf-extensions")
import KHRMaterialsVariants from "three-gltf-extensions/loaders/KHR_materials_variants/KHR_materials_variants.js";

/**
 * Viewer 3D “tipo model-viewer” con:
 * - Renderer WebGL + controlli orbitali
 * - Luci base
 * - Supporto HDR environment (PBR) tramite PMREM
 * - Supporto KHR_materials_variants per cambiare materiali per mesh
 */
export class ThreeV {
  /**
   * Crea un nuovo viewer.
   *
   * @param {Object} params
   * @param {HTMLCanvasElement} params.canvas - Canvas dove renderizzare.
   * @param {HTMLElement} params.container - Contenitore usato per calcolare dimensioni e resize.
   */
  constructor({ canvas, container }) {
    /** @type {HTMLCanvasElement} */
    this.canvas = canvas;

    /** @type {HTMLElement} */
    this.container = container;

    // =========================
    // Setup THREE base
    // =========================

    /** @type {THREE.Scene} */
    this.scene = new THREE.Scene();
    
    /**
     * Camera prospettica.
     * (FOV 60 per un look un po’ più “naturale” in un configuratore)
     * @type {THREE.PerspectiveCamera}
     */
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
    this.camera.position.set(-1, -1, 2);

    /**
     * Renderer WebGL.
     * - alpha:true: sfondo trasparente (utile se vuoi sovrapporre UI o background CSS)
     * - powerPreference: high-performance: preferisce GPU dedicata quando possibile
     * @type {THREE.WebGLRenderer}
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    // Abilita pipeline WebXR (se userai AR/VR)
    this.renderer.xr.enabled = true;

    // Pixel ratio limitato (evita di renderizzare troppo pesante su schermi retina)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Output in sRGB (corretto per colori “da web”)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Look più “cinematic / model-viewer”
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    /**
     * PMREM: converte un HDR equirettangolare in una cubemap filtrata per PBR.
     * È la tecnica standard per far funzionare bene environment map con MeshStandard/Physical.
     * @type {THREE.PMREMGenerator}
     */
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();

    /**
     * Texture environment corrente (filtrata PMREM).
     * @type {THREE.Texture|null}
     */
    this.envMap = null;

    // Se vuoi impostare subito un HDR:
    // this.setEnvironmentHDR("../assets/env/studio.hdr");

    // Setup luci di default (se non hai HDR, le luci contano molto)
    this._setupLights();

    /**
     * OrbitControls: ruota/zoom intorno al modello.
     * @type {OrbitControls}
     */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false; // pan disabilitato (tipico configuratore)
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    /**
     * Radice dove monti il modello.
     * Tenerlo in un Group separato ti facilita:
     * - clear/replace del modello
     * - scaling/centering senza toccare direttamente gltf.scene
     * @type {THREE.Group}
     */
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    /**
     * Dimensioni “base” del modello (in metri), usate come riferimento per scaling.
     * Calcolate dopo il load.
     * @type {{x:number,y:number,z:number}|null}
     */
    this.baseSizeMeters = null;

    /**
     * Loader GLTF/GLB.
     * @type {GLTFLoader}
     */
    this.loader = new GLTFLoader();

    // Registra l’estensione KHR_materials_variants per farla gestire al loader/parser
    this.loader.register((parser) => new KHRMaterialsVariants(parser));

    // Resize handler
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);

    // Primo resize + avvio loop render
    this.resize();
    this._animate();
  }

  /**
   * Crea e aggiunge luci base nella scena.
   *
   * Nota: se usi un HDR environment “serio”, puoi abbassare molto l’intensità
   * delle luci o anche eliminarne alcune, perché l’HDR diventa la sorgente principale.
   *
   * @returns {void}
   */
  _setupLights() {
    // Rimuove eventuali luci già presenti (utile se ricrei viewer o richiami setup)
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj.isLight) this.scene.remove(obj);
    }

    // Hemisphere: luce ambientale morbida sopra/sotto
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.4);
    this.scene.add(hemi);

    // Key light principale
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(3, 4, 2);
    this.scene.add(key);

    // Fill light: riempie le ombre
    const fill = new THREE.DirectionalLight(0xffffff, 1.2);
    fill.position.set(-3, 2, -2);
    this.scene.add(fill);

    // Rim/back light: stacca il modello dallo sfondo
    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0, 4, -4);
    this.scene.add(rim);
  }

  /**
   * Imposta un environment HDR per illuminazione PBR realistica.
   *
   * - Carica un HDR equirettangolare
   * - Lo converte in envMap filtrata (PMREM)
   * - Assegna `scene.environment` (influenza riflessi e luce su materiali PBR)
   *
   * @param {string} hdrUrl - URL/path del file .hdr
   * @returns {Promise<void>}
   */
  async setEnvironmentHDR(hdrUrl) {
    const hdrTexture = await new RGBELoader().loadAsync(hdrUrl);
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

    // Converti in cubemap PMREM
    const envRT = this.pmrem.fromEquirectangular(hdrTexture);

    // Libera la texture HDR originale (non serve più dopo PMREM)
    hdrTexture.dispose();

    // Sostituisci env precedente
    if (this.envMap) this.envMap.dispose();
    this.envMap = envRT.texture;

    // RenderTarget PMREM non serve più dopo aver estratto la texture
    envRT.dispose();

    // Imposta l’environment PBR (il “salto di qualità”)
    this.scene.environment = this.envMap;

    // Se vuoi vedere l'HDR come sfondo (spesso NO in un configuratore):
    // this.scene.background = this.envMap;
  }

  /**
   * Libera risorse e rimuove listeners.
   * Chiamalo quando “smonti” il viewer (es. cambio pagina / distruzione component).
   *
   * @returns {void}
   */
  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.controls?.dispose?.();

    if (this.envMap) this.envMap.dispose();
    if (this.pmrem) this.pmrem.dispose();

    this.renderer.dispose();
  }

  /**
   * Aggiorna aspect ratio camera e size renderer in base al container.
   *
   * @returns {void}
   */
  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // false = non modificare lo style size del canvas (solo buffer interno)
    this.renderer.setSize(w, h, false);
  }

  /**
   * Avvia il render loop.
   * Usa setAnimationLoop (compatibile anche con WebXR).
   *
   * @returns {void}
   */
  _animate() {
    this.renderer.setAnimationLoop(() => {
      // necessario per damping (in OrbitControls)
      this.controls?.update();

      this.renderer.render(this.scene, this.camera);
    });
  }

  /**
   * Carica un GLB/GLTF da URL e lo prepara:
   * - pulizia modello precedente
   * - caching varianti materiali (KHR_materials_variants)
   * - calcolo dimensioni base
   * - centering modello
   * - posizionamento camera e near/far per evitare clipping
   *
   * @param {string} url - URL / objectURL / path del file GLB/GLTF
   * @returns {Promise<void>}
   */
  async loadGLB(url) {
    // Rimuove modello precedente dalla scena
    this.modelRoot.clear();
    this.baseSizeMeters = null;

    // Caricamento
    const gltf = await this.loader.loadAsync(url);

    /** @type {THREE.Object3D} */
    this.model = gltf.scene;

    this.modelRoot.add(this.model);

    // Dimensioni base del modello (in metri), usate poi per scaling
    this.baseSizeMeters = this.getDimensions();

    // Centra il modello sull’origine: calcola bounding box e sottrae centro
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    this.modelRoot.position.sub(center);

    // Calcola dimensione e usa maxDim per posizionare camera
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Aggiorna clipping plane: evita tagli quando zoomi/ruoti
    this.camera.near = Math.max(0.001, maxDim / 100);
    this.camera.far = maxDim * 100;
    this.camera.updateProjectionMatrix();

    // Posizione camera “decente” (puoi personalizzare)
    this.camera.position.set(0, maxDim * 0.8, maxDim * 1.8);

    // OrbitControls puntano all’origine (che ora è il centro modello)
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Ritorna le dimensioni (bounding box) del modello root in metri.
   * Nota: la bounding box include scaling/position attuali del modelRoot.
   *
   * @returns {{x:number, y:number, z:number}}
   */
  getDimensions() {
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    return { x: size.x, y: size.y, z: size.z };
  }

  /**
   * Applica uno scaling NON uniforme in base a dimensioni target espresse in centimetri.
   *
   * Esempio: vuoi che il modello diventi X=120cm, Y=200cm, Z=60cm.
   * Calcola i fattori di scala confrontando i cm target con la base size in metri.
   *
   * @param {Object} params
   * @param {number} params.xCm - Dimensione target asse X in cm
   * @param {number} params.yCm - Dimensione target asse Y in cm
   * @param {number} params.zCm - Dimensione target asse Z in cm
   * @returns {void}
   */
  setNonUniformScaleByCm({ xCm, yCm, zCm }) {
    // Se non hai ancora baseSize, la calcoli ora
    if (!this.baseSizeMeters) this.baseSizeMeters = this.getDimensions();

    // converti cm -> m e dividi per dimensione base (m) per ottenere scale factor
    const sx = (xCm / 100) / this.baseSizeMeters.x;
    const sy = (yCm / 100) / this.baseSizeMeters.y;
    const sz = (zCm / 100) / this.baseSizeMeters.z;

    // set scala (fallback a 1 se NaN/Infinity)
    this.modelRoot.scale.set(
      Number.isFinite(sx) ? sx : 1,
      Number.isFinite(sy) ? sy : 1,
      Number.isFinite(sz) ? sz : 1
    );
  }

 
  /**
   * Applica un materiale ad una specifica mesh (per nome).
   *
   * Limiti/Note:
   * - Qui applichi lo stesso materiale a tutte le sub-mesh con lo stesso nome.
   * - Se una mesh ha materiale multiplo (array), lo sostituisce con la stessa istanza
   *   del materiale variante per ogni slot.
   *
   * @param {string} meshName - Nome della mesh (o.name) come nel GLB.
   * @param {string} material - Nome variante (es. "nero", "bianco", ...)
   * @returns {void}
   */
  async setColorForMesh(meshs, mat) {
    const targets = meshs
    .map(name => this.scene.getObjectByName(name))
    .filter(Boolean);

    // crea/carica UNA volta
    const material = await materialStore.setMaterial(targets[0], mat);

    // applica subito a tutte (senza await dentro)
    for (const targetMesh of targets) {
      if (Array.isArray(targetMesh.material)) {
        targetMesh.material = targetMesh.material.map(() => material);
      } else {
        targetMesh.material = material;
      }
      targetMesh.material.needsUpdate = true;
    }
  }


  createARButton(domRoot) {
  if (!navigator.xr) return null;

  const btn = ARButton.createButton(this.renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: domRoot },
  });

  // SOLO stato AR (niente DOM toggle qui)
  this.renderer.xr.addEventListener("sessionstart", () => {
    document.body.classList.add("ar-mode");
    console.log("[XR] sessionstart -> ar-mode ON");
  });

  this.renderer.xr.addEventListener("sessionend", () => {
    document.body.classList.remove("ar-mode");
    console.log("[XR] sessionend -> ar-mode OFF");
  });

  btn.addEventListener("click", () => {
  setTimeout(() => {
    const s = this.renderer.xr.getSession?.();
    console.log("[XR] after click | getSession() =", !!s, "| isPresenting =", this.renderer.xr.isPresenting);
  }, 300);
});


  return btn;
}



}


```