// The flitter (a cave bat): roosts out of reach and wakes to footsteps but not to sneaking; one waking wakes the roost;
// it flies above the sword and is only low enough to hit (or to hit him) at the bottom of a swoop; struck or blocked it
// drops to the floor (or into a pit); it never flies through walls; it goes home to sleep when he leaves.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Bat, BAT, rouseRoost } from '../src/enemies/bat';
import { SENSES } from '../src/enemies/foe';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';

const chamber = buildChamber();
const DT = 1 / 60;
const B = BAT;
const HOME = TUNING.scuttler.home; // open floor in the test chamber
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const fixed = (seed = 7): (() => number) => {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
};
function ratAt(x: number, z: number): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  return p;
}

// ---- Asleep on its roost ----
{
  const b = new Bat({ x: HOME.x, z: HOME.z });
  check('it roosts upside down, high out of reach', b.asleep && Math.abs(b.y - B.roostHeight) < 1e-6);
  SENSES.quiet = false;
  for (let i = 0; i < 30; i++) b.update(DT, HOME.x + 9, 0, HOME.z, true);
  check('footsteps far off do not wake it', b.asleep);
  for (let i = 0; i < 30; i++) b.update(DT, HOME.x + 5, 0, HOME.z, true);
  check('footsteps close by do', !b.asleep && b.events.includes('wake'));

  const q = new Bat({ x: HOME.x, z: HOME.z });
  SENSES.quiet = true;
  for (let i = 0; i < 120; i++) q.update(DT, HOME.x + 3, 0, HOME.z, true);
  check('sneaking, he can pass close under it and it sleeps on', q.asleep);
  for (let i = 0; i < 30; i++) q.update(DT, HOME.x + 1, 0, HOME.z, true);
  check('right underneath, even sneaking wakes it', !q.asleep);
  SENSES.quiet = false;

  // One waking wakes the roost.
  const roost = [new Bat({ x: 0, z: 0 }), new Bat({ x: 4, z: 0 }), new Bat({ x: 20, z: 0 })];
  roost.forEach((r) => (r.rng = fixed()));
  roost[0].rouse(0);
  for (let i = 0; i < 60; i++) {
    for (const r of roost) r.update(DT, 40, 0, 40, true); // he is far away: only the roost wakes them
    rouseRoost(roost);
    for (const r of roost) r.events.length = 0;
  }
  check('one bat waking wakes the bats roosting near it', !roost[1].asleep);
  check('but not ones far off', roost[2].asleep);
}

// ---- In the air, above the sword ----
{
  const b = new Bat({ x: HOME.x, z: HOME.z, hunt: true });
  b.rng = fixed();
  b.mayAttack = false; // it may not swoop yet
  const p = ratAt(HOME.x, HOME.z + 2);
  let lowest = Infinity;
  for (let i = 0; i < 180; i++) {
    b.update(DT, p.position.x, p.position.y, p.position.z, true);
    if (i > 60) lowest = Math.min(lowest, b.y - p.position.y);
  }
  check('circling him it stays above the reach of his sword', lowest >= 0.9, lowest.toFixed(2));
  // Swinging up at it does nothing.
  b.x = p.position.x + Math.sin(p.facing) * 1.2;
  b.z = p.position.z + Math.cos(p.facing) * 1.2;
  const ev = events();
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 25; i++) {
    resolveCombat(p, [b], ev);
    p.update(DT, input(), chamber.colliders);
  }
  check('a swing under it misses', !ev.enemyHit && b.hp === B.hp);
}

