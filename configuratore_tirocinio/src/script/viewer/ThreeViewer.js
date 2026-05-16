import { ViewerCore } from "./ViewerCore.js";
import { ModelController } from "./ModelController.js";
import { MaterialController } from "./MaterialController.js";
import { EnvironmentController } from "./EnvironmentController.js";
import { ARController } from "../ar/ARController.js";
import { ARGestures } from "../ar/ARGesture.js";
import { ARPlacementDetection } from "../ar/ARPlacementDetection.js";
import {ARAnchorController} from "../ar/ARAnchorController.js";
import { ARAnchoringCoordinator } from "../ar/ARAnchoringCoordinator.js";
import { ConfigGroupMesh } from "../config/ConfigGroupMesh.js";


export class ThreeViewer {
    constructor({ canvas, container }) {
        this.mode = "";
        this.events = new EventTarget();

        // Core rendering loop: delega update frame ai moduli AR attivi.
        this.core = new ViewerCore({
            canvas,
            container,
            onFrame: (_time, frame) => {
                this.placement?.update(frame);
                this.anchoring?.onFrame(frame);
                
            },
        });

        this.model = new ModelController(this.core, this.events);
        this.materials = new MaterialController(this.core);
        this.env = new EnvironmentController(this.core);
        this.ar = new ARController(this.core, this.events);
        // Parametri placement iniziali (guardie di validazione hit/reticle).
        this.placement = new ARPlacementDetection(this.core, {
            minUpDot: 0.92,
            minBelowCameraMeters: 0.2,
            maxAbsFloorYOffset: 0.8,
            maxFloorDelta: 0.12,
            minPlaneSpanMeters: 0.6,
            minHitDistanceMeters: 0.2,
            useAbsoluteFloorZero: false,

            autoPlaceOnFirstValid: false,
            allowTapPlacement: true,
            hideModelUntilPlacement: true,
            debugRelaxed: true, //debug

            requireSemanticFloor: false,
        });
        this.anchor = new ARAnchorController(this.core);
        this.anchoring = new ARAnchoringCoordinator({
            core: this.core,
            placement: this.placement,
            anchor: this.anchor,
        });
        this.core.anchorCtrl=this.anchor;

        this.core.setHasPlacedModel(this.placement);
        this.gestures = new ARGestures(this.core);
        this.gestures.setPlacementDetection(this.placement);
        this.gestures.setAnchorController(this.anchor);
        this.gestures.setOnAnchorResumeRequested(() => {
            // Quando termina una gesture, il coordinator richiede re-anchor.
            this.anchoring.requestReanchor();
        });

        //this.gestures.enable();
        //this.confGroupMesh = new ConfigGroupMesh(this.core);
        
        this.events.addEventListener("model:loaded", () => {
            this.gestures.setTarget(this.core.modelRoot, this.model.pivot);
            //this.confGroupMesh.setTarget(this.core.modelRoot);

            // Attiva patch shader occlusione su tutti i materiali gia presenti.
            this.materials.enableOcclusionForModelRoot();

        });

        this.events.addEventListener("ar:sessionstart", () => {
            this.anchoring.onSessionStart();
            const overlay = document.querySelector("#ar-overlay");
            if (overlay) this.gestures.setInputElement(overlay);
            this.gestures.enable();
        });

        this.events.addEventListener("ar:sessionend", () => {
            this.anchoring.onSessionEnd();
            this.gestures.setInputElement(this.core.renderer.domElement);
            this.gestures.dispose();
        });
    }

    loadGLB(url) { return this.model.loadGLB(url); }
    getDimensions() { return this.model.getDimensions(); }
    setNonUniformScaleByCm(p) { return this.model.setNonUniformScaleByCm(p); }
    setDefaultDim() {return this.model.setDefaultDim();}
    testDim(){return this.model.testDim();}//test
    setEnvironmentHDR(url) { return this.env.setEnviromentHDR(url); }
    setColorForMesh(meshs, mat) { return this.materials.setColorForMeshs(meshs, mat); }
    createARButton(domRoot) { return this.ar.createARButton(domRoot); }

    get scene() { return this.core.scene; }
    get renderer() { return this.core.renderer; }
    get controls() { return this.core.controls; }
    get xr() { return this.core.renderer.xr; }

    resize() { return this.core.resize(); }

    dispose() {
        //this.confGroupMesh.dispose();
        this.anchoring.dispose();
        this.placement.dispose();
        this.env.dispose();
        this.gestures.dispose();
        this.core.dispose();
    }
}
