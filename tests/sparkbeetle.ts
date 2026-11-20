// THE SPARK BEETLE (enemies/sparkBeetle.ts; the Coil Room, levels/coilroom.ts; 2026-11-20): a roach's hunting, charged
// on the coil's snare: a blade glances off it while it charges, it discharges all round it on the snare (no shield
// turns that), and between it is soft. Fought with the game's own combat (combat/combat.ts) and the real rat.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { SPARK, SparkBeetle } from '../src/enemies/sparkBeetle';
import { COIL, STEP, BAR, laneState } from '../src/world/teslaCoil';
import { levelById } from '../src/levels/levels';
import { makeAabb } from '../src/world/collision';

/** A floor for him to stand on (without one he falls, and a swing from below does not reach). */
const FLOOR = [makeAabb(0, -0.5, 0, 40, 1, 40)];

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });

const snare = COIL.snare[0] * STEP;
const spent = COIL.kick[1] * STEP + 0.3; // a moment well away from any snare
check('the times picked: one in the snare\'s warning, one on its hit, one spent', laneState('snare', snare - 0.1).warn > 0.5 && laneState('snare', snare + 0.05).live && laneState('snare', spent).warn === 0 && !laneState('snare', spent).live);

/** A beetle at the origin on the room's clock (fixed at `t`), the rat 1.1 in front of it facing it. */
function setup(t: number): { e: SparkBeetle; p: PlayerController } {
  const e = new SparkBeetle({ x: 0, z: 0, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  e.clock = () => t;
  const p = new PlayerController(new THREE.Vector3(0, 0, -1.1));
  for (let k = 0; k < 20; k++) p.update(DT, input(), FLOOR);
  p.facing = 0;
  return { e, p };
}
/** He swings once at it; what came of it. */
function swing(t: number): { hit: boolean; glanced: boolean; hpBefore: number; hpAfter: number } {
  const { e, p } = setup(t);
  const hpBefore = e.hp;
  let hit = false;
  let glanced = false;
  p.update(DT, input({ attackPressed: true }), FLOOR);
  for (let k = 0; k < 30; k++) {
    p.update(DT, input(), FLOOR);
    const ev = events();
    resolveCombat(p, [e], ev);
    if (ev.enemyHit === e) hit = true;
    if (ev.glanced === e) glanced = true;
  }
  return { hit, glanced, hpBefore, hpAfter: e.hp };
}

check('it charges up through the beat before each snare, and lets go on the snare', (() => {
  const { e } = setup(snare - 0.1);
  const a = e.charge;
  e.clock = () => snare + 0.05;
  const d = e.discharging;
  e.clock = () => spent;
  return a > 0.5 && d && !e.discharging && e.charge === 0;
})());
{
  const soft = swing(spent);
  check('SPENT (between snares): his sword hits it', soft.hit && !soft.glanced && soft.hpAfter < soft.hpBefore, `${soft.hpBefore} -> ${soft.hpAfter}`);
  const charged = swing(snare - 0.1);
  check('CHARGING (the beat before the snare): his sword glances off it, no harm', charged.glanced && !charged.hit && charged.hpAfter === charged.hpBefore);
}
{
  // On the snare it discharges all round: close to it, he is hurt, even with his shield up (a heavy blow).
  const hurtAt = (t: number, guard: boolean): boolean => {
    const { e, p } = setup(t);
    p.position.set(0.4, 0, -0.85);
    // (A shield held up beforehand. One raised on the very moment is a parry, which turns any blow in the game.)
    for (let k = 0; k < 30; k++) p.update(DT, input({ guardHeld: guard }), FLOOR);
    let hurt = false;
    for (let k = 0; k < 6; k++) {
      p.update(DT, input({ guardHeld: guard }), FLOOR);
      const ev = events();
      resolveCombat(p, [e], ev);
      if (ev.playerResult === 'hit' || ev.playerResult === 'killed') hurt = true;
    }
    return hurt;
  };
  check('ON THE SNARE it discharges: close beside it he is shocked, shield up or not', hurtAt(snare + 0.02, false) && hurtAt(snare + 0.02, true));
  check('...and spent, standing beside it, he is not', !hurtAt(spent, false));
}
{
  // It takes four blows (a roach takes fewer), dealt between the snares.
  const { e, p } = setup(spent);
  let blows = 0;
  for (let n = 0; n < 8 && e.alive; n++) {
    e.x = 0;
    e.z = 0;
    p.position.set(0, 0, -1.1);
    p.facing = 0;
    for (let k = 0; k < 40; k++) p.update(DT, input(), FLOOR);
    p.update(DT, input({ attackPressed: true }), FLOOR);
    for (let k = 0; k < 30; k++) {
      p.update(DT, input(), FLOOR);
      const ev = events();
      resolveCombat(p, [e], ev);
      if (ev.enemyHit === e) blows++;
    }
  }
  check(`it takes ${SPARK.hp} blows to beat`, !e.alive && blows === SPARK.hp, `${blows} blows`);
}
{
  // It hunts as the roach does: from across the floor it comes for him.
  const e = new SparkBeetle({ x: 0, z: 0, arena: { x0: -20, x1: 20, z0: -20, z1: 20 } });
  const d0 = Math.hypot(e.x - 4, e.z - 4);
  for (let k = 0; k < 120; k++) e.update(DT, 4, 0, 4, true);
  check('it hunts him across the floor, as a roach does', Math.hypot(e.x - 4, e.z - 4) < d0 - 1, `${d0.toFixed(1)} -> ${Math.hypot(e.x - 4, e.z - 4).toFixed(1)}`);
}
check('the Coil Room has two Spark Beetles on its floor, coming back when beaten, not among its goals', (levelById('coilroom')?.enemies ?? []).filter((s) => s.type === 'sparkbeetle' && s.respawn && s.uncounted).length === 2);
void BAR;

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
