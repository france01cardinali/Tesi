function getClampedValueCm(input, fallbackValueCm) {
  // Parse + clamp sul range min/max dell'input HTML.
  const parsed = Number.parseFloat(input.value);
  if (!Number.isFinite(parsed)) {
    return fallbackValueCm;
  }

  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  let clamped = parsed;

  if (Number.isFinite(min)) clamped = Math.max(min, clamped);
  if (Number.isFinite(max)) clamped = Math.min(max, clamped);

  input.value = String(clamped);
  return clamped;
}

function syncDimInputsFromViewer(viewer) {
  const xInput = document.querySelector("#x");
  const yInput = document.querySelector("#y");
  const zInput = document.querySelector("#z");
  if (!xInput && !yInput && !zInput) return;

  const current = viewer.getDimensions();
  const valuesCm = {
    x: current.x * 100,
    y: current.y * 100,
    z: current.z * 100,
  };

  if (xInput) xInput.value = String(valuesCm.x.toFixed(1));
  if (yInput) yInput.value = String(valuesCm.y.toFixed(1));
  if (zInput) zInput.value = String(valuesCm.z.toFixed(1));
}

export function updateDim(viewer) {
  // Legge valori UI, li clampa e applica scaling non uniforme al modello.
  const xInput = document.querySelector("#x");
  const yInput = document.querySelector("#y");
  const zInput = document.querySelector("#z");
  if (!xInput && !yInput && !zInput) return;

  const current = viewer.getDimensions();
  let xCm = current.x * 100;
  let yCm = current.y * 100;
  let zCm = current.z * 100;

  if (xInput) xCm = getClampedValueCm(xInput, xCm);
  if (yInput) yCm = getClampedValueCm(yInput, yCm);
  if (zInput) zCm = getClampedValueCm(zInput, zCm);

  viewer.setNonUniformScaleByCm({ xCm, yCm, zCm });
  syncDimInputsFromViewer(viewer);
}


export function setDefaultDim(viewer) {
  // Ripristina scala base e sincronizza gli input visivi.
  viewer.setDefaultDim();
  syncDimInputsFromViewer(viewer);
}


export function dimTest(viewer) {
/* 
  const current = viewer.getDimensions();
  let xCm = current.x * 100;
  let yCm = current.y * 100;
  let zCm = current.z * 100; */

  // Shortcut test rapido di scala.
  viewer.testDim();
  syncDimInputsFromViewer(viewer);
  
}
