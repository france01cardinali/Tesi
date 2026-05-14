import { ARButton} from "three/addons/webxr/ARButton.js";

export class ARController {
    constructor(core, events) {
        this.core = core;
        this.events = events;
    }

    createARButton(domRoot){
        if(!navigator.xr) return null;
        
        const btn = ARButton.createButton(this.core.renderer, {
            // Hit-test e obbligatoria per placement.
            requiredFeatures: ["hit-test"],
            // Feature opzionali: se mancanti, la sessione parte comunque con fallback parziale.
            optionalFeatures: ["dom-overlay", "plane-detection", "depth-sensing", "anchors"],

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
