/**
 * Display options: wide or 4:3 picture, an old-screen filter (scanlines, CRT, VHS, green handheld), and coloured lights on or off.
 * Saved between runs. The picture sits in a "frame" that centres it, so 4:3 gets black bars at the sides on a wide screen.
 */
import type { StorageLike } from '../world/collectibles';
import { ps1Uniforms } from '../render/ps1Material';

export const FILTERS = ['off', 'scanlines', 'crt', 'vhs', 'green'] as const;
export type Filter = (typeof FILTERS)[number];
export type Aspect = 'wide' | '4:3';

const KEY = 'ratquest.display';

const CSS = `
#frame { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; background: #000; container-type: size; overflow: hidden; }
body.has-pad #frame { flex: 1 1 0; min-height: 0; min-width: 0; width: auto; height: auto; }
#frame > #gameWrap { width: 100% !important; height: 100% !important; flex: none; }
#frame.ar43 > #gameWrap { width: min(100cqw, 133.333cqh) !important; height: min(100cqh, 75cqw) !important; }
#fx { position: absolute; inset: 0; pointer-events: none; z-index: 60; display: none; }
#fx.scanlines, #fx.crt, #fx.vhs { display: block; }
#fx.scanlines { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.28) 0, rgba(0,0,0,0.28) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px); }
#fx.crt {
  background:
    radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%),
    repeating-linear-gradient(to bottom, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 3px),
    repeating-linear-gradient(to right, rgba(255,0,0,0.07) 0, rgba(255,0,0,0.07) 1px, rgba(0,255,0,0.07) 1px, rgba(0,255,0,0.07) 2px, rgba(0,0,255,0.07) 2px, rgba(0,0,255,0.07) 3px);
  box-shadow: inset 0 0 6vmin rgba(0,0,0,0.6);
}
#fx.vhs { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px); }
#fx.vhs::after { content: ''; position: absolute; left: 0; right: 0; height: 9%; top: 0; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.09), rgba(255,255,255,0)); animation: rqtrack 6s linear infinite; }
@keyframes rqtrack { from { top: -10%; } to { top: 110%; } }
#gameWrap.f-crt > canvas { filter: contrast(1.08) saturate(1.2) brightness(1.18); }
#gameWrap.f-vhs > canvas { filter: blur(0.6px) contrast(1.08) saturate(1.35) hue-rotate(-4deg); }
#gameWrap.f-green { filter: grayscale(1) sepia(1) hue-rotate(60deg) saturate(2.4) contrast(1.15) brightness(0.9); }
`;

export class Display {
  aspect: Aspect = 'wide';
  filter: Filter = 'off';
  lights = true;
  /** Bigger talk-box text. */
  largeText = false;
  private readonly frame: HTMLDivElement;
  private readonly fx: HTMLDivElement;

  constructor(private readonly wrap: HTMLElement, private readonly storage: StorageLike | null) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    // Put the game picture inside a frame that centres it.
    this.frame = document.createElement('div');
    this.frame.id = 'frame';
    wrap.parentElement?.insertBefore(this.frame, wrap);
    this.frame.appendChild(wrap);
    this.fx = document.createElement('div');
    this.fx.id = 'fx';
    wrap.appendChild(this.fx);
    try {
      const d = JSON.parse(storage?.getItem(KEY) ?? '{}') as { aspect?: string; filter?: string; lights?: boolean; large?: boolean };
      if (d.aspect === '4:3') this.aspect = '4:3';
      if (FILTERS.includes(d.filter as Filter)) this.filter = d.filter as Filter;
      if (d.lights === false) this.lights = false;
      if (d.large === true) this.largeText = true;
    } catch {
      /* use the defaults */
    }
    // Development aid: #ar43 and #filter=crt, for screenshots.
    if (typeof location !== 'undefined') {
      if (location.hash.includes('ar43')) this.aspect = '4:3';
      const m = /filter=(\w+)/.exec(location.hash);
      if (m && FILTERS.includes(m[1] as Filter)) this.filter = m[1] as Filter;
    }
    this.apply();
  }

  toggleAspect(): void {
    this.aspect = this.aspect === 'wide' ? '4:3' : 'wide';
    this.save();
  }

  cycleFilter(dir = 1): void {
    this.filter = FILTERS[(FILTERS.indexOf(this.filter) + dir + FILTERS.length) % FILTERS.length];
    this.save();
  }

  toggleText(): void {
    this.largeText = !this.largeText;
    this.save();
  }

  toggleLights(): void {
    this.lights = !this.lights;
    this.save();
  }

  filterLabel(): string {
    return { off: 'OFF', scanlines: 'SCANLINES', crt: 'OLD TV', vhs: 'VHS', green: 'GREEN HANDHELD' }[this.filter];
  }

  private save(): void {
    this.apply();
    try {
      this.storage?.setItem(KEY, JSON.stringify({ aspect: this.aspect, filter: this.filter, lights: this.lights, large: this.largeText }));
    } catch {
      /* ignore */
    }
  }

  private apply(): void {
    this.frame.classList.toggle('ar43', this.aspect === '4:3');
    for (const f of FILTERS) this.wrap.classList.toggle(`f-${f}`, this.filter === f);
    this.fx.className = this.filter;
    document.documentElement.style.setProperty('--rq-text', this.largeText ? '1.3' : '1');
    ps1Uniforms.lightsOn.value = this.lights ? 1 : 0;
    // The picture changed shape: let the renderer re-measure.
    window.dispatchEvent(new Event('resize'));
  }
}
