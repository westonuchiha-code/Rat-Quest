// BOSS DUELS (2026-11-25): the bosses, and the Firefly Bomber, as fighting opponents for how the knight controls now.
// tests/duels.ts fights each small creature on open floor; this fights each of these IN ITS OWN ROOM, by its own rules
// (the level's floor and walls, the game's canStand / wallAt / canFly, the place's feel, the game's turn-taking, the
// real controller and resolveCombat, and whatever extras the game runs for it: Grimsqueak's bolts, rings, storm and orb
// and his summoned roaches; the Widows' young; the firefly's falling fire and flames). Four kinds of player:
//   the MASHER   walks at the nearest piece of it that can be struck and only swings.
//   the TURTLE   only holds his shield up, facing it.
//   the STATUE   does nothing. Every one of them must hurt him.
//   the SKILLED  does what the boss's own test file says the answer to each of its attacks is (see each `skilled`).
// Each fight runs up to 180 game seconds, three seeds each. The fight starts with him already close enough to wake it
// (so that the statue is in the fight too). The table is for reading; the only checks are that each boss hurts a knight
// who does nothing, and that a fight is the same fight every time it is run with the same seed.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type HitResult } from '../src/player/controller';
import { resolveCombat, resolveFlames, resolveGlobs, type CombatEvents } from '../src/combat/combat';
import { Director } from '../src/enemies/director';
import { Scuttler } from '../src/enemies/scuttler';
import { stepGlobs, type Glob } from '../src/enemies/toad';
import { Brood, BROOD } from '../src/enemies/brood';
import { Wyrm, WYRM } from '../src/enemies/wyrm';
import { Widow, WIDOW } from '../src/enemies/widow';
import { Grimsqueak, GRIM } from '../src/enemies/grimsqueak';
import { Firefly, FIREFLY } from '../src/enemies/firefly';
import { floorUnder, standsOn, wallOver } from '../src/enemies/footing';
import type { BodyPart, Foe } from '../src/enemies/foe';
import { buildChamber } from '../src/world/chamber';
import { topAt, type Aabb } from '../src/world/collision';
import { Flames, groundFrom, makeEmber, stepEmbers, type Ember, type GroundAt } from '../src/world/embers';
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { PIT_ARENA } from '../src/levels/hollows';
import { SUMP_ARENA } from '../src/levels/cisternHalls';
import type { LevelDef } from '../src/levels/types';
import { feelOf, type Feel } from '../src/data/feel';
import { TUNING } from '../src/data/tuning';
import { ATTACK_CLIPS } from '../src/player/animations';

