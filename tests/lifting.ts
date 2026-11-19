/**
 * PICKING THINGS UP AND THROWING THEM (world/lifting.ts). The owner, 2026-11-17: "we still need him to be able to pick
 * up and throw things for example".
 */
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { buildChamber } from '../src/world/chamber';
import { aabbOf, type Aabb } from '../src/world/collision';
import { POT, ROCK, extent, potBox, rockBox } from '../src/world/layout';
import fs from 'node:fs';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { DOWN_STATES, HELD_POSE, HELD_ROLL, heldTurn, THROWN_AS, isDown, carryPlace, groundUnder, liftFoe, liftTarget, putDownSpot, startThrow, stepThrown, throwAim, thrownAs, type Target, type Thrown } from '../src/world/lifting';
const read = (p: string): string => fs.readFileSync(p, 'utf8');
import type { Crate } from '../src/world/crates';
import { compileCustom, type CustomLevel, type Piece } from '../src/levels/custom';
import { levelById } from '../src/levels/levels';
import { PRACTICE } from '../src/levels/practice';
import { PRACTICE_ROOMS } from '../src/levels/testRooms';
import { atDoor } from '../src/world/rooms';
import { TUNING } from '../src/data/tuning';
import { TWEAKS } from '../src/core/tweaks';
import { Scuttler } from '../src/enemies/scuttler';
import { Toad } from '../src/enemies/toad';
import { Guard } from '../src/enemies/guard';
import { Ironback } from '../src/enemies/ironback';
import { BIND_NAMES } from '../src/core/bindings';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const L = TUNING.lift;
const DT = 1 / 60;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

// A room of the game's own making: a floor, a crate with another on top of it, a barrel, an iron-bound crate, a wall.
const room: CustomLevel = {
  name: 'Lifting', width: 40, depth: 40, wallHeight: 8,
  pieces: [
    { t: 'floor', x0: -20, z0: -20, x1: 20, z1: 20, top: 0 },
    at('spawn', 0, 10), at('exit', 0, 20),
    at('crate', 0, 0), at('crate', 0, 0, 1), at('barrel', 5, 0), at('crate', -5, 0, 0, { props: { tough: true } }),
    { t: 'platform', x0: 8, z0: -3, x1: 12, z1: 3, top: 2, bottom: 0 },
  ],
};
const def = compileCustom(room, 'lifting');
const build = () => buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });

// ---- What can be lifted, and from where ----
{
  const ch = build();
  const [low, high, barrel, iron] = ch.crates;
  check('the room has its two crates (one on the other), its barrel and its iron-bound crate', ch.crates.length === 4 && low.type === 'crate' && Math.abs(high.aabb.min.y - 1) < 1e-6 && barrel.type === 'barrel' && !!iron.tough);
  const beside = { x: 0, y: 0, z: 0.5 + TUNING.rat.radius + 0.1 };
  check('standing beside a crate and facing it, he can lift it; facing away from it, or a step too far off, he cannot', liftTarget(ch.crates, beside, Math.PI) === low && liftTarget(ch.crates, beside, 0) === null && liftTarget(ch.crates, { ...beside, z: beside.z + L.reach + 0.2 }, Math.PI) === null);
  check('...a barrel and an iron-bound crate the same', liftTarget(ch.crates, { x: 5, y: 0, z: 0.9 }, Math.PI) === barrel && liftTarget(ch.crates, { x: -5, y: 0, z: 0.95 }, Math.PI) === iron);
  check('it is the one on HIS floor that he lifts, not one stacked over it; and on top of the lower he can lift the upper only by standing level with its foot', liftTarget(ch.crates, beside, Math.PI) !== high && liftTarget(ch.crates, { x: 0, y: 1, z: 0.85 }, Math.PI) === high);
  ch.breakCrate(barrel);
  check('nothing broken can be lifted, nor a pipe\'s joint', liftTarget(ch.crates, { x: 5, y: 0, z: 0.9 }, Math.PI) === null && liftTarget([{ ...low, type: 'pipe' } as Crate], beside, Math.PI) === null);
}

