// The Firefly Bomber: a great firefly whose lantern drips fire. It never comes at him: it flies round him out of the
// sword's reach and makes bombing runs, letting three drops of fire fall along its line, aimed at where he is GOING.
// Each drop is marked on the floor from the moment it is let go, and leaves a patch of flame that burns for a few
// seconds. After two runs its light is spent and it hangs low and dark while its lantern fills: that is the opening.
// All of it with the real controller, the real combat, the real falling fire and the Hollows' real cave.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Firefly, FIREFLY, type FireflyState } from '../src/enemies/firefly';
import { CombatEvents, resolveCombat, resolveFlames } from '../src/combat/combat';
import { Flames, emberLanding, flameHeat, groundFrom, makeEmber, stepEmbers, type Ember, type GroundAt } from '../src/world/embers';
import { EmberFx } from '../src/world/emberFx';
import { Director } from '../src/enemies/director';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { FIREFLY_AIR, SHELF_FIREFLY } from '../src/levels/hollows';
import { ISLAND, NORTH_AIR, NORTH_FIREFLY } from '../src/levels/foundry';
import { KEEP_WEDGES, WARD_AIR, WARD_FIREFLY } from '../src/levels/keep';
import type { LevelDef } from '../src/levels/types';
import { makeAabb } from '../src/world/collision';
import { ENEMY_PIECES, compileCustom, emptyCustom } from '../src/levels/custom';
import { TUNING } from '../src/data/tuning';
import { NO_GEAR } from '../src/data/equipment';
import { STICKERS } from '../src/data/stickers';
import { stickerIcon } from '../src/ui/icons';
import { GoalTracker } from '../src/levels/goals';

const DT = 1 / 60;
const F = FIREFLY;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const cave = LEVELS.find((l) => l.id === 'hollows')!;
/** The level the checks are in just now (the Hollows first; the Foundry and the Keep at the end). */
const roomOf = (L: LevelDef) => buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], lava: L.lava, decor: [], movers: L.movers });
let chamber = roomOf(cave);
/** The floor a drop falls to: the game's own (everything solid but what moves). */
let floorUnder: GroundAt = groundFrom(chamber.colliders, new Set(chamber.movers.map((m) => m.aabb)));
function enter(L: LevelDef): void {
  chamber = roomOf(L);
  floorUnder = groundFrom(chamber.colliders, new Set(chamber.movers.map((m) => m.aabb)));
}
// (These are the game's own, from main.ts.)
const canStand = (x: number, y: number, z: number, r: number): boolean => {
  let floor = false;
  for (const b of chamber.colliders) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    if (b.max.y > y + 0.25 && b.min.y < y + 0.7) return false;
    if (Math.abs(b.max.y - y) <= 0.25 && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
  }
  return floor;
};
const canFly = (x: number, y: number, z: number, r: number): boolean =>
  !chamber.colliders.some((b) => !(x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) && b.max.y > y + 0.02 && b.min.y < y + 0.5);
