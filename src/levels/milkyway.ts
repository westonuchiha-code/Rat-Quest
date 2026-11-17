/**
 * THE MILKY WAY: the dream, as a TRY-OUT ROOM. A rainbow road downhill through space, ridden on the shield.
 *
 * The owner, 2026-11-16: "A dream level: he's like surfing on the Milky Way in outer space like some kind of downhill
 * like rainbow road ... slide down on his shield ... a full sliding level ... everything could be like crazy colors
 * ... stars and planets ... he could be like neon pink and green ... a wacky Pomo palette kind of version of himself
 * and maybe his scarf is like crazy exaggerated like [Viewtiful] Joe ... a Trippy psychedelic dream level."
 * (And his rule for themes: shown IN THE RUNNING GAME, in a room to try, not on a sheet of swatches. This is that.)
 *
 * WHAT IT IS: a pad at the top (the road runs across it to a gate at its lip; a kerb round the rest), then four lengths of road one after another down through the sky, each as steep as
 * the Long Drop's beds, with a GAP between each and the next length set a little to one side: he rides off the end
 * of one, through the air, onto the next. A landing at the bottom (the Moon) with the way out. No walls anywhere:
 * off the side of the road is a long fall, and he is put back on the road where he last was, a heart the poorer.
 * Three bottle caps, one in the air over each gap, up where a jump off the board at the lip carries him.
 * SECOND PASS (2026-11-16, his notes): its kerbs are in STATIC that winks (`dreamStatic`); beds of flowers with
 * butterflies stand either side of the head pad and down the Moon; and the waking world's terrors are here in loud
 * colours, asleep or standing about, harmless (`dozers`: world/dozers.ts).
 * The sky is a dome of stars (`sky: 'space'`), planets hang about the road (decor `planet`), and he wears the dream's
 * colours and a scarf three times as long (`look: 'dream'`). All of that is only looks: the ride is the ride.
 */
import type { LevelDef } from './types';
import { extent, rampBox, type Box, type Decor } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { dozerSolids, type DozerSpec } from '../world/dozers';

/** The road: how wide (its picture is laid one rainbow to this width: `TILE.rainbowRoad` in chamber.ts), how thick, how steep. */
export const ROAD = { wide: 7, deep: 1.2, slope: 0.42 } as const;
/**
 * The lengths of road, top to bottom: how long, and how far to one side of the middle line its own middle is.
 * After each but the last, a gap: how wide, and how far the next length starts BELOW where this one's line would
 * have been there. (At the road's speed he falls two below that line in crossing six; the next length starts over
 * three below it, so a ride at speed lands on it without a jump, and a slower one needs the jump off the board.)
 */
export const LENGTHS: ReadonlyArray<{ len: number; x: number; gap?: { wide: number; under: number } }> = [
  { len: 56, x: 0, gap: { wide: 6, under: 3.2 } },
  { len: 48, x: 2.5, gap: { wide: 6, under: 3.2 } },
  { len: 40, x: -2.5, gap: { wide: 7, under: 3.8 } },
  { len: 60, x: 0 },
];
/** The pad at the top, the easing-out at the bottom, and the Moon: the landing. */
export const HEAD = { half: 9, long: 10 } as const;
/** The gate over the lip of the pad: how thick its posts are, how high the beam's underside is, how deep the beam. */
export const GATE = { post: 1, tall: 5.2, beam: 1 } as const;
export const RUNOUT = { len: 18, fall: 2.2 } as const;
export const MOON = { half: 11, long: 26, kerb: 2.6 } as const;
/** Fallen this far below the last ground he stood on, he is put back on it. */
export const FALL_DEPTH = 28;
export const WAY_PRIZES = ['way-cap-1', 'way-cap-2', 'way-cap-3'] as const;
/** How far over a gap's lip its bottle cap hangs: his middle, at the middle of the gap, when he has jumped off the board at the lip (measured: his feet are 0.8 over the lip there; rolled off without a jump they are 1.6 under it). */
export const CAP_UP = 1.35;

export interface WayLength { z0: number; z1: number; y0: number; y1: number; x: number }
interface Plan { solids: Box[]; decor: Decor[]; collectibles: CollectibleDef[]; dozers: DozerSpec[]; lengths: WayLength[]; headY: number; moon: { z0: number; z1: number } }
let plan: Plan | null = null;

