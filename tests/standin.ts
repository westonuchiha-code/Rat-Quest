// THE STAND-IN (player/standIn.ts; the Stand-in room, levels/standinroom.ts; 2026-11-20): Bramble the hedgehog drawn in
// the rat's place, posed from what the rat's own controller does. The real rat is run through the room's course, and
// the hedgehog is posed from him every frame as main.ts does it; then each pose is looked at.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import type { RatAnimInput } from '../src/player/ratModel';
import { StandIn } from '../src/player/standIn';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { HANG, POOL, SLOPES, STEPS } from '../src/levels/standinroom';
import { ROOMS } from '../src/levels/testRooms';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });

const def = levelById('standin');
check('the Stand-in room is Test Room 19; he walks in as the knight', !!def && !def.playAs && ROOMS.some((r) => r.n === 19 && r.id === 'standin'));
{
  const b = def?.npcs?.find((n) => n.name === 'Bramble');
  const spawn = def?.spawn ?? { x: 0, y: 0, z: 0, facing: 0 };
  check('Bramble waits by the way in, to swap with him (and the knight has his own lines, to swap back)', !!b && b.swap?.as === 'hedgehog' && (b.swap?.back.length ?? 0) > 0 && b.lines.length > 0 && Math.hypot(b.x - spawn.x, b.z - spawn.z) < 6, b ? `${Math.hypot(b.x - spawn.x, b.z - spawn.z).toFixed(1)} from the way in` : 'not there');
}
const room = buildChamber(def as never);

/** What the rat's model is told each frame (as main.ts tells it, in play). */
function anim(p: PlayerController): RatAnimInput {
  return {
    state: p.state, planarSpeed: Math.hypot(p.velocity.x, p.velocity.z), comboStep: p.comboStep, attackTime: p.attackTime,
    dodgeKind: p.currentDodgeKind, dodgeProgress: p.dodgeProgress, verticalSpeed: p.velocity.y, flipProgress: p.flipProgress,
    armed: p.armed, stowProgress: p.stowProgress, plungeStage: p.plungeStage, ledge: p.ledge, hangTime: p.hangTime,
    climbProgress: p.climbProgress, kickProgress: p.kickProgress, onWall: p.onWall,
    slide: p.sliding ? { back: p.slideBack, air: !p.grounded, ...p.rideGround } : null, glide: p.gliding,
    carry: p.carryPose, throwT: p.throwProgress,
    ride: p.riding ? { steer: p.rideSteer, tuck: p.rideTuck, spin: p.rideSpinProgress, grab: p.rideGrabPose, flip: p.rideFlipProgress, air: !p.grounded, ...p.rideGround, grind: p.grinding, grindSide: p.grindSide } : null,
  };
}

const h = new StandIn();
/** The room his shape takes up: what is drawn of him (a hidden part, the board when he is not riding, is not). */
function shape(): THREE.Box3 {
  const box = new THREE.Box3();
  const visible = (o: THREE.Object3D): boolean => o.visible && (!o.parent || visible(o.parent));
  h.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && visible(o)) box.union(new THREE.Box3().setFromObject(o, true));
  });
  return box;
}
let nan = 0;
const seen = new Map<string, number>();
/** One frame: the rat steps, the hedgehog is posed from him. What the hedgehog's shape is now (in his own frame). */
function frame(p: PlayerController, pad: Partial<PlayerInput>): { box: THREE.Box3; a: RatAnimInput } {
  room.stepMovers(DT, p);
  p.update(DT, input(pad), room.colliders);
  const a = anim(p);
  h.setTransform(new THREE.Vector3(), p.facing);
  h.update(DT, a);
  h.root.updateMatrixWorld(true);
  h.root.traverse((o) => {
    if (![o.position.x, o.position.y, o.position.z, o.rotation.x, o.rotation.y, o.rotation.z, o.scale.x].every(Number.isFinite)) nan++;
  });
  seen.set(a.state, (seen.get(a.state) ?? 0) + 1);
  return { box: shape(), a };
}
const start = (x: number, y: number, z: number, facing = Math.PI): PlayerController => {
  const p = new PlayerController(new THREE.Vector3(x, y, z));
  p.water = room.water;
  p.facing = facing;
  for (let k = 0; k < 30; k++) frame(p, {});
  return p;
};

