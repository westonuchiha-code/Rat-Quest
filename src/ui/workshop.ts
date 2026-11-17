/**
 * The Workshop: the tools the game is made with, in one place. From its front page: the level editor, the sliders for
 * how the game feels, a sound test, a way to any place in the game, and the test switches. It is reached from the title
 * screen and from the pause menu. The game is paused under it.
 */
import { esc, icon, useDevTheme } from './devTheme';
import { DEV, type DevKey } from '../core/devSwitches';
import { QUIET } from '../audio/synth';

export interface WorkshopPlace {
  id: string;
  name: string;
  /** The world it belongs to, as a heading. */
  group: string;
  note?: string;
  here?: boolean;
}

export interface WorkshopHost {
  openEditor(): void;
  openTweaks(): void;
  /** How many sliders are off their defaults (shown on the Game Feel card). */
  tweaksChanged(): number;
  /** Every sound by name, with how loud it is (0..1) and how long (seconds). */
  sounds(): Array<{ name: string; loud: number; secs: number; loop: boolean }>;
  playSound(name: string, rate: number, vol: number): void;
  tracks(): string[];
  /** Plays a tune (null: back to the tune of the place he is in). */
  playTrack(name: string | null): void;
  places(): WorkshopPlace[];
  goTo(id: string): void;
  /** A switch was thrown: the game takes note. */
  switched(key: DevKey): void;
  /** One-off things: heal him, beat every creature here, give every piece of gear. Returns what to say. */
  act(what: 'heal' | 'clear' | 'gear' | 'restart'): string;
  onClose(): void;
}

type Page = 'home' | 'sound' | 'places' | 'switches';

const CSS = `
.rq-ws { position: absolute; inset: 0; z-index: 61; display: none; flex-direction: column; background: radial-gradient(ellipse at 50% 0%, #1b2233 0%, #0f1218 70%); }
.rq-ws.on { display: flex; }
.rq-ws > header { display: flex; align-items: center; gap: 0.7em; padding: 0.7em 1em; border-bottom: 1px solid var(--line); background: #151a24; }
.rq-ws > header h1 { margin: 0; font-size: 1.25em; letter-spacing: 0.14em; color: var(--gold); flex: 1; display: flex; align-items: center; gap: 0.5em; }
.rq-ws > header h1 small { color: var(--dim); font-weight: 600; letter-spacing: 0.02em; font-size: 0.72em; }
.rq-ws main { flex: 1; min-height: 0; overflow-y: auto; padding: 1.1em 1.2em 1.4em; }
.rq-ws .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(17em, 1fr)); gap: 0.9em; max-width: 70em; margin: 0 auto; }
.rq-ws .tool { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; gap: 0.5em; padding: 1.1em 1.2em; min-height: 9.5em; border-radius: 0.9em; background: linear-gradient(#222a39, #1a2030); border: 1px solid var(--line2); white-space: normal; text-align: left; }
.rq-ws .tool:hover { border-color: var(--gold); background: linear-gradient(#2a3345, #1f2638); }
.rq-ws .tool .pic { width: 2.8em; height: 2.8em; border-radius: 0.7em; display: flex; align-items: center; justify-content: center; background: #3a3110; color: var(--gold); }
.rq-ws .tool .pic svg { width: 1.7em; height: 1.7em; }
.rq-ws .tool b { font-size: 1.15em; } .rq-ws .tool span { color: var(--dim); font-size: 0.93em; line-height: 1.35; }
.rq-ws .tool i { font-style: normal; margin-top: auto; }
.rq-ws .wrap { max-width: 70em; margin: 0 auto; }
.rq-ws h3 { margin: 1.1em 0 0.5em; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
.rq-ws h3:first-child { margin-top: 0; }
.rq-ws .row { display: flex; align-items: center; gap: 0.7em; flex-wrap: wrap; margin: 0.5em 0; }
.rq-ws .row label { display: flex; align-items: center; gap: 0.5em; color: var(--dim); }
.rq-ws .row output { min-width: 3.2em; color: var(--gold); font-family: var(--rq-font-game); }
.rq-ws .snd { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5em, 1fr)); gap: 0.35em; }
.rq-ws .snd button { flex-direction: column; align-items: stretch; gap: 0.2em; padding: 0.4em 0.6em 0.35em; text-align: left; }
.rq-ws .snd button b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
.rq-ws .snd button em { font-style: normal; display: flex; align-items: center; gap: 0.4em; font-size: 0.72em; color: var(--faint); }
.rq-ws .meter { flex: 1; height: 0.4em; border-radius: 0.2em; background: #0b0e13; overflow: hidden; }
.rq-ws .meter u { display: block; height: 100%; background: var(--go); } .rq-ws .meter u.low { background: var(--bad); } .rq-ws .meter u.high { background: var(--gold2); }
.rq-ws .place { display: grid; grid-template-columns: repeat(auto-fill, minmax(15em, 1fr)); gap: 0.35em; }
.rq-ws .place button { justify-content: flex-start; text-align: left; white-space: normal; }
.rq-ws .place button small { margin-left: auto; color: var(--faint); padding-left: 0.6em; white-space: nowrap; }
.rq-ws .sw { display: grid; grid-template-columns: repeat(auto-fit, minmax(21em, 1fr)); gap: 0.6em; }
.rq-ws .swi { display: flex; align-items: center; gap: 0.9em; padding: 0.8em 1em; border-radius: 0.7em; background: var(--panel2); border: 1px solid var(--line); cursor: pointer; }
.rq-ws .swi.on { border-color: var(--gold); background: #2a2610; }
.rq-ws .swi div { flex: 1; } .rq-ws .swi b { display: block; } .rq-ws .swi span { color: var(--dim); font-size: 0.9em; }
.rq-ws .knob { width: 2.8em; height: 1.5em; border-radius: 1em; background: #0b0e13; border: 1px solid var(--line2); position: relative; flex: none; }
.rq-ws .knob::after { content: ''; position: absolute; left: 0.15em; top: 0.13em; width: 1.1em; height: 1.1em; border-radius: 50%; background: var(--faint); transition: left 0.12s, background 0.12s; }
.rq-ws .swi.on .knob::after { left: 1.45em; background: var(--gold); }
.rq-ws .msg { min-height: 1.4em; color: #fff3c4; }
.rq-ws .hint { color: var(--dim); max-width: 60em; }
`;

