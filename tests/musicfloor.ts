// MUSIC UNDERFOOT (world/musicFloor.ts, the Music Room: levels/musicroom.ts, 2026-11-20): a floor piano whose keys
// each play their own note, and an echo puzzle that plays a tune and listens for it back.
import './../src/core/colorSetup';
import { MusicFloor, ECHO, noteRate, type MusicEvent } from '../src/world/musicFloor';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { pianoKeys } from '../src/levels/musicroom';
import { SFX_NAMES, sfx } from '../src/audio/synth';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { strikeThings } from '../src/world/strikeables';
import { BELLS } from '../src/levels/musicroom';

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

// ---- The bell echo: the same puzzle, on bells struck with the sword ----
{
  const things = ch.strike?.things ?? [];
  const bellThings = things.filter((t) => t.kind === 'bell');
  check('the Music Room has five bells (four and a white start bell), each a music pad of the "bells" puzzle', bellThings.length === 5 && bellThings.every((t) => t.pad !== undefined && pads[t.pad!].kind === 'bell' && pads[t.pad!].puzzle === 'bells'));
  check('...in D minor (D, F, A, the D above): not the pads\' C major', pads.filter((p) => p.kind === 'bell' && (p.slot ?? -1) >= 0).sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0)).map((p) => p.note).join() === '2,5,9,14');
  const f = new MusicFloor(pads);
  const bellPad = (slot: number): number => pads.findIndex((p) => p.kind === 'bell' && p.slot === slot);
  // Standing right under a bell does not sound it: bells are struck, not stepped on.
  const b0 = pads[bellPad(0)];
  check('standing under a bell does not sound it', step(f, { x: b0.x, y: 0, z: b0.z }, 0.3).length === 0 && step(f, { x: b0.x, y: b0.y, z: b0.z }, 0.3).length === 0);
  // The real rat, in front of the white bell, swings: it rings once, and the puzzle starts and plays its tune.
  const startT = bellThings.find((t) => pads[t.pad!].slot === -1)!;
  const rat = new PlayerController(new THREE.Vector3(BELLS.start.x, 0, BELLS.start.z + 1.1));
  const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
  for (let i = 0; i < 20; i++) rat.update(DT, input(), ch.colliders);
  rat.facing = Math.PI;
  rat.update(DT, input({ attackPressed: true }), ch.colliders);
  let rings = 0;
  for (let i = 0; i < 40; i++) {
    rat.update(DT, input(), ch.colliders);
    for (const e of strikeThings(things, rat)) {
      if (e.kind !== 'ring') continue;
      rings++;
      f.strike(things[e.index].pad!);
    }
    step(f, null);
  }
  check('the rat\'s swing at the white bell rings it once, and the bell echo starts', rings === 1 && things[things.indexOf(startT)] === startT && f.stateOf('bells') === 'playing', `rings ${rings}, ${f.stateOf('bells')}`);
  // Now answered by striking the bells (as a swing at each would): three rounds and it is solved.
  let solved = false;
  for (let r = 0; r < ECHO.rounds; r++) {
    const tune = f.tuneOf('bells');
    step(f, null, ECHO.before + 0.5 + ECHO.gap * (tune.length + 1));
    for (const sl of tune) {
      f.strike(bellPad(sl));
      for (const e of step(f, null, 0.2)) if (e.kind === 'solved') solved = true;
    }
  }
  check('struck back right, three rounds, the bell echo is SOLVED', solved && f.solved('bells') && !f.solved('echo'));
  check('...and the Music Room has a gate in the west wall that it opens (and the pads\' gate in the east)', ch.gates.some((g) => g.spec.echo === 'bells' && g.spec.x < 0) && ch.gates.some((g) => g.spec.echo === 'echo' && g.spec.x > 0));
  // A bell with no puzzle just sounds its note.
  const lone = new MusicFloor([{ kind: 'bell', x: 0, y: 0.35, z: 0, w: 0.8, d: 0.8, note: 7 }]);
  lone.strike(0);
  const heard = lone.update(DT, { x: 9, y: 0, z: 9 }, true);
  check('a bell on its own (no puzzle) sounds its note when struck', heard.length === 1 && heard[0].kind === 'note' && heard[0].note === 7);
  check('the bell\'s sound is one the game has, and makes a sound', SFX_NAMES.includes('bellNote') && sfx('bellNote').data.some((v) => Math.abs(v) > 0.2));
}

// ---- The sounds ----
check('the chip note and the wrong-answer buzz are sounds the game has, and make a sound', SFX_NAMES.includes('chipNote') && SFX_NAMES.includes('chipBuzz') && sfx('chipNote').data.some((v) => Math.abs(v) > 0.2) && sfx('chipBuzz').data.some((v) => Math.abs(v) > 0.2));
check('(the piano can be laid at any height: its keys say so)', pianoKeys(3).every((k) => k.kind === 'floorkey' && k.y === 3));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
