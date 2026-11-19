// The worlds' own sound: each world has its own bed and far-off noises, the beds loop without a click and sit at a
// sensible level, and the far-off noises come about as often as they should.
import { sfx, type SfxName } from '../src/audio/synth';
import { Ambience, WORLD_SOUND, worldSoundFor } from '../src/audio/ambience';
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { MOTES, MOTE_RANGE, stepMotes, moteBrightness, type Mote } from '../src/world/motes';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const rms = (d: Float32Array): number => Math.sqrt(d.reduce((a, v) => a + v * v, 0) / d.length);

// Each of the four worlds sounds like itself.
const worlds = ['cistern', 'foundry', 'hollows', 'keep'];
const beds = worlds.map((w) => {
  const l = LEVELS.find((x) => x.id === w)!;
  return worldSoundFor(l.theme, !!l.hub).bed;
});
check('each world has its own bed of sound', beds.every(Boolean) && new Set(beds).size === 4, beds.join(', '));
// (The owner, 2026-11-17: "there's just this white noise that permeates in the background everywhere ... annoying the
// s*** out of me". The dream's levels are built with the cave's theme and had the cave's wind under them.)
{
  const open = [...LEVELS, ...TEST_ROOMS].filter((l) => l.sky === 'space');
  check(
    'a place under the open sky of the dream (the Toy Box, the Milky Way, the Big Dipper) has NO bed and no far-off noises: no wind among the stars, nothing dripping',
    open.length === 3
      && open.every((l) => { const w = worldSoundFor(l.theme, !!l.hub, l.sky === 'space'); return w.bed === null && w.bedVol === 0 && w.far.length === 0; }),
    open.map((l) => l.id).join(' ')
  );
  check(
    '...though they are built with the cave\'s theme, which HAS one (the wind): it is the open sky that takes it away',
    open.every((l) => worldSoundFor(l.theme, !!l.hub).bed === 'wind')
  );
  check(
    'the wind, the one bed that is a hiss, is the quietest of the beds',
    Object.values(WORLD_SOUND).filter((w) => w.bed).every((w) => w.bed === 'wind' || w.bedVol > WORLD_SOUND.cave.bedVol)
      && WORLD_SOUND.cave.bedVol <= 0.1
  );
}
check('the Club has none (just its music and the fire)', worldSoundFor('dungeon', true).bed === null && worldSoundFor('dungeon', true).far.length === 0);

// The loops.
for (const name of ['drain', 'machine', 'wind', 'hall', 'lavaBubble', 'fire'] as SfxName[]) {
  const s = sfx(name);
  const d = s.data;
  const seam = Math.abs(d[0] - d[d.length - 1]);
  const steps = d.slice(1).reduce((m, v, i) => Math.max(m, Math.abs(v - d[i])), 0);
  check(
    `${name}: a loop, long enough not to be heard repeating, with no click where it wraps`,
    s.loop
      && d.length / s.rate >= 1.4
      && seam <= steps + 0.01,
    `${(d.length / s.rate).toFixed(1)}s, seam ${seam.toFixed(3)}, biggest step ${steps.toFixed(3)}`
  );
  check(`${name}: not silent, not blaring`, rms(d) > 0.05 && rms(d) < 0.6, `rms ${rms(d).toFixed(3)}`);
}
for (const name of ['clank', 'hiss', 'pebbles', 'chainClink', 'toll'] as SfxName[]) {
  const s = sfx(name);
  const peak = s.data.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  check(`${name}: a one-off sound with something in it`, !s.loop && peak > 0.3 && s.data.length / s.rate < 4);
}

// The far-off noises: about as often as their ranges say.
{
  let seed = 7;
  const rand = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const a = new Ambience(rand);
  const keep = WORLD_SOUND.keep;
  const counts = new Map<string, number>();
  for (let t = 0; t < 600; t += 1 / 30) for (const n of a.step(1 / 30, keep)) counts.set(n.name, (counts.get(n.name) ?? 0) + 1);
  const tolls = counts.get('toll') ?? 0;
  const clinks = counts.get('chainClink') ?? 0;
  check('in ten minutes in the Keep the bell tolls now and then (every 22-45s)', tolls >= 12 && tolls <= 28, `${tolls}`);
  check('...and chains clink more often (every 5-12s)', clinks >= 48 && clinks <= 125, `${clinks}`);
  const b = new Ambience(rand);
  let first = 0;
  for (let t = 0; t < 1 && first === 0; t += 1 / 30) first += b.step(1 / 30, WORLD_SOUND.cave).length;
  check('arriving somewhere new does not set every noise off at once', first === 0);
}

// The air: each world's motes, kept round him as he moves.
{
  check(
    'each world has its own air (embers, spores, dust, mist), the Club none',
    ['foundry', 'cave', 'keep', 'sewer'].every((t) => !!MOTES[t])
      && new Set(['foundry', 'cave', 'keep', 'sewer'].map((t) => MOTES[t]!.color)).size === 4
  );
  const st = MOTES.foundry!;
  const ms: Mote[] = Array.from({ length: 50 }, (_, i) => ({ x: (i % 10) - 5, y: (i % 7), z: Math.floor(i / 10) - 2, phase: i / 50 }));
  let cx = 0;
  for (let f = 0; f < 600; f++) {
    cx += 0.15; // he runs off east
    stepMotes(ms, st, 1 / 60, f / 60, cx, 0, 0);
  }
  check(
    'the motes keep round him however far he runs',
    ms.every((m) => Math.abs(m.x - cx) <= MOTE_RANGE && Math.abs(m.z) <= MOTE_RANGE && m.y >= st.low - 0.01 && m.y <= st.high + 0.01)
  );
  const y0 = ms.map((m) => m.y);
  stepMotes(ms, st, 0.1, 10, cx, 0, 0);
  const rose = ms.filter((m, i) => m.y > y0[i] || m.y < y0[i] - 1).length;
  check('embers rise', rose === ms.length);
  const dust = MOTES.keep!;
  check('dust in the Keep falls', dust.rise < 0);
  check(
    'motes fade out towards the edge of the field',
    moteBrightness({ x: MOTE_RANGE * 0.99, y: 0, z: 0, phase: 0 }, st, 0, 0, 0) < 0.05
      && moteBrightness({ x: 0.5, y: 0, z: 0, phase: 0 }, st, 0, 0, 0) > 0.15
  );
}

console.log(failures === 0 ? 'ambience: all pass' : `ambience: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
