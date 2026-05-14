Qui ci sono ude esempi per creare e cambiare il materiale di una mesh a RunTIme.

Nel primo esempio viene cambiato il materiale attuale con un colore, nessuna texture da immagine o altro.
il colore viene cambiato tramite una checkbox.
```js
    const mesh = viewer.scene.getObjectByName("pannello005");
    const originalMaterial = mesh.material;

    const redMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.7,
        metalness: 0.0,
    });


    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            applyMaterial(mesh, redMaterial);
        } else {
            mesh.material = originalMaterial;
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach((m) => (m.needsUpdate = true));
            } else {
                mesh.material.needsUpdate = true;
            }
        }

    });




    function applyMaterial(targetMesh, material) {
        if (Array.isArray(targetMesh.material)) {
            targetMesh.material = targetMesh.material.map(() => material);
        } else {
            targetMesh.material = material;
        }
            targetMesh.material.needsUpdate = true;
    }


```


In questo altro esempio il materiale attuale/originale viene cambiato creando una nuova texture tramite un immagine .jpg che nel mio caso ce l'ho in locale.
```js

  const mesh2 = viewer.scene.getObjectByName("pannello001");
  const originalMaterial2 = mesh2.material;

    const loader = new THREE.TextureLoader();
    let tex = null;
    let texturedMaterial = null;
    let isLoaded= false;

    const textureUrl = 'texture/WoodTexture.jpg';

    loader.load(
        textureUrl,
        (t) => {
            tex = t;

            // settaggi utili (soprattutto su immagini "normali")
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.needsUpdate = true;

            // Se vedi la texture capovolta sul modello GLB, prova:
            // tex.flipY = false;

            texturedMaterial = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0.0,
            });


            isLoaded = true;

            // se la checkbox è già ON quando finisce di caricare, applico
            if (checkbox.checked) applyMaterial(mesh, texturedMaterial);
        },
        undefined,
        (err) => {
            console.error("Errore caricamento texture:", textureUrl, err);
            // se fallisce, forzo OFF
            checkbox.checked = false;
        }
    );





    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
        if (!isLoaded || !texturedMaterial) {
            checkbox.checked = false;
            alert("Texture non ancora caricata (o non trovata).");
            return;
        }
        applyMaterial(mesh2, texturedMaterial);
        } else {
        restoreOriginal(mesh2, originalMaterial2);
        }
    });



 function applyMaterial(targetMesh, material) {
    if (Array.isArray(targetMesh.material)) {
      targetMesh.material = targetMesh.material.map(() => material);
    } else {
      targetMesh.material = material;
    }
    targetMesh.material.needsUpdate = true;
  }



    function restoreOriginal(mesh, originalMaterial) {
        mesh.material = originalMaterial;
        if (Array.isArray(mesh.material)) mesh.material.forEach(m => (m.needsUpdate = true));
        else mesh.material.needsUpdate = true;
    }
```