// THE FROST ROLLER (src/enemies/roller.ts): a pill bug of the cold places. The owner's list, 2026-11-16: "a cold
// creature for the Cold Main". Its idea in one line: IT IS A BALL ON THE ICE, AND IT CANNOT STOP EITHER.
// This plays it by its rules alone (no drawing), in a plain room and on the Cold Main's own ice, and with the real
// combat code against the real knight: its tell, its bowl, what turns it, what spills it, and when it is open.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { Roller, ROLLER, type RollerEvent } from '../src/enemies/roller';
import { RollerModel, BALL_R } from '../src/enemies/rollerModel';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, makeAabb, topAt, type Aabb } from '../src/world/collision';
import { standsOn, floorUnder } from '../src/enemies/footing';
import { coldMain, ROLLERS, ROLLER_ICE, COLDMAIN } from '../src/levels/coldmain';
import { getTexturePixels } from '../src/render/textures';
import { STICKERS } from '../src/data/stickers';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, sneak: false, ...o } as PlayerInput);
/** A plain room twenty across, walls all round. */
const room: Aabb[] = [makeAabb(0, -0.5, 0, 20, 1, 20), makeAabb(-10.5, 2, 0, 1, 4, 22), makeAabb(10.5, 2, 0, 1, 4, 22), makeAabb(0, 2, -10.5, 22, 4, 1), makeAabb(0, 2, 10.5, 22, 4, 1)];
const arena = { x0: -10, x1: 10, z0: -10, z1: 10 };
const make = (x: number, z: number, cs: Aabb[] = room, ice = true): Roller => {
  const r = new Roller({ x, z, arena, respawn: true });
  r.canStand = (a, b, c, d) => standsOn(cs, a, b, c, d);
  r.floorUnder = (a, b, c, d) => floorUnder(cs, a, b, c, d);
  r.onIce = () => ice;
  r.rng = () => 0.5;
  return r;
};
/** Plays it with the rat standing still at (px, pz). Returns what happened, frame by frame. */
const play = (r: Roller, px: number, pz: number, seconds: number, each?: (f: number) => void): RollerEvent[] => {
  const all: RollerEvent[] = [];
  for (let f = 0; f < seconds * 60; f++) {
    r.update(DT, px, 0, pz, true);
    all.push(...r.events.splice(0));
    each?.(f);
  }
  return all;
};

// ---------------------------------------------------------------- its turn of the fight, by its rules
{
  const r = make(0, 0);
  const states: string[] = [];
  let tuckAt = -1;
  let rollAt = -1;
  let spillAt = -1;
  let lineAtTuckEnd = 0;
  const path: Array<[number, number]> = [];
  const ev = play(r, 0, 7, 9, (f) => {
    if (states[states.length - 1] !== r.state) states.push(r.state);
    if (r.state === 'tuck' && tuckAt < 0) tuckAt = f;
    if (r.state === 'roll' && rollAt < 0) {
      rollAt = f;
      lineAtTuckEnd = r.facing;
    }
    if (r.state === 'spilled' && spillAt < 0) spillAt = f;
    if (r.state === 'roll') path.push([r.x, r.z]);
  });
  check('it sees him, walks toward him, TUCKS (the tell), BOWLS, and ends SPILLED on its back; then rights itself and walks again', states.join(' ').startsWith('walk tuck roll spilled right walk') && ev[0] === 'alert', states.join(' > '));
  check(`the tell is ${ROLLER.tuck} of a second, every time: from the first of the tuck to the first of the roll`, Math.abs((rollAt - tuckAt) * DT - ROLLER.tuck) < 0.04, `${((rollAt - tuckAt) * DT).toFixed(2)} s`);
  check('it bowls in a STRAIGHT LINE at where he was when it finished tucking, and fast: half as fast again as he runs', Math.abs(lineAtTuckEnd) < 0.05 && path.slice(0, 20).every(([x]) => Math.abs(x) < 0.05) && ROLLER.speed > 6.2 * 1.5 && path[10][1] - path[9][1] > ROLLER.speed * DT * 0.99);
  check(`it cannot stop: it runs on past where he stood, into the wall, and comes off it; it comes off ${ROLLER.rebounds} things, and the next one spills it`, ev.filter((e) => e === 'bounce').length === ROLLER.rebounds && ev.filter((e) => e === 'spill').length >= 1 && Math.max(...path.map(([, z]) => z)) > 9, `bounces ${ev.filter((e) => e === 'bounce').length}; got as far as z ${Math.max(...path.map(([, z]) => z)).toFixed(1)}`);
  check('it never leaves the floor it is kept to, nor goes into a wall, the whole time it rolls', path.every(([x, z]) => standsOn(room, x, 0, z, ROLLER.radius - 0.02)));
  check(`spilled, it lies open for ${ROLLER.spilled} seconds before it rights itself`, (() => {
    const q = make(0, 0);
    let open = 0;
    play(q, 0, 7, 12, () => {
      if (q.state === 'spilled') open++;
    });
    return Math.abs(open * DT - ROLLER.spilled) < 0.05 || Math.abs(open * DT - ROLLER.spilled * 2) < 0.1;
  })());
  // Curl, for how it is drawn and for its shell.
  const c = make(0, 0);
  let curlAtRoll = 0;
  let curlSpilled = 1;
  play(c, 0, 7, 9, () => {
    if (c.state === 'roll') curlAtRoll = Math.max(curlAtRoll, c.curl);
    if (c.state === 'spilled' && c.stateTime > 0.4) curlSpilled = Math.min(curlSpilled, c.curl);
  });
  check('it is rolled right up by the time it goes (so the ball that is drawn is the ball that is so), and open again when it lies spilled', curlAtRoll > 0.999 && curlSpilled < 0.01);
}

