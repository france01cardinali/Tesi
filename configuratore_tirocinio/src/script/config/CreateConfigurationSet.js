import { ConfigGroupMesh } from "./ConfigGroupMesh";
import { exportJson } from "./writeJson";
import {ConfigVisibile} from "./ConfigVisibile"
import { ConfigInfortationStart } from "./ConfigInformationStart";
import { ConfigInformationPoint } from "./ConfigInformationPoint";


export class createConfigurationSet {
    constructor(viewer){
        this.viewer = viewer;
        this.root = document.querySelector("#control .control-inner") || document.querySelector("#control");
        /* this.groupmesh = new ConfigGroupMesh(this.viewer.core, this.root);
        this.visible = new ConfigVisibile(this.viewer.core, this.root); */
        this.informationStart = new ConfigInfortationStart(this.root);
        this.infoPoint = new ConfigInformationPoint(this.viewer.core, this.root);
    }
    

    start(){
        /* this.groupmesh.setTarget(this.viewer.core.modelRoot);
        this.visible.setTarget(this.viewer.core.modelRoot);
        this.visible.createInput(); */
        this.informationStart.createInput();
        this.infoPoint.setTarget(this.viewer.core.modelRoot);
        this.createExportButton(this.root);
    }

    
    createExportButton(root) {
        const esporta = document.createElement("button");
        esporta.textContent = "Esporta configurazione";
        esporta.className = "btn btn-success w-100";

        esporta.addEventListener("click", () => {
            exportJson(
                
                this.informationStart.getInformation());
        });

        this.root.appendChild(esporta);
    }

    

}


