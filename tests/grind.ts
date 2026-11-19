// Grinding: riding his shield along a ledge or a rail (src/world/grind.ts, the controller's `grindStep`).
//
// The owner, 2026-11-15: "if you're board sliding down you can actually go to the edge and maybe like press triangle
// and he'll ... grind alongside that edge." Triangle is STOW, which has nothing else to do while he rides.
// All of it is played with the real controller: a hill to get his speed from, and things at its foot to grind.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { aabbOf, type Aabb } from '../src/world/collision';
import { extent, rampBox } from '../src/world/layout';
import { findGrind, grindHeight } from '../src/world/grind';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
const G = TUNING.grind;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const WEST = v(-1, 0);

/** A big floor, and a hill: a landing at x 0..6, eight up, and a slope down from x = 0 to x = -16 (west is down). */
const hill = (): Aabb[] => [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -16, 0, -4, 4, 0, 8, 'e')), aabbOf(extent('stone', 0, 6, 0, 8, -4, 4))];
interface Run { p: PlayerController; events: MoveEvent[] }
/** Onto his shield: he runs onto the slope, jumps, and in the air over it presses ATTACK. */
const getOn = (p: PlayerController): Partial<PlayerInput> => ({ move: WEST, run: true, jumpPressed: p.grounded && p.position.x < -0.5, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.position.x < -0.5 && p.velocity.y < 4 });
/**
 * He runs down the hill along z = `lane`, gets on his shield (a jump, and ATTACK in the air over the slope), and
 * from then on does what `at` says. (Not riding yet,
 * `at` is not asked.)
 */
function ride(cs: Aabb[], lane: number, frames: number, at: (i: number, p: PlayerController) => Partial<PlayerInput>, each?: (p: PlayerController) => void): Run {
  const p = new PlayerController(new THREE.Vector3(3, 8, lane));
  const events: MoveEvent[] = [];
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  for (let i = 0; i < frames; i++) {
    p.update(DT, inp(p.riding ? { run: false, ...at(i, p) } : getOn(p)), cs);
    if (p.moveEvent) events.push(p.moveEvent);
    each?.(p);
  }
  return { p, events };
}
/** Presses STOW once, the first frame `when` is so. */
const stowOnce = (when: (p: PlayerController) => boolean): ((i: number, p: PlayerController) => Partial<PlayerInput>) => {
  let done = false;
  return (_i, p) => {
    if (done || !when(p)) return {};
    done = true;
    return { stowPressed: true };
  };
};

// ---- A rail ----
{
  // A bar a quarter wide and half a unit high along the floor from x = -50 to -24, half a unit north of his lane.
  const rail = aabbOf(extent('stone', -50, -24, 0, 0.5, -0.62, -0.38));
  const cs = [...hill(), rail];
  let onIt = 0;
  let offLine = 0;
  let speedOn = 0;
  let speedOff = 0;
  const a = ride(cs, 0, 440, stowOnce((p) => p.position.x < -26), (p) => {
    if (!p.grinding) return;
    onIt++;
    if (Math.abs(p.position.z + 0.5) > 1e-6 || Math.abs(p.position.y - 0.5) > 1e-6) offLine++;
    const s = Math.abs(p.velocity.x);
    if (!speedOn) speedOn = s;
    speedOff = s;
  });
  check('riding beside a rail, STOW puts his shield on it: he grinds', a.events.includes('grind') && onIt > 30, `${onIt} frames on it; ${a.events.join()}`);
  check('...on the rail and nowhere else: down its middle, at its height, the whole way', offLine === 0, `${offLine} frames off the line`);
  check('...a rail keeps his speed better than the floor does', speedOn - speedOff < (onIt * DT) * (TUNING.ride.dragFlat - 0.3) && speedOff < speedOn, `${speedOn.toFixed(1)} on, ${speedOff.toFixed(1)} at its end`);
  check('...at its end he flies off it still on his shield, and lands riding', a.events.includes('grindEnd') && a.events.indexOf('rideLand', a.events.indexOf('grindEnd')) > 0 && !a.events.includes('bail') && a.p.position.x < -50, `${a.events.join()}; x ${a.p.position.x.toFixed(1)}`);
  // He does not steer on it: the stick held hard to one side changes nothing.
  let wander = 0;
  const b = ride(cs, 0, 370, (i, p) => ({ ...stowOnce((q) => q.position.x < -26)(i, p), ...(p.grinding ? { move: v(0, 1) } : {}) }), (p) => {
    if (p.grinding) wander = Math.max(wander, Math.abs(p.position.z + 0.5));
  });
  check('...the rail carries him: the stick does not steer him off it', wander < 1e-6 && b.events.includes('grind'));
  // Not without the button, and not from too far away.
  const c = ride(cs, 0, 370, () => ({}));
  check('without the button he rides on beside it', !c.events.includes('grind') && c.p.riding);
  const d = ride(cs, 2, 370, stowOnce((p) => p.position.x < -26));
  check('a rail two and a half units to his side is out of reach', !d.events.includes('grind'));
}

