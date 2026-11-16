/**
 * CUTSCENES: little scenes played by marionettes.
 *
 * The owner, 2026-11-16: "a little cutscene system that works with all of our characters where we can sort of
 * marionette them around ... they can nod their head and move around a little bit to you know sort of look like
 * they're talking we don't have to actually like animate their mouths ... two of them talking at a table or at the
 * bar maybe one of them ordering the other one a drink or sliding a glass down the bar, you know the soldier and
 * drinking by himself maybe like you can pan around the table like a cool movie scene ... build something where we
 * can make scenes like this frame by frame so we can sort of tell a better story when we get around to actually
 * telling one."
 *
 * A scene is DATA: who is in it, what things are in it, and where the view is; and for each of those a list of KEYS
 * in time. A key says what is true AT its moment; between two keys that say the same kind of thing, the thing goes
 * smoothly from one to the other. So a scene is written the way an animator works: "at 2 seconds she is here, at 4
 * she is there; at 4.5 she nods".
 *
 * This file is only the data and the arithmetic: `sampleCutscene(scene, t)` says where everything is at any moment.
 * It knows nothing of models or drawing, so a test can play a whole scene in an instant and a dev address can jump
 * to any frame of one. The marionettes themselves are in stage.ts; the scenes are in scenes.ts.
 *
 * (The story's own scenes, in story/scene.ts, are an older and narrower thing: beats for the knight alone, with the
 * level's characters only looked-at. They are left as they are.)
 */
export type V3 = [number, number, number];
/**
 * How a thing gets to a key from the one before: 'smooth' (the usual: off gently, in gently), 'out' (off at once and
 * in gently: a thing SLID and coming to rest), 'in' (off gently and arriving at full speed), 'line' (steadily).
 */
export type Ease = 'smooth' | 'out' | 'in' | 'line';

/** What a character in a scene is: the knight, one of the talking characters (by kind and name: his look goes by his name), or a creature. */
export type CastSpec =
  | { is: 'knight' }
  | { is: 'npc'; kind: string; name: string }
  | { is: 'foe'; type: string; color?: number };

export interface ActorKey {
  /** Seconds from the start of the scene. */
  t: number;
  /** Where he is (x, the floor's height, z). From the key before that says where, he goes there in a straight line. */
  at?: V3;
  /** With `at`: he hops there, rising this high on the way. */
  hop?: number;
  /** With `at`: he is SLID there without walking or turning to face the way (a shuffle along a bar, a shove). */
  slide?: boolean;
  /** With `at`: how he gets there. Default 'smooth'. */
  ease?: Ease;
  /** Which way his body faces (radians; 0 looks along +z). Walking, he faces the way he goes unless this says otherwise. */
  face?: number;
  /** ...or a place (x, z) he turns his body to. */
  faceAt?: [number, number];
  /** His head, from his body: [turn (his left is positive), nod (down is positive)]. */
  head?: [number, number];
  /** ...or a place (x, z) his head turns to, as far as his neck allows. */
  headAt?: [number, number];
  /** His body tipped: [forward, to his left], radians. Leaning in over a table; rocking back. */
  lean?: [number, number];
  /** What he is doing, by name, from this key on: each kind of character answers the names it knows (see stage.ts). */
  doing?: string;
  /** Sitting, from this key on. */
  seated?: boolean;
  /** Out of the picture, from this key on (false brings him back). */
  hide?: boolean;
  /** He nods this many times, starting here. */
  nod?: number;
  /** He shakes his head this many times, starting here. */
  shake?: number;
  /** He is talking for this many seconds from here: his head bobs and his paws move, as they do when the knight talks to him. */
  talk?: number;
}

export interface PropKey {
  t: number;
  at?: V3;
  /** With `at`: how it gets there. Default 'smooth'; 'out' for a thing slid along a bar. */
  ease?: Ease;
  /** Turned about its upright (radians). */
  yaw?: number;
  /** Tipped over toward its front (radians): a mug knocked back. */
  tip?: number;
  hide?: boolean;
}

