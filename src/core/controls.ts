/**
 * Game controls that are not the keyboard: anything that acts like a PlayStation-style pad.
 * A source (the on-screen test pad, or a real gamepad) fills in a ControlState; the game merges all sources.
 * Nothing in here knows about the screen or about touch, so the real game can run with just a keyboard and a gamepad.
 */

import { bindings, BIND_ACTIONS, BindAction } from './bindings';

export type Action =
  | 'jump' | 'attack' | 'dodge' | 'stow' | 'respawn' | 'lock'
  // Menu: the pause menu opens with `menu`, and these move around in it.
  | 'menu' | 'left' | 'right' | 'up' | 'down' | 'tabPrev' | 'tabNext' | 'confirm' | 'back';

export interface ControlState {
  /** Left stick: x is right, y is forward, each -1..1. */
  moveX: number;
  moveY: number;
  /** Right stick: x turns the camera right, y tilts it up, each -1..1. */
  lookX: number;
  lookY: number;
  runHeld: boolean;
  guardHeld: boolean;
  jumpHeld: boolean;
  /** Latches a press until the game takes it. */
  press(action: Action): void;
  /** Returns true once per press. */
  consume(action: Action): boolean;
}

export function createControlState(): ControlState {
  const latched = new Set<Action>();
  return {
    moveX: 0,
    moveY: 0,
    lookX: 0,
    lookY: 0,
    runHeld: false,
    guardHeld: false,
    jumpHeld: false,
    press(action) {
      latched.add(action);
    },
    consume(action) {
      return latched.delete(action);
    },
  };
}

/** Set by the on-screen test pad. */
export const padControls = createControlState();
/** Set by a real gamepad: Xbox, PlayStation, Switch and most generic pads, picked up automatically. */
export const gamepadControls = createControlState();

/** Every source the game listens to. */
export const controlSources = [padControls, gamepadControls];

const DEADZONE = 0.2;
const TRIGGER_ON = 0.6;

export type PadKind = 'xbox' | 'playstation' | 'nintendo' | 'deck' | 'generic';

/**
 * What kind of pad to name buttons for, when the machine knows better than the pad's name (Steam Input shows every pad
 * as an Xbox pad; Steam itself can say it is really a DualSense or the Deck). Null: go by the pad's name.
 */
let labelKindOverride: PadKind | null = null;
export function setPadKindOverride(k: PadKind | null): void {
  labelKindOverride = k;
  if (gamepadInfo.connected && k) gamepadInfo.kind = k;
}

/** What the game knows about the pad in use. Updated every poll. Use it to show the right button names later. */
export const gamepadInfo: { connected: boolean; kind: PadKind | null; name: string; lastAt: number; lastButton: PadButton | null } = { connected: false, kind: null, name: '', lastAt: 0, lastButton: null };

/** Logical buttons, named by position so every pad type lines up (south is the bottom face button). */
export type PadButton =
  | 'south' | 'east' | 'west' | 'north' | 'l1' | 'r1' | 'l2' | 'r2'
  | 'select' | 'start' | 'l3' | 'r3' | 'up' | 'down' | 'left' | 'right';

export interface PadSnapshot {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  down: Record<PadButton, boolean>;
}

/** The parts of a browser Gamepad this file reads. Tests pass plain objects. */
export interface PadLike {
  id: string;
  mapping?: string;
  connected?: boolean;
  axes: ArrayLike<number>;
  buttons: ArrayLike<{ pressed: boolean; value?: number }>;
}

export function padKind(id: string): PadKind {
  const s = id.toLowerCase();
  // Valve's own: the Steam Deck's built-in controls (28de:1205). Steam's virtual pad (28de:11ff) stands in for any pad,
  // so it is read as an Xbox pad; the desktop build asks Steam what is really in his hands (see labelKindOverride).
  if (/28de.*1205|steam ?deck/.test(s)) return 'deck';
  if (/054c|playstation|dualshock|dualsense|sony|ps[345]/.test(s)) return 'playstation';
  if (/057e|nintendo|switch|joy-?con|pro controller/.test(s)) return 'nintendo';
  if (/045e|xbox|x-?box|xinput|microsoft/.test(s)) return 'xbox';
  return 'generic';
}

interface Layout {
  buttons: Partial<Record<PadButton, number>>;
  /** Triggers that arrive as axes rather than buttons (rest at -1). */
  triggerAxes?: { l2: number; r2: number };
  left: [number, number];
  right: [number, number];
  /** An axis that encodes the d-pad as a hat switch, and a pair of axes that do. */
  hatAxis?: number;
  dpadAxes?: [number, number];
}

const STANDARD: Layout = {
  buttons: { south: 0, east: 1, west: 2, north: 3, l1: 4, r1: 5, l2: 6, r2: 7, select: 8, start: 9, l3: 10, r3: 11, up: 12, down: 13, left: 14, right: 15 },
  left: [0, 1],
  right: [2, 3],
};

