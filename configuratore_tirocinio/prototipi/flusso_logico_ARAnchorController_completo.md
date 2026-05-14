# Flusso logico ARAnchorController (completo)

## 1. Obiettivo
`ARAnchorController` mantiene il modello agganciato a un anchor WebXR per stabilizzare la posa nel mondo reale.

Capacita principali:
- agganciare da hit-test (`anchorFromLastValidHit`)
- agganciare dalla posa corrente del modello (`anchorFromObjectPose`)
- aggiornare il modello per-frame seguendo l anchor
- sospendere/ripristinare ancoraggio con cleanup sicuro

## 2. Moduli e dipendenze
- `ARAnchorController.js`: logica anchor
- `ViewerCore`: fornisce `renderer.xr`, `camera`, `modelRoot`
- `ARPlacementDetection`: fornisce tipicamente `lastValidHit` per primo anchor
- WebXR API: `XRAnchor`, `XRSpace`, `XRRigidTransform`, `frame.getPose`

## 3. Stato interno
- `session`: sessione XR corrente
- `refSpace`: reference space per risolvere pose
- `anchor`: handle `XRAnchor`
- `anchorSpace`: spazio dell anchor
- `keepYOffset`: offset Y opzionale post-ancoraggio
- temporanei math: `_tmpM4`, `_tmpPos`, `_tmpQuat`, `_tmpScale`

## 4. Flusso dettagliato

### 4.1 Attach/detach sessione
`attachToCurrentSession()`:
1. legge session e referenceSpace da `core.renderer.xr`
2. salva in stato interno
3. ritorna true solo se entrambi disponibili

`detach()`:
1. `clearAnchor()`
2. azzera `session` e `refSpace`

### 4.2 Creazione anchor da last valid hit
`anchorFromLastValidHit(frame, lastValidHit)`:
1. valida prerequisiti (`frame`, `refSpace`, `hit`)
2. path preferito: `hit.createAnchor()` se disponibile
3. fallback: `frame.createAnchor(pose.transform, refSpace)`
4. su successo aggiorna `anchor` e `anchorSpace`
5. su errore esegue cleanup e ritorna false

### 4.3 Creazione anchor dalla posa oggetto
`anchorFromObjectPose(frame, object3D)`:
1. valida prerequisiti (`frame`, `refSpace`, `object3D` o `core.modelRoot`)
2. decompone `matrixWorld` in posizione+rotazione+scala
3. applica offset `keepYOffset` se impostato
4. crea `XRRigidTransform`
5. chiama `frame.createAnchor(transform, refSpace)`
6. salva `anchor` e `anchorSpace` su successo

### 4.4 Update per-frame: follow anchor
`update(frame, object3D)`:
1. esce se manca `frame`, `anchorSpace` o `refSpace`
2. risolve `pose = frame.getPose(anchorSpace, refSpace)`
3. converte `pose.transform.matrix` in `Matrix4`
4. copia su `obj.matrix` e decompone su `position/quaternion/scale`

Effetto: il modello segue il tracking dell anchor invece della sola posa iniziale hit-test.

### 4.5 Suspend e cleanup
- `suspendAnchoring()`: invoca `clearAnchor()` (utile durante pan)
- `clearAnchor()`:
  - prova `anchor.delete()`
  - azzera `anchor` e `anchorSpace`

## 5. Mermaid flowchart
```mermaid
flowchart TD
  A[session attiva] --> B[attachToCurrentSession]
  B --> C{session e refSpace presenti?}
  C -- No --> D[ritorna false]
  C -- Yes --> E[pronto per creare anchor]

  E --> F{source anchor?}
  F -- lastValidHit --> G[anchorFromLastValidHit]
  F -- object pose --> H[anchorFromObjectPose]

  G --> I{hit.createAnchor disponibile?}
  I -- Yes --> J[createAnchor su hit]
  I -- No --> K[frame.createAnchor da pose hit]

  H --> L[decompose matrixWorld + keepYOffset]
  L --> M[create XRRigidTransform]
  M --> N["frame.createAnchor(transform, refSpace)"]

  J --> O{successo?}
  K --> O
  N --> O
  O -- No --> P[clearAnchor + false]
  O -- Yes --> Q[salva anchor e anchorSpace]

  Q --> R[update per frame]
  R --> S["getPose(anchorSpace, refSpace)"]
  S --> T{pose valida?}
  T -- No --> R
  T -- Yes --> U[applica matrix al modelRoot]
  U --> R

  V[suspendAnchoring/detach] --> W[clearAnchor]
```

