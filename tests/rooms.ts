// The door scene timing, level progress, and doors.
import { REVEAL, revealFrame } from '../src/core/revealCutscene';
import { LEVELS_KEY, LevelProgress } from '../src/core/levelProgress';
import { atDoor, doorCamera, doorOn } from '../src/world/rooms';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const start = revealFrame(0);
const end = revealFrame(REVEAL.total);
check('the scene starts with a normal camera and no door', start.camBlend === 0 && start.sparkle === 0 && start.fade === 0 && !start.done);
check('and ends with the camera back, the door solid and the scene done', end.camBlend === 0 && end.fade === 1 && end.done);
check('he looks both ways before the camera moves', revealFrame(0.6).lookOffset > 0.3 && revealFrame(1.8).lookOffset < -0.3 && revealFrame(REVEAL.look).faceDoor === 0);
check('the room rumbles in the middle and is still at the ends', revealFrame(2.5).rumble > 0.03 && revealFrame(0.5).rumble === 0 && revealFrame(7).rumble === 0);
check('the camera is on the wall while the door appears', revealFrame(6).camBlend === 1 && revealFrame(REVEAL.panEnd).camBlend === 1);
let ordered = true;
let prev = revealFrame(0);
for (let t = 0.05; t <= REVEAL.total; t += 0.05) {
  const f = revealFrame(t);
  if (f.sparkle < prev.sparkle - 1e-9 || f.fade < prev.fade - 1e-9) ordered = false;
  prev = f;
}
check('sparkles and the door only ever grow', ordered);
check('sparkles come before the door fades in', revealFrame(5).sparkle > 0.5 && revealFrame(5).fade === 0 && revealFrame(7).fade > 0.3);
check('the door fade is slow, not a pop', revealFrame(6.4).fade > 0 && revealFrame(6.4).fade < 0.7 && REVEAL.fadeEnd - REVEAL.sparkleEnd >= 2);

const store = { data: new Map<string, string>(), getItem(k: string) { return this.data.get(k) ?? null; }, setItem(k: string, v: string) { this.data.set(k, v); } };
const lp = new LevelProgress(store);
check('nothing is cleared at first', !lp.cleared('a') && !lp.perfect('a') && lp.last === null);
lp.markCleared('a');
lp.markPerfect('a');
lp.setLast('b');
const again = new LevelProgress(store);
check('clearing, completing and the last level are remembered', again.cleared('a') && again.perfect('a') && !again.cleared('b') && again.last === 'b' && store.data.has(LEVELS_KEY));
again.reset();
check('reset forgets everything', !new LevelProgress(store).cleared('a') && new LevelProgress(store).last === null);
store.data.set(LEVELS_KEY, '{nope');
check('a broken save is ignored', !new LevelProgress(store).cleared('a'));

// Doors on every wall face into the room.
for (const side of ['north', 'south', 'east', 'west'] as const) {
  const d = doorOn(side, 10);
  const fx = Math.sin(d.yaw);
  const fz = Math.cos(d.yaw);
  const inside = Math.hypot(d.x + fx * 2, d.z + fz * 2) < Math.hypot(d.x, d.z);
  check(`the ${side} door faces into the room and works at its foot`, inside && atDoor(d, d.x + fx * 0.6, d.z + fz * 0.6) && !atDoor(d, d.x + fx * 6, d.z + fz * 6));
}
const cam = doorCamera(doorOn('east', 20));
check('the camera for a door stands in front of it, looking at it', cam.pos[0] < 19 && Math.abs(cam.pos[2]) < 0.01 && cam.look[0] > 19);

console.log(failures === 0 ? '\nRoom checks passed.' : `\n${failures} room check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