/** Layouts for pads the browser does not map for us. Positions, not labels, so a Switch pad's A is still "east". */
function layoutFor(gp: PadLike, kind: PadKind): Layout {
  if (gp.mapping === 'standard') return STANDARD;
  const n = gp.axes.length;
  if (kind === 'playstation') {
    return {
      buttons: { west: 0, south: 1, east: 2, north: 3, l1: 4, r1: 5, l2: 6, r2: 7, select: 8, start: 9, l3: 10, r3: 11 },
      left: [0, 1],
      right: [2, 5],
      hatAxis: n > 9 ? 9 : undefined,
    };
  }
  if (kind === 'xbox' || kind === 'deck') {
    return {
      buttons: { south: 0, east: 1, west: 2, north: 3, l1: 4, r1: 5, select: 6, start: 7, l3: 9, r3: 10 },
      triggerAxes: { l2: 2, r2: 5 },
      left: [0, 1],
      right: [3, 4],
      dpadAxes: [6, 7],
    };
  }
  return {
    buttons: { south: 0, east: 1, west: 2, north: 3, l1: 4, r1: 5, l2: 6, r2: 7, select: 8, start: 9, l3: 10, r3: 11 },
    left: [0, 1],
    right: [2, 3],
    hatAxis: n > 9 ? 9 : undefined,
    dpadAxes: n === 8 ? [6, 7] : undefined,
  };
}

/** Radial deadzone: small drift is ignored, and the rest of the throw is stretched back to 0..1. */
export function stickPair(x: number, y: number): [number, number] {
  const m = Math.hypot(x, y);
  if (m < DEADZONE) return [0, 0];
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return [x * k, y * k];
}

/** Decodes a hat-switch axis (eight steps from -1 to 1, then a value past 1 for neutral) into d-pad directions. */
function hat(v: number): { up: boolean; down: boolean; left: boolean; right: boolean } {
  const none = { up: false, down: false, left: false, right: false };
  if (!Number.isFinite(v) || Math.abs(v) > 1.05) return none;
  const step = Math.round((v + 1) * 3.5); // 0 up, 1 up-right, 2 right, 3 down-right, 4 down, 5 down-left, 6 left, 7 up-left
  return {
    up: step === 7 || step === 0 || step === 1,
    right: step >= 1 && step <= 3,
    down: step >= 3 && step <= 5,
    left: step >= 5 && step <= 7,
  };
}

