// The Cold Main: a try-out room for the ice theme (src/levels/coldmain.ts).
//
// A length of the sewer, frozen. What is checked: that it is a test room; that ON ICE HE KEEPS HIS MOMENTUM (a long
// glide to stop, wide turns, the jump unchanged) and the frosted cobbles are not; that every spike of ice is solid; that
// the two bottle caps in their pockets and the relic on the last block of ice can be had, and the relic not from
// the floor; that nothing hanging is where a jump from the floor puts his head; and that the jets come in gusts.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { aabbOf } from '../src/world/collision';
import { ceilingOf, CEILING_CLEAR, ICE_SPIKE, iceSpikeSolids } from '../src/world/layout';
import { coldMain, COLDMAIN, ICE_BLOCKS, ICE_BLOCK, ICE_SPIKES, ICE_PRIZES, THIN_ICE, NORTH_BURSTS, SOUTH_BURSTS, GUST, FALL } from '../src/levels/coldmain';
import { blow, gasAt, gasNear, gasWidth, gustOn, gustsOf, jetsOf, JET_SPEED } from '../src/world/gusts';
import { garden, GARDEN } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { CollectibleTracker } from '../src/world/collectibles';
import { getTexturePixels } from '../src/render/textures';
import { TUNING } from '../src/data/tuning';
import { FEELS, feelOf } from '../src/data/feel';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = coldMain();
const cs = def.solids.map((b) => aabbOf(b));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const R = TUNING.rat;
const G = COLDMAIN;
const tracker = (): CollectibleTracker => new CollectibleTracker([{ id: 'coldmain', name: 'c', items: def.collectibles }], { load: () => null, save: () => undefined } as never);

// ---- It is a test room ----
{
  check(
    'the Cold Main is a test room: found by its name, and in none of the game\'s lists',
    levelById('coldmain')?.id === 'coldmain'
      && TEST_ROOMS.some((l) => l.id === 'coldmain')
      && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'coldmain')
  );
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'coldmain');
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check(
    'a door in the Move Garden leads to it: open from the start, clear of the other doors and of everything standing by that wall',
    !!door
      && door.need === 0
      && Math.abs(door.door.z - (GARDEN.halfZ - 0.08)) < 1e-6
      && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 4)
      && !g.solids.some((b) => b.kind !== 'wall' && b.kind !== 'floor' && b.x1 > door.door.x - 1.6 && b.x0 < door.door.x + 1.6 && b.z1 > GARDEN.halfZ - 3)
  );
  check(
    'nothing in it to win, and its door leads back to the Move Garden; its only creatures are the two Frost Rollers on the ice (put there 2026-11-16; tests/roller.ts), who count toward nothing',
    def.enemies.length === 2
      && def.enemies.every((e) => e.type === 'roller' && e.uncounted)
      && def.goals.length === 0
      && def.returnTo === 'garden'
  );
  let built = true;
  try {
    const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
    ch.update(0.5);
    ch.update(1.0);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds, and its jets run (its pipes, icicles and spikes too)', built);
  check('snow sifts down in it, and it is a cold dim place', def.motes === 'ice' && (def.ambient ?? 1) < 0.8);
}