const groundBelow: GroundAt = (x, y, z) => floorUnder(x, y, z);
/** Under water or lava, as the game asks before it lets a drop catch. */
const wet = (x: number, y: number, z: number): boolean => [...chamber.water, ...chamber.lava].some((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && w.y > y);
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, sneakHeld: false, stowPressed: false, ...o } as PlayerInput);
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const spec = cave.enemies.find((e) => e.type === 'firefly')!;
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** A fight: it, him, its fire, and everything that happened. Stepped the way the game steps it. */
interface Fight {
  f: Firefly;
  p: PlayerController;
  embers: Ember[];
  flames: Flames;
  /** Every drop let go: where, how far from the tip of its lantern, and where it was marked to land (null: over no floor). */
  let: Array<{ t: number; x: number; y: number; z: number; offVent: number; run: number; mark: { x: number; z: number } | null; rat: { x: number; z: number } }>;
  /** Every drop that landed and caught: where, how far from its mark, how long it fell, how far from him then. */
  landed: Array<{ t: number; x: number; y: number; z: number; offMark: number; fell: number; fromRat: number; run: number }>;
  burns: number;
  results: string[];
  heard: string[];
  seen: FireflyState[];
  t: number;
  runs: number;
}
function fight(ratX: number, ratZ: number, seed = 3, at = spec): Fight {
  const f = new Firefly(at);
  f.canStand = canStand;
  f.canFly = canFly;
  let s = seed;
  f.rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const p = new PlayerController(new THREE.Vector3(ratX, 0, ratZ));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  return { f, p, embers: [], flames: new Flames(), let: [], landed: [], burns: 0, results: [], heard: [], seen: [], t: 0, runs: 0 };
}
const runOf = new WeakMap<Ember, number>();
function step(w: Fight, act: Partial<PlayerInput> = {}): void {
  const { f, p } = w;
  p.update(DT, input(act), chamber.colliders);
  const was = f.state;
  f.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
  if (f.state === 'run' && was !== 'run') w.runs++;
  for (const d of f.drops.splice(0)) {
    const em = makeEmber(d, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundBelow);
    if (em.land && (wet(em.land.x, em.land.y, em.land.z) || !canStand(em.land.x, em.land.y, em.land.z, 0.1))) em.land = null;
    runOf.set(em, w.runs);
    w.embers.push(em);
    w.let.push({ t: w.t, x: d.x, y: d.y, z: d.z, offVent: Math.hypot(d.x - f.vent.x, d.y - f.vent.y, d.z - f.vent.z), run: w.runs, mark: em.land ? { x: em.land.x, z: em.land.z } : null, rat: { x: p.position.x, z: p.position.z } });
  }
  w.heard.push(...f.events.splice(0));
  for (const em of stepEmbers(w.embers, DT, groundBelow)) {
    if (!em.land) continue;
    w.flames.add(em.x, em.y, em.z, em.radius, em.burnFor, em.color);
    w.landed.push({ t: w.t, x: em.x, y: em.y, z: em.z, offMark: Math.hypot(em.x - em.land.x, em.z - em.land.z), fell: em.age, fromRat: Math.hypot(em.x - p.position.x, em.z - p.position.z), run: runOf.get(em) ?? 0 });
  }
  for (let i = w.embers.length - 1; i >= 0; i--) if (w.embers[i].done) w.embers.splice(i, 1);
  w.flames.step(DT);
  const ev = events();
  resolveCombat(p, [f], ev);
  if (resolveFlames(p, w.flames, F.burn, ev)) w.burns++;
  if (ev.playerResult) w.results.push(ev.playerResult);
  if (w.seen[w.seen.length - 1] !== f.state) w.seen.push(f.state);
  w.t += DT;
}
/** Plays on, the rat doing `act` each frame, until `stop` (or for `secs`). */
function play(w: Fight, act: (w: Fight) => Partial<PlayerInput>, stop: (w: Fight) => boolean, secs = 60): void {
  for (let i = 0; i < secs * 60 && !stop(w); i++) step(w, act(w));
}
const still = (): Partial<PlayerInput> => ({});
function put(p: PlayerController, x: number, z: number, face?: { x: number; z: number }, y = 0): void {
  p.position.set(x, y, z);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
}
/** One swing from where he stands (the firefly held as it is). */
function swing(p: PlayerController, f: Firefly): CombatEvents {
  const ev = events();
  let seen = events();
  f.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    resolveCombat(p, [f], ev);
    if (ev.enemyHit) seen = { ...seen, enemyHit: ev.enemyHit, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
/**
 * A rat who keeps out of its fire: once its line is set (and while it flies it) he runs off the line, sideways to it,
 * whichever way keeps him on the middle of the shelf.
 */
function sidestep(q: Fight): Partial<PlayerInput> {
  const f = q.f;
  if (!((f.state === 'runWind' && f.stateTime >= f.windTime * F.runTrack) || f.state === 'run')) return {};
  const h = f.state === 'run' ? f.facing : Math.atan2(f.mark.x - f.x, f.mark.z - f.z);
  const p = q.p.position;
  let sx = Math.cos(h);
  let sz = -Math.sin(h);
  // (Towards the middle of the west end of the shelf.)
  if (sx * (-30 - p.x) + sz * (40 - p.z) < 0) {
    sx = -sx;
    sz = -sz;
  }
  return { move: new THREE.Vector3(sx, 0, sz), run: true };
}
const MAX = TUNING.health.max;
/** Open floor on the Undershelf near its post, for him to stand on. */
const YARD = { x: spec.x + 8, z: spec.z };

// ---- Where it is, and what it is ----
{
  const found = cave.enemies.filter((e) => e.type === 'firefly');
  check('the Hollows has one, over the west end of the Undershelf, hanging in clear air over real floor', found.length === 1 && spec.x === SHELF_FIREFLY.x && spec.z === SHELF_FIREFLY.z && canStand(spec.x, spec.y ?? 0, spec.z, 0.45) && canFly(spec.x, (spec.y ?? 0) + F.height, spec.z, F.radius), `at ${spec.x}, ${spec.z}`);
  check('its air is that end of the shelf and out over the chasm beside it', !!spec.arena && spec.arena.x0 === FIREFLY_AIR.x0 && spec.arena.z1 === FIREFLY_AIR.z1 && !canStand(-18, 0, 26, 0.1) && canFly(-18, F.height, 26, F.radius));
  check('it is no part of what the gallery\'s wedge asks for', !!spec.uncounted && new GoalTracker(cave, () => ({ have: 0, total: 0 })).enemyTotal === cave.enemies.filter((e) => !e.uncounted).length);
  const w = fight(spec.x, spec.z + 30);
  const f = w.f;
  check('at its post it hangs in the air facing the way it was set, its lantern full', f.state === 'idle' && Math.abs(f.y - F.height) < 1e-6 && Math.abs(f.facing - (spec.facing ?? 0)) < 1e-6 && f.light === 1);
  check('its fire leaves it from the tip of its lantern: behind its middle, at the bottom of its body', Math.abs(Math.hypot(f.vent.x - f.x, f.vent.z - f.z) - F.ventBack) < 1e-6 && Math.abs(wrap(Math.atan2(f.x - f.vent.x, f.z - f.vent.z) - f.facing)) < 1e-6 && Math.abs(f.vent.y - f.y - F.ventUp) < 1e-6);
  // It is out of the sword's reach from the floor and from a jump; a double jump gets over it, and the plunge strikes it.
  const p = w.p;
  put(p, f.x, f.z - 0.9, f);
  check('a swing from the floor under it does not reach it', !swing(p, f).enemyHit);
  const leap = (jumps: number): boolean => {
    const p = new PlayerController(new THREE.Vector3(f.x, 0, f.z - 0.7));
    p.facing = 0;
    f.lastSwing = -1;
    for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
    let hit = false;
    let jumped = 0;
    let plunged = false;
    let top = 0;
    for (let i = 0; i < 200; i++) {
      const rising = p.velocity.y > 0.5;
      const jump = jumped === 0 ? i === 0 : jumped < jumps && !rising;
      if (jump) jumped++;
      // (At the top of his last jump he strikes down.)
      const strike = !plunged && jumped === jumps && !jump && p.velocity.y <= 0.2 && !p.grounded;
      if (strike) plunged = true;
      p.update(DT, input({ jumpPressed: jump, jumpHeld: true, attackPressed: strike, move: new THREE.Vector3(0, 0, plunged ? 0 : 0.35) }), chamber.colliders);
      top = Math.max(top, p.position.y);
      const ev = events();
      resolveCombat(p, [f], ev);
      if (ev.enemyHit) hit = true;
      if (plunged && p.grounded) break;
    }
    leap.top = top;
    return hit;
  };
  leap.top = 0;
  const one = leap(1);
  const oneTop = leap.top;
  check('a jump does not get up to it', !one && oneTop < F.height - 0.3, `he gets ${oneTop.toFixed(2)} up; it hangs ${F.height} up`);
  const two = leap(2);
  check('a double jump gets over it, and the plunge strikes it out of the air', two && leap.top > F.height - 0.3 && f.state === 'fall', `he gets ${leap.top.toFixed(2)} up; it is ${f.state}`);
}

// ---- It sees him, and flies round him ----
{
  const w = fight(spec.x + F.noticeRange + 6, spec.z);
  play(w, still, () => false, 2);
  check('it does not see him from far off', w.f.state === 'idle');
  put(w.p, YARD.x, YARD.z);
  play(w, still, (q) => q.f.state === 'circle', 5);
  check('it sees him, and its lantern flashes', w.heard.includes('alert') && w.seen.join(' ') === 'idle alert circle', w.seen.join(' '));
  let nearest = 99;
  let lowest = 99;
  let furthest = 0;
  let dim = 9;
  let frames = 0;
  play(w, still, (q) => {
    if (q.f.state !== 'circle') return true;
    if (q.f.stateTime > 0.9) {
      nearest = Math.min(nearest, dist(q.f, q.p.position));
      furthest = Math.max(furthest, dist(q.f, q.p.position));
      frames++;
    }
    lowest = Math.min(lowest, q.f.y);
    dim = Math.min(dim, q.f.light);
    return false;
  }, 6);
  check('it flies round him a good way off, over a jump\'s reach, its lantern full; it never comes at him', nearest > F.standOff - 1.5 && lowest > F.height - 0.3 && dim === 1 && w.results.length === 0, `${nearest.toFixed(1)} to ${furthest.toFixed(1)} off over ${frames} frames, ${lowest.toFixed(2)} up`);
  check('it takes no turns with the others: it asks for none, and it has no blow of its own', (w.f as { ready?: boolean }).ready === undefined && (w.f as { mayAttack?: boolean }).mayAttack === undefined && !w.f.attackActive);
  new Director().update(DT, [w.f], w.p.position.x, w.p.position.z);
  check('...so the others\' turn-taking leaves it alone', (w.f as { mayAttack?: boolean }).mayAttack === undefined);
}

// ---- The tell, the run, and its fire: he stands still ----
{
  const w = fight(YARD.x, YARD.z);
  play(w, still, (q) => q.f.state === 'runWind');
  const f = w.f;
  check('the tell: it stops, and is heard', w.heard.includes('runWind') && Math.abs(f.windTime - F.runWind) < 1e-9);
  let flare = 0;
  let toMark = 9;
  let moved = 0;
  const from = { x: f.x, z: f.z };
  play(w, still, (q) => {
    if (q.f.state !== 'runWind') return true;
    flare = Math.max(flare, q.f.light);
    toMark = Math.abs(wrap(Math.atan2(q.f.mark.x - q.f.x, q.f.mark.z - q.f.z) - q.f.facing));
    moved = Math.max(moved, dist(q.f, from));
    return false;
  });
  check('for the length of the tell it hangs where it is, turns to line up on him, and its lantern flares far brighter than full', w.f.state === 'run' && flare > 1.6 && toMark < 0.1 && moved < 0.4 && dist(f.mark, w.p.position) < 0.05, `light ${flare.toFixed(2)}; ${toMark.toFixed(3)} off its line; its mark ${dist(f.mark, w.p.position).toFixed(2)} from him`);
  const heading = f.facing;
  let wander = 0;
  let level = 0;
  let fast = 99;
  play(w, still, (q) => {
    if (q.f.state !== 'run') return true;
    wander = Math.max(wander, Math.abs(wrap(q.f.facing - heading)));
    level = Math.max(level, Math.abs(q.f.y - F.height));
    if (q.f.stateTime > 0.1) fast = Math.min(fast, q.f.moving);
    return false;
  });
  const mine = w.let.filter((d) => d.run === 1);
  check('the run: straight along its line, level, faster than he can run', wander < 1e-6 && level < 0.05 && fast > TUNING.move.run * 1.5 && w.heard.includes('run'), `${fast.toFixed(1)} against his ${TUNING.move.run}`);
  check('it lets three drops go, each from the very tip of its lantern', mine.length === F.bombs && mine.every((d) => d.offVent < 1e-9) && w.heard.filter((e) => e === 'drop').length === F.bombs, mine.map((d) => d.offVent.toFixed(3)).join(' '));
  check('where each will land is known the moment it is let go', mine.every((d) => d.mark !== null));
  play(w, still, (q) => q.landed.filter((d) => d.run === 1).length === F.bombs, 4);
  const down = w.landed.filter((d) => d.run === 1);
  const gaps = down.slice(1).map((d, i) => dist(d, down[i]));
  const along = down.map((d) => (d.x - down[0].x) * Math.sin(heading) + (d.z - down[0].z) * Math.cos(heading));
  check('each lands exactly where it was marked, after drifting down for about a second', down.length === F.bombs && down.every((d) => d.offMark < 1e-6 && d.fell > 0.8 && d.fell < 1.2), down.map((d) => `${d.offMark.toFixed(4)} off after ${d.fell.toFixed(2)} s`).join('; '));
  check('they land in a row along its line, evenly spaced, the middle one on him', gaps.every((g) => Math.abs(g - F.bombGap) < 0.05) && along.every((a, i) => Math.abs(a - i * F.bombGap) < 0.05) && down[1].fromRat < 0.1, `gaps ${gaps.map((g) => g.toFixed(2)).join(', ')}; the middle one ${down[1].fromRat.toFixed(2)} from him`);
  check('the flames are the danger: standing there, he is burned', w.burns >= 1 && w.results[0] === 'hit' && w.p.hp < MAX, `${w.burns} burn(s); health ${w.p.hp} of ${MAX}`);
  check('the drops themselves did nothing: he was not hurt before one had landed and caught', w.results.length === w.burns);
}

// ---- The flames ----
{
  const flames = new Flames();
  const fl = flames.add(0, 0, 0, F.flameRadius, F.flameTime);
  const heats: number[] = [];
  let burnFrom = -1;
  let burnTo = -1;
  for (let t = 0; t < F.flameTime + 0.2; t += DT) {
    heats.push(flames.list.length ? flameHeat(fl) : 0);
    if (flames.burning(0.3, 0, 0, 0.3)) {
      if (burnFrom < 0) burnFrom = t;
      burnTo = t;
    }
    flames.step(DT);
  }
  check('a patch catches in a moment, burns, dies down at the end, and is gone', heats[0] === 0 && Math.max(...heats) === 1 && heats[heats.length - 1] === 0 && flames.list.length === 0 && burnFrom < 0.12 && burnTo > F.flameTime - 0.4 && burnTo < F.flameTime, `burns from ${burnFrom.toFixed(2)} to ${burnTo.toFixed(2)} of ${F.flameTime} s`);
  flames.add(0, 0, 0, F.flameRadius, F.flameTime);
  for (let i = 0; i < 30; i++) flames.step(DT);
  const edge = F.flameRadius + 0.3 * 0.5;
  check('it burns whoever is in it, to its edge and no further', !!flames.burning(edge - 0.02, 0, 0, 0.3) && !flames.burning(edge + 0.02, 0, 0, 0.3) && !!flames.burning(0, 0, -edge + 0.02, 0.3));
  check('a jump clears it: over it he is not burned; nor is he on a ledge above it or the floor below it', !flames.burning(0, 0.75, 0, 0.3) && !!flames.burning(0, 0.6, 0, 0.3) && !flames.burning(0, -0.7, 0, 0.3));

  // With the real controller: no shield and no roll gets him through it; the Ember Helm does.
  // (He starts `from` to the side of where the patch will be and does `act`; the patch is burning under him by the
  // time he is in the middle of it.)
  const burnt = (from: number, act: (p: PlayerController, frame: number) => Partial<PlayerInput>, gear = NO_GEAR): { burned: boolean; health: number; flung: number; guarding: boolean; safe: boolean; off: number } => {
    const p = new PlayerController(new THREE.Vector3(YARD.x + from, 0, YARD.z));
    p.gear = gear;
    p.facing = -Math.PI / 2;
    for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
    const fs = new Flames();
    let burned = false;
    let guarding = false;
    let safe = false;
    let off = 9;
    for (let i = 0; i < 40 && !burned; i++) {
      p.update(DT, input(act(p, i)), chamber.colliders);
      if (i === 12) {
        fs.add(YARD.x, 0, YARD.z, F.flameRadius, F.flameTime);
        for (let k = 0; k < 20; k++) fs.step(DT);
      }
      guarding = p.guarding;
      safe = p.invulnerable;
      off = Math.abs(p.position.x - YARD.x);
      burned = resolveFlames(p, fs, F.burn, events());
    }
    const at0 = p.position.x;
    for (let i = 0; i < 30; i++) p.update(DT, input(), chamber.colliders);
    return { burned, health: p.hp, flung: p.position.x - at0, guarding, safe, off };
  };
  const plain = burnt(0.4, () => ({}));
  check('standing in it burns him for a heart and throws him back from its middle', plain.burned && plain.health === MAX - F.burn && plain.flung > 0.3, `flung ${plain.flung.toFixed(2)}`);
  const shield = burnt(0.4, () => ({ guardHeld: true }));
  check('a raised shield does not stop it, though he faces its middle with it up', shield.burned && shield.guarding && shield.health === MAX - F.burn);
  const roll = burnt(1.6, (_p, i) => ({ dodgePressed: i === 0, move: new THREE.Vector3(-1, 0, 0) }));
  check('nor does a roll: he is burned in the middle of one, at the moment a roll would carry him through a blow', roll.burned && roll.safe && roll.off < F.flameRadius && roll.health === MAX - F.burn, `${roll.off.toFixed(2)} from its middle; safe from a blow: ${roll.safe}`);
  const helm = burnt(0.4, () => ({}), { ...NO_GEAR, fireproof: true });
  check('in the Ember Helm he stands in it unharmed', !helm.burned && helm.health === MAX);
  // Once burned he is safe for a moment, as after any blow: one patch does not take two hearts at once.
  const p = new PlayerController(new THREE.Vector3(YARD.x, 0, YARD.z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  const fs = new Flames();
  fs.add(YARD.x, 0, YARD.z, F.flameRadius, F.flameTime);
  let times: number[] = [];
  for (let i = 0; i < 90; i++) {
    put(p, YARD.x, YARD.z);
    p.update(DT, input(), chamber.colliders);
    fs.step(DT);
    if (resolveFlames(p, fs, F.burn, events())) times.push(i * DT);
  }
  check('burned, he is safe for a moment, as after any blow', times.length === 2 && times[1] - times[0] >= TUNING.health.invulnTime - 0.05, times.map((t) => t.toFixed(2)).join(', '));
  times = [];
}

// ---- A drop falls the same at any frame rate, and one over no floor is gone ----
{
  const from = { x: YARD.x, y: F.height, z: YARD.z, vx: 2.2, vy: 0, vz: 0, gravity: F.bombFall };
  const said = emberLanding(from, groundBelow)!;
  const ends: string[] = [];
  let ok = !!said;
  for (const dt of [1 / 30, 1 / 60, 1 / 144, 0.05]) {
    const em = makeEmber({ ...from }, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundBelow);
    let landed: Ember | undefined;
    for (let t = 0; t < 3 && !landed; t += dt) landed = stepEmbers([em], dt, groundBelow)[0];
    ok = ok && !!landed && Math.hypot(landed.x - said.x, landed.z - said.z) < 1e-9 && landed.y === said.y;
    ends.push(landed ? `${landed.x.toFixed(3)}` : 'never');
  }
  check('a drop lands where it was marked whatever the frame rate', ok, ends.join(' '));
  // Over the chasm there is no floor to mark, and nothing catches.
  const over = { x: -18, y: F.height, z: 26, vx: 0, vy: 0, vz: 0, gravity: F.bombFall };
  const em = makeEmber(over, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundBelow);
  let caught = 0;
  for (let t = 0; t < 4; t += DT) caught += stepEmbers([em], DT, groundBelow).length;
  check('a drop let go over the chasm has no mark, falls into the dark, and nothing catches', em.land === null && caught === 0 && em.done);
  // What is drawn is what is so.
  const fx = new EmberFx();
  const e2 = makeEmber({ ...from }, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundBelow);
  fx.update(0, [e2], []);
  const first = fx.shown();
  for (let i = 0; i < 30; i++) stepEmbers([e2], DT, groundBelow);
  fx.update(0.5, [e2], []);
  const half = fx.shown();
  check('the ring on the floor is drawn where the drop will land, as wide as the flames it will leave, from the moment it is let go; it fills as the drop falls', first.marks.length === 1 && Math.hypot(first.marks[0].x - e2.land!.x, first.marks[0].z - e2.land!.z) < 1e-9 && Math.abs(first.marks[0].y - e2.land!.y) < 0.1 && Math.abs(first.marks[0].r - F.flameRadius) < 1e-9 && first.marks[0].fill < 0.1 && half.marks[0].fill > 0.4 && half.marks[0].fill < 0.6 && Math.abs(half.marks[0].x - first.marks[0].x) < 1e-9, `fill ${first.marks[0].fill.toFixed(2)} then ${half.marks[0].fill.toFixed(2)}`);
  const fs = new Flames();
  const fl = fs.add(3, 0, 4, F.flameRadius, F.flameTime);
  for (let i = 0; i < 30; i++) fs.step(DT);
  e2.done = true;
  fx.update(1, [], fs.list);
  const burning = fx.shown();
  const reach = Math.max(...burning.tongues.map((t) => Math.hypot(t.x - fl.x, t.z - fl.z)));
  check('when it lands the ring goes and flames stand there: every tongue inside the patch that burns', burning.drops === 0 && burning.marks.length === 0 && burning.fires === 1 && burning.tongues.length >= 5 && reach < F.flameRadius && reach > F.flameRadius * 0.4 && burning.tongues.every((t) => t.h > 0.5), `${burning.tongues.length} tongues, the furthest ${reach.toFixed(2)} out of ${F.flameRadius}`);
  for (let i = 0; i < 60 * 4; i++) fs.step(DT);
  fx.update(5, [], fs.list);
  check('when they have burned out nothing is left drawn', fx.shown().fires === 0 && fx.group.children.length === 0);
}

// ---- It leads him ----
{
  // He runs straight along the shelf: its middle drop comes down where he is when it lands.
  const w = fight(-16, 42);
  const west = (): Partial<PlayerInput> => ({ move: new THREE.Vector3(-1, 0, 0), run: true });
  play(w, west, (q) => q.landed.filter((d) => d.run === 1).length === F.bombs || q.p.position.x < -45, 12);
  const down = w.landed.filter((d) => d.run === 1);
  const best = Math.min(...down.map((d) => d.fromRat), 99);
  check('he runs straight on: it aims at where he is going, and a drop comes down on him', down.length === F.bombs && best < F.flameRadius && w.burns >= 1, `the nearest lands ${best.toFixed(2)} from him; ${w.burns} burn(s)`);
  const first = w.let.find((d) => d.run === 1)!;
  check('...let go well ahead of him: aimed at where he would be, not where he was', !!first && first.mark !== null && Math.min(...w.let.filter((d) => d.run === 1).map((d) => d.mark ? d.rat.x - d.mark.x : -9)) > 2, w.let.filter((d) => d.run === 1).map((d) => (d.mark ? (d.rat.x - d.mark.x).toFixed(1) : 'none')).join(', ') + ' ahead of him when let go');
}
{
  // He runs straight until its line is set, then turns off it: nothing touches him.
  const w = fight(-16, 44);
  let turned = false;
  play(w, (q) => {
    if (q.f.state === 'runWind' && q.f.stateTime >= q.f.windTime * F.runTrack) turned = true;
    if (q.f.state === 'circle') turned = false;
    return turned ? { move: new THREE.Vector3(0, 0, -1), run: true } : { move: new THREE.Vector3(-1, 0, 0), run: true };
  }, (q) => q.landed.filter((d) => d.run === 1).length === F.bombs, 12);
  const down = w.landed.filter((d) => d.run === 1);
  const best = Math.min(...down.map((d) => d.fromRat), 99);
  for (let i = 0; i < 30; i++) step(w, { move: new THREE.Vector3(0, 0, -1), run: true });
  check('he turns off its line once it is set: every drop misses, and he is not burned', down.length === F.bombs && best > F.flameRadius + 0.6 && w.burns === 0 && w.p.hp === MAX, `the nearest lands ${best.toFixed(2)} from him`);
}
{
  // Its mark is never out over the chasm: a rat running at the edge is aimed at on the floor he can stand on.
  // (He starts just west of the fire bowl that stands at -16, 34: he used to be started inside it.)
  const w = fight(-17.6, 34);
  let off = 0;
  let marks = 0;
  play(w, (q) => {
    if (q.f.state === 'runWind') {
      marks++;
      if (!canStand(q.f.mark.x, q.f.mark.y, q.f.mark.z, 0.25)) off++;
    }
    return { move: new THREE.Vector3(-1, 0, q.p.position.z > 33.2 ? -0.3 : 0), run: true };
  }, (q) => q.p.position.x < -44 || q.runs >= 2, 12);
  check('its mark is always on floor he could stand on, never out over the chasm', marks > 20 && off === 0, `${marks} frames of aiming, ${off} off the floor`);
}

// ---- Spent: the opening ----
{
  const w = fight(YARD.x, YARD.z);
  const dodge = sidestep;
  play(w, dodge, (q) => q.f.state === 'sink');
  const f = w.f;
  check('after two runs its light is spent', w.runs === F.runs && w.heard.includes('spent') && w.let.length === F.runs * F.bombs && f.light < 0.2, `${w.runs} runs, ${w.let.length} drops, light ${f.light.toFixed(2)}`);
  check('he kept out of its fire by stepping off its line each time', w.burns === 0 && w.p.hp === MAX);
  play(w, still, (q) => q.f.state === 'spent');
  let high = 0;
  let low = 9;
  let dark = 9;
  let lit = 0;
  play(w, still, (q) => {
    if (q.f.state !== 'spent') return true;
    high = Math.max(high, q.f.y);
    low = Math.min(low, q.f.y);
    dark = Math.min(dark, q.f.light);
    lit = Math.max(lit, q.f.light);
    return false;
  });
  check('it sinks to hang low over floor he can reach, dark, while its lantern fills', high < F.low + 0.1 && low > F.low - 0.1 && dark < 0.05 && lit > 0.95 && canStand(f.x, 0, f.z, 0.3) && Math.abs(w.t - (w.t - F.rest)) > 0, `${low.toFixed(2)} to ${high.toFixed(2)} up; light ${dark.toFixed(2)} to ${lit.toFixed(2)}`);
  check('left alone it has its light back after a few seconds, and goes up to start again', f.state === 'rise' && w.heard.includes('rise'));
  play(w, dodge, (q) => q.f.state === 'circle');
  check('...at its height, its lantern full', Math.abs(f.y - F.height) < 0.4 && f.light === 1);
  const before = w.runs;
  play(w, dodge, (q) => q.f.state === 'sink');
  check('then two more runs', w.runs === before + F.runs);

  // The sword reaches it while it hangs.
  play(w, still, (q) => q.f.state === 'spent' && q.f.stateTime > 0.3);
  put(w.p, f.x + 0.9, f.z, f);
  const hp = f.hp;
  const cut = swing(w.p, f);
  check('hanging spent it is within the sword\'s reach: a cut knocks it to the floor', cut.enemyHit === f && f.hp === hp - 1 && f.state === 'fall', `${f.state}, ${f.hp} of ${F.hp}`);
  w.heard.length = 0;
  play(w, still, (q) => q.f.state === 'grounded');
  check('it lands with a thud and lies there', w.heard.includes('thud') && f.y === 0 && f.downed);
  const t0 = w.t;
  play(w, still, (q) => q.f.state !== 'grounded');
  check('for a moment; then it gets up into the air again', Math.abs(w.t - t0 - F.grounded) < 0.05 && f.state === 'rise', `${(w.t - t0).toFixed(2)} s`);
}
{
  // How much one opening is worth: a rat who is there when it sinks and does nothing but swing.
  const w = fight(YARD.x, YARD.z);
  const dodge = sidestep;
  play(w, dodge, (q) => q.f.state === 'spent' && q.f.stateTime > 0.2);
  w.f.hp = 99;
  put(w.p, w.f.x + 0.9, w.f.z, w.f);
  let frame = 0;
  play(w, (q) => {
    q.p.facing = Math.atan2(q.f.x - q.p.position.x, q.f.z - q.p.position.z);
    return { attackPressed: frame++ % 6 === 0 };
  }, (q) => q.f.state === 'circle', 12);
  const took = 99 - w.f.hp;
  check('one opening, by the sword alone, is not enough to kill it: it takes a second, or a plunge', took >= 3 && took < F.hp, `${took} of its ${F.hp} in one opening`);
}
{
  // A plunge onto it while it hangs is worth more.
  const w = fight(YARD.x, YARD.z);
  const dodge = sidestep;
  play(w, dodge, (q) => q.f.state === 'spent' && q.f.stateTime > 0.2);
  put(w.p, w.f.x, w.f.z - 0.9, w.f);
  let i = 0;
  let struck = false;
  play(w, (q) => {
    i++;
    const strike = !struck && i > 3 && q.p.velocity.y <= 0.2 && !q.p.grounded;
    if (strike) struck = true;
    return { jumpPressed: i === 1, jumpHeld: true, attackPressed: strike, move: new THREE.Vector3(0, 0, struck ? 0 : 0.5) };
  }, (q) => struck && q.p.grounded, 3);
  check('a plunge onto it while it hangs takes a good part of its health at a stroke', w.f.hp === F.hp - TUNING.plunge.diveDamage && w.f.downed, `${w.f.hp} of ${F.hp} left`);
}

// ---- Its end ----
{
  const w = fight(YARD.x, YARD.z);
  const dodge = sidestep;
  const f = w.f;
  let openings = 0;
  while (f.alive && openings < 6) {
    play(w, dodge, (q) => q.f.state === 'spent' && q.f.stateTime > 0.2, 40);
    openings++;
    // (He is beside it as it hangs, and swings until it is dead or gone up again.)
    put(w.p, f.x + 0.9, f.z, f);
    let frame = 0;
    play(w, (q) => {
      q.p.facing = Math.atan2(q.f.x - q.p.position.x, q.f.z - q.p.position.z);
      return { attackPressed: frame++ % 6 === 0 };
    }, (q) => !q.f.alive || q.f.state === 'circle', 12);
  }
  check('cut down with the sword over two openings, it dies; it does not come back', !f.alive && f.state === 'dead' && !f.respawns && openings === 2, `${openings} openings`);
  for (let i = 0; i < 60; i++) step(w);
  check('it lies on the floor, its lantern out', f.y === 0 && f.light === 0 && canStand(f.x, 0, f.z, 0.2) && !f.attackActive && !f.attacking);
  const lets = w.let.length;
  for (let i = 0; i < 60 * 6; i++) step(w);
  check('...and drops no more fire', w.let.length === lets && w.flames.list.length === 0);
  // Killed in the air, it comes down; over the chasm, it is gone into the dark.
  const g = fight(YARD.x, YARD.z);
  play(g, still, (q) => q.f.state === 'circle' && q.f.stateTime > 0.5);
  while (g.f.alive) g.f.takeHit(9, 0, 0);
  for (let i = 0; i < 90; i++) step(g);
  check('killed in the air over floor, it drops to the floor', g.f.state === 'dead' && g.f.y === 0 && canStand(g.f.x, 0, g.f.z, 0.1));
  const c = fight(YARD.x, YARD.z);
  play(c, still, (q) => q.f.state === 'circle' && q.f.stateTime > 0.5);
  c.f.x = -18;
  c.f.z = 26;
  c.f.takeHit(1, 0, 0);
  c.heard.length = 0;
  for (let i = 0; i < 60 * 3; i++) step(c);
  check('cut out of the air over the chasm, it falls into the dark and is gone', !c.f.alive && c.f.y < -5 && c.heard.includes('lost') && !c.heard.includes('thud'), `${c.f.y.toFixed(1)} up`);
  // One set to come back does.
  const r = fight(YARD.x, YARD.z, 3, { ...spec, respawn: true });
  while (r.f.alive) r.f.takeHit(9, 0, 0);
  put(r.p, YARD.x + 30, YARD.z);
  for (let i = 0; i < 60 * (F.respawn + 1); i++) step(r);
  check('one set to come back is at its post again after a while, whole, its lantern full', r.f.alive && r.f.state === 'idle' && r.f.hp === F.hp && r.f.light === 1 && dist(r.f, spec) < 0.01 && Math.abs(r.f.y - F.height) < 0.2);
}

// ---- A long fight in the real cave: it keeps to its air and out of the rock, and he is not burned if he keeps off its lines ----
{
  for (const seed of [3, 11, 29]) {
    const w = fight(YARD.x, YARD.z, seed);
    let inRock = 0;
    let out = 0;
    let lowOverPit = 0;
    let frame = 0;
    const A = FIREFLY_AIR;
    // He runs about the west end of the shelf, changing his mind every second or so, and turns off its line when it is set.
    const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 1], [1, -1]];
    let dir = dirs[0];
    play(w, (q) => {
      frame++;
      if (frame % 70 === 0) dir = dirs[(frame / 70 + seed) % dirs.length | 0];
      const p = q.p.position;
      // (He keeps on the shelf.)
      let mx = dir[0];
      let mz = dir[1];
      if (p.x < -44) mx = 1;
      if (p.x > -16) mx = -1;
      if (p.z < 34.5) mz = 1;
      if (p.z > 45.5) mz = -1;
      const f = q.f;
      if (f.state !== 'grounded' && f.state !== 'fall' && f.state !== 'dead' && !canFly(f.x, f.y, f.z, f.radius * 0.9)) inRock++;
      if (f.x < A.x0 - 0.01 || f.x > A.x1 + 0.01 || f.z < A.z0 - 0.01 || f.z > A.z1 + 0.01) out++;
      if (f.state === 'spent' && (f.y - f.floor > F.low + 0.15 || !canStand(f.x, f.floor, f.z, 0.2))) lowOverPit++;
      return { move: new THREE.Vector3(mx, 0, mz).normalize(), run: true };
    }, () => false, 60);
    const mid = w.landed.filter((d) => d.fromRat < F.flameRadius).length;
    check(`a minute of it with him running about (dice ${seed}): it never flies into rock or out of its air, and spent it always hangs low over floor he can stand on`, inRock === 0 && out === 0 && lowOverPit === 0 && w.runs >= 6, `${inRock} frames in rock, ${out} out of its air, ${lowOverPit} spent out of his reach; ${w.runs} runs, ${w.let.length} drops let go, ${w.landed.length} caught on floor, ${mid} came down on him, ${w.burns} burns`);
    check(`...every drop that caught did so exactly where it was marked, on floor he could stand on (dice ${seed})`, w.landed.length > 10 && w.landed.every((d) => d.offMark < 1e-6 && canStand(d.x, d.y, d.z, 0.1)), `${w.landed.filter((d) => !canStand(d.x, d.y, d.z, 0.1)).length} off the floor`);
    check(`...and it is a real danger to a rat who does not watch it: it burned him (dice ${seed})`, w.burns >= 1, `${w.burns} burns in a minute`);
  }
}

// ---- He leaves; it goes home ----
{
  const w = fight(YARD.x, YARD.z);
  play(w, still, (q) => q.f.state === 'circle' && q.f.stateTime > 0.5);
  put(w.p, 40, 40);
  play(w, still, (q) => q.f.state === 'idle', 30);
  check('when he goes right away it flies back to its post', w.f.state === 'idle' && w.seen.includes('return') && dist(w.f, spec) < 0.5 && Math.abs(w.f.y - F.height) < 0.3, `${w.seen.join(' ')}; ${dist(w.f, spec).toFixed(1)} from its post`);
}

// ---- The others: one over the Foundry's north floor, the lava along it; one over the west end of the Keep's ward, the pit along it ----
{
  const places = [
    { id: 'foundry', where: 'over the Foundry\'s north floor, under the Slag Run', at: NORTH_FIREFLY, air: NORTH_AIR, roam: { x0: -44, x1: 28, z0: -46.5, z1: -35.5 }, beside: 'the lava' },
    { id: 'keep', where: 'over the west end of the Keep\'s inner ward', at: WARD_FIREFLY, air: WARD_AIR, roam: { x0: -46, x1: -10, z0: 19, z1: 25 }, beside: 'the pit' },
  ];
  for (const place of places) {
    const L = LEVELS.find((l) => l.id === place.id)!;
    enter(L);
    const found = L.enemies.filter((e) => e.type === 'firefly');
    const sp = found[0];
    check(`there is one ${place.where}, hanging in clear air over real floor`, found.length === 1 && sp.x === place.at.x && sp.z === place.at.z && canStand(sp.x, sp.y ?? 0, sp.z, 0.45) && canFly(sp.x, (sp.y ?? 0) + F.height, sp.z, F.radius) && canFly(sp.x, (sp.y ?? 0) + F.height + 0.8, sp.z, F.radius), sp ? `at ${sp.x}, ${sp.z}` : 'none');
    check(`...its air is that floor and out over ${place.beside} beside it; and it is no part of what any wedge there asks for`, !!sp.arena && sp.arena.x0 === place.air.x0 && sp.arena.x1 === place.air.x1 && sp.arena.z0 === place.air.z0 && sp.arena.z1 === place.air.z1 && !!sp.uncounted && new GoalTracker(L, () => ({ have: 0, total: 0 })).enemyTotal === L.enemies.filter((e) => !e.uncounted).length);
    const R = place.roam;
    const mid = { x: (R.x0 + R.x1) / 2, z: (R.z0 + R.z1) / 2 };
    for (const seed of [3, 11]) {
      const w = fight(Math.min(R.x1 - 1, sp.x + 8), mid.z, seed, sp);
      let inRock = 0;
      let out = 0;
      let outOfReach = 0;
      let frame = 0;
      let falls = 0;
      const A = place.air;
      const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1], [-1, 1], [1, -1]];
      let dir = dirs[0];
      play(w, (q) => {
        frame++;
        if (frame % 70 === 0) dir = dirs[(frame / 70 + seed) % dirs.length | 0];
        const p = q.p.position;
        // (Burned off the edge, he is put back where he last stood, as the game does.)
        if (p.y < -0.5 || p.x < R.x0 - 3 || p.x > R.x1 + 3 || p.z < R.z0 - 3 || p.z > R.z1 + 3) {
          falls++;
          put(q.p, mid.x, mid.z);
        }
        let mx = dir[0];
        let mz = dir[1];
        if (p.x < R.x0 + 2) mx = 1;
        if (p.x > R.x1 - 2) mx = -1;
        if (p.z < R.z0 + 1) mz = 1;
        if (p.z > R.z1 - 1) mz = -1;
        const f = q.f;
        if (f.state !== 'grounded' && f.state !== 'fall' && f.state !== 'dead' && !canFly(f.x, f.y, f.z, f.radius * 0.9)) inRock++;
        if (f.x < A.x0 - 0.01 || f.x > A.x1 + 0.01 || f.z < A.z0 - 0.01 || f.z > A.z1 + 0.01) out++;
        if (f.state === 'spent' && (f.y - f.floor > F.low + 0.15 || !canStand(f.x, f.floor, f.z, 0.2))) outOfReach++;
        return { move: new THREE.Vector3(mx, 0, mz).normalize(), run: true };
      }, () => false, 60);
      const lost = w.let.filter((d) => d.mark === null).length;
      check(`a minute of it there with him running about (dice ${seed}): it never flies into anything solid or out of its air, and spent it always hangs low over floor he can stand on`, inRock === 0 && out === 0 && outOfReach === 0 && w.runs >= 6, `${inRock} frames in something solid, ${out} out of its air, ${outOfReach} spent out of his reach; ${w.runs} runs, ${w.let.length} drops let go, ${w.landed.length} caught, ${lost} fell into ${place.beside}; ${w.burns} burns, ${falls} times off the edge`);
      check(`...every drop that caught did so exactly where it was marked, on floor he could stand on: none on ${place.beside} (dice ${seed})`, w.landed.length > 8 && w.landed.every((d) => d.offMark < 1e-6 && canStand(d.x, d.y, d.z, 0.1) && !wet(d.x, d.y, d.z)) && w.landed.length + lost + w.embers.length === w.let.length, `${w.landed.filter((d) => !canStand(d.x, d.y, d.z, 0.1)).length} off the floor`);
    }
    // Cut out of the air over what is beside the floor, it is gone.
    const c = fight(Math.min(R.x1 - 1, sp.x + 8), mid.z, 3, sp);
    play(c, still, (q) => q.f.state === 'circle' && q.f.stateTime > 0.5);
    let over: { x: number; z: number } | null = null;
    for (let x = place.air.x0 + 1; x < place.air.x1 && !over; x += 1) for (let z = place.air.z0 + 1; z < place.air.z1 && !over; z += 1) if (!canStand(x, 0, z, 0.1) && canFly(x, 0, z, 0.1) && canFly(x, F.height, z, F.radius)) over = { x, z };
    if (over) {
      c.f.x = over.x;
      c.f.z = over.z;
      c.f.takeHit(1, 0, 0);
      c.heard.length = 0;
      for (let i = 0; i < 60 * 3; i++) step(c);
    }
    check(`cut out of the air over ${place.beside}, it goes down into it and is gone`, !!over && !c.f.alive && c.f.y < -5 && c.heard.includes('lost'), over ? `over ${over.x}, ${over.z}; ${c.f.y.toFixed(1)} up` : 'no such place in its air');
  }
  // The Foundry: a rat up on the Slag Run, over its head, is left alone; and the Slag Crew is still only the island's.
  {
    const L = LEVELS.find((l) => l.id === 'foundry')!;
    enter(L);
    const sp = L.enemies.find((e) => e.type === 'firefly')!;
    const f = new Firefly(sp);
    f.canStand = canStand;
    f.canFly = canFly;
    for (let i = 0; i < 60 * 5; i++) f.update(DT, sp.x + 2, 8, sp.z + 12, true);
    check('the Foundry: a rat up on the beams of the Slag Run, over its head, is left alone', f.state === 'idle' && f.drops.length === 0);
    check('the Foundry: the Slag Crew is still only the beasts on the island', L.enemies.filter((e) => !e.uncounted).every((e) => e.x > ISLAND.x0 && e.x < ISLAND.x1 && e.z > ISLAND.z0 && e.z < ISLAND.z1) && L.enemies.filter((e) => !e.uncounted).length === 6);
  }
  {
    const L = LEVELS.find((l) => l.id === 'keep')!;
    const guard = KEEP_WEDGES.find((w) => w.id === 'guard')!;
    check('the Keep: the wedge for beating every guard asks for what it did, and its hint is still true (the firefly is not one of them)', L.enemies.filter((e) => !e.uncounted).every((e) => e.type !== 'firefly') && L.enemies.filter((e) => e.uncounted).length === 1 && !/firefly/i.test(guard.hint), `${L.enemies.filter((e) => !e.uncounted).length} to beat`);
    // From the courtyard, the gatehouse wall between them, it does not see him.
    enter(L);
    const sp = L.enemies.find((e) => e.type === 'firefly')!;
    const f = new Firefly(sp);
    f.canStand = canStand;
    f.canFly = canFly;
    for (let i = 0; i < 60 * 5; i++) f.update(DT, sp.x, 0, 30, true);
    check('the Keep: from the courtyard, the gatehouse wall between them, it does not come for him', f.state === 'idle');
  }
  enter(cave);
}