export interface CamKey {
  t: number;
  /** Where the view is... */
  pos?: V3;
  /** ...and what it looks at. */
  look?: V3;
  /** ...or WHO or WHAT it looks at, by its name in the cast or among the things: the view follows it as it moves. */
  watch?: string;
  /** With `watch`: this much above its foot. Default 0.6. */
  watchUp?: number;
  /**
   * Or: on a ring round a place, `r` out and `h` up, at this angle round it (radians; 0 is south of it, +z), looking
   * at the place. Two such keys one after the other PAN ROUND the place: "like a cool movie scene".
   */
  orbit?: { centre: V3; r: number; h: number; angle: number };
  /** The view jumps here instead of gliding from the key before. */
  cut?: boolean;
}

export interface CutsceneDef {
  id: string;
  /** Its name in the list. */
  name: string;
  /** The level it is played in. */
  level: string;
  /** How long it lasts, seconds. */
  length: number;
  cast: Record<string, { who: CastSpec; keys: ActorKey[] }>;
  /** Things in the scene. `size`: drawn this many times its own size (the thing a scene is ABOUT a little bigger than its like, to pick it out). */
  props?: Record<string, { kind: 'mug'; size?: number; keys: PropKey[] }>;
  cam: CamKey[];
  /** Sounds, by name, at their moments. */
  sounds?: Array<{ t: number; name: string }>;
  /** The level's own characters who step out while it plays (by name). Those the cast is named for step out anyway. */
  clear?: string[];
}

export interface ActorFrame {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  facing: number;
  /** How fast he is going over the ground, for his walk. */
  speed: number;
  /** How high off the floor a hop has him. */
  hopY: number;
  headYaw: number;
  headPitch: number;
  leanFwd: number;
  leanSide: number;
  doing: string;
  seated: boolean;
  talking: boolean;
}
export interface PropFrame {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  yaw: number;
  tip: number;
}
export interface CutFrame {
  t: number;
  /** The frame's number at thirty to the second. */
  frame: number;
  done: boolean;
  cast: Record<string, ActorFrame>;
  props: Record<string, PropFrame>;
  cam: { pos: V3; look: V3 };
}

/** Frames to the second: what "a frame" means when a scene is stepped through. */
export const CUT_FPS = 30;
/** How long one nod takes, and one shake of the head. */
export const NOD_TIME = 0.42;
export const SHAKE_TIME = 0.36;
/** How far a head turns at most, and nods at most. */
const NECK = 1.2;
const NECK_NOD = 0.7;

const smooth = (u: number): number => u * u * (3 - 2 * u);
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const mix = (a: number, b: number, u: number): number => a + (b - a) * u;

/** The keys of a list that say a thing, with the thing each says: for going from one to the next. */
function track<K extends { t: number }, V>(keys: readonly K[], pick: (k: K) => V | undefined): Array<{ t: number; v: V }> {
  const out: Array<{ t: number; v: V }> = [];
  for (const k of keys) {
    const v = pick(k);
    if (v !== undefined) out.push({ t: k.t, v });
  }
  return out;
}
/** Where in a track a moment falls: the key before it, the key after, and how far between (eased). Before the first key it is the first; after the last, the last. */
const EASES: Record<Ease, (u: number) => number> = { smooth, out: (u) => 1 - (1 - u) * (1 - u), in: (u) => u * u, line: (u) => u };
/** How fast each easing is going at `u`, as a multiple of the steady speed. */
const EASE_RATE: Record<Ease, (u: number) => number> = { smooth: (u) => 6 * u * (1 - u), out: (u) => 2 * (1 - u), in: (u) => 2 * u, line: () => 1 };
function span<V>(tr: Array<{ t: number; v: V }>, t: number, easeOf?: (b: V) => Ease | undefined): { a: V; b: V; u: number; raw: number; dur: number; i: number; ease: Ease } | null {
  if (!tr.length) return null;
  if (t <= tr[0].t) return { a: tr[0].v, b: tr[0].v, u: 0, raw: 0, dur: 0, i: 0, ease: 'smooth' };
  for (let i = 0; i + 1 < tr.length; i++) {
    if (t < tr[i + 1].t) {
      const dur = tr[i + 1].t - tr[i].t;
      const raw = dur > 0 ? (t - tr[i].t) / dur : 1;
      const ease = easeOf?.(tr[i + 1].v) ?? 'smooth';
      return { a: tr[i].v, b: tr[i + 1].v, u: EASES[ease](raw), raw, dur, i, ease };
    }
  }
  const last = tr[tr.length - 1].v;
  return { a: last, b: last, u: 1, raw: 1, dur: 0, i: tr.length - 1, ease: 'smooth' };
}
/** The last key at or before a moment that says a thing (for things that are simply so from a key on). */
function held<K extends { t: number }, V>(keys: readonly K[], t: number, pick: (k: K) => V | undefined, first: V): V {
  let v = first;
  for (const k of keys) {
    if (k.t > t + 1e-9) break;
    const p = pick(k);
    if (p !== undefined) v = p;
  }
  return v;
}

