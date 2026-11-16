// Four more gear secrets, each proven with the real controller, combat and beasts in the real levels:
//   the Cleaver   - the Coal Bin (Coal Cellars): an iron-bound crate only a heavy blade breaks;
//   the Ember Helm - the Heart of the Pyre (the Keep): a wedge inside a fire only the fireproof walk through;
//   the Moss Scarf - the Sleeper's Wedge (Web Hollow): gone the moment its roach notices him, and it notices from half as far;
//   the Buckler   - the Fencer's Wedge (Waterworks): three perfect guards, with twice as long to make each (made fair, not gated).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { fireAt } from '../src/world/layout';
import { computeReach, unreachable } from '../src/levels/reach';
import { ITEMS, NO_GEAR, STARTING_GEAR, gearMods, type GearMods } from '../src/data/equipment';
import { GoalTracker, SHY_RANGE, keepersOf, shyShows } from '../src/levels/goals';
import { Scuttler } from '../src/enemies/scuttler';
import { SENSES } from '../src/enemies/foe';
import { TUNING } from '../src/data/tuning';
import { foundryCellars, BIN, BIN_CRATE } from '../src/levels/foundry';
import { keep, PYRE } from '../src/levels/keep';
import { hollowsWebs } from '../src/levels/hollows';
import { cisternWorks } from '../src/levels/cisternHalls';
import { LEVELS } from '../src/levels/levels';
import type { LevelDef } from '../src/levels/types';

const DT = 1 / 60;
const TAKE = 1.1; // how close he must be to a wedge to take it (main.ts)
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const wear = (id: string): GearMods => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
const room = (d: LevelDef) => buildChamber({ solids: d.solids, pit: d.pit, water: d.water, decor: [], pipes: d.pipes, gates: [], movers: d.movers, lava: d.lava, fire: d.fire });
const wedge = (d: LevelDef, id: string) => d.wedges!.find((w) => w.id === id)!;
const none = (): { have: number; total: number } => ({ have: 0, total: 0 });

