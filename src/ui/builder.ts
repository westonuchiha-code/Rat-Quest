/**
 * The level editor: a map you draw on, with the game running beside it. Pick a piece on the left and drag it out on the
 * map; everything about what is selected is on the right (the piece, the level, a list of every piece, and whatever is
 * wrong with the level); the bar along the top has files, undo and redo, the view, the jump checker and PLAY.
 * Mouse, keys or a finger (two fingers pinch and pan). Levels save to the device and can be copied out as text or a file.
 *
 * The rules of editing (undo, paste, flip, stretching, measuring a jump) live in levels/editOps.ts, where they are tested.
 */
import { FONTS } from './fonts';
import { BOX_TYPES, BUTTON_MOST, BUTTON_OUT, ENEMY_PIECES, CustomGoal, CustomLevel, Piece, PieceType, WEDGE_APPEARS, WedgeAppears, checkCustom, emptyCustom, parseCustom } from '../levels/custom';
import type { MyLevels } from '../levels/library';
import { compileCustom } from '../levels/custom';
import { computeReach, unreachable, ReachProblem } from '../levels/reach';
import { STAMPS, stampById } from '../levels/stamps';
import { groupCentre, piecesInBox, turnQuarter } from '../levels/groupOps';
import { HANDLES, History, flipPieces, handleAt, handlePoint, levelStats, measureJump, pasteAt, pieceBounds, resizeBy, surfaceAt, type Handle, type Measure } from '../levels/editOps';
import { SAMPLES } from '../levels/samples';
import { THEMES } from '../levels/themes';
import { TEXTURE_SETS } from '../render/textures';
import { esc, icon, useDevTheme } from './devTheme';

export type ToolId = PieceType | 'select' | 'erase' | 'pan' | 'measure' | `stamp:${string}`;
type LayerId = 'ground' | 'water' | 'things' | 'collect' | 'folk' | 'decor' | 'marks';

export interface PieceInfo {
  t: PieceType;
  label: string;
  /** One line on what it is, for the status bar and the tooltip. */
  tip: string;
  /** What is written on it on the map. */
  glyph: string;
  color: string;
  layer: LayerId;
}
const P = (t: PieceType, label: string, glyph: string, color: string, layer: LayerId, tip: string): PieceInfo => ({ t, label, glyph, color, layer, tip });

/** Every piece, in the order the palette shows them. */
const GROUPS: Array<{ id: string; label: string; items: PieceInfo[] }> = [
  { id: 'ground', label: 'Ground', items: [
    P('floor', 'Floor', '', '#4a5a4a', 'ground', 'Plain ground. Drag out a rectangle.'),
    P('tile', 'Tiles', '', '#6a7a7a', 'ground', 'Tiled ground.'),
    P('grate', 'Grating', '', '#5a6a5a', 'ground', 'Iron grating to walk on.'),
    P('ice', 'Ice', '', '#a8d8ee', 'ground', 'A sheet of ice. He slides on it: slow to start, slow to turn, a long way to stop.'),
    P('platform', 'Moss slab', '', '#5a7a4a', 'ground', 'A mossy slab: ledges and stepping stones. Set its height first.'),
    P('plank', 'Planks', '', '#8a5a32', 'ground', 'Wooden planks.'),
    P('stone', 'Stone', '', '#7a7a6a', 'ground', 'A block of stone.'),
    P('wall', 'Wall', '', '#3a3a44', 'ground', 'A wall. He cannot pass it.'),
    P('pillar', 'Pillar', '', '#9a9a88', 'ground', 'A pillar, from the floor up to its height.'),
    P('stairs', 'Stairs', '', '#8a8a9a', 'ground', 'Steps that climb the way they face.'),
    P('ramp', 'Ramp', '', '#9a9486', 'ground', 'A smooth slope that climbs the way it faces. He walks up one as steep as 1 up for 1 along.'),
    P('lift', 'Moving platform', '', '#e0a040', 'ground', 'A platform that glides up and down, or sideways. Its settings say how far and how fast.'),
    P('bridge', 'Rope bridge', '', '#b08850', 'ground', 'A rope bridge across a gap.'),
  ] },
  { id: 'water', label: 'Water and fire', items: [
    P('water', 'Pool', '', '#2a9a4a', 'water', 'Water he can swim in.'),
    P('river', 'River', '', '#3ac05a', 'water', 'Water that pushes him the way it flows.'),
    P('lava', 'Lava', '', '#ff6a1a', 'water', 'It burns: a heart, and back to the last safe ground.'),
    P('fire', 'Fire', '', '#ffb020', 'water', 'A standing fire over these squares. It burns unless he is fireproof (the Ember Helm).'),
    P('fall', 'Grate fall', 'F', '#8aff8a', 'water', 'Water pouring out of a wall grate (for looks).'),
  ] },
  { id: 'things', label: 'Breakables and machines', items: [
    P('crate', 'Crate', 'C', '#c08a4a', 'things', 'Breaks when hit. It can hold a collectible, or be bound in iron (only a heavy blade breaks it).'),
    P('barrel', 'Barrel', 'B', '#a06a3a', 'things', 'Breaks when hit. It can hold a collectible.'),
    P('pipe', 'Wall pipe', 'Pi', '#9a6a3a', 'things', 'A pipe on a wall that he can burst: a goal, or what opens a gate.'),
    P('gate', 'Gate', '', '#caa84a', 'things', 'Bars that lift when the goals are done, the pipes burst, or the plates are pressed.'),
    P('plate', 'Floor plate', 'K', '#d8a83a', 'things', 'A plate to stand on. Press them all to open a gate; or set it to put in a creature each time it is stepped on (a button).'),
    P('pot', 'Clay pot', 'Po', '#c0603a', 'things', 'A pot to pick up and throw (STOW lifts, ATTACK throws). Light; it breaks, and can hold a collectible.'),
    P('rock', 'Rock', 'Rk', '#8a8a92', 'things', 'A rock to pick up and throw. It does not break: throw it again.'),
  ] },
  { id: 'collect', label: 'Collectibles', items: [
    P('crumb', 'Cheese crumb', 'c', '#ffd23a', 'collect', 'A cheese crumb.'),
    P('cap', 'Bottle cap', 'b', '#d85a5a', 'collect', 'A bottle cap.'),
    P('relic', 'Relic', 'R', '#ffe27a', 'collect', 'A relic: the rare one.'),
    P('wedge', 'Golden Wedge', 'W', '#ffb800', 'collect', 'A Golden Wedge. With one in it, the level is an open course and the wedges are its goals.'),
  ] },
  { id: 'folk', label: 'Creatures', items: [
    P('roach', 'Roach', 'Ro', '#a04a6a', 'folk', 'Winds up, then lunges.'),
    P('toad', 'Toad', 'To', '#6aa03a', 'folk', 'Spits from a distance and pounces up close.'),
    P('beetle', 'Ironback', 'Ir', '#6d7580', 'folk', 'Its shell turns a sword. Get behind it, or flip it.'),
    P('bat', 'Flitter', 'Fl', '#8a5a8a', 'folk', 'Roosts overhead and swoops.'),
    P('guard', 'Keep Guard', 'Gd', '#7a4ab0', 'folk', 'A rat with a shield and a spear. He faces the way he is set.'),
    P('mantis', 'Orchid Mantis', 'Ma', '#e88ab0', 'folk', 'Will not stand and be hit: it springs back, then leaps.'),
    P('stag', 'Stag Knight', 'St', '#3a6a78', 'folk', 'A great beetle with a forge hammer. Slow, and it does not flinch.'),
    P('hornet', 'Hornet Lancer', 'Ho', '#f2a81e', 'folk', 'Hangs in the air out of reach and dives lance first: step aside and the lance sticks in the floor. It needs open air: a high roof and room to fly.'),
    P('ant', 'Ant Pikeman', 'An', '#9a3a1e', 'folk', 'A soldier ant with a long pike. Put two near each other and they fight as a pair: one holds you at pike\'s length while the other goes round behind you. Give them open floor.'),
    P('firefly', 'Firefly Bomber', 'Ff', '#e8642a', 'folk', 'Flies over, out of reach, and drops fire where you are going: turn off its line. After two runs its light is spent and it hangs low: hit it then. It needs open air: a high roof and room to fly.'),
    P('scorpion', 'Lamp Scorpion', 'Sc', '#3ad6a8', 'folk', 'A dark scorpion whose sting is its lamp. The lamp flares and a ring on the floor shows where the barb will land: get out of the ring, then hit it while the barb is stuck. Two hits and it runs off unlit. Best in a dark place, on open floor.'),
    P('brood', 'The Broodmother', 'BM', '#7a3a8a', 'folk', 'A boss: the great spider. She has the run of the whole room, so give her a big clear floor.'),
    P('wyrm', 'The Sump Wyrm', 'SW', '#b53a1e', 'folk', 'A boss: the great centipede. It charges, and stuns itself on walls: give it a big clear floor with walls all round.'),
    P('npc', 'Character', 'P', '#4a7aca', 'folk', 'Someone to talk to. Choose who, and what they say.'),
  ] },
  { id: 'level', label: 'Start, exit and goals', items: [
    P('spawn', 'Start', 'S', '#ffffff', 'marks', 'Where he starts. There is only one.'),
    P('exit', 'Exit door', 'E', '#8ad8ff', 'marks', 'The door out. There is only one; put it against a wall.'),
    P('mark', 'Goal marker', 'G', '#ff8ad8', 'marks', 'The place a "reach the marker" goal sends him.'),
  ] },
  { id: 'decor', label: 'Decor', items: [
    P('lamp', 'Lamp', 'L', '#ffe08a', 'decor', 'A hanging lamp. Its height is how high it hangs.'),
    P('chain', 'Chain', 'H', '#8a8a8a', 'decor', 'A chain hanging from the dark.'),
    P('window', 'Window', 'Wi', '#8ac8ff', 'decor', 'A barred window on a wall.'),
    P('slime', 'Slime', 'Sl', '#7aff5a', 'decor', 'Slime running down a wall.'),
    P('web', 'Cobweb', 'V', '#d8d8c8', 'decor', 'A cobweb on a wall.'),
    P('brazier', 'Brazier', 'Y', '#ff9a3a', 'decor', 'A bowl of fire on the floor (it does not burn him).'),
    P('vent', 'Steam vent', '#', '#d8d0c8', 'decor', 'An iron vent in the floor that blows steam every few seconds. Scenery: it does not hurt him.'),
    P('speaker', 'Speaker', 'Q', '#5a5a6a', 'decor', 'A speaker stack, for the Club.'),
    P('couch', 'Couch', 'U', '#8a4a4a', 'decor', 'A couch, for the Club.'),
    P('table', 'Table', 'Tb', '#9a6a3a', 'decor', 'A Club table (a cable drum on its side), with thimbles on it, and a candle or a game of cards if you like. Solid.'),
    P('stool', 'Stool', 'So', '#c8a070', 'decor', 'A stool (a cork with a bottle cap on it). Solid: he can hop up on it.'),
    P('bar', 'Bar counter', 'Br', '#7a4a2a', 'decor', 'A bar counter over the squares you drag: a counter\'s height, thimbles along it, a keg at one end. Put stools in front.'),
    P('candle', 'Candle stub', 'Cn', '#f4e4c0', 'decor', 'A candle stub in a bottle cap. It lights the room round it. Solid: he can stand on it.'),
    P('spool', 'Cotton reel', 'Sp', '#4a7ab0', 'decor', 'A wooden cotton reel on its end, thread still on it. Solid: he can stand on it.'),
    P('matchbox', 'Matchbox', 'Mb', '#c8402e', 'decor', 'A matchbox lying flat, its drawer half out. It faces the way it is turned (R). Solid.'),
    P('cheese', 'Wheel of cheese', 'Ch', '#f2c87a', 'decor', 'A wheel of cheese with a wedge cut out of it. Solid: he can stand on it.'),
    P('sardines', 'Sardine tin', 'Sa', '#a8b8c8', 'decor', 'An opened sardine tin, its lid rolled back. It faces the way it is turned (R). Solid.'),
    P('light', 'Light', 'Z', '#ff5a5a', 'decor', 'A coloured light on a post. It can flash.'),
    P('banner', 'Banner', 'Bn', '#7a3aa8', 'decor', 'A banner on a wall.'),
    P('torch', 'Torch', 'T', '#ffb040', 'decor', 'A torch on a wall.'),
    P('gauge', 'Gauge', 'Ga', '#c0a050', 'decor', 'A pressure gauge on a wall.'),
    P('crystal', 'Crystal', 'X', '#5ac8ff', 'decor', 'A glowing crystal.'),
    P('roots', 'Roots', 'Rt', '#6a4a2a', 'decor', 'Roots hanging down a wall.'),
  ] },
];
const INFO = new Map<PieceType, PieceInfo>(GROUPS.flatMap((g) => g.items).map((i) => [i.t, i]));
const info = (t: PieceType): PieceInfo => INFO.get(t) ?? P(t, t, '?', '#888888', 'things', '');
const LAYERS: Array<[LayerId, string]> = [['ground', 'Ground'], ['water', 'Water and fire'], ['things', 'Breakables and machines'], ['collect', 'Collectibles'], ['folk', 'Creatures'], ['decor', 'Decor'], ['marks', 'Start, exit, markers']];

/** Every piece with its colour, letter and one-line description, in palette order: the 3D editor shows the same palette. */
export const PIECE_GROUPS: ReadonlyArray<{ id: string; label: string; items: ReadonlyArray<PieceInfo> }> = GROUPS;
/** The palette as groups of tools. (EDIT is the editor's own tools, SHAPES the ready-made shapes.) */
export const TOOLS: Array<{ group: string; items: Array<{ t: ToolId; label: string }> }> = [
  { group: 'EDIT', items: [{ t: 'select', label: 'Select' }, { t: 'erase', label: 'Erase' }, { t: 'pan', label: 'Pan' }, { t: 'measure', label: 'Measure' }] },
  ...GROUPS.map((g) => ({ group: g.label.toUpperCase(), items: g.items.map((i) => ({ t: i.t as ToolId, label: i.label })) })),
  { group: 'SHAPES', items: STAMPS.map((st) => ({ t: `stamp:${st.id}` as ToolId, label: st.label })) },
];
/** Pieces that are one spot on the map, not a rectangle. */
export const SINGLE = new Set<PieceType>(['crate', 'barrel', 'pot', 'rock', 'table', 'stool', 'candle', 'spool', 'matchbox', 'cheese', 'sardines', 'crumb', 'cap', 'relic', 'roach', 'toad', 'beetle', 'bat', 'guard', 'mantis', 'stag', 'hornet', 'ant', 'firefly', 'scorpion', 'brood', 'wyrm', 'npc', 'pipe', 'fall', 'mark', 'plate', 'lamp', 'chain', 'window', 'slime', 'web', 'brazier', 'speaker', 'couch', 'light', 'banner', 'torch', 'gauge', 'crystal', 'roots', 'spawn', 'exit', 'wedge']);
/** Pieces that face a way. */
const FACES = new Set<PieceType>(['plate', 'matchbox', 'sardines', 'cheese', 'river', 'fall', 'pipe', 'stairs', 'ramp', 'window', 'slime', 'web', 'banner', 'torch', 'gauge', 'guard', 'mantis', 'stag', 'hornet', 'ant', 'firefly', 'scorpion', 'brood', 'wyrm']);
/** Rectangles that fill whole squares: dragged from one square to another, they cover both. */
const AREAS = new Set<PieceType>([...BOX_TYPES, 'water', 'river', 'lava', 'fire', 'bridge', 'stairs', 'ramp', 'lift', 'gate', 'bar']);
const DIR_NAME = { n: 'North', e: 'East', s: 'South', w: 'West' };
/** Ready-made characters: picking one sets the name and the creature. */
const CHARACTERS: Array<[string, string, 'mouse' | 'bird' | 'pigeon' | 'villain']> = [
  ['pip', 'PIP', 'mouse'], ['finch', 'FINCH', 'bird'], ['dave', 'DIZZY DAVE', 'pigeon'], ['mort', 'MELLOW MORT', 'mouse'],
  ['wren', 'WREN', 'bird'], ['grim', 'LORD GRIMSQUEAK', 'villain'], ['mouse', '', 'mouse'], ['bird', '', 'bird'],
];
/** How far he can see, as the level settings offer it. */
const FOGS: Array<[string, string, [number, number] | null]> = [['', "the look's own", null], ['clear', 'clear: see right across', [60, 220]], ['misty', 'misty', [14, 60]], ['thick', 'thick: a few steps', [6, 28]], ['dark', 'lightless: barely a step', [1, 6]]];
/** What each tool is for, shown along the bottom. */
const TOOL_HINT: Record<'select' | 'erase' | 'pan' | 'measure', string> = {
  select: 'Select: click a piece. Drag it to move it; drag its edges to stretch it. Drag on empty ground to box several. Shift-click adds one. Right-click for more.',
  erase: 'Erase: click a piece to remove it.',
  pan: 'Pan: drag the map. (Any time: drag with the middle button, hold Space and drag, or use two fingers.)',
  measure: 'Measure: drag from where he jumps to where he lands. It says how far it is and which jump makes it.',
};

