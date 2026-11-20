/**
 * Gibberish voices, like the old 3D platformers: every letter of a line plays one short syllable, pitched up or down
 * for the character who is talking. The syllables come from recordings (recordings/voices.json, made by
 * scripts/make-recorded.py), squashed to a low rate and bit depth. Until a recording exists for a voice, a made-up
 * stand-in is used, so the game always has something to say.
 */
import { RECORDED } from './recorded';
import { decodeRecorded, Sample } from './synth';
import type { NpcKind } from '../npc/npc';
import { droppedSyllable, hasDroppedVoice } from '../assets/drop';

/** The sounds recorded for each voice, in the order they are said in the recording. */
export const SYLLABLES = [
  'ah', 'eh', 'ee', 'oh', 'oo',
  'ba', 'ka', 'da', 'fa', 'ga', 'ha', 'ja', 'la', 'ma', 'na', 'pa', 'ra', 'sa', 'sha', 'cha', 'ta', 'wa', 'ya', 'za',
  'eek', 'hup', 'heh',
] as const;
export type Syllable = (typeof SYLLABLES)[number];

/** Which recording a character is made from, and how it is played. */
export interface VoiceDef {
  /** The recorded voice (a name in recordings/voices.json). */
  bank: string;
  /** Speed of playback: above 1 is higher and quicker. */
  pitch: number;
  /** A little random wobble in pitch, 0..1. */
  wobble: number;
  vol: number;
  /** The stand-in voice's base pitch in Hz, used only when there is no recording. */
  standIn: number;
}

export const VOICES: Record<NpcKind, VoiceDef> = {
  mouse: { bank: 'mort', pitch: 1.3, wobble: 0.1, vol: 0.55, standIn: 170 },
  bird: { bank: 'wren', pitch: 1.4, wobble: 0.12, vol: 0.6, standIn: 280 },
  pigeon: { bank: 'pigeon', pitch: 1.0, wobble: 0.04, vol: 0.7, standIn: 220 },
  villain: { bank: 'villain', pitch: 0.8, wobble: 0.1, vol: 0.6, standIn: 85 },
  // The Club's regulars have no recordings of their own yet: each borrows one of the four, at a pitch of his own.
  turtle: { bank: 'pigeon', pitch: 0.72, wobble: 0.03, vol: 0.65, standIn: 120 },
  fox: { bank: 'wren', pitch: 0.92, wobble: 0.14, vol: 0.6, standIn: 200 },
  ant: { bank: 'villain', pitch: 1.3, wobble: 0.05, vol: 0.5, standIn: 150 },
  stag: { bank: 'villain', pitch: 0.62, wobble: 0.03, vol: 0.7, standIn: 70 },
  ferret: { bank: 'mort', pitch: 1.65, wobble: 0.18, vol: 0.5, standIn: 240 },
  owl: { bank: 'pigeon', pitch: 0.86, wobble: 0.02, vol: 0.65, standIn: 140 },
  rat: { bank: 'wren', pitch: 1.08, wobble: 0.06, vol: 0.6, standIn: 230 },
  // The newcomers (2026-11-20): a mole, slow and low and mumbled; a hedgehog, quick and bright.
  mole: { bank: 'mort', pitch: 0.78, wobble: 0.08, vol: 0.55, standIn: 110 },
  hedgehog: { bank: 'wren', pitch: 1.25, wobble: 0.1, vol: 0.55, standIn: 260 },
};

/**
 * The voice a kind of character speaks with: its own line in VOICES; or, if a VOICE FILE was dropped in for it
 * (assets/voices/, assets/README.md), that recording, at its own pitch (it was made for this kind: it is not pitched
 * up or down to pass for one), with the line's wobble and loudness. Its bank is `@` and the kind.
 */
export function voiceOf(kind: NpcKind, has: (k: string) => boolean = hasDroppedVoice): VoiceDef {
  const v = VOICES[kind] ?? VOICES.mouse;
  return has(kind) ? { ...v, bank: `@${kind}`, pitch: 1 } : v;
}

