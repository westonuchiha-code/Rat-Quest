// Enemies and the scenery: toads and roaches stay on open floor. They cannot hop, walk or be knocked into walls, blocks or thin air.
import { Toad, TOAD } from '../src/enemies/toad';
import { Scuttler } from '../src/enemies/scuttler';
import { GRIM, Grimsqueak } from '../src/enemies/grimsqueak';
import { keepOnFloor } from '../src/enemies/foe';
import type { CanStand } from '../src/enemies/foe';
import { LEVELS } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// A room 20 across (x and z from -10 to 10) with a raised block in the middle of the east side and a hole in the floor to the north-west.
const block = { x0: 4, x1: 8, z0: -2, z1: 2 };
const hole = { x0: -8, x1: -4, z0: -8, z1: -4 };
const room: CanStand = (x, _y, z, r) =>
  Math.abs(x) + r <= 10 && Math.abs(z) + r <= 10 &&
  !(x + r > block.x0 && x - r < block.x1 && z + r > block.z0 && z - r < block.z1) &&
  !(x > hole.x0 && x < hole.x1 && z > hole.z0 && z < hole.z1);
const inScenery = (e: { x: number; z: number; radius: number }): boolean => !room(e.x, 0, e.z, e.radius);

// keepOnFloor by itself.
{
  const e = { x: 9.8, y: 0, z: 3, radius: 0.5, canStand: room };
  keepOnFloor(e, 9.4, 2.8);
  check('walking into a wall slides along it', e.x === 9.4 && e.z === 3);
  const c = { x: 9.8, y: 0, z: 9.8, radius: 0.5, canStand: room };
  keepOnFloor(c, 9.4, 9.4);
  check('into a corner: it stays where it was', c.x === 9.4 && c.z === 9.4);
  const stuck = { x: 6.2, y: 0, z: 0, radius: 0.5, canStand: room };
  keepOnFloor(stuck, 6, 0);
  check('one that is already inside something is left free to walk out', stuck.x === 6.2);
  const far = { x: 6, y: 0, z: 0, radius: 0.5, canStand: room };
  keepOnFloor(far, -6, 6);
  check('being put somewhere new (a respawn) is not undone', far.x === 6);
  const none = { x: 50, y: 0, z: 50, radius: 0.5 };
  keepOnFloor(none, 49.9, 50);
  check('with no level to ask, anywhere will do', none.x === 50);
}

// A toad whose patch runs well past the walls, chased round the room for two minutes from every side.
{
  let worst = '';
  let hops = 0;
  // 60 runs (each two minutes of chasing). Run 23 is one that used to clip the corner of the hole on a short pounce.
  for (let run = 0; run < 60 && !worst; run++) {
    const toad = new Toad({ x: 0, z: 6, arena: { x0: -30, x1: 30, z0: -30, z1: 30 } });
    toad.canStand = room;
    // Its own fixed dice for each run, so a failure can be repeated.
    let seed = 1234 + run * 7919;
    toad.rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let px = 0;
    let pz = 9;
    for (let i = 0; i < 60 * 120 && !worst; i++) {
      // The rat keeps walking straight at it, which is what makes it hop away, and now and then gives it a shove.
      const d = Math.hypot(toad.x - px, toad.z - pz) || 1;
      px += ((toad.x - px) / d) * 3.4 * (1 / 60);
      pz += ((toad.z - pz) / d) * 3.4 * (1 / 60);
      const before = toad.state;
      toad.update(1 / 60, px, 0, pz, true);
      if (toad.state === 'hop' && before !== 'hop') hops++;
      const away = Math.atan2(toad.x - px, toad.z - pz);
      if (i % 240 === 100) toad.nudge(Math.sin(away) * 0.6, Math.cos(away) * 0.6);
      if (i % 900 === 450) { toad.hp = TOAD.hp; toad.takeHit(1, px, pz); }
      // In the middle of a pounce it may pass over the hole (it is in the air), but never through the walls or the block.
      const airborne = toad.state === 'pounce' && toad.hopY > 0.3;
      const r = toad.radius;
      const hitsSolid = Math.abs(toad.x) + r > 10 || Math.abs(toad.z) + r > 10 || (toad.x + r > block.x0 && toad.x - r < block.x1 && toad.z + r > block.z0 && toad.z - r < block.z1);
      const bad = airborne ? hitsSolid : inScenery(toad);
      if (bad) worst = `run ${run}, at ${toad.x.toFixed(2)},${toad.z.toFixed(2)} in state ${toad.state}`;
    }
  }
  check('a chased toad never ends up in a wall, in the block, or over the hole', worst === '', worst);
  check('and it still hops about', hops > 30, `${hops} hops`);
}

