export class ARPlacementDebug {
  constructor() {
    this.debugEl = null;
  }

  write(msg) {
    // Lazy query del nodo debug per non fare lookup continuo fuori necessita.
    if (!this.debugEl || !this.debugEl.isConnected) {
      this.debugEl = document.querySelector("#gesture-debug");
    }
    if (this.debugEl) this.debugEl.textContent = msg;
  }
}
