/**
 * THE BIG DIPPER: the dream's long ride. Two minutes and more downhill on the shield, through the stars.
 *
 * The owner, 2026-11-17: "I'd also like to build like a huge sort of like rainbow road-esque ramp level like the one you
 * already made but I want it to be like a really long way that you slide down like I want to be sliding down for like a
 * straight 2 minutes. And I want there to be lots of like jumps and you can add some rails too but obviously wacky Pomo
 * style so you'll have to make a new version of a rail. You can make it curved ... I just want it to be like a really
 * long sort of course that you go down, lots of cool jumps, rail grinds, and you can even have areas where you have to
 * like stop sliding and fight some monsters and then there'll be another area where you jump off and have to slide down
 * some more."
 *
 * WHAT IT IS: the Milky Way's rainbow road (levels/milkyway.ts), eleven times as long, in FOUR RIDES with a place to
 * fight between each and the next. It is written as a list of pieces (`COURSE`), laid one after another downhill:
 *   a ROAD      a length of rainbow, as steep as the Milky Way's; some narrow, some wide; some with a KICKER down the
 *               middle of their end (a little ramp that throws him);
 *   a GAP       nothing: the next road starts beyond it, lower, and often to one side. The narrow ones a rider at
 *               speed clears as he is; the wide ones want the kicker, or the jump off the board;
 *   a RAIL      a gap far too wide to jump, crossed on LIGHT RAILS (world/rails.ts): ribbons of light that curve. One
 *               that snakes (`ess`), three that plait round each other (`braid`), one that goes right round like a
 *               helter-skelter (`twist`). The grind button, near one, puts him on it;
 *   a PAD       the road eases out onto a flat floor with a kerb all round and a GATE in its far side. The dream's
 *               creatures are awake on it. The gate opens when they are beaten; beyond it the next ride begins.
 * At the bottom, the Bowl: a last floor, with the way out.
 * Bottle caps hang where a good line earns them: over the wide gaps, up where the kicker throws him, and on the rails.
 * Off the road is a long fall: he is put back where he last stood, a heart the poorer.
 */
import type { EnemySpec, LevelDef } from './types';
import { extent, rampBox, type Box, type Decor, type GateSpec } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { dozerSolids, type DozerSpec } from '../world/dozers';
import { railCurve, railAt, type RailCurve } from '../world/rails';

export const DIP = { wide: 7, deep: 1.2, slope: 0.42 } as const;
/** A kicker: down the middle of a road's end, this wide and long, its lip this much above where it starts. */
export const KICK = { wide: 3, len: 3, rise: 0.55 } as const;
const KICK_SHORT = 0.12;
/** A pad: the easing-out before it, the floor, its kerb, the gate, and the level lip beyond the gate that the next road falls from. */
export const PAD = { runout: 16, fall: 2, half: 11, long: 30, kerb: 2.6, gate: 7, gateTall: 4, lip: 6 } as const;
export const DIP_HEAD = { half: 9, long: 10 } as const;
export const BOWL = { half: 12, long: 28 } as const;
export const DIP_FALL = 28;
/** How far over a rail a bottle cap on it hangs (his middle, grinding it), and over a gap's lip (as the Milky Way's). */
export const CAP_ON_RAIL = 1.0;
export const CAP_OVER_GAP = 1.35;

type Shape = 'ess' | 'braid' | 'twist';
type Piece =
  | { t: 'road'; len: number; wide?: number; kick?: boolean }
  | { t: 'gap'; wide: number; under: number; dx?: number; cap?: boolean }
  | { t: 'rail'; span: number; drop: number; shape: Shape; dx?: number; cap?: boolean }
  | { t: 'pad'; name: string; foes: Array<{ type: NonNullable<EnemySpec['type']>; dx: number; dz: number }> };

