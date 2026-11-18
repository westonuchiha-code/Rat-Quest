/**
 * THE HALL: the hub. One long hallway, everyone in the game standing about in it, and a door to every test room.
 *
 * The owner, 2026-11-17: "I also want to create one big Hub world, it should be pretty simple, it'll just be a long
 * hallway where NPCs are all hanging out kind of like Dizzy Dave's room already is, except this one's going to be much
 * longer and it's going to have a door to each different test room ... this hallway will have all the NPCs in the game,
 * if we come up with new ones they will join the crowd in the hallway, then we will have a door for each different
 * world ... doors to specific boss fights ... each different enemy type to have a room".
 *
 * It runs east from where he comes in (x). Doors stand every `STEP` along both walls:
 *   NORTH wall (his left): the test rooms, 1 upward from the west end; then a gap; then the boss rooms.
 *   SOUTH wall (his right): a practice room for each kind of enemy.
 *   The east end: Dizzy Dave and his speakers.
 * WHAT IS BEHIND WHICH DOOR IS NOT WRITTEN HERE: it is laid out from the lists in testRooms.ts. A new room is a new
 * line there. A new character is a new line in `CROWD` here (or in the Club's cast, which is taken whole).
 *
 * A door's sign: its biome (a placeholder), and under it "TEST ROOM N". No door here asks for anything.
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import { junction } from './junction';
import { doorOn } from '../world/rooms';
import type { Decor } from '../world/layout';
import type { NpcSpec } from '../npc/npc';
import type { CourseDoorDef, LevelDef } from './types';
import { BOSS_ROOMS, HALL_ID, PRACTICE_ROOMS, ROOMS, roomName } from './testRooms';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

/** How far apart its doors stand (a sign is five and a half wide), and how wide the hallway is. */
const STEP = 7;
const HZ = 7;
/** How many door places a wall needs: the rooms, a gap, the bosses (north); the practice rooms (south). */
const NORTH = ROOMS.length + 1 + BOSS_ROOMS.length;
const PLACES = Math.max(NORTH, PRACTICE_ROOMS.length);
/** Past the last door: Dave's end. Before the first: where he comes in. */
const LEAD = 6;
const STAGE = 8;
const HX = (LEAD + (PLACES - 1) * STEP + LEAD + STAGE) / 2;
/** Where the door in place `i` is, along the hall. */
const placeX = (i: number): number => -HX + LEAD + i * STEP;
export const HALL = { halfX: HX, halfZ: HZ, step: STEP, placeX, stageX: HX - STAGE } as const;

/** The fire by the way in: rest here (heals, saves). */
export const HALL_FIRE = { x: -HX + 2.2, y: 0, z: 4.2 };

/** Every door in the Hall, in the order of the lists. */
export function hallDoors(): CourseDoorDef[] {
  const doors: CourseDoorDef[] = [];
  ROOMS.forEach((r, i) => doors.push({ to: r.id, name: r.door ?? roomName(r.n), under: r.door ? roomName(r.n).toUpperCase() : 'NO NAME YET', need: 0, door: doorOn('north', HX, placeX(i), HZ, 0) }));
  BOSS_ROOMS.forEach((b, i) => doors.push({ to: b.id, name: b.door, under: 'BOSS ROOM', need: 0, door: doorOn('north', HX, placeX(ROOMS.length + 1 + i), HZ, 0) }));
  PRACTICE_ROOMS.forEach((p, i) => doors.push({ to: p.id, name: p.door, under: 'PRACTICE', need: 0, door: doorOn('south', HX, placeX(i), HZ, 0) }));
  return doors;
}

/**
 * THE CROWD: who stands where. Everyone from the Club is here (their words are the Club's: all of it is a placeholder),
 * in twos and threes between the doors, clear of every door and of the middle of the hall, which is left to run down.
 * `slot`: between door places `slot` and `slot + 1`. `side`: -1 the north half of the hall, 1 the south.
 * `with`: whom he is turned to (another name in this list); nobody, and he faces across the hall.
 */
