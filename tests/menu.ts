// Menu navigation without a browser: a tiny fake document is enough because the menu only needs a few DOM calls.
import { Menu } from '../src/ui/menu';
import { Equipment } from '../src/player/equipment';
import { Inventory } from '../src/player/inventory';
import { doorLetsIn, doorState, doorWords, HUB_DOORS } from '../src/levels/junction';
import { BALANCE } from '../src/data/balance';
import type { LevelRow } from '../src/ui/menu';
import { TweaksPanel } from '../src/ui/tweaksPanel';
import { JUMP_SETS, TWEAKS, TWEAK_GROUPS, Tweaks, defaultTweak } from '../src/core/tweaks';

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
menu.press('down'); // SETTINGS
menu.press('down'); // TOOLS
menu.press('confirm'); // the tools: RESTART (TESTING) is the only one this game has
check('TOOLS opens a list of its own, and the menu stays up', restarted === 0 && menu.open);
menu.press('confirm');
check('restart is there, and needs a second confirm', restarted === 0 && menu.open);
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
for (let i = 0; i < 2; i++) desk.press('down'); // SETTINGS
desk.press('confirm'); // its own list: CONTROLS, FULLSCREEN, BACK
desk.press('down'); // FULLSCREEN
desk.press('confirm');
check('the fullscreen row (under SETTINGS) toggles fullscreen', fs);
desk.press('up'); // CONTROLS
desk.press('confirm');
check('the controls row changes nothing', fs && quits === 0 && desk.open);
desk.press('back');
check('back leaves SETTINGS for the main list, and does not close the menu', desk.open && quits === 0);
desk.press('down'); // TOOLS
desk.press('down'); // QUIT
desk.press('confirm');
check('quit needs a second press', quits === 0);
desk.press('confirm');
check('the second press quits', quits === 1);
for (let i = 0; i < 5; i++) desk.press('down');
desk.press('up');
desk.press('confirm');
check('the cursor stops at the last row', quits === 1);