/** A scene made ready to play: its keys in order, and each actor's turns worked out (he faces the way he walks). */
export interface Cutscene {
  def: CutsceneDef;
  cast: Record<string, { keys: ActorKey[]; place: Array<{ t: number; v: { at: V3; hop: number; slide: boolean; ease?: Ease } }>; facing: Array<{ t: number; v: number }> }>;
  props: Record<string, { keys: PropKey[] }>;
  cam: CamKey[];
}

/** How long before he sets off, and before he arrives, a walker turns to face his way and then to face what he is told to. */
const TURN = 0.3;

export function compileCutscene(def: CutsceneDef): Cutscene {
  const byTime = <K extends { t: number }>(keys: readonly K[]): K[] => [...keys].sort((a, b) => a.t - b.t);
  const cast: Cutscene['cast'] = {};
  for (const [name, c] of Object.entries(def.cast)) {
    const keys = byTime(c.keys);
    const place = track(keys, (k) => (k.at ? { at: k.at, hop: k.hop ?? 0, slide: !!k.slide, ease: k.ease } : undefined));
    // His turns: what the keys say, and, for each walk, the way he is going (unless he is slid).
    const said = new Map<number, number | [number, number]>();
    for (const k of keys) if (k.face !== undefined || k.faceAt) said.set(k.t, k.face !== undefined ? k.face : k.faceAt!);
    const turns: Array<{ t: number; v: number | [number, number] }> = [...said].map(([t, v]) => ({ t, v }));
    for (let i = 0; i + 1 < place.length; i++) {
      const a = place[i];
      const b = place[i + 1];
      const dx = b.v.at[0] - a.v.at[0];
      const dz = b.v.at[2] - a.v.at[2];
      const dur = b.t - a.t;
      if (b.v.slide || Math.hypot(dx, dz) < 0.05 || dur <= 0) continue;
      const way = Math.atan2(dx, dz);
      const lead = Math.min(TURN, dur * 0.3);
      // Facing his way a moment after he sets off, and still facing it a moment before he arrives. (A key that says
      // which way he faces AT a moment wins that moment.)
      for (const t of [a.t + lead, b.t - lead]) if (![...said.keys()].some((s) => Math.abs(s - t) < 1e-6)) turns.push({ t, v: way });
      if (!said.has(b.t)) turns.push({ t: b.t, v: way });
    }
    turns.sort((p, q) => p.t - q.t);
    // (A place to face is turned into a heading from where he is at that moment.)
    const where = (t: number): V3 => {
      const s = span(place, t, (b) => b.ease);
      return s ? [mix(s.a.at[0], s.b.at[0], s.u), mix(s.a.at[1], s.b.at[1], s.u), mix(s.a.at[2], s.b.at[2], s.u)] : [0, 0, 0];
    };
    const facing = turns.map(({ t, v }) => {
      if (typeof v === 'number') return { t, v };
      const p = where(t);
      return { t, v: Math.atan2(v[0] - p[0], v[1] - p[2]) };
    });
    cast[name] = { keys, place, facing };
  }
  const props: Cutscene['props'] = {};
  for (const [name, p] of Object.entries(def.props ?? {})) props[name] = { keys: byTime(p.keys) };
  return { def, cast, props, cam: byTime(def.cam) };
}

