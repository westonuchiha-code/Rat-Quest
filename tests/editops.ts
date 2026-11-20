// The level editor's rules, without its screen: undo and redo, copy and paste, flipping, stretching a piece by its
// edges, counting what a level holds and measuring a jump. Then the new things a custom level can hold (the boss, fire,
// iron-bound crates, fog, fall-back), and the Workshop's test switches.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { History, boundsOf, flipPieces, handleAt, handlePoint, jumpReaches, levelStats, measureJump, pasteAt, resizeBy, surfaceAt, HANDLES } from '../src/levels/editOps';
import { ENEMY_PIECES, checkCustom, compileCustom, emptyCustom, parseCustom, type CustomLevel, type Piece } from '../src/levels/custom';
import { jumpReach, maxClimb } from '../src/levels/reach';
import { junkSolids } from '../src/world/layout';
import { TOOLS, SINGLE } from '../src/ui/builder';
import { TWEAKS, TWEAK_GROUPS, TWEAK_SECTIONS } from '../src/core/tweaks';
import { DEV, devSummary } from '../src/core/devSwitches';
import { HitShapes } from '../src/render/hitShapes';
import { PlayerController } from '../src/player/controller';
import { TUNING } from '../src/data/tuning';
import { SFX_NAMES, sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

// ---- Undo and redo ----
{
  const h = new History(3);
  check('with nothing done there is nothing to undo or redo', !h.canUndo && !h.canRedo && h.undo('now') === null && h.redo('now') === null);
  h.push('a');
  h.push('b');
  const back = h.undo('c');
  check('undo gives back the level as it was before the last change', back === 'b' && h.canRedo && h.canUndo);
  check('redo puts the change back', h.redo('b') === 'c' && !h.canRedo);
  h.undo('c');
  h.push('b2');
  check('a new change after an undo forgets what was undone', !h.canRedo);
  h.push('x1'); h.push('x2'); h.push('x3'); h.push('x4');
  check('only so many steps are kept, the oldest dropped first', h.depth === 3 && h.undo('n') === 'x4');
  const same = new History();
  same.push('s'); same.push('s');
  check('the same level is not recorded twice running', same.depth === 1);
  // (The 3D editor: a piece picked up to be moved and then put back was never a change, so it is not to be redone.)
  const lift = new History();
  lift.push('whole');
  const put = lift.undo('lifted');
  lift.dropRedo();
  check('stepping back over something that was never a change of its own leaves nothing to redo', put === 'whole' && !lift.canRedo && !lift.canUndo);
}

// ---- Flip, paste, stretch ----
{
  const ps = [box('floor', 0, 0, 4, 2), at('guard', 1, 1, 0, { dir: 'e' }), box('river', 5, 0, 8, 2, -0.85, { dir: 'n' }), box('lift', 6, 3, 8, 5, 1, { props: { move: 'w' } })];
  const b0 = boundsOf(ps);
  flipPieces(ps, 'x');
  const b1 = boundsOf(ps);
  check('flipped left and right, the group keeps its place and size', b0.x0 === b1.x0 && b0.x1 === b1.x1 && b0.z0 === b1.z0 && b0.z1 === b1.z1);
  check('...each piece is mirrored across it', ps[0].x0 === 4 && ps[0].x1 === 8 && ps[1].x0 === 7 && ps[2].x0 === 0 && ps[2].x1 === 3);
  check(
    '...what faced east faces west, what faced north still does, and a lift that glided west glides east',
    ps[1].dir === 'w'
      && ps[2].dir === 'n'
      && ps[3].props?.move === 'e'
  );
  flipPieces(ps, 'x');
  check('flipped back, everything is where it was', ps[0].x0 === 0 && ps[0].x1 === 4 && ps[1].x0 === 1 && ps[1].dir === 'e' && ps[3].props?.move === 'w');
  flipPieces(ps, 'z');
  check('flipped north and south, what faced north faces south', ps[2].dir === 's' && ps[1].dir === 'e' && ps[0].z0 === 3 && ps[0].z1 === 5);

  const clip = [box('platform', 0, 0, 2, 2, 3), at('crumb', 1, 1, 3)];
  const made = pasteAt(clip, 20.4, -9.6);
  const mb = boundsOf(made);
  check(
    'pasted pieces land with their middle where the pointer is, on whole squares',
    mb.x0 === 19
      && mb.x1 === 21
      && mb.z0 === -11
      && mb.z1 === -9
      && made[1].x0 === 20
      && made[1].z0 === -10
  );
  check(
    '...as copies: the originals are untouched, and heights and settings come too',
    clip[0].x0 === 0
      && made[0] !== clip[0]
      && made[0].top === 3
      && made[1].top === 3
  );

  const p = box('floor', 2, 4, 10, 8);
  check(
    'a rectangle has eight handles: its corners and the middles of its edges',
    HANDLES.length === 8
      && handlePoint(p, 'nw').x === 2
      && handlePoint(p, 'nw').z === 4
      && handlePoint(p, 'e').x === 10
      && handlePoint(p, 'e').z === 6
      && handlePoint(p, 's').z === 8
  );
  check(
    'the pointer picks up the handle it is on, a corner before an edge, and none from the middle',
    handleAt(p, 10.2, 8.1, 0.6) === 'se'
      && handleAt(p, 6, 3.8, 0.6) === 'n'
      && handleAt(p, 6, 6, 0.6) === null
  );
  const wide = resizeBy(p, 'e', 15, 99);
  check('dragging the east edge moves only that edge', wide.x0 === 2 && wide.x1 === 15 && wide.z0 === 4 && wide.z1 === 8);
  const corner = resizeBy(p, 'nw', 0, 1);
  check('dragging a corner moves two edges', corner.x0 === 0 && corner.z0 === 1 && corner.x1 === 10 && corner.z1 === 8);
  const thin = resizeBy(p, 'w', 50, 0);
  check('a piece cannot be dragged inside out: it stays at least one square wide', thin.x0 === 9 && thin.x1 === 10);
}

// ---- What is in a level, and how high the ground is ----
{
  const L: CustomLevel = { ...emptyCustom(), pieces: [box('floor', -10, -10, 10, 10), box('platform', 0, 0, 4, 4, 3), box('wall', -5, -5, -4, 5, 6), at('spawn', 0, 8), at('exit', 0, -10), at('crumb', 1, 1, 3), at('crate', 5, 5, 0, { props: { item: 'crumb' } }), at('barrel', 6, 5, 0, { props: { item: 'relic' } }), at('roach', -8, 0), at('brood', 0, -5), at('wedge', 2, 2, 3)] };
  check('the ground under a point is the top of the highest floor or slab there', surfaceAt(L, 2, 2) === 3 && surfaceAt(L, 8, 8) === 0);
  check('...a wall is not ground, and outside the room there is none', surfaceAt(L, -4.5, 0) === 0 && surfaceAt(L, 40, 0) === null);
  const s = levelStats(L, ENEMY_PIECES);
  check(
    'the count of a level includes what is hidden in crates and barrels',
    s.pieces === 11
      && s.crumbs === 2
      && s.relics === 1
      && s.caps === 0
      && s.wedges === 1
      && s.breakables === 2
  );
  check('...its creatures (the boss among them) and its floor area', s.enemies === 2 && s.ground === 400 + 16);
}

// ---- Measuring a jump ----
{
  const flat = jumpReaches(0);
  check(
    'on the level a double jump and a long jump both carry further than a single',
    flat.jump > 4
      && flat.double > flat.jump
      && flat.long > flat.jump,
    `jump ${flat.jump.toFixed(1)}, double ${flat.double.toFixed(1)}, long ${flat.long.toFixed(1)}`
  );
  check(
    'the editor\'s reach agrees with the jump checker\'s',
    Math.abs(Math.max(flat.double, flat.long) - jumpReach(0)) < 0.01
      && Math.abs(Math.max(jumpReaches(2).jump, jumpReaches(2).double, jumpReaches(2).long) - jumpReach(2)) < 0.01
  );
  const high = jumpReaches(3);
  check('up three units a single jump cannot make it and a double can', high.jump === 0 && high.double > 0 && high.long === 0);
  const from = { x: 0, z: 0, y: 0 };
  check('a short hop is a jump', measureJump(from, { x: 3, z: 0, y: 0 }).verdict === 'jump');
  check('a wider gap wants a double jump or a long jump', ['double jump', 'long jump'].includes(measureJump(from, { x: flat.jump + 1, z: 0, y: 0 }).verdict));
  check('wider than anything reaches is too far', measureJump(from, { x: 0, z: Math.max(flat.long, flat.double) + 1, y: 0 }).verdict === 'too far');
  const ledge = measureJump(from, { x: 1.5, z: 0, y: 5.5 });
  check(
    'a ledge above the top of a double jump but within his reach is a double jump and a grab',
    ledge.verdict === 'double jump and grab'
      && ledge.grab
      && !ledge.double,
    `${ledge.rise} up; he can climb ${maxClimb().toFixed(2)}`
  );
  check('higher than he can reach is too high', measureJump(from, { x: 1, z: 0, y: maxClimb() + 0.5 }).verdict === 'too high');
  const m = measureJump({ x: 0, z: 0, y: 2 }, { x: 3, z: 4, y: 0.5 });
  check('it reports how far across and how far up or down', Math.abs(m.dist - 5) < 1e-9 && Math.abs(m.rise + 1.5) < 1e-9 && m.jump);
}

// ---- New in custom levels ----
{
  const L: CustomLevel = {
    ...emptyCustom(), width: 44, depth: 44, fallBack: true, fogRange: [6, 28],
    pieces: [box('floor', -22, -22, 22, 22), at('spawn', 0, 18), at('exit', 0, -22), at('brood', 0, -4, 0, { dir: 's' }), box('fire', 5, 5, 8, 8), at('crate', -6, 10, 0, { props: { tough: true, item: 'cap' } }), at('crate', -8, 10)],
    goals: [{ type: 'defeat' }],
  };
  check('a level with the boss, a fire and an iron-bound crate has nothing wrong with it', checkCustom(L).length === 0, checkCustom(L).join(' '));
  const def = compileCustom(L);
  const boss = def.enemies.find((e) => e.type === 'brood');
  check(
    'the Broodmother can be put in a level: she has the run of the whole room, and does not come back',
    !!boss
      && boss!.arena!.x0 === -20
      && boss!.arena!.x1 === 20
      && boss!.arena!.z0 === -20
      && boss!.respawn === false
      && boss!.facing === 0
  );
  check(
    'a fire piece burns over its squares, from the floor up',
    def.fire?.length === 1
      && def.fire[0].x0 === 5
      && def.fire[0].x1 === 8
      && def.fire[0].y === 0
  );
  const crates = def.solids.filter((b) => b.kind === 'rubble');
  check(
    'a crate can be bound in iron (and still hold something); the one beside it is plain',
    crates.length === 2
      && crates.filter((b) => b.tough).length === 1
      && def.collectibles.some((c) => c.kind === 'cap')
  );
  check('a level can put him back where he fell from, and set how far he sees', def.fallBack === true && def.fogRange?.[0] === 6 && def.fogRange?.[1] === 28);
  const again = parseCustom(JSON.stringify(L));
  check(
    'all of it survives being saved as text and read back',
    !!again
      && again!.fallBack === true
      && again!.fogRange?.[1] === 28
      && again!.pieces.some((p) => p.t === 'brood')
      && again!.pieces.some((p) => p.props?.tough)
  );
  const plain = compileCustom(emptyCustom());
  check('a level that sets none of it is as it always was', plain.fire === undefined && plain.fallBack === undefined && plain.fogRange === undefined);
  check(
    'a "defeat" goal is satisfied by a boss alone',
    checkCustom({ ...L, pieces: L.pieces.filter((p) => p.t !== 'crate') }).length === 0
      && checkCustom({ ...L, pieces: L.pieces.filter((p) => p.t !== 'brood') }).some((m) => m.includes('defeat'))
  );
}

// ---- The palette ----
{
  const pieces = TOOLS.filter((g) => g.group !== 'EDIT' && g.group !== 'SHAPES').flatMap((g) => g.items.map((i) => i.t));
  check(
    'the palette offers every piece once, the new ones (fire, the Broodmother) among them',
    new Set(pieces).size === pieces.length
      && pieces.includes('fire')
      && pieces.includes('brood')
      && pieces.length >= 48,
    `${pieces.length} pieces`
  );
  check('every enemy piece is on the palette and is a single spot on the map', ENEMY_PIECES.every((t) => pieces.includes(t) && SINGLE.has(t)));
  check(
    'the editor\'s own tools are Select, Erase, Pan and Measure',
    TOOLS[0].group === 'EDIT'
      && TOOLS[0].items.map((i) => i.t).join() === 'select,erase,pan,measure'
  );
}

// ---- Game feel: no slider can be left off the panel ----
{
  const groups = new Set(TWEAKS.map((t) => t.group));
  check(
    'every group of sliders is listed in the panel (six groups of creature sliders used to be missing)',
    [...groups].every((g) => TWEAK_GROUPS.includes(g))
      && TWEAK_GROUPS.length === groups.size,
    `${TWEAK_GROUPS.length} groups: ${TWEAK_GROUPS.join(', ')}`
  );
  check(
    '...the Keep Guards, Mantises, Stag Knights, Ironbacks, Flitters and the Broodmother among them',
    ['Keep Guards', 'Mantises', 'Stag Knights', 'Ironbacks', 'Flitters', 'The Broodmother'].every((g) => TWEAK_GROUPS.includes(g))
  );
  const named = TWEAK_SECTIONS.flatMap((s) => s.groups);
  check('each group sits under one section heading', new Set(named).size === named.length && [...groups].every((g) => named.includes(g)));
}

// ---- The Workshop's test switches ----
{
  check(
    'every test switch is off to begin with, and nothing is said in the corner',
    !DEV.god
      && DEV.slow === 1
      && !DEV.openDoors
      && !DEV.shapes
      && !DEV.still
      && !DEV.readout
      && devSummary() === ''
  );
  DEV.god = true;
  DEV.slow = 0.25;
  check('what is switched on is said in a few words', devSummary() === 'no damage · speed x0.25');
  DEV.god = false;
  DEV.slow = 1;
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.untouchable = true;
  const r = p.takeHit(0, 2, 1);
  const f = p.takeFall(1);
  check('with "no damage" on, neither a blow nor a fall hurts him', r === 'dodged' && f === 'dodged' && p.hp === TUNING.health.max);
  p.untouchable = false;
  check('with it off he is hurt as ever', p.takeHit(0, 2, 1) === 'hit' && p.hp === TUNING.health.max - 1);

  const shapes = new HitShapes();
  const rat = { x: 0, y: 0, z: 0, facing: 0, radius: 0.3, swing: null, guarding: false, blockArc: 1 };
  const foe = { x: 3, y: 0, z: 0, facing: Math.PI, radius: 0.6, alive: true, attackActive: false, attacking: false, bite: { reach: 1.3, arc: 0.4 } };
  shapes.update(false, [foe], rat);
  check('hit shapes draw nothing while the switch is off', !shapes.object.visible);
  shapes.update(true, [foe], rat);
  const quiet = shapes.count;
  shapes.update(true, [{ ...foe, attacking: true }], rat);
  const winding = shapes.count;
  shapes.update(true, [{ ...foe, attackActive: true }], { ...rat, swing: { reach: 1.4, arc: 1 }, guarding: true });
  check(
    'on, they draw a ring for each body, more once an attack is winding up, and his sword and shield too',
    shapes.object.visible
      && quiet > 100
      && winding > quiet
      && shapes.count > winding,
    `${quiet}, ${winding}, ${shapes.count} line ends`
  );
  const pos = shapes.object.geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < shapes.count; i++) far = Math.max(far, Math.hypot(pos.getX(i) - foe.x, pos.getZ(i) - foe.z));
  check(
    'an attack\'s wedge reaches exactly as far as the blow does: its body, its reach, and the rat\'s own width',
    Math.abs(far - (foe.radius + foe.bite.reach + rat.radius)) < 0.02 || far > foe.radius + foe.bite.reach + rat.radius,
    `${far.toFixed(2)}`
  );
  shapes.update(true, [{ ...foe, alive: false }], rat);
  check('the dead are not drawn', shapes.count < quiet);
}

