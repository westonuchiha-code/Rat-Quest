/** A quiet line under the collectible counter, top right, showing what to do next in this level. Not a pop-up: it just stays put. */
export class GoalHud {
  private readonly el: HTMLDivElement;
  private last = '';

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    // Just under the counter (same size of text: readable on a Steam Deck, bigger on bigger screens).
    style.textContent = `.rq-goal { position: absolute; top: calc(12px + 1.5em); right: 8px; z-index: 20; padding: 0.2em 0.6em; text-align: right;
      border-radius: 0.4em; background: rgba(8, 12, 10, 0.4); color: #e8efe0; font: max(13px, 1.8vh)/1.2 var(--rq-font-game);
      pointer-events: none; user-select: none; white-space: nowrap; }
      .rq-goal.done { color: #9fe3a8; }`;
    document.head.appendChild(style);
    this.el = document.createElement('div');
    this.el.className = 'rq-goal';
    parent.appendChild(this.el);
  }

  set(label: string, text: string, done: boolean): void {
    const key = `${label}|${text}|${done}`;
    if (key === this.last) return;
    this.last = key;
    this.el.textContent = text ? `${label}  ${text}` : label;
    this.el.classList.toggle('done', done);
  }
}
