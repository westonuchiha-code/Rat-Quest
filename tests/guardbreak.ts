// GUARD STRAIN, GUARD BREAK AND VENOM (2026-11-25). The owner: "If you want to give the main character a weakness to
// enemies small enemies that he can just block away you can give some of them like a poison or maybe a buff that lets
// them break the block if there are multiple enemies hitting in succession or something. And then larger enemy is
// could also break the block." A shield only HELD UP is no longer the whole answer:
//   STRAIN  each blow his shield stops strains his guard; the third, close together, breaks it. A PERFECT guard
//           (raised just as the blow lands) clears the strain: skill is still the whole answer.
//   BREAK   a large creature's great blow (the ironback's ram) breaks it at once.
//   VENOM   a scorpion's sting caught on the shield still poisons him: a heart, a few seconds on.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { Director } from '../src/enemies/director';
import { Scuttler } from '../src/enemies/scuttler';
import { Ant } from '../src/enemies/ant';
import { Scorpion } from '../src/enemies/scorpion';
import { Ironback } from '../src/enemies/ironback';
import { TUNING } from '../src/data/tuning';
import type { Foe } from '../src/enemies/foe';

const DT = 1 / 60;
const G = TUNING.guard;
const floor = [makeAabb(0, -0.5, 0, 200, 1, 200)];
const inp = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
/** A knight facing +z with his shield up and settled (well past the perfect-guard window). */
function shieldUp(): PlayerController {
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.facing = 0;
  for (let i = 0; i < 40; i++) p.update(DT, inp({ guardHeld: true }), floor);
  return p;
}
const wait = (p: PlayerController, secs: number, guard = true): void => {
  for (let t = 0; t < secs; t += DT) p.update(DT, inp({ guardHeld: guard }), floor);
};
/** A blow from in front, once he can be struck again. */
const blow = (p: PlayerController, o: { breaks?: boolean; venom?: boolean } = {}): string => {
  (p as unknown as { invulnTimer: number }).invulnTimer = 0;
  return p.takeHit(0, 3, 1, false, !!o.breaks, !!o.venom);
};

