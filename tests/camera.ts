// The view when something is behind him. It used to be pulled in by anything solid between it and him: backed against
// a brazier or a crate, it ended up inside his head. Now something LOW in the way does not pull it in: it rises to look
// over it, from as far off as ever. A wall still pulls it in, but pulled in close it goes up over his head and looks
// ahead of him. It never turns to do either. All of it against the real levels' own solid boxes.
import { FEELS } from '../src/data/feel';
import { BRAZIER, extent, rampBox } from '../src/world/layout';
import './../src/core/colorSetup';
import * as THREE from 'three';
import { FollowCamera, sight } from '../src/camera/followCamera';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { buildChamber } from '../src/world/chamber';
import { LEVELS } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';
import { Aabb, aabbOf, makeAabb, segmentAabbT, topAt } from '../src/world/collision';
import { TWEAKS } from '../src/core/tweaks';
import { BOWL, facetsOf, toyBox, toyBoxPlan, HALF, halfDeck } from '../src/levels/toybox';

const DT = 1 / 60;
const C = TUNING.camera as { -readonly [K in keyof typeof TUNING.camera]: number };
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const solidsOf = (id: string): Aabb[] => {
  const L = LEVELS.find((l) => l.id === id)!;
  return buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], decor: [], movers: L.movers }).colliders;
};
const hollows = solidsOf('hollows');
const cistern = solidsOf('cistern');
const hub = solidsOf('hub');

interface View {
  cam: FollowCamera;
  eye: THREE.PerspectiveCamera;
  focus: THREE.Vector3;
}
function view(x: number, y: number, z: number, yaw: number): View {
  const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
  const cam = new FollowCamera(eye);
  cam.yaw = yaw;
  return { cam, eye, focus: new THREE.Vector3(x, y, z) };
}
const step = (v: View, colliders: Aabb[], vel = { x: 0, z: 0 }): void => v.cam.update(DT, v.focus, 0, false, 0, 0, colliders, vel);
const settle = (v: View, colliders: Aabb[], secs = 3): void => {
  for (let i = 0; i < secs * 60; i++) step(v, colliders);
};
/** The point it looks at: his chest. */
const chest = (v: View): THREE.Vector3 => new THREE.Vector3(v.focus.x, v.focus.y + C.targetHeight, v.focus.z);
/** How far up or down the picture a point is, and how far to the side, in degrees from its middle. Out of the picture beyond 27.5 and about 35. */
function onScreen(v: View, p: THREE.Vector3): { up: number; side: number; seen: boolean } {
  v.eye.updateMatrixWorld(true);
  const q = p.clone().applyMatrix4(v.eye.matrixWorldInverse);
  const up = (Math.atan2(q.y, -q.z) * 180) / Math.PI;
  const side = (Math.atan2(q.x, -q.z) * 180) / Math.PI;
  return { up, side, seen: q.z < 0 && Math.abs(up) < 27.5 && Math.abs(side) < 34.5 };
}
/** How deep inside a solid box a point is (0: in none). */
function inside(p: THREE.Vector3, colliders: Aabb[]): number {
  let deep = 0;
  for (const b of colliders) {
    const d = Math.min(p.x - b.min.x, b.max.x - p.x, p.y - b.min.y, b.max.y - p.y, p.z - b.min.z, b.max.z - p.z);
    if (d > deep) deep = d;
  }
  return deep;
}
/** Which way round him it is, flat: the angle of the line from him to it. */
const bearing = (v: View): number => Math.atan2(v.eye.position.x - v.focus.x, v.eye.position.z - v.focus.z);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const far = (v: View): number => v.eye.position.distanceTo(chest(v));
/** Its pitch: how steeply it looks down at him. */
const steep = (v: View): number => Math.atan2(v.eye.position.y - chest(v).y, Math.hypot(v.eye.position.x - v.focus.x, v.eye.position.z - v.focus.z));
/** The view as it used to be (before 2026-11-15), for the same inputs: eased out to where it wants to be, pulled in by anything in the way. */
function oldView(): (focus: THREE.Vector3, yaw: number, colliders: Aabb[]) => THREE.Vector3 {
  const free = new THREE.Vector3();
  let pull = 1;
  let started = false;
  let smoothY = 0;
  return (focus, yaw, colliders) => {
    if (!started) smoothY = focus.y;
    smoothY += (focus.y - smoothY) * (1 - Math.exp(-C.heightRate * DT));
    smoothY = Math.min(focus.y + C.heightSlack, Math.max(focus.y - C.heightSlack, smoothY));
    const target = new THREE.Vector3(focus.x, smoothY + C.targetHeight, focus.z);
    const pitch = 0.3;
    const desired = new THREE.Vector3(target.x + Math.sin(yaw) * Math.cos(pitch) * C.distance, target.y + Math.sin(pitch) * C.distance, target.z + Math.cos(yaw) * Math.cos(pitch) * C.distance);
    if (!started) {
      free.copy(desired);
      started = true;
    } else free.lerp(desired, 1 - Math.exp(-C.followRate * DT));
    let hit: number | null = null;
    for (const b of colliders) {
      const t = segmentAabbT(target, free, b);
      if (t !== null && (hit === null || t < hit)) hit = t;
    }
    const want = hit === null ? 1 : Math.max(0.12, hit - 0.05);
    pull += (want - pull) * (1 - Math.exp(-(want < pull ? C.pullInRate : C.pullOutRate) * DT));
    return target.clone().lerp(free, pull);
  };
}