/** A view key as a place and what it looks at. (`seen`: where a thing it watches is at this moment.) */
function shot(k: CamKey, from: { pos: V3; look: V3 }, seen?: (name: string) => V3 | null): { pos: V3; look: V3 } {
  const eye = k.watch ? seen?.(k.watch) ?? null : null;
  if (eye && !k.orbit) return { pos: k.pos ?? from.pos, look: [eye[0], eye[1] + (k.watchUp ?? 0.6), eye[2]] };
  if (k.orbit) {
    const o = k.orbit;
    return { pos: [o.centre[0] + Math.sin(o.angle) * o.r, o.centre[1] + o.h, o.centre[2] + Math.cos(o.angle) * o.r], look: [...o.centre] as V3 };
  }
  return { pos: k.pos ?? from.pos, look: k.look ?? from.look };
}

/** Where everything in a scene is at a moment. */
export function sampleCutscene(sc: Cutscene, time: number): CutFrame {
  const t = Math.max(0, Math.min(sc.def.length, time));
  const cast: Record<string, ActorFrame> = {};
  for (const [name, c] of Object.entries(sc.cast)) {
    const p = span(c.place, t, (b) => b.ease);
    let x = 0;
    let y = 0;
    let z = 0;
    let speed = 0;
    let hopY = 0;
    if (p) {
      x = mix(p.a.at[0], p.b.at[0], p.u);
      y = mix(p.a.at[1], p.b.at[1], p.u);
      z = mix(p.a.at[2], p.b.at[2], p.u);
      const dist = Math.hypot(p.b.at[0] - p.a.at[0], p.b.at[2] - p.a.at[2]);
      // (How fast: the slope of the easing. The usual one is nothing at each end and half as much again in the middle.)
      if (p.dur > 0 && !p.b.slide && !p.b.hop) speed = (dist / p.dur) * EASE_RATE[p.ease](p.raw);
      if (p.b.hop && p.dur > 0) hopY = p.b.hop * 4 * p.raw * (1 - p.raw);
    }
    const f = span(c.facing, t);
    const facing = f ? f.a + wrap(f.b - f.a) * f.u : 0;
    // His head: where the keys have it, or turned to a place; and nods and shakes on top.
    const headKeys = track(c.keys, (k) => (k.head ? { head: k.head as [number, number] | null, at: null as [number, number] | null } : k.headAt ? { head: null, at: k.headAt as [number, number] | null } : undefined));
    const h = span(headKeys, t);
    const turned = (v: { head: [number, number] | null; at: [number, number] | null }): [number, number] => {
      if (v.head) return v.head;
      const to = Math.atan2(v.at![0] - x, v.at![1] - z);
      return [Math.max(-NECK, Math.min(NECK, wrap(to - facing))), 0];
    };
    let headYaw = 0;
    let headPitch = 0;
    if (h) {
      const a = turned(h.a);
      const b = turned(h.b);
      headYaw = mix(a[0], b[0], h.u);
      headPitch = mix(a[1], b[1], h.u);
    }
    let talking = false;
    for (const k of c.keys) {
      if (k.t > t) break;
      const since = t - k.t;
      if (k.nod && since < k.nod * NOD_TIME) headPitch += 0.32 * Math.sin((since / NOD_TIME) * Math.PI) ** 2;
      if (k.shake && since < k.shake * SHAKE_TIME) headYaw += 0.45 * Math.sin((since / SHAKE_TIME) * Math.PI * 2) * Math.sin((since / (k.shake * SHAKE_TIME)) * Math.PI);
      if (k.talk && since < k.talk) talking = true;
    }
    const l = span(track(c.keys, (k) => k.lean), t);
    cast[name] = {
      visible: !held(c.keys, t, (k) => k.hide, false) && !!p,
      x, y, z, facing, speed, hopY,
      headYaw: Math.max(-NECK, Math.min(NECK, headYaw)),
      headPitch: Math.max(-NECK_NOD, Math.min(NECK_NOD, headPitch)),
      leanFwd: l ? mix(l.a[0], l.b[0], l.u) : 0,
      leanSide: l ? mix(l.a[1], l.b[1], l.u) : 0,
      doing: held(c.keys, t, (k) => k.doing, 'stand'),
      seated: held(c.keys, t, (k) => k.seated, false),
      talking,
    };
  }
  const props: Record<string, PropFrame> = {};
  for (const [name, pr] of Object.entries(sc.props)) {
    const p = span(track(pr.keys, (k) => (k.at ? { at: k.at, ease: k.ease } : undefined)), t, (b) => b.ease);
    const yw = span(track(pr.keys, (k) => k.yaw), t);
    const tp = span(track(pr.keys, (k) => k.tip), t);
    props[name] = {
      visible: !held(pr.keys, t, (k) => k.hide, false) && !!p,
      x: p ? mix(p.a.at[0], p.b.at[0], p.u) : 0,
      y: p ? mix(p.a.at[1], p.b.at[1], p.u) : 0,
      z: p ? mix(p.a.at[2], p.b.at[2], p.u) : 0,
      yaw: yw ? mix(yw.a, yw.b, yw.u) : 0,
      tip: tp ? mix(tp.a, tp.b, tp.u) : 0,
    };
  }
  // The view: from one key to the next. A pan round a place goes round the RING, not straight across it.
  let cam: { pos: V3; look: V3 } = { pos: [0, 3, 6], look: [0, 1, 0] };
  const keys = sc.cam;
  if (keys.length) {
    let i = 0;
    while (i + 1 < keys.length && t >= keys[i + 1].t) i++;
    // (Each key's shot, a key that leaves something out keeping it from the one before.)
    const seen = (name: string): V3 | null => {
      const who = cast[name] ?? props[name];
      return who ? [who.x, who.y, who.z] : null;
    };
    let prev = cam;
    const shots = keys.map((k) => (prev = shot(k, prev, seen)));
    const a = keys[i];
    const b = keys[i + 1];
    if (!b || t <= a.t || b.cut) cam = shots[i];
    else {
      const u = smooth(clamp01((t - a.t) / (b.t - a.t)));
      if (a.orbit && b.orbit) {
        const o = { centre: [0, 1, 2].map((n) => mix(a.orbit!.centre[n], b.orbit!.centre[n], u)) as V3, r: mix(a.orbit.r, b.orbit.r, u), h: mix(a.orbit.h, b.orbit.h, u), angle: mix(a.orbit.angle, b.orbit.angle, u) };
        cam = shot({ t, orbit: o }, cam);
      } else {
        cam = { pos: [0, 1, 2].map((n) => mix(shots[i].pos[n], shots[i + 1].pos[n], u)) as V3, look: [0, 1, 2].map((n) => mix(shots[i].look[n], shots[i + 1].look[n], u)) as V3 };
      }
    }
  }
  return { t, frame: Math.round(t * CUT_FPS), done: time >= sc.def.length, cast, props, cam };
}

