/**
 * Controller rumble. Wraps the browser's gamepad vibration so the game can say "buzz a little" or "buzz hard" without caring
 * which controller is plugged in. It does nothing when there is no pad or no vibration support, and it can be switched off
 * (the choice is saved). Phones and keyboards simply ignore it.
 */
import type { StorageLike } from '../world/collectibles';

const KEY = 'ratquest.rumble';

interface Actuator {
  playEffect(type: 'dual-rumble', params: { startDelay?: number; duration: number; weakMagnitude: number; strongMagnitude: number }): Promise<unknown>;
}

/** How strong: off, low (half) or full. */
export type RumbleLevel = 'off' | 'low' | 'full';
export const RUMBLE_LEVELS: RumbleLevel[] = ['off', 'low', 'full'];
const STRENGTH: Record<RumbleLevel, number> = { off: 0, low: 0.5, full: 1 };

export class Rumble {
  private lvl: RumbleLevel = 'full';
  private lastAt = 0;
  private lastPower = 0;
  /** Set when the browser refuses gamepad access (an embedded viewer). */
  private blocked = false;

  constructor(private readonly storage: StorageLike | null = null) {
    try {
      const raw = storage?.getItem(KEY);
      // Older saves kept '1' (on) or '0' (off).
      if (raw === '0' || raw === 'off') this.lvl = 'off';
      else if (raw === 'low') this.lvl = 'low';
    } catch {
      /* no saved choice */
    }
  }

  enabled(): boolean {
    return this.lvl !== 'off';
  }

  setEnabled(v: boolean): void {
    this.setLevel(v ? 'full' : 'off');
  }

  level(): RumbleLevel {
    return this.lvl;
  }

  setLevel(l: RumbleLevel): void {
    this.lvl = l;
    try {
      this.storage?.setItem(KEY, l === 'off' ? '0' : l === 'full' ? '1' : 'low');
    } catch {
      /* ignore */
    }
  }

  /** Buzz the first pad that can. `strong` is the low heavy motor and `weak` the high light one, both 0..1; `ms` is how long. */
  pulse(strong: number, weak: number, ms: number): void {
    if (this.lvl === 'off' || this.blocked || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const k = STRENGTH[this.lvl];
    strong *= k;
    weak *= k;
    const power = strong + weak;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // A weaker buzz does not cut off a stronger one that is still going.
    if (now - this.lastAt < this.lastPower * 0 + 60 && power < this.lastPower) return;
    let pads: ReturnType<Navigator['getGamepads']> = [];
    try {
      pads = navigator.getGamepads();
    } catch {
      // Embedded viewers (like a chat app's file preview) forbid gamepads. No rumble there, and no asking again.
      this.blocked = true;
      return;
    }
    for (const pad of pads) {
      const act = (pad as unknown as { vibrationActuator?: Actuator } | null)?.vibrationActuator;
      if (pad && pad.connected && act) {
        try {
          void act.playEffect('dual-rumble', { duration: ms, weakMagnitude: Math.min(1, weak), strongMagnitude: Math.min(1, strong) }).catch(() => undefined);
          this.lastAt = now;
          this.lastPower = power;
        } catch {
          /* this pad cannot vibrate */
        }
        return;
      }
    }
  }

  // Named buzzes, so the game code reads like what happened.
  hit(): void { this.pulse(0.15, 0.5, 60); }
  kill(): void { this.pulse(0.5, 0.7, 160); }
  hurt(): void { this.pulse(0.9, 0.6, 220); }
  block(): void { this.pulse(0.35, 0.3, 90); }
  land(speed: number): void { if (speed > 6) this.pulse(Math.min(0.7, speed / 18), 0.2, 90); }
  smash(): void { this.pulse(0.2, 0.4, 70); }
  shock(): void { this.pulse(1, 0.8, 260); }
  collect(): void { this.pulse(0, 0.35, 50); }
  /** A Golden Wedge: a big, happy buzz. */
  wedge(): void { this.pulse(0.55, 0.9, 320); }
  /** The room shaking as a door opens: call each frame with how hard it shakes (0..1). */
  quake(amount: number): void { if (amount > 0.02) this.pulse(Math.min(1, amount * 6), Math.min(1, amount * 3), 90); }
  /** A soft thump: the speaker in Dave's room. */
  thump(level: number): void { if (level > 0.05) this.pulse(0.45 * level, 0.1 * level, 70); }
}