const CSS = `
.rq-bld { position: absolute; inset: 0; z-index: 60; display: none; background: var(--bg); touch-action: none; }
.rq-bld.open { display: grid; grid-template-columns: 15.5em minmax(0, 1fr) 19em; grid-template-rows: auto minmax(0, 1fr) auto; }
.rq-bld.live.open { grid-template-columns: 14em minmax(0, 1fr) 25em; }
.rq-bld .bar { grid-column: 1 / 4; display: flex; align-items: center; gap: 0.35em; padding: 0.4em 0.6em; background: linear-gradient(#1c2230, #151a24); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.rq-bld .brand { display: flex; align-items: center; gap: 0.45em; font-weight: 800; letter-spacing: 0.08em; color: var(--gold); margin-right: 0.3em; }
.rq-bld .brand svg { width: 1.5em; height: 1.5em; }
.rq-bld .bar .sep { width: 1px; align-self: stretch; margin: 0.15em 0.25em; background: var(--line); }
.rq-bld .bar .grow { flex: 1; }
.rq-bld .bar input.name { width: 10em; font-weight: 700; }
.rq-bld .bar button { min-height: 2.1em; padding: 0.25em 0.6em; }
.rq-bld .bar button.ghost { padding: 0.25em 0.38em; }
@media (max-width: 1500px) { .rq-bld .bar .opt span { display: none; } .rq-bld .brand b { display: none; } }
/* A small screen (a phone on its side): icons only along the top, narrower panels, and a shorter game view. */
@media (max-width: 1000px), (max-height: 520px) {
  .rq-bld.open { grid-template-columns: 12.5em minmax(0, 1fr) 16em; }
  .rq-bld.live.open { grid-template-columns: 12em minmax(0, 1fr) 17.5em; }
  .rq-bld .bar { gap: 0.2em; padding: 0.3em 0.4em; }
  .rq-bld .bar button:not(.go) span { display: none; }
  .rq-bld .bar .state { font-size: 0; }
  .rq-bld .bar .state i { width: 9px; height: 9px; }
  .rq-bld .bar .sep { margin: 0.15em 0.05em; }
  .rq-bld .bar input.name { width: 7.5em; }
  .rq-bld.live .livepane { aspect-ratio: 16 / 7.5; }
  .rq-bld .toolrow button { min-height: 2.9em; }
}
.rq-bld .bar .state { font-size: 0.85em; color: var(--dim); display: flex; align-items: center; gap: 0.35em; }
.rq-bld .bar .state i { width: 0.6em; height: 0.6em; border-radius: 50%; background: var(--go); }
.rq-bld .bar .state.dirty i { background: var(--gold2); }
.rq-bld .left, .rq-bld .right { background: var(--panel); min-height: 0; display: flex; flex-direction: column; }
.rq-bld .left { border-right: 1px solid var(--line); } .rq-bld .right { border-left: 1px solid var(--line); }
.rq-bld .toolrow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.3em; padding: 0.5em 0.5em 0.3em; }
.rq-bld .toolrow button { flex-direction: column; gap: 0.1em; padding: 0.35em 0.1em; font-size: 0.82em; min-height: 3.3em; }
.rq-bld .toolrow button svg { width: 1.5em; height: 1.5em; }
.rq-bld .search { padding: 0.2em 0.5em 0.4em; position: relative; }
.rq-bld .search input { width: 100%; padding-left: 2em; }
.rq-bld .search svg { position: absolute; left: 1em; top: 0.65em; color: var(--faint); }
.rq-bld .pal { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 0.5em 0.6em; min-height: 0; }
.rq-bld .pal h4, .rq-bld .tabbody h4 { margin: 0.7em 0 0.35em; font-size: 0.78em; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); display: flex; align-items: center; gap: 0.4em; }
.rq-bld .pal h4 { cursor: pointer; } .rq-bld .pal h4::before { content: '▾'; color: var(--faint); } .rq-bld .pal h4.shut::before { content: '▸'; }
.rq-bld .pal h4 span { margin-left: auto; }
.rq-bld .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3em; }
.rq-bld .tile { justify-content: flex-start; text-align: left; white-space: normal; line-height: 1.1; padding: 0.3em 0.4em; min-height: 2.5em; font-size: 0.9em; background: var(--panel2); border-color: var(--line); }
.rq-bld .tile.on { background: #3a3110; border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
.rq-bld .sw { flex: none; width: 1.7em; height: 1.7em; border-radius: 0.3em; border: 1px solid #0008; display: flex; align-items: center; justify-content: center; font: 800 0.72em var(--rq-font-game); color: #000c; }
.rq-bld .sw.dot { border-radius: 50%; }
.rq-bld .mapwrap { position: relative; min-width: 0; min-height: 0; background: #0b0e13; }
.rq-bld canvas.map { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: crosshair; }
.rq-bld .mapwrap.t-select canvas.map { cursor: default; } .rq-bld .mapwrap.t-pan canvas.map { cursor: grab; } .rq-bld .mapwrap.t-erase canvas.map { cursor: not-allowed; }
.rq-bld .float { position: absolute; right: 0.6em; bottom: 0.6em; display: flex; flex-direction: column; gap: 0.3em; }
.rq-bld .float button { width: 2.4em; padding: 0; background: #171b24e6; }
.rq-bld .livepane { display: none; }
.rq-bld.live .livepane { display: block; position: relative; width: 100%; aspect-ratio: 16 / 10; background: #000; border-bottom: 1px solid var(--line); overflow: hidden; flex: none; }
.rq-bld.live .livepane canvas { position: absolute; inset: 0; }
.rq-bld .liveinfo { display: none; padding: 0.25em 0.7em; font-size: 0.85em; color: var(--gold); background: #11151c; border-bottom: 1px solid var(--line); }
.rq-bld.live .liveinfo { display: block; }
.rq-bld .tabs { display: flex; border-bottom: 1px solid var(--line); background: #131720; flex: none; }
.rq-bld .tabs button { flex: 1; border: 0; border-radius: 0; background: none; border-bottom: 2px solid #0000; min-height: 2.5em; padding: 0.3em 0.2em; color: var(--dim); font-weight: 700; font-size: 0.9em; }
.rq-bld .tabs button.on { color: var(--gold); border-bottom-color: var(--gold); background: var(--panel); }
.rq-bld .tabbody { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0.3em 0.7em 0.8em; min-height: 0; }
.rq-bld .tabbody h4:first-child { margin-top: 0.5em; }
.rq-bld .head { display: flex; align-items: center; gap: 0.5em; margin: 0.6em 0 0.4em; font-weight: 800; font-size: 1.05em; }
.rq-bld .field { display: grid; grid-template-columns: 6.6em minmax(0, 1fr); align-items: center; gap: 0.5em; margin: 0.3em 0; }
.rq-bld .field > span { color: var(--dim); font-size: 0.92em; }
.rq-bld .field input[type=number], .rq-bld .field input[type=text], .rq-bld .field select { width: 100%; min-width: 0; }
.rq-bld .field .two { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3em; }
.rq-bld .field .chk { justify-self: start; }
.rq-bld .step { display: flex; gap: 0.25em; align-items: center; }
.rq-bld .step button { min-width: 2.1em; padding: 0.2em 0.3em; }
.rq-bld .step b { min-width: 3em; text-align: center; font: 700 1.05em var(--rq-font-game); color: var(--gold); }
.rq-bld .chips { display: flex; flex-wrap: wrap; gap: 0.25em; margin: 0.3em 0; }
.rq-bld .chips button { min-height: 1.8em; padding: 0.1em 0.55em; font-size: 0.88em; border-radius: 1em; }
.rq-bld .compass { display: grid; grid-template-columns: repeat(3, 2.2em); grid-template-rows: repeat(3, 2.2em); gap: 0.15em; }
.rq-bld .compass button { padding: 0; min-height: 0; font-weight: 800; }
.rq-bld .compass i { display: flex; align-items: center; justify-content: center; font-style: normal; color: var(--faint); font-size: 0.8em; }
.rq-bld .acts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3em; margin: 0.4em 0; }
.rq-bld .note { color: var(--dim); font-size: 0.9em; margin: 0.4em 0; }
.rq-bld .note.warn { color: #ffb38a; }
.rq-bld .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.2em 0.8em; font-size: 0.92em; }
.rq-bld .stats div { display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding: 0.15em 0; } .rq-bld .stats b { color: var(--gold); }
.rq-bld .rowitem { display: flex; align-items: center; gap: 0.5em; padding: 0.25em 0.35em; border-radius: 0.4em; cursor: pointer; font-size: 0.92em; }
.rq-bld .rowitem:hover { background: var(--raise); } .rq-bld .rowitem.on { background: #3a3110; }
.rq-bld .rowitem small { margin-left: auto; color: var(--faint); font-family: var(--rq-font-game); white-space: nowrap; }
.rq-bld .rowitem .ico { color: #ff9a6a; } .rq-bld .rowitem.trap .ico { color: var(--gold2); } .rq-bld .rowitem.fine .ico { color: var(--go); }
.rq-bld .goal { display: flex; align-items: center; gap: 0.4em; margin: 0.3em 0; padding: 0.3em 0.45em; background: var(--panel2); border-radius: 0.45em; flex-wrap: wrap; }
.rq-bld .goal .x { margin-left: auto; }
.rq-bld .stat { grid-column: 1 / 4; display: flex; gap: 1em; padding: 0.3em 0.7em; background: #11151c; border-top: 1px solid var(--line); min-height: 1.9em; color: var(--dim); font-size: 0.9em; align-items: center; }
.rq-bld .stat .hint { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rq-bld .stat .hint.say { color: #fff3c4; }
.rq-bld .stat .read { font-family: var(--rq-font-game); white-space: nowrap; }
.rq-bld .menu { position: absolute; z-index: 8; display: none; width: max-content; min-width: 14em; max-width: 22em; padding: 0.3em; background: var(--panel2); border: 1px solid var(--line2); border-radius: 0.6em; box-shadow: 0 0.6em 2em #000a; }
.rq-bld .menu.on { display: block; }
.rq-bld .menu button { width: 100%; justify-content: flex-start; border: 0; background: none; border-radius: 0.4em; min-height: 2.1em; }
.rq-bld .menu button:hover { background: var(--raise); }
.rq-bld .menu button small { margin-left: auto; padding-left: 1.5em; color: var(--faint); }
.rq-bld .menu hr { border: 0; border-top: 1px solid var(--line); margin: 0.3em 0; }
.rq-bld .menu label { display: flex; align-items: center; gap: 0.5em; padding: 0.3em 0.6em; cursor: pointer; border-radius: 0.4em; } .rq-bld .menu label:hover { background: var(--raise); }
.rq-bld .modal { position: absolute; inset: 0; z-index: 9; display: none; background: #06080cb8; align-items: center; justify-content: center; }
.rq-bld .modal.on { display: flex; }
.rq-bld .sheet { width: min(52em, 92%); max-height: 88%; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line2); border-radius: 0.9em; box-shadow: 0 1em 4em #000c; }
.rq-bld .sheet > header { display: flex; align-items: center; gap: 0.6em; padding: 0.7em 1em; border-bottom: 1px solid var(--line); font-weight: 800; font-size: 1.1em; }
.rq-bld .sheet > header span { flex: 1; }
.rq-bld .sheet > div { padding: 0.8em 1em 1em; overflow-y: auto; }
.rq-bld .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(15em, 1fr)); gap: 0.6em; }
.rq-bld .card { display: flex; flex-direction: column; gap: 0.35em; padding: 0.7em 0.8em; background: var(--panel2); border: 1px solid var(--line); border-radius: 0.6em; }
.rq-bld .card b { color: var(--gold); } .rq-bld .card p { margin: 0; color: var(--dim); font-size: 0.9em; flex: 1; }
.rq-bld .card .row { display: flex; gap: 0.3em; }
.rq-bld .keys { display: grid; grid-template-columns: repeat(auto-fill, minmax(17em, 1fr)); gap: 0.2em 1.4em; }
.rq-bld .keys div { display: flex; justify-content: space-between; gap: 1em; padding: 0.2em 0; border-bottom: 1px solid var(--line); }
.rq-bld.solo [data-a=close], .rq-bld.solo [data-a=play] { display: none; }
`;

export interface BuilderHost {
  storage: { getItem(k: string): string | null; setItem(k: string, v: string): void };
  /** The player's saved levels (My Levels), shared with the game. */
  library?: MyLevels;
  /** Tries the level in the game. */
  play(level: CustomLevel): void;
  /** Called when the builder closes. */
  onClose(): void;
  /** 3D editing: flies through the level in the game; `done` gets the level back when he returns to the map. */
  fly?(level: CustomLevel, done: (level: CustomLevel) => void, jumpCheck: boolean): void;
  /** Live mode: shows the game inside the builder. `restart` puts him back at the start; otherwise he stays where he is. */
  live?: {
    update(level: CustomLevel, restart: boolean): void;
    /** Moves the game picture into the given box (or back out with null). */
    attachView(box: HTMLElement | null): void;
  };
}

type Tab = 'piece' | 'level' | 'outline' | 'problems';
type Drag =
  | { mode: 'draw'; sx: number; sz: number; cx: number; cz: number }
  | { mode: 'pan'; px: number; py: number }
  | { mode: 'box'; sx: number; sz: number; cx: number; cz: number }
  | { mode: 'move'; sx: number; sz: number; origs: Piece[]; ids: number[]; before: string; moved: boolean }
  | { mode: 'resize'; handle: Handle; orig: Piece; before: string; moved: boolean }
  | { mode: 'measure' }
  | { mode: 'pinch'; dist: number; scale: number; wx: number; wz: number };
interface Prefs {
  grid: boolean;
  snap: number;
  labels: boolean;
  hidden: LayerId[];
  shut: string[];
  recent: PieceType[];
  tab: Tab;
}
const PREFS_KEY = 'ratquest.builder.ui';

export class Builder {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly barEl: HTMLDivElement;
  private readonly palEl: HTMLDivElement;
  private readonly toolEl: HTMLDivElement;
  private readonly tabsEl: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly hintEl: HTMLSpanElement;
  private readonly readEl: HTMLSpanElement;
  private readonly menuEl: HTMLDivElement;
  private readonly modalEl: HTMLDivElement;
  private readonly mapWrap: HTMLDivElement;
  private readonly paneEl: HTMLDivElement;
  private readonly infoEl: HTMLDivElement;
  private readonly fileEl: HTMLInputElement;
  private level: CustomLevel;
  private tool: ToolId = 'select';
  private cursor: { x: number; z: number } | null = null;
  private hoverIdx = -1;
  private modal: '' | 'samples' | 'mine' | 'text' | 'help' = '';
  private menu: '' | 'file' | 'layers' | 'context' = '';
  private search = '';
  private filter = '';
  private said = '';
  /** Which of My Levels this is (null: not saved there yet). */
  private slotId: string | null = null;
  /** The jump checker: on or off, and what it found for the level as it was last checked. */
  private reachOn = false;
  private reachJson = '';
  private reachTimer = 0;
  private reach: { points: Array<[number, number, number]>; problems: ReachProblem[]; traps: Array<[number, number, number]> } | null = null;
  /** A Delete in My Levels waiting for its second tap. */
  private armedDelete = '';
  private armedNew = false;
  private live_ = false;
  private liveTimer = 0;
  private liveJson = '';
  private keepTimer = 0;
  private hover = false;
  private space = false;
  private playerAt: { x: number; z: number; f: number } | null = null;
  private firstTime = false;
  private top = 0;
  private dir: 'n' | 'e' | 's' | 'w' = 'n';
  private selected = -1;
  private view = { x: 0, z: 0, scale: 14 };
  private drag: Drag | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  /** Several pieces chosen at once (box-select, shift-click, or a shape just placed). Empty: just `selected`, if any. */
  private group: number[] = [];
  private open_ = false;
  private readonly history = new History();
  private clip: Piece[] = [];
  private measure: { a: { x: number; z: number }; b: { x: number; z: number } } | null = null;
  private prefs: Prefs = { grid: true, snap: 1, labels: true, hidden: [], shut: [], recent: [], tab: 'piece' };
  private drawQueued = false;