// The same dice give the same chase: every roll a toad makes goes through its own rng (none straight from Math.random),
// so a failure above can always be repeated.
{
  const chase = (): string => {
    const toad = new Toad({ x: 0, z: 6, arena: { x0: -30, x1: 30, z0: -30, z1: 30 } });
    toad.canStand = room;
    let seed = 99;
    toad.rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let px = 0;
    let pz = 9;
    for (let i = 0; i < 60 * 120; i++) {
      const d = Math.hypot(toad.x - px, toad.z - pz) || 1;
      px += ((toad.x - px) / d) * 3.4 * (1 / 60);
      pz += ((toad.z - pz) / d) * 3.4 * (1 / 60);
      toad.update(1 / 60, px, 0, pz, true);
      // Hit now and then: a hit makes it hop away, which is where it picks a way to go.
      if (i % 120 === 60) { toad.hp = TOAD.hp; toad.takeHit(1, px, pz); }
    }
    return `${toad.x.toFixed(6)},${toad.z.toFixed(6)},${toad.state}`;
  };
  const a = chase();
  const b = chase();
  check('a toad given the same dice does the same thing every time', a === b, `${a} / ${b}`);
}

// Cornered, with nowhere open to hop to, it stays and spits instead.
{
  const boxedIn: CanStand = (x, _y, z) => Math.abs(x) < 1 && Math.abs(z) < 1;
  const toad = new Toad({ x: 0, z: 0 });
  toad.canStand = boxedIn;
  toad.rng = () => 0.9; // it chooses to hop away (and cannot), not to pounce
  let hopped = false;
  let spat = false;
  for (let i = 0; i < 60 * 8; i++) {
    toad.update(1 / 60, 1.5, 0, 0, true);
    if (toad.state === 'hop') hopped = true;
    if (toad.spit) { spat = true; toad.spit = null; }
  }
  check('a toad with nowhere to hop stands its ground and spits', !hopped && spat && Math.abs(toad.x) < 1);
}

// Without a level it behaves exactly as before (the older tests rely on that).
{
  const toad = new Toad({ x: 0, z: 0 });
  toad.rng = () => 0.9; // he is close: this one hops away rather than pouncing
  for (let i = 0; i < 90; i++) toad.update(1 / 60, 1, 0, 0, true);
  check('with no level to ask, a toad hops as it always did', Math.hypot(toad.x, toad.z) > 1);
}

// A roach that hunts across the whole room: it cannot leave the room or cross the block to reach him.
{
  const roach = new Scuttler({ x: 0, z: 0, hunt: true });
  roach.canStand = room;
  let bad = '';
  for (let i = 0; i < 60 * 40 && !bad; i++) {
    // The rat stands outside the room, beyond the east wall, in line with the block.
    roach.update(1 / 60, 14, 0, 0, true);
    if (i % 300 === 200) roach.takeHit(0, -5, 0); // knocked east, towards the block
    if (inScenery(roach)) bad = `at ${roach.x.toFixed(2)},${roach.z.toFixed(2)} in state ${roach.state}`;
  }
  check('a hunting roach stays in the room and out of the block', bad === '' && roach.x < 10, bad);
}

