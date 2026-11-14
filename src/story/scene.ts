/**
 * Story scenes. A scene is a list of beats: he walks somewhere, turns, looks at something, makes a small gesture,
 * while the camera sits where the beat puts it. No words. Everything is plain timing data worked out from the clock,
 * so a test can run a scene in node and a dev hash can jump to any moment of it.
 */
export type V3 = [number, number, number];

/** Small story motions laid over his normal standing or walking pose. */
export type Gesture = 'touchScarf' | 'reachPaw' | 'hesitate' | 'pickUp' | 'inspect' | 'stowItem' | 'adjust' | 'cheer' | 'carry' | 'sit' | 'sitReach' | 'sitLean';

export interface CamShot {
  pos: V3;
  /** A fixed point to look at. */
  look?: V3;
  /** Look at him instead (or as well: with `look`, the camera starts on the point and follows him as he moves). */
  track?: boolean;
}

/** Direction for one of the level's own characters. What is left out stays as it was. */
export interface NpcBeat {
  lookAt?: [number, number] | 'hero' | null;
  /** A shrug held for this beat. */
  shrug?: boolean;
  /** Put him here at once (x, floor height, z). */
  at?: V3;
  /** He glides here over the beat. */
  moveTo?: V3;
  gone?: boolean;
  /** He stops swaying or dancing. */
  still?: boolean;
  /** Grimsqueak: 0 floating, 1 down on the ground. */
  low?: number;
  /** Grimsqueak: head down, 0..1. */
  bow?: number;
  /** Grimsqueak: a paw held out, 0..1. */
  reach?: number;
}

/** What a level character is doing at one moment of a scene. Undefined means the scene has not said. */
export interface NpcFrame {
  lookAt: [number, number] | 'hero' | null;
  shrug: number;
  pos: V3 | null;
  gone?: boolean;
  still?: boolean;
  low?: number;
  bow?: number;
  reach?: number;
}

interface NpcState {
  lookAt: [number, number] | 'hero' | null;
  pos: V3 | null;
  gone?: boolean;
  still?: boolean;
  low?: number;
  bow?: number;
  reach?: number;
}

/** What one character does in a beat. The hero's are written straight on the beat; anyone else's go under `cast`. */
export interface ActorBeat {
  /** Put him here at once (x, floor height, z) and show him. For the cast of a memory. */
  at?: V3;
  /** Take him out of the picture. */
  hide?: boolean;
  /** He walks in a straight line to this spot (x, z), arriving as the beat ends. */
  walkTo?: [number, number];
  /** With `walkTo`: he jumps there instead, rising this high on the way. */
  hop?: number;
  face?: number;
  faceAt?: [number, number];
  head?: [number, number];
  headAt?: [number, number];
  gesture?: Gesture;
  /** Whether he is wearing the scarf from now on. */
  scarf?: boolean;
}

export interface Beat {
  /** Seconds. 0 sets everything at once, for the state a scene opens in. */
  dur: number;
  /** Other characters in the scene, by name ('young' is the knight as he was, 'friend' his old partner). */
  cast?: Record<string, ActorBeat>;
  /** The memory set standing from this beat on, or null to take it away. */
  set?: string | null;
  /** The thing he has found: lying on the ground, in his paw, or put away. */
  prop?: 'ground' | 'hand' | 'gone';
  /** With `walkTo`: he jumps there instead, rising this high on the way. */
  hop?: number;
  /** He walks in a straight line to this spot (x, z), arriving as the beat ends. */
  walkTo?: [number, number];
  /** He turns his body to this heading (radians; 0 looks along +z). */
  face?: number;
  /** He turns his body towards this spot (x, z). */
  faceAt?: [number, number];
  /** His head, relative to his body: [turn (positive = his left), nod (positive = down)]. It stays there until changed. */
  head?: [number, number];
  /** He turns his head towards this spot (x, z), as far as his neck allows. */
  headAt?: [number, number];
  /** A gesture held for this beat. It eases in at the start and out at the end. */
  gesture?: Gesture;
  /** Where the camera is by the end of the beat. 'game' hands it back to the normal camera behind him. */
  cam?: CamShot | 'game';
  /** The camera jumps to `cam` instead of gliding. */
  cut?: boolean;
  /** Black cover over the picture at the end of the beat, 0..1. */
  cover?: number;
  /** Black bars top and bottom at the end of the beat, 0..1. */
  bars?: number;
  /** Flashback look (warm tint and soft edges) at the end of the beat, 0..1. */
  memory?: number;
  /** How strongly the kingdom's machinery runs by the end of the beat: 1 normally, 0 stalled. */
  power?: number;
  /** The ground shakes this hard for the length of the beat (0.05 is a rumble). */
  shake?: number;
  /** A sound (or several) played as the beat starts. */
  sound?: string | string[];
  /** The level's own characters (Pip, Finch...), by name: where they look, and a shrug held for this beat. */
  npc?: Record<string, NpcBeat>;
  /** A line spoken in the talk box for the length of this beat. No button: it goes when the beat does. */
  say?: { name: string; kind: string; line: string };
}

