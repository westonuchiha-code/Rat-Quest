// Headless checks against the real controller and chamber. Run with: npm run test:sim
import * as THREE from 'three';
import { buildChamber } from '../src/world/chamber';
import { PlayerController, PlayerInput } from '../src/player/controller';

const DT = 1 / 60;
const chamber = buildChamber();
let failures = 0;

function check(name: string, ok: boolean, detail: string): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${detail})`);
  if (!ok) failures++;
}

function makePlayer(x: number, y: number, z: number): PlayerController {
  return new PlayerController(new THREE.Vector3(x, y, z));
}

/** Builds a full input object, with every button released unless overridden. */
function input(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    move: new THREE.Vector3(0, 0, 0),
    run: false,
    jumpPressed: false,
    jumpHeld: false,
    attackPressed: false,
    dodgePressed: false,
    guardHeld: false,
    ...overrides,
  };
}

/** Runs `steps` ticks with a fixed direction and optional jump timing. `onStep` sees the controller after each tick. */
function run(
  p: PlayerController,
  steps: number,
  dir: THREE.Vector3,
  opts: { run?: boolean; jumpAt?: number; jumpHoldFrames?: number } = {},
  onStep?: (i: number) => void,
): void {
  for (let i = 0; i < steps; i++) {
    const jumpPressed = opts.jumpAt === i;
    const jumpHeld = opts.jumpAt !== undefined && i >= opts.jumpAt && i < opts.jumpAt + (opts.jumpHoldFrames ?? 60);
    p.update(DT, input({ move: dir, run: !!opts.run, jumpPressed, jumpHeld }), chamber.colliders);
    onStep?.(i);
  }
}

const still = new THREE.Vector3(0, 0, 0);
const west = new THREE.Vector3(-1, 0, 0);
const east = new THREE.Vector3(1, 0, 0);

// 1. Standing still on the floor stays grounded at y = 0.
{
  const p = makePlayer(0, 0, 8);
  run(p, 120, still);
  check('idle on floor stays grounded', p.grounded && Math.abs(p.position.y) < 1e-3, `y=${p.position.y.toFixed(3)} grounded=${p.grounded}`);
}

// 2. A jump from standing reaches roughly 2.5 units.
{
  const p = makePlayer(0, 0, 8);
  run(p, 30, still);
  let peak = 0;
  run(p, 90, still, { jumpAt: 0, jumpHoldFrames: 90 }, () => {
    peak = Math.max(peak, p.position.y);
  });
  check('full jump peak near 2.5 units', peak > 2.3 && peak < 2.7, `peak=${peak.toFixed(2)}`);
  check('lands back on the floor', p.grounded && Math.abs(p.position.y) < 1e-3, `y=${p.position.y.toFixed(3)}`);
}

// 3. Walking into the outer wall stops at the wall face, not through it.
{
  const p = makePlayer(-15, 0, 0);
  run(p, 300, west);
  check('wall stops movement', p.position.x > -19.9 && p.position.x < -19.5, `x=${p.position.x.toFixed(3)} (expect about -19.7)`);
}

// 4. A ledge taller than the step height blocks walking; it does not get climbed.
{
  // The first ring platform starts at x=10.7, so walking east stops at its face (about x=10.4) without climbing it.
  const p = makePlayer(7.5, 0, 0);
  run(p, 120, east);
  check('0.6-unit ledge blocks walking', p.position.x > 10.0 && p.position.x < 10.5 && p.position.y < 0.05, `x=${p.position.x.toFixed(3)} y=${p.position.y.toFixed(3)}`);
}

// 5. A walking jump from the floor lands on the first ring platform (top at 0.6).
{
  const p = makePlayer(9.0, 0, 0);
  let landedOn = false;
  run(p, 90, east, { jumpAt: 0, jumpHoldFrames: 25 }, () => {
    if (p.grounded && p.position.x > 10.7 && p.position.x < 13.7 && Math.abs(p.position.y - 0.6) < 1e-3) landedOn = true;
  });
  check('walking jump lands on first platform', landedOn, `x=${p.position.x.toFixed(2)} y=${p.position.y.toFixed(2)}`);
}

// 6. Falling into the pit respawns the rat at the spawn point the controller was built with.
{
  const p = makePlayer(0, 0, 8); // spawn on the south floor strip
  p.position.set(0, 0, 0); // move over the pit
  p.prevPosition.copy(p.position);
  let respawned = false;
  run(p, 120, still, {}, () => {
    if (Math.abs(p.position.z - 8) < 1e-6) respawned = true;
  });
  check('pit fall respawns at spawn', respawned && p.grounded && Math.abs(p.position.y) < 1e-3, `pos=(${p.position.x.toFixed(2)}, ${p.position.y.toFixed(2)}, ${p.position.z.toFixed(2)})`);
}

// 7. Short jump, released early, is lower than a full jump.
{
  const full = makePlayer(0, 0, 8);
  let fullPeak = 0;
  run(full, 60, still, { jumpAt: 0, jumpHoldFrames: 60 }, () => (fullPeak = Math.max(fullPeak, full.position.y)));
  const short = makePlayer(0, 0, 8);
  let shortPeak = 0;
  run(short, 60, still, { jumpAt: 0, jumpHoldFrames: 3 }, () => (shortPeak = Math.max(shortPeak, short.position.y)));
  check('releasing jump early gives a lower jump', shortPeak < fullPeak - 0.5, `short=${shortPeak.toFixed(2)} full=${fullPeak.toFixed(2)}`);
}

// 8. Double jump: a second press in the air gives a second lift.
{
  const p = makePlayer(0, 0, 8);
  run(p, 30, still); // land first, so the press is a ground jump
  let peak = 0;
  run(p, 90, still, { jumpAt: 0, jumpHoldFrames: 90 }, (i) => {
    if (i === 30) {
      p.update(DT, input({ jumpPressed: true, jumpHeld: true }), chamber.colliders);
    }
    peak = Math.max(peak, p.position.y);
  });
  check('double jump adds height', peak > 3.5, `peak=${peak.toFixed(2)} (single jump is about 2.5)`);
}

// 9. Combo: one press starts hit 1, a press during it queues hit 2, and the swing ends after the last hit.
{
  const p = makePlayer(0, 0, 12);
  run(p, 10, still);
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  check('first press starts attack, hit 1', p.state === 'attack' && p.comboStep === 0, `state=${p.state} step=${p.comboStep}`);
  run(p, 20, still); // part of the way through hit 1
  p.update(DT, input({ attackPressed: true }), chamber.colliders); // queue hit 2
  let reachedSecond = false;
  run(p, 60, still, {}, () => {
    if (p.comboStep === 1) reachedSecond = true;
  });
  check('press during a swing queues the next hit', reachedSecond, `reachedHit2=${reachedSecond}`);
  run(p, 120, still);
  check('combo returns to idle when finished', p.state !== 'attack' && p.comboStep === 0, `state=${p.state} step=${p.comboStep}`);
}

// 10. Guard: holding the shield up sets the guard state, and attack is blocked while guarding.
{
  const p = makePlayer(0, 0, 12);
  run(p, 10, still);
  p.update(DT, input({ guardHeld: true }), chamber.colliders);
  check('holding guard sets guard state', p.state === 'guard' && p.guarding, `state=${p.state}`);
  p.update(DT, input({ guardHeld: true, attackPressed: true }), chamber.colliders);
  check('attack is blocked while guarding', p.state !== 'attack', `state=${p.state}`);
}

// 11. Roll: with a direction held, the rat rolls that way and turns to face it, even if he was facing elsewhere.
{
  // Clear floor on the north strip: no ring platform, rubble or pillar in the way.
  const p = makePlayer(-10, 0, -18.5);
  run(p, 10, still); // facing stays at 0 (+Z)
  const startX = p.position.x;
  p.update(DT, input({ move: east, dodgePressed: true }), chamber.colliders);
  run(p, 21, east);
  const travelled = p.position.x - startX;
  check('roll follows held direction', travelled > 2.0, `travelled=${travelled.toFixed(2)} along +X`);
  check('roll turns the rat to face its direction', Math.abs(p.facing - Math.PI / 2) < 0.2, `facing=${p.facing.toFixed(2)} (expect about 1.57)`);
}

// 12. Backstep: with no direction held, the rat steps straight back and keeps facing the same way.
{
  const p = makePlayer(-10, 0, -15);
  run(p, 10, still);
  const startZ = p.position.z;
  p.update(DT, input({ dodgePressed: true }), chamber.colliders);
  run(p, 18, still);
  const movedBack = startZ - p.position.z; // facing +Z, so backwards is -Z
  check('no input dodges backward', movedBack > 1.0 && movedBack < 2.5, `backstep=${movedBack.toFixed(2)} units`);
  check('backstep keeps facing the same way', Math.abs(p.facing) < 0.05, `facing=${p.facing.toFixed(2)}`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
