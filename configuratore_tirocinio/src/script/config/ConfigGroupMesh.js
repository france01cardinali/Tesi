import * as THREE from "three";

export class ConfigGroupMesh{
    constructor(core,root){
        this.core = core;
        this.root = root
        this.confMesh = new Map();

        this.cam = this.core.camera;
        this.el = this.core.renderer.domElement;
        this.target = this.core.scene;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.onPointerDown = this.onPointerDown.bind(this);
        this.el.addEventListener("pointerdown", this.onPointerDown);
        this.groupNameTemp = "";
        this.groupTemp = new Set();
        this.ready = false;

        this.rep = new Map();
        this.reportListEl = null;
        this.createInput();
        

    }


    setTarget(obj){
        this.target = obj || this.core.scene;
    } 

    onPointerDown(event) {
        const rect = this.el.getBoundingClientRect();

        const clientX = event.clientX ?? event.touches?.[0]?.clientX;
        const clientY = event.clientY ?? event.touches?.[0]?.clientY;

        if (clientX == null || clientY == null) return;

        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.cam);

        const root = this.target || this.core.scene;
        const queryRoot = Array.isArray(root) ? root : [root];
        const intersects = this.raycaster.intersectObjects(queryRoot, true);

        if (!intersects.length) return;
        const hit = intersects[0];

        if (
            this.ready === true &&
            ![...this.confMesh.values()].some((meshSet) => meshSet.has(hit.object.name))
        ) {
           
            if(!this.groupTemp.has(hit.object.name)){
                this.createMeshElementView(hit.object.name);
            

                const mat = hit.object.material;
                this.rep.set(hit.object.name, mat);

                if (hit.object.material?.color) {
                    const mat = new THREE.MeshStandardMaterial({
                        color: "red",
                        roughness: 0.7,
                        metalness: 0.0,
                    });
                


                    hit.object.material=mat;

                }
            
                this.groupTemp.add(hit.object.name);
            }else{
                this.replaceMaterial(hit.object);
                this.groupTemp.delete(hit.object.name);
            }
            
            
        }



    

    }

    dispose() {
        this.el.removeEventListener("pointerdown", this.onPointerDown);
    }




    createInput() {
        if (!this.root) return;

        const section = document.createElement("section");
        section.className = "ctrl-section";

        // titolo
        const title = document.createElement("div");
        title.textContent = "Creazione gruppo mesh";
        title.style.fontWeight = "600";
        title.style.marginBottom = "10px";

        // riga input
        const row = document.createElement("div");
        row.className = "d-flex gap-2 mb-2";

        const textBox = document.createElement("input");
        textBox.type = "text";
        textBox.placeholder = "Nome gruppo";
        textBox.className = "form-control";

        const startBtn = document.createElement("button");
        startBtn.textContent = "Seleziona";
        startBtn.className = "btn btn-primary";

        row.appendChild(textBox);
        row.appendChild(startBtn);

        // lista mesh selezionate
        const listTitle = document.createElement("div");
        listTitle.textContent = "Mesh selezionate:";
        listTitle.style.marginTop = "10px";
        listTitle.style.fontWeight = "500";

        const list = document.createElement("div");
        list.id = "meshList";
        list.style.fontSize = "14px";
        list.style.marginBottom = "10px";

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

        section.append(title, row, listTitle, list, confirm, listrep);
        

        this.root.appendChild(section);
    }


    createMeshElementView(name) {
        const list = document.querySelector("#meshList");
        if (!list) return;

        const el = document.createElement("div");
        el.textContent = "• " + name;

        list.appendChild(el);
    }



    getConfMesh(){
        return this.confMesh;
    }



    getGroupMesh(){
        return this.confMesh.keys();
    }



    replace(){

        for(const [k,v] of this.rep){

            this.core.modelRoot.traverse((obj) => {
                if(!obj.isMesh) return;

                if(k === obj.name){
                    obj.material = v;

                }

            })
        }
    }

    report(){
        const reportList = this.reportListEl;
        if (!reportList) return;
        reportList.replaceChildren();

     

        for(const [k,v] of this.confMesh){

            const el = document.createElement("small");
            el.className = "text-muted d-block mt-1";
            const names = Array.from(v);
            const preview = names.slice(0, 3).join(", ");
            const remaining = names.length - Math.min(names.length, 3);
            const suffix = remaining > 0 ? ` +${remaining}` : "";
            el.textContent = `Salvato "${k}" (${names.length} mesh): ${preview}${suffix}`;

            reportList.appendChild(el);

        }
        

    }

    replaceMaterial(mesh){

        const v = this.rep.get(mesh.name);
        this.core.modelRoot.traverse((obj) => {
            if(!obj.isMesh) return;

            if(mesh === obj){
                obj.material = v;

            }

        })

    }
}