interface Standing { name: string; slot: number; side: -1 | 1; with?: string; lean?: boolean; /** Not between doors: just here, facing this way. */ at?: [number, number, number]; /** At the Hall's bar: keeping it, or on a stool before it (`barPlace`). */ bar?: 'keep' | 'stool' }
const CROWD: Standing[] = [
  // (The doorman: against the end wall by the way in, looking down the hall.)
  { name: 'Sir Hobnail', slot: 0, side: -1, at: [-HX + 1.3, -4.2, Math.PI / 2] },
  { name: 'Pip', slot: 0, side: 1 },
  { name: 'Finch', slot: 1, side: -1, with: 'Wren' },
  { name: 'Wren', slot: 1, side: -1, with: 'Finch' },
  { name: 'Mossback Mo', slot: 2, side: 1, with: 'Pebble' },
  { name: 'Pebble', slot: 2, side: 1, with: 'Mossback Mo' },
  { name: 'Mellow Mort', slot: 4, side: -1 },
  { name: 'Vix', slot: 5, side: 1, with: 'Ash' },
  { name: 'Ash', slot: 5, side: 1, with: 'Vix' },
  { name: 'Biscuit', slot: 6, side: -1, lean: true },
  // (At the Hall's bar, 2026-11-18: she keeps it, as she keeps the Club's; he is on a stool before it, with a thimble.)
  { name: 'Madam Tawny', slot: 0, side: 1, bar: 'keep' },
  { name: 'Slink', slot: 0, side: 1, bar: 'stool' },
  { name: 'Professor Snow', slot: 9, side: -1, with: 'Corporal Nib' },
  { name: 'Corporal Nib', slot: 9, side: -1, with: 'Professor Snow' },
  // (He stands by his own door, the second of the boss rooms.)
  { name: 'Lord Grimsqueak', slot: ROOMS.length + 2, side: -1 },
];
/** How far out from the middle of the hall they stand, and how far apart two who are talking. */
const ROW = 3;
const APART = 0.9;

/** Where the bar's keeper stands (behind its middle, between it and the wall) and where its middle stool is. */
function barPlace(who: 'keep' | 'stool'): [number, number] {
  const D = HALL_DRESS.bar;
  const bx0 = placeX(D.from) - 1;
  const bx1 = placeX(D.to) + 1;
  if (who === 'keep') return [(bx0 + bx1) / 2, HZ - D.out + D.deep + 0.7];
  const stools = barStools();
  return stools[Math.floor(stools.length / 2)];
}
/** The stools before the bar, every two along it. */
function barStools(): Array<[number, number]> {
  const D = HALL_DRESS.bar;
  const bx0 = placeX(D.from) - 1;
  const bx1 = placeX(D.to) + 1;
  const out: Array<[number, number]> = [];
  for (let x = bx0 + 1; x <= bx1 - 0.9; x += 2) out.push([x, HZ - D.out - 0.8]);
  return out;
}

function crowd(): NpcSpec[] {
  // (By name, whatever its letters' case: those the Club's kit places are written in capitals.)
  const cast = new Map((junction().npcs ?? []).map((n) => [n.name.toUpperCase(), n]));
  const where = (s: Standing): [number, number] => {
    if (s.bar) return barPlace(s.bar);
    if (s.at) return [s.at[0], s.at[1]];
    const mid = placeX(s.slot) + STEP / 2;
    if (s.lean) return [mid, s.side * (HZ - 0.55)];
    if (!s.with) return [mid, s.side * ROW];
    // (Two who talk: either side of the spot, along the hall. Which is which goes by the list.)
    const first = CROWD.findIndex((c) => c.name === s.name) < CROWD.findIndex((c) => c.name === s.with);
    return [mid + (first ? -APART : APART), s.side * ROW];
  };
  const out: NpcSpec[] = [];
  for (const s of CROWD) {
    const from = cast.get(s.name.toUpperCase());
    if (!from) continue;
    const [x, z] = where(s);
    const other = s.with ? CROWD.find((c) => c.name === s.with) : undefined;
    const partner = other ? where(other) : undefined;
    // He is turned to whoever he is with; leaning, his back is to the wall; alone, he looks across the hall.
    const keeper = barPlace('keep');
    // (Behind the bar she faces the hall; on his stool he faces her.)
    const facing = s.bar === 'keep' ? Math.PI : s.bar === 'stool' ? Math.atan2(keeper[0] - x, keeper[1] - z) : s.at ? s.at[2] : partner ? Math.atan2(partner[0] - x, partner[1] - z) : s.side < 0 ? 0 : Math.PI;
    const patron = from.doing !== undefined;
    // (Everyone is here from the start: the Hall is where the whole cast is LOOKED AT, earned or not. Nobody is sitting
    // but the one on a stool at the bar.)
    const { when: _when, hidden: _hidden, seated: _seated, partner: _partner, turn: _turn, doing: _doing, auto: _auto, ...rest } = from;
    out.push({
      ...rest, x, z, y: s.bar === 'keep' ? HALL_DRESS.bar.step : 0, facing,
      lines: from.lines.length ? from.lines : ['...'],
      ...(patron && s.bar === 'keep' ? { doing: 'tend' } : patron && s.bar === 'stool' ? { doing: 'drink', seated: true, partner: keeper } : patron ? { doing: s.lean ? 'lean' : partner ? 'chat' : 'stand', ...(partner ? { partner, turn: where(s)[0] < partner[0] ? 0 : 1 } : {}) } : {}),
    } as NpcSpec);
  }
  return out;
}