export interface SceneDef {
  id: string;
  /** Where he stands as the scene opens. Default: where he is. */
  start?: { x: number; z: number; facing: number };
  beats: Beat[];
  /** He plays the scene with his sword and shield on his back, and draws them as it ends. */
  stowed?: boolean;
  /** With `stowed`: he leaves them on his back afterwards. */
  sheathe?: boolean;
  /** Stay on the last frame when the scene ends (for a scene that leads straight into a fade to the next room). */
  hold?: boolean;
}

export interface SceneFrame {
  x: number;
  z: number;
  facing: number;
  /** How fast he is walking, for the walk animation. */
  speed: number;
  /** His height: the floor, or above it in the middle of a jump. */
  y: number;
  air: boolean;
  headYaw: number;
  headPitch: number;
  gesture: Gesture | null;
  gestureWeight: number;
  camPos: V3;
  camLook: V3;
  /** 0 = the normal game camera, 1 = the scene's camera. */
  camBlend: number;
  cover: number;
  bars: number;
  memory: number;
  /** Which beat is playing. */
  beat: number;
  done: boolean;
  /** Everyone else in the scene. */
  cast: Record<string, ActorFrame>;
  set: string | null;
  prop: 'ground' | 'hand' | 'gone';
  power: number;
  shake: number;
  /** Directions for the level's own characters. `lookAt` null means: as usual. */
  npc: Record<string, NpcFrame>;
  /** The line in the talk box, if any. */
  say: { name: string; kind: string; line: string } | null;
}

export interface ActorFrame {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  facing: number;
  speed: number;
  /** In the middle of a jump. */
  air: boolean;
  /** Rising (positive) or falling, for the jump pose. */
  vy: number;
  headYaw: number;
  headPitch: number;
  gesture: Gesture | null;
  gestureWeight: number;
  scarf: boolean;
}

interface ActorState {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  facing: number;
  headYaw: number;
  headPitch: number;
  scarf: boolean;
}

interface State {
  x: number;
  z: number;
  facing: number;
  headYaw: number;
  headPitch: number;
  camPos: V3;
  camLook: V3;
  track: number;
  camBlend: number;
  cover: number;
  bars: number;
  memory: number;
  cast: Record<string, ActorState>;
  set: string | null;
  prop: 'ground' | 'hand' | 'gone';
  npc: Record<string, NpcState>;
  power: number;
}

interface Key {
  t0: number;
  beat: Beat;
  from: State;
  to: State;
  /** Per character ('' is the hero): whether his gesture eases in at the start and out at the end of this beat. */
  ease: Record<string, [boolean, boolean]>;
}

export interface CompiledScene {
  def: SceneDef;
  total: number;
  /** Height of the floor he stands on. */
  y: number;
  keys: Key[];
}

/** How far he can turn his head from straight ahead. */
export const NECK_LIMIT = 1.35;
/** Height of the point on him the camera looks at when tracking. */
const LOOK_HEIGHT = 0.62;
const GESTURE_EASE = 0.35;
const TURN_TIME = 0.35;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (k: number): number => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const angleLerp = (a: number, b: number, k: number): number => a + wrap(b - a) * k;
/** Heading from one spot to another, in the game's convention (0 looks along +z). */
export const headingTo = (fromX: number, fromZ: number, toX: number, toZ: number): number => Math.atan2(toX - fromX, toZ - fromZ);

