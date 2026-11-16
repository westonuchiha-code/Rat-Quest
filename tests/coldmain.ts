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
import { coldMain, COLDMAIN, ICE_BLOCKS, ICE_BLOCK, ICE_SPIKES, ICE_PRIZES } from '../src/levels/coldmain';
import { garden, GARDEN } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { CollectibleTracker } from '../src/world/collectibles';
import { getTexturePixels } from '../src/render/textures';
import { TUNING } from '../src/data/tuning';

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
  check('the Cold Main is a test room: found by its name, and in none of the game\'s lists', levelById('coldmain')?.id === 'coldmain' && TEST_ROOMS.some((l) => l.id === 'coldmain') && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'coldmain'));
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'coldmain');
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check('a door in the Move Garden leads to it: open from the start, clear of the other doors and of everything standing by that wall', !!door && door.need === 0 && Math.abs(door.door.z - (GARDEN.halfZ - 0.08)) < 1e-6 && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 4) && !g.solids.some((b) => b.kind !== 'wall' && b.kind !== 'floor' && b.x1 > door.door.x - 1.6 && b.x0 < door.door.x + 1.6 && b.z1 > GARDEN.halfZ - 3));
  check('nothing in it to fight or to win, and its door leads back to the Move Garden', def.enemies.length === 0 && def.goals.length === 0 && def.returnTo === 'garden');
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
  check('the channel down its middle is ice, bank to bank and wall to wall; the banks are cobbles; and every block of ice in the channel is ice on top, in a picture of its own (not the sheet\'s)', sheet.length === 1 + ICE_BLOCKS.length && sheet.some((b) => b.kind === 'floor' && b.z0 === -G.channel && b.z1 === G.channel && b.skin === 'iceSheet') && sheet.filter((b) => b.kind !== 'floor').every((b) => b.skin === 'iceBlock') && def.solids.filter((b) => b.kind === 'floor' && !b.slick).every((b) => b.skin === 'frostCobbles'));
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
  check('on the cobbles he is at a run in half a second and stops in a stride', !stone.ice && stone.speed > TUNING.move.run * 0.95 && stone.slide < 1.2, `${stone.speed.toFixed(1)} a second, ${stone.slide.toFixed(2)} to stop`);
  check('on the ice he is a little slower to get going, but not helpless: half a second gets him most of the way to a run', ice.ice && ice.speed < stone.speed * 0.95 && ice.speed > stone.speed * 0.6, `${ice.speed.toFixed(1)} a second`);
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
  check('the stick let go at a run, he keeps his momentum for two seconds and more (on the cobbles he has stopped in a quarter of one), and glides six units and more: but not the length of the room', iceLong.speed > TUNING.move.run * 0.9 && glide > 2 && glide < 4 && iceLong.slide > 6 && iceLong.slide < 10, `${glide.toFixed(2)} s and ${iceLong.slide.toFixed(2)} units to stop from ${iceLong.speed.toFixed(1)}`);
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
    check('gliding on ice with the stick let go, he is known to be gliding (and is drawn braced, his feet still): not while he drives himself, not once he has stopped, and never on the cobbles', !driving && letGo && !again && !stopped && !q.gliding);
  }
  check('...and he turns wide on it: thrown the other way, he is carried on twice as far as on the cobbles, and more', turn(-3.2) > turn(7.5) * 2, `${turn(-3.2).toFixed(2)} on ice, ${turn(7.5).toFixed(2)} on cobbles`);
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
  check('every spike of ice standing from the floor has its solid (unseen: the spike is what is drawn), too tall to step over, and no wider than its drawn foot', spikes.length === ICE_SPIKES.length && has && spikes.every((s) => s.size * ICE_SPIKE.tall >= 1 && s.size * ICE_SPIKE.solid <= s.size * 0.2));
  const s = spikes.find((q) => q.x === 0.8)!;
  const p = new PlayerController(new THREE.Vector3(s.x, 0, s.z + 2.5));
  for (let i = 0; i < 150; i++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
  check('walking at one, he is stopped by it', p.position.z > s.z + s.size * ICE_SPIKE.solid - 1e-6 && p.position.z < s.z + 1, `z ${p.position.z.toFixed(2)}, the spike at ${s.z}`);
  check('none stands inside a block of ice or in a wall', spikes.every((q) => Math.abs(q.x) < G.halfX - 0.4 && Math.abs(q.z) < G.halfZ - 0.4 && !ICE_BLOCKS.some(([x, z]) => Math.abs(q.x - x) < ICE_BLOCK / 2 + 0.3 && Math.abs(q.z - z) < ICE_BLOCK / 2 + 0.3)));
}