// ---- A drop falls past anything that moves ----
{
  const floor = makeAabb(0, -0.5, 0, 20, 1, 20);
  const lift = makeAabb(0, 2.5, 0, 3, 1, 3);
  const from = { x: 0, y: F.height + 3, z: 0, vx: 0, vy: 0, vz: 0, gravity: F.bombFall };
  const all = makeEmber({ ...from }, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundFrom([floor, lift]));
  const game = makeEmber({ ...from }, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, groundFrom([floor, lift], new Set([lift])));
  check('a drop over a lift is marked on the floor under it, not on the lift (which will have moved on)', all.land?.y === 3 && game.land?.y === 0);
}

// ---- The editor, the sticker book ----
{
  check('the editor has it as a piece', ENEMY_PIECES.includes('firefly'));
  const c = emptyCustom();
  c.width = 40;
  c.depth = 40;
  c.pieces.push({ t: 'floor', x0: -20, z0: -20, x1: 20, z1: 20, top: 0 }, { t: 'firefly', x0: 3, z0: 4, x1: 3, z1: 4, top: 0, dir: 'e' });
  const made = compileCustom(c, 'test').enemies.find((e) => e.type === 'firefly');
  check('a level made with one has it there, facing the way it was set, with room to fly', !!made && made.x === 3 && made.z === 4 && Math.abs((made.facing ?? 0) - Math.PI / 2) < 1e-6 && !!made.arena && made.arena.x1 - made.arena.x0 >= 20);
  const sticker = STICKERS.find((s) => s.id === 'foe:firefly');
  check('it has a page in the sticker book, with a picture', !!sticker && sticker.blurb.length > 80 && stickerIcon(sticker.icon, 40).includes('<svg') && stickerIcon(sticker.icon, 40) !== stickerIcon('hornet', 40));
}

