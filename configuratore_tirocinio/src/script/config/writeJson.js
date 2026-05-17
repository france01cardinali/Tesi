export function exportJson({ groupMesh, visible, information, infoPoints } = {}) {
  const json = {};
  const groups = [];
  const regole = [];

  if (groupMesh) {
    for (const [groupName, meshSet] of groupMesh) {
      groups.push({
        groupName,
        meshs: Array.from(meshSet)
      });
    }
  }

  if (groups.length > 0) {
    json.groups = groups;
  }

  if (visible && visible.size > 0) {
    const parteRaw = visible.get("parte");
    const parte = normalize(parteRaw);

    regole.push({
      tipologia: visible.get("tipologia") || "visible",
      parte
    });
  }

  if(information){
    const testoRaw = information.get("testo");
    const testo = normalize(testoRaw);
    
    
    regole.push({
      tipologia: information.get("tipologia") || "information",
      testo  
    });

  }

  if(infoPoints && infoPoints.length > 0){
    regole.push({
      tipologia: "informationPoint",
      infoPoint: infoPoints.map((infoPoint) => ({
        name: infoPoint.name,
        parte: normalize(infoPoint.parte),
        descrizione: infoPoint.descrizione
      }))
    });
  }
  

  regole.push({
    tipologia: "ar"
  });

  json.regole = regole;

  

  downloadJSON(json, "config.json");
}



function normalize(value) {
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
