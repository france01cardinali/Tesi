import { createMarkdownEditor } from "./createMarkdownEditor";

export class ConfigInformationEnd {
  constructor(root) {
    this.root = root;
    this.information = new Map();
    this.information.set("tipologia", "finalInformation");
    this.information.set("formato", "markdown");
  }

  createInput() {
    const div = document.createElement("section");
    div.className = "ctrl-section";

    const title = document.createElement("div");
    title.textContent = "Testo conclusivo";
    title.style.fontWeight = "600";
    title.style.marginBottom = "10px";

    const editor = createMarkdownEditor({
      id: "descrizioneFinale",
      placeholder: "Scrivi qui il testo finale..."
    });

    const confirm = document.createElement("button");
    confirm.textContent = "Salva";
    confirm.className = "btn btn-success w-100 mt-2";

    const feedback = document.createElement("small");
    feedback.className = "text-success d-block mt-1";

    confirm.addEventListener("click", () => {
      this.information.set("testo", editor.getValue());
      feedback.textContent = "Testo finale salvato";
    });

    div.append(title, editor.wrapper, confirm, feedback);
    this.root.append(div);
  }

  getInformation() {
    return this.information;
  }
}
