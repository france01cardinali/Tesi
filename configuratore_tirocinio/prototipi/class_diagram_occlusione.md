# Class diagram occlusione XR

## Obiettivo
Rappresentare le relazioni tra i moduli che implementano l occlusione XR nel codice attuale.

```mermaid
classDiagram
    direction LR

    class ThreeViewer {
        +core: ViewerCore
        +materials: MaterialController
        +ar: ARController
    }

    class ViewerCore {
        +renderer: THREE.WebGLRenderer
        +camera: THREE.PerspectiveCamera
        +modelRoot: THREE.Group
        +occlusion: handlerAROcclusion
        +registerOcclusionMaterial(material)
        +_updateOcclusionFromXRFrame(frame, camera)
        +_setOcclusionHasDepth(on)
    }

    class MaterialController {
        +setColorForMeshs(meshNames, mat)
        +enableOcclusionForModelRoot()
    }

    class AROcclusionModule {
        <<module>>
        +enableXROcclusionOnMaterial(material, core)
    }

    class handlerAROcclusion {
        -_materials: Set
        -_depthTex
        -_depthBytesRG
        +onSessionStart()
        +onSessionEnd()
        +registerMaterial(material)
        +setHasDepth(on)
        +updateFromXRFrame(frame, camera)
        +dispose()
    }

    class Material {
        +userData.xrOccEnabled
        +userData.xrOccUniforms
        +onBeforeCompile(shader)
        +needsUpdate
    }

    class XROcclusionUniforms {
        +uDepthTex
        +uViewport
        +uHasDepth
        +uRawToMeters
        +uDepthUvTransform
        +uUseDepthUvTransform
    }

    ThreeViewer *-- ViewerCore
    ThreeViewer *-- MaterialController

    ViewerCore *-- handlerAROcclusion
    MaterialController --> AROcclusionModule : apply on materials
    AROcclusionModule --> ViewerCore : registerOcclusionMaterial
    AROcclusionModule --> Material : patch shader + flags
    AROcclusionModule --> XROcclusionUniforms : creates in userData

    handlerAROcclusion --> Material : iterates registered materials
    handlerAROcclusion --> XROcclusionUniforms : updates every XR frame
```

## Note
- `AROcclusionModule` rappresenta il file `AROcclusion.js` (funzione export), non una classe ES6.
- `handlerAROcclusion` e il manager runtime usato realmente da `ViewerCore`.
