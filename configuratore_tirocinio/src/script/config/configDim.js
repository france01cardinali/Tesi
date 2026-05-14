
export class configDim{
    constructor(root){
        this.root = root;
        this.option = new Map();
        this.dimEnable = new Set();
        
        
    }


    createInput(){
        const title = document.createElement("div");
        title.textContent = "Seleziona grandezze modificabili";
        title.style.fontWeight = "600";
        title.style.marginBottom = "10px";

        const formX = document.createElement("div");
        formX.className = "form-check form-switch";

        const formY = document.createElement("div");
        formY.className = "form-check form-switch";

        const formZ = document.createElement("div");
        formZ.className = "form-check form-switch";



        const dimX = document.createElement("input");
        dimX.type = "checkbox";
        dimX.className = "form-check-input";

        const lebX = document.createElement("lebel");
        lebX.className = "form-check-label";
        lebX.textContent = "X";



        const dimY = document.createElement("input");
        dimY.type = "checkbox";
        dimY.className = "form-check-input";

        const lebY = document.createElement("lebel");
        lebY.className = "form-check-label";
        lebY.textContent = "Y";



        const dimZ = document.createElement("input");
        dimZ.type = "checkbox";
        dimZ.className = "form-check-input";

        const lebZ = document.createElement("lebel");
        lebZ.className = "form-check-label";
        lebZ.textContent = "Z";



        const txtMin = document.createElement("input");
        txtMin.type = "number";
        txtMin.className = "form-control";

        const lebMin = document.createElement("label")
        lebMin.className = "form-check-lebel";
        lebMin.textContent = "Minimo";


        const txtMax = document.createElement("input");
        txtMax.type = "number";
        txtMax.className = "form-control";

        const lebMax = document.createElement("label");
        lebMax.className = "form-check-lebel";
        lebMax.textContent = "Massimo" 


        const txtPas = document.createElement("input");
        txtPas.type = "number";
        txtPas.className = "form-control";

        const lebPasso = document.createElement("label");
        lebPasso.className = "form-check-lebel";
        lebPasso.textContent = "Passo";


        const section = document.createElement("section");
        section.className = "ctrl-section";


        const confirm = document.createElement("button");
        confirm.textContent = "Conferma";
        confirm.className = "btn btn-success w-100";

        const summary = document.createElement("small");
        summary.className = "text-muted d-block mt-2";
        summary.style.fontSize = "12px";
        summary.textContent = "Nessuna configurazione dimensionale salvata";



        dimX.addEventListener("change", () =>{
            if(dimX.checked){
                this.dimEnable.add("x");
            }else{
                this.dimEnable.delete("x");
            }
        });

        dimY.addEventListener("change", () =>{
            if(dimY.checked){
                this.dimEnable.add("y");
            }else{
                this.dimEnable.delete("y");
            }
        });


        dimZ.addEventListener("change", () =>{
            if(dimZ.checked){
                this.dimEnable.add("z");
            }else{
                this.dimEnable.delete("z");
            }
        });

        confirm.addEventListener("click", () => {
            this.option.set("tipologia", "dim");
            this.option.set("dimensions", [...this.dimEnable]);
            this.option.set("min", txtMin.value);
            this.option.set("max", txtMax.value);
            this.option.set("passo", txtPas.value);
            const dims = [...this.dimEnable].map((dim) => dim.toUpperCase());
            const dimsText = dims.length ? dims.join(", ") : "nessuna";
            summary.textContent = `Salvato: dimensioni ${dimsText} | min ${txtMin.value || "-"} | max ${txtMax.value || "-"} | passo ${txtPas.value || "-"}`;
            console.log("option: ", this.option);
        });


        formX.append(dimX, lebX);
        formY.append(dimY, lebY);
        formZ.append(dimZ, lebZ);
        const br = document.createElement("br");
        section.append(title,formX, formY, formZ,lebMin,txtMin,lebMax, txtMax,lebPasso, txtPas, br, confirm, summary);

        this.root.append(section);
        

        
    }
    
    getOption(){
        return this.option;
    }


   


}
