export function exportJson(groupMesh, option, colorVariantRule, visible) {
  const json = {};
  const groups = [];
  const regole = [];

  // [1] groups
  for (const [groupName, meshSet] of groupMesh) {
    groups.push({
      groupName,
      meshs: Array.from(meshSet)
    });
  }

  json.groups = groups;

  // [10] regola dim
  if (option && option.size > 0) {
    const rawDimensions = option.get("dimensions") || [];
    const dimensions = normalizeToArray(rawDimensions);

    regole.push({
      tipologia: option.get("tipologia") || "dim",
      dimensions,
      min: option.get("min") || "",
      max: option.get("max") || "",
      passo: option.get("passo") || ""
    });
  }

  // [20] regola color-variant
  if (
    colorVariantRule &&
    Array.isArray(colorVariantRule.specifica) &&
    colorVariantRule.specifica.length > 0
  ) {
    regole.push(colorVariantRule);
  }

  // [30] regola visible
  if (visible && visible.size > 0) {
    const parteRaw = visible.get("parte");
    const parte = normalizeVisibleParte(parteRaw);

    regole.push({
      tipologia: visible.get("tipologia") || "visible",
      parte
    });
  }

  regole.push({
    tipologia: "ar"
  });

  json.regole = regole;

  

  downloadJSON(json, "config.json");
}

function normalizeToArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function normalizeVisibleParte(value) {
  if (value == null) return "";

  if (value instanceof Set) {
    const arr = Array.from(value);
    return arr.length <= 1 ? (arr[0] || "") : arr;
  }

  if (Array.isArray(value)) {
    return value.length <= 1 ? (value[0] || "") : value;
  }

  return value;
}

function downloadJSON(obj, fileName) {
  const json = JSON.stringify(obj, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();

  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}