/**
 * Start-up flow: a nostalgic boot logo, a title screen (with the live 3D scene behind it), the save files, and a
 * PS1-style loading screen.
 */
import { wedgeIcon } from './icons';

export type BootCmd = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'copy' | 'erase';
type Stage = 'off' | 'logo' | 'title' | 'files' | 'loading';

/** One save file as the file screen shows it. */
export interface FileCard {
  file: number;
  empty: boolean;
  where: string;
  wedges: number;
  total: number;
  played: string;
  saved: string;
}

export interface BootHost {
  /** The save files, in order. */
  files(): FileCard[];
  /** The file played last (the file screen starts on it). */
  currentFile(): number;
  /** Plays a file: its game where it was saved, or a new game if it is empty. Runs behind the loading screen. */
  playFile(file: number): void;
  copyFile(from: number, to: number): void;
  eraseFile(file: number): void;
  /** OPTIONS: the main menu takes over. */
  onOptions(): void;
  /** The controls line for a screen, as button chips. */
  help?(screen: 'title' | 'files' | 'pickCopy' | 'sureCopy' | 'sureErase'): string;
  sound?(name: 'move' | 'ok' | 'back' | 'chime'): void;
}

export const LOGO_TIME = 4.4;
const LOAD_MIN = 1.4;

