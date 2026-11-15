// Menu navigation without a browser: a tiny fake document is enough because the menu only needs a few DOM calls.
import { Menu } from '../src/ui/menu';
import { Equipment } from '../src/player/equipment';
import { Inventory } from '../src/player/inventory';
import { doorLetsIn, doorState, doorWords, HUB_DOORS } from '../src/levels/junction';
import { BALANCE } from '../src/data/balance';
import type { LevelRow } from '../src/ui/menu';

const fakeEl = (): Record<string, unknown> => ({
  className: '',
  innerHTML: '',
  classList: { add() {}, remove() {} },
  appendChild() {},
  addEventListener() {},
});
(globalThis as unknown as { document: unknown }).document = { createElement: fakeEl, head: { appendChild() {} } };

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const eq = new Equipment(null);
const inv = new Inventory(null);
let hp = 3;
const used: string[] = [];
const went: string[] = [];
eq.give('emberHelm');
let saved = 0;
let loaded = 0;
let restarted = 0;
let hasSave: number | null = null;
let toggles: boolean[] = [];
const previews: Array<string | null> = [];
const menu = new Menu(fakeEl() as unknown as HTMLElement, {
  equipment: eq,
  inventory: inv,
  useItem: (id) => {
    if (hp >= 5) return 'Already at full health.';
    if (!inv.remove(id)) return null;
    hp = Math.min(5, hp + 2);
    used.push(id);
    return 'ate';
  },
  quest: () => ({ name: 'Test', goals: [{ label: 'Do it', text: '1/2', done: false }], collectibles: [] }),
  levels: () => [{ id: 'a', name: 'A', blurb: '', cleared: false, perfect: false, current: true }, { id: 'b', name: 'B', blurb: '', cleared: true, perfect: false, current: false }],
  goLevel: (id) => went.push(id),
  health: () => ({ hp: 5, max: 5 }),
  previewItem: (it) => previews.push(it ? it.id : null),
  save: () => {
    saved++;
    hasSave = 1;
    return true;
  },
  load: () => {
    loaded++;
    return hasSave !== null;
  },
  savedAt: () => hasSave,
  restart: () => restarted++,
  onToggle: (o) => toggles.push(o),
});

check('menu starts closed and ignores presses', !menu.open && (menu.press('confirm'), !menu.open));
menu.toggle();
check('START opens it', menu.open && toggles.join() === 'true');
menu.press('back');
check('back closes it', !menu.open && toggles.join() === 'true,false');

// Equip the ember helm: tab to EQUIP, step into the grid, pick it, confirm.
menu.show();
menu.press('tabNext');
menu.press('right'); // from the slot list into the grid
menu.press('right'); // second helmet
check('looking at an owned item tries it on the preview', previews[previews.length - 1] === 'emberHelm', String(previews[previews.length - 1]));
menu.press('confirm');
check('confirming puts the ember helm on', eq.equipped('helmet') === 'emberHelm');
menu.press('left');
menu.press('confirm');
check('picking the first one puts the tin helm back on', eq.equipped('helmet') === 'tinHelm');
menu.press('left'); // off the left edge, back to the slot list
menu.press('down'); // sword
menu.press('right');
menu.press('confirm');
check('a slot with one item keeps it', eq.equipped('sword') === 'ratSword');
menu.press('left');
menu.press('up'); // helmet again
menu.press('left');

// ITEMS holds usable things, not gear.
inv.add('nachoCheese', 2);
menu.press('tabPrev'); // ITEMS
menu.press('confirm');
check('using a nacho cheese heals and uses one up', used.length === 1 && hp === 5 && inv.count('nachoCheese') === 1);
menu.press('confirm');
check('at full health it is not used up', used.length === 1 && inv.count('nachoCheese') === 1);
menu.press('right'); // an empty square
menu.press('confirm');
check('an empty square does nothing', used.length === 1);
menu.press('left');
for (let i = 0; i < 40; i++) menu.press('down');
check('the item cursor stays inside the grid', menu.open);
menu.press('tabNext'); // EQUIP
menu.press('right');
menu.press('right');
menu.press('confirm');
eq.equip('emberHelm');
check('gear is worn from EQUIP', eq.equipped('helmet') === 'emberHelm');