// ---- In the open nothing is different ----
{
  const v = view(-30, 0, 40, 1);
  settle(v, hollows, 2);
  check('in the open it is where it always was: its usual distance off, looking at him, neither risen nor pulled in', Math.abs(far(v) - C.distance) < 1e-6 && Math.abs(steep(v) - 0.3) < 1e-6 && v.cam.lift === 0 && v.cam.rise === 0 && Math.abs(onScreen(v, chest(v)).up) < 1e-6, `${far(v).toFixed(3)} off, pitch ${steep(v).toFixed(3)}`);
}

// ---- A brazier behind him (the Hollows, where the west path comes out: the one the owner's pikemen fought beside) ----
{
  // (Its bowl is the widest and highest of it: that is what stands between him and the view.)
  const B = { x: -26, z: -28, half: BRAZIER.bowl * 0.9, top: BRAZIER.rim };
  const box = hollows.find((b) => Math.abs((b.min.x + b.max.x) / 2 - B.x) < 0.01 && Math.abs((b.min.z + b.max.z) / 2 - B.z) < 0.01 && Math.abs(b.max.y - B.top) < 0.01);
  check('the brazier there is a low solid thing: its bowl a little over a unit wide, its rim a little over a unit high', !!box && Math.abs(box.max.x - box.min.x - B.half * 2) < 0.01 && B.half * 2 > 1 && B.half * 2 < 1.4 && B.top > 1 && B.top < 1.3);
  // He stands with his back against it; the view is behind him, beyond it.
  const z = B.z + B.half + TUNING.rat.radius + 0.02;
  const before = oldView();
  let old = new THREE.Vector3();
  const f = new THREE.Vector3(B.x, 0, z);
  for (let i = 0; i < 180; i++) old = before(f, Math.PI, hollows);
  check('as it used to be: backed against it, the view was pulled in to inside his head', old.distanceTo(new THREE.Vector3(B.x, C.targetHeight, z)) < 0.6, `${old.distanceTo(new THREE.Vector3(B.x, C.targetHeight, z)).toFixed(2)} from the middle of him`);
  const v = view(B.x, 0, z, Math.PI);
  settle(v, hollows);
  const waist = chest(v).add(new THREE.Vector3(0, -0.25, 0));
  check('now it is not pulled in: it stays its full distance off', Math.abs(far(v) - C.distance) < 0.02 && v.cam.rise === 0, `${far(v).toFixed(2)} off`);
  check('it has risen to look over the brazier at him: steeper than he set it, within how steeply it may look', v.cam.lift > 0.3 && steep(v) > 0.6 && steep(v) <= C.liftMaxPitch + 0.03, `pitch ${steep(v).toFixed(2)} (he set 0.30; it may go to ${C.liftMaxPitch})`);
  check('from there nothing solid is between it and him: his chest, his waist, either side of him', sight(chest(v), v.eye.position, hollows) === 1 && sight(waist, v.eye.position, hollows) === 1 && inside(v.eye.position, hollows) === 0);
  check('it has not turned: it is the same way round him as he left it', Math.abs(wrap(bearing(v) - Math.PI)) < 1e-6 && v.cam.yaw === Math.PI);
  check('all of him is in the picture, a little below its middle (looking so steeply down, it looks a little ahead of him), and the floor three ahead of him (a pike\'s length) is well inside it', onScreen(v, new THREE.Vector3(B.x, 0.05, z)).seen && onScreen(v, new THREE.Vector3(B.x, 1.2, z)).seen && onScreen(v, chest(v)).up < 0 && onScreen(v, new THREE.Vector3(B.x, 0.5, z + 3)).seen && onScreen(v, new THREE.Vector3(B.x, 0.5, z + 3)).up < 20, `his chest ${onScreen(v, chest(v)).up.toFixed(0)}, three ahead ${onScreen(v, new THREE.Vector3(B.x, 0.5, z + 3)).up.toFixed(0)} degrees up the picture`);
  // He walks away from it: the view comes down again.
  for (let i = 0; i < 60; i++) {
    v.focus.z += 3 * DT;
    step(v, hollows, { x: 0, z: 3 });
  }
  settle(v, hollows, 2.5);
  check('when he walks away from it the view comes down to where he set it', v.cam.lift < 0.01 && Math.abs(steep(v) - 0.3) < 0.02 && Math.abs(far(v) - C.distance) < 0.02, `pitch ${steep(v).toFixed(3)}`);
  // He backs into it from the open: the view goes up over it without first coming in at him.
  const w = view(B.x, 0, z + 3, Math.PI);
  settle(w, hollows, 1);
  let nearest = 9;
  let jump = 0;
  let turn = 0;
  const last = w.eye.position.clone();
  for (let i = 0; i < 150; i++) {
    if (w.focus.z > z) w.focus.z = Math.max(z, w.focus.z - 3 * DT);
    step(w, hollows);
    nearest = Math.min(nearest, far(w));
    jump = Math.max(jump, w.eye.position.distanceTo(last));
    turn = Math.max(turn, Math.abs(wrap(bearing(w) - Math.PI)));
    last.copy(w.eye.position);
  }
  check('backing into it from the open, the view goes up over it smoothly, hardly coming in at him at all on the way', nearest > C.distance - 0.4 && jump < 0.25 && turn < 1e-6 && w.cam.lift > 0.3, `nearest ${nearest.toFixed(2)} of ${C.distance}; most it moves in a frame ${jump.toFixed(2)}`);
  // A little to one side of the line, its bowl (wider than its stand) would still have hidden him: it rises for that too.
  const s = view(B.x + 0.5, 0, z + 0.3, Math.PI);
  settle(s, hollows);
  check('a brazier just beside the line between them (its bowl is wider than its stand) is looked over as well', s.cam.lift > 0.2 && Math.abs(far(s) - C.distance) < 0.02, `risen ${s.cam.lift.toFixed(2)}`);
  const clear = view(B.x + 1.6, 0, z + 0.3, Math.PI);
  settle(clear, hollows);
  check('one well to the side is left alone', clear.cam.lift === 0 && Math.abs(steep(clear) - 0.3) < 1e-6);
}

