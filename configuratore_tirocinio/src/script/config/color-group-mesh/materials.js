import { DEFAULT_MATERIAL_VALUE } from "./constants";

export function makeMaterialKey(material) {
  const type = material?.type || "default";
  const value = material?.value || DEFAULT_MATERIAL_VALUE;
  return `${type}:${value}`;
}

export function buildColorMaterial(color) {
  const hex = color.toHEXA().toString();
  return {
    name: hex,
    value: hex,
    type: "standard"
  };
}

export function buildTextureMaterial(texture) {
  return {
    name: texture.name,
    value: texture.value,
    type: texture.type || "texture",
    preview: texture.preview
  };
}

export function serializeMaterialForExport(entry) {
  const output = {
    name: entry.name,
    value: entry.value
  };

  if (entry.type) {
    output.type = entry.type;
  }

  return output;
}