// Save screen.
menu.press('tabNext'); // QUEST
menu.press('tabNext'); // SAVE
menu.press('confirm');
check('SAVE GAME saves', saved === 1);
menu.press('down');
menu.press('confirm');
check('LOAD loads and closes the menu', loaded === 1 && !menu.open);
menu.show(); // still on the SAVE screen, cursor on LOAD
menu.press('down'); // RESTART
menu.press('confirm');
check('restart needs a second confirm', restarted === 0 && menu.open);
menu.press('confirm');
check('the second confirm restarts and closes', restarted === 1 && !menu.open);
// The level list: the cursor starts on the current level; go down to the second one and select it.
menu.show(); // still on the SAVE screen
menu.press('tabNext'); // WORLDS
menu.press('down');
menu.press('confirm');
check('choosing a level goes there and closes the menu', went.join() === 'b' && !menu.open);
void toggles;
toggles = [];

// Settings on the SAVE screen: fullscreen toggles, quit needs two presses, and quit only shows in the desktop build.
let fs = false;
let quits = 0;
const desk = new Menu(fakeEl() as unknown as HTMLElement, {
  equipment: eq, inventory: inv, useItem: () => null,
  quest: () => ({ name: 'T', goals: [], collectibles: [] }), levels: () => [], goLevel: () => undefined,
  health: () => ({ hp: 5, max: 5 }), save: () => true, load: () => false, savedAt: () => null,
  restart: () => undefined, onToggle: () => undefined,
  fullscreen: () => fs, toggleFullscreen: () => { fs = !fs; }, quit: () => quits++,
});
desk.show();
for (let i = 0; i < 3; i++) desk.press('tabNext'); // SAVE
for (let i = 0; i < 3; i++) desk.press('down'); // FULLSCREEN
desk.press('confirm');
check('the fullscreen row toggles fullscreen', fs);
desk.press('down'); // CONTROLS
desk.press('confirm');
check('the controls row changes nothing', fs && quits === 0 && desk.open);
desk.press('down'); // QUIT
desk.press('confirm');
check('quit needs a second press', quits === 0);
desk.press('confirm');
check('the second press quits', quits === 1);
for (let i = 0; i < 5; i++) desk.press('down');
desk.press('up');
desk.press('confirm');
check('the cursor stops at the last row', quits === 1);