const SWITCHES: Array<[Exclude<DevKey, 'slow'>, string, string]> = [
  ['god', 'No damage', 'Nothing hurts him: blows, lava, fire and falls. For looking at a fight without losing it.'],
  ['shapes', 'Hit shapes', 'Draws on the floor what is solid: a ring for every body, the wedge each attack reaches (yellow while it winds up, red while it can hurt), his sword\'s sweep and his shield\'s cover.'],
  ['still', 'Creatures stand still', 'They do not move or attack (they can still be hit). For getting round a level, or lining up a picture.'],
  ['openDoors', 'Every door open', 'Doors that ask for Golden Wedges open anyway.'],
  ['readout', 'Readout', 'Frames a second, what he is doing and where he stands, in the corner of the screen.'],
];

export class Workshop {
  open = false;
  private readonly root: HTMLDivElement;
  private page: Page = 'home';
  private rate = 1;
  private vol = 0.8;
  private find = '';
  private msg = '';
  private track: string | null = null;

  constructor(parent: HTMLElement, private readonly host: WorkshopHost) {
    useDevTheme();
    if (!document.getElementById('rq-ws-css')) {
      const st = document.createElement('style');
      st.id = 'rq-ws-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-ws rqd';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    // Keys stay here, not in the game.
    this.root.addEventListener('keydown', (e) => e.stopPropagation());
    window.addEventListener('keydown', (e) => {
      if (!this.open || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Escape' || e.code === 'Backspace') {
        e.stopPropagation();
        e.preventDefault();
        if (this.page === 'home') this.hide();
        else this.go('home');
      }
    }, true);
  }

  show(page: Page = 'home'): void {
    this.open = true;
    this.page = page;
    this.msg = '';
    this.root.classList.add('on');
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    if (this.track !== null) {
      this.track = null;
      this.host.playTrack(null);
    }
    this.host.onClose();
  }

  private go(page: Page): void {
    this.page = page;
    this.msg = '';
    this.render();
  }

  private render(): void {
    const title = { home: '', sound: 'Sound test', places: 'Go to a place', switches: 'Test switches' }[this.page];
    const head = `<header>${this.page === 'home' ? '' : `<button data-a="home" title="Back to the Workshop (Esc)">${icon('back')}Back</button>`}<h1>${icon('wrench')}WORKSHOP${title ? `<small>${title}</small>` : '<small>the tools the game is made with</small>'}</h1><button data-a="close" class="ghost" title="Close (Esc)">${icon('close')}</button></header>`;
    let body = '';
    if (this.page === 'home') {
      const n = this.host.tweaksChanged();
      const on = SWITCHES.filter(([k]) => DEV[k]).length + (DEV.slow !== 1 ? 1 : 0);
      const card = (a: string, ic: string, name: string, text: string, tag = ''): string => `<button class="tool" data-a="${a}"><span class="pic">${icon(ic)}</span><b>${name}</b><span>${text}</span>${tag ? `<i>${tag}</i>` : ''}</button>`;
      body = `<div class="cards">
        ${card('editor', 'piece', 'Level editor', 'Draw a level on a map, watch it in the game as you draw, and play it. Jump checker, measuring, samples.')}
        ${card('tweaks', 'sliders', 'Game feel', 'Sliders for how he moves and fights, and for every creature. Changes can be copied out as text to become the defaults.', n ? `<span class="badge warn">${n} changed</span>` : '')}
        ${card('sound', 'sound', 'Sound test', 'Hear any sound at any pitch, see how loud each one is, and try the music.')}
        ${card('places', 'door', 'Go to a place', 'Jump straight to any place in the game: the worlds, their side areas, and the old levels.')}
        ${card('switches', 'flask', 'Test switches', 'No damage, slow motion, hit shapes drawn on the floor, creatures standing still, every door open.', on ? `<span class="badge warn">${on} on</span>` : '')}
      </div>`;
    } else if (this.page === 'sound') body = this.soundPage();
    else if (this.page === 'places') body = this.placesPage();
    else body = this.switchPage();
    this.root.innerHTML = `${head}<main>${body}</main>`;
  }

  private soundList(): string {
    const find = this.find.trim().toLowerCase();
    const all = this.host.sounds().filter((s) => !find || s.name.toLowerCase().includes(find));
    if (!all.length) return '<div class="hint">No sound by that name.</div>';
    return all
      .map((s) => `<button data-snd="${esc(s.name)}" title="${s.secs.toFixed(2)} s${s.loop ? ', a loop (one turn of it is played)' : ''}"><b>${esc(s.name)}</b><em><span class="meter"><u class="${s.loud < QUIET ? 'low' : s.loud > 0.36 ? 'high' : ''}" style="width:${Math.min(100, Math.round(s.loud * 160))}%"></u></span>${s.loud.toFixed(2)}</em></button>`)
      .join('');
  }
  private soundPage(): string {
    return `<div class="wrap">
      <h3>Music</h3>
      <div class="row">${this.host.tracks().map((t) => `<button data-trk="${esc(t)}" class="${this.track === t ? 'on' : ''}">${icon('music')}${esc(t)}</button>`).join('')}<button data-trk="">${icon('stop')}Back to this place's tune</button></div>
      <h3>Sounds</h3>
      <div class="row"><input type="search" data-f="find" placeholder="Find a sound" value="${esc(this.find)}" style="width:14em" />
        <label>Pitch <input type="range" data-f="rate" min="0.4" max="2" step="0.05" value="${this.rate}" /><output data-o="rate">x${this.rate.toFixed(2)}</output></label>
        <label>Volume <input type="range" data-f="vol" min="0.1" max="1" step="0.05" value="${this.vol}" /><output data-o="vol">${Math.round(this.vol * 100)}%</output></label>
        <button data-a="pitch1">Pitch back to x1</button></div>
      <div class="hint">Click a sound to hear it. The bar is how loud it is at its loudest (over a fifth of a second): red would be quiet enough to be lost under other sounds, orange is among the loudest.</div>
      <div class="snd" style="margin-top:0.7em">${this.soundList()}</div></div>`;
  }

  private placesPage(): string {
    const places = this.host.places();
    const groups = [...new Set(places.map((p) => p.group))];
    return `<div class="wrap"><div class="hint">He is put at the place's own start, on a fresh visit. Nothing is saved over: the game he was in is as it was the last time it was saved.</div>
      ${groups.map((g) => `<h3>${esc(g)}</h3><div class="place">${places.filter((p) => p.group === g).map((p) => `<button data-go="${esc(p.id)}" class="${p.here ? 'on' : ''}">${icon('door')}${esc(p.name)}<small>${p.here ? 'here now' : esc(p.note ?? '')}</small></button>`).join('')}</div>`).join('')}</div>`;
  }

  private switchPage(): string {
    return `<div class="wrap"><div class="hint">For trying things out. None of these is saved, and they are all off whenever the game is started. What is on is written small in the top corner of the screen.</div>
      <h3>Switches</h3>
      <div class="sw">${SWITCHES.map(([k, name, text]) => `<div class="swi${DEV[k] ? ' on' : ''}" data-sw="${k}"><span class="knob"></span><div><b>${name}</b><span>${text}</span></div></div>`).join('')}</div>
      <h3>Speed</h3>
      <div class="row"><div class="seg">${[1, 0.5, 0.25, 0.1].map((v) => `<button data-slow="${v}" class="${DEV.slow === v ? 'on' : ''}">${v === 1 ? 'Full speed' : `x${v}`}</button>`).join('')}</div><span class="hint">Slow motion, to watch an attack come out and see where it lands.</span></div>
      <h3>Now</h3>
      <div class="row"><button data-act="heal">${icon('heart')}Heal him</button><button data-act="clear">${icon('bolt')}Beat every creature here</button><button data-act="gear">${icon('plus')}Give every piece of gear</button><button data-act="restart">${icon('turn')}Start this place again</button></div>
      <div class="msg">${esc(this.msg)}</div></div>`;
  }

  private onInput(e: Event): void {
    const t = e.target as HTMLInputElement;
    const f = t.dataset.f;
    if (f === 'find') {
      this.find = t.value;
      const el = this.root.querySelector('.snd');
      if (el) el.innerHTML = this.soundList();
    } else if (f === 'rate' || f === 'vol') {
      this[f] = Number(t.value);
      const o = this.root.querySelector(`[data-o="${f}"]`);
      if (o) o.textContent = f === 'rate' ? `x${this.rate.toFixed(2)}` : `${Math.round(this.vol * 100)}%`;
    }
  }

  private onClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    const snd = (t.closest('[data-snd]') as HTMLElement | null)?.dataset.snd;
    if (snd) return this.host.playSound(snd, this.rate, this.vol);
    const trk = t.closest('[data-trk]') as HTMLElement | null;
    if (trk) {
      this.track = trk.dataset.trk || null;
      this.host.playTrack(this.track);
      return this.render();
    }
    const go = (t.closest('[data-go]') as HTMLElement | null)?.dataset.go;
    if (go) {
      this.open = false;
      this.root.classList.remove('on');
      this.track = null;
      return this.host.goTo(go);
    }
    const sw = (t.closest('[data-sw]') as HTMLElement | null)?.dataset.sw as Exclude<DevKey, 'slow'> | undefined;
    if (sw) {
      DEV[sw] = !DEV[sw];
      this.host.switched(sw);
      return this.render();
    }
    const slow = (t.closest('[data-slow]') as HTMLElement | null)?.dataset.slow;
    if (slow) {
      DEV.slow = Number(slow);
      this.host.switched('slow');
      return this.render();
    }
    const act = (t.closest('[data-act]') as HTMLElement | null)?.dataset.act as 'heal' | 'clear' | 'gear' | 'restart' | undefined;
    if (act) {
      this.msg = this.host.act(act);
      return this.render();
    }
    const a = (t.closest('[data-a]') as HTMLElement | null)?.dataset.a;
    if (!a) return;
    if (a === 'close') return this.hide();
    if (a === 'home') return this.go('home');
    if (a === 'pitch1') {
      this.rate = 1;
      return this.render();
    }
    if (a === 'sound' || a === 'places' || a === 'switches') return this.go(a);
    if (a === 'editor' || a === 'tweaks') {
      // The tool takes over; the Workshop steps aside without telling the game it has closed.
      this.open = false;
      this.root.classList.remove('on');
      if (a === 'editor') this.host.openEditor();
      else this.host.openTweaks();
    }
  }
}
