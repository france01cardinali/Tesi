import { ConfigGroupMesh } from "./ConfigGroupMesh";
import { exportJson } from "./writeJson";
import { configColorMeshGroup } from "./ConfigColorGroupMesh";
import { configDim } from "./configDim";
import {ConfigVisibile} from "./ConfigVisibile"

export class createConfigurationSet {
    constructor(viewer){
        this.viewer = viewer;
        this.root = document.querySelector("#control .control-inner") || document.querySelector("#control");
        this.groupmesh = new ConfigGroupMesh(this.viewer.core, this.root);
        this.dimEnable = new configDim(this.root);
        this.visible = new ConfigVisibile(this.viewer.core, this.root);
        this.colorMesh = new configColorMeshGroup(this.root);
        this.colorMesh.setGroupMesh(this.groupmesh);
    }
    

    start(){
        this.groupmesh.setTarget(this.viewer.core.modelRoot);
        this.dimEnable.createInput();
        this.colorMesh.createInput();
        this.visible.setTarget(this.viewer.core.modelRoot);
        this.visible.createInput();

        this.createExportButton(this.root);
    }

    
    createExportButton(root) {
        const esporta = document.createElement("button");
        esporta.textContent = "Esporta configurazione";
        esporta.className = "btn btn-success w-100";

        esporta.addEventListener("click", () => {
            exportJson(
                this.groupmesh.getConfMesh(), 
                this.dimEnable.getOption(), 
                this.colorMesh.getColorVariantRule(), 
                this.visible.getVisible());
        });

        this.root.appendChild(esporta);
    }

    

}