// ---- The Cleaver: the Coal Bin ----
{
  const def = foundryCellars();
  const w = wedge(def, 'bin');
  const build = () => {
    const ch = room(def);
    return { ch, crate: ch.crates.find((c) => c.tough)! };
  };
  const { ch, crate } = build();
  check('the cellars have one iron-bound crate, twice the usual size, and the wedge is tagged for the Cleaver', ch.crates.filter((c) => c.tough).length === 1 && crate.half === 1 && w.gear === 'cleaver' && def.crateContents.length === ch.crates.length);
  check('the bin is walled to the roof, with the crate filling its doorway', (() => {
    // Nothing solid may be missing: probe a wall of points just outside the bin, at every height he could be at.
    for (let y = 0.1; y < 11.5; y += 0.4) {
      for (let t = 0; t <= 1; t += 0.05) {
        const south: [number, number] = [BIN.x0 + 0.05 + t * (BIN.x1 + 0.9 - BIN.x0), BIN.wallZ + 0.5];
        const east: [number, number] = [BIN.x1 + 0.5, BIN.z0 + 0.05 + t * (BIN.wallZ + 0.9 - BIN.z0)];
        for (const [x, z] of [south, east]) if (!ch.colliders.some((b) => x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && y > b.min.y && y < b.max.y)) return false;
      }
    }
    return true;
  })());
  /** Stands in front of the crate, facing it, and swings `swings` times (a full combo each three). Returns whether it broke, and whether it rang. */
  const hack = (g: GearMods, swings: number): { broke: boolean; rang: number } => {
    const b = build();
    const p = new PlayerController(new THREE.Vector3(b.crate.x, 0, b.crate.z + 1.6));
    p.gear = g;
    for (let i = 0; i < 20; i++) p.update(DT, input({ run: false }), b.ch.colliders);
    p.facing = Math.PI;
    const ev = events();
    let rang = 0;
    for (let s = 0; s < swings && b.crate.alive; s++) {
      p.update(DT, input({ run: false, attackPressed: true }), b.ch.colliders);
      for (let i = 0; i < 26 && b.crate.alive; i++) {
        p.update(DT, input({ run: false }), b.ch.colliders);
        resolveCombat(p, [], ev, b.ch.crates);
        if (ev.crateRang) rang++;
      }
    }
    return { broke: !b.crate.alive, rang };
  };
  const plain = hack(NO_GEAR, 12);
  check('a rat sword rings off it, every swing of four full combos (the last blow of a combo too)', !plain.broke && plain.rang >= 8, `rang ${plain.rang} times`);
  for (const id of ['buckler', 'royalScarf', 'emberHelm']) check(`...and so it does in the ${ITEMS[id].name}`, !hack(wear(id), 6).broke);
  {
    // A plunge beside it, and its blast: nothing.
    const b = build();
    const q = new PlayerController(new THREE.Vector3(b.crate.x, 3, b.crate.z + 1.9));
    const ev = events();
    q.update(DT, input({ run: false }), b.ch.colliders);
    q.update(DT, input({ run: false, attackPressed: true }), b.ch.colliders);
    let blast = false;
    for (let i = 0; i < 120; i++) {
      q.update(DT, input({ run: false }), b.ch.colliders);
      resolveCombat(q, [], ev, b.ch.crates);
      if (q.plungeImpact) blast = true;
    }
    check('a plunge landing beside it does not break it either', blast && b.crate.alive);
  }
  const heavy = hack(wear('cleaver'), 1);
  check('one blow of the Cleaver breaks it', heavy.broke);
  /** Runs at the wedge from the cellar floor, jumping, double-jumping and rolling the whole way. */
  const rush = (g: GearMods, open: boolean): boolean => {
    for (const [sx, sz] of [[-20, -15], [-16, -21], [-21.5, -17], [-17.5, -19]] as Array<[number, number]>) {
      const b = build();
      if (open) b.ch.breakCrate(b.crate);
      const p = new PlayerController(new THREE.Vector3(sx, 0, sz));
      p.gear = g;
      for (let t = 0; t < 900; t++) {
        const to = new THREE.Vector3(w.x - p.position.x, 0, w.z - p.position.z).normalize();
        p.update(DT, input({ move: to, jumpPressed: !open && t % 9 === 0, jumpHeld: !open && t % 18 < 12, dodgePressed: !open && t % 31 === 7 }), b.ch.colliders);
        if (Math.hypot(w.x - p.position.x, w.z - p.position.z) < TAKE) return true;
      }
    }
    return false;
  };
  check('with the crate in place, no amount of running, jumping and rolling gets to the wedge', !rush(NO_GEAR, false) && !rush(wear('royalScarf'), false));
  check('with the crate broken he walks in and takes it', rush(wear('cleaver'), true));
  check('nothing else in the cellars is cut off by the new walls', unreachable(def).length === 0, unreachable(def).map((q) => q.what).join(', '));
  void BIN_CRATE;
}

// ---- The Ember Helm: the Heart of the Pyre ----
{
  const def = keep();
  const w = wedge(def, 'pyre');
  const ch = room(def);
  check('the Keep has a fire, and the wedge in it is tagged for the Ember Helm', def.fire?.length === 1 && w.gear === 'emberHelm' && gearMods(['emberHelm']).fireproof && !NO_GEAR.fireproof);
  let outside = 0;
  for (let a = 0; a < Math.PI * 2; a += 0.05) for (const y of [0, 1, 3, 8, 20]) if (!fireAt(def.fire, w.x + Math.cos(a) * (TAKE + 0.9), y, w.z + Math.sin(a) * (TAKE + 0.9))) outside++;
  check('everywhere within reach of the wedge is well inside the fire, at any height (no jumping in over the top)', outside === 0);
  check('the fire stands clear of the walls and of the lava (he can walk all the way round it)', PYRE.x1 < 46.5 && PYRE.z0 > -48 && !def.lava?.some((l) => l.x1 > PYRE.x0 - 2 && l.x0 < PYRE.x1 + 2 && l.z1 > PYRE.z0 - 2 && l.z0 < PYRE.z1 + 2));
  /** Walks at the wedge; the fire does what the game does (main.ts lavaStep): burns him and puts him back, unless he is fireproof. */
  const walk = (g: GearMods, tricks: boolean): { took: boolean; burns: number; hearts: number } => {
    const p = new PlayerController(new THREE.Vector3(w.x, 0, PYRE.z1 + 4));
    p.gear = g;
    const safe = p.position.clone();
    let burns = 0;
    for (let t = 0; t < 1500 && !p.dead; t++) {
      const to = new THREE.Vector3(w.x - p.position.x, 0, w.z - p.position.z).normalize();
      p.update(DT, input({ move: to, jumpPressed: tricks && t % 13 === 0, jumpHeld: tricks, dodgePressed: tricks && t % 17 === 3, guardHeld: tricks && t % 40 > 30 }), ch.colliders);
      if (fireAt(def.fire, p.position.x, p.position.y, p.position.z)) {
        if (!p.gear.fireproof) {
          burns++;
          p.takeFall(1);
          p.position.copy(safe);
          p.prevPosition.copy(safe);
          p.velocity.set(0, 0, 0);
          continue;
        }
      } else if (p.grounded) safe.copy(p.position);
      if (Math.hypot(w.x - p.position.x, w.z - p.position.z) < TAKE) return { took: true, burns, hearts: p.hp };
    }
    return { took: false, burns, hearts: p.hp };
  };
  const plain = walk(NO_GEAR, false);
  const tricky = walk(NO_GEAR, true);
  check('without the helm the fire burns him and throws him back until he is dead; he never touches the wedge', !plain.took && plain.burns >= TUNING.health.max && plain.hearts === 0, `${plain.burns} burns`);
  check('...and no jump, roll or raised shield gets him through it', !tricky.took && tricky.hearts === 0);
  check('...nor does any other gear', ['royalScarf', 'buckler', 'minerHelm', 'sludgeScarf'].every((id) => !walk(wear(id), true).took));
  const helm = walk(wear('emberHelm'), false);
  check('in the Ember Helm he walks through the fire and takes it, without losing a heart', helm.took && helm.burns === 0 && helm.hearts === TUNING.health.max, `${helm.hearts} hearts`);
  const blank = unreachable(def);
  check('the Keep is otherwise as it was (nothing new out of reach)', blank.length === 0, blank.map((q) => q.what).join(', '));
}

