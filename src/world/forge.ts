/**
 * The furnace's scenery (the owner, 2026-11-15, of the furnace: "a little texture [pass] over there and maybe create
 * some new objects and environmental scenery ... animations ... we can use in different places"). Seven things, each a
 * few plain shapes with a picture on them (world/forgeModels.ts draws them); this file is their sizes, what of each is
 * SOLID, and the clocks their moving parts go by. Nothing here draws.
 *
 *   furnace  A brick furnace on an iron footing, an arched mouth with a fire in it, a stack up into the roof.
 *   bellows  A great bellows in a timber frame. Its TOP board is fixed (it can be stood on); the lower board swings
 *            under it, inside the frame, where he cannot get.
 *   ladle    A pouring ladle hung from the roof, out of his reach, that tips and pours into
 *   mould    a casting box on the floor (solid), whose cast glows and cools between pours.
 *   ingots   A crossed stack of bars on bearers, the top two still hot.
 *   cogs     Two meshed wheels turning on a wall, hung above his reach.
 *   bunker   A timber coal bunker, full to the brim.
 *   anvil    An anvil on a stump.
 *
 * Each stands on the floor at (x, y, z), turned to face `yaw` (0: toward +z; quarter turns only: what is solid is boxes).
 */
import { extent, type Box } from './layout';

export type ForgeWhat = 'furnace' | 'bellows' | 'ladle' | 'mould' | 'ingots' | 'cogs' | 'bunker' | 'anvil';
export interface ForgeSpec { what: ForgeWhat; x: number; y: number; z: number; yaw?: number; /** furnace: how high its stack goes; ladle: how high it hangs (its trunnions) and how far below it the mould's top is. */ top?: number; drop?: number; /** A clock offset, so two of a kind do not move together. */ phase?: number }

export const FORGE = {
  /** The furnace: its brick body on a wider iron footing; the mouth is in the middle of its front. */
  furnace: { w: 5.2, d: 3.0, h: 5.4, foot: { w: 5.8, d: 3.4, h: 0.5 }, cap: 0.3, mouth: { w: 2.0, h: 2.2 }, stack: 0.85 },
  /** The bellows: the frame's footprint, and the top of its fixed board. Its nozzle sticks out of the +x end. */
  bellows: { long: 2.5, wide: 1.7, top: 1.78, nozzle: 0.8, period: 3.4, open: [0.1, 0.42] as const },
  /** The ladle: the bucket's size, and its round of work (seconds): rest, tip, pour, tip back. */
  /**
   * (The owner, 2026-11-17, of a pour of two seconds in a round of nine: "it stops and starts pretty quickly probably
   * too quickly". He was judging it from a film that ran the scenery five times too fast, but it was short all the
   * same: it pours for four and a half now, in a round of twelve, and tips over and back more slowly.)
   */
  ladle: { r: 0.86, deep: 1.2, lip: 1.0, period: 12, tipAt: 3, tipTime: 1.3, pourTime: 4.5, tip: 1.0, cool: 3.6 },
  mould: { w: 1.6, d: 1.0, h: 0.55 },
  ingots: { w: 1.5, d: 1.5, h: 0.76, bar: { long: 1.36, wide: 0.42, top: 0.3, high: 0.22 } },
  /** The cogs: the pitch radius and teeth of each (their teeth are the same size, so they mesh). */
  /** (`at`: which way the small one's middle lies from the big one's, radians up from level.) */
  cogs: { big: { r: 1.6, teeth: 16 }, small: { r: 0.9, teeth: 9 }, at: 0.62, tooth: 0.2, thick: 0.22, rate: 0.5 },
  bunker: { w: 2.6, d: 1.6, h: 1.14 },
  anvil: { stump: { w: 0.9, h: 0.6 }, w: 1.2, d: 0.36, h: 0.5 },
} as const;

