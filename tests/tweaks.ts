// Tweaks: sliders write into the tuning tables, are kept, can be reset, copied and pasted back.
import { TWEAKS, Tweaks, defaultTweak, readTweak } from '../src/core/tweaks';
import { TUNING } from '../src/data/tuning';
import { TOAD } from '../src/enemies/toad';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), d };
};

check('every slider points at a real number', TWEAKS.every((t) => Number.isFinite(readTweak(t.path))), TWEAKS.filter((t) => !Number.isFinite(readTweak(t.path))).map((t) => t.path).join());
check('every default sits inside its slider', TWEAKS.every((t) => defaultTweak(t.path) >= t.min && defaultTweak(t.path) <= t.max), TWEAKS.filter((t) => defaultTweak(t.path) < t.min || defaultTweak(t.path) > t.max).map((t) => t.path).join());
check('slider paths are unique', new Set(TWEAKS.map((t) => t.path)).size === TWEAKS.length);

const st = mem();
const tw = new Tweaks(st);
check('nothing changed at first', tw.count() === 0);
tw.set('jump.velocity', 12);
check('a slider changes the game value', TUNING.jump.velocity === 12);
tw.set('toad.hp', 7);
check('...in the enemy tables too', TOAD.hp === 7);
tw.set('jump.velocity', 999);
check('values are kept inside the slider', TUNING.jump.velocity === 16);
check('changes are kept on the device', JSON.parse(st.d['ratquest.tweaks.v1'])['toad.hp'] === 7);
const text = tw.text();
check('copied text lists the changes', text.includes('Toads / Health: 3 -> 7') && text.includes('JSON:'));
tw.reset();
check('reset puts everything back', TUNING.jump.velocity === 9.5 && TOAD.hp === 3 && tw.count() === 0);
const again = new Tweaks(mem());
check('pasting the copied text applies it', again.load(text) === 2 && TOAD.hp === 7 && TUNING.jump.velocity === 16);
again.reset();
check('a fresh start reads what was kept', (() => { const s2 = mem(); s2.setItem('ratquest.tweaks.v1', '{"move.run":8}'); new Tweaks(s2); const ok = TUNING.move.run === 8; new Tweaks(s2).reset(); return ok; })());
check('broken saved tweaks are ignored', (() => { const s3 = mem(); s3.setItem('ratquest.tweaks.v1', '{oops'); return new Tweaks(s3).count() === 0; })());

console.log(failures === 0 ? 'tweaks: all pass' : `tweaks: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
