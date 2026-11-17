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
    { from: 8, to: 16, type: 'bass', con: 'gen', v: 'fmbass', vol: 1, oct: 2, pat: 'r..R.r..r.R..rf.' },
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
    { from: 24, to: 32, type: 'bass', con: 'gen', v: 'fmbass', vol: 1, oct: 2, pat: 'r..R.r..r.R..rf.' },
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
 * Two short pieces that are played once (no drums, no loop).
 * (The first two were NES pulses, and he said of them: "the jingles were just a little off like the death one sounded
 * happy ... it'll have to be something a little more solemn". So: the wedge is a fanfare for brass and strings that
 * comes home on its last chord; and the defeat is slow, low and minor, a piano over strings and a choir, falling to
 * its own keynote and staying there.)
 */
export const JINGLES = [
  { id: 'wedge', name: 'A Golden Wedge', bpm: 132, chords: ['G', 'C', 'G'], parts: [
    { type: 'line', con: 'ps1', v: 'brass', vol: 1, gate: 0.9, bars: ['D5:2 G5:2 B5:2 D6:6 B5:2 D6:2', 'E6:4 C6:4 E6:4 G6:4', 'G6:12 -:4'] },
    { type: 'pad', con: 'ps1', v: 'strings', vol: 0.5, oct: 4 },
    { type: 'bass', con: 'ps1', v: 'bass', vol: 0.9, oct: 2, pat: ['r...r...r...r...', 'r...r...r...r...', 'r---------------'] },
    { type: 'hit', con: 'ps1', v: 'hit', vol: 0.7, oct: 4, bars: [2] },
  ] },
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