// ---- Lifted, it is off the floor: not solid, what stood on it falls; set down, it is solid again where it stands ----
{
  const ch = build();
  const [low, high] = ch.crates;
  const solids = ch.colliders.length;
  ch.liftCrate(low);
  check('a lifted crate is no longer solid where it stood', ch.colliders.length === solids - 1 && !ch.colliders.includes(low.aabb) && !!low.lifted);
  for (let i = 0; i < 120; i++) ch.stepMovers(DT);
  for (let i = 0; i < 120; i++) ch.update(i * DT);
  check('...and the crate that stood on it falls to the floor', Math.abs(high.aabb.min.y) < 0.02 && Math.abs(high.y - 0.5) < 0.02, `its foot at ${high.aabb.min.y.toFixed(2)}`);
  ch.moveCrate(low, 3, 2.2, 4, 1);
  check('carried, it is where his hands are (its place and its box go with it; it is still not solid)', low.x === 3 && low.y === 2.2 && low.z === 4 && Math.abs(low.aabb.min.y - 1.7) < 1e-6 && !ch.colliders.includes(low.aabb));
  ch.setCrate(low, 6, 0.5, 6);
  check('set down, it is solid again, there, square to the room', ch.colliders.includes(low.aabb) && !low.lifted && low.aabb.min.x === 5.5 && low.aabb.max.z === 6.5 && ch.colliders.length === solids);
  ch.breakCrate(low);
  check('...and breaks as any crate does', !low.alive && !ch.colliders.includes(low.aabb));
}

// ---- Carrying: his hands are full ----
{
  const cs: Aabb[] = [aabbOf(extent('floor', -60, 60, -1, 0, -60, 60))];
  const fresh = (): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    return p;
  };
  const top = (carry: boolean): number => {
    const p = fresh();
    if (carry) p.startCarry();
    for (let i = 0; i < 180; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    return Math.hypot(p.velocity.x, p.velocity.z);
  };
  check('carrying something he goes slower', Math.abs(top(true) / top(false) - L.walk) < 0.02, `${top(false).toFixed(2)} free, ${top(true).toFixed(2)} carrying`);
  const jump = (carry: boolean, again: boolean): number => {
    const p = fresh();
    if (carry) p.startCarry();
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    let high = 0;
    for (let i = 0; i < 200 && !(i > 3 && p.grounded); i++) {
      p.update(DT, inp({ jumpHeld: true, jumpPressed: again && p.velocity.y <= 0 && i < 60 }), cs);
      high = Math.max(high, p.position.y);
    }
    return high;
  };
  check('...and jumps lower, once: there is no second jump with a crate over his head', jump(true, false) < jump(false, false) * 0.8 && jump(true, false) > 1.2 && Math.abs(jump(true, true) - jump(true, false)) < 0.05 && jump(false, true) > jump(false, false) * 1.5, `${jump(false, false).toFixed(2)} free, ${jump(true, false).toFixed(2)} carrying, ${jump(true, true).toFixed(2)} carrying and pressed again`);
  const p = fresh();
  check('he can lift only on his feet, doing nothing else: not in the air, not in a swing, not with something already up', p.canLift && (() => { const q = fresh(); q.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs); q.update(DT, inp({ jumpHeld: true }), cs); return !q.canLift; })() && (() => { const q = fresh(); q.update(DT, inp({ attackPressed: true }), cs); return !q.canLift; })());
  p.startCarry();
  p.update(DT, inp({ guardHeld: true, dodgePressed: true }), cs);
  check('carrying, GUARD and ROLL do nothing', p.carrying && !p.guarding && p.state !== 'dodge' && !p.canLift);
  for (let i = 0; i < 30; i++) p.update(DT, inp({}), cs);
  check('his arms come up over a moment (`carryPose`)', p.carryPose > 0.95);
  p.update(DT, inp({ stowPressed: true }), cs);
  check('STOW asks to set it down (the game sets it down if there is room, and it is still in his hands until then); it does not put his sword away', p.liftEvent === 'down' && p.carrying && p.armed && p.stowProgress < 0);
  p.update(DT, inp({}), cs);
  check('...the asking lasts one step', p.liftEvent === null && p.carrying);
  p.update(DT, inp({ attackPressed: true }), cs);
  check('ATTACK throws it: it is out of his hands, and he does NOT swing his sword', p.liftEvent === 'throw' && !p.carrying && p.state !== 'attack' && p.throwProgress >= 0);
  p.update(DT, inp({ attackPressed: true }), cs);
  check('...nor in the moment his arms are coming down', p.state !== 'attack' && !p.canLift);
  for (let i = 0; i < 30; i++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ attackPressed: true }), cs);
  check('...after which his sword is his again', p.throwProgress < 0 && p.state === 'attack');
  const q = fresh();
  q.startCarry();
  q.update(DT, inp({}), cs);
  q.takeHit(0, 5, 1);
  q.update(DT, inp({}), cs);
  check('hurt, he lets go of it', q.liftEvent === 'drop' && !q.carrying);
  const r = fresh();
  r.startCarry();
  r.respawn();
  check('and nothing is in his hands when he is put back at the start', !r.carrying && r.carryPose === 0);
}

