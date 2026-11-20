// MORE HAZARDS (the Press, Test Room 16: levels/press.ts, 2026-11-20): a CRUSHER (a moving platform's `crush` motion,
// world/platforms.ts) that slams down, strikes him if he is under it and pushes him out, and can be ridden; and a
// FLAME JET (world/hazards.ts `flamejet`) in a wall or the floor, on a timer, with a pilot flame first.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { PLATFORM, crushAt } from '../src/world/platforms';
import { HAZARD, HazardFoes, hurt, jetFlame, sounds, type JetSpec } from '../src/world/hazards';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { compileCustom } from '../src/levels/custom';
import { CRUSHER, PRESS, RIDE_LEDGE } from '../src/levels/press';
import { TUNING } from '../src/data/tuning';
import { Scuttler } from '../src/enemies/scuttler';
import { SFX_NAMES, sfx } from '../src/audio/synth';
import type { MoverSpec } from '../src/world/layout';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const R = TUNING.rat.radius;
const HT = TUNING.rat.height;
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}

// ---- The crusher's cycle ----
{
  const spec: MoverSpec = { x: 0, z: 0, y: 5, w: 3, d: 3, to: [0, 0, 0], motion: 'crush', depth: 3 };
  const C = PLATFORM.crush;
  const fallFor = Math.sqrt((2 * 3) / C.fall);
  check('a crusher waits up, shaking only for the last moment of its wait', crushAt(spec, 0.2).down === 0 && !crushAt(spec, 0.2).warning && crushAt(spec, C.hold - 0.2).warning);
  check(`...then slams down its whole depth in ${fallFor.toFixed(2)} s (as a weight falls)`, crushAt(spec, C.hold + fallFor / 2).falling && crushAt(spec, C.hold + fallFor + 0.01).down === 3 && !crushAt(spec, C.hold + fallFor + 0.01).falling);
  const riseAt = C.hold + fallFor + C.pause;
  check('...sits a moment, and winds back up slowly', crushAt(spec, riseAt - 0.05).down === 3 && Math.abs(crushAt(spec, riseAt + 1).down - (3 - C.rise)) < 1e-9);
}

// ---- The Press, with the real rat ----
const def = levelById('press')!;
check('the Press is a level', !!def);
const room = buildChamber(def as never);
const crushers = room.movers.filter((m) => m.spec.motion === 'crush');
check('it has four crushers (three in the corridor, one to ride)', crushers.length === 4);
const jets = (room.hazards?.specs ?? []).filter((h): h is JetSpec => h.kind === 'flamejet');
check('and seven flame jets (four in walls, three in the floor)', jets.filter((j) => !j.up).length === 4 && jets.filter((j) => j.up).length === 3);

