import * as THREE from "three";
import { renderMarkdownToElement } from "./renderMarkdown.js";

export function createInfoPoint(viewer, infoPoint) {
  if (viewer._infoPointRuntime) {
    viewer._infoPointRuntime.dispose();
  }

  viewer._infoPointRuntime = new InfoPointRuntime(viewer, infoPoint);
}

class InfoPointRuntime {
  constructor(viewer, infoPoints = []) {
    this.viewer = viewer;
    this.core = viewer.core;
    this.camera = this.core.camera;
    this.renderer = this.core.renderer;
    this.modelRoot = this.core.modelRoot;
    this.root = document.querySelector("#control .control-inner") || document.querySelector("#control");



    this.infoPoints = Array.isArray(infoPoints) ? infoPoints : [infoPoints].filter(Boolean);
    this.markers = [];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.tmpWorldPosition = new THREE.Vector3();
    this.tmpScreenPosition = new THREE.Vector3();

    this.panel = this.createPanel();

    this.onPointerDown = this.onPointerDown.bind(this);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);

    this.onXRSelect = this.onXRSelect.bind(this);
    this.onAROverlayPointerDown = this.onAROverlayPointerDown.bind(this);
    this.onAROverlayPointerUp = this.onAROverlayPointerUp.bind(this);
    this.arTapStart = null;

    viewer.xr.addEventListener("sessionstart", () => {
      const session = viewer.xr.getSession();
      session?.addEventListener("select", this.onXRSelect);

      const overlay = document.querySelector("#ar-overlay");
      overlay?.addEventListener("pointerdown", this.onAROverlayPointerDown);
      overlay?.addEventListener("pointerup", this.onAROverlayPointerUp);
    });

    viewer.xr.addEventListener("sessionend", () => {
      const session = viewer.xr.getSession();
      session?.removeEventListener("select", this.onXRSelect);

      const overlay = document.querySelector("#ar-overlay");
      overlay?.removeEventListener("pointerdown", this.onAROverlayPointerDown);
      overlay?.removeEventListener("pointerup", this.onAROverlayPointerUp);
      this.arTapStart = null;
    });