export function compileScene(def: SceneDef, at: { x: number; y: number; z: number; facing: number }): CompiledScene {
  const s0 = def.start ?? at;
  let cur: State = {
    x: s0.x, z: s0.z, facing: s0.facing, headYaw: 0, headPitch: 0,
    camPos: [s0.x, at.y + 2, s0.z], camLook: [s0.x, at.y + LOOK_HEIGHT, s0.z], track: 0, camBlend: 0, cover: 0, bars: 0, memory: 0,
    cast: {}, set: null, prop: 'ground', npc: {}, power: 1,
  };
  const keys: Key[] = [];
  let t = 0;
  for (const beat of def.beats) {
    const to: State = { ...cur, camPos: [...cur.camPos], camLook: [...cur.camLook], cast: { ...cur.cast } };
    if (beat.npc) {
      to.npc = { ...cur.npc };
      for (const [name, d] of Object.entries(beat.npc)) {
        const n: NpcState = { ...(to.npc[name] ?? { lookAt: null, pos: null }) };
        if (d.lookAt !== undefined) n.lookAt = d.lookAt;
        if (d.at) n.pos = [...d.at];
        if (d.moveTo) n.pos = [...d.moveTo];
        for (const key of ['gone', 'still'] as const) if (d[key] !== undefined) n[key] = d[key];
        for (const key of ['low', 'bow', 'reach'] as const) if (d[key] !== undefined) n[key] = d[key];
        to.npc[name] = n;
      }
    }
    if (beat.power !== undefined) to.power = beat.power;
    if (beat.set !== undefined) to.set = beat.set;
    if (beat.prop) to.prop = beat.prop;
    for (const [name, ab] of Object.entries(beat.cast ?? {})) {
      const a: ActorState = { ...(to.cast[name] ?? { visible: false, x: 0, y: at.y, z: 0, facing: 0, headYaw: 0, headPitch: 0, scarf: true }) };
      if (ab.at) {
        [a.x, a.y, a.z] = ab.at;
        a.visible = true;
      }
      if (ab.hide) a.visible = false;
      if (ab.walkTo) {
        if (Math.hypot(ab.walkTo[0] - a.x, ab.walkTo[1] - a.z) > 1e-6) a.facing = headingTo(a.x, a.z, ab.walkTo[0], ab.walkTo[1]);
        [a.x, a.z] = ab.walkTo;
      }
      if (ab.face !== undefined) a.facing = ab.face;
      if (ab.faceAt) a.facing = headingTo(a.x, a.z, ab.faceAt[0], ab.faceAt[1]);
      if (ab.head) [a.headYaw, a.headPitch] = ab.head;
      if (ab.headAt) a.headYaw = Math.max(-NECK_LIMIT, Math.min(NECK_LIMIT, wrap(headingTo(a.x, a.z, ab.headAt[0], ab.headAt[1]) - a.facing)));
      if (ab.scarf !== undefined) a.scarf = ab.scarf;
      to.cast[name] = a;
    }
    if (beat.walkTo) {
      const [wx, wz] = beat.walkTo;
      if (Math.hypot(wx - cur.x, wz - cur.z) > 1e-6) to.facing = headingTo(cur.x, cur.z, wx, wz);
      to.x = wx;
      to.z = wz;
    }
    if (beat.face !== undefined) to.facing = beat.face;
    if (beat.faceAt) to.facing = headingTo(to.x, to.z, beat.faceAt[0], beat.faceAt[1]);
    if (beat.head) [to.headYaw, to.headPitch] = beat.head;
    if (beat.headAt) to.headYaw = Math.max(-NECK_LIMIT, Math.min(NECK_LIMIT, wrap(headingTo(to.x, to.z, beat.headAt[0], beat.headAt[1]) - to.facing)));
    if (beat.cam === 'game') to.camBlend = 0;
    else if (beat.cam) {
      to.camPos = [...beat.cam.pos];
      to.track = beat.cam.track ? 1 : 0;
      to.camLook = beat.cam.look ? [...beat.cam.look] : [to.x, at.y + LOOK_HEIGHT, to.z];
      to.camBlend = 1;
    }
    if (beat.cover !== undefined) to.cover = beat.cover;
    if (beat.bars !== undefined) to.bars = beat.bars;
    if (beat.memory !== undefined) to.memory = beat.memory;
    keys.push({ t0: t, beat, from: cur, to, ease: {} });
    t += Math.max(0, beat.dur);
    cur = to;
  }
  // A gesture carried over several beats in a row is held, not dropped and picked up again at each join.
  const gestureOf = (k: Key | undefined, name: string): Gesture | undefined => (!k ? undefined : name === '' ? k.beat.gesture : k.beat.cast?.[name]?.gesture);
  keys.forEach((k, i) => {
    for (const name of ['', ...Object.keys(k.beat.cast ?? {})]) {
      const g = gestureOf(k, name);
      if (g) k.ease[name] = [gestureOf(keys[i - 1], name) !== g, gestureOf(keys[i + 1], name) !== g];
    }
  });
  return { def, total: t, y: at.y, keys };
}

