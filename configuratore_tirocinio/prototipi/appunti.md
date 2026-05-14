        regole[]
            |
            V
(tipologia === color-variant)
            |
            V
        specifica[] -----------> getAllRegMaterials()
            |
            V
    (pre ogni groupName)
            |
            V
        groupName[] --------> getAllGroupName() da fare 
            |
            V
    (per ogni materiale)
            |
            V
        Materia[] ----------> getAllMaterialByNameGroup()
            |
            V
    (per ogni materiale)
            |
            V
        material.name



ng serve --ssl --ssl-cert ssl/192.168.1.12+1.pem --ssl-key ssl/192.168.1.12+1-key.pem --host 0.0.0.0 --port 4200



codece creazione e gestione eventi selelct chang material con KHR_MATERIALS_VAIRANTS

```js

    const variantsByMesh = viewer.getVariantsByMesh?.() ?? viewer.variantsByMesh;
    if (!variantsByMesh || variantsByMesh.size === 0) return;

    const groups = {};
    for (const [meshName, set] of variantsByMesh.entries()) {
        groups[meshName] = Array.from(set);
    }
    
    let lastGroup;



    for (const meshName in groups) {
        const groupName =  jsonStore.getGroupByMesh(meshName);
        const materials =  jsonStore.getAllMaterialByNameGroup(groupName);

        if (groupName !== lastGroup) {
        lastGroup = groupName;

            const wrap = document.createElement('div');
            wrap.className = 'mb-2';
            wrap.innerHTML = `
            <label class="form-label fw-semibold mb-1">
                ${groupName}
            </label>
            `;

        const select = document.createElement('select');
        select.className = 'form-select form-select-sm';

        select.innerHTML = groups[meshName]
            .filter(v => materials.includes(v))
            .map(v => `<option value="${v}">${v}</option>`)
            .join('');

        select.addEventListener('change', async (e) => {
            const variant = e.target.value;
            const meshs = await jsonStore.getAllMeshsOfGroupByMesh(meshName);
            for (const mesh of meshs) {
            viewer.setVariantForMesh(mesh, variant);
            }
        });

        wrap.appendChild(select);
        section.appendChild(wrap);
        }
    } 


```




classe ThreeViewer per la gestione di THREEJS con KHR_materials_variants 

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

// Estensione per leggere KHR_materials_variants (da package "three-gltf-extensions")
import KHRMaterialsVariants from "three-gltf-extensions/loaders/KHR_materials_variants/KHR_materials_variants.js";

/**
 * Viewer 3D “tipo model-viewer” con:
 * - Renderer WebGL + controlli orbitali
 * - Luci base
 * - Supporto HDR environment (PBR) tramite PMREM
 * - Supporto KHR_materials_variants per cambiare materiali per mesh
 */
export class ThreeViewer {
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

    /**
     * Mappa: nomeMesh -> Set di nomi varianti disponibili per quella mesh
     * Esempio: "zoccolo" -> Set(["bianco", "nero", ...])
     * @type {Map<string, Set<string>>}
     */
    this.variantsByMesh = new Map();

    /**
     * Mappa: nomeMesh -> (nomeVariante -> THREE.Material)
     * Esempio: "zoccolo" -> Map("nero" -> MeshStandardMaterial, ...)
     * @type {Map<string, Map<string, THREE.Material>>}
     */
    this.variantMaterialsByMesh = new Map();

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