// ---- Thrown ----
{
  const floor = aabbOf(extent('floor', -60, 60, -1, 0, -60, 60));
  const crate = (): Crate => ({ type: 'crate', index: 0, x: 0, y: 0, z: 0, half: 0.5, alive: true, aabb: aabbOf(extent('rubble', -0.5, 0.5, 0, 1, -0.5, 0.5)), mesh: null, lastSwing: -1 });
  /** Thrown from the middle of the floor the way he faces (+z); AT whatever of `targets` he would aim at, as the game does. */
  const fly = (cs: Aabb[], targets: Target[], fps = 60, his = { x: 0, z: 0 }, facing = 0, speed = 1): { t: Thrown; hit: ReturnType<typeof stepThrown>; secs: number } => {
    const c = crate();
    const t = startThrow(c, c.half, c.aabb, carryPlace({ x: 0, y: 0, z: 0 }, 0.5), facing, his, 1, throwAim(targets, { x: 0, y: 0, z: 0 }, facing), speed);
    let hit: ReturnType<typeof stepThrown> = { what: 'none' };
    let n = 0;
    for (; n < fps * 5 && hit.what === 'none'; n++) hit = stepThrown(t, 1 / fps, cs, targets);
    return { t, hit, secs: n / fps };
  };
  const open = fly([floor], []);
  check('thrown with nothing to throw at, it goes six or seven along in a low arc and comes down on the floor, in under a second', open.hit.what === 'solid' && (open.hit as { box: Aabb }).box === floor && open.t.pos.z > 5.5 && open.t.pos.z < 8 && open.secs < 1 && open.t.pos.y < 0.6, `${open.t.pos.z.toFixed(1)} along in ${open.secs.toFixed(2)}s`);
  check('...further if he was running when he threw it', fly([floor], [], 60, { x: 0, z: 6 }).t.pos.z > open.t.pos.z + 1.5);
  const wall = aabbOf(extent('wall', -4, 4, 0, 6, 3, 3.2));
  const walled = fly([floor, wall], []);
  check('a wall in its way stops it there', walled.hit.what === 'solid' && (walled.hit as { box: Aabb }).box === wall && walled.t.pos.z < 3.05);
  check('...at thirty frames a second and at twenty too: it does not pass through a thin wall', [30, 20].every((f) => { const w = fly([floor, wall], [], f); return w.hit.what === 'solid' && (w.hit as { box: Aabb }).box === wall; }));
  const foe: Target = { x: 0, y: 0, z: 5, r: 0.5, high: 1, alive: true };
  const struck = fly([floor], [foe]);
  check('A CREATURE IN FRONT OF HIM IS WHAT HE THROWS AT, and it is hit: near (two off), middling (five) and far (nine); a low one (a roach) and a tall one', [2, 5, 9].every((z) => [0.5, 1.6].every((high) => fly([floor], [{ ...foe, z, high }]).hit.what === 'foe')) && struck.hit.what === 'foe' && (struck.hit as { index: number }).index === 0 && struck.t.pos.z < 5);
  check('...one off to the side of the way he faces is not aimed at (the crate goes where he faces), nor one too far off', throwAim([{ ...foe, x: 5, z: 3 }], { x: 0, y: 0, z: 0 }, 0) === null && throwAim([{ ...foe, z: L.aimRange + 1 }], { x: 0, y: 0, z: 0 }, 0) === null && fly([floor], [{ ...foe, x: 5, z: 3 }]).hit.what === 'solid');
  check('...of two in front of him, the nearer; but the one he is LOCKED ON to, wherever it stands', throwAim([{ ...foe, z: 8 }, { ...foe, z: 4 }], { x: 0, y: 0, z: 0 }, 0)?.z === 4 && throwAim([{ ...foe, z: 8 }, { ...foe, z: 4 }], { x: 0, y: 0, z: 0 }, 0, 0)?.z === 8 && throwAim([{ ...foe, x: -6, z: -3 }, { ...foe, z: 4 }], { x: 0, y: 0, z: 0 }, 0, 0)?.x === -6);
  check('...one that is dead is not hit, nor aimed at', fly([floor], [{ ...foe, alive: false }]).hit.what === 'solid');
  const flier: Target = { x: 0, y: 3, z: 6, r: 0.4, high: 0.8, alive: true };
  check('...and one in the AIR in its way is hit: a bat can be knocked out of the air with a crate', fly([floor], [flier]).hit.what === 'foe');
  const long: Target = { x: 0, y: 0, z: 30, r: 0.5, high: 1, alive: true, parts: [{ x: 0, z: 6, r: 0.9 }] };
  const part = fly([floor], [long]);
  check('...and any part of a long body', part.hit.what === 'foe' && (part.hit as { part: number }).part === 0);
  check('thrown off the edge of the world it is lost', fly([], []).hit.what === 'lost');
  const dc = crate();
  const dropped = startThrow(dc, dc.half, dc.aabb, new THREE.Vector3(0, 2, 0), 0, { x: 3, z: 3 }, 0);
  let hit: ReturnType<typeof stepThrown> = { what: 'none' };
  for (let i = 0; i < 200 && hit.what === 'none'; i++) hit = stepThrown(dropped, DT, [floor], [{ x: 0, y: 0, z: 0, r: 1, high: 3, alive: true }]);
  check('LET GO of (he was hurt), it falls straight down where he is, and hurts nobody', hit.what === 'solid' && Math.hypot(dropped.pos.x, dropped.pos.z) < 1e-6 && dropped.spent);
}

