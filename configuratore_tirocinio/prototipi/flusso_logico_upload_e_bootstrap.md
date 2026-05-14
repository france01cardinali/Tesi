# Meccanismo upload e bootstrap

## Scopo
Caricare i file utente (JSON regole + GLB) e inizializzare il viewer con modello e varianti UI.

## File coinvolti
- `src/script/main.js`
- `src/script/config/ConfJson.js`
- `src/script/handler/handlerModel.js`
- `src/script/handler/handlerVarianti.js`

## Flusso reale
1. `upload(glb, viewer, json)` legge il JSON con `jsonStore.setFromFileInput`.
2. `loadModel(glb)` usa `@gltf-transform` per leggere/scrivere il GLB e genera una Blob URL.
3. Viene chiamato `viewer.resize()` nel frame successivo.
4. Se URL valida, viene chiamato `viewer.loadGLB(url)`.
5. In una fase separata, `load(viewer)` chiama `loadVariant(viewer)` per montare i controlli UI dalle regole JSON.

## Note
- Se il file GLB manca, `loadModel` mostra `alert` e ritorna `null`.
- Le regole JSON guidano quali meccanismi UI vengono creati.

```mermaid
flowchart TD
  A[upload called] --> B[read JSON in ConfJson]
  B --> C[loadModel on file input]
  C --> D{url created}
  D -- No --> E[stop]
  D -- Yes --> F[viewer loadGLB]
  F --> G[later loadVariant]
  G --> H[build controls from regole]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant UI as UI Upload
    participant MAIN as main.upload
    participant CONF as ConfJson/jsonStore
    participant HMOD as handlerModel
    participant VIEW as ThreeViewer
    participant VAR as handlerVarianti

    UI->>MAIN: upload(glbInput, viewer, jsonInput)
    MAIN->>CONF: setFromFileInput(jsonInput)
    MAIN->>HMOD: loadModel(glbInput)
    HMOD-->>MAIN: blob URL or null
    alt URL present
        MAIN->>VIEW: loadGLB(url)
    else URL missing
        MAIN-->>UI: stop
    end

    UI->>MAIN: load(viewer)
    MAIN->>VAR: loadVariant(viewer)
    VAR-->>UI: controls generated
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class MainModule {
        <<module>>
        +upload(glb, viewer, json)
        +load(viewer)
    }

    class ConfJson {
        +setFromFileInput(inputEl)
        +getRegole()
    }

    class HandlerModel {
        <<module>>
        +loadModel(fileInputGlb)
    }

    class HandlerVarianti {
        <<module>>
        +loadVariant(viewer)
    }

    class ThreeViewer {
        +resize()
        +loadGLB(url)
    }

    MainModule --> ConfJson : read JSON rules
    MainModule --> HandlerModel : build GLB URL
    MainModule --> ThreeViewer : resize + loadGLB
    MainModule --> HandlerVarianti : load UI variants
    HandlerVarianti --> ThreeViewer : install controls bound to viewer
```
