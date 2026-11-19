// His tricks on the shield (BACKLOG B4, 2026-11-18): player/trickLog.ts keeps what he did in one air (for the horn stab
// and the grab's slap). Their names were shown as he landed for a day, then taken off the screen at the owner's word.
import fs from 'node:fs';
import { TrickLog } from '../src/player/trickLog';
import { SFX_NAMES, sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
{
  const log = new TrickLog();
  log.begin('flip');
  check('a kickflip is kept as one', log.kinds.join(' ') === 'flip' && log.count === 1);
  log.clear();
  check('...and cleared, the log is empty: the next air starts fresh', log.count === 0);
  log.begin('spin');
  log.begin('spin');
  log.begin('spin');
  check('three spins one after another are three tricks', log.kinds.join(' ') === 'spin spin spin');
  log.clear();
  log.begin('spin');
  log.begin('flip');
  log.begin('spin');
  check('a spin, a kickflip, a spin: kept in the order he did them', log.kinds.join(' ') === 'spin flip spin');
  log.clear();
  let counted = 0;
  for (let i = 0; i < 12; i++) if (log.air(DT, true, 0.3)) counted++;
  check('the guard held a moment is not a grab', log.count === 0 && counted === 0);
  for (let i = 0; i < 30; i++) if (log.air(DT, true, 0.3)) counted++;
  check('...held 0.3 s it is one, counted once however long it is held', log.count === 1 && counted === 1);
  for (let i = 0; i < 30; i++) log.air(DT, false, 0.3);
  for (let i = 0; i < 30; i++) log.air(DT, true, 0.3);
  check('...and only once an air, as the controller counts it', log.count === 1);
  check('...kept as a grab', log.kinds.join(' ') === 'grab');
  log.clear();
  log.ground();
  for (let i = 0; i < 30; i++) log.air(DT, true, 0.3);
  check('a new air, after the ground: a grab again', log.count === 1);
  log.begin('flip');
  log.clear();
  check('bailed (or off the shield, or onto a rail): nothing is kept', log.count === 0);
}
{
  check(
    'the trick sounds are made: a whirl for a spin, a slap for a grab, a stab of horns for tricks landed',
    (['spinWhirl', 'grabSlap', 'trickStab'] as const).every((n) => SFX_NAMES.includes(n) && sfx(n).data.length > 0 && [...sfx(n).data].every(Number.isFinite))
  );
  check(
    'the names are not shown on the screen (the owner, 2026-11-18: "remove the trick names")',
    !fs.existsSync('src/ui/trickHud.ts')
      && !/trickHud|TrickHud/.test(fs.readFileSync('src/main.ts', 'utf8'))
  );
}
console.log(failures ? `tricks: ${failures} FAIL` : 'tricks: all pass');
if (failures) process.exitCode = 1;
