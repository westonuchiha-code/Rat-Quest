// THE CUTSCENE SYSTEM (the owner, 2026-11-16: "a little cutscene system that works with all of our characters where
// we can sort of marionette them around ... build something where we can make scenes like this frame by frame").
// Holds: what a key means and how a thing goes between keys; that every kind of character can be cast and takes its
// strings; and that the four first scenes are sound: everyone on the floor, the view never inside a wall, the
// thimble on the bar.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { checkCutscene, compileCutscene, sampleCutscene, CUT_FPS, NOD_TIME, type CutsceneDef } from '../src/cutscene/cutscene';
import { CutStage, makePuppet, PUPPET_FOES, PUPPET_NPCS } from '../src/cutscene/stage';
import { BEAT, CUTSCENES, cutsceneById } from '../src/cutscene/scenes';
import { levelById } from '../src/levels/levels';
import { BAR } from '../src/levels/junction';
import { aabbOf, type Aabb } from '../src/world/collision';
import { standsOn } from '../src/enemies/footing';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const near = (a: number, b: number, e = 1e-6): boolean => Math.abs(a - b) < e;

// ---------------------------------------------------------------- what keys mean
{
  const def: CutsceneDef = {
    id: 'made', name: 'MADE', level: 'hub', length: 10,
    cast: {
      a: {
        who: { is: 'npc', kind: 'fox', name: 'Vix' },
        keys: [
          { t: 0, at: [0, 0, 0], face: 0, doing: 'stand' },
          { t: 2, at: [4, 0, 0] },
          { t: 3, doing: 'lean', seated: true, nod: 2 },
          { t: 4, at: [4, 0, 0] },
          { t: 5, at: [4, 0, 3], hop: 1 },
          { t: 6, at: [6, 0, 3], slide: true, ease: 'out' },
          { t: 7, hide: true, lean: [0, 0] },
          { t: 8, hide: false, lean: [0.2, -0.1], headAt: [6, -10], talk: 1 },
          { t: 9.45, head: [0, 0] },
          { t: 9.5, shake: 1 },
        ],
      },
    },
    props: { cup: { kind: 'mug', keys: [{ t: 0, at: [0, 1, 0], yaw: 0, tip: 0 }, { t: 4, at: [0, 1, 8], ease: 'out', yaw: 2, tip: 1 }, { t: 6, hide: true }] } },
    cam: [
      { t: 0, pos: [0, 2, 5], look: [0, 1, 0] },
      { t: 2, pos: [4, 2, 5] },
      { t: 3, cut: true, orbit: { centre: [0, 1, 0], r: 4, h: 2, angle: 0 } },
      { t: 7, orbit: { centre: [0, 1, 0], r: 4, h: 2, angle: Math.PI } },
      { t: 8, cut: true, pos: [9, 9, 9], watch: 'a', watchUp: 0.5 },
    ],
  };
  check('a sound scene has nothing said against it', checkCutscene(def).length === 0, checkCutscene(def).join('; '));
  const sc = compileCutscene(def);
  const at = (t: number) => sampleCutscene(sc, t);
  const a = (t: number) => at(t).cast.a;
  check('a key says what is true AT its moment: at 0 he is at the first place, at 2 at the second; half way he is half way, and walking', near(a(0).x, 0) && near(a(2).x, 4) && near(a(1).x, 2) && a(1).speed > 2.5 && a(0).speed === 0 && near(a(2).speed, 0));
  check('...off gently and in gently: a quarter of the time in he has gone well under a quarter of the way', a(0.5).x < 0.7 && a(0.5).x > 0.4, a(0.5).x.toFixed(2));
  check('walking, he FACES THE WAY HE GOES without being told (east, here), having turned to it as he set off', near(a(1).facing, Math.PI / 2) && near(a(0).facing, 0) && a(0.15).facing > 0.2 && a(0.15).facing < 1.5);
  check('what he is DOING and whether he SITS are so from their key on, not before', a(2.9).doing === 'stand' && !a(2.9).seated && a(3).doing === 'lean' && a(3.1).seated && a(9).doing === 'lean');
  check(`a nod: his head goes down and comes up, ${NOD_TIME} seconds a nod, as many times as the key says, and is still after`, near(a(3).headPitch, 0) && a(3 + NOD_TIME / 2).headPitch > 0.3 && near(a(3 + NOD_TIME).headPitch, 0, 1e-3) && a(3 + NOD_TIME * 1.5).headPitch > 0.3 && near(a(3 + NOD_TIME * 2.2).headPitch, 0));
  check('a hop: he rises on the way and is down at each end; he is in the air, not walking', near(a(4).hopY, 0) && near(a(4.5).hopY, 1) && near(a(5).hopY, 0) && a(4.5).speed === 0);
  check('a slide: he is moved without walking and WITHOUT turning to face the way; "out" is off at once and in gently (half the time, three quarters of the way)', a(5.5).speed === 0 && near(a(5.5).x, 5.5) && near(a(5.2).facing, a(5.9).facing) && near(a(5.9).facing, 0));
  check('hidden from a key on, and back from another', a(6.9).visible && !a(7).visible && !a(7.9).visible && a(8).visible);
  check('his body tipped goes smoothly from key to key: forward, and to his side', near(a(7).leanFwd, 0) && near(a(7.5).leanFwd, 0.1) && near(a(8).leanFwd, 0.2) && near(a(8).leanSide, -0.1));
  check('his head turned TO A PLACE: the place is behind him as he stands, so it turns as far as his neck goes and no further', near(Math.abs(a(8).headYaw), 1.2));
  check('talking for as long as the key says', !a(7.9).talking && a(8.5).talking && !a(9.1).talking);
  check('a shake of the head: side to side and back to where it was', Math.abs(a(9.59).headYaw - a(9.49).headYaw) > 0.1 && near(a(9.5 + 0.36 + 0.01).headYaw, a(9.49).headYaw, 1e-6));
  const cup = (t: number) => at(t).props.cup;
  check('a thing is keyed the same way: slid ("out") it is three quarters of the way at half time, turning and tipping as it goes, then gone', near(cup(2).z, 6) && near(cup(2).yaw, 1) && near(cup(2).tip, 0.5) && cup(5.9).visible && !cup(6).visible);
  check('the view glides from key to key, a key that leaves out what it looks at keeping it from the key before', near(at(1).cam.pos[0], 2) && near(at(1).cam.look[0], 0) && near(at(2.99).cam.pos[0], 4, 1e-2));
  check('...a CUT jumps: no gliding toward it beforehand', near(at(2.99).cam.pos[2], 5, 1e-2) && near(at(2.99).cam.pos[1], 2, 1e-2) && near(at(3).cam.pos[2], 4) && near(at(3).cam.pos[0], 0) && near(at(3).cam.pos[1], 3));
  const half = at(5).cam;
  check('...two keys on a ring PAN ROUND the place (half way it is a quarter turn round, still on the ring, still looking at the middle), not straight across it', near(Math.hypot(half.pos[0], half.pos[2]), 4) && near(half.pos[0], 4) && near(half.look[0], 0) && near(half.look[1], 1));
  check('...and a view told to WATCH someone looks at him wherever he is that moment', near(at(8.5).cam.look[0], a(8.5).x) && near(at(8.5).cam.look[1], 0.5) && near(at(8.5).cam.look[2], a(8.5).z));
  check(`frames are counted ${CUT_FPS} to the second, and the scene is done at its end and not before`, at(1).frame === CUT_FPS && !at(9.99).done && at(10).done);
  // A face told at the end of a walk is where he ends up facing.
  const told = compileCutscene({ ...def, cast: { a: { who: def.cast.a.who, keys: [{ t: 0, at: [0, 0, 0], face: 0 }, { t: 2, at: [4, 0, 0], face: Math.PI }] } } });
  check('told which way to face at the end of a walk, he walks facing his way and turns to it as he arrives', near(sampleCutscene(told, 1).cast.a.facing, Math.PI / 2) && near(Math.abs(sampleCutscene(told, 2).cast.a.facing), Math.PI));
  check('a scene with mistakes in it is told what they are: a key after the end, someone never put anywhere, a view watching nobody', (() => {
    const bad = checkCutscene({ ...def, cast: { a: { who: def.cast.a.who, keys: [{ t: 11, doing: 'lean' }] } }, cam: [{ t: 0, pos: [0, 0, 0], watch: 'ghost' }] });
    return bad.some((b) => b.includes('outside the scene')) && bad.some((b) => b.includes('never put anywhere')) && bad.some((b) => b.includes('ghost'));
  })());
}

