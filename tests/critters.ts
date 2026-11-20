// EVERY CHARACTER, PLAYED (player/critters; the Stand-in room, Test Room 19; 2026-11-20). The owner: "try to make each
// one of them have its own sort of unique little play style ... their own unique way of getting around the levels".
// Each is run, on its own controls, through the room's course in its own way, against real roaches: the mole digs into
// the sealed pen, the yarn reels onto the pillar, the shell slides and dives, the old turtle walks the bottom and
// stomps, the fox pounces the gap and the grey one dashes it, the ferret climbs the pillar and slinks into the burrow,
// the war dance, the owl glides and dives, the white owl hovers, and Jinx's bad luck and blink.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { makePlayable, PLAYABLE, PLAYABLE_LOOKS, type Playable } from '../src/player/critters';
import type { CritterInput } from '../src/player/critters/base';
import { DIGGER } from '../src/player/critters/moles';
import { PEBBLE, VIX } from '../src/player/critters/turtlesFoxes';
import { TAWNY } from '../src/player/critters/ferretsOwlsJinx';
import { Scuttler } from '../src/enemies/scuttler';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { BURROW, GAP, LINEUP, PEN, PILLAR, POOL, STEPS } from '../src/levels/standinroom';
import { TUNING } from '../src/data/tuning';
import type { PatronLook } from '../src/npc/patrons';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const pad = (o: Partial<CritterInput> = {}): CritterInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, rollPressed: false, guardHeld: false, ...o });
const def = levelById('standin')!;
const room = buildChamber(def as never);
const W = { colliders: room.colliders, water: room.water, foes: [] as Scuttler[] };
const E = new THREE.Vector3(1, 0, 0);
const N = new THREE.Vector3(0, 0, -1);
/** The pool's bed (the water piece lays one under its surface), checked against the room's own solids. */
const bed = Math.max(...room.colliders.filter((b) => b.min.x < (POOL.x0 + POOL.x1) / 2 && b.max.x > (POOL.x0 + POOL.x1) / 2 && b.min.z < (POOL.z0 + POOL.z1) / 2 && b.max.z > (POOL.z0 + POOL.z1) / 2).map((b) => b.max.y));
check('the deep pool\'s crumb lies on its bed', Math.abs(bed - POOL.bed) < 0.01, `bed at ${bed.toFixed(2)}`);
const roach = (x: number, z: number): Scuttler => new Scuttler({ x, z, arena: { x0: -19, x1: 19, z0: -15, z1: 15 } });

/** One of them, at a place, settled. */
function be(look: PatronLook, x: number, y: number, z: number, facing = 0): Playable {
  const { ctl, view } = makePlayable(look, new THREE.Vector3(x, y, z));
  ctl.facing = facing;
  (ctl as unknown as { view: typeof view }).view = view;
  for (let k = 0; k < 20; k++) go(ctl, {});
  return ctl;
}
let nan = 0;
/** A step: he moves, the roaches about him move, his body is drawn. */
function go(c: Playable, p: Partial<CritterInput>, foes: Scuttler[] = []): ReturnType<Playable['update']> {
  const ev = c.update(DT, pad(p), { ...W, foes }, null);
  for (const f of foes) f.update(DT, c.position.x, c.position.y, c.position.z, false);
  const view = (c as unknown as { view: { setTransform(a: THREE.Vector3, f: number): void; update(dt: number, e: unknown): void; root: THREE.Object3D } }).view;
  view.setTransform(c.position, c.facing);
  view.update(DT, ev);
  if (![c.position.x, c.position.y, c.position.z].every(Number.isFinite)) nan++;
  view.root.traverse((o) => {
    if (![o.position.x, o.position.y, o.rotation.x, o.scale.y].every(Number.isFinite)) nan++;
  });
  return ev;
}
const run = (c: Playable, n: number, p: Partial<CritterInput> | ((k: number) => Partial<CritterInput>), foes: Scuttler[] = []): void => {
  for (let k = 0; k < n; k++) go(c, typeof p === 'function' ? p(k) : p, foes);
};

