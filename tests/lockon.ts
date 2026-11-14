// Lock-on: picks the near foe in front, switches by screen side, drops when far, hops to the next when one dies.
import { pickTarget, switchTarget, keepTarget, cameraYawToward, facingToward, screenSide } from '../src/combat/lockon';
import type { Foe } from '../src/enemies/foe';

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

check('camera yaw looks at the foe', Math.abs(cameraYawToward(rat, foe(0, -5)) - 0) < 1e-9 && Math.abs(Math.abs(cameraYawToward(rat, foe(0, 5))) - Math.PI) < 1e-9);
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
check('a dead foe hands over to another nearby', keepTarget(rat, 0, dead, [dead, foe(2, -5)])?.x === 2);
check('a dead foe with nobody else lets go', keepTarget(rat, 0, dead, [dead]) === null);
check('running far away lets go', keepTarget(rat, 0, foe(0, -30), [foe(0, -30)]) === null);
if (failures) { console.log(`${failures} FAILED`); process.exit(1); }
