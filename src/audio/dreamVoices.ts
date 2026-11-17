/**
 * THE DREAM'S CREATURES SPEAK, in the voices of old speech chips.
 *
 * The owner, 2026-11-17: "let's give the creatures for the glitch world robotic voices. And everything right like their
 * attacks they can say a word, when they die they can say a word, you can even approximate like grunts and stuff like
 * that with the speech synthesizer for them." And his rule, the same day: "I only want it to be used for speech in the
 * wacky Pomo world": so ONLY in a level whose look is the dream's (`speaksRobot`).
 *
 * A creature says a word as it begins an attack ("tag", "got you", "my turn"), grunts when it is struck ("ow", "oof",
 * "hey"), and says another as it goes down ("bye bye", "night night"). Which voice it has goes by what it is
 * (`voiceOf`): a roach's is tiny and quick, a mantis's high, a Stag Knight's low and flat. The sounds are made by his
 * Robot Voice Box (scripts/chip/robot.mjs -> robotVoices.ts). Its own sounds (its feet, its blade, its hiss) are still
 * heard: the voice is over them.
 *
 * Nothing here plays anything: `DreamVoices.step` looks at the creatures as they are now, and says what each has just
 * done; the game plays what it says.
 */
import type { RobotCry, RobotVoice } from './robotVoices';

/** Does this level's creatures speak with the robot voice? Only the dream's do. */
export function speaksRobot(level: { look?: string }): boolean {
  return level.look === 'dream';
}

/** Which voice a creature has, by what it is (`Foe.kind`). */
export function voiceOf(kind: string): RobotVoice {
  const k = kind.toLowerCase();
  if (k === 'scuttler') return 'small';
  if (k === 'mantis' || k === 'ant' || k === 'hornet' || k === 'bat') return 'thin';
  if (k === 'stag' || k === 'ironback' || k === 'guard' || k === 'brood' || k === 'wyrm' || k === 'widow') return 'big';
  return 'plain';
}

/** (`hp`: every creature has it, though not all say so in what they share: one that does not grunts for nothing.) */
/** (`attacking`: from its wind-up on, for those that say so; `attackActive`: while its blow can land, which all have.) */
export interface Speaker { readonly alive: boolean; readonly attackActive: boolean; readonly attacking?: boolean; hp?: number }
const busy = (e: Speaker): boolean => e.attacking ?? e.attackActive;
export interface Cry<T> { who: T; cry: RobotCry }

/** After it has said a word for an attack, a creature says no other for this long (some of them attack in flurries). */
export const ATTACK_WORD_EVERY = 1.6;

export class DreamVoices<T extends Speaker> {
  private readonly was = new Map<T, { alive: boolean; hp: number; attacking: boolean; quiet: number }>();

  /** What each creature has just done that it has a sound for. (One it has not seen before says nothing for being as it is.) */
  step(dt: number, creatures: readonly T[]): Array<Cry<T>> {
    const out: Array<Cry<T>> = [];
    for (const e of creatures) {
      const w = this.was.get(e);
      if (!w) {
        this.was.set(e, { alive: e.alive, hp: e.hp ?? 0, attacking: busy(e), quiet: 0 });
        continue;
      }
      w.quiet = Math.max(0, w.quiet - dt);
      if (w.alive && !e.alive) out.push({ who: e, cry: 'die' });
      else if (e.alive && (e.hp ?? 0) < w.hp) out.push({ who: e, cry: 'hurt' });
      else if (e.alive && busy(e) && !w.attacking && w.quiet <= 0) {
        out.push({ who: e, cry: 'attack' });
        w.quiet = ATTACK_WORD_EVERY;
      }
      w.alive = e.alive;
      w.hp = e.hp ?? 0;
      w.attacking = busy(e);
    }
    // (Those that are gone from the level are forgotten.)
    if (this.was.size > creatures.length) for (const k of [...this.was.keys()]) if (!creatures.includes(k)) this.was.delete(k);
    return out;
  }

  reset(): void {
    this.was.clear();
  }
}
