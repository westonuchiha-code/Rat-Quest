/**
 * The story scenes of each level. A level can have an opening (played the first time he arrives) and an exit
 * (played as he steps up to the open door). Each is built from where things are in the room, so nothing here is drawn.
 */
import { headingTo } from './scene';
import type { ActorBeat, Beat, CamShot, SceneDef, V3 } from './scene';

export interface StoryCtx {
  /** Where he is standing when the scene is asked for. */
  x: number;
  z: number;
  facing: number;
  /** The floor height there. */
  y: number;
  exit: { x: number; z: number };
  /** Named places in the level that scenes are staged around (LevelDef.storySpots). */
  spots: Record<string, { x: number; y: number; z: number }>;
}

export interface LevelStory {
  /** Played the first time he arrives. */
  open?: (c: StoryCtx) => SceneDef;
  /** The opening waits until this other level has been cleared (the finale needs the lair behind him). */
  openAfter?: string;
  /** The opening plays even if this level was cleared before (a hub that has been visited already). */
  openEvenIfCleared?: boolean;
  /** The level's boss sleeps through the opening and joins the fight when it ends. */
  boss?: boolean;
  /** The opening starts with him at the level's start, whichever door he came in by (the ending, in the Club). */
  fromSpawn?: boolean;
  /** Played when the last enemy in the level has been beaten, before the door opens. `spots.foe` is where it fell. */
  after?: (c: StoryCtx) => SceneDef;
  /** Played as he steps up to the open door. */
  exit?: (c: StoryCtx) => SceneDef;
  /** Played when he breaks the crate standing on `spot`: a keepsake drops out and he picks it up. */
  find?: { spot: string; prop: 'compass' | 'charm' | 'lantern'; scene: (c: StoryCtx) => SceneDef };
  /** Played when he first walks within `r` of `spot`. */
  near?: { spot: string; r: number; scene: (c: StoryCtx) => SceneDef; /** Something lying there for him to pick up. */ prop?: 'compass' | 'charm' | 'lantern' | 'pack' };
}

/** Where the memory sets are built: far below any level. Memory scenes are staged around this point. */
export const STAGE = { x: 0, y: -300, z: 0 };
const S = (x: number, y: number, z: number): V3 => [STAGE.x + x, STAGE.y + y, STAGE.z + z];

/**
 * A memory: a quick dip to black, the camera cut down to a set with its cast in place, the warm tint on,
 * whatever happens there, and the same dip back to where the camera was.
 */
function memory(set: string, cam: CamShot, cast: Record<string, ActorBeat>, inner: Beat[], back: CamShot): Beat[] {
  const off: Record<string, ActorBeat> = {};
  for (const name of Object.keys(cast)) off[name] = { hide: true };
  return [
    { dur: 0.35, cover: 1, sound: 'memoryIn' },
    { dur: 0, set, memory: 1, cam, cut: true, cast },
    { dur: 0.6, cover: 0 },
    ...inner,
    { dur: 0.45, cover: 1, sound: 'memoryOut' },
    { dur: 0, set: null, memory: 0, cam: back, cut: true, cast: off },
    { dur: 0.45, cover: 0 },
  ];
}

/** A camera off to one side of him (the side nearer the middle of the room), looking at him. */
function sideShot(c: StoryCtx, at: { x: number; z: number }, towards: { x: number; z: number }, dist: number, height: number): CamShot {
  let dx = towards.x - at.x;
  let dz = towards.z - at.z;
  const dl = Math.hypot(dx, dz) || 1;
  dx /= dl;
  dz /= dl;
  // Perpendicular to the way he faces; pick the one that points back into the room.
  let px = -dz;
  let pz = dx;
  if (px * -at.x + pz * -at.z < 0) {
    px = -px;
    pz = -pz;
  }
  return { pos: [at.x + px * dist + dx * 0.9, c.y + height, at.z + pz * dist + dz * 0.9], track: true };
}

/**
 * He has broken a crate and something from the old days has dropped out. He steps up, stoops, picks it up,
 * turns it over, knows it. `recall` is the memory it brings back; `after` is what he does once it is put away.
 */
