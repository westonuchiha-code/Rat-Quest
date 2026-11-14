// Dynamic music: lane layers follow the mood, and water muffles.
import { CALM, TRACK_NAMES, layerGain, trackNamed, waterCutoff } from '../src/audio/music';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const lane = (layer: 'base' | 'combat' | 'calm' | undefined, floor?: number) => ({ inst: 'kick' as const, gain: 1, verb: 0, attack: 0, release: 0, notes: [], layer, floor });

check('a base lane never changes', layerGain(lane('base'), { combat: 1, water: 0 }) === 1 && layerGain(lane(undefined), { combat: 0.5, water: 0 }) === 1);
check('a combat lane is silent when calm and full in a fight', layerGain(lane('combat'), CALM) === 0 && layerGain(lane('combat'), { combat: 1, water: 0 }) === 1);
check('a combat lane with a floor never drops below it', layerGain(lane('combat', 0.35), CALM) === 0.35);
check('a calm lane thins out in a fight but stays', layerGain(lane('calm'), { combat: 1, water: 0 }) > 0.25 && layerGain(lane('calm'), CALM) === 1);
check('the mood is clamped', layerGain(lane('combat'), { combat: 9, water: 0 }) === 1 && layerGain(lane('combat'), { combat: -3, water: 0 }) === 0);
check('dry land leaves the sound open, water muffles it', waterCutoff(CALM) > 17000 && waterCutoff({ combat: 0, water: 1 }) < 800 && waterCutoff({ combat: 0, water: 0.5 }) > waterCutoff({ combat: 0, water: 1 }));
for (const n of TRACK_NAMES) {
  const t = trackNamed(n);
  const combat = t.lanes.filter((l) => l.layer === 'combat').length;
  check(`${n}: ${n === 'groove' ? 'the hangout music does not change with fights' : 'has drums that come in with a fight'}`, n === 'groove' ? combat === 0 : combat >= 2);
}
console.log(failures === 0 ? 'music: all pass' : `music: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