const DT = 1 / 60;
const SECS = 180;
const SEEDS = [1, 2, 3];
const R = TUNING.rat.radius;
const REACH = ATTACK_CLIPS[0].reach;
type Bot = 'masher' | 'turtle' | 'statue' | 'skilled';
const BOTS: Bot[] = ['masher', 'turtle', 'statue', 'skilled'];
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const V = (x = 0, z = 0): THREE.Vector3 => new THREE.Vector3(x, 0, z);
/** A seeded rng (Park-Miller), the same each time for the same seed. */
function seeded(seed: number): () => number {
  let s = (seed * 104729 + 7) % 2147483647;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
type Pt = { x: number; z: number };
const far = (p: PlayerController, q: Pt): number => Math.hypot(q.x - p.position.x, q.z - p.position.z);
/** The way from him to (x, z), flat and of length one (or nothing, if he is there). */
function dirTo(p: PlayerController, x: number, z: number): THREE.Vector3 {
  const v = V(x - p.position.x, z - p.position.z);
  return v.length() > 1e-4 ? v.normalize() : V();
}
/** Walks (runs) him to within `near` of (x, z). */
function goTo(p: PlayerController, x: number, z: number, near: number): Partial<PlayerInput> {
  return far(p, { x, z }) > near ? { move: dirTo(p, x, z), run: true } : {};
}
/** Which side he chose for each dodge he is in the middle of (by its tag), and on which frame: he keeps to one side. */
let FRAME = 0;
const SIDES = new Map<string, { frame: number; sign: number }>();
/**
 * Of the two ways square to `heading`, the one that takes him nearer `mid`; once chosen, kept for as long as he goes on
 * stepping aside under that `tag` (frame after frame), or a tie would have him dither from one to the other.
 */
function aside(p: PlayerController, heading: number, mid: Pt, tag = 'aside'): THREE.Vector3 {
  const a = V(Math.cos(heading), -Math.sin(heading));
  const kept = SIDES.get(tag);
  let sign: number;
  if (kept && kept.frame >= FRAME - 1) sign = kept.sign;
  else {
    const there = (k: number): number => Math.hypot(p.position.x + a.x * k * 2 - mid.x, p.position.z + a.z * k * 2 - mid.z);
    sign = there(1) <= there(-1) + 1e-6 ? 1 : -1;
  }
  SIDES.set(tag, { frame: FRAME, sign });
  return a.multiplyScalar(sign);
}
/** Away from (x, z); if that runs him off toward the walls (past `room` from `mid`), toward the middle instead. */
function awayFrom(p: PlayerController, x: number, z: number, mid: Pt, room: number): THREE.Vector3 {
  const v = V(p.position.x - x, p.position.z - z);
  if (v.length() < 0.2) return dirTo(p, mid.x, mid.z).length() > 0 ? dirTo(p, mid.x, mid.z) : V(1, 0);
  v.normalize();
  if (Math.hypot(p.position.x + v.x * 3 - mid.x, p.position.z + v.z * 3 - mid.z) > room) {
    const s = aside(p, Math.atan2(v.x, v.z), mid, 'away');
    return s.add(v.multiplyScalar(0.3)).normalize();
  }
  return v;
}
/** Nearest of some pieces, edge to edge. */
function nearest<T extends BodyPart>(p: PlayerController, pieces: T[]): T | null {
  let best: T | null = null;
  let bd = Infinity;
  for (const q of pieces) {
    const d = far(p, q) - q.r;
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}
/** Walks up to a piece and swings at it (if `greedy` is false he holds off). */
function strikeAt(p: PlayerController, q: BodyPart, swing = true): Partial<PlayerInput> {
  if (far(p, q) - q.r > REACH - 0.15) return { move: dirTo(p, q.x, q.z), run: true };
  return swing ? { attackPressed: true } : {};
}

/** A room as the game has it: its colliders, and the game's own rules for where a creature stands, meets a wall, flies. */
interface Room { def: LevelDef; cols: Aabb[]; feel: Feel; movers: Set<object>; canStand: (x: number, y: number, z: number, r: number) => boolean; foeFloor: (x: number, y: number, z: number, r?: number) => number | null; wallAt: (x: number, y: number, z: number, r: number) => boolean; canFly: (x: number, y: number, z: number, r: number) => boolean; groundBelow: (x: number, y: number, z: number) => number | null }
function room(def: LevelDef): Room {
  const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], lava: def.lava, decor: [], movers: def.movers });
  const cols = ch.colliders;
  return {
    def,
    cols,
    feel: feelOf(def),
    movers: new Set(ch.movers.map((m) => m.aabb)),
    // (These are main.ts's own.)
    canStand: (x, y, z, r) => standsOn(cols, x, y, z, r),
    foeFloor: (x, y, z, r) => floorUnder(cols, x, y, z, r),
    wallAt: (x, y, z, r) => wallOver(cols, x, y, z, r),
    canFly: (x, y, z, r) => !cols.some((b) => !(x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) && b.max.y > y + 0.02 && b.min.y < y + 0.5),
    groundBelow: (x, y, z) => {
      let best: number | null = null;
      for (const b of cols) {
        if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
        const top = topAt(b, x, z);
        if (top <= y + 0.05 && (best === null || top > best)) best = top;
      }
      return best;
    },
  };
}
function rat(rm: Room, x: number, y: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, y, z));
  p.feel = rm.feel;
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), rm.cols);
  return p;
}
/** One of the roaches a boss's rules call up (Grimsqueak's summons, the Widows' young): as main.ts makes them. */
function minion(rm: Room, x: number, z: number, y: number, rng: () => number): Foe {
  const s = new Scuttler({ x, z, y, hunt: true, respawn: false });
  s.rng = rng;
  const f = s as unknown as Foe;
  f.canStand = rm.canStand;
  f.floorUnder = rm.foeFloor;
  return f;
}
/** The plain duel against a roach in his way (tests/duels.ts's skilled player), if one is near. */
function duelMinion(p: PlayerController, ms: Foe[], side: { k: number }): { i: Partial<PlayerInput>; aim: Pt } | null {
  const m = nearest(p, ms.filter((e) => e.alive).map((e) => ({ x: e.x, z: e.z, r: e.radius, e })));
  if (!m || far(p, m) > 2.6) return null;
  const e = m.e;
  const d = far(p, m);
  const to = Math.atan2(e.x - p.position.x, e.z - p.position.z);
  const reach = e.radius + 1.0;
  if (e.attackActive && d < reach + 2.5) {
    side.k = -side.k;
    return { i: { move: V(Math.cos(to) * side.k, -Math.sin(to) * side.k), dodgePressed: true }, aim: m };
  }
  if (!e.attacking) return { i: { move: d > reach ? dirTo(p, e.x, e.z) : V(), attackPressed: d <= reach + 0.3 }, aim: m };
  return { i: {}, aim: m };
}

interface Rec { out: string; t: number; hits: number; blocks: number; parries: number; breaks: number; hpLeft: number; hp0: number; states: string }
interface Bout {
  p: PlayerController;
  rm: Room;
  bosses: Foe[];
  hp0: number;
  hpLeft(): number;
  states(): string[];
  /** What he does this step, and what he faces (his lock and his aim). */
  choose(bot: Bot): { i: Partial<PlayerInput>; aim: Pt | null };
  /** Everything after his own step, in main.ts's order. Every result that reaches him goes to `got`. */
  world(got: (r: HitResult | null | undefined, src?: string) => void): void;
}
/** The creatures' half of a tick, as main.ts does it: turn-taking, each one's update (and `extra` after it), the blows. */
function standardWorld(b: { p: PlayerController; rm: Room; foes: Foe[]; lock: () => Foe | null; director: Director }, got: (r: HitResult | null | undefined, src?: string) => void, extra?: (e: Foe) => void, beforeCombat?: () => void): void {
  const p = b.p;
  b.director.update(DT, b.foes, p.position.x, p.position.z, b.lock(), b.rm.feel.id === 'sewers');
  const swinging = p.state === 'attack';
  for (const e of [...b.foes]) {
    e.update(DT, p.position.x, p.position.y, p.position.z, !p.dead, swinging);
    extra?.(e);
  }
  beforeCombat?.();
  const ev = events();
  const src = b.foes.filter((e) => e.alive && e.attackActive).map((e) => e.kind).join('+');
  resolveCombat(p, b.foes, ev);
  got(ev.playerResult, src);
}

