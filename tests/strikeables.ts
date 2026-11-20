// THINGS TO HIT (world/strikeables.ts; the Yard, Test Room 14: levels/breakyard.ts, 2026-11-20): a lever the sword
// flips, a cracked wall a few blows bring down, a cracked floor only a plunge breaks; gates that wait for levers or
// for an echo puzzle; and the same parts as level-editor pieces.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { STRIKE, leversOn, newStrikeable, strikeThings, type Striker } from '../src/world/strikeables';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { compileCustom } from '../src/levels/custom';
import { YARD, STAGE, NOOK } from '../src/levels/breakyard';
import { SFX_NAMES, sfx } from '../src/audio/synth';
import { topAt } from '../src/world/collision';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}

// ---- The rules, with a made-up rat ----
const rat = (o: Partial<Striker> = {}): Striker => ({
  position: { x: 0, y: 0, z: 0 }, facing: 0, attackActive: false, swingId: 0, attackClip: { arc: 1, reach: 1.4 },
  plungeImpact: false, grounded: true, gear: { damage: 1 }, ...o,
});
{
  const lever = newStrikeable('lever', 0, 0, 1, STRIKE.lever.w, STRIKE.lever.h, STRIKE.lever.d);
  const things = [lever];
  check('a lever starts back (off)', !lever.on);
  const e1 = strikeThings(things, rat({ attackActive: true, swingId: 1 }));
  check('a swing at it throws it over (on)', lever.on && e1.length === 1 && e1[0].kind === 'flip');
  check('...the same swing, still going, does not throw it back', strikeThings(things, rat({ attackActive: true, swingId: 1 })).length === 0 && lever.on);
  strikeThings(things, rat({ attackActive: true, swingId: 2 }));
  check('...the next swing throws it back (off)', !lever.on);
  check('a swing facing away does nothing', strikeThings(things, rat({ attackActive: true, swingId: 3, facing: Math.PI })).length === 0);
  check('a swing from too far off does nothing', strikeThings(things, rat({ attackActive: true, swingId: 4, position: { x: 0, y: 0, z: -2 } })).length === 0);
  check('a swing from a floor far below does nothing', strikeThings(things, rat({ attackActive: true, swingId: 5, position: { x: 0, y: -3, z: 0 } })).length === 0);
  check('a plunge landing beside it does nothing', strikeThings(things, rat({ plungeImpact: true })).length === 0 && !lever.on);
}
{
  const wall = newStrikeable('crackwall', 0, 0, 1, 4, 3, 0.6);
  const kinds = [1, 2, 3].map((id) => strikeThings([wall], rat({ attackActive: true, swingId: id })).map((e) => e.kind).join()).join(' ');
  check(`a cracked wall takes ${STRIKE.wallHits} blows: cracks, cracks, then down`, kinds === 'crack crack break' && wall.gone, kinds);
  check('...and once down, nothing more happens', strikeThings([wall], rat({ attackActive: true, swingId: 9 })).length === 0);
  const w2 = newStrikeable('crackwall', 0, 0, 1, 4, 3, 0.6);
  const heavy = [1, 2].map((id) => strikeThings([w2], rat({ attackActive: true, swingId: id, gear: { damage: STRIKE.heavyBlade } })).map((e) => e.kind).join()).join(' ');
  check('...a heavy blade brings it down in two', heavy === 'crack break', heavy);
  const w3 = newStrikeable('crackwall', 0, 0, 1, 4, 3, 0.6);
  check('...a swing at its far end, within reach of its side, still strikes it (it is measured from its nearest point)', strikeThings([w3], rat({ attackActive: true, swingId: 1, position: { x: 1.9, y: 0, z: 0 } })).length === 1);
  check('...a plunge landing beside it does not touch it', strikeThings([w3], rat({ plungeImpact: true })).length === 0 && w3.taken === 1);
}
{
  const floor = newStrikeable('crackfloor', 0, 1.6, 0, 3, 0.4, 3);
  check('a cracked floor holds: walked on and swung at, nothing', strikeThings([floor], rat({ position: { x: 0, y: 2, z: 0 }, attackActive: true, swingId: 1 })).length === 0);
  check('...a plunge landing beside it (off its top), nothing', strikeThings([floor], rat({ position: { x: 2.5, y: 2, z: 0 }, plungeImpact: true })).length === 0);
  check('...a plunge landing on it breaks it', strikeThings([floor], rat({ position: { x: 1, y: 2, z: -1 }, plungeImpact: true }))[0]?.kind === 'break' && floor.gone);
}
{
  const things = [newStrikeable('crackwall', 0, 0, 0, 1, 1, 1), newStrikeable('lever', 0, 0, 0, 1, 1, 1), newStrikeable('lever', 0, 0, 0, 1, 1, 1)];
  things[2].on = true;
  check('levers are counted among levers only (a wall first does not shift them)', leversOn(things, [1]) && !leversOn(things, [0]) && !leversOn(things, [0, 1]));
  things[1].on = true;
  check('...and a gate waiting for two opens when both are over', leversOn(things, [0, 1]) && !leversOn(things, []));
}

