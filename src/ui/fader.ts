/** A full-picture black cover, used to hide the jump between rooms. Set its darkness each frame. */
export class Fader {
  private readonly el: HTMLDivElement;
  private last = -1;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:30;';
    parent.appendChild(this.el);
  }

  set(amount: number): void {
    const v = Math.min(1, Math.max(0, amount));
    if (v === this.last) return;
    this.last = v;
    this.el.style.opacity = String(v);
  }
}
