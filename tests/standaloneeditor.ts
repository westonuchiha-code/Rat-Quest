// The standalone editor (standalone-editor/): the tweak registry, the panels driven by a controller, the jump
// arithmetic (checked against the game's own jump checker, so the two cannot drift apart), and the box jump checker.
import { TweakRegistry, TweakPanel, ToolsPanel, PadNav, jumpReach, maxClimb, maxChimney, computeReach, unreachable, type JumpParams, type NavAction } from '../standalone-editor/src/index';
import { TUNING as EX, jumpParams, makeTweaks } from '../standalone-editor/examples/platformer';
import { TUNING } from '../src/data/tuning';
import * as RQ from '../src/levels/reach';

const fakeEl = (): Record<string, unknown> => ({
  className: '',
  innerHTML: '',
  classList: { add() {}, remove() {}, toggle() {} },
  appendChild() {},
  addEventListener() {},
  querySelector: () => null,
});
(globalThis as unknown as { document: unknown }).document = { createElement: fakeEl, head: { appendChild() {} }, getElementById: () => null };

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const near = (a: number, b: number, e = 1e-6): boolean => Math.abs(a - b) < e;

// --- The registry ---
const mem: Record<string, string> = {};
const store = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v) };
const table = { jump: { velocity: 9.5 }, speed: 4 };
const enemy = { hp: 3 };
const reg = new TweakRegistry({ storage: store, storageKey: 't', root: table, tables: { toad: enemy } });
reg.define(
  { group: 'Jumping', key: 'jump.velocity', label: 'Jump power', min: 5, max: 16, step: 0.1 },
  [{ group: 'Moving', key: 'speed', label: 'Speed', min: 1, max: 8, step: 0.5 }, { group: 'Toads', key: 'toad.hp', label: 'Health', min: 1, max: 12, step: 1 }],
  { group: 'Camera', key: 'camera.distance', label: 'Distance', min: 3, max: 14, step: 0.25, default: 7 },
);
check('a key into a table takes its default from the table', reg.defaultOf('jump.velocity') === 9.5 && reg.defaultOf('toad.hp') === 3);
reg.set('jump.velocity', 11.04);
check('setting writes straight into the table, rounded to the step', table.jump.velocity === 11 && reg.get('jump.velocity') === 11);
reg.set('toad.hp', 40);
check('a value is kept within its range, in a named table', enemy.hp === 12);
reg.set('camera.distance', 9.1);
check('a key with no table is kept by the registry', reg.get('camera.distance') === 9 && reg.isChanged('camera.distance'));
check('changes are counted', reg.count() === 3, String(reg.count()));
check('they are saved', JSON.parse(mem.t).camera?.distance === undefined && JSON.parse(mem.t)['camera.distance'] === 9);
const text = reg.text();
reg.reset();
check('reset puts every one back', table.jump.velocity === 9.5 && enemy.hp === 3 && reg.get('camera.distance') === 7 && reg.count() === 0);
check('the copied text loads back in', reg.load(text) === 3 && table.jump.velocity === 11 && enemy.hp === 12);
let heard = '';
const stop = reg.onChange((k, v) => (heard = `${k}=${v}`));
reg.set('speed', 6);
stop();
reg.set('speed', 7);
check('onChange hears a change, and stops when asked', heard === 'speed=6');
// A fresh start, same storage: the changes come back as the tweaks are defined.
const table2 = { jump: { velocity: 9.5 }, speed: 4 };
const reg2 = new TweakRegistry({ storage: store, storageKey: 't', root: table2 });
reg2.define({ group: 'Jumping', key: 'jump.velocity', label: 'Jump power', min: 5, max: 16, step: 0.1 });
check('saved changes are put back on the next start', table2.jump.velocity === 11);
let threw = false;
try {
  reg2.define({ group: 'X', key: 'jump.velocity', label: 'again', min: 0, max: 1, step: 1 });
} catch {
  threw = true;
}
check('a key defined twice is an error', threw);
threw = false;
try {
  reg2.define({ group: 'X', key: 'nowhere.at.all', label: 'no default', min: 0, max: 1, step: 1 });
} catch {
  threw = true;
}
check('a key with neither a table nor a default is an error', threw);

// Presets.
const ex = makeTweaks('ex');
ex.configure({ storage: null });
ex.reset();
const sets = ex.presetLists[0].presets;
check('presets: "as it is" is active at the defaults', ex.activePreset(sets)?.id === 'asis');
ex.usePreset(sets[3], sets);
check('presets: one moves its sliders', EX.moves.wallKickUp === 12 && EX.jump.doubleVelocity === 6 && ex.activePreset(sets)?.id === 'both');
ex.usePreset(sets[1], sets);
check('presets: the next one first puts the others back', EX.jump.doubleVelocity === 8.5 && EX.moves.wallKickUp === 12 && ex.activePreset(sets)?.id === 'kick');
ex.reset();