/** Steps him as main.ts does: the platforms (a crusher that came down on him strikes him), then his update. */
function run(c: ReturnType<typeof buildChamber>, p: PlayerController, seconds: number, pad: (i: number) => Partial<PlayerInput> = () => ({})): number {
  let struck = 0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    if (c.stepMovers(DT, p)) {
      const r = p.takeHit(p.position.x + 0.01, p.position.z, PLATFORM.crush.damage, true);
      if (r === 'hit' || r === 'killed') struck++;
    }
    p.update(DT, input(pad(i)), c.colliders);
  }
  return struck;
}
{
  const r1 = buildChamber(def as never);
  const first = r1.movers.find((m) => m.spec.motion === 'crush' && m.spec.x === PRESS.crushers)!;
  const p = new PlayerController(new THREE.Vector3(first.spec.x, 0, first.spec.z));
  const hp = p.hp;
  const struck = run(r1, p, 4);
  const a = first.aabb;
  const inside = p.position.x > a.min.x && p.position.x < a.max.x && p.position.z > a.min.z && p.position.z < a.max.z && p.position.y < a.max.y && p.position.y + HT > a.min.y;
  check('standing under a crusher, it comes down on him: struck once, a heavy blow', struck === 1 && hp - p.hp === PLATFORM.crush.damage, `struck ${struck}, lost ${hp - p.hp}`);
  // (Nor into a wall: the corridor's walls are a crusher's width apart, and left to itself the controller shoves him
  // out the nearest way, wall or no wall.)
  const inWall = r1.colliders.some((b) => b.max.y > 0.3 && p.position.x + R > b.min.x + 0.01 && p.position.x - R < b.max.x - 0.01 && p.position.z + R > b.min.z + 0.01 && p.position.z - R < b.max.z - 0.01 && p.position.y < b.max.y && p.position.y + HT > b.min.y);
  check('...and he is pushed out from under it, not left inside it, and not into a wall', !inside && !inWall, `at ${p.position.x.toFixed(2)}, ${p.position.z.toFixed(2)}`);
}
{
  // Through the corridor: a straight run, started at some moment, is not struck; at another, it is.
  let clean = 0;
  let caught = 0;
  for (let k = 0; k < 12; k++) {
    const r2 = buildChamber(def as never);
    const p = new PlayerController(new THREE.Vector3(PRESS.crushers, 0, 1.5));
    run(r2, p, k * 0.3);
    p.position.set(PRESS.crushers, 0, 1.5);
    p.prevPosition.copy(p.position);
    const s = run(r2, p, 2.4, () => ({ move: new THREE.Vector3(0, 0, -1), run: true }));
    if (s === 0 && p.position.z < -11) clean++;
    if (s > 0) caught++;
  }
  check('the crusher corridor can be run: at the right moment untouched, at the wrong one struck', clean > 0 && caught > 0, `of 12 moments: ${clean} clean, ${caught} struck`);
}
{
  // Ride one: on its top while it is down, up with it, and off onto the ledge.
  const r3 = buildChamber(def as never);
  const ride = r3.movers.find((m) => m.spec.motion === 'crush' && m.spec.x === PRESS.ride)!;
  // (Run the room on until it is down.)
  for (let i = 0; i < 600 && !(crushAt(ride.spec, ride.state.time).down === CRUSHER.depth); i++) r3.stepMovers(DT);
  const topNow = ride.aabb.max.y;
  const p = new PlayerController(new THREE.Vector3(ride.spec.x, topNow, ride.spec.z));
  run(r3, p, 0.2);
  check('jumped onto the ridden crusher while it is down, he stands on its top', p.grounded && Math.abs(p.position.y - topNow) < 0.05, `y ${p.position.y.toFixed(2)} top ${topNow.toFixed(2)}`);
  let hi = 0;
  for (let i = 0; i < 180; i++) {
    run(r3, p, DT);
    hi = Math.max(hi, p.position.y);
  }
  check('...it carries him up to the ledge\'s height', Math.abs(hi - RIDE_LEDGE.top) < 0.05, `highest ${hi.toFixed(2)}`);
  run(r3, p, 1.2, () => ({ move: new THREE.Vector3(0, 0, -1) }));
  run(r3, p, 0.5);
  check('...and he steps off onto the ledge', p.grounded && Math.abs(p.position.y - RIDE_LEDGE.top) < 0.05 && p.position.z < RIDE_LEDGE.front, `y ${p.position.y.toFixed(2)} z ${p.position.z.toFixed(2)}`);
}