// ---- Barrels and crates ----
{
  // The Club's barrels (a row of them on the raised floor, 1.1 high).
  const L = LEVELS.find((l) => l.id === 'hub')!;
  const barrel = L.solids.find((b) => b.kind === 'barrel')!;
  const bx = (barrel.x0 + barrel.x1) / 2;
  const bz = (barrel.z0 + barrel.z1) / 2;
  const v = view(barrel.x1 + TUNING.rat.radius + 0.6, barrel.y0, bz, -Math.PI / 2);
  settle(v, hub);
  const feet = new THREE.Vector3(v.focus.x, v.focus.y + 0.55, v.focus.z);
  check('a barrel between them is looked over: he is not hidden behind it to the neck (as a line to his chest alone would have left him)', v.cam.lift > 0.1 && Math.abs(far(v) - C.distance) < 0.02 && sight(feet, v.eye.position, hub) === 1 && v.eye.position.x < bx, `pitch ${steep(v).toFixed(2)}`);
  // The Cistern: a crate with another on top of it and one beside it. A step off it, the view can still see over.
  const stack = { x: 26, z0: 25.5, z1: 26.5, top: 2 };
  const a = view(stack.x, 0, stack.z1 + 1.3, Math.PI);
  settle(a, cistern);
  check('two crates, one on the other: a step away from them, it looks over them too', a.cam.lift > 0.3 && Math.abs(far(a) - C.distance) < 0.02 && sight(chest(a), a.eye.position, cistern) === 1 && a.eye.position.y > stack.top, `pitch ${steep(a).toFixed(2)}, ${a.eye.position.y.toFixed(1)} up`);
}