const ALL_BUTTONS: PadButton[] = ['south', 'east', 'west', 'north', 'l1', 'r1', 'l2', 'r2', 'select', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right'];

/** Turns any supported pad into the same logical shape. */
export function readPad(gp: PadLike): PadSnapshot {
  const kind = padKind(gp.id);
  const lay = layoutFor(gp, kind);
  const axis = (i: number | undefined): number => (i === undefined ? 0 : Number(gp.axes[i] ?? 0) || 0);
  const down = Object.fromEntries(ALL_BUTTONS.map((b) => [b, false])) as Record<PadButton, boolean>;
  for (const b of ALL_BUTTONS) {
    const idx = lay.buttons[b];
    if (idx === undefined) continue;
    const btn = gp.buttons[idx];
    if (!btn) continue;
    down[b] = b === 'l2' || b === 'r2' ? btn.pressed || (btn.value ?? 0) > TRIGGER_ON : btn.pressed;
  }
  if (lay.triggerAxes) {
    down.l2 = down.l2 || (axis(lay.triggerAxes.l2) + 1) / 2 > TRIGGER_ON;
    down.r2 = down.r2 || (axis(lay.triggerAxes.r2) + 1) / 2 > TRIGGER_ON;
  }
  if (lay.hatAxis !== undefined) {
    const h = hat(axis(lay.hatAxis));
    down.up = down.up || h.up;
    down.down = down.down || h.down;
    down.left = down.left || h.left;
    down.right = down.right || h.right;
  }
  if (lay.dpadAxes) {
    const dx = axis(lay.dpadAxes[0]);
    const dy = axis(lay.dpadAxes[1]);
    down.left = down.left || dx < -0.5;
    down.right = down.right || dx > 0.5;
    down.up = down.up || dy < -0.5;
    down.down = down.down || dy > 0.5;
  }
  const [mx, my] = stickPair(axis(lay.left[0]), axis(lay.left[1]));
  const [lx, ly] = stickPair(axis(lay.right[0]), axis(lay.right[1]));
  // With the stick at rest the d-pad walks too, so a pad with a broken stick still plays.
  const dpadX = (down.right ? 1 : 0) - (down.left ? 1 : 0);
  const dpadY = (down.up ? 1 : 0) - (down.down ? 1 : 0);
  return {
    moveX: mx !== 0 || my !== 0 ? mx : dpadX,
    moveY: mx !== 0 || my !== 0 ? -my : dpadY,
    lookX: lx,
    lookY: -ly,
    down,
  };
}

/** True if the pad is being touched at all (used to choose which of several pads is in use). */
function active(gp: PadLike): boolean {
  const s = readPad(gp);
  return s.moveX !== 0 || s.moveY !== 0 || s.lookX !== 0 || s.lookY !== 0 || ALL_BUTTONS.some((b) => s.down[b]);
}

// Fixed buttons: confirm and back in menus, tabs, respawn and the menu button. The game actions follow the player's bindings.
const FIXED_ACTIONS: Array<[PadButton, Action[]]> = [
  ['south', ['confirm']],
  ['east', ['back']],
  ['l1', ['tabPrev']],
  ['r1', ['tabNext']],
  ['select', ['respawn']],
  ['start', ['menu']],
];
/** Spare buttons that share an action when nothing else uses them: R1 attacks, R3 locks on. */
const ALIASES: Array<[PadButton, BindAction]> = [['r1', 'attack'], ['r3', 'lock']];
const ACTION_NAME: Record<BindAction, Action | null> = { jump: 'jump', attack: 'attack', dodge: 'dodge', guard: null, stow: 'stow', lock: 'lock', sneak: null };

/** The actions a button press starts, from the current bindings. */
export function actionsForButton(b: PadButton): Action[] {
  const out: Action[] = [];
  for (const [fb, acts] of FIXED_ACTIONS) if (fb === b) out.push(...acts);
  for (const a of BIND_ACTIONS) {
    const n = ACTION_NAME[a];
    if (n && bindings.pad(a) === b) out.push(n);
  }
  for (const [ab, a] of ALIASES) {
    if (ab === b && !bindings.actionForPad(b)) {
      const n = ACTION_NAME[a];
      if (n) out.push(n);
    }
  }
  return out;
}
/** The d-pad steers the menu. (In the game it walks, through moveX/moveY.) */
const DPAD_ACTIONS: Array<[PadButton, Action]> = [['up', 'up'], ['down', 'down'], ['left', 'left'], ['right', 'right']];

let before: Partial<Record<PadButton, boolean>> = {};
let activeIndex = -1;
let gamepadBlocked = false;

function releaseAll(): void {
  const g = gamepadControls;
  g.moveX = g.moveY = g.lookX = g.lookY = 0;
  g.runHeld = g.guardHeld = g.jumpHeld = false;
  before = {};
}

/**
 * Reads the pad in use. Call once per frame. With several pads plugged in, the one you touch last is the one that plays;
 * plug one in, press anything, and it works. Nothing needs setting up.
 */
export function pollGamepad(): void {
  if (gamepadBlocked) return;
  let pads: (Gamepad | null)[] = [];
  try {
    pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
  } catch {
    // Embedded viewers (like a chat app's file preview) forbid gamepads. Carry on without one.
    gamepadBlocked = true;
    return;
  }
  const live = pads.filter((p): p is Gamepad => !!p && p.connected);
  if (live.length === 0) {
    if (gamepadInfo.connected) releaseAll();
    gamepadInfo.connected = false;
    gamepadInfo.kind = null;
    gamepadInfo.name = '';
    activeIndex = -1;
    return;
  }
  let gp = live.find((p) => p.index === activeIndex);
  const touched = live.find((p) => p.index !== activeIndex && active(p));
  if (!gp || touched) {
    const next = touched ?? live[0];
    if (!gp || next.index !== gp.index) releaseAll();
    gp = next;
    activeIndex = gp.index;
  }
  gamepadInfo.connected = true;
  gamepadInfo.kind = labelKindOverride ?? padKind(gp.id);
  gamepadInfo.name = gp.id;

  const s = readPad(gp);
  const g = gamepadControls;
  g.moveX = s.moveX;
  g.moveY = s.moveY;
  g.lookX = s.lookX;
  g.lookY = s.lookY;
  g.jumpHeld = s.down[bindings.pad('jump')];
  g.guardHeld = s.down[bindings.pad('guard')];
  g.runHeld = s.down[bindings.pad('sneak')];
  for (const b of ALL_BUTTONS) {
    if (s.down[b] && !before[b]) {
      gamepadInfo.lastAt = performance.now();
      gamepadInfo.lastButton = b;
      for (const a of actionsForButton(b)) g.press(a);
    }
  }
  if (s.moveX !== 0 || s.moveY !== 0 || s.lookX !== 0 || s.lookY !== 0) gamepadInfo.lastAt = performance.now();
  for (const [b, a] of DPAD_ACTIONS) {
    if (s.down[b] && !before[b]) g.press(a);
  }
  before = { ...s.down };
}