// The boss: asleep until woken; floating he is out of the sword's reach; he is open only after an attack; each attack
// has its answer; the orb can be rallied; he rages at half health; and he can be beaten.
{
  const boss = new Grimsqueak({ x: 0, z: -3, y: 0 });
  boss.canStand = room;
  for (let i = 0; i < 120; i++) boss.update(1 / 60, 0, 0, 4, true);
  check(
    'asleep he does nothing, throws nothing, and is far out of reach',
    boss.asleep
      && boss.x === 0
      && boss.z === -3
      && boss.spits.length === 0
      && boss.y > 10
      && boss.alive
  );
  check('asleep he cannot be hurt', !boss.takeHit(5, 0, 4) && boss.hp === GRIM.hp);
  boss.wake();
  boss.rng = () => 0.3;
  let bolts = 0;
  let energy = true;
  let highWhenClosed = true;
  let openSeen = false;
  let inside = true;
  let hits = 0;
  let rings = 0;
  let ringHit = false;
  let rallied = false;
  let raged = false;
  let orbSeen = false;
  let swoopSeen = false;
  const seen = new Set<string>();
  for (let i = 0; i < 60 * 240 && boss.alive; i++) {
    const px = 0, pz = 4;
    boss.update(1 / 60, px, 0, pz, true);
    for (const s of boss.spits) { bolts++; if (s.kind !== 'fire' || s.y < 1.5) energy = false; }
    boss.spits = [];
    for (const e of boss.events) { seen.add(e); if (e === 'rage') raged = true; if (e === 'slam') rings++; if (e === 'swoop') swoopSeen = true; }
    boss.events = [];
    if (boss.repelPulse) boss.repelPulse = false;
    // He is only within reach after an attack has spent him.
    if (!boss.open && !['rage', 'repel', 'dead'].includes(boss.state) && boss.y < 0.9 && boss.state === 'float') highWhenClosed = false;
    if (boss.open && boss.y < 0.9) {
      openSeen = true;
      if (i % 20 === 0) { boss.takeHit(1, px, pz); hits++; }
    }
    if (boss.ringAtRat(px, 0, pz)) ringHit = true;
    if (boss.orb) {
      orbSeen = true;
      const o = boss.orb;
      if (!o.toBoss && Math.hypot(o.x - px, o.z - pz) < 1.8) {
        if (boss.swingAt(px, pz, Math.atan2(o.x - px, o.z - pz), 1.4, 1.4)) rallied = true;
      }
    }
    if (!room(boss.x, 0, boss.z, boss.radius)) inside = false;
  }
  check('awake he throws his bolts (balls of fire, since his spells went into the fight) from up where he floats', bolts >= 3 && energy, `${bolts} bolts`);
  check('floating he is above the sword; spent, he sinks within reach', highWhenClosed && openSeen);
  check('he swoops, slams a ring along the floor, and throws the orb', swoopSeen && rings > 0 && orbSeen, [...seen].join(','));
  check('the ring reaches a rat standing on the ground', ringHit);
  check('a sword stroke sends the orb back at him', rallied);
  check('at half health he rages', raged);
  check('he stays in the hall, and enough openings beat him', inside && !boss.alive, `${hits} hits, hp ${boss.hp}`);
}

// Three hits in one opening and he bursts away; the pulse is flagged for the game to shove the rat.
{
  const boss = new Grimsqueak({ x: 0, z: -3, y: 0 });
  boss.canStand = room;
  boss.wake();
  boss.rng = () => 0.3;
  let pulse = false;
  for (let i = 0; i < 60 * 40 && !pulse; i++) {
    boss.update(1 / 60, 0, 0, 4, true);
    boss.spits = [];
    boss.events = [];
    if (boss.open && boss.y < 0.9) {
      for (let k = 0; k < GRIM.poise; k++) boss.takeHit(0.1, 0, 4);
      pulse = boss.repelPulse;
    }
  }
  check('three hits in one opening make him burst away', pulse && boss.state === 'repel');
}

// In the real levels every enemy starts on open floor (otherwise the rule above would let it roam as before).
{
  const off: string[] = [];
  for (const lv of LEVELS) {
    const stand = (x: number, y: number, z: number, r: number): boolean => {
      let floor = false;
      for (const b of lv.solids) {
        if (x + r <= b.x0 || x - r >= b.x1 || z + r <= b.z0 || z - r >= b.z1) continue;
        if (b.y1 > y + 0.25 && b.y0 < y + 0.7) return false;
        if (Math.abs(b.y1 - y) <= 0.25 && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) floor = true;
      }
      return floor;
    };
    for (const e of [...lv.enemies, ...lv.waves.flat()]) if (!stand(e.x, e.y ?? 0, e.z, 0.5)) off.push(`${lv.id} ${e.type ?? 'roach'} at ${e.x},${e.z}`);
  }
  check('every enemy in every level starts on open floor', off.length === 0, off.slice(0, 6).join('; '));
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
if (failures > 0) process.exit(1);