// ---- Set down ----
{
  const ch = build();
  const [low] = ch.crates;
  ch.liftCrate(low);
  const here = { x: 0, y: 0, z: 8 };
  const spot = putDownSpot(ch.colliders, here, 0, low);
  check('set down, it stands on the floor in front of him, clear of him', !!spot && Math.abs(spot.y - 0.5) < 1e-6 && spot.z > here.z + TUNING.rat.radius + 0.5 && Math.abs(spot.x) < 1e-6);
  check('...not into a wall, not onto another crate, not up onto a platform, not where there is no floor', putDownSpot(ch.colliders, { x: 0, y: 0, z: 19.3 }, 0, low) === null && putDownSpot(ch.colliders, { x: 5, y: 0, z: 1.2 }, Math.PI, low) === null && putDownSpot(ch.colliders, { x: 7, y: 0, z: 0 }, Math.PI / 2, low) === null && putDownSpot([], here, 0, low) === null);
  check('the ground under a spot is the highest thing under it that is not above where it is asked from', groundUnder(ch.colliders, 10, 0, 0.4, 5) === 2 && groundUnder(ch.colliders, 10, 0, 0.4, 1) === 0 && groundUnder(ch.colliders, 0, 8, 0.4, 5) === 0);
}

// ---- What a thrown crate does to a creature ----
{
  const roach = new Scuttler({ x: 0, z: 0 });
  const hp = roach.hp;
  roach.takeHit(L.damage, 0, 5);
  check('a thrown crate hurts a creature as much as the last blow of his three, and no more: a roach is not killed by one', hp - roach.hp === L.damage && roach.alive && L.damage === 2 && L.damage < hp);
  const guard = new Guard({ x: 0, z: 0, facing: 0 });
  const iron = new Ironback({ x: 0, z: 0 });
  iron.facing = 0;
  check('a shield or a shell turns it, as it turns a sword: a guard facing it is not hurt; an ironback is, only from behind', (!guard.guarding || guard.deflects(0, 5, 'thrown')) && iron.deflects(0, 5, 'thrown') && !iron.deflects(0, -5, 'thrown'));
}

