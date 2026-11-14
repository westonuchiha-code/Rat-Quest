// Gibberish voices: letters map to syllables, every voice makes sound, the villain bank is recorded and speaks.
import { SYLLABLES, syllableFor, syllableSample, speak, VOICES, hasRecordedVoice, syllableStarts, wordAt, sentenceAt } from '../src/audio/speech';
import type { NpcKind } from '../src/npc/npc';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

check('words: short is one syllable, long has several', syllableStarts(0, 2).length === 1 && syllableStarts(0, 9).length === 3);
check('word and sentence lookup', wordAt('Hi there.', 5)?.[0] === 3 && sentenceAt('Hi? Yes.', 1).end === '?' && sentenceAt('Hi? Yes.', 5).end === '.');
{
  const a: string[] = [];
  const b: string[] = [];
  const pa = { playSample: (k: string) => a.push(k) };
  const pb = { playSample: (k: string) => b.push(k) };
  const L1 = 'Kingdom of rats. Kingdom!';
  for (let i = 0; i < L1.length; i++) speak(pa, 'villain', L1[i], i, L1, i, () => 0.5);
  for (let i = 0; i < L1.length; i++) speak(pb, 'villain', L1[i], i, L1, i, () => 0.5);
  check('same word, same syllables', a.length > 3 && a.join() === b.join() && a[0] === a[a.findIndex((k, n) => n > 2 && k === a[0])]);
}
check('27 syllables', SYLLABLES.length === 27);
check('same letter, same syllable', syllableFor('a') === syllableFor('A') && !!syllableFor('a'));
check('spaces are silent', !syllableFor(' '));
for (const k of ['mouse', 'bird', 'villain'] as NpcKind[]) {
  const played: string[] = [];
  const pl = { playSample: (key: string, s: { data: Float32Array }) => { played.push(key); if (!s.data.length || !s.data.some((v) => v !== 0)) played.push('SILENT'); } };
  const L = 'Heh heh, a rat in my kingdom? Squeak!';
  for (let i = 0; i < L.length; i++) speak(pl, k, L[i], i, L, i);
  check(`${k} speaks`, played.length > 6 && !played.includes('SILENT'), `${played.length} syllables`);
  check(`${k} has a voice def`, !!VOICES[k]);
}
check('villain bank is recorded', hasRecordedVoice(VOICES.villain.bank));
for (const syl of SYLLABLES) {
  const s = syllableSample('villain', syl, VOICES.villain.standIn);
  if (!s.data.length || !s.data.every(Number.isFinite)) check(`villain ${syl}`, false);
}
check('every villain syllable renders', true);
if (failures) { console.log(`${failures} FAILED`); process.exit(1); }