## 6. Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant TV as ThreeViewer loop
    participant G as ARGestures
    participant COORD as ARAnchoringCoordinator
    participant PLC as ARPlacementDetection
    participant ANC as ARAnchorController
    participant XR as XR Session/Frame
    participant OBJ as modelRoot

    XR-->>TV: sessionstart
    TV->>COORD: onSessionStart()

    loop each XR frame
        TV->>COORD: onFrame(frame)

        alt anchor not attached and placement ready
            COORD->>ANC: attachToCurrentSession()
            ANC->>XR: getSession + getReferenceSpace
            XR-->>ANC: session/refSpace
        end

        alt justPlaced or reanchor pending
            COORD->>ANC: anchorFromObjectPose(frame, modelRoot)
            ANC->>OBJ: updateMatrixWorld + decompose
            ANC->>XR: frame.createAnchor(XRRigidTransform, refSpace)
            alt object pose failed
                COORD->>PLC: read lastValidHit
                COORD->>ANC: anchorFromLastValidHit(frame, lastValidHit)
                ANC->>XR: hit.createAnchor or frame.createAnchor fallback
            end
        end

        COORD->>ANC: update(frame, modelRoot)
        ANC->>XR: getPose(anchorSpace, refSpace)
        XR-->>ANC: pose matrix
        ANC->>OBJ: copy matrix + decompose
    end

    U->>G: pan or rotate gesture
    G->>ANC: suspendAnchoring()
    U->>G: pointer end
    G->>COORD: requestReanchor() via callback

    XR-->>TV: sessionend
    TV->>COORD: onSessionEnd()
    COORD->>ANC: detach()
    ANC->>XR: anchor.delete()
```

## 7. Class diagram
```mermaid
classDiagram
    direction LR

    class ARAnchorController {
        +core
        +session
        +refSpace
        +anchor
        +anchorSpace
        +keepYOffset
        +attachToCurrentSession()
        +detach()
        +isAnchored()
        +suspendAnchoring()
        +anchorFromLastValidHit(frame, lastValidHit)
        +anchorFromObjectPose(frame, object3D)
        +update(frame, object3D)
        +clearAnchor()
    }

    class ViewerCore {
        +renderer
        +modelRoot
    }

    class XRAnchor {
        +anchorSpace
        +delete()
    }

    class XRFrame {
        +getPose(space, refSpace)
        +createAnchor(transform, refSpace)
    }

    class XRHitTestResult {
        +getPose(referenceSpace)
        +createAnchor()
    }

    class XRRigidTransform {
        +position
        +orientation
    }

    ARAnchorController --> ViewerCore : uses core.renderer/core.modelRoot
    ARAnchorController --> XRFrame : createAnchor/getPose
    ARAnchorController --> XRHitTestResult : optional createAnchor path
    ARAnchorController --> XRAnchor : stores current anchor
    ARAnchorController --> XRRigidTransform : builds from object pose
```

## 8. Limiti e attenzioni
- se il device/sessione non supporta anchors, i metodi tornano false
- `update` non modifica nulla se `anchorSpace` non e attivo
- conviene chiamare `suspendAnchoring` durante pan per evitare conflitti tra gesture e follow anchor
- `keepYOffset` va usato con cura per non introdurre drift verticale percepito


## 9. Integrazione con ARAnchoringCoordinator (nuovo)
Nel codice attuale, `ARAnchorController` non viene chiamato direttamente dal loop principale: c e `ARAnchoringCoordinator` che decide quando agganciare/re-agganciare.

Regole operative del coordinator:
- su `sessionstart` resetta i flag interni
- appena placement e ready prova `attachToCurrentSession`
- quando rileva `justPlaced` imposta `reanchorPending`
- durante gesture, il sistema puo chiamare `requestReanchor()`
- su ogni frame prova a creare anchor se pendente (`anchorFromObjectPose`, fallback `anchorFromLastValidHit`)
- poi chiama sempre `anchor.update(frame, modelRoot)`

```mermaid
flowchart TD
  A[sessionstart] --> B[coordinator.onSessionStart]
  B --> C[flags reset]

  C --> D[onFrame]
  D --> E{placement ready and anchor not attached}
  E -- Yes --> F[anchor.attachToCurrentSession]
  E -- No --> G[continue]
  F --> G

  G --> H{justPlaced or reanchor requested}
  H -- Yes --> I[try create anchor]
  I --> J[anchorFromObjectPose]
  J --> K{ok?}
  K -- No --> L[anchorFromLastValidHit]
  K -- Yes --> M[anchor active]
  L --> M
  H -- No --> M

  M --> N[anchor.update each frame]
  N --> D
```
