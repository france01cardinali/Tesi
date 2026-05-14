# Meccanismo cambio dimensioni

## Scopo
Scalare il modello in modo non uniforme su X Y Z usando input in centimetri e vincoli min/max.

## File coinvolti
- `src/script/ui/createDim.js`
- `src/script/handler/handlerDimension.js`
- `src/script/viewer/ModelController.js`

## Flusso reale
1. `createDim` crea input numerici per dimensioni consentite dalle regole JSON.
2. Su cambio input chiama `updateDim(viewer)`.
3. `updateDim`:
   - legge e clampa valori da input
   - converte in cm target per asse
   - invoca `viewer.setNonUniformScaleByCm`.
4. `ModelController.setNonUniformScaleByCm`:
   - usa `baseSizeMeters` per calcolare fattori scala
   - applica clamp minimo (`minScaleRatio`)
   - applica scala su `modelRoot`
   - aggiorna target controlli desktop
5. Pulsanti aggiuntivi:
   - `reset` -> `setDefaultDim`
   - `test` -> `testDim`

## Formula chiave
`scaleX = targetX_m / baseSizeX_m` (stesso per Y e Z)

```mermaid
flowchart TD
  A[input change] --> B[updateDim]
  B --> C[clamp values]
  C --> D[setNonUniformScaleByCm]
  D --> E[compute per axis scale]
  E --> F[apply modelRoot scale]
  F --> G[sync input from current dimensions]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant DIM as createDim UI
    participant HD as handlerDimension
    participant TV as ThreeViewer
    participant MC as ModelController

    U->>DIM: edit X/Y/Z input
    DIM->>HD: updateDim(viewer)
    HD->>HD: parse and clamp input values
    HD->>TV: setNonUniformScaleByCm({xCm,yCm,zCm})
    TV->>MC: setNonUniformScaleByCm(params)
    MC->>MC: compute per-axis scale from baseSize
    MC->>MC: apply modelRoot.scale and update controls target
    HD->>HD: sync inputs from current dimensions
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class CreateDimUI {
        <<module>>
        +createDim(viewer, regole)
    }

    class HandlerDimension {
        <<module>>
        +updateDim(viewer)
        +setDefaultDim(viewer)
        +dimTest(viewer)
    }

    class ThreeViewer {
        +getDimensions()
        +setNonUniformScaleByCm(p)
        +setDefaultDim()
        +testDim()
    }

    class ModelController {
        +setNonUniformScaleByCm(params)
        +setDefaultDim()
        +testDim()
    }

    CreateDimUI --> HandlerDimension : input events
    HandlerDimension --> ThreeViewer : update/reset/test
    ThreeViewer --> ModelController : apply model scale
```
