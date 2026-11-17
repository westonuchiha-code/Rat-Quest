/**
 * TEST HARNESS ONLY. An on-screen PlayStation-style controller so the game can be played on a phone.
 * The real game never loads this: it is only installed in the phone-test build (VITE_TOUCHPAD=1).
 * It sits beside or below the game picture and never covers it. It only writes to `padControls`.
 *
 *   Left stick  move            Right stick  camera
 *   X  jump      O  dodge       []  attack      /\  stow or draw weapons
 *   L1 guard     L2 sneak         R1  attack      START  menu
 * In the menu: L1/R1 change screens, the left stick moves, X selects, O goes back.
 */
import { padControls as pad, Action } from '../core/controls';

const CSS = `
body.has-pad { display: flex; flex-direction: column; background: #16171a; }

#dock { display: flex; flex: none; }
.half {
  position: relative; container-type: size; flex: 1 1 0; aspect-ratio: 3 / 5;
  background: linear-gradient(#2b2d33, #1b1c20); color: #cfd2d8; font: 700 4.4cqw var(--rq-font-game);
  touch-action: none; user-select: none; -webkit-user-select: none;
}
.half.left { border-top-left-radius: 8cqw; border-right: 1px solid #0c0c0e; }
.half.right { border-top-right-radius: 8cqw; }
.half { --cy: 39cqw; --fd: 20cqw; --fs: 22cqw; }
.half * { box-sizing: border-box; }
.pb {
  position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(#4a4d55, #34363c); border: 0.5cqw solid #0e0e10; color: #e4e6ea;
  line-height: 1.1; text-align: center;
}
.pb small { font-size: 3.2cqw; font-weight: 400; opacity: 0.75; }
.pb.down { background: linear-gradient(#7d818c, #5c606a); }
.shoulder { height: 15cqw; border-radius: 3cqw 3cqw 7cqw 7cqw; top: 3cqw; width: 40cqw; }
.face { width: var(--fs); height: var(--fs); border-radius: 50%; font-size: 10cqw; }
.face small { font-size: 2.8cqw; }
.start { width: 34cqw; height: 9cqw; border-radius: 5cqw; font-size: 3.6cqw; }
.stick {
  position: absolute; width: 66cqw; height: 66cqw; border-radius: 50%;
  background: radial-gradient(#0d0e10 55%, #25272c 100%); border: 0.6cqw solid #08080a;
}
.stick .cap {
  position: absolute; left: 50%; top: 50%; width: 42cqw; height: 42cqw; margin: -21cqw 0 0 -21cqw; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #6b6f79, #3a3c43 70%); border: 0.5cqw solid #0e0e10;
}
@media (orientation: landscape) {
  /* Wide and tall: use all the room so every button is big and easy to hit. */
  .half { --cy: 65cqw; --fd: 23cqw; --fs: 26cqw; }
  .shoulder { height: 21cqw; top: 6cqw; width: 44cqw; font-size: 8cqw; border-radius: 4cqw 4cqw 9cqw 9cqw; }
  .shoulder small { font-size: 3.6cqw; }
  .face { font-size: 12cqw; }
  .face small { font-size: 3.4cqw; }
  .start { width: 48cqw; height: 15cqw; font-size: 5cqw; top: 36cqw !important; left: 26cqw !important; }
  .start small { font-size: 3.6cqw; }
  .stick { bottom: 7cqw !important; }
  .shoulder.r2 { left: 4cqw !important; }
  .shoulder.r1 { left: 52cqw !important; }
  .shoulder.l2 { left: 4cqw !important; }
  .shoulder.l1 { left: 52cqw !important; }
  body.has-pad { flex-direction: row; }
  #dock { display: contents; }
  .half { flex: none; height: 100vh; width: 25vw; aspect-ratio: auto; border-radius: 0 !important; }
  .half.left { order: 0; }
  body.has-pad #frame { order: 1; }
  .half.right { order: 2; }
}
`;

function div(cls: string, parent: HTMLElement, style = ''): HTMLDivElement {
  const d = document.createElement('div');
  d.className = cls;
  if (style) d.style.cssText = style;
  parent.appendChild(d);
  return d;
}

