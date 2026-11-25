// Lock-on: picks the near foe in front, switches by screen side, drops when far, hops to the next when one dies.
import { pickTarget, switchTarget, keepTarget, cameraYawToward, facingToward, screenSide } from '../src/combat/lockon';
import type { Foe } from '../src/enemies/foe';
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { Director, DIRECTOR } from '../src/enemies/director';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const foe = (x: number, z: number, alive = true, y = 0): Foe => ({ x, y, z, alive } as unknown as Foe);

const rat = { x: 0, y: 0, z: 0 };
// Camera behind the rat looking toward -z: the camera sits at +z, so yaw 0.
const near = foe(0, -4);
const far = foe(0, -10);
check('picks the nearest in front', pickTarget(rat, 0, [far, near]) === near);
check('nobody in range gives null', pickTarget(rat, 0, [foe(0, -40)]) === null);
check('dead foes are ignored', pickTarget(rat, 0, [foe(0, -3, false), far]) === far);
check('a foe behind the camera loses to one in front', pickTarget(rat, 0, [foe(0, 3), foe(0, -5)])?.z === -5);
check('foes on another level are ignored', pickTarget(rat, 0, [foe(0, -3, true, 8)]) === null);

check(
  'camera yaw looks at the foe',
  Math.abs(cameraYawToward(rat, foe(0, -5)) - 0) < 1e-9
    && Math.abs(Math.abs(cameraYawToward(rat, foe(0, 5))) - Math.PI) < 1e-9
);
check('facing points at the foe', Math.abs(facingToward(rat, foe(5, 0)) - Math.PI / 2) < 1e-9);

// Camera looking toward -z: +x is the screen's right-hand side? The camera at +z looking -z has right = +x.
check('screen side: +x is right when looking down -z', screenSide(rat, 0, foe(3, -5)) > 0 && screenSide(rat, 0, foe(-3, -5)) < 0);
const L = foe(-3, -6);
const M = foe(0, -6);
const R = foe(3, -6);
const all = [L, M, R];
check('flick right goes to the next one right', switchTarget(rat, 0, M, all, 1) === R);
check('flick left goes to the next one left', switchTarget(rat, 0, M, all, -1) === L);
check('nothing further right keeps the current', switchTarget(rat, 0, R, all, 1) === R);

check('keeps a live foe in reach', keepTarget(rat, 0, M, all) === M);
const dead = foe(0, -6, false);
check(
  'a dead foe LETS GO, even with another nearby: the lock never moves to a new foe by itself (that swung the view round with nobody asking; he presses again for the next one)',
  keepTarget(rat, 0, dead, [dead, foe(2, -5)]) === null
);
check('a dead foe with nobody else lets go', keepTarget(rat, 0, dead, [dead]) === null);
check('running far away lets go', keepTarget(rat, 0, foe(0, -30), [foe(0, -30)]) === null);

// ---- THE SIDEHOP (2026-11-25): locked on, the roll button is a hop to one side of the creature, still facing it ----
{
  const DT = 1 / 60;
  const floor = [makeAabb(0, -0.5, 0, 200, 1, 200)];
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });
  /** A dodge with the stick held (x, z), locked on to a creature the way `lock` (or not locked): what it was, and where it took him. */
  const dodge = (mx: number, mz: number, lock: number | null): { kind: string; dx: number; dz: number; facing: number; safeEarly: boolean; safeLate: boolean; frames: number } => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), floor);
    p.facing = lock ?? 0;
    p.lockFacing = lock;
    p.update(DT, inp({ move: new THREE.Vector3(mx, 0, mz), dodgePressed: true }), floor);
    const kind = p.currentDodgeKind;
    let frames = 1;
    let safeEarly = false;
    let safeLate = true;
    let facing = p.facing;
    while (p.state === 'dodge' && frames < 120) {
      if (frames === 3) safeEarly = p.invulnerable;
      // (Which way he faces DURING it. After it the game turns him to the creature again each step; here nothing does.)
      if (p.dodgeProgress < 0.9) facing = p.facing;
      if (p.dodgeProgress > 0.8) safeLate = p.invulnerable;
      p.update(DT, inp({ move: new THREE.Vector3(mx, 0, mz) }), floor);
      frames++;
    }
    return { kind, dx: p.position.x, dz: p.position.z, facing, safeEarly, safeLate, frames };
  };
  // (Locked on to a creature to the +z of him: `lock` 0.)
  const right = dodge(1, 0, 0);
  const left = dodge(-1, 0, 0);
  check('LOCKED ON, the roll button with the stick to one side is a SIDEHOP that way: square to the creature, a good step, and he still faces it',
    right.kind === 'side' && left.kind === 'side' && right.dx > 1.6 && left.dx < -1.6 && Math.abs(right.dz) < 0.3 && Math.abs(left.dz) < 0.3 && Math.abs(right.facing) < 1e-6,
    `right ${right.dx.toFixed(2)}, ${right.dz.toFixed(2)}; left ${left.dx.toFixed(2)}`);
  check('...blows pass through him as it begins and not as it ends; and it is over sooner than a roll', right.safeEarly && !right.safeLate && right.frames < TUNING.dodge.roll.duration * 60);
  const slant = dodge(0.8, 0.6, 0);
  check('...a slanting stick is still a hop square to the side (not a roll off at a slant)', slant.kind === 'side' && Math.abs(slant.dz) < 0.3);
  const toward = dodge(0, 1, 0);
  const away = dodge(0, -1, 0);
  check('the stick held TOWARD the creature is the roll, as ever; held AWAY, a backstep away from it, still facing it', toward.kind === 'roll' && toward.dz > 2 && away.kind === 'back' && away.dz < -1 && Math.abs(away.facing) < 1e-6);
  const free = dodge(1, 0, null);
  check('NOT locked on, the same stick is the roll it always was', free.kind === 'roll' && free.dx > 2);
}

// ---- A DUEL (the sewers): locked on to one, never two at him at once, however many there are ----
{
  const mock = (x: number, z: number, o: Partial<Foe> = {}): Foe => ({ x, y: 0, z, alive: true, ready: true, attacking: false, mayAttack: false, ...o } as unknown as Foe);
  const crowd = (): Foe[] => [mock(0, 2), mock(2, 0, { attacking: true, ready: false }), mock(-2, 0), mock(0, -2)];
  const run = (duel: boolean): { locked: boolean; others: number } => {
    const foes = crowd();
    const d = new Director();
    for (let k = 0; k < 120; k++) d.update(1 / 60, foes, 0, 0, foes[0], duel);
    return { locked: !!foes[0].mayAttack, others: foes.filter((e, i) => i > 1 && e.mayAttack).length };
  };
  const open = run(false);
  const duel = run(true);
  check('with four on him and one already attacking, elsewhere a second may attack (the one he is locked on to first)', foe(0, 0) !== null && open.locked && DIRECTOR.crowd === 4);
  check('IN THE SEWERS, locked on, that second one waits: it is one at a time', !duel.locked && duel.others === 0);
}
if (failures) { console.log(`${failures} FAILED`); process.exit(1); }
