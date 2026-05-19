import { exportJson } from "./writeJson";
import { ConfigInfortationStart } from "./ConfigInformationStart";
import { ConfigInformationPoint } from "./ConfigInformationPoint";


export class createConfigurationSet {
    constructor(viewer){
        this.viewer = viewer;
        this.root = document.querySelector("#control .control-inner") || document.querySelector("#control");
        this.informationStart = new ConfigInfortationStart(this.root);
        this.infoPoint = new ConfigInformationPoint(this.viewer.core, this.root);
    }
    

    start(){
        this.informationStart.createInput();
        this.infoPoint.setTarget(this.viewer.core.modelRoot);
        this.createExportButton(this.root);
    }

    
    createExportButton(root) {
        const esporta = document.createElement("button");
        esporta.textContent = "Esporta configurazione";
        esporta.className = "btn btn-success w-100";

        esporta.addEventListener("click", () => {
            exportJson({
                information: this.informationStart.getInformation(),
                infoPoints: this.infoPoint.getInfoPoints()
            });
        });

        this.root.appendChild(esporta);
    }

    

}