export function sceneFrame(scene: CompiledScene, time: number): SceneFrame {
  const t = Math.min(Math.max(0, time), scene.total);
  // The beat in charge at this moment: the last one that has started. Beats of no length are passed over at once.
  let i = 0;
  for (let n = 0; n < scene.keys.length; n++) if (scene.keys[n].t0 <= t) i = n;
  const key = scene.keys[i];
  const { beat, from, to } = key;
  const k = beat.dur > 0 ? clamp01((t - key.t0) / beat.dur) : 1;
  const e = smooth(k);

  const x = lerp(from.x, to.x, beat.walkTo ? k : e);
  const z = lerp(from.z, to.z, beat.walkTo ? k : e);
  const walking = !!beat.walkTo && k > 0 && k < 1 && beat.dur > 0;
  const speed = walking ? Math.hypot(to.x - from.x, to.z - from.z) / beat.dur : 0;
  // Setting off on a walk he turns quickly; a turn on the spot takes the whole beat.
  const facing = angleLerp(from.facing, to.facing, beat.walkTo ? smooth((k * beat.dur) / TURN_TIME) : e);

  // The camera. Coming from the game camera there is nothing to glide from, so the shot is used as it is and blended in.
  const cut = beat.cut || from.camBlend === 0;
  const ck = cut ? 1 : e;
  const camPos = to.camBlend === 0 ? from.camPos : lerp3(from.camPos, to.camPos, ck);
  const fixed = to.camBlend === 0 ? from.camLook : lerp3(from.camLook, to.camLook, ck);
  const track = to.camBlend === 0 ? from.track : lerp(from.track, to.track, ck);
  const camLook = lerp3(fixed, [x, scene.y + LOOK_HEIGHT, z], track);

  const weightOf = (name: string): number => {
    const [easeIn, easeOut] = key.ease[name] ?? [true, true];
    return smooth(Math.min(easeIn ? k * beat.dur : Infinity, easeOut ? (1 - k) * beat.dur : Infinity, GESTURE_EASE) / GESTURE_EASE);
  };
  const gestureWeight = beat.gesture ? weightOf('') : 0;
  const hopping = !!beat.hop && walking;

  // The rest of the cast, each worked out the same way as him.
  const cast: Record<string, ActorFrame> = {};
  for (const [name, b] of Object.entries(to.cast)) {
    const ab = beat.cast?.[name];
    const a = from.cast[name] ?? b;
    // Someone who has just been placed is simply there; he does not slide in from wherever he was.
    const placed = !!ab?.at || !a.visible;
    const ak = placed ? 1 : ab?.walkTo ? k : e;
    const moving = !placed && !!ab?.walkTo && k > 0 && k < 1 && beat.dur > 0;
    const hop = moving && ab?.hop ? ab.hop : 0;
    cast[name] = {
      visible: b.visible,
      x: lerp(a.x, b.x, ak),
      y: b.y + 4 * hop * k * (1 - k),
      z: lerp(a.z, b.z, ak),
      facing: placed ? b.facing : angleLerp(a.facing, b.facing, ab?.walkTo ? smooth((k * beat.dur) / TURN_TIME) : e),
      speed: moving ? Math.hypot(b.x - a.x, b.z - a.z) / beat.dur : 0,
      air: hop > 0,
      vy: hop > 0 ? (4 * hop * (1 - 2 * k)) / beat.dur : 0,
      headYaw: placed ? b.headYaw : lerp(a.headYaw, b.headYaw, e),
      headPitch: placed ? b.headPitch : lerp(a.headPitch, b.headPitch, e),
      gesture: ab?.gesture ?? null,
      gestureWeight: ab?.gesture ? weightOf(name) : 0,
      scarf: b.scarf,
    };
  }
  return {
    x, z, facing, speed,
    headYaw: lerp(from.headYaw, to.headYaw, e),
    headPitch: lerp(from.headPitch, to.headPitch, e),
    gesture: beat.gesture ?? null,
    gestureWeight,
    camPos, camLook,
    camBlend: beat.cut ? to.camBlend : lerp(from.camBlend, to.camBlend, e),
    cover: lerp(from.cover, to.cover, k),
    bars: lerp(from.bars, to.bars, e),
    memory: lerp(from.memory, to.memory, e),
    beat: i,
    done: time >= scene.total,
    cast,
    power: lerp(from.power, to.power, k),
    shake: beat.shake && k < 1 ? beat.shake : 0,
    npc: Object.fromEntries(
      Object.entries(to.npc).map(([name, n]) => {
        const was = from.npc[name];
        // A glide runs over the beat; being placed (or having had no place before) is at once.
        const gliding = !!beat.npc?.[name]?.moveTo && !!was?.pos && !!n.pos;
        const f: NpcFrame = {
          ...n,
          pos: gliding ? lerp3(was.pos!, n.pos!, e) : n.pos,
          shrug: beat.npc?.[name]?.shrug ? smooth(Math.min(k * beat.dur, (1 - k) * beat.dur) / 0.25) : 0,
        };
        return [name, f];
      }),
    ),
    say: beat.say && k < 1 ? beat.say : null,
    set: to.set,
    prop: to.prop,
    y: scene.y + (hopping ? 4 * (beat.hop ?? 0) * k * (1 - k) : 0),
    air: hopping,
  };
}