    // Legge dal GLTF i mapping KHR_materials_variants e li “cachea” in Map
    await this.cacheVariantsByMeshFromGLTF(gltf);

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
   * Analizza il GLTF caricato e costruisce due cache:
   * - variantsByMesh: meshName -> Set(variantName...)
   * - variantMaterialsByMesh: meshName -> Map(variantName -> Material)
   *
   * Come funziona:
   * 1) Prende i nomi varianti da json.extensions.KHR_materials_variants.variants
   * 2) Per ogni Mesh della scena, risale alla primitive GLTF tramite parser.associations
   * 3) Legge primitive.extensions.KHR_materials_variants.mappings
   * 4) Per ogni mapping: (materialIndex, variants[])
   *    - materialIndex -> material via parser.getDependency("material", index)
   *    - variants[] -> nomi variante
   * 5) Popola le mappe
   *
   * @param {import('three/examples/jsm/loaders/GLTFLoader.js').GLTF} gltf
   * @returns {Promise<void>}
   */
  async cacheVariantsByMeshFromGLTF(gltf) {
    // Reset cache
    this.variantsByMesh.clear();
    this.variantMaterialsByMesh.clear();

    // Parser + JSON interno (struttura glTF)
    const parser = gltf?.parser;
    const json = parser?.json;

    // Lista varianti globali (array di { name })
    const variants = json?.extensions?.KHR_materials_variants?.variants;

    // Se non c’è estensione o parser, non c’è niente da fare
    if (!parser || !json || !Array.isArray(variants)) return;

    // Nomi varianti: se manca il name, crei un fallback coerente
    const variantNames = variants.map((v, i) => v?.name ?? `variant_${i}`);

    // Cache materiali già risolti (evita richieste duplicate)
    const materialCache = new Map();

    /**
     * Risolve un materiale dal suo indice GLTF (dependency "material")
     * con caching per non richiamare parser.getDependency più volte.
     *
     * @param {number} index
     * @returns {Promise<THREE.Material>}
     */
    const getMaterial = async (index) => {
      if (materialCache.has(index)) return materialCache.get(index);

      const mat = await parser.getDependency("material", index);
      materialCache.set(index, mat);

      return mat;
    };

    // Promesse pending: risoluzione materiali in parallelo
    const pending = [];

    // Scorri tutti gli oggetti della scena
    this.model.traverse((o) => {
      if (!o.isMesh) return;

      // associations collega l’Object3D three.js al mesh/primitiva del JSON glTF
      const assoc = parser.associations?.get(o);
      if (!assoc || assoc.meshes === undefined || assoc.primitives === undefined) return;

      // Recupera definizioni mesh/primitiva dal JSON glTF
      const meshDef = json.meshes?.[assoc.meshes];
      const primDef = meshDef?.primitives?.[assoc.primitives];

      // Estensione KHR_materials_variants sulla primitive
      const ext = primDef?.extensions?.KHR_materials_variants;
      if (!ext?.mappings) return;

      // Nome mesh (fallback "Mesh" se stringa vuota)
      const meshName = o.name || "Mesh";

      // Set varianti disponibili per questa mesh
      let set = this.variantsByMesh.get(meshName);
      if (!set) {
        set = new Set();
        this.variantsByMesh.set(meshName, set);
      }

      // Mappa variantName -> Material per questa mesh
      let mapByVariant = this.variantMaterialsByMesh.get(meshName);
      if (!mapByVariant) {
        mapByVariant = new Map();
        this.variantMaterialsByMesh.set(meshName, mapByVariant);
      }

      // mapping: { material: indexMateriale, variants: [indiciVarianti...] }
      for (const mapping of ext.mappings) {
        if (mapping?.material === undefined || !Array.isArray(mapping?.variants)) continue;

        for (const variantIndex of mapping.variants) {
          const variantName = variantNames[variantIndex] ?? `variant_${variantIndex}`;

          // Registra variante come disponibile
          set.add(variantName);

          // Risolve materiale e lo associa alla variante
          pending.push(
            getMaterial(mapping.material).then((mat) => {
              mapByVariant.set(variantName, mat);
            })
          );
        }
      }
    });

    // Aspetta che tutti i materiali siano risolti
    if (pending.length) await Promise.all(pending);
  }

  /**
   * Ritorna l’elenco di TUTTE le varianti presenti nel modello (unione di tutte le mesh).
   *
   * @returns {string[]} Lista varianti ordinate alfabeticamente
   */
  getAvailableVariants() {
    const all = new Set();
    if (!this.variantsByMesh) return [];

    for (const set of this.variantsByMesh.values()) {
      for (const v of set) all.add(v);
    }

    return [...all].sort();
  }

  /**
   * Ritorna la mappa meshName -> Set(varianti).
   * Utile se vuoi costruire UI dipendente dalla mesh selezionata.
   *
   * @returns {Map<string, Set<string>>}
   */
  getVariantsByMesh() {
    return this.variantsByMesh;
  }

  /**
   * Applica una variante di materiale ad una specifica mesh (per nome).
   *
   * Limiti/Note:
   * - Qui applichi lo stesso materiale a tutte le sub-mesh con lo stesso nome.
   * - Se una mesh ha materiale multiplo (array), lo sostituisce con la stessa istanza
   *   del materiale variante per ogni slot.
   *
   * @param {string} meshName - Nome della mesh (o.name) come nel GLB.
   * @param {string} variantName - Nome variante (es. "nero", "bianco", ...)
   * @returns {void}
   */
  setVariantForMesh(meshName, variantName) {
    if (!this.model) return;

    // Recupera mappa variantName -> Material per quella mesh
    const mapByVariant = this.variantMaterialsByMesh?.get(meshName);
    if (!mapByVariant) return;

    const material = mapByVariant.get(variantName);
    if (!material) return;

    // Trova tutte le mesh con quel nome e sostituisci il materiale
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      if ((o.name || "Mesh") !== meshName) return;

      // Caso multi-material
      if (Array.isArray(o.material)) {
        o.material = o.material.map(() => material);
        o.material.forEach((m) => {
          if (m) m.needsUpdate = true;
        });
      } else {
        // Caso single material
        o.material = material;
        if (o.material) o.material.needsUpdate = true;
      }
    });
  }
}






```


```js

for(const mesh of meshs){
    console.log("create select mesh: ", mesh);
    const targetMesh = viewer.scene.getObjectByName(mesh);
    const material = await materialStore.setMaterial(targetMesh, mat);
    console.log("material in select: ", material);
    viewer.setColorForMesh(targetMesh, material);
}



