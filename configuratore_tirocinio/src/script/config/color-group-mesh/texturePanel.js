function createTextureOverlayElement() {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.35)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";
  return overlay;
}

function createTexturePanelElement() {
  const panel = document.createElement("div");
  panel.style.width = "340px";
  panel.style.maxWidth = "92vw";
  panel.style.background = "#fff";
  panel.style.borderRadius = "12px";
  panel.style.padding = "16px";
  panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.2)";
  return panel;
}

function createTextureTitleElement() {
  const title = document.createElement("div");
  title.textContent = "Seleziona una o piu texture";
  title.style.fontWeight = "600";
  title.style.fontSize = "18px";
  title.style.marginBottom = "12px";
  return title;
}

function setCardSelectedState(card, isSelected) {
  card.style.borderColor = isSelected ? "#198754" : "#ddd";
  card.style.transform = isSelected ? "scale(1.02)" : "scale(1)";
}

function createTextureGridElement() {
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, 1fr)";
  grid.style.gap = "10px";
  grid.style.marginBottom = "16px";
  return grid;
}

function createTextureActionsElement() {
  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "10px";
  actions.style.justifyContent = "flex-end";
  return actions;
}

function createActionButton(text, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = text;
  return button;
}

function createTextureCardElement(texture) {
  const item = document.createElement("button");
  item.type = "button";
  item.style.border = "2px solid #ddd";
  item.style.borderRadius = "10px";
  item.style.padding = "8px";
  item.style.background = "#fff";
  item.style.cursor = "pointer";
  item.style.transition = "border-color 0.15s ease, transform 0.15s ease";

  const img = document.createElement("img");
  img.src = texture.preview;
  img.alt = texture.name;
  img.style.width = "100%";
  img.style.height = "60px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "8px";
  img.style.display = "block";
  img.style.marginBottom = "6px";
  img.style.background = "#f3f3f3";

  const label = document.createElement("div");
  label.textContent = texture.name;
  label.style.fontSize = "12px";
  label.style.textAlign = "center";

  img.onerror = () => {
    img.style.display = "none";

    if (item.querySelector("[data-texture-fallback]")) return;

    const fallback = document.createElement("div");
    fallback.dataset.textureFallback = "1";
    fallback.textContent = "IMG";
    fallback.style.height = "60px";
    fallback.style.display = "flex";
    fallback.style.alignItems = "center";
    fallback.style.justifyContent = "center";
    fallback.style.background = "#efefef";
    fallback.style.borderRadius = "8px";
    fallback.style.marginBottom = "6px";
    fallback.style.color = "#777";
    fallback.style.fontSize = "12px";

    item.insertBefore(fallback, label);
  };

  item.append(img, label);
  return item;
}

function createEmptyStateElement() {
  const emptyState = document.createElement("div");
  emptyState.textContent = "Nessuna texture disponibile";
  emptyState.style.gridColumn = "1 / -1";
  emptyState.style.textAlign = "center";
  emptyState.style.color = "#666";
  emptyState.style.fontSize = "13px";
  emptyState.style.padding = "8px 0";
  return emptyState;
}

export function openTextureSelectionPanel({
  textureCatalog,
  selectedTexturesTemp,
  buildTextureMaterial,
  onSave
}) {
  const overlay = createTextureOverlayElement();
  const panel = createTexturePanelElement();
  const title = createTextureTitleElement();
  const grid = createTextureGridElement();
  const actions = createTextureActionsElement();
  const selectedValues = new Set(
    Array.isArray(selectedTexturesTemp)
      ? selectedTexturesTemp
          .map((texture) => texture?.value)
          .filter((value) => typeof value === "string" && value.length > 0)
      : []
  );

  const tempSelection = new Map();

  for (const texture of textureCatalog) {
    const item = createTextureCardElement(texture);
    const material = buildTextureMaterial(texture);
    const materialValue = material?.value || "";

    if (selectedValues.has(materialValue)) {
      tempSelection.set(materialValue, material);
    }

    setCardSelectedState(item, tempSelection.has(materialValue));

    item.addEventListener("click", () => {
      if (!materialValue) return;

      if (tempSelection.has(materialValue)) {
        tempSelection.delete(materialValue);
      } else {
        tempSelection.set(materialValue, material);
      }

      setCardSelectedState(item, tempSelection.has(materialValue));
    });

    grid.appendChild(item);
  }

  if (!textureCatalog.length) {
    grid.appendChild(createEmptyStateElement());
  }

  const closeBtn = createActionButton("Chiudi", "btn btn-outline-secondary");
  const saveBtn = createActionButton("Salva texture", "btn btn-success");

  const closePanel = () => {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);
  saveBtn.addEventListener("click", () => {
    if (!tempSelection.size) {
      alert("Seleziona almeno una texture");
      return;
    }

    onSave(Array.from(tempSelection.values()));
    closePanel();
  });

  document.addEventListener("keydown", onKeyDown);

  actions.append(closeBtn, saveBtn);
  panel.append(title, grid, actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
}