// ---- The Yard ----
const def = levelById('breakyard')!;
check('the Yard is a level', !!def);
const room = buildChamber(def as never);
const things = room.strike?.things ?? [];
check('the Yard has three levers, a cracked wall and a cracked floor', things.filter((t) => t.kind === 'lever').length === 3 && things.filter((t) => t.kind === 'crackwall').length === 1 && things.filter((t) => t.kind === 'crackfloor').length === 1);
check('its gates: one waits for lever 0, one for levers 1 and 2', room.gates.length === 2 && room.gates[0].spec.levers?.join() === '0' && room.gates[1].spec.levers?.join() === '1,2');
const highest = (x: number, z: number, below: number): number => Math.max(-99, ...room.colliders.filter((b) => x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z).map((b) => topAt(b, x, z)).filter((t) => t <= below));
const H = STAGE.hole;
check('the cracked floor is solid: standing over the hole, the floor under him is the stage top', Math.abs(highest(H.x, H.z, STAGE.top + 0.5) - STAGE.top) < 1e-6);
const wallIdx = things.findIndex((t) => t.kind === 'crackwall');
const inWall = (): boolean => room.colliders.some((b) => YARD.wall > b.min.x && YARD.wall < b.max.x && NOOK.front > b.min.z && NOOK.front < b.max.z && b.max.y > 1);
check('the cracked wall is solid across its nook', inWall());

