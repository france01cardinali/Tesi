# Meccanismo varianti UI da JSON

## Scopo
Costruire dinamicamente i controlli dell interfaccia in base alle regole del file JSON.

## File coinvolti
- `src/script/handler/handlerVarianti.js`
- `src/script/config/ConfJson.js`
- `src/script/ui/createSelect.js`
- `src/script/ui/createDim.js`
- `src/script/ui/createVisible.js`
- `src/script/ui/createARButton.js`

## Flusso reale
1. `loadVariant(viewer)` legge `regole` dal `jsonStore`.
2. Per ogni regola applica uno switch su `tipologia`:
   - `color-variant` -> `createSelect`
   - `dim` -> `createDim`
   - `visible` -> `createVisible`
   - `ar` -> `createARButton`
3. Ogni meccanismo UI installa i propri listener che chiamano i metodi del viewer.

## Vantaggio
Stessa app, comportamento personalizzato da JSON senza cambiare codice.

```mermaid
flowchart TD
  A[loadVariant] --> B[read regole]
  B --> C{tipologia}
  C -- color variant --> D[createSelect]
  C -- dim --> E[createDim]
  C -- visible --> F[createVisible]
  C -- ar --> G[createARButton]
```

## Sequence diagram
```mermaid
sequenceDiagram
    autonumber
    participant APP as App
    participant VAR as handlerVarianti
    participant JSON as jsonStore
    participant S as createSelect
    participant D as createDim
    participant V as createVisible
    participant A as createARButton

    APP->>VAR: loadVariant(viewer)
    VAR->>JSON: getRegole()
    JSON-->>VAR: regole[]

    loop for each regola
        alt tipologia = color-variant
            VAR->>S: createSelect(viewer)
        else tipologia = dim
            VAR->>D: createDim(viewer, regola)
        else tipologia = visible
            VAR->>V: createVisible(viewer, regola.parte)
        else tipologia = ar
            VAR->>A: createARButton(viewer)
        end
    end
```

## Class diagram
```mermaid
classDiagram
    direction LR

    class HandlerVarianti {
        <<module>>
        +loadVariant(viewer)
    }

    class ConfJson {
        +getRegole()
    }

    class CreateSelectUI {
        +createSelect(viewer)
    }

    class CreateDimUI {
        +createDim(viewer, regole)
    }

    class CreateVisibleUI {
        +createVisible(viewer, pezzo)
    }

    class CreateARButtonUI {
        +createARButton(viewer)
    }

    HandlerVarianti --> ConfJson : read regole[]
    HandlerVarianti --> CreateSelectUI : tipologia color-variant
    HandlerVarianti --> CreateDimUI : tipologia dim
    HandlerVarianti --> CreateVisibleUI : tipologia visible
    HandlerVarianti --> CreateARButtonUI : tipologia ar
```
