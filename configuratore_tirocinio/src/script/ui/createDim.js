import { updateDim, setDefaultDim, dimTest } from "../handler/handlerDimension";

export async function createDim(viewer, regole) {
  // Crea controlli dimensioni in base alla regola "dim" del JSON.
  const root = document.querySelector("#control .control-inner") || document.querySelector("#control");
  if (!root) return;

  const section = document.createElement("section");
  section.className = "ctrl-section";
  section.innerHTML = `<div class="ctrl-title">Dimensioni</div>`;

  const dimensions = viewer.getDimensions();
  const original = {
    x: (dimensions.x * 100).toFixed(1),
    y: (dimensions.y * 100).toFixed(1),
    z: (dimensions.z * 100).toFixed(1),
  };

  // container verticale
  const stack = document.createElement("div");
  stack.className = "ctrl-stack";

  for (const dim of regole.dimensions) {
    const field = document.createElement("div");
    field.className = "ctrl-field";

    const label = document.createElement("label");
    label.className = "form-label fw-semibold mb-1";
    label.setAttribute("for", dim);
    label.textContent = dim.toUpperCase();

    // input con "cm" inline a destra
    const group = document.createElement("div");
    group.className = "input-group input-group-sm ctrl-inputgroup";

    const input = document.createElement("input");
    input.type = "number";
    input.id = dim;
    input.value = original[dim];
    input.step = regole.passo;
    input.min = regole.min;
    input.max = regole.max;
    input.className = "form-control";



    // Ogni modifica input applica subito clamp + scale.
    input.addEventListener("change", () => updateDim(viewer));





    group.appendChild(input);

    //group.appendChild(unit);

    field.appendChild(label);
    field.appendChild(group);

    stack.appendChild(field);
  }



  section.appendChild(stack);

  const hint = document.createElement("div");
  hint.className = "ctrl-hint";
  hint.textContent = `Range: ${regole.min}–${regole.max} cm | Passo: ${regole.passo}`;
  section.appendChild(hint);



  const btn = document.createElement("input");
  btn.className = "input-group input-group-sm ctrl-inputgroup";
  btn.type = "button";
  btn.id = "reset";
  btn.value = "reset";

  // Reset dimensioni al valore base del modello.
  btn.addEventListener("click", () =>setDefaultDim(viewer));

  section.appendChild(btn);

  //test
  const btnTest = document.createElement("input");
  btnTest.className = "input-group input-group-sm ctrl-inputgroup";
  btnTest.type = "button";
  btnTest.id = "test";
  btnTest.value = "test";

  btnTest.addEventListener("click", () =>dimTest(viewer));

  section.appendChild(btnTest);


  

  root.appendChild(section);
}