// ---- Getting off ----
{
  const rail = aabbOf(extent('stone', -70, -24, 0, 0.5, -0.62, -0.38));
  const cs = [...hill(), rail];
  const stow = (): ((i: number, p: PlayerController) => Partial<PlayerInput>) => stowOnce((p) => p.position.x < -26);
  const hop = (side: number): Run & { top: number; z: number } => {
    const s = stow();
    let jumped = false;
    let top = 0;
    const r = ride(cs, 0, 340, (i, p) => {
      if (p.grinding && p.position.x < -34 && !jumped) {
        jumped = true;
        return { jumpPressed: true, jumpHeld: true, move: v(0, side) };
      }
      return { ...s(i, p), jumpHeld: jumped && !p.grounded, move: jumped && !p.grounded ? v(0, side) : v(0, 0) };
    }, (p) => {
      if (jumped) top = Math.max(top, p.position.y);
    });
    return { ...r, top, z: r.p.position.z };
  };
  const straight = hop(0);
  check('JUMP hops off the rail, still on his shield', straight.events.includes('ollie') && straight.top > 0.5 + 1 && !straight.p.grinding && !straight.events.includes('bail'), `top ${straight.top.toFixed(2)}; ${straight.events.join()}`);
  const south = hop(1);
  const north = hop(-1);
  check('...and the stick throws the hop to the side he holds it', south.z > 0.3 && north.z < -1.3, `south to z ${south.z.toFixed(2)}, north to z ${north.z.toFixed(2)}`);
  const s2 = stow();
  let rolled = false;
  const stepped = ride(cs, 0, 390, (i, p) => {
    if (p.grinding && p.position.x < -34 && !rolled) {
      rolled = true;
      return { dodgePressed: true };
    }
    return s2(i, p);
  });
  check('ROLL steps off rail and shield both', rolled && !stepped.p.riding && !stepped.p.grinding && stepped.events.includes('rideEnd'), stepped.events.join());
  // A rail that climbs: it slows him, and when he is too slow to grind he is set down on it, off his shield.
  const rising = [...hill(), aabbOf(rampBox('stone', -70, -24, -0.62, -0.38, 0.5, 8.5, 'w'))];
  const s3 = stowOnce((p) => p.position.x < -24.3);
  const slow = ride(rising, 0, 700, s3);
  check('on a rail that climbs he slows, and too slow to grind he comes off it by himself, harmlessly', slow.events.includes('grind') && slow.events.includes('grindEnd') && !slow.events.includes('bail') && !slow.p.grinding && slow.p.position.x > -70, `${slow.events.join()}; x ${slow.p.position.x.toFixed(1)}`);
  // Something standing across a rail.
  const blocked = [...hill(), aabbOf(extent('stone', -70, -24, 0, 0.5, -0.62, -0.38)), aabbOf(extent('stone', -41, -40, 0, 3, -2, 2))];
  const s4 = stowOnce((p) => p.position.x < -26);
  const hit = ride(blocked, 0, 410, s4);
  check('a wall across the rail throws him off it at speed', hit.events.includes('grind') && hit.events.includes('bail') && hit.p.position.x > -40.5, `${hit.events.join()}; x ${hit.p.position.x.toFixed(1)}`);
}

