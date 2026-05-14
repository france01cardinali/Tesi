funzione che riceve un'immagine e un file .glb, lo modifica scivendo dentro di esso delle Materials Variants per ogni mesh e poi restituisce un blob del glb che poi passerà alla classe che usa THREE.js per gestire il 3d e la scena AR 


```js

import { WebIO } from 'https://esm.sh/@gltf-transform/core';
import { KHRMaterialsVariants, KHRMaterialsSpecular, KHRTextureTransform } from 'https://esm.sh/@gltf-transform/extensions';
import { jsonStore } from './ConfJson';

export async function  createMaterialVariants(fileInputGlb,fileInputImg) {

    const io = new WebIO().registerExtensions([KHRMaterialsVariants, KHRMaterialsSpecular,KHRTextureTransform]);

    if (!fileInputImg.files[0] || !fileInputGlb.files[0]) {
        alert("Seleziona entrambi i file!");
        return null;
    }

    // Lettura immagine
    const imageFile = fileInputImg.files[0];
    const imageBuffer = await imageFile.arrayBuffer();

    // Lettura file GLB
    const glbFile = fileInputGlb.files[0];
    const glbBuffer = await glbFile.arrayBuffer();

    // Lettura del documento
    const gltfDoc = await io.readBinary(new Uint8Array(glbBuffer));
    const root = gltfDoc.getRoot();
    const variantsExtension = gltfDoc.createExtension(KHRMaterialsVariants);
    variantsExtension.setRequired(true);

    // Crea texture 
    const textureWood = gltfDoc.createTexture('WoodTexture')
        .setImage(new Uint8Array(imageBuffer))
        .setMimeType(imageFile.type);

    var precMesh;

    var matDef;
    var matRed;
    var matGreen;
    var matWood;

    var variantDef;
    var variantRed;
    var variantGreen;
    var variantWood;
    root.listMeshes().forEach(mesh => {
        mesh.listPrimitives().forEach(prim => {
            const originalMaterial = prim.getMaterial();
            if(prim.getMaterial() == originalMaterial){
                console.log("precMesh: " ,precMesh);
                console.log("prim: ", prim);
                if(precMesh == null || precMesh !== mesh.getName()) {
                    
                    matDef = originalMaterial.clone();
                    matRed = originalMaterial.clone().setBaseColorFactor([1,0,0,1]);
                    matGreen = originalMaterial.clone().setBaseColorFactor([0,1,0,1]);
                    matWood = originalMaterial.clone().setBaseColorTexture(textureWood).setBaseColorFactor([1,1,1,1]);
                    
                    variantDef = variantsExtension.createVariant().setName("Default");
                    variantRed = variantsExtension.createVariant().setName("Red");
                    variantGreen = variantsExtension.createVariant().setName("Green");
                    variantWood = variantsExtension.createVariant().setName("Wood");
                    
                    
                    precMesh=mesh.getName();
                }
                const mappingList = variantsExtension.createMappingList()
                .addMapping(
                    variantsExtension.createMapping()
                    .setMaterial(matDef)
                    .addVariant(variantDef)
                    )
                .addMapping(
                    variantsExtension.createMapping()
                    .setMaterial(matRed)
                    .addVariant(variantRed)
                    )
                .addMapping(
                    variantsExtension.createMapping()
                    .setMaterial(matGreen)
                    .addVariant(variantGreen)
                    )
                .addMapping(
                    variantsExtension.createMapping()
                    .setMaterial(matWood)
                    .addVariant(variantWood)
                    );

                prim.setExtension('KHR_materials_variants', mappingList);

            }
        });
    });


    const outBuffer = await io.writeBinary(gltfDoc);
    const url = URL.createObjectURL(new Blob([outBuffer], {type: 'model/gltf-binary'}));
    console.log(url);
    return url;
}



```