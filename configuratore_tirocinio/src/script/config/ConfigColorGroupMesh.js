import Pickr from "@simonwep/pickr";
import "@simonwep/pickr/dist/themes/classic.min.css";

import {
  DEFAULT_MATERIAL_KEY,
  DEFAULT_MATERIAL_NAME,
  DEFAULT_MATERIAL_VALUE,
  DEFAULT_TEXTURE_LABEL,
  GROUP_SELECT_PLACEHOLDER
} from "./color-group-mesh/constants";

import {
  buildColorMaterial,
  buildTextureMaterial,
  makeMaterialKey,
  serializeMaterialForExport
} from "./color-group-mesh/materials";

import {
  createColorContainerElement,
  createConfirmButtonElement,
  createGroupSelectElement,
  createSubtitleElement,
  createTextureButtonElement,
  createTitleElement,
  refreshGroupSelectOptions,
  updateTextureButtonPreviewElement
} from "./color-group-mesh/ui";

import { openTextureSelectionPanel } from "./color-group-mesh/texturePanel";

export class configColorMeshGroup {
  constructor(root) {
    this.root = root;
    this.groupMesh = null;

    this.groupTemp = "";
    this.colorsTemp = new Map();
    this.selectedTexturesTemp = new Map();
    this.groupMaterials = new Map();

    this.selectEl = null;
    this.textureButton = null;
    this.pickr = null;
    this.reportListEl = null;

    this.textureCatalog = [];
    this.textureCatalogPromise = null;

    this.API_BASE = `https://${window.location.hostname}:3001`;
  }

  createInput() {
    if (!this.root) return;

    const section = document.createElement("section");
    section.className = "ctrl-section";

    const title = createTitleElement("Seleziona un gruppo e aggiungi colori o texture");
    const select = createGroupSelectElement({
      placeholder: GROUP_SELECT_PLACEHOLDER,
      onFocus: () => this.refreshGroupSelectOptions(),
      onChange: (value) => {
        this.groupTemp = value;
      }
    });
    const colorTitle = createSubtitleElement("Colori");
    const colorContainer = createColorContainerElement();
    const textureTitle = createSubtitleElement("Texture");
    const textureButton = createTextureButtonElement({
      text: DEFAULT_TEXTURE_LABEL,
      onClick: async () => {
        await this.ensureTextureCatalogLoaded();
        this.openTexturePanel();
      }
    });
    const confirmButton = createConfirmButtonElement(() => {
      this.confirmCurrentGroupSelection();
    });
    const reportList = document.createElement("div");
    reportList.style.fontSize = "12px";
    reportList.style.marginTop = "8px";

    const emptyReport = document.createElement("small");
    emptyReport.className = "text-muted d-block mt-1";
    emptyReport.dataset.emptyReport = "1";
    emptyReport.textContent = "Nessun gruppo colori/texture salvato";
    reportList.appendChild(emptyReport);

    this.selectEl = select;
    this.textureButton = textureButton;
    this.reportListEl = reportList;

    section.append(
      title,
      select,
      colorTitle,
      colorContainer,
      textureTitle,
      textureButton,
      confirmButton,
      reportList
    );

    this.root.appendChild(section);
    this.initializePickr(colorContainer);
  }

  refreshGroupSelectOptions() {
    if (!this.selectEl || !this.groupMesh) return;

    const groupNames = Array.from(this.groupMesh.getGroupMesh());
    this.groupTemp = refreshGroupSelectOptions(
      this.selectEl,
      groupNames,
      GROUP_SELECT_PLACEHOLDER
    );
  }