// ---------------------------------------------------------------- its shell, and when it is open
{
  const r = make(0, 0);
  play(r, 0, 7, 0.4);
  const walking = r.state === 'walk' && !r.deflects(0, 5);
  while (r.state !== 'roll') r.update(DT, 0, 0, 7, true);
  const rolling = r.deflects(0, 5, 'sword');
  const dive = r.deflects(0, 5, 'plunge');
  check('CURLED, ITS SHELL TURNS THE SWORD (bowling, and for the last of its tuck); walking it does not; a dive from above is not turned', walking && rolling && !dive);
  const hpBefore = r.hp;
  r.takeHit(1, 0, 5, 'plunge');
  check('...and a dive onto it while it bowls cracks it open on the spot: it is hurt, and spilled', r.hp === hpBefore - 1 && r.state === 'spilled');
  check('spilled it is OPEN: the sword is not turned, and each blow counts; three and it is beaten', !r.deflects(0, 5) && !r.takeHit(1, 0, 5) && r.state === 'spilled' && r.takeHit(1, 0, 5) && !r.alive && ROLLER.hp === 3);
  let back = 0;
  for (let f = 0; f < 60 * 10 && !r.alive; f++) {
    r.update(DT, 50, 0, 50, true);
    back++;
  }
  check(`beaten, it comes back where it was made after ${ROLLER.respawn} seconds, whole and uncurled`, r.alive && Math.abs(back * DT - ROLLER.respawn) < 0.1 && r.x === 0 && r.z === 0 && r.hp === ROLLER.hp && r.curl === 0);
}