// ---------------------------------------------------------------- every kind of character takes its strings
{
  const frame = (over: object = {}) => ({ visible: true, x: 2, y: 0, z: 3, facing: 0.7, speed: 0, hopY: 0, headYaw: 0, headPitch: 0, leanFwd: 0, leanSide: 0, doing: 'stand', seated: false, talking: false, ...over });
  /** Where every piece of a model is, as one list of numbers: to tell whether a pose moved anything. */
  const shape = (root: THREE.Object3D): number[] => {
    root.updateMatrixWorld(true);
    const out: number[] = [];
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
      const q = new THREE.Quaternion().setFromRotationMatrix(o.matrixWorld);
      out.push(p.x, p.y, p.z, q.x, q.y, q.z, q.w);
    });
    return out;
  };
  const moved = (a: number[], b: number[]): number => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
  const all: Array<[string, Parameters<typeof makePuppet>[0]]> = [
    ['the knight', { is: 'knight' }],
    ...PUPPET_NPCS.map((k): [string, Parameters<typeof makePuppet>[0]] => [`a ${k}`, { is: 'npc', kind: k, name: k === 'villain' ? 'Lord Grimsqueak' : k === 'pigeon' ? 'Dizzy Dave' : 'Someone' }]),
    ...PUPPET_FOES.map((t): [string, Parameters<typeof makePuppet>[0]] => [`a ${t} (the creature)`, { is: 'foe', type: t }]),
  ];
  const wrong: string[] = [];
  for (const [name, who] of all) {
    try {
      const p = makePuppet(who);
      p.pose(frame(), 1 / 30);
      const here = p.root.position.clone();
      if (!near(here.x, 2) || !near(here.z, 3)) wrong.push(`${name} is not where it was put`);
      const yaw = new THREE.Euler().setFromQuaternion(p.root.quaternion, 'YXZ').y;
      if (!near(yaw, 0.7, 1e-4)) wrong.push(`${name} faces ${yaw.toFixed(2)}, not where it was told`);
      // (A held pose settles over a few frames: some heads ease to where they are told.)
      const settle = (over: object): number[] => {
        for (let i = 0; i < 12; i++) p.pose(frame(over), 1 / 30);
        return shape(p.root);
      };
      // (Nodded against un-nodded at the SAME moment of its own idling: a twin, posed alongside.)
      const twin = makePuppet(who);
      const settleTwin = (over: object): number[] => {
        for (let i = 0; i < 13; i++) twin.pose(frame(over), 1 / 30);
        return shape(twin.root);
      };
      const still = settle({});
      if (moved(settleTwin({}), settle({ headPitch: 0.4 }).length ? shape(p.root) : []) < 0.004 && moved(still, shape(p.root)) < 0.004) wrong.push(`${name} does not nod`);
      p.pose(frame({ leanFwd: 0.3 }), 0);
      if (moved(still, shape(p.root)) < 0.01) wrong.push(`${name} does not lean`);
      p.pose(frame({ hopY: 0.5 }), 0);
      if (!near(p.root.position.y, 0.5, 0.06)) wrong.push(`${name} does not hop`);
      p.pose(frame({ headYaw: 0.8 }), 0);
      for (let i = 0; i < 20; i++) p.pose(frame({ x: 2 + i * 0.05, speed: 1.5, talking: true }), 1 / 30);
      if (shape(p.root).some((v) => !Number.isFinite(v))) wrong.push(`${name} came apart (a number that is not a number)`);
    } catch (e) {
      wrong.push(`${name}: ${(e as Error).message}`);
    }
  }
  check(`EVERY character can be cast and takes its strings: the knight, the ${PUPPET_NPCS.length} kinds of talking character and ${PUPPET_FOES.length} creatures that walk. Each is put where it is told, faces where it is told, nods (its head, or its whole body if it has no nod of its own), leans, hops, walks and talks`, all.length === 1 + PUPPET_NPCS.length + PUPPET_FOES.length && wrong.length === 0, wrong.join('; '));
  // A patron's own poses, by name.
  const fox = makePuppet({ is: 'npc', kind: 'fox', name: 'Vix' });
  fox.pose(frame(), 1 / 30);
  const standing = shape(fox.root);
  fox.pose(frame({ seated: true }), 1 / 30);
  const sitting = shape(fox.root);
  fox.pose(frame({ doing: 'lean' }), 1 / 30);
  check('a patron takes his own poses by name: sitting is not standing, and leaning is neither', moved(standing, sitting) > 0.1 && moved(standing, shape(fox.root)) > 0.05);
  const rat = makePuppet({ is: 'knight' });
  for (let i = 0; i < 20; i++) rat.pose(frame(), 1 / 30);
  const ratStill = shape(rat.root);
  for (let i = 0; i < 30; i++) rat.pose(frame({ doing: 'cheer' }), 1 / 30);
  check('the knight takes the story\'s gestures by name (a cheer)', moved(ratStill, shape(rat.root)) > 0.05);
  let said = '';
  try {
    makePuppet({ is: 'foe', type: 'bat' });
  } catch (e) {
    said = (e as Error).message;
  }
  check('one that has NOT been taught says so plainly (the fliers and the three great beasts): it is not cast as something else', said.includes('bat') && said.includes('yet'));
}

