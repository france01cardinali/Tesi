# Flusso logico occlusione XR (dettagliato)

## 1. Scopo reale del sistema
L obiettivo non e "disegnare una maschera", ma decidere pixel-per-pixel se il frammento del modello virtuale deve essere visibile oppure no.

Il criterio e:
- leggo la distanza reale dal sensore depth del device (`realM`)
- calcolo la distanza del frammento virtuale dalla camera (`virtualM`)
- se il reale e davanti al virtuale, il frammento virtuale viene scartato (`discard`)

In questo modo un oggetto fisico davanti alla camera puo coprire correttamente il modello 3D.

## 2. Mappa componenti (chi fa cosa)
- `src/script/viewer/ThreeViewer.js`
  - avvia i controller.
  - al `model:loaded` abilita occlusione su tutti i materiali del modello.
- `src/script/viewer/MaterialController.js`
  - applica `enableXROcclusionOnMaterial(...)` ai materiali.
- `src/script/ar/AROcclusion.js`
  - patch shader (`onBeforeCompile`) e definizione uniform custom.
- `src/script/viewer/ViewerCore.js`
  - ciclo di render per frame.
  - forward dei metodi `registerOcclusionMaterial`, `setHasDepth`, `updateFromXRFrame`.
  - importa il manager da `src/script/handler/handlerAROcclusion.js`.
- `src/script/handler/handlerAROcclusion.js`
  - runtime manager della depth XR (lettura frame, conversione buffer, update uniform).
- `src/script/ar/ARController.js`
  - richiede `depth-sensing` nella sessione WebXR AR.

## 3. Stato dati persistente

### 3.1 Stato per materiale (`AROcclusion.js`)
Ogni materiale abilitato riceve:
- `material.userData.xrOccEnabled = true`
- `material.userData.xrOccUniforms = { ... }`

Uniform principali:
- `uDepthTex`: texture depth RG8 aggiornata ogni frame
- `uViewport`: dimensione drawing buffer (pixel)
- `uOccEnable`: interruttore logico shader
- `uHasDepth`: segnala se la depth frame corrente e valida
- `uNear`, `uFar`: piani camera (in parte usati per validazione)
- `uRawToMeters`: fattore di conversione raw depth -> metri
- `uDepthUvTransform`: matrice di allineamento UV view/depth
- `uUseDepthUvTransform`: abilita/disabilita matrice UV
- `uModelScale`: scala world del modello (ora solo aggiornata, non usata nel confronto)

### 3.2 Stato manager (`handlerAROcclusion.js`)
`handlerAROcclusion` mantiene:
- `_materials`: `Set` di tutti i materiali registrati
- `_depthTex`: `THREE.DataTexture` condivisa per tutti i materiali
- `_depthBytesRG`: buffer `Uint8Array` (2 byte per pixel depth)
- `_depthW`, `_depthH`: dimensioni depth corrente
- flag di log (`_warnedNoDepthInfo`, `_warnedNoRefSpace`, `_loggedDepthInfo`)

## 4. Lifecycle completo

### 4.1 Bootstrap
1. `ViewerCore` crea renderer/camera/scene.
2. `ViewerCore` crea `this.occlusion = new handlerAROcclusion({ renderer, modelRoot })`.
3. Hook XR:
   - `sessionstart` -> `occlusion.onSessionStart()`
   - `sessionend` -> `occlusion.onSessionEnd()`

Effetto pratico:
- all avvio sessione resetta i flag warning/log
- a fine sessione forza `uHasDepth = 0`

### 4.2 Registrazione materiali occludibili
1. Evento `model:loaded` in `ThreeViewer`.
2. `MaterialController.enableOcclusionForModelRoot()` traversa `core.modelRoot`.
3. Per ogni materiale chiama `enableXROcclusionOnMaterial(material, core)`.
4. `enableXROcclusionOnMaterial` registra il materiale via:
   - `core.registerOcclusionMaterial(material)`
   - `ViewerCore` delega a `occlusion.registerMaterial(material)`

Nota importante:
- se il materiale e gia marcato con `xrOccEnabled`, la funzione esce subito.
- evita doppio patching shader e doppia registrazione logica.

