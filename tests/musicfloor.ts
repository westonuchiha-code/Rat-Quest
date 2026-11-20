// MUSIC UNDERFOOT (world/musicFloor.ts, the Music Room: levels/musicroom.ts, 2026-11-20): a floor piano whose keys
// each play their own note, and an echo puzzle that plays a tune and listens for it back.
import './../src/core/colorSetup';
import { MusicFloor, ECHO, noteRate, type MusicEvent } from '../src/world/musicFloor';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { pianoKeys } from '../src/levels/musicroom';
import { SFX_NAMES, sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const DT = 1 / 60;
const room = levelById('musicroom')!;
const ch = buildChamber(room as never);
const pads = ch.music?.pads ?? [];
check('the Music Room has its piano (8 white keys, 5 black) and its echo puzzle (4 pads and a start pad)', pads.filter((p) => p.kind === 'key' && !p.black).length === 8 && pads.filter((p) => p.black).length === 5 && pads.filter((p) => p.kind === 'chime').length === 5);
const step = (f: MusicFloor, at: { x: number; y: number; z: number } | null, seconds = DT): MusicEvent[] => {
  const out: MusicEvent[] = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) out.push(...f.update(DT, at ?? { x: 999, y: 0, z: 999 }, !!at));
  return out;
};
const on = (i: number): { x: number; y: number; z: number } => ({ x: pads[i].x, y: pads[i].y, z: pads[i].z });

// ---- The piano ----
{
  const f = new MusicFloor(pads);
  const keys = pads.map((p, i) => [p, i] as const).filter(([p]) => p.kind === 'key').sort((a, b) => a[0].note - b[0].note);
  const heard: number[] = [];
  for (const [, i] of keys) {
    // (Off it, then onto it: he lands on each in turn.)
    step(f, null, 0.1);
    for (const e of step(f, on(i), 0.2)) if (e.kind === 'note') heard.push(e.note);
  }
  check('every key, stepped on, plays its own note once: a whole octave from middle C, in semitones', heard.join() === Array.from({ length: 13 }, (_, k) => k).join(), heard.join());
  const black = keys.find(([p]) => p.black)![1];
  step(f, null, 0.1);
  const onBlack = step(f, on(black), 0.2).filter((e) => e.kind === 'note');
  check('...a black key stood on sounds itself, not the white key it stands over', onBlack.length === 1 && onBlack[0].kind === 'note' && onBlack[0].note === pads[black].note);
  check('...standing still on a key, it sounds once, not again and again', step(f, on(black), 2).length === 0);
  check('...and in the air over it, nothing: only landing plays it', step(f, null, 0.1).length === 0 && f.update(DT, on(black), false).length === 0);
  check('...the chip note goes up an octave at twice the speed, and a semitone at about 1.06', Math.abs(noteRate(12) - 2) < 1e-9 && Math.abs(noteRate(1) - 1.0595) < 1e-4);
}

// ---- The echo puzzle ----
{
  const f = new MusicFloor(pads);
  const start = pads.findIndex((p) => p.slot === -1);
  const bySlot = (s: number): number => pads.findIndex((p) => p.kind === 'chime' && p.slot === s);
  check('the echo puzzle waits to be started', f.stateOf('echo') === 'idle');
  // Play it badly first: start, listen, then the wrong pad.
  step(f, null, 0.1);
  step(f, on(start), 0.1);
  const tune1 = f.tuneOf('echo');
  const played = step(f, null, ECHO.before + ECHO.gap * (tune1.length + 1)).filter((e) => e.kind === 'note').map((e) => (e.kind === 'note' ? e.pad : -1));
  check(`standing on the start pad, it plays a tune of ${ECHO.firstLength} on its pads, lighting each, then listens`, tune1.length === ECHO.firstLength && played.join() === tune1.map(bySlot).join() && f.stateOf('echo') === 'listening', `tune ${tune1.join(' ')}`);
  const wrongSlot = (tune1[0] + 1) % 4;
  step(f, null, 0.1);
  const wrong = step(f, on(bySlot(wrongSlot)), 0.1);
  check('...a wrong pad: a buzz, and it waits for the start pad again', wrong.some((e) => e.kind === 'wrong') && f.stateOf('echo') === 'idle');
  // Now properly: three rounds.
  step(f, null, 0.1);
  step(f, on(start), 0.1);
  let rounds = 0;
  let lengths: number[] = [];
  let solved = false;
  for (let r = 0; r < ECHO.rounds; r++) {
    const tune = f.tuneOf('echo');
    lengths.push(tune.length);
    step(f, null, ECHO.before + 0.5 + ECHO.gap * (tune.length + 1));
    for (const s of tune) {
      step(f, null, 0.1);
      for (const e of step(f, on(bySlot(s)), 0.15)) {
        if (e.kind === 'round') rounds++;
        if (e.kind === 'solved') solved = true;
      }
    }
  }
  check(`...played back right, the next round is a note longer, ${ECHO.rounds} rounds in all`, lengths.join() === Array.from({ length: ECHO.rounds }, (_, k) => ECHO.firstLength + k).join() && rounds === ECHO.rounds - 1, `lengths ${lengths.join(', ')}`);
  check('...and then it is SOLVED: every pad of it flashes', solved && f.solved('echo') && pads.every((p, i) => p.kind !== 'chime' || f.flash[i] > 0));
  lengths = [];
}

// ---- The sounds ----
check('the chip note and the wrong-answer buzz are sounds the game has, and make a sound', SFX_NAMES.includes('chipNote') && SFX_NAMES.includes('chipBuzz') && sfx('chipNote').data.some((v) => Math.abs(v) > 0.2) && sfx('chipBuzz').data.some((v) => Math.abs(v) > 0.2));
check('(the piano can be laid at any height: its keys say so)', pianoKeys(3).every((k) => k.kind === 'floorkey' && k.y === 3));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
