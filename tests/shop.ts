// Pip's shop: the purse adds up, paying works and is kept, and everything on sale is real.
import { Wallet } from '../src/core/wallet';
import { SHOP } from '../src/data/shop';
import { ITEMS } from '../src/data/equipment';
import { CONSUMABLES } from '../src/data/consumables';
import { LEVELS } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const mem = () => {
  const d: Record<string, string> = {};
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), d };
};

let earned = { crumbs: 20, caps: 3 };
const st = mem();
const w = new Wallet(st, () => earned);
check('the purse is what he has picked up', w.balance().crumbs === 20 && w.balance().caps === 3);
check('he can pay for what he can afford', w.pay({ crumbs: 12, caps: 1 }) && w.balance().crumbs === 8 && w.balance().caps === 2);
check('he cannot pay for what he cannot', !w.pay({ crumbs: 9, caps: 0 }) && w.balance().crumbs === 8);
earned = { crumbs: 30, caps: 3 };
check('picking up more adds to it', w.balance().crumbs === 18);
check('what he spent is kept', new Wallet(st, () => earned).balance().crumbs === 18);
w.reset();
check('a new game spends nothing', new Wallet(st, () => earned).balance().crumbs === 30);
st.d['ratquest.wallet.v1'] = 'nope';
check('a broken purse is ignored', new Wallet(st, () => earned).balance().crumbs === 30);

check('everything on sale exists', SHOP.every((s) => (s.kind === 'gear' ? !!ITEMS[s.id] : !!CONSUMABLES[s.id])));
check('nothing is free, and caps only on the finer things', SHOP.every((s) => s.crumbs > 0 && s.caps <= s.crumbs));
check('he never sells the starting gear', !SHOP.some((s) => ['tinHelm', 'ratSword', 'ratShield', 'redScarf'].includes(s.id)));
const club = LEVELS.find((l) => l.hub)!;
const pip = club.npcs?.find((n) => n.name === 'PIP');
check('Pip keeps the shop in the Club', !!pip?.shop && (pip?.lines.length ?? 0) > 0);
// What the first world holds pays for at least a snack and a scarf.
const crumbs = LEVELS.filter((l) => (l.world ?? l.id) === 'cistern').reduce((n, l) => n + l.collectibles.filter((c) => c.kind === 'crumb').length, 0);
check('the first world pays for a snack and the first scarf', crumbs >= SHOP[0].crumbs + SHOP[1].crumbs, `${crumbs} crumbs`);

console.log(failures === 0 ? 'shop: all pass' : `shop: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
