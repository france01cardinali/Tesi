 import { setMaterial } from "../handler/handlerMaterial";
 
 class CreateMaterial {
    #defaultMaterial = new Map();
    #cacheMaterial = new Map();



   #storeMaterial(mesh) {
    // Salva il materiale originale della mesh per poter tornare a "Default".
    const mat = mesh.material;
    mat.name = "Default";
    this.#defaultMaterial.set(mesh,mat);

   }

    addcache(mat){ 
        this.#cacheMaterial.set(mat.name, mat); 
    }

    #reuseMaterial(material){ 
        // Cache per nome materiale configurazione.
        return this.#cacheMaterial.get(material.name) ?? null; 
    }

 

  async setMaterial(mesh, material){
    // Prima volta: memorizza sempre il materiale di partenza.
    if(!this.#defaultMaterial.has(mesh)){this.#storeMaterial(mesh, mesh.material);}

    const cached = this.#reuseMaterial(material);
    if (cached) return cached;

    return await setMaterial(mesh,material);
  }

  getDefault(mesh){
    const def = this.#defaultMaterial.get(mesh)
    this.#defaultMaterial.delete(mesh);
    return def;
  }

 
 }
 
 export const materialStore = new CreateMaterial();
 