/** A box of its own footprint, turned by quarter turns about (x, z). */
function turned(s: ForgeSpec, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box {
  const q = (((Math.round((s.yaw ?? 0) / (Math.PI / 2)) % 4) + 4) % 4);
  // (yaw 0 faces +z; a quarter turn takes local +z to +x and local +x to -z.)
  const corners: Array<[number, number]> = [[x0, z0], [x1, z1]].map(([x, z]) => (q === 0 ? [x, z] : q === 1 ? [z, -x] : q === 2 ? [-x, -z] : [-z, x]));
  const xs = corners.map((c) => c[0]);
  const zs = corners.map((c) => c[1]);
  return { ...extent('stone', s.x + Math.min(...xs), s.x + Math.max(...xs), s.y + y0, s.y + y1, s.z + Math.min(...zs), s.z + Math.max(...zs)), hidden: true };
}

/** What is solid of one of them (unseen boxes: the thing itself is what is drawn). The ladle and the cogs are out of reach, and only drawn. */
export function forgeSolids(s: ForgeSpec): Box[] {
  const F = FORGE;
  switch (s.what) {
    case 'furnace': {
      const f = F.furnace;
      return [
        turned(s, -f.foot.w / 2, f.foot.w / 2, 0, f.foot.h, -f.foot.d / 2, f.foot.d / 2),
        turned(s, -f.w / 2, f.w / 2, f.foot.h, f.h + f.cap, -f.d / 2, f.d / 2),
        turned(s, -f.stack, f.stack, f.h + f.cap, Math.max(f.h + f.cap + 0.1, (s.top ?? 12) - s.y), -f.stack, f.stack),
      ];
    }
    case 'bellows': return [turned(s, -F.bellows.long, 0, 0, F.bellows.top, -F.bellows.wide / 2, F.bellows.wide / 2)];
    case 'mould': return [turned(s, -F.mould.w / 2, F.mould.w / 2, 0, F.mould.h, -F.mould.d / 2, F.mould.d / 2)];
    case 'ingots': return [turned(s, -F.ingots.w / 2, F.ingots.w / 2, 0, F.ingots.h, -F.ingots.d / 2, F.ingots.d / 2)];
    case 'bunker': return [turned(s, -F.bunker.w / 2, F.bunker.w / 2, 0, F.bunker.h, -F.bunker.d / 2, F.bunker.d / 2)];
    case 'anvil': {
      const a = F.anvil;
      return [
        turned(s, -a.stump.w / 2, a.stump.w / 2, 0, a.stump.h, -a.stump.w / 2, a.stump.w / 2),
        turned(s, -a.w / 2, a.w / 2, a.stump.h, a.stump.h + a.h, -a.d / 2, a.d / 2),
      ];
    }
    default: return [];
  }
}

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * The ladle's round, at a time: how far it is tipped (0 level, 1 fully), how much of the stream is there (0 none, 1
 * all of it: it grows from the lip as the pour begins and its tail falls away as it ends), and how hot the cast in
 * the mould is (1 as it is poured, falling away after).
 */
export function ladleAt(time: number, phase = 0): { tip: number; stream: number; tail: number; heat: number } {
  const L = FORGE.ladle;
  const t = (((time + phase) % L.period) + L.period) % L.period;
  const pourFrom = L.tipAt + L.tipTime;
  const pourTo = pourFrom + L.pourTime;
  const tip = t < L.tipAt ? 0 : t < pourFrom ? smooth((t - L.tipAt) / L.tipTime) : t < pourTo ? 1 : smooth(1 - (t - pourTo) / L.tipTime);
  // The stream leaves the lip a little before the ladle is fully over, and is cut off as it starts back.
  const from = pourFrom - 0.15;
  const stream = t < from || t > pourTo + 0.5 ? 0 : Math.min(1, (t - from) / 0.35);
  const tail = t <= pourTo ? 0 : Math.min(1, (t - pourTo) / 0.5);
  // The cast: filled over the pour, then cooling until the next (it is still dull red when the ladle comes over again).
  const since = t >= from ? t - from : t + L.period - from;
  const heat = since < L.pourTime ? 0.35 + 0.65 * smooth(since / L.pourTime) : Math.exp(-(since - L.pourTime) / L.cool);
  return { tip, stream, tail, heat };
}

/** The bellows, at a time: how far open (radians between its boards). It fills slowly and is squeezed quickly. */
export function bellowsAt(time: number, phase = 0): number {
  const B = FORGE.bellows;
  const u = ((((time + phase) % B.period) + B.period) % B.period) / B.period;
  const k = u < 0.62 ? smooth(u / 0.62) : 1 - smooth((u - 0.62) / 0.38);
  return B.open[0] + (B.open[1] - B.open[0]) * k;
}

/**
 * The cogs, at a time: the turn of each (radians; each has a tooth along its own +x at no turn). They turn against
 * each other, the small one faster by the count of their teeth, and stay in mesh: where they meet, a tooth of the big
 * one is always in a gap of the small one.
 */
export function cogsAt(time: number, phase = 0): { big: number; small: number } {
  const C = FORGE.cogs;
  const big = (time + phase) * C.rate;
  return { big, small: C.at + Math.PI - Math.PI / C.small.teeth - (big - C.at) * (C.big.teeth / C.small.teeth) };
}
