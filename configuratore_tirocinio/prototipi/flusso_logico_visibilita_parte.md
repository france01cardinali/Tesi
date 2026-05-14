# Meccanismo visibilita componente

## Scopo
Mostrare/nascondere una parte specifica di un gruppo mesh usando uno switch UI.

## File coinvolti
- `src/script/ui/createVisible.js`
- `src/script/config/ConfJson.js`

## Flusso reale
1. `createVisible(viewer, pezzo)` crea switch nella UI.
2. Su toggle chiama `setGroupVisibilityByStore("cassa", viewer, checked, pezzo)`.
3. La funzione:
   - prende le mesh del gruppo da `jsonStore.getMeshsByNameGroup`
   - cerca solo la mesh uguale a `pezzo`
   - imposta `obj.visible = !checked`

## Nota
Il gruppo e hardcoded su `"cassa"`; il filtro finale sul nome pezzo limita l effetto a una parte specifica.

```mermaid
flowchart TD
  A[switch change] --> B[get group meshs from jsonStore]
  B --> C[find target pezzo]
  C --> D[toggle obj visible]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant UI as createVisible UI
    participant JSON as jsonStore
    participant VIEW as viewer.scene

    U->>UI: toggle switch
    UI->>JSON: getMeshsByNameGroup("cassa")
    JSON-->>UI: mesh names
    UI->>VIEW: getObjectByName(pezzo)
    VIEW-->>UI: object
    UI->>VIEW: object.visible = !checked
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class CreateVisibleUI {
        <<module>>
        +createVisible(viewer, pezzo)
    }

    class ConfJson {
        +getMeshsByNameGroup(nameGroup)
    }

    class ThreeViewer {
        +scene
    }

    class ThreeObject3D {
        +visible
    }

    CreateVisibleUI --> ConfJson : resolve group meshs
    CreateVisibleUI --> ThreeViewer : lookup object by name
    ThreeViewer --> ThreeObject3D : toggle visible flag
```
