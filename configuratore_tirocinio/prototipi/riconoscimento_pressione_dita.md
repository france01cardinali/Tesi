
handeler per riconoscere se si sta premendo lo schermo e qon quante dita 

```js

    onPointerDown(e) {
  this.el.setPointerCapture?.(e.pointerId);
  this._activePointers.set(e.pointerId, e);

  const pointers = this.getPointers();
  this.debug(
    `pointerdown\n` +
    `dita: ${pointers.length}\n` +
    `ids: ${pointers.map(p=>p.pointerId).join(", ")}`
  );
}

onPointerMove(e) {
  if (this._activePointers.has(e.pointerId)) this._activePointers.set(e.pointerId, e);

  const pointers = this.getPointers();
  this.debug(
    `pointermove\n` +
    `dita: ${pointers.length}\n` +
    `ids: ${pointers.map(p=>p.pointerId).join(", ")}`
  );
}

onPointerUp(e) {
  this._activePointers.delete(e.pointerId);

  const pointers = this.getPointers();
  this.debug(
    `pointerup\n` +
    `dita: ${pointers.length}\n` +
    `ids: ${pointers.map(p=>p.pointerId).join(", ")}`
  );
}

onPointerCancel(e) {
  this._activePointers.delete(e.pointerId);

  const pointers = this.getPointers();
  this.debug(
    `pointercancel\n` +
    `dita: ${pointers.length}\n` +
    `ids: ${pointers.map(p=>p.pointerId).join(", ")}`
  );
}

 

```