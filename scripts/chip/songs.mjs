// The tunes: written here as bars of notes and chords, turned into songs for the Chiptune Pad Studio (melody, bass,
// chords: its consoles' own voices) and beats for the Chip Drum Pad (its consoles' own kits), and rendered by the two
// tools themselves (make.mjs). Nobody has HEARD these who wrote them: they are written by the rules (a chord to a bar,
// the tune on the chord's notes at the strong beats and stepping between, a phrase answered by a phrase).
//
// A bar is sixteen sixteenths. A LINE is notes as 'E5:2' (two sixteenths long) and rests as '-:4'.
// A BASS pattern is a letter a sixteenth: r the chord's root, R the root an octave up, f its fifth, t its third,
// - hold, . rest. An ARP pattern is a digit a sixteenth: which of the chord's notes, counting up from its root.
// A STAB rhythm is x where the chord is struck. A drum bar is the Drum Pad's own: x a full hit, o a soft one.

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6], 5: [0, 7] };
export const midi = (name) => {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  return 12 * (Number(m[2]) + 1) + PC[m[1]];
};
export const chord = (name) => {
  const m = /^([A-G][#b]?)(.*)$/.exec(name);
  if (!m || !(m[2] in QUAL)) throw new Error(`not a chord: ${name}`);
  return { root: PC[m[1]], tones: QUAL[m[2]] };
};

export const SONGS = [
  {
    id: 'club', name: "Dave's Groove", where: 'The Club', bpm: 104,
    chords: ['Em7', 'A7', 'Em7', 'A7', 'Cmaj7', 'D7', 'Em7', 'B7'],
    parts: [
      { type: 'line', con: 'gen', v: 'brass', vol: 0.95, gate: 0.85, bars: [
        'E5:3 G5:1 A5:2 B5:2 -:2 D6:2 B5:2 A5:2', 'G5:3 A5:1 E5:4 -:4 E5:2 G5:2', 'A5:3 B5:1 D6:2 E6:2 -:2 D6:2 B5:2 G5:2', 'A5:6 -:2 E5:2 G5:2 A5:2 B5:2',
        'C6:3 B5:1 G5:4 -:2 E5:2 G5:2 B5:2', 'A5:3 F#5:1 D5:4 -:2 F#5:2 A5:2 C6:2', 'B5:2 -:1 B5:1 D6:2 E6:4 -:2 D6:2 B5:2', 'A5:2 F#5:2 D#5:4 -:2 B4:2 D#5:2 F#5:2',
      ] },
      { type: 'bass', con: 'gen', v: 'fmbass', vol: 1, oct: 2, pat: 'r..R.r..r.R..rf.' },
      { type: 'stab', con: 'gen', v: 'epiano', vol: 0.5, oct: 4, rhythm: '..x...x...x..x..', len: 2 },
    ],
    drums: { con: 'gen', swing: 0.15, order: 'AAABAAAB', pats: {
      A: { kick: 'x..x..x...x.x...', snare: '....x.......x...', clap: '....x.......x...', chh: 'x.xox.xox.xox.xo', ohh: '..............x.' },
      B: { kick: 'x..x..x...x.....', snare: '....x.......x.xx', chh: 'x.xox.xox.xo....', thi: '..........x.....', tmid: '...........x....', tlo: '.............x..' },
    } },
  },
  {
    id: 'cistern', name: 'Still Water', where: 'The Great Cistern', bpm: 76,
    chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'],
    parts: [
      { type: 'line', con: 'snes', v: 'flute', vol: 0.95, gate: 0.95, bars: [
        'D5:4 F5:4 A5:6 G5:2', 'F5:8 D5:4 F5:4', 'A5:4 C6:4 A5:6 G5:2', 'G5:8 E5:4 -:4',
        'D5:4 F5:4 A5:4 D6:4', 'D6:6 C6:2 Bb5:4 A5:4', 'G5:4 Bb5:4 A5:4 G5:4', 'E5:8 C#5:4 -:4',
      ] },
      { type: 'pad', con: 'snes', v: 'strings', vol: 0.42, oct: 4 },
      { type: 'arp', con: 'snes', v: 'piano', vol: 0.55, oct: 4, pat: '0.1.2.1.3.2.1.2.' },
      { type: 'bass', con: 'snes', v: 'bass', vol: 0.9, oct: 2, pat: 'r.......r...f...' },
    ],
    drums: { con: 'snes', swing: 0, order: 'AAABAAAB', pats: {
      A: { kick: 'x.........x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.' },
      B: { kick: 'x.........x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.o.o...', ohh: '..............x.' },
    } },
  },
  {
    id: 'foundry', name: 'Hammer and Bellows', where: 'The Foundry', bpm: 132,
    chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
    parts: [
      { type: 'line', con: 'c64', v: 'sync', vol: 0.9, gate: 0.8, bars: [
        'A4:2 C5:2 E5:2 A5:2 G5:2 E5:2 C5:2 E5:2', 'A4:2 C5:2 E5:2 A5:4 -:2 E5:2 G5:2', 'F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:4', 'B5:2 G5:2 D5:2 G5:2 B5:2 D6:4 -:2',
        'E6:4 C6:2 A5:2 E6:4 C6:2 A5:2', 'E6:2 D6:2 C6:2 B5:2 A5:4 -:4', 'F5:2 A5:2 C6:4 A5:2 C6:2 F6:4', 'E6:4 G#5:2 B5:2 E5:4 G#5:2 B5:2',
      ] },
      { type: 'bass', con: 'c64', v: 'fbass', vol: 1, oct: 2, pat: 'r.r.R.r.r.r.R.r.' },
      { type: 'chip', con: 'c64', v: 'arp', vol: 0.4, oct: 4 },
    ],
    drums: { con: 'c64', swing: 0, order: 'ZAABAAAB', pats: {
      Z: { kick: 'x...x...x...x...', ohh: '..x...x...x...x.', clap: '....x.......x...', zap: 'x...............' },
      A: { kick: 'x...x...x...x...', ohh: '..x...x...x...x.', clap: '....x.......x...' },
      B: { kick: 'x...x...x...x...', ohh: '..x...x.........', clap: '....x...........', thi: '........x.x.....', tmid: '...........x.x..', tlo: '..............xx' },
    } },
  },
  {
    id: 'hollows', name: 'No Bottom', where: 'The Hollows', bpm: 68,
    chords: ['Em', 'Em', 'C', 'D', 'Em', 'Bm', 'C', 'B'],
    parts: [
      { type: 'line', con: 'n64', v: 'ocarina', vol: 0.95, gate: 0.95, bars: [
        '-:4 B5:4 G5:4 E5:4', 'F#5:6 G5:2 E5:8', '-:4 C6:4 G5:4 E5:4', 'F#5:6 A5:2 D5:8',
        '-:4 B5:4 E6:6 D6:2', 'B5:8 F#5:4 D5:4', 'E5:4 G5:4 C6:6 B5:2', 'F#5:8 D#5:4 -:4',
      ] },
      { type: 'pad', con: 'n64', v: 'choir', vol: 0.38, oct: 4 },
      { type: 'arp', con: 'n64', v: 'marimba', vol: 0.5, oct: 4, pat: '0.2.1.2.0.2.1.3.' },
      { type: 'bass', con: 'n64', v: 'bass', vol: 0.9, oct: 2, pat: 'r.........r.f...' },
    ],
    drums: { con: 'n64', swing: 0, order: 'ZAAAAAAA', pats: {
      Z: { tlo: 'x.........x.....', rim: '......x.......x.', ride: 'o...o...o...o...', boom: 'x...............' },
      A: { tlo: 'x.........x.....', rim: '......x.......x.', ride: 'o...o...o...o...' },
    } },
  },
  {
    id: 'keep', name: 'The Long Stair', where: "Grimsqueak's Keep", bpm: 96,
    chords: ['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Fm', 'Ab', 'G'],
    parts: [
      { type: 'line', con: 'ps1', v: 'brass', vol: 0.95, gate: 0.9, bars: [
        'C5:3 C5:1 Eb5:4 G5:6 Eb5:2', 'Ab5:3 G5:1 Eb5:4 C5:8', 'D5:3 D5:1 F5:4 Bb5:6 F5:2', 'G5:3 F5:1 D5:4 B4:4 D5:4',
        'C5:3 C5:1 Eb5:4 G5:4 C6:4', 'Ab5:3 G5:1 F5:4 Ab5:4 C6:4', 'Eb6:6 C6:2 Ab5:4 C6:4', 'D6:4 B5:4 G5:8',
      ] },
      { type: 'pad', con: 'ps1', v: 'strings', vol: 0.45, oct: 4 },
      { type: 'bass', con: 'ps1', v: 'bass', vol: 0.95, oct: 2, pat: 'r...f...r...f...' },
      { type: 'hit', con: 'ps1', v: 'hit', vol: 0.6, oct: 4, bars: [0, 4] },
    ],
    drums: { con: 'ps1', swing: 0, order: 'ZAABAAAB', pats: {
      Z: { kick: 'x.......x.......', snare: 'o.oox.ooo.oox.oo', crash: 'x...............' },
      A: { kick: 'x.......x.......', snare: 'o.oox.ooo.oox.oo' },
      B: { kick: 'x.......x.......', snare: 'o.oox.ooo.ooxxxx', tlo: '..............x.' },
    } },
  },
  {
    id: 'dream', name: 'Star Slide', where: 'The Milky Way', bpm: 140,
    chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
    parts: [
      { type: 'line', con: 'gbc', v: 'echo', vol: 0.95, gate: 0.85, bars: [
        'E5:2 G5:2 C6:4 B5:2 C6:2 G5:4', 'D5:2 G5:2 B5:4 A5:2 B5:2 G5:4', 'C5:2 E5:2 A5:4 G5:2 A5:2 E5:4', 'F5:2 A5:2 C6:4 A5:2 F5:2 G5:4',
        'E6:4 D6:2 C6:2 G5:4 C6:4', 'D6:4 C6:2 B5:2 G5:4 B5:4', 'C6:2 A5:2 F5:2 A5:2 C6:2 F6:2 E6:2 D6:2', 'D6:6 B5:2 G5:4 B5:2 D6:2',
      ] },
      { type: 'bass', con: 'gbc', v: 'wsaw', vol: 0.9, oct: 2, pat: 'r.R.r.R.r.R.r.R.' },
      { type: 'chip', con: 'gbc', v: 'arp', vol: 0.36, oct: 5 },
      { type: 'arp', con: 'gbc', v: 'bell', vol: 0.4, oct: 6, pat: '..2...1...2...0.' },
    ],
    drums: { con: 'gbc', swing: 0, order: 'AAABAAAB', pats: {
      A: { kick: 'x.....x.x.....x.', snare: '....o.......o...', chh: 'xoxoxoxoxoxoxoxo' },
      B: { kick: 'x.....x.x.....x.', snare: '....o.......oxox', chh: 'xoxoxoxoxoxo....' },
    } },
  },
  {
    id: 'boss', name: 'Teeth', where: 'A boss', bpm: 152,
    chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'],
    parts: [
      { type: 'line', con: 'x68', v: 'lead', vol: 0.95, gate: 0.8, bars: [
        'D5:2 F5:2 A5:2 D6:2 C#6:2 D6:2 A5:4', 'F6:4 E6:2 D6:2 C#6:2 D6:2 A5:4', 'Bb5:2 D6:2 F6:2 D6:2 Bb5:2 D6:2 F6:4', 'E6:2 C#6:2 A5:2 C#6:2 E6:2 G6:2 E6:4',
        'D6:4 A5:2 F5:2 D6:4 A5:2 F5:2', 'E6:4 C6:2 G5:2 E6:4 C6:2 G5:2', 'F6:2 D6:2 Bb5:2 D6:2 F6:2 Bb6:2 A6:2 G6:2', 'A6:4 E6:4 C#6:4 A5:4',
      ] },
      { type: 'bass', con: 'x68', v: 'fmbass', vol: 1, oct: 2, pat: 'r.rrr.rrr.rrr.rr' },
      { type: 'stab', con: 'x68', v: 'brass', vol: 0.5, oct: 4, rhythm: 'x..x..x...x..x..', len: 2 },
    ],
    drums: { con: 'x68', swing: 0, order: 'ZAABZAAB', pats: {
      Z: { kick: 'x.x...x.x.x...x.', snare: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
      A: { kick: 'x.x...x.x.x...x.', snare: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.' },
      B: { kick: 'x.x...x.x.......', snare: '....x.....x.xxxx', chh: 'x.x.x.x.........', thi: '........x.......', tlo: '.........x......' },
    } },
  },
  {
    id: 'title', name: 'The Kingdom Below', where: 'The title', bpm: 120,
    chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D7'],
    parts: [
      { type: 'line', con: 'nes', v: 'p25', vol: 0.95, gate: 0.9, bars: [
        'D5:4 G5:4 B5:6 A5:2', 'A5:4 F#5:4 D5:8', 'E5:4 G5:4 B5:6 A5:2', 'G5:4 E5:4 C5:4 E5:2 G5:2',
        'D6:6 B5:2 G5:4 B5:4', 'A5:6 F#5:2 D5:4 F#5:4', 'E5:2 G5:2 C6:4 B5:2 A5:2 G5:4', 'F#5:4 A5:4 D6:4 C6:2 A5:2',
      ] },
      { type: 'arp', con: 'nes', v: 'p50', vol: 0.4, oct: 4, pat: '0.1.2.1.0.1.2.1.', len: 2 },
      { type: 'bass', con: 'nes', v: 'tri', vol: 1, oct: 3, pat: 'r...r.f.r...f.r.' },
    ],
    drums: { con: 'nes', swing: 0, order: 'AAABAAAB', pats: {
      A: { kick: 'x.....x.x.......', snare: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.' },
      B: { kick: 'x.....x.x.......', snare: '....x.......x.xx', chh: 'x.x.x.x.x.x.x...' },
    } },
  },
];

/**
 * BOOM BAP, WITH DIZZY DAVE'S OWN VOICE (the owner, 2026-11-17: "at least one or two sample like hip hop or boom bap
 * style tracks while also sampling in the voice track of dizzy Dave trying to match the beats"). Slow, swung, a kick
 * that comes late, a snare on two and four, soft keys and a lazy horn; and Dave's recording (recordings/pigeon.m4a:
 * thirty-five mouth sounds) cut into its sounds and put ON THE BEAT (make.mjs, `dave`): k one of his low thumps, s
 * one of his snaps, h one of his ticks, a letter a sixteenth, swung as the drums are. A drum `order` may begin with
 * '-' for bars with no drums in them.
 */
SONGS.push(
  {
    // (86 to the minute: the Club's own tempo, so that it lies under the scene DIZZY DAVE, LIVE beat for beat.)
    id: 'bap1', name: 'Pigeon Bap', where: 'Dizzy Dave', bpm: 86,
    chords: ['Am7', 'Dm7', 'Fmaj7', 'E7', 'Am7', 'Dm7', 'Fmaj7', 'E7'],
    parts: [
      { type: 'line', con: 'n64', v: 'trumpet', vol: 0.7, gate: 0.9, bars: [
        '-:4 E5:2 G5:2 A5:4 G5:2 E5:2', 'F5:6 D5:2 -:4 A4:2 C5:2', '-:4 A5:2 C6:2 E6:4 C6:2 A5:2', 'G#5:6 E5:2 -:8',
        '-:4 E5:2 G5:2 A5:4 C6:2 A5:2', 'F5:6 A5:2 -:4 D5:2 F5:2', 'E6:4 C6:2 A5:2 G5:4 E5:4', 'D5:4 B4:4 -:8',
      ] },
      { type: 'stab', con: 'x68', v: 'epiano', vol: 0.55, oct: 4, rhythm: 'x.....x.....x...', len: 5 },
      { type: 'bass', con: 'n64', v: 'bass', vol: 1, oct: 2, pat: 'r......r..r...f.' },
    ],
    drums: { con: 'oki', swing: 0.55, order: 'AAABAAAB', pats: {
      A: { kick: 'x......x..x.....', snare: '....x.......x...', chh: 'x.xox.xox.xox.xo' },
      B: { kick: 'x......x........', snare: '....x...........', chh: 'x.xox.xo........' },
    } },
    dave: { vol: 0.75, bars: ['k...s.....k.s...', 'k...s..h..k.s...', 'k...s.....k.s..h', 'k...s...khs.kksh', 'k...s.....k.s...', 'k...s..h..k.s...', 'k...s.....k.s..h', 'k...s...kksh.shs'] },
  },
  {
    id: 'bap2', name: 'Feathers and Dust', where: 'Dizzy Dave', bpm: 92,
    chords: ['Em7', 'Cmaj7', 'Am7', 'B7', 'Em7', 'Cmaj7', 'Am7', 'B7'],
    parts: [
      { type: 'line', con: 'snes', v: 'flute', vol: 0.62, gate: 0.92, bars: [
        'B5:4 -:4 G5:2 A5:2 B5:4', 'E6:6 D6:2 B5:4 G5:4', 'A5:4 -:4 E5:2 G5:2 A5:4', 'F#5:6 A5:2 B5:4 -:4',
        'B5:4 -:4 D6:2 E6:2 G6:4', 'E6:6 D6:2 C6:4 B5:4', 'A5:4 C6:4 E6:4 C6:2 A5:2', 'B5:8 -:8',
      ] },
      { type: 'stab', con: 'gen', v: 'epiano', vol: 0.5, oct: 4, rhythm: '..x..x....x..x..', len: 2 },
      { type: 'bass', con: 'snes', v: 'bass', vol: 1, oct: 2, pat: 'r..r......r.R...' },
    ],
    // (The first two bars have no kit: Dave is the drums. Then the kit comes in under him.)
    drums: { con: 'snes', swing: 0.5, order: '--ABAAAB', pats: {
      A: { kick: 'x.....x...x.....', snare: '....x.......x...', chh: 'xoxoxoxoxoxoxoxo' },
      B: { kick: 'x.....x...x..x..', snare: '....x.......x.x.', chh: 'xoxoxoxoxoxoxo..' },
    } },
    dave: { vol: 0.85, bars: ['k.h.s.hkk.h.s.hh', 'k.h.s.hk.kh.s.sh', '..............sh', '.......s......kh', '..............sh', '.......h....s...', '..............sh', 'k.hsk.hskhskshsh'] },
  },
);

/**
 * A DUET (the owner, 2026-11-17: "I really really liked overlaying the voice track so if you want to try to use one of
 * the more feminine voices ... just again remember the era and that type of vibe we're going for"). A third boom bap
 * for the Club: Dave is the drums again, and the tune is SUNG, by the recording that is Wren's and Jinx's voice in the
 * game (recordings/wren.m4a: thirty-seven spoken syllables). make.mjs (`vox`) holds its darkest long syllable on each
 * note of the line, a fourth to an octave and a half above where it was spoken (which is what makes it a girl's), and
 * says its short syllables on the chord's notes as scat at the ends of phrases: a voice played from a sampler's keys,
 * as that era did it.
 */
SONGS.push({
  id: 'bap3', name: 'Jinx Cuts In', where: 'Dizzy Dave and Jinx', bpm: 90,
  chords: ['Am7', 'Fmaj7', 'Dm7', 'E7', 'Am7', 'Fmaj7', 'Dm7', 'E7'],
  parts: [
    { type: 'stab', con: 'x68', v: 'epiano', vol: 0.55, oct: 4, rhythm: 'x.....x.....x...', len: 5 },
    { type: 'bass', con: 'n64', v: 'bass', vol: 1, oct: 2, pat: 'r......r..r.R...' },
    { type: 'arp', con: 'n64', v: 'marimba', vol: 0.3, oct: 5, pat: '....2.....1.....' },
  ],
  drums: { con: 'ps1', swing: 0.5, order: 'AAABAAAB', pats: {
    A: { kick: 'x......x..x.....', snare: '....x.......x...', chh: 'x.xox.xox.xox.xo' },
    B: { kick: 'x......x........', snare: '....x.......x...', chh: 'x.xox.xo........', ohh: '..............x.' },
  } },
  dave: { vol: 0.7, bars: ['k...s.....k.s...', 'k...s..h..k.s...', 'k...s.....k.s...', 'k...s...k.h.s.hh', 'k...s.....k.s...', 'k...s..h..k.s...', 'k...s.....k.s...', 'k...s...kksh.shs'] },
  vox: {
    file: 'wren.m4a',
    line: { vol: 0.34, bars: [
      'E4:4 -:2 C4:2 E4:4 A4:4', 'F4:6 E4:2 C4:8', 'D4:4 -:2 F4:2 A4:4 F4:4', 'G#4:6 E4:2 B3:8',
      'A4:4 -:2 E4:2 A4:4 B4:4', 'A4:6 F4:2 C4:8', 'D4:4 F4:4 A4:4 F4:4', 'G#4:8 -:8',
    ] },
    scat: { oct: 4, vol: 0.42, bars: ['................', '............2.1.', '................', '............0.21', '................', '............2.1.', '................', '........0.1.2.31'] },
  },
});

/**
 * THE VIBE (the owner, 2026-11-17, after the first sets; these are his words and they are the brief):
 * "the vibe of this game I want it to be hip-hop oriented I want it to be boom bap rap kind of beat oriented, I want
 * to try to see if we can do some like record scratching sounds here and there ... a loose sort of chillaxed hanging
 * out with your friends beatboxing kind of vibe not necessarily a like super overly serious vibe ... you're making a
 * lot of stuff that sounds good but it sounds like grand fantasy like something that you would get from like a Legend
 * of Zelda or ... a Final Fantasy ... I'm more like down to earth gritty crunchy kind of stuff ... Conker's Bad Fur Day
 * or ... a Sega Genesis platformer ... like a Vectorman ... really grindy and crunchy, maybe something like ToeJam and
 * Earl kind of with that sort of hip hop flavor."
 * And of the places: "our main space is in a drippy dark wet sewer tunnel ... it's grungy and drippy and wet and dank
 * and cold, then when you're in the Foundry it's hot and it's loud and it's clanky and it's industrial, when you're
 * underground with the mushrooms it's got to breathe it feels like a cave maybe you hear some echoes and some drips
 * ... bats squeaking or rocks tumbling ... maybe those mushrooms make a little bit of a sound to each other ... glow
 * bugs flapping their wings ... the glitched out wacky Pomo environment should take a lot of inspiration from like
 * early 90s kids cartoons and toys ... a Nickelodeon type of vibe and then when it starts glitching out ... Tron ...
 * Terminator ... rogue AI digital synthesized voices ... modem sounds ... and then you can top all that off with boom
 * bap you know kick kick beat kind of background hip-hop funkiness to all of it".
 *
 * SO, FOR EVERY TUNE FROM HERE: a boom bap beat, swung, on a gritty kit, crunched; a Genesis slap bass with a RIFF (a
 * bar or two that comes round), not a bass that follows chords about; ONE chord for most of it; short licks and
 * stabs, not a long tune; scratches at the ends of phrases; and the PLACE'S OWN SOUNDS, sampled out of the game and
 * put on the beat (`layers`): drips, clanks, squeaks, chains.
 */
const rep = (bars, times) => Array.from({ length: times }, () => bars).flat();
const BOOM = { kick: 'x......x..x.....', snare: '....x.......x...', chh: 'x.xox.xox.xox.xo' };
const BOOM_FILL = { kick: 'x......x........', snare: '....x.......x.xx', chh: 'x.xox.xo........' };
SONGS.push(
  {
    id: 'sewer', name: 'Drip Tape', where: 'The Cistern: cold, wet, dripping', bpm: 84,
    chords: ['Em7', 'Em7', 'Em7', 'Cmaj7', 'Em7', 'Em7', 'Am7', 'B7'],
    parts: [
      { type: 'line', con: 'gen', v: 'fmbass', vol: 0.6, gate: 0.8, bars: [
        'E2:3 -:1 E2:2 G2:2 -:2 A2:2 B2:2 -:2', 'E2:3 -:1 E2:2 D2:2 -:4 B1:2 D2:2', 'E2:3 -:1 E2:2 G2:2 -:2 A2:2 B2:2 -:2', 'C2:3 -:1 C2:2 E2:2 -:2 G2:2 E2:2 -:2',
        'E2:3 -:1 E2:2 G2:2 -:2 A2:2 B2:2 -:2', 'E2:3 -:1 E2:2 D2:2 -:4 B1:2 D2:2', 'A1:3 -:1 A1:2 C2:2 -:2 E2:2 C2:2 -:2', 'B1:3 -:1 B1:2 D#2:2 -:4 F#2:2 B1:2',
      ] },
      { type: 'stab', con: 'gen', v: 'epiano', vol: 0.42, oct: 4, rhythm: '..x.......x.....', len: 3 },
      { type: 'line', con: 'snes', v: 'piano', vol: 0.5, gate: 1, bars: ['B4:2 -:6 G4:2 -:6', '-:16', 'A4:2 -:6 E4:2 -:6', '-:8 G4:2 E4:2 -:4', 'B4:2 -:6 G4:2 -:6', '-:16', 'C5:2 -:6 A4:2 -:6', '-:8 F#4:2 D#4:2 -:4'] },
    ],
    drums: { con: 'oki', swing: 0.5, order: 'AAABAAAB', pats: {
      A: { kick: 'x......x..x.....', snare: '....x.......x...', chh: 'o.x.o.x.o.x.o.x.' },
      B: { kick: 'x......x........', snare: '....x.......x...', chh: 'o.x.o.x.........' },
    } },
    layers: [{ src: 'src/drip', bars: ['......x.........', '..............x.', '...x............', '..........x.....'], vol: 0.5, tunes: [1, 0.8, 1.25, 0.9], echo: 3 }],
    scratches: { vol: 0.5, bars: ['................', '................', '................', '............b.b.', '................', '................', '................', '............r...'] },
    crunch: { bits: 8, hold: 2 }, crackle: 0.5,
  },
  {
    id: 'forge', name: 'Clank', where: 'The Foundry: hot, loud, clanking', bpm: 96,
    chords: ['Am7', 'Am7', 'Am7', 'Am7', 'Dm7', 'Dm7', 'Am7', 'E7'],
    parts: [
      { type: 'line', con: 'gen', v: 'fmbass', vol: 0.66, gate: 0.8, bars: [
        'A1:2 -:1 A2:1 -:2 A1:2 C2:2 D2:2 -:2 E2:2', 'A1:2 -:1 A2:1 -:2 G1:2 A1:2 -:2 E2:2 G2:2', 'A1:2 -:1 A2:1 -:2 A1:2 C2:2 D2:2 -:2 E2:2', 'A1:2 -:1 A2:1 -:2 G1:2 A1:2 -:2 E2:2 G2:2',
        'D2:2 -:1 D3:1 -:2 D2:2 F2:2 G2:2 -:2 A2:2', 'D2:2 -:1 D3:1 -:2 C2:2 D2:2 -:2 A1:2 C2:2', 'A1:2 -:1 A2:1 -:2 A1:2 C2:2 D2:2 -:2 E2:2', 'E2:2 -:1 E3:1 -:2 E2:2 G#2:2 B2:2 -:2 E2:2',
      ] },
      { type: 'stab', con: 'gen', v: 'brass', vol: 0.5, oct: 4, rhythm: 'x.......x..x....', len: 2 },
      { type: 'line', con: 'gen', v: 'lead', vol: 0.55, gate: 0.85, bars: ['-:16', '-:8 E5:2 G5:2 A5:2 -:2', '-:16', '-:8 A5:2 G5:2 E5:2 -:2', '-:16', '-:8 D5:2 F5:2 A5:2 -:2', '-:16', '-:8 G#5:2 B5:2 E5:2 -:2'] },
    ],
    drums: { con: 'gen', swing: 0.45, order: 'AAABAAAB', pats: {
      A: { kick: 'x..x......x..x..', snare: '....x.......x...', clap: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.', bell: '..x...x...x...x.' },
      B: { kick: 'x..x......x.....', snare: '....x.......x.xx', clap: '....x.......x...', chh: 'x.x.x.x.x.x.....', bell: '..x...x...x.....' },
    } },
    layers: [
      { src: 'src/clank', bars: '....x.......x...', vol: 0.3, tune: 1.3 },
      { src: 'src/hiss', bars: ['..........x.....', '................'], vol: 0.25 },
    ],
    scratches: { vol: 0.5, bars: ['................', '................', '................', '............c.c.', '................', '................', '................', '............b.b.'] },
    crunch: { bits: 7, hold: 3 },
  },
  {
    id: 'cave', name: 'Spore Breath', where: 'The Hollows: a cave that breathes', bpm: 78,
    chords: ['Dm7', 'Dm7', 'Dm7', 'Gm7', 'Dm7', 'Dm7', 'Bbmaj7', 'A7'],
    parts: [
      { type: 'line', con: 'n64', v: 'bass', vol: 0.5, gate: 0.9, bars: [
        'D2:4 -:4 F2:2 G2:2 -:4', 'D2:4 -:4 C2:2 A1:2 -:4', 'D2:4 -:4 F2:2 G2:2 -:4', 'G1:4 -:4 Bb1:2 D2:2 -:4',
        'D2:4 -:4 F2:2 G2:2 -:4', 'D2:4 -:4 C2:2 A1:2 -:4', 'Bb1:4 -:4 D2:2 F2:2 -:4', 'A1:4 -:4 C#2:2 E2:2 -:4',
      ] },
      // (The mushrooms, to each other: one says "ooh", another answers it, higher.)
      { type: 'line', con: 'vtx', v: 'ooh', vol: 0.45, gate: 0.9, bars: rep(['-:4 D4:2 -:10', '-:16', '-:4 F4:2 -:10', '-:16'], 2) },
      { type: 'line', con: 'snm', v: 'ooh', vol: 0.4, gate: 0.9, bars: ['-:10 A4:2 -:4', '-:16', '-:10 C5:2 -:4', '-:16', '-:10 A4:2 -:4', '-:16', '-:10 D5:2 -:4', '-:16'] },
      { type: 'arp', con: 'n64', v: 'marimba', vol: 0.38, oct: 5, pat: '0.....2.....1...' },
    ],
    drums: { con: 'snes', swing: 0.4, order: 'AAABAAAB', pats: {
      A: { kick: 'x.........x.....', rim: '....x.......x...', chh: 'o...o...o...o...' },
      B: { kick: 'x.........x.....', rim: '....x.......x.x.', chh: 'o...o...o.......' },
    } },
    layers: [
      { src: 'src/drip', bars: ['..x.............', '.........x......', '....x...........', '..............x.'], vol: 0.45, tunes: [1, 1.3, 0.7, 1.1], echo: 3 },
      { src: 'src/batSqueak', bars: ['................', '................', '.............x..', '................', '................', '................', '................', '.........x.x....'], vol: 0.28, tunes: [1, 1.2, 0.9], echo: 2 },
      { src: 'src/pebbles', bars: ['................', '................', '................', '................', '................', '................', '................', 'x...............'], vol: 0.3 },
      { src: 'src/flap', bars: ['................', '......xx........', '................', '................'], vol: 0.25 },
    ],
    scratches: { vol: 0.4, bars: ['................', '................', '................', '............b...'] },
    crackle: 0.3,
  },
  {
    id: 'stone', name: 'Cold Stone', where: "Grimsqueak's Keep", bpm: 88,
    chords: ['Cm7', 'Cm7', 'Cm7', 'Ab', 'Cm7', 'Cm7', 'Fm7', 'G7'],
    parts: [
      { type: 'line', con: 'ps1', v: 'piano', vol: 0.8, gate: 1, bars: [
        'C4:2 Eb4:2 G4:2 -:2 Ab4:2 G4:2 Eb4:2 -:2', 'C4:2 Eb4:2 G4:2 -:2 Bb4:2 Ab4:2 G4:2 -:2', 'C4:2 Eb4:2 G4:2 -:2 Ab4:2 G4:2 Eb4:2 -:2', 'C4:2 Eb4:2 Ab4:2 -:2 C5:2 Ab4:2 Eb4:2 -:2',
        'C4:2 Eb4:2 G4:2 -:2 Ab4:2 G4:2 Eb4:2 -:2', 'C4:2 Eb4:2 G4:2 -:2 Bb4:2 Ab4:2 G4:2 -:2', 'C4:2 F4:2 Ab4:2 -:2 C5:2 Ab4:2 F4:2 -:2', 'B3:2 D4:2 G4:2 -:2 F4:2 D4:2 B3:2 -:2',
      ] },
      { type: 'line', con: 'gen', v: 'fmbass', vol: 0.6, gate: 0.8, bars: [
        'C2:3 -:3 C2:2 -:2 Eb2:2 -:2 G1:2', 'C2:3 -:3 C2:2 -:2 Eb2:2 -:2 G1:2', 'C2:3 -:3 C2:2 -:2 Eb2:2 -:2 G1:2', 'Ab1:3 -:3 Ab1:2 -:2 C2:2 -:2 Eb2:2',
        'C2:3 -:3 C2:2 -:2 Eb2:2 -:2 G1:2', 'C2:3 -:3 C2:2 -:2 Eb2:2 -:2 G1:2', 'F1:3 -:3 F1:2 -:2 Ab1:2 -:2 C2:2', 'G1:3 -:3 G1:2 -:2 B1:2 -:2 D2:2',
      ] },
      { type: 'stab', con: 'ps1', v: 'strings', vol: 0.32, oct: 3, rhythm: 'x...............', len: 6 },
    ],
    drums: { con: 'ps1', swing: 0.5, order: 'AAABAAAB', pats: { A: BOOM, B: BOOM_FILL } },
    layers: [
      { src: 'src/chainClink', bars: ['..........x.....', '................'], vol: 0.28, tune: 1.1 },
      { src: 'src/toll', bars: ['x...............', '................', '................', '................'], vol: 0.2, tune: 1.5 },
    ],
    scratches: { vol: 0.5, bars: ['................', '................', '................', '............b.b.', '................', '................', '................', '..........c.b.b.'] },
    crunch: { bits: 8, hold: 2 }, crackle: 0.4,
  },
  {
    id: 'teeth', name: 'Big Teeth', where: 'A boss', bpm: 100,
    chords: ['Em7', 'Em7', 'Em7', 'Em7', 'G7', 'G7', 'Em7', 'B7'],
    parts: [
      { type: 'line', con: 'gen', v: 'fmbass', vol: 0.66, gate: 0.8, bars: [
        'E1:2 E2:1 E1:1 -:2 E1:2 G1:2 A1:2 Bb1:2 A1:2', 'E1:2 E2:1 E1:1 -:2 E1:2 D2:2 B1:2 G1:2 -:2', 'E1:2 E2:1 E1:1 -:2 E1:2 G1:2 A1:2 Bb1:2 A1:2', 'E1:2 E2:1 E1:1 -:2 E1:2 D2:2 B1:2 G1:2 -:2',
        'G1:2 G2:1 G1:1 -:2 G1:2 Bb1:2 C2:2 Db2:2 C2:2', 'G1:2 G2:1 G1:1 -:2 G1:2 F2:2 D2:2 Bb1:2 -:2', 'E1:2 E2:1 E1:1 -:2 E1:2 G1:2 A1:2 Bb1:2 A1:2', 'B1:2 B2:1 B1:1 -:2 B1:2 D#2:2 F#2:2 A2:2 F#2:2',
      ] },
      { type: 'stab', con: 'gen', v: 'brass', vol: 0.55, oct: 4, rhythm: 'x..x..x.........', len: 2 },
      { type: 'line', con: 'gen', v: 'lead', vol: 0.55, gate: 0.8, bars: ['-:16', 'E5:1 -:1 E5:1 -:1 G5:2 E5:2 -:8', '-:16', 'E5:1 -:1 E5:1 -:1 G5:2 E5:2 -:8', '-:16', 'G5:1 -:1 G5:1 -:1 Bb5:2 G5:2 -:8', '-:16', 'F#5:1 -:1 F#5:1 -:1 A5:2 F#5:2 -:8'] },
      { type: 'hit', con: 'ps1', v: 'hit', vol: 0.5, oct: 4, bars: [0, 4] },
    ],
    drums: { con: 'x68', swing: 0.3, order: 'ZAABZAAB', pats: {
      Z: { kick: 'x..x..x...x..x..', snare: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.', crash: 'x...............' },
      A: { kick: 'x..x..x...x..x..', snare: '....x.......x...', chh: 'x.x.x.x.x.x.x.x.' },
      B: { kick: 'x..x..x...x.....', snare: '....x.......xxxx', chh: 'x.x.x.x.x.x.....' },
    } },
    layers: [
      { src: 'src/wyrmRoar', bars: ['................', '................', '................', '................', '................', '................', '................', '........x.......'], vol: 0.3, tune: 1.2 },
      { src: 'src/roachScreech', bars: ['................', '................', '................', '..............x.'], vol: 0.22 },
    ],
    scratches: { vol: 0.55, bars: ['............b.b.', '................', '............c.c.', '........r.......'] },
    crunch: { bits: 7, hold: 3 },
  },
  {
    id: 'cartoon', name: 'Saturday Morning', where: 'The Milky Way: a kids\' cartoon, a toy box', bpm: 104,
    chords: ['C7', 'C7', 'F7', 'C7', 'C7', 'C7', 'F7', 'G7'],
    parts: [
      { type: 'line', con: 'gen', v: 'fmbass', vol: 0.6, gate: 0.8, bars: [
        'C2:2 -:1 C3:1 -:2 C2:2 Eb2:1 E2:1 G2:2 A2:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Eb2:1 E2:1 G2:2 A2:2 -:2', 'F2:2 -:1 F3:1 -:2 F2:2 Ab2:1 A2:1 C3:2 D3:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Eb2:1 E2:1 G2:2 A2:2 -:2',
        'C2:2 -:1 C3:1 -:2 C2:2 Eb2:1 E2:1 G2:2 A2:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Eb2:1 E2:1 G2:2 A2:2 -:2', 'F2:2 -:1 F3:1 -:2 F2:2 Ab2:1 A2:1 C3:2 D3:2 -:2', 'G2:2 -:1 G3:1 -:2 G2:2 Bb2:1 B2:1 D3:2 F3:2 -:2',
      ] },
      { type: 'line', con: 'gbc', v: 'echo', vol: 0.8, gate: 0.85, bars: [
        'E5:2 G5:2 A5:2 G5:2 E5:2 C5:2 D5:2 -:2', 'E5:2 G5:2 A5:2 C6:2 A5:4 -:4', 'A5:2 C6:2 D6:2 C6:2 A5:2 F5:2 G5:2 -:2', 'E5:2 G5:2 A5:2 C6:2 A5:4 -:4',
        'E5:2 G5:2 A5:2 G5:2 E5:2 C5:2 D5:2 -:2', 'E5:2 G5:2 A5:2 C6:2 A5:4 -:4', 'A5:2 C6:2 D6:2 C6:2 A5:2 F5:2 G5:2 -:2', 'B5:2 D6:2 E6:2 D6:2 B5:4 -:4',
      ] },
      { type: 'stab', con: 'gen', v: 'epiano', vol: 0.4, oct: 4, rhythm: '..x..x....x..x..', len: 2 },
    ],
    drums: { con: 'gen', swing: 0.55, order: 'AAABAAAB', pats: {
      A: { kick: 'x......x..x.....', snare: '....x.......x...', clap: '....x.......x...', chh: 'x.xox.xox.xox.xo', blip: '......x.........' },
      B: { kick: 'x......x........', snare: '....x.......x.xx', chh: 'x.xox.xo........', zap: '..........x.....' },
    } },
    // (TALKING TOYS, said by the Robot Voice Box's speech chips, on the beat: a Speak & Spell and a Speak & Math.)
    layers: [
      { src: 'sfx/sparkle', bars: ['................', '............x...'], vol: 0.3 },
      { say: { chip: 'sns', text: 'yeah', opts: { pitch: 190, tone: 'lively' } }, bars: ['............x...', '................', '................', '................'], vol: 0.5 },
      { say: { chip: 'snm', text: 'wow', opts: { pitch: 150, tone: 'lively' } }, bars: ['................', '................', '............x...', '................'], vol: 0.5 },
      { say: { chip: 'sns', text: "let's play", opts: { pitch: 170, tone: 'lively', speed: 1.15 } }, bars: ['................', '................', '................', '................', '................', '........x.......', '................', '................'], vol: 0.5 },
    ],
    scratches: { say: { chip: 'sns', text: 'fresh', opts: { pitch: 170 } }, vol: 0.5, pitch: 1.3, bars: ['................', '............b.b.', '................', '..........c.c.r.'] },
  },
  {
    id: 'sheep', name: 'Counting Sheep', where: 'The dreamers, asleep', bpm: 72,
    chords: ['Fmaj7', 'Dm7', 'Bbmaj7', 'C7', 'Fmaj7', 'Dm7', 'Bbmaj7', 'C7'],
    parts: [
      { type: 'stab', con: 'x68', v: 'epiano', vol: 0.55, oct: 4, rhythm: 'x.......x.......', len: 7 },
      { type: 'line', con: 'gbc', v: 'bell', vol: 0.55, gate: 1, bars: ['A5:4 C6:4 A5:4 F5:4', 'A5:4 F5:4 D5:8', 'D6:4 Bb5:4 F5:4 D5:4', 'E5:4 G5:4 C6:8', 'A5:4 C6:4 A5:4 F5:4', 'A5:4 F5:4 D5:8', 'D6:4 Bb5:4 F5:4 D5:4', 'E5:4 G5:4 Bb5:4 C6:4'] },
      { type: 'bass', con: 'n64', v: 'bass', vol: 0.9, oct: 2, pat: 'r.........r.....' },
      // (A snore, every other bar: a low "ohh".)
      { type: 'line', con: 'vtx', v: 'ohh', vol: 0.32, gate: 1, bars: rep(['-:16', 'A2:6 -:10', '-:16', 'G2:6 -:10'], 2) },
    ],
    drums: { con: 'oki', swing: 0.6, order: 'AAABAAAB', pats: {
      A: { kick: 'x.........x.....', snare: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.' },
      B: { kick: 'x.........x..x..', snare: '....x.......x...', chh: 'o.o.o.o.o.o.....' },
    } },
    scratches: { vol: 0.32, pitch: 1.2, bars: ['................', '................', '................', '................', '................', '................', '................', '............r...'] },
    crunch: { bits: 8, hold: 2 }, crackle: 0.6,
  },
  {
    id: 'late', name: 'After Hours', where: 'The Club, late: one at a table by himself', bpm: 76,
    chords: ['Am7', 'Am7', 'Dm7', 'E7', 'Am7', 'Am7', 'Dm7', 'E7'],
    parts: [
      { type: 'stab', con: 'x68', v: 'epiano', vol: 0.55, oct: 4, rhythm: 'x.......x.......', len: 7 },
      { type: 'line', con: 'n64', v: 'trumpet', vol: 0.6, gate: 0.95, bars: ['-:8 E5:4 D5:2 C5:2', 'A4:8 -:8', '-:8 F5:4 E5:2 D5:2', 'B4:8 -:8', '-:8 E5:4 D5:2 C5:2', 'A4:8 -:8', '-:8 A5:4 F5:2 D5:2', 'G#4:8 -:8'] },
      { type: 'bass', con: 'n64', v: 'bass', vol: 0.9, oct: 2, pat: 'r.......r...f...' },
    ],
    drums: { con: 'oki', swing: 0.55, order: 'AAABAAAB', pats: {
      A: { kick: 'x.........x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.' },
      B: { kick: 'x.........x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.......', ohh: '..............x.' },
    } },
    // (Dave, half asleep at his decks: a tick now and then.)
    dave: { vol: 0.45, bars: rep(['..............h.', '.......h........', '..............h.', '..........k.s...'], 2) },
    crunch: { bits: 8, hold: 2 }, crackle: 0.6,
  },
);

/** A line an octave (or more) up or down. */
const octave = (bars, by) => bars.map((bar) => bar.replace(/([A-G][#b]?)(\d)/g, (_, n, o) => n + (Number(o) + by)));

/**
 * HOW HE SAID TO DO IT (the owner, 2026-11-17): "we got to do it how musicians do it and we have to really try to make
 * some funky chiptune stuff ... you can mix and match chips ... if you're going to mix and match two or three chips you
 * want to try to make you know a third of the track with one a third of the track with the other and then a third of
 * the track [with] the other then you can put them all together to make one track that'll have a really really super
 * cool unique sound but you just have to remember that you want it to sort of go along and match the visuals of the
 * game" (which are the N64's and the PS1's: "otherwise it's going to feel like we're playing a Nintendo 64 game while
 * listening to it through an NES").
 * So: ONE THEME, thirty-two bars, in four eights. The PlayStation states it (flute over strings, a piano under). The
 * Genesis answers it, funky: slap bass, electric piano on the off beats, brass with a riff made out of the theme. The
 * C64 takes it apart: its buzzing lead with the theme again over a pumping filter bass and a chord that flickers.
 * Then ALL THREE AT ONCE: flute and brass with the theme in octaves, the C64's lead behind them, strings, the slap
 * bass, the off-beat piano, the flickering chord, the Genesis's drums with the PlayStation's cymbals on top.
 */
const THEME = [
  'D5:4 G5:4 B5:6 A5:2', 'B5:6 G5:2 E5:8', 'E5:4 G5:4 C6:6 B5:2', 'A5:8 F#5:4 D5:4',
  'D6:6 B5:2 G5:4 B5:4', 'G5:6 E5:2 B4:4 E5:4', 'C5:2 E5:2 A5:4 G5:2 E5:2 C5:4', 'F#5:4 A5:4 D6:4 C6:2 A5:2',
];
const RIFF = [
  'B5:3 D6:1 B5:2 G5:2 -:2 B5:2 D6:2 B5:2', 'G5:3 B5:1 G5:2 E5:2 -:4 E5:2 G5:2', 'E5:3 G5:1 C6:2 E6:2 -:2 C6:2 G5:2 E5:2', 'A5:3 F#5:1 D5:4 -:2 D5:2 F#5:2 A5:2',
  'D6:3 B5:1 G5:2 B5:2 -:2 D6:2 G6:4', 'E6:3 D6:1 B5:4 -:2 G5:2 B5:2 E6:2', 'C6:2 -:1 C6:1 E6:2 A5:4 -:2 G5:2 E5:2', 'F#5:2 A5:2 C6:4 -:2 A5:2 F#5:2 D5:2',
];
const EIGHT = ['G', 'Em7', 'C', 'D', 'G', 'Em7', 'Am7', 'D7'];
const FUNK = { kick: 'x..x..x...x.x...', snare: '....x.......x...', clap: '....x.......x...', chh: 'x.xox.xox.xox.xo' };
const FUNK_FILL = { kick: 'x..x..x...x.....', snare: '....x.......x.xx', chh: 'x.xox.xox.xo....', thi: '..........x.....', tmid: '...........x....', tlo: '.............x..' };
SONGS.push({
  id: 'kingdom', name: 'The Kingdom Below', where: 'The title (three machines)', bpm: 108,
  chords: [...EIGHT, ...EIGHT, ...EIGHT, ...EIGHT],
  parts: [
    // ---- 1: the PlayStation ----
    { from: 0, to: 8, type: 'line', con: 'ps1', v: 'flute', vol: 0.95, gate: 0.95, bars: THEME },
    { from: 0, to: 8, type: 'pad', con: 'ps1', v: 'strings', vol: 0.42, oct: 4 },
    { from: 0, to: 8, type: 'arp', con: 'ps1', v: 'piano', vol: 0.5, oct: 4, pat: '0.1.2.1.3.2.1.2.' },
    { from: 0, to: 8, type: 'bass', con: 'ps1', v: 'bass', vol: 0.9, oct: 2, pat: 'r.......r...f...' },
    // ---- 2: the Genesis ----
    { from: 8, to: 16, type: 'line', con: 'gen', v: 'brass', vol: 0.95, gate: 0.85, bars: RIFF },
    { from: 8, to: 16, type: 'bass', con: 'gen', v: 'fmbass', vol: 0.6, oct: 2, pat: 'r..R.r..r.R..rf.' },
    { from: 8, to: 16, type: 'stab', con: 'gen', v: 'epiano', vol: 0.5, oct: 4, rhythm: '..x...x...x..x..', len: 2 },
    // ---- 3: the C64 ----
    { from: 16, to: 24, type: 'line', con: 'c64', v: 'sync', vol: 1, gate: 0.85, bars: THEME },
    { from: 16, to: 24, type: 'bass', con: 'c64', v: 'fbass', vol: 1.1, oct: 2, pat: 'r.r.R.r.r.r.R.r.' },
    { from: 16, to: 24, type: 'chip', con: 'c64', v: 'arp', vol: 0.4, oct: 4 },
    // ---- 4: all three ----
    { from: 24, to: 32, type: 'line', con: 'ps1', v: 'flute', vol: 0.85, gate: 0.95, bars: octave(THEME, 1) },
    { from: 24, to: 32, type: 'line', con: 'gen', v: 'brass', vol: 0.75, gate: 0.9, bars: THEME },
    { from: 24, to: 32, type: 'line', con: 'c64', v: 'sync', vol: 0.35, gate: 0.85, bars: octave(RIFF, -1) },
    { from: 24, to: 32, type: 'pad', con: 'ps1', v: 'strings', vol: 0.4, oct: 4 },
    { from: 24, to: 32, type: 'bass', con: 'gen', v: 'fmbass', vol: 0.6, oct: 2, pat: 'r..R.r..r.R..rf.' },
    { from: 24, to: 32, type: 'stab', con: 'gen', v: 'epiano', vol: 0.45, oct: 4, rhythm: '..x...x...x..x..', len: 2 },
    { from: 24, to: 32, type: 'chip', con: 'c64', v: 'arp', vol: 0.28, oct: 5 },
  ],
  drums: [
    { at: 0, con: 'ps1', order: 'AAABAAAC', pats: {
      A: { kick: 'x.......x.x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.o.o.o.' },
      B: { kick: 'x.......x.x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.o.o...', ohh: '..............x.' },
      C: { kick: 'x.......x.x.....', rim: '....x.......x...', chh: 'o.o.o.o.o.......', snare: '..........o.oxxx' },
    } },
    { at: 8, con: 'gen', order: 'AAABAAAB', pats: { A: FUNK, B: FUNK_FILL } },
    { at: 16, con: 'c64', order: 'AAAAAAAB', pats: {
      A: { kick: 'x...x...x...x...', ohh: '..x...x...x...x.', clap: '....x.......x...' },
      B: { kick: 'x...x...x...x...', ohh: '..x...x.........', clap: '....x...........', thi: '........x.x.....', tmid: '...........x.x..', tlo: '..............xx' },
    } },
    { at: 24, con: 'gen', order: 'AAABAAAB', pats: { A: FUNK, B: FUNK_FILL } },
    { at: 24, con: 'ps1', gain: 0.6, order: 'ZAAAZAAA', pats: { Z: { crash: 'x...............', ride: '....o...o...o...' }, A: { ride: 'o...o...o...o...' } } },
  ],
});

/**
 * THE DREAM, GONE WRONG (the owner: "we might make a darker version of the same track too cuz I plan on that area like
 * glitching out and having a weird glitch boss or something"). The same tune as Star Slide, bar for bar, in the minor;
 * slower; on harsher machines (the Atari's buzz for the tune, the C64's filter bass); and then BROKEN after it is
 * made (make.mjs, `glitch`): bits of it stuck and repeating, bits crushed, bits backwards, and the end of each round
 * running down like a tape.
 */
SONGS.push({
  id: 'glitch', name: 'Star Slide (Broken)', where: 'The Milky Way, gone wrong', bpm: 126, glitch: 7,
  chords: ['Cm', 'Gm', 'Ab', 'Fm', 'Cm', 'Gm', 'Fm', 'G'],
  parts: [
    { type: 'line', con: 'vcs', v: 'lead', vol: 0.9, gate: 0.85, bars: [
      'Eb5:2 G5:2 C6:4 Bb5:2 C6:2 G5:4', 'D5:2 G5:2 Bb5:4 A5:2 Bb5:2 G5:4', 'C5:2 Eb5:2 Ab5:4 G5:2 Ab5:2 Eb5:4', 'F5:2 Ab5:2 C6:4 Ab5:2 F5:2 G5:4',
      'Eb6:4 D6:2 C6:2 G5:4 C6:4', 'D6:4 C6:2 Bb5:2 G5:4 Bb5:4', 'C6:2 Ab5:2 F5:2 Ab5:2 C6:2 F6:2 Eb6:2 D6:2', 'D6:6 B5:2 G5:4 B5:2 D6:2',
    ] },
    { type: 'bass', con: 'c64', v: 'fbass', vol: 1, oct: 2, pat: 'r.R.r.R.r.R.r.R.' },
    { type: 'chip', con: 'c64', v: 'arp', vol: 0.34, oct: 4 },
    { type: 'arp', con: 'gbc', v: 'bell', vol: 0.35, oct: 6, pat: '..2...1...2...0.' },
  ],
  drums: { con: 'vcs', swing: 0, order: 'AAABAAAB', pats: {
    A: { kick: 'x.....x.x.....x.', snare: '....x.......x...', chh: 'xoxoxoxoxoxoxoxo' },
    B: { kick: 'x.....x.x.....x.', snare: '....x.......xxxx', chh: 'xoxoxoxoxoxo....', zap: '..............x.' },
  } },
});

/**
 * THE DREAM GLITCHING OUT, as a boom bap (the owner, 2026-11-17: "when it starts glitching out ... a little bit more
 * like Tron ... Terminator ... rogue AI digital synthesized voices ... screaming like modem sounds ... and then you can
 * top all that off with boom bap"). NOT the boss's tune (he keeps "Star Slide (Broken)" for that): this is the place
 * itself going wrong. The toys of "Saturday Morning" are still talking, but lower, flat, and crushed; a modem calls
 * out at the end of each four bars; and the round is broken after it is made, as the boss's is.
 * The voices are said by his third tool, the Robot Voice Box (the TI-99's speech chip, the Votrax, the Speak & Spell).
 */
SONGS.push({
  id: 'rogue', name: 'Does Not Compute', where: 'The Milky Way, glitching out', bpm: 92, glitch: 4,
  chords: ['Cm7', 'Cm7', 'Cm7', 'Cm7', 'Cm7', 'Cm7', 'Ab7', 'G7'],
  parts: [
    { type: 'line', con: 'c64', v: 'fbass', vol: 0.8, gate: 0.8, bars: [
      'C2:2 -:1 C3:1 -:2 C2:2 Eb2:2 F2:1 F#2:1 G2:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Bb1:2 G1:2 Bb1:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Eb2:2 F2:1 F#2:1 G2:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Bb1:2 G1:2 Bb1:2 -:2',
      'C2:2 -:1 C3:1 -:2 C2:2 Eb2:2 F2:1 F#2:1 G2:2 -:2', 'C2:2 -:1 C3:1 -:2 C2:2 Bb1:2 G1:2 Bb1:2 -:2', 'Ab1:2 -:1 Ab2:1 -:2 Ab1:2 C2:2 Eb2:2 Gb2:2 -:2', 'G1:2 -:1 G2:1 -:2 G1:2 B1:2 D2:2 F2:2 -:2',
    ] },
    // (The toy's tune from "Saturday Morning", what is left of it: in the minor, on the Atari's buzz.)
    { type: 'line', con: 'vcs', v: 'lead', vol: 0.6, gate: 0.8, bars: ['Eb5:2 G5:2 Bb5:2 G5:2 Eb5:2 C5:2 D5:2 -:2', '-:16', 'Eb5:2 G5:2 Bb5:2 C6:2 Bb5:4 -:4', '-:16', 'Eb5:2 G5:2 Bb5:2 G5:2 Eb5:2 C5:2 D5:2 -:2', '-:16', 'Eb5:2 Gb5:2 Ab5:2 C6:2 Ab5:4 -:4', 'D5:2 F5:2 G5:2 B5:2 D6:4 -:4'] },
    { type: 'stab', con: 'c64', v: 'pad', vol: 0.3, oct: 4, rhythm: '..x.......x.....', len: 3 },
  ],
  drums: { con: 'gen', swing: 0.5, order: 'AAABAAAB', pats: {
    A: { kick: 'x......x..x.....', snare: '....x.......x...', chh: 'x.xox.xox.xox.xo', zap: '..............o.' },
    B: { kick: 'x......x........', snare: '....x.......x.xx', chh: 'x.xox.xo........' },
  } },
  layers: [
    { say: { chip: 'ti', text: 'error', opts: { pitch: 70, tone: 'flat' } }, bars: ['........x.......', '................'], vol: 0.55, crush: { bits: 6, hold: 4 } },
    { say: { chip: 'vtx', text: 'I can see you', opts: { clock: 0.7 } }, bars: ['................', '................', '................', '................', '................', 'x...............', '................', '................'], vol: 0.5, crush: { bits: 6, hold: 3 } },
    { say: { chip: 'sns', text: 'play with me', opts: { pitch: 60, tone: 'flat', speed: 0.8 } }, bars: ['................', 'x...............', '................', '................', '................', '................', '................', '................'], vol: 0.5, crush: { bits: 5, hold: 5 } },
    { src: 'gen/modem', bars: ['................', '................', '................', '........x.......'], vol: 0.3, crush: { bits: 6, hold: 3 } },
  ],
  scratches: { say: { chip: 'ti', text: 'no', opts: { pitch: 80, tone: 'flat' } }, vol: 0.5, pitch: 1, bars: ['................', '............b.b.', '................', '................', '................', '............c.c.', '................', '..........b.b.r.'] },
  crunch: { bits: 6, hold: 4 },
});

/**
 * Two short pieces that are played once (no drums, no loop).
 * (The first two were NES pulses, and he said of them: "the jingles were just a little off like the death one sounded
 * happy ... it'll have to be something a little more solemn". So: the wedge is a fanfare for brass and strings that
 * comes home on its last chord; and the defeat is slow, low and minor, a piano over strings and a choir, falling to
 * its own keynote and staying there.)
 */
export const JINGLES = [
  // (The owner, 2026-11-17, of a brass fanfare of three bars: "The jingle wedge sound I think is just too long." And it was
  // a fantasy fanfare, which is not this game: now ONE bar, a horn riff over a beat with a scratch in its tail.)
  { id: 'wedge', name: 'A Golden Wedge', bpm: 100, chords: ['G7'], tail: 0.7, parts: [
    { type: 'line', con: 'gen', v: 'brass', vol: 1, gate: 0.85, bars: ['G4:1 B4:1 D5:2 E5:1 G5:3 -:2 E5:1 G5:1 B5:4'] },
    { type: 'line', con: 'gen', v: 'fmbass', vol: 0.6, gate: 0.8, bars: ['G2:3 -:1 G2:2 D2:2 -:2 F2:1 F#2:1 G2:4'] },
    { type: 'stab', con: 'gen', v: 'epiano', vol: 0.45, oct: 4, rhythm: 'x...........x...', len: 3 },
  ], drums: { con: 'gen', swing: 0.4, order: 'A', pats: { A: { kick: 'x..x......x.x...', snare: '....x.....x.....', clap: '....x.......x...', chh: 'x.x.x.x.x.......', crash: '............x...' } } },
    scratches: { say: { chip: 'sns', text: 'fresh', opts: { pitch: 150 } }, pitch: 1.2, vol: 0.45, bars: ['..........b.....'] } },
  { id: 'defeat', name: 'Down He Goes', bpm: 66, chords: ['Am', 'E', 'Am'], parts: [
    { type: 'line', con: 'ps1', v: 'piano', vol: 1, gate: 1, bars: ['E5:6 D5:2 C5:8', 'B4:8 G#4:8', 'A4:16'] },
    { type: 'pad', con: 'ps1', v: 'strings', vol: 0.5, oct: 3 },
    { type: 'pad', con: 'ps1', v: 'choir', vol: 0.32, oct: 4 },
    { type: 'bass', con: 'ps1', v: 'bass', vol: 0.9, oct: 2, pat: 'r---------------' },
  ] },
];

/** A song (or jingle) as the Studio wants it: takes of notes in seconds. */
export function toStudio(s) {
  const six = 60 / s.bpm / 4;
  const bars = s.chords.length;
  const takes = [];
  for (const p of s.parts) {
    const notes = [];
    // (Swung as the drums are: an odd sixteenth comes late by a third of the swing, or the bass and the kick part company.)
    const sw = (s.swing ?? (Array.isArray(s.drums) ? 0 : s.drums?.swing) ?? 0) / 3;
    const put = (step, len, m, extra = {}) => notes.push({ t: +((step + (step % 2 ? sw : 0)) * six).toFixed(5), d: +(Math.max(0.03, len * six * (p.gate ?? 0.9))).toFixed(5), c: p.con, v: p.v, m, ...extra });
    // (A part may play only some of the bars: `from` to `to`. A LINE's bars are then counted from its own first.)
    for (let b = p.from ?? 0; b < (p.to ?? bars); b++) {
      const ch = chord(s.chords[b]);
      const base = 12 * ((p.oct ?? 4) + 1) + ch.root;
      const tone = (i) => base + ch.tones[i % ch.tones.length] + 12 * Math.floor(i / ch.tones.length);
      const at = b * 16;
      if (p.type === 'line') {
        let step = 0;
        for (const tok of p.bars[b - (p.from ?? 0)].split(/\s+/)) {
          const [n, l] = tok.split(':');
          if (n !== '-') put(at + step, Number(l), midi(n));
          step += Number(l);
        }
        if (step !== 16) throw new Error(`${s.id}: bar ${b + 1} of a line is ${step} long, not 16`);
      } else if (p.type === 'pad') {
        for (let i = 0; i < 3; i++) put(at, 16, tone(i));
      } else if (p.type === 'chip') {
        put(at, 16, base, { x: ch.tones.slice(0, 3) });
      } else if (p.type === 'hit') {
        if (p.bars.includes(b)) put(at, 4, base);
      } else if (p.type === 'stab') {
        for (let i = 0; i < 16; i++) if (p.rhythm[i] === 'x') for (let k = 0; k < Math.min(3, ch.tones.length); k++) put(at + i, p.len ?? 2, tone(k + (ch.tones.length > 3 ? 1 : 0)));
      } else if (p.type === 'bass' || p.type === 'arp') {
        const pat = Array.isArray(p.pat) ? p.pat[b] : p.pat;
        if (pat.length !== 16) throw new Error(`${s.id}: a pattern is ${pat.length} long`);
        for (let i = 0; i < 16; i++) {
          const c = pat[i];
          if (c === '.' || c === '-') continue;
          let len = 1;
          while (i + len < 16 && pat[i + len] === '-') len++;
          if (p.type === 'arp') put(at + i, p.len ?? Math.max(len, 2), tone(Number(c)));
          else put(at + i, Math.max(len, 1.6), base + (c === 'R' ? 12 : c === 'f' ? 7 : c === 't' ? ch.tones[1] : 0));
        }
      }
    }
    takes.push({ notes, len: bars * 16 * six, vol: p.vol ?? 1 });
  }
  return { name: s.name, cfg: { bpm: s.bpm, key: 0, scale: 'major' }, takes };
}