/**
 * WHAT DRESSES THE HALL (BACKLOG B7, 2026-11-18: "banners, benches, something at the east end beside Dave"; the south
 * wall's east end has no doors). All of it from the editor's own pieces, so it is moved here and nowhere else:
 *  - a BANNER over each torch, both walls, colours in turn;
 *  - a BENCH against the wall between each two doors where nobody leans (a plank seat, knee high: he can hop up);
 *  - along the empty east end of the south wall, by the dance floor and Dave's stage, a BAR with stools before it;
 *  - and two TABLES with stools between the bar and the last practice door.
 */
export const HALL_DRESS = {
  bench: { len: 2.4, deep: 0.6, high: 0.45 },
  /** The bar: along the south wall from this door place to that one, its front this far from the wall. */
  bar: { from: 13, to: 15, out: 2.4, deep: 1, /** The step behind it, from it to the wall, that its keeper stands on to see over (as in the Club). */ step: 0.45 },
  tables: [11.5, 12.6],
} as const;
const BANNER_TURN = ['purple', 'red', 'gold', 'blue', 'green'] as const;
function dressing(): Piece[] {
  const D = HALL_DRESS;
  const out: Piece[] = [];
  // (A slot is the wall between door places i and i + 1; those with someone leaning there are left bare.)
  const leaning = new Set(CROWD.filter((c) => c.lean).map((c) => `${c.slot}:${c.side}`));
  for (let i = 0; i < PLACES - 1; i++) {
    const mid = placeX(i) + STEP / 2;
    for (const side of [-1, 1] as const) {
      out.push(at('banner', mid, side * (HZ - 0.08), 7.6, { dir: side < 0 ? 'n' : 's', props: { color: BANNER_TURN[(i + (side > 0 ? 2 : 0)) % BANNER_TURN.length] } }));
      // (No bench along the bar, nor where someone leans.)
      const underBar = side > 0 && mid > placeX(D.bar.from) - 1.5 && mid < placeX(D.bar.to) + 1.5;
      if (leaning.has(`${i}:${side}`) || underBar) continue;
      const z0 = side * (HZ - 0.1);
      const z1 = side * (HZ - 0.1 - D.bench.deep);
      out.push(box('plank', mid - D.bench.len / 2, Math.min(z0, z1), mid + D.bench.len / 2, Math.max(z0, z1), D.bench.high, { bottom: 0 }));
    }
  }
  // The bar, and a stool before it every two along.
  const bx0 = placeX(D.bar.from) - 1;
  const bx1 = placeX(D.bar.to) + 1;
  out.push(box('bar', bx0, HZ - D.bar.out, bx1, HZ - D.bar.out + D.bar.deep, 0));
  out.push(box('platform', bx0, HZ - D.bar.out + D.bar.deep, bx1, HZ, D.bar.step, { bottom: 0 }));
  for (const [x, z] of barStools()) out.push(at('stool', x, z));
  // Two tables, each with three stools round it.
  for (const t of D.tables) {
    const x = placeX(t);
    out.push(at('table', x, 4.4, 0, { props: { mugs: 2, candle: true } }));
    for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) out.push(at('stool', x + Math.sin(a) * 1.3, 4.4 + Math.cos(a) * 1.3));
  }
  // Odds and ends: a candle stub and a matchbox on the bar, a wheel of cheese and a sardine tin between the tables, a cotton reel by the first.
  out.push(at('candle', bx0 + 0.6, HZ - D.bar.out + D.bar.deep / 2, 1));
  out.push(at('matchbox', bx0 + 1.6, HZ - D.bar.out + D.bar.deep / 2, 1, { dir: 'e' }));
  const between = (placeX(D.tables[0]) + placeX(D.tables[1])) / 2;
  out.push(at('cheese', between, 4.4));
  out.push(at('sardines', between, 6.4));
  out.push(at('spool', placeX(D.tables[0]) - 2.4, 6.4));
  return out;
}