// A real swing, from the real rat, at the first lever: it goes over, and the first gate's levers are all on.
{
  const lever = things[0];
  const p = new PlayerController(new THREE.Vector3(lever.x, 0, lever.z + 1.1));
  for (let i = 0; i < 20; i++) p.update(DT, input(), room.colliders);
  p.facing = Math.PI;
  p.update(DT, input({ attackPressed: true }), room.colliders);
  let flips = 0;
  for (let i = 0; i < 40; i++) {
    p.update(DT, input(), room.colliders);
    flips += strikeThings(things, p).filter((e) => e.kind === 'flip').length;
  }
  check('the rat\'s own swing throws the first lever over, once', flips === 1 && lever.on, `flips ${flips}`);
  check('...and the first gate\'s levers are on, the second\'s not', leversOn(things, room.gates[0].spec.levers!) && !leversOn(things, room.gates[1].spec.levers!));
}
// Real swings at the cracked wall: three and it is down, and its solid goes with it.
{
  const wall = things[wallIdx];
  const p = new PlayerController(new THREE.Vector3(wall.x, 0, wall.z + 1.2));
  for (let i = 0; i < 20; i++) p.update(DT, input(), room.colliders);
  p.facing = Math.PI;
  const seen: string[] = [];
  for (let swing = 0; swing < 3; swing++) {
    p.update(DT, input({ attackPressed: true }), room.colliders);
    for (let i = 0; i < 50; i++) {
      p.update(DT, input(), room.colliders);
      for (const e of strikeThings(things, p)) {
        seen.push(e.kind);
        if (e.kind === 'break') room.strike!.remove(e.index);
      }
    }
  }
  check('three of the rat\'s swings: crack, crack, down', seen.join(' ') === 'crack crack break', seen.join(' '));
  check('...and the nook is open: its solid is gone', !inWall());
}
// A real plunge onto the cracked floor: it breaks, and he falls through to the cellar floor.
{
  const fi = things.findIndex((t) => t.kind === 'crackfloor');
  const p = new PlayerController(new THREE.Vector3(H.x, STAGE.top + 3, H.z));
  p.update(DT, input(), room.colliders);
  p.update(DT, input({ attackPressed: true }), room.colliders);
  let broke = false;
  for (let i = 0; i < 120 && !broke; i++) {
    p.update(DT, input(), room.colliders);
    for (const e of strikeThings(things, p)) if (e.kind === 'break' && e.index === fi) {
      broke = true;
      room.strike!.remove(e.index);
    }
  }
  check('a plunge onto the cracked floor breaks it', broke);
  for (let i = 0; i < 120; i++) p.update(DT, input(), room.colliders);
  check('...and he goes through, to the cellar floor', p.grounded && Math.abs(p.position.y) < 0.05, `y ${p.position.y.toFixed(2)}`);
  // And out again: a jump and a second in the air take him back up onto the stage beside the hole.
  let top = 0;
  p.update(DT, input({ jumpPressed: true, jumpHeld: true }), room.colliders);
  for (let i = 0; i < 25; i++) p.update(DT, input({ jumpHeld: true }), room.colliders);
  p.update(DT, input({ jumpPressed: true, jumpHeld: true }), room.colliders);
  for (let i = 0; i < 40; i++) {
    p.update(DT, input({ jumpHeld: true }), room.colliders);
    top = Math.max(top, p.position.y);
  }
  check('...and he can jump out of the cellar (a jump and a second in the air clear the stage)', top > STAGE.top + 0.3, `highest ${top.toFixed(2)}`);
}
// The same jump, standing on the unbroken floor, must not break it: only the plunge.
{
  const r2 = buildChamber(def as never);
  const t2 = r2.strike!.things;
  const p = new PlayerController(new THREE.Vector3(H.x, STAGE.top + 3, H.z));
  let any = 0;
  for (let i = 0; i < 120; i++) {
    p.update(DT, input(), r2.colliders);
    any += strikeThings(t2, p).length;
  }
  check('dropping onto the cracked floor (no plunge), it holds him', any === 0 && p.grounded && Math.abs(p.position.y - STAGE.top) < 0.05, `y ${p.position.y.toFixed(2)}`);
}

// ---- The Music Room: the echo puzzle lifts a gate ----
{
  const mr = buildChamber(levelById('musicroom') as never);
  check('the Music Room has a gate that the echo puzzle lifts', mr.gates.some((g) => g.spec.echo === 'echo'));
}

// ---- In the level editor ----
{
  const lvl = compileCustom({
    name: 'Kit', blurb: '', theme: 'dungeon', width: 20, depth: 20, wallHeight: 8,
    pieces: [
      { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
      { t: 'spawn', x0: 0, z0: 6, x1: 0, z1: 6, top: 0 },
      { t: 'lever', x0: -4, z0: 0, x1: -4, z1: 0, top: 0 },
      { t: 'lever', x0: 4, z0: 0, x1: 4, z1: 0, top: 0 },
      { t: 'crackwall', x0: -2, z0: -5, x1: 2, z1: -4.5, top: 4 },
      { t: 'crackfloor', x0: -1, z0: 2, x1: 1, z1: 4, top: 0 },
      { t: 'gate', x0: -2, z0: -8, x1: 2, z1: -8, top: 0, props: { opens: 'levers' } },
    ],
  }, 'kit');
  const kinds = lvl.decor.map((d) => d.kind);
  check('the editor\'s Lever, Cracked wall and Cracked floor pieces become the parts', kinds.filter((k) => k === 'lever').length === 2 && kinds.includes('crackwall') && kinds.includes('crackfloor'));
  check('...and a gate set to open with levers waits for both', lvl.gates?.[0]?.levers?.join() === '0,1');
  const cw = lvl.decor.find((d) => d.kind === 'crackwall');
  check('...the cracked wall stands on the floor, as tall as its top', !!cw && cw.kind === 'crackwall' && cw.y === 0 && cw.h === 4 && cw.w === 4);
}

check('the lever, the crack and the fall are sounds the game has, and make a sound', (['leverThrow', 'stoneCrack', 'stoneFall'] as const).every((n) => SFX_NAMES.includes(n) && sfx(n).data.some((v) => Math.abs(v) > 0.2)));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