// ---- A wall behind him: it is still pulled in, but it goes up over his head and looks ahead of him ----
for (const [name, x, z, yaw] of [['a wall', 10, 48 - TUNING.rat.radius - 0.02, 0], ['a corner', 48 - TUNING.rat.radius - 0.02, 48 - TUNING.rat.radius - 0.02, Math.PI / 4]] as Array<[string, number, number, number]>) {
  const f = new THREE.Vector3(x, 0, z);
  const before = oldView();
  let old = new THREE.Vector3();
  for (let i = 0; i < 180; i++) old = before(f, yaw, cistern);
  const v = view(x, 0, z, yaw);
  settle(v, cistern);
  const ahead = new THREE.Vector3(x - Math.sin(yaw) * 3, 0.5, z - Math.cos(yaw) * 3);
  const head = new THREE.Vector3(x, 1.1, z);
  check(`${name} at his back, as it used to be: the view was pulled in to inside his head`, old.distanceTo(new THREE.Vector3(x, C.targetHeight, z)) < 0.6, `${old.distanceTo(new THREE.Vector3(x, C.targetHeight, z)).toFixed(2)} from the middle of him, ${inside(old, cistern).toFixed(2)} into the wall`);
  check(`${name} at his back: it has gone up over his head, on his side of the wall`, v.cam.rise > C.squeezeRise - 0.05 && v.eye.position.y > 2.5 && inside(v.eye.position, cistern) === 0 && v.cam.lift === 0, `${v.eye.position.y.toFixed(2)} up, ${Math.hypot(v.eye.position.x - x, v.eye.position.z - z).toFixed(2)} out from him`);
  check(`...and looks down ahead of him: all of him is in the picture, near its foot, and so is the floor three ahead of him`, onScreen(v, new THREE.Vector3(x, 0.05, z)).seen && onScreen(v, head).seen && onScreen(v, chest(v)).up < -5 && onScreen(v, ahead).seen, `his feet ${onScreen(v, new THREE.Vector3(x, 0.05, z)).up.toFixed(0)}, his head ${onScreen(v, head).up.toFixed(0)}, three ahead ${onScreen(v, ahead).up.toFixed(0)} degrees up the picture`);
  check(`...and it has not turned`, v.cam.yaw === yaw && Math.abs(onScreen(v, chest(v)).side) < 0.01 && Math.abs(onScreen(v, ahead).side) < 0.01);
  // He walks out from the wall: it comes back down behind him.
  for (let i = 0; i < 90; i++) {
    v.focus.x -= Math.sin(yaw) * 4 * DT;
    v.focus.z -= Math.cos(yaw) * 4 * DT;
    step(v, cistern);
  }
  settle(v, cistern, 3);
  check(`...and when he walks out from it, it comes down behind him again`, v.cam.rise < 0.01 && Math.abs(steep(v) - 0.3) < 0.02 && Math.abs(far(v) - C.distance) < 0.05, `pitch ${steep(v).toFixed(3)}, ${far(v).toFixed(2)} off`);
}
{
  // Backing into the wall from the open: it moves smoothly, and he never leaves the picture.
  const z1 = 48 - TUNING.rat.radius - 0.02;
  const v = view(10, 0, z1 - 6, 0);
  settle(v, cistern, 1);
  let jump = 0;
  let swing = 0;
  let lost = 0;
  let deep = 0;
  let deepOld = 0;
  const before = oldView();
  const last = v.eye.position.clone();
  const dir = new THREE.Vector3();
  const lastDir = v.eye.getWorldDirection(new THREE.Vector3());
  for (let i = 0; i < 300; i++) {
    v.focus.z = Math.min(z1, v.focus.z + 4 * DT);
    step(v, cistern);
    deepOld = Math.max(deepOld, inside(before(v.focus, 0, cistern), cistern));
    jump = Math.max(jump, v.eye.position.distanceTo(last));
    v.eye.getWorldDirection(dir);
    swing = Math.max(swing, (dir.angleTo(lastDir) * 180) / Math.PI);
    if (!onScreen(v, chest(v)).seen) lost++;
    deep = Math.max(deep, inside(v.eye.position, cistern));
    last.copy(v.eye.position);
    lastDir.copy(dir);
  }
  check('backing into a wall from the open, the view moves smoothly up over him and he never leaves the picture', jump < 0.6 && swing < 8 && lost === 0, `most it moves in a frame ${jump.toFixed(2)}, most it swings ${swing.toFixed(1)} degrees; out of the picture for ${lost} frames`);
  check('...and it is never deeper in the wall than it used to go on the way', deep <= deepOld + 0.01, `${deep.toFixed(2)}; it used to go ${deepOld.toFixed(2)} in`);
  settle(v, cistern, 1);
  check('...and come to rest it is not in the wall at all (it used to rest a little way inside it)', inside(v.eye.position, cistern) === 0);
}
{
  // Under a low roof there is no room to go up: it goes up as far as there is, and stays under the roof.
  const room: Aabb[] = [makeAabb(0, -0.5, 0, 20, 1, 20), makeAabb(0, 2, 5.5, 20, 6, 1), makeAabb(0, 2.6, 0, 20, 1, 20)];
  const v = view(0, 0, 5 - TUNING.rat.radius - 0.02, 0);
  settle(v, room);
  check('under a low roof it goes up only as far as there is room, stays under the roof and out of the wall, and he is still in the picture', v.cam.rise > 0.2 && v.cam.rise < C.squeezeRise - 0.5 && v.eye.position.y < 2.1 - 0.15 && inside(v.eye.position, room) === 0 && Number.isFinite(v.eye.position.x + v.eye.quaternion.x) && onScreen(v, chest(v)).seen && onScreen(v, new THREE.Vector3(0, 1.2, v.focus.z)).seen, `risen ${v.cam.rise.toFixed(2)}; ${v.eye.position.y.toFixed(2)} up under a roof at 2.10; his chest ${onScreen(v, chest(v)).up.toFixed(0)} degrees up the picture`);
  const flat: Aabb[] = [room[0], room[1], makeAabb(0, 1.7, 0, 20, 1, 20)];
  const u = view(0, 0, 5 - TUNING.rat.radius - 0.02, 0);
  settle(u, flat);
  check('with no room over him at all it stays as it was', u.cam.rise === 0 && Math.abs(steep(u) - 0.3) < 0.05, `risen ${u.cam.rise.toFixed(2)}`);
}

