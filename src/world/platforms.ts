/**
 * KINDS OF MOVING PLATFORM (2026-11-20; the owner: "different types of moving platforms, different kinds of interactable
 * things ... anything you can put in the game for Fable to work with later"). A moving platform (MoverSpec in
 * layout.ts) has always glided to `to` and back. Now it may move another way, by its `motion`:
 *
 *   glide    to `to` and back, waiting `pause` at each end (as before; the default)
 *   circle   round and round: `to` is where it is at the start, from the middle it circles, `speed` along the way
 *   ride     waits at the start; goes to `to` while he stands on it, and back `pause` seconds after he steps off
 *   sink     sinks while he stands on it (`speed` a second, `depth` at most), and rises again when he is off
 *   crumble  shakes when he lands on it, falls after `hold` seconds, is gone for `back` seconds, and comes back
 *   spring   a pad: stood on, it squashes and throws him up `launch` high (holding jump or not: the short-hop
 *            rule is for his own jumps), and is ready again a moment later
 *
 * Each platform keeps its own state (`PlatformState`); `platformStep` moves it on by `dt` and says where it is, whether
 * it is solid, and how its picture should shake or squash. world/chamber.ts stepMovers does the rest (carrying him,
 * the crates on it, pushing him out from under it). tests/platforms.ts drives each with the real controller.
 */
import { moverOffset, type MoverSpec } from './layout';

export type PlatformMotion = 'glide' | 'circle' | 'ride' | 'sink' | 'crumble' | 'spring';
export const PLATFORM_MOTIONS: readonly PlatformMotion[] = ['glide', 'circle', 'ride', 'sink', 'crumble', 'spring'];

/** Defaults for each kind, where its spec says nothing. */
export const PLATFORM = {
  /** crumble: seconds of shaking before it goes; seconds gone; how far it falls before it is gone. */
  crumble: { hold: 0.7, back: 3, drop: 6 },
  /** sink: units a second, and at most this deep. */
  sink: { speed: 1.2, depth: 2.5 },
  /** ride: seconds after he steps off before it goes back. */
  ride: { pause: 1 },
  /** spring: how high it throws him (units), and how long before it can throw again. */
  spring: { launch: 6, rest: 0.35 },
} as const;

export interface PlatformState {
  /** Its own clock (a glide or a circle runs on this). */
  time: number;
  /** ride: how far along to `to`, 0..1; and how long since he stepped off. */
  along: number;
  off: number;
  /** sink: how deep it is now. */
  down: number;
  /** crumble: what it is doing, and for how long. */
  stage: 'still' | 'shaking' | 'falling' | 'gone';
  stageTime: number;
  /** spring: seconds until it can throw him again; and how squashed it is, 0..1. */
  rest: number;
  squash: number;
}

export const newPlatformState = (): PlatformState => ({ time: 0, along: 0, off: 0, down: 0, stage: 'still', stageTime: 0, rest: 0, squash: 0 });

export interface PlatformNow {
  /** Where it is, from where it starts. */
  offset: [number, number, number];
  /** Whether he (and anything else) can stand on it. A crumbled one is not. */
  solid: boolean;
  /** Whether it is drawn. */
  shown: boolean;
  /** How far its picture is shaken sideways this moment (a crumbling one), and squashed down 0..1 (a spring). */
  shake: [number, number];
  squash: number;
  /** A spring threw him this step: the upward speed to give him. */
  launch: number;
}

const smooth = (f: number): number => f * f * (3 - 2 * f);

/**
 * Moves one platform on by `dt`. `ridden` is whether he was standing on it as this step began; `gravity` is what pulls
 * him down (for the speed that throws him `launch` high).
 */
export function platformStep(spec: MoverSpec, s: PlatformState, dt: number, ridden: boolean, gravity: number): PlatformNow {
  s.time += dt;
  const out: PlatformNow = { offset: [0, 0, 0], solid: true, shown: true, shake: [0, 0], squash: 0, launch: 0 };
  const motion = spec.motion ?? 'glide';
  const len = Math.hypot(spec.to[0], spec.to[1], spec.to[2]);
  if (motion === 'glide') {
    out.offset = moverOffset(spec, s.time);
  } else if (motion === 'circle') {
    // `to` is from the middle to where it starts; it goes round at `speed` along its way.
    const r = Math.max(0.1, Math.hypot(spec.to[0], spec.to[2]));
    const a0 = Math.atan2(spec.to[2], spec.to[0]);
    const a = a0 + (s.time * (spec.speed ?? 2)) / r + (spec.phase ?? 0) * Math.PI * 2;
    out.offset = [Math.cos(a) * r - spec.to[0], 0, Math.sin(a) * r - spec.to[2]];
  } else if (motion === 'ride') {
    const step = len > 1e-6 ? (dt * (spec.speed ?? 2)) / len : 1;
    if (ridden) {
      s.off = 0;
      s.along = Math.min(1, s.along + step);
    } else {
      s.off += dt;
      if (s.off > (spec.pause ?? PLATFORM.ride.pause)) s.along = Math.max(0, s.along - step);
    }
    const f = smooth(s.along);
    out.offset = [spec.to[0] * f, spec.to[1] * f, spec.to[2] * f];
  } else if (motion === 'sink') {
    const speed = spec.speed ?? PLATFORM.sink.speed;
    const depth = spec.depth ?? PLATFORM.sink.depth;
    s.down = ridden ? Math.min(depth, s.down + speed * dt) : Math.max(0, s.down - speed * 0.6 * dt);
    out.offset = [0, -s.down, 0];
  } else if (motion === 'crumble') {
    const hold = spec.hold ?? PLATFORM.crumble.hold;
    const back = spec.back ?? PLATFORM.crumble.back;
    s.stageTime += dt;
    if (s.stage === 'still' && ridden) {
      s.stage = 'shaking';
      s.stageTime = 0;
    } else if (s.stage === 'shaking' && s.stageTime >= hold) {
      s.stage = 'falling';
      s.stageTime = 0;
    } else if (s.stage === 'falling') {
      // (It drops away: a short fall is drawn, solid no longer from the moment it goes.)
      const y = -0.5 * 20 * s.stageTime * s.stageTime;
      if (-y >= PLATFORM.crumble.drop) {
        s.stage = 'gone';
        s.stageTime = 0;
      } else out.offset = [0, y, 0];
    } else if (s.stage === 'gone' && s.stageTime >= back) {
      s.stage = 'still';
      s.stageTime = 0;
    }
    if (s.stage === 'shaking') {
      // A shiver that grows as it is about to go.
      const k = 0.03 + 0.05 * Math.min(1, s.stageTime / hold);
      out.shake = [Math.sin(s.time * 61) * k, Math.cos(s.time * 47) * k];
    }
    out.solid = s.stage === 'still' || s.stage === 'shaking';
    out.shown = s.stage !== 'gone';
  } else if (motion === 'spring') {
    s.rest = Math.max(0, s.rest - dt);
    if (ridden && s.rest === 0) {
      const h = spec.launch ?? PLATFORM.spring.launch;
      out.launch = Math.sqrt(2 * gravity * h);
      s.rest = PLATFORM.spring.rest;
      s.squash = 1;
    }
    s.squash = Math.max(0, s.squash - dt * 6);
    out.squash = s.squash;
  }
  return out;
}
