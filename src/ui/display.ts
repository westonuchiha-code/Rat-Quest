/**
 * Display options: wide or 4:3 picture, an old-screen filter (scanlines, CRT, VHS, green handheld), and coloured lights on or off.
 * Saved between runs. The picture sits in a "frame" that centres it, so 4:3 gets black bars at the sides on a wide screen.
 */
import { PICTURE, SHARPS, SHARP_DEFAULT, SHARP_LABEL, SHARP_ROWS, type Sharp } from '../render/picture';
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
/* THE OLD SCREENS, OVER A SHARP PICTURE. (The owner, 2026-11-16: "lets just go for the hd one ... we can get the retro
   look from overlay options and the like".) They were drawn for a small stretched picture: lines one screen dot thick,
   which on a sharp screen are too fine to see. Now each is measured from the SCREEN: --rq-line is one of 240 lines
   down it, --rq-cell one of 144 (a handheld's), each a whole number of the screen's own dots so nothing shimmers. */
#fx.scanlines { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) calc(var(--rq-line) * 0.55), rgba(0,0,0,0.42) calc(var(--rq-line) * 0.7), rgba(0,0,0,0.42) calc(var(--rq-line) * 0.92), rgba(0,0,0,0) var(--rq-line)); }
#gameWrap.f-scanlines > canvas { filter: brightness(1.14) contrast(1.04); }
/* An old television: its lines, the three colours of its glass side by side, dark corners, and a round-cornered tube. */
#fx.crt {
  background:
    radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,0.5) 100%),
    repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) calc(var(--rq-line) * 0.5), rgba(0,0,0,0.46) calc(var(--rq-line) * 0.68), rgba(0,0,0,0.46) calc(var(--rq-line) * 0.92), rgba(0,0,0,0) var(--rq-line)),
    repeating-linear-gradient(to right, rgba(255,40,40,0.1) 0, rgba(255,40,40,0.1) calc(var(--rq-mask) / 3), rgba(40,255,40,0.1) calc(var(--rq-mask) / 3), rgba(40,255,40,0.1) calc(var(--rq-mask) * 2 / 3), rgba(60,60,255,0.1) calc(var(--rq-mask) * 2 / 3), rgba(60,60,255,0.1) var(--rq-mask));
  border-radius: 3.2vmin;
  box-shadow: inset 0 0 7vmin rgba(0,0,0,0.65), 0 0 0 4vmin #000;
}
#gameWrap.f-crt > canvas { filter: url(#rq-glow) contrast(1.1) saturate(1.25) brightness(1.16); }
/* A worn tape: the colours smeared sideways and a little apart, soft, washed; faint lines; a band of bad tracking that
   wanders down; and the torn strip along the bottom where the heads change over. */
#fx.vhs { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) calc(var(--rq-line) * 0.6), rgba(0,0,0,0.2) calc(var(--rq-line) * 0.75), rgba(0,0,0,0.2) var(--rq-line)); }
#fx.vhs::after { content: ''; position: absolute; left: 0; right: 0; height: 9%; top: 0; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0)); animation: rqtrack 6s linear infinite; }
#fx.vhs::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--rq-line) * 5); background: repeating-linear-gradient(to right, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 5%, rgba(0,0,0,0.6) 5%, rgba(0,0,0,0.6) 9%, rgba(255,255,255,0.3) 9%, rgba(255,255,255,0.3) 17%, rgba(0,0,0,0.7) 17%, rgba(0,0,0,0.7) 31%); background-size: 61% 100%; animation: rqtear 0.37s steps(7) infinite; opacity: 0.75; }
@keyframes rqtrack { from { top: -10%; } to { top: 110%; } }
@keyframes rqtear { from { background-position: 0 0; } to { background-position: 137% 0; } }
#gameWrap.f-vhs > canvas { filter: url(#rq-vhs) saturate(1.3) contrast(0.94) brightness(1.1); }
/* A green handheld: four greens and no more (everything on the screen, the hearts and the menus too), and the grid
   of its dots over the top. */
#gameWrap.f-green { filter: url(#rq-green); }
#frame.f-green::after { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; pointer-events: none; z-index: 61;
  background: linear-gradient(to right, rgba(202,220,159,0.34) 0, rgba(202,220,159,0.34) var(--rq-gap), rgba(0,0,0,0) var(--rq-gap)), linear-gradient(to bottom, rgba(202,220,159,0.34) 0, rgba(202,220,159,0.34) var(--rq-gap), rgba(0,0,0,0) var(--rq-gap));
  background-size: var(--rq-cell) var(--rq-cell); }
