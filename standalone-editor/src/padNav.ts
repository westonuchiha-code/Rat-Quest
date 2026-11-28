/**
 * Controller and keyboard navigation for the panels: turns a gamepad (standard mapping) and the arrow keys into the
 * few presses the panels understand, with held directions repeating.
 *
 *   d-pad or left stick  move (held: repeats)        A / Enter / Space  confirm
 *   B / Escape / Backspace  back                     X / R  reset the slider under the cursor
 *   L1 / R1 (or Page Up / Page Down)  previous / next group           Y / C  copy
 *   Start / F1  'menu' (the panels ignore it: the host uses it to open one)
 */
export type NavAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'reset' | 'prev' | 'next' | 'copy' | 'menu';

export interface PadNavOptions {
  /** Seconds a direction is held before it repeats. Default 0.35. */
  delay?: number;
  /** Seconds between repeats. Default 0.07. */
  every?: number;
  /** How far the stick must lean. Default 0.5. */
  dead?: number;
  /** Listen for keys too (on window). Default true. */
  keys?: boolean;
}

const BUTTONS: Array<[number, NavAction]> = [
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
  [0, 'confirm'], [1, 'back'], [2, 'reset'], [3, 'copy'], [4, 'prev'], [5, 'next'], [9, 'menu'],
];
const REPEATS = new Set<NavAction>(['up', 'down', 'left', 'right']);
const KEYS: Record<string, NavAction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'confirm', ' ': 'confirm', Escape: 'back', Backspace: 'back',
  r: 'reset', R: 'reset', c: 'copy', C: 'copy', PageUp: 'prev', PageDown: 'next', F1: 'menu',
};

export class PadNav {
  /** While false, presses are not passed on (e.g. while the panel is closed). */
  enabled = true;
  private readonly held = new Map<NavAction, number>();
  private raf = 0;
  private last = 0;
  private readonly opts: Required<PadNavOptions>;
  private readonly onKey = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const a = KEYS[e.key];
    if (!a) return;
    // Typing in a box: only Escape and Enter belong to the panel.
    const t = e.target as HTMLElement | null;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && (t as HTMLInputElement).type !== 'range';
    if (typing && a !== 'back' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    this.send(a);
  };

  constructor(private readonly send: (a: NavAction) => void, opts: PadNavOptions = {}) {
    this.opts = { delay: opts.delay ?? 0.35, every: opts.every ?? 0.07, dead: opts.dead ?? 0.5, keys: opts.keys ?? true };
    if (this.opts.keys && typeof window !== 'undefined') window.addEventListener('keydown', this.onKey, true);
  }

  /** Polls the pads on its own, every frame. Not needed when the game calls `update` from its own loop. */
  start(): void {
    const tick = (now: number): void => {
      this.update(this.last ? Math.min(0.1, (now - this.last) / 1000) : 0);
      this.last = now;
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.last = 0;
  }

  dispose(): void {
    this.stop();
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.onKey, true);
  }

  /** Reads the pads once. `dt`: seconds since the last call. */
  update(dt: number): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const down = new Set<NavAction>();
    for (const pad of pads) {
      if (!pad) continue;
      for (const [b, a] of BUTTONS) if (pad.buttons[b]?.pressed) down.add(a);
      const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
      const d = this.opts.dead;
      if (Math.abs(ax) > Math.abs(ay)) {
        if (ax < -d) down.add('left');
        else if (ax > d) down.add('right');
      } else {
        if (ay < -d) down.add('up');
        else if (ay > d) down.add('down');
      }
    }
    this.feed(down, dt);
  }

  /** Takes which actions are held this frame (for games that read the pad themselves). */
  feed(down: Set<NavAction>, dt: number): void {
    for (const a of [...this.held.keys()]) if (!down.has(a)) this.held.delete(a);
    for (const a of down) {
      const t = this.held.get(a);
      if (t === undefined) {
        this.held.set(a, 0);
        if (this.enabled) this.send(a);
      } else if (REPEATS.has(a)) {
        const n = t + dt;
        // (A hair of slack, so that frame times that add up to the delay exactly count as reaching it.)
        const at = (x: number): number => (x + 1e-9 < this.opts.delay ? -1 : Math.floor((x - this.opts.delay + 1e-9) / this.opts.every));
        const before = at(t);
        const after = at(n);
        this.held.set(a, n);
        if (after > before && this.enabled) this.send(a);
      }
    }
  }
}
