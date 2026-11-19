// Gear with real effects: each thing on sale gives something and costs something (never simply better), the starting
// gear does nothing, and every effect works in the real controller, the real beasts and the real hit resolver.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Scuttler } from '../src/enemies/scuttler';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { makeAabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
import { ITEMS, NO_GEAR, STARTING_GEAR, gearMods, type GearFx, type GearMods } from '../src/data/equipment';
import { SENSES } from '../src/enemies/foe';
import { SHOP } from '../src/data/shop';

const chamber = buildChamber();
const DT = 1 / 60;
const S = TUNING.scuttler;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const wearing = (...ids: string[]): GearMods => gearMods([...Object.values(STARTING_GEAR).filter((s) => !ids.some((i) => ITEMS[i].slot === ITEMS[s].slot)), ...ids]);

// ---- Every piece is a trade ----
const GOOD: Record<keyof GearFx, (v: number | boolean) => boolean> = {
  run: (v) => (v as number) > 1, swim: (v) => (v as number) > 1, grip: (v) => (v as number) > 1, wallKick: (v) => (v as number) > 1,
  longJump: (v) => (v as number) > 1, hearts: (v) => (v as number) > 0, fireproof: (v) => v === true, notice: (v) => (v as number) < 1,
  sight: (v) => (v as number) > 1, damage: (v) => (v as number) > 1, swing: (v) => (v as number) > 1, parry: (v) => (v as number) > 1,
  guardMove: (v) => (v as number) > 1, blockArc: (v) => (v as number) > 1,
};
const forSale = SHOP.filter((s) => s.kind === 'gear').map((s) => ITEMS[s.id]);
check('Pip sells something for every slot', ['helmet', 'sword', 'shield', 'scarf'].every((slot) => forSale.some((i) => i.slot === slot)));
for (const it of forSale) {
  const fx = Object.entries(it.fx ?? {}) as Array<[keyof GearFx, number | boolean]>;
  const gains = fx.filter(([k, v]) => GOOD[k](v));
  const losses = fx.filter(([k, v]) => !GOOD[k](v));
  check(`${it.name}: gives something and costs something, and says both`, gains.length > 0 && losses.length > 0 && !!it.perk && !!it.cost, `+${gains.map((g) => g[0])} -${losses.map((l) => l[0])}`);
}
check('the starting gear does nothing special', JSON.stringify(gearMods(Object.values(STARTING_GEAR))) === JSON.stringify(NO_GEAR));

// ---- On the ground: top run speed, and how far he slides when he lets go ----
const flat = [makeAabb(0, -0.5, 0, 400, 1, 400)];
function runAndStop(g: GearMods): { top: number; slide: number } {
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.gear = g;
  for (let t = 0; t < 10; t++) p.update(DT, input(), flat);
  for (let t = 0; t < 120; t++) p.update(DT, input({ move: new THREE.Vector3(0, 0, -1), run: true }), flat);
  const top = Math.hypot(p.velocity.x, p.velocity.z);
  const z0 = p.position.z;
  for (let t = 0; t < 120; t++) p.update(DT, input(), flat);
  return { top, slide: z0 - p.position.z };
}
const plain = runAndStop(NO_GEAR);
const moss = runAndStop(wearing('mossScarf'));
const sludge = runAndStop(wearing('sludgeScarf'));
check('Moss Scarf: runs a little slower', moss.top < plain.top * 0.92 && moss.top > plain.top * 0.8, `${moss.top.toFixed(2)} vs ${plain.top.toFixed(2)}`);
check('Sludge Scarf: slides further when he stops', sludge.slide > plain.slide * 1.8, `${sludge.slide.toFixed(2)} vs ${plain.slide.toFixed(2)}`);

// ---- Beasts notice him from closer (moss) or further (the lamp) ----
function notices(notice: number, dist: number): boolean {
  SENSES.notice = notice;
  const e = new Scuttler({ x: 0, z: 0, arena: { x0: -50, x1: 50, z0: -50, z1: 50 } });
  let seen = false;
  for (let t = 0; t < 90 && !seen; t++) {
    e.update(DT, 0, 0, dist, true);
    if (e.state !== 'idle') seen = true;
  }
  SENSES.notice = 1;
  return seen;
}
const d = S.noticeRange * 0.75;
check('a roach notices him at three quarters of its range', notices(1, d));
check('Moss Scarf: ...but not when he wears moss', !notices(wearing('mossScarf').notice, d));
check("Miner's Helm: the lamp is seen from beyond the usual range", notices(wearing('minerHelm').notice, S.noticeRange * 1.3) && !notices(1, S.noticeRange * 1.3));

