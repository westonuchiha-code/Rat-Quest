// The dream's creatures speak in the voices of old speech chips (src/audio/dreamVoices.ts, robotVoices.ts).
// The owner, 2026-11-17: "let's give the creatures for the glitch world robotic voices ... their attacks they can say a
// word, when they die they can say a word, you can even approximate like grunts". And his rule: "I only want it to be
// used for speech in the wacky Pomo world."
// Holds: that ONLY the dream's levels speak so; that a creature says a word as it attacks (and not a stream of them),
// grunts when struck, and says one as it goes down; that each kind has its voice and every voice has every sound.
import { DreamVoices, speaksRobot, voiceOf, ATTACK_WORD_EVERY } from '../src/audio/dreamVoices';
import { ROBOT_VOICES } from '../src/audio/robotVoices';
import { decodeRecorded } from '../src/audio/synth';
import { LEVELS, ARCHIVE, TEST_ROOMS } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const all = [...LEVELS, ...ARCHIVE, ...TEST_ROOMS];
const speaking = all.filter((l) => speaksRobot(l)).map((l) => l.id).sort();
check('the robot voice speaks ONLY in the dream: the Milky Way and the Big Dipper, and in no other level of the game', speaking.join() === 'bigdipper,milkyway', speaking.join());
check('...and every level that has the dream\'s look speaks so', all.filter((l) => l.look === 'dream').every((l) => speaksRobot(l)));

const foe = { alive: true, hp: 6, attackActive: false, attacking: false };
const v = new DreamVoices<typeof foe>();
const step = (dt = 1 / 60): string => v.step(dt, [foe]).map((c) => c.cry).join();
check('a creature just met says nothing for being as it is', step() === '' && step() === '');
foe.attacking = true;
check('it says a word as it begins an attack, once', step() === 'attack' && step() === '');
foe.attacking = false; step(); foe.attacking = true;
check('...and not another straight after (a flurry is one word)', step() === '');
foe.attacking = false; step(ATTACK_WORD_EVERY + 0.1); foe.attacking = true;
check('...but again when it attacks later', step() === 'attack');
foe.hp = 4;
check('struck, it grunts', step() === 'hurt');
foe.hp = 0; foe.alive = false;
check('going down, it says its last word (and does not grunt as well)', step() === 'die' && step() === '');
const bare = { alive: true, attackActive: false };
const v2 = new DreamVoices<typeof bare & { hp?: number }>();
v2.step(0.1, [bare]); bare.attackActive = true;
check('one that only says when its blow can land speaks then', v2.step(0.1, [bare]).map((c) => c.cry).join() === 'attack');

check('a roach is tiny, a mantis high, a Stag Knight low, anything else plain', voiceOf('scuttler') === 'small' && voiceOf('mantis') === 'thin' && voiceOf('stag') === 'big' && voiceOf('toad') === 'plain');
const lens: string[] = [];
let ok = true;
let bytes = 0;
for (const [name, cries] of Object.entries(ROBOT_VOICES)) for (const cry of ['attack', 'hurt', 'die'] as const) {
  const list = cries[cry];
  if (list.length < 2) ok = false;
  for (const r of list) {
    const s = decodeRecorded(r);
    const secs = s.data.length / s.rate;
    const peak = s.data.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
    bytes += r.b64.length;
    if (secs < 0.08 || secs > 1.3 || peak < 0.5) { ok = false; lens.push(`${name} ${cry} ${secs.toFixed(2)}s peak ${peak.toFixed(2)}`); }
  }
}
check('every voice has two or more sounds for an attack, for being struck and for its end; each a real sound, none over a second and a third', ok, lens.join('; '));
check('a grunt is shorter than a word: every voice\'s "hurt" sounds are under half a second', Object.values(ROBOT_VOICES).every((c) => c.hurt.every((r) => decodeRecorded(r).data.length / r.rate < 0.5)));
check('all the voices together add under a quarter of a megabyte to the game', bytes < 256 * 1024, `${(bytes / 1024).toFixed(0)} KB`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