// ---- The SAVE screen is organised: a short main list; the settings on a page of their own, under headings ----
// (The owner, 2026-11-15: "settings need to be organized better in menu". It was one list of seventeen rows, saving,
// sound, picture, controls and tools all in a row, scrolling in a small box.)
{
  const made: Array<{ innerHTML: string }> = [];
  (globalThis as unknown as { document: { createElement: () => unknown } }).document.createElement = () => {
    const el = fakeEl() as unknown as { innerHTML: string };
    made.push(el);
    return el;
  };
  let sfx = 0.5;
  let screenWide = true;
  let opened = '';
  const m = new Menu(fakeEl() as unknown as HTMLElement, {
    equipment: new Equipment(null), inventory: new Inventory(null), useItem: () => null,
    quest: () => ({ name: 'T', goals: [], collectibles: [] }), levels: () => [], goLevel: () => undefined,
    health: () => ({ hp: 5, max: 5 }), save: () => true, load: () => false, savedAt: () => null,
    restart: () => undefined, onToggle: () => undefined,
    audio: { sfx: () => sfx, music: () => 0.5, setSfx: (v: number) => { sfx = v; }, setMusic: () => undefined },
    rumble: { level: () => 'full', set: () => undefined },
    fullscreen: () => false, toggleFullscreen: () => undefined, quit: () => undefined, toTitle: () => undefined, openPhoto: () => undefined,
    openBuilder: () => { opened = 'builder'; }, openTweaks: () => { opened = 'tweaks'; }, openWorkshop: () => { opened = 'workshop'; },
    extras: [
      { id: 'quick', group: 'save', label: () => 'LOAD QUICKSAVE', change: () => undefined },
      { id: 'glyphs', group: 'controls', label: () => 'BUTTON ICONS: AUTO', change: () => undefined },
      { id: 'screen', label: () => `SCREEN: ${screenWide ? 'WIDE' : '4:3'}`, change: () => { screenWide = !screenWide; } },
      { id: 'filter', label: () => 'FILTER: OFF', change: () => undefined },
    ],
  } as never);
  const page = (): string => [...made].reverse().map((e) => e.innerHTML).find((h) => typeof h === 'string' && h.includes('rq-acts')) ?? '';
  const labels = (html: string): string[] => [...html.matchAll(/class="rq-btn[^"]*" data-row="\d+">([^<]*)</g)].map((x) => x[1]);
  const heads = (html: string): string[] => [...html.matchAll(/class="rq-sub">([^<]*)</g)].map((x) => x[1]);
  m.show();
  for (let i = 0; i < 3; i++) m.press('tabNext'); // SAVE
  const main = labels(page());
  check('the main list is short: saving, then SETTINGS and TOOLS, then leaving', main.join(' | ') === 'SAVE GAME | LOAD SAVED GAME | LOAD QUICKSAVE | SETTINGS | TOOLS | PHOTO MODE | SAVE AND QUIT TO TITLE | QUIT GAME', main.join(' | '));
  check('...with no setting and no tool in it', !main.some((l) => /SOUND|MUSIC|RUMBLE|FULLSCREEN|SCREEN:|FILTER|CONTROLS|BUTTON|EDITOR|TWEAKS|WORKSHOP|RESTART/.test(l)));
  for (let i = 0; i < 3; i++) m.press('down'); // SETTINGS
  m.press('confirm');
  const set = labels(page());
  check('SETTINGS opens a page of its own: sound, then controls, then the picture, each under its heading, and BACK', heads(page()).join() === 'SOUND,CONTROLS,PICTURE' && set.join(' | ') === 'SOUND: 50% | MUSIC: 50% | RUMBLE: FULL | CONTROLS | BUTTON ICONS: AUTO | FULLSCREEN: OFF | SCREEN: WIDE | FILTER: OFF | BACK', `${heads(page()).join()} / ${set.join(' | ')}`);
  check('...in two columns, sound and controls in one and the picture in the other, so nothing has to scroll', (page().match(/rq-col rq-acts/g) ?? []).length === 2 && page().indexOf('PICTURE') > page().lastIndexOf('rq-col rq-acts'));
  m.press('right');
  check('left and right change the setting the cursor is on', sfx === 0.75 && /SOUND: 75%/.test(page()));
  for (let i = 0; i < 6; i++) m.press('down'); // SCREEN
  m.press('confirm');
  check('...and so does selecting it', !screenWide && /SCREEN: 4:3/.test(page()));
  m.press('back');
  check('back goes to the main list with the cursor on SETTINGS; the menu stays up', m.open && /rq-btn sel[^>]*>SETTINGS</.test(page()));
  m.press('down'); // TOOLS
  m.press('confirm');
  check('TOOLS opens the editor, the tweaks, the workshop and the restart, and BACK', labels(page()).join(' | ') === 'LEVEL EDITOR | TWEAKS (GAME FEEL) | WORKSHOP (ALL TOOLS) | RESTART (TESTING) | BACK', labels(page()).join(' | '));
  m.press('down');
  m.press('confirm');
  check('...and choosing one opens it and closes the menu', opened === 'tweaks' && !m.open);
  m.show();
  check('opened again, the menu is on the main list, not left inside TOOLS', labels(page()).includes('SETTINGS'));
  m.press('confirm'); // (SAVE GAME)
  for (let i = 0; i < 3; i++) m.press('down');
  m.press('confirm'); // SETTINGS
  m.press('tabNext');
  m.press('tabPrev');
  check('changing screen and coming back also lands on the main list', labels(page()).includes('SETTINGS') && !labels(page()).includes('BACK'));
  m.close();
}

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

// ---- Reading on: the DETAILS card moved when there is more written in it than fits ----
{
  const card = { scrollTop: 0, scrollHeight: 500, clientHeight: 200, parentElement: null, classList: { toggle() {} }, addEventListener() {} };
  const marks: Record<string, { hidden: boolean }> = { '.rq-more': { hidden: true }, '.rq-less': { hidden: true }, '.rq-readon': { hidden: true } };
  (globalThis as unknown as { document: { createElement: () => unknown } }).document.createElement = () => ({ ...fakeEl(), querySelector: (q: string) => (q === '.rq-detail' ? card : marks[q] ?? null) });
  const m = new Menu(fakeEl() as unknown as HTMLElement, {
    equipment: new Equipment(null), inventory: new Inventory(null), useItem: () => null,
    quest: () => ({ name: 'T', goals: [], collectibles: [] }), levels: () => [{ id: 'a', name: 'A', blurb: 'Long.', cleared: false, perfect: false, current: true }], goLevel: () => undefined,
    health: () => ({ hp: 5, max: 5 }), save: () => true, load: () => false, savedAt: () => null,
    restart: () => undefined, onToggle: () => undefined,
  });
  m.scroll(1);
  check('with the menu shut, nothing is moved', card.scrollTop === 0);
  m.show();
  check('a card with more in it than fits says there is more below, and nothing above', m.more().below && !m.more().above);
  m.scroll(0.5);
  check('the right stick moves it: half a card\'s height is half a card\'s height', card.scrollTop === 100 && m.more().below && m.more().above, `${card.scrollTop}`);
  check('...and the markers show: more below, more above, and how to read on', !marks['.rq-more'].hidden && !marks['.rq-less'].hidden && !marks['.rq-readon'].hidden);
  m.scroll(5);
  check('it stops at the end of what is written, and the "more" marker goes', card.scrollTop === 300 && !m.more().below && m.more().above && marks['.rq-more'].hidden && !marks['.rq-less'].hidden, `${card.scrollTop}`);
  m.scroll(-9);
  check('and back up it stops at the top', card.scrollTop === 0 && m.more().below && !m.more().above && marks['.rq-less'].hidden);
  card.scrollHeight = 200;
  m.scroll(1);
  check('a card that fits is not moved, and has no markers', card.scrollTop === 0 && !m.more().below && !m.more().above && marks['.rq-more'].hidden && marks['.rq-readon'].hidden);
}

// ---- The tweaks (Game Feel) panel worked from a controller ----
// (The owner, 2026-11-15: "game tweak menu can not be navigated via controller". It was mouse, touch and keys only.)
{
  const doc = globalThis as unknown as { document: { createElement: () => unknown; getElementById?: (id: string) => unknown; head: unknown } };
  doc.document.getElementById = () => null;
  let root: { innerHTML: string } | null = null;
  doc.document.createElement = () => {
    const el = { ...fakeEl(), classList: { add() {}, remove() {}, toggle() {} }, querySelector: () => null, querySelectorAll: () => [] } as unknown as { innerHTML: string };
    root = el;
    return el;
  };
  const t = new Tweaks(null);
  let closed = 0;
  const panel = new TweaksPanel(fakeEl() as unknown as HTMLElement, t, () => closed++);
  const html = (): string => root?.innerHTML ?? '';
  panel.press('down');
  check('with the panel shut, a press does nothing', panel.cursor().row === -1);
  panel.show();
  check('opened by mouse or touch it shows no cursor and no controller help', !/class="tw[^"]* cur/.test(html()) && !html().includes('class="pad"'));
  panel.press('down');
  check('the first press from a controller only shows the cursor, on the first slider of the group, with the help line', panel.cursor().row === 0 && panel.cursor().group === TWEAK_GROUPS[0] && /class="tw[^"]* cur/.test(html()) && html().includes('class="pad"'));
  const first = TWEAKS.filter((x) => x.group === TWEAK_GROUPS[0]);
  panel.press('down');
  check('down moves to the next slider', panel.cursor().row === 1);
  const x = first[1];
  const was = t.get(x.path);
  panel.press('right');
  panel.press('right');
  check('right raises the slider under the cursor a step at a time', Math.abs(t.get(x.path) - (was + 2 * x.step)) < 1e-6 && t.isChanged(x.path), `${x.label}: ${was} to ${t.get(x.path)}`);
  panel.press('left');
  check('left lowers it', Math.abs(t.get(x.path) - (was + x.step)) < 1e-6);
  panel.press('reset');
  check('the reset button puts that one slider back', t.get(x.path) === defaultTweak(x.path) && !t.isChanged(x.path));
  for (let i = 0; i < 60; i++) panel.press('down');
  check('the cursor stops at the last slider of the group', panel.cursor().row === first.length - 1);
  for (let i = 0; i < 60; i++) panel.press('up');
  check('...and at the first', panel.cursor().row === 0);
  panel.press('tabNext');
  check('the right bumper goes to the next group, cursor at its top', panel.cursor().group === TWEAK_GROUPS[1] && panel.cursor().row === 0);
  panel.press('tabPrev');
  panel.press('tabPrev');
  check('the left bumper goes back, and round from the first group to the last', panel.cursor().group === TWEAK_GROUPS[TWEAK_GROUPS.length - 1]);
  // The jump sets: a row of their own at the top of Jumping.
  while (panel.cursor().group !== 'Jumping') panel.press('tabNext');
  check('in Jumping the cursor starts on the row of jump sets, on the one in use', panel.cursor().row === 0 && panel.cursor().set === 0 && /class="sets cur"/.test(html()) && /class="on cur"/.test(html()));
  panel.press('right');
  panel.press('right');
  panel.press('right');
  check('left and right move along the sets without using one', panel.cursor().set === 3 && t.count() === 0);
  panel.press('confirm');
  check('confirm uses the set under the cursor', t.activeSet(JUMP_SETS) === JUMP_SETS[3] && t.count() === Object.keys(JUMP_SETS[3].values).length);
  panel.press('down');
  check('down from the sets goes to the first jump slider', panel.cursor().row === 1 && /class="tw[^"]* cur/.test(html()));
  panel.press('up');
  for (let i = 0; i < 9; i++) panel.press('left');
  panel.press('confirm');
  check('..."As it is" puts the jump sliders back', t.count() === 0);
  panel.press('back');
  check('back closes the panel: he plays', !panel.open && closed === 1);
}

console.log(failures === 0 ? '\nMenu checks passed.' : `\n${failures} menu check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
