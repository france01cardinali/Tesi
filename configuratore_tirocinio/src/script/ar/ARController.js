import { ARButton} from "three/addons/webxr/ARButton.js";

export class ARController {
    constructor(core, events) {
        this.core = core;
        this.events = events;
    }

    createARButton(domRoot){
        if(!navigator.xr) return null;
        
        const btn = ARButton.createButton(this.core.renderer, {
            optionalFeatures: ["dom-overlay", "depth-sensing"],

            depthSensing: {
                // CPU depth: usata dal runtime occlusione custom lato JS/shader.
                usagePreference: ["cpu-optimized"], 
                dataFormatPreference: ["luminance-alpha"],
            },

            domOverlay: { root: domRoot },
        });


        this.core.renderer.xr.addEventListener("sessionstart", () => {
            const session = this.core.renderer.xr.getSession?.();
            const features = session?.enabledFeatures;
            if (features && !features.has?.("depth-sensing")) {
                console.warn("[ARController] Sessione XR senza feature 'depth-sensing': occlusione disabilitata.");
            }

            document.body.classList.add("ar-mode");
            this.events.dispatchEvent(new Event("ar:sessionstart"));
        });

        this.core.renderer.xr.addEventListener("sessionend", () => {
            document.body.classList.remove("ar-mode");
            this.events.dispatchEvent(new Event("ar:sessionend"));
        });
        

        return btn;
    }
}
