# Class diagram generale AR (aggiornato)

## Obiettivo
Unire in un unico diagramma le funzionalita principali attive:
- gestione viewer e rendering
- load/modifica modello
- placement AR
- anchor + coordinamento re-anchor
- gesture
- occlusione XR

```mermaid
classDiagram
    direction LR

    class ThreeViewer {
        +core: ViewerCore
        +model: ModelController
        +materials: MaterialController
        +env: EnvironmentController
        +ar: ARController
        +placement: ARPlacementDetection
        +anchor: ARAnchorController
        +anchoring: ARAnchoringCoordinator
        +gestures: ARGestures
    }

    class ViewerCore {
        +scene
        +camera
        +renderer
        +modelRoot
        +occlusion: handlerAROcclusion
        +registerOcclusionMaterial(material)
        +_updateOcclusionFromXRFrame(frame, camera)
    }

    class ModelController {
        +loadGLB(url)
        +getDimensions()
        +setNonUniformScaleByCm(p)
        +setDefaultDim()
    }

    class MaterialController {
        +setColorForMeshs(meshNames, mat)
        +enableOcclusionForModelRoot()
    }

    class EnvironmentController {
        +setEnviromentHDR(hdrUrl)
    }

    class ARController {
        +createARButton(domRoot)
    }

    class ARPlacementDetection {
        +session: ARPlacementSessionController
        +frame: ARPlacementFrameController
        +service: ARPlacementService
        +reticleCtrl: ARReticleController
        +reticleValidity: ARReticleValidityController
        +modelPlacer: ARModelPlacer
        +update(frame)
        +placeModel()
    }

    class ARAnchorController {
        +attachToCurrentSession()
        +anchorFromObjectPose(frame, obj)
        +anchorFromLastValidHit(frame, hit)
        +update(frame, obj)
        +suspendAnchoring()
        +detach()
    }

    class ARAnchoringCoordinator {
        +onSessionStart()
        +onSessionEnd()
        +onFrame(frame)
        +requestReanchor()
    }

    class ARGestures {
        +setPlacementDetection(pd)
        +setAnchorController(anchor)
        +setOnAnchorResumeRequested(cb)
        +enable()
        +dispose()
    }

    class handlerAROcclusion {
        +onSessionStart()
        +onSessionEnd()
        +registerMaterial(material)
        +updateFromXRFrame(frame, camera)
    }

    class AROcclusionModule {
        <<module>>
        +enableXROcclusionOnMaterial(material, core)
    }

    ThreeViewer *-- ViewerCore
    ThreeViewer *-- ModelController
    ThreeViewer *-- MaterialController
    ThreeViewer *-- EnvironmentController
    ThreeViewer *-- ARController
    ThreeViewer *-- ARPlacementDetection
    ThreeViewer *-- ARAnchorController
    ThreeViewer *-- ARAnchoringCoordinator
    ThreeViewer *-- ARGestures

    ViewerCore *-- handlerAROcclusion
    MaterialController --> AROcclusionModule
    AROcclusionModule --> ViewerCore : register material for occlusion

    ARAnchoringCoordinator --> ARAnchorController
    ARAnchoringCoordinator --> ARPlacementDetection
    ARAnchoringCoordinator --> ViewerCore

    ARGestures --> ARAnchorController : suspend/resume anchor
    ARGestures --> ARPlacementDetection : reticle and placement context
```

## Lettura rapida
- placement e anchoring lavorano in parallelo: il coordinator crea/recrea anchor quando serve.
- gesture sospende l anchor durante manipolazione e richiede re-anchor al rilascio.
- occlusione e separata: materiali patchati da `AROcclusion` e aggiornati per-frame da `handlerAROcclusion`.
