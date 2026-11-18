/**
 * The name of the trick he has just landed, low in the middle of the screen, for a moment (BACKLOG B4). Not a
 * pop-up: no box to close, nothing stops; it fades by itself in TRICK_SHOW seconds.
 */
export const TRICK_SHOW = 1.4;

export class TrickHud {
  private readonly el: HTMLDivElement;
  private left = 0;

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    // (Bigger, and outlined dark all round with a soft dark wash behind, 2026-11-18: over the Toy Box's busy floor it
    // was hard to read. Still no box: nothing to close.)
    style.textContent = `.rq-trick { position: absolute; left: 50%; bottom: 20%; transform: translateX(-50%); z-index: 20;
      color: #ffe27a; font: max(22px, 4.4vh)/1.1 var(--rq-font-title); letter-spacing: 0.06em; white-space: nowrap;
      padding: 0.15em 0.6em; border-radius: 0.5em; background: radial-gradient(ellipse at center, rgba(10, 6, 2, 0.55) 40%, rgba(10, 6, 2, 0) 75%);
      text-shadow: -2px 0 0 #2a1600, 2px 0 0 #2a1600, 0 -2px 0 #2a1600, 0 2px 0 #2a1600, -2px -2px 0 #2a1600, 2px 2px 0 #2a1600, -2px 2px 0 #2a1600, 2px -2px 0 #2a1600, 0 4px 0 #2a1600;
      pointer-events: none; user-select: none; opacity: 0; }`;
    document.head.appendChild(style);
    this.el = document.createElement('div');
    this.el.className = 'rq-trick';
    parent.appendChild(this.el);
  }

  show(name: string): void {
    if (!name) return;
    this.el.textContent = name;
    this.left = TRICK_SHOW;
  }

  update(dt: number): void {
    if (this.left <= 0) return;
    this.left = Math.max(0, this.left - dt);
    const t = TRICK_SHOW - this.left;
    // In quickly, a little up as it goes, out over the last half second.
    this.el.style.opacity = String(Math.min(1, t / 0.08, this.left / 0.5));
    this.el.style.transform = `translateX(-50%) translateY(${(-t * 12).toFixed(1)}px)`;
  }
}