function findScene(id: string, c: StoryCtx, spot: string, recall: (back: CamShot) => Beat[], after: Beat[] = [], hung = false): SceneDef {
  const p = c.spots[spot];
  const d = Math.hypot(p.x - c.x, p.z - c.z);
  // He stops half a pace short of it. If he is standing on it already he stays put.
  const stand = d > 0.75 ? { x: p.x + ((c.x - p.x) / d) * 0.5, z: p.z + ((c.z - p.z) / d) * 0.5 } : { x: c.x, z: c.z };
  const wide = sideShot(c, stand, p, 2.8, 1.0);
  const close = sideShot(c, stand, p, 2.1, 0.85);
  return {
    id,
    stowed: true,
    beats: [
      { dur: 0.5, bars: 1, faceAt: [p.x, p.z], cam: wide },
      ...(d > 0.75 ? [{ dur: Math.max(0.4, (d - 0.5) / 2.2), walkTo: [stand.x, stand.z] as [number, number] }] : []),
      // On the ground he stoops for it; hung up (caught in a web) he reaches and pulls it free.
      { dur: hung ? 0.7 : 0.45, gesture: hung ? 'reachPaw' : 'pickUp', head: [0, hung ? 0 : 0.4] },
      { dur: hung ? 0.5 : 0.4, gesture: hung ? 'reachPaw' : 'pickUp', prop: 'hand', sound: hung ? ['keepsake', 'cloth'] : 'keepsake' },
      { dur: 1.9, gesture: 'inspect', head: [0.05, 0.5], cam: close }, // turns it over in his paws
      { dur: 0.6, gesture: 'inspect', head: [0, -0.12], sound: 'recall' }, // and knows it
      ...recall(close),
      { dur: 0.9, gesture: 'inspect', head: [0, 0.4] },
      { dur: 0.45, gesture: 'stowItem', head: [0, 0], sound: 'cloth' },
      { dur: 0.45, gesture: 'stowItem', prop: 'gone' },
      ...after,
      { dur: 0.4 },
      { dur: 1.0, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 2. An old compass in a crate. Memory: two small adventurers standing together before a far-off doorway. */
function capsFind(c: StoryCtx): SceneDef {
  return findScene('caps.find', c, 'keepsake', (back) =>
    memory(
      'doorway',
      { pos: S(1.5, 1.15, 3.6), look: S(0, 1.0, -8) },
      { young: { at: S(-0.42, 0, 0), face: Math.PI, head: [0, 0], scarf: false }, friend: { at: S(0.42, 0, 0.12), face: Math.PI, head: [0, 0], scarf: true } },
      [
        { dur: 1.3 },
        { dur: 0.8, cast: { friend: { head: [0.9, 0] } } }, // he turns to the knight
        { dur: 0.8, cast: { young: { head: [-0.85, 0] } } }, // who looks back
        { dur: 1.1 },
      ],
      back,
    ),
  );
}

/** Level 4 opening. A royal mark on the far wall of the old training hall; he looks at it a moment. */
function wavesOpen(c: StoryCtx): SceneDef {
  const m = c.spots.royal;
  return {
    id: 'waves.open',
    beats: [
      { dur: 0, bars: 1, cam: { pos: [c.x + 2.1, c.y + 1.3, c.z - 3.2], track: true }, cut: true },
      { dur: 0.9, gesture: 'hesitate' },
      { dur: 0.7, headAt: [m.x, m.z], head: [0, -0.3] },
      { dur: 1.7, cam: { pos: [m.x + 1.2, c.y + 2.2, m.z + 7], look: [m.x, m.y, m.z] } }, // the mark
      { dur: 1.4 },
      { dur: 0.6, head: [0, 0] },
      { dur: 1.3, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 5. A carved stone on the far platform. Memory: the two of them jumping a gap, a paw held out, a cheer. */
function leapNear(c: StoryCtx): SceneDef {
  const p = c.spots.stone;
  const here = { x: c.x, z: c.z };
  const shot = sideShot(c, here, p, 2.6, 1.0);
  return {
    id: 'leap.near',
    stowed: true,
    beats: [
      { dur: 0.6, bars: 1, faceAt: [p.x, p.z], cam: shot },
      { dur: 0.8, gesture: 'hesitate', head: [0, 0.1] },
      { dur: 0.9, gesture: 'reachPaw', head: [0, 0.15], sound: 'recall' }, // a paw towards the carving
      ...memory(
        'gap',
        { pos: S(4.6, 1.5, 0.4), look: S(0, 0.5, -0.1) },
        { young: { at: S(-0.3, 0, 4.4), face: Math.PI, scarf: false }, friend: { at: S(0.35, 0, 3.5), face: Math.PI, scarf: true } },
        [
          { dur: 0.6 },
          { dur: 0.5, cast: { friend: { walkTo: [0.35, 1.5] } } },
          { dur: 0.6, sound: 'whoosh', cast: { friend: { walkTo: [0.35, -1.6], hop: 0.9 } } },
          { dur: 0.4, cast: { friend: { walkTo: [0.35, -2.5] } } },
          { dur: 0.5, cast: { friend: { face: 0, gesture: 'reachPaw' } } }, // he turns and holds out a paw
          { dur: 0.6, cast: { young: { walkTo: [-0.2, 1.5] }, friend: { gesture: 'reachPaw' } } },
          { dur: 0.6, sound: 'whoosh', cast: { young: { walkTo: [-0.1, -1.55], hop: 0.75 }, friend: { gesture: 'reachPaw' } } },
          { dur: 0.4, cast: { young: { faceAt: [0.35, -2.5] } } },
          { dur: 1.3, sound: ['ratJump', 'ratJump2'], cast: { young: { gesture: 'cheer' }, friend: { gesture: 'cheer' } } },
          { dur: 0.5 },
        ],
        shot,
      ),
      { dur: 0.5 },
      { dur: 2.0, gesture: 'touchScarf', sound: 'cloth', head: [0.1, 0.45] }, // he looks down at his scarf
      { dur: 0.5, head: [0, 0] },
      { dur: 1.0, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 6. A little wooden whistle in a crate. Memory: his partner gives him the red scarf and sets it straight. */
function cratesFind(c: StoryCtx): SceneDef {
  return findScene(
    'crates.find',
    c,
    'keepsake',
    (back) =>
      memory(
        'gift',
        { pos: S(0.5, 0.85, 2.7), look: S(0, 0.5, 0) },
        { young: { at: S(-0.45, 0, 0), face: Math.PI / 2, scarf: false }, friend: { at: S(0.45, 0, 0), face: -Math.PI / 2, scarf: true } },
        [
          { dur: 1.1 },
          { dur: 0.9, cast: { friend: { gesture: 'touchScarf', head: [0, 0.3] } } }, // his paw goes to his own scarf
          { dur: 0.5, sound: 'cloth', cast: { friend: { gesture: 'adjust', scarf: false, head: [0, 0.2] }, young: { scarf: true } } }, // and now the knight has it
          { dur: 1.7, cast: { friend: { gesture: 'adjust', head: [0, 0.25] } } }, // he sets it straight, carefully
          { dur: 0.9, cast: { young: { head: [0, -0.2] }, friend: { head: [0, 0.05] } } }, // the knight looks at him
          { dur: 1.6 }, // a quiet moment
        ],
        back,
      ),
    [{ dur: 0.4 }, { dur: 2.1, gesture: 'touchScarf', sound: 'cloth', head: [0.1, 0.42] }, { dur: 0.5, head: [0, 0] }], // he touches the scarf he wears now
  );
}

/**
 * Level 7 opening. He hears marching: two of the king's collectors carry cheese into a tunnel under the royal mark.
 * Then an iron grate in the floor, and far below it a faint cold glow.
 */
function waterworksOpen(c: StoryCtx): SceneDef {
  const t = c.spots.tunnel;
  const g = c.spots.grate;
  const y = c.y;
  return {
    id: 'waterworks.open',
    beats: [
      { dur: 0, bars: 1, cut: true, cam: { pos: [c.x + 3, y + 1.4, c.z - 4.5], track: true } },
      { dur: 0.8, gesture: 'hesitate' },
      { dur: 0.8, headAt: [t.x, t.z] }, // something is coming: he looks east
      // The collectors, seen from across the landing.
      {
        dur: 0, cut: true, cam: { pos: [t.x - 11, y + 1.6, t.z + 5.5], look: [t.x - 5, y + 1.0, t.z] },
        cast: { guardA: { at: [t.x - 16, y, t.z], face: Math.PI / 2, gesture: 'carry' }, guardB: { at: [t.x - 17.7, y, t.z + 0.5], face: Math.PI / 2, gesture: 'carry' } },
      },
      {
        dur: 6.4, cam: { pos: [t.x - 8, y + 1.6, t.z + 5], look: [t.x, y + 1.3, t.z] },
        cast: { guardA: { walkTo: [t.x + 1.6, t.z], gesture: 'carry' }, guardB: { walkTo: [t.x + 1.4, t.z + 0.2], gesture: 'carry' } },
      },
      { dur: 0, cast: { guardA: { hide: true }, guardB: { hide: true } } },
      { dur: 0.9 }, // the empty tunnel, and the crown over it
      // Back to him. He crosses to the grate and looks down.
      { dur: 0, cut: true, cam: { pos: [c.x - 1.2, y + 2.4, c.z - 1.6], track: true }, head: [0, 0] },
      { dur: 1.9, walkTo: [g.x + 0.9, g.z + 0.7] },
      { dur: 0.7, faceAt: [g.x, g.z], head: [0, 0.55] },
      { dur: 1.8, cam: { pos: [g.x + 0.6, y + 3.6, g.z + 1.9], look: [g.x, y, g.z] }, sound: 'rumble' }, // down through the bars
      { dur: 1.3 },
      { dur: 0.6, head: [0, 0] },
      { dur: 1.3, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 8. A broken travelling lantern by the planks. Memory: the two of them crossing a gap, each helping the other. */
function plankpitNear(c: StoryCtx): SceneDef {
  return findScene('plankpit.near', c, 'keepsake', (back) =>
    memory(
      'gap',
      { pos: S(4.6, 1.5, 0.4), look: S(0, 0.5, -0.1) },
      { young: { at: S(-0.25, 0, 3.4), face: Math.PI, scarf: true }, friend: { at: S(0.35, 0, 4.3), face: Math.PI, scarf: false } },
      [
        { dur: 0.6 },
        // The knight goes first this time, and turns to help.
        { dur: 0.5, cast: { young: { walkTo: [-0.25, 1.5] } } },
        { dur: 0.6, sound: 'whoosh', cast: { young: { walkTo: [-0.25, -1.6], hop: 0.85 } } },
        { dur: 0.4, cast: { young: { walkTo: [-0.25, -2.3] } } },
        { dur: 0.5, cast: { young: { face: 0, gesture: 'reachPaw' } } },
        { dur: 0.6, cast: { friend: { walkTo: [0.3, 1.5] }, young: { gesture: 'reachPaw' } } },
        { dur: 0.6, sound: 'whoosh', cast: { friend: { walkTo: [0.2, -1.5], hop: 0.75 }, young: { gesture: 'reachPaw' } } },
        { dur: 0.6, cast: { friend: { faceAt: [-0.25, -2.3], gesture: 'reachPaw' }, young: { gesture: 'reachPaw' } } }, // paw to paw
        { dur: 0.9, cast: { friend: { gesture: 'reachPaw' }, young: { gesture: 'reachPaw' } } },
        { dur: 1.2, cast: { friend: { walkTo: [0.3, -5.2] }, young: { walkTo: [-0.3, -5.6] } } }, // and on they go, side by side
      ],
      back,
    ),
  );
}

/** Level 9 opening. Bare shelves. Pip looks at them, looks at the knight, and shrugs. */
function cellarsOpen(c: StoryCtx): SceneDef {
  const sh = c.spots.shelf;
  const pip = c.spots.pip;
  return {
    id: 'cellars.open',
    beats: [
      { dur: 0, bars: 1, cut: true, cam: { pos: [c.x - 1.6, c.y + 1.5, c.z - 1.6], look: [sh.x, c.y + 1.1, sh.z] }, npc: { pip: { lookAt: [sh.x, sh.z] } } },
      { dur: 0.7, faceAt: [pip.x, pip.z] },
      { dur: 1.9, cam: { pos: [c.x + 1.4, c.y + 1.3, c.z - 0.2], look: [sh.x + 0.6, c.y + 1.0, sh.z] } }, // the empty shelves
      { dur: 0.9, npc: { pip: { lookAt: 'hero' } } },
      { dur: 1.4, npc: { pip: { shrug: true } }, sound: 'talk' },
      { dur: 0.6 },
      { dur: 0.9, head: [0, 0.3] }, // the knight looks down
      { dur: 1.2, cam: 'game', bars: 0, head: [0, 0], npc: { pip: { lookAt: null } } },
    ],
  };
}

/** Level 10. On the second landing the camera leaves him and looks down the shaft: the kingdom's lamps, and the Deep Engine. */
function liftshaftNear(c: StoryCtx): SceneDef {
  const e = c.spots.engine;
  const edge = c.spots.edge;
  return {
    id: 'liftshaft.near',
    beats: [
      { dur: 0.6, bars: 1, cam: { pos: [c.x + 2.6, c.y + 1.3, c.z + 2.2], track: true } },
      { dur: Math.max(0.5, Math.hypot(edge.x - c.x, edge.z - c.z) / 2.2), walkTo: [edge.x, edge.z] },
      { dur: 0.7, faceAt: [e.x, e.z], gesture: 'hesitate' },
      { dur: 0.8, head: [0, 0.6] }, // he looks down
      { dur: 2.4, cam: { pos: [edge.x + 3.5, c.y + 9, edge.z + 4], look: [e.x, e.y, e.z] }, sound: 'rumble' }, // and so do we
      { dur: 3.4 }, // a pulse of light runs out through it
      { dur: 1.4, cam: { pos: [edge.x + 2.4, c.y + 1.2, edge.z + 2], track: true } },
      { dur: 0.6, head: [0, 0] },
      { dur: 1.1, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 11 opening. A machine eating cheese. It stalls, the light goes, the hall shakes; then it catches again. He watches. */
function furnaceOpen(c: StoryCtx): SceneDef {
  const m = c.spots.machine;
  return {
    id: 'furnace.open',
    beats: [
      { dur: 0, bars: 1, cut: true, cam: { pos: [m.x - 8.5, c.y + 2.4, m.z - 4.2], look: [m.x - 0.6, c.y + 2.2, m.z] } },
      { dur: 0.6, faceAt: [m.x, m.z] },
      { dur: 2.6, cam: { pos: [m.x - 6.5, c.y + 2.1, m.z - 2.6], look: [m.x - 0.6, c.y + 2.0, m.z] } }, // the wheel turns, the cheese goes in
      { dur: 0.3, power: 0, cover: 0.62, sound: 'gate' }, // it stops, and the light goes
      { dur: 1.9, shake: 0.07, sound: 'rumble' },
      { dur: 0.5, power: 1, cover: 0, sound: ['pipe', 'sparkle'] }, // and catches again
      { dur: 0.9 },
      { dur: 0, cut: true, cam: { pos: [c.x + 2.4, c.y + 1.2, c.z - 1.4], track: true } },
      { dur: 1.6, gesture: 'hesitate' }, // he has seen it
      { dur: 1.2, cam: 'game', bars: 0 },
    ],
  };
}

/**
 * Level 12. An old pack caught in a web by the door. Memory: the two of them by a fire; his partner sets the scarf
 * straight, the knight leans to him, and they sit. Then the faded portrait on the wall, and he knows the face.
 */
function webhollowNear(c: StoryCtx): SceneDef {
  const p = c.spots.portrait;
  const scene = findScene(
    'webhollow.near',
    c,
    'keepsake',
    (back) =>
      memory(
        'campfire',
        { pos: S(0.5, 0.75, 3.5), look: S(0, 0.42, -0.1) },
        { young: { at: S(-0.36, 0, -0.1), face: 0, scarf: true, gesture: 'sit' }, friend: { at: S(0.36, 0, -0.1), face: 0, scarf: false, gesture: 'sit' } },
        [
          { dur: 1.8, cast: { young: { gesture: 'sit' }, friend: { gesture: 'sit' } } },
          { dur: 0.7, cast: { young: { gesture: 'sit' }, friend: { gesture: 'sitReach', head: [-0.5, 0.1] } } },
          { dur: 1.9, sound: 'cloth', cast: { young: { gesture: 'sit', head: [0.3, 0.1] }, friend: { gesture: 'sitReach', head: [-0.5, 0.15] } } }, // he sets the scarf straight
          { dur: 0.8, cast: { young: { gesture: 'sitLean', head: [0.35, 0.05] }, friend: { gesture: 'sit', head: [-0.3, 0] } } }, // the knight leans towards him
          { dur: 3.2, cam: { pos: S(0.2, 0.7, 3.0), look: S(0, 0.42, -0.1) }, cast: { young: { gesture: 'sitLean' }, friend: { gesture: 'sit' } } }, // and they sit
        ],
        back,
      ),
    [],
    true,
  );
  // After the pack is put away: the portrait.
  const tail = scene.beats.splice(scene.beats.length - 2, 2);
  scene.beats.push(
    { dur: 0.7, faceAt: [p.x, p.z], head: [0, -0.35] },
    { dur: 1.6, cam: { pos: [p.x + 0.9, p.y - 0.3, p.z + 3.2], look: [p.x, p.y, p.z] } }, // a king, painted long ago
    { dur: 1.6, sound: 'recall' },
    { dur: 0, cut: true, cam: { pos: [c.spots.keepsake.x - 1.5, c.y + 1.0, c.spots.keepsake.z + 3.4], track: true } },
    { dur: 1.9, gesture: 'touchScarf', sound: 'cloth', head: [0, -0.2] }, // he knows that face
    { dur: 0.5, head: [0, 0] },
    ...tail,
  );
  return scene;
}

const GRIM = 'lord grimsqueak';
const grimSays = (line: string): { name: string; kind: string; line: string } => ({ name: 'Lord Grimsqueak', kind: 'villain', line });

/**
 * Level 13 opening. The doors shut. The camera goes up the hall to the thing floating over the dais. He gives his
 * speech and laughs; then he sees the scarf, and stops. Three short lines, a turn away, and he is gone from the dais.
 */
function lairOpen(c: StoryCtx): SceneDef {
  const g = c.spots.throne;
  const stop = { x: c.x, z: c.z - 7 };
  const onHim: CamShot = { pos: [g.x + 0.4, g.y + 1.3, g.z + 5.6], look: [g.x, g.y + 1.75, g.z] };
  return {
    id: 'lair.open',
    beats: [
      { dur: 0, bars: 1, cut: true, cam: { pos: [c.x + 2.4, c.y + 1.5, c.z - 4.5], track: true }, sound: 'gate' }, // the doors shut behind him
      { dur: 2.4, walkTo: [stop.x, stop.z], shake: 0.02 },
      { dur: 0.7, gesture: 'hesitate' },
      { dur: 3.4, cam: { pos: [g.x, g.y + 1.0, g.z + 9], look: [g.x, g.y + 1.8, g.z] }, npc: { [GRIM]: { lookAt: 'hero' } } }, // up the hall to the dais
      { dur: 4.6, say: grimSays('Many have come before you... none of them squeaked for very long.'), sound: 'villainLaugh' },
      { dur: 1.5, cam: onHim }, // the laugh hangs
      // The scarf.
      { dur: 0, cut: true, cam: { pos: [stop.x + 0.8, c.y + 1.0, stop.z - 1.7], look: [stop.x, c.y + 0.72, stop.z] } },
      { dur: 1.4 },
      { dur: 0, cut: true, cam: onHim, npc: { [GRIM]: { still: true } } }, // he stops
      { dur: 1.3 },
      { dur: 2.0, say: grimSays('That scarf...') },
      { dur: 1.3 },
      { dur: 2.2, say: grimSays('Still wearing it?') },
      { dur: 0, cut: true, cam: { pos: [stop.x + 1.5, c.y + 1.15, stop.z - 2.3], track: true } },
      { dur: 2.0, gesture: 'touchScarf', sound: 'cloth', head: [0, 0.15] }, // the knight says nothing
      { dur: 0, cut: true, cam: onHim },
      { dur: 1.6, npc: { [GRIM]: { lookAt: [g.x, g.z - 10], bow: 0.8 } } }, // he turns away; the king is gone for a moment
      { dur: 2.6, say: grimSays('Go home, old friend.') },
      { dur: 1.0 },
      { dur: 0, cut: true, cam: { pos: [stop.x + 3.6, c.y + 2.4, stop.z + 3], look: [g.x, c.y + 1.4, c.spots.arena.z] } },
      { dur: 0.6, npc: { [GRIM]: { gone: true, still: false, bow: 0 } }, sound: ['sparkle', 'rumble'], shake: 0.06 }, // and he is in the hall
      { dur: 0.7 },
      { dur: 1.1, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 13, after the fight. He is not beaten for good: he hangs there, looks at the knight, and goes down the passage under the throne. The floor shakes. */
function lairAfter(c: StoryCtx): SceneDef {
  const f = c.spots.foe;
  const far: V3 = [c.exit.x, c.spots.throne.y, c.exit.z + 1];
  return {
    id: 'lair.after',
    beats: [
      {
        dur: 0, bars: 1, cut: true, cam: { pos: [f.x + 2.8, f.y + 1.5, f.z + 3.4], look: [f.x, f.y + 1.1, f.z] },
        npc: { [GRIM]: { at: [f.x, f.y, f.z], gone: false, still: true, low: 0.6, bow: 1, lookAt: 'hero' } },
      },
      { dur: 1.9, faceAt: [f.x, f.z] }, // head down
      { dur: 1.3, npc: { [GRIM]: { bow: 0 } }, gesture: 'hesitate' }, // he looks at the knight
      { dur: 1.2 },
      { dur: 1.3, npc: { [GRIM]: { lookAt: [far[0], far[2]], low: 0, still: false } } }, // and turns away
      { dur: 3.4, npc: { [GRIM]: { moveTo: far } }, cam: { pos: [c.x + 1.8, c.y + 1.7, c.z + 3], look: [far[0], far[1] + 1.6, far[2]] }, sound: 'whoosh' }, // to the passage under the throne
      { dur: 0.4, npc: { [GRIM]: { gone: true } } },
      { dur: 2.2, shake: 0.09, power: 0, sound: 'rumble' }, // far below, the machinery shudders
      { dur: 0.8, power: 1 },
      { dur: 1.1, cam: 'game', bars: 0 },
    ],
  };
}

/**
 * Level 14, the ending. He walks into Dave's Spot. Dave stops; Mort and Wren look round. The camera pulls back.
 * The kingdom, every lamp lit and the Engine steady. Then Grimsqueak beside him, on the ground; a paw held out, and taken.
 */
function davespotOpen(c: StoryCtx): SceneDef {
  const here = { x: c.x, z: c.z - 3.5 };
  const him = { x: here.x + 1.35, z: here.z };
  const s = c.spots;
  const two: CamShot = { pos: [here.x - 2.4, c.y + 1.25, here.z - 2.6], look: [here.x + 0.7, c.y + 0.8, here.z] };
  return {
    id: 'davespot.open',
    stowed: true,
    sheathe: true,
    beats: [
      { dur: 0, bars: 1, cut: true, cam: { pos: [c.x + 3.2, c.y + 1.7, c.z - 5.5], track: true } },
      { dur: 1.9, walkTo: [here.x, here.z] },
      { dur: 0.6 },
      { dur: 0, cut: true, cam: { pos: [s.dave.x + 1.6, s.dave.y + 1.3, s.dave.z + 4.6], look: [s.dave.x, s.dave.y + 0.8, s.dave.z] }, npc: { 'dizzy dave': { still: true, lookAt: 'hero' } } },
      { dur: 1.6 }, // Dave stops dancing
      { dur: 0, cut: true, cam: { pos: [s.mort.x + 2.6, s.mort.y + 1.1, s.mort.z + 2.2], look: [s.mort.x, s.mort.y + 0.6, s.mort.z] }, npc: { 'mellow mort': { lookAt: 'hero' } } },
      { dur: 1.4 }, // Mort looks up
      { dur: 0, cut: true, cam: { pos: [s.wren.x - 2.6, s.wren.y + 1.2, s.wren.z + 2.2], look: [s.wren.x, s.wren.y + 0.7, s.wren.z] }, npc: { wren: { lookAt: 'hero' } } },
      { dur: 1.4 }, // Wren turns
      { dur: 0, cut: true, cam: { pos: [here.x + 1.1, c.y + 1.25, here.z - 2.8], track: true } },
      { dur: 1.2 }, // he stands quietly
      { dur: 3.8, cam: { pos: [here.x + 3.4, c.y + 4.4, here.z - 8], look: [here.x, c.y + 0.8, here.z] } }, // the camera pulls back
      { dur: 0.6, cover: 1 },
      { dur: 0, cut: true, set: 'vista', cam: { pos: S(0, 13, 19), look: S(0, 0, 0) } },
      { dur: 0.8, cover: 0, sound: 'memoryIn' },
      { dur: 3.8, cam: { pos: S(0, 16.5, 24), look: S(0, 0, 0) } }, // the lights, steady
      { dur: 0.6, cover: 1 },
      {
        dur: 0, cut: true, set: null, cam: two,
        npc: { [GRIM]: { at: [him.x, c.y, him.z], gone: false, still: true, low: 1, bow: 1, reach: 0, lookAt: [him.x, him.z + 6] }, 'dizzy dave': { still: false, lookAt: null } },
      },
      { dur: 0.8, cover: 0 },
      { dur: 2.0 }, // he looks at the floor
      { dur: 1.3, npc: { [GRIM]: { bow: 0, lookAt: 'hero' } }, faceAt: [him.x, him.z] }, // then at the knight
      { dur: 0.6 },
      { dur: 1.6, gesture: 'reachPaw', sound: 'cloth' }, // the knight holds out a paw
      { dur: 1.5, gesture: 'reachPaw' }, // he hesitates
      { dur: 1.5, gesture: 'reachPaw', npc: { [GRIM]: { reach: 1 } }, sound: 'recall' }, // and takes it
      { dur: 3.4, gesture: 'reachPaw', cam: { pos: [here.x - 4.4, c.y + 2.3, here.z - 5.4], look: [here.x + 0.7, c.y + 0.8, here.z] } }, // they stand together
      { dur: 2.8, gesture: 'reachPaw', cover: 1 }, // the music goes on; the picture goes
      { dur: 1.0, gesture: 'reachPaw' },
      { dur: 0, cut: true, cam: 'game', bars: 0, npc: { wren: { lookAt: null }, 'mellow mort': { lookAt: null } } },
      { dur: 1.6, cover: 0 },
    ],
  };
}

export const STORY: Record<string, LevelStory> = {
  sewer: { open: sewerOpen, exit: sewerExit },
  caps: { find: { spot: 'keepsake', prop: 'compass', scene: capsFind } },
  waves: { open: wavesOpen },
  // Wide enough that walking up to the door passes through it, small enough that landing on the platform does not.
  leap: { near: { spot: 'stone', r: 3.0, scene: leapNear } },
  crates: { find: { spot: 'keepsake', prop: 'charm', scene: cratesFind } },
  waterworks: { open: waterworksOpen },
  plankpit: { near: { spot: 'keepsake', r: 3.0, prop: 'lantern', scene: plankpitNear } },
  cellars: { open: cellarsOpen },
  liftshaft: { near: { spot: 'landing', r: 2.6, scene: liftshaftNear } },
  furnace: { open: furnaceOpen },
  webhollow: { near: { spot: 'keepsake', r: 4.5, prop: 'pack', scene: webhollowNear } },
  lair: { open: lairOpen, boss: true, after: lairAfter },
  davespot: { open: davespotOpen, openAfter: 'lair', openEvenIfCleared: true },
  // The ending now plays in the Club: home after the Keep. Dave, Mort and Wren are all there.
  hub: { open: (c) => ({ ...davespotOpen(c), id: 'hub.open' }), openAfter: 'lair', openEvenIfCleared: true, fromSpawn: true },
};

/** The sewer chamber: the tunnel mouth he arrives by (on the south wall) and where he stops to look about. */
export const SEWER = {
  tunnel: { x: 5, z: 20 },
  stop: { x: 4.2, z: 14.6 },
  /** The old adventuring mark, on the east wall beside where the door appears. */
  mark: { x: 20, y: 1.7, z: 3.6 },
};

/**
 * Level 1 opening. Dark. A tunnel mouth. He walks out of it, stops at the edge of the chamber, looks about,
 * touches his scarf, looks towards the way deeper in, and the camera settles behind him.
 */
function sewerOpen(c: StoryCtx): SceneDef {
  const { tunnel, stop } = SEWER;
  const y = c.y;
  // Behind his shoulder as he faces the east wall, close to where the game camera will sit.
  const dx = c.exit.x - stop.x;
  const dz = c.exit.z - stop.z;
  const dl = Math.hypot(dx, dz) || 1;
  return {
    id: 'sewer.open',
    stowed: true,
    start: { x: tunnel.x, z: tunnel.z + 0.9, facing: Math.PI },
    beats: [
      { dur: 0, cover: 1, bars: 1, cam: { pos: [2.4, y + 1.1, 12.6], look: [tunnel.x, y + 1.1, tunnel.z] }, cut: true },
      { dur: 1.8, cover: 0 }, // the dark lifts on the empty tunnel
      { dur: 0.6 },
      { dur: 3.2, walkTo: [stop.x, stop.z], cam: { pos: [2.4, y + 1.1, 12.6], look: [tunnel.x, y + 1.1, tunnel.z], track: true } },
      { dur: 0.7, gesture: 'hesitate' },
      { dur: 0.9, head: [0.95, -0.05] }, // looks one way
      { dur: 0.5 },
      { dur: 1.2, head: [-0.95, -0.05] }, // and the other
      { dur: 0.5 },
      { dur: 0.6, head: [0, 0.3] },
      { dur: 2.2, gesture: 'touchScarf', sound: 'cloth', head: [0.12, 0.42], cam: { pos: [3.1, y + 0.95, 12.9], track: true } },
      { dur: 0.6, head: [0, 0] },
      { dur: 1.3, faceAt: [c.exit.x, c.exit.z], cam: { pos: [stop.x - (dx / dl) * 4.6, y + 2.3, stop.z - (dz / dl) * 4.6], look: [stop.x + (dx / dl) * 3, y + 0.7, stop.z + (dz / dl) * 3] } },
      { dur: 1.3 }, // he looks towards the way deeper underground
      { dur: 1.4, cam: 'game', bars: 0 },
    ],
  };
}

/** Level 1 ending. At the door he glances back the way he came, then turns to go on. */
function sewerExit(c: StoryCtx): SceneDef {
  const { tunnel } = SEWER;
  const bx = tunnel.x - c.x;
  const bz = tunnel.z - c.z;
  const bl = Math.hypot(bx, bz) || 1;
  const toDoor = headingTo(c.x, c.z, c.exit.x, c.exit.z);
  // Which way round he turns to look back: the short way.
  const side = Math.sign(Math.atan2(Math.sin(headingTo(c.x, c.z, tunnel.x, tunnel.z) - toDoor), Math.cos(headingTo(c.x, c.z, tunnel.x, tunnel.z) - toDoor))) || 1;
  return {
    id: 'sewer.exit',
    hold: true,
    beats: [
      // The camera stands a little way back along the line to the tunnel, so he looks past it over his shoulder.
      { dur: 0.6, bars: 1, faceAt: [c.exit.x, c.exit.z], cam: { pos: [c.x + (bx / bl) * 3.4 - (bz / bl) * 0.9, c.y + 1.25, c.z + (bz / bl) * 3.4 + (bx / bl) * 0.9], track: true } },
      { dur: 0.4, gesture: 'hesitate' },
      { dur: 0.9, face: toDoor + side * 0.55, headAt: [tunnel.x, tunnel.z] }, // a half turn of the shoulders, and the head the rest of the way
      { dur: 1.1 },
      { dur: 0.7, face: toDoor, head: [0, 0] },
      { dur: 0.3 },
    ],
  };
}


export const STORY_KEY = 'ratquest.story.v1';

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Which scenes he has already been shown, so an opening plays once per new game. */
export class StorySeen {
  private readonly seen_ = new Set<string>();

  constructor(private readonly storage: Store | null = null) {
    this.read();
  }

  /** Reads it again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.seen_.clear();
    this.read();
  }

  private read(): void {
    try {
      const d = JSON.parse(this.storage?.getItem(STORY_KEY) ?? '[]') as unknown;
      for (const id of Array.isArray(d) ? d : []) if (typeof id === 'string') this.seen_.add(id);
    } catch {
      // A broken save is ignored.
    }
  }

  seen(id: string): boolean {
    return this.seen_.has(id);
  }

  mark(id: string): void {
    this.seen_.add(id);
    this.save();
  }

  reset(): void {
    this.seen_.clear();
    this.save();
  }

  private save(): void {
    try {
      this.storage?.setItem(STORY_KEY, JSON.stringify([...this.seen_]));
    } catch {
      // Saving is best effort.
    }
  }
}
