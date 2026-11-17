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

/** Two short pieces that are played once (no drums, no loop). */
export const JINGLES = [
  { id: 'wedge', name: 'A Golden Wedge', bpm: 150, chords: ['G', 'G'], parts: [
    { type: 'line', con: 'nes', v: 'p25', vol: 1, gate: 0.9, bars: ['G4:2 B4:2 D5:2 G5:2 B5:2 D6:2 G6:4', 'G6:12 -:4'] },
    { type: 'line', con: 'nes', v: 'p50', vol: 0.5, gate: 0.9, bars: ['-:4 G4:2 B4:2 D5:2 G5:2 B5:4', 'D6:12 -:4'] },
    { type: 'bass', con: 'nes', v: 'tri', vol: 1, oct: 3, pat: ['r...r...r...r...', 'r-----------....'] },
  ] },
  { id: 'defeat', name: 'Down He Goes', bpm: 100, chords: ['Am', 'E'], parts: [
    { type: 'line', con: 'nes', v: 'p25', vol: 1, gate: 0.95, bars: ['E5:3 D5:1 C5:4 A4:4 C5:4', 'B4:4 G#4:4 E4:8'] },
    { type: 'bass', con: 'nes', v: 'tri', vol: 1, oct: 3, pat: ['r.......r.......', 'r-----------....'] },
  ] },
];

/** A song (or jingle) as the Studio wants it: takes of notes in seconds. */
export function toStudio(s) {
  const six = 60 / s.bpm / 4;
  const bars = s.chords.length;
  const takes = [];
  for (const p of s.parts) {
    const notes = [];
    const put = (step, len, m, extra = {}) => notes.push({ t: +(step * six).toFixed(5), d: +(Math.max(0.03, len * six * (p.gate ?? 0.9))).toFixed(5), c: p.con, v: p.v, m, ...extra });
    for (let b = 0; b < bars; b++) {
      const ch = chord(s.chords[b]);
      const base = 12 * ((p.oct ?? 4) + 1) + ch.root;
      const tone = (i) => base + ch.tones[i % ch.tones.length] + 12 * Math.floor(i / ch.tones.length);
      const at = b * 16;
      if (p.type === 'line') {
        let step = 0;
        for (const tok of p.bars[b].split(/\s+/)) {
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