const road = (len: number, o: { wide?: number; kick?: boolean } = {}): Piece => ({ t: 'road', len, ...o });
const gap = (wide: number, under: number, o: { dx?: number; cap?: boolean } = {}): Piece => ({ t: 'gap', wide, under, ...o });
const rail = (shape: Shape, span: number, drop: number, o: { dx?: number; cap?: boolean } = {}): Piece => ({ t: 'rail', shape, span, drop, ...o });
/** The narrow gap a rider at speed clears as he is (the Milky Way's), and the wide one that wants the kicker or the jump. */
const HOP = [6, 3.2] as const;
const LEAP = [10, 5] as const;

/** THE COURSE, top to bottom. */
export const COURSE: Piece[] = [
  // ---- THE FIRST RIDE: one of each thing ----
  road(70), gap(...HOP, { dx: 2.5, cap: true }), road(60), gap(7, 3.8, { dx: -2.5 }), road(64, { kick: true }), gap(...LEAP, { cap: true }),
  road(72), rail('braid', 26, 11, { cap: true }), road(70), gap(...HOP, { dx: 3 }), road(50, { wide: 5 }), gap(...HOP, { dx: -3 }), road(66), gap(7, 3.8, { dx: 2 }), road(74), gap(...HOP, { dx: -2 }),
  road(40),
  { t: 'pad', name: 'The First Stop', foes: [{ type: 'scuttler', dx: -4, dz: 16 }, { type: 'scuttler', dx: 4, dz: 18 }, { type: 'scuttler', dx: 0, dz: 23 }] },
  // ---- THE SECOND: rails ----
  road(60), rail('ess', 30, 13, { cap: true }), road(64, { kick: true }), gap(...LEAP, { cap: true }), road(80, { wide: 10 }), rail('twist', 34, 16, { cap: true }),
  road(56), gap(7, 3.8, { dx: 2.5 }), road(60), gap(...HOP, { dx: -2.5 }), road(70, { kick: true }), gap(...LEAP), road(76),
  { t: 'pad', name: 'The Second Stop', foes: [{ type: 'mantis', dx: -4, dz: 18 }, { type: 'mantis', dx: 4, dz: 21 }, { type: 'scuttler', dx: 0, dz: 15 }] },
  // ---- THE THIRD: big air ----
  road(80, { kick: true }), gap(...LEAP, { cap: true }), road(60, { kick: true }), gap(...LEAP), road(60), rail('ess', 40, 17, { cap: true }), road(50, { wide: 5 }),
  gap(...HOP, { dx: 3 }), road(50, { wide: 5 }), gap(...HOP, { dx: -3 }), road(70, { kick: true }), gap(...LEAP, { cap: true }), road(80), gap(7, 3.8, { dx: -2.5 }), road(60), gap(...HOP, { dx: 2.5 }), road(50),
  { t: 'pad', name: 'The Third Stop', foes: [{ type: 'stag', dx: 0, dz: 21 }, { type: 'mantis', dx: -5, dz: 16 }] },
  // ---- THE LAST: all of it ----
  road(90), rail('braid', 30, 13, { cap: true }), road(60, { kick: true }), gap(...LEAP, { cap: true }), road(70), rail('twist', 36, 17, { cap: true }),
  road(60), gap(7, 3.8, { dx: 2.5 }), road(60, { kick: true }), gap(...LEAP), road(80), gap(7, 3.8, { dx: -2.5 }), road(50, { wide: 5 }), gap(...HOP), road(100),
];

export interface DipRoad { z0: number; z1: number; y0: number; y1: number; x: number; wide: number; ride: number; kick: boolean; /** What it ends in. */ end: 'gap' | 'rail' | 'pad' | 'bowl'; /** The next road's middle, across. */ nextX: number; /** A rail crossing: where its rails begin, across (he steers for the nearest). */ railX?: number[] }
export interface DipPad { name: string; ride: number; z0: number; z1: number; y: number; x: number; gate: number; foes: number[]; /** Where the next ride starts: on the lip beyond its gate. */ start: { x: number; y: number; z: number } }
interface Plan { solids: Box[]; decor: Decor[]; collectibles: CollectibleDef[]; dozers: DozerSpec[]; enemies: EnemySpec[]; gates: GateSpec[]; roads: DipRoad[]; pads: DipPad[]; rails: RailCurve[]; headY: number; bowl: { z0: number; z1: number }; caps: string[] }
let plan: Plan | null = null;

