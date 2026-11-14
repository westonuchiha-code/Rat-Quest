/** What a story scene lays over the picture: black bars top and bottom, and the warm, soft-edged look of a memory. */
export class StoryOverlay {
  private readonly top: HTMLDivElement;
  private readonly bottom: HTMLDivElement;
  private readonly tint: HTMLDivElement;
  private lastBars = -1;
  private lastMemory = -1;
  private on = false;

  constructor(private readonly parent: HTMLElement) {
    if (!document.getElementById('rq-story-css')) {
      const st = document.createElement('style');
      st.id = 'rq-story-css';
      // During a scene the HUD steps aside.
      st.textContent = `.rq-story .rq-goal, .rq-story .rq-collect, .rq-story .hp-row, .rq-story .rq-hint { visibility: hidden; }`;
      document.head.appendChild(st);
    }
    const bar = (side: 'top' | 'bottom'): HTMLDivElement => {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:0;right:0;${side}:0;height:0;background:#000;pointer-events:none;z-index:28;`;
      parent.appendChild(el);
      return el;
    };
    this.tint = document.createElement('div');
    this.tint.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:27;opacity:0;mix-blend-mode:multiply;background:radial-gradient(ellipse at 50% 50%, #e8c98a 35%, #6a4a22 100%);';
    parent.appendChild(this.tint);
    this.top = bar('top');
    this.bottom = bar('bottom');
  }

  /** `active` hides the HUD; `bars` and `memory` are 0..1. */
  set(active: boolean, bars: number, memory: number): void {
    if (active !== this.on) {
      this.on = active;
      this.parent.classList.toggle('rq-story', active);
    }
    const b = Math.round(Math.min(1, Math.max(0, bars)) * 100) / 100;
    if (b !== this.lastBars) {
      this.lastBars = b;
      this.top.style.height = this.bottom.style.height = `${b * 11}%`;
    }
    const m = Math.round(Math.min(1, Math.max(0, memory)) * 100) / 100;
    if (m !== this.lastMemory) {
      this.lastMemory = m;
      this.tint.style.opacity = String(m * 0.8);
    }
  }
}