// ---- Standing, walking, running: his feet on the floor, the needle not through it ----
{
  const p = start(0, 0, 6);
  const idle = frame(p, {}).box;
  check('standing, his feet are on the floor (nothing of him below it, nothing floating)', idle.min.y > -0.03 && idle.min.y < 0.04, `lowest ${idle.min.y.toFixed(3)}`);
  check('standing, he is his own height (about a metre: the rat is 1.1)', idle.max.y > 0.85 && idle.max.y < 1.15, `top ${idle.max.y.toFixed(2)}`);
  let low = 9;
  let high = -9;
  let legSwing = 0;
  for (let k = 0; k < 90; k++) {
    const f = frame(p, { move: new THREE.Vector3(1, 0, 0), run: true });
    low = Math.min(low, f.box.min.y);
    high = Math.max(high, f.box.min.y);
    legSwing = Math.max(legSwing, Math.abs(h['rig'].legs[0].thigh.rotation.x));
  }
  check('running, his legs patter (swing well forward and back)', legSwing > 0.5, `swing ${legSwing.toFixed(2)} rad`);
  check('running, he stays on the floor (a bob, no sinking in, no floating)', low > -0.05 && high < 0.12, `lowest ${low.toFixed(3)}..${high.toFixed(3)}`);
}
// ---- The sword: a swing sweeps the needle across in front of him ----
{
  const p = start(0, 0, 6);
  const tipX: number[] = [];
  const tipZ: number[] = [];
  const base = new THREE.Vector3();
  const tip = new THREE.Vector3();
  frame(p, { attackPressed: true });
  for (let k = 0; k < 25; k++) {
    frame(p, {});
    h.getBlade(base, tip);
    // (In his own frame: across him, and out in front of him.)
    h.root.worldToLocal(tip);
    tipX.push(tip.x);
    tipZ.push(tip.z);
  }
  const sweep = Math.max(...tipX) - Math.min(...tipX);
  check('a swing sweeps the needle across in front of him (for the sword trail too)', sweep > 0.5 && Math.max(...tipZ) > 0.3, `across ${sweep.toFixed(2)}, out ${Math.max(...tipZ).toFixed(2)}`);
}
// ---- The roll: curled into a ball, rolling over ----
{
  const p = start(0, 0, 6);
  frame(p, { move: new THREE.Vector3(1, 0, 0) });
  let ball = 9;
  let turned = 0;
  frame(p, { move: new THREE.Vector3(1, 0, 0), dodgePressed: true });
  for (let k = 0; k < 30; k++) {
    const f = frame(p, { move: new THREE.Vector3(1, 0, 0) });
    if (f.a.state === 'dodge') {
      ball = Math.min(ball, f.box.max.y - f.box.min.y);
      turned = Math.max(turned, h['rig'].body.rotation.x);
    }
  }
  check('a dodge: he curls into a ball (much lower than standing) and rolls right over', ball < 0.75 && turned > Math.PI, `ball ${ball.toFixed(2)} high, rolled ${(turned / Math.PI).toFixed(1)} half-turns`);
}
// ---- The jump and the second jump's flip: a ball turning over in the air ----
{
  const p = start(0, 0, 6);
  let flipBall = 9;
  for (let k = 0; k < 70; k++) {
    const f = frame(p, { jumpPressed: k === 0 || k === 22, jumpHeld: true });
    if (f.a.flipProgress > 0.3 && f.a.flipProgress < 0.7) flipBall = Math.min(flipBall, f.box.max.y - f.box.min.y);
  }
  check('the second jump\'s flip: he is a ball as he turns over', flipBall < 0.8, `${flipBall.toFixed(2)} high`);
}
// ---- Off the shelf, down the steep slope: he slides (curled) ----
{
  const p = start(-11.5, STEPS.shelf, (SLOPES.steep.z0 + SLOPES.steep.z1) / 2, Math.PI / 2);
  let slid = 0;
  let curled = 0;
  for (let k = 0; k < 120; k++) {
    const f = frame(p, { move: new THREE.Vector3(1, 0, 0) });
    if (f.a.state === 'slide') {
      slid++;
      if (f.box.max.y - f.box.min.y < 0.8) curled++;
    }
  }
  check('walked off the shelf onto the steep slope, the real rat slides; the hedgehog slides curled up', slid > 5 && curled >= slid - 3, `${slid} frames sliding, ${curled} of them a ball`);
}
// ---- Down the gentle slope: the air attack over it puts the cap under his feet, and he rides it ----
{
  const p = start(-9.2, STEPS.shelf - 0.3, (SLOPES.gentle.z0 + SLOPES.gentle.z1) / 2, Math.PI / 2);
  let rode = 0;
  let onBoard = 0;
  for (let k = 0; k < 120; k++) {
    const f = frame(p, { move: new THREE.Vector3(1, 0, 0), jumpPressed: k === 2, jumpHeld: k < 10, attackPressed: k === 12 });
    if (f.a.state === 'ride') {
      rode++;
      if (h['board'].visible && !h['cap'].visible) onBoard++;
    }
  }
  check('over the gentle slope, the air attack: the real rat rides his shield; the hedgehog rides his bottle cap', rode > 10 && onBoard === rode, `${rode} frames riding`);
}
// ---- The pool: in it he swims, flat on the water ----
{
  const p = start((POOL.x0 + POOL.x1) / 2 + 0.25, POOL.water + 0.5, 0);
  let swam = 0;
  let flat = 0;
  for (let k = 0; k < 90; k++) {
    const f = frame(p, { move: new THREE.Vector3(0, 0, k < 45 ? 1 : -1) });
    if (f.a.state === 'swim') {
      swam++;
      if (h['rig'].body.rotation.x > 1) flat++;
    }
  }
  check('dropped in the pool he swims, lying flat on the water', swam > 30 && flat > swam - 15, `${swam} frames swimming, ${flat} flat`);
}
// ---- The high block: he hangs from its edge, his paws on it ----
{
  const p = start((HANG.x0 + HANG.x1) / 2, 0, HANG.z1 + 2.2, Math.PI);
  let hung = 0;
  let paws = 9;
  let climbed = false;
  for (let k = 0; k < 160 && !climbed; k++) {
    const f = frame(p, { move: new THREE.Vector3(0, 0, -1), jumpPressed: k === 4, jumpHeld: k < 30 });
    if (f.a.state === 'hang' && f.a.ledge) {
      hung++;
      // Where his paws are, as against the edge he holds: his arms' far ends.
      const w = new THREE.Vector3();
      const arm = h['rig'].arms[0];
      arm.fore.updateMatrixWorld(true);
      arm.fore.localToWorld(w.set(0, -0.11, 0));
      paws = Math.min(paws, Math.abs(w.y - f.a.ledge.y));
    }
    if (p.grounded && p.position.y > HANG.top - 0.05) climbed = true;
  }
  check('jumping at the high block, the real rat catches its edge; the hedgehog hangs with his paws at it', hung > 0 && paws < 0.15, hung ? `paws ${paws.toFixed(2)} off the edge` : 'never hung');
}
// ---- HIS OWN MOVEMENT (2026-11-20; the owner: give him movement for his own body, not the knight's) ----
const rig = (): { body: THREE.Group; root: THREE.Group; head: THREE.Group; spines: ReadonlyArray<{ mesh: THREE.Object3D }> } => h['rig'];
const spineScale = (): number => rig().spines[0].mesh.scale.x;
{
  // Walking: a waddle, his round body rocking side to side over each step.
  const p = start(0, 0, 6);
  let lo = 9;
  let hi = -9;
  for (let k = 0; k < 90; k++) {
    frame(p, { move: new THREE.Vector3(1, 0, 0) });
    if (k > 30) {
      lo = Math.min(lo, rig().body.rotation.z);
      hi = Math.max(hi, rig().body.rotation.z);
    }
  }
  check('walking, he waddles: his body rocks from side to side over his feet', hi > 0.08 && lo < -0.08, `rocks ${lo.toFixed(2)}..${hi.toFixed(2)}`);
}
{
  // Running: a scurry, nose down and forward, spines laid flat.
  const p = start(0, 0, 6);
  let pitch = 0;
  let flat = 9;
  for (let k = 0; k < 90; k++) {
    frame(p, { move: new THREE.Vector3(1, 0, 0), run: true });
    if (k > 40) {
      pitch += rig().body.rotation.x / 49;
      flat = Math.min(flat, spineScale());
    }
  }
  check('running, he scurries leaning well forward, his spines laid flat', pitch > 0.3 && flat < 1, `lean ${pitch.toFixed(2)}, spines ${flat.toFixed(2)}`);
}
{
  // Guarding: hunched, his spines bristling up.
  const p = start(0, 0, 6);
  for (let k = 0; k < 40; k++) frame(p, { guardHeld: true });
  check('guarding, he hunches and his spines bristle up', spineScale() > 1.12 && rig().body.rotation.x > 0.2, `spines ${spineScale().toFixed(2)}`);
}
{
  // Landing: a round body bounces, squashed and back.
  const p = start(0, 0, 6);
  let squash = 9;
  let landed = false;
  for (let k = 0; k < 100; k++) {
    const f = frame(p, { jumpPressed: k === 0, jumpHeld: true });
    if (k > 5 && f.a.state !== 'jump' && f.a.state !== 'fall') landed = true;
    if (landed) squash = Math.min(squash, rig().body.scale.y);
  }
  check('landing, he squashes and bounces back', squash < 0.9 && Math.abs(rig().body.scale.y - 1) < 0.03, `squashed to ${squash.toFixed(2)}`);
}
{
  // The third blow of the combo: he spins right round, spines out.
  const p = start(0, 0, 6);
  let most = 0;
  let bristle = 0;
  for (let k = 0; k < 110; k++) {
    const f = frame(p, { attackPressed: k === 0 || k === 20 || k === 42 });
    if (f.a.comboStep === 2) {
      most = Math.max(most, rig().root.rotation.y);
      bristle = Math.max(bristle, spineScale());
    }
  }
  check('the third blow is a spin: he goes right round, spines bristling', most > 5.5 && bristle > 1.1, `turned ${(most / Math.PI).toFixed(1)} half-turns, spines ${bristle.toFixed(2)}`);
}
{
  // Turning: his head goes into the turn first, his body swings round after.
  const p = start(0, 0, 6);
  for (let k = 0; k < 40; k++) frame(p, { move: new THREE.Vector3(1, 0, 0), run: true });
  let lead = 0;
  for (let k = 0; k < 12; k++) {
    frame(p, { move: new THREE.Vector3(0, 0, -1), run: true });
    lead = Math.max(lead, Math.abs(rig().head.rotation.y));
  }
  check('turning, his head leads into the turn', lead > 0.15, `head ${lead.toFixed(2)} rad ahead`);
}
check('no part of him ever went to NaN, in any pose', nan === 0, `${nan}`);
console.log('  states posed:', [...seen.entries()].map(([s, n]) => `${s} ${n}`).join(', '));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