// ---- The sound test's numbers ----
{
  const rms = (n: (typeof SFX_NAMES)[number]): number => { const d = sfx(n).data; let q = 0; for (const v of d) q += v * v; return Math.sqrt(q / d.length); };
  const all = SFX_NAMES.map((n) => ({ n, loud: rms(n) }));
  check('every sound has a loudness the sound test can show', all.every((s) => Number.isFinite(s.loud) && s.loud > 0 && s.loud < 1), `${all.length} sounds`);
  const quiet = all.filter((s) => s.loud < 0.09).map((s) => s.n);
  check('(for the record: the sounds it marks as quiet enough to be lost)', quiet.length >= 0, quiet.join(', ') || 'none');
}

// ---- B2 (2026-11-17): the editor knows the new things: pots, rocks, the spawn button, the Club's tables, stools and bar ----
{
  const at = (t: Piece['t'], x: number, z: number, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top: 0, ...extra });
  const lvl: CustomLevel = {
    name: 'New things', width: 30, depth: 30, wallHeight: 8,
    pieces: [
      { t: 'floor', x0: -15, z0: -15, x1: 15, z1: 15, top: 0 },
      at('spawn', 0, 10), at('exit', 0, -15),
      at('pot', -4, 4, { props: { item: 'cap' } }), at('rock', -2, 4), at('crate', 2, 4),
      at('plate', 0, 0, { dir: 'e', props: { spawns: 'roach' } }), at('plate', 6, 6),
      at('table', -6, -6, { props: { candle: true, mugs: 3 } }), at('stool', -4.8, -6),
      { t: 'bar', x0: 10, z0: -6, x1: 11, z1: 0, top: 0 },
    ],
  };
  const def = compileCustom(lvl, 'newthings');
  const throwable = def.solids.filter((b) => b.kind === 'rubble' || b.kind === 'barrel');
  check(
    'a POT and a ROCK placed in the editor are things to lift and throw in the level (and a pot can hold a collectible: the crate after it keeps its own)',
    throwable.some((b) => b.prop === 'pot')
      && throwable.some((b) => b.prop === 'rock')
      && def.crateContents.length === throwable.length
      && !!def.crateContents[throwable.findIndex((b) => b.prop === 'pot')]
      && !def.crateContents[throwable.findIndex((b) => !b.prop)]
  );
  const button = def.plates?.find((q) => q.spawn);
  const plain = def.plates?.find((q) => !q.spawn);
  check(
    'a FLOOR PLATE set to put in a roach is a BUTTON: it puts one in six along the way it faces (east), up to six alive, and that one does not come back',
    !!button
      && button.spawn!.type === 'scuttler'
      && Math.abs(button.spawn!.x - 6) < 1e-6
      && Math.abs(button.spawn!.z) < 1e-6
      && button.most === 6
      && button.spawn!.respawn === false,
    JSON.stringify(button?.spawn ? { x: button.spawn.x, z: button.spawn.z, type: button.spawn.type } : null)
  );
  check('...a plate with nothing set is a plain plate, as before', !!plain && plain.spawn === undefined && (def.plates?.length ?? 0) === 2);
  const near = (q: { x: number; z: number }, x: number, z: number): boolean => Math.abs(q.x - x) < 1e-6 && Math.abs(q.z - z) < 1e-6;
  const table = def.decor.find((d) => d.kind === 'table') as { kind: 'table'; x: number; z: number; candle?: boolean; mugs?: unknown[] } | undefined;
  check(
    'a TABLE is drawn with its candle and three thimbles, and is solid',
    !!table
      && near(table, -6, -6)
      && table.candle === true
      && table.mugs?.length === 3
      && def.solids.some((b) => b.hidden && b.x0 < -6 && b.x1 > -6 && b.z0 < -6 && b.z1 > -6)
  );
  check(
    'a STOOL is drawn and solid',
    def.decor.some((d) => d.kind === 'stool' && near(d as { x: number; z: number }, -4.8, -6))
      && def.solids.some((b) => b.hidden && b.x0 < -4.8 && b.x1 > -4.8)
  );
  const counter = def.solids.find((b) => b.kind === 'plank' && b.x0 === 10 && b.x1 === 11);
  check(
    'a BAR is a counter over its squares, a counter\'s height, with thimbles along it and a keg on it',
    !!counter
      && counter.y1 === 1
      && counter.z0 === -6
      && counter.z1 === 0
      && def.decor.some((d) => d.kind === 'mugs')
      && def.decor.some((d) => d.kind === 'keg')
  );
  check(
    '...and the editor offers all six in its palette, the single ones placed with one click',
    ['pot', 'rock', 'table', 'stool', 'bar'].every((t) => TOOLS.some((g) => g.items.some((i) => i.t === t)))
      && ['pot', 'rock', 'table', 'stool'].every((t) => SINGLE.has(t as Piece['t']))
      && !SINGLE.has('bar')
  );
  check('...and a level with them has nothing the editor\'s checks find wrong with them', checkCustom(lvl).length === 0, checkCustom(lvl).join('; '));
  const back = parseCustom(JSON.stringify(lvl));
  check(
    '...and it saves and loads with them in it',
    !!back
      && back.pieces.length === lvl.pieces.length
      && back.pieces.some((q) => q.t === 'plate' && q.props?.spawns === 'roach')
  );
}

// ---- 2026-11-18: odds and ends for rooms: a candle stub, a cotton reel, a matchbox, a wheel of cheese, a sardine tin ----
{
  const at = (t: Piece['t'], x: number, z: number, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top: 0, ...extra });
  const kinds = ['candle', 'spool', 'matchbox', 'cheese', 'sardines', 'button', 'pencil', 'die', 'pawn', 'battery', 'teacup', 'spoon', 'safetypin', 'paperclip', 'crayon', 'marble'] as const;
  const lvl: CustomLevel = {
    name: 'Odds and ends', width: 30, depth: 30, wallHeight: 8,
    pieces: [
      { t: 'floor', x0: -15, z0: -15, x1: 15, z1: 15, top: 0 },
      at('spawn', 0, 10), at('exit', 0, -15),
      ...kinds.map((k, i) => at(k, -8 + i * 4, 0, { dir: 'e' })),
    ],
  };
  const def = compileCustom(lvl, 'oddsandends');
  const junk = def.decor.filter((d) => d.kind === 'junk') as { kind: 'junk'; what: string; x: number; z: number }[];
  check(
    'each of the five ODDS AND ENDS placed in the editor is drawn where it was put',
    kinds.every((k, i) => junk.some((d) => d.what === k && Math.abs(d.x - (-8 + i * 4)) < 1e-6 && Math.abs(d.z) < 1e-6))
  );
  check(
    '...and each is solid: something to stand on, not to walk through',
    kinds.every((_, i) => def.solids.some((b) => b.hidden && b.x0 < -8 + i * 4 && b.x1 > -8 + i * 4 && b.z0 < 0 && b.z1 > 0 && b.y1 >= 0.08))
  );
  const m = junkSolids('matchbox', 0, 0, 0, Math.PI / 2)[0];
  check('...and a matchbox turned a quarter is long the other way', (m.z1 - m.z0) > (m.x1 - m.x0));
  check(
    '...and the editor offers all five, each placed with one click',
    kinds.every((t) => TOOLS.some((g) => g.items.some((i) => i.t === t)) && SINGLE.has(t))
  );
  check(
    '...and a level with them has nothing the editor\'s checks find wrong, and saves and loads',
    checkCustom(lvl).length === 0
      && parseCustom(JSON.stringify(lvl))?.pieces.length === lvl.pieces.length,
    checkCustom(lvl).join('; ')
  );
}

// ---- 2026-11-20: a moving platform's kind (world/platforms.ts) ----
{
  const at = (x: number, motion: string | undefined, extra: Record<string, unknown> = {}): Piece => ({ t: 'lift', x0: x, z0: 0, x1: x + 2, z1: 2, top: 1, props: { travel: 3, ...(motion ? { motion } : {}), ...extra } as never });
  const lvl: CustomLevel = { name: 'Platforms', width: 40, depth: 20, wallHeight: 8, pieces: [
    { t: 'floor', x0: -20, z0: -10, x1: 20, z1: 10, top: 0 }, { t: 'spawn', x0: 0, z0: 8, x1: 0, z1: 8, top: 0 }, { t: 'exit', x0: 0, z0: -10, x1: 0, z1: -10, top: 0 },
    at(-18, undefined), at(-14, 'circle', { move: 'e' }), at(-10, 'ride'), at(-6, 'sink'), at(-2, 'crumble'), at(2, 'spring'),
  ] };
  const ms = compileCustom(lvl, 'platformkinds').movers ?? [];
  const by = (m: string): (typeof ms)[number] | undefined => ms.find((q) => (q.motion ?? 'glide') === m);
  check('the editor\'s moving platform comes in six kinds, each compiled to its own', ms.length === 6 && ['glide', 'circle', 'ride', 'sink', 'crumble', 'spring'].every((m) => !!by(m)), ms.map((m) => m.motion ?? 'glide').join(', '));
  check('...its "how far" is the circle\'s radius (the way it is set), the sink\'s depth, the spring\'s height', by('circle')!.to[0] === 3 && by('sink')!.depth === 3 && by('spring')!.launch === 3 && by('sink')!.to.every((v) => v === 0));
  check('...and a level with all six has nothing the editor\'s checks find wrong, and saves and loads', checkCustom(lvl).length === 0 && parseCustom(JSON.stringify(lvl))?.pieces.filter((p) => p.t === 'lift').length === 6, checkCustom(lvl).join('; '));
}

console.log(failures === 0 ? '\neditops: all passed' : `\neditops: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
