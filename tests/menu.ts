// Menu navigation without a browser: a tiny fake document is enough because the menu only needs a few DOM calls.
import { Menu } from '../src/ui/menu';
import { Equipment } from '../src/player/equipment';
import { Inventory } from '../src/player/inventory';

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

console.log(failures === 0 ? '\nMenu checks passed.' : `\n${failures} menu check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