function build(): Plan {
  // First down from the top, measured from 0; then all of it lifted so the Moon is at 0.
  let fall = 0;
  for (const s of LENGTHS) fall += s.len * ROAD.slope + (s.gap ? s.gap.wide * ROAD.slope + s.gap.under : 0);
  const headY = fall + RUNOUT.fall;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const collectibles: CollectibleDef[] = [];
  const lengths: WayLength[] = [];
  const road = (b: Box): Box => ({ ...b, skin: 'rainbowRoad' });
  const tiles = (b: Box): Box => ({ ...b, skin: 'pomoTiles' });
  // (The kerbs are in the dream's STATIC: a fine busy noise of colour, some of whose dots wink. The owner, 2026-11-16:
  // "some of the digital textures look kind of cool and also the little bit of blinking".)
  const fuzz = (b: Box): Box => ({ ...b, skin: 'dreamStatic' });
  const dozers: DozerSpec[] = [];
  const half = ROAD.wide / 2;

  // THE HEAD. (The owner, 2026-11-16, of the first one, a bare pad twice as wide as the road: "I can't really figure out
  // what to do ... I walked off every ledge I just fall down I've tried to do jumps of leaps of faith in different
  // directions which just kills me and there's no door to go back so it feels like a soft lock". From the pad the
  // road could not be seen at all: it falls away below its lip. And nearly half of that lip had nothing under it.)
  // So: the ROAD ITSELF runs back across the pad to where he comes in, a rainbow under his feet that leads to the lip;
  // a kerb stands round every edge of the pad but the road's own width; and a gate stands over the lip, to go through.
  solids.push(road(extent('stone', -half, half, headY - ROAD.deep, headY, -HEAD.long, 0)));
  for (const s of [-1, 1]) solids.push(tiles(extent('stone', s < 0 ? -HEAD.half : half, s < 0 ? -half : HEAD.half, headY - ROAD.deep, headY, -HEAD.long, 0)));
  const kerbs: Array<[number, number, number, number]> = [
    [-HEAD.half - 1, HEAD.half + 1, -HEAD.long - 1, -HEAD.long],
    [-HEAD.half - 1, -HEAD.half, -HEAD.long, 0], [HEAD.half, HEAD.half + 1, -HEAD.long, 0],
    [-HEAD.half - 1, -half - GATE.post, 0, 1], [half + GATE.post, HEAD.half + 1, 0, 1],
  ];
  for (const [x0, x1, z0, z1] of kerbs) solids.push(fuzz(extent('stone', x0, x1, headY - ROAD.deep, headY + MOON.kerb, z0, z1)));
  // The garden either side of the road: a bed of flowers with butterflies over it, and in the middle of each bed one
  // of the waking world's terrors, fast asleep. (The owner: "butterflies and flowers would fit really good here and
  // maybe ... some of the scarier ones ... wacky Pomo sort of psychedelic versions that are just kind of chilled out
  // here and sleeping and hanging out".) Each sleeper is solid, and well off the road.
  const bedX = (half + HEAD.half) / 2;
  for (const s of [-1, 1]) {
    decor.push({ kind: 'flowers', x: s * bedX, y: headY, z: -5.4, w: HEAD.half - half - 1.1, d: 7.4, seed: s < 0 ? 3 : 8 });
    decor.push({ kind: 'butterflies', x: s * bedX, y: headY + 1.3, z: -5.4, r: 1.9, count: 3 });
  }
  dozers.push({ type: 'mantis', x: -bedX, y: headY, z: -6.2, facing: 0.9 }, { type: 'scorpion', x: bedX, y: headY, z: -6, facing: -1.1 });
  // The gate: a post either side of the road at the lip and a beam across their tops, all in the road's rainbow.
  for (const s of [-1, 1]) solids.push(road(extent('stone', s < 0 ? -half - GATE.post : half, s < 0 ? -half : half + GATE.post, headY - ROAD.deep, headY + GATE.tall, 0, 1)));
  solids.push(road(extent('stone', -half - GATE.post, half + GATE.post, headY + GATE.tall, headY + GATE.tall + GATE.beam, 0, 1)));
  decor.push({ kind: 'sign', x: -half - 0.6, y: headY + 1.7, z: -2.4, yaw: Math.PI, w: 3.6, h: 2, lines: ['THE MILKY WAY', 'JUMP, THEN ATTACK', 'TO RIDE THE SHIELD'], post: 0 });

  let z = 0;
  let y = headY;
  LENGTHS.forEach((s, i) => {
    const y1 = y - s.len * ROAD.slope;
    // (A ramp that climbs north: high at its -z end. Its underside follows it down: it is a slab, not a wedge to the ground.)
    solids.push(road(rampBox('stone', s.x - half, s.x + half, z, z + s.len, y1, y, 'n', y1 - ROAD.deep)));
    lengths.push({ z0: z, z1: z + s.len, y0: y, y1, x: s.x });
    z += s.len;
    y = y1;
    if (s.gap) {
      const next = LENGTHS[i + 1];
      // The bottle cap: in the air over the middle of the gap, on the line down the middle of what this length and
      // the next have in common (the next is set to one side: that strip is where a rider goes from one to the
      // other), and up where a JUMP OFF THE BOARD at the lip carries him (`CAP_UP` over the lip: a ride that only
      // rolls off the end passes well under it). Earned by the jump, and by having lined up for the crossing.
      collectibles.push({ id: WAY_PRIZES[i], kind: 'cap', x: (s.x + next.x) / 2, y: y + CAP_UP, z: z + s.gap.wide / 2 });
      z += s.gap.wide;
      y -= s.gap.wide * ROAD.slope + s.gap.under;
    }
  });
  // The easing-out, and the Moon: a wide landing with a kerb round its far end to stop him.
  solids.push(road(rampBox('stone', -half, half, z, z + RUNOUT.len, 0, y, 'n', -ROAD.deep)));
  lengths.push({ z0: z, z1: z + RUNOUT.len, y0: y, y1: 0, x: 0 });
  z += RUNOUT.len;
  const moon = { z0: z, z1: z + MOON.long };
  solids.push(tiles(extent('stone', -MOON.half, MOON.half, -ROAD.deep, 0, moon.z0, moon.z1)));
  for (const [x0, x1, z0, z1] of [[-MOON.half, MOON.half, moon.z1, moon.z1 + 1], [-MOON.half - 1, -MOON.half, moon.z0 + MOON.long * 0.45, moon.z1 + 1], [MOON.half, MOON.half + 1, moon.z0 + MOON.long * 0.45, moon.z1 + 1]]) {
    solids.push(fuzz(extent('stone', x0, x1, -ROAD.deep, MOON.kerb, z0, z1)));
  }
  // The Moon's garden: beds down both sides of the landing, clear of the middle where he comes in at speed. A Stag
  // Knight kneels asleep on its hammer in one; another stands about in the other, and a mantis by the way out.
  for (const s of [-1, 1]) {
    decor.push({ kind: 'flowers', x: s * 7.4, y: 0, z: moon.z0 + 14, w: 5.6, d: 14, seed: s < 0 ? 5 : 11 });
    decor.push({ kind: 'butterflies', x: s * 7.4, y: 1.4, z: moon.z0 + 11, r: 2.4, count: 3 });
    decor.push({ kind: 'butterflies', x: s * 7, y: 1.6, z: moon.z0 + 18, r: 2.2, count: 2 });
  }
  dozers.push(
    { type: 'stag', x: -7.4, y: 0, z: moon.z0 + 12, facing: 1.2 },
    { type: 'stag', x: 7.6, y: 0, z: moon.z0 + 16, facing: -1.5, awake: true },
    { type: 'mantis', x: 6.4, y: 0, z: moon.z0 + 9, facing: -0.8, awake: true },
    { type: 'scorpion', x: -6.8, y: 0, z: moon.z0 + 18.5, facing: 1.9 },
  );
  for (const dz of dozers) solids.push(...dozerSolids(dz));

  // Planets, hanging about the road: none nearer than he can ever get, each its own two colours. [x, y above the road there, z, r, colour, band, ring]
  const at = (zz: number): number => {
    const l = lengths.find((q) => zz <= q.z1) ?? lengths[lengths.length - 1];
    return l.y0 + ((l.y1 - l.y0) * Math.max(0, Math.min(1, (zz - l.z0) / (l.z1 - l.z0))));
  };
  const planets: Array<[number, number, number, number, number, number, [number, number] | null, number]> = [
    [-46, 6, 40, 13, 0xff5ab4, 0xffe84a, [1.9, 0x3ee8c0], 0.45],
    [38, -14, 86, 8, 0x3ee8c0, 0x7a5cff, null, 0.2],
    [-30, -22, 150, 6, 0xffe84a, 0xff8a1e, null, -0.3],
    [52, 10, 170, 17, 0x7a5cff, 0x2ad8ff, [2.1, 0xff5ab4], -0.5],
    [-58, -6, 236, 10, 0x2ad8ff, 0xff5ab4, [1.7, 0xffe84a], 0.7],
    [24, 26, 12, 4, 0xff8a1e, 0xff2a6a, null, 0.1],
    [0, -34, moon.z1 + 46, 20, 0xff2a6a, 0xffe84a, [1.8, 0x7a5cff], 0.25],
  ];
  for (const [x, up, zz, r, color, band, ring, tilt] of planets) decor.push({ kind: 'planet', x, y: at(Math.min(zz, moon.z0)) + up, z: zz, r, color, band, ring: ring ? { out: ring[0], color: ring[1] } : undefined, tilt });

  return { solids, decor, collectibles, dozers, lengths, headY, moon };
}
export function milkyWayPlan(): Plan {
  return (plan ??= build());
}
/** How high the road is at z, and where its middle is across (the length he is over, or the one he is coming to). */
export function wayAt(z: number): { y: number; x: number } {
  const P = milkyWayPlan();
  const l = P.lengths.find((q) => z <= q.z1) ?? P.lengths[P.lengths.length - 1];
  const t = Math.max(0, Math.min(1, (z - l.z0) / (l.z1 - l.z0)));
  return { y: l.y0 + (l.y1 - l.y0) * t, x: l.x };
}