### 4.3 Richiesta sessione AR con depth
`ARController.createARButton(...)` richiede:
- `requiredFeatures: ["hit-test"]`
- `optionalFeatures`: include `"depth-sensing"`
- `depthSensing`:
  - `usagePreference: ["cpu-optimized"]`
  - `dataFormatPreference: ["luminance-alpha"]`

Se `depth-sensing` non viene concessa, compare warning e l occlusione resta disattiva (nessun `discard`).

### 4.4 Aggiornamento ogni frame
Nel loop `renderer.setAnimationLoop(...)` in `ViewerCore`:
1. chiama la logica di placement (`onFrame`)
2. se sessione XR attiva e frame valido:
   - `_resizeFromXRFrame(frame)`
   - `_updateOcclusionFromXRFrame(frame, xrCamera)`
3. se non in XR:
   - `_setOcclusionHasDepth(false)`

Questa scelta evita artefatti: fuori AR lo shader rimane patchato, ma non applica occlusione.

## 5. Cosa fa davvero `updateFromXRFrame(...)`

### 5.1 Gate iniziali
1. prende `referenceSpace`; se manca:
   - `setHasDepth(false)`
   - warning una sola volta
   - return
2. prende `viewerPose`; se non valida:
   - `setHasDepth(false)`
   - return
3. usa la prima `view` (`pose.views[0]`)
4. prova `frame.getDepthInformation(view)` in `try/catch`
5. se `depthInfo?.data` manca:
   - `setHasDepth(false)`
   - warning una sola volta
   - return

### 5.2 Allocazione / riuso texture depth
Se dimensione depth cambia (o prima volta):
- crea `Uint8Array(w * h * 2)` per canali R/G
- crea `THREE.DataTexture(..., THREE.RGFormat, THREE.UnsignedByteType)`
- imposta:
  - `NearestFilter` (niente interpolazione)
  - `generateMipmaps = false`
  - `flipY = false`

Motivo:
- la depth raw e discreta, quindi nearest evita smoothing non fisico.

### 5.3 Conversione buffer raw16 -> RG8
`depthInfo.data` viene letto come `Uint16Array`.

Per ogni pixel:
- `R = low byte` (`value & 0xff`)
- `G = high byte` (`(value >> 8) & 0xff`)

Poi `uDepthTex.needsUpdate = true`.

Questo consente allo shader di ricostruire il `raw16` originale:
`raw16 = hi * 256 + lo`.

### 5.4 Uniform update su tutti i materiali
Per ogni materiale registrato con `xrOccUniforms`:
- `uDepthTex = _depthTex`
- `uViewport = drawingBufferSize`
- `uHasDepth = 1.0`
- `uNear`, `uFar` dalla camera XR attiva
- `uRawToMeters = depthInfo.rawValueToMeters`
- `uDepthUvTransform` + `uUseDepthUvTransform`:
  - se disponibile `normDepthBufferFromNormView`, la usa
  - altrimenti identity + flag 0
- `uModelScale = modelRoot world scale`

## 6. Cosa fa davvero lo shader patchato (`AROcclusion.js`)

### 6.1 Punto di iniezione
`onBeforeCompile` modifica il fragment shader in due punti:
1. prima di `void main()` aggiunge uniform/funzioni helper
2. sostituisce `#include <opaque_fragment>` con blocco occlusione + include originale

In pratica:
- tutta la pipeline PBR originale resta attiva
- viene solo inserito un gate di `discard` prima dell output opaco.

### 6.2 Funzioni helper
- `readRealDepthMeters(uv)`
  - legge texel RG
  - ricostruisce raw16
  - converte in metri con `uRawToMeters`
- `toDepthUv(uvView)`
  - se il device espone la matrice, converte UV view -> UV depth
  - fallback: usa UV dirette
- `isValidDepthValue(d)`
  - filtra depth non utili (`d <= 0.0001` o troppo oltre `uFar * 1.5`)

