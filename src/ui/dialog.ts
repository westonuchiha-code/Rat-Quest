import { drawPortrait } from '../npc/portrait';
import type { NpcKind } from '../npc/npc';
/**
 * The talk box: who is speaking and what they say, across the bottom of the picture, typed out a letter at a time.
 * It only ever opens because the player chose to talk to someone.
 */
const CSS = `
.rq-talk { position: absolute; left: 50%; bottom: 5%; transform: translateX(-50%); width: min(80%, 150vh); z-index: 30; display: none;
  container-type: inline-size; pointer-events: none; --acc: #ffe27a; --edge: #6f8a5a; --bg1: #18241b; --bg2: #0a100c; --plate: #2c4030; }
.rq-talk.open { display: block; animation: rq-talk-in 0.18s ease-out; }
@keyframes rq-talk-in { from { opacity: 0; transform: translateX(-50%) translateY(0.8em); } to { opacity: 1; transform: translateX(-50%); } }
.rq-talk.k-villain { --acc: #ff7a6a; --edge: #8a4aa8; --bg1: #231030; --bg2: #0e0614; --plate: #3a1850; }
.rq-talk.k-pigeon { --acc: #6af0d0; --edge: #3aa890; --bg1: #10262a; --bg2: #08121a; --plate: #1a4048; }
.rq-talk.k-bird { --acc: #ffd84a; --edge: #b89a30; --bg1: #2a2410; --bg2: #14110a; --plate: #4a3e14; }
.rq-talk.k-mouse { --acc: #ffd2a0; --edge: #a07a58; --bg1: #2a1e16; --bg2: #120c08; --plate: #4a3426; }
.rq-talk-box { font-size: calc(clamp(11px, 2.4cqw, 28px) * var(--rq-text, 1)); font-family: var(--rq-font-game); color: #f4eed8; line-height: 1.45;
  background: linear-gradient(color-mix(in srgb, var(--bg1) 95%, transparent), color-mix(in srgb, var(--bg2) 96%, transparent)); border: 0.14em solid var(--edge); border-radius: 0.8em; padding: 0.9em 1.2em 1.35em; min-height: 4.8em;
  box-shadow: 0 0.3em 1.2em #000a, inset 0 0 0 0.12em #0008, 0 0 1.4em color-mix(in srgb, var(--edge) 35%, transparent); position: relative;
  text-shadow: 0.08em 0.08em 0 #000a; }
.rq-talk-box.has-face { padding-left: 6.9em; }
.rq-talk-face { position: absolute; left: 0.9em; top: -1.6em; width: 4.9em; height: 4.9em; image-rendering: pixelated; border: 0.14em solid var(--acc); border-radius: 0.6em; background: #000; box-shadow: 0 0.2em 0.6em #000a; transform-origin: 50% 100%; }
.rq-talk.talking .rq-talk-face { animation: rq-talk-hop 0.22s infinite alternate ease-in-out; }
@keyframes rq-talk-hop { from { transform: translateY(0) rotate(-1.2deg); } to { transform: translateY(-0.18em) rotate(1.2deg) scale(1.02); } }
.rq-talk-name { position: absolute; top: -0.95em; left: 6.9em; background: var(--plate); border: 0.12em solid var(--acc); color: var(--acc); font-weight: 800;
  letter-spacing: 0.14em; padding: 0.05em 0.8em; border-radius: 0.5em; font-size: 0.85em; text-shadow: none; box-shadow: 0 0.15em 0.4em #0008; }
.rq-talk-text { white-space: pre-wrap; word-break: break-word; }
.rq-talk-text .off { visibility: hidden; }
.rq-talk-text .em { color: var(--acc); font-weight: 800; }
.rq-talk-more { position: absolute; right: 1em; bottom: 0.35em; color: var(--acc); font-size: 0.85em; animation: rq-talk-bob 0.6s infinite alternate; }
.rq-talk-pips { position: absolute; left: 6.9em; bottom: 0.45em; display: flex; gap: 0.35em; }
.rq-talk-pips i { width: 0.5em; height: 0.5em; border-radius: 50%; background: #ffffff30; display: block; }
.rq-talk-pips i.on { background: var(--acc); }
@keyframes rq-talk-bob { from { transform: translateY(0); } to { transform: translateY(0.25em); } }
`;

/** Splits *emphasis* marks out of a line: the plain text (what is typed and spoken) and which letters are emphasised. */
export function parseLine(raw: string): { text: string; em: boolean[] } {
  let text = '';
  const em: boolean[] = [];
  let on = false;
  for (const ch of raw) {
    if (ch === '*') {
      on = !on;
      continue;
    }
    text += ch;
    em.push(on);
  }
  return { text, em };
}

export class Dialog {
  private readonly root: HTMLDivElement;
  private readonly nameEl: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
  private readonly moreEl: HTMLDivElement;
  private lines: string[] = [];
  private emph: boolean[][] = [];
  private readonly pipsEl: HTMLDivElement;
  private index = 0;
  private shown = 0;
  private tick = 0;
  private open_ = false;
  /** Called for each few letters typed, for the talking blips. */
  onBlip: ((ch: string, kind: NpcKind, step: number, line: string, idx: number) => void) | null = null;
  private kind: NpcKind = 'mouse';