// ---------------------------------------------------------------- against the real knight
{
  /** The roller bowls at the knight, who does `what` as it comes. What became of both. */
  const meet = (what: 'stand' | 'guard' | 'jump' | 'side'): { hurt: boolean; result: string | null; state: string; hp: number; spilledFor: number; glanced: boolean } => {
    const cs = room;
    const r = make(0, -4, cs);
    const p = new PlayerController(new THREE.Vector3(0, 0, 3));
    p.facing = Math.PI;
    const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] } as CombatEvents;
    let result: string | null = null;
    let hurt = false;
    let spilledFor = 0;
    let glanced = false;
    const hp0 = p.hp;
    for (let f = 0; f < 60 * 6; f++) {
      const coming = r.state === 'roll' ? Math.hypot(r.x - p.position.x, r.z - p.position.z) : 99;
      const input: Partial<PlayerInput> =
        what === 'guard' ? { guardHeld: r.state === 'tuck' || r.state === 'roll' }
        : what === 'jump' ? { jumpPressed: coming < 2.6 && p.grounded, jumpHeld: coming < 4 }
        : what === 'side' ? { move: (r.state === 'tuck' && r.stateTime > ROLLER.tuck * ROLLER.aimUntil) || (r.state === 'roll' && r.z < p.position.z + 1) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3() }
        : {};
      p.update(DT, inp(input), cs);
      r.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
      events.playerResult = null;
      (events as { glanced?: unknown }).glanced = null;
      resolveCombat(p, [r as never], events);
      if (events.playerResult) result ??= events.playerResult;
      if ((events as { glanced?: unknown }).glanced) glanced = true;
      if (p.hp < hp0) hurt = true;
      if (r.state === 'spilled') spilledFor++;
      if (r.state === 'right') break;
    }
    return { hurt, result, state: r.state, hp: p.hp, spilledFor: spilledFor * DT, glanced };
  };
  const stood = meet('stand');
  check('he STANDS in its way: it runs him down, a heart, and rolls on', stood.hurt && stood.result === 'hit', `${stood.result}`);
  const guarded = meet('guard');
  check(`he holds his SHIELD up to it: it is stopped dead on the shield, he is not hurt, and it spills and lies open longer (${ROLLER.spilledOnShield} seconds, or ${ROLLER.spilledParried} off a perfect guard)`, !guarded.hurt && (guarded.result === 'blocked' || guarded.result === 'parried') && guarded.spilledFor > ROLLER.spilled + 0.3, `${guarded.result}; open ${guarded.spilledFor.toFixed(2)} s`);
  const jumped = meet('jump');
  check('he JUMPS it: it runs along the floor, and passes under him', !jumped.hurt && jumped.result === null);
  const stepped = meet('side');
  check('he steps aside AFTER its line is set (the last of the tuck): it does not follow, and misses', !stepped.hurt && stepped.result === null);
  check('its line is set before the tuck ends, and its tell is long enough to act on: over a third of a second with its line still turning, and then some with it fixed', ROLLER.tuck * ROLLER.aimUntil > 0.35 && ROLLER.tuck * (1 - ROLLER.aimUntil) > 0.15);
  // A swing at it as it bowls is turned.
  {
    const r = make(0, -4);
    const p = new PlayerController(new THREE.Vector3(1.3, 0, 0));
    p.facing = -Math.PI / 2;
    const events = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] } as CombatEvents;
    let turned = false;
    let swung = false;
    const hp = r.hp;
    for (let f = 0; f < 60 * 5; f++) {
      // (One swing, begun as it comes, so that the blade is out as it passes.)
      const near = r.state === 'roll' && r.z > -2.2 && r.z < -1.2 && !swung;
      if (near) swung = true;
      p.update(DT, inp({ attackPressed: near }), room);
      r.update(DT, 0, 0, 4, true);
      (events as { glanced?: unknown }).glanced = null;
      resolveCombat(p, [r as never], events);
      if ((events as { glanced?: unknown }).glanced === r) turned = true;
      if (process.env.ROLL_TRACE && (events.playerResult || events.enemyHit || (events as { glanced?: unknown }).glanced || near)) console.log('TRACE', f, r.state, r.z.toFixed(2), p.state, 'result', events.playerResult, 'hit', !!events.enemyHit, 'glanced', !!(events as { glanced?: unknown }).glanced, 'attackActive', p.attackActive);
    }
    check('a SWORD swung at it as it bowls past is turned by its shell: it is not hurt (wait for it to spill)', turned && r.hp === hp);
  }
}

// ---------------------------------------------------------------- ice, and stone
{
  const far = (ice: boolean): { went: number; bounces: number } => {
    const r = make(-8, 0, room, ice);
    let x0 = 0;
    let went = 0;
    let lastX = r.x;
    let lastZ = r.z;
    let rolling = false;
    let done = false;
    let bounces = 0;
    // (Its FIRST bowl only.)
    play(r, 1, 0, 8, () => {
      if (r.state === 'roll' && !rolling && !done) {
        rolling = true;
        x0 = r.x;
      }
      if (rolling && r.state !== 'roll') {
        rolling = false;
        done = true;
      }
      if (rolling) went += Math.hypot(r.x - lastX, r.z - lastZ);
      lastX = r.x;
      lastZ = r.z;
    });
    void x0;
    const q = make(-8, 0, room, ice);
    let first = true;
    for (const e of play(q, 1, 0, 8)) {
      if (e === 'spill') first = false;
      if (e === 'bounce' && first) bounces++;
    }
    return { went, bounces };
  };
  const ice = far(true);
  const stone = far(false);
  check('ON ICE it keeps its speed, the length of the room and back off the wall; on a STONE floor it is dragged to a stop within a few lengths and spills where it stops: it is the creature of the ice', ice.bounces >= 1 && ice.went > 25 && stone.bounces === 0 && stone.went > 4 && stone.went < 10, `ice: ${ice.went.toFixed(1)} and ${ice.bounces} rebounds; stone: ${stone.went.toFixed(1)}`);
}