export function milkyWay(): LevelDef {
  const P = milkyWayPlan();
  return {
    id: 'milkyway',
    name: 'The Milky Way',
    blurb: 'A try-out of the dream: a rainbow road downhill through the stars, on the shield.',
    theme: 'cave',
    motes: 'stars',
    music: 'groove',
    sky: 'space',
    look: 'dream',
    fog: 0x1a0c3a,
    fogRange: [70, 195],
    fallDepth: FALL_DEPTH,
    solids: P.solids.map((b) => ({ ...b })),
    pit: null,
    water: [],
    decor: P.decor.map((d) => ({ ...d })),
    spawn: { x: 0, y: P.headY, z: -6, facing: 0 },
    collectibles: P.collectibles.map((c) => ({ ...c })),
    crateContents: [],
    enemies: [],
    dozers: P.dozers.map((d) => ({ ...d })),
    waves: [],
    gear: [],
    goals: [],
    // The way out stands at the far end of the Moon, before the kerb, and leads back to the Move Garden.
    exit: { x: 0, z: P.moon.z1 - 0.5, yaw: Math.PI, width: 2.6, height: 3.8, y: 0 },
    returnTo: 'garden',
  };
}

/**
 * A rider, for the films (the dev aid `&autoride`; tests/milkyway.ts rides with it too): from the head of the road he
 * walks to the lip, jumps, gets on his shield in the air, and then leans down the middle of each length, toward the
 * next one's as each ends, and jumps every gap. What it gives each step is what the pad would.
 */
