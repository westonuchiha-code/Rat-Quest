// Sound: every effect renders, stays in range, is squashed to a low bit depth; loops are seamless; music is deterministic; voices are limited.
import { SFX_NAMES, sfx, instrument, RATE_HI, RATE_LO } from '../src/audio/synth';
import { TRACK_NAMES, trackNamed, notesBetween, stepSeconds } from '../src/audio/music';
import { VoicePool } from '../src/audio/voices';
import { CRUMB_STREAK, VARY, playRate } from '../src/audio/audio';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

for (const n of SFX_NAMES) {
  const s = sfx(n);
  let peak = 0;
  let nan = false;
  const levels = new Set<number>();
  for (const v of s.data) {
    if (!Number.isFinite(v)) nan = true;
    peak = Math.max(peak, Math.abs(v));
    levels.add(Math.round(v * 1e4));
  }
  check(`sfx ${n}: sound, in range, crushed`, s.data.length > 100 && !nan && peak > 0.05 && peak <= 1.0001 && levels.size <= 257 && (s.rate === RATE_HI || s.rate === RATE_LO), `peak ${peak.toFixed(2)}, ${levels.size} levels, ${s.rate} Hz`);
  if (s.loop) {
    let avg = 0;
    for (let i = 1; i < s.data.length; i++) avg += Math.abs(s.data[i] - s.data[i - 1]);
    avg /= s.data.length - 1;
    const jump = Math.abs(s.data[0] - s.data[s.data.length - 1]);
    check(`sfx ${n}: loop has no click`, jump < avg * 6 + 0.05, `seam ${jump.toFixed(3)}, usual step ${avg.toFixed(3)}`);
  }
}
{
  const streak = { n: 0, at: -1e9 };
  const a = playRate('crumb', 0, streak);
  const b = playRate('crumb', 300, streak);
  const c2 = playRate('crumb', 600, streak);
  const later = playRate('crumb', 600 + CRUMB_STREAK.window + 1, streak);
  check('crumbs in a run climb in pitch and start again after a pause', a === 1 && b > a && c2 > b && later === 1);
  let top = 0;
  for (let i = 0; i < 20; i++) top = playRate('crumb', 700 + CRUMB_STREAK.window + i * 100, streak);
  check('the run tops out at an octave', Math.abs(top - 2) < 1e-9);
  check('everyday sounds vary a little, others not at all', playRate('hit', 0, streak, 0) < 1 && playRate('hit', 0, streak, 1) > 1 && Math.abs(playRate('hit', 0, streak, 1) - 1) <= (VARY.hit ?? 0) + 1e-9 && playRate('doorOpen', 0, streak, 1) === 1);
}
check('the story has its own sounds', (['memoryIn', 'memoryOut', 'cloth', 'keepsake', 'recall', 'whoosh', 'softStep'] as const).every((n) => SFX_NAMES.includes(n)));
check('the same effect is the same every time', sfx('ratJump') === sfx('ratJump'));
check('voices exist for the rat and the roach', SFX_NAMES.includes('ratJump') && SFX_NAMES.includes('ratHurt') && SFX_NAMES.includes('roachScreech'));
check('rat voices differ from each other', sfx('ratJump').data.length !== sfx('ratDie').data.length || sfx('ratJump').data[40] !== sfx('ratJump2').data[40]);

for (const n of ['bass', 'pad', 'lead', 'bell'] as const) {
  const s = instrument(n);
  check(`instrument ${n}: one looping cycle`, s.loop && s.data.length === 64);
}
for (const n of ['hat', 'kick', 'snare'] as const) check(`instrument ${n}: one shot`, !instrument(n).loop && instrument(n).data.length > 100);

for (const n of TRACK_NAMES) {
  const t = trackNamed(n);
  const a = notesBetween(t, 0, 128);
  const b = notesBetween(t, 0, 128);
  check(`track ${n}: has notes, same every time`, a.length > 20 && JSON.stringify(a) === JSON.stringify(b), `${a.length} notes`);
  check(`track ${n}: notes in a sensible range`, a.filter((e) => trackNamed(n).lanes[e.lane].inst !== 'hat' && trackNamed(n).lanes[e.lane].inst !== 'kick' && trackNamed(n).lanes[e.lane].inst !== 'snare').every((e) => e.note.midi >= 24 && e.note.midi <= 100 && e.note.vel > 0 && e.note.vel <= 1));
  const wrap = notesBetween(t, 128, 256);
  check(`track ${n}: loops`, wrap.length === a.length);
  check(`track ${n}: tempo`, stepSeconds(t) > 0.1 && stepSeconds(t) < 0.5);
}

const pool = new VoicePool(4);
const ids = [1, 2, 3, 4].map((i) => pool.take(0, 10, i));
check('pool fills to its limit', pool.count === 4 && ids.every((x) => x.id > 0 && x.cut === null));
const more = pool.take(0.1, 1, 9);
check('a more important sound takes a voice from the least important', more.id > 0 && more.cut === ids[0].id && pool.count === 4);
check('a less important sound is refused when full', pool.take(0.2, 1, 0).id === 0);
check('finished sounds free their voices', (pool.prune(100), pool.count === 0));

if (failures) {
  console.log(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('\nAll audio checks passed.');