/** How far a piece takes him down. */
function fallOf(p: Piece): number {
  if (p.t === 'road') return p.len * DIP.slope;
  if (p.t === 'gap') return p.wide * DIP.slope + p.under;
  if (p.t === 'rail') return p.drop;
  return PAD.fall;
}

/** The light rails of a crossing: from (x0, y0, z0), a little back up the road he leaves, to (x1, y1, z1) over the start of the next. */
function railsOf(shape: Shape, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Array<Array<[number, number, number]>> {
  const span = z1 - z0;
  const at = (t: number, dx: number, dy = 0): [number, number, number] => [x0 + (x1 - x0) * t + dx, y0 + (y1 - y0) * t + dy, z0 + span * t];
  if (shape === 'ess') return [[at(0, 0), at(0.12, 0), at(0.36, 4.5, 0.6), at(0.64, -4.5, 0.6), at(0.9, 0), at(1, 0)]];
  if (shape === 'braid') {
    // Three, side by side where he gets on and where he gets off, changing places twice between (each at its own
    // height where they cross, so that no two are ever in the same place).
    return [-2.2, 0, 2.2].map((dx, i) => [at(0, dx), at(0.12, dx), at(0.36, [2.2, -2.2, 0][i], [0.9, 0, -0.9][i]), at(0.64, [0, 2.2, -2.2][i], [-0.9, 0.9, 0][i]), at(0.9, dx), at(1, dx)] as Array<[number, number, number]>);
  }
  // The twist: out to one side and right round, once, coming back over its own way in, lower.
  const r = 6;
  const pts: Array<[number, number, number]> = [at(0, 0), at(0.12, 0)];
  const mid = z0 + span * 0.5;
  const turns = 8;
  for (let k = 0; k <= turns; k++) {
    const a = (k / turns) * Math.PI * 2;
    // (Round a middle `r` to the side: it starts and ends on his line, going his way.)
    const t = 0.3 + 0.4 * (k / turns);
    pts.push([x0 + (x1 - x0) * t + r - r * Math.cos(a), y0 + (y1 - y0) * t, mid - r * 0.4 + r * Math.sin(a) + (k / turns) * r * 0.8]);
  }
  pts.push(at(0.9, 0), at(1, 0));
  return [pts];
}

function build(): Plan {
  let fall = 0;
  for (const p of COURSE) fall += fallOf(p);
  const headY = fall + PAD.fall; // (the last road eases out onto the Bowl as onto a pad)
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const collectibles: CollectibleDef[] = [];
  const dozers: DozerSpec[] = [];
  const enemies: EnemySpec[] = [];
  const gates: GateSpec[] = [];
  const roads: DipRoad[] = [];
  const pads: DipPad[] = [];
  const rails: RailCurve[] = [];
  const caps: string[] = [];
  const rainbow = (b: Box): Box => ({ ...b, skin: 'rainbowRoad' });
  const tiles = (b: Box): Box => ({ ...b, skin: 'pomoTiles' });
  const fuzz = (b: Box): Box => ({ ...b, skin: 'dreamStatic' });
  const cap = (x: number, y: number, z: number): void => {
    const id = `dip-cap-${caps.length + 1}`;
    caps.push(id);
    collectibles.push({ id, kind: 'cap', x, y, z });
  };

  // THE HEAD: the road runs back across a pad to where he comes in; a kerb round the rest of it.
  const half = DIP.wide / 2;
  const H = DIP_HEAD;
  solids.push(rainbow(extent('stone', -half, half, headY - DIP.deep, headY, -H.long, 0)));
  for (const s of [-1, 1]) solids.push(tiles(extent('stone', s < 0 ? -H.half : half, s < 0 ? -half : H.half, headY - DIP.deep, headY, -H.long, 0)));
  for (const [x0, x1, z0, z1] of [[-H.half - 1, H.half + 1, -H.long - 1, -H.long], [-H.half - 1, -H.half, -H.long, 0], [H.half, H.half + 1, -H.long, 0], [-H.half - 1, -half, 0, 1], [half, H.half + 1, 0, 1]]) {
    solids.push(fuzz(extent('stone', x0, x1, headY - DIP.deep, headY + PAD.kerb, z0, z1)));
  }
  decor.push({ kind: 'sign', x: -half - 0.6, y: headY + 1.7, z: -2.4, yaw: Math.PI, w: 4.2, h: 2, lines: ['THE BIG DIPPER', 'JUMP, THEN ATTACK: RIDE', 'GRIND THE RIBBONS OF LIGHT'], post: 0 });

  let z = 0;
  let y = headY;
  let x = 0;
  let ride = 0;
  COURSE.forEach((p, i) => {
    const next = COURSE[i + 1];
    if (p.t === 'road') {
      const w = (p.wide ?? DIP.wide) / 2;
      const y1 = y - p.len * DIP.slope;
      solids.push(rainbow(rampBox('stone', x - w, x + w, z, z + p.len, y1, y, 'n', y1 - DIP.deep)));
      if (p.kick) {
        // (Its foot on the road `KICK.len` short of the end; its lip over the end, that much above where it began.)
        const foot = y1 + KICK.len * DIP.slope;
        // (It stops a hand's breadth short of the road's end: its end and the road's are two faces, not one that flickers.)
        solids.push(fuzz(rampBox('stone', x - KICK.wide / 2, x + KICK.wide / 2, z + p.len - KICK.len - KICK_SHORT, z + p.len - KICK_SHORT, foot, foot + KICK.rise, 's', y1 - 0.3)));
      }
      const end = !next ? 'bowl' : next.t === 'pad' ? 'pad' : next.t === 'rail' ? 'rail' : 'gap';
      roads.push({ z0: z, z1: z + p.len, y0: y, y1, x, wide: w * 2, ride, kick: !!p.kick, end, nextX: x + ((next && (next.t === 'gap' || next.t === 'rail') && next.dx) || 0) });
      z += p.len;
      y = y1;
    } else if (p.t === 'gap') {
      const nx = x + (p.dx ?? 0);
      // (Over the middle of the gap, on the line between the two roads' middles, up where the jump or the kicker carries him.)
      if (p.cap) cap((x + nx) / 2, y + CAP_OVER_GAP + (roads[roads.length - 1].kick ? KICK.rise + 0.5 : 0), z + p.wide / 2);
      z += p.wide;
      y -= p.wide * DIP.slope + p.under;
      x = nx;
    } else if (p.t === 'rail') {
      const nx = x + (p.dx ?? 0);
      const back = 2.5;
      const on = 1.5;
      const lines = railsOf(p.shape, x, y + back * DIP.slope + 0.12, z - back, nx, y - p.drop - on * DIP.slope + 0.5, z + p.span + on);
      for (const pts of lines) {
        decor.push({ kind: 'lightrail', pts });
        rails.push(railCurve({ pts }));
      }
      roads[roads.length - 1].railX = lines.map((l) => l[0][0]);
      if (p.cap) {
        // (On the first of them, a little past half way: his middle, grinding it.)
        const c = rails[rails.length - lines.length];
        const q = railAt(c, c.len * 0.55);
        cap(q.x, q.y + CAP_ON_RAIL, q.z);
      }
      z += p.span;
      y -= p.drop;
      x = nx;
    } else {
      // A PAD. The road eases out; a floor with a kerb round it; the creatures; a gate in its far side; a lip beyond.
      solids.push(rainbow(rampBox('stone', x - half, x + half, z, z + PAD.runout, y - PAD.fall, y, 'n', y - PAD.fall - DIP.deep)));
      roads.push({ z0: z, z1: z + PAD.runout, y0: y, y1: y - PAD.fall, x, wide: DIP.wide, ride, kick: false, end: 'pad', nextX: x });
      z += PAD.runout;
      y -= PAD.fall;
      const z1 = z + PAD.long;
      solids.push(tiles(extent('stone', x - PAD.half, x + PAD.half, y - DIP.deep, y, z, z1)));
      const g = PAD.gate / 2;
      for (const [x0, x1, za, zb] of [[x - PAD.half - 1, x - PAD.half, z, z1 + 1], [x + PAD.half, x + PAD.half + 1, z, z1 + 1], [x - PAD.half, x - g, z1, z1 + 1], [x + g, x + PAD.half, z1, z1 + 1], [x - PAD.half - 1, x - half, z - 1, z], [x + half, x + PAD.half + 1, z - 1, z]]) {
        solids.push(fuzz(extent('stone', x0, x1, y - DIP.deep, y + PAD.kerb, za, zb)));
      }
      const foes: number[] = [];
      for (const f of p.foes) {
        foes.push(enemies.length);
        // (Each keeps to the pad: `hunt` would let it go anywhere within five hundred of the level's middle, and no further.)
        // (And once beaten it stays beaten: a roach comes back after five seconds unless it is told not to, and the gate would never open.)
        enemies.push({ type: f.type, x: x + f.dx, z: z + f.dz, y, respawn: false, arena: { x0: x - PAD.half + 1, x1: x + PAD.half - 1, z0: z + 1, z1: z1 - 1 } });
      }
      gates.push({ x, z: z1 + 0.5, y, width: PAD.gate, height: PAD.gateTall, foes });
      decor.push({ kind: 'flowers', x: x - PAD.half + 2, y, z: z + PAD.long / 2, w: 2.2, d: PAD.long - 10, seed: 57 + pads.length }, { kind: 'flowers', x: x + PAD.half - 2, y, z: z + PAD.long / 2, w: 2.6, d: PAD.long - 6, seed: 9 + pads.length });
      decor.push({ kind: 'butterflies', x: x - PAD.half + 2, y: y + 1.4, z: z + PAD.long / 2, r: 2, count: 3 });
      // The lip beyond the gate: a level length of road, and the next ride falls away from its end.
      solids.push(rainbow(extent('stone', x - half, x + half, y - DIP.deep, y, z1, z1 + 1 + PAD.lip)));
      pads.push({ name: p.name, ride, z0: z, z1, y, x, gate: gates.length - 1, foes, start: { x, y, z: z1 + 2.5 } });
      z = z1 + 1 + PAD.lip;
      ride++;
    }
  });
  // THE BOWL: the last road eases out onto it; the way out at its far end.
  solids.push(rainbow(rampBox('stone', x - half, x + half, z, z + PAD.runout, 0, y, 'n', -DIP.deep)));
  roads.push({ z0: z, z1: z + PAD.runout, y0: y, y1: 0, x, wide: DIP.wide, ride, kick: false, end: 'bowl', nextX: x });
  z += PAD.runout;
  const bowl = { z0: z, z1: z + BOWL.long };
  solids.push(tiles(extent('stone', x - BOWL.half, x + BOWL.half, -DIP.deep, 0, bowl.z0, bowl.z1)));
  for (const [x0, x1, za, zb] of [[x - BOWL.half - 1, x + BOWL.half + 1, bowl.z1, bowl.z1 + 1], [x - BOWL.half - 1, x - BOWL.half, bowl.z0, bowl.z1], [x + BOWL.half, x + BOWL.half + 1, bowl.z0, bowl.z1], [x - BOWL.half - 1, x - half, bowl.z0 - 1, bowl.z0], [x + half, x + BOWL.half + 1, bowl.z0 - 1, bowl.z0]]) {
    solids.push(fuzz(extent('stone', x0, x1, -DIP.deep, PAD.kerb, za, zb)));
  }
  for (const s of [-1, 1]) {
    decor.push({ kind: 'flowers', x: x + s * 8, y: 0, z: bowl.z0 + 14, w: 5.4, d: 16, seed: s < 0 ? 4 : 12 });
    decor.push({ kind: 'butterflies', x: x + s * 8, y: 1.4, z: bowl.z0 + 12, r: 2.4, count: 3 });
  }
  dozers.push({ type: 'stag', x: x - 8, y: 0, z: bowl.z0 + 13, facing: 1.2 }, { type: 'scorpion', x: x + 8, y: 0, z: bowl.z0 + 16, facing: -1.4 }, { type: 'mantis', x: x + 7.4, y: 0, z: bowl.z0 + 9, facing: -0.8, awake: true });
  for (const dz of dozers) solids.push(...dozerSolids(dz));

  // Planets, hanging about the way down: one every hundred and fifty or so, to one side and the other, each its own colours.
  const COLOURS = [0xff5ab4, 0xffe84a, 0x3ee8c0, 0x7a5cff, 0x2ad8ff, 0xff8a1e, 0xff2a6a];
  const yAt = (zz: number): number => {
    const l = roads.find((q) => zz <= q.z1) ?? roads[roads.length - 1];
    return l.y0 + (l.y1 - l.y0) * Math.max(0, Math.min(1, (zz - l.z0) / (l.z1 - l.z0)));
  };
  for (let k = 0, zz = 40; zz < bowl.z0; k++, zz += 150) {
    const side = k % 2 ? 1 : -1;
    const r = 6 + ((k * 7) % 12);
    decor.push({ kind: 'planet', x: side * (34 + r + ((k * 13) % 20)), y: yAt(zz) + (((k * 5) % 3) - 1) * 14, z: zz, r, color: COLOURS[k % 7], band: COLOURS[(k + 3) % 7], ring: k % 3 === 0 ? { out: 1.9, color: COLOURS[(k + 5) % 7] } : undefined, tilt: ((k % 5) - 2) * 0.25 });
  }
  decor.push({ kind: 'planet', x: 0, y: -40, z: bowl.z1 + 50, r: 22, color: 0xff2a6a, band: 0xffe84a, ring: { out: 1.8, color: 0x7a5cff }, tilt: 0.25 });

  return { solids, decor, collectibles, dozers, enemies, gates, roads, pads, rails, headY, bowl, caps };
}
export function dipperPlan(): Plan {
  return (plan ??= build());
}

export function bigDipper(): LevelDef {
  const P = dipperPlan();
  const last = P.roads[P.roads.length - 1];
  return {
    id: 'bigdipper',
    name: 'The Big Dipper',
    blurb: 'The dream\'s long ride: two minutes downhill on the shield, jumps, ribbons of light to grind, and three stops to fight at.',
    theme: 'cave',
    motes: 'stars',
    music: 'dream',
    sky: 'space',
    look: 'dream',
    fog: 0x1a0c3a,
    fogRange: [70, 195],
    fallDepth: DIP_FALL,
    solids: P.solids.map((b) => ({ ...b })),
    pit: null,
    water: [],
    decor: P.decor.map((d) => ({ ...d })),
    gates: P.gates.map((g) => ({ ...g })),
    spawn: { x: 0, y: P.headY, z: -6, facing: 0 },
    collectibles: P.collectibles.map((c) => ({ ...c })),
    crateContents: [],
    enemies: P.enemies.map((e) => ({ ...e })),
    dozers: P.dozers.map((d) => ({ ...d })),
    waves: [],
    gear: [],
    goals: [],
    exit: { x: last.x, z: P.bowl.z1 - 0.5, yaw: Math.PI, width: 2.6, height: 3.8, y: 0 },
    returnTo: 'garden',
  };
}

/**
 * A rider, for the tests and the films (`&autoride`): he gets on his shield off the lip he stands by, keeps to the
 * middle of each road, jumps every gap from its lip (from the kicker where there is one), takes the nearest light
 * rail at a crossing, and at a pad or the Bowl brakes and steps off. What it gives each step is what the pad would.
 * `tuck`: he holds the stick forward the whole way (TUNING.ride.tuckMax).
 */
export function makeDipRide(tuck = false): (p: { position: { x: number; y: number; z: number }; velocity: { x: number; z: number }; grounded: boolean; riding: boolean; grinding: boolean }) => { x: number; z: number; jumpPressed: boolean; jumpHeld: boolean; attackPressed: boolean; stowPressed: boolean; dodgePressed: boolean } {
  const P = dipperPlan();
  const done = new Set<number>();
  let tick = 0;
  return (p) => {
    const none = { x: 0, z: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, stowPressed: false, dodgePressed: false };
    const z = p.position.z;
    const ri = P.roads.findIndex((l) => z >= l.z0 - 0.5 && z <= l.z1);
    const here = ri >= 0 ? P.roads[ri] : undefined;
    const next = P.roads.find((l) => l.z0 > z);
    const onFlat = !here && !p.riding && p.grounded;
    if (p.grinding) return none;
    // On a pad's floor, or the Bowl's: brake (the stick against the way he is going), and step off when he is slow.
    const pad = P.pads.find((q) => z >= q.z0 && z <= q.z1 + 1);
    if (pad || z >= P.bowl.z0) {
      // (Off his shield on a pad: he makes for its gate, and through it when it is open.)
      if (!p.riding) return pad ? { ...none, x: Math.max(-1, Math.min(1, (pad.x - p.position.x) / 2)), z: 1 } : none;
      const speed = Math.hypot(p.velocity.x, p.velocity.z);
      return { ...none, x: speed > 0.1 ? -p.velocity.x / speed : 0, z: speed > 0.1 ? -p.velocity.z / speed : 0, dodgePressed: speed < 4 && p.grounded };
    }
    if (!p.riding) {
      // On a flat (the head, a lip beyond a gate) or put back on a road: walk on, jump, and get on the shield in the air.
      const lip = next && onFlat ? next.z0 : null;
      const jump = p.grounded && (lip === null ? !!here : z > lip - 0.6);
      // (Over the slope, not over the flat he jumped from: there the air attack is the dive, not the shield.)
      const ride = !p.grounded && z > (lip ?? here?.z0 ?? z) + 0.3;
      // (A press, and another a third of a second on if the first came to nothing: he may have been picking himself up.)
      tick = jump ? tick + 1 : 0;
      const out = { ...none, z: 1, jumpPressed: jump && tick % 20 === 1, attackPressed: ride };
      return out;
    }
    tick = 0;
    const going = Math.atan2(p.velocity.x, p.velocity.z);
    const toEnd = here ? here.z1 - z : 99;
    let aimX = (here ?? next)?.x ?? 0;
    if (here && here.end === 'rail' && here.railX && toEnd < 20) aimX = here.railX.reduce((a, b) => (Math.abs(b - p.position.x) < Math.abs(a - p.position.x) ? b : a));
    else if (here && here.end === 'gap' && toEnd < 16) aimX = here.kick ? here.x : (here.x + here.nextX) / 2;
    else if (!here && next) aimX = next.x;
    const want = Math.max(-0.35, Math.min(0.35, (aimX - p.position.x) / 5));
    const steer = p.grounded ? Math.max(-0.8, Math.min(0.8, (want - going) * 4)) : 0;
    // (`tuck`: the stick held forward all the way down, crouched for speed, as a player in a hurry would.)
    const out = { ...none, x: steer, z: tuck ? 1 : 0, jumpHeld: !p.grounded };
    if (here && p.grounded && !done.has(ri)) {
      if (here.end === 'gap' && toEnd < 0.7) { done.add(ri); return { ...out, jumpPressed: true }; }
      if (here.end === 'rail' && toEnd < 2.2) { done.add(ri); return { ...out, stowPressed: true }; }
    }
    // (In the air past a rail crossing's lip without having got on: reach for it again.)
    if (!p.grounded && !here && next) {
      const prev = [...P.roads].reverse().find((l) => l.z1 < z);
      if (prev?.end === 'rail') return { ...out, stowPressed: true };
    }
    return out;
  };
}
