/**
 * Which key and which pad button does each game action use. Saved on the device; the player can change any of them.
 * Movement (WASD / arrows / sticks) and the menu keys stay fixed.
 */
import type { PadButton } from './controls';

export type BindAction = 'jump' | 'attack' | 'dodge' | 'guard' | 'stow' | 'lock' | 'sneak';

export const BIND_ACTIONS: BindAction[] = ['jump', 'attack', 'dodge', 'guard', 'stow', 'lock', 'sneak'];
export const BIND_NAMES: Record<BindAction, string> = {
  jump: 'JUMP / TALK', attack: 'ATTACK', dodge: 'DODGE', guard: 'GUARD (HOLD)', stow: 'STOW SWORD', lock: 'LOCK ON', sneak: 'SNEAK (HOLD)',
};

export interface Binding {
  key: string;
  pad: PadButton;
}

export const DEFAULT_BINDINGS: Record<BindAction, Binding> = {
  jump: { key: 'Space', pad: 'south' },
  attack: { key: 'KeyJ', pad: 'west' },
  dodge: { key: 'KeyK', pad: 'east' },
  guard: { key: 'KeyL', pad: 'l1' },
  stow: { key: 'KeyH', pad: 'north' },
  lock: { key: 'KeyQ', pad: 'r2' },
  sneak: { key: 'ShiftLeft', pad: 'l2' },
};

/** Keys that can never be given to an action: they run the menu and the camera. */
export const RESERVED_KEYS = new Set(['Escape', 'Enter', 'F2', 'F11', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyP', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
/** Buttons that can never be given to an action: they run the menu. */
export const RESERVED_BUTTONS = new Set<PadButton>(['start', 'select', 'up', 'down', 'left', 'right']);

const KEY = 'ratquest.bindings';

type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };

function clone(): Record<BindAction, Binding> {
  return Object.fromEntries(BIND_ACTIONS.map((a) => [a, { ...DEFAULT_BINDINGS[a] }])) as Record<BindAction, Binding>;
}

export class Bindings {
  private map = clone();
  constructor(private store: Store | null = null) {
    this.load();
  }

  key(a: BindAction): string {
    return this.map[a].key;
  }
  pad(a: BindAction): PadButton {
    return this.map[a].pad;
  }
  /** Every key used by an action, including the right Shift that shares the sneak key. */
  keys(a: BindAction): string[] {
    const k = this.map[a].key;
    return k === 'ShiftLeft' ? ['ShiftLeft', 'ShiftRight'] : k === 'ShiftRight' ? ['ShiftRight', 'ShiftLeft'] : [k];
  }
  allKeys(): Set<string> {
    const s = new Set<string>();
    for (const a of BIND_ACTIONS) for (const k of this.keys(a)) s.add(k);
    return s;
  }
  /** The action using a pad button, if any. */
  actionForPad(b: PadButton): BindAction | null {
    return BIND_ACTIONS.find((a) => this.map[a].pad === b) ?? null;
  }

  /** Gives a key to an action. If another action had it, the two swap. Returns false for reserved keys. */
  setKey(a: BindAction, code: string): boolean {
    if (RESERVED_KEYS.has(code)) return false;
    const other = BIND_ACTIONS.find((x) => x !== a && this.map[x].key === code);
    if (other) this.map[other].key = this.map[a].key;
    this.map[a].key = code;
    this.save();
    return true;
  }
  setPad(a: BindAction, b: PadButton): boolean {
    if (RESERVED_BUTTONS.has(b)) return false;
    const other = BIND_ACTIONS.find((x) => x !== a && this.map[x].pad === b);
    if (other) this.map[other].pad = this.map[a].pad;
    this.map[a].pad = b;
    this.save();
    return true;
  }
  reset(): void {
    this.map = clone();
    this.save();
  }

  private save(): void {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.map));
    } catch {
      // Storage can be unavailable in embedded viewers; the bindings then last for this session.
    }
  }
  private load(): void {
    try {
      const raw = this.store?.getItem(KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<Record<BindAction, Partial<Binding>>>;
      for (const a of BIND_ACTIONS) {
        const k = d[a]?.key;
        const p = d[a]?.pad;
        if (typeof k === 'string' && !RESERVED_KEYS.has(k)) this.map[a].key = k;
        if (typeof p === 'string' && !RESERVED_BUTTONS.has(p as PadButton)) this.map[a].pad = p as PadButton;
      }
      // A saved file with a repeated key or button falls back to the defaults, so nothing becomes unreachable.
      const dupKey = new Set(BIND_ACTIONS.map((a) => this.map[a].key)).size !== BIND_ACTIONS.length;
      const dupPad = new Set(BIND_ACTIONS.map((a) => this.map[a].pad)).size !== BIND_ACTIONS.length;
      if (dupKey || dupPad) this.map = clone();
    } catch {
      this.map = clone();
    }
  }
}

function deviceStorage(): Store | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The one set of bindings the game uses. */
export const bindings = new Bindings(deviceStorage());
