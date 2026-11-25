/**
 * THE TITLE CARD (2026-11-25): the game's name across the picture, for a few seconds, when the game "really starts"
 * (the owner: "pretty quickly being thrown into a boss battle before the game really 'starts'"). Not a pop-up: it
 * asks nothing, stops nothing and goes by itself. WORK IN PROGRESS: its look is a placeholder.
 */
const CSS = `
.rq-namecard { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s ease; z-index: 30; container-type: size;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.72) 100%); }
.rq-namecard.on { opacity: 1; }
.rq-namecard .in { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rq-namecard .name1 { font-family: var(--rq-font-logo); font-weight: 700; font-size: min(17cqh, 11cqw); letter-spacing: 0.04em; line-height: 1;
  background: linear-gradient(#fff6b0 0%, #ffc233 42%, #ee6a12 62%, #b8340a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0.6cqh 0 rgba(0,0,0,0.6)); }
.rq-namecard .name2 { margin-top: 2.4cqh; font-family: var(--rq-font-label); font-weight: 600; font-size: min(4.2cqh, 3.6cqw); letter-spacing: 0.5em; color: #f3ead0; text-shadow: 0 2px 6px #000; }
.rq-namecard .line { margin-top: 5cqh; font-family: var(--rq-font-label); font-style: italic; font-size: min(3.2cqh, 2.8cqw); letter-spacing: 0.08em; color: #d8cfb4; text-shadow: 0 2px 6px #000; }
`;

export class TitleCard {
  private readonly el = document.createElement('div');
  private left = 0;
  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.el.className = 'rq-namecard';
    parent.appendChild(this.el);
  }
  /** Up for `secs`, then away. */
  show(big: string, small: string, line = '', secs = 6): void {
    this.el.innerHTML = `<div class="in"><div class="name1">${big}</div><div class="name2">${small}</div>${line ? `<div class="line">${line}</div>` : ''}</div>`;
    this.el.classList.add('on');
    this.left = secs;
  }
  get showing(): boolean {
    return this.left > 0;
  }
  update(dt: number): void {
    if (this.left <= 0) return;
    this.left -= dt;
    if (this.left <= 0) this.el.classList.remove('on');
  }
}