/** What is wrong with a scene's data, in words (nothing: an empty list). For the test, and for whoever writes one. */
export function checkCutscene(def: CutsceneDef): string[] {
  const bad: string[] = [];
  if (!(def.length > 0)) bad.push('it has no length');
  const late = (what: string, keys: ReadonlyArray<{ t: number }>): void => {
    for (const k of keys) if (k.t < 0 || k.t > def.length + 1e-9) bad.push(`${what} has a key at ${k.t}, outside the scene`);
  };
  for (const [name, c] of Object.entries(def.cast)) {
    late(name, c.keys);
    if (!c.keys.some((k) => k.at)) bad.push(`${name} is never put anywhere`);
    for (const k of c.keys) if ((k.hop || k.slide) && !k.at) bad.push(`${name}'s key at ${k.t} has a hop or a slide but nowhere to go`);
  }
  for (const [name, p] of Object.entries(def.props ?? {})) {
    late(name, p.keys);
    if (!p.keys.some((k) => k.at)) bad.push(`${name} is never put anywhere`);
  }
  late('the view', def.cam);
  if (!def.cam.length) bad.push('the view is never put anywhere');
  else if (!def.cam[0].orbit && !(def.cam[0].pos && (def.cam[0].look || def.cam[0].watch))) bad.push('the view\'s first key does not say both where it is and what it looks at');
  for (const k of def.cam) if (k.watch && !def.cast[k.watch] && !def.props?.[k.watch]) bad.push(`the view watches "${k.watch}", who is not in the scene`);
  late('a sound', def.sounds ?? []);
  return bad;
}
