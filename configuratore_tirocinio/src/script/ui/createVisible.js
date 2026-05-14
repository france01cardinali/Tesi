import { jsonStore } from "../config/ConfJson";


export function createVisible(viewer, pezzo) {
  // Crea switch visibilita per una parte specifica del gruppo target.
  const root = document.querySelector("#control .control-inner") || document.querySelector("#control");
  if (!root) return;

  const section = document.createElement('section');
  section.className = 'ctrl-section';
  section.innerHTML = `<div class="ctrl-title">Visibilità</div>`;

  const wrap = document.createElement('div');
  wrap.className = 'form-check form-switch';

  wrap.innerHTML = `
    <input class="form-check-input" type="checkbox" id="sw-visible">
    <label class="form-check-label" for="sw-visible">
      Rimuovi ripiano
    </label>
  `;

  const checkbox = wrap.querySelector('input');

 
  checkbox.addEventListener('change', () => {
    setGroupVisibilityByStore( viewer, checkbox.checked, pezzo);

  });

  section.appendChild(wrap);
  root.appendChild(section);

}

function setGroupVisibilityByStore( viewer, isVisible, pezzo) {

  for(const p of pezzo){

    viewer.core.modelRoot.traverse((obj) => {
      if(!obj.isMesh) return;

      if(p === obj.name){
        obj.visible = !isVisible;
        console.log("pezzo: ", obj.name);

      }

    })
  }
    
}
