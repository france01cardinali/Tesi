# Meccanismo avvio AR e overlay UI

## Scopo
Creare ARButton, gestire overlay DOM in sessione AR e spostare UI tra layout normale e overlay AR.

## File coinvolti
- `src/script/ui/createARButton.js`
- `src/script/ar/ARController.js`
- `src/script/viewer/ThreeViewer.js`

## Flusso reale
1. `createARButton(viewer)` prepara nodi DOM (`overlay`, host bottone, panel, fab).
2. Chiama `viewer.createARButton(overlay)`.
3. `ARController.createARButton` crea il bottone con feature XR:
   - required: `hit-test`
   - optional: `dom-overlay`, `plane-detection`, `depth-sensing`, `anchors`
4. Su `sessionstart`:
   - overlay visibile e interattivo
   - bottone e pannello spostati dentro overlay
   - eventi `ar:sessionstart` attivano gesture e anchoring reset
5. Su `sessionend`:
   - UI torna nel layout normale
   - overlay nascosto
   - resize e update controls

## Effetto
L UI rimane usabile in AR senza bloccare le gesture sulla superficie XR quando la sessione termina.

```mermaid
flowchart TD
  A[createARButton UI] --> B[viewer createARButton overlay]
  B --> C[button ready]
  C --> D{sessionstart}
  D -- Yes --> E[show overlay and move UI in overlay]
  E --> F[dispatch ar sessionstart]
  F --> G[gesture enable and anchoring start]
  D -- sessionend --> H[move UI back and hide overlay]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as createARButton UI
    participant TV as ThreeViewer
    participant ARC as ARController
    participant XR as WebXR session
    participant OV as DOM overlay

    UI->>TV: createARButton(overlay)
    TV->>ARC: createARButton(domRoot)
    ARC-->>UI: ARButton element

    U->>XR: press Enter AR
    XR-->>ARC: sessionstart
    ARC-->>TV: dispatch ar:sessionstart
    UI->>OV: show overlay and move controls in overlay

    U->>XR: press Exit AR
    XR-->>ARC: sessionend
    ARC-->>TV: dispatch ar:sessionend
    UI->>OV: move controls back and hide overlay
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class CreateARButtonUI {
        <<module>>
        +createARButton(viewer)
    }

    class ThreeViewer {
        +createARButton(domRoot)
        +xr
        +resize()
        +controls
    }

    class ARController {
        +createARButton(domRoot)
    }

    class ARButton {
        +createButton(renderer, options)
    }

    class DOMOverlay {
        +display
        +pointerEvents
    }

    CreateARButtonUI --> ThreeViewer : request AR button
    ThreeViewer --> ARController : delegates
    ARController --> ARButton : create XR enter/exit button
    CreateARButtonUI --> DOMOverlay : move UI in/out on session events
```
