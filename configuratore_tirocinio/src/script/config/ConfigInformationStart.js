import * as THREE from "three";

export class ConfigInfortationStart{
    constructor(root){
        this.root = root;
        this.testo = "";
        this.information = new Map();
        this.information.set("tipologia", "information");


    }


    createInput(){
        const div = document.createElement("section");
        div.className = "ctrl-section";

        const label = document.createElement("label");
        label.className = "form-label";
        label.setAttribute("for", "descrizione");
        label.textContent = "Descrizione";

        const textarea = document.createElement("textarea");
        textarea.className = "form-control";
        textarea.id = "descrizione";
        textarea.rows = 4;
        textarea.placeholder = "Scrivi qui il testo...";

        // bottone finale
        const confirm = document.createElement("button");
        confirm.textContent = "Salva";
        confirm.className = "btn btn-success w-100";

        const feedback = document.createElement("small");
        feedback.className = "text-success d-block mt-1";

        confirm.addEventListener("click", () => {
            this.information.set("testo", textarea.value);
            feedback.textContent = "Descrizione salvata";
        })
        

        div.append(label,textarea,confirm,feedback);
        

        this.root.append(div);
    }

    getInformation(){
        return this.information;
    }
}
