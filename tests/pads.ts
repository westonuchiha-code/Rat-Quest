// Controller mapping: every supported pad type turns into the same logical buttons and sticks.
import { padKind, readPad, stickPair, PadLike } from '../src/core/controls';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

function pad(id: string, mapping: string, nAxes: number, nButtons: number, set: { axes?: Record<number, number>; buttons?: number[]; rest?: Record<number, number> } = {}): PadLike {
  const axes = Array.from({ length: nAxes }, (_, i) => set.rest?.[i] ?? 0);
  for (const [i, v] of Object.entries(set.axes ?? {})) axes[Number(i)] = v;
  const buttons = Array.from({ length: nButtons }, (_, i) => ({ pressed: (set.buttons ?? []).includes(i), value: (set.buttons ?? []).includes(i) ? 1 : 0 }));
  return { id, mapping, axes, buttons, connected: true };
}

const XBOX = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 02fd)';
const DS = 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)';
const SWITCH = 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)';

check('names are sorted into kinds', padKind(XBOX) === 'xbox' && padKind(DS) === 'playstation' && padKind(SWITCH) === 'nintendo' && padKind('USB Gamepad 0079:0006') === 'generic');

for (const id of [XBOX, DS, SWITCH]) {
  const s = readPad(pad(id, 'standard', 4, 17, { buttons: [0, 4, 15], axes: { 0: 1, 1: 0, 2: -1, 3: 0 } }));
  check(`${padKind(id)} standard: south, L1, d-pad right, sticks`, s.down.south && s.down.l1 && s.down.right && !s.down.east && s.moveX > 0.99 && s.lookX < -0.99);
}

// Triggers as analog button values, and the stick deadzone.
const trig = readPad({ id: XBOX, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: false, value: i === 6 ? 0.9 : 0 })) });
check('an analog L2 counts as pressed', trig.down.l2 && !trig.down.r2);
const drift = readPad(pad(XBOX, 'standard', 4, 17, { axes: { 0: 0.12, 1: -0.1 } }));
check('stick drift is ignored', drift.moveX === 0 && drift.moveY === 0);
const [fx, fy] = stickPair(1, 0);
const [hx] = stickPair(0.6, 0);
check('a full push is 1 and a half push is in between', Math.abs(fx - 1) < 1e-6 && fy === 0 && hx > 0.3 && hx < 0.6);

// D-pad walks when the stick is at rest.
const dp = readPad(pad(XBOX, 'standard', 4, 17, { buttons: [12, 15] }));
check('the d-pad walks when the stick is idle', dp.moveY === 1 && dp.moveX === 1);

// Non-standard pads.
const xlin = readPad(pad('Microsoft X-Box 360 pad (Vendor: 045e Product: 028e)', '', 8, 11, { rest: { 2: -1, 5: -1 }, axes: { 5: 1, 6: -1, 7: 1, 3: 0.9 }, buttons: [0] }));
check('xbox pad without a standard mapping: A, right trigger axis, hat d-pad, right stick', xlin.down.south && xlin.down.r2 && !xlin.down.l2 && xlin.down.left && xlin.down.down && xlin.lookX > 0.5);
const ds4 = readPad(pad('Wireless Controller (Vendor: 054c Product: 09cc)', '', 10, 14, { buttons: [1], axes: { 9: -1, 5: -1 } }));
check('playstation pad without a standard mapping: cross is south, hat up, right stick y', ds4.down.south && !ds4.down.west && ds4.down.up && ds4.lookY > 0.5);
const hatRight = readPad(pad('USB Gamepad (Vendor: 0079 Product: 0006)', '', 10, 12, { rest: { 9: 1.2857 }, axes: { 9: -0.4286 } }));
check('a generic hat switch decodes', hatRight.down.right && !hatRight.down.up && !hatRight.down.left);
const hatNeutral = readPad(pad('USB Gamepad (Vendor: 0079 Product: 0006)', '', 10, 12, { axes: { 9: 1.2857 } }));
check('a neutral hat presses nothing', !hatNeutral.down.up && !hatNeutral.down.down && !hatNeutral.down.left && !hatNeutral.down.right);
const odd = readPad(pad('???', '', 2, 0));
check('a pad with few buttons and axes does not crash', odd.moveX === 0);

if (failures > 0) {
  console.log(`${failures} controller check(s) failed.`);
  process.exit(1);
}
console.log('All controller checks passed.');
