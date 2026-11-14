/**
 * A boss's name and health, along the bottom of the screen while the fight is on. Not a pop-up: it is part of the
 * HUD, like the hearts, there for as long as she is awake and gone when the fight is over. Behind the red, a paler
 * strip shows what the last few blows took and drains after a moment, so a good run of hits can be seen.
 */
export class BossBar {
  private readonly wrap: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly ghost: HTMLDivElement;
  private shown = false;
  private name = '';
  private frac = 1;
  private ghostFrac = 1;
  private hold = 0;

  constructor(parent: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = `
      .boss-bar { position: absolute; left: 50%; bottom: 14px; width: min(56%, 560px); transform: translateX(-50%); pointer-events: none; z-index: 20; opacity: 0; transition: opacity 0.5s; font-family: inherit; }
      .boss-bar.on { opacity: 1; }
      .boss-name { color: #e8dcc0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; text-shadow: 0 1px 0 #000, 0 0 4px #000; margin: 0 0 3px 2px; }
      .boss-track { position: relative; height: 9px; background: #120c10d9; border: 1px solid #000; box-shadow: 0 0 0 1px #5a4a3a; }
      .boss-ghost, .boss-fill { position: absolute; left: 0; top: 0; bottom: 0; }
      .boss-ghost { background: #d8b070; }
      .boss-fill { background: linear-gradient(#c8323e, #8a1c28); }
    `;
    document.head.appendChild(style);
    this.wrap = document.createElement('div');
    this.wrap.className = 'boss-bar';
    this.title = document.createElement('div');
    this.title.className = 'boss-name';
    const track = document.createElement('div');
    track.className = 'boss-track';
    this.ghost = document.createElement('div');
    this.ghost.className = 'boss-ghost';
    this.fill = document.createElement('div');
    this.fill.className = 'boss-fill';
    track.append(this.ghost, this.fill);
    this.wrap.append(this.title, track);
    parent.appendChild(this.wrap);
  }

  /** `boss`: who is being fought and how much of their health is left (0..1), or null when nobody is. */
  update(dt: number, boss: { name: string; frac: number } | null): void {
    const on = boss !== null;
    if (on !== this.shown) {
      this.shown = on;
      this.wrap.classList.toggle('on', on);
    }
    if (!boss) return;
    if (boss.name !== this.name) {
      this.name = boss.name;
      this.title.textContent = boss.name;
      this.ghostFrac = boss.frac;
    }
    const frac = Math.max(0, Math.min(1, boss.frac));
    if (frac < this.frac) this.hold = 0.6; // a fresh blow: the pale strip waits a moment before it drains
    if (frac > this.ghostFrac) this.ghostFrac = frac;
    this.frac = frac;
    this.hold = Math.max(0, this.hold - dt);
    if (this.hold <= 0) this.ghostFrac = Math.max(frac, this.ghostFrac - dt * 0.35);
    this.fill.style.width = `${(frac * 100).toFixed(1)}%`;
    this.ghost.style.width = `${(this.ghostFrac * 100).toFixed(1)}%`;
  }
}