const LETTER: Record<string, Syllable> = {
  a: 'ah', e: 'eh', i: 'ee', o: 'oh', u: 'oo',
  b: 'ba', c: 'ka', d: 'da', f: 'fa', g: 'ga', h: 'ha', j: 'ja', k: 'ka', l: 'la', m: 'ma', n: 'na', p: 'pa', q: 'ka',
  r: 'ra', s: 'sa', t: 'ta', v: 'fa', w: 'wa', x: 'sa', y: 'ya', z: 'za',
};

/** Which syllable a typed character says, or null for none (spaces and most marks stay silent). */
export function syllableFor(ch: string): Syllable | null {
  const c = ch.toLowerCase();
  if (LETTER[c]) return LETTER[c];
  if (c === '!') return 'hup';
  if (c === '?') return 'eek';
  return null;
}

const VOWEL: Record<string, [number, number]> = { a: [800, 1200], e: [560, 1900], i: [300, 2300], o: [500, 900], u: [330, 800] };

/** A made-up syllable: a buzz shaped by two vowel resonances, with a puff of noise in front for a consonant. */
function standIn(syl: Syllable, f0: number): Sample {
  const rate = 11025;
  const n = Math.floor(rate * 0.12);
  const d = new Float32Array(n);
  const vowel = VOWEL[syl === 'eek' ? 'i' : syl === 'hup' ? 'u' : syl === 'heh' ? 'e' : syl[syl.length - 1]] ?? VOWEL.a;
  const harmonics = Math.max(2, Math.min(24, Math.floor(3500 / f0)));
  let seed = 7;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const consonant = syl.length > 2 || (syl.length === 2 && !'aeiou'.includes(syl[0]));
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let v = 0;
    for (let k = 1; k <= harmonics; k++) {
      const hz = k * f0;
      const a = Math.exp(-(((hz - vowel[0]) / 180) ** 2)) + 0.7 * Math.exp(-(((hz - vowel[1]) / 300) ** 2)) + 0.05 / k;
      v += a * Math.sin(2 * Math.PI * hz * t);
    }
    v /= 3;
    const env = Math.min(1, t / 0.008) * Math.max(0, 1 - t / 0.12) ** 0.8;
    let out = v * env;
    if (consonant && t < 0.025) out += (rnd() * 2 - 1) * 0.5 * (1 - t / 0.025);
    d[i] = Math.round(Math.max(-1, Math.min(1, out)) * 31) / 31;
  }
  return { data: d, rate, loop: false };
}

const cache = new Map<string, Sample>();

/** The recorded syllable for a voice, or a stand-in if that voice has not been recorded yet. */
export function syllableSample(bank: string, syl: Syllable, f0: number): Sample {
  const key = `${bank}:${syl}`;
  let s = cache.get(key);
  if (!s) {
    const dropped = bank.startsWith('@') ? droppedSyllable(bank.slice(1), syl) : null;
    const rec = RECORDED[`voice_${bank}_${syl}`];
    s = dropped ? { ...dropped, loop: false } : rec ? decodeRecorded(rec) : standIn(syl, f0);
    cache.set(key, s);
  }
  return s;
}

/** True if this voice has real recordings. */
export const hasRecordedVoice = (bank: string): boolean => (bank.startsWith('@') && hasDroppedVoice(bank.slice(1))) || SYLLABLES.some((s) => !!RECORDED[`voice_${bank}_${s}`]);

/** Something that can play a sample (the audio engine). */
export interface SamplePlayer {
  playSample(key: string, s: Sample, o?: { vol?: number; rate?: number; verb?: number; priority?: number; slot?: string }): void;
}

/** One bar of sixteenths: K kick, S snare, h hat, k a softer low ghost note. */
const GROOVE = 'KhhhShkhKhKhShkh';

/** Slices of the beatbox bank by brightness: low thumps, middle snaps, bright ticks. */
function grooveSyllable(slot: string, ch: string): Syllable {
  const pick = (from: number, to: number): Syllable => SYLLABLES[from + (ch.toLowerCase().charCodeAt(0) % (to - from))];
  return slot === 'K' ? pick(0, 8) : slot === 'k' ? pick(2, 9) : slot === 'S' ? pick(9, 18) : pick(18, 27);
}

/** A small stable number from a word, so the same word always gets the same syllables (it sounds like a language). */
function hashWord(w: string): number {
  let h = 2166136261;
  for (let i = 0; i < w.length; i++) h = Math.imul(h ^ w.charCodeAt(i), 16777619);
  return (h >>> 0) % 100003;
}