// ---- Both can be turned off, and then it is exactly as it was ----
{
  const tall = C.liftMaxPitch;
  const up = C.squeezeRise;
  C.liftMaxPitch = 0;
  C.squeezeRise = 0;
  const before = oldView();
  const v = view(10, 0, 40, 0);
  let off = 0;
  // He backs into the Cistern's wall, stands, and walks out again; then the same at the brazier.
  for (let i = 0; i < 420; i++) {
    v.focus.z = i < 240 ? Math.min(48 - 0.32, v.focus.z + 4 * DT) : v.focus.z - 3 * DT;
    step(v, cistern);
    off = Math.max(off, v.eye.position.distanceTo(before(v.focus, 0, cistern)));
  }
  C.liftMaxPitch = tall;
  C.squeezeRise = up;
  check('with both sliders at nothing the view is exactly what it was, frame for frame', off < 1e-9 && v.cam.lift === 0 && v.cam.rise === 0, `furthest apart ${off.toExponential(1)}`);
  check('each has a slider, set as the game is', TWEAKS.some((t) => t.path === 'camera.liftMaxPitch') && TWEAKS.some((t) => t.path === 'camera.squeezeRise') && tall === 1.2 && up === 2.6);
}

// ---- A run about the Cistern with the real knight: against the old view, frame for frame ----
{
  const L = LEVELS.find((l) => l.id === 'cistern')!;
  const p = new PlayerController(new THREE.Vector3(20, 0, 30));
  const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, sneakHeld: false, stowPressed: false, ...o } as PlayerInput);
  for (let i = 0; i < 20; i++) p.update(DT, input(), cistern);
  const v = view(p.position.x, p.position.y, p.position.z, 0);
  const before = oldView();
  let seed = 5;
  const roll = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let dir = 0;
  let inHead = 0;
  let inHeadOld = 0;
  let lost = 0;
  let bad = 0;
  let deep = 0;
  let deepOld = 0;
  let swing = 0;
  let risen = 0;
  let over = 0;
  let turned = 0;
  let yaw = 0;
  const dirNow = new THREE.Vector3();
  const lastDir = new THREE.Vector3(0, 0, -1);
  const FRAMES = 60 * 90;
  for (let i = 0; i < FRAMES; i++) {
    // He runs one way for a second or so, then another; the view is turned slowly by the stick now and then.
    if (i % 75 === 0) dir = roll() * Math.PI * 2;
    const turn = Math.floor(i / 300) % 3 === 1 ? 1 : 0;
    yaw += turn * DT * C.turnSpeed;
    p.update(DT, input({ move: new THREE.Vector3(Math.sin(dir), 0, Math.cos(dir)), run: true }), cistern);
    v.focus.copy(p.position);
    v.cam.update(DT, v.focus, p.facing, true, turn, 0, cistern, p.velocity);
    const old = before(v.focus, yaw, cistern);
    const c = new THREE.Vector3(p.position.x, p.position.y + C.targetHeight, p.position.z);
    if (old.distanceTo(c) < 0.75) inHeadOld++;
    if (v.eye.position.distanceTo(c) < 0.75) inHead++;
    if (!Number.isFinite(v.eye.position.x + v.eye.position.y + v.eye.position.z + v.eye.quaternion.w)) bad++;
    if (i > 5 && !onScreen(v, c).seen) lost++;
    deep = Math.max(deep, inside(v.eye.position, cistern));
    deepOld = Math.max(deepOld, inside(old, cistern));
    v.eye.getWorldDirection(dirNow);
    if (i > 5) swing = Math.max(swing, (dirNow.angleTo(lastDir) * 180) / Math.PI);
    lastDir.copy(dirNow);
    if (v.cam.rise > 0.3) risen++;
    if (v.cam.lift > 0.1) over++;
    turned = Math.max(turned, Math.abs(wrap(v.cam.yaw - yaw)));
  }
  check('a minute and a half of running about the Cistern into its walls and crates: the old view was in his head for some of it', inHeadOld > 30, `${inHeadOld} of ${FRAMES} frames within 0.75 of the middle of him`);
  check('...the new one never is', inHead === 0, `${inHead} frames; it went up over his head for ${risen} frames and looked over something low for ${over}`);
  check('...he is never out of the picture, nothing in it is a bad number, and it is never deeper in anything solid than it used to go', lost === 0 && bad === 0 && deep <= deepOld + 0.01, `out of the picture ${lost} frames; deepest ${deep.toFixed(2)}, where it used to go ${deepOld.toFixed(2)}`);
  check('...it never swings sharply from one frame to the next', swing < 12, `most ${swing.toFixed(1)} degrees in a frame`);
  check('...and only the stick turned it', turned < 1e-9);
  void L;
}

