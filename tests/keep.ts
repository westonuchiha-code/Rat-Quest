// Grimsqueak's Keep and his throne room: in the world behind the Club's last door; each landmark reached only the way it
// is meant to be; the chimney climbed with real wall kicks; the throne room keeps his story and fight; the ending is home.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach, maxClimb } from '../src/levels/reach';
import type { LevelDef } from '../src/levels/types';
import { keep, throne, THRONE, STACK, CHIMNEY_WALL, STACK_BOX } from '../src/levels/keep';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';
import { STORY } from '../src/story/scenes';
import { compileScene } from '../src/story/scene';
import { TRACK_NAMES } from '../src/audio/music';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = keep();
const room = throne();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const LEDGE = { x: -24, y: THRONE, z: -46 };
const TOP = { x: 0, y: STACK, z: -12 };
const FAR = { x: 44, y: 0, z: -24 };

check('the Keep is the last door in the Club, and wants the most wedges', HUB_DOORS.some((d) => d.to === 'keep') && HUB_DOORS.find((d) => d.to === 'keep')!.need === Math.max(...HUB_DOORS.map((d) => d.need)));
check('the throne room is in the Keep\'s world, behind its door', room.id === 'lair' && room.world === 'keep' && (def.courseDoors ?? []).some((d) => d.to === 'lair'));
check('the throne room is not a side area (its door stays shut until he is beaten; the way out goes home)', !room.returnTo && LEVELS.some((l) => l.id === 'lair' && l.world === 'keep'));
check('there is only one lair', LEVELS.filter((l) => l.id === 'lair').length === 1);
check('his fight and his scenes are still there', room.enemies.length === 1 && room.enemies[0].type === 'grimsqueak' && STORY.lair.boss === true && !!STORY.lair.open && !!STORY.lair.after);
check('beating him is the throne room\'s wedge', room.wedges?.length === 1 && room.goals.length === 1 && room.goals[0].type === 'defeat');
check('the ending plays in the Club once the lair is won, starting him at the Club\'s start', STORY.hub?.openAfter === 'lair' && STORY.hub.fromSpawn === true && !!STORY.hub.open);
{
  const hub = LEVELS.find((l) => l.id === 'hub')!;
  const ctx = { x: hub.spawn.x, z: hub.spawn.z, facing: hub.spawn.facing, y: hub.spawn.y, exit: hub.exit, spots: hub.storySpots! };
  const sc = STORY.hub.open!(ctx);
  const c = compileScene(sc, { x: ctx.x, y: ctx.y, z: ctx.z, facing: ctx.facing });
  check('the ending, in the Club, is its own scene (seen once) and runs its full length', sc.id === 'hub.open' && c.total > 30, `${c.total.toFixed(1)}s`);
}
check('the Club has the marks the ending looks at, and Grimsqueak waiting out of sight', ['dave', 'mort', 'wren'].every((k) => !!LEVELS.find((l) => l.id === 'hub')?.storySpots?.[k]) && !!LEVELS.find((l) => l.id === 'hub')?.npcs?.some((n) => n.kind === 'villain' && n.hidden));
check('the Keep has its own music and look', def.music === 'march' && TRACK_NAMES.includes('march') && def.theme === 'keep');
check('a fall into the pit costs a heart, not the walk back', def.fallBack === true);
check('five wedges in the Keep, one in the throne room', (def.wedges?.length ?? 0) === 5);

check('the Throne Ledge, the Engine Stack and the far end of the Burning Walk can all be reached', reaches(def, LEDGE.x, LEDGE.y, LEDGE.z) && reaches(def, TOP.x, TOP.y, TOP.z) && reaches(def, FAR.x, FAR.y, FAR.z));
const noChimney = { ...def, solids: def.solids.filter((b) => !(b.x0 === CHIMNEY_WALL.x0 && b.x1 === CHIMNEY_WALL.x1 && b.z0 === CHIMNEY_WALL.z0)) };
check('without the chimney\'s wall the Throne Ledge is out of reach', !reaches(noChimney, LEDGE.x, LEDGE.y, LEDGE.z));
const slider = (def.movers ?? []).filter((m) => m.x < -30);
check('one slider runs out to the Engine Stack', slider.length === 1);
check('without it the Stack is out of reach', !reaches({ ...def, movers: (def.movers ?? []).filter((m) => !slider.includes(m)) }, TOP.x, TOP.y, TOP.z));
const stones = def.solids.filter((b) => b.x0 >= 40 && b.x1 <= 46 && b.z1 <= 6 && b.z0 >= -17 && Math.abs(b.y1 - 0.3) < 0.01);
check('four stones cross the lava', stones.length === 4, `${stones.length}`);
check('without them the far end of the Burning Walk is out of reach', !reaches({ ...def, solids: def.solids.filter((b) => !stones.includes(b)) }, FAR.x, FAR.y, FAR.z));
// (The jump checker lets jumps pass over walls, so the gatehouse is checked as heights.)
const gatehouse = def.solids.filter((b) => b.kind === 'wall' && b.z0 === 26 && b.z1 === 28);
check('the gatehouse wall is too tall to climb, so the portcullis is the way in', gatehouse.length === 2 && gatehouse.every((b) => b.y1 > maxClimb() + 1));
check('the Stack is not under the slider\'s path from anywhere else', STACK_BOX.x0 > -10);

// The chimney, with the real controller: kick from wall to wall, pressing jump a few frames after each touch.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
function climb(delay: number): number {
  const p = new PlayerController(new THREE.Vector3(-37, 12, -46));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  let dir = -1;
  let wait = -1;
  let top = 0;
  p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 500; t++) {
    const before = p.velocity.z;
    const press = wait === 0;
    if (press) dir = -dir;
    p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: press, jumpHeld: true }), cs);
    if (wait > 0) wait--;
    else if (wait === 0) wait = -1;
    if (wait < 0 && !p.grounded && Math.sign(before) === dir && p.velocity.z === 0) wait = delay;
    if (p.position.z > -48 && p.position.z < -44) top = Math.max(top, p.position.y);
  }
  return top;
}
const quick = climb(2);
const late = climb(9);
check('wall kicks carry him up the chimney past the Throne Ledge', quick > THRONE + 1, `highest ${quick.toFixed(2)}`);
check('...pressing a little late still works', late > THRONE + 1, `highest ${late.toFixed(2)}`);
{
  const p = new PlayerController(new THREE.Vector3(-37, 12, -46));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let top = 0;
  for (let t = 0; t < 200; t++) {
    p.update(DT, inp({ jumpPressed: t === 28, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
  }
  check('without wall kicks the chimney cannot be climbed', top < THRONE - 4, `top ${top.toFixed(2)}`);
}

console.log(failures === 0 ? 'keep: all pass' : `keep: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