// ---- Ice is slick; frosted cobbles are not ----
{
  const sheet = def.solids.filter((b) => b.slick);
  check(
    'the channel down its middle is ice, bank to bank and wall to wall; the banks are cobbles; and every block of ice in the channel is ice on top, in a picture of its own (not the sheet\'s)',
    sheet.length === 1 + ICE_BLOCKS.length
      && sheet.some((b) => b.kind === 'floor' && b.z0 === -G.channel && b.z1 === G.channel && b.skin === 'iceSheet')
      && sheet.filter((b) => b.kind !== 'floor').every((b) => b.skin === 'iceBlock')
      && def.solids.filter((b) => b.kind === 'floor' && !b.slick).every((b) => b.skin === 'frostCobbles')
  );
  /** From a standstill he runs east for `secs`, then lets go: how fast he got, and how far he went on after letting go. */
  const run = (z: number, secs: number): { speed: number; slide: number; ice: boolean } => {
    const p = new PlayerController(new THREE.Vector3(-12, 0, z));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    for (let i = 0; i < Math.round(secs / DT); i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    const speed = Math.hypot(p.velocity.x, p.velocity.z);
    const ice = p.onIce;
    const x0 = p.position.x;
    for (let i = 0; i < 600 && Math.hypot(p.velocity.x, p.velocity.z) > 0.02; i++) p.update(DT, inp({}), cs);
    return { speed, slide: p.position.x - x0, ice };
  };
  const stone = run(7.5, 0.5);
  const ice = run(-2.6, 0.5);
  const iceLong = run(-2.6, 2.5);
  check(
    'on the cobbles he is at a run in half a second and stops in a stride',
    !stone.ice
      && stone.speed > TUNING.move.run * 0.95
      && stone.slide < 1.2,
    `${stone.speed.toFixed(1)} a second, ${stone.slide.toFixed(2)} to stop`
  );
  check(
    'on the ice he is a little slower to get going, but not helpless: half a second gets him most of the way to a run',
    ice.ice
      && ice.speed < stone.speed * 0.95
      && ice.speed > stone.speed * 0.6,
    `${ice.speed.toFixed(1)} a second`
  );
  // (His words: "a slower loss of momentum than you would normally have ... a little bit of your momentum for a few seconds longer".)
  const glide = (() => {
    const p = new PlayerController(new THREE.Vector3(-12, 0, -2.6));
    for (let i = 0; i < 170; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    let secs = 0;
    for (let i = 0; i < 600 && Math.hypot(p.velocity.x, p.velocity.z) > 0.02; i++) {
      p.update(DT, inp({}), cs);
      secs += DT;
    }
    return secs;
  })();
  check(
    'the stick let go at a run, he keeps his momentum for two seconds and more (on the cobbles he has stopped in a quarter of one), and glides six units and more: but not the length of the room',
    iceLong.speed > TUNING.move.run * 0.9
      && glide > 2
      && glide < 4
      && iceLong.slide > 6
      && iceLong.slide < 10,
    `${glide.toFixed(2)} s and ${iceLong.slide.toFixed(2)} units to stop from ${iceLong.speed.toFixed(1)}`
  );
  check('...losing it steadily all the while: half way through the glide he still has about half his speed', (() => {
    const p = new PlayerController(new THREE.Vector3(-12, 0, -2.6));
    for (let i = 0; i < 170; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    const v0 = Math.hypot(p.velocity.x, p.velocity.z);
    for (let i = 0; i < Math.round((glide / 2) / DT); i++) p.update(DT, inp({}), cs);
    const v = Math.hypot(p.velocity.x, p.velocity.z);
    return p.state !== 'slide' && !p.sliding && v > v0 * 0.35 && v < v0 * 0.65;
  })());
  // He turns wide: running east, the stick thrown north, how far east he still goes.
  const turn = (z: number): number => {
    const p = new PlayerController(new THREE.Vector3(-12, 0, z));
    for (let i = 0; i < 150; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    const x0 = p.position.x;
    for (let i = 0; i < 40; i++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, z > 0 ? 1 : -1) }), cs);
    return p.position.x - x0;
  };
  // Gliding: he is braced, not running on the spot; and it ends when the stick is held again or he has stopped.
  {
    const p = new PlayerController(new THREE.Vector3(-12, 0, -2.6));
    for (let i = 0; i < 170; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    const driving = p.gliding;
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    const letGo = p.gliding;
    p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    const again = p.gliding;
    for (let i = 0; i < 400; i++) p.update(DT, inp({}), cs);
    const stopped = p.gliding;
    const q = new PlayerController(new THREE.Vector3(-12, 0, 7.5));
    for (let i = 0; i < 60; i++) q.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
    q.update(DT, inp({}), cs);
    check(
      'gliding on ice with the stick let go, he is known to be gliding (and is drawn braced, his feet still): not while he drives himself, not once he has stopped, and never on the cobbles',
      !driving
        && letGo
        && !again
        && !stopped
        && !q.gliding
    );
  }
  check(
    '...and he turns wide on it: thrown the other way, he is carried on twice as far as on the cobbles, and more',
    turn(-3.2) > turn(7.5) * 2,
    `${turn(-3.2).toFixed(2)} on ice, ${turn(7.5).toFixed(2)} on cobbles`
  );
  // His jump is his own.
  const apex = (z: number): number => {
    const p = new PlayerController(new THREE.Vector3(-12, 0, z));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    let top = 0;
    for (let i = 0; i < 120; i++) {
      p.update(DT, inp({ jumpHeld: true }), cs);
      top = Math.max(top, p.position.y);
    }
    return top;
  };
  check('his jump from ice is as high as from stone', Math.abs(apex(-2.6) - apex(7.5)) < 1e-6, `${apex(-2.6).toFixed(2)}`);
}

// ---- The spikes of ice are solid ----
{
  const spikes = def.decor.filter((d) => d.kind === 'iceSpike');
  const has = spikes.every((s) => iceSpikeSolids(s.x, s.y, s.z, s.size).every((q) => def.solids.some((b) => b.hidden && b.x0 === q.x0 && b.x1 === q.x1 && b.y1 === q.y1 && b.z0 === q.z0)));
  check(
    'every spike of ice standing from the floor has its solid (unseen: the spike is what is drawn), too tall to step over, and no wider than its drawn foot',
    spikes.length === ICE_SPIKES.length
      && has
      && spikes.every((s) => s.size * ICE_SPIKE.tall >= 1 && s.size * ICE_SPIKE.solid <= s.size * 0.2)
  );
  const s = spikes.find((q) => q.x === 0.8)!;
  const p = new PlayerController(new THREE.Vector3(s.x, 0, s.z + 2.5));
  for (let i = 0; i < 150; i++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
  check(
    'walking at one, he is stopped by it',
    p.position.z > s.z + s.size * ICE_SPIKE.solid - 1e-6
      && p.position.z < s.z + 1,
    `z ${p.position.z.toFixed(2)}, the spike at ${s.z}`
  );
  check(
    'none stands inside a block of ice or in a wall',
    spikes.every((q) => Math.abs(q.x) < G.halfX - 0.4 && Math.abs(q.z) < G.halfZ - 0.4 && !ICE_BLOCKS.some(([x, z]) => Math.abs(q.x - x) < ICE_BLOCK / 2 + 0.3 && Math.abs(q.z - z) < ICE_BLOCK / 2 + 0.3))
  );
}

// ---- The two caps in their pockets ----
{
  const caps = [def.collectibles.find((c) => c.id === ICE_PRIZES.south)!, def.collectibles.find((c) => c.id === ICE_PRIZES.north)!];
  const posts = def.solids.filter((b) => b.hidden);
  check(
    'each bottle cap is out on the ice, low enough to walk into, with spikes on three sides of it',
    caps.every((c) => Math.abs(c.z) < G.channel && c.y < R.height && posts.filter((b) => Math.hypot((b.x0 + b.x1) / 2 - c.x, (b.z0 + b.z1) / 2 - c.z) < 2.2).length >= 4)
  );
  // He can have each: sliding in at its open side and steering onto it.
  const takes = (c: { x: number; y: number; z: number; id: string }, from: [number, number]): boolean => {
    const p = new PlayerController(new THREE.Vector3(from[0], 0, from[1]));
    const t = tracker();
    for (let i = 0; i < 600; i++) {
      const dx = c.x - p.position.x;
      const dz = c.z - p.position.z;
      const dist = Math.hypot(dx, dz);
      // (He walks, and aims a little ahead of where he is sliding to.)
      const want = new THREE.Vector3(dx - p.velocity.x * 0.6, 0, dz - p.velocity.z * 0.6);
      p.update(DT, inp({ move: dist > 0.1 ? want.normalize() : new THREE.Vector3(), run: false }), cs);
      if (t.tryCollect('coldmain', p.position, R.radius, R.height).some((q) => q.id === c.id)) return true;
    }
    return false;
  };
  check('the south one can be had: coming at its pocket from the open channel to the north of it', takes(caps[0], [caps[0].x, -1.5]));
  check('the north one can be had: coming at its pocket from the open channel to the west of it', takes(caps[1], [caps[1].x - 3.5, caps[1].z + 0.3]));
  // But not by running straight through its spikes from the bank behind it.
  const barred = (c: { x: number; z: number; id: string }, from: [number, number]): boolean => {
    const p = new PlayerController(new THREE.Vector3(from[0], 0, from[1]));
    const t = tracker();
    const dir = new THREE.Vector3(c.x - from[0], 0, c.z - from[1]).normalize();
    for (let i = 0; i < 200; i++) {
      p.update(DT, inp({ move: dir }), cs);
      if (t.tryCollect('coldmain', p.position, R.radius, R.height).some((q) => q.id === c.id)) return false;
    }
    return true;
  };
  check('...the pockets\' backs are shut: a straight run at the south one from the bank behind it meets a spike', barred(caps[0], [caps[0].x, 6.5]));
}

// ---- The blocks of ice, and the relic on the last ----
{
  const blocks = ICE_BLOCKS.map(([x, z, top]) => ({ x, z, top }));
  check(
    'four blocks of ice stand in the channel, each higher than the last, each wide enough to land on',
    blocks.length === 4
      && blocks.every((b, i) => Math.abs(b.z) + ICE_BLOCK / 2 < G.channel && (i === 0 || b.top > blocks[i - 1].top))
      && ICE_BLOCK >= 2.4
  );
  const relic = def.collectibles.find((c) => c.id === ICE_PRIZES.top)!;
  check(
    'the relic is over the last, which is higher than he can get from the floor by a double jump and a caught edge',
    relic.kind === 'relic'
      && relic.x === blocks[3].x
      && relic.z === blocks[3].z
      && relic.y > blocks[3].top
      && blocks[3].top > CEILING_CLEAR - R.height + 1.25 + 0.05,
    `its top ${blocks[3].top}`
  );
  check('three things to find in the room, and no more', def.collectibles.length === 3);
  /**
   * A hop from one stop to the next, by a rat who knows ice: he runs at it, jumps `d` frames on (and again `e` frames
   * after, if not negative), and once he is within `brake` of the middle of where he is going he steers against his
   * own speed. Whether, a second and a half after he lands, he is still standing on it.
   */
  type Stop = { x: number; z: number; top: number };
  const hop = (from: Stop, to: Stop, d: number, e: number, brake: number, back: number): boolean => {
    const far = Math.hypot(to.x - from.x, to.z - from.z);
    const p = new PlayerController(new THREE.Vector3(from.x - ((to.x - from.x) / far) * back, from.top + 0.01, from.z - ((to.z - from.z) / far) * back));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    let landed = -1;
    for (let i = 0; i < 420; i++) {
      const dx = to.x - p.position.x;
      const dz = to.z - p.position.z;
      const dist = Math.hypot(dx, dz);
      const v = Math.hypot(p.velocity.x, p.velocity.z);
      let move = new THREE.Vector3(dx, 0, dz).normalize();
      if (dist < brake) move = v > 0.4 ? new THREE.Vector3(-p.velocity.x, 0, -p.velocity.z).normalize() : dist > 0.3 ? move.multiplyScalar(0.4) : new THREE.Vector3();
      p.update(DT, inp({ move, jumpPressed: i === d || (e >= 0 && i === d + e), jumpHeld: i >= d }), cs);
      if (landed < 0 && i > d + 5 && p.grounded) {
        if (Math.abs(p.position.y - to.top) > 0.02) return false;
        landed = i;
      }
      if (landed >= 0 && i >= landed + 90) return p.grounded && Math.abs(p.position.y - to.top) < 0.02;
    }
    return false;
  };
  const stops: Stop[] = [{ x: blocks[0].x, z: G.channel + 2.2, top: 0 }, ...blocks];
  const made: string[] = [];
  let all = true;
  for (let k = 0; k + 1 < stops.length; k++) {
    let one = 0;
    let two = 0;
    for (const back of k === 0 ? [2.5] : [0.9]) {
      for (let d = 0; d <= 30; d += 2) {
        for (const brake of [1.2, 2.2, 3.4]) {
          if (hop(stops[k], stops[k + 1], d, -1, brake, back)) one++;
          for (let e = 12; e <= 48; e += 9) if (hop(stops[k], stops[k + 1], d, e, brake, back)) two++;
        }
      }
    }
    made.push(`${one}/${two}`);
    if (one + two === 0) all = false;
  }
  check(
    'each block can be reached from the one before (the first from the bank), and stood on, by a rat who brakes in the air: landing with speed, he would slide off',
    all,
    `ways that land and stay, with one jump / with two: ${made.join(', ')}`
  );
  // Landing at a run and doing nothing, he slides off.
  const careless = (() => {
    const from = stops[0];
    const to = stops[1];
    const p = new PlayerController(new THREE.Vector3(from.x, 0.01, from.z + 2.5));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    let on = false;
    for (let i = 0; i < 300; i++) {
      const move = new THREE.Vector3(to.x - p.position.x, 0, to.z - 1.2 - p.position.z).normalize();
      p.update(DT, inp({ move: p.grounded && on ? new THREE.Vector3() : move, jumpPressed: i === 16 || i === 34, jumpHeld: i >= 16 }), cs);
      if (p.grounded && Math.abs(p.position.y - to.top) < 0.02) on = true;
    }
    return on && p.position.y < to.top - 0.5;
  })();
  check('a rat who lands on a block at a run and only lets go of the stick slides off the far side of it', careless);
}

// ---- What hangs, and the jets ----
{
  const c = ceilingOf(def.solids)!;
  const ic = def.decor.filter((d) => d.kind === 'icicle');
  const under = ic.filter((d) => d.top !== undefined);
  const roof = ic.filter((d) => d.top === undefined);
  const headJump = (TUNING.jump.velocity * TUNING.jump.velocity) / (2 * TUNING.physics.gravity) + R.height;
  check(
    'icicles hang under both pipes, in runs, and their points are above where a jump from the floor puts his head',
    under.length >= 20
      && under.every((d) => d.top! - d.length > headJump + 0.1 && Math.abs(Math.abs(d.z) - (G.halfZ - 0.45)) < 1e-6),
    `${under.length}; the lowest point ${Math.min(...under.map((d) => d.top! - d.length)).toFixed(2)}, his head at ${headJump.toFixed(2)}`
  );
  const near = (x: number, z: number): number => Math.max(0, ...def.solids.filter((b) => b.kind !== 'wall' && Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1)) < 6).map((b) => b.y1));
  check(
    'icicles hang from the roof over the banks, each with its point above a double jump from the highest thing within six of it',
    roof.length >= 8
      && roof.every((d) => c.y - d.length >= near(d.x, d.z) + CEILING_CLEAR),
    `the nearest ${Math.min(...roof.map((d) => c.y - d.length - near(d.x, d.z) - CEILING_CLEAR)).toFixed(2)} clear`
  );
  const jets = def.decor.filter((d) => d.kind === 'jet');
  const pipes = def.decor.filter((d) => d.kind === 'pipe');
  const falls = jets.filter((j) => !j.push);
  const low = jets.filter((j) => !!j.push);
  check(
    'two pipes run the length of the room, one on each long wall, and each has burst in two places: at each a jet of gas falls out and down from the pipe, in gusts',
    pipes.length === 2
      && falls.length === 4
      && falls.every((j) => (j.every ?? 0) > (j.on ?? 0) && (j.on ?? 0) > 0.5 && j.dir[1] < 0 && Math.sign(j.dir[2]) === -Math.sign(j.z) && pipes.some((p) => Math.abs(p.a[1] - j.y) < 0.5 && Math.abs(p.a[2] - j.z) < 0.5))
  );
  check(
    'no two bursts gust in step: each has its own beat',
    new Set(falls.map((j) => j.every)).size === falls.length
      && NORTH_BURSTS.length + SOUTH_BURSTS.length === 4
  );
  check('...and from the foot of each fall the gas runs on low across the ice to the far bank, on the same beat, taking up as the fall arrives', low.length === 4 && low.every((j) => {
    const f = falls.find((q) => q.x === j.x && Math.sign(q.z) === Math.sign(j.z));
    return !!f && f.every === j.every && f.on === j.on && Math.abs((j.delay ?? 0) - f.length / JET_SPEED) < 1e-9 && j.dir[1] === 0 && j.y < 1.2 && Math.abs(Math.abs(j.z) - (G.channel + 0.4)) < 1e-9 && j.length >= G.channel * 2 && Math.abs(f.z + (f.dir[2] / Math.hypot(...f.dir)) * f.length - j.z) < 1.2;
  }));
}

// ---- The gusts push ----
{
  const gusts = gustsOf(def.decor);
  check(
    'the four low runs are gusts, and only they: a fall of gas overhead pushes nobody',
    gusts.length === 4
      && gusts.every((g) => g.push === GUST.push && g.dy === 0)
      && FALL.length > 5
  );
  check(
    'no gust crosses a block of ice (gas does not go through one), at its widest',
    gusts.every((g) => !ICE_BLOCKS.some(([x]) => Math.abs(g.x - x) < ICE_BLOCK / 2 + g.width / 2))
  );
  const g = gusts.find((q) => q.x === -0.5)!;
  // (The moment its gas first reaches the middle of the channel, and a moment when there is none there.)
  const reach = (along: number): number => g.delay + along / JET_SPEED;
  const mid = G.channel + 0.4;
  check(
    'the gas is at a place along a gust from when it gets there until the gust has passed, and not between gusts',
    gasAt(g, reach(mid) + 0.05, mid)
      && gasAt(g, reach(mid) + g.on - 0.05, mid)
      && !gasAt(g, reach(mid) - 0.05, mid)
      && !gasAt(g, reach(mid) + g.on + 0.05, mid)
      && gasAt(g, reach(mid) + g.every + 0.05, mid)
  );
  /** He stands (or does `act`) at (x, z) from `t0` for `secs`, the gusts blowing: where he ends, and whether one had him. */
  const stand = (x: number, z: number, t0: number, secs: number, act: Partial<PlayerInput> = {}): { p: PlayerController; had: boolean } => {
    const p = new PlayerController(new THREE.Vector3(x, 0, z));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    let had = false;
    for (let i = 0; i < Math.round(secs / DT); i++) {
      if (blow(gusts, t0 + i * DT, p.position, p.velocity, DT, R.radius, R.height)) had = true;
      p.update(DT, inp(act), cs);
    }
    return { p, had };
  };
  // On the ice in its path as it comes: carried across, the way it blows (this one blows north, from the south bank).
  const carried = stand(g.x, 1.5, reach(G.channel + 0.4 - 1.5) - 0.2, g.on + 1.5);
  check(
    'a rat standing on the ice in a gust\'s path is carried across with it, the way it blows: several units, and not faster than it blows',
    carried.had
      && carried.p.position.z < 1.5 - 3
      && Math.abs(carried.p.position.x - g.x) < 0.5,
    `carried ${(1.5 - carried.p.position.z).toFixed(2)}`
  );
  let fastest = 0;
  {
    const p = new PlayerController(new THREE.Vector3(g.x, 0, 1.5));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    const t0 = reach(G.channel + 0.4 - 1.5) - 0.2;
    for (let i = 0; i < 200; i++) {
      blow(gusts, t0 + i * DT, p.position, p.velocity, DT, R.radius, R.height);
      p.update(DT, inp({}), cs);
      fastest = Math.max(fastest, Math.hypot(p.velocity.x, p.velocity.z));
    }
  }
  check(
    '...it brings him to the speed it blows at, and no more',
    fastest > GUST.push * 0.8
      && fastest <= GUST.push + 1e-6,
    `${fastest.toFixed(2)} of ${GUST.push}`
  );
  // Between gusts he is left alone; beside it he is left alone.
  const quiet = stand(g.x, 1.5, reach(G.channel + 0.4 - 1.5) + g.on + 0.3, g.every - g.on - 0.6);
  check('between gusts nothing moves him', !quiet.had && Math.abs(quiet.p.position.z - 1.5) < 1e-6);
  const beside = stand(g.x + gasWidth(g, g.length) / 2 + R.radius + 0.3, 1.5, 0, g.every * 2);
  check('beside a gust, clear of its gas at its widest, nothing moves him', !beside.had && Math.abs(beside.p.position.z - 1.5) < 1e-6);
  // On the cobbles where a gust begins, he stands against it.
  const bank = stand(g.x, G.channel + 0.25, 0, g.every * 2);
  check(
    'on the cobbles at the foot of the bank, in the gas, he stands against it: he has his grip there',
    bank.had
      && Math.abs(bank.p.position.z - (G.channel + 0.25)) < 0.02,
    `moved ${Math.abs(bank.p.position.z - (G.channel + 0.25)).toFixed(3)}`
  );
  // On the ice he can fight it, and loses ground slowly; with it at his back he goes faster than he runs.
  const against = stand(g.x, -2, reach(G.channel + 0.4 + 2) - 0.1, g.on, { move: new THREE.Vector3(0, 0, 1) });
  const free = stand(g.x + 5, -2, reach(G.channel + 0.4 + 2) - 0.1, g.on, { move: new THREE.Vector3(0, 0, 1) });
  check(
    'running into a gust on the ice he makes far less way than he would beside it',
    against.had
      && !free.had
      && against.p.position.z - -2 < (free.p.position.z - -2) * 0.6,
    `${(against.p.position.z + 2).toFixed(2)} against ${(free.p.position.z + 2).toFixed(2)}`
  );
  // What is drawn is what pushes: wherever a puff of a gust is drawn, there is gas by the rule; and the gust has a body there.
  const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  let drawn = 0;
  let wrong = 0;
  for (let k = 0; k < 40; k++) {
    const time = 3 + k * 0.37;
    ch.update(time);
    ch.group.traverse((o) => {
      const sp = o as THREE.Sprite;
      if (!sp.isSprite || !sp.visible) return;
      const own = gusts.find((q) => Math.abs(sp.position.y - q.y) < 0.8 && Math.abs(sp.position.x - q.x) < 1.2 && (sp.position.z - q.z) * q.dz >= -0.01 && (sp.position.z - q.z) * q.dz <= q.length + 0.01);
      if (!own) return;
      drawn++;
      const along = (sp.position.z - own.z) * own.dz;
      // (Not at its very mouth: the last puffs of the fall of gas above come down there too, and are not the gust's.)
      if (along < 1) return;
      // (Nor a wisp too thin to see, at the very end of its run.)
      if ((sp.material as THREE.SpriteMaterial).opacity < 0.1) return;
      // (A puff strays a little from the line as it billows: so the rule is asked a hand either side of where it is drawn.)
      const near = [along - 0.5, along, along + 0.5].filter((a) => a >= 0 && a <= own.length);
      if (!near.some((a) => gasAt(own, time, a) && gustOn(gusts, time, own.x, own.y, own.z + own.dz * a, R.radius) === own)) wrong++;
    });
  }
  check(
    'what is drawn is what pushes: at every moment looked at, wherever a puff of a gust is drawn the rule has gas there and a body there is in the gust',
    drawn > 150
      && wrong === 0,
    `${drawn} puffs looked at, ${wrong} wrong`
  );
}

// ---- The caps can still be had, the gusts blowing ----
{
  const gusts = gustsOf(def.decor);
  const caps = [def.collectibles.find((c) => c.id === ICE_PRIZES.south)!, def.collectibles.find((c) => c.id === ICE_PRIZES.north)!];
  /** He goes for a cap from `from`, setting out at `t0`, every gust blowing as it does in the game. How long he took, or -1. */
  const go = (c: { x: number; y: number; z: number; id: string }, from: [number, number], t0: number): number => {
    const p = new PlayerController(new THREE.Vector3(from[0], 0, from[1]));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    const t = tracker();
    for (let i = 0; i < 900; i++) {
      blow(gusts, t0 + i * DT, p.position, p.velocity, DT, R.radius, R.height);
      const dx = c.x - p.position.x;
      const dz = c.z - p.position.z;
      const want = new THREE.Vector3(dx - p.velocity.x * 0.6, 0, dz - p.velocity.z * 0.6);
      p.update(DT, inp({ move: Math.hypot(dx, dz) > 0.1 ? want.normalize() : new THREE.Vector3(), run: false }), cs);
      if (t.tryCollect('coldmain', p.position, R.radius, R.height).some((q) => q.id === c.id)) return i * DT;
    }
    return -1;
  };
  // Whenever he sets out, within a gust's whole round: he gets there (it may take him longer when the gas is against him).
  const tries = (c: { x: number; y: number; z: number; id: string }, from: [number, number], every: number): number[] => Array.from({ length: 12 }, (_, k) => go(c, from, 20 + (k / 12) * every));
  const south = tries(caps[0], [caps[0].x, -1.5], 5.2);
  const north = tries(caps[1], [caps[1].x - 3.5, caps[1].z + 0.3], 6.6);
  check(
    'the south cap can be had with the gusts blowing, whenever in a gust\'s round he sets out (the gust there blows INTO its pocket)',
    south.every((t) => t >= 0),
    `seconds taken: ${south.map((t) => t.toFixed(1)).join(' ')}`
  );
  check(
    'the north cap can be had with the gusts blowing, whenever he sets out (the gust there blows across its pocket, but he is on the cap before it has carried him off)',
    north.every((t) => t >= 0),
    `seconds taken: ${north.map((t) => t.toFixed(1)).join(' ')}`
  );
}

// ---- What is heard of the gas ----
{
  const all = jetsOf(def.decor);
  const pipesOpen = all.filter((j) => j.delay === 0);
  check(
    'every jet of the room is known for its sound, and the four that are the pipes themselves (no other jet takes up from them) are the ones that crack as they let go',
    all.length === 8
      && pipesOpen.length === 4
      && pipesOpen.every((j) => j.push === 0 && j.y > 4)
  );
  // (The game cracks the pipe when its gas first leaves it; the gust is on the ice when the low jet's gas is.)
  const warn = FALL.length / JET_SPEED;
  check(
    'the crack comes when the gas leaves the pipe: two seconds and more before any of it is on the ice',
    warn > 2
      && gustsOf(def.decor).every((g) => Math.abs(g.delay - warn) < 1e-9),
    `${warn.toFixed(2)} s of warning`
  );
  const g = gustsOf(def.decor).find((q) => q.x === -0.5)!;
  const mid = G.channel + 0.4;
  const there = g.delay + mid / JET_SPEED + 0.3;
  const gone = g.delay + g.length / JET_SPEED + g.on + 0.3;
  check(
    'the hiss goes by how near the nearest gas is: in a gust it is at his ear, across the room it is far, and with no gas out there is none',
    gasNear(g, there, g.x, 0.9, 0) < 0.6
      && gasNear(g, there, g.x + 9, 0.9, 0) > 8
      && gasNear(g, gone, g.x, 0.9, 0) === Infinity
  );
}

// ---- The tiles ----
{
  for (const name of ['iceBrick', 'frostCobbles', 'iceSheet', 'iceBlock', 'iceClear'] as const) {
    const px = getTexturePixels(name);
    let cold = 0;
    for (let i = 0; i < px.size * px.size; i++) if (px.data[i * 4 + 2] >= px.data[i * 4]) cold++;
    check(
      `${name}: a cold picture (blue no less than red, all but everywhere)`,
      cold > px.size * px.size * 0.97,
      `${((cold / (px.size * px.size)) * 100).toFixed(0)}%`
    );
  }
}

// ---- His choices, kept ----
{
  // (He was shown two frosted floors in the game and chose the first: small stones, rime in every joint.)
  const px = getTexturePixels('frostCobbles');
  let pale = 0;
  for (let i = 0; i < px.size * px.size; i++) if (px.data[i * 4 + 1] > 150) pale++;
  check(
    'the frosted cobbles are the ones he chose: a lace of rime, a fifth of the picture and more pale with it',
    px.size === 64
      && pale > px.size * px.size * 0.2,
    `${((pale / (px.size * px.size)) * 100).toFixed(0)}% pale`
  );
  const mean = (name: 'iceBlock' | 'iceSheet'): number => {
    const q = getTexturePixels(name);
    let sum = 0;
    for (let i = 0; i < q.size * q.size; i++) sum += q.data[i * 4 + 1];
    return sum / (q.size * q.size);
  };
  check(
    'a block of ice is far paler than the sheet it stands on: the two cannot be taken for one thing',
    mean('iceBlock') > mean('iceSheet') * 2.2,
    `${mean('iceBlock').toFixed(0)} against ${mean('iceSheet').toFixed(0)}`
  );
}

// ---- THE ICE FEEL (2026-11-22): scrabbling, skidding, the belly slide, digging in; and the frost's poor grip ----
{
  const I = TUNING.ice;
  /** On the ice sheet, at its west end, settled; or on the south bank's cobbles. */
  const on = (where: 'ice' | 'bank', frost = true): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(-12, where === 'ice' ? 0 : 1.5, where === 'ice' ? -2.6 : 7.5));
    if (frost) p.feel = FEELS.frost;
    for (let k = 0; k < 60; k++) p.update(DT, inp({ run: false }), cs);
    return p;
  };
  const E = new THREE.Vector3(1, 0, 0);
  const speed = (p: PlayerController): number => Math.hypot(p.velocity.x, p.velocity.z);
  /** Up to a run, eastward, on the ice. */
  const running = (): PlayerController => {
    const p = on('ice');
    // (A second and a bit: at his run, with most of the sheet still ahead of him.)
    for (let k = 0; k < 70; k++) p.update(DT, inp({ move: E }), cs);
    return p;
  };
  check('on the sheet he is on ice, and on the bank he is not', on('ice').onIce && !on('bank').onIce);
  // Scrabbling: setting off, his feet go without biting; up to speed, they bite.
  {
    const p = on('ice');
    p.update(DT, inp({ move: E }), cs);
    p.update(DT, inp({ move: E }), cs);
    const start = p.scrabble;
    for (let k = 0; k < 150; k++) p.update(DT, inp({ move: E }), cs);
    const going = p.scrabble;
    // ...and thrown into reverse at a run, he scrabbles again.
    p.update(DT, inp({ move: E.clone().negate() }), cs);
    p.update(DT, inp({ move: E.clone().negate() }), cs);
    check('SCRABBLING: setting off on ice his feet go without biting; at a run they bite; thrown into reverse, they spin again', start > 0.8 && going < 0.05 && p.scrabble > 0.8, `${start.toFixed(2)}, ${going.toFixed(2)}, ${p.scrabble.toFixed(2)}`);
  }
  // Skidding: at a run one way, pushing another: a skid, to the side he is sliding to.
  {
    const p = running();
    for (let k = 0; k < 6; k++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
    const north = p.skid;
    const q = running();
    for (let k = 0; k < 6; k++) q.update(DT, inp({ move: new THREE.Vector3(0, 0, 1) }), cs);
    check('SKIDDING: at a run one way and pushing across it, he skids (one way or the other by which way he pushes)', Math.abs(north) > 0.4 && Math.abs(q.skid) > 0.4 && Math.sign(north) === -Math.sign(q.skid) && running().skid === 0, `${north.toFixed(2)}, ${q.skid.toFixed(2)}`);
  }
  // Stopping: let go, he glides a long way; shield dug in, a short one.
  const stopIn = (held: boolean): { far: number; dug: boolean } => {
    const p = running();
    const x0 = p.position.x;
    let dug = false;
    for (let k = 0; k < 400 && speed(p) > 0.2; k++) {
      p.update(DT, inp({ guardHeld: held }), cs);
      if (p.iceBraking) dug = true;
    }
    return { far: p.position.x - x0, dug };
  };
  {
    const glide = stopIn(false);
    const brake = stopIn(true);
    check('DIGGING IN: guard held on ice, he stops in a fraction of the glide', brake.dug && !glide.dug && brake.far < glide.far * 0.35 && brake.far > 0.5, `${brake.far.toFixed(1)} against ${glide.far.toFixed(1)}`);
  }
  // The belly slide.
  {
    const p = running();
    const v0 = speed(p);
    const x0 = p.position.x;
    p.update(DT, inp({ move: E, dodgePressed: true }), cs);
    const down = p.state === 'belly' && p.bellySliding;
    const kicked = speed(p);
    for (let k = 0; k < 119; k++) p.update(DT, inp({}), cs);
    const slid = p.position.x - x0;
    check(
      'THE BELLY SLIDE: the roll on ice at a run throws him on his front, faster for it, and in two seconds he has gone further than he could run',
      down && kicked > v0 * 1.2 && kicked <= I.belly.top + 1e-6 && p.state === 'belly' && slid > v0 * 2,
      `${v0.toFixed(1)} -> ${kicked.toFixed(1)}; ${slid.toFixed(1)} in two seconds (running: ${(v0 * 2).toFixed(1)})`,
    );
    // It is not a roll: a blow lands.
    check('...and nothing shields him in it, as a roll does: a blow lands', p.takeHit(p.position.x + 1, p.position.z, 1) === 'hit' && !p.bellySliding);
  }
  {
    // Steering it: the stick leans it round; he keeps his speed.
    const p = running();
    p.update(DT, inp({ move: E, dodgePressed: true }), cs);
    const v0 = speed(p);
    // (North, toward the bank, for under half a second: the turn is steady, not a snap.)
    for (let k = 0; k < 24; k++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
    const turned = Math.atan2(-p.velocity.z, p.velocity.x);
    check('...the stick steers it, and he keeps his speed through the turn', p.state === 'belly' && turned > 0.45 && turned < 0.75 && speed(p) > v0 * 0.9, `turned ${turned.toFixed(2)} rad, ${v0.toFixed(1)} -> ${speed(p).toFixed(1)}`);
    // On to the bank: it is over.
    for (let k = 0; k < 120 && p.state === 'belly'; k++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
    check('...off the ice onto the bank, it is over', p.state !== 'belly' && !p.onIce);
  }
  {
    const p = running();
    p.update(DT, inp({ move: E, dodgePressed: true }), cs);
    for (let k = 0; k < 10; k++) p.update(DT, inp({}), cs);
    p.update(DT, inp({ guardHeld: true }), cs);
    const out = p.state !== 'belly';
    const q = running();
    q.update(DT, inp({ move: E, dodgePressed: true }), cs);
    for (let k = 0; k < 10; k++) q.update(DT, inp({}), cs);
    const before = speed(q);
    q.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    q.update(DT, inp({ jumpHeld: true }), cs);
    check('...guard ends it (he digs in); a jump ends it too, and he leaves the ice still going', out && q.state === 'jump' && speed(q) > before * 0.9, `${before.toFixed(1)} -> ${speed(q).toFixed(1)}`);
  }
  {
    // Slow, or not on ice, the roll is a roll.
    const slow = on('ice');
    for (let k = 0; k < 20; k++) slow.update(DT, inp({ move: E, run: false }), cs);
    slow.update(DT, inp({ move: E, run: false, dodgePressed: true }), cs);
    const bank = on('bank');
    for (let k = 0; k < 60; k++) bank.update(DT, inp({ move: E }), cs);
    bank.update(DT, inp({ move: E, dodgePressed: true }), cs);
    check('...too slow, or on the bank, the roll is the roll it always was', slow.state === 'dodge' && bank.state === 'dodge', `${slow.state}, ${bank.state}`);
  }
  {
    // The frost: on the bank's cobbles he is slower to get going than in the waking world (and as fast once going).
    const toRun = (frost: boolean): { frames: number; top: number } => {
      const p = on('bank', frost);
      let frames = 0;
      while (frames < 300 && speed(p) < TUNING.move.run * 0.9) {
        p.update(DT, inp({ move: E }), cs);
        frames++;
      }
      for (let k = 0; k < 60; k++) p.update(DT, inp({ move: E }), cs);
      return { frames, top: speed(p) };
    };
    const a = toRun(true);
    const b = toRun(false);
    check('THE FROST: on its ordinary ground he is slower to get going than in the waking world, and as fast once he is', a.frames > b.frames * 1.5 && Math.abs(a.top - b.top) < 0.05, `${a.frames} frames against ${b.frames}; top ${a.top.toFixed(1)}`);
    check('the Cold Main plays as the frost', feelOf(levelById('coldmain')!).id === 'frost');
  }
}

// ---- THE THIN ICE (2026-11-24): a frozen pool in the north bank. Feet break it; flat on his belly, it bears him ----
{
  const P = THIN_ICE;
  const N = new THREE.Vector3(0, 0, -1);
  const x = (P.x0 + P.x1) / 2;
  /** From out on the sheet, north at a run toward the pool; `belly`: he throws himself flat before he reaches it. */
  const cross = (belly: boolean): { p: PlayerController; ch: ReturnType<typeof buildChamber>; swam: boolean; flatOnIt: boolean } => {
    const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: def.movers } as never);
    const p = new PlayerController(new THREE.Vector3(x, 0, 1.2));
    p.feel = FEELS.frost;
    p.water = def.water;
    let swam = false;
    let flatOnIt = false;
    for (let k = 0; k < 60 * 4; k++) {
      ch.stepMovers(DT, p);
      p.update(DT, inp({ move: N, dodgePressed: belly && k === 55 }), ch.colliders);
      if (p.swimming) swam = true;
      if (p.bellySliding && p.position.z < P.z1 - 0.5 && p.position.z > P.z0 + 0.5) flatOnIt = true;
    }
    return { p, ch, swam, flatOnIt };
  };
  check('the pool is in the north bank, clear of the channel, and its lid is whole to begin with', P.z1 <= -COLDMAIN.channel && def.movers!.length === P.n * P.n && def.movers!.every((m) => m.thin && m.slick && m.motion === 'crumble'));
  const run = cross(false);
  check('THIN ICE: run onto it and it gives way under him: he is in the water', run.swam, `ended at y ${run.p.position.y.toFixed(2)}`);
  check('...and the breaking spreads: the whole lid has gone, not only the pane he trod on', run.ch.movers.every((m) => m.state.stage === 'falling' || m.state.stage === 'gone'));
  const flat = cross(true);
  check('THIN ICE: on his belly it bears him: he slides out over it and is never in the water', flat.flatOnIt && !flat.swam, `flat on it ${flat.flatOnIt}, swam ${flat.swam}`);
  // (Out of the water again: a jump at its edge, and he climbs out.)
  {
    const { p, ch } = run;
    let out = false;
    for (let k = 0; k < 60 * 6 && !out; k++) {
      ch.stepMovers(DT, p);
      p.update(DT, inp({ move: N.clone().negate(), jumpPressed: k % 40 === 30, jumpHeld: k % 40 >= 30 }), ch.colliders);
      out = !p.swimming && p.grounded && p.position.y > -0.05;
    }
    check('he can get out of the pool again (a jump at its edge)', out, `y ${p.position.y.toFixed(2)}, z ${p.position.z.toFixed(2)}`);
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