// ---- The line-up ----
check('the line-up: all thirteen by the way in, each with a way of their own, each to be swapped with', PLAYABLE_LOOKS.length === 13 && PLAYABLE_LOOKS.every((l, i) => def.npcs?.some((n) => n.swap?.as === l && n.name === PLAYABLE[l].name && Math.abs(n.x - (LINEUP.x0 + LINEUP.gap * i)) < 1e-6)));
{
  // (No two the same: each a set of numbers of its own.)
  const walks = new Set(PLAYABLE_LOOKS.map((l) => {
    const c = be(l, 0, 0, 5);
    run(c, 60, { move: E, run: true });
    return c.speed.toFixed(1);
  }));
  check('they do not all go at one pace: short legs are slow, a fox is fast', walks.size >= 6, [...walks].join(', '));
}

// ---- DIGGER: under the pen's wall and into it ----
{
  const c = be('digger', (PEN.x0 + PEN.x1) / 2, 0, PEN.z1 + 1.5, Math.PI);
  go(c, { rollPressed: true });
  const dug = c.state === 'dug' && c.untouchable;
  // (Under its wall: he cannot come up there.)
  run(c, 20, { move: N });
  const underWall = c.position.z < PEN.z1 && c.position.z > PEN.z1 - 0.5;
  const blocked = underWall && (() => {
    go(c, { rollPressed: true });
    return c.state === 'dug';
  })();
  run(c, 40, { move: N });
  go(c, { rollPressed: true });
  const inside = c.position.z < PEN.z1 - 0.5 && c.position.z > PEN.z0 + 0.5 && c.state !== 'dug';
  check('DIGGER: ROLL and he is under the floor, nothing can touch him', dug);
  check('...under the sealed pen\'s wall, and up inside it (where there is room to stand)', inside, `at z ${c.position.z.toFixed(1)} (pen ${PEN.z0}..${PEN.z1})`);
  check('...and he cannot come up under the wall itself', !underWall || blocked);
  const r = roach(0, 0);
  const d = be('digger', 0, 0, 2, Math.PI);
  go(d, { rollPressed: true });
  run(d, 25, { move: N }, [r]);
  const hp = r.hp;
  d.position.set(r.x, 0, r.z + 0.2);
  go(d, { attackPressed: true }, [r]);
  check('...ATTACK under the ground: he bursts up under a roach, stings it, and is thrown up himself', r.hp < hp && d.velocity.y > DIGGER.burst.up - 1, `${hp} -> ${r.hp}`);
}
// ---- DOT: yarn up onto the pillar ----
{
  const c = be('dot', (PILLAR.x0 + PILLAR.x1) / 2, 0, PILLAR.z1 + 3.2, Math.PI);
  go(c, { attackPressed: true });
  run(c, 90, {});
  check('DOT: ATTACK throws her yarn: it catches the pillar, and she is reeled up onto its top', c.position.y > PILLAR.top - 0.05 && c.grounded, `at height ${c.position.y.toFixed(2)} (the pillar: ${PILLAR.top})`);
}
// ---- PEBBLE: the shell slides; she dives to the bottom ----
{
  const c = be('pebble', -3, 0, 0, Math.PI / 2);
  run(c, 20, { move: E });
  go(c, { rollPressed: true, move: E });
  const kick = c.speed;
  run(c, 30, {});
  check('PEBBLE: ROLL while going: into her shell, kicked off along the floor, and it hardly slows', kick > PEBBLE.slide.kick - 0.5 && c.speed > PEBBLE.slide.kick * 0.8 && c.untouchable, `${kick.toFixed(1)} -> ${c.speed.toFixed(1)}`);
  let back = 0;
  run(c, 200, () => ({}));
  back = c.velocity.x;
  check('...it ricochets off the wall and comes back', back < -1, `going ${back.toFixed(1)}`);
  const d = be('pebble', (POOL.x0 + POOL.x1) / 2, POOL.water, (POOL.z0 + POOL.z1) / 2);
  run(d, 30, {});
  const floating = d.position.y;
  go(d, { rollPressed: true });
  let low = 9;
  for (let k = 0; k < 150; k++) {
    go(d, {});
    low = Math.min(low, d.position.y);
  }
  check('...in the pool she floats; ROLL and she dives, right down to the bottom', floating > 1 && low < bed + 0.1, `floating at ${floating.toFixed(2)}, down to ${low.toFixed(2)}`);
}
// ---- MO: walks the bottom; the stomp; immovable ----
{
  const c = be('mo', (POOL.x0 + POOL.x1) / 2, POOL.water, (POOL.z0 + POOL.z1) / 2);
  run(c, 90, {});
  check('MO: in the pool he does not float: he sinks, and stands on the bottom', c.position.y < bed + 0.05 && c.grounded, `at ${c.position.y.toFixed(2)}`);
  const near = roach(2, 5);
  const far = roach(8, 5);
  const [a, b] = [near.hp, far.hp];
  const m = be('mo', 0, 0, 5);
  go(m, { attackPressed: true }, [near, far]);
  run(m, 30, {}, [near, far]);
  check('...ATTACK: a stomp, and the shockwave stings what is round him, not what is far off', near.hp < a && far.hp === b && m.steadfast, `near ${a} -> ${near.hp}, far ${b} -> ${far.hp}`);
}
// ---- VIX: the fastest; the pounce across the gap ----
{
  const c = be('vix', 0, 0, 5, Math.PI / 2);
  run(c, 60, { move: E, run: true });
  check('VIX: the fastest on the ground (faster than the knight)', c.speed > TUNING.move.run, `${c.speed.toFixed(1)} (the knight ${TUNING.move.run})`);
  const v = be('vix', GAP.a.x1 - 0.4, GAP.top, (GAP.z0 + GAP.z1) / 2, Math.PI / 2);
  run(v, 50, (k) => ({ jumpPressed: k === 0, jumpHeld: true }));
  run(v, 120, { jumpHeld: false });
  check('...hold JUMP to crouch, let go: a POUNCE right across the gap to the far block', v.position.x > GAP.b.x0 && Math.abs(v.position.y - GAP.top) < 0.05, `landed at x ${v.position.x.toFixed(1)}, height ${v.position.y.toFixed(1)}`);
  const t = be('vix', 0, 0, 5, Math.PI / 2);
  go(t, { jumpPressed: true, jumpHeld: true });
  run(t, 60, { jumpHeld: false });
  check('...a tap is just a jump (straight up, no pounce)', Math.abs(t.position.x) < 0.5, `moved ${t.position.x.toFixed(2)}`);
  const r = roach(4, 5);
  const hp = r.hp;
  const p = be('vix', 0, 0, 5, Math.PI / 2);
  run(p, 18, (k) => ({ jumpPressed: k === 0, jumpHeld: true }), [r]);
  run(p, 80, {}, [r]);
  check('...and where she pounces down, what is there is stung', r.hp < hp, `${hp} -> ${r.hp}`);
  void VIX;
}
// ---- ASH: across the gap with a jump and two dashes ----
{
  const c = be('ash', GAP.a.x1 - 0.4, GAP.top, (GAP.z0 + GAP.z1) / 2, Math.PI / 2);
  run(c, 140, (k) => ({ jumpPressed: k === 0, jumpHeld: true, rollPressed: k === 10 || k === 26, move: E }));
  check('ASH: a jump and two SHADOW DASHES in the air: across the gap', c.position.x > GAP.b.x0 && Math.abs(c.position.y - GAP.top) < 0.05, `at x ${c.position.x.toFixed(1)}, height ${c.position.y.toFixed(1)}`);
  const r = roach(3, 5);
  const hp = r.hp;
  const d = be('ash', 0, 0, 5, Math.PI / 2);
  let through = false;
  for (let k = 0; k < 20; k++) {
    go(d, { rollPressed: k === 0, move: E }, [r]);
    if (d.untouchable) through = true;
  }
  check('...a dash goes straight through a roach, stinging it, and nothing touches her while it lasts', r.hp < hp && through && d.position.x > r.x, `${hp} -> ${r.hp}`);
}
// ---- SLINK: up the pillar; under the burrow ----
{
  const c = be('slink', (PILLAR.x0 + PILLAR.x1) / 2, 0, PILLAR.z1 + 1.2, Math.PI);
  run(c, 160, (k) => ({ move: N, jumpPressed: k === 20, jumpHeld: true }));
  check('SLINK: JUMP against a wall she is pushed into and she climbs it: up the pillar and over onto its top', c.position.y > PILLAR.top - 0.05, `at height ${c.position.y.toFixed(2)}`);
  const b = be('slink', (BURROW.x0 + BURROW.x1) / 2, 0, BURROW.front + 1.5, Math.PI);
  const w = be('slink', (BURROW.x0 + BURROW.x1) / 2, 0, BURROW.front + 1.5, Math.PI);
  run(w, 90, { move: N });
  go(b, { rollPressed: true });
  run(b, 90, { move: N });
  check('...ROLL: she slinks, flat, through the burrow\'s gap (too low on her feet)', w.position.z > BURROW.front && b.position.z < BURROW.front - BURROW.thick - 0.5, `on her feet ${w.position.z.toFixed(1)}, slinking ${b.position.z.toFixed(1)}`);
}
// ---- BISCUIT: the war dance; the double jump ----
{
  const r = roach(1.2, 5);
  const hp = r.hp;
  const c = be('biscuit', 0, 0, 5, Math.PI / 2);
  let safe = 0;
  for (let k = 0; k < 70; k++) {
    go(c, { attackPressed: k === 0 }, [r]);
    if (c.untouchable) safe++;
  }
  check('BISCUIT: ATTACK, the WAR DANCE: hopping about, nothing touching her, knocking over what she meets', safe > 50 && r.hp < hp, `${safe} frames untouchable, ${hp} -> ${r.hp}`);
  const one = be('biscuit', 0, 0, 5);
  const two = be('biscuit', 0, 0, 5);
  let h1 = 0;
  let h2 = 0;
  for (let k = 0; k < 80; k++) {
    go(one, { jumpPressed: k === 0, jumpHeld: true });
    go(two, { jumpPressed: k === 0 || k === 22, jumpHeld: true });
    h1 = Math.max(h1, one.position.y);
    h2 = Math.max(h2, two.position.y);
  }
  check('...light and springy: a second jump in the air', h2 > h1 + 0.6, `${h1.toFixed(2)} once, ${h2.toFixed(2)} twice`);
}
// ---- TAWNY: off the shelf, a long glide; flaps; the dive ----
{
  const glide = be('tawny', STEPS.x1 - 0.5, STEPS.shelf, -8, Math.PI / 2);
  const drop = be('tawny', STEPS.x1 - 0.5, STEPS.shelf, -8, Math.PI / 2);
  run(glide, 200, (k) => ({ move: E, jumpPressed: k === 0, jumpHeld: true }));
  run(drop, 200, (k) => ({ move: E, jumpPressed: k === 0, jumpHeld: k < 8 }));
  check('TAWNY: off the shelf, JUMP held: he GLIDES, a long way further than a plain fall', glide.position.x - drop.position.x > 4, `${(glide.position.x - STEPS.x1).toFixed(1)} out, against ${(drop.position.x - STEPS.x1).toFixed(1)}`);
  const f = be('tawny', 0, 0, 5);
  let top = 0;
  run(f, 120, (k) => {
    top = Math.max(top, f.position.y);
    return { jumpPressed: k === 0 || k === 20 || k === 40 || k === 60 || k === 80, jumpHeld: true };
  });
  check(`...JUMP in the air flaps him higher (${TAWNY.flap.count} flaps)`, top > 3, `up to ${top.toFixed(1)}`);
  const r = roach(4, 5);
  const hp = r.hp;
  const d = be('tawny', 0, 0, 5, Math.PI / 2);
  run(d, 90, (k) => ({ jumpPressed: k === 0 || k === 15, jumpHeld: true, attackPressed: k === 30 }), [r]);
  check('...ATTACK in the air: a TALON DIVE down onto a roach', r.hp < hp, `${hp} -> ${r.hp}`);
}
// ---- SNOW: hovering; feather darts ----
{
  const c = be('snow', 0, 0, 5);
  let held = 0;
  let lo = 9;
  let hi = 0;
  for (let k = 0; k < 150; k++) {
    go(c, { jumpPressed: k === 0 || k === 20, jumpHeld: true });
    if (k > 50 && k < 150 && c.state === 'hover') {
      held++;
      lo = Math.min(lo, c.position.y);
      hi = Math.max(hi, c.position.y);
    }
  }
  check('SNOW: JUMP held in the air, she HOVERS, hanging at one height', held > 70 && hi - lo < 0.4, `${held} frames, between ${lo.toFixed(2)} and ${hi.toFixed(2)}`);
  const r = roach(0, 9.5 - 5);
  const hp = r.hp;
  const d = be('snow', 0, 0, 0, 0);
  run(d, 30, (k) => ({ attackPressed: k === 0 }), [r]);
  check('...ATTACK: a fan of feather darts, stinging what they meet', r.hp < hp, `${hp} -> ${r.hp}`);
}
// ---- JINX: bad luck; the mark and the blink ----
{
  const r = roach(0, 5);
  const hp = r.hp;
  const c = be('jinx', 0, 0, 1, 0);
  let fell = false;
  let mid = hp;
  for (let k = 0; k < 140; k++) {
    go(c, { attackPressed: k === 0 }, [r]);
    if (k === 40) mid = r.hp;
    if ((c as unknown as { fx: { props: Array<{ kind: string }> } }).fx.props.some((q) => ['spool', 'teacup', 'die', 'button'].includes(q.kind))) fell = true;
  }
  check('JINX: ATTACK throws a hex; a jinxed roach is not hurt by the hex itself, but a moment later something falls on it out of nowhere', mid === hp && r.hp < hp && fell, `${hp} -> ${mid} -> ${r.hp}`);
  const j = be('jinx', (PILLAR.x0 + PILLAR.x1) / 2, 0, PILLAR.z1 + 4, Math.PI);
  let marked = false;
  for (let k = 0; k < 120; k++) {
    go(j, { rollPressed: k === 0 });
    if ((j as unknown as { mark: unknown }).mark) marked = true;
  }
  go(j, { rollPressed: true });
  run(j, 20, {});
  check('...ROLL throws her MARK high, onto the top of the pillar; ROLL again and she BLINKS up there', marked && j.position.y > PILLAR.top - 0.05, `at height ${j.position.y.toFixed(2)}`);
  const s = roach(6, -2);
  const k2 = be('jinx', 0, 0, -2, Math.PI / 2);
  run(k2, 50, (k) => ({ attackPressed: k === 0 }), [s]);
  const [sx, jx] = [s.x, k2.position.x];
  go(k2, { guardHeld: true }, [s]);
  check('...GUARD swaps her with a jinxed roach', Math.abs(k2.position.x - sx) < 0.5 && Math.abs(s.x - jx) < 0.5, `she ${jx.toFixed(1)} -> ${k2.position.x.toFixed(1)}, it ${sx.toFixed(1)} -> ${s.x.toFixed(1)}`);
}
check('nothing of any of them went to NaN', nan === 0, `${nan}`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