{
  const p = shieldUp();
  check('his shield is up', p.guarding);
  const hp = p.hp;
  const r1 = blow(p);
  wait(p, 0.5);
  check('one blow on his shield: stopped, his guard holds', r1 === 'blocked' && p.guarding && p.guardStrain === 1, `${r1} strain ${p.guardStrain}`);
  const r2 = blow(p);
  wait(p, 0.5);
  check('a second, close behind: stopped, his guard still holds', r2 === 'blocked' && p.guarding && p.guardStrain === 2);
  const r3 = blow(p);
  check(`the ${G.strainBreak}rd breaks his guard (it is still stopped: the blow that breaks it does not wound him)`, r3 === 'blocked' && p.guardBroke && p.guardBroken > 0 && !p.guarding && p.hp === hp, `${r3} broken ${p.guardBroken}`);
  p.update(DT, inp({ guardHeld: true }), floor);
  check('with his guard broken he cannot raise his shield, though the button is held', !p.guarding);
  const r4 = blow(p);
  check('...and the next blow lands', r4 === 'hit' && p.hp === hp - 1, r4);
  wait(p, G.brokenFor + G.brokenStun + 0.8);
  check('a moment on he has it up again, the strain gone', p.guarding && p.guardStrain === 0, `guarding ${p.guarding} state ${p.state}`);
}
{
  const p = shieldUp();
  blow(p);
  wait(p, 0.4);
  blow(p);
  wait(p, G.strainForget + 0.2);
  const r = blow(p);
  check('left alone a couple of seconds, the strain is forgotten: the next blow is the first again', r === 'blocked' && p.guarding && p.guardStrain === 1 && !p.guardBroke, `strain ${p.guardStrain}`);
}
{
  // A PERFECT GUARD clears it.
  const p = shieldUp();
  blow(p);
  wait(p, 0.4);
  blow(p);
  wait(p, 0.3, false);
  wait(p, 0.25, false);
  p.update(DT, inp({ guardHeld: true }), floor);
  p.update(DT, inp({ guardHeld: true }), floor);
  const r = blow(p);
  check('a PERFECT guard (raised as the blow lands) turns the blow and clears the strain', r === 'parried' && p.guardStrain === 0, `${r} strain ${p.guardStrain} age ${p.guardAge}`);
}
{
  const p = shieldUp();
  const hp = p.hp;
  const r = blow(p, { breaks: true });
  check("a large creature's great blow breaks his guard at once", r === 'blocked' && p.guardBroke && !p.guarding && p.hp === hp);
  const q = new PlayerController(new THREE.Vector3(0, 0, 0));
  q.facing = 0;
  q.update(DT, inp({ guardHeld: true }), floor);
  q.update(DT, inp({ guardHeld: true }), floor);
  const r2 = blow(q, { breaks: true });
  check('...but a perfect guard turns even that', r2 === 'parried' && !q.guardBroke && q.guardBroken === 0, r2);
}
{
  // VENOM.
  const p = shieldUp();
  const hp = p.hp;
  const r = blow(p, { venom: true });
  check('a sting caught on his shield is stopped, but the venom is in him', r === 'blocked' && p.venom > 0 && p.hp === hp);
  wait(p, G.venomAfter - 0.3);
  check('...nothing yet', p.hp === hp && p.venom > 0);
  let bit = false;
  for (let t = 0; t < 0.6; t += DT) {
    p.update(DT, inp({ guardHeld: true }), floor);
    bit ||= p.venomBit;
  }
  check(`...and ${G.venomAfter} seconds on it costs him a heart, once`, bit && p.hp === hp - 1 && p.venom === 0, `hp ${p.hp}/${hp}`);
  wait(p, 4);
  check('...and no more than that', p.hp === hp - 1);
  const q = new PlayerController(new THREE.Vector3(0, 0, 0));
  q.facing = 0;
  q.update(DT, inp({ guardHeld: true }), floor);
  q.update(DT, inp({ guardHeld: true }), floor);
  const r2 = blow(q, { venom: true });
  check('a perfect guard turns the sting, venom and all', r2 === 'parried' && q.venom === 0, r2);
  const d = shieldUp();
  blow(d, { venom: true });
  blow(d, { venom: true });
  check('a second sting while it is in him does not start the count again', d.venom < G.venomAfter + 1e-6);
  d.hp = 1;
  wait(d, G.venomAfter + 0.5);
  check('venom can kill him', d.dead);
}
/** A knight who only holds his shield up, among several of them. */
function turtleAmong(make: () => Foe[], secs = 40): { hits: number; blocks: number; breaks: number; dead: boolean } {
  const foes = make() as any[];
  let s = 4242;
  const rng = (): number => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (const e of foes) if ('rng' in e) e.rng = rng;
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  const director = new Director();
  const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  let hits = 0;
  let blocks = 0;
  let breaks = 0;
  for (let t = 0; t < secs && !p.dead; t += DT) {
    director.update(DT, foes, p.position.x, p.position.z, null);
    let near = foes[0];
    for (const e of foes) {
      e.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
      if (Math.hypot(e.x - p.position.x, e.z - p.position.z) < Math.hypot(near.x - p.position.x, near.z - p.position.z)) near = e;
    }
    if (p.grounded && ['idle', 'walk', 'run', 'land', 'guard'].includes(p.state)) p.facing = Math.atan2(near.x - p.position.x, near.z - p.position.z);
    const hp = p.hp;
    p.update(DT, inp({ guardHeld: true }), floor);
    events.playerResult = null;
    resolveCombat(p, foes, events);
    if (p.guardBroke) breaks++;
    if (p.hp < hp) hits++;
    if (events.playerResult === 'blocked') blocks++;
  }
  return { hits, blocks, breaks, dead: p.dead };
}
const arena = { x0: -30, x1: 30, z0: -30, z1: 30 };
const put = (x: number, z: number) => ({ x, z, arena, hunt: true, respawn: false }) as never;
{
  const one = turtleAmong(() => [new Ant(put(0, 6)) as unknown as Foe]);
  console.log(`  one ant against a held shield: hits ${one.hits}, blocks ${one.blocks}, breaks ${one.breaks}`);
  const three = turtleAmong(() => [new Ant(put(0, 6)) as unknown as Foe, new Ant(put(1.5, 6)) as unknown as Foe, new Ant(put(-1.5, 6)) as unknown as Foe]);
  console.log(`  three ants against a held shield: hits ${three.hits}, blocks ${three.blocks}, breaks ${three.breaks}`);
  check('three ants break a shield that is only held up, and get through', three.breaks > 0 && three.hits > 0, `breaks ${three.breaks} hits ${three.hits}`);
  const roaches = turtleAmong(() => [new Scuttler(put(0, 6)) as unknown as Foe, new Scuttler(put(1.5, 6)) as unknown as Foe, new Scuttler(put(-1.5, 6)) as unknown as Foe]);
  console.log(`  three roaches against a held shield: hits ${roaches.hits}, blocks ${roaches.blocks}, breaks ${roaches.breaks}`);
  check('three roaches get through a shield that is only held up', roaches.hits > 0, `breaks ${roaches.breaks} hits ${roaches.hits}`);
  const sting = turtleAmong(() => [new Scorpion(put(0, 6)) as unknown as Foe]);
  console.log(`  one scorpion against a held shield: hits ${sting.hits}, blocks ${sting.blocks}, breaks ${sting.breaks}`);
  check('a scorpion wounds a knight who only holds his shield up (its venom)', sting.hits > 0, `hits ${sting.hits} blocks ${sting.blocks}`);
  const ram = turtleAmong(() => [new Ironback(put(0, 8)) as unknown as Foe]);
  console.log(`  one ironback against a held shield: hits ${ram.hits}, blocks ${ram.blocks}, breaks ${ram.breaks}`);
  check("an ironback's ram breaks a shield that is only held up", ram.breaks > 0, `breaks ${ram.breaks} hits ${ram.hits}`);
}

console.log(failures === 0 ? '\nguardbreak: all passed' : `\nguardbreak: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