// ---- Flame jets ----
{
  const j: JetSpec = { kind: 'flamejet', x: 0, y: 0.6, z: 0, yaw: Math.PI / 2, length: 4, period: 3, on: 1, phase: 0 };
  let on = 0;
  let pilot = 0;
  for (let t = 0; t < 3; t += 0.001) {
    const f = jetFlame(j, t);
    if (f.reach > 0) on += 0.001;
    if (f.pilot) pilot += 0.001;
  }
  check('a flame jet burns for 1 second in every 3, after 0.6 s of pilot flame', Math.abs(on - 1) < 0.01 && Math.abs(pilot - HAZARD.jet.warn) < 0.01, `on ${on.toFixed(2)} pilot ${pilot.toFixed(2)}`);
  const body = (x: number, y: number, z: number) => ({ position: { x, y, z }, prevPosition: { x, y, z }, velocity: { x: 0, y: 0, z: 0 }, grounded: true, dead: false });
  check('standing in its flame (out along the way it points) while it burns: burned', hurt([j], body(3, 0, 0), 2.5, R, HT)?.kind === 'flamejet');
  check('...past its end, or beside it, or while only the pilot shows: not', hurt([j], body(4.9, 0, 0), 2.5, R, HT) === null && hurt([j], body(2, 0, 1.3), 2.5, R, HT) === null && hurt([j], body(3, 0, 0), 1.8, R, HT) === null);
  const up: JetSpec = { ...j, y: 0, up: true };
  check('one in the floor points up: over it, even jumping, burned; beside it, not', hurt([up], body(0, 2.5, 0), 2.5, R, HT)?.kind === 'flamejet' && hurt([up], body(1.1, 0, 0), 2.5, R, HT) === null);
  let roars = 0;
  for (let t = 0.01; t < 3.01; t += DT) roars += sounds([j], t, t + DT, { x: 0, z: 0 }).filter((s) => s.kind === 'jet').length;
  check('it roars once each time it lights', roars === 1);
  const roach = new Scuttler({ x: 3, z: 0, arena: { x0: -30, x1: 30, z0: -30, z1: 30 } });
  const firefly = { x: 3, y: 0, z: 0, radius: 0.4, alive: true, kind: 'firefly', nudge: () => {}, takeHit: () => false };
  const hf = new HazardFoes();
  const hits: string[] = [];
  for (let t = 0; t < 3; t += DT) for (const e of hf.act([j], [roach, firefly], DT, t)) hits.push(e.foe.kind);
  check('a roach in its flame is burned; a firefly (a creature of fire) is not', hits.includes('scuttler') && !hits.includes('firefly'));
}
// The Press's wall jets: four, a quarter beat apart, from each wall in turn.
{
  const wall = jets.filter((j) => !j.up);
  check('the wall jets come from the west and east walls in turn, across the corridor', wall.every((j, i) => Math.sign(Math.sin(j.yaw)) === (i % 2 === 0 ? 1 : -1)) && wall.every((j) => Math.abs(j.x - PRESS.wallJets) < 2.1));
}

// ---- In the level editor ----
{
  const lvl = compileCustom({
    name: 'Kit', blurb: '', theme: 'dungeon', width: 20, depth: 20, wallHeight: 10,
    pieces: [
      { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
      { t: 'spawn', x0: 0, z0: 6, x1: 0, z1: 6, top: 0 },
      { t: 'lift', x0: -2, z0: -2, x1: 1, z1: 1, top: 5, props: { motion: 'crush', travel: 3 } },
      { t: 'flamejet', x0: 4, z0: 4, x1: 4, z1: 4, top: 0 },
      { t: 'flamejet', x0: -9, z0: 4, x1: -9, z1: 4, top: 0, dir: 'e' },
    ],
  }, 'kit');
  const m = lvl.movers?.[0];
  check('the editor\'s Moving platform set to "a crusher" becomes one: 2 thick, dropping its travel', !!m && m.motion === 'crush' && m.thick === 2 && m.depth === 3);
  const fj = lvl.decor.filter((d) => d.kind === 'flamejet');
  check('...its Flame jet on the floor points up; turned, it is in a wall pointing that way', fj.length === 2 && fj.some((d) => d.kind === 'flamejet' && d.up) && fj.some((d) => d.kind === 'flamejet' && !d.up && Math.abs(Math.sin(d.yaw) - 1) < 1e-9));
}
check('the flame\'s roar is a sound the game has, and makes a sound', SFX_NAMES.includes('flameRoar') && sfx('flameRoar').data.some((v) => Math.abs(v) > 0.2));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