  constructor(parent: HTMLElement) {
    if (typeof document !== 'undefined' && !document.getElementById('rq-talk-css')) {
      const st = document.createElement('style');
      st.id = 'rq-talk-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-talk';
    this.root.innerHTML = '<div class="rq-talk-box"><canvas class="rq-talk-face"></canvas><div class="rq-talk-name"></div><div class="rq-talk-text"></div><div class="rq-talk-pips"></div><div class="rq-talk-more">&#9660;</div></div>';
    parent.appendChild(this.root);
    this.nameEl = this.root.querySelector('.rq-talk-name') as HTMLDivElement;
    this.textEl = this.root.querySelector('.rq-talk-text') as HTMLDivElement;
    this.moreEl = this.root.querySelector('.rq-talk-more') as HTMLDivElement;
    this.pipsEl = this.root.querySelector('.rq-talk-pips') as HTMLDivElement;
  }

  get open(): boolean {
    return this.open_;
  }

  /** Called with the speaker's name whenever a talk begins (the sticker book notes who he has met). */
  onStart: ((name: string) => void) | null = null;
  /** The button that moves the talk on, as a chip (the game sets it); the arrow alone without one. */
  morePrompt: (() => string) | null = null;

  start(name: string, lines: string[], kind: NpcKind = 'mouse'): void {
    if (lines.length === 0) return;
    this.onStart?.(name);
    this.kind = kind;
    const parsed = lines.map(parseLine);
    this.lines = parsed.map((p) => p.text);
    this.emph = parsed.map((p) => p.em);
    this.index = 0;
    this.shown = 0;
    this.tick = 0;
    this.open_ = true;
    this.nameEl.textContent = name;
    drawPortrait(this.root.querySelector('.rq-talk-face') as HTMLCanvasElement, kind, name);
    (this.root.querySelector('.rq-talk-box') as HTMLElement).classList.add('has-face');
    this.root.classList.remove('k-mouse', 'k-bird', 'k-villain', 'k-pigeon');
    this.root.classList.add('open', `k-${kind}`);
    this.draw();
  }

  close(): void {
    this.open_ = false;
    this.root.classList.remove('open', 'talking');
  }

  /** The talk button: finishes the line being typed, or goes to the next one, or closes after the last. */
  advance(): void {
    if (!this.open_) return;
    const line = this.lines[this.index];
    if (this.shown < line.length) this.shown = line.length;
    else if (this.index < this.lines.length - 1) {
      this.index++;
      this.shown = 0;
    } else return this.close();
    this.draw();
  }

  update(dt: number): void {
    if (!this.open_) return;
    const line = this.lines[this.index];
    if (this.shown < line.length) {
      // A villain drawls: slower text, a syllable every third letter, so each one is heard.
      // A pigeon talks on a beat: a tick every sixteenth note at 126 BPM (8.4 a second), spaces are rests.
      // Everyone else reports each new letter, and the voice decides which letters start a syllable.
      const groove = this.kind === 'pigeon';
      const cps = this.kind === 'mouse' ? 20 : this.kind === 'villain' ? 22 : groove ? 16.8 : 30;
      const from = Math.floor(this.shown);
      this.shown = Math.min(line.length, this.shown + dt * cps);
      if (groove) {
        const before = Math.floor(from / 2);
        if (Math.floor(this.shown / 2) !== before) {
          const ch = line[Math.floor(this.shown) - 1] ?? '';
          this.onBlip?.(ch, this.kind, this.tick, line, Math.floor(this.shown) - 1);
          this.tick++;
        }
      } else {
        for (let i = from; i < Math.floor(this.shown); i++) this.onBlip?.(line[i], this.kind, this.tick++, line, i);
      }
      this.draw();
    }
  }

  private draw(): void {
    const line = this.lines[this.index];
    const n = Math.floor(this.shown);
    const em = this.emph[this.index] ?? [];
    // The whole line is laid out from the start (the untyped part is invisible), so the box never jumps and words never re-wrap while typing.
    let html = '';
    let run = '';
    let cur = '';
    const flush = (): void => {
      if (run) html += `<span class="${cur}">${run.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`;
      run = '';
    };
    for (let i = 0; i < line.length; i++) {
      const cls = i < n ? (em[i] ? 'on em' : 'on') : 'off';
      if (cls !== cur) {
        flush();
        cur = cls;
      }
      run += line[i];
    }
    flush();
    this.textEl.innerHTML = html;
    const typing = this.shown < line.length;
    this.root.classList.toggle('talking', typing);
    this.moreEl.style.visibility = typing ? 'hidden' : 'visible';
    const more = `${this.morePrompt?.() ?? ''}&#9660;`;
    if (this.moreEl.innerHTML !== more) this.moreEl.innerHTML = more;
    if (this.pipsEl.childElementCount !== this.lines.length) this.pipsEl.innerHTML = this.lines.map(() => '<i></i>').join('');
    Array.from(this.pipsEl.children).forEach((c, i) => c.classList.toggle('on', i === this.index));
  }
}
