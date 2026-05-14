# Meccanismo cambio colore materiali

## Scopo
Cambiare materiale per gruppi di mesh scelti da UI, con cache e compatibilita occlusione XR.

## File coinvolti
- `src/script/ui/createSelect.js`
- `src/script/viewer/MaterialController.js`
- `src/script/materials/CreateMaterial.js`
- `src/script/handler/handlerMaterial.js`
- `src/script/ar/AROcclusion.js`

## Flusso reale
1. `createSelect` costruisce select per ogni gruppo materiale dal JSON.
2. Su `change`:
   - recupera materiale scelto da `jsonStore.getMaterialByName`
   - recupera mesh target del gruppo
   - chiama `viewer.setColorForMesh(meshs, mat)`
3. `MaterialController.setColorForMeshs`:
   - trova oggetti in scena per nome
   - ottiene materiale da `materialStore.setMaterial`
   - abilita occlusione sul materiale (`enableXROcclusionOnMaterial`)
   - applica materiale uguale a tutte le mesh target
4. `CreateMaterial` cachea materiali per nome e conserva il default per mesh.

## Tipi materiale supportati
- `standard` con colore pieno
- texture map caricata da URL
- `Default` per ripristinare materiale originale salvato

```mermaid
flowchart TD
  A[user change select] --> B[get mat and mesh group from jsonStore]
  B --> C[viewer setColorForMesh]
  C --> D[materialStore setMaterial]
  D --> E[cache hit or create]
  E --> F[enable occlusion on material]
  F --> G[assign material to target meshes]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant SEL as createSelect UI
    participant JSON as jsonStore
    participant TV as ThreeViewer
    participant MATC as MaterialController
    participant STORE as materialStore
    participant OCC as AROcclusion

    U->>SEL: change material option
    SEL->>JSON: getMaterialByName(name)
    SEL->>JSON: getMeshsByNameGroup(group)
    SEL->>TV: setColorForMesh(meshs, mat)
    TV->>MATC: setColorForMeshs(meshs, mat)
    MATC->>STORE: setMaterial(targetMesh, mat)
    STORE-->>MATC: material instance
    MATC->>OCC: enableXROcclusionOnMaterial(material, core)
    MATC->>MATC: assign material to all targets
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class CreateSelectUI {
        <<module>>
        +createSelect(viewer)
    }

    class ConfJson {
        +getMaterialByName(name)
        +getMeshsByNameGroup(groupName)
    }

    class ThreeViewer {
        +setColorForMesh(meshs, mat)
    }

    class MaterialController {
        +setColorForMeshs(meshNames, mat)
        +enableOcclusionForModelRoot()
    }

    class CreateMaterialStore {
        +setMaterial(mesh, material)
        +getDefault(mesh)
    }

    class AROcclusionModule {
        <<module>>
        +enableXROcclusionOnMaterial(material, core)
    }

    CreateSelectUI --> ConfJson : resolve mat + target meshes
    CreateSelectUI --> ThreeViewer : call setColorForMesh
    ThreeViewer --> MaterialController : delegates
    MaterialController --> CreateMaterialStore : create/cache material
    MaterialController --> AROcclusionModule : patch for XR occlusion
```