// ---- The swoop ----
const swoopAt = (opts: { guard?: number; swing?: boolean; at?: number } = {}): { b: Bat; p: PlayerController; result: string | null; low: number; wind: number; hit: boolean } => {
  const b = new Bat({ x: HOME.x, z: HOME.z, hunt: true });
  b.rng = fixed();
  const p = ratAt(HOME.x, HOME.z + 2);
  let result: string | null = null;
  let low = Infinity;
  let wind = 0;
  let hit = false;
  let swung = false;
  for (let i = 0; i < 60 * 8 && !result && !hit && !(b.state === 'hover' && wind > 0 && b.stateTime > 0.5); i++) {
    b.update(DT, p.position.x, p.position.y, p.position.z, true);
    if (b.state === 'swoopWind') wind += DT;
    if (b.state === 'swoop') low = Math.min(low, b.y - p.position.y);
    const guard = !!opts.guard && b.state === 'swoopWind' && b.stateTime > B.swoopWind - opts.guard * DT;
    const keepGuard = !!opts.guard && (b.state === 'swoop' || guard);
    // Face it, and swing as it comes down.
    p.facing = Math.atan2(b.x - p.position.x, b.z - p.position.z);
    const swing = !!opts.swing && !swung && b.state === 'swoop' && b.swoopT > (opts.at ?? 0.08);
    if (swing) swung = true;
    p.update(DT, input({ guardHeld: keepGuard, attackPressed: swing }), chamber.colliders);
    const ev = events();
    resolveCombat(p, [b], ev);
    result = ev.playerResult;
    if (ev.enemyHit === b) hit = true;
  }
  return { b, p, result, low, wind, hit };
};
{
  const s = swoopAt();
  check('it screeches and rises first: a tell before the swoop', s.wind >= B.swoopWind - 0.02 && s.b.events.includes('screech'), s.wind.toFixed(2));
  check('at the bottom of the swoop it comes down to his height', s.low < 0.9, s.low.toFixed(2));
  check('a swoop that reaches him costs a heart', s.result === 'hit' && s.p.hp === TUNING.health.max - 1, `${s.result}`);
  for (let i = 0; i < 90; i++) s.b.update(DT, s.p.position.x, s.p.position.y, s.p.position.z, true);
  check('and it flies on, back up out of reach', s.b.y - s.p.position.y > 0.9, (s.b.y - s.p.position.y).toFixed(2));

  const blocked = swoopAt({ guard: 30 });
  check('a swoop into his shield is blocked, and knocks it out of the air', blocked.result === 'blocked' && blocked.b.downed, `${blocked.result} ${blocked.b.state}`);

  const struck = swoopAt({ swing: true });
  check('a swing at the bottom of the swoop hits it', struck.hit && struck.b.hp === B.hp - 1);
  for (let i = 0; i < 40; i++) struck.b.update(DT, struck.p.position.x, struck.p.position.y, struck.p.position.z, true);
  check('and down it comes, onto the floor', struck.b.state === 'grounded' && Math.abs(struck.b.y - struck.b.floorY) < 1e-6, struck.b.state);
  check('on the floor, the sword can reach it', Math.abs(struck.p.position.y - struck.b.y) < 0.9);
  const killed = struck.b.takeHit(1, struck.p.position.x, struck.p.position.z);
  check('and a second hit finishes it', killed && !struck.b.alive);

  // How long is the moment to swing? Every press time (through the swoop) that knocks it down before it bites.
  const good: number[] = [];
  for (let at = 0; at <= 0.6; at += 0.02) {
    const r = swoopAt({ swing: true, at });
    if (r.hit && r.p.hp === TUNING.health.max) good.push(at);
  }
  const span = good.length ? (good[good.length - 1] - good[0] + 0.02) * B.swoopTime : 0;
  check('there is a fair moment to swing as it comes down (at least a tenth of a second)', span >= 0.1, `${span.toFixed(2)} s`);
  const late = swoopAt({ swing: true, at: 0.5 });
  check('swing too late and it gets him first', late.p.hp === TUNING.health.max - 1);

  // Left alone on the floor it flies up again.
  const c = swoopAt({ guard: 30 });
  for (let i = 0; i < Math.ceil((B.groundedParried + B.riseTime + 0.6) * 60); i++) c.b.update(DT, c.p.position.x, c.p.position.y, c.p.position.z, true);
  check('left alone, it gets up and flies again', !c.b.downed && c.b.y - c.p.position.y > 0.5, c.b.state);
}

// ---- Over a pit ----
{
  const b = new Bat({ x: 0, z: 0, hunt: true });
  b.canStand = (x) => x < 3; // a pit beyond x = 3
  b.x = 5;
  b.y = 2;
  b.takeHit(1, 5, 2);
  for (let i = 0; i < 40; i++) b.update(DT, 0, 0, 2, true);
  check('struck down over a pit, it is gone', !b.alive && b.events.includes('lost'));
}

// ---- Walls: it never flies through one ----
{
  // A room 20 across with a thick pillar in the middle, floor to roof.
  const pillar = { x0: -1.5, x1: 1.5, z0: -1.5, z1: 1.5 };
  const free = (x: number, _y: number, z: number, r: number): boolean => Math.abs(x) + r <= 10 && Math.abs(z) + r <= 10 && !(x + r > pillar.x0 && x - r < pillar.x1 && z + r > pillar.z0 && z - r < pillar.z1);
  let worst = '';
  let swoops = 0;
  for (let run = 0; run < 10 && !worst; run++) {
    const b = new Bat({ x: -6, z: -6, arena: { x0: -30, x1: 30, z0: -30, z1: 30 } });
    b.rng = fixed(run + 1);
    b.canFly = free;
    b.canStand = (x, _y, z, r) => free(x, 0, z, r);
    b.rouse(0);
    let a = run;
    for (let i = 0; i < 60 * 60 && !worst; i++) {
      a += 0.5 * DT;
      const px = Math.sin(a) * 6;
      const pz = Math.cos(a * 1.2) * 6;
      b.update(DT, px, 0, pz, true);
      if (b.events.includes('swoop')) swoops++;
      b.events.length = 0;
      if (b.downed || b.state === 'dead') b.hp = B.hp;
      if (!free(b.x, b.y, b.z, b.radius - 0.01)) worst = `run ${run} at ${b.x.toFixed(2)},${b.z.toFixed(2)} in ${b.state}`;
    }
  }
  check('a bat chasing him round a pillar never flies into it or the walls', !worst, worst);
  check('(and it did swoop at him, over and over)', swoops > 40, `${swoops}`);
}

// ---- He leaves: it goes home and sleeps ----
{
  const b = new Bat({ x: 0, z: 0 });
  b.rng = fixed();
  b.rouse(0);
  for (let i = 0; i < 120; i++) b.update(DT, 2, 0, 2, true);
  check('awake, it comes for him', !b.asleep);
  for (let i = 0; i < 60 * 10; i++) b.update(DT, 40, 0, 40, true);
  check('when he leaves, it goes back to its roost and sleeps', b.asleep && Math.hypot(b.x, b.z) < 0.01);
}

// ---- The same dice, the same flight ----
{
  const fly = (): string => {
    const b = new Bat({ x: 0, z: 0, hunt: true });
    b.rng = fixed(3);
    for (let i = 0; i < 60 * 20; i++) b.update(DT, Math.sin(i / 90) * 4, 0, 3, true);
    return `${b.x.toFixed(5)},${b.y.toFixed(5)},${b.z.toFixed(5)},${b.state}`;
  };
  check('a bat given the same dice flies the same way every time', fly() === fly());
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