const CSS = `
.rq-boot { position: absolute; inset: 0; z-index: 50; display: none; container-type: size; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: manipulation;
  font-family: Impact, 'Arial Black', 'Trebuchet MS', sans-serif; }
.rq-boot.on { display: block; }
.rq-booting .hp-row, .rq-booting .rq-goal, .rq-booting .rq-collect, .rq-booting .rq-hint { display: none !important; }
.rq-boot > div { position: absolute; inset: 0; display: none; }
.rq-boot > div.on { display: block; }

/* ---- Boot logo ---- */
.rq-logo { background: #fff; }
.rq-logo.on { animation: rq-logo-out ${LOGO_TIME}s linear forwards; }
.rq-logo .mark { position: absolute; left: 50%; top: 44%; width: 38cqh; height: 45.6cqh; transform: translate(-50%, -50%); opacity: 0; animation: rq-logo-in 1.1s 0.3s ease-out forwards; }
.rq-logo .mark svg { width: 100%; height: 100%; overflow: visible; }
.rq-logo .sheen { animation: rq-sheen 0.9s 2.0s ease-in-out both; }
.rq-logo .name { position: absolute; left: 0; right: 0; top: 72%; text-align: center; font: italic 700 min(8.2cqh, 6.6cqw) Georgia, 'Times New Roman', serif; letter-spacing: 0.22em; color: #2b2f55; opacity: 0; animation: rq-fade 0.8s 1.1s ease-out forwards; }
.rq-logo .name i { font-size: 2.4cqh; vertical-align: top; letter-spacing: 0; font-style: normal; }
.rq-logo .sub { position: absolute; left: 0; right: 0; top: 84%; text-align: center; font: 600 min(3.4cqh, 3.6cqw) 'Trebuchet MS', Arial, sans-serif; letter-spacing: 0.4em; color: #6a6f96; opacity: 0; animation: rq-fade 0.8s 1.4s ease-out forwards; }
.rq-logo .black { position: absolute; inset: 0; background: #000; opacity: 0; animation: rq-black 0.6s ${LOGO_TIME - 0.6}s linear forwards; }
@keyframes rq-logo-in { from { opacity: 0; transform: translate(-50%, -50%) scale(0.86); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes rq-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rq-black { from { opacity: 0; } to { opacity: 1; } }
@keyframes rq-sheen { from { transform: translateX(-70px) skewX(-20deg); } to { transform: translateX(140px) skewX(-20deg); } }
@keyframes rq-logo-out { 0%, 100% { opacity: 1; } }

/* ---- Title ---- */
.rq-title { background: radial-gradient(ellipse at 50% 55%, #0000 30%, #000b 100%), linear-gradient(#000a, #0000 35%, #0000 60%, #000c); }
.rq-title .logo { position: absolute; left: 0; right: 0; top: 9%; text-align: center; font-size: min(25cqh, 13.2cqw); line-height: 1; letter-spacing: 0.02em; white-space: nowrap;
  filter: drop-shadow(0 0.012em 0 #3a1000) drop-shadow(0 0.03em 0 #3a1000) drop-shadow(0 0.055em 0 #1a0600) drop-shadow(0 0.1em 0.04em #000c) drop-shadow(0.018em 0 0 #1a0600) drop-shadow(-0.018em 0 0 #1a0600) drop-shadow(0 -0.018em 0 #1a0600); }
.rq-title .logo span { display: inline-block; background: linear-gradient(#fff6b0 0%, #ffc233 42%, #ee6a12 62%, #b8340a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; animation: rq-wob 0.9s steps(1) infinite; }
.rq-title .logo span:nth-child(2n) { animation-delay: -0.3s; }
.rq-title .logo span:nth-child(3n) { animation-delay: -0.6s; }
.rq-title .tag { position: absolute; left: 0; right: 0; top: 36%; text-align: center; font-size: min(6.4cqh, 5.2cqw); letter-spacing: 0.3em; color: #e7e0bd; text-shadow: 0 0.08em 0 #000, 0 0 0.4em #000; padding-left: 0.3em; }
.rq-title .opts { position: absolute; left: 0; right: 0; top: 56%; display: flex; flex-direction: column; align-items: center; gap: 1.6cqh; }
.rq-title .opt { font-size: min(8cqh, 8cqw); line-height: 1; letter-spacing: 0.12em; color: #8f8a73; text-shadow: 0 0.07em 0 #000; padding: 0.4cqh 4cqh; position: relative; cursor: pointer; }
.rq-title .opt.sel { color: #fff2a8; text-shadow: 0 0.07em 0 #5a2200, 0 0 0.5em #ffb02a99; animation: rq-pulse 0.7s steps(2) infinite; }
.rq-title .opt.sel::before { content: '\\25B6'; position: absolute; left: -1.5cqh; top: 50%; transform: translateY(-50%); font-size: 0.6em; color: #ffd24a; }
.rq-title .hint { position: absolute; left: 0; right: 0; bottom: 7%; text-align: center; font: 700 min(3.4cqh, 2.9cqw) 'Trebuchet MS', Arial, sans-serif; letter-spacing: 0.1em; color: #d9d3b0; text-shadow: 0 0.1em 0 #000; }
.rq-title .copy { position: absolute; right: 2%; bottom: 1.5%; font: 600 min(2.4cqh, 2cqw) 'Trebuchet MS', Arial, sans-serif; color: #9a9477; text-shadow: 0 0.1em 0 #000; }
.rq-title .hint .rqg-pair, .rq-files .help .rqg-pair { margin: 0 0.8em; }

/* ---- Save files ---- */
.rq-files { background: radial-gradient(ellipse at 50% 50%, #0008 20%, #000d 100%), linear-gradient(#000c, #0006 40%, #000c); font-family: 'Trebuchet MS', Arial, sans-serif; color: #e9e2c4; }
.rq-files .head { position: absolute; left: 0; right: 0; top: 6%; text-align: center; font: min(9cqh, 7cqw) Impact, 'Arial Black', sans-serif; letter-spacing: 0.14em; color: #ffd24a;
  text-shadow: 0 0.06em 0 #5a2200, 0 0 0.4em #000; }
.rq-files .cards { position: absolute; left: 4%; right: 4%; top: 22%; height: 52%; display: flex; gap: 2.4%; justify-content: center; }
.rq-files .card { flex: 0 1 30%; max-width: 46cqh; box-sizing: border-box; padding: 3cqh 2.2cqh; border-radius: 2.2cqh; background: linear-gradient(#2a3324ee, #161c13ee); border: 0.45cqh solid #4b5a40;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.4cqh; text-align: center; cursor: pointer; transition: transform 0.12s; }
.rq-files .card .num { margin-bottom: auto; }
.rq-files .card > :last-child { margin-bottom: auto; }
.rq-files .card.sel { border-color: #ffe27a; box-shadow: 0 0 3cqh #ffd24a66, inset 0 0 2cqh #ffd24a22; transform: translateY(-1.2cqh); }
.rq-files .card.target { border-color: #7fd4ff; box-shadow: 0 0 3cqh #7fd4ff66; }
.rq-files .card.from { border-style: dashed; }
.rq-files .num { font: min(6cqh, 4.4cqw) Impact, 'Arial Black', sans-serif; letter-spacing: 0.12em; color: #ffe9a0; }
.rq-files .where { font-weight: 800; font-size: max(14px, 3.2cqh); color: #fff6d8; min-height: 2.4em; display: flex; align-items: center; }
.rq-files .wedges { display: flex; align-items: center; gap: 0.4em; font-weight: 800; font-size: max(15px, 3.8cqh); color: #ffd24a; }
.rq-files .wedges svg { width: 1.2em; height: 1.2em; }
.rq-files .played, .rq-files .saved { font-size: max(13px, 2.6cqh); color: #cfc8a8; }
.rq-files .new { margin-top: auto; margin-bottom: auto; font: min(6cqh, 4.4cqw) Impact, 'Arial Black', sans-serif; letter-spacing: 0.1em; color: #9fe08a; }
.rq-files .card .blurb { font-size: max(13px, 2.6cqh); color: #a9a283; }
.rq-files .msg { position: absolute; left: 0; right: 0; top: 79%; text-align: center; font-weight: 800; font-size: max(14px, 3.2cqh); color: #ffe9a0; text-shadow: 0 0.1em 0 #000; min-height: 1.3em; }
.rq-files .help { position: absolute; left: 0; right: 0; bottom: 6%; display: flex; justify-content: center; flex-wrap: wrap; font-weight: 700; font-size: max(13px, 2.9cqh); color: #d9d3b0; text-shadow: 0 0.1em 0 #000; }
.rq-files .help [data-cmd] { cursor: pointer; }

@keyframes rq-wob { 0% { transform: translateY(0) rotate(0); } 33% { transform: translateY(-0.012em) rotate(-1.2deg); } 66% { transform: translateY(0.01em) rotate(1deg); } }
@keyframes rq-pulse { 0% { filter: brightness(1); } 50% { filter: brightness(1.25); } }

/* ---- Loading ---- */
.rq-loading { background: #04030c; }
.rq-loading canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.rq-loading .word { position: absolute; left: 0; right: 0; top: 28%; text-align: center; font-size: min(22cqh, 12.6cqw); line-height: 1; white-space: nowrap; filter: drop-shadow(0 0.05em 0 #000) drop-shadow(0 0 0.04em #000); }
.rq-loading .word span { display: inline-block; animation: rq-jit 0.5s steps(1) infinite; padding: 0 0.01em; }
.rq-loading .word span:nth-child(2n) { animation-delay: -0.17s; }
.rq-loading .word span:nth-child(3n) { animation-delay: -0.33s; }
@keyframes rq-jit { 0% { transform: translate(0, 0) rotate(-2deg); } 25% { transform: translate(0.012em, -0.035em) rotate(2.5deg); } 50% { transform: translate(-0.012em, 0.02em) rotate(-1deg); } 75% { transform: translate(0.01em, 0.03em) rotate(2deg); } }
.rq-loading .cube { position: absolute; left: 50%; top: 76%; width: 12cqh; height: 12cqh; margin: -6cqh 0 0 -6cqh; perspective: 60cqh; }
.rq-loading .cube > div { position: absolute; inset: 0; transform-style: preserve-3d; animation: rq-spin 2.4s linear infinite; }
.rq-loading .cube b { position: absolute; inset: 0; border: 0.4cqh solid #7a4a00; background: radial-gradient(circle at 30% 30%, #8a5a0a 0 8%, #0000 9%), radial-gradient(circle at 68% 62%, #8a5a0a 0 11%, #0000 12%), #f2b928; backface-visibility: hidden; }
.rq-loading .cube b:nth-child(1) { transform: translateZ(6cqh); }
.rq-loading .cube b:nth-child(2) { transform: rotateY(180deg) translateZ(6cqh); filter: brightness(0.8); }
.rq-loading .cube b:nth-child(3) { transform: rotateY(90deg) translateZ(6cqh); filter: brightness(0.9); }
.rq-loading .cube b:nth-child(4) { transform: rotateY(-90deg) translateZ(6cqh); filter: brightness(0.7); }
.rq-loading .cube b:nth-child(5) { transform: rotateX(90deg) translateZ(6cqh); filter: brightness(1.12); }
.rq-loading .cube b:nth-child(6) { transform: rotateX(-90deg) translateZ(6cqh); filter: brightness(0.6); }
@keyframes rq-spin { from { transform: rotateX(-24deg) rotateY(0); } to { transform: rotateX(-24deg) rotateY(360deg); } }
`;