### 6.3 Confronto depth reale/virtuale
Nel blocco attivo solo se `uOccEnable > 0.5 && uHasDepth > 0.5`:
1. `uv = gl_FragCoord.xy / uViewport`
2. flip Y per passare a UV view: `uvView = vec2(uv.x, 1.0 - uv.y)`
3. eventuale trasformazione UV con `toDepthUv`
4. clamp in `[0,1]`
5. `realM = readRealDepthMeters(uvDepth)`
6. `virtualM = length(vViewPosition)`
7. confronto con epsilon fisso:
   - `eps = 0.01` metri (1 cm)
   - se `realM < virtualM - eps` -> `discard`

Significato fisico:
- se il mondo reale e davanti al punto del modello, quel pixel virtuale non deve apparire.

## 7. Comportamento di fallback (quando non occlude)
L occlusione viene bypassata in questi casi:
- non sei in sessione XR
- `referenceSpace` non disponibile
- `viewerPose` non valida
- `getDepthInformation` assente o fallita
- depth data mancante

Implementazione:
- manager imposta `uHasDepth = 0`
- shader non entra nel blocco `discard`

## 8. Cleanup e uscita sessione
- `sessionend` -> `onSessionEnd()` -> `setHasDepth(false)`
- `ViewerCore.dispose()` -> `occlusion.dispose()`:
  - svuota `_materials`
  - `dispose()` della `DataTexture`
  - reset buffer interno

## 9. Sequenza operativa compatta
```text
MODEL LOADED
  -> traverse modelRoot
  -> enableXROcclusionOnMaterial(material)
      -> attach uniforms
      -> patch shader (onBeforeCompile)
      -> register material in manager set

AR SESSION START
  -> onSessionStart() reset warning/log flags

EACH XR FRAME
  -> read referenceSpace + viewer pose
  -> getDepthInformation(view)
  -> convert raw16 depth to RG8 texture
  -> push uniforms to all registered materials
  -> fragment shader compares realM vs virtualM
  -> if realM < virtualM - 1cm => discard pixel

NO DEPTH / SESSION END
  -> uHasDepth = 0
  -> shader keeps rendering normally (no occlusion)
```

## 10. Limiti attuali visibili nel codice
- viene usata solo la prima `view` (`pose.views[0]`)
- `uNear` e poco sfruttato nella logica corrente
- `uModelScale` e aggiornato ma non entra nel confronto
- epsilon fisso (1 cm), non adattivo
- quality dipende dalla depth CPU (rumore, risoluzione, latenza)

## 11. Diagramma Mermaid (runtime)
```mermaid
flowchart TD
  A[Model loaded] --> B[MaterialController.enableOcclusionForModelRoot]
  B --> C[enableXROcclusionOnMaterial]
  C --> D[Attach uniforms + patch shader onBeforeCompile]
  D --> E[ViewerCore.registerOcclusionMaterial]
  E --> F[handlerAROcclusion._materials add material]

  F --> G[AR session start]
  G --> H[occlusion.onSessionStart reset flags]

  H --> I[Per XR frame in ViewerCore]
  I --> J{XR presenting and frame valid}
  J -- No --> K[occlusion.setHasDepth false]
  K --> Z[Render normal, no discard]

  J -- Yes --> L[occlusion.updateFromXRFrame]
  L --> M{referenceSpace available}
  M -- No --> K

  M -- Yes --> N{viewerPose and view available}
  N -- No --> K

  N -- Yes --> O[getDepthInformation view]
  O --> P{depthInfo.data available}
  P -- No --> K

  P -- Yes --> Q[Allocate or reuse DataTexture RG8]
  Q --> R[Convert raw16 to RG bytes]
  R --> S[Update uniforms uDepthTex uViewport uRawToMeters uHasDepth]
  S --> T[Fragment shader occlusion block]

  T --> U[Compute uv and optional depth uv transform]
  U --> V[readRealDepthMeters from RG8]
  V --> W[virtualM length vViewPosition]
  W --> X{realM < virtualM - eps}
  X -- Yes --> Y[discard fragment]
  X -- No --> Z

  G --> AA[AR session end]
  AA --> AB[occlusion.onSessionEnd setHasDepth false]
  AB --> Z
```

