// BRAMBLE, PLAYED (player/hedgehogController.ts, his body player/standIn.ts; the Stand-in room, Test Room 19;
// 2026-11-20). The owner: "he's not a knight, he's a hedgehog ... make him roll around like a hedgehog ... maybe he can
// spit". His own moves, in the room built for them, against real roaches: a walk and a hop smaller than the knight's;
// the BALL (it builds speed and keeps it, runs downhill, bounces off walls, gets through the burrow's low gap, rams);
// the SPIT; the spine BURST; swimming. Then his body is looked at in each.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { HedgehogController, HOG, type HogInput, type HogEvents } from '../src/player/hedgehogController';
import { StandIn } from '../src/player/standIn';
import { Scuttler } from '../src/enemies/scuttler';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { BURROW, POOL, SLOPES, STEPS } from '../src/levels/standinroom';
import { ROOMS } from '../src/levels/testRooms';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const pad = (o: Partial<HogInput> = {}): HogInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, rollPressed: false, ...o });
const E = new THREE.Vector3(1, 0, 0);
const N = new THREE.Vector3(0, 0, -1);

const def = levelById('standin');
check('the Stand-in room is Test Room 19; he walks in as the knight', !!def && !def.playAs && ROOMS.some((r) => r.n === 19 && r.id === 'standin'));
{
  const b = def?.npcs?.find((n) => n.name === 'Bramble');
  const spawn = def?.spawn ?? { x: 0, y: 0, z: 0, facing: 0 };
  check('Bramble waits by the way in, to swap with him (and the knight has his own lines, to swap back)', !!b && b.swap?.as === 'hedgehog' && (b.swap?.back.length ?? 0) > 0 && Math.hypot(b.x - spawn.x, b.z - spawn.z) < 6);
}
const room = buildChamber(def as never);
const C = room.colliders;
const W = room.water;

// The drawing, posed every step from him.
const body = new StandIn();
let nan = 0;
const rig = (): { body: THREE.Group; root: THREE.Group; head: THREE.Group; spines: ReadonlyArray<{ mesh: THREE.Object3D }> } => body['rig'];
function step(h: HedgehogController, p: Partial<HogInput> = {}, foes: Scuttler[] = []): HogEvents {
  const ev = h.update(DT, pad(p), C, W, foes, null);
  for (const f of foes) f.update(DT, h.position.x, h.position.y, h.position.z, false);
  body.setTransform(new THREE.Vector3(), h.facing);
  body.update(DT, h, ev);
  body.root.traverse((o) => {
    if (![o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y, o.rotation.z, o.scale.x].every(Number.isFinite)) nan++;
  });
  return ev;
}
const at = (x: number, y: number, z: number, facing = 0): HedgehogController => {
  const h = new HedgehogController(new THREE.Vector3(x, y, z));
  h.facing = facing;
  for (let k = 0; k < 20; k++) step(h);
  return h;
};
/** What is drawn of him, in his own frame. */
function shape(): THREE.Box3 {
  const box = new THREE.Box3();
  const visible = (o: THREE.Object3D): boolean => o.visible && (!o.parent || visible(o.parent));
  body.root.updateMatrixWorld(true);
  body.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && visible(o)) box.union(new THREE.Box3().setFromObject(o, true));
  });
  return box;
}

