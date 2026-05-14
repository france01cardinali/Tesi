import { materialStore } from "../materials/CreateMaterial";
import { enableXROcclusionOnMaterial } from "../ar/AROcclusion.js";


export class MaterialController {
    constructor(core){
        this.core = core;
        
    }

    async setColorForMeshs(meshNames, mat){
        // Risolve i target direttamente per nome nella scena.
        const targets = meshNames
            .map((name)=> this.core.scene.getObjectByName(name))
            .filter(Boolean);

        if(targets.length === 0) return;

        // Crea/riusa materiale e applica patch occlusione shader.
        const material = await materialStore.setMaterial(targets[0], mat);
        const occMaterial = enableXROcclusionOnMaterial(material, this.core);

        for(const target of targets){
            if (Array.isArray(target.material)) {
                target.material = target.material.map(() => occMaterial);
                for (const m of target.material) {
                    if (m) m.needsUpdate = true;
                }
            } else {
                target.material = occMaterial;
                if (target.material) target.material.needsUpdate = true;
            }
        }
    }
    enableOcclusionForModelRoot() {
        // Abilita occlusione su tutti i materiali gia presenti nel modello caricato.
        this.core.modelRoot.traverse((obj) => {
        if (!obj.isMesh) return;
        
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
            if (m) enableXROcclusionOnMaterial(m, this.core);
        }
        });
    }
}
