import * as THREE from "three";

export class ConfigInformationPoint{
    constructor(core, root){
        this.core = core;
        this.root = root;

        this.infoPoint = new Map();
        this.infoPoint.set("tipologia", "informationPoint");

        this.cam = this.core.camera;
        this.el = this.core.renderer.domElement;
        this.target = this.core.scene;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        //this.onPointerDown = this.onPointerDown.bind(this);
        //this.el.addEventListener("pointerdown", this.onPointerDown);
        this.groupNameTemp = "";
        this.groupTemp = new Set();
        this.ready = false;
        this.createInput();


    }


    setTarget(obj){
        this.target = obj || this.core.scene;
    }


    dispose() {
        this.el.re
        moveEventListener("pointerdown", this.onPointerDown);
    }


    createInput() {
        if (!this.root) return;

        const section = document.createElement("section");
        section.className = "ctrl-section";

        // titolo
        const title = document.createElement("div");
        title.textContent = "Creazione information point";
        title.style.fontWeight = "600";
        title.style.marginBottom = "10px";

        // riga input
        const row = document.createElement("div");
        row.className = "d-flex gap-2 mb-2";

        const textBox = document.createElement("input");
        textBox.type = "text";
        textBox.placeholder = "Nome info point";
        textBox.className = "form-control";

        const startBtn = document.createElement("button");
        startBtn.textContent = "Seleziona";
        startBtn.className = "btn btn-primary";

        row.appendChild(textBox);
        row.appendChild(startBtn);

       

        // bottone finale
        const confirm = document.createElement("button");
        confirm.textContent = "Crea gruppo";
        confirm.className = "btn btn-success w-100";

        const listrep = document.createElement("div");
        listrep.id = "reportList";
        listrep.style.fontSize = "12px";
        listrep.style.marginBottom = "10px";
        this.reportListEl = listrep;

        const el = document.createElement("small");
        el.className = "text-muted d-block mt-1";
        el.textContent ="Nessun gruppo salvato";

        listrep.appendChild(el);


        // EVENTI

        startBtn.addEventListener("click", () => {
            this.groupNameTemp = textBox.value.trim();
            if (!this.groupNameTemp) return;

            this.ready = true;
            this.groupTemp.clear();
            list.replaceChildren();
        });

        confirm.addEventListener("click", () => {

            if (!this.groupNameTemp) return;
            if (this.groupTemp.size === 0) return;

            this.confMesh.set(this.groupNameTemp, new Set(this.groupTemp));

            this.report();


            this.groupTemp.clear();
            this.groupNameTemp = "";
            list.replaceChildren();
            textBox.value = "";
            this.ready = false;
            this.replace();
        });

        section.append(title, row, confirm, listrep);
        

        this.root.appendChild(section);
    }
    
}