#frame.ar43.f-green::after { width: min(100cqw, 133.333cqh); height: min(100cqh, 75cqw); }
`;

/**
 * How big an old screen's parts are on THIS screen, in the page's units: `height` is how high the picture is, `dpr`
 * how many of the screen's own dots there are to a unit. `line`: one scanline and the dark between it and the next
 * (240 down the screen, a television's). `mask`: one red-green-blue stripe set of its glass. `cell`: one dot of a
 * handheld's screen (144 down it) and `gap` the pale line between two. Every one is a whole number of the screen's
 * own dots (so no line is fatter than its neighbour), and none is too fine to see.
 */
export function screenMeasures(height: number, dpr: number): { line: number; mask: number; cell: number; gap: number } {
  const dots = Math.max(1, height * dpr);
  const whole = (n: number, least: number): number => Math.max(least, Math.round(n));
  const line = whole(dots / 240, 3);
  return { line: line / dpr, mask: whole(line * 0.75, 3) / dpr, cell: whole(dots / 144, 3) / dpr, gap: whole(dots / 144 / 6, 1) / dpr };
}

/** The four greens of a handheld's screen, dark to light. */
export const HANDHELD_GREENS = [0x0f380f, 0x356b30, 0x86a81c, 0xd0e08c] as const;
const greens = (shift: number): string => HANDHELD_GREENS.map((c) => (((c >> shift) & 255) / 255).toFixed(3)).join(' ');
const FILTER_DEFS = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" aria-hidden="true">
  <filter id="rq-green" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>
    <feComponentTransfer><feFuncR type="gamma" amplitude="1.15" exponent="0.8"/><feFuncG type="gamma" amplitude="1.15" exponent="0.8"/><feFuncB type="gamma" amplitude="1.15" exponent="0.8"/></feComponentTransfer>
    <feComponentTransfer><feFuncR type="discrete" tableValues="${greens(16)}"/><feFuncG type="discrete" tableValues="${greens(8)}"/><feFuncB type="discrete" tableValues="${greens(0)}"/></feComponentTransfer>
  </filter>
  <filter id="rq-vhs" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
    <feOffset in="r" dx="1.6" dy="0" result="r2"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
    <feOffset in="b" dx="-1.6" dy="0" result="b2"/>
    <feBlend in="r2" in2="g" mode="screen" result="rg"/>
    <feBlend in="rg" in2="b2" mode="screen" result="apart"/>
    <feGaussianBlur in="apart" stdDeviation="1.1 0.25"/>
  </filter>
  <filter id="rq-glow" color-interpolation-filters="sRGB" x="0" y="0" width="100%" height="100%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="soft"/>
    <feColorMatrix in="soft" type="matrix" values="0.5 0 0 0 0  0 0.5 0 0 0  0 0 0.5 0 0  0 0 0 1 0" result="dim"/>
    <feBlend in="SourceGraphic" in2="dim" mode="screen"/>
  </filter>
</svg>`;

export class Display {
  aspect: Aspect = 'wide';
  filter: Filter = 'off';
  lights = true;
  /** Bigger talk-box text. */
  largeText = false;
  /** How sharp the game's picture is: how many rows it has at the least (render/picture.ts). */
  sharp: Sharp = SHARP_DEFAULT;
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
    // What the old screens do to the picture's colours (the lines and grids over it are in the CSS above).
    const defs = document.createElement('div');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs.innerHTML = FILTER_DEFS;
    document.body.appendChild(defs);
    window.addEventListener('resize', () => this.measure());
    try {
      const d = JSON.parse(storage?.getItem(KEY) ?? '{}') as { aspect?: string; filter?: string; lights?: boolean; large?: boolean; sharp?: string };
      if (d.aspect === '4:3') this.aspect = '4:3';
      if (FILTERS.includes(d.filter as Filter)) this.filter = d.filter as Filter;
      if (d.lights === false) this.lights = false;
      if (d.large === true) this.largeText = true;
      if (SHARPS.includes(d.sharp as Sharp)) this.sharp = d.sharp as Sharp;
    } catch {
      /* use the defaults */
    }
    // Development aid: #ar43 and #filter=crt, for screenshots.
    if (typeof location !== 'undefined') {
      if (location.hash.includes('ar43')) this.aspect = '4:3';
      const m = /filter=(\w+)/.exec(location.hash);
      if (m && FILTERS.includes(m[1] as Filter)) this.filter = m[1] as Filter;
      // (And #sharp=crisp.)
      const sh = /sharp=(\w+)/.exec(location.hash);
      if (sh && SHARPS.includes(sh[1] as Sharp)) this.sharp = sh[1] as Sharp;
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

  cycleSharp(dir = 1): void {
    this.sharp = SHARPS[(SHARPS.indexOf(this.sharp) + dir + SHARPS.length) % SHARPS.length];
    this.save();
  }

  sharpLabel(): string {
    return SHARP_LABEL[this.sharp];
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
      this.storage?.setItem(KEY, JSON.stringify({ aspect: this.aspect, filter: this.filter, lights: this.lights, large: this.largeText, sharp: this.sharp }));
    } catch {
      /* ignore */
    }
  }

  /** Sizes the old screens' lines and dots from the screen itself: each a whole number of its own dots. */
  private measure(): void {
    const dpr = window.devicePixelRatio || 1;
    const m = screenMeasures(this.frame.clientHeight || window.innerHeight, dpr);
    const root = document.documentElement.style;
    root.setProperty('--rq-line', `${m.line}px`);
    root.setProperty('--rq-mask', `${m.mask}px`);
    root.setProperty('--rq-cell', `${m.cell}px`);
    root.setProperty('--rq-gap', `${m.gap}px`);
  }

  private apply(): void {
    this.frame.classList.toggle('ar43', this.aspect === '4:3');
    for (const f of FILTERS) this.wrap.classList.toggle(`f-${f}`, this.filter === f);
    this.frame.classList.toggle('f-green', this.filter === 'green');
    this.measure();
    this.fx.className = this.filter;
    document.documentElement.style.setProperty('--rq-text', this.largeText ? '1.3' : '1');
    ps1Uniforms.lightsOn.value = this.lights ? 1 : 0;
    PICTURE.rows = SHARP_ROWS[this.sharp];
    // The picture changed shape: let the renderer re-measure.
    window.dispatchEvent(new Event('resize'));
  }
}