export function makeAutoRide(): (p: { position: { x: number; y: number; z: number }; velocity: { x: number; z: number }; grounded: boolean; riding: boolean }) => { x: number; z: number; run: boolean; jumpPressed: boolean; jumpHeld: boolean; attackPressed: boolean } {
  const P = milkyWayPlan();
  let rode = false;
  const jumped = new Set<number>();
  return (p) => {
    rode ||= p.riding;
    if (!rode) return { x: 0, z: 1, run: false, jumpPressed: p.grounded && p.position.z > -0.6, jumpHeld: false, attackPressed: !p.grounded && p.position.z > 0.3 };
    const z = p.position.z;
    const here = P.lengths.find((l) => z >= l.z0 - 0.5 && z <= l.z1);
    const next = P.lengths.find((l) => l.z0 > z);
    const aimX = here && next && here.z1 - z < 16 ? (here.x + next.x) / 2 : (here ?? next)?.x ?? 0;
    const going = Math.atan2(p.velocity.x, p.velocity.z);
    const want = Math.max(-0.35, Math.min(0.35, (aimX - p.position.x) / 5));
    const li = here ? P.lengths.indexOf(here) : -1;
    const lip = !!here && li < LENGTHS.length - 1 && here.z1 - z < 0.7 && here.z1 - z >= 0 && p.grounded && !jumped.has(li);
    if (lip) jumped.add(li);
    return { x: p.grounded ? Math.max(-0.8, Math.min(0.8, (want - going) * 4)) : 0, z: 0, run: false, jumpPressed: lip, jumpHeld: !p.grounded, attackPressed: false };
  };
}