  initializePickr(colorContainer) {
    this.pickr = Pickr.create({
      el: colorContainer,
      theme: "classic",
      components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
          input: true,
          save: true
        }
      }
    });

    this.pickr.on("save", (color) => {
      const material = buildColorMaterial(color);
      const key = this.makeMaterialKey(material);
      this.colorsTemp.set(key, material);
      console.log("colorsTemp:", this.colorsTemp);
    });
  }

  async ensureTextureCatalogLoaded() {
    if (this.textureCatalog.length) return;

    if (!this.textureCatalogPromise) {
      this.textureCatalogPromise = this.loadTextureCatalog().finally(() => {
        this.textureCatalogPromise = null;
      });
    }

    await this.textureCatalogPromise;
  }

  confirmCurrentGroupSelection() {
    const groupName = this.groupTemp;

    if (!groupName) {
      alert("Seleziona un gruppo");
      return;
    }

    if (!this.colorsTemp.size && !this.selectedTexturesTemp.size) {
      alert("Seleziona almeno un colore o una texture");
      return;
    }

    const materialsMap = this.ensureGroupMaterials(groupName);

    materialsMap.set(DEFAULT_MATERIAL_KEY, {
      name: DEFAULT_MATERIAL_NAME,
      value: DEFAULT_MATERIAL_VALUE
    });

    for (const [key, material] of this.colorsTemp) {
      materialsMap.set(key, material);
    }

    for (const texture of this.selectedTexturesTemp.values()) {
      materialsMap.set(this.makeMaterialKey(texture), texture);
    }

    this.appendReportLine({
      groupName,
      colors: Array.from(this.colorsTemp.values()),
      textures: Array.from(this.selectedTexturesTemp.values())
    });

    this.groupMaterials.set(groupName, materialsMap);
    console.log("groupMaterials:", this.groupMaterials);
    this.resetTemporarySelections();
  }

  openTexturePanel() {
    openTextureSelectionPanel({
      textureCatalog: this.textureCatalog,
      selectedTexturesTemp: Array.from(this.selectedTexturesTemp.values()),
      buildTextureMaterial,
      onSave: (selections) => {
        this.selectedTexturesTemp.clear();
        for (const selection of selections) {
          this.selectedTexturesTemp.set(this.makeMaterialKey(selection), selection);
        }
        this.updateTextureButtonPreview();
      }
    });
  }

  updateTextureButtonPreview() {
    updateTextureButtonPreviewElement(
      this.textureButton,
      Array.from(this.selectedTexturesTemp.values()),
      DEFAULT_TEXTURE_LABEL
    );
  }

  resetTemporarySelections() {
    this.colorsTemp.clear();
    this.selectedTexturesTemp.clear();
    this.groupTemp = "";

    if (this.selectEl) {
      this.selectEl.value = "";
    }

    this.updateTextureButtonPreview();
  }

  ensureGroupMaterials(groupName) {
    if (!this.groupMaterials.has(groupName)) {
      this.groupMaterials.set(groupName, new Map());
    }

    return this.groupMaterials.get(groupName);
  }

  appendReportLine({ groupName, colors, textures }) {
    const reportList = this.reportListEl;
    if (!reportList) return;

    const emptyReport = reportList.querySelector("[data-empty-report='1']");
    if (emptyReport) {
      emptyReport.remove();
    }

    const colorsText = Array.isArray(colors) && colors.length
      ? colors.map((color) => color.value || color.name).filter(Boolean).join(", ")
      : "-";

    const texturesText = Array.isArray(textures) && textures.length
      ? textures.map((texture) => texture.name || texture.value).filter(Boolean).join(", ")
      : "-";

    const line = document.createElement("small");
    line.className = "text-muted d-block mt-1";
    line.textContent = `Salvato "${groupName}" | Colori: ${colorsText} | Texture: ${texturesText}`;
    reportList.appendChild(line);
  }

  makeMaterialKey(material) {
    return makeMaterialKey(material);
  }

  getColorVariantRule() {
    const specifica = [];

    for (const [groupName, materialsMap] of this.groupMaterials) {
      const material = Array.from(materialsMap.values()).map(serializeMaterialForExport);
      if (!material.length) continue;

      specifica.push({
        groupName,
        material
      });
    }

    return {
      tipologia: "color-variant",
      specifica
    };
  }

  toAbsoluteTextureUrl(pathOrUrl) {
    if (typeof pathOrUrl !== "string" || !pathOrUrl.trim()) return "";

    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${this.API_BASE}${normalized}`;
  }

  toTextureConfigValue(pathOrUrl) {
    if (typeof pathOrUrl !== "string" || !pathOrUrl.trim()) return "";

    const source = pathOrUrl.trim();
    if (source.startsWith("texture/")) {
      return source;
    }

    const withoutHashOrQuery = source.split("#")[0].split("?")[0];
    const pathname = /^https?:\/\//i.test(withoutHashOrQuery)
      ? new URL(withoutHashOrQuery).pathname
      : withoutHashOrQuery;

    const normalized = pathname.replace(/^\/+/, "");
    if (normalized.startsWith("texture/")) {
      return normalized;
    }

    if (normalized.startsWith("textures/")) {
      return `texture/${decodeURIComponent(normalized.slice("textures/".length))}`;
    }

    const segments = normalized.split("/").filter(Boolean);
    const fileName = segments.length ? decodeURIComponent(segments[segments.length - 1]) : "";
    return fileName ? `texture/${fileName}` : "";
  }

  async loadTextureCatalog() {
    try {
      const res = await fetch(`${this.API_BASE}/api/textures`);
      if (!res.ok) {
        throw new Error("Errore caricamento texture");
      }

      const catalog = await res.json();

      this.textureCatalog = Array.isArray(catalog)
        ? catalog.map((texture) => ({
            ...texture,
            preview: this.toAbsoluteTextureUrl(texture.preview),
            value: this.toTextureConfigValue(texture.value)
          }))
        : [];

      console.log("textureCatalog:", this.textureCatalog);
    } catch (err) {
      console.error(err);
      this.textureCatalog = [];
    }
  }

  setGroupMesh(groupMesh) {
    this.groupMesh = groupMesh;
  }
}
