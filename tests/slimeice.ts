// Slime does something, and ice is a piece the level builder has.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf } from '../src/world/collision';
import { extent, rampBox, slimeZones, type Decor } from '../src/world/layout';
import { compileCustom, emptyCustom, BOX_TYPES } from '../src/levels/custom';
import { longDrop } from '../src/levels/longdrop';
import { levelById } from '../src/levels/levels';
import { STEAM_VENTS } from '../src/levels/foundry';
import { standsOn } from '../src/enemies/footing';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);

// ---- Slime ----
{
  const floor = [aabbOf(extent('floor', -20, 20, -1, 0, -20, 20))];
  const decor: Decor[] = [{ kind: 'runnel', x: 0, z0: -10, z1: 10, y0: 0, y1: 0, w: 2 }];
  const zones = slimeZones(decor);
  check('a runnel (the green strip down a pipe) is a patch of slime, as wide and as long as it is drawn', zones.length === 1 && zones[0].x0 === -1 && zones[0].x1 === 1 && zones[0].z0 === -10 && zones[0].z1 === 10);
  const run = (x: number): { speed: number; inSlime: boolean } => {
    const p = new PlayerController(new THREE.Vector3(x, 0.01, -8));
    p.slime = zones;
    let was = false;
    for (let i = 0; i < 120; i++) {
      p.update(DT, inp({ move: new THREE.Vector3(0, 0, 1) }), floor);
      was ||= p.inSlime;
    }
    return { speed: Math.hypot(p.velocity.x, p.velocity.z), inSlime: was };
  };
  const dry = run(5);
  const wet = run(0);
  check('ON FOOT IT HOLDS HIM: running down the slime he goes little more than half as fast as beside it', !dry.inSlime && wet.inSlime && Math.abs(dry.speed - TUNING.move.run) < 0.05 && Math.abs(wet.speed - TUNING.move.run * TUNING.slime.walk) < 0.05, `${wet.speed.toFixed(2)} in it, ${dry.speed.toFixed(2)} beside it`);
  const p = new PlayerController(new THREE.Vector3(0, 0.01, 0));
  p.slime = zones;
  for (let i = 0; i < 10; i++) p.update(DT, inp({}), floor);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), floor);
  let high = 0;
  let inAir = false;
  for (let i = 0; i < 90; i++) {
    p.update(DT, inp({ jumpHeld: true }), floor);
    high = Math.max(high, p.position.y);
    if (!p.grounded && p.inSlime) inAir = true;
  }
  check('it does not hold a jump (he gets out of it by jumping), and in the air over it he is not in it', high > 2.2 && !inAir, `jumps ${high.toFixed(2)}`);
  // On a slope: the zone follows the bed down.
  const bed = [aabbOf(rampBox('stone', -4, 4, 0, 20, 0, 8, 'n', -1))];
  const down = slimeZones([{ kind: 'runnel', x: 0, z0: 0, z1: 20, y0: 8, y1: 0, w: 2 }]);
  const q = new PlayerController(new THREE.Vector3(0, 4.05, 10));
  q.slime = down;
  for (let i = 0; i < 20; i++) q.update(DT, inp({}), bed);
  check('on a pipe\'s sloping bed he is in it wherever along it he stands', q.grounded && q.inSlime);
  const def = longDrop();
  const real = slimeZones(def.decor);
  check('the Long Drop has slime down its pipes, and its ride is as it was tuned (the shield rides over slime: see tests/longdrop.ts, which runs with it on)', real.length >= 2 && !('rideDrag' in TUNING.slime));
}