// ---- GOING UP A SLOPE (the owner, 2026-11-17: "if you're going up ramps at any kind of speed whether you're walking or
// especially while you're riding the board it just like zooms in too far into the back of the character or straight up
// into the wall and you can't see anything"). Its height comes after his gently; up a slope the ground comes up too,
// and the point it looks at was left inside the slope: it shot in to within half a unit of him. ----
{
  const told: string[] = [];
  let ok = true;
  for (const slope of [0.42, 0.5, 1]) {
    const ramp = aabbOf(rampBox('stone', -6, 6, 0, 80, 0, 80 * slope, 's', 0));
    const cs: Aabb[] = [aabbOf(extent('floor', -40, 40, -1, 0, -60, 200)), ramp];
    for (const speed of [6, 16, 30]) for (const fps of [60, 30]) {
      const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
      const cam = new FollowCamera(eye);
      cam.yaw = Math.PI;
      const focus = new THREE.Vector3(0, 0, -20);
      const dt = 1 / fps;
      let nearest = 99;
      let under = 0;
      for (let i = 0; i < fps * 5 && focus.z < 79; i++) {
        focus.z += speed * dt;
        focus.y = focus.z > 0 ? topAt(ramp, 0, Math.min(80, focus.z)) : 0;
        cam.update(dt, focus, 0, true, 0, 0, cs, { x: 0, z: speed });
        if (focus.z > 4) {
          nearest = Math.min(nearest, Math.hypot(eye.position.x - focus.x, eye.position.y - (focus.y + C.targetHeight), eye.position.z - focus.z));
          under = Math.max(under, (eye.position.z > 0 ? topAt(ramp, eye.position.x, eye.position.z) : 0) - eye.position.y);
        }
      }
      if (nearest < C.distance * 0.85 || under > 0) { ok = false; told.push(`slope ${slope} at ${speed}, ${fps} fps: ${nearest.toFixed(2)} off${under > 0 ? ', under the ramp' : ''}`); }
    }
  }
  check('going UP a slope (as steep as the roads, and steeper; walking, riding, tucked; at sixty frames a second and at thirty) it stays its distance behind him and over the slope: it is not drawn in to his back', ok, told.join('; '));
  // And a hop on the flat is as it was: its height comes after his gently.
  const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
  const cam = new FollowCamera(eye);
  cam.yaw = Math.PI;
  const flat: Aabb[] = [aabbOf(extent('floor', -40, 40, -1, 0, -60, 200))];
  const focus = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < 60; i++) cam.update(DT, focus, 0, false, 0, 0, flat);
  const y0 = eye.position.y;
  focus.y = 2;
  cam.update(DT, focus, 0, false, 0, 0, flat);
  cam.update(DT, focus, 0, false, 0, 0, flat);
  check('a hop off flat ground does not jolt it: two up in a step, it has risen a fifth of that or less (the ground under him has not moved)', eye.position.y - y0 < 0.45 && eye.position.y - y0 > 0, `${(eye.position.y - y0).toFixed(2)}`);
}