// ---- POTS AND ROCKS, AND CREATURES THAT ARE DOWN (the owner picked "more to throw", 2026-11-17) ----
{
  const cdef = compileCustom({ name: 'Small things', width: 20, depth: 20, wallHeight: 6, pieces: [{ t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 }, at('spawn', 0, 8), at('exit', 0, 10)] }, 'small');
  const ch = buildChamber({ solids: [...cdef.solids, potBox(0, 0), rockBox(3, 0)], pit: null, water: [], decor: [], movers: [] });
  const [pot, rock] = ch.crates;
  check('a pot and a rock are things of the room as a crate is: solid, each its own kind, the size it is given', ch.crates.length === 2 && pot.type === 'pot' && rock.type === 'rock' && ch.colliders.includes(pot.aabb) && Math.abs(pot.aabb.max.y - POT.high) < 1e-6 && Math.abs(rock.aabb.max.x - rock.aabb.min.x - ROCK.wide) < 1e-6 && !!pot.mesh && !!rock.mesh);
  check('he can lift either', liftTarget(ch.crates, { x: 0, y: 0, z: 0.7 }, Math.PI) === pot && liftTarget(ch.crates, { x: 3, y: 0, z: 0.75 }, Math.PI) === rock);
  check('A POT is light: it breaks; it hurts half what a crate does; it is thrown faster. A ROCK does not break and hurts as a crate does. An iron-bound crate does not break either', thrownAs(pot).breaks && thrownAs(pot).damage === 1 && thrownAs(pot).light && thrownAs(pot).speed > 1.2 && !thrownAs(rock).breaks && thrownAs(rock).damage === THROWN_AS.crate.damage && thrownAs(rock).light && !thrownAs({ ...pot, type: 'crate', tough: true }).breaks && thrownAs({ ...pot, type: 'crate' }).breaks && !THROWN_AS.crate.light);
  const floor = aabbOf(extent('floor', -60, 60, -1, 0, -60, 60));
  const far = (speed: number): number => {
    const c: Crate = { type: 'pot', index: 0, x: 0, y: 0, z: 0, half: 0.28, alive: true, aabb: aabbOf(potBox(0, 0)), mesh: null, lastSwing: -1 };
    const t = startThrow(c, c.half, c.aabb, carryPlace({ x: 0, y: 0, z: 0 }, POT.high / 2), 0, { x: 0, z: 0 }, 1, null, speed);
    for (let i = 0; i < 300 && stepThrown(t, DT, [floor], []).what === 'none'; i++);
    return t.pos.z;
  };
  check('...so a pot goes further than a crate would from the same hands', far(THROWN_AS.pot.speed) > far(1) * 1.25, `${far(1).toFixed(1)} at a crate's speed, ${far(THROWN_AS.pot.speed).toFixed(1)} at a pot's`);
  // A sword breaks a pot and rings off a rock.
  const swing = (c: Crate): { broken: boolean; rang: boolean } => {
    const p = new PlayerController(new THREE.Vector3(c.x, 0, c.z + 0.9));
    p.facing = Math.PI;
    const cs = ch.colliders;
    for (let i = 0; i < 6; i++) p.update(DT, inp({}), cs);
    p.facing = Math.PI;
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
    p.update(DT, inp({ attackPressed: true }), cs);
    let broken = false;
    let rang = false;
    for (let i = 0; i < 40; i++) {
      p.update(DT, inp({}), cs);
      resolveCombat(p, [], events, [c]);
      broken ||= events.cratesBroken.includes(c);
      rang ||= events.crateRang === c;
    }
    return { broken, rang };
  };
  const onPot = swing(pot);
  const onRock = swing(rock);
  check('his sword breaks a pot; off a rock it rings, and the rock is as it was', onPot.broken && !pot.alive && !onRock.broken && onRock.rang && rock.alive);
  const light = (isLight: boolean): number => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    const cs: Aabb[] = [floor];
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    p.startCarry(isLight);
    for (let i = 0; i < 180; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    return Math.hypot(p.velocity.x, p.velocity.z);
  };
  check('carrying a light thing hardly slows him', Math.abs(light(true) / TUNING.move.run - L.lightWalk) < 0.02 && light(true) > light(false) * 1.2);

  // Creatures.
  const foes = [
    { kind: 'hornet', state: 'grounded', alive: true, x: 0, y: 0, z: 1.2, radius: 0.5 },
    { kind: 'hornet', state: 'hover', alive: true, x: 0, y: 0, z: 1.2, radius: 0.5 },
    { kind: 'scuttler', state: 'stagger', alive: true, x: 0, y: 0, z: 1.2, radius: 0.5 },
    { kind: 'stag', state: 'stuck', alive: true, x: 0, y: 0, z: 1.2, radius: 0.5 },
  ];
  const here = { x: 0, y: 0, z: 0 };
  check('A CREATURE THAT IS DOWN can be picked up: a hornet lying on the floor; not one in the air, not a roach flinching from a blow, not a knight in armour', liftFoe([foes[0]], here, 0) === 0 && liftFoe([foes[1]], here, 0) === -1 && liftFoe([foes[2]], here, 0) === -1 && liftFoe([foes[3]], here, 0) === -1);
  check('...the kinds, and what "down" is for each: a bat, a firefly or a hornet knocked out of the air; a roller lying open; a scorpion sprawled; a mantis with its blades in the floor', ['bat', 'firefly', 'hornet'].every((k) => DOWN_STATES[k].join() === 'grounded') && DOWN_STATES.roller.join() === 'spilled' && DOWN_STATES.scorpion.join() === 'sprawl' && DOWN_STATES.mantis.join() === 'stuck' && Object.keys(DOWN_STATES).length === 6);
  check('...from beside it, facing it, on its floor; not a dead one', liftFoe([foes[0]], here, Math.PI) === -1 && liftFoe([{ ...foes[0], z: 4 }], here, 0) === -1 && liftFoe([{ ...foes[0], y: 2 }], here, 0) === -1 && liftFoe([{ ...foes[0], alive: false }], here, 0) === -1 && liftFoe([{ ...foes[0], z: 1.5 }, foes[0]], here, 0) === 1);
  // The real creatures do have those states (the list is not of names that have drifted).
  const stateLists: Record<string, string> = { bat: read('src/enemies/bat.ts'), firefly: read('src/enemies/firefly.ts'), hornet: read('src/enemies/hornet.ts'), roller: read('src/enemies/roller.ts'), scorpion: read('src/enemies/scorpion.ts'), mantis: read('src/enemies/mantis.ts') };
  check('every one of those states is a state that creature really has', Object.entries(DOWN_STATES).every(([k, states]) => states.every((st) => new RegExp(`State = [^;]*'${st}'`).test(stateLists[k]))));
  // THE ROACH AND THE TOAD: down only after a PERFECT GUARD on their attack (earned: nothing easier about them).
  {
    const roach = new Scuttler({ x: 0, z: 1 });
    const start = { kind: roach.kind, state: roach.state, down: roach.down };
    roach.takeHit(1, 0, 0);
    const flinch = roach.down;
    roach.lungeLanded(true, false);
    const blocked = roach.down;
    roach.lungeLanded(true, true);
    const flipped = roach.down && isDown(roach) && liftFoe([roach], { x: 0, y: 0, z: roach.z - 1.1 }, 0) === 0;
    let secs = 0;
    for (; secs < 5 && roach.down; secs += DT) roach.update(DT, 30, 0, 30, true);
    check('a ROACH can be picked up when a PERFECT GUARD has flipped it on its back, for the two seconds that lasts; not standing, not flinching from a blow, not after a plain block', !start.down && !flinch && !blocked && flipped && Math.abs(secs - TUNING.scuttler.parriedRecover) < 0.1 && !roach.down, `${secs.toFixed(2)}s on its back`);
    roach.lungeLanded(true, true);
    roach.takeHit(1, 0, 0);
    check('...struck while it lies there, it is up again (it is not held down by being hit)', !roach.down);
    const toad = new Toad({ x: 0, z: 1 });
    const before = toad.down;
    toad.lungeLanded(false, true);
    (toad as unknown as { state: string }).state = 'recover';
    check('a TOAD the same: winded by a perfect guard on its pounce', !before && toad.down && isDown(toad));
  }
  const thrownFoe = startThrow({ name: 'a hornet' }, 0.5, null, carryPlace(here, 0), 0, { x: 0, z: 0 }, 1, null, 1.1);
  let met: ReturnType<typeof stepThrown> = { what: 'none' };
  for (let i = 0; i < 300 && met.what === 'none'; i++) met = stepThrown(thrownFoe, DT, [floor], [{ x: 0, y: 0, z: 5.5, r: 0.5, high: 1, alive: true }]);
  check('a thrown creature flies as a crate does, and meets what a crate would meet: another creature in its way', met.what === 'foe' && thrownFoe.what.name === 'a hornet');
}

