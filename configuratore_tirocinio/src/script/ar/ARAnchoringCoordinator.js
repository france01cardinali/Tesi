export class ARAnchoringCoordinator {
  constructor({ core, placement, anchor }) {
    this.core = core;
    this.placement = placement;
    this.anchor = anchor;

    this.anchorAttached = false;
    this.anchorCreateInProgress = false;
    this.anchorReanchorPending = false;
    this.wasPlacedModel = false;
  }

  onSessionStart() {
    // Reset stato coordinatore ad ogni nuova sessione AR.
    this.anchorAttached = false;
    this.anchorCreateInProgress = false;
    this.anchorReanchorPending = false;
    this.wasPlacedModel = !!this.placement?.hasPlacedModel;
  }

  onSessionEnd() {
    // Cleanup completo in uscita sessione.
    this.anchor?.detach?.();
    this.anchorAttached = false;
    this.anchorCreateInProgress = false;
    this.anchorReanchorPending = false;
    this.wasPlacedModel = false;
  }

  requestReanchor() {
    // Flag asincrono: la creazione anchor verra tentata nel prossimo frame utile.
    this.anchorReanchorPending = true;
  }

  onFrame(frame) {
    // Guardie principali: serve frame valido e sessione XR attiva.
    if (!frame) return;
    if (!this.core?.renderer?.xr?.isPresenting) return;

    // Attach una sola volta quando placement e pronto.
    if (!this.anchorAttached && this.placement?.isReady) {
      this.anchorAttached = !!this.anchor?.attachToCurrentSession?.();
    }

    if (!this.anchorAttached) {
      this.wasPlacedModel = !!this.placement?.hasPlacedModel;
      return;
    }

    // Trigger reanchor automatico subito dopo primo placement.
    const hasPlacedModel = !!this.placement?.hasPlacedModel;
    const justPlaced = !this.wasPlacedModel && hasPlacedModel;
    if (justPlaced) {
      this.anchorReanchorPending = true;
    }

    if (this.anchorReanchorPending && !this.anchorCreateInProgress) {
      this._tryCreateAnchor(frame);
    }

    // Mantiene il modello agganciato all'anchor se disponibile.
    this.anchor?.update?.(frame, this.core?.modelRoot);
    this.wasPlacedModel = hasPlacedModel;
  }

  dispose() {
    this.onSessionEnd();
  }

  _tryCreateAnchor(frame) {
    // Serializza la creazione anchor: niente richieste concorrenti.
    this.anchorCreateInProgress = true;
    const lastHit = this.placement?.lastValidHit ?? null;

    this.anchor
      // Strategia 1: anchor dalla posa attuale oggetto.
      .anchorFromObjectPose(frame, this.core?.modelRoot)
      .then((ok) => {
        if (ok) return true;
        // Strategia 2 fallback: anchor dall'ultima hit valida.
        return this.anchor?.anchorFromLastValidHit?.(frame, lastHit);
      })
      .catch(() => false)
      .finally(() => {
        this.anchorCreateInProgress = false;
        this.anchorReanchorPending = false;
      });
  }
}