// ---- A ledge ----
{
  // A kerb 0.7 high and four deep, its north edge along z = 0.5: he rides along the floor just north of it.
  const kerb = aabbOf(extent('stone', -50, -24, 0, 0.7, 0.5, 4.5));
  const cs = [...hill(), kerb];
  let onIt = 0;
  let bad = 0;
  let side = 0;
  const a = ride(cs, 0, 440, stowOnce((p) => p.position.x < -26), (p) => {
    if (!p.grinding) return;
    onIt++;
    side = p.grindSide;
    if (Math.abs(p.position.z - 0.5) > 1e-6 || Math.abs(p.position.y - 0.7) > 1e-6) bad++;
  });
  check('riding along the foot of a ledge, STOW hops his shield up onto its edge: he grinds the edge', a.events.includes('grind') && onIt > 30 && bad === 0, `${onIt} frames, ${bad} off the edge; ${a.events.join()}`);
  // Going west (-x) with the drop to the north (-z): by his model that is his... +x side faces -z going +x, so -x going west.
  check('...and knows which side the drop is on', side === -1, `side ${side}`);
  const high = [...hill(), aabbOf(extent('stone', -50, -24, 0, G.up + 0.2, 0.5, 4.5))];
  const tall = ride(high, 0, 440, stowOnce((p) => p.position.x < -26));
  check('...a ledge higher than he can hop his shield onto is a wall to him, as it was', !tall.events.includes('grind'));
  // From on top of it: riding along the kerb's top near its edge.
  const top = [...hill().slice(0, 1), aabbOf(rampBox('stone', -16, 0, -4, 4, 0.8, 8.8, 'e')), aabbOf(extent('stone', 0, 6, 0, 8.8, -4, 4)), aabbOf(extent('stone', -60, -16, 0, 0.8, -4, 4))];
  const p2 = new PlayerController(new THREE.Vector3(3, 8.8, -3.5));
  const ev: MoveEvent[] = [];
  let pressed = false;
  let z = 0;
  for (let i = 0; i < 20; i++) p2.update(DT, inp({}), top);
  for (let i = 0; i < 370; i++) {
    const press = p2.riding && !pressed && p2.position.x < -20;
    if (press) pressed = true;
    p2.update(DT, inp(p2.riding ? { run: false, stowPressed: press } : getOn(p2)), top);
    if (p2.moveEvent) ev.push(p2.moveEvent);
    if (p2.grinding) z = p2.position.z;
  }
  check('riding along the top of a ledge near its edge, STOW puts him on the edge', ev.includes('grind') && Math.abs(z + 4) < 1e-6, `${ev.join()}; z ${z.toFixed(2)}`);
  // A seam between two boxes at one height is no edge, and a step under the drop is no ledge.
  const flat = [aabbOf(extent('floor', -10, 10, -1, 0, -10, 0)), aabbOf(extent('floor', -10, 10, -1, 0, 0, 10))];
  check('the seam between two floors is nothing to grind', findGrind(0, 0, 0.2, 8, 0, flat, G) === null);
  const low = [aabbOf(extent('floor', -10, 10, -1, 0, -10, 10)), aabbOf(extent('stone', -10, 10, 0, G.drop - 0.1, 0, 5))];
  check('...nor an edge with too little a drop beside it', findGrind(0, 0, -0.3, 8, 0, low, G) === null);
  check('...and he must be going along it, not across it or slowly', findGrind(-30, 0, 0, 0, 8, cs, G) === null && findGrind(-30, 0, 0, -(G.minSpeed - 0.5), 0, cs, G) === null && findGrind(-30, 0, 0, -8, 0, cs, G) !== null);
}

// ---- One ledge of several boxes; a rail that slopes ----
{
  // Two kerbs end to end at one height are one edge to him; a third, lower, is where it ends.
  const cs = [...hill(), aabbOf(extent('stone', -36, -24, 0, 0.7, 0.5, 4.5)), aabbOf(extent('stone', -50, -36, 0, 0.7, 0.5, 3)), aabbOf(extent('stone', -60, -50, 0, 0.2, 0.5, 3))];
  let last = 0;
  const a = ride(cs, 0, 410, stowOnce((p) => p.position.x < -26), (p) => {
    if (p.grinding) last = p.position.x;
  });
  check('an edge carries on from one box to the next at the same height, and ends where the height does', a.events.includes('grind') && last < -49 && last > -51, `ground on to x ${last.toFixed(1)}`);
  // A thin ramp is a rail going downhill: it speeds him up, and its end throws him the way it was going.
  const down = [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -16, 0, -4, 4, 6, 14, 'e')), aabbOf(extent('stone', 0, 6, 0, 14, -4, 4)), aabbOf(extent('stone', -30, -16, 0, 6, -4, 4)), aabbOf(rampBox('stone', -42, -30, -0.62, -0.38, 0.6, 6.6, 'e'))];
  const p = new PlayerController(new THREE.Vector3(3, 14, 0));
  const ev: MoveEvent[] = [];
  let pressed = false;
  let inV = 0;
  let outV = 0;
  let fell = 0;
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), down);
  for (let i = 0; i < 410; i++) {
    const press = p.riding && !pressed && p.position.x < -30.2;
    if (press) pressed = true;
    p.update(DT, inp(p.riding ? { run: false, stowPressed: press } : getOn(p)), down);
    if (p.moveEvent) ev.push(p.moveEvent);
    if (p.grinding) {
      if (!inV) inV = Math.abs(p.velocity.x);
      outV = Math.abs(p.velocity.x);
    } else if (inV && !fell && !p.grounded) fell = p.velocity.y;
  }
  check('a rail that slopes down speeds him up', ev.includes('grind') && outV > inV + 1, `${inV.toFixed(1)} on, ${outV.toFixed(1)} off; ${ev.join()}`);
  check('...and he leaves its end going down the way it was going, not level', fell < -2, `falling at ${fell.toFixed(1)} as he leaves`);
  check('the height of a line is its solid\'s top there; past its end there is none', grindHeight({ axis: 'x', c: -0.5, side: 0 }, -36, 3.6, 0, down, G.drop) === 3.6 && grindHeight({ axis: 'x', c: -0.5, side: 0 }, -43, 0.6, 1, down, G.drop) === 'end');
}