// ---------------------------------------------------------------- the four first scenes
{
  const hub = levelById('hub')!;
  const cs: Aabb[] = hub.solids.map((b) => aabbOf(b));
  const inSolid = (x: number, y: number, z: number): boolean => cs.some((b) => x > b.min.x && x < b.max.x && y > b.min.y && y < b.max.y && z > b.min.z && z < b.max.z);
  check('there are four to begin with, the four he named: two talking at a table, one ordering another a drink, a glass slid down the bar, the soldier drinking alone', CUTSCENES.slice(0, 4).map((c) => c.id).join() === 'table-talk,a-drink-for-a-friend,down-the-bar,the-soldier-alone' && new Set(CUTSCENES.map((c) => c.name)).size === CUTSCENES.length && !!cutsceneById('down-the-bar') && !cutsceneById('nope'));
  for (const def of CUTSCENES) {
    const bad = checkCutscene(def);
    const sc = compileCutscene(def);
    // Everyone who stands, stands on floor (one who sits is on his stool, which is a solid thing); nobody is outside the room.
    const lost: string[] = [];
    let camIn = 0;
    let camLow = 0;
    for (let t = 0; t <= def.length; t += 0.25) {
      const f = sampleCutscene(sc, t);
      for (const [name, a] of Object.entries(f.cast)) {
        if (!a.visible || a.seated) continue;
        if (!standsOn(cs, a.x, a.y, a.z, 0.12)) lost.push(`${name} at ${t.toFixed(2)} (${a.x.toFixed(1)}, ${a.z.toFixed(1)})`);
      }
      if (inSolid(...f.cam.pos)) camIn++;
      if (f.cam.pos[1] < 0.3 || Math.abs(f.cam.pos[0]) > 23.5 || Math.abs(f.cam.pos[2]) > 21.5) camLow++;
    }
    const cast = Object.values(def.cast);
    const stage = new CutStage(sc);
    let broke = '';
    try {
      for (let fr = 0; fr <= def.length * CUT_FPS; fr++) stage.apply(sampleCutscene(sc, fr / CUT_FPS), 1 / CUT_FPS);
    } catch (e) {
      broke = (e as Error).message;
    }
    const end = sampleCutscene(sc, def.length);
    const placed = Object.entries(stage.cast).every(([name, p]) => near(p.root.position.x, end.cast[name].x) && near(p.root.position.z, end.cast[name].z));
    check(`"${def.name}": played in the Club, ${def.length} seconds, ${cast.length} in it; its keys are sound; whoever stands, stands on the floor; the view is never inside a wall, under the floor or outside the room; and it plays through on real models, every frame, each left where the last frame has it`, def.level === 'hub' && bad.length === 0 && lost.length === 0 && camIn === 0 && camLow === 0 && !broke && placed && def.name === def.name.toUpperCase() && def.name.length <= 24, [...bad, ...lost.slice(0, 3), camIn ? `the view is in a wall for ${camIn} samples` : '', camLow ? `the view is out of the room for ${camLow}` : '', broke].filter(Boolean).join('; '));
  }
  // The four he asked for next (2026-11-17): Dizzy Dave's four bars, and three more with others of the Club.
  {
    const more = CUTSCENES.slice(4).map((c) => c.id);
    check('four more after them: Dizzy Dave live, the foxes at cards, two at the bar, the old stag by himself', more.join() === 'dizzy-dave-live,a-hand-of-cards,two-at-the-bar,the-old-stag');
    const live = cutsceneById('dizzy-dave-live')!;
    const sc = compileCutscene(live);
    check('Dizzy Dave\'s is four bars of the Club\'s own music to the beat: 86 to the minute, so a little over eleven seconds', Math.abs(BEAT - 60 / 86) < 1e-9 && Math.abs(live.length - BEAT * 16) < 1e-9 && live.length > 10 && live.length < 12);
    // Danced on the beat: each dancer is in the air half way between beats and down on every beat.
    let up = 0;
    let down = 0;
    for (let b = 1; b < 16; b++) {
      for (const who of ['jinx', 'vix']) {
        if (sampleCutscene(sc, (b + 0.5) * BEAT).cast[who].hopY > 0.1) up++;
        if (sampleCutscene(sc, b * BEAT).cast[who].hopY < 0.03) down++;
      }
    }
    check('...the two on the floor come down on every beat and are in the air between them; Dave is on his stage throughout, facing them', up >= 28 && down === 30 && [0, 3, 6, 9, 11].every((t) => Math.abs(sampleCutscene(sc, t).cast.dave.z + 16.5) < 0.01 && sampleCutscene(sc, t).cast.dave.y === 0.8), `${up} up, ${down} down`);
    const cuts = live.cam.filter((k) => k.cut).map((k) => k.t / (BEAT * 4));
    check('...the view is cut on the bar and the half bar, goes right in on him, and ends away up over the room', cuts.every((c) => Math.abs(c * 2 - Math.round(c * 2)) < 1e-6) && cuts.length >= 5 && Math.min(...live.cam.filter((k) => k.pos).map((k) => Math.hypot(k.pos![0], k.pos![2] + 16.5))) < 2.2 && live.cam[live.cam.length - 1].pos![1] > 5);
  }
  // The thimble.
  for (const id of ['a-drink-for-a-friend', 'down-the-bar']) {
    const def = cutsceneById(id)!;
    const sc = compileCutscene(def);
    let off = 0;
    let far = 0;
    let first: number | null = null;
    let last = 0;
    for (let t = 0; t <= def.length; t += 0.05) {
      const p = sampleCutscene(sc, t).props.thimble;
      if (!p.visible) continue;
      if (!near(p.y, BAR.top) || p.x < BAR.x0 || p.x > BAR.x1 || p.z < BAR.z0 || p.z > BAR.z1) off++;
      first ??= p.z;
      last = p.z;
      far = Math.max(far, Math.abs(p.z - first));
    }
    check(`"${def.name}": the thimble is on the bar's top the whole time it is seen, and goes along it${id === 'down-the-bar' ? ' most of its length (over four units), stopping at the knight\'s place' : ''}`, off === 0 && far > (id === 'down-the-bar' ? 4 : 1), `${off} samples off the bar; it travels ${far.toFixed(2)} (from ${first?.toFixed(1)} to ${last.toFixed(1)})`);
  }
  // The slide comes to rest: fast at first, slow at the end.
  {
    const sc = compileCutscene(cutsceneById('down-the-bar')!);
    const z = (t: number): number => sampleCutscene(sc, t).props.thimble.z;
    check('the glass slid down the bar goes off quick and COMES TO REST: it covers far more ground in its first half second than in its last', z(4.95) - z(4.45) > 3 * (z(6.4) - z(5.9)), `${(z(4.95) - z(4.45)).toFixed(2)} then ${(z(6.4) - z(5.9)).toFixed(2)}`);
    const sold = compileCutscene(cutsceneById('the-soldier-alone')!);
    const c0 = sampleCutscene(sold, 0).cam;
    const c1 = sampleCutscene(sold, 9).cam;
    const c2 = sampleCutscene(sold, 18).cam;
    const ang = (c: typeof c0): number => Math.atan2(c.pos[0] - c.look[0], c.pos[2] - c.look[2]);
    check('the soldier\'s scene PANS ROUND HIS TABLE: once all the way round in its eighteen seconds (half way, it is on the far side), drawing in, looking at the table throughout', near(Math.abs(Math.atan2(Math.sin(ang(c1) - ang(c0)), Math.cos(ang(c1) - ang(c0)))), Math.PI, 1e-6) && near(Math.atan2(Math.sin(ang(c2) - ang(c0)), Math.cos(ang(c2) - ang(c0))), 0, 1e-6) && Math.hypot(c2.pos[0] - c2.look[0], c2.pos[2] - c2.look[2]) < Math.hypot(c0.pos[0] - c0.look[0], c0.pos[2] - c0.look[2]) && near(c0.look[0], c2.look[0]));
    const cast = cutsceneById('the-soldier-alone')!.cast.nib.who;
    check('"the soldier" is the off-duty ant, Corporal Nib, drinking: cast whether or not he has been earned in the Club yet', cast.is === 'npc' && cast.kind === 'ant' && cast.name === 'Corporal Nib' && cutsceneById('the-soldier-alone')!.cast.nib.keys[0].doing === 'drink');
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
