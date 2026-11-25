// DUELS (2026-11-25): EVERY CREATURE AS A FIGHTING OPPONENT, for how the knight controls now. The owner: "go over
// all the enemies in the game and make sure that they are quality fighting opponents for how the main character
// currently controls". Each is fought one against one on open floor by four kinds of player:
//   the MASHER   only swings (and walks at it). If he wins untouched, it is a pushover.
//   the TURTLE   only holds his shield up. (Recorded; a shield IS the answer to most small things, by design.)
//   the STATUE   does nothing. Everything must be a threat to him.
//   the SKILLED  sidehops the blow as it comes and strikes when it is not attacking. He must be able to win, cleanly.
// What this found and what was done is in docs/KIT.md, "CREATURES AS OPPONENTS". Run alone, it prints the table:
//   node scripts/test-all.mjs duels
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { resolveCombat, resolveGlobs, type CombatEvents } from '../src/combat/combat';
import { Director } from '../src/enemies/director';
import { Scuttler } from '../src/enemies/scuttler';
import { Toad, stepGlobs, type Glob } from '../src/enemies/toad';
import { Mantis } from '../src/enemies/mantis';
import { Bat } from '../src/enemies/bat';
import { Ant } from '../src/enemies/ant';
import { Hornet } from '../src/enemies/hornet';
import { Scorpion } from '../src/enemies/scorpion';
import { Roller } from '../src/enemies/roller';
import { Ironback } from '../src/enemies/ironback';
import { Guard } from '../src/enemies/guard';
import { Stag } from '../src/enemies/stag';
import { SparkBeetle } from '../src/enemies/sparkBeetle';
import { FEELS } from '../src/data/feel';
import type { Foe } from '../src/enemies/foe';

const DT = 1 / 60;
const arena = { x0: -30, x1: 30, z0: -30, z1: 30 };
const at = { x: 0, z: 7, arena, hunt: true, respawn: false } as never;
const MAKE: Record<string, () => Foe> = {
  roach: () => new Scuttler(at) as unknown as Foe,
  toad: () => new Toad(at) as unknown as Foe,
  mantis: () => new Mantis(at) as unknown as Foe,
  bat: () => new Bat(at) as unknown as Foe,
  ant: () => new Ant(at) as unknown as Foe,
  hornet: () => new Hornet(at) as unknown as Foe,
  scorpion: () => new Scorpion(at) as unknown as Foe,
  roller: () => new Roller(at) as unknown as Foe,
  ironback: () => new Ironback(at) as unknown as Foe,
  guard: () => new Guard(at) as unknown as Foe,
  stag: () => new Stag(at) as unknown as Foe,
  beetle: () => new SparkBeetle(at) as unknown as Foe,
};
type Bot = 'masher' | 'turtle' | 'statue' | 'skilled';
const floor = [makeAabb(0, -0.5, 0, 200, 1, 200)];
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });

function fight(kind: string, bot: Bot, feel = 'waking', secs = 40, seed = 1): { out: string; t: number; hits: number; blocks: number; parries: number; hpLeft: number; hp0: number; states: string } {
  const e = MAKE[kind]() as any;
  let s = seed * 9301 + 49297;
  const rng = (): number => ((s = (s * 9301 + 49297) % 233280) / 233280);
  if ('rng' in e) e.rng = rng;
  if (e.body && 'rng' in e.body) e.body.rng = rng;
  const hp0 = e.hp;
  const p = new PlayerController(new THREE.Vector3(0, 0, 0));
  p.feel = (FEELS as any)[feel];
  const director = new Director();
  const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  let globs: Glob[] = [];
  let hits = 0;
  let blocks = 0;
  let parries = 0;
  const seen = new Map<string, number>();
  let t = 0;
  let side = 1;
  // (A flier is given time to get up to where it flies before the fight begins: it is made on the floor.)
  if (kind === 'hornet' || kind === 'bat') for (let k = 0; k < 150; k++) e.update(DT, 0, 0, -9, true);
  for (; t < secs; t += DT) {
    director.update(DT, [e], p.position.x, p.position.z, e);
    if ('time' in e) e.time = t;
    e.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
    seen.set(e.state, (seen.get(e.state) ?? 0) + DT);
    if (e.spit) {
      globs.push({ ...e.spit, age: 0, done: false });
      e.spit = null;
    }
    const dx = e.x - p.position.x;
    const dz = e.z - p.position.z;
    const dist = Math.hypot(dx, dz);
    const to = Math.atan2(dx, dz);
    const fwd = new THREE.Vector3(Math.sin(to), 0, Math.cos(to));
    p.attackAim = to;
    p.lockFacing = to;
    if (p.grounded && ['idle', 'walk', 'run', 'land', 'guard'].includes(p.state)) p.facing = to;
    const reach = (e.radius ?? 0.4) + 1.0;
    let i: Partial<PlayerInput> = {};
    if (bot === 'masher') i = { move: dist > reach ? fwd : new THREE.Vector3(), attackPressed: true };
    else if (bot === 'turtle') i = { guardHeld: true };
    else if (bot === 'skilled') {
      const live = !!e.attackActive;
      const glob = globs.some((g) => !g.done && Math.hypot(g.x - p.position.x, g.z - p.position.z) < 1.6 && g.y < 2.2 && g.vy < 0);
      if ((live && dist < reach + 2.5) || glob) {
        side = -side;
        i = { move: new THREE.Vector3(Math.cos(to) * side, 0, -Math.sin(to) * side), dodgePressed: true };
      } else if (!e.attacking && !live) i = { move: dist > reach ? fwd : new THREE.Vector3(), attackPressed: dist <= reach + 0.3 };
      else i = {};
    }
    p.update(DT, inp(i), floor);
    events.playerResult = null;
    resolveCombat(p, [e], events);
    if (events.playerResult === 'hit' || events.playerResult === 'killed') hits++;
    if (events.playerResult === 'blocked') blocks++;
    if (events.playerResult === 'parried') parries++;
    if (globs.length) {
      stepGlobs(globs, DT, () => 0);
      const hp = p.hp;
      resolveGlobs(p, globs, events);
      if (p.hp < hp) hits++;
      globs = globs.filter((g) => !g.done);
    }
    if (!e.alive) break;
    if (p.dead) break;
  }
  const states = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${Math.round((v / Math.max(DT, t)) * 100)}%`).join(', ');
  return { out: !e.alive ? 'WIN' : p.dead ? 'LOSE' : 'time', t, hits, blocks, parries, hpLeft: e.hp, hp0, states };
}


let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const KINDS = Object.keys(MAKE);
for (const feel of ['waking', 'sewers']) {
  console.log(`\n${feel}: creature, hp | masher | turtle | statue | skilled   (result, seconds, h = hits he took, b = blows his shield stopped)`);
  const rows = new Map<string, Record<Bot, ReturnType<typeof fight>>>();
  for (const k of KINDS) {
    const r = { masher: fight(k, 'masher', feel), turtle: fight(k, 'turtle', feel), statue: fight(k, 'statue', feel), skilled: fight(k, 'skilled', feel) };
    rows.set(k, r);
    const cell = (x: ReturnType<typeof fight>, blocks = false): string => `${x.out} ${x.t.toFixed(0)}s h${x.hits}${blocks ? ` b${x.blocks}` : ''}`.padEnd(blocks ? 20 : 15);
    console.log(`  ${k.padEnd(9)} ${String(r.masher.hp0).padEnd(3)}| ${cell(r.masher)}| ${cell(r.turtle, true)}| ${cell(r.statue)}| ${cell(r.skilled)}`);
  }
  const of = (k: string): Record<Bot, ReturnType<typeof fight>> => rows.get(k)!;
  // Everything is a threat: a knight who does nothing is hurt by every one of them.
  const harmless = KINDS.filter((k) => of(k).statue.hits === 0);
  check(`${feel}: every creature hurts a knight who only stands there`, harmless.length === 0, harmless.join());
  // A knight with skill can beat it, cleanly, in a fight of a sensible length. (Not the bat or the ironback: this
  // player only sidesteps and swings, and those two are beaten another way: a cut as it swoops; its back, or a wall.)
  const skilled = KINDS.filter((k) => k !== 'bat' && k !== 'ironback');
  const unfair = skilled.filter((k) => of(k).skilled.out !== 'WIN' || of(k).skilled.hits > (k === 'beetle' ? 4 : 1) || of(k).skilled.t > 30);
  check(`${feel}: a knight who sidesteps each blow and strikes in the openings beats each of them, hardly touched, inside half a minute`, unfair.length === 0, unfair.map((k) => `${k}: ${of(k).skilled.out} ${of(k).skilled.t.toFixed(0)}s h${of(k).skilled.hits}`).join('; '));
  // ...and it is a FIGHT: none of the tougher ones is over in a blink even for him.
  if (feel === 'sewers') {
    const blink = ['mantis', 'scorpion', 'guard', 'stag', 'ant'].filter((k) => of(k).skilled.t < 5);
    check('sewers: against the tougher ones (mantis, scorpion, Keep Guard, ant, Stag Knight) even he is at it five seconds or more', blink.length === 0, blink.map((k) => `${k} ${of(k).skilled.t.toFixed(1)}s`).join());
  }
  // SWINGING AND NOTHING ELSE IS NOT ENOUGH against a creature that is meant to be a fight: he is struck, or beaten.
  // (The roach is fodder and the hornet is beaten by walking out from under its dive: those two a masher may have.)
  const fighters = ['mantis', 'ant', 'scorpion', 'guard', 'stag', 'beetle', 'toad', 'roller', 'ironback'];
  const pushovers = fighters.filter((k) => of(k).masher.out === 'WIN' && of(k).masher.hits === 0);
  check(`${feel}: a knight who only swings is struck, or beaten, by every creature that is meant to be a fight (he held them staggered till they died)`, pushovers.length === 0, pushovers.join());
  // The shelled ones cannot be cut down from the front at all.
  check(`${feel}: the roller and the ironback beat a knight who only swings`, of('roller').masher.out === 'LOSE' && of('ironback').masher.out === 'LOSE');
  // A shield held up is not the whole of it against the big ones.
  check(`${feel}: the Stag Knight's blows go through a shield that is only held up`, of('stag').turtle.hits > 0);
}
// The same dice, the same fight.
const a = fight('mantis', 'skilled', 'sewers');
const b = fight('mantis', 'skilled', 'sewers');
check('a fight is the same fight every time it is run', a.t === b.t && a.hits === b.hits);

console.log(failures === 0 ? '\nduels: all passed' : `\nduels: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