export function hall(): LevelDef {
  const dave = junction().npcs?.find((n) => n.name.toUpperCase() === 'DIZZY DAVE');
  const jinx = junction().npcs?.find((n) => n.name.toUpperCase() === 'JINX');
  const stage = HX - STAGE + 2.5;
  const room: CustomLevel = {
    name: 'The Hall',
    blurb: 'A long hallway: everyone is here, and every door leads to a test room.',
    theme: 'dungeon',
    music: 'groove',
    width: HX * 2, depth: HZ * 2, wallHeight: 9,
    pieces: [
      box('floor', -HX, -HZ, HX, HZ, 0),
      at('spawn', -HX + 2.5, 0),
      at('exit', -HX, 0),
      // The fire by the way in, to rest at.
      at('brazier', HALL_FIRE.x, HALL_FIRE.z),
      // Dave's end: a low stage across the hall, steps up to it, his speakers.
      box('platform', stage, -HZ, HX, HZ, 0.8, { bottom: 0 }),
      box('stairs', stage - 2.4, -2, stage, 2, 0.8, { dir: 'e', bottom: 0 }),
      at('speaker', HX - 1.6, -4.6, 0.8, { dir: 'w' }), at('speaker', HX - 1.6, 4.6, 0.8, { dir: 'w' }),
      at('light', HX - 1, -2, 0.8, { props: { color: 'blue' } }), at('light', HX - 1, 2, 0.8, { props: { color: 'purple' } }),
      // A torch on the wall between each two doors, both sides; lamps down the middle.
      ...Array.from({ length: PLACES - 1 }, (_, i) => [at('torch', placeX(i) + STEP / 2, -HZ + 0.3, 3.2, { dir: 'n' }), at('torch', placeX(i) + STEP / 2, HZ - 0.3, 3.2, { dir: 's' })]).flat(),
      ...Array.from({ length: Math.floor(PLACES / 2) }, (_, i) => at('lamp', placeX(i * 2) + STEP, 0, 6.5)),
      ...dressing(),
    ],
  };
  const base = compileCustom(room, HALL_ID);
  const decor: Decor[] = [
    // A runner down the middle, in lengths.
    ...Array.from({ length: Math.floor((PLACES - 1) / 2) }, (_, i): Decor => ({ kind: 'rug', x: placeX(i * 2) + STEP, y: 0, z: 0, yaw: Math.PI / 2, w: 2.2, d: STEP * 2 - 1.5, colors: [0x6a2a3a, 0x8a3a4a, 0xd8b060] })),
    { kind: 'dancefloor', x: stage - 6, y: 0, z: 0, nx: 3, nz: 6, tile: 1.4, colors: [0x7a2a6a, 0x1f6a72] },
    // Which wall is which, where he comes in.
    { kind: 'sign', x: -HX + 4.4, y: 1.5, z: -HZ + 0.05, yaw: 0, w: 2.8, h: 1.4, lines: ['TEST ROOMS', 'THIS WALL'], post: 0 },
    { kind: 'sign', x: -HX + 4.4, y: 1.5, z: HZ - 0.05, yaw: Math.PI, w: 2.8, h: 1.4, lines: ['PRACTICE', 'THIS WALL'], post: 0 },
  ];
  const onStage = (n: NpcSpec | undefined, z: number): NpcSpec[] => (n ? [{ ...n, x: HX - 3.4, z, y: 0.8, facing: -Math.PI / 2, auto: undefined, hidden: undefined, when: undefined }] : []);
  return {
    ...base,
    // He comes in at the west end, looking down the hall.
    spawn: { ...base.spawn, facing: Math.PI / 2 },
    decor: [...base.decor, ...decor],
    npcs: [...crowd(), ...onStage(dave, 0), ...onStage(jinx, 2.6)],
    theme: 'dungeon',
    // Home: no way out of its own, nothing asked of him; its doors are all there is to do.
    goals: [],
    hub: true,
    courseDoors: hallDoors(),
    restSpot: HALL_FIRE,
  };
}
