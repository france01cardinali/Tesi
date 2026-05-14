function ensureGroupMaterials(groupMaterials, groupName) {
  if (!groupMaterials.has(groupName)) {
    groupMaterials.set(groupName, new Map());
  }

  return groupMaterials.get(groupName);
}

export function getConfirmSelectionError({
  groupName,
  colorsTemp,
  selectedTexturesTemp
}) {
  if (!groupName) {
    return "Seleziona un gruppo";
  }

  const hasColors = colorsTemp?.size > 0;
  const hasTextures = selectedTexturesTemp?.size > 0;
  if (!hasColors && !hasTextures) {
    return "Seleziona almeno un colore o una texture";
  }

  return "";
}

export function saveGroupSelection({
  groupMaterials,
  groupName,
  colorsTemp,
  selectedTexturesTemp,
  defaultMaterial,
  makeMaterialKey
}) {
  const materialsMap = ensureGroupMaterials(groupMaterials, groupName);

  materialsMap.set(defaultMaterial.key, {
    name: defaultMaterial.name,
    value: defaultMaterial.value
  });

  for (const [key, material] of colorsTemp) {
    materialsMap.set(key, material);
  }

  for (const texture of selectedTexturesTemp.values()) {
    materialsMap.set(makeMaterialKey(texture), texture);
  }

  groupMaterials.set(groupName, materialsMap);
  return materialsMap;
}
