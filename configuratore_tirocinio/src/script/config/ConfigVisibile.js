import * as THREE from "three";


export class ConfigVisibile {
    constructor(core, root) {
        this.core = core;
        this.root = root;
        this.visible = new Map();
        this.visible.set("tipologia", "visible");
        this.selection = new Set();

        this.cam = this.core.camera;
        this.el = this.core.renderer.domElement;
        this.target = this.core.scene;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.onPointerDown = this.onPointerDown.bind(this);
        this.el.addEventListener("pointerdown", this.onPointerDown);

        this.attive = false;

        this.rep = new Map();
        this.reportListEl = null;
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
            const savedParts = this.visible.get("parte");
            const alreadySaved = savedParts instanceof Set && savedParts.has(hit.object.name);
            if(this.attive && !alreadySaved){
               
                if(!this.selection.has(hit.object.name)){
                    this.createMeshElementVisible(hit.object.name);
                

                    const mat = hit.object.material;
                     this.rep.set(hit.object.name, mat);
                
                    if (hit.object.material?.color) {
                        const mat = new THREE.MeshStandardMaterial({
                            color: "#12185A",
                            roughness: 0.7,
                            metalness: 0.0,
                        });
                    
    
    
                        hit.object.material=mat;
    
                    }
                
                    this.selection.add(hit.object.name);

                    
                }else{
                    
                    this.replaceMaterial(hit.object);
                    this.selection.delete(hit.object.name);
                }
    
                
                
            }
    
    
    
        
    
        }
    
    dispose() {
        this.el.removeEventListener("pointerdown", this.onPointerDown);
    }



    createInput(){

        const section = document.createElement("section");
        section.className = "ctrl-section";

        // titolo
        const title = document.createElement("div");
        title.textContent = "Seleziona le parti da far sparire";
        title.style.fontWeight = "600";
        title.style.marginBottom = "10px";


        const active = document.createElement("input");
        active.type = "checkbox";
        active.className = "form-check-input";


        active.addEventListener("change", () => {
            if(active.checked){
                this.attive= true;
            }else{
                this.attive = false;
            }

        });

        const lebAct = document.createElement("lebel");
        lebAct.className = "form-check-label";
        lebAct.textContent = "Attiva per procedere alla selezione";

        const actvDiv = document.createElement("div");
        actvDiv.className = "form-check form-switch";

        actvDiv.append(active, lebAct);


        const list = document.createElement("div");
        list.id = "listVisible";
        list.style.fontSize = "14px";
        list.style.marginBottom = "10px";


        
        // bottone finale
        const confirm = document.createElement("button");
        confirm.textContent = "Conferma";
        confirm.className = "btn btn-success w-100";

        const listrep = document.createElement("div");
        listrep.id = "visibleReportList";
        listrep.style.fontSize = "12px";
        listrep.style.marginBottom = "10px";
        this.reportListEl = listrep;

        const el = document.createElement("small");
        el.className = "text-muted d-block mt-1";
        el.textContent ="Nessuna parte salvata";

        listrep.appendChild(el);



        confirm.addEventListener("click", () => {
            if(!this.selection)return;
            if(this.selection.size === 0) {
                this.report();
                return;
            }

            this.visible.set("parte", new Set(this.selection));

            this.report();


            list.replaceChildren();
            active.checked = false;
            this.replace();
        });


        section.append(title,actvDiv, list, confirm, listrep);
        this.root.append(section);

    }


    createMeshElementVisible(name) {
        const list = document.querySelector("#listVisible");
        if (!list) return;

        const el = document.createElement("div");
        el.textContent = "• " + name;

        list.appendChild(el);
    }


    getVisible(){
        return this.visible;
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
        const savedParts = this.visible.get("parte");
        if (!(savedParts instanceof Set) || savedParts.size === 0) {
            const empty = document.createElement("small");
            empty.className = "text-muted d-block mt-1";
            empty.textContent = "Nessuna parte salvata";
            reportList.appendChild(empty);
            return;
        }

        const names = Array.from(savedParts);
        const preview = names.slice(0, 3).join(", ");
        const remaining = names.length - Math.min(names.length, 3);
        const suffix = remaining > 0 ? ` +${remaining}` : "";

        const el = document.createElement("small");
        el.className = "text-muted d-block mt-1";
        el.textContent = `Salvato "parte" (${names.length} mesh): ${preview}${suffix}`;
        reportList.appendChild(el);
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