function run(make: (seed: number) => Bout, bot: Bot, seed: number, secs = SECS): Rec {
  const b = make(seed);
  const p = b.p;
  let hits = 0;
  let blocks = 0;
  let parries = 0;
  let breaks = 0;
  const got = (r: HitResult | null | undefined, src = 'blow'): void => {
    if (r === 'hit' || r === 'killed') {
      hits++;
      // (BD_DEBUG=<bot> prints each blow that lands on that bot, what it was, and what the boss was doing.)
      if (process.env.BD_DEBUG === bot) console.log(`     hit by ${src || '?'} at ${t.toFixed(2)} s: ${b.states().join(' ')} (${b.bosses[0].stateTime.toFixed(2)} s in), he was ${p.state}, ${far(p, b.bosses[0]).toFixed(2)} from it`);
    }
    if (r === 'blocked') blocks++;
    if (r === 'parried') parries++;
  };
  const seen = new Map<string, number>();
  let t = 0;
  FRAME = 0;
  SIDES.clear();
  for (; t < secs; t += DT) {
    FRAME++;
    const { i, aim } = b.choose(bot);
    if (aim) {
      const to = Math.atan2(aim.x - p.position.x, aim.z - p.position.z);
      p.attackAim = to;
      p.lockFacing = to;
      if (p.grounded && ['idle', 'walk', 'run', 'land', 'guard'].includes(p.state)) p.facing = to;
    }
    p.update(DT, inp(i), b.rm.cols);
    b.world(got);
    if (p.guardBroke) breaks++;
    for (const s of b.states()) seen.set(s, (seen.get(s) ?? 0) + DT);
    if (b.bosses.every((e) => !e.alive)) break;
    if (p.dead) break;
  }
  const states = [...seen.entries()].sort((a, c) => c[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round((v / Math.max(DT, t)) * 100)}%`).join(', ');
  return { out: b.bosses.every((e) => !e.alive) ? 'WIN' : p.dead ? 'LOSE' : 'time', t, hits, blocks, parries, breaks, hpLeft: Math.round(b.hpLeft() * 100) / 100, hp0: b.hp0, states };
}

// ================================================================ THE BROODMOTHER, in the Brood Pit (tests/brood.ts)
const broodRoom = room(LEVELS.find((l) => l.id === 'brood')!);
function broodBout(seed: number): Bout {
  const rm = broodRoom;
  const B = BROOD;
  const rng = seeded(seed);
  const spec = rm.def.enemies.find((e) => e.type === 'brood')!;
  const b = new Brood(spec);
  b.canStand = rm.canStand;
  b.rng = rng;
  const foe = b as unknown as Foe;
  foe.floorUnder = rm.foeFloor;
  const A = PIT_ARENA;
  const mid = { x: (A.x0 + A.x1) / 2, z: (A.z0 + A.z1) / 2 };
  // (He starts seven in front of her: inside her notice, so she wakes and screams, and the fight is on.)
  const p = rat(rm, b.x + Math.sin(b.facing) * 7, 0, b.z + Math.cos(b.facing) * 7);
  const director = new Director();
  const w = { p, rm, foes: [foe], lock: () => foe, director };
  return {
    p, rm, bosses: [foe], hp0: B.hp, hpLeft: () => b.hp, states: () => [b.state],
    choose(bot) {
      const me = { x: b.x, z: b.z, r: b.radius };
      if (bot === 'masher') return { i: { move: far(p, me) - me.r > 0.85 ? dirTo(p, me.x, me.z) : V(), attackPressed: true }, aim: me };
      if (bot === 'turtle') return { i: { guardHeld: true }, aim: me };
      if (bot === 'statue') return { i: {}, aim: me };
      // SKILLED: what tests/brood.ts says the answers are. A stab: step out sideways once she has committed to it (she
      // tracks him for stabTrack of its wind-up). The scissor and the whirl: jump them as they come. The pounce: run
      // the moment she springs. The drop from her thread: run from under her when it twangs. Her openings (spikes in
      // the floor, in a heap, on her knees, recovering, settling): in and swing, not greedy. Between: stand in front
      // of her at about her stab's range, so she is never left with him behind her.
      const s = b.state;
      const t = b.stateTime;
      const toHer = Math.atan2(b.x - p.position.x, b.z - p.position.z);
      const lastFor = (n: number): boolean => t < n - 0.45;
      switch (s) {
        case 'stabWind':
          return { i: t >= b.windTime * B.stabTrack - 0.02 ? { move: aside(p, toHer, mid), run: true } : {}, aim: me };
        case 'stab':
          return { i: { move: aside(p, toHer, mid), run: true }, aim: me };
        case 'sweepWind':
          return { i: t > B.sweepWind - 0.22 ? { jumpPressed: t < B.sweepWind - 0.19, jumpHeld: true } : {}, aim: me };
        case 'sweep':
          return { i: { jumpHeld: true }, aim: me };
        case 'whirlWind':
          return { i: t > B.whirlWind - 0.2 ? { jumpPressed: t < B.whirlWind - 0.17, jumpHeld: true } : {}, aim: me };
        case 'whirl':
          return { i: { jumpHeld: true }, aim: me };
        case 'leap':
        case 'slam':
          return { i: { move: aside(p, b.facing, mid), run: true }, aim: me };
        case 'dropTell':
        case 'drop':
          return { i: { move: awayFrom(p, b.x, b.z, mid, 14), run: true }, aim: me };
        case 'stabStuck':
        case 'stuck':
        case 'kneel':
        case 'recover':
        case 'settle': {
          const n = s === 'stabStuck' ? B.stabStuck : s === 'stuck' ? B.stuck : s === 'kneel' ? B.kneel : s === 'recover' ? B.recover : B.settle;
          return { i: strikeAt(p, me, s === 'stuck' || lastFor(n)), aim: me };
        }
        case 'chase':
        case 'roar':
        case 'idle': {
          const want = { x: b.x + Math.sin(b.facing) * 3.2, z: b.z + Math.cos(b.facing) * 3.2 };
          return { i: goTo(p, want.x, want.z, 0.4), aim: me };
        }
        default:
          return { i: {}, aim: me };
      }
    },
    world(got) {
      standardWorld(w, got);
      b.events.length = 0;
    },
  };
}

// ================================================================ THE SUMP WYRM, in the Sump (tests/wyrm.ts)
const sumpRoom = room(LEVELS.find((l) => l.id === 'sump')!);
function wyrmBout(seed: number): Bout {
  const rm = sumpRoom;
  const W = WYRM;
  const rng = seeded(seed);
  const spec = rm.def.enemies.find((e) => e.type === 'wyrm')!;
  const w = new Wyrm(spec);
  w.canStand = rm.canStand;
  w.wallAt = rm.wallAt;
  w.rng = rng;
  const foe = w as unknown as Foe;
  foe.floorUnder = rm.foeFloor;
  const A = SUMP_ARENA;
  const mid = { x: 0, z: 0 };
  const p = rat(rm, w.x + Math.sin(w.facing) * 7, 0, w.z + Math.cos(w.facing) * 7);
  const director = new Director();
  const ww = { p, rm, foes: [foe], lock: () => foe, director };
  const tailFrom = w.parts.length - W.tailParts;
  return {
    p, rm, bosses: [foe], hp0: W.hp, hpLeft: () => w.hp, states: () => [w.state],
    choose(bot) {
      const head = { x: w.x, z: w.z, r: w.radius };
      const all = [head, ...w.parts];
      if (bot === 'masher') {
        // (The nearest piece of it: its head or any segment.)
        const q = nearest(p, all)!;
        return { i: { move: far(p, q) - q.r > 0.85 ? dirTo(p, q.x, q.z) : V(), attackPressed: true }, aim: q };
      }
      if (bot === 'turtle') return { i: { guardHeld: true }, aim: head };
      if (bot === 'statue') return { i: {}, aim: head };
      // SKILLED: tests/wyrm.ts's answers. The bite: a perfect guard (shield up just as it snaps; a block if late). The
      // charge: out of its line, sideways, once it has committed. The lash: jump it as it comes, if he is in its reach;
      // and never hang about its tail while it is slow. The coil: stand till it rears, then run out away from its head
      // over its body with a double jump. Helpless (stunned, reeling, spent): its head, which counts double. Its
      // other openings (recover, skid, settle) and while it prowls: the nearest segment that is not its tail.
      const s = w.state;
      const t = w.stateTime;
      const tail = w.tail;
      const inLash = far(p, tail) < tail.r + W.whipReach + R + 0.3;
      const body = w.parts.slice(0, tailFrom);
      const nearTail = w.parts.slice(tailFrom).some((q) => far(p, q) < W.tailRange + 0.4);
      const k = Math.round(t / DT);
      switch (s) {
        case 'coilWind':
        case 'squeeze': {
          const away = dirTo(p, w.x, w.z).multiplyScalar(-1);
          return { i: { move: away.length() > 0 ? away : V(1, 0), run: true, jumpPressed: s === 'coilWind' && (k === 2 || k === 16), jumpHeld: s === 'squeeze' || k >= 2 }, aim: head };
        }
        case 'coil':
          return { i: {}, aim: head };
        case 'whipWind':
          return { i: inLash && t > W.whipWind - 0.2 ? { jumpPressed: t < W.whipWind - 0.17, jumpHeld: true } : inLash ? {} : { move: dirTo(p, tail.x, tail.z).multiplyScalar(-1), run: true }, aim: head };
        case 'whip':
          return { i: inLash ? { jumpHeld: true } : {}, aim: head };
        case 'chargeWind':
          return { i: t >= w.windTime * W.chargeTrack - 0.03 ? { move: aside(p, w.facing, mid), run: true } : {}, aim: head };
        case 'charge': {
          const dx = p.position.x - w.x;
          const dz = p.position.z - w.z;
          const along = dx * Math.sin(w.facing) + dz * Math.cos(w.facing);
          const across = Math.abs(dx * Math.cos(w.facing) - dz * Math.sin(w.facing));
          return { i: along > -0.5 && across < w.radius + W.chargeReach + R + 0.8 ? { move: aside(p, w.facing, mid), run: true } : {}, aim: head };
        }
        case 'biteWind':
          return { i: { guardHeld: t > w.windTime - 0.04 }, aim: head };
        case 'bite':
          return { i: { guardHeld: true }, aim: head };
        case 'stunned':
        case 'reel':
        case 'spent': {
          const n = s === 'stunned' ? W.stunned : s === 'reel' ? W.reel : W.spent;
          return { i: strikeAt(p, head, t < n - 0.45), aim: head };
        }
        case 'recover':
        case 'skid':
        case 'settle':
        case 'prowl': {
          if (nearTail && w.moving < W.tailSlow) return { i: { move: dirTo(p, tail.x, tail.z).multiplyScalar(-1), run: true }, aim: head };
          const q = nearest(p, s === 'prowl' ? body : [head, ...body])!;
          return { i: strikeAt(p, q), aim: q };
        }
        default:
          return { i: {}, aim: head };
      }
    },
    world(got) {
      standardWorld(ww, got);
      w.events.length = 0;
      void A;
    },
  };
}

// ================================================================ THE WIDOWS, in the arena at the foot of the Long Drop (tests/widow.ts)
// (The room has two of her, one each side of the light, who take turns: both are fought, and both must die. Her young,
// when she turns angry, are made as main.ts makes them: roaches.)
const dropRoom = room(TEST_ROOMS.find((l) => l.id === 'longdrop')!);
/** tests/widow.ts's keepRules, for one of the pair: out of a marked ring once it has stopped following him, over a sweeping foot. */
interface Flee { from: string; dir: THREE.Vector3 }
const sweepGap = (w: Widow, p: PlayerController): number => {
  const h = w.hip(w.side);
  if (Math.abs(Math.hypot(p.position.x - h.x, p.position.z - h.z) - w.rho) > WIDOW.rakeR + 1) return Infinity;
  const mine = Math.atan2(p.position.x - h.x, p.position.z - h.z) - w.facing;
  return Math.abs(Math.atan2(Math.sin(mine - w.angle), Math.cos(mine - w.angle)));
};
function keepRules(w: Widow, p: PlayerController, flee: Flee): Partial<PlayerInput> | null {
  const W = WIDOW;
  const A = w.field;
  const s = w.state;
  if (s === 'sweep' || s === 'sweepWind') return { jumpPressed: s === 'sweep' && p.grounded && sweepGap(w, p) < (w.raging ? W.sweepRateRage : W.sweepRate) * 0.2, jumpHeld: true };
  const track = s === 'slamWind' ? W.slamTrack : s === 'stabWind' ? W.stabTrack : W.biteTrack;
  const marked = ((s === 'slamWind' || s === 'stabWind' || s === 'biteWind') && w.stateTime > w.windTime * track) || s === 'slam' || s === 'stab' || s === 'bite';
  if (!marked) return null;
  const key = `${w.theta},${w.spot.x},${w.spot.z}`;
  if (key !== flee.from) {
    flee.from = key;
    const d = flee.dir;
    d.set(p.position.x - w.spot.x, 0, p.position.z - w.spot.z);
    const ahead = (): number => Math.hypot(p.position.x + d.x * 3.6 - A.x, p.position.z + d.z * 3.6 - A.z);
    const intoHer = (): boolean => Math.hypot(p.position.x + d.x * 3.6 - w.x, p.position.z + d.z * 3.6 - w.z) < w.radius + 1.5;
    if (d.length() < 0.25 || (d.normalize(), ahead() > A.r - 0.6) || intoHer()) d.set(A.x - p.position.x, 0, A.z - p.position.z);
    if (d.length() < 1) d.set(1, 0, 0);
    d.normalize();
  }
  return { move: flee.dir.clone(), run: true };
}
function widowBout(seed: number): Bout {
  const rm = dropRoom;
  const W = WIDOW;
  const rng = seeded(seed);
  const ws = rm.def.enemies.filter((e) => e.type === 'widow').map((e) => {
    const w = new Widow(e);
    w.rng = rng;
    (w as unknown as Foe).canStand = rm.canStand;
    (w as unknown as Foe).floorUnder = rm.foeFloor;
    return w;
  });
  const A = ws[0].field;
  const p = rat(rm, A.x, 0, A.z - 2);
  p.well = rm.def.well ?? null;
  const bosses = ws.map((w) => w as unknown as Foe);
  const foes: Foe[] = [...bosses];
  const young: Foe[] = [];
  const director = new Director();
  const flee: Flee = { from: '', dir: V() };
  const side = { k: 1 };
  const lock = (): Foe | null => bosses.filter((e) => e.alive).sort((a, b) => far(p, a) - far(p, b))[0] ?? null;
  const ww = { p, rm, foes, lock, director };
  const pieces = (w: Widow): BodyPart[] => (w.alive ? [...(w.headDown ? [{ x: w.x, z: w.z, r: w.radius }] : []), ...w.parts] : []);
  return {
    p, rm, bosses, hp0: ws.reduce((a, w) => a + w.maxHp, 0), hpLeft: () => ws.reduce((a, w) => a + w.hp, 0),
    states: () => ws.map((w) => `${w.px > A.x ? 'E' : 'W'}:${w.state}`),
    choose(bot) {
      const live = ws.filter((w) => w.alive);
      // (What he faces: the one striking at him, else the nearer; blows from above come from her place.)
      const her = live.find((w) => w.attacking) ?? live.sort((a, b) => Math.hypot(a.px - p.position.x, a.pz - p.position.z) - Math.hypot(b.px - p.position.x, b.pz - p.position.z))[0];
      const face = her ? { x: her.px, z: her.pz } : { x: A.x, z: A.z };
      if (bot === 'masher') {
        // (The nearest piece of her that lies in the light; if none, her head at the edge: it only glances.)
        const q = nearest(p, ws.flatMap(pieces)) ?? nearest(p, live.map((w) => ({ x: w.x, z: w.z, r: w.radius })));
        if (!q) return { i: {}, aim: null };
        return { i: { move: far(p, q) - q.r > 0.85 ? dirTo(p, q.x, q.z) : V(), attackPressed: true }, aim: q };
      }
      if (bot === 'turtle') return { i: { guardHeld: true }, aim: face };
      if (bot === 'statue') return { i: {}, aim: face };
      // SKILLED: tests/widow.ts's whole fight, with both of her: keepRules (out of a marked ring once it stops following
      // him, over a raking foot); on an opening, the nearest piece of her in the light (not a stuck foot while another
      // stab is coming; he stops swinging a little before she moves again); between her blows he goes to stand in front
      // of one of them (the first still alive), in reach of her head; and her young are fought as duels.ts fights a roach.
      for (const w of live) {
        const must = keepRules(w, p, flee);
        if (must) return { i: must, aim: face };
      }
      const open = live.filter((w) => w.open && !(w.state === 'stabStuck' && w.more));
      if (open.length) {
        const q = nearest(p, open.flatMap(pieces));
        const w = open[0];
        if (q) {
          const lasts = ({ slamStuck: W.slamStuck, sweepEnd: W.sweepEnd, stabStuck: W.stabStuck, biteStuck: W.biteStuck, reel: W.reel } as Record<string, number>)[w.state] ?? 1;
          const greedy = lasts - w.stateTime < 0.35;
          return { i: strikeAt(p, q, !greedy), aim: q };
        }
      }
      const fight = duelMinion(p, young, side);
      if (fight) return fight;
      const target = live[0];
      if (target && (target.state === 'idle' || target.state === 'withdraw') && !live.some((w) => w.attacking)) {
        const home = { x: target.px + Math.sin(target.facing) * 6.5, z: target.pz + Math.cos(target.facing) * 6.5 };
        return { i: goTo(p, home.x, home.z, 1), aim: face };
      }
      return { i: {}, aim: face };
    },
    world(got) {
      standardWorld(ww, got, (e) => {
        if (e instanceof Widow) {
          e.events.length = 0;
          for (const at of e.young.splice(0)) {
            const m = minion(rm, at.x, at.z, e.floorY, rng);
            young.push(m);
            foes.push(m);
          }
        }
      });
      // (A young one taken by a blow in resolveCombat, after her update: made the next tick, as the game does.)
    },
  };
}

// ================================================================ LORD GRIMSQUEAK, in his hall (src/main.ts bossTick)
// What main.ts does for him each tick is done here: his bolts as globs (stepGlobs, resolveGlobs, its groundBelow), the
// rings of his slam, his storm and his orb against the rat, the shove when he bursts away, and his summoned roaches.
// Left out: the opening scene (he is woken at once, as the scene ends), hit-stop and slow-motion, and the camera.
const hallRoom = room(LEVELS.find((l) => l.enemies.some((e) => e.type === 'grimsqueak'))!);
function grimBout(seed: number): Bout {
  const rm = hallRoom;
  const rng = seeded(seed);
  const spec = rm.def.enemies.find((e) => e.type === 'grimsqueak')!;
  const g = new Grimsqueak(spec);
  g.canStand = rm.canStand;
  g.rng = rng;
  const foe = g as unknown as Foe;
  foe.floorUnder = rm.foeFloor;
  g.wake();
  const p = rat(rm, g.x, g.floorY, g.z + 7);
  const foes: Foe[] = [foe];
  const minions: Foe[] = [];
  let globs: Glob[] = [];
  const director = new Director();
  const side = { k: 1 };
  let way = 1;
  let wasVolley = false;
  const mid = { x: 0, z: 2 };
  const ww = { p, rm, foes, lock: () => foe, director };
  return {
    p, rm, bosses: [foe], hp0: GRIM.hp, hpLeft: () => g.hp, states: () => [g.state],
    choose(bot) {
      const me = { x: g.x, z: g.z, r: g.radius };
      if (bot === 'masher') return { i: { move: far(p, me) - me.r > 0.85 ? dirTo(p, me.x, me.z) : V(), attackPressed: true }, aim: me };
      if (bot === 'turtle') return { i: { guardHeld: true }, aim: me };
      if (bot === 'statue') return { i: {}, aim: me };
      // SKILLED: grimsqueak.ts's own answers. The volley: keep moving (run round him, square to him). The swoop: shield
      // up just as he arrives (a perfect guard knocks him silly; a late one is a block). The slam: jump each ring as it
      // reaches him. The orb: strike it back with the sword as it comes in reach. The storm: off its line once it is set.
      // Openings (spent, stunned, mending): under him and swing. Floating: wait about five off. His roaches, when one is
      // near him, before anything but a ring or the orb: duels.ts's way.
      const s = g.state;
      const t = g.stateTime;
      const h = g.phase === 2 ? GRIM.rage.haste : 1;
      const toHim = Math.atan2(g.x - p.position.x, g.z - p.position.z);
      if (s === 'volley' && !wasVolley) way = -way;
      wasVolley = s === 'volley';
      // Rings first: they come whatever he is doing.
      for (const r of g.rings) {
        if (r.spent) continue;
        const d = Math.hypot(p.position.x - r.x, p.position.z - r.z);
        if (r.r < d + GRIM.slam.ringWidth && d - r.r < 1.4) return { i: { jumpPressed: p.grounded && d - r.r > 0.5, jumpHeld: true }, aim: me };
      }
      // A roach of his at him comes next: it is fought (or sidehopped) as duels.ts fights one, unless the orb is on him.
      const o = g.orb;
      const roach = duelMinion(p, minions, side);
      const committed = (s === 'stormWind' && t >= GRIM.storm.windup * h * GRIM.storm.track - 0.02) || s === 'storm' || s === 'swoop';
      // (While he winds up the storm or the swoop, no new swing at a roach: he must be free to move when it comes.)
      if (roach && (s === 'stormWind' || s === 'swoopWind')) roach.i.attackPressed = false;
      if (roach && !committed && !(o && !o.toBoss && Math.hypot(o.x - p.position.x, o.z - p.position.z) < 4)) return roach;
      // (Playing the orb he keeps well off him, about his orbit, so that it comes back with time to meet it; and he
      // swings fresh each time, not in the tail of the last swing.)
      const back = far(p, me) < 6.5 ? { move: dirTo(p, g.x, g.z).multiplyScalar(-1), run: true } : {};
      if (o && !o.toBoss) {
        const d = Math.hypot(o.x - p.position.x, o.z - p.position.z);
        if (d < REACH + GRIM.orb.swingBonus + o.speed * 0.17) return { i: { attackPressed: p.state !== 'attack' }, aim: o };
        return { i: d > 3.2 ? back : {}, aim: o };
      }
      if (o || s === 'orbWind') return { i: back, aim: me };
      switch (s) {
        case 'volley': {
          const tang = V(Math.cos(toHim) * way, -Math.sin(toHim) * way);
          return { i: { move: tang, run: true }, aim: me };
        }
        case 'swoop': {
          const d = far(p, me);
          return { i: { guardHeld: d < me.r + GRIM.swoop.reach + R + GRIM.swoop.speed * 0.1 }, aim: me };
        }
        case 'stormWind':
          return { i: t >= GRIM.storm.windup * h * GRIM.storm.track - 0.02 ? { move: aside(p, g.facing, mid), run: true } : {}, aim: me };
        case 'storm':
          return { i: g.stormAtRat(p.position.x, p.position.y, p.position.z) || Math.abs((p.position.x - g.x) * Math.cos(g.stormDir) - (p.position.z - g.z) * Math.sin(g.stormDir)) < GRIM.storm.wide + 0.4 ? { move: aside(p, g.stormDir, mid), run: true } : {}, aim: me };
        case 'spent':
        case 'stunned':
        case 'heal':
          return { i: strikeAt(p, me, g.lift < 0.4), aim: me };
        default: {
          const d = far(p, me);
          return { i: d > 5.5 ? { move: dirTo(p, g.x, g.z), run: true } : d < 4 ? { move: dirTo(p, g.x, g.z).multiplyScalar(-1), run: true } : {}, aim: me };
        }
      }
    },
    world(got) {
      standardWorld(ww, got, (e) => {
        if (e !== foe) return;
        // main.ts bossTick:
        g.events.length = 0;
        const q = p.position;
        if (g.repelPulse) {
          g.repelPulse = false;
          const dx = q.x - g.x;
          const dz = q.z - g.z;
          const d = Math.hypot(dx, dz) || 1;
          if (d < GRIM.repel.radius && !p.dead) {
            p.velocity.x = (dx / d) * GRIM.repel.push;
            p.velocity.z = (dz / d) * GRIM.repel.push;
          }
        }
        for (const at of g.summons.splice(0)) {
          const m = minion(rm, at.x, at.z, g.floorY, rng);
          minions.push(m);
          foes.push(m);
        }
        if (!p.dead) {
          if (g.stormAtRat(q.x, q.y, q.z)) {
            const r = p.takeHit(g.x, g.z, GRIM.storm.damage);
            if (r !== 'dodged') {
              got(r, 'storm');
              g.stormTaken();
            }
          }
          const ring = g.ringAtRat(q.x, q.y, q.z);
          if (ring) {
            const r = p.takeHit(ring.x, ring.z, GRIM.slam.damage);
            if (r !== 'dodged') got(r, 'ring');
          }
          if (p.attackActive && g.swingAt(q.x, q.z, p.facing, p.attackClip.reach, p.attackClip.arc)) {
            // Struck back.
          } else if (g.orb && g.orbAtRat(q.x, q.y, q.z)) {
            const o = g.orb;
            const r = p.takeHit(o.x - o.vx, o.z - o.vz, GRIM.orb.damage);
            if (r !== 'dodged') {
              got(r, 'orb');
              g.orbTaken();
            }
          }
        }
        for (const s of g.spits.splice(0)) globs.push({ ...s, age: 0, done: false });
      }, () => {
        // His bolts fly, burst on the floor, or hit him (main.ts: stepGlobs with its groundBelow, then resolveGlobs).
        if (!globs.length) return;
        stepGlobs(globs, DT, rm.groundBelow);
        const ev = events();
        resolveGlobs(p, globs, ev);
        got(ev.playerResult, 'bolt');
        globs = globs.filter((x) => !x.done);
      });
    },
  };
}

// ================================================================ THE FIREFLY BOMBER, over the Hollows' Undershelf (tests/firefly.ts)
const caveRoom = room(LEVELS.find((l) => l.id === 'hollows')!);
const caveGround: GroundAt = groundFrom(caveRoom.cols, caveRoom.movers);
/** The west end of the Undershelf (tests/firefly.ts keeps him in it). */
const SHELF = { x0: -44, x1: -16, z0: 34.5, z1: 45.5 };
function fireflyBout(seed: number): Bout {
  const rm = caveRoom;
  const F = FIREFLY;
  const rng = seeded(seed);
  const spec = rm.def.enemies.find((e) => e.type === 'firefly')!;
  const f = new Firefly(spec);
  f.canStand = rm.canStand;
  f.canFly = rm.canFly;
  f.rng = rng;
  const foe = f as unknown as Foe;
  foe.floorUnder = rm.foeFloor;
  const p = rat(rm, spec.x + 8, spec.y ?? 0, spec.z);
  const embers: Ember[] = [];
  const flames = new Flames();
  const director = new Director();
  const mid = { x: spec.x, z: spec.z };
  const ww = { p, rm, foes: [foe], lock: () => foe, director };
  const onShelf = (m: THREE.Vector3): THREE.Vector3 => {
    const q = p.position;
    if (q.x < SHELF.x0 + 1 && m.x < 0) m.x = Math.abs(m.x) + 0.3;
    if (q.x > SHELF.x1 - 1 && m.x > 0) m.x = -Math.abs(m.x) - 0.3;
    if (q.z < SHELF.z0 + 1 && m.z < 0) m.z = Math.abs(m.z) + 0.3;
    if (q.z > SHELF.z1 - 1 && m.z > 0) m.z = -Math.abs(m.z) - 0.3;
    return m.lengthSq() > 0 ? m.normalize() : m;
  };
  return {
    p, rm, bosses: [foe], hp0: F.hp, hpLeft: () => f.hp, states: () => [f.state],
    choose(bot) {
      const me = { x: f.x, z: f.z, r: f.radius };
      if (bot === 'masher') return { i: { move: far(p, me) - me.r > 0.85 ? onShelf(dirTo(p, me.x, me.z)) : V(), attackPressed: true }, aim: me };
      if (bot === 'turtle') return { i: { guardHeld: true }, aim: me };
      if (bot === 'statue') return { i: {}, aim: me };
      // SKILLED: tests/firefly.ts's answers. Once its line is set (and while it flies it), run off the line, square to
      // it, toward the middle of the shelf. Out of any flames he is standing in or at the edge of. When it hangs low and
      // dark (spent), or lies knocked down, beside it and swing; never at it while it is up. Otherwise stand still.
      const s = f.state;
      if ((s === 'runWind' && f.stateTime >= f.windTime * F.runTrack) || s === 'run') {
        const hd = s === 'run' ? f.facing : Math.atan2(f.mark.x - f.x, f.mark.z - f.z);
        return { i: { move: onShelf(aside(p, hd, mid)), run: true }, aim: me };
      }
      const q = p.position;
      const hot = flames.list.find((fl) => Math.hypot(q.x - fl.x, q.z - fl.z) < fl.r + R + 0.4);
      if (hot) return { i: { move: onShelf(awayFrom(p, hot.x, hot.z, mid, 9)), run: true }, aim: me };
      if (s === 'spent' || s === 'grounded' || s === 'fall') {
        // (Not into a flame on the way.)
        const into = flames.list.some((fl) => Math.hypot(f.x - fl.x, f.z - fl.z) < fl.r + R + f.radius + 0.6);
        return { i: into ? {} : strikeAt(p, me, Math.abs(f.y - p.position.y) < 0.85), aim: me };
      }
      if (s === 'sink') return { i: goTo(p, f.x, f.z, 1.6), aim: me };
      return { i: {}, aim: me };
    },
    world(got) {
      standardWorld(ww, got, () => {
        // main.ts: each drop is let go from the tip of its lantern; one over no floor (or water) falls and is gone.
        for (const d of f.drops.splice(0)) {
          const em = makeEmber(d, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, caveGround);
          const L = em.land;
          const wet = !!L && [...(rm.def.water ?? []), ...(rm.def.lava ?? [])].some((w) => L.x > w.x0 && L.x < w.x1 && L.z > w.z0 && L.z < w.z1 && w.y > L.y);
          if (L && (wet || !rm.canStand(L.x, L.y, L.z, 0.1))) em.land = null;
          embers.push(em);
        }
        f.events.length = 0;
      }, () => {
        for (const em of stepEmbers(embers, DT, caveGround)) if (em.land) flames.add(em.x, em.y, em.z, em.radius, em.burnFor, em.color);
        for (let i = embers.length - 1; i >= 0; i--) if (embers[i].done) embers.splice(i, 1);
        flames.step(DT);
      });
      // (After the blows, as main.ts: the flames.)
      const ev = events();
      if (resolveFlames(p, flames, F.burn, ev)) got(ev.playerResult, 'flames');
    },
  };
}

// ================================================================ The table, and the two checks
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const BOSSES: Array<{ key: string; name: string; where: string; make: (seed: number) => Bout }> = [
  { key: 'brood', name: 'The Broodmother', where: 'the Brood Pit', make: broodBout },
  { key: 'wyrm', name: 'The Sump Wyrm', where: 'the Sump', make: wyrmBout },
  { key: 'widow', name: 'The Widows (both)', where: 'the Long Drop arena', make: widowBout },
  { key: 'grim', name: 'Lord Grimsqueak', where: 'his hall', make: grimBout },
  { key: 'firefly', name: 'The Firefly Bomber', where: 'the Hollows Undershelf', make: fireflyBout },
];
const all = new Map<string, Map<string, Rec>>();
for (const B of BOSSES) {
  const probe = B.make(1);
  console.log(`\n${B.name}, in ${B.where} (feel: ${probe.rm.feel.id}), ${probe.hp0} hp. Up to ${SECS} s.  h = hits he took, b = blows his shield stopped, p = perfect guards, g = times his guard broke, hp = its health left / at start`);
  const rows = new Map<string, Rec>();
  for (const seed of SEEDS) {
    for (const bot of BOTS) {
      const r = run(B.make, bot, seed);
      rows.set(`${bot}:${seed}`, r);
      console.log(`  seed ${seed} ${bot.padEnd(8)} ${`${r.out} ${r.t.toFixed(0)}s`.padEnd(10)} h${String(r.hits).padEnd(3)} b${String(r.blocks).padEnd(3)} p${String(r.parries).padEnd(3)} g${String(r.breaks).padEnd(3)} hp ${`${r.hpLeft}/${r.hp0}`.padEnd(8)} | ${r.states}`);
    }
  }
  all.set(B.key, rows);
}
console.log('');
// 1. Everything is a threat: a knight who does nothing is hurt by each of them, every seed.
{
  const harmless = BOSSES.filter((B) => SEEDS.some((s) => all.get(B.key)!.get(`statue:${s}`)!.hits === 0));
  check('each boss hurts a knight who does nothing (every seed)', harmless.length === 0, harmless.map((B) => B.key).join());
}
// 2. The same dice, the same fight.
{
  const differ = BOSSES.filter((B) => JSON.stringify(run(B.make, 'skilled', 1)) !== JSON.stringify(all.get(B.key)!.get('skilled:1')));
  check('a fight is the same every time it is run with the same seed (the skilled knight, seed 1, run again)', differ.length === 0, differ.map((B) => B.key).join());
}

console.log(failures === 0 ? '\nbossduels: all passed' : `\nbossduels: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