// ---- IN A HALF PIPE (2026-11-17). The view does not turn by itself, so in a pipe it is on the side of one wall, and he
// rides up that wall TOWARDS it every other pass. It was drawn in to 1.3 from him at the foot of that wall (it sits 3.5
// off), was under the wall's surface by a fifth, and was squeezed again in the air after the launch on that side: the
// point it looks at, leaned ahead of him, lay against the slope, and from there no line over the wall was ever found.
// The real pipe, the game's own solids, the real controller; the view on each side of him and cornerwise; pumping
// in the flat and with the stick held the whole way; at sixty frames a second and at thirty. ----
{
  const def = toyBox();
  const cs: Aabb[] = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers }).colliders;
  const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));
  const deck = halfDeck();
  const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const told: string[] = [];
  let launches = 0;
  for (const yaw of [Math.PI / 2, -Math.PI / 2, Math.PI / 4]) {
    for (const hard of [false, true]) {
      for (const fps of [60, 30]) {
        const dt = 1 / fps;
        const p = new PlayerController(new THREE.Vector3(HALF.x + deck.out + 3, deck.y + 0.01, 0));
        p.feel = FEELS.dream;
        p.rails = toyBoxPlan().rails;
        p.skateAnywhere = true;
        const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
        const cam = new FollowCamera(eye);
        cam.yaw = yaw;
        for (let i = 0; i < 10; i++) p.update(dt, inp({}), cs);
        p.update(dt, inp({ move: v(-1, 0), jumpPressed: true, jumpHeld: true }), cs);
        let nearest = 99;
        let under = 0;
        let turned = 0;
        let wasUp = false;
        for (let i = 0; i < fps * 14; i++) {
          const pump = hard || Math.abs(p.position.x - HALF.x) < HALF.flat + 2.5 ? v(Math.sign(p.velocity.x) || -1, 0) : v(0, 0);
          const move = p.riding ? pump : v(-1, 0);
          p.update(dt, inp({ move, jumpHeld: !p.riding, attackPressed: !p.riding && !p.grounded && p.velocity.y < 5 }), cs);
          cam.update(dt, p.position, p.facing, true, 0, 0, cs, p.velocity, p.riding && p.grounded ? Math.hypot(p.velocity.x, p.velocity.z) : 0);
          const up = p.riding && !p.grounded && p.position.y > deck.y + 1;
          if (up && !wasUp) launches++;
          wasUp = up;
          if (i < fps * 1.5) continue;
          nearest = Math.min(nearest, Math.hypot(eye.position.x - p.position.x, eye.position.y - (p.position.y + C.targetHeight), eye.position.z - p.position.z));
          under = Math.max(under, ground(eye.position.x, eye.position.z) - eye.position.y);
          turned = Math.max(turned, Math.abs(cam.yaw - yaw));
        }
        if (nearest < 2.4 || under > 0.05 || turned > 1e-6) told.push(`yaw ${yaw.toFixed(2)}${hard ? ' hard' : ''} ${fps} fps: nearest ${nearest.toFixed(2)}, under by ${under.toFixed(2)}, turned ${turned.toFixed(2)}`);
      }
    }
  }
  check('in the half pipe (the view on either side of him and cornerwise, pumping gently and hard, at sixty frames a second and thirty) he goes up off the lips and comes back, and through all of it the view is never drawn in to his back (it was, to 1.3), is never under the wall, and never turns by itself', launches >= 24 && told.length === 0, `${launches} launches; ${told.join('; ')}`);
}