// ---- The Moss Scarf: the Sleeper's Wedge ----
{
  const def = hollowsWebs();
  const w = wedge(def, 'hush');
  const goal = w.appears as { type: 'unseen'; radius: number };
  const specs = keepersOf(w, goal.radius, def.enemies);
  const spec = specs[0];
  const d = Math.hypot(spec.x - w.x, spec.z - w.z);
  check('one roach keeps it (the bat overhead does not count), and the wedge is tagged for the Moss Scarf', specs.length === 1 && (spec.type ?? 'scuttler') === 'scuttler' && def.enemies.some((e) => e.type === 'bat' && Math.hypot(e.x - w.x, e.z - w.z) < goal.radius) && w.gear === 'mossScarf');
  check('everywhere he could take it from is inside the range the roach notices him from', d + TAKE < SHY_RANGE * NO_GEAR.notice, `${(d + TAKE).toFixed(1)} < ${SHY_RANGE}`);
  check('in the Moss Scarf, some of it is outside that range', d > SHY_RANGE * wear('mossScarf').notice + 0.5, `${d.toFixed(1)} > ${SHY_RANGE * wear('mossScarf').notice}`);
  check('the range is the roach\'s own', SHY_RANGE === TUNING.scuttler.noticeRange);
  const ch = room(def);
  /** Comes down the stairs onto the shelf and goes for the wedge, with the real roach watching. */
  const creep = (g: GearMods, how: 'walk' | 'sneak' | 'leap' | 'kill'): { took: boolean; woke: boolean } => {
    SENSES.notice = g.notice;
    const roach = new Scuttler(spec);
    roach.rng = () => 0.5;
    const p = new PlayerController(new THREE.Vector3(w.x, 0, -7.6));
    p.gear = g;
    let woke = false;
    if (how === 'kill') while (roach.alive) roach.takeHit(1, p.position.x, p.position.z, 'sword');
    for (let t = 0; t < 600; t++) {
      const to = new THREE.Vector3(w.x - p.position.x, 0, w.z - p.position.z).normalize();
      p.update(DT, input({ move: to, run: how !== 'sneak', jumpPressed: how === 'leap' && t % 20 === 2, jumpHeld: how === 'leap' }), ch.colliders);
      SENSES.quiet = how === 'sneak';
      roach.update(DT, p.position.x, p.position.y, p.position.z, true);
      if (roach.alive && roach.state !== 'idle') woke = true;
      const out = shyShows([roach], p.position.x, p.position.z, g.notice);
      const dy = p.position.y - w.y;
      if (out && Math.hypot(w.x - p.position.x, w.z - p.position.z) < TAKE && dy > -0.6 && dy < 1.9) return { took: true, woke };
    }
    return { took: false, woke };
  };
  const plain = creep(NO_GEAR, 'walk');
  check('walking up to it, the roach wakes and the wedge is gone before he can touch it', !plain.took && plain.woke);
  check('...sneaking makes no difference (roaches do not listen, they look)', !creep(NO_GEAR, 'sneak').took);
  check('...nor does jumping in over its head', !creep(NO_GEAR, 'leap').took && !creep(wear('royalScarf'), 'leap').took);
  check('...and killing the roach loses it (until he comes back another time)', !creep(NO_GEAR, 'kill').took && !creep(wear('mossScarf'), 'kill').took);
  const soft = creep(wear('mossScarf'), 'walk');
  check('in the Moss Scarf he walks up and takes it, and the roach never stirs', soft.took && !soft.woke);
  SENSES.notice = 1;
  SENSES.quiet = false;
  // The tracker: a shy wedge is out until the game says its keepers have stirred.
  const i = def.wedges!.indexOf(w);
  const tr = new GoalTracker(def, none);
  const at0 = tr.wedgeOut(i);
  tr.unseen.set(i, false);
  const hidden = !tr.wedgeOut(i);
  tr.unseen.set(i, true);
  check('the wedge shows at the start, hides when told, and shows again', at0 && hidden && tr.wedgeOut(i));
  check('the quest screen shows no count for it', tr.status()[i].text === 'out');
}

