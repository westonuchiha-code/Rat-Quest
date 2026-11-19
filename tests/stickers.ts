// The sticker book: discoveries are remembered, ids are unique, and talk-box names map to characters.
import { Discoveries } from '../src/core/stickers';
import { STICKERS, charIdFor } from '../src/data/stickers';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), d };
};

const st = mem();
const a = new Discoveries(st);
check('nothing found at first', a.count() === 0 && !a.has('char:pip'));
check('the first find says so, the second does not', a.add('char:pip') === true && a.add('char:pip') === false);
check('finds are saved and come back', new Discoveries(st).has('char:pip'));
st.d['ratquest.stickers.v1'] = '{oops';
check('a damaged save is ignored', new Discoveries(st).count() === 0);
check('with no storage it still works for this session', (() => { const d = new Discoveries(null); d.add('x'); return d.has('x'); })());
check('sticker ids are unique', new Set(STICKERS.map((s) => s.id)).size === STICKERS.length);
check('every sticker has a name and a blurb', STICKERS.every((s) => s.name && s.blurb.length > 10));
check(
  'talk-box names find their sticker',
  charIdFor('Lord Grimsqueak') === 'char:grimsqueak'
    && charIdFor('Dizzy Dave') === 'char:dave'
    && charIdFor('Mellow Mort') === 'char:mort'
    && charIdFor('Wren') === 'char:wren'
    && charIdFor('Pip') === 'char:pip'
    && charIdFor('Finch') === 'char:finch'
    && charIdFor('Stranger') === null
);
check(
  'every character sticker can be found by talking',
  ['dave', 'mort', 'wren', 'pip', 'finch', 'grimsqueak'].every((n) => STICKERS.some((s) => s.id === `char:${n}`))
);

console.log(failures === 0 ? 'stickers: all pass' : `stickers: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