// ---- IN THE BOWL (2026-11-17): the same, with a wall on every side of him. ----
{
  const def = toyBox();
  const cs: Aabb[] = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers }).colliders;
  const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));
  const bf = facetsOf(BOWL.radius, BOWL.facets, BOWL.turn);
  const top = bf[bf.length - 1].h1;
  const inner = BOWL.flat + bf[bf.length - 1].d1;
  const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  const told: string[] = [];
  let launches = 0;
  for (const [dx, dz] of [[1, 0], [0, 1]] as const) {
    for (const yaw of [Math.atan2(-dx, -dz), Math.atan2(dx, dz), Math.atan2(-dx, -dz) + Math.PI / 4]) {
      for (const fps of [60, 30]) {
        const dt = 1 / fps;
        const p = new PlayerController(new THREE.Vector3(BOWL.x - dx * (inner + 1.6), top + 0.01, BOWL.z - dz * (inner + 1.6)));
        p.feel = FEELS.dream;
        p.skateAnywhere = true;
        const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
        const cam = new FollowCamera(eye);
        cam.yaw = yaw;
        for (let i = 0; i < 10; i++) p.update(dt, inp({}), cs);
        p.update(dt, inp({ move: v(dx, dz), jumpPressed: true, jumpHeld: true }), cs);
        let nearest = 99;
        let under = 0;
        let wasUp = false;
        for (let i = 0; i < fps * 12; i++) {
          const along = (p.position.x - BOWL.x) * dx + (p.position.z - BOWL.z) * dz;
          const going = Math.sign(p.velocity.x * dx + p.velocity.z * dz) || 1;
          const move = !p.riding || along < -(inner - 0.1) ? v(dx, dz) : Math.abs(along) < BOWL.flat + 1.5 ? v(going * dx, going * dz) : v(0, 0);
          p.update(dt, inp({ move, jumpHeld: !p.riding, attackPressed: !p.riding && !p.grounded && p.velocity.y < 5 }), cs);
          cam.update(dt, p.position, p.facing, true, 0, 0, cs, p.velocity, 0);
          const up = p.riding && !p.grounded && p.position.y > top + 0.5;
          if (up && !wasUp) launches++;
          wasUp = up;
          if (i < fps * 1.5) continue;
          nearest = Math.min(nearest, Math.hypot(eye.position.x - p.position.x, eye.position.y - (p.position.y + C.targetHeight), eye.position.z - p.position.z));
          under = Math.max(under, ground(eye.position.x, eye.position.z) - eye.position.y);
        }
        if (nearest < 2.2 || under > 0.05) told.push(`along ${dx ? 'x' : 'z'}, yaw ${yaw.toFixed(2)}, ${fps} fps: nearest ${nearest.toFixed(2)}, under by ${under.toFixed(2)}`);
      }
    }
  }
  check('in the bowl (across it both ways; the view behind him, in front of him and cornerwise; sixty frames a second and thirty) he goes up off the lips and comes back, and the view is never drawn in to his back and never under a wall', launches >= 20 && told.length === 0, `${launches} launches; ${told.join('; ')}`);
}

// ---- ON HIS SHIELD, THE VIEW CAN BE ASKED TO COME ROUND BEHIND THE WAY HE IS GOING (TUNING.camera.rideFollowRate): it
// is 0, his rule ("the camera must not turn by itself"), and is there to be tried in the Tweaks panel. ----
{
  const flat: Aabb[] = [aabbOf(extent('floor', -40, 40, -1, 0, -60, 200))];
  const run = (rate: number, rideSpeed: number): number => {
    const was = C.rideFollowRate as number;
    (C as { rideFollowRate: number }).rideFollowRate = rate;
    const eye = new THREE.PerspectiveCamera(55, 4 / 3, 0.1, 200);
    const cam = new FollowCamera(eye);
    cam.yaw = Math.PI; // behind one going +z... and he is going +x
    const focus = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 120; i++) {
      focus.x += 10 * DT;
      cam.update(DT, focus, Math.PI / 2, true, 0, 0, flat, { x: 10, z: 0 }, rideSpeed);
    }
    (C as { rideFollowRate: number }).rideFollowRate = was;
    return Math.abs(Math.atan2(Math.sin(cam.yaw - -Math.PI / 2), Math.cos(cam.yaw - -Math.PI / 2)));
  };
  check('as it is set (0), the view does not come round behind him on his shield: it does not turn by itself', C.rideFollowRate === 0 && Math.abs(run(0, 10) - Math.PI / 2) < 1e-6, `${C.rideFollowRate}, ${run(0, 10).toFixed(2)}`);
  check('asked to (the Tweaks panel), on his shield it comes round behind the way he is GOING within two seconds; on foot it still does not', run(2, 10) < 0.1 && Math.abs(run(2, 0) - Math.PI / 2) < 1e-6, `riding ${run(2, 10).toFixed(2)} off behind; on foot ${run(2, 0).toFixed(2)}`);
  check('the Tweaks panel has it', TWEAKS.some((t) => t.path === 'camera.rideFollowRate'));
}

console.log(failures === 0 ? '\ncamera: all passed' : `\ncamera: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