// ---- The Club's doors on the WORLDS page: what each asks, and how near he is to it ----
{
  // A door's state from what he holds.
  const F = { name: 'The Foundry', need: 5 };
  const shut = doorState(F, 3, false);
  check('a door he is short of is shut, and says how many he has of how many', !shut.open && shut.have === 3 && shut.need === 5 && doorWords(shut) === 'It wants 5 Golden Wedges. You have 3: 2 more to go.', doorWords(shut));
  const open = doorState(F, 9, false);
  check('with enough it is open, and says what it wanted', open.open && doorWords(open) === 'Open. It wanted 5 Golden Wedges; you have 9.', doorWords(open));
  const been = doorState(F, 3, true);
  check('a door he has been through stays open though he is short of what it asks now, and says so', been.open && doorLetsIn(5, 3, true) && /been through it/.test(doorWords(been)) && /asks 5 Golden Wedges now; you have 3/.test(doorWords(been)), doorWords(been));
  check('a door that asks nothing has no lock; one that asks for one says "Wedge", not "Wedges"', doorState({ name: 'The Great Cistern', need: 0 }, 0, false).open && doorWords(doorState({ name: 'x', need: 0 }, 0, false)) === 'No lock on this door: it is always open.' && /1 Golden Wedge\./.test(doorWords(doorState({ name: 'x', need: 1 }, 0, false))));
  check('the development switch that opens every door shows them open, with what he really holds', doorState(F, 0, false, true).open && doorState(F, 0, false, true).have === 0);
  check('the Club\'s own doors ask what the balance sheet says', HUB_DOORS.find((d) => d.to === 'foundry')!.need === BALANCE.doors.foundry && HUB_DOORS.find((d) => d.to === 'hollows')!.need === BALANCE.doors.hollows && HUB_DOORS.find((d) => d.to === 'keep')!.need === BALANCE.doors.keep && HUB_DOORS.find((d) => d.to === 'cistern')!.need === 0);

  // The page itself, with nine wedges in his purse.
  const have = 9;
  const doors = HUB_DOORS.filter((d) => d.to).map((d) => doorState(d, have, false));
  const row = (id: string, name: string, extra: Partial<LevelRow>): LevelRow => ({ id, name, blurb: `About ${name}.`, cleared: false, perfect: false, current: false, ...extra });
  const rows: LevelRow[] = [
    row('hub', 'The Club', { kind: 'home', current: true, doors }),
    row('cistern', 'The Great Cistern', { kind: 'world', wedges: { got: 9, of: 16 }, wedgeList: [{ name: 'A wedge', got: true }], door: doors[0] }),
    row('foundry', 'The Foundry', { kind: 'world', wedges: { got: 0, of: 12 }, wedgeList: [{ name: 'Top of the Crucible', got: false }], door: doors[1] }),
    row('hollows', 'The Hollows', { kind: 'world', wedges: { got: 0, of: 12 }, locked: true, lockText: 'Its door in the Club needs 12 Golden Wedges. You have 9.', door: doors[2] }),
    row('keep', "Grimsqueak's Keep", { kind: 'world', wedges: { got: 0, of: 7 }, locked: true, lockText: 'Its door in the Club needs 25 Golden Wedges. You have 9.', door: doors[3] }),
  ];
  const made: Array<{ innerHTML: string }> = [];
  (globalThis as unknown as { document: { createElement: () => unknown } }).document.createElement = () => {
    const el = fakeEl() as unknown as { innerHTML: string };
    made.push(el);
    return el;
  };
  const gone: string[] = [];
  const m = new Menu(fakeEl() as unknown as HTMLElement, {
    equipment: new Equipment(null), inventory: new Inventory(null), useItem: () => null,
    quest: () => ({ name: 'T', goals: [], collectibles: [] }), levels: () => rows, goLevel: (id) => gone.push(id),
    health: () => ({ hp: 5, max: 5 }), save: () => true, load: () => false, savedAt: () => null,
    restart: () => undefined, onToggle: () => undefined,
  });
  const page = (): string => made.map((e) => e.innerHTML).find((h) => typeof h === 'string' && h.includes('rq-lv')) ?? '';
  const details = (): string => page().split('DETAILS</div>')[1] ?? '';
  const text = (html: string): string => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&middot;/g, '·').replace(/&#10003;/g, '✓').replace(/\s+/g, ' ').trim();
  m.show();
  for (let i = 0; i < 4; i++) m.press('tabNext'); // WORLDS
  check('(the WORLDS page is up, with the Club chosen)', page().includes('WORLDS') && /class="rq-lv sel[^"]*home/.test(page()));
  const club = text(details());
  check('with the Club chosen, the page lists every one of its doors: its name, and what it asks or that it is open', ['The Great Cistern open', 'The Foundry ✓ 5', 'The Hollows 9 / 12', "Grimsqueak's Keep 9 / 25"].every((want) => club.includes(want)) && club.includes('THE DOORS') && club.includes('9 in your purse'), club);
  check('...the doors come before the rest of what is said about the Club, so on a small screen it is never they that are cut off', details().indexOf('THE DOORS') < details().indexOf('About The Club.') && details().indexOf('THE DOORS') > 0);
  const widths = [...details().matchAll(/rq-door row (open|shut)[\s\S]*?width:(\d+)%/g)].map((x) => `${x[1]} ${x[2]}`);
  check('...each with a bar: full for an open door, and for a shut one as far along as he is', widths.join() === 'open 100,open 100,shut 75,shut 36', widths.join());
  const list = page().split('DETAILS</div>')[0];
  check('in the list, the Club shows how many of its doors are open, and a world behind a shut door shows how near he is', /home[\s\S]*?2\/4/.test(list) && /The Hollows[\s\S]*?9\/12/.test(list) && /Grimsqueak's Keep[\s\S]*?9\/25/.test(list) && /The Foundry[\s\S]*?0\/12/.test(list), text(list));
  m.press('down');
  m.press('down'); // The Foundry: open
  const foundry = text(details());
  check('a world whose door is open says so in a small tag by its name, with what it asked, and still shows its wedges', foundry.includes('The Foundry door open · 5') && foundry.includes('Top of the Crucible') && !details().includes('rq-door '), foundry);
  m.press('down'); // The Hollows: shut
  const hollows = text(details());
  check('a world behind a shut door shows the door, what it asks, a bar, and the same in plain words', hollows.includes('Its door 9 / 12') && hollows.includes('The door is in the Club. It wants 12 Golden Wedges. You have 9: 3 more to go.') && /rq-door shut[\s\S]*?width:75%/.test(details()), hollows);
  m.press('confirm');
  check('choosing it does not go there: it stays shut', gone.length === 0 && m.open);
  m.press('up');
  m.press('confirm');
  check('...and the one before it, whose door is open, can be gone to', gone.join() === 'foundry' && !m.open);
}

console.log(failures === 0 ? '\nMenu checks passed.' : `\n${failures} menu check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