// ---------------------------------------------------------------- on the Cold Main
{
  const def = coldMain();
  const cs = def.solids.map((b) => aabbOf(b));
  const sheet = cs.filter((b) => b.slick);
  const onSheet = (x: number, z: number): boolean => sheet.some((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && Math.abs(topAt(b, x, z)) < 1e-6);
  check('two of them live on the Cold Main\'s ice: each made on the sheet itself, clear of the blocks and the spikes, kept to the sheet (not the stone banks), and further from the door than it notices him from', ROLLERS.length === 2 && ROLLERS.every(([x, z]) => onSheet(x, z) && standsOn(cs, x, 0, z, ROLLER.radius + 0.1) && Math.hypot(x - def.spawn.x, z - def.spawn.z) > ROLLER.noticeRange) && ROLLER_ICE.z1 < COLDMAIN.channel && ROLLER_ICE.z0 > -COLDMAIN.channel);
  // One of them, bowling up and down the sheet for a minute with the rat standing on it: never off the ice, never in a block.
  const r = new Roller({ x: ROLLERS[0][0], z: ROLLERS[0][1], arena: { ...ROLLER_ICE } });
  r.canStand = (a, b, c, d) => standsOn(cs, a, b, c, d);
  r.floorUnder = (a, b, c, d) => floorUnder(cs, a, b, c, d);
  r.onIce = (x, _y, z) => onSheet(x, z);
  let seed = 7;
  r.rng = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let off = 0;
  let rolls = 0;
  let bounces = 0;
  for (let f = 0; f < 60 * 60; f++) {
    r.update(DT, 11 * Math.sin(f / 420), 0, 2.5 * Math.cos(f / 170), true);
    for (const e of r.events.splice(0)) {
      if (e === 'roll') rolls++;
      if (e === 'bounce') bounces++;
    }
    if (!onSheet(r.x, r.z) || !standsOn(cs, r.x, 0, r.z, ROLLER.radius - 0.03)) off++;
  }
  check('played there for a minute, bowling again and again at a rat out on the ice: it comes off the blocks, the spikes and the walls, and is never off the sheet nor inside anything', rolls >= 5 && bounces >= 8 && off === 0, `${rolls} bowls, ${bounces} rebounds, ${off} frames out of place`);
}

// ---------------------------------------------------------------- how it is drawn
{
  check('the ball that is drawn is as big as the round body the rules give it', Math.abs(BALL_R - ROLLER.radius) < 0.04, `${BALL_R.toFixed(3)} against ${ROLLER.radius}`);
  const m = new RollerModel();
  const size = (curl: number, state: string): THREE.Vector3 => {
    m.update(0, { state: state as never, stateTime: 1, curl, spin: 0, moving: 0 });
    m.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    m.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      // (Its shadow, and the piece that shuts its sides when it is rolled up and is not shown otherwise, apart.)
      if (mesh.isMesh && mesh.visible && mesh.geometry.type !== 'CircleGeometry') box.expandByObject(mesh);
    });
    return box.getSize(new THREE.Vector3());
  };
  const flatOut = size(0, 'walk');
  const ball = size(1, 'roll');
  check('walking it is long and low; rolled up it is as high as it is long: a ball', flatOut.z > flatOut.y * 2 && Math.abs(ball.y - ball.z) < 0.2 && ball.y > flatOut.y * 1.6 && ball.z < flatOut.z * 0.85, `walking ${flatOut.z.toFixed(2)} long by ${flatOut.y.toFixed(2)} high; rolled ${ball.z.toFixed(2)} by ${ball.y.toFixed(2)}`);
  let tris = 0;
  let textured = 0;
  let meshes = 0;
  m.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    tris += (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3;
    if ((mesh.material as THREE.ShaderMaterial).uniforms?.tex?.value) textured++;
  });
  check('it is a few shaped pieces (six plates, a pair of legs to four of them, a head, two feelers) and under three hundred faces; and EVERY piece of it is textured but its shadow', tris < 300 && textured === meshes - 1, `${tris} faces, ${meshes} pieces, ${textured} textured`);
  const px = getTexturePixels('rollerShell');
  const lum = (x: number, y: number): number => px.data[(y * px.size + x) * 4] + px.data[(y * px.size + x) * 4 + 1] + px.data[(y * px.size + x) * 4 + 2];
  const rowMean = (y: number): number => Array.from({ length: px.size }, (_, x) => lum(x, y)).reduce((a, b) => a + b, 0) / px.size;
  check('its shell\'s picture is ONE plate: dark where it comes out from under the plate before, paling to a hind lip rimed white; paler along its crest than down its flanks; and blue (the cold)', rowMean(2) < rowMean(30) && rowMean(px.size - 3) > rowMean(30) * 1.25 && lum(px.size / 2, 30) > lum(3, 30) && px.data[(30 * px.size + 32) * 4 + 2] > px.data[(30 * px.size + 32) * 4]);
  check('it has no sticker yet: it lives only in a try-out room (as the scorpion had none until a real level had one)', !STICKERS.some((s) => s.id === 'foe:roller'));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