// ---- From his own feet, in the air (the owner, 2026-11-15) ----
{
  // A floor and a rail on it; he runs along beside the rail, jumps, and presses STOW in the air.
  const cs = [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(extent('stone', -40, -5, 0, 0.5, -0.62, -0.38))];
  const go = (run: boolean, lane: number, when: (p: PlayerController) => boolean): { events: MoveEvent[]; on: number; jolt: number; first: number } => {
    const p = new PlayerController(new THREE.Vector3(6, 0, lane));
    const events: MoveEvent[] = [];
    let on = 0;
    let jolt = 0;
    let first = 0;
    let pressed = false;
    const last = new THREE.Vector3();
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    for (let i = 0; i < 240; i++) {
      last.copy(p.position);
      const press = !pressed && !p.grounded && when(p);
      if (press) pressed = true;
      p.update(DT, inp(p.riding ? { run: false } : { move: WEST, run, jumpPressed: p.grounded && p.position.x < -8 && !pressed, jumpHeld: true, stowPressed: press }), cs);
      if (p.moveEvent) events.push(p.moveEvent);
      if (p.riding) jolt = Math.max(jolt, last.distanceTo(p.position));
      if (p.grinding) {
        on++;
        if (!first) first = p.position.y;
      }
    }
    return { events, on, jolt, first };
  };
  const top = go(true, 0, (p) => p.velocity.y < 0.5);
  check('in the air over a rail, going along it at a run, STOW puts his shield under him and brings him down onto it', top.events[0] === 'ride' && top.events[1] === 'grind' && top.on > 40 && Math.abs(top.first - 0.5) < 1e-6, `${top.on} frames on it; ${top.events.join()}`);
  check('...he comes down onto it: he is not put on it at a stroke from the top of his jump', top.jolt < 0.75, `furthest in a step ${top.jolt.toFixed(2)}`);
  const low = go(true, 0, (p) => p.velocity.y < -6);
  check('...pressed late, low over it, the same', low.events.includes('grind') && low.on > 30);
  const walk = go(false, 0, (p) => p.velocity.y < 0.5);
  check('...too slow (at a walk) nothing happens: he comes down on his feet, his shield on his arm', !walk.events.includes('ride') && !walk.events.includes('grind') && walk.on === 0, walk.events.join());
  const wide = go(true, 2.2, (p) => p.velocity.y < 0.5);
  check('...and a rail well off to his side is out of reach', !wide.events.includes('ride') && wide.on === 0);
  // The edge of a ledge, the same: along the top of a kerb, a jump and STOW.
  const kerb = [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(extent('stone', -40, 10, 0, 1.2, -6, 0))];
  const p = new PlayerController(new THREE.Vector3(6, 1.2, -0.6));
  const ev: MoveEvent[] = [];
  let z = 9;
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), kerb);
  for (let i = 0; i < 160; i++) {
    p.update(DT, inp(p.riding ? { run: false } : { move: WEST, run: true, jumpPressed: p.grounded && p.position.x < 0, jumpHeld: true, stowPressed: !p.grounded && p.velocity.y < 0.5 }), kerb);
    if (p.moveEvent) ev.push(p.moveEvent);
    if (p.grinding) z = p.position.z;
  }
  check('a ledge is the same as a rail to him: running along a kerb\'s top, a jump and STOW grinds its edge', ev.includes('ride') && ev.includes('grind') && Math.abs(z) < 1e-6, `${ev.join()}; z ${z.toFixed(2)}`);
  // On the ground, STOW is what it always was.
  const g = new PlayerController(new THREE.Vector3(-10, 0, 0));
  for (let i = 0; i < 20; i++) g.update(DT, inp({}), cs);
  let rode = false;
  for (let i = 0; i < 60; i++) {
    g.update(DT, inp({ move: WEST, run: true, stowPressed: i === 20 }), cs);
    rode ||= g.riding;
  }
  check('on the ground beside a rail, on his feet, STOW still puts his sword away and nothing else', !rode && !g.armed);
}

console.log(failures === 0 ? 'grind: all passed' : `grind: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