const LOAD_COLORS = ['#ff3b3b', '#ff9a1f', '#ffe03a', '#52e05a', '#38d6ff', '#5a7bff', '#d65aff'];

const EMBLEM = `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="rqg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset="0.55" stop-color="#f08a1c"/><stop offset="1" stop-color="#c8460e"/></linearGradient>
<clipPath id="rqc"><path d="M50 6 L92 20 V62 C92 90 70 108 50 116 C30 108 8 90 8 62 V20 Z"/></clipPath>
</defs>
<path d="M50 6 L92 20 V62 C92 90 70 108 50 116 C30 108 8 90 8 62 V20 Z" fill="url(#rqg)" stroke="#8a3208" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M50 14 L84 25 V62 C84 84 67 99 50 107 C33 99 16 84 16 62 V25 Z" fill="none" stroke="#fff3b0" stroke-opacity="0.75" stroke-width="2"/>
<path d="M25 80 L75 80 L75 52 Z" fill="#fff0a0" stroke="#7a3a08" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="62" cy="71" r="3.6" fill="#d89a2a"/><circle cx="50" cy="75" r="2.4" fill="#d89a2a"/><circle cx="68" cy="61" r="2.2" fill="#d89a2a"/>
<path d="M30 46 L36 32 L44 42 L50 28 L56 42 L64 32 L70 46 Z" fill="#fff6c8" stroke="#7a3a08" stroke-width="2" stroke-linejoin="round"/>
<g clip-path="url(#rqc)"><rect class="sheen" x="-30" y="-10" width="26" height="150" fill="#fff" fill-opacity="0.65"/></g>
</svg>`;