// ---- The Buckler: the Fencer's Wedge ----
{
  const def = cisternWorks();
  const w = wedge(def, 'duel');
  const i = def.wedges!.indexOf(w);
  const ch = buildChamber();
  /** Raises the shield, waits `frames`, and takes a bite from the front. */
  const guard = (g: GearMods, frames: number): string => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 14));
    p.gear = g;
    for (let k = 0; k < 30; k++) p.update(DT, input({ run: false }), ch.colliders);
    for (let k = 0; k < frames; k++) p.update(DT, input({ run: false, guardHeld: true }), ch.colliders);
    return p.takeHit(p.position.x + Math.sin(p.facing), p.position.z + Math.cos(p.facing), 1);
  };
  const window = (g: GearMods): number => {
    let n = 0;
    for (let f = 1; f <= 60; f++) if (guard(g, f) === 'parried') n++;
    return n;
  };
  const plain = window(NO_GEAR);
  const quick = window(wear('buckler'));
  check('a plain shield can turn a bite aside, in a short window', plain >= 6 && plain <= 12, `${plain} frames`);
  check('the Buckler gives twice as long', quick >= plain * 2 - 1 && quick <= plain * 2 + 2, `${quick} frames`);
  check('it is not marked as gear (a plain shield can do it), so it must be somewhere he can simply walk to', !w.gear && computeReach(def).near(w.x, w.y + 0.5, w.z, 1, 1, 1));
  const tr = new GoalTracker(def, none);
  const before = tr.wedgeOut(i);
  tr.parries = 2;
  const two = tr.wedgeOut(i);
  const text = tr.status()[i].text;
  tr.parries = 3;
  check('it appears after three perfect guards, and the quest screen counts them', !before && !two && text === '2/3' && tr.wedgeOut(i));
  tr.reset();
  check('the count starts again on another visit', tr.parries === 0 && !tr.wedgeOut(i));
  check('there are roaches there to bite him', def.enemies.filter((e) => (e.type ?? 'scuttler') === 'scuttler').length >= 3);
  check('nothing in the Waterworks is out of reach', unreachable(def).length === 0, unreachable(def).map((q) => q.what).join(', '));
}

// ---- The whole game ----
{
  const total = LEVELS.reduce((n, l) => n + (l.wedges?.length ?? 0), 0);
  const geared = LEVELS.flatMap((l) => (l.wedges ?? []).filter((x) => x.gear).map((x) => x.gear));
  check('there are 49 Golden Wedges now (41, these four, one from each of the two great insects, and the Glimmer Deep\'s two)', total === 49, String(total));
  check('four wedges are tagged with the gear they need, each a different piece, and every piece is one Pip sells', geared.length === 4 && new Set(geared).size === 4 && geared.every((id) => !!ITEMS[id as string] && !Object.values(STARTING_GEAR).includes(id as string)), geared.join(', '));
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