  constructor(parent: HTMLElement, private readonly host: BuilderHost) {
    useDevTheme();
    if (!document.getElementById('rq-bld-css')) {
      const st = document.createElement('style');
      st.id = 'rq-bld-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const saved = this.restore();
    this.slotId = host.storage.getItem('ratquest.custom.slot') || null;
    this.reachOn = host.storage.getItem('ratquest.builder.reach') === '1';
    if (this.slotId && !host.library?.get(this.slotId)) this.slotId = null;
    try {
      const p = JSON.parse(host.storage.getItem(PREFS_KEY) ?? '{}') as Partial<Prefs>;
      this.prefs = { ...this.prefs, ...p, snap: p.snap === 0.5 ? 0.5 : 1, hidden: Array.isArray(p.hidden) ? p.hidden : [], shut: Array.isArray(p.shut) ? p.shut : [], recent: Array.isArray(p.recent) ? p.recent.filter((t) => INFO.has(t)) : [] };
    } catch {
      // Broken settings: the defaults will do.
    }
    this.firstTime = saved === null;
    this.level = saved ?? emptyCustom();
    this.root = document.createElement('div');
    this.root.className = 'rq-bld rqd';
    this.root.innerHTML = `
      <div class="bar"></div>
      <div class="left"><div class="toolrow"></div><div class="search">${icon('search')}<input type="search" data-s="pal" placeholder="Find a piece" /></div><div class="pal"></div></div>
      <div class="mapwrap"><canvas class="map"></canvas><div class="float"><button data-a="z+" title="Zoom in (+)">${icon('zoomin')}</button><button data-a="z-" title="Zoom out (-)">${icon('zoomout')}</button><button data-a="fit" title="Fit the whole room (F)">${icon('fit')}</button></div></div>
      <div class="right"><div class="livepane"></div><div class="liveinfo"></div><div class="tabs"></div><div class="tabbody"></div></div>
      <div class="stat"><span class="hint"></span><span class="read"></span></div>
      <div class="menu"></div>
      <div class="modal"><div class="sheet"></div></div>
      <input type="file" accept=".json,.txt,application/json,text/plain" hidden />`;
    parent.appendChild(this.root);
    const q = <T extends HTMLElement>(sel: string): T => this.root.querySelector(sel) as T;
    this.canvas = q<HTMLCanvasElement>('canvas.map');
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.barEl = q('.bar');
    this.palEl = q('.pal');
    this.toolEl = q('.toolrow');
    this.tabsEl = q('.tabs');
    this.bodyEl = q('.tabbody');
    this.hintEl = q('.stat .hint');
    this.readEl = q('.stat .read');
    this.menuEl = q('.menu');
    this.modalEl = q('.modal');
    this.mapWrap = q('.mapwrap');
    this.paneEl = q('.livepane');
    this.infoEl = q('.liveinfo');
    this.fileEl = q('input[type=file]');
    this.canvas.addEventListener('pointerenter', () => (this.hover = true));
    this.canvas.addEventListener('pointerleave', () => {
      this.hover = false;
      this.hoverIdx = -1;
      this.queueDraw();
    });
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('change', (e) => this.onField(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('pointerover', (e) => this.onOver(e));
    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    this.canvas.addEventListener('pointerup', (e) => this.up(e));
    this.canvas.addEventListener('pointercancel', (e) => {
      this.pointers.delete(e.pointerId);
      this.drag = null;
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.contextAt(e);
    });
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e);
    }, { passive: false });
    this.fileEl.addEventListener('change', () => this.readFile());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.space = false;
    });
    new ResizeObserver(() => this.draw()).observe(this.canvas);
    this.sync();
  }

  get open(): boolean {
    return this.open_;
  }

  /** True while the game is shown inside the builder and keeps running. */
  get live(): boolean {
    return this.live_ && this.open_;
  }

  /** The editor as its own program: no way out, and it starts straight in the live view. */
  standalone(): void {
    this.root.classList.add('solo');
    document.title = 'RATQUEST Level Editor';
    this.show();
    this.setLive(true);
  }

  /** Development aid: opens a sample and starts watching it. */
  demo(sampleId: string): void {
    const sm = SAMPLES.find((x) => x.id === sampleId);
    const copy = sm ? parseCustom(JSON.stringify(sm.level)) : null;
    if (!copy) return;
    this.level = copy;
    this.modal = '';
    this.fit();
    this.setLive(true);
  }

  /** Where the rat is in the game, drawn on the map while watching. */
  setPlayer(x: number, z: number, facing: number): void {
    const p = this.playerAt;
    if (p && Math.abs(p.x - x) < 0.15 && Math.abs(p.z - z) < 0.15 && Math.abs(p.f - facing) < 0.2) return;
    this.playerAt = { x, z, f: facing };
    this.queueDraw();
  }

  /** A line of game status (goal, health) shown over the game while watching. */
  info(text: string): void {
    if (this.infoEl.textContent !== text) this.infoEl.textContent = text;
  }

  private setLive(on: boolean): void {
    if (on === this.live_ || !this.host.live) return;
    if (on) {
      const problems = checkCustom(this.level);
      if (problems.length) {
        this.prefs.tab = 'problems';
        this.sync();
        return this.say(problems.join(' '));
      }
      this.live_ = true;
      this.root.classList.add('live');
      this.host.live.attachView(this.paneEl);
      this.liveJson = JSON.stringify(this.level);
      this.host.live.update(this.level, true);
      this.say('Watching live: the game follows the map as you edit. Play it with the keyboard or a pad. With the pointer over the map, keys edit instead.');
    } else {
      this.live_ = false;
      window.clearTimeout(this.liveTimer);
      this.root.classList.remove('live');
      this.host.live.attachView(null);
      this.infoEl.textContent = '';
    }
    this.fit();
    this.sync();
  }

  /** After an edit while watching: reload the game with the change, a moment after the last edit. */
  private liveRefresh(restart = false): void {
    if (!this.live_ || !this.host.live) return;
    const json = JSON.stringify(this.level);
    if (json === this.liveJson && !restart) return;
    window.clearTimeout(this.liveTimer);
    this.liveTimer = window.setTimeout(() => {
      if (!this.live_ || !this.host.live) return;
      if (checkCustom(this.level).length) return;
      this.liveJson = JSON.stringify(this.level);
      this.host.live.update(this.level, restart);
    }, restart ? 0 : 300);
  }

  show(level?: CustomLevel): void {
    if (level) this.level = level;
    this.open_ = true;
    this.root.classList.add('open');
    if (this.firstTime) {
      // The first time, show the example levels so there is something to learn from.
      this.firstTime = false;
      this.modal = 'samples';
    }
    this.fit();
    this.said = '';
    this.sync();
    requestAnimationFrame(() => {
      this.fit();
      this.draw();
    });
  }

  hide(): void {
    if (this.live_) this.setLive(false);
    this.open_ = false;
    this.root.classList.remove('open');
    this.host.onClose();
  }

  /** The level as it is now. */
  current(): CustomLevel {
    return this.level;
  }

  /** Whether the jump checker is on (3D editing shows its findings too). */
  get jumpCheck(): boolean {
    return this.reachOn;
  }

  private restore(): CustomLevel | null {
    try {
      const raw = this.host.storage.getItem('ratquest.custom.v1');
      return raw ? parseCustom(raw) : null;
    } catch {
      return null;
    }
  }

  /** Something said to the builder: it stays along the bottom until the next thing is said or a tool is picked. */
  private say(s: string): void {
    this.said = s;
    this.renderStatus();
  }

  private keepPrefs(): void {
    try {
      this.host.storage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      // Not kept: no harm.
    }
  }

  // ---- Changes ----

  /** Call before changing the level: the way it was is kept for Undo. */
  private push(): void {
    this.history.push(JSON.stringify(this.level));
  }
  private undo(): void {
    const s = this.history.undo(JSON.stringify(this.level));
    if (!s) return this.say('Nothing to undo.');
    const l = parseCustom(s);
    if (l) this.level = l;
    this.clearSelection();
    this.say('Undone.');
    this.sync();
  }
  private redo(): void {
    const s = this.history.redo(JSON.stringify(this.level));
    if (!s) return this.say('Nothing to redo.');
    const l = parseCustom(s);
    if (l) this.level = l;
    this.clearSelection();
    this.say('Redone.');
    this.sync();
  }
  private clearSelection(): void {
    this.selected = -1;
    this.group = [];
  }
  /** The chosen pieces, as their places in the level's list. */
  private chosen(): number[] {
    return this.group.length ? this.group : this.selected >= 0 ? [this.selected] : [];
  }
  private choose(ids: number[]): void {
    this.group = ids.length > 1 ? ids : [];
    this.selected = ids.length === 1 ? ids[0] : -1;
  }

  /** Everything on the screen brought up to date with the level. */
  private sync(): void {
    this.renderBar();
    this.renderTools();
    this.renderPalette();
    this.renderTabs();
    this.renderMenu();
    this.renderModal();
    this.renderStatus();
    this.mapWrap.className = `mapwrap t-${this.tool === 'select' || this.tool === 'pan' || this.tool === 'erase' ? this.tool : 'draw'}`;
    this.draw();
    this.liveRefresh();
    this.reachRefresh();
    // The level being worked on is kept on the device as it changes, so closing the page loses nothing.
    window.clearTimeout(this.keepTimer);
    this.keepTimer = window.setTimeout(() => {
      try {
        this.host.storage.setItem('ratquest.custom.v1', JSON.stringify(this.level));
      } catch {
        // Could not be kept here.
      }
    }, 500);
  }

  /** Runs the jump checker a moment after the last edit (it takes a little while on a big level). */
  private reachRefresh(now = false): void {
    if (!this.reachOn) return;
    const json = JSON.stringify(this.level.pieces) + this.level.width + this.level.depth;
    if (json === this.reachJson && this.reach) return;
    window.clearTimeout(this.reachTimer);
    this.reachTimer = window.setTimeout(() => {
      this.reachJson = json;
      try {
        const def = compileCustom(this.level);
        const map = computeReach(def);
        const problems = unreachable(def, map);
        const reach = { points: map.points, problems, traps: [] as Array<[number, number, number]> };
        this.reach = reach;
        const said = problems.length ? `Jump check: ${problems.length} out of reach (red on the map, listed under Problems).` : 'Jump check: everything can be reached. Green shows where he can get to.';
        this.say(said);
        // Then the other way (it takes a moment longer, so the map shows first): places he can get into but never back
        // out of to the door, in orange.
        this.reachTimer = window.setTimeout(() => {
          if (this.reach !== reach || this.reachJson !== json) return;
          try {
            reach.traps = computeReach(def, { traps: true }).traps ?? [];
          } catch {
            return;
          }
          if (reach.traps.length) this.say(`${said} Orange: he could get stuck there, with no way back to the door.`);
          this.renderTabs();
          this.draw();
        }, 60);
      } catch {
        this.reach = null;
      }
      this.renderTabs();
      this.draw();
    }, now ? 0 : 400);
  }

  private shift(p: Piece, dx: number, dz: number): void {
    p.x0 += dx;
    p.x1 += dx;
    p.z0 += dz;
    p.z1 += dz;
  }

  private copy(cut = false): void {
    const ids = this.chosen().filter((k) => this.level.pieces[k].t !== 'spawn' && this.level.pieces[k].t !== 'exit');
    if (!ids.length) return this.say('Select something to copy (not the start or the exit).');
    this.clip = ids.map((k) => JSON.parse(JSON.stringify(this.level.pieces[k])) as Piece);
    if (cut) {
      this.push();
      const gone = new Set(ids);
      this.level.pieces = this.level.pieces.filter((_, k) => !gone.has(k));
      this.clearSelection();
    }
    this.say(`${this.clip.length} piece${this.clip.length === 1 ? '' : 's'} ${cut ? 'cut' : 'copied'}. Paste puts ${this.clip.length === 1 ? 'it' : 'them'} where the pointer is.`);
    this.sync();
  }
  private paste(): void {
    if (!this.clip.length) return this.say('Nothing copied yet.');
    this.push();
    const at = this.cursor ?? { x: this.view.x, z: this.view.z };
    const made = pasteAt(this.clip, at.x, at.z);
    const n = this.level.pieces.length;
    this.level.pieces.push(...made);
    this.choose(made.map((_, k) => n + k));
    this.tool = 'select';
    this.say(`Pasted ${made.length}. ${made.length === 1 ? 'It is' : 'They are'} selected: drag to move.`);
    this.sync();
  }
  private duplicate(): void {
    const ids = this.chosen().filter((k) => this.level.pieces[k].t !== 'spawn' && this.level.pieces[k].t !== 'exit');
    if (!ids.length) return this.say('Select something to duplicate (not the start or the exit).');
    this.push();
    const copies = ids.map((k) => JSON.parse(JSON.stringify(this.level.pieces[k])) as Piece);
    for (const c of copies) this.shift(c, 2, 2);
    const n = this.level.pieces.length;
    this.level.pieces.push(...copies);
    this.choose(copies.map((_, k) => n + k));
    this.say(`${copies.length === 1 ? 'Duplicated' : `${copies.length} pieces duplicated`}. The copy is selected: drag it, or use the arrow keys.`);
    this.sync();
  }
  private applyToSelected(f: (p: Piece) => void): boolean {
    const ids = this.chosen();
    if (!ids.length) return false;
    this.push();
    for (const k of ids) f(this.level.pieces[k]);
    return true;
  }
  private deleteSelected(): void {
    const ids = this.chosen();
    if (!ids.length) return;
    this.push();
    const gone = new Set(ids);
    this.level.pieces = this.level.pieces.filter((_, k) => !gone.has(k));
    this.say(`${gone.size === 1 ? 'Piece' : `${gone.size} pieces`} deleted.`);
    this.clearSelection();
    this.sync();
  }
  private turn(): void {
    const ids = this.chosen();
    if (!ids.length) return this.say('Select something to turn.');
    this.push();
    const ps = ids.map((k) => this.level.pieces[k]);
    const c = groupCentre(ps);
    turnQuarter(ps, c.x, c.z);
    this.sync();
  }
  private flip(axis: 'x' | 'z'): void {
    const ids = this.chosen();
    if (!ids.length) return this.say('Select something to flip.');
    this.push();
    flipPieces(ids.map((k) => this.level.pieces[k]), axis);
    this.sync();
  }
  private selectAll(): void {
    const ids = this.level.pieces.map((_, k) => k).filter((k) => !this.hiddenPiece(this.level.pieces[k]));
    this.choose(ids);
    this.tool = 'select';
    this.say(`${ids.length} pieces selected.`);
    this.sync();
  }
  private hiddenPiece(p: Piece): boolean {
    return this.prefs.hidden.includes(info(p.t).layer);
  }

  // ---- Fields ----

  private onInput(e: Event): void {
    const t = e.target as HTMLInputElement;
    if (t.dataset.s === 'pal') {
      this.search = t.value;
      this.renderPalette();
    } else if (t.dataset.s === 'outline') {
      this.filter = t.value;
      this.renderOutlineList();
    }
  }

  private onField(e: Event): void {
    const t = e.target as HTMLInputElement;
    const ds = t.dataset;
    if (ds.s) return;
    if (ds.layer) {
      const id = ds.layer as LayerId;
      this.prefs.hidden = t.checked ? this.prefs.hidden.filter((l) => l !== id) : [...this.prefs.hidden, id];
      this.keepPrefs();
      this.clearSelection();
      this.renderTabs();
      return this.draw();
    }
    if (ds.top) {
      const n = Number(t.value);
      if (Number.isFinite(n)) this.top = Math.round(n * 10) / 10;
      return this.sync();
    }
    // Level settings.
    if (ds.l) {
      this.push();
      const v = t.value;
      const L = this.level;
      if (ds.l === 'name') L.name = v;
      else if (ds.l === 'blurb') L.blurb = v;
      else if (ds.l === 'theme') L.theme = THEMES.find((th) => th.id === v)?.id;
      else if (ds.l === 'music') L.music = v === 'pump' || v === 'drift' || v === 'groove' || v === 'echo' || v === 'march' ? v : undefined;
      else if (ds.l === 'width' || ds.l === 'depth') L[ds.l] = Math.min(120, Math.max(10, Number(v) || 40));
      else if (ds.l === 'hubDoor') {
        if (v === 'west' || v === 'east') L.hubDoor = v;
        else delete L.hubDoor;
      } else if (ds.l === 'noGrab' || ds.l === 'noLongJump' || ds.l === 'fallBack') {
        if (t.checked) L[ds.l] = true;
        else delete L[ds.l];
      } else if (ds.l === 'hubNeed') L.hubNeed = Math.max(0, Math.round(Number(v) || 0));
      else if (ds.l === 'wallHeight') L.wallHeight = Math.min(40, Math.max(4, Number(v) || 12));
      else if (ds.l === 'fog') {
        const f = FOGS.find((x) => x[0] === v)?.[2];
        if (f) L.fogRange = [f[0], f[1]];
        else delete L.fogRange;
      }
      return this.sync();
    }
    if (ds.g) {
      const [i, field] = ds.g.split(':');
      const g = this.level.goals?.[Number(i)];
      if (!g || g.type !== 'collect') return;
      this.push();
      if (field === 'kind') g.kind = t.value as 'crumb' | 'cap' | 'relic';
      else g.count = /^all$/i.test(t.value.trim()) ? 'all' : Math.max(1, Math.round(Number(t.value) || 1));
      return this.sync();
    }
    const p = this.level.pieces[this.selected];
    if (!p) return;
    if (ds.p === 'skin') {
      this.push();
      if (t.value) p.skin = t.value as typeof p.skin;
      else delete p.skin;
      return this.sync();
    }
    if (ds.p === 'w' || ds.p === 'd') {
      const n = Number(t.value);
      if (!Number.isFinite(n) || n <= 0) return this.sync();
      this.push();
      const b = pieceBounds(p);
      if (ds.p === 'w') Object.assign(p, { x0: b.x0, x1: b.x0 + n });
      else Object.assign(p, { z0: b.z0, z1: b.z0 + n });
      return this.sync();
    }
    if (ds.p) {
      const k = ds.p as 'x0' | 'z0' | 'top' | 'bottom';
      const n = Number(t.value);
      if (!Number.isFinite(n)) return this.sync();
      this.push();
      if (k === 'bottom' && t.value.trim() === '') delete p.bottom;
      else if (k === 'x0' || k === 'z0') {
        // Moving it keeps its size.
        const b = pieceBounds(p);
        const v = Math.round(n * 10) / 10;
        if (k === 'x0') Object.assign(p, { x0: v, x1: v + (b.x1 - b.x0) });
        else Object.assign(p, { z0: v, z1: v + (b.z1 - b.z0) });
      } else p[k] = Math.round(n * 10) / 10;
      return this.sync();
    }
    if (ds.pp) {
      this.push();
      const props = (p.props ??= {});
      if (ds.pp === 'who') {
        const c = CHARACTERS.find((x) => x[0] === t.value);
        if (c) {
          props.kind = c[2];
          if (c[1]) props.name = c[1];
        }
      } else if (ds.pp === 'auto') props.auto = t.checked ? 3 : undefined;
      else if (ds.pp === 'hint') props.hint = t.value;
      else if (ds.pp === 'appears') props.appears = (WEDGE_APPEARS.find((a) => a[0] === t.value)?.[0] ?? 'start') as WedgeAppears;
      else if (ds.pp === 'name') props.name = t.value;
      else if (ds.pp === 'kind') props.kind = t.value === 'bird' ? 'bird' : t.value === 'villain' ? 'villain' : t.value === 'pigeon' ? 'pigeon' : 'mouse';
      else if (ds.pp === 'lines') props.lines = t.value.split('\n');
      else if (ds.pp === 'item') {
        if (t.value === 'crumb' || t.value === 'cap' || t.value === 'relic') props.item = t.value;
        else delete props.item;
      } else if (ds.pp === 'tough') {
        if (t.checked) props.tough = true;
        else delete props.tough;
      } else if (ds.pp === 'respawn') props.respawn = t.checked;
      else if (ds.pp === 'perch') {
        if (t.value === 'chain') props.perch = 'chain';
        else delete props.perch;
      } else if (ds.pp === 'wave') props.wave = Math.max(0, Math.round(Number(t.value) || 0));
      else if (ds.pp === 'move') props.move = (['up', 'n', 'e', 's', 'w'] as const).find((m) => m === t.value) ?? 'up';
      else if (ds.pp === 'travel') props.travel = Math.max(0.5, Number(t.value) || 4);
      else if (ds.pp === 'speed') props.speed = Math.max(0.5, Number(t.value) || 2);
      else if (ds.pp === 'pause') props.pause = Math.max(0, Number(t.value) || 0);
      else if (ds.pp === 'color') props.color = t.value;
      else if (ds.pp === 'flash') props.flash = Math.max(0, Math.min(8, Number(t.value) || 0));
      else if (ds.pp === 'opens') props.opens = t.value === 'pipes' ? 'pipes' : t.value === 'plates' ? 'plates' : 'goals';
      else if (ds.pp === 'spawns') {
        const k = ENEMY_PIECES.find((e) => e === t.value && e !== 'brood' && e !== 'wyrm');
        if (k) props.spawns = k;
        else delete props.spawns;
      } else if (ds.pp === 'mugs') props.mugs = Math.max(0, Math.min(4, Math.round(Number(t.value) || 0)));
      else if (ds.pp === 'candle' || ds.pp === 'cards') {
        if (t.checked) props[ds.pp] = true;
        else delete props[ds.pp];
      }
      this.sync();
    }
  }

  // ---- The bar along the top ----

  private renderBar(): void {
    const json = JSON.stringify(this.level);
    const inLib = this.slotId ? this.host.library?.get(this.slotId) : null;
    const dirty = !inLib || JSON.stringify(inLib.level) !== json;
    const any = this.chosen().length > 0;
    const problems = checkCustom(this.level).length + (this.reachOn && this.reach ? this.reach.problems.length : 0);
    const b = (a: string, ic: string, label: string, title: string, cls = '', off = false): string => `<button data-a="${a}" class="${cls}" title="${title}"${off ? ' disabled' : ''}>${icon(ic)}${label ? `<span>${label}</span>` : ''}</button>`;
    this.barEl.innerHTML = `
      <div class="brand"><svg viewBox="0 0 24 24"><path d="M2 18 L22 18 L22 8 Z" fill="#ffc94a" stroke="#7a4a00" stroke-width="1.5" stroke-linejoin="round"/><circle cx="17" cy="14.5" r="1.4" fill="#c98a12"/><circle cx="12" cy="16" r="1" fill="#c98a12"/></svg><b>LEVEL EDITOR</b></div>
      ${b('m:file', 'file', 'File', 'File: new, open, save, samples, import and export', this.menu === 'file' ? 'on' : '')}
      <input class="name" type="text" data-l="name" value="${esc(this.level.name)}" title="The level's name" />
      <span class="state${dirty ? ' dirty' : ''}" title="${dirty ? 'The level as it is now is kept on this device, but it is not saved to My Levels yet (File, Save).' : 'Saved to My Levels: it is in the game\'s LEVELS menu.'}"><i></i>${dirty ? 'not saved' : 'saved'}</span>
      <span class="sep"></span>
      ${b('undo', 'undo', '', 'Undo (Ctrl+Z)', 'ghost', !this.history.canUndo)}${b('redo', 'redo', '', 'Redo (Ctrl+Y)', 'ghost', !this.history.canRedo)}
      <span class="sep"></span>
      ${b('copy', 'copy', '', 'Copy (Ctrl+C)', 'ghost', !any)}${b('paste', 'paste', '', 'Paste at the pointer (Ctrl+V)', 'ghost', !this.clip.length)}${b('dup', 'dup', '', 'Duplicate (Ctrl+D)', 'ghost', !any)}${b('del', 'trash', '', 'Delete (Del)', 'ghost', !any)}
      <span class="sep"></span>
      ${b('grid', 'grid', '', 'Show the grid (G)', `ghost${this.prefs.grid ? ' on' : ''}`)}${b('snap', 'snap', this.prefs.snap === 1 ? '1' : '½', 'Snap to whole squares or half squares', 'ghost')}${b('m:layers', 'layers', '', 'Show or hide kinds of piece', `ghost${this.menu === 'layers' || this.prefs.hidden.length ? ' on' : ''}`)}
      <span class="sep"></span>
      ${b('reach', 'check', 'Jump check', 'Jump check: works out where he can get to. Green is reachable, red rings are not, orange is a trap', this.reachOn ? 'on' : '')}
      ${problems ? `<button data-a="tab:problems" class="danger" title="What is wrong with the level">${icon('warn')}<span>${problems}</span></button>` : ''}
      <span class="grow"></span>
      ${this.host.live ? b('live', 'eye', this.live_ ? 'Watching' : 'Watch', 'Watch: show the game beside the map; it follows your edits', this.live_ ? 'on opt' : 'opt') : ''}
      ${this.host.fly ? b('fly', 'cube', '3D', 'Fly through the level and place pieces in 3D', 'opt') : ''}
      ${b('playhere', 'here', 'Play here', 'Start playing from the square last clicked on the map', 'go')}
      ${b('play', 'play', 'Play', 'Play the level from its start (P)', 'go')}
      ${b('help', 'help', '', 'Keys and tips (?)', 'ghost')}
      ${b('close', 'close', '', 'Close the editor', 'ghost')}`;
  }

  private renderTools(): void {
    const t = (id: 'select' | 'erase' | 'pan' | 'measure', ic: string, label: string, key: string): string => `<button data-tool="${id}" class="${this.tool === id ? 'on' : ''}" title="${TOOL_HINT[id]} (${key})">${icon(ic)}${label}</button>`;
    this.toolEl.innerHTML = t('select', 'select', 'Select', 'V') + t('erase', 'erase', 'Erase', 'E') + t('pan', 'pan', 'Pan', 'H') + t('measure', 'measure', 'Measure', 'M');
  }

  private tile(i: PieceInfo): string {
    return `<button class="tile${this.tool === i.t ? ' on' : ''}" data-tool="${i.t}" data-tip="${esc(i.label)}: ${esc(i.tip)}"><span class="sw${SINGLE.has(i.t) ? ' dot' : ''}" style="background:${i.color}">${i.glyph}</span>${i.label}</button>`;
  }
  private renderPalette(): void {
    const find = this.search.trim().toLowerCase();
    let h = '';
    if (find) {
      const hits = GROUPS.flatMap((g) => g.items).filter((i) => i.label.toLowerCase().includes(find) || i.t.includes(find) || i.tip.toLowerCase().includes(find));
      const stamps = STAMPS.filter((s) => s.label.toLowerCase().includes(find));
      h = hits.length || stamps.length
        ? `<h4 style="cursor:default">Found<span class="badge">${hits.length + stamps.length}</span></h4><div class="tiles">${hits.map((i) => this.tile(i)).join('')}${stamps.map((s) => `<button class="tile${this.tool === `stamp:${s.id}` ? ' on' : ''}" data-tool="stamp:${s.id}" data-tip="${esc(s.label)}: a ready-made shape. Click to place it."><span class="sw" style="background:#3d4660;color:#fffc">▦</span>${s.label}</button>`).join('')}</div>`
        : '<div class="note">Nothing by that name.</div>';
    } else {
      const recent = this.prefs.recent.map((t) => INFO.get(t)).filter((i): i is PieceInfo => !!i);
      if (recent.length) h += `<h4 style="cursor:default">Recent</h4><div class="tiles">${recent.map((i) => this.tile(i)).join('')}</div>`;
      for (const g of GROUPS) {
        const shut = this.prefs.shut.includes(g.id);
        h += `<h4 data-shut="${g.id}" class="${shut ? 'shut' : ''}">${g.label}<span class="badge">${g.items.length}</span></h4>${shut ? '' : `<div class="tiles">${g.items.map((i) => this.tile(i)).join('')}</div>`}`;
      }
      const shut = this.prefs.shut.includes('shapes');
      h += `<h4 data-shut="shapes" class="${shut ? 'shut' : ''}">Ready-made shapes<span class="badge">${STAMPS.length}</span></h4>${shut ? '' : `<div class="tiles">${STAMPS.map((s) => `<button class="tile${this.tool === `stamp:${s.id}` ? ' on' : ''}" data-tool="stamp:${s.id}" data-tip="${esc(s.label)}: a ready-made shape. Click on the map to place it; it stays selected so it can be moved or turned."><span class="sw" style="background:#3d4660;color:#fffc">▦</span>${s.label}</button>`).join('')}</div>`}`;
    }
    this.palEl.innerHTML = h;
  }

  // ---- The panel on the right ----

  private renderTabs(): void {
    const problems = checkCustom(this.level).length + (this.reachOn && this.reach ? this.reach.problems.length + (this.reach.traps.length ? 1 : 0) : 0);
    const tab = (id: Tab, label: string, extra = ''): string => `<button data-a="tab:${id}" class="${this.prefs.tab === id ? 'on' : ''}">${label}${extra}</button>`;
    this.tabsEl.innerHTML = tab('piece', 'Piece') + tab('level', 'Level') + tab('outline', 'Outline') + tab('problems', 'Problems', problems ? ` <span class="badge bad">${problems}</span>` : '');
    const t = this.prefs.tab;
    this.bodyEl.innerHTML = t === 'piece' ? this.pieceTab() : t === 'level' ? this.levelTab() : t === 'outline' ? this.outlineTab() : this.problemsTab();
    if (t === 'outline') this.renderOutlineList();
  }

  private heightRow(value: number, forNew: boolean): string {
    const a = forNew ? 'h' : 'ph';
    return `<div class="field"><span>Height</span><div class="step"><button data-a="${a}:-0.5" title="Half a unit lower ([)">−</button><b>${value.toFixed(1)}</b><button data-a="${a}:0.5" title="Half a unit higher (])">+</button><button data-a="${a}:-0.1" title="A little lower">−.1</button><button data-a="${a}:0.1" title="A little higher">+.1</button></div></div>
      <div class="chips">${[0, 1, 2, 3, 4, 6, 8].map((v) => `<button data-a="${a}=${v}" class="${Math.abs(value - v) < 0.01 ? 'on' : ''}">${v}</button>`).join('')}</div>`;
  }
  private compass(cur: 'n' | 'e' | 's' | 'w'): string {
    const d = (k: 'n' | 'e' | 's' | 'w'): string => `<button data-a="dir:${k}" class="${cur === k ? 'on' : ''}" title="${DIR_NAME[k]}">${k.toUpperCase()}</button>`;
    return `<div class="field"><span>Faces</span><div class="compass"><i></i>${d('n')}<i></i>${d('w')}<i>${DIR_NAME[cur].slice(0, 1)}</i>${d('e')}<i></i>${d('s')}<i></i></div></div>`;
  }

  private pieceTab(): string {
    const ids = this.chosen();
    if (ids.length > 1) {
      const kinds = new Map<string, number>();
      for (const k of ids) kinds.set(info(this.level.pieces[k].t).label, (kinds.get(info(this.level.pieces[k].t).label) ?? 0) + 1);
      return `<div class="head">${ids.length} pieces selected</div>
        <div class="note">${[...kinds].map(([n, c]) => `${c} × ${n}`).join(', ')}</div>
        <div class="note">Drag any of them to move them all. The arrow keys nudge (with Shift, five squares).</div>
        ${this.actions(true)}`;
    }
    const p = this.level.pieces[this.selected];
    if (!p) {
      // Nothing selected: what the next piece will be like.
      const tool = INFO.get(this.tool as PieceType);
      const facing = tool ? FACES.has(tool.t) : true;
      return `<div class="head">${tool ? `<span class="sw${SINGLE.has(tool.t) ? ' dot' : ''}" style="background:${tool.color}">${tool.glyph}</span>New ${tool.label.toLowerCase()}` : 'Nothing selected'}</div>
        <div class="note">${tool ? esc(tool.tip) : 'Click a piece on the map to see and change its settings here, or pick a piece on the left to place a new one.'}</div>
        <h4>The next piece</h4>
        ${this.heightRow(this.top, true)}
        ${facing ? this.compass(this.dir) : ''}
        <div class="note">Height is the top of floors and slabs, and where crates, creatures and lamps stand or hang.</div>`;
    }
    const i = info(p.t);
    const single = SINGLE.has(p.t);
    const b = pieceBounds(p);
    const num = (k: string, v: number | undefined, step = 0.5, ph = ''): string => `<input type="number" step="${step}" data-p="${k}" value="${v ?? ''}" placeholder="${ph}" />`;
    let h = `<div class="head"><span class="sw${single ? ' dot' : ''}" style="background:${i.color}">${i.glyph}</span>${i.label}</div><div class="note">${esc(i.tip)}</div>`;
    h += `<div class="field"><span>Place x, z</span><div class="two">${num('x0', b.x0)}${num('z0', b.z0)}</div></div>`;
    if (!single) h += `<div class="field"><span>Size w, d</span><div class="two">${num('w', b.x1 - b.x0)}${num('d', b.z1 - b.z0)}</div></div>`;
    h += this.heightRow(p.top, false);
    h += `<div class="field"><span>${p.t === 'stairs' || p.t === 'ramp' ? 'Top' : 'Height'} exactly</span>${num('top', p.top, 0.1)}</div>`;
    if (!single && p.t !== 'water' && p.t !== 'river' && p.t !== 'lava' && p.t !== 'fire' && p.t !== 'bridge') h += `<div class="field"><span>${p.t === 'stairs' ? 'Starts at' : 'Bottom'}</span>${num('bottom', p.bottom, 0.5, p.t === 'stairs' ? '0' : 'auto')}</div>`;
    if (FACES.has(p.t)) h += this.compass(p.dir ?? (ENEMY_PIECES.includes(p.t) ? 's' : 'n'));
    if (BOX_TYPES.includes(p.t)) {
      const groups: Array<[string, readonly string[]]> = [['sewer', TEXTURE_SETS.sewer], ['mine', TEXTURE_SETS.tunnel], ['cave', TEXTURE_SETS.cave], ['plain', TEXTURE_SETS.shared]];
      h += `<div class="field"><span>Look</span><select data-p="skin"><option value="">the level's look</option>${groups.map(([g, names]) => `<optgroup label="${g}">${names.map((n) => `<option value="${n}"${p.skin === n ? ' selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('')}</select></div>`;
    }
    const pr = p.props ?? {};
    const sel = (key: string, cur: string, opts: ReadonlyArray<readonly [string, string]>): string => `<select data-pp="${key}">${opts.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    if (p.t === 'npc') {
      const nm = (pr.name ?? '').toUpperCase();
      const preset = CHARACTERS.find((c) => c[1] && c[1] === nm && c[2] === (pr.kind ?? 'mouse'))?.[0] ?? ((pr.kind ?? 'mouse') === 'bird' ? 'bird' : 'mouse');
      h += `<h4>Who it is</h4><div class="field"><span>Character</span>${sel('who', preset, CHARACTERS.map(([id, n, k]) => [id, n ? n.toLowerCase() : `another ${k}`] as const))}</div>`;
      h += `<div class="field"><span>Name</span><input type="text" data-pp="name" value="${esc(pr.name ?? '')}" placeholder="${pr.kind === 'bird' ? 'FINCH' : 'PIP'}" /></div>`;
      h += `<div class="field"><span>Looks like</span>${sel('kind', pr.kind ?? 'mouse', [['mouse', 'mouse'], ['bird', 'bird'], ['pigeon', 'pigeon'], ['villain', 'the villain']])}</div>`;
      h += `<div class="field"><span>Talks first</span><input class="chk" type="checkbox" data-pp="auto"${pr.auto ? ' checked' : ''} title="Starts talking by himself when the rat comes near" /></div>`;
      h += `<div class="note">What they say, one box of talk per line:</div><textarea data-pp="lines" rows="6" spellcheck="false">${(pr.lines ?? []).join('\n').replace(/</g, '&lt;')}</textarea>`;
    }
    if (p.t === 'wedge') {
      const n = this.level.pieces.filter((q) => q.t === 'wedge').indexOf(p);
      h += `<h4>The wedge</h4><div class="field"><span>Name</span><input type="text" data-pp="name" value="${esc(pr.name ?? '')}" placeholder="Golden Wedge ${n + 1}" /></div>`;
      h += `<div class="field"><span>Clue</span><input type="text" data-pp="hint" value="${esc(pr.hint ?? '')}" placeholder="for the quest screen" /></div>`;
      h += `<div class="field"><span>Appears</span>${sel('appears', pr.appears ?? 'start', WEDGE_APPEARS)}</div>`;
      if ((pr.appears ?? 'start') === 'reach' && !this.level.pieces.some((q) => q.t === 'mark')) h += '<div class="note warn">Place a goal marker for this.</div>';
      h += '<div class="note">Golden Wedges make this an open course: the first one taken opens the door.</div>';
    }
    if (p.t === 'pot') h += `<h4>Inside</h4><div class="field"><span>Holds</span>${sel('item', pr.item ?? '', [['', 'nothing'], ['crumb', 'a cheese crumb'], ['cap', 'a bottle cap'], ['relic', 'a relic']])}</div>`;
    if (p.t === 'plate') {
      h += `<h4>The plate</h4><div class="field"><span>Puts in</span>${sel('spawns', pr.spawns ?? '', [['', 'nothing: it opens gates'], ...ENEMY_PIECES.filter((t) => t !== 'brood' && t !== 'wyrm').map((t) => [t, info(t).label] as [string, string])])}</div>`;
      if (pr.spawns) h += `<div class="note">Each step on it puts in one more, ${BUTTON_OUT} along the way it faces (turn it with R), up to ${BUTTON_MOST} alive at once.</div>`;
    }
    if (p.t === 'table') {
      h += `<h4>On the table</h4><div class="field"><span>Thimbles</span><input type="number" min="0" max="4" step="1" data-pp="mugs" value="${pr.mugs ?? 2}" /></div>`;
      h += `<div class="field"><span>Candle</span><input class="chk" type="checkbox" data-pp="candle"${pr.candle ? ' checked' : ''} /></div>`;
      h += `<div class="field"><span>Cards</span><input class="chk" type="checkbox" data-pp="cards"${pr.cards ? ' checked' : ''} /></div>`;
    }
    if (p.t === 'crate' || p.t === 'barrel') {
      h += `<h4>Inside</h4><div class="field"><span>Holds</span>${sel('item', pr.item ?? '', [['', 'nothing'], ['crumb', 'a cheese crumb'], ['cap', 'a bottle cap'], ['relic', 'a relic']])}</div>`;
      if (p.t === 'crate') h += `<div class="field"><span>Iron-bound</span><input class="chk" type="checkbox" data-pp="tough"${pr.tough ? ' checked' : ''} title="Only a heavy blade breaks it (the Cleaver)" /></div>`;
    }
    if (p.t === 'light') {
      h += `<h4>The light</h4><div class="field"><span>Colour</span>${sel('color', pr.color ?? 'red', ['red', 'yellow', 'blue', 'green', 'purple', 'white'].map((c) => [c, c] as const))}</div>`;
      h += `<div class="field"><span>Flashes</span><input type="number" step="0.5" min="0" max="8" data-pp="flash" value="${pr.flash ?? 0}" title="Times a second; 0 is steady" /></div>`;
    }
    if (p.t === 'banner' || p.t === 'crystal') {
      const opts = p.t === 'banner' ? ['purple', 'red', 'green', 'blue', 'black', 'gold'] : ['blue', 'purple', 'green', 'yellow', 'red', 'white'];
      h += `<div class="field"><span>Colour</span>${sel('color', pr.color ?? opts[0], opts.map((c) => [c, c] as const))}</div>`;
    }
    if (ENEMY_PIECES.includes(p.t)) {
      h += '<h4>In the fight</h4>';
      if (p.t !== 'brood' && p.t !== 'wyrm') {
        h += `<div class="field"><span>Arrives</span><input type="number" min="0" step="1" data-pp="wave" value="${pr.wave ?? 0}" title="0: there from the start. 1, 2, 3: comes with that wave, once the one before is beaten" /></div>`;
        h += `<div class="field"><span>Comes back</span><input class="chk" type="checkbox" data-pp="respawn"${pr.respawn ? ' checked' : ''} title="Returns a while after it is beaten" /></div>`;
      } else h += '<div class="note">A boss: its name and health show along the bottom while it fights. Give it a wide, clear floor.</div>';
      if (p.t === 'bat') h += `<div class="field"><span>Hangs from</span>${sel('perch', pr.perch ?? 'rock', [['rock', 'a knob of rock'], ['chain', 'a chain']])}</div>`;
    }
    if (p.t === 'gate') h += `<h4>The gate</h4><div class="field"><span>Opens when</span>${sel('opens', pr.opens ?? 'goals', [['goals', 'the goals are done'], ['pipes', 'the pipes are burst'], ['plates', 'the plates are pressed']])}</div>`;
    if (p.t === 'lift') {
      h += `<h4>How it moves</h4><div class="field"><span>Glides</span>${sel('move', pr.move ?? 'up', [['up', 'up and down'], ['n', 'north'], ['e', 'east'], ['s', 'south'], ['w', 'west']])}</div>`;
      h += `<div class="field"><span>How far</span><input type="number" step="0.5" min="0.5" data-pp="travel" value="${pr.travel ?? 4}" /></div>`;
      h += `<div class="field"><span>Speed</span><input type="number" step="0.5" min="0.5" data-pp="speed" value="${pr.speed ?? 2}" /></div>`;
      h += `<div class="field"><span>Waits (s)</span><input type="number" step="0.5" min="0" data-pp="pause" value="${pr.pause ?? 1.5}" /></div>`;
    }
    return h + this.actions(false);
  }
  private actions(group: boolean): string {
    const b = (a: string, ic: string, label: string, title: string, cls = ''): string => `<button data-a="${a}" class="${cls}" title="${title}">${icon(ic)}${label}</button>`;
    return `<h4>Do</h4><div class="acts">
      ${b('dup', 'dup', 'Duplicate', 'Ctrl+D')}${b('copy', 'copy', 'Copy', 'Ctrl+C')}
      ${b('rot', 'turn', 'Turn 90°', 'R')}${b('flipx', 'fliph', 'Flip ↔', 'Mirror left and right')}
      ${b('flipz', 'flipv', 'Flip ↕', 'Mirror north and south')}${b('same', 'layers', group ? 'Deselect' : 'All like it', group ? 'Esc' : 'Select every piece of this kind')}
      ${b('up', 'up', 'Raise', 'Half a unit up (])')}${b('down', 'down', 'Lower', 'Half a unit down ([)')}
      ${b('del', 'trash', 'Delete', 'Del', 'danger')}</div>`;
  }

  private levelTab(): string {
    const L = this.level;
    const s = levelStats(L, ENEMY_PIECES);
    const goals = L.goals ?? [];
    const wedges = L.pieces.some((p) => p.t === 'wedge');
    const goalRow = (g: CustomGoal, i: number): string => {
      if (g.type === 'collect') {
        return `<div class="goal">Collect <input type="text" data-g="${i}:count" size="3" style="width:3.6em" value="${g.count}" title="A number, or all" /> <select data-g="${i}:kind">${(['crumb', 'cap', 'relic'] as const).map((k) => `<option value="${k}"${k === g.kind ? ' selected' : ''}>${k}s</option>`).join('')}</select><button class="x ghost" data-a="gdel:${i}" title="Remove this goal">${icon('close')}</button></div>`;
      }
      const text = { defeat: 'Defeat every enemy', waves: 'Beat every wave of enemies', burst: 'Burst every wall pipe', reach: 'Reach the goal marker' }[g.type];
      return `<div class="goal">${text}<button class="x ghost" data-a="gdel:${i}" title="Remove this goal">${icon('close')}</button></div>`;
    };
    const fog = FOGS.find((f) => f[2] && L.fogRange && f[2][0] === L.fogRange[0] && f[2][1] === L.fogRange[1])?.[0] ?? '';
    return `<h4>The level</h4>
      <div class="field"><span>Name</span><input type="text" data-l="name" value="${esc(L.name)}" /></div>
      <div class="field"><span>Description</span><input type="text" data-l="blurb" value="${esc(L.blurb ?? '')}" placeholder="shown in the LEVELS menu" /></div>
      <div class="field"><span>Room w, d</span><div class="two"><input type="number" data-l="width" value="${L.width}" min="10" max="120" /><input type="number" data-l="depth" value="${L.depth}" min="10" max="120" /></div></div>
      <div class="field"><span>Wall height</span><input type="number" data-l="wallHeight" value="${L.wallHeight}" min="4" max="40" /></div>
      <h4>Look and sound</h4>
      <div class="field"><span>Look</span><select data-l="theme">${THEMES.map((th) => `<option value="${th.id}"${(L.theme ?? 'sewer') === th.id ? ' selected' : ''}>${th.label}</option>`).join('')}</select></div>
      <div class="field"><span>How far he sees</span><select data-l="fog">${FOGS.map(([v, l]) => `<option value="${v}"${v === fog ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><span>Music</span><select data-l="music">${([['', 'calm drift'], ['pump', 'pumping beat'], ['groove', "Dave's groove"], ['echo', 'cave echo'], ['march', 'the march (a boss)']] as const).map(([v, l]) => `<option value="${v}"${(L.music ?? '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <h4>Rules</h4>
      <div class="field"><span>Falls</span><label style="display:flex;gap:0.4em;align-items:center"><input type="checkbox" data-l="fallBack"${L.fallBack ? ' checked' : ''} />put him back where he fell from</label></div>
      <div class="field"><span>Ledge grab</span><label style="display:flex;gap:0.4em;align-items:center"><input type="checkbox" data-l="noGrab"${L.noGrab ? ' checked' : ''} />switched off here</label></div>
      <div class="field"><span>Long jump</span><label style="display:flex;gap:0.4em;align-items:center"><input type="checkbox" data-l="noLongJump"${L.noLongJump ? ' checked' : ''} />switched off here</label></div>
      <h4>Goals</h4>
      <div class="note">${wedges ? 'This level has Golden Wedges, so they are its goals and the list below is ignored.' : goals.length ? 'The door opens when all of these are done.' : 'None set: the game picks goals from what is in the level (beat the enemies, or reach the door).'}</div>
      ${goals.map(goalRow).join('')}
      <div class="chips"><button data-a="gadd:collect">+ Collect</button><button data-a="gadd:defeat">+ Defeat</button><button data-a="gadd:waves">+ Waves</button><button data-a="gadd:burst">+ Burst pipes</button><button data-a="gadd:reach">+ Reach marker</button></div>
      <h4>In the Club</h4>
      <div class="field"><span>Hangs on</span><select data-l="hubDoor"><option value="">no door</option><option value="west"${L.hubDoor === 'west' ? ' selected' : ''}>the left guest door</option><option value="east"${L.hubDoor === 'east' ? ' selected' : ''}>the right guest door</option></select></div>
      <div class="field"><span>Wedges to open</span><input type="number" min="0" data-l="hubNeed" value="${L.hubNeed ?? 0}" /></div>
      <h4>What is in it</h4>
      <div class="stats"><div>Pieces<b>${s.pieces}</b></div><div>Floor squares<b>${Math.round(s.ground)}</b></div><div>Crumbs<b>${s.crumbs}</b></div><div>Caps<b>${s.caps}</b></div><div>Relics<b>${s.relics}</b></div><div>Golden Wedges<b>${s.wedges}</b></div><div>Creatures<b>${s.enemies}</b></div><div>Breakables<b>${s.breakables}</b></div></div>`;
  }

  private outlineTab(): string {
    return `<div class="search" style="padding:0.5em 0 0.3em">${icon('search').replace('class="ico"', 'class="ico" style="left:0.55em;top:0.95em"')}<input type="search" data-s="outline" placeholder="Find in this level" value="${esc(this.filter)}" style="padding-left:2em" /></div><div class="olist"></div>`;
  }
  /** The list under the Outline tab (drawn apart from its search box, so typing does not lose its place). */
  private renderOutlineList(): void {
    const el = this.bodyEl.querySelector('.olist');
    if (!el) return;
    const find = this.filter.trim().toLowerCase();
    const chosen = new Set(this.chosen());
    let h = '';
    for (const [layer, label] of LAYERS) {
      const rows = this.level.pieces.map((p, k) => ({ p, k })).filter(({ p }) => info(p.t).layer === layer && (!find || info(p.t).label.toLowerCase().includes(find) || (p.props?.name ?? '').toLowerCase().includes(find)));
      if (!rows.length) continue;
      h += `<h4>${label}<span class="badge" style="margin-left:auto">${rows.length}</span></h4>`;
      h += rows.map(({ p, k }) => {
        const i = info(p.t);
        const b = pieceBounds(p);
        const where = SINGLE.has(p.t) ? `${b.x0}, ${b.z0}` : `${b.x1 - b.x0}×${b.z1 - b.z0}`;
        return `<div class="rowitem${chosen.has(k) ? ' on' : ''}" data-pick="${k}"><span class="sw${SINGLE.has(p.t) ? ' dot' : ''}" style="background:${i.color};width:1.3em;height:1.3em">${i.glyph}</span>${esc(p.props?.name || i.label)}<small>${where} · ${p.top.toFixed(1)}</small></div>`;
      }).join('');
    }
    el.innerHTML = h || '<div class="note">Nothing by that name in this level.</div>';
  }

  private problemsTab(): string {
    const bad = checkCustom(this.level);
    let h = '<h4>Before it can be played</h4>';
    h += bad.length ? bad.map((b) => `<div class="rowitem" style="cursor:default">${icon('warn')}${esc(b)}</div>`).join('') : `<div class="rowitem fine" style="cursor:default">${icon('check')}Nothing missing: it can be played.</div>`;
    h += '<h4>Jump check</h4>';
    if (!this.reachOn) h += `<div class="note">The jump check works out everywhere he can get to with the real jump numbers, and lists what he cannot reach and where he could get stuck.</div><button data-a="reach" class="primary">${icon('check')}Run the jump check</button>`;
    else if (!this.reach) h += '<div class="note">Working it out...</div>';
    else {
      const r = this.reach;
      h += r.problems.length ? r.problems.map((p) => `<div class="rowitem" data-go="${p.x},${p.z}">${icon('warn')}${esc(p.what)} cannot be reached<small>${Math.round(p.x)}, ${Math.round(p.z)}</small></div>`).join('') : `<div class="rowitem fine" style="cursor:default">${icon('check')}Everything can be reached.</div>`;
      if (r.traps.length) h += `<div class="rowitem trap" data-go="${r.traps[0][0]},${r.traps[0][1]}">${icon('warn')}He could get stuck, with no way back to the door<small>${Math.round(r.traps[0][0])}, ${Math.round(r.traps[0][1])}</small></div>`;
      h += '<div class="note">Green on the map is where he can get to. Click a line above to go to it. The check takes gates as open and does not know about wall kicks.</div>';
    }
    return h;
  }

  // ---- Menus and windows ----

  private renderMenu(): void {
    this.menuEl.classList.toggle('on', this.menu !== '');
    if (!this.menu) return;
    const b = (a: string, ic: string, label: string, key = ''): string => `<button data-a="${a}">${icon(ic)}${label}${key ? `<small>${key}</small>` : ''}</button>`;
    if (this.menu === 'file') {
      this.menuEl.style.left = '0.6em';
      this.menuEl.style.top = '3.1em';
      this.menuEl.innerHTML = `${b('new', 'plus', this.armedNew ? 'Click again: start a new level' : 'New level')}${b('mine', 'folder', 'My Levels...')}${b('samples', 'level', 'Sample levels...')}<hr>
        ${b('save', 'save', 'Save to My Levels', 'Ctrl+S')}${b('mcopy', 'dup', 'Save as a copy')}<hr>
        ${b('tofile', 'export', 'Save to a file')}${b('fromfile', 'import', 'Open a file...')}${b('text', 'paste', 'Copy or paste as text...')}<hr>
        ${b('tab:level', 'sliders', 'Level settings')}${b('pngmap', 'export', 'Save a picture of the map')}`;
    } else if (this.menu === 'layers') {
      this.menuEl.style.left = '24em';
      this.menuEl.style.top = '3.1em';
      this.menuEl.innerHTML = `<div class="note" style="padding:0.2em 0.6em">Hidden kinds are faint on the map and cannot be clicked.</div>${LAYERS.map(([id, label]) => `<label><input type="checkbox" data-layer="${id}"${this.prefs.hidden.includes(id) ? '' : ' checked'} />${label}</label>`).join('')}<hr>
        <label><input type="checkbox" data-layer-labels${this.prefs.labels ? ' checked' : ''} />Heights and names on the map</label>`;
    } else {
      const n = this.chosen().length;
      this.menuEl.innerHTML = n
        ? `${b('dup', 'dup', 'Duplicate', 'Ctrl+D')}${b('copy', 'copy', 'Copy', 'Ctrl+C')}${b('cut', 'copy', 'Cut', 'Ctrl+X')}${b('paste', 'paste', 'Paste here', 'Ctrl+V')}<hr>
          ${b('rot', 'turn', 'Turn 90°', 'R')}${b('flipx', 'fliph', 'Flip left and right')}${b('flipz', 'flipv', 'Flip north and south')}${b('up', 'up', 'Raise', ']')}${b('down', 'down', 'Lower', '[')}<hr>
          ${n === 1 ? b('same', 'layers', 'Select all like it') : ''}${b('playhere', 'here', 'Play from here')}${b('del', 'trash', 'Delete', 'Del')}`
        : `${b('paste', 'paste', 'Paste here', 'Ctrl+V')}${b('playhere', 'here', 'Play from here')}${b('selall', 'layers', 'Select everything', 'Ctrl+A')}${b('fit', 'fit', 'Fit the whole room', 'F')}`;
    }
  }

  private renderModal(): void {
    this.modalEl.classList.toggle('on', this.modal !== '');
    if (!this.modal) return;
    const sheet = this.modalEl.querySelector('.sheet') as HTMLDivElement;
    const head = (title: string): string => `<header><span>${title}</span><button data-a="modal:" class="ghost" title="Close (Esc)">${icon('close')}</button></header>`;
    if (this.modal === 'samples') {
      sheet.innerHTML = `${head('Sample levels')}<div><div class="note">Open one, look at how it is made (click its pieces to see their settings), play it, then change things. Your own level is not lost: it stays in My Levels if you saved it.</div>
        <div class="cards">${SAMPLES.map((x) => `<div class="card"><b>${esc(x.title)}</b><p>${esc(x.lesson)}</p><div class="row"><button class="go" data-a="sample:${x.id}">${icon('folder')}Open</button></div></div>`).join('')}</div>
        <div class="note" style="margin-top:0.8em">Or start with an empty room: <button data-a="modal:">Start building</button></div></div>`;
    } else if (this.modal === 'mine') {
      const list = this.host.library?.list() ?? [];
      const card = (m: { id: string; level: CustomLevel }): string => {
        const s = levelStats(m.level, ENEMY_PIECES);
        const tags = [`${m.level.width} × ${m.level.depth}`, `${s.pieces} pieces`, s.wedges ? `${s.wedges} wedge${s.wedges === 1 ? '' : 's'}` : '', m.level.hubDoor ? `on the Club's ${m.level.hubDoor === 'west' ? 'left' : 'right'} guest door` : ''].filter(Boolean).join(' · ');
        return `<div class="card"><b>${esc(m.level.name)}${m.id === this.slotId ? ' <span class="badge ok">open now</span>' : ''}</b><p>${esc(m.level.blurb ?? '')}${m.level.blurb ? '<br>' : ''}${tags}</p><div class="row"><button class="go" data-a="mopen:${m.id}">${icon('folder')}Open</button><button class="danger" data-a="mdel:${m.id}">${icon('trash')}${this.armedDelete === m.id ? 'Click again to delete' : 'Delete'}</button></div></div>`;
      };
      sheet.innerHTML = `${head('My Levels')}<div><div class="note">Saved levels show in the game's LEVELS menu. Give one Golden Wedges and hang it on a Club door (Level tab) to make it part of your game. To make one part of the game for good, copy it as text and send it to Claude.</div>
        <div class="row" style="display:flex;gap:0.4em;margin-bottom:0.7em"><button class="go" data-a="save">${icon('save')}Save the open level</button><button data-a="mcopy">${icon('dup')}Save it as a copy</button><button data-a="new">${icon('plus')}${this.armedNew ? 'Click again: new level' : 'New level'}</button></div>
        <div class="cards">${list.map(card).join('') || '<div class="note">Nothing saved yet.</div>'}</div></div>`;
    } else if (this.modal === 'text') {
      sheet.innerHTML = `${head('The level as text')}<div><div class="note">This is the whole level. Copy it to keep it or send it; paste one here and press Load to open it.</div>
        <textarea rows="10" spellcheck="false" data-s="text">${esc(JSON.stringify(this.level))}</textarea>
        <div class="row" style="display:flex;gap:0.4em;margin-top:0.6em"><button class="primary" data-a="textcopy">${icon('copy')}Copy it</button><button data-a="textload">${icon('import')}Load what is in the box</button></div></div>`;
    } else {
      const k = (keys: string, what: string): string => `<div><span>${what}</span><span>${keys.split(' ').map((x) => `<span class="kbd">${x}</span>`).join(' ')}</span></div>`;
      sheet.innerHTML = `${head('Keys and tips')}<div>
        <div class="keys">${k('V', 'Select')}${k('E', 'Erase')}${k('H', 'Pan')}${k('M', 'Measure a jump')}${k('Ctrl Z', 'Undo')}${k('Ctrl Y', 'Redo')}${k('Ctrl C', 'Copy')}${k('Ctrl X', 'Cut')}${k('Ctrl V', 'Paste at the pointer')}${k('Ctrl D', 'Duplicate')}${k('Ctrl A', 'Select everything')}${k('Ctrl S', 'Save to My Levels')}${k('Del', 'Delete')}${k('R', 'Turn 90°')}${k('[ ]', 'Lower, raise')}${k('← ↑ ↓ →', 'Nudge (Shift: 5)')}${k('G', 'Grid')}${k('F', 'Fit the room')}${k('+ −', 'Zoom')}${k('Space', 'Hold and drag: pan')}${k('P', 'Play')}${k('Esc', 'Deselect, cancel')}</div>
        <h4 style="margin-top:1em">How it goes</h4>
        <div class="note">Pick a piece on the left. Ground and water are dragged out as rectangles; crates, creatures and decor are one click each. Set the height on the right before you place (or change it after).</div>
        <div class="note">With Select: drag a piece to move it, drag its edges or corners to stretch it, drag on empty ground to box several, Shift-click to add one. Right-click a piece for everything that can be done to it.</div>
        <div class="note">Watch shows the game beside the map and follows your edits. While it is on, keys go to the game unless the pointer is over the map. Jump check paints where he can get to; Measure says which jump crosses a gap.</div>
        <div class="note">On a touch screen: one finger draws, two fingers pinch to zoom and drag to pan.</div></div>`;
    }
  }

  private renderStatus(): void {
    const tool = INFO.get(this.tool as PieceType);
    const hint = this.said || (tool ? `${tool.label}: ${tool.tip} ${SINGLE.has(tool.t) ? 'Click to place.' : 'Drag out a rectangle.'}` : this.tool.startsWith('stamp:') ? 'A ready-made shape: click on the map to place it.' : TOOL_HINT[this.tool as 'select']);
    this.hintEl.textContent = hint;
    this.hintEl.classList.toggle('say', !!this.said);
    this.hintEl.title = hint;
    const c = this.cursor;
    const y = c ? surfaceAt(this.level, c.x, c.z) : null;
    this.readEl.textContent = `${c ? `x ${c.x}  z ${c.z}${y !== null ? `  floor ${y.toFixed(1)}` : ''}  ·  ` : ''}new height ${this.top.toFixed(1)}  ·  snap ${this.prefs.snap}  ·  ${Math.round((this.view.scale / 14) * 100)}%  ·  ${this.level.pieces.length} pieces`;
  }

  private onOver(e: Event): void {
    const el = (e.target as HTMLElement).closest('[data-tip]') as HTMLElement | null;
    if (!el) return;
    this.hintEl.textContent = el.dataset.tip ?? '';
    this.hintEl.classList.remove('say');
  }

  // ---- Clicks ----

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    // A click anywhere but on a menu shuts it.
    const inMenu = !!target.closest('.menu');
    const row = target.closest('[data-pick]') as HTMLElement | null;
    const go = target.closest('[data-go]') as HTMLElement | null;
    const shut = target.closest('[data-shut]') as HTMLElement | null;
    if (target === this.modalEl) {
      this.modal = '';
      return this.sync();
    }
    if (shut) {
      const id = shut.dataset.shut ?? '';
      this.prefs.shut = this.prefs.shut.includes(id) ? this.prefs.shut.filter((x) => x !== id) : [...this.prefs.shut, id];
      this.keepPrefs();
      return this.renderPalette();
    }
    if (row) {
      const k = Number(row.dataset.pick);
      const p = this.level.pieces[k];
      if (!p) return;
      if (e.shiftKey) {
        const ids = this.chosen();
        this.choose(ids.includes(k) ? ids.filter((x) => x !== k) : [...ids, k]);
      } else this.choose([k]);
      this.tool = 'select';
      this.centreOn((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2);
      // (The list is kept: only what changed is redrawn.)
      this.renderBar();
      this.renderTools();
      this.renderOutlineList();
      this.renderStatus();
      return this.draw();
    }
    if (go) {
      const [x, z] = (go.dataset.go ?? '0,0').split(',').map(Number);
      this.centreOn(x, z);
      this.view.scale = Math.max(this.view.scale, 18);
      return this.draw();
    }
    const b = target.closest('button');
    if (!b) {
      if (target instanceof HTMLInputElement && target.dataset.layerLabels !== undefined) {
        this.prefs.labels = target.checked;
        this.keepPrefs();
        this.draw();
      } else if (this.menu && !inMenu) {
        this.menu = '';
        this.renderBar();
        this.renderMenu();
      }
      return;
    }
    // A focused button would eat the space bar, which is the jump key.
    b.blur();
    const tool = b.dataset.tool as ToolId | undefined;
    if (tool) {
      this.tool = tool;
      this.said = '';
      this.measure = null;
      if (tool !== 'select') this.clearSelection();
      if (INFO.has(tool as PieceType)) this.prefs.tab = 'piece';
      return this.sync();
    }
    const act = b.dataset.a ?? '';
    const wasMenu = this.menu;
    if (!act.startsWith('m:')) this.menu = '';
    if (act.startsWith('m:')) {
      const m = act.slice(2) as 'file' | 'layers';
      this.menu = wasMenu === m ? '' : m;
      this.armedNew = false;
      this.renderBar();
      return this.renderMenu();
    }
    if (act.startsWith('tab:')) {
      this.prefs.tab = act.slice(4) as Tab;
      this.keepPrefs();
      return this.sync();
    }
    if (act.startsWith('modal:')) {
      this.modal = act.slice(6) as typeof this.modal;
      return this.sync();
    }
    if (act.startsWith('dir:')) {
      this.dir = act.slice(4) as 'n';
      this.applyToSelected((p) => {
        if (FACES.has(p.t)) p.dir = this.dir;
      });
      return this.sync();
    }
    // Height: of the next piece (h) or of what is selected (ph); by a step (:) or to a value (=).
    const hm = /^(p?h)([:=])(-?[\d.]+)$/.exec(act);
    if (hm) {
      const v = Number(hm[3]);
      if (hm[1] === 'h') this.top = Math.round((hm[2] === '=' ? v : this.top + v) * 10) / 10;
      else this.applyToSelected((p) => (p.top = Math.round((hm[2] === '=' ? v : p.top + v) * 10) / 10));
      return this.sync();
    }
    if (act.startsWith('sample:')) {
      const sm = SAMPLES.find((x) => x.id === act.slice(7));
      const copy = sm ? parseCustom(JSON.stringify(sm.level)) : null;
      if (!sm || !copy) return;
      this.push();
      this.level = copy;
      this.slotId = null;
      this.clearSelection();
      this.modal = '';
      this.fit();
      this.say(`${sm.title}: ${sm.lesson}`);
      return this.sync();
    }
    if (act.startsWith('mopen:')) {
      const m = this.host.library?.get(act.slice(6));
      const copy = m ? parseCustom(JSON.stringify(m.level)) : null;
      if (!m || !copy) return;
      this.push();
      this.level = copy;
      this.slotId = m.id;
      this.host.storage.setItem('ratquest.custom.slot', m.id);
      this.clearSelection();
      this.modal = '';
      this.fit();
      this.say(`Opened "${copy.name}".`);
      return this.sync();
    }
    if (act.startsWith('mdel:')) {
      const id = act.slice(5);
      if (this.armedDelete !== id) {
        this.armedDelete = id;
        return this.renderModal();
      }
      this.armedDelete = '';
      this.host.library?.remove(id);
      if (this.slotId === id) this.slotId = null;
      this.say('Deleted.');
      return this.sync();
    }
    if (act.startsWith('gadd:')) {
      this.push();
      const t = act.slice(5);
      (this.level.goals ??= []).push(t === 'collect' ? { type: 'collect', kind: 'crumb', count: 'all' } : { type: t as 'defeat' | 'waves' | 'burst' | 'reach' });
      return this.sync();
    }
    if (act.startsWith('gdel:')) {
      this.push();
      this.level.goals?.splice(Number(act.slice(5)), 1);
      return this.sync();
    }
    switch (act) {
      case 'live': this.setLive(!this.live_); return;
      case 'samples': this.modal = 'samples'; break;
      case 'mine': this.modal = 'mine'; this.armedDelete = ''; this.armedNew = false; break;
      case 'text': this.modal = 'text'; break;
      case 'help': this.modal = 'help'; break;
      case 'reach':
        this.reachOn = !this.reachOn;
        this.host.storage.setItem('ratquest.builder.reach', this.reachOn ? '1' : '0');
        this.reach = null;
        if (this.reachOn) this.reachRefresh(true);
        else this.say('Jump check off.');
        break;
      case 'grid': this.prefs.grid = !this.prefs.grid; this.keepPrefs(); break;
      case 'snap': this.prefs.snap = this.prefs.snap === 1 ? 0.5 : 1; this.keepPrefs(); this.say(this.prefs.snap === 1 ? 'Snapping to whole squares.' : 'Snapping to half squares: for fine work.'); break;
      case 'undo': this.undo(); return;
      case 'redo': this.redo(); return;
      case 'copy': this.copy(); return;
      case 'cut': this.copy(true); return;
      case 'paste': this.paste(); return;
      case 'dup': this.duplicate(); return;
      case 'del': this.deleteSelected(); return;
      case 'rot': this.turn(); return;
      case 'flipx': this.flip('x'); return;
      case 'flipz': this.flip('z'); return;
      case 'selall': this.selectAll(); return;
      case 'same': {
        const ids = this.chosen();
        if (ids.length !== 1) this.clearSelection();
        else {
          const t = this.level.pieces[ids[0]].t;
          this.choose(this.level.pieces.map((p, k) => (p.t === t ? k : -1)).filter((k) => k >= 0));
          this.say(`${this.chosen().length} ${info(t).label.toLowerCase()} pieces selected.`);
        }
        break;
      }
      case 'up': this.applyToSelected((p) => (p.top = Math.round((p.top + 0.5) * 10) / 10)); break;
      case 'down': this.applyToSelected((p) => (p.top = Math.round((p.top - 0.5) * 10) / 10)); break;
      case 'fit': this.fit(); break;
      case 'z+': this.zoom(1.3); break;
      case 'z-': this.zoom(1 / 1.3); break;
      case 'playhere': this.playHere(); return;
      case 'new':
        if (!this.armedNew) {
          this.armedNew = true;
          this.menu = wasMenu;
          this.renderMenu();
          return this.renderModal();
        }
        this.armedNew = false;
        this.push();
        this.level = emptyCustom();
        this.slotId = null;
        this.clearSelection();
        this.modal = '';
        this.fit();
        this.say('A new, empty room. The old level is still in My Levels if you saved it (and Undo brings it back).');
        break;
      case 'mcopy':
        this.push();
        this.level.name = `${this.level.name} copy`;
        this.slotId = null;
        this.save();
        break;
      case 'save': this.save(); break;
      case 'tofile': this.toFile(); break;
      case 'fromfile': this.fileEl.value = ''; this.fileEl.click(); break;
      case 'pngmap': this.mapPicture(); break;
      case 'textcopy': {
        const box = this.modalEl.querySelector('textarea') as HTMLTextAreaElement | null;
        if (box) {
          box.select();
          try {
            void navigator.clipboard?.writeText(box.value);
          } catch {
            // The text is selected: it can be copied by hand.
          }
          this.say('Copied (if the browser allowed it; otherwise it is selected in the box).');
        }
        return;
      }
      case 'textload': {
        const box = this.modalEl.querySelector('textarea') as HTMLTextAreaElement | null;
        const l = box ? parseCustom(box.value) : null;
        if (!l) return this.say('That text is not a level.');
        this.push();
        this.level = l;
        this.slotId = null;
        this.clearSelection();
        this.modal = '';
        this.fit();
        this.say(`Loaded "${l.name}" from the text.`);
        break;
      }
      case 'fly': {
        if (!this.host.fly) return;
        this.save(true);
        const before = JSON.stringify(this.level);
        const copy = JSON.parse(before) as CustomLevel;
        this.hide();
        this.host.fly(copy, (lvl) => {
          this.show();
          this.modal = '';
          if (JSON.stringify(lvl) !== before) {
            this.history.push(before);
            this.level = lvl;
            this.save(true);
            this.sync();
            this.say('Back from 3D. Undo here takes back everything done there.');
          }
        }, this.reachOn);
        return;
      }
      case 'play': {
        const problems = checkCustom(this.level);
        if (problems.length) {
          this.prefs.tab = 'problems';
          this.say(problems.join(' '));
          return this.sync();
        }
        this.save(true);
        this.hide();
        this.host.play(this.level);
        return;
      }
      case 'close': this.save(true); this.modal = ''; this.hide(); return;
    }
    this.sync();
  }

  private playHere(): void {
    const problems = checkCustom(this.level);
    if (problems.length) return this.say(problems.join(' '));
    if (!this.cursor) return this.say('Click the map where he should start, then press Play here.');
    const copy = parseCustom(JSON.stringify(this.level));
    if (!copy) return;
    const at = this.cursor;
    const sp = copy.pieces.find((q) => q.t === 'spawn');
    if (sp) Object.assign(sp, { x0: at.x, x1: at.x, z0: at.z, z1: at.z, top: Math.max(0, surfaceAt(copy, at.x, at.z) ?? 0) });
    if (this.live_ && this.host.live) {
      this.host.live.update(copy, true);
      this.say('Moved him to that spot.');
      return this.sync();
    }
    this.hide();
    this.host.play(copy);
  }

  private save(quiet = false): void {
    try {
      this.host.storage.setItem('ratquest.custom.v1', JSON.stringify(this.level));
      if (this.host.library && (!quiet || this.slotId)) {
        this.slotId = this.host.library.put(this.slotId, this.level);
        this.host.storage.setItem('ratquest.custom.slot', this.slotId);
      }
      if (!quiet) this.say(this.host.library ? `Saved to My Levels as "${this.level.name}". It is in the game's LEVELS menu.` : 'Saved on this device.');
    } catch {
      if (!quiet) this.say('Could not save here. Use File, Save to a file, to keep it.');
    }
  }

  private download(name: string, href: string): void {
    const a = document.createElement('a');
    a.download = name;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  private fileName(): string {
    return (this.level.name || 'level').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';
  }
  private toFile(): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(this.level)], { type: 'application/json' }));
    this.download(`${this.fileName()}.ratquest.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.say('The level was saved as a file. File, Open a file, brings it back; it can be sent to anyone with the game.');
  }
  private readFile(): void {
    const f = this.fileEl.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const l = parseCustom(String(r.result ?? ''));
      if (!l) return this.say('That file is not a level.');
      this.push();
      this.level = l;
      this.slotId = null;
      this.clearSelection();
      this.fit();
      this.say(`Opened "${l.name}" from the file. Save puts it in My Levels.`);
      this.sync();
    };
    r.readAsText(f);
  }
  private mapPicture(): void {
    try {
      this.download(`${this.fileName()}-map.png`, this.canvas.toDataURL('image/png'));
      this.say('A picture of the map as it is on the screen was saved.');
    } catch {
      this.say('The picture could not be saved here.');
    }
  }

  // ---- Keys ----

  private onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (!this.open_) return;
    if (e.code === 'Escape' && (this.modal || this.menu)) {
      this.modal = '';
      this.menu = '';
      e.stopPropagation();
      return this.sync();
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // In live mode the keys belong to the game, except while the pointer is over the map.
    if (this.live_ && !this.hover) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const used = (): void => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (ctrl) {
      switch (e.code) {
        case 'KeyZ': used(); return e.shiftKey ? this.redo() : this.undo();
        case 'KeyY': used(); return this.redo();
        case 'KeyC': used(); return this.copy();
        case 'KeyX': used(); return this.copy(true);
        case 'KeyV': used(); return this.paste();
        case 'KeyD': used(); return this.duplicate();
        case 'KeyA': used(); return this.selectAll();
        case 'KeyS': used(); this.save(); return this.sync();
      }
      return;
    }
    const pickTool = (t: ToolId): void => {
      this.tool = t;
      this.said = '';
      this.measure = null;
      if (t !== 'select') this.clearSelection();
      this.sync();
    };
    switch (e.code) {
      case 'Space': this.space = true; used(); return;
      case 'Delete': case 'Backspace': used(); return this.deleteSelected();
      case 'KeyV': used(); return pickTool('select');
      case 'KeyE': used(); return pickTool('erase');
      case 'KeyH': used(); return pickTool('pan');
      case 'KeyM': used(); return pickTool('measure');
      case 'KeyR': used(); return this.turn();
      case 'KeyG': used(); this.prefs.grid = !this.prefs.grid; this.keepPrefs(); return this.sync();
      case 'KeyF': used(); this.fit(); return this.sync();
      case 'KeyP': used(); (this.barEl.querySelector('[data-a="play"]') as HTMLButtonElement | null)?.click(); return;
      case 'Equal': case 'NumpadAdd': used(); return this.zoom(1.3);
      case 'Minus': case 'NumpadSubtract': used(); return this.zoom(1 / 1.3);
      case 'Slash': if (e.shiftKey) { used(); this.modal = 'help'; this.sync(); } return;
      case 'Escape':
        used();
        this.clearSelection();
        this.measure = null;
        this.drag = null;
        if (this.tool !== 'select') this.tool = 'select';
        this.said = '';
        return this.sync();
      case 'BracketLeft': case 'BracketRight': {
        used();
        const d = e.code === 'BracketRight' ? 0.5 : -0.5;
        if (!this.applyToSelected((p) => (p.top = Math.round((p.top + d) * 10) / 10))) this.top = Math.round((this.top + d) * 10) / 10;
        return this.sync();
      }
    }
    if (e.code.startsWith('Arrow') && this.chosen().length) {
      used();
      const n = e.shiftKey ? 5 : this.prefs.snap;
      const dx = e.code === 'ArrowRight' ? n : e.code === 'ArrowLeft' ? -n : 0;
      const dz = e.code === 'ArrowDown' ? n : e.code === 'ArrowUp' ? -n : 0;
      this.applyToSelected((p) => this.shift(p, dx, dz));
      this.sync();
    }
  }

  // ---- The view ----

  /** Zooms so the whole room fits on the screen. */
  private fit(): void {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || 600;
    const h = r.height || 400;
    this.view.x = 0;
    this.view.z = 0;
    this.view.scale = Math.min(60, Math.max(3, Math.min(w / (this.level.width + 6), h / (this.level.depth + 6))));
  }
  private centreOn(x: number, z: number): void {
    this.view.x = x;
    this.view.z = z;
  }
  /** Zooms by `k`, keeping the map under the pointer (if given) where it is. */
  private zoom(k: number, at?: { clientX: number; clientY: number }): void {
    const before = at ? this.toWorld(at) : null;
    this.view.scale = Math.min(60, Math.max(3, this.view.scale * k));
    if (before && at) {
      const after = this.toWorld(at);
      this.view.x += before.x - after.x;
      this.view.z += before.z - after.z;
    }
    this.renderStatus();
    this.draw();
  }
  private queueDraw(): void {
    if (this.drawQueued) return;
    this.drawQueued = true;
    requestAnimationFrame(() => {
      this.drawQueued = false;
      this.draw();
    });
  }

  // ---- Map <-> screen ----
  private toWorld(e: { clientX: number; clientY: number }): { x: number; z: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / (r.width || 1)) * this.canvas.width;
    const sy = ((e.clientY - r.top) / (r.height || 1)) * this.canvas.height;
    return { x: (sx - this.canvas.width / 2) / this.view.scale + this.view.x, z: (sy - this.canvas.height / 2) / this.view.scale + this.view.z };
  }
  private snap(v: number): number {
    const s = this.prefs.snap;
    return Math.round(v / s) * s;
  }
  /** The square a point is in (its low corner), for pieces that fill whole squares. */
  private cell(v: number): number {
    const s = this.prefs.snap;
    return Math.floor(v / s) * s;
  }
  /** How far, on the map, counts as "on" a handle or a small piece: about ten pixels. */
  private reachPx(px = 10): number {
    return px / this.view.scale;
  }

  private contextAt(e: MouseEvent): void {
    const w = this.toWorld(e);
    this.cursor = { x: this.snap(w.x), z: this.snap(w.z) };
    const i = this.pick(w.x, w.z);
    if (i >= 0 && !this.chosen().includes(i)) this.choose([i]);
    if (i < 0) this.clearSelection();
    this.tool = 'select';
    this.menu = 'context';
    const r = this.root.getBoundingClientRect();
    this.sync();
    // Keep it on the screen.
    const mw = this.menuEl.offsetWidth || 220;
    const mh = this.menuEl.offsetHeight || 300;
    this.menuEl.style.left = `${Math.max(4, Math.min(r.width - mw - 4, e.clientX - r.left))}px`;
    this.menuEl.style.top = `${Math.max(4, Math.min(r.height - mh - 4, e.clientY - r.top))}px`;
  }

  // ---- Pointer ----

  private down(e: PointerEvent): void {
    if (this.menu) {
      this.menu = '';
      this.renderBar();
      this.renderMenu();
    }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // (Some browsers refuse a capture now and then: the drag still works inside the map.)
    }
    // A second finger: whatever the first was doing stops, and the two of them zoom and pan.
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const mid = { clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 };
      const w = this.toWorld(mid);
      if (this.drag && (this.drag.mode === 'move' || this.drag.mode === 'resize') && this.drag.moved) {
        const l = parseCustom(this.drag.before);
        if (l) this.level = l;
      }
      this.drag = { mode: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: this.view.scale, wx: w.x, wz: w.z };
      return;
    }
    if (e.button === 2) return; // (the menu comes from the contextmenu event)
    const w = this.toWorld(e);
    const x = this.snap(w.x);
    const z = this.snap(w.z);
    this.cursor = { x, z };
    this.said = '';
    if (this.tool === 'pan' || e.button === 1 || this.space) {
      this.drag = { mode: 'pan', px: e.clientX, py: e.clientY };
      return;
    }
    if (this.tool === 'measure') {
      const s = Math.round(w.x * 2) / 2;
      const t = Math.round(w.z * 2) / 2;
      this.measure = { a: { x: s, z: t }, b: { x: s, z: t } };
      this.drag = { mode: 'measure' };
      return this.draw();
    }
    if (this.tool.startsWith('stamp:')) {
      const st = stampById(this.tool.slice(6));
      if (st) {
        this.push();
        const made = st.make(Math.round(x), Math.round(z), this.top);
        const n = this.level.pieces.length;
        this.level.pieces.push(...made);
        this.choose(made.map((_, k) => n + k));
        this.tool = 'select';
        this.say(`${st.label} placed and selected: drag it to move it, R turns it.`);
        this.sync();
      }
      return;
    }
    if (this.tool === 'erase') {
      const i = this.pick(w.x, w.z);
      if (i >= 0) {
        this.push();
        this.level.pieces.splice(i, 1);
        this.clearSelection();
        this.sync();
      }
      return;
    }
    if (this.tool === 'select') {
      // An edge or corner of the one selected rectangle: stretch it.
      const sel = this.level.pieces[this.selected];
      if (sel && !SINGLE.has(sel.t) && !this.group.length) {
        const h = handleAt(sel, w.x, w.z, this.reachPx(11));
        if (h) {
          this.drag = { mode: 'resize', handle: h, orig: JSON.parse(JSON.stringify(sel)) as Piece, before: JSON.stringify(this.level), moved: false };
          return;
        }
      }
      const i = this.pick(w.x, w.z);
      if (e.shiftKey) {
        if (i >= 0) {
          const ids = this.chosen();
          this.choose(ids.includes(i) ? ids.filter((k) => k !== i) : [...ids, i]);
          this.say(`${this.chosen().length} selected.`);
        }
      } else if (i < 0) {
        // Empty ground: drag a box round several pieces.
        this.clearSelection();
        this.drag = { mode: 'box', sx: w.x, sz: w.z, cx: w.x, cz: w.z };
      } else {
        if (!this.chosen().includes(i)) this.choose([i]);
        const ids = this.chosen();
        this.prefs.tab = this.prefs.tab === 'outline' ? 'outline' : 'piece';
        this.drag = { mode: 'move', sx: x, sz: z, ids, origs: ids.map((k) => JSON.parse(JSON.stringify(this.level.pieces[k])) as Piece), before: JSON.stringify(this.level), moved: false };
      }
      this.sync();
      return;
    }
    // A piece to place: rectangles are dragged from square to square, single things are put on a point.
    const t = this.tool as PieceType;
    const area = AREAS.has(t);
    this.drag = { mode: 'draw', sx: area ? this.cell(w.x) : x, sz: area ? this.cell(w.z) : z, cx: area ? this.cell(w.x) : x, cz: area ? this.cell(w.z) : z };
    this.draw();
  }

  private move(e: PointerEvent): void {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = this.drag;
    const w = this.toWorld(e);
    if (!d) {
      // Nothing held: show where the pointer is and what is under it.
      const c = { x: this.snap(w.x), z: this.snap(w.z) };
      const hov = this.tool === 'select' || this.tool === 'erase' ? this.pick(w.x, w.z) : -1;
      if (!this.cursor || c.x !== this.cursor.x || c.z !== this.cursor.z || hov !== this.hoverIdx) {
        this.cursor = c;
        this.hoverIdx = hov;
        if (this.tool === 'select') {
          const sel = this.level.pieces[this.selected];
          const h = sel && !SINGLE.has(sel.t) && !this.group.length ? handleAt(sel, w.x, w.z, this.reachPx(11)) : null;
          this.canvas.style.cursor = h ? (h === 'n' || h === 's' ? 'ns-resize' : h === 'e' || h === 'w' ? 'ew-resize' : h === 'ne' || h === 'sw' ? 'nesw-resize' : 'nwse-resize') : hov >= 0 ? 'move' : '';
        } else this.canvas.style.cursor = '';
        this.renderStatus();
        this.queueDraw();
      }
      return;
    }
    if (d.mode === 'pinch') {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()];
      this.view.scale = Math.min(60, Math.max(3, (d.scale * Math.hypot(a.x - b.x, a.y - b.y)) / d.dist));
      const mid = this.toWorld({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 });
      this.view.x += d.wx - mid.x;
      this.view.z += d.wz - mid.z;
      return this.queueDraw();
    }
    if (d.mode === 'pan') {
      const r = this.canvas.getBoundingClientRect();
      const k = this.canvas.width / (r.width || 1) / this.view.scale;
      this.view.x -= (e.clientX - d.px) * k;
      this.view.z -= (e.clientY - d.py) * k;
      d.px = e.clientX;
      d.py = e.clientY;
      return this.queueDraw();
    }
    if (d.mode === 'measure') {
      if (this.measure) this.measure.b = { x: Math.round(w.x * 2) / 2, z: Math.round(w.z * 2) / 2 };
      this.sayMeasure();
      return this.queueDraw();
    }
    if (d.mode === 'box') {
      d.cx = w.x;
      d.cz = w.z;
      return this.queueDraw();
    }
    if (d.mode === 'resize') {
      const p = this.level.pieces[this.selected];
      if (!p) return;
      const b = resizeBy(d.orig, d.handle, this.snap(w.x), this.snap(w.z), this.prefs.snap);
      if (!d.moved && (b.x0 !== Math.min(d.orig.x0, d.orig.x1) || b.x1 !== Math.max(d.orig.x0, d.orig.x1) || b.z0 !== Math.min(d.orig.z0, d.orig.z1) || b.z1 !== Math.max(d.orig.z0, d.orig.z1))) {
        this.history.push(d.before);
        d.moved = true;
      }
      if (d.moved) Object.assign(p, b);
      this.cursor = { x: this.snap(w.x), z: this.snap(w.z) };
      this.said = `${info(p.t).label}: ${b.x1 - b.x0} × ${b.z1 - b.z0}`;
      this.renderStatus();
      return this.queueDraw();
    }
    if (d.mode === 'move') {
      const dx = this.snap(w.x) - d.sx;
      const dz = this.snap(w.z) - d.sz;
      if (dx !== 0 || dz !== 0 || d.moved) {
        if (!d.moved) {
          this.history.push(d.before);
          d.moved = true;
        }
        d.ids.forEach((k, n) => {
          const o = d.origs[n];
          Object.assign(this.level.pieces[k], { x0: o.x0 + dx, x1: o.x1 + dx, z0: o.z0 + dz, z1: o.z1 + dz });
        });
      }
      this.cursor = { x: this.snap(w.x), z: this.snap(w.z) };
      return this.queueDraw();
    }
    // Drawing.
    const area = AREAS.has(this.tool as PieceType);
    d.cx = area ? this.cell(w.x) : this.snap(w.x);
    d.cz = area ? this.cell(w.z) : this.snap(w.z);
    this.cursor = { x: this.snap(w.x), z: this.snap(w.z) };
    this.queueDraw();
  }

  private up(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // It was not held.
    }
    const d = this.drag;
    this.drag = null;
    if (!d || d.mode === 'pan' || d.mode === 'pinch') return;
    if (d.mode === 'measure') {
      this.sayMeasure();
      return this.draw();
    }
    if (d.mode === 'move' || d.mode === 'resize') {
      if (d.mode === 'resize') this.said = '';
      return this.sync();
    }
    if (d.mode === 'box') {
      const ids = piecesInBox(this.level.pieces, d.sx, d.sz, d.cx, d.cz).filter((k) => !this.hiddenPiece(this.level.pieces[k]));
      this.choose(ids);
      if (ids.length) this.say(ids.length > 1 ? `${ids.length} pieces selected: drag one to move them all.` : `${info(this.level.pieces[ids[0]].t).label} selected.`);
      return this.sync();
    }
    const t = this.tool as PieceType;
    if (!INFO.has(t)) return;
    this.push();
    const single = SINGLE.has(t);
    const step = this.prefs.snap;
    const p: Piece = single
      ? { t, x0: d.sx, z0: d.sz, x1: d.sx, z1: d.sz, top: this.top }
      : { t, x0: Math.min(d.sx, d.cx), z0: Math.min(d.sz, d.cz), x1: Math.max(d.sx, d.cx) + (AREAS.has(t) ? step : 0), z1: Math.max(d.sz, d.cz) + (AREAS.has(t) ? step : 0), top: this.top };
    if (FACES.has(t)) p.dir = ENEMY_PIECES.includes(t) && this.dir === 'n' ? 's' : this.dir;
    if (t === 'stairs' || t === 'ramp') {
      p.top = this.top > 0 ? this.top : 3;
      p.bottom = p.top > 3 ? p.top - 3 : 0;
    }
    if (t === 'spawn' || t === 'exit') this.level.pieces = this.level.pieces.filter((q) => q.t !== t);
    if (t === 'water' || t === 'river' || t === 'lava') p.top = Math.min(p.top, 0) - 0.85 + (this.top === 0 ? 0 : this.top);
    this.level.pieces.push(p);
    // It is not left selected: the same piece can be placed again straight away. (Select it to change it.)
    this.clearSelection();
    this.prefs.recent = [t, ...this.prefs.recent.filter((x) => x !== t)].slice(0, 6);
    this.keepPrefs();
    this.say(`${info(t).label} placed${single ? '' : ` (${p.x1 - p.x0} × ${p.z1 - p.z0})`}. Place another, or press V and click it to change it.`);
    this.sync();
  }

  private sayMeasure(): void {
    const m = this.measure;
    if (!m) return;
    const r = this.measured();
    if (!r) return;
    const up = r.rise > 0.05 ? `, ${r.rise.toFixed(1)} up` : r.rise < -0.05 ? `, ${(-r.rise).toFixed(1)} down` : ', level';
    const how = r.verdict === 'too far' ? 'too far for any jump' : r.verdict === 'too high' ? 'too high to climb' : r.verdict === 'walk' ? 'no gap' : `a ${r.verdict} makes it`;
    this.said = `Measured: ${r.dist.toFixed(1)} across${up}: ${how}.  (jump ${r.jump ? 'yes' : 'no'}, double jump ${r.double ? 'yes' : 'no'}, long jump ${r.long ? 'yes' : 'no'})`;
    this.renderStatus();
  }
  private measured(): Measure | null {
    const m = this.measure;
    if (!m) return null;
    return measureJump({ ...m.a, y: surfaceAt(this.level, m.a.x, m.a.z) ?? 0 }, { ...m.b, y: surfaceAt(this.level, m.b.x, m.b.z) ?? 0 });
  }

  /** The piece under a point on the map: single things first, then the highest rectangle. Hidden kinds are passed over. */
  private pick(x: number, z: number): number {
    const ps = this.level.pieces;
    const near = Math.max(0.6, this.reachPx(9));
    let best = -1;
    let bestD = near;
    for (let i = ps.length - 1; i >= 0; i--) {
      if (!SINGLE.has(ps[i].t) || this.hiddenPiece(ps[i])) continue;
      const dd = Math.hypot(ps[i].x0 - x, ps[i].z0 - z);
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    }
    if (best >= 0) return best;
    let top = -Infinity;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (SINGLE.has(p.t) || this.hiddenPiece(p)) continue;
      const b = pieceBounds(p);
      // Water lies in the ground it is cut into, so it is picked before the floor round it.
      const rank = p.top + (p.t === 'water' || p.t === 'river' || p.t === 'lava' || p.t === 'fire' ? 100 : 0);
      if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && rank > top) {
        top = rank;
        best = i;
      }
    }
    return best;
  }

  // ---- Drawing ----

  private draw(): void {
    if (!this.open_) return;
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    if (c.width !== Math.round(r.width) || c.height !== Math.round(r.height)) {
      c.width = Math.max(10, Math.round(r.width));
      c.height = Math.max(10, Math.round(r.height));
    }
    const g = this.ctx;
    const { x: vx, z: vz, scale: s } = this.view;
    const sx = (x: number): number => (x - vx) * s + c.width / 2;
    const sz = (z: number): number => (z - vz) * s + c.height / 2;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#0b0e13';
    g.fillRect(0, 0, c.width, c.height);
    const W = this.level.width / 2;
    const D = this.level.depth / 2;
    // The room: its floor of nothing, a little lighter than outside it.
    g.fillStyle = '#131822';
    g.fillRect(sx(-W), sz(-D), W * 2 * s, D * 2 * s);
    // Grid: every square when zoomed in, every five always.
    const x0 = Math.floor(vx - c.width / 2 / s) - 1;
    const x1 = Math.ceil(vx + c.width / 2 / s) + 1;
    const z0 = Math.floor(vz - c.height / 2 / s) - 1;
    const z1 = Math.ceil(vz + c.height / 2 / s) + 1;
    if (this.prefs.grid) {
      for (const [every, color] of [[1, '#1b2230'], [5, '#283246']] as const) {
        if (every === 1 && s < 7) continue;
        g.strokeStyle = color;
        g.lineWidth = 1;
        g.beginPath();
        for (let x = Math.ceil(x0 / every) * every; x <= x1; x += every) {
          g.moveTo(Math.round(sx(x)) + 0.5, 0);
          g.lineTo(Math.round(sx(x)) + 0.5, c.height);
        }
        for (let z = Math.ceil(z0 / every) * every; z <= z1; z += every) {
          g.moveTo(0, Math.round(sz(z)) + 0.5);
          g.lineTo(c.width, Math.round(sz(z)) + 0.5);
        }
        g.stroke();
      }
      // The two lines through the middle.
      g.strokeStyle = '#3a4866';
      g.beginPath();
      g.moveTo(Math.round(sx(0)) + 0.5, 0);
      g.lineTo(Math.round(sx(0)) + 0.5, c.height);
      g.moveTo(0, Math.round(sz(0)) + 0.5);
      g.lineTo(c.width, Math.round(sz(0)) + 0.5);
      g.stroke();
    }
    // The walls of the room.
    g.strokeStyle = '#b08a55';
    g.lineWidth = 3;
    g.strokeRect(sx(-W), sz(-D), W * 2 * s, D * 2 * s);

    // Pieces, low to high so taller things show on top. Pools are cut into the ground, so they show over the floor
    // they sit in; single things are on top of everything.
    const chosen = new Set(this.chosen());
    const rank = (p: Piece): number => (SINGLE.has(p.t) ? 3 : p.t === 'bridge' ? 2 : p.t === 'water' || p.t === 'river' || p.t === 'lava' || p.t === 'fire' ? 1 : 0);
    const order = this.level.pieces.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.p.top - b.p.top);
    for (const { p, i } of order) this.drawPiece(p, chosen.has(i), i === this.hoverIdx && !this.drag, sx, sz, s);
    g.globalAlpha = 1;

    // The handles of the one selected rectangle.
    const sel = this.level.pieces[this.selected];
    if (sel && !SINGLE.has(sel.t) && !this.group.length && this.tool === 'select') {
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#1a1f2a';
      g.lineWidth = 1.5;
      for (const h of HANDLES) {
        const at = handlePoint(sel, h);
        g.fillRect(sx(at.x) - 4, sz(at.z) - 4, 8, 8);
        g.strokeRect(sx(at.x) - 4, sz(at.z) - 4, 8, 8);
      }
    }
    if (this.drag?.mode === 'box') {
      const d = this.drag;
      g.fillStyle = '#6ab7ff22';
      g.strokeStyle = '#6ab7ff';
      g.setLineDash([6, 4]);
      g.lineWidth = 1.5;
      g.fillRect(sx(Math.min(d.sx, d.cx)), sz(Math.min(d.sz, d.cz)), Math.abs(d.cx - d.sx) * s, Math.abs(d.cz - d.sz) * s);
      g.strokeRect(sx(Math.min(d.sx, d.cx)), sz(Math.min(d.sz, d.cz)), Math.abs(d.cx - d.sx) * s, Math.abs(d.cz - d.sz) * s);
      g.setLineDash([]);
    }
    // The jump checker: green where he can get to, red rings on what he cannot, orange where he would be stuck.
    if (this.reachOn && this.reach) {
      g.fillStyle = 'rgba(90,255,120,0.26)';
      const d = Math.max(1, s * 0.5 - 1);
      for (const [x, z] of this.reach.points) g.fillRect(sx(x) - d / 2, sz(z) - d / 2, d, d);
      g.fillStyle = 'rgba(255,150,40,0.75)';
      for (const [x, z] of this.reach.traps) g.fillRect(sx(x) - d / 2, sz(z) - d / 2, d, d);
      g.strokeStyle = '#ff3a3a';
      g.lineWidth = 3;
      for (const p of this.reach.problems) {
        const cx = sx(p.x), cz = sz(p.z), rr = Math.max(8, s * 0.8);
        g.beginPath();
        g.arc(cx, cz, rr, 0, 7);
        g.moveTo(cx - rr * 0.6, cz - rr * 0.6);
        g.lineTo(cx + rr * 0.6, cz + rr * 0.6);
        g.moveTo(cx + rr * 0.6, cz - rr * 0.6);
        g.lineTo(cx - rr * 0.6, cz + rr * 0.6);
        g.stroke();
      }
    }
    // What is about to be placed: under the pointer before a click, and stretched while dragging.
    const tool = INFO.get(this.tool as PieceType);
    if (tool && this.cursor && (this.hover || this.drag?.mode === 'draw')) {
      const d = this.drag?.mode === 'draw' ? this.drag : null;
      const step = this.prefs.snap;
      g.fillStyle = tool.color + '88';
      g.strokeStyle = '#ffe27a';
      g.lineWidth = 2;
      if (SINGLE.has(tool.t)) {
        const at = d ? { x: d.sx, z: d.sz } : this.cursor;
        g.beginPath();
        g.arc(sx(at.x), sz(at.z), Math.max(5, s * 0.42), 0, 7);
        g.fill();
        g.stroke();
      } else {
        const area = AREAS.has(tool.t);
        const cx = area ? Math.floor(this.cursor.x / step) * step : this.cursor.x;
        const cz = area ? Math.floor(this.cursor.z / step) * step : this.cursor.z;
        const a = d ? { x: Math.min(d.sx, d.cx), z: Math.min(d.sz, d.cz) } : { x: cx, z: cz };
        const b = d ? { x: Math.max(d.sx, d.cx) + (area ? step : 0), z: Math.max(d.sz, d.cz) + (area ? step : 0) } : { x: cx + step, z: cz + step };
        g.fillRect(sx(a.x), sz(a.z), (b.x - a.x) * s, (b.z - a.z) * s);
        g.strokeRect(sx(a.x), sz(a.z), (b.x - a.x) * s, (b.z - a.z) * s);
        if (d) this.tag(`${b.x - a.x} × ${b.z - a.z}`, sx(b.x) + 6, sz(b.z) + 6);
      }
    }
    // A measured jump.
    if (this.measure) {
      const m = this.measure;
      const r = this.measured();
      const ok = r && r.verdict !== 'too far' && r.verdict !== 'too high';
      g.strokeStyle = ok ? '#5fe08a' : '#ff6b6b';
      g.fillStyle = g.strokeStyle;
      g.lineWidth = 2.5;
      g.setLineDash([8, 5]);
      g.beginPath();
      g.moveTo(sx(m.a.x), sz(m.a.z));
      g.lineTo(sx(m.b.x), sz(m.b.z));
      g.stroke();
      g.setLineDash([]);
      for (const p of [m.a, m.b]) {
        g.beginPath();
        g.arc(sx(p.x), sz(p.z), 4.5, 0, 7);
        g.fill();
      }
      if (r && r.dist > 0) this.tag(`${r.dist.toFixed(1)}${Math.abs(r.rise) > 0.05 ? ` ${r.rise > 0 ? '↑' : '↓'}${Math.abs(r.rise).toFixed(1)}` : ''} · ${r.verdict}`, (sx(m.a.x) + sx(m.b.x)) / 2 + 8, (sz(m.a.z) + sz(m.b.z)) / 2 - 8, ok ? '#173d25' : '#5a1f1f');
    }
    // The rat, while watching live.
    if (this.live_ && this.playerAt) {
      const px = sx(this.playerAt.x);
      const pz = sz(this.playerAt.z);
      g.fillStyle = '#ff6a3a';
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px, pz, Math.max(4, s * 0.45), 0, 7);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(px, pz);
      g.lineTo(px + Math.sin(this.playerAt.f) * s * 1.1, pz + Math.cos(this.playerAt.f) * s * 1.1);
      g.stroke();
    }
    // Rulers along the top and the left: where on the map this is.
    const every = s >= 14 ? 5 : s >= 6 ? 10 : 20;
    g.fillStyle = '#0f1218e0';
    g.fillRect(0, 0, c.width, 16);
    g.fillRect(0, 0, 26, c.height);
    g.fillStyle = '#7d8aa3';
    g.font = `10px ${FONTS.game}`;
    g.textAlign = 'center';
    for (let x = Math.ceil(x0 / every) * every; x <= x1; x += every) if (sx(x) > 30) g.fillText(String(x), sx(x), 11);
    g.textAlign = 'right';
    for (let z = Math.ceil(z0 / every) * every; z <= z1; z += every) if (sz(z) > 22) g.fillText(String(z), 23, sz(z) + 3);
    g.textAlign = 'left';
    // North.
    const nx = c.width - 26;
    const ny = 40;
    g.fillStyle = '#171b24e6';
    g.beginPath();
    g.arc(nx, ny, 15, 0, 7);
    g.fill();
    g.fillStyle = '#ffc94a';
    g.beginPath();
    g.moveTo(nx, ny - 11);
    g.lineTo(nx + 5, ny + 2);
    g.lineTo(nx - 5, ny + 2);
    g.closePath();
    g.fill();
    g.fillStyle = '#c9d1e0';
    g.font = `bold 9px ${FONTS.game}`;
    g.textAlign = 'center';
    g.fillText('N', nx, ny + 12);
    g.textAlign = 'left';
  }

  /** A small label with a dark plate behind it. */
  private tag(text: string, x: number, y: number, bg = '#171b24'): void {
    const g = this.ctx;
    g.font = `bold 12px ${FONTS.game}`;
    const w = g.measureText(text).width + 10;
    const px = Math.min(this.canvas.width - w - 4, Math.max(30, x));
    const py = Math.min(this.canvas.height - 6, Math.max(34, y));
    g.fillStyle = bg;
    g.fillRect(px, py - 14, w, 19);
    g.fillStyle = '#ffffff';
    g.fillText(text, px + 5, py);
  }

  private drawPiece(p: Piece, sel: boolean, hov: boolean, sx: (x: number) => number, sz: (z: number) => number, s: number): void {
    const g = this.ctx;
    const i = info(p.t);
    g.globalAlpha = this.hiddenPiece(p) ? 0.12 : 1;
    g.fillStyle = i.color;
    g.strokeStyle = sel ? '#ffe27a' : hov ? '#ffffff' : '#00000080';
    g.lineWidth = sel ? 3 : hov ? 2 : 1;
    const arrow = (cx: number, cz: number, len: number): void => {
      if (!p.dir) return;
      const dx = { n: 0, s: 0, e: 1, w: -1 }[p.dir];
      const dz = { n: -1, s: 1, e: 0, w: 0 }[p.dir];
      g.strokeStyle = '#ffffff';
      g.fillStyle = '#ffffff';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx, cz);
      g.lineTo(cx + dx * len, cz + dz * len);
      g.stroke();
      g.beginPath();
      g.moveTo(cx + dx * (len + 4), cz + dz * (len + 4));
      g.lineTo(cx + dx * (len - 3) - dz * 4, cz + dz * (len - 3) + dx * 4);
      g.lineTo(cx + dx * (len - 3) + dz * 4, cz + dz * (len - 3) - dx * 4);
      g.closePath();
      g.fill();
    };
    if (SINGLE.has(p.t)) {
      const x = sx(p.x0);
      const z = sz(p.z0);
      const rr = Math.max(4, s * (p.t === 'brood' ? 1.05 : p.t === 'wyrm' ? 0.62 : 0.42));
      g.beginPath();
      if (p.t === 'spawn' || p.t === 'exit' || p.t === 'npc' || p.t === 'crate') g.rect(x - rr, z - rr, rr * 2, rr * 2);
      else g.arc(x, z, rr, 0, 7);
      g.fill();
      g.stroke();
      if (p.props?.tough) {
        g.strokeStyle = '#30343c';
        g.lineWidth = 2;
        g.strokeRect(x - rr + 2, z - rr + 2, rr * 2 - 4, rr * 2 - 4);
      }
      if (s >= 8 && i.glyph) {
        g.fillStyle = '#000000cc';
        g.font = `bold ${Math.max(8, Math.min(13, s * (i.glyph.length > 1 ? 0.5 : 0.62)))}px ${FONTS.game}`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(i.glyph, x, z + 0.5);
        g.textAlign = 'left';
        g.textBaseline = 'alphabetic';
      }
      arrow(x, z, rr + 5);
      return;
    }
    const b = pieceBounds(p);
    const x0 = sx(b.x0);
    const z0 = sz(b.z0);
    const w = (b.x1 - b.x0) * s;
    const h = (b.z1 - b.z0) * s;
    g.fillRect(x0, z0, w, h);
    // Higher ground is lighter, so the lie of the land can be read at a glance.
    if (i.layer === 'ground' && p.t !== 'wall') {
      const lift = Math.max(-0.25, Math.min(0.3, p.top * 0.035));
      g.fillStyle = lift >= 0 ? `rgba(255,255,255,${lift})` : `rgba(0,0,0,${-lift})`;
      g.fillRect(x0, z0, w, h);
    }
    if (p.t === 'wall' || p.t === 'pillar') {
      // Hatched: solid from the floor up.
      g.save();
      g.beginPath();
      g.rect(x0, z0, w, h);
      g.clip();
      g.strokeStyle = '#ffffff22';
      g.lineWidth = 1;
      g.beginPath();
      for (let k = -h; k < w; k += 7) {
        g.moveTo(x0 + k, z0 + h);
        g.lineTo(x0 + k + h, z0);
      }
      g.stroke();
      g.restore();
    } else if (p.t === 'stairs') {
      // A line for each step.
      const alongZ = (p.dir ?? 'n') === 'n' || (p.dir ?? 'n') === 's';
      const n = Math.max(1, Math.round(alongZ ? b.z1 - b.z0 : b.x1 - b.x0));
      g.strokeStyle = '#00000055';
      g.lineWidth = 1;
      g.beginPath();
      for (let k = 1; k < n; k++) {
        if (alongZ) {
          g.moveTo(x0, z0 + (h * k) / n);
          g.lineTo(x0 + w, z0 + (h * k) / n);
        } else {
          g.moveTo(x0 + (w * k) / n, z0);
          g.lineTo(x0 + (w * k) / n, z0 + h);
        }
      }
      g.stroke();
    } else if (p.t === 'lift') {
      g.setLineDash([5, 4]);
    }
    g.strokeStyle = sel ? '#ffe27a' : hov ? '#ffffff' : '#00000080';
    g.lineWidth = sel ? 3 : hov ? 2 : 1;
    g.strokeRect(x0, z0, w, h);
    g.setLineDash([]);
    if (p.dir) arrow(x0 + w / 2, z0 + h / 2, Math.min(18, Math.min(w, h) * 0.35));
    if (this.prefs.labels && s >= 8 && w > 26 && h > 13) {
      g.fillStyle = '#ffffffd0';
      g.font = `${Math.max(9, Math.min(12, s * 0.55))}px ${FONTS.game}`;
      const name = w > 90 && h > 26 ? `${i.label} ` : '';
      g.fillText(`${name}${p.top.toFixed(1)}`, x0 + 4, z0 + Math.min(13, s * 0.8));
    }
  }
}