/** A pad button. `held` reports press and release; `tap` fires once on press. */
function button(parent: HTMLElement, cls: string, style: string, html: string, handlers: { down?: () => void; up?: () => void }): void {
  const node = div(`pb ${cls}`, parent, style);
  node.innerHTML = html;
  let id: number | null = null;
  node.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    id = e.pointerId;
    node.setPointerCapture(e.pointerId);
    node.classList.add('down');
    handlers.down?.();
  });
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    node.classList.remove('down');
    handlers.up?.();
  };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
}

/** An analog stick. Reports x right and y up, each -1..1, and 0,0 on release. */
function stick(parent: HTMLElement, style: string, report: (x: number, y: number) => void): void {
  const base = div('stick', parent, style);
  const cap = div('cap', base);
  let id: number | null = null;
  const update = (e: PointerEvent): void => {
    const r = base.getBoundingClientRect();
    const radius = r.width / 2;
    let dx = e.clientX - (r.left + radius);
    let dy = e.clientY - (r.top + radius);
    const len = Math.hypot(dx, dy);
    const max = radius * 0.6;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    cap.style.transform = `translate(${dx}px, ${dy}px)`;
    report(dx / max, -dy / max);
  };
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    id = e.pointerId;
    base.setPointerCapture(e.pointerId);
    update(e);
  });
  base.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) update(e);
  });
  const end = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    cap.style.transform = '';
    report(0, 0);
  };
  base.addEventListener('pointerup', end);
  base.addEventListener('pointercancel', end);
}

const tap = (a: Action) => ({ down: () => pad.press(a) });

export function installTouchPad(): void {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.classList.add('has-pad');

  const dock = document.createElement('div');
  dock.id = 'dock';
  document.body.appendChild(dock);
  const left = div('half left', dock);
  const right = div('half right', dock);

  // Left half: shoulders, start, left stick.
  button(left, 'shoulder l2', 'left: 6cqw', 'L2<small>SNEAK</small>', { down: () => (pad.runHeld = true), up: () => (pad.runHeld = false) });
  button(left, 'shoulder l1', 'left: 54cqw', 'L1<small>GUARD</small>', {
    down: () => {
      pad.guardHeld = true;
      pad.press('tabPrev');
    },
    up: () => (pad.guardHeld = false),
  });
  button(left, 'start', 'left: 33cqw; top: 26cqw', 'START<small>menu</small>', tap('menu'));
  stick(left, 'left: 17cqw; bottom: 12cqw', (x, y) => {
    pad.moveX = x;
    pad.moveY = y;
  });

  // Right half: shoulder, face diamond, right stick.
  button(right, 'shoulder r2', 'left: 6cqw', 'R2<small>LOCK</small>', tap('lock'));
  button(right, 'shoulder r1', 'left: 54cqw', 'R1<small>ATTACK</small>', {
    down: () => {
      pad.press('attack');
      pad.press('tabNext');
    },
  });
  // The diamond is centred horizontally; its size and height come from the CSS variables (bigger in landscape).
  const at = (dx: number, dy: number): string =>
    `left: calc(50cqw - var(--fs) / 2 + ${dx} * var(--fd)); top: calc(var(--cy) - var(--fs) / 2 + ${dy} * var(--fd))`;
  button(right, 'face', at(0, -1), '<span style="color:#6fd3a0">&#9651;</span><small>STOW</small>', tap('stow'));
  button(right, 'face', at(1, 0), '<span style="color:#e0605a">&#9675;</span><small>DODGE</small>', {
    down: () => {
      pad.press('dodge');
      pad.press('back');
    },
  });
  button(right, 'face', at(0, 1), '<span style="color:#6a9be8">&#10005;</span><small>JUMP</small>', {
    down: () => {
      pad.jumpHeld = true;
      pad.press('jump');
      pad.press('confirm');
    },
    up: () => (pad.jumpHeld = false),
  });
  button(right, 'face', at(-1, 0), '<span style="color:#e08ac0">&#9633;</span><small>ATTACK</small>', tap('attack'));
  stick(right, 'left: 17cqw; bottom: 12cqw', (x, y) => {
    pad.lookX = x;
    pad.lookY = y;
  });
}