// ---- B3 (2026-11-17): a crate on a moving platform; a thrown crate meeting a character; a creature in his hands ----
{
  // A platform that slides along x, and a crate set down on it.
  const ch = buildChamber({ solids: [extent('floor', -20, 20, -1, 0, -20, 20), extent('rubble', -6.5, -5.5, 0, 1, -0.5, 0.5)], pit: null, water: [], decor: [], movers: [{ x: -6, z: 4, y: 0.5, w: 3, d: 3, to: [8, 0, 0], speed: 3, pause: 0.5 }] });
  const box = ch.crates[0];
  const plat = ch.movers[0].aabb;
  ch.liftCrate(box);
  ch.setCrate(box, -6, plat.max.y + 0.5, 4);
  let worst = 0;
  let wentX = 0;
  for (let i = 0; i < 60 * 6; i++) {
    ch.stepMovers(DT);
    worst = Math.max(worst, Math.abs(box.aabb.min.y - plat.max.y), Math.abs(box.x - (plat.min.x + plat.max.x) / 2), Math.abs(box.z - (plat.min.z + plat.max.z) / 2));
    wentX = Math.max(wentX, box.x + 6);
  }
  check('A CRATE SET DOWN ON A MOVING PLATFORM GOES WITH IT: it stays on its top, where it was put, all the way there and back (it does not hang in the air)', worst < 0.01 && wentX > 7.5, `furthest off ${worst.toFixed(3)}; it went ${wentX.toFixed(1)} along`);
  const rider = { x: box.x, y: plat.max.y, z: box.z - (0.5 + TUNING.rat.radius + 0.1) };
  check('...and he can lift it again from the platform, standing on it beside it', liftTarget(ch.crates, rider, 0) === box);

  // A character's body is solid as the game makes it (main.ts syncNpcBodies: 0.7 across, 1.2 high).
  const floor = aabbOf(extent('floor', -60, 60, -1, 0, -60, 60));
  const body = aabbOf(extent('npc' as never, -0.35, 0.35, 0, 1.2, 4.65, 5.35));
  for (const kind of ['crate', 'pot', 'rock'] as const) {
    const c: Crate = { type: kind, index: 0, x: 0, y: 0, z: 0, half: 0.3, alive: true, aabb: aabbOf(extent('rubble', -0.3, 0.3, 0, 0.6, -0.3, 0.3)), mesh: null, lastSwing: -1 };
    const t = startThrow(c, c.half, c.aabb, carryPlace({ x: 0, y: 0, z: 0 }, 0.3), 0, { x: 0, z: 0 }, 1, null, THROWN_AS[kind].speed);
    let hit: ReturnType<typeof stepThrown> = { what: 'none' };
    for (let i = 0; i < 300 && hit.what === 'none'; i++) hit = stepThrown(t, DT, [floor, body], []);
    check(`A THROWN ${kind.toUpperCase()} MEETS A CHARACTER standing in its way: it stops at him (not through him, not on past him), and he is not a creature, so he is not hurt`, hit.what === 'solid' && (hit as { box: Aabb }).box === body && t.pos.z < 5.35, `${hit.what} at ${t.pos.z.toFixed(2)}`);
  }

  // A creature in his hands is drawn on its back, legs going; thrown, end over end.
  const held = [0, 0.1, 0.2, 0.3, 0.4].map((c) => heldTurn(null, c));
  check('A CREATURE IN HIS HANDS IS ON ITS BACK (turned more than three quarters over, not standing upright on air), wriggling a little', held.every((h) => Math.abs(h.roll) > Math.PI * 0.75 && Math.abs(h.roll) < Math.PI * 1.1) && new Set(held.map((h) => h.roll.toFixed(3))).size > 3);
  const scorp = heldTurn(null, 0, 'scorpion').roll;
  check('...but a SCORPION is carried on its side (on its back its tail, which rears up off its back, hung down through him to the floor)', Math.abs(scorp - Math.PI / 2) < 0.3 && HELD_ROLL.scorpion !== undefined);
  const flying = [0, 0.1, 0.2].map((a) => heldTurn(a, 5).pitch);
  check('...and thrown, it goes end over end, about one whole turn in its half second in the air', flying[2] > flying[1] && flying[1] > flying[0] && HELD_POSE.tumble * 0.5 > Math.PI && HELD_POSE.tumble * 0.5 < Math.PI * 3);
}

