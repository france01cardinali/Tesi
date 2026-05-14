# Meccanismo load modello

## Scopo
Caricare il GLB in scena, creare pivot centrale e preparare camera/controlli/materiali base.

## File coinvolti
- `src/script/viewer/ModelController.js`
- `src/script/viewer/ThreeViewer.js`

## Flusso reale
1. `ModelController.loadGLB(url)` resetta `modelRoot` (posizione, rotazione, scala).
2. Carica il GLB con `GLTFLoader.loadAsync`.
3. Calcola bounding box del modello e il suo centro world.
4. Crea un `pivot` nel centro e rimonta la gerarchia: `modelRoot -> pivot -> model`.
5. Forza `depthTest/depthWrite=true` sui materiali mesh.
6. Salva dimensioni base (`baseSizeMeters`) per scaling successivo.
7. Adatta near/far camera e posiziona la camera in base al bounding size.
8. Fuori AR aggiorna `OrbitControls.target` al centro modello.
9. Emette evento `model:loaded`.

## Effetti indiretti
In `ThreeViewer`, su `model:loaded`:
- collega target gesture
- abilita occlusione sui materiali modello

```mermaid
flowchart TD
  A[loadGLB] --> B[reset modelRoot]
  B --> C[load gltf scene]
  C --> D[compute bbox center]
  D --> E[create pivot centered]
  E --> F[set material depth flags]
  F --> G[store base dimensions]
  G --> H[fit camera]
  H --> I[event model loaded]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant APP as App
    participant TV as ThreeViewer
    participant MC as ModelController
    participant GLTF as GLTFLoader
    participant CORE as ViewerCore
    participant EVT as EventTarget

    APP->>TV: loadGLB(url)
    TV->>MC: loadGLB(url)
    MC->>CORE: reset modelRoot transform
    MC->>GLTF: loadAsync(url)
    GLTF-->>MC: gltf.scene
    MC->>MC: compute bbox, center, create pivot
    MC->>MC: set material depth flags
    MC->>MC: store base dimensions
    MC->>CORE: fit camera and controls target
    MC->>EVT: dispatch "model:loaded"
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class ThreeViewer {
        +loadGLB(url)
    }

    class ModelController {
        +loadGLB(url)
        +getDimensions()
        +setNonUniformScaleByCm(p)
        +setDefaultDim()
    }

    class ViewerCore {
        +scene
        +camera
        +modelRoot
        +controls
        +renderer
    }

    class GLTFLoader {
        +loadAsync(url)
    }

    ThreeViewer --> ModelController : delegates
    ModelController --> ViewerCore : updates scene/model/camera
    ModelController --> GLTFLoader : load model asset
```