```








**Mappa del progetto**
- Shell Angular e bootstrap: [main.ts](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/main.ts), [app.component.ts](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/app/app.component.ts#L20), [app.component.html](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/app/app.component.html), [app.routes.ts](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/app/app.routes.ts#L3).
- Pipeline caricamento: [main.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/main.js#L7), [handlerModel.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerModel.js#L4), [ConfJson.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/config/ConfJson.js#L3).
- Viewer 3D + AR orchestrazione: [ThreeViewer.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/viewer/ThreeViewer.js#L12), [ViewerCore.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/viewer/ViewerCore.js#L5), [ARController.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARController.js#L9).
- UI dinamica da JSON: [handlerVarianti.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerVarianti.js#L7), [createSelect.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ui/createSelect.js#L3), [createDim.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ui/createDim.js#L3), [createVisible.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ui/createVisible.js#L4), [createARButton.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ui/createARButton.js#L1).
- Deploy: [Dockerfile](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/Dockerfile), [docker-compose.yml](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/docker-compose.yml), [nginx.conf](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/nginx.conf).

**Nota importante sulle “guardie”**
- Guard Angular classiche (`CanActivate`, `CanMatch`, ecc.) non ci sono; routing è vuoto in [app.routes.ts](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/app/app.routes.ts#L3).
- Le “guardie” reali sono guard clause runtime (`if (...) return`) soprattutto in AR.

**Guardie principali (placement/AR)**
| Attributo | Dove | Significato |
|---|---|---|
| `minUpDot` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L5) | Quanto il piano deve essere orizzontale (`up.y` minimo). |
| `minBelowCameraMeters` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L6) | Scarta hit troppo allineati in altezza con la camera. |
| `requireSemanticFloor` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L7) | Se `true`, accetta solo piani etichettati `floor`. |
| `maxAbsFloorYOffset` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L8) | Banda verticale assoluta rispetto a `y=0`. |
| `maxFloorDelta` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L9) | Tolleranza rispetto al pavimento stimato. |
| `minPlaneSpanMeters` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L10) | Dimensione minima del piano rilevato. |
| `minHitDistanceMeters` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L11) | Scarta hit troppo vicini alla camera. |
| `floorYLerp` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L12) | Velocità di aggiornamento stima pavimento. |
| `useAbsoluteFloorZero` | [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L13) | Usa `y=0` assoluto invece della stima dinamica. |
| `debugRelaxed` | [ThreeViewer.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/viewer/ThreeViewer.js#L42), [ARPlacementService.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementService.js#L20) | Allenta i filtri. Nel tuo codice è `true`, quindi molte soglie vengono rese più permissive. |

**Guardie di stato più importanti**
- Init viewer protetta da stato/DOM in [app.component.ts](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/app/app.component.ts#L86).
- Sessione AR valida solo se hit-test/reference pronti in [ARPlacementSessionController.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARPlacementSessionController.js#L60).
- Recheck reticle con soglie movimento + isteresi colore in [ARReticleValidityController.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARReticleValidityController.js#L5), [ARReticleValidityController.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARReticleValidityController.js#L37), [ARReticleValidityController.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARReticleValidityController.js#L66).
- Gesti sospendono/ripristinano anchor in [ARGesture.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARGesture.js#L155), [ARGesture.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/ARGesture.js#L161).

**Uniform dell’occlusione (spiegate bene)**
| Uniform | Dove nasce | Dove si aggiorna | A cosa serve |
|---|---|---|---|
| `uDepthTex` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L13) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L134) | Texture depth reale (RG8). |
| `uViewport` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L14) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L135) | Converte `gl_FragCoord` in UV corrette. |
| `uOccEnable` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L15) | Costante | Interruttore logico occlusione. |
| `uHasDepth` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L16) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L32) | Dice se il frame depth è valido. |
| `uNear`, `uFar` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L17) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L137) | Parametri camera (ora usato soprattutto `uFar` in validazione depth). |
| `uRawToMeters` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L19) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L139) | Scala raw depth -> metri reali. |
| `uDepthUvTransform` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L20) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L143) | Allinea UV view con UV depth buffer. |
| `uUseDepthUvTransform` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L21) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L144) | Flag fallback se la matrice non esiste. |
| `uModelScale` | [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L22) | [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L151) | Scala world del modello (al momento non entra nel confronto). |

**Come avviene il confronto reale/virtuale**
- Shader patchato in [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L55), [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L71), [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L94).
- Se `realM < virtualM - eps` il frammento viene scartato (`discard`) in [AROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/ar/AROcclusion.js#L107).
- I byte depth vengono riempiti da `Uint16 -> RG8` in [handlerAROcclusion.js](/c:/Users/checc/Desktop/Apra/tirocinio/configuratore/configuratore_tirocinio/src/script/handler/handlerAROcclusion.js#L107).

Se vuoi, nel prossimo passo ti preparo anche una versione “commentata inline” file-per-file (parto da AR: `ARPlacementService`, `ARPlacementFrameController`, `AROcclusion`, `handlerAROcclusion`) così hai commenti direttamente nel codice.