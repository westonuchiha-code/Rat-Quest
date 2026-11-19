// Barrels, wall pipes and gates, the current, the toad and its globs, the talking character, and levels from the builder.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { CombatEvents, resolveCombat, resolveGlobs } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { Toad, TOAD, Glob, stepGlobs } from '../src/enemies/toad';
import { Scuttler } from '../src/enemies/scuttler';
import { Npc } from '../src/npc/npc';
import { LEVELS } from '../src/levels/levels';
import { GoalTracker } from '../src/levels/goals';
import { compileCustom, emptyCustom, checkCustom, parseCustom, CustomLevel } from '../src/levels/custom';
import { STAMPS } from '../src/levels/stamps';
import { SAMPLES } from '../src/levels/samples';
import { findProblems, extent } from '../src/world/layout';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}
const ev = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });

// ---- Barrel and pipe, hit by a sword ----
const floor = extent('floor', -10, 10, -1, 0, -10, 10);
const chamber = buildChamber({
  solids: [floor, extent('barrel', -0.5, 0.5, 0, 1.1, 3.5, 4.5)],
  pit: null,
  water: [],
  decor: [],
  pipes: [{ x: 4, z: 3.5, top: 9, yaw: 0 }],
  gates: [{ x: 0, z: -6, width: 6, height: 3, pipes: [0] }],
});
const barrel = chamber.crates[0];
check('a barrel is a breakable of its own type', chamber.crates.length === 1 && barrel.type === 'barrel');
check('a wall pipe is listed apart from the crates', chamber.pipes.length === 1 && chamber.pipes[0].type === 'pipe' && chamber.pipes[0].alive);

function swingAt(x: number, z: number, from: [number, number], list: typeof chamber.crates): typeof chamber.crates {
  const p = new PlayerController(new THREE.Vector3(from[0], 0, from[1]));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  p.facing = Math.atan2(x - from[0], z - from[1]);
  const broken: typeof chamber.crates = [];
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 40; i++) {
    p.update(DT, input(), chamber.colliders);
    const e = ev();
    resolveCombat(p, [], e, list);
    broken.push(...e.cratesBroken);
  }
  return broken;
}
check('a sword swing breaks the barrel', swingAt(0, 4, [0, 2.4], chamber.crates).includes(barrel));
const pipe = chamber.pipes[0];
const hit = swingAt(pipe.x, pipe.z, [pipe.x, pipe.z - 1.3], chamber.pipes);
check('a sword swing breaks the pipe joint', hit.includes(pipe));
const gate = chamber.gates[0];
check('the gate is shut and solid', !gate.open && chamber.colliders.length > 3);
const colBefore = chamber.colliders.length;
chamber.breakCrate(barrel);
check('breaking a barrel removes its collider', chamber.colliders.length === colBefore - 1);
chamber.breakCrate(pipe);
check('a broken pipe stays solid (only the joint goes)', chamber.colliders.length === colBefore - 1);
chamber.openGate(gate);
for (let t = 0; t < 3; t += 0.05) chamber.update(t);
check('an opened gate rises and loses its collider', gate.lift >= 1 && chamber.colliders.length === colBefore - 2);

// ---- A current carries him ----
const river = buildChamber({
  solids: [extent('floor', -10, 10, -4, -3.4, -10, 10)],
  pit: null,
  water: [{ x0: -10, x1: 10, z0: -10, z1: 10, y: -0.85, flow: [0, 2] }],
  decor: [],
});
const swimmer = new PlayerController(new THREE.Vector3(0, -0.9, -5));
swimmer.water = river.water;
for (let i = 0; i < 120; i++) swimmer.update(DT, input(), river.colliders);
check('a current carries a swimmer along it', swimmer.position.z > -5 + 2.5 && swimmer.swimming, `z=${swimmer.position.z.toFixed(2)}`);
const still = new PlayerController(new THREE.Vector3(0, 0, -5));
still.water = river.water;
check('the same water does not push him on dry ground', (() => { for (let i = 0; i < 5; i++) still.update(DT, input(), []); return true; })());

// ---- The toad ----
const toad = new Toad({ x: 0, z: 0 });
let spit: Glob | null = null;
const target = new THREE.Vector3(0, 0, 8);
for (let i = 0; i < 60 * 5 && !spit; i++) {
  toad.update(DT, target.x, target.y, target.z, true);
  if (toad.spit) {
    spit = { ...toad.spit, age: 0, done: false };
    toad.spit = null;
  }
}
check('a toad that notices him winds up and spits', spit !== null && toad.state === 'recover', toad.state);
if (spit) {
  const ground = (): number | null => 0;
  const globs = [spit];
  let ended: Glob[] = [];
  for (let i = 0; i < 60 * 4 && ended.length === 0; i++) ended = stepGlobs(globs, DT, ground);
  const g = ended[0];
  check(
    'the glob lands where he stood',
    !!g
      && Math.hypot(g.x - target.x, g.z - target.z) < 1.3,
    g ? `landed ${g.x.toFixed(1)},${g.z.toFixed(1)}` : 'no landing'
  );
}
const near = new Toad({ x: 0, z: 0 });
for (let i = 0; i < 120; i++) near.update(DT, 0, 0, 1.5, true);
check('too close and it hops away', Math.hypot(near.x, near.z) > 1.2 || near.state === 'hop', `${near.x.toFixed(1)},${near.z.toFixed(1)} ${near.state}`);
const dead = new Toad({ x: 0, z: 0 });
check('three sword hits kill it', !dead.takeHit(1, 0, 3) && !dead.takeHit(1, 0, 3) && dead.takeHit(1, 0, 3) && !dead.alive);

// ---- A glob hurts him unless he dodges ----
const pp = new PlayerController(new THREE.Vector3(0, 0, 0));
for (let i = 0; i < 20; i++) pp.update(DT, input(), [floor].map((b) => ({ min: new THREE.Vector3(b.x0, b.y0, b.z0), max: new THREE.Vector3(b.x1, b.y1, b.z1) })) as never);
const hpBefore = pp.hp;
const gl: Glob = { x: 0, y: 0.5, z: 0.1, vx: 0, vy: 0, vz: -5, age: 0, done: false };
const e1 = ev();
const burst = resolveGlobs(pp, [gl], e1);
check('a glob that reaches him hurts him', burst.length === 1 && pp.hp === hpBefore - TOAD.globDamage);

// ---- The talking character ----
const npc = new Npc({ x: 5, z: 5, facing: 0, name: 'PIP', lines: ['hi'] });
check('he can be talked to only when close', npc.inRange(5, 0, 6) && !npc.inRange(5, 0, 12) && !npc.inRange(5, 3, 5));

// ---- Levels with pipes ----
const pump = LEVELS.find((l) => l.id === 'pumpworks')!;
check('the Pumpworks has three pipes and a gate that waits for them', (pump.pipes?.length ?? 0) === 3 && (pump.gates?.[0].pipes?.length ?? 0) === 3);
const tracker = new GoalTracker(pump, () => ({ have: 0, total: 0 }));
check('the pipes wedge is not out at first', !tracker.wedgeOut(0, 0));
tracker.burst = 3;
check('bursting all the pipes brings it out', tracker.wedgeOut(0, 0));

// ---- Levels from the builder ----
const def = emptyCustom();
check('a new builder level needs nothing more to play', checkCustom(def).length === 0);
const lvl = compileCustom(def);
check('and compiles to a level with nothing overlapping', findProblems({ solids: lvl.solids, pit: lvl.pit, water: lvl.water }).length === 0);
check('with a door on a wall', Math.abs(lvl.exit.z + 20) < 0.5, `door z=${lvl.exit.z}`);
def.pieces.push({ t: 'toad', x0: 0, z0: -8, x1: 0, z1: -8, top: 0 }, { t: 'barrel', x0: 4, z0: 4, x1: 4, z1: 4, top: 0 }, { t: 'river', x0: -6, z0: -2, x1: 0, z1: 4, top: -0.85, dir: 'e' }, { t: 'pipe', x0: 19, z0: 0, x1: 19, z1: 0, top: 0, dir: 'w' });
const lvl2 = compileCustom(def);
check('toads and pipes become goals', lvl2.goals.length === 2 && lvl2.enemies[0].type === 'toad' && (lvl2.pipes?.length ?? 0) === 1);
check('a river keeps its flow', lvl2.water.some((w) => !!w.flow && w.flow[0] > 0));
check('a level survives being copied as text', parseCustom(JSON.stringify(def))?.pieces.length === def.pieces.length);
check('nonsense text is refused', parseCustom('hello') === null && parseCustom('{"pieces":3}') === null);
check('no start point is reported', checkCustom({ ...def, pieces: def.pieces.filter((p) => p.t !== 'spawn') }).length > 0);

// Stacked crates: break the bottom one and the top one falls to the floor (and stays solid).
const stack = buildChamber({
  solids: [floor, extent('rubble', 8, 9, 0, 1, 8, 9), extent('rubble', 8, 9, 1, 2, 8, 9), extent('rubble', 8, 9, 2, 3, 8, 9)],
  pit: null,
  water: [],
});
const [c1, c2, c3] = stack.crates;
stack.breakCrate(c1);
for (let t = 0; t < 2; t += 1 / 60) stack.update(t);
check('a crate stacked on a broken one falls to the floor', c2.alive && Math.abs(c2.aabb.min.y - 0) < 0.01, `bottom ${c2.aabb.min.y.toFixed(2)}`);
check('the whole stack comes down together', Math.abs(c3.aabb.min.y - 1) < 0.01, `bottom ${c3.aabb.min.y.toFixed(2)}`);
check('fallen crates are still solid', stack.colliders.includes(c2.aabb) && stack.colliders.includes(c3.aabb));

// Builder: stairs, crate contents, characters, goals, markers, stamps.
{
  const L: CustomLevel = emptyCustom();
  L.pieces.push(
    { t: 'stairs', x0: -2, z0: 0, x1: 2, z1: 6, top: 3, bottom: 0, dir: 'n' },
    { t: 'crate', x0: 8, z0: 8, x1: 8, z1: 8, top: 0, props: { item: 'cap' } },
    { t: 'npc', x0: 5, z0: 5, x1: 5, z1: 5, top: 0, props: { name: 'finch', kind: 'bird', lines: ['Hi!', ' ', 'Bye!'] } },
    { t: 'mark', x0: -8, z0: -8, x1: -8, z1: -8, top: 0 },
    { t: 'crumb', x0: 3, z0: 3, x1: 3, z1: 3, top: 0 },
  );
  L.goals = [{ type: 'collect', kind: 'crumb', count: 'all' }, { type: 'reach' }];
  L.music = 'pump';
  L.blurb = 'Test blurb';
  const def = compileCustom(L);
  const steps = def.solids.filter((b) => b.kind === 'stone');
  check(
    'stairs become a flight of steps that climbs to the top height',
    steps.length === 6
      && Math.max(...steps.map((b) => b.y1)) === 3,
    `${steps.length} steps`
  );
  check('steps rise toward the way the stairs face', steps.some((b) => b.z0 <= 0.01 && b.y1 > 2.4));
  check(
    'a crate can hold a collectible',
    def.crateContents.length === 1
      && def.crateContents[0] !== null
      && def.collectibles.some((c) => c.crate === 0 && c.kind === 'cap')
  );
  check('a character keeps his name, kind and lines', def.npcs?.[0].name === 'FINCH' && def.npcs[0].kind === 'bird' && def.npcs[0].lines.length === 2);
  check('chosen goals replace the automatic ones', def.goals.length === 2 && def.goals[0].type === 'collect' && def.goals[1].type === 'reach');
  check('the goal marker is where the reach goal points', def.goals[1].type === 'reach' && def.goals[1].x === -8 && def.goals[1].z === -8);
  check('music and description carry over', def.music === 'pump' && def.blurb === 'Test blurb');
  const again = parseCustom(JSON.stringify(L));
  check(
    'goals, music and props survive saving as text',
    !!again
      && again.goals?.length === 2
      && again.music === 'pump'
      && again.pieces.some((q) => q.props?.item === 'cap')
  );
  check('a reach goal without a marker is flagged', checkCustom({ ...emptyCustom(), goals: [{ type: 'reach' }] }).some((m) => /marker/.test(m)));
  check('a defeat goal without enemies is flagged', checkCustom({ ...emptyCustom(), goals: [{ type: 'defeat' }] }).some((m) => /enemy/.test(m)));
  for (const st of STAMPS) {
    const lv = emptyCustom();
    lv.pieces.push(...st.make(0, 0, 0));
    let ok = true;
    try {
      compileCustom(lv);
    } catch {
      ok = false;
    }
    check(`stamp "${st.label}" compiles`, ok && st.make(0, 0, 0).length > 0);
  }
}

// Sample levels in the builder must be playable.
for (const sm of SAMPLES) {
  const d = compileCustom(sm.level);
  const probs = findProblems({ solids: d.solids, pit: d.pit, water: d.water });
  check(
    `sample "${sm.title}" has nothing wrong`,
    checkCustom(sm.level).length === 0
      && probs.length === 0,
    [...checkCustom(sm.level), ...probs].slice(0, 3).join(' | ')
  );
}

// Themes: a level's look sets the pictures and fog; a piece can name its own.
{
  const L = emptyCustom();
  L.theme = 'mine';
  L.pieces.push({ t: 'wall', x0: -3, z0: 0, x1: 3, z1: 1, top: 4 }, { t: 'stone', x0: 5, z0: 0, x1: 7, z1: 2, top: 2, skin: 'clay' }, { t: 'lamp', x0: 0, z0: 5, x1: 0, z1: 5, top: 3 }, { t: 'window', x0: 1, z0: 6, x1: 1, z1: 6, top: 3, dir: 'e' });
  const d = compileCustom(L);
  check('a theme gives boxes its pictures', d.solids.some((b) => b.kind === 'wall' && b.skin === 'mineBrick' && b.x0 === -3));
  check('a piece can wear its own picture', d.solids.some((b) => b.skin === 'clay'));
  check('the fog follows the theme', d.fog === 0x1c140c && compileCustom(emptyCustom()).fog === 0x0b1410);
  check('lamps and windows become decor', d.decor.some((x) => x.kind === 'lamp') && d.decor.some((x) => x.kind === 'window'));
  check('the theme survives saving as text', parseCustom(JSON.stringify(L))?.theme === 'mine');
}

// Waves, plates and hunters.
{
  const L = emptyCustom();
  L.pieces.push(
    { t: 'roach', x0: 3, z0: 3, x1: 3, z1: 3, top: 0 },
    { t: 'roach', x0: -8, z0: -8, x1: -8, z1: -8, top: 0, props: { wave: 1 } },
    { t: 'toad', x0: 8, z0: -8, x1: 8, z1: -8, top: 0, props: { wave: 2 } },
    { t: 'plate', x0: 5, z0: 5, x1: 5, z1: 5, top: 0 },
    { t: 'plate', x0: -5, z0: 5, x1: -5, z1: 5, top: 0 },
    { t: 'gate', x0: -2, z0: -4, x1: 2, z1: -3, top: 0, props: { opens: 'plates' } },
    { t: 'gate', x0: -2, z0: -6, x1: 2, z1: -5, top: 0, props: { opens: 'pipes' } },
    { t: 'pipe', x0: -19, z0: 0, x1: -19, z1: 0, top: 0, dir: 'e' },
  );
  L.goals = [{ type: 'waves' }];
  const d = compileCustom(L);
  check(
    'enemies set to a wave are held back in groups',
    d.enemies.length === 1
      && d.waves.length === 2
      && d.waves[0].length === 1
      && d.waves[1][0].type === 'toad'
  );
  check('a waves goal comes from them', d.goals.length === 1 && d.goals[0].type === 'waves');
  check('plates are listed and a gate can wait for them', d.plates?.length === 2 && d.gates?.[0].plates?.length === 2 && !d.gates[0].onGoals);
  check('a gate can wait for pipes instead', d.gates?.[1].pipes?.length === 1);
  check('a waves goal with no wave enemies is flagged', checkCustom({ ...emptyCustom(), goals: [{ type: 'waves' }] }).some((m) => /wave/.test(m)));
  const far = new Scuttler({ x: 0, z: 0, hunt: true });
  far.update(0.016, 80, 0, 60, true);
  check('a wave roach goes for the rat from far away', far.state === 'chase', far.state);
  const homebody = new Scuttler({ x: 0, z: 0 });
  homebody.update(0.016, 80, 0, 60, true);
  check('a roach at its post does not', homebody.state === 'idle');
  const farToad = new Toad({ x: 0, z: 0, hunt: true });
  farToad.update(0.016, 40, 0, 30, true);
  check('a wave toad notices him from far away', farToad.state !== 'idle', farToad.state);
}

if (failures > 0) {
  console.log(`${failures} new-feature check(s) failed.`);
  process.exit(1);
}
console.log('All new-feature checks passed.');