// --- The panel, by controller ---
let closed = 0;
const panel = new TweakPanel(document.body ?? (fakeEl() as unknown as HTMLElement), ex, { onClose: () => closed++ });
panel.show();
const go = (...keys: NavAction[]): void => keys.forEach((k) => panel.press(k));
go('down');
check('panel: the first press only shows the cursor', panel.cursor().zone === 'groups' && panel.cursor().group === 'Moving');
go('down');
check('panel: down in the groups picks the next group', panel.cursor().group === 'Jumping');
go('right');
check('panel: right goes into its rows (the presets row first)', panel.cursor().zone === 'list' && panel.cursor().row === 0);
go('right', 'confirm');
check('panel: along the presets row and A uses one', ex.activePreset(sets)?.id === 'kick');
go('down', 'right', 'right');
check('panel: left and right change the slider by a step', near(EX.jump.velocity, 9.7), String(EX.jump.velocity));
go('reset');
check('panel: X puts it back to its default', EX.jump.velocity === 9.5);
for (let i = 0; i < 20; i++) go('down');
check('panel: down past the last row reaches the bottom row', panel.cursor().zone === 'foot');
go('confirm');
check('panel: the bottom row\'s first button shows only what has changed', panel.cursor().zone === 'foot');
go('right', 'right', 'right', 'right', 'right', 'confirm');
check('panel: its last button closes', !panel.open && closed === 1);
panel.show();
go('next');
check('panel: R1 changes group from anywhere', panel.cursor().group !== 'Jumping' || panel.cursor().zone !== 'foot');
go('back', 'back', 'back');
check('panel: B goes back, then closes', !panel.open);
ex.reset();

// --- PadNav: a held direction repeats; a held button does not ---
const got: string[] = [];
const nav = new PadNav((a) => got.push(a), { keys: false, delay: 0.3, every: 0.1 });
for (let i = 0; i < 10; i++) nav.feed(new Set<NavAction>(['down', 'confirm']), 0.1);
check('PadNav: a held direction repeats after the delay, a button fires once', got.filter((a) => a === 'down').length === 8 && got.filter((a) => a === 'confirm').length === 1, got.join(','));

// --- The jump arithmetic matches the game's own checker ---
const rqParams: JumpParams = {
  gravity: TUNING.physics.gravity,
  fallGravityMultiplier: TUNING.physics.fallGravityMultiplier,
  jumpVelocity: TUNING.jump.velocity,
  doubleJumpVelocity: TUNING.jump.doubleVelocity,
  airJumps: Math.min(1, TUNING.jump.airJumps),
  runSpeed: TUNING.move.run,
  coyoteTime: TUNING.jump.coyoteTime,
  longJumpUp: TUNING.moves.longJumpUp,
  longJumpSpeed: TUNING.moves.longJumpSpeed,
  wallKickUp: TUNING.moves.wallKickUp,
  wallKickPush: TUNING.moves.wallKickPush,
  ledgeGrab: 1.05,
  radius: TUNING.rat.radius,
};
let same = true;
for (const dh of [-6, -2, 0, 0.5, 1, 2, 3, 4]) if (!near(jumpReach(rqParams, dh), RQ.jumpReach(dh), 1e-9) || !near(jumpReach(rqParams, dh, false), RQ.jumpReach(dh, false), 1e-9)) same = false;
check('jump reach is the game\'s, at every height', same);
check('the highest ledge is the game\'s', near(maxClimb(rqParams), RQ.maxClimb()) && near(maxClimb(rqParams, false), RQ.maxClimb(false)));
check('the widest chimney is the game\'s', near(maxChimney(rqParams), RQ.maxChimney()) && near(maxChimney(rqParams, 2), RQ.maxChimney(2)));

// --- The box jump checker ---
const p = jumpParams();
const floor = { x0: -2, x1: 30, y0: -1, y1: 0, z0: -2, z1: 2 };
const boxes = [floor, { x0: 6, x1: 8, y0: 0, y1: 1.5, z0: -2, z1: 2 }, { x0: 10, x1: 12, y0: 0, y1: 3.5, z0: -2, z1: 2 }, { x0: 26, x1: 28, y0: 0, y1: 20, z0: -2, z1: 2 }];
const map = computeReach(boxes, { x: 0, y: 0, z: 0 }, p);
const missing = unreachable(map, [
  { name: 'step', x: 7, y: 1.5, z: 0 },
  { name: 'higher step', x: 11, y: 3.5, z: 0 },
  { name: 'pillar top', x: 27, y: 20, z: 0 },
], p);
check('jump checker: the floor and the steps are reached, the 20-high pillar is not', missing.length === 1 && missing[0].name === 'pillar top', missing.map((m) => m.name).join(','));
check('jump checker: it counts what it reached', map.reached > 0 && map.reached < map.total);
// A gap too wide to jump: a far platform with a pit between.
const islands = [{ x0: -2, x1: 2, y0: -1, y1: 0, z0: -2, z1: 2 }, { x0: 40, x1: 44, y0: -1, y1: 0, z0: -2, z1: 2 }];
check('jump checker: a gap too wide to jump is not crossed', !computeReach(islands, { x: 0, y: 0, z: 0 }, p).near(42, 0, 0));

// --- The tools page ---
let warped = '';
const tools = new ToolsPanel(fakeEl() as unknown as HTMLElement, {
  jumpParams: () => p,
  level: () => ({ boxes, start: { x: 0, y: 0, z: 0 }, targets: [{ name: 'pillar top', x: 27, y: 20, z: 0 }] }),
  warps: () => [{ id: 'a', name: 'A' }],
  warp: (id) => (warped = id),
}, panel);
tools.show();
tools.press('down');
check('tools: shows only what the host can do (Game Feel, Jump check, Warp)', tools.cursor().item === 'tweaks');
tools.press('down');
tools.press('confirm');
check('tools: the jump check runs and names what is out of reach', tools.cursor().page === 'jump' && tools.jumpCheck().includes('Out of reach (1): pillar top'));
tools.press('back');
tools.press('down');
tools.press('confirm');
tools.press('confirm');
check('tools: warp goes there and closes', warped === 'a' && !tools.open);

console.log(failures ? `\n${failures} FAILED` : '\nAll standalone editor checks passed.');
if (failures) process.exitCode = 1;