const isLetter = (c: string | undefined): boolean => !!c && /[a-z']/i.test(c);

/** The word around position idx, as [start, end). */
export function wordAt(line: string, idx: number): [number, number] | null {
  if (!isLetter(line[idx])) return null;
  let a = idx;
  let b = idx + 1;
  while (a > 0 && isLetter(line[a - 1])) a--;
  while (b < line.length && isLetter(line[b])) b++;
  return [a, b];
}

/** Where the syllables of a word start: one for a short word, up to three for a long one. */
export function syllableStarts(a: number, b: number): number[] {
  const len = b - a;
  const n = Math.max(1, Math.min(3, Math.round(len / 3.2)));
  return Array.from({ length: n }, (_, j) => a + Math.floor((j * len) / n));
}

/** How far through its sentence a position is (0..1), and how that sentence ends. */
export function sentenceAt(line: string, idx: number): { p: number; end: '.' | '?' | '!' } {
  let a = idx;
  while (a > 0 && !/[.!?]/.test(line[a - 1])) a--;
  let b = idx;
  while (b < line.length && !/[.!?]/.test(line[b])) b++;
  const end = (line[b] as '.' | '?' | '!' | undefined) ?? '.';
  return { p: b > a ? (idx - a) / (b - a) : 0, end };
}

/**
 * Says what is being typed. Each word gets one to three syllables, always the same ones for the same word, started on
 * the word's own letters; the voice falls through a sentence, climbs for a question, and stresses the start of long words.
 * It returns true when a syllable played (so the speaker's mouth can move).
 */
export function speak(player: SamplePlayer, kind: NpcKind, ch: string, step = 0, line = ch, idx = 0, roll: () => number = Math.random): boolean {
  if (kind === 'pigeon') {
    // Words are rests and hits on a sixteenth grid: a kick on the one, a snare on the three, hats in between.
    if (!/[a-z!?]/i.test(ch)) return false;
    const slot = GROOVE[step % 16];
    if (slot === '.') return false;
    const syl = grooveSyllable(slot, ch);
    const v = voiceOf('pigeon');
    const accent = slot === 'K' || slot === 'S' ? 1 : slot === 'k' ? 0.7 : 0.5;
    player.playSample(`voice:${v.bank}:${syl}`, syllableSample(v.bank, syl, v.standIn), { vol: v.vol * accent, rate: v.pitch * (1 + (roll() * 2 - 1) * v.wobble), verb: 0.1, priority: 3 });
    return true;
  }
  const w = wordAt(line, idx);
  if (!w) return false;
  const starts = syllableStarts(w[0], w[1]);
  const j = starts.indexOf(idx);
  if (j < 0) return false;
  const word = line.slice(w[0], w[1]).toLowerCase();
  const syl = SYLLABLES[(hashWord(word) + j * 11) % SYLLABLES.length];
  const v = voiceOf(kind);
  const sent = sentenceAt(line, idx);
  const lastWord = !/[a-z]/i.test(line.slice(w[1], line.indexOf(sent.end, w[1]) < 0 ? line.length : line.indexOf(sent.end, w[1])));
  const lastSyl = j === starts.length - 1;
  // Pitch: falls gently through a statement, climbs through a question, a bump on the stressed start of a long word.
  let contour = sent.end === '?' ? 0.92 + 0.22 * sent.p : 1.06 - 0.14 * sent.p;
  if (lastWord && lastSyl && sent.end !== '?') contour *= 0.93;
  if (j === 0 && w[1] - w[0] >= 4) contour *= 1.05;
  const short = w[1] - w[0] <= 2;
  const vol = v.vol * (short ? 0.7 : j === 0 ? 1 : 0.85) * (sent.end === '!' ? 1.15 : 1) * (lastWord && lastSyl ? 0.85 : 1);
  const wob = 1 + (roll() * 2 - 1) * v.wobble * 0.6;
  player.playSample(`voice:${v.bank}:${syl}`, syllableSample(v.bank, syl, v.standIn), { vol: Math.min(1, vol), rate: v.pitch * contour * wob, verb: 0.15, priority: 3, slot: `talk:${kind}` });
  return true;
}
