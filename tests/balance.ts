// The game's balance: each Club door asks for well under what a player could have by then (so no one hard wedge is ever
// needed), the doors climb, and Pip's shop is a goal across the worlds (all of it affordable, but not from the first alone).
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS, doorLetsIn } from '../src/levels/junction';
import { SHOP } from '../src/data/shop';
import { BALANCE } from '../src/data/balance';
import { TWEAKS, Tweaks, readTweak } from '../src/core/tweaks';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inWorld = (w: string) => LEVELS.filter((l) => l.world === w);
const wedges = (w: string) => inWorld(w).reduce((n, l) => n + (l.wedges?.length ?? 0), 0);
// (What they are worth in his purse: a hunk of cheese counts as several crumbs.)
const count = (w: string, kind: string) => inWorld(w).reduce((n, l) => n + l.collectibles.filter((c) => c.kind === kind).reduce((m, c) => m + (c.worth ?? 1), 0), 0);

// The worlds in the order their doors open.
const order = [...HUB_DOORS].sort((a, b) => a.need - b.need).map((d) => d.to!);
check('the doors open in order: Cistern, Foundry, Hollows, Keep', order.join(',') === 'cistern,foundry,hollows,keep', order.join(','));
let open = 0;
const report: string[] = [];
for (let i = 0; i < order.length; i++) {
  const d = HUB_DOORS.find((x) => x.to === order[i])!;
  if (i > 0) {
    const share = d.need / open;
    report.push(`${order[i]} ${d.need}/${open} = ${Math.round(share * 100)}%`);
    check(
      `the ${order[i]} door leaves room to skip wedges (asks for at most two thirds of the ${open} open by then)`,
      share <= 2 / 3 + 1e-9,
      `${d.need} of ${open}`
    );
    check(`...but asks for real progress (at least a quarter)`, share >= 0.25, `${d.need} of ${open}`);
  }
  open += wedges(order[i]);
}
console.log('      ' + report.join('; '));
// The shares the doors were set at. (They were once left behind while nine wedges were added, and every door got a
// little easier than it was meant to be. Add wedges to a world and these will say the doors want looking at.)
{
  const need = (w: string): number => HUB_DOORS.find((d) => d.to === w)!.need;
  const before = (w: string): number => order.slice(0, order.indexOf(w)).reduce((n, x) => n + wedges(x), 0);
  const share = (w: string): number => need(w) / before(w);
  check(
    'the Foundry door asks about a third of the Cistern\'s wedges',
    share('foundry') >= 0.28
      && share('foundry') <= 0.36,
    `${need('foundry')} of ${before('foundry')}`
  );
  check(
    'the Hollows door asks a little under half of what is open by then',
    share('hollows') >= 0.39
      && share('hollows') <= 0.48,
    `${need('hollows')} of ${before('hollows')}`
  );
  check('the Keep, the last door, asks just under two thirds', share('keep') >= 0.58 && share('keep') <= 2 / 3, `${need('keep')} of ${before('keep')}`);
  check(
    'the last door cannot be opened from the first world alone',
    need('keep') > wedges('cistern'),
    `the Keep asks ${need('keep')}; the Cistern has ${wedges('cistern')}`
  );
  // A door he has been through stays open, whatever it asks now.
  check(
    'a door lets him in with the wedges it asks for, and not with one fewer',
    doorLetsIn(need('keep'), need('keep'), false)
      && !doorLetsIn(need('keep'), need('keep') - 1, false)
  );
  check(
    'a door he has already been through stays open, though its price has gone up since (an old save is not shut out of a world it had reached)',
    doorLetsIn(need('keep'), 20, true)
      && doorLetsIn(need('hollows'), 10, true)
      && doorLetsIn(need('foundry'), 4, true)
  );
}
check(
  'each door asks for more than the one before',
  order.slice(1).every((w, i) => HUB_DOORS.find((d) => d.to === w)!.need > HUB_DOORS.find((d) => d.to === order[i])!.need)
);

// The shop.
const crumbs = order.reduce((n, w) => n + count(w, 'crumb'), 0);
const caps = order.reduce((n, w) => n + count(w, 'cap'), 0);
const gear = SHOP.filter((s) => s.kind === 'gear');
const gearCrumbs = gear.reduce((n, s) => n + s.crumbs, 0);
const gearCaps = gear.reduce((n, s) => n + s.caps, 0);
check(
  'all of Pip\'s gear can be bought with what the worlds hold',
  gearCrumbs <= crumbs
    && gearCaps <= caps,
  `${gearCrumbs}/${crumbs} crumbs, ${gearCaps}/${caps} caps`
);
check(
  '...but not out of the first world alone',
  gearCrumbs > count('cistern', 'crumb') || gearCaps > count('cistern', 'cap'),
  `the Cistern has ${count('cistern', 'crumb')} crumbs, ${count('cistern', 'cap')} caps`
);
check('the finer things cost more', gear.every((s, i) => i === 0 || s.crumbs >= gear[i - 1].crumbs));
check('a snack costs less than any gear', SHOP.filter((s) => s.kind === 'snack').every((s) => s.crumbs < Math.min(...gear.map((g) => g.crumbs))));

// Tunable: the sliders reach the doors and the prices, and the game reads them at once.
check(
  'every door and every price is on a slider in Tweaks',
  ['foundry', 'hollows', 'keep'].every((w) => TWEAKS.some((t) => t.path === `balance.doors.${w}`))
    && Object.keys(BALANCE.prices).every((id) => TWEAKS.some((t) => t.path === `balance.prices.${id}.crumbs`))
);
{
  const mem = new Map<string, string>();
  const tw = new Tweaks({ getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) });
  const keepWas = readTweak('balance.doors.keep');
  const priceWas = SHOP.find((s) => s.id === 'mossScarf')!.crumbs;
  tw.set('balance.doors.keep', 25);
  tw.set('balance.prices.mossScarf.crumbs', 99);
  const seen = HUB_DOORS.find((d) => d.to === 'keep')!.need === 25 && { ...HUB_DOORS.find((d) => d.to === 'keep')! }.need === 25 && SHOP.find((s) => s.id === 'mossScarf')!.crumbs === 99;
  tw.set('balance.doors.keep', keepWas);
  tw.set('balance.prices.mossScarf.crumbs', priceWas);
  check('a slider changes the door and the price straight away (copies too)', seen);
}

console.log(failures === 0 ? 'balance: all pass' : `balance: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