// ---- Ice, in the builder ----
{
  check('ice is one of the builder\'s ground pieces', BOX_TYPES.includes('ice'));
  const lvl = emptyCustom();
  lvl.pieces.push({ t: 'ice', x0: 2, z0: 2, x1: 8, z1: 6, top: 0 } as never, { t: 'tile', x0: 10, z0: 2, x1: 14, z1: 6, top: 0 } as never);
  const def = compileCustom(lvl, 'custom');
  const ice = def.solids.filter((b) => b.slick);
  check('a piece of ice is a sheet he slides on: slick, in the ice\'s own picture, as big as it was drawn', ice.length === 1 && ice[0].skin === 'iceSheet' && ice[0].x1 - ice[0].x0 === 6 && ice[0].z1 - ice[0].z0 === 4 && ice[0].y1 === 0, JSON.stringify(ice[0] ?? null).slice(0, 120));
  check('and nothing else in the level is slick', def.solids.filter((b) => !b.slick).length >= 2);
  // He slides on it: let go of the stick at a run, and he goes on much further than on tiles.
  const cs = def.solids.map(aabbOf);
  const glide = (x: number): number => {
    const p = new PlayerController(new THREE.Vector3(x, 0.01, 4));
    for (let i = 0; i < 6; i++) p.update(DT, inp({}), cs);
    p.velocity.set(4, 0, 0);
    const from = p.position.x;
    for (let i = 0; i < 40; i++) p.update(DT, inp({}), cs);
    return p.position.x - from;
  };
  const onIce = glide(2.5);
  const onTile = glide(10.5);
  check('LAID ON THE LEVEL\'S OWN FLOOR, level with it (as the builder lays it), it is still ice: let go at a walk, he glides on far further than he does over tiles', onIce > onTile * 2 && onIce > 1.5, `${onIce.toFixed(2)} on ice, ${onTile.toFixed(2)} on tiles`);
}
// ---- Steam vents ----
{
  const lvl = emptyCustom();
  lvl.pieces.push({ t: 'vent', x0: 4, z0: 4, x1: 5, z1: 5, top: 0 } as never, { t: 'vent', x0: 9, z0: 4, x1: 10, z1: 5, top: 0 } as never);
  const def = compileCustom(lvl, 'custom');
  const vents = def.decor.filter((d) => d.kind === 'vent') as Array<Extract<Decor, { kind: 'vent' }>>;
  check('a steam vent is a piece the builder has: it blows in bursts, and two side by side are not in step', vents.length === 2 && vents.every((v) => (v.every ?? 0) > (v.on ?? 0) && (v.on ?? 0) > 0) && (vents[0].delay !== vents[1].delay || vents[0].every !== vents[1].every));
  check('it is scenery: it adds nothing solid, and nothing that hurts', def.solids.length === compileCustom(emptyCustom(), 'custom').solids.length && (def.fire ?? []).length === 0);
  const foundry = levelById('foundry')!;
  const fv = foundry.decor.filter((d) => d.kind === 'vent') as Array<Extract<Decor, { kind: 'vent' }>>;
  const cs = foundry.solids.map(aabbOf);
  const clear = fv.filter((d) => standsOn(cs, d.x, d.y, d.z, 0.7) && !foundry.solids.some((b) => b.y1 > d.y + 0.05 && b.y0 < d.y + 4 && b.x0 < d.x + 1.2 && b.x1 > d.x - 1.2 && b.z0 < d.z + 1.2 && b.z1 > d.z - 1.2) && !foundry.lava?.some((l) => d.x > l.x0 - 0.8 && d.x < l.x1 + 0.8 && d.z > l.z0 - 0.8 && d.z < l.z1 + 0.8));
  check('the Foundry has ten of them, each let into clear floor (nothing standing on it or over it, and not at the lava\'s edge)', fv.length === STEAM_VENTS.length && fv.length === 10 && clear.length === fv.length, `${clear.length} of ${fv.length} clear`);
  let built = true;
  try {
    const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
    ch.update(0.2);
    ch.update(2.4);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('a room with vents and ice in it builds, and its clock runs', built);
}

console.log(failures === 0 ? '\nSlime and ice checks passed.' : `\n${failures} slime and ice check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
