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
  /** TEST HALL: the test area, in its own file (left out, the entry is not shown). */
  onHall?(): void;
  /** What NEW GAME's card says under 'A new adventure'. */
  newGameSays?: string;
  /** OPTIONS: the main menu takes over. */
  onOptions(): void;
  /** LEVEL EDITOR and WORKSHOP: the title steps aside for them (left out, the entries are not shown). */
  onEditor?(): void;
  onWorkshop?(): void;
  /** A short line for the corner of the title (a version or a date). */
  version?: string;
  /** The controls line for a screen, as button chips. */
  help?(screen: 'title' | 'files' | 'pickCopy' | 'sureCopy' | 'sureErase'): string;
  sound?(name: 'move' | 'ok' | 'back' | 'chime'): void;
}

export const LOGO_TIME = 4.4;
const LOAD_MIN = 1.4;

const CSS = `
.rq-boot { position: absolute; inset: 0; z-index: 50; display: none; container-type: size; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: manipulation;
  font-family: var(--rq-font-title); }
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
.rq-logo .name { position: absolute; left: 0; right: 0; top: 72%; text-align: center; font: italic 700 min(8.2cqh, 6.6cqw) var(--rq-font-logo); letter-spacing: 0.22em; color: #2b2f55; opacity: 0; animation: rq-fade 0.8s 1.1s ease-out forwards; }
.rq-logo .name i { font-size: 2.4cqh; vertical-align: top; letter-spacing: 0; font-style: normal; }
.rq-logo .sub { position: absolute; left: 0; right: 0; top: 84%; text-align: center; font: 600 min(3.4cqh, 3.6cqw) var(--rq-font-label); letter-spacing: 0.4em; color: #6a6f96; opacity: 0; animation: rq-fade 0.8s 1.4s ease-out forwards; }
.rq-logo .black { position: absolute; inset: 0; background: #000; opacity: 0; animation: rq-black 0.6s ${LOGO_TIME - 0.6}s linear forwards; }
@keyframes rq-logo-in { from { opacity: 0; transform: translate(-50%, -50%) scale(0.86); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
@keyframes rq-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rq-black { from { opacity: 0; } to { opacity: 1; } }
@keyframes rq-sheen { from { transform: translateX(-70px) skewX(-20deg); } to { transform: translateX(140px) skewX(-20deg); } }
@keyframes rq-logo-out { 0%, 100% { opacity: 1; } }

/* ---- Title ---- */
/* The live room is behind it. A dark fall-off on the menu's side keeps the words readable; the rest is left clear. */
.rq-title { background: linear-gradient(90deg, #05070bee 0%, #05070bcc 26%, #05070b55 48%, #0000 66%), radial-gradient(ellipse at 62% 50%, #0000 38%, #000a 100%), linear-gradient(#0008, #0000 22%, #0000 70%, #000b); }
.rq-title .col { position: absolute; left: 5.5%; top: 0; bottom: 0; width: 46%; display: flex; flex-direction: column; justify-content: center; gap: 0; padding-bottom: 6cqh; box-sizing: border-box; }
.rq-title .logo { font-size: min(17cqh, 9.4cqw); line-height: 1; letter-spacing: 0.02em; white-space: nowrap;
  filter: drop-shadow(0 0.012em 0 #3a1000) drop-shadow(0 0.03em 0 #3a1000) drop-shadow(0 0.055em 0 #1a0600) drop-shadow(0 0.1em 0.04em #000c) drop-shadow(0.018em 0 0 #1a0600) drop-shadow(-0.018em 0 0 #1a0600) drop-shadow(0 -0.018em 0 #1a0600); }
.rq-title .logo span { display: inline-block; background: linear-gradient(#fff6b0 0%, #ffc233 42%, #ee6a12 62%, #b8340a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; animation: rq-wob 0.9s steps(1) infinite; }
.rq-title .logo span:nth-child(2n) { animation-delay: -0.3s; }
.rq-title .logo span:nth-child(3n) { animation-delay: -0.6s; }
.rq-title .tag { margin-top: 0.6cqh; font-size: min(3.5cqh, 2cqw); letter-spacing: 0.46em; color: #e7e0bd; text-shadow: 0 0.08em 0 #000, 0 0 0.4em #000; white-space: nowrap; }
.rq-title .rule { height: 0.45cqh; width: min(54cqh, 30cqw); margin: 2.4cqh 0 2.2cqh; background: linear-gradient(90deg, #ffd24a, #ee6a12 55%, #ee6a1200); border-radius: 1cqh; }
.rq-title .opts { display: flex; flex-direction: column; gap: 0.7cqh; align-items: flex-start; }
.rq-title .opt { position: relative; display: flex; align-items: center; gap: 1.6cqh; min-width: min(46cqh, 26cqw); padding: 1cqh 3.4cqh 1cqh 2cqh; border-radius: 1.2cqh; border: 0.3cqh solid #0000;
  font-size: min(5.4cqh, 3.3cqw); line-height: 1; letter-spacing: 0.1em; color: #a9a48c; text-shadow: 0 0.07em 0 #000; cursor: pointer; white-space: nowrap; transition: transform 0.12s, background 0.12s; }
.rq-title .opt svg { width: 0.95em; height: 0.95em; flex: none; opacity: 0.75; }
.rq-title .opt.sel { color: #fff2a8; text-shadow: 0 0.07em 0 #5a2200, 0 0 0.5em #ffb02a88; background: linear-gradient(90deg, #4a2c0ee0, #2a1808c8 70%, #2a180800); border-color: #ffd24a; border-right-color: #0000; transform: translateX(1.6cqh); }
.rq-title .opt.sel svg { opacity: 1; }
.rq-title .opt.sel::before { content: ''; position: absolute; left: -2.6cqh; top: 50%; margin-top: -1.1cqh; border: 1.1cqh solid #0000; border-left: 1.7cqh solid #ffd24a; animation: rq-nudge 0.7s steps(2) infinite; }
.rq-title .opt.off { color: #5f5c50; }
.rq-title .card { position: absolute; right: 4.5%; bottom: 15%; width: min(60cqh, 36cqw); box-sizing: border-box; padding: 2.2cqh 2.6cqh; border-radius: 1.8cqh; background: linear-gradient(#141a22e8, #0b0f15e8); border: 0.3cqh solid #56627a;
  box-shadow: 0 1cqh 3cqh #000a; font: 600 max(12px, 2.5cqh) var(--rq-font-label); letter-spacing: 0.01em; color: #cfd6e2; line-height: 1.35; }
.rq-title .card .k { font: min(3.4cqh, 2.2cqw) var(--rq-font-title); letter-spacing: 0.16em; color: #ffd24a; margin-bottom: 0.8cqh; }
.rq-title .card .where { font-weight: 800; font-size: 1.25em; color: #fff6d8; }
.rq-title .card .wedges { display: flex; align-items: center; gap: 0.4em; font-weight: 800; font-size: 1.2em; color: #ffd24a; margin: 0.5cqh 0; }
.rq-title .card .wedges svg { width: 1.2em; height: 1.2em; }
.rq-title .card .sub { color: #98a2b4; font-size: 0.9em; }
.rq-title .card .line { display: flex; justify-content: space-between; gap: 1em; padding: 0.35cqh 0; border-bottom: 1px solid #ffffff14; }
.rq-title .card .line:last-child { border-bottom: 0; }
.rq-title .card .line b { color: #fff6d8; } .rq-title .card .line i { font-style: normal; color: #ffd24a; white-space: nowrap; }
.rq-title .card .line.none b { color: #7d8698; font-weight: 600; }
.rq-title .hint { position: absolute; left: 5.5%; bottom: 5%; font: 700 min(3.2cqh, 2.6cqw) var(--rq-font-label); letter-spacing: 0.08em; color: #d9d3b0; text-shadow: 0 0.1em 0 #000; white-space: nowrap; }
.rq-title .copy { position: absolute; right: 2.5%; bottom: 2.5%; font: 600 min(2.3cqh, 1.9cqw) var(--rq-font-label); letter-spacing: 0.12em; color: #9a9477; text-shadow: 0 0.1em 0 #000; }
.rq-title .hint .rqg-pair, .rq-files .help .rqg-pair { margin: 0 1.6em 0 0; }
.rq-files .help .rqg-pair { margin: 0 0.8em; }
@keyframes rq-nudge { 0% { transform: translateX(0); } 50% { transform: translateX(0.5cqh); } }
/* A tall or square window (the game inside the on-screen pad): one centred column, the card as a strip under it. */
@container (max-aspect-ratio: 5 / 4) {
  .rq-title { background: radial-gradient(ellipse at 50% 50%, #05070bb0 20%, #05070be8 100%); }
  .rq-title .col { left: 0; width: 100%; align-items: center; justify-content: flex-start; padding: 7cqh 0 0; }
  .rq-title .logo { font-size: min(15cqh, 16.5cqw); }
  .rq-title .tag { font-size: min(3.2cqh, 3.6cqw); padding-left: 0.46em; }
  .rq-title .rule { background: linear-gradient(90deg, #ee6a1200, #ffd24a 30%, #ffd24a 70%, #ee6a1200); width: 62cqw; margin: 2cqh 0 1.6cqh; }
  .rq-title .opts { align-items: stretch; width: min(78cqw, 62cqh); }
  .rq-title .opt { font-size: min(4.6cqh, 6cqw); padding: 0.9cqh 2cqh; min-width: 0; }
  .rq-title .opt.sel { transform: none; border-right-color: #ffd24a; background: linear-gradient(#4a2c0ee0, #2a1808e0); }
  .rq-title .opt.sel::before { display: none; }
  .rq-title .card { position: absolute; left: 50%; right: auto; bottom: 11.5%; transform: translateX(-50%); width: min(88cqw, 70cqh); padding: 1.2cqh 2cqh; font-size: max(11px, 2.1cqh); }
  .rq-title .card .k { margin-bottom: 0.3cqh; font-size: min(2.8cqh, 3.6cqw); }
  .rq-title .hint { left: 0; right: 0; text-align: center; bottom: 5.5%; font-size: min(2.8cqh, 3.4cqw); }
  .rq-title .hint .rqg-pair { margin: 0 0.8em; }
  .rq-title .copy { left: 0; right: 0; text-align: center; bottom: 1.6%; font-size: min(2cqh, 2.6cqw); }
}

/* ---- Save files ---- */
.rq-files { background: radial-gradient(ellipse at 50% 50%, #0008 20%, #000d 100%), linear-gradient(#000c, #0006 40%, #000c); font-family: var(--rq-font-label); color: #e9e2c4; }
.rq-files .head { position: absolute; left: 0; right: 0; top: 6%; text-align: center; font: min(9cqh, 7cqw) var(--rq-font-title); letter-spacing: 0.14em; color: #ffd24a;
  text-shadow: 0 0.06em 0 #5a2200, 0 0 0.4em #000; }
.rq-files .cards { position: absolute; left: 4%; right: 4%; top: 22%; height: 52%; display: flex; gap: 2.4%; justify-content: center; }
.rq-files .card { flex: 0 1 30%; max-width: 46cqh; box-sizing: border-box; padding: 3cqh 2.2cqh; border-radius: 2.2cqh; background: linear-gradient(#2a3324ee, #161c13ee); border: 0.45cqh solid #4b5a40;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.4cqh; text-align: center; cursor: pointer; transition: transform 0.12s; }
.rq-files .card .num { margin-bottom: auto; }
.rq-files .card > :last-child { margin-bottom: auto; }
.rq-files .card.sel { border-color: #ffe27a; box-shadow: 0 0 3cqh #ffd24a66, inset 0 0 2cqh #ffd24a22; transform: translateY(-1.2cqh); }
.rq-files .card.target { border-color: #7fd4ff; box-shadow: 0 0 3cqh #7fd4ff66; }
.rq-files .card.from { border-style: dashed; }
.rq-files .num { font: min(6cqh, 4.4cqw) var(--rq-font-title); letter-spacing: 0.12em; color: #ffe9a0; }
.rq-files .where { font-weight: 800; font-size: max(14px, 3.2cqh); color: #fff6d8; min-height: 2.4em; display: flex; align-items: center; }
.rq-files .wedges { display: flex; align-items: center; gap: 0.4em; font-weight: 800; font-size: max(15px, 3.8cqh); color: #ffd24a; }
.rq-files .wedges svg { width: 1.2em; height: 1.2em; }
.rq-files .played, .rq-files .saved { font-size: max(13px, 2.6cqh); color: #cfc8a8; }
.rq-files .new { margin-top: auto; margin-bottom: auto; font: min(6cqh, 4.4cqw) var(--rq-font-title); letter-spacing: 0.1em; color: #9fe08a; }
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

type TitleItem = 'continue' | 'new' | 'load' | 'hall' | 'editor' | 'workshop' | 'options';
/** The small picture beside each entry of the title's menu. */
const TITLE_ICONS: Record<TitleItem, string> = {
  continue: '<path d="M6 4 L20 12 L6 20 Z" fill="currentColor"/>',
  new: '<path d="M12 2 L14.6 9 L22 9.4 L16.2 14 L18.2 21.4 L12 17.2 L5.8 21.4 L7.8 14 L2 9.4 L9.4 9 Z" fill="currentColor"/>',
  load: '<path d="M2 6 H9 L11 8.5 H22 V20 H2 Z" fill="currentColor"/>',
  hall: '<path d="M3 21 V9 L12 3 L21 9 V21 H15 V13 H9 V21 Z" fill="currentColor"/>',
  editor: '<path d="M2 14 H10 V22 H2 Z M12 14 H22 V22 H12 Z M7 4 H17 V12 H7 Z" fill="currentColor"/>',
  workshop: '<path d="M21 6.5 a5 5 0 0 1 -6.6 4.7 L6 19.6 a2 2 0 0 1 -2.8 -2.8 L11.6 8.4 A5 5 0 0 1 17.5 2 L14.6 5 L15.6 8.4 L19 9.4 Z" fill="currentColor"/>',
  options: '<path d="M10 2 H14 L14.6 5 L17.2 6.4 L20 5.2 L22 8.6 L19.8 10.6 V13.4 L22 15.4 L20 18.8 L17.2 17.6 L14.6 19 L14 22 H10 L9.4 19 L6.8 17.6 L4 18.8 L2 15.4 L4.2 13.4 V10.6 L2 8.6 L4 5.2 L6.8 6.4 L9.4 5 Z M12 8.6 A3.4 3.4 0 1 0 12 15.4 A3.4 3.4 0 1 0 12 8.6 Z" fill="currentColor" fill-rule="evenodd"/>',
};

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
  private items: { id: TitleItem; label: string; off?: boolean; run: () => void }[] = [];
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
    this.title.innerHTML = `<div class="col"><div class="logo">${letters('RATQUEST')}</div><div class="tag">THE KINGDOM BELOW</div><div class="rule"></div><div class="opts"></div></div><div class="card"></div><div class="hint"></div><div class="copy">© KINGDOM BELOW INTERACTIVE${host.version ? ` · ${host.version}` : ''}</div>`;
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

  /** The start-up screens are over (something else has put him in the game). */
  leave(): void {
    this.stage = 'off';
    this.root.classList.remove('on');
    this.sync();
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
    const cards = this.host.files();
    const used = cards.filter((f) => !f.empty);
    // CONTINUE goes straight back into the file played last (or, if that one is empty, the first that has a game).
    const last = cards.find((f) => f.file === this.host.currentFile() && !f.empty) ?? used[0];
    const empty = cards.find((f) => f.empty);
    const items: typeof this.items = [];
    if (last) items.push({ id: 'continue', label: 'CONTINUE', run: () => this.startWith(() => this.host.playFile(last.file)) });
    items.push({
      id: 'new', label: 'NEW GAME', off: !empty,
      run: () => {
        if (empty) return this.startWith(() => this.host.playFile(empty.file));
        // Every file is in use: the file screen is where one is erased.
        this.showFiles();
        this.fileMsg = 'Every file has a game in it. Erase one to start a new game there.';
        this.renderFiles();
      },
    });
    if (used.length) items.push({ id: 'load', label: 'LOAD GAME', run: () => this.showFiles() });
    if (this.host.onHall) items.push({ id: 'hall', label: 'TEST HALL', run: () => this.startWith(() => this.host.onHall?.()) });
    if (this.host.onEditor) items.push({ id: 'editor', label: 'LEVEL EDITOR', run: () => this.host.onEditor?.() });
    if (this.host.onWorkshop) items.push({ id: 'workshop', label: 'WORKSHOP', run: () => this.host.onWorkshop?.() });
    items.push({ id: 'options', label: 'OPTIONS', run: () => this.host.onOptions() });
    this.items = items;
    this.sel = Math.min(this.sel, this.items.length - 1);
    this.opts.innerHTML = this.items
      .map((it, i) => `<div class="opt${i === this.sel ? ' sel' : ''}${it.off ? ' off' : ''}" data-i="${i}"><svg viewBox="0 0 24 24">${TITLE_ICONS[it.id]}</svg>${it.label}</div>`)
      .join('');
    // Beside the menu: what the chosen entry will do.
    const file = (f: FileCard): string => `<div class="where">${f.where}</div><div class="wedges">${wedgeIcon(20)} ${f.wedges} / ${f.total}</div><div class="sub">${f.played} played${f.saved ? ` · saved ${f.saved}` : ''}</div>`;
    const id = this.items[this.sel].id;
    let card = '';
    if (id === 'continue' && last) card = `<div class="k">FILE ${last.file}</div>${file(last)}`;
    else if (id === 'new') card = empty ? `<div class="k">FILE ${empty.file}</div><div class="where">A new adventure</div><div class="sub">${this.host.newGameSays || 'Starts in an empty file. Your other files are not touched.'}</div>` : '<div class="k">NO EMPTY FILE</div><div class="sub">Every file has a game in it. Choose this to pick one to erase.</div>';
    else if (id === 'load') card = `<div class="k">SAVE FILES</div>${cards.map((f) => (f.empty ? `<div class="line none"><b>File ${f.file} · empty</b></div>` : `<div class="line"><b>File ${f.file} · ${f.where}</b><i>${f.wedges} / ${f.total}</i></div>`)).join('')}<div class="sub" style="margin-top:0.6cqh">Play, copy or erase a file.</div>`;
    else if (id === 'hall') card = '<div class="k">TEST HALL</div><div class="sub">Not the game: the long hallway with a door to every test room, boss room and practice room, and everyone standing about in it. It keeps its own file.</div>';
    else if (id === 'editor') card = '<div class="k">LEVEL EDITOR</div><div class="sub">Build your own levels on a map, watch them in the game as you draw, and play them. Sample levels are included to learn from.</div>';
    else if (id === 'workshop') card = '<div class="k">WORKSHOP</div><div class="sub">The tools the game is made with: sliders for how it feels, a sound test, a way to any place, and test switches.</div>';
    else card = '<div class="k">OPTIONS</div><div class="sub">Sound and music, the buttons, the picture.</div>';
    (this.title.querySelector('.card') as HTMLDivElement).innerHTML = card;
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
