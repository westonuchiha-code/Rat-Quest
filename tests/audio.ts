// Sound: every effect renders, stays in range, is squashed to a low bit depth; loops are seamless; music is deterministic; voices are limited.
import { SFX_NAMES, sfx, instrument, RATE_HI, RATE_LO, loudness, heardFor, QUIET } from '../src/audio/synth';
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
// How loud each sound seems (its loudest fifth of a second). Nine of them were once so thin as to be lost under the
// others: the far-off clank was a twentieth of a second's tick and then silence.
{
  const loud = (n: Parameters<typeof sfx>[0]): number => loudness(sfx(n));
  const lost = SFX_NAMES.filter((n) => loud(n) < QUIET);
  check('no sound is quiet enough to be lost under the others', lost.length === 0, lost.map((n) => `${n} ${loud(n).toFixed(3)}`).join(', '));
  check('struck iron rings: the clank and the great clang can be heard for most of half a second, not a tick', heardFor(sfx('clank')) > 0.35 && heardFor(sfx('flipClang')) > 0.45, `clank ${heardFor(sfx('clank')).toFixed(2)} s, flipClang ${heardFor(sfx('flipClang')).toFixed(2)} s`);
  check('a chain is several links knocking, and falling stones a run of knocks', heardFor(sfx('chainClink')) > 0.3 && heardFor(sfx('pebbles')) > 0.5, `chain ${heardFor(sfx('chainClink')).toFixed(2)} s, pebbles ${heardFor(sfx('pebbles')).toFixed(2)} s`);
  check('a blow caught on the shield is at least as loud as one that lands', loud('block') >= loud('hit'), `block ${loud('block').toFixed(3)}, hit ${loud('hit').toFixed(3)}`);
  check('the great clang (an Ironback going over, a shield broken) is the heaviest of the metal, and a crate breaking heavier still', loud('flipClang') > loud('clank') * 1.2 && loud('flipClang') > loud('block') * 1.3 && loud('crate') > loud('flipClang'), `clang ${loud('flipClang').toFixed(3)}, clank ${loud('clank').toFixed(3)}, block ${loud('block').toFixed(3)}, crate ${loud('crate').toFixed(3)}`);
  check('the lava seethes about as loudly as a fire or a machine, no more', loud('lavaBubble') > loud('fire') * 0.9 && loud('lavaBubble') < loud('machine') * 1.3, `lava ${loud('lavaBubble').toFixed(3)}, fire ${loud('fire').toFixed(3)}, machine ${loud('machine').toFixed(3)}`);
  check('soft things stay soft: a soft step, cloth and a small thing picked up are among the quietest', (['softStep', 'cloth', 'keepsake'] as const).every((n) => loud(n) < 0.16), (['softStep', 'cloth', 'keepsake'] as const).map((n) => `${n} ${loud(n).toFixed(3)}`).join(', '));
  check('nothing was flattened into a buzz to get there', (['clank', 'flipClang', 'chainClink', 'pebbles', 'block', 'keepsake'] as const).every((n) => loud(n) < 0.3), (['clank', 'flipClang', 'chainClink', 'pebbles', 'block', 'keepsake'] as const).map((n) => `${n} ${loud(n).toFixed(3)}`).join(', '));
}
// The two great insects have voices of their own (they used to borrow the roach's screech, slowed down).
{
  const BROOD = ['broodScream', 'broodHiss', 'broodRattle', 'spikeHit', 'threadTwang', 'broodHurt', 'broodDie'] as const;
  const WYRM = ['wyrmRoar', 'wyrmHiss', 'wyrmSnap', 'wyrmRattle', 'wyrmRam', 'wyrmLash', 'wyrmCreak', 'wyrmCrunch', 'plateKnock', 'wyrmCry', 'wyrmDie'] as const;
  type Name = Parameters<typeof sfx>[0];
  const loud = (n: Name): number => loudness(sfx(n));
  const secs = (n: Name): number => sfx(n).data.length / sfx(n).rate;
  /** Where the weight of a sound's spectrum lies, in Hz: high for a thin high voice, low for a deep one. */
  const pitch = (n: Name): number => {
    const { data: d, rate } = sfx(n);
    const N = 2048;
    let num = 0;
    let den = 0;
    for (let off = 0; off + N <= d.length || off === 0; off += N) {
      const re = new Float64Array(N);
      const im = new Float64Array(N);
      for (let i = 0; i < N && off + i < d.length; i++) re[i] = d[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
      for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) [re[i], re[j]] = [re[j], re[i]];
      }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = (-2 * Math.PI) / len;
        for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
          const wr = Math.cos(ang * k);
          const wi = Math.sin(ang * k);
          const p = i + k;
          const q = p + len / 2;
          const xr = re[q] * wr - im[q] * wi;
          const xi = re[q] * wi + im[q] * wr;
          re[q] = re[p] - xr;
          im[q] = im[p] - xi;
          re[p] += xr;
          im[p] += xi;
        }
      }
      for (let k = 1; k < N / 2; k++) {
        const pw = re[k] * re[k] + im[k] * im[k];
        num += pw * ((k * rate) / N);
        den += pw;
      }
    }
    return den ? num / den : 0;
  };
  /** The level of one third of a sound (0, 1 or 2). */
  const third = (n: Name, k: number): number => {
    const d = sfx(n).data;
    const a = Math.floor((d.length * k) / 3);
    const b = Math.floor((d.length * (k + 1)) / 3);
    let q = 0;
    for (let i = a; i < b; i++) q += d[i] * d[i];
    return Math.sqrt(q / (b - a));
  };
  check('the Broodmother and the Sump Wyrm each have a set of sounds of their own, and feet', [...BROOD, ...WYRM, 'chitinTap' as const].every((n) => SFX_NAMES.includes(n)));
  check('none of them is too loud for the rest of the game', [...BROOD, ...WYRM].every((n) => loud(n) < 0.45), [...BROOD, ...WYRM].map((n) => `${n} ${loud(n).toFixed(2)}`).join(', '));
  check('her voice is high and thin, its voice is low: they cannot be mistaken for each other', pitch('broodScream') > pitch('wyrmRoar') * 3 && pitch('broodHurt') > pitch('wyrmCry') * 2 && pitch('broodDie') > pitch('wyrmDie') * 2, `scream ${pitch('broodScream').toFixed(0)} against roar ${pitch('wyrmRoar').toFixed(0)}; hurt ${pitch('broodHurt').toFixed(0)} against cry ${pitch('wyrmCry').toFixed(0)}`);
  check('the rattles that warn of an attack quicken: louder at the end than at the start', third('wyrmRattle', 2) > third('wyrmRattle', 0) * 1.5 && third('broodRattle', 2) > third('broodRattle', 0) * 1.5 && third('wyrmCreak', 2) > third('wyrmCreak', 0) * 1.5);
  check('each one\'s end is its longest sound, and runs down to almost nothing', secs('broodDie') >= Math.max(...BROOD.map(secs)) && secs('wyrmDie') >= Math.max(...WYRM.map(secs)) && third('broodDie', 2) < third('broodDie', 0) * 0.4 && third('wyrmDie', 2) < third('wyrmDie', 0) * 0.5 && third('broodDie', 2) > 0.02 && third('wyrmDie', 2) > 0.02);
  check('the Wyrm\'s head meeting a wall is the heaviest thing either of them does, heavier than an Ironback going over', WYRM.every((n) => loud('wyrmRam') >= loud(n)) && BROOD.every((n) => loud('wyrmRam') >= loud(n)) && loud('wyrmRam') > loud('flipClang'), `ram ${loud('wyrmRam').toFixed(2)}`);
  check('the wind-ups last as long as what they warn of', Math.abs(secs('wyrmRattle') - 0.85) < 0.02 && Math.abs(secs('wyrmHiss') - 0.55) < 0.02 && Math.abs(secs('wyrmCreak') - 0.65) < 0.02, `${secs('wyrmRattle').toFixed(2)}, ${secs('wyrmHiss').toFixed(2)}, ${secs('wyrmCreak').toFixed(2)}`);
  check('the thread she hangs by rings on after it is let go', heardFor(sfx('threadTwang')) > 0.4, `${heardFor(sfx('threadTwang')).toFixed(2)} s`);
  check('a hard foot on stone is a tick, quieter than a blow', heardFor(sfx('chitinTap')) < 0.06 && loud('chitinTap') < loud('hit'), `${heardFor(sfx('chitinTap')).toFixed(3)} s, ${loud('chitinTap').toFixed(3)}`);
  check('a sword on its plates is a dull knock: it does not ring as iron does, and is duller than a shield', heardFor(sfx('plateKnock')) < 0.15 && heardFor(sfx('plateKnock')) < heardFor(sfx('clank')) * 0.5 && pitch('plateKnock') < pitch('block'), `${heardFor(sfx('plateKnock')).toFixed(2)} s; ${pitch('plateKnock').toFixed(0)} against the shield's ${pitch('block').toFixed(0)}`);
  // The Stag Knight, the Orchid Mantis and the Keep Guard have voices of their own too (they borrowed the roach's, the
  // Ironback's snort and the hero's own squeaks, slowed down).
  const STAG = ['stagBellow', 'stagStep', 'hammerHum', 'hammerSlam', 'stagRattle', 'stagDie'] as const;
  const MANTIS = ['mantisHiss', 'scytheRing', 'scytheCut', 'mantisWings', 'mantisCry', 'mantisDie'] as const;
  const GUARD = ['guardBark', 'spearReady', 'guardYelp', 'guardDie'] as const;
  check('the Stag Knight, the Orchid Mantis and the Keep Guard each have a set of sounds of their own', [...STAG, ...MANTIS, ...GUARD].every((n) => SFX_NAMES.includes(n)));
  check('none of those is too loud for the rest of the game', [...STAG, ...MANTIS, ...GUARD].every((n) => loud(n) < 0.45), [...STAG, ...MANTIS, ...GUARD].map((n) => `${n} ${loud(n).toFixed(2)}`).join(', '));
  check('the mantis is the highest voice, the guard between, the stag the lowest: each cry a different creature', pitch('mantisCry') > pitch('guardYelp') * 3 && pitch('guardYelp') > pitch('stagBellow') * 3 && pitch('mantisDie') > pitch('guardDie') * 3 && pitch('guardDie') > pitch('stagDie') * 2, `cries ${pitch('mantisCry').toFixed(0)}, ${pitch('guardYelp').toFixed(0)}, ${pitch('stagBellow').toFixed(0)} Hz; ends ${pitch('mantisDie').toFixed(0)}, ${pitch('guardDie').toFixed(0)}, ${pitch('stagDie').toFixed(0)} Hz`);
  check('the guard is a rat, but his voice is lower than the hero\'s', pitch('guardBark') < pitch('ratAttack') && pitch('guardYelp') < pitch('ratHurt'), `bark ${pitch('guardBark').toFixed(0)} against ${pitch('ratAttack').toFixed(0)}; yelp ${pitch('guardYelp').toFixed(0)} against ${pitch('ratHurt').toFixed(0)}`);
  check('the tells last as long as what they warn of: the hammer going up, the wing cases, the scythe, the wings, the spear', Math.abs(secs('hammerHum') - 0.9) < 0.02 && Math.abs(secs('stagRattle') - 0.55) < 0.02 && Math.abs(secs('scytheRing') - 0.5) < 0.02 && Math.abs(secs('mantisWings') - 0.6) < 0.02 && Math.abs(secs('spearReady') - 0.5) < 0.02);
  check('the hammer\'s hum climbs and its rattle quickens: louder at the end than at the start', third('hammerHum', 2) > third('hammerHum', 0) * 1.3 && third('stagRattle', 2) > third('stagRattle', 0) * 1.5 && third('mantisWings', 2) > third('mantisWings', 0) * 1.5);
  check('the hammer landing is iron on stone: heavier than an Ironback going over, and it rings on for most of a second', loud('hammerSlam') > loud('flipClang') && heardFor(sfx('hammerSlam')) > 0.6, `${loud('hammerSlam').toFixed(2)} against ${loud('flipClang').toFixed(2)}; ${heardFor(sfx('hammerSlam')).toFixed(2)} s`);
  check('the stag\'s footfall is far heavier than an insect\'s tap', loud('stagStep') > loud('chitinTap') * 2 && pitch('stagStep') < pitch('chitinTap') * 0.5);
  check('a scythe going up rings thin and bright: higher than any iron in the game, and it hangs in the air', pitch('scytheRing') > pitch('clank') * 2 && pitch('scytheRing') > pitch('block') * 2 && heardFor(sfx('scytheRing')) > 0.35, `${pitch('scytheRing').toFixed(0)} Hz; ${heardFor(sfx('scytheRing')).toFixed(2)} s`);
  check('each one\'s end runs down to almost nothing', third('stagDie', 2) < third('stagDie', 0) * 0.5 && third('mantisDie', 2) < third('mantisDie', 0) * 0.4 && third('guardDie', 2) < third('guardDie', 0) * 0.5);
  // The Ant Pikeman: jaws, wood and a scraped chirp.
  const ANTS = ['antClick', 'pikeReady', 'antSnap', 'antHurt', 'antDie'] as const;
  check('the Ant Pikeman has a set of sounds of its own, none too loud for the rest of the game', ANTS.every((n) => SFX_NAMES.includes(n) && loud(n) < 0.45), ANTS.map((n) => `${n} ${loud(n).toFixed(2)}`).join(', '));
  check('its pike is wood where the guard\'s spear is steel: drawn back it is much the duller sound, and lasts as long as the wind-up it warns of, growing as it goes', pitch('pikeReady') < pitch('spearReady') * 0.7 && Math.abs(secs('pikeReady') - 0.55) < 0.02 && third('pikeReady', 2) > third('pikeReady', 0) * 1.2, `pike ${pitch('pikeReady').toFixed(0)} against spear ${pitch('spearReady').toFixed(0)}; ${secs('pikeReady').toFixed(2)} s; thirds ${third('pikeReady', 0).toFixed(3)} to ${third('pikeReady', 2).toFixed(3)}`);
  check('its jaws clacking are low and dry: far below the mantis\'s trill and the roach\'s screech', pitch('antClick') < pitch('mantisHiss') * 0.5 && pitch('antClick') < pitch('roachScreech') * 0.5, `${pitch('antClick').toFixed(0)} against ${pitch('mantisHiss').toFixed(0)} and ${pitch('roachScreech').toFixed(0)}`);
  check('its bite is a short hard clack, lower than the Wyrm\'s fangs', heardFor(sfx('antSnap')) < 0.2 && pitch('antSnap') < pitch('wyrmSnap') * 0.85, `${heardFor(sfx('antSnap')).toFixed(2)} s; ${pitch('antSnap').toFixed(0)} against ${pitch('wyrmSnap').toFixed(0)}`);
  check('its cry is not the guard\'s yelp or the hornet\'s buzz: it sits between them', pitch('antHurt') > pitch('guardYelp') * 1.1 && pitch('antHurt') < pitch('hornetHurt') * 0.9, `${pitch('guardYelp').toFixed(0)} < ${pitch('antHurt').toFixed(0)} < ${pitch('hornetHurt').toFixed(0)}`);
  check('its end is its longest sound, and runs down', secs('antDie') >= Math.max(...ANTS.map(secs)) && third('antDie', 2) < third('antDie', 0) * 0.6, `${third('antDie', 0).toFixed(3)} to ${third('antDie', 2).toFixed(3)}`);
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