## 12. Sequence Diagram (interazioni runtime)
```mermaid
sequenceDiagram
    autonumber
    participant U as Utente
    participant TV as ThreeViewer
    participant MC as MaterialController
    participant ARO as AROcclusion module
    participant VC as ViewerCore
    participant XROM as handlerAROcclusion
    participant XR as XRFrame/WebXR
    participant SH as Shader frammento materiale

    U->>TV: carica modello GLB
    TV->>MC: enableOcclusionForModelRoot()
    loop per ogni mesh/materiale del modelRoot
        MC->>ARO: enableXROcclusionOnMaterial(material, core)
        ARO->>ARO: crea uniforms in material.userData.xrOccUniforms
        ARO->>ARO: patch fragment shader (onBeforeCompile)
        ARO->>VC: registerOcclusionMaterial(material)
        VC->>XROM: registerMaterial(material)
    end

    U->>TV: avvia AR (ARButton)
    note over TV,XR: ARController richiede depth-sensing (optional feature)
    XR-->>VC: event sessionstart
    VC->>XROM: onSessionStart()

    loop ogni frame XR (animation loop)
        VC->>XROM: updateFromXRFrame(frame, xrCamera)
        XROM->>XR: getViewerPose(referenceSpace)
        XROM->>XR: getDepthInformation(view)

        alt depth info non disponibile
            XROM->>XROM: setHasDepth(false)
            XROM-->>SH: uHasDepth = 0
        else depth info disponibile
            XROM->>XROM: alloca/riusa DataTexture RG8
            XROM->>XROM: converte raw16 depth in byte RG
            XROM->>XROM: aggiorna uniforms (uDepthTex/uViewport/uRawToMeters/...)
            XROM-->>SH: uHasDepth = 1 e depth aggiornata
            SH->>SH: calcola realM e virtualM
            alt realM < virtualM - eps
                SH->>SH: discard frammento
            else realM >= virtualM - eps
                SH->>SH: render normale del frammento
            end
        end

        VC->>VC: renderer.render(scene, cameraToUse)
    end

    XR-->>VC: event sessionend
    VC->>XROM: onSessionEnd()
    XROM->>XROM: setHasDepth(false)
```

## 13. Class Diagram (occlusione)
```mermaid
classDiagram
    direction LR

    class ThreeViewer {
        +core: ViewerCore
        +materials: MaterialController
        +ar: ARController
    }

    class ViewerCore {
        +renderer
        +camera
        +modelRoot
        +occlusion: handlerAROcclusion
        +registerOcclusionMaterial(material)
        +_updateOcclusionFromXRFrame(frame, cameraToUse)
        +_setOcclusionHasDepth(on)
    }

    class MaterialController {
        +enableOcclusionForModelRoot()
        +setColorForMeshs(meshNames, mat)
    }

    class ARController {
        +createARButton(domRoot)
    }

    class AROcclusionModule {
        <<module>>
        +enableXROcclusionOnMaterial(material, core)
    }

    class handlerAROcclusion {
        -_materials
        -_depthTex
        -_depthBytesRG
        +onSessionStart()
        +onSessionEnd()
        +registerMaterial(material)
        +setHasDepth(on)
        +updateFromXRFrame(frame, cameraToUse)
        +dispose()
    }

    class Material {
        +userData.xrOccEnabled
        +userData.xrOccUniforms
        +onBeforeCompile(shader)
    }

    class XROcclusionUniforms {
        +uDepthTex
        +uViewport
        +uOccEnable
        +uHasDepth
        +uNear
        +uFar
        +uRawToMeters
        +uDepthUvTransform
        +uUseDepthUvTransform
        +uModelScale
    }

    ThreeViewer *-- ViewerCore : owns
    ThreeViewer *-- MaterialController : owns
    ThreeViewer *-- ARController : owns

    ViewerCore *-- handlerAROcclusion : owns
    MaterialController --> AROcclusionModule : calls
    AROcclusionModule --> ViewerCore : registerOcclusionMaterial()
    AROcclusionModule --> Material : patch shader + flags
    AROcclusionModule --> XROcclusionUniforms : creates

    handlerAROcclusion --> Material : iterates registered set
    handlerAROcclusion --> XROcclusionUniforms : updates per frame
    ARController --> ViewerCore : uses core.renderer
```

