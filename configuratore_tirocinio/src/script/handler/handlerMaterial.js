import { materialStore } from "../materials/CreateMaterial"
import * as THREE from "three";



export async function setMaterial(mesh, material) {
    // "Default" ripristina il materiale originale della mesh.
    if(material.value === "Default"){
        return materialStore.getDefault(mesh);
    } 
    // Materiale colore pieno.
    if(material.type === "standard"){
        const nmat = createStandardMat(material);
        materialStore.addcache(nmat);
        return  nmat;
        

    } else {
        // Materiale texture (async load).
        const nmat = await createTextureMat(material);
        materialStore.addcache(nmat);
        return nmat
      
    }
    

}


function createStandardMat(material){
     const mat = new THREE.MeshStandardMaterial({
        color: material.value,
        roughness: 0.7,
        metalness: 0.0,
    });
    mat.side = THREE.DoubleSide;
    mat.name = material.name;

    return mat
}


function createTextureMat(material){
    const textureUrl = material.value;
    return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();

    loader.load(
      textureUrl,
      (tex) => {
        // settaggi corretti per texture "normali"
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.needsUpdate = true;
        // tex.flipY = false; // se serve per GLB

        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.8,
          metalness: 0.0,
        });
        
        mat.side = THREE.DoubleSide;
        mat.name=material.name;

        resolve(mat);
      },
      undefined,
      (err) => {
        reject(err);
      }
    );
  });

}