// ---- A firefly with a colour of its own (the Glow Cave's glow bugs): only its looks are different ----
{
  const PINK = 0xff4aa8;
  // (Back in the Hollows' cave, where the first of these fights were.)
  enter(cave);
  // The same fight twice, a rat running the same way: once against a plain one, once against a pink one.
  const run = (color?: number): { path: string; drops: Array<number | undefined>; embers: Array<number | undefined>; flames: Array<number | undefined>; w: Fight } => {
    const w = fight(YARD.x, YARD.z, 7, { ...spec, color });
    let path = '';
    const flamesSeen = new Set<object>();
    const flameColours: Array<number | undefined> = [];
    const dropColours: Array<number | undefined> = [];
    for (let i = 0; i < 60 * 24; i++) {
      step(w, { move: new THREE.Vector3(Math.sin(i / 90), 0, Math.cos(i / 90)), run: true });
      for (const em of w.embers) {
        if (flamesSeen.has(em)) continue;
        flamesSeen.add(em);
        dropColours.push(em.color);
      }
      for (const fl of w.flames.list) {
        if (flamesSeen.has(fl)) continue;
        flamesSeen.add(fl);
        flameColours.push(fl.color);
      }
      if (i % 30 === 0) path += `${w.f.state}:${w.f.x.toFixed(3)},${w.f.y.toFixed(3)},${w.f.z.toFixed(3)};`;
    }
    return { path, drops: dropColours, embers: dropColours, flames: flameColours, w };
  };
  const plain = run();
  const pink = run(PINK);
  check('a coloured firefly flies, bombs and burns exactly as a plain one does: the same fight, step for step', plain.path === pink.path && plain.w.burns === pink.w.burns && plain.w.runs === pink.w.runs && plain.w.runs >= 2 && plain.drops.length === pink.drops.length && plain.w.p.hp === pink.w.p.hp, `${pink.w.runs} runs, ${pink.drops.length} drops, burned ${pink.w.burns} times (plain ${plain.w.burns})`);
  check('...its colour goes with its fire all the way: each drop it lets go, each drop falling, each patch of flame', pink.drops.length >= 6 && pink.drops.every((c) => c === PINK) && pink.embers.length === pink.drops.length && pink.embers.every((c) => c === PINK) && pink.flames.length >= 3 && pink.flames.every((c) => c === PINK), `${pink.drops.length} drops, ${pink.flames.length} patches`);
  check('...and a plain one\'s fire has no colour given: it is a fire\'s own', plain.drops.every((c) => c === undefined) && plain.flames.length >= 3 && plain.flames.every((c) => c === undefined));
  // What is drawn: the drop, the mark where it will land, and the light of the flames, in its colour; a plain one's as before.
  const fx = new EmberFx();
  const mk = (color: number | undefined, x: number): Ember => makeEmber({ x, y: 4, z: 0, vx: 0, vy: 0, vz: 0, color }, { gravity: F.bombFall, radius: F.flameRadius, burnFor: F.flameTime }, () => 0);
  const two = [mk(undefined, 0), mk(PINK, 3)];
  fx.update(0, two, []);
  const cols = fx.colours();
  const hue = (hex: number): number => new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).h;
  const pinkHue = hue(PINK);
  const near = (a: number, b: number): boolean => Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) < 0.04;
  check('a coloured drop and its mark on the floor are drawn in its colour; a plain drop and its mark in a fire\'s orange', cols.drops.length === 2 && near(hue(cols.drops[1]), pinkHue) && near(hue(cols.marks[1]), pinkHue) && !near(hue(cols.drops[0]), pinkHue) && hue(cols.drops[0]) < 0.12 && hue(cols.marks[0]) < 0.12, cols.drops.map((c) => c.toString(16)).join());
  const fl = new Flames();
  fl.add(0, 0, 0, F.flameRadius, F.flameTime);
  fl.add(3, 0, 0, F.flameRadius, F.flameTime, PINK);
  fl.step(0.5);
  const lights: Array<{ color: THREE.Color; r: number; power: number }> = [];
  fx.update(0.5, [], fl.list, lights as never);
  check('the flames a coloured drop leaves light the room in its colour, and less of it than a real fire does (they are for dark places)', lights.length === 2 && near(hue(lights[1].color.getHex()), pinkHue) && hue(lights[0].color.getHex()) < 0.12 && lights[1].r < lights[0].r && lights[1].power < lights[0].power, lights.map((l) => `${l.color.getHexString()} r${l.r} p${l.power.toFixed(2)}`).join('; '));
  check('...and are the same size and height as any flames: what is drawn is still what burns', (() => {
    const t = fx.shown().tongues;
    const a = t.filter((q) => Math.abs(q.x) < 1.5);
    const b = t.filter((q) => Math.abs(q.x - 3) < 1.5);
    const tall = (q: typeof t): number => Math.max(...q.map((k) => k.h));
    return a.length === b.length && a.length >= 5 && b.every((q) => Math.hypot(q.x - 3, q.z) < F.flameRadius) && a.every((q) => Math.hypot(q.x, q.z) < F.flameRadius) && Math.abs(tall(a) - tall(b)) < 0.5;
  })());
}

console.log(failures === 0 ? '\nfirefly: all passed' : `\nfirefly: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
