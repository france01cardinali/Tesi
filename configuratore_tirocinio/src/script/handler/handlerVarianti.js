import {createDim} from "../ui/createDim"
import {createSelect} from "../ui/createSelect";
import { jsonStore } from "../config/ConfJson";
import { createVisible } from "../ui/createVisible";
import { createARButton } from "../ui/createARButton";

export async function loadVariant(viewer){
    // Interpreta le regole in ordine e costruisce UI/comportamenti runtime.
    const varianti = await jsonStore.getRegole();
    for (const variante of varianti) {
        switch (variante.tipologia) {
            case "color-variant":
                await createSelect(viewer);
            break; 

            case "dim":
                await createDim(viewer, variante);
            break;
            case "visible":
                 createVisible(viewer, variante.parte);
            break;

            case "ar":
                createARButton(viewer);
            break;

            default:
            break;
        }

    }
}