// ---- The sword: twice the hit, slower swings ----
function swingsToKill(g: GearMods): { swings: number; swingTime: number } {
  const p = new PlayerController(new THREE.Vector3(S.home.x, 0, S.home.z - 1.4));
  p.gear = g;
  const e = new Scuttler();
  const ev: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  let swings = 0;
  let swingTime = 0;
  for (let n = 0; n < 12 && e.alive; n++) {
    swings++;
    p.update(DT, input({ attackPressed: true }), chamber.colliders);
    let t = 0;
    while ((p as unknown as { attackTimer: number }).attackTimer >= 0 && t++ < 200) {
      p.update(DT, input(), chamber.colliders);
      resolveCombat(p, [e], ev);
    }
    if (n === 0) swingTime = t * DT;
    for (let k = 0; k < 40; k++) p.update(DT, input(), chamber.colliders);
    e.x = p.position.x;
    e.z = p.position.z + 1.3;
  }
  return { swings, swingTime };
}
const rs = swingsToKill(NO_GEAR);
const cl = swingsToKill(wearing('cleaver'));
check('Cleaver: a roach goes down in half the hits', cl.swings * 2 <= rs.swings + 1 && cl.swings < rs.swings, `${cl.swings} vs ${rs.swings}`);
check('Cleaver: ...but each swing takes longer', cl.swingTime > rs.swingTime * 1.25, `${cl.swingTime.toFixed(2)}s vs ${rs.swingTime.toFixed(2)}s`);

// ---- The shield: a longer parry and quicker feet, but only straight ahead ----
function shieldHit(g: GearMods, raisedFor: number, fromAngle: number): string {
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.gear = g;
  for (let t = 0; t < 10; t++) p.update(DT, input(), flat);
  const facing = p.facing;
  for (let t = 0; t < Math.round(raisedFor / DT); t++) p.update(DT, input({ guardHeld: true }), flat);
  const a = facing + fromAngle;
  return p.takeHit(p.position.x + Math.sin(a) * 2, p.position.z + Math.cos(a) * 2, 1);
}
const late = TUNING.guard.parryWindow * 1.5;
check('Buckler: a hit a little after raising it is still parried (the Rat Shield only blocks it)', shieldHit(wearing('buckler'), late, 0) === 'parried' && shieldHit(NO_GEAR, late, 0) === 'blocked');
check('Buckler: ...but a hit from the side gets through (the Rat Shield blocks it)', shieldHit(wearing('buckler'), 0.6, 1.1) === 'hit' && shieldHit(NO_GEAR, 0.6, 1.1) === 'blocked');

// ---- The Royal Scarf: a heart fewer, and a longer long jump ----
function longJump(g: GearMods): number {
  const p = new PlayerController(new THREE.Vector3(0, 0, 40));
  p.gear = g;
  for (let t = 0; t < 60; t++) p.update(DT, input({ move: new THREE.Vector3(0, 0, -1), run: true }), flat);
  for (let t = 0; t < 3; t++) p.update(DT, input({ move: new THREE.Vector3(0, 0, -1) }), flat);
  const z0 = p.position.z;
  p.update(DT, input({ move: new THREE.Vector3(0, 0, -1), jumpPressed: true, jumpHeld: true }), flat);
  let t = 0;
  while (!p.grounded && t++ < 400) p.update(DT, input({ move: new THREE.Vector3(0, 0, -1), jumpHeld: true }), flat);
  return z0 - p.position.z;
}
{
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.gear = wearing('royalScarf');
  check('Royal Scarf: one heart fewer', p.maxHp === TUNING.health.max - 1);
  const a = longJump(NO_GEAR);
  const b = longJump(wearing('royalScarf'));
  check('Royal Scarf: ...but the long jump goes clearly further', b > a * 1.15, `${b.toFixed(2)} vs ${a.toFixed(2)}`);
}
check('Ember Helm: fireproof, but slow in water', wearing('emberHelm').fireproof && wearing('emberHelm').swim < 1);

console.log(failures === 0 ? 'gear: all pass' : `gear: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