// ---- On his feet: smaller than the knight in everything ----
{
  const h = at(0, 0, 6);
  check('standing, his feet are on the floor', h.grounded && Math.abs(h.position.y) < 1e-3 && Math.abs(shape().min.y) < 0.04, `lowest ${shape().min.y.toFixed(3)}`);
  for (let k = 0; k < 60; k++) step(h, { move: E });
  const walk = h.speed;
  for (let k = 0; k < 60; k++) step(h, { move: E, run: true });
  const run = h.speed;
  check('he walks and scurries, slower than the knight does (short legs)', Math.abs(walk - HOG.walk) < 0.1 && Math.abs(run - HOG.run) < 0.1 && run < TUNING.move.run && walk < TUNING.move.walk, `walk ${walk.toFixed(1)}, scurry ${run.toFixed(1)}`);
}
{
  const h = at(0, 0, 6);
  let top = 0;
  for (let k = 0; k < 90; k++) {
    step(h, { jumpPressed: k === 0, jumpHeld: true });
    top = Math.max(top, h.position.y);
  }
  const knight = (TUNING.jump.velocity * TUNING.jump.velocity) / (2 * TUNING.physics.gravity);
  check('his hop is lower than the knight\'s jump, and there is no second jump', top > 1.1 && top < knight - 0.5, `${top.toFixed(2)} high (the knight: ${knight.toFixed(2)})`);
}
// ---- The ball ----
{
  const h = at(-6, 0, 6, Math.PI / 2);
  step(h, { rollPressed: true });
  check('ROLL curls him into a ball (and he is a ball to look at)', h.curled && h.state === 'ball' && (() => {
    for (let k = 0; k < 20; k++) step(h);
    const b = shape();
    return b.max.y - b.min.y < 0.75;
  })(), `${(shape().max.y - shape().min.y).toFixed(2)} high`);
  let most = 0;
  for (let k = 0; k < 90; k++) {
    step(h, { move: E });
    most = Math.max(most, h.speed);
  }
  check('pushed along, the ball builds up to well past his scurry', most > HOG.run + 2, `${most.toFixed(1)} (his scurry ${HOG.run})`);
  const before = h.speed;
  for (let k = 0; k < 40; k++) step(h);
  check('let go, it keeps rolling (it slows, but slowly)', h.speed > before * 0.4 && h.speed > 2, `${before.toFixed(1)} -> ${h.speed.toFixed(1)} in two thirds of a second`);
}
{
  // Into the east wall at speed: it bounces back.
  const h = at(11, 0, 8, Math.PI / 2);
  step(h, { rollPressed: true });
  let bounced = 0;
  for (let k = 0; k < 120 && !bounced; k++) {
    const ev = step(h, { move: E });
    if (ev.bounced > 0) bounced = h.velocity.x;
  }
  check('rolled hard into a wall, the ball bounces off it', bounced < -1, `back at ${bounced.toFixed(1)}`);
}
{
  // Off the shelf and down the steep slope, curled, no push: it runs away downhill.
  const h = at(-10.6, STEPS.shelf, (SLOPES.steep.z0 + SLOPES.steep.z1) / 2, Math.PI / 2);
  step(h, { rollPressed: true });
  let most = 0;
  for (let k = 0; k < 20; k++) step(h, { move: E });
  for (let k = 0; k < 60; k++) {
    step(h);
    most = Math.max(most, h.speed);
  }
  check('down the steep slope, the ball runs away faster than he could push it', most > HOG.ball.top, `${most.toFixed(1)} (pushing, at most ${HOG.ball.top})`);
}
{
  // The burrow: on his feet he cannot get in; rolled, he can; under its low lintel he cannot stand up.
  const mx = (BURROW.x0 + BURROW.x1) / 2;
  const inside = BURROW.front - BURROW.thick - 1;
  const walk = at(mx, 0, BURROW.front + 1.5, Math.PI);
  for (let k = 0; k < 120; k++) step(walk, { move: N });
  const ball = at(mx, 0, BURROW.front + 1.5, Math.PI);
  step(ball, { rollPressed: true });
  let underRoof = true;
  for (let k = 0; k < 120; k++) {
    step(ball, { move: N });
    if (ball.position.z < BURROW.front - 0.1 && ball.position.z > BURROW.front - BURROW.thick + 0.1) underRoof &&= !ball.roomToStand(C);
  }
  check('the burrow: on his feet he cannot get through its gap; curled up he rolls in', walk.position.z > BURROW.front && ball.position.z < inside + 0.5, `on foot stopped at ${walk.position.z.toFixed(1)}, rolled to ${ball.position.z.toFixed(1)}`);
  check('...and under the gap\'s low roof there is no room to stand up in', underRoof);
  // Then out again, uncurled inside (its top is open).
  step(ball, { rollPressed: true });
  check('inside, he uncurls (it is open over him)', !ball.curled);
}
// ---- The spit, the ram, the burst ----
{
  const h = at(0, 0, 6, Math.PI);
  const r = new Scuttler({ x: 0, z: 3.4, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  const hp = r.hp;
  let splats = 0;
  for (let k = 0; k < 60; k++) splats += step(h, { attackPressed: k === 0 }, [r]).splats.length;
  check('ATTACK spits: the glob flies ahead and stings a roach 2.6 away', r.hp < hp && splats === 1, `${hp} -> ${r.hp}`);
  const w = at(0, 0, -10.5, Math.PI);
  let wall = 0;
  for (let k = 0; k < 60; k++) wall += step(w, { attackPressed: k === 0 }).splats.length;
  check('...and spat at a wall, it splats on the wall', wall === 1);
  const again = at(0, 0, 6, Math.PI);
  let spat = 0;
  for (let k = 0; k < 20; k++) if (step(again, { attackPressed: true }).spat) spat++;
  check(`he can spit only so often (every ${HOG.spit.every}s)`, spat === 1, `${spat} in a third of a second`);
}
{
  const h = at(-6, 0, 3, Math.PI / 2);
  const r = new Scuttler({ x: 0, z: 3, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  const hp = r.hp;
  step(h, { rollPressed: true }, [r]);
  let rammed = false;
  let back = 0;
  for (let k = 0; k < 120 && !rammed; k++) {
    const ev = step(h, { move: E }, [r]);
    if (ev.hits.some((x) => x.how === 'ram')) {
      rammed = true;
      back = h.velocity.x;
    }
  }
  check('rolled fast into a roach, he rams it (spines first) and rebounds', rammed && r.hp < hp && back < 1, `${hp} -> ${r.hp}, then going ${back.toFixed(1)}`);
}
{
  const h = at(0, 0, 6);
  const near = new Scuttler({ x: 1, z: 6, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  const far = new Scuttler({ x: 5, z: 6, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  const [hn, hf] = [near.hp, far.hp];
  step(h, { rollPressed: true }, []);
  let burst = false;
  let spines = 0;
  for (let k = 0; k < 10; k++) {
    if (step(h, { attackPressed: k === 1 }, [near, far]).burst) burst = true;
    spines = Math.max(spines, rig().spines[0].mesh.scale.x);
  }
  check('curled, ATTACK is a spine burst: it stings a roach close by, not one further off', burst && near.hp < hn && far.hp === hf, `close ${hn} -> ${near.hp}, far ${hf} -> ${far.hp}`);
  check('...and his spines are thrown out all round', spines > 1.3, `spines at ${spines.toFixed(2)}`);
}
// ---- Swimming ----
{
  const h = at((POOL.x0 + POOL.x1) / 2 + 0.25, POOL.water + 0.3, 0);
  let swam = 0;
  for (let k = 0; k < 90; k++) if (step(h, { move: new THREE.Vector3(0, 0, k < 45 ? 1 : -1) }) && h.state === 'swim') swam++;
  check('in the pool he swims, his back at the waterline, lying flat', swam > 60 && Math.abs(h.position.y - (POOL.water - HOG.swim.sink)) < 0.1 && rig().body.rotation.x > 1, `${swam} frames, at ${h.position.y.toFixed(2)}`);
}
// ---- His body, moving ----
{
  const h = at(0, 0, 6, Math.PI / 2);
  let lo = 9;
  let hi = -9;
  for (let k = 0; k < 90; k++) {
    step(h, { move: E });
    if (k > 30) {
      lo = Math.min(lo, rig().body.rotation.z);
      hi = Math.max(hi, rig().body.rotation.z);
    }
  }
  check('walking, he waddles: his body rocks from side to side over his feet', hi > 0.08 && lo < -0.08, `rocks ${lo.toFixed(2)}..${hi.toFixed(2)}`);
  let lean = 0;
  let flat = 9;
  for (let k = 0; k < 90; k++) {
    step(h, { move: E, run: true });
    if (k > 40) {
      lean += rig().body.rotation.x / 49;
      flat = Math.min(flat, rig().spines[0].mesh.scale.x);
    }
  }
  check('scurrying, he leans well forward, spines laid flat', lean > 0.3 && flat < 1, `lean ${lean.toFixed(2)}`);
}
{
  const h = at(0, 0, 6);
  let squash = 9;
  let landed = false;
  for (let k = 0; k < 100; k++) {
    const ev = step(h, { jumpPressed: k === 0, jumpHeld: true });
    if (ev.landed > 0) landed = true;
    if (landed) squash = Math.min(squash, rig().body.scale.y);
  }
  check('landing, his round body squashes and bounces back', squash < 0.9 && Math.abs(rig().body.scale.y - 1) < 0.03, `squashed to ${squash.toFixed(2)}`);
}
check('no part of him ever went to NaN', nan === 0, `${nan}`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