// ---- The two caps in their pockets ----
{
  const caps = [def.collectibles.find((c) => c.id === ICE_PRIZES.south)!, def.collectibles.find((c) => c.id === ICE_PRIZES.north)!];
  const posts = def.solids.filter((b) => b.hidden);
  check('each bottle cap is out on the ice, low enough to walk into, with spikes on three sides of it', caps.every((c) => Math.abs(c.z) < G.channel && c.y < R.height && posts.filter((b) => Math.hypot((b.x0 + b.x1) / 2 - c.x, (b.z0 + b.z1) / 2 - c.z) < 2.2).length >= 4));
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
  check('four blocks of ice stand in the channel, each higher than the last, each wide enough to land on', blocks.length === 4 && blocks.every((b, i) => Math.abs(b.z) + ICE_BLOCK / 2 < G.channel && (i === 0 || b.top > blocks[i - 1].top)) && ICE_BLOCK >= 2.4);
  const relic = def.collectibles.find((c) => c.id === ICE_PRIZES.top)!;
  check('the relic is over the last, which is higher than he can get from the floor by a double jump and a caught edge', relic.kind === 'relic' && relic.x === blocks[3].x && relic.z === blocks[3].z && relic.y > blocks[3].top && blocks[3].top > CEILING_CLEAR - R.height + 1.25 + 0.05, `its top ${blocks[3].top}`);
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
  check('each block can be reached from the one before (the first from the bank), and stood on, by a rat who brakes in the air: landing with speed, he would slide off', all, `ways that land and stay, with one jump / with two: ${made.join(', ')}`);
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
  check('icicles hang under both pipes, in runs, and their points are above where a jump from the floor puts his head', under.length >= 20 && under.every((d) => d.top! - d.length > headJump + 0.1 && Math.abs(Math.abs(d.z) - (G.halfZ - 0.45)) < 1e-6), `${under.length}; the lowest point ${Math.min(...under.map((d) => d.top! - d.length)).toFixed(2)}, his head at ${headJump.toFixed(2)}`);
  const near = (x: number, z: number): number => Math.max(0, ...def.solids.filter((b) => b.kind !== 'wall' && Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1)) < 6).map((b) => b.y1));
  check('icicles hang from the roof over the banks, each with its point above a double jump from the highest thing within six of it', roof.length >= 8 && roof.every((d) => c.y - d.length >= near(d.x, d.z) + CEILING_CLEAR), `the nearest ${Math.min(...roof.map((d) => c.y - d.length - near(d.x, d.z) - CEILING_CLEAR)).toFixed(2)} clear`);
  const jets = def.decor.filter((d) => d.kind === 'jet');
  const pipes = def.decor.filter((d) => d.kind === 'pipe');
  check('two pipes run the length of the room, one on each long wall, and each has burst in two places: a jet of gas at each, coming in gusts, blowing out and down from the pipe', pipes.length === 2 && jets.length === 4 && jets.every((j) => (j.every ?? 0) > (j.on ?? 0) && (j.on ?? 0) > 0.5 && j.dir[1] < 0 && Math.sign(j.dir[2]) === -Math.sign(j.z) && pipes.some((p) => Math.abs(p.a[1] - j.y) < 0.5 && Math.abs(p.a[2] - j.z) < 0.5)));
  check('no two jets gust in step: each has its own beat', new Set(jets.map((j) => j.every)).size === jets.length);
}

// ---- The tiles ----
{
  for (const name of ['iceBrick', 'frostCobbles', 'iceSheet', 'iceBlock', 'frostPipe', 'iceClear'] as const) {
    const px = getTexturePixels(name);
    let cold = 0;
    for (let i = 0; i < px.size * px.size; i++) if (px.data[i * 4 + 2] >= px.data[i * 4]) cold++;
    check(`${name}: a cold picture (blue no less than red, all but everywhere)`, cold > px.size * px.size * 0.97, `${((cold / (px.size * px.size)) * 100).toFixed(0)}%`);
  }
}

// ---- His choices, kept ----
{
  // (He was shown two frosted floors in the game and chose the first: small stones, rime in every joint.)
  const px = getTexturePixels('frostCobbles');
  let pale = 0;
  for (let i = 0; i < px.size * px.size; i++) if (px.data[i * 4 + 1] > 150) pale++;
  check('the frosted cobbles are the ones he chose: a lace of rime, a fifth of the picture and more pale with it', px.size === 64 && pale > px.size * px.size * 0.2, `${((pale / (px.size * px.size)) * 100).toFixed(0)}% pale`);
  const mean = (name: 'iceBlock' | 'iceSheet'): number => {
    const q = getTexturePixels(name);
    let sum = 0;
    for (let i = 0; i < q.size * q.size; i++) sum += q.data[i * 4 + 1];
    return sum / (q.size * q.size);
  };
  check('a block of ice is far paler than the sheet it stands on: the two cannot be taken for one thing', mean('iceBlock') > mean('iceSheet') * 2.2, `${mean('iceBlock').toFixed(0)} against ${mean('iceSheet').toFixed(0)}`);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