// ---- Where there is something to throw ----
{
  const rooms = PRACTICE_ROOMS.map((p) => levelById(p.id)!);
  check('every practice room has things to throw (six crates and barrels, one of them bound in iron; four pots; two rocks), clear of where he comes in and of the way out', rooms.every((l) => {
    const things = l.solids.filter((b) => b.kind === 'rubble' || b.kind === 'barrel');
    return things.length === PRACTICE.throwables.length + PRACTICE.pots.length + PRACTICE.rocks.length && things.filter((b) => b.prop === 'pot').length === 4 && things.filter((b) => b.prop === 'rock').length === 2 && l.crateContents.length === things.length && things.filter((b) => b.tough).length === 1 && things.every((b) => Math.hypot((b.x0 + b.x1) / 2 - l.spawn.x, (b.z0 + b.z1) / 2 - l.spawn.z) > 2 && !atDoor(l.exit, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2));
  }));
  check('the button is named for both its jobs, and the sliders are there', /LIFT/.test(BIND_NAMES.stow) && ['lift.walk', 'lift.jump', 'lift.throwSpeed', 'lift.throwUp', 'lift.damage'].every((path) => TWEAKS.some((t) => t.path === path)));
}

console.log(failures === 0 ? '\nlifting: all passed' : `\nlifting: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