    this.createMarkers();
  }

  createMarkers() {
    this.infoPoints.forEach((info) => {
      const parts = normalizeParts(info.parte);
      const targets = parts
        .map((name) => this.findObjectByName(name))
        .filter(Boolean);

      if (!targets.length) {
        console.warn("Information point senza mesh valide:", info);
        return;
      }

      const box = new THREE.Box3();

      targets.forEach((target) => {
        target.updateMatrixWorld(true);
        box.union(new THREE.Box3().setFromObject(target));
      });

      if (box.isEmpty()) return;

      const worldCenter = box.getCenter(new THREE.Vector3());
      const localCenter = this.modelRoot.worldToLocal(worldCenter.clone());

      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.03, 0.025);

      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0x1e88ff,
          emissive: 0x0b3d91,
          emissiveIntensity: 0.35,
          roughness: 0.35,
          metalness: 0.0,
          depthTest: true,
          depthWrite: true
        })
      );

      marker.name = `info-point-${info.name || "unnamed"}`;

      // Offset semplice verso l'alto rispetto al gruppo di mesh selezionato.
      marker.position.copy(localCenter);
      marker.position.y += Math.max(size.y * 0.65, radius * 2.5);

      marker.userData.infoPoint = info;

      // Figlio di modelRoot: segue scala, rotazione e gesture AR del modello.
      this.modelRoot.add(marker);
      this.markers.push(marker);
    });
  }

  findObjectByName(name) {
    let found = null;

    this.modelRoot.traverse((obj) => {
      if (found) return;
      if (obj.name === name) found = obj;
    });

    return found;
  }

  onPointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const cameraToUse = this.renderer.xr.isPresenting
      ? this.renderer.xr.getCamera(this.camera)
      : this.camera;

    this.raycaster.setFromCamera(this.pointer, cameraToUse);

    const hits = this.raycaster.intersectObjects(this.markers, false);

    if (!hits.length) {
      this.hidePanel();
      return;
    }

    this.showPanel(hits[0].object.userData.infoPoint);
  }

  onXRSelect() {
    if (!this.viewer.xr.isPresenting) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.selectMarkerNearClientPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  onAROverlayPointerDown(event) {
    if (!this.viewer.xr.isPresenting) return;
    if (this.isOverlayUIEvent(event)) return;

    this.arTapStart = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
  }

  onAROverlayPointerUp(event) {
    if (!this.viewer.xr.isPresenting || !this.arTapStart) return;
    if (this.isOverlayUIEvent(event)) {
      this.arTapStart = null;
      return;
    }

    const dx = event.clientX - this.arTapStart.x;
    const dy = event.clientY - this.arTapStart.y;
    const dt = performance.now() - this.arTapStart.time;
    this.arTapStart = null;

    if (Math.hypot(dx, dy) > 10 || dt > 280) return;

    if (this.viewer.xr.isPresenting) {
      this.selectMarkerNearClientPoint(event.clientX, event.clientY);
      return;
    }

    this.raycastFromClientPoint(event.clientX, event.clientY);
  }

  raycastFromClientPoint(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();

    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const cameraToUse = this.viewer.xr.isPresenting
      ? this.viewer.xr.getCamera(this.camera)
      : this.camera;

    this.raycaster.setFromCamera(this.pointer, cameraToUse);

    const hits = this.raycaster.intersectObjects(this.markers, false);

    if (!hits.length) {
      this.hidePanel();
      return;
    }

    this.showPanel(hits[0].object.userData.infoPoint);
  }

  selectMarkerNearClientPoint(clientX, clientY) {
    const marker = this.pickMarkerByScreenDistance(clientX, clientY);
    if (!marker) return;

    this.showPanel(marker.userData.infoPoint);
  }

  pickMarkerByScreenDistance(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const cameraToUse = this.viewer.xr.isPresenting
      ? this.viewer.xr.getCamera(this.camera)
      : this.camera;
    const projectionCamera = getProjectionCamera(cameraToUse);
    const maxDistancePx = this.viewer.xr.isPresenting ? 90 : 44;

    let best = null;
    let bestScore = Infinity;

    for (const marker of this.markers) {
      marker.updateMatrixWorld(true);
      marker.getWorldPosition(this.tmpWorldPosition);
      this.tmpScreenPosition.copy(this.tmpWorldPosition).project(projectionCamera);

      if (this.tmpScreenPosition.z < -1 || this.tmpScreenPosition.z > 1) continue;

      const x = rect.left + (this.tmpScreenPosition.x * 0.5 + 0.5) * rect.width;
      const y = rect.top + (-this.tmpScreenPosition.y * 0.5 + 0.5) * rect.height;
      const distance = Math.hypot(clientX - x, clientY - y);

      if (distance > maxDistancePx) continue;

      const score = distance + this.tmpScreenPosition.z * 8;
      if (score < bestScore) {
        bestScore = score;
        best = marker;
      }
    }

    return best;
  }

  isOverlayUIEvent(event) {
    return Boolean(
      event.target?.closest?.("#control, #ui-fab, .ar-button")
    );
  }

  createPanel() {
    const panel = document.createElement("div");
    panel.className = "info-point-panel";

    Object.assign(panel.style, {
      width: "100%",
      maxWidth: "100%",
      marginTop: "12px",
      padding: "16px",
      borderRadius: "8px",
      background: "rgba(18, 22, 28, 0.94)",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
      display: "none"
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      marginBottom: "8px"
    });

    const title = document.createElement("div");
    title.className = "info-point-panel-title";
    Object.assign(title.style, {
      fontSize: "16px",
      fontWeight: "700"
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "x";
    closeButton.setAttribute("aria-label", "Chiudi pannello information point");
    Object.assign(closeButton.style, {
      width: "32px",
      height: "32px",
      border: "0",
      borderRadius: "6px",
      background: "rgba(255, 255, 255, 0.14)",
      color: "#fff",
      fontSize: "18px",
      lineHeight: "1",
      cursor: "pointer",
      flex: "0 0 auto"
    });
    closeButton.addEventListener("click", () => this.hidePanel());

    header.append(title, closeButton);

    const description = document.createElement("div");
    description.className = "info-point-panel-description";
    Object.assign(description.style, {
      fontSize: "14px",
      lineHeight: "1.45"
    });

    panel.append(header, description);
    this.root.appendChild(panel);

    return panel;
  }

  showPanel(info) {
    const parts = normalizeParts(info.parte);

    this.panel.querySelector(".info-point-panel-title").textContent =
      info.name || parts[0] || "Information point";

    renderMarkdownToElement(
      this.panel.querySelector(".info-point-panel-description"),
      info.descrizione || ""
    );

    this.panel.style.display = "block";

    if (this.viewer.xr.isPresenting) {
      document.querySelector("#control")?.classList.add("open");
    }
  }

  hidePanel() {
    this.panel.style.display = "none";
  }

  dispose() {
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);

    const overlay = document.querySelector("#ar-overlay");
    overlay?.removeEventListener("pointerdown", this.onAROverlayPointerDown);
    overlay?.removeEventListener("pointerup", this.onAROverlayPointerUp);

    this.markers.forEach((marker) => {
      this.modelRoot.remove(marker);
      marker.geometry.dispose();
      marker.material.dispose();
    });

    this.markers = [];
    this.panel.remove();
  }
}

function normalizeParts(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getProjectionCamera(camera) {
  if (camera?.isArrayCamera && camera.cameras?.length) {
    return camera.cameras[0];
  }

  return camera;
}
