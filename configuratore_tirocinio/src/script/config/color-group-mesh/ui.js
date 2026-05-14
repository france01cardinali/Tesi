export function createTitleElement(text) {
  const title = document.createElement("div");
  title.textContent = text;
  title.style.fontWeight = "600";
  title.style.marginBottom = "10px";
  return title;
}

export function createSubtitleElement(text) {
  const subtitle = document.createElement("div");
  subtitle.textContent = text;
  subtitle.style.fontWeight = "500";
  subtitle.style.marginBottom = "8px";
  return subtitle;
}

export function createColorContainerElement() {
  const colorContainer = document.createElement("div");
  colorContainer.style.marginBottom = "14px";
  return colorContainer;
}

export function createGroupSelectElement({ placeholder, onFocus, onChange }) {
  const select = document.createElement("select");
  select.className = "form-select form-select-sm";
  select.style.marginBottom = "10px";

  setGroupSelectPlaceholder(select, placeholder);

  select.addEventListener("focus", onFocus);
  select.addEventListener("change", () => {
    onChange(select.value);
  });

  return select;
}

export function setGroupSelectPlaceholder(select, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
}

export function refreshGroupSelectOptions(select, groupNames, placeholder) {
  const currentValue = select.value;

  setGroupSelectPlaceholder(select, placeholder);

  for (const name of groupNames) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }

  select.value = groupNames.includes(currentValue) ? currentValue : "";
  return select.value;
}

export function createTextureButtonElement({ text, onClick }) {
  const textureButton = document.createElement("button");
  textureButton.type = "button";
  textureButton.className = "btn btn-outline-secondary w-100";
  textureButton.textContent = text;
  textureButton.style.marginBottom = "14px";
  textureButton.addEventListener("click", onClick);
  return textureButton;
}

export function createConfirmButtonElement(onClick) {
  const confirm = document.createElement("button");
  confirm.textContent = "Conferma";
  confirm.className = "btn btn-success w-100";
  confirm.addEventListener("click", onClick);
  return confirm;
}

export function updateTextureButtonPreviewElement(button, selectedTextures, defaultLabel) {
  if (!button) return;

  button.innerHTML = "";

  const textures = Array.isArray(selectedTextures)
    ? selectedTextures.filter(Boolean)
    : [];

  if (!textures.length) {
    button.textContent = defaultLabel;
    return;
  }

  const firstTexture = textures[0];

  const wrapper = document.createElement("span");
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "8px";

  const img = document.createElement("img");
  img.src = firstTexture.preview || "";
  img.alt = firstTexture.name || "Texture selezionata";
  img.style.width = "28px";
  img.style.height = "28px";
  img.style.objectFit = "cover";
  img.style.borderRadius = "6px";
  img.style.background = "#f3f3f3";
  img.onerror = () => {
    img.style.display = "none";
  };

  const label = document.createElement("span");
  label.textContent =
    textures.length === 1
      ? firstTexture.name || "Texture selezionata"
      : `${textures.length} texture selezionate`;

  wrapper.append(img, label);
  button.appendChild(wrapper);
}