function letters(text: string, colors?: string[]): string {
  return [...text].map((ch, i) => `<span${colors ? ` style="color:${colors[i % colors.length]}"` : ''}>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
}

export class Boot {
  private root = document.createElement('div');
  private logo = document.createElement('div');
  private title = document.createElement('div');
  private filesEl = document.createElement('div');
  private fileSel = 0;
  /** What the file screen is doing: choosing, choosing where to copy to, or asking "are you sure". */
  private fileMode: 'pick' | 'copy' | 'sureCopy' | 'sureErase' = 'pick';
  private copyFrom = 0;
  private fileMsg = '';
  private loadEl = document.createElement('div');
  private opts = document.createElement('div');
  private canvas = document.createElement('canvas');
  private stage: Stage = 'off';
  private t = 0;
  private sel = 0;
  private items: { label: string; run: () => void }[] = [];
  private loadFor = 0;
  private loadDone: (() => void) | null = null;
  private stars: { x: number; y: number; z: number; c: string }[] = [];

  constructor(private parent: HTMLElement, private host: BootHost) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root.className = 'rq-boot';
    this.logo.className = 'rq-logo';
    this.logo.innerHTML = `<div class="mark">${EMBLEM}</div><div class="name">KINGDOM BELOW<i>™</i></div><div class="sub">INTERACTIVE ENTERTAINMENT</div><div class="black"></div>`;
    this.title.className = 'rq-title';
    this.title.innerHTML = `<div class="logo">${letters('RATQUEST')}</div><div class="tag">THE KINGDOM BELOW</div><div class="opts"></div><div class="hint"></div><div class="copy">© KINGDOM BELOW INTERACTIVE</div>`;
    this.opts = this.title.querySelector('.opts') as HTMLDivElement;
    this.loadEl.className = 'rq-loading';
    this.loadEl.innerHTML = `<div class="word">${letters('LOADING', LOAD_COLORS)}</div><div class="cube"><div><b></b><b></b><b></b><b></b><b></b><b></b></div></div>`;
    this.loadEl.insertBefore(this.canvas, this.loadEl.firstChild);
    this.filesEl.className = 'rq-files';
    this.filesEl.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      const card = t.closest('.card') as HTMLElement | null;
      const cmd = (t.closest('[data-cmd]') as HTMLElement | null)?.dataset.cmd as BootCmd | undefined;
      if (card) {
        const i = Number(card.dataset.i);
        if (i !== this.fileSel) {
          this.fileSel = i;
          if (this.fileMode === 'sureErase') this.fileMode = 'pick';
          this.renderFiles();
        } else this.cmd('ok');
      } else if (cmd) this.cmd(cmd);
    });
    this.root.append(this.logo, this.title, this.filesEl, this.loadEl);
    parent.appendChild(this.root);
    for (let i = 0; i < 110; i++) this.stars.push({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, c: LOAD_COLORS[i % LOAD_COLORS.length] });
    // Taps and clicks: the logo skips; title items choose themselves.
    this.logo.addEventListener('pointerdown', () => this.skipLogo());
    this.opts.addEventListener('pointerdown', (e) => {
      const el = (e.target as HTMLElement).closest('.opt') as HTMLElement | null;
      if (!el) return;
      const i = Number(el.dataset.i);
      if (this.sel !== i) this.sel = i, this.renderTitle();
      this.cmd('ok');
    });
  }

  get active(): boolean {
    return this.stage !== 'off';
  }
  /** True while the start-up screens cover the game and own the controls. */
  get blocking(): boolean {
    return this.stage !== 'off' && this.root.classList.contains('on');
  }
  get where(): Stage {
    return this.stage;
  }

  /** The whole start-up: the logo, then the title. */
  begin(): void {
    this.root.classList.add('on');
    this.setStage('logo');
    this.host.sound?.('chime');
  }

  /** Go straight to the title screen (used when OPTIONS closes). */
  showTitle(): void {
    this.root.classList.add('on');
    this.setStage('title');
  }

  /** The save files (from the title's CONTINUE; also #boot&files for screenshots). */
  showFiles(): void {
    this.root.classList.add('on');
    this.setStage('files');
  }

  /** Draws the title or file screen again (the button prompts changed). */
  refresh(): void {
    if (this.stage === 'title') this.renderTitle();
    else if (this.stage === 'files') this.renderFiles();
  }

  /** The loading screen for at least `ms`, then `then()` runs. It can be used for any pause that needs a screen. */
  loading(then: () => void, ms = LOAD_MIN * 1000): void {
    this.root.classList.add('on');
    this.loadFor = ms / 1000;
    this.loadDone = then;
    this.setStage('loading');
  }

  /** Hides the title for a moment (the menu takes over). */
  hide(): void {
    this.root.classList.remove('on');
    this.sync();
  }

  /** Marks the host so the HUD hides while a start-up screen is up. */
  private sync(): void {
    this.parent.classList.toggle('rq-booting', this.blocking);
  }

  private setStage(s: Stage): void {
    this.stage = s;
    this.t = 0;
    this.logo.classList.toggle('on', s === 'logo');
    this.title.classList.toggle('on', s === 'title');
    this.filesEl.classList.toggle('on', s === 'files');
    this.loadEl.classList.toggle('on', s === 'loading');
    if (s === 'title') {
      this.sel = 0;
      this.renderTitle();
    } else if (s === 'files') {
      this.fileSel = Math.max(0, this.host.currentFile() - 1);
      this.fileMode = 'pick';
      this.fileMsg = '';
      this.renderFiles();
    }
    this.sync();
    if (s === 'logo') {
      // Restart the CSS animations.
      this.logo.classList.remove('on');
      void this.logo.offsetWidth;
      this.logo.classList.add('on');
    }
  }

  private renderTitle(): void {
    // Any game saved: CONTINUE opens the files. None: START begins a new game in File 1.
    const any = this.host.files().some((f) => !f.empty);
    this.items = any
      ? [
          { label: 'CONTINUE', run: () => this.showFiles() },
          { label: 'OPTIONS', run: () => this.host.onOptions() },
        ]
      : [
          { label: 'START', run: () => this.startWith(() => this.host.playFile(1)) },
          { label: 'OPTIONS', run: () => this.host.onOptions() },
        ];
    this.sel = Math.min(this.sel, this.items.length - 1);
    this.opts.innerHTML = this.items.map((it, i) => `<div class="opt${i === this.sel ? ' sel' : ''}" data-i="${i}">${it.label}</div>`).join('');
    (this.title.querySelector('.hint') as HTMLDivElement).innerHTML = this.host.help?.('title') ?? '';
  }

  private renderFiles(): void {
    const cards = this.host.files();
    const html = cards
      .map((f, i) => {
        const cls = `card${i === this.fileSel ? (this.fileMode === 'copy' || this.fileMode === 'sureCopy' ? ' target' : ' sel') : ''}${(this.fileMode === 'copy' || this.fileMode === 'sureCopy') && i === this.copyFrom ? ' from' : ''}`;
        const body = f.empty
          ? '<div class="new">NEW GAME</div><div class="blurb">An empty file</div>'
          : `<div class="where">${f.where}</div><div class="wedges">${wedgeIcon(20)} ${f.wedges} / ${f.total}</div><div class="played">${f.played} played</div><div class="saved">${f.saved}</div>`;
        return `<div class="${cls}" data-i="${i}"><div class="num">FILE ${f.file}</div>${body}</div>`;
      })
      .join('');
    const help = this.host.help?.(this.fileMode === 'pick' ? 'files' : this.fileMode === 'copy' ? 'pickCopy' : this.fileMode) ?? '';
    this.filesEl.innerHTML = `<div class="head">SAVE FILES</div><div class="cards">${html}</div><div class="msg">${this.fileMsg}</div><div class="help">${help}</div>`;
  }

  private fileCmd(c: BootCmd): void {
    const cards = this.host.files();
    const f = cards[this.fileSel];
    const n = cards.length;
    if (c === 'left' || c === 'right' || c === 'up' || c === 'down') {
      this.fileSel = (this.fileSel + (c === 'left' || c === 'up' ? -1 : 1) + n) % n;
      if (this.fileMode === 'sureErase') this.fileMode = 'pick';
      if (this.fileMode === 'sureCopy') this.fileMode = 'copy';
      this.fileMsg = this.fileMode === 'copy' ? `Copy File ${this.copyFrom + 1} to which file?` : '';
      this.host.sound?.('move');
    } else if (c === 'back') {
      this.host.sound?.('back');
      if (this.fileMode === 'pick') return this.setStage('title');
      this.fileMode = 'pick';
      this.fileMsg = '';
    } else if (c === 'ok' && this.fileMode === 'sureErase') {
      // Only the erase button erases; anything else lets it be.
      this.fileMode = 'pick';
      this.fileMsg = '';
      this.host.sound?.('back');
    } else if (c === 'ok') {
      if (this.fileMode === 'pick') {
        this.host.sound?.('ok');
        const file = f.file;
        return this.startWith(() => this.host.playFile(file));
      }
      // Copying: this is where it goes.
      if (this.fileSel === this.copyFrom) {
        this.fileMsg = 'Choose a different file to copy to.';
      } else if (!f.empty && this.fileMode === 'copy') {
        this.fileMode = 'sureCopy';
        this.fileMsg = `File ${f.file} has a game. Copy over it? Press again.`;
      } else {
        this.host.copyFile(this.copyFrom + 1, f.file);
        this.host.sound?.('ok');
        this.fileMode = 'pick';
        this.fileMsg = `File ${this.copyFrom + 1} copied to File ${f.file}.`;
      }
    } else if (c === 'copy') {
      if (this.fileMode !== 'pick' && this.fileMode !== 'sureErase') return;
      if (f.empty) this.fileMsg = 'That file is empty. Nothing to copy.';
      else {
        this.fileMode = 'copy';
        this.copyFrom = this.fileSel;
        this.fileSel = (this.fileSel + 1) % n;
        this.fileMsg = `Copy File ${f.file} to which file?`;
        this.host.sound?.('ok');
      }
    } else if (c === 'erase') {
      if (this.fileMode === 'copy' || this.fileMode === 'sureCopy') return;
      if (f.empty) this.fileMsg = 'That file is already empty.';
      else if (this.fileMode !== 'sureErase') {
        this.fileMode = 'sureErase';
        this.fileMsg = `Erase File ${f.file}? It cannot be undone. Press erase again.`;
        this.host.sound?.('back');
      } else {
        this.host.eraseFile(f.file);
        this.fileMode = 'pick';
        this.fileMsg = `File ${f.file} erased.`;
        this.host.sound?.('ok');
      }
    }
    this.renderFiles();
  }

  private startWith(go: () => void): void {
    this.loading(() => {
      go();
      this.stage = 'off';
      this.root.classList.remove('on');
      this.sync();
    });
  }

  private skipLogo(): void {
    if (this.stage === 'logo') this.setStage('title');
  }

  /** A command from the keyboard, a pad or a screen button. */
  cmd(c: BootCmd): void {
    if (this.stage === 'logo') {
      if (c === 'ok' || c === 'back') this.skipLogo();
      return;
    }
    if (this.stage === 'files' && this.root.classList.contains('on')) return this.fileCmd(c);
    if (this.stage !== 'title' || !this.root.classList.contains('on')) return;
    if (c === 'up' || c === 'down') {
      this.sel = (this.sel + (c === 'up' ? -1 : 1) + this.items.length) % this.items.length;
      this.host.sound?.('move');
      this.renderTitle();
    } else if (c === 'ok') {
      this.host.sound?.('ok');
      this.items[this.sel].run();
    }
  }

  update(dt: number): void {
    if (this.stage === 'off') return;
    this.t += dt;
    if (this.stage === 'logo' && this.t >= LOGO_TIME) this.setStage('title');
    else if (this.stage === 'loading') {
      this.drawStars(dt);
      if (this.t >= this.loadFor && this.loadDone) {
        const f = this.loadDone;
        this.loadDone = null;
        f();
      }
    }
  }

  private drawStars(dt: number): void {
    const cv = this.canvas;
    const w = cv.clientWidth || 640;
    const h = cv.clientHeight || 360;
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    const g = cv.getContext('2d');
    if (!g) return;
    g.fillStyle = '#04030c';
    g.fillRect(0, 0, w, h);
    const px = Math.max(2, Math.round(h / 120));
    for (const s of this.stars) {
      s.x -= dt * 0.06 * s.z;
      s.y += dt * 0.02 * s.z;
      if (s.x < 0) s.x += 1;
      if (s.y > 1) s.y -= 1;
      g.fillStyle = s.c;
      g.globalAlpha = 0.4 + 0.6 * s.z;
      const size = s.z > 0.7 ? px * 2 : px;
      g.fillRect(Math.floor(s.x * w), Math.floor(s.y * h), size, size);
    }
    g.globalAlpha = 1;
  }
}
