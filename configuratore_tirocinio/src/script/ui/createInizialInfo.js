
export function createInizialInfo(viewer, testo) {
    const root = document.querySelector("#control .control-inner") || document.querySelector("#control");
    if (!root) return;

    const section = document.createElement("section");
    section.className = "ctrl-section initial-info-section";

    section.style.padding = "12px";
    section.style.borderRadius = "8px";
    section.style.backgroundColor = "#f8f9fa";
    section.style.maxWidth = "100%";
    section.style.overflow = "hidden";

    const p = document.createElement("p");
    p.id = "testoDescrizione";
    p.className = "form-control-plaintext";
    p.textContent = testo;

    p.style.whiteSpace = "normal";
    p.style.overflowWrap = "break-word";
    p.style.wordBreak = "break-word";
    p.style.maxWidth = "100%";
    p.style.marginBottom = "0";

    section.appendChild(p);
    root.appendChild(section);
}
