// The names of his tricks on the shield (BACKLOG B4, 2026-11-18): player/trickLog.ts, and the name shown as he lands.
import { TrickLog, TRICK_NAMES } from '../src/player/trickLog';
import { SFX_NAMES, sfx } from '../src/audio/synth';
import { TRICK_SHOW } from '../src/ui/trickHud';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
{
  const log = new TrickLog();
  log.begin('flip');
  check('a kickflip landed is a KICKFLIP', log.landed() === TRICK_NAMES.flip);
  check('...and then the log is empty: the next air starts fresh', log.count === 0 && log.landed() === '');
  log.begin('spin');
  log.begin('spin');
  log.begin('spin');
  check('three spins one after another are a 1080', log.landed() === '1080');
  log.begin('spin');
  log.begin('flip');
  log.begin('spin');
  check('a spin, a kickflip, a spin: 360 + KICKFLIP + 360 (spins apart are named apart)', log.landed() === '360 + KICKFLIP + 360');
  let counted = 0;
  for (let i = 0; i < 12; i++) if (log.air(DT, true, 0.3)) counted++;
  check('the guard held a moment is not a grab', log.count === 0 && counted === 0);
  for (let i = 0; i < 30; i++) if (log.air(DT, true, 0.3)) counted++;
  check('...held 0.3 s it is one, counted once however long it is held', log.count === 1 && counted === 1);
  for (let i = 0; i < 30; i++) log.air(DT, false, 0.3);
  for (let i = 0; i < 30; i++) log.air(DT, true, 0.3);
  check('...and only once an air, as the controller counts it', log.count === 1);
  check('...named SHIELD GRAB', log.landed() === TRICK_NAMES.grab);
  log.ground();
  for (let i = 0; i < 30; i++) log.air(DT, true, 0.3);
  check('a new air, after the ground: a grab again', log.count === 1);
  log.begin('flip');
  log.clear();
  check('bailed (or off the shield, or onto a rail): nothing to show', log.landed() === '');
}
{
  check('the trick sounds are made: a whirl for a spin, a slap for a grab, a stab of horns for tricks landed', (['spinWhirl', 'grabSlap', 'trickStab'] as const).every((n) => SFX_NAMES.includes(n) && sfx(n).data.length > 0 && [...sfx(n).data].every(Number.isFinite)));
  check('the name stays up long enough to read, and goes by itself', TRICK_SHOW >= 1 && TRICK_SHOW <= 2.5);
}
console.log(failures ? `tricks: ${failures} FAIL` : 'tricks: all pass');
if (failures) process.exitCode = 1;
