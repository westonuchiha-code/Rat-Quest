/**
 * THE FIRST CUTSCENES: four small scenes in the Club, to see how far the marionettes get.
 *
 * The owner's own list (2026-11-16): "two of them talking at a table or at the bar maybe one of them ordering the
 * other one a drink or sliding a glass down the bar, you know the soldier and drinking by himself maybe like you can
 * pan around the table like a cool movie scene". These are those four. They are try-outs of the TOOL, not story.
 *
 * HOW A SCENE IS WRITTEN (see cutscene.ts for every word a key can say):
 *   - `cast`: each character, and his keys. A key is what is true AT its time `t` (seconds). `at` is where he is: from
 *     one `at` to the next he walks (and faces his way). `face`/`faceAt` his body, `head`/`headAt` his head, `lean`
 *     his body tipped. `doing` and `seated` are so from their key on. `nod`, `shake` and `talk` happen from their key.
 *   - `props`: things (a mug), keyed the same way; `ease: 'out'` is a thing slid and coming to rest.
 *   - `cam`: the view. `pos` and `look`, or `watch` a named character or thing, or `orbit` round a place. `cut` jumps.
 * To look at one frame of one: `#level=hub&scene=<id>&t=<seconds>&hold` on the address. In the game: pause, SCENES.
 *
 * Places are the Club's own (levels/junction.ts): the bar's counter runs z 10.6 to 16.6 at x 20 to 21, its top one
 * up; its keeper stands behind it on a step; three stools stand before it. Tables are 0.74 high.
 */
import { BAR } from '../levels/junction';
import { STOOL } from '../world/layout';
import type { ActorKey, CutsceneDef, V3 } from './cutscene';

const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
const NORTH = Math.PI;
const BAR_MID = (BAR.z0 + BAR.z1) / 2;
/** The three stools before the bar, north to south, and where the keeper stands behind it. */
const STOOLS = [BAR.z0 + 1.1, BAR_MID, BAR.z1 - 1.1] as const;
/** How high the knight's feet are put for him to be sitting on a stool (his sitting pose is on the ground). */
const STOOL_SEAT = STOOL.h - 0.02;
const KEEPER: V3 = [BAR.x1 + 0.7, BAR.step, BAR_MID];
/** Standing room at the bar, between the first stool and the second. */
const BESIDE = STOOLS[0] + 0.95;
/** A place on the bar's top, along the drinkers' edge of it (clear of the row of thimbles that stands down its middle). */
const onBar = (z: number): V3 => [BAR.x0 + 0.2, BAR.top, z];

/** The table by the way in (south-east), and its two seats, east and west of it. */
const TALK_TABLE = { x: 11, z: 14 } as const;
/** The table in the south-west, where the soldier stands at his thimble. */
const SOLDIER_TABLE = { x: -11, z: 6 } as const;

/** The table where the foxes play cards (east), and its two seats. */
const CARD_TABLE = { x: 17, z: -1 } as const;
/**
 * The Club's own music (audio/music.ts, `groove`) goes at 86 beats a minute: a beat, and a bar of four. A scene that is
 * DANCED is keyed on these, so that a film of it and the music laid under the film fall together.
 */
export const BEAT = 60 / 86;
const BAR_OF_FOUR = BEAT * 4;
/**
 * A dancer's keys: from foot to foot with a hop on every beat, leaning into each step, about a spot, facing `face`.
 * `spins`: beats on which he goes once round as he hops. `big`: beats on which the hop is a jump.
 */
function dancing(spot: V3, face: number, beats: number, o: { step?: number; hop?: number; spins?: number[]; big?: number[]; first?: number } = {}): ActorKey[] {
  const keys: ActorKey[] = [];
  const step = o.step ?? 0.4;
  let turned = 0;
  const place = (side: number): V3 => [spot[0] + Math.cos(face) * side * step, spot[1], spot[2] - Math.sin(face) * side * step];
  for (let b = 0; b <= beats; b++) {
    const side = (b + (o.first ?? 0)) % 2 ? 1 : -1;
    const t = b * BEAT;
    if (b === 0) {
      keys.push({ t: 0, at: place(side), face, lean: [0.05, side * 0.12], head: [0, 0] });
      continue;
    }
    if (o.spins?.includes(b)) {
      // (Once round in three, so that each part of the turn is the short way to the next.)
      for (const k of [1, 2]) keys.push({ t: t - BEAT * (1 - k / 3), face: face + turned + (k * Math.PI * 2) / 3 });
      turned += Math.PI * 2;
    }
    // (The last step lands a moment before the end, and he stands: a scene ends with everybody where the last frame has him.)
    keys.push({ t: b === beats ? t - 0.12 : t, at: place(side), hop: o.big?.includes(b) ? 0.55 : o.hop ?? 0.22, face: face + turned, lean: [0.05, side * 0.14] });
    if (b === beats) keys.push({ t, at: place(side) });
  }
  return keys;
}

export const CUTSCENES: CutsceneDef[] = [
  // ---------------------------------------------------------------- two talking at a table
  {
    id: 'table-talk',
    name: 'TWO AT A TABLE',
    level: 'hub',
    length: 15,
    cast: {
      mo: {
        who: { is: 'npc', kind: 'turtle', name: 'Mossback Mo' },
        keys: [
          { t: 0, at: [TALK_TABLE.x + 1.25, 0, TALK_TABLE.z], face: WEST, seated: true, doing: 'drink', head: [0, 0] },
          // Pebble is off again. Mo listens: a slow nod, and another.
          { t: 2.6, nod: 1 },
          { t: 4.4, nod: 2, lean: [0, 0] },
          // His turn. He leans in to say it, and takes his time.
          { t: 5.4, lean: [0.14, 0], talk: 3.4, doing: 'chat' },
          { t: 8.9, lean: [0.14, 0] },
          { t: 9.6, lean: [-0.06, 0], doing: 'drink' },
          // Pebble will not have it. Mo looks away over his thimble, at the room.
          { t: 10.4, head: [0, 0] },
          { t: 11.6, head: [0.7, 0.05] },
          { t: 13.4, head: [0.7, 0.05] },
          { t: 14.4, head: [0, 0], nod: 1 },
        ],
      },
      pebble: {
        who: { is: 'npc', kind: 'turtle', name: 'Pebble' },
        keys: [
          { t: 0, at: [TALK_TABLE.x - 1.25, 0, TALK_TABLE.z], face: EAST, seated: true, doing: 'chat', head: [0, 0], lean: [0, 0] },
          { t: 0.5, talk: 3.6, lean: [0.12, 0] },
          { t: 4.2, lean: [0.12, 0] },
          { t: 5.0, lean: [-0.05, 0] },
          // Mo's turn: Pebble hears him out, then shakes his head at the whole of it.
          { t: 7.4, nod: 1 },
          { t: 9.2, shake: 3, lean: [-0.05, 0] },
          { t: 10.6, talk: 2.6, lean: [0.16, 0] },
          { t: 13.4, lean: [0.16, 0] },
          { t: 14.4, lean: [0, 0] },
        ],
      },
    },
    cam: [
      // The room first, the table in it; then in to the two of them.
      { t: 0, pos: [TALK_TABLE.x - 0.6, 2.6, TALK_TABLE.z + 6.2], look: [TALK_TABLE.x, 0.85, TALK_TABLE.z] },
      { t: 4.6, pos: [TALK_TABLE.x - 0.3, 1.7, TALK_TABLE.z + 3.9], look: [TALK_TABLE.x, 0.85, TALK_TABLE.z] },
      // Over Pebble's shoulder at Mo, for Mo's say.
      { t: 5.2, cut: true, pos: [TALK_TABLE.x - 2.5, 1.35, TALK_TABLE.z + 1.1], look: [TALK_TABLE.x + 1.25, 0.95, TALK_TABLE.z] },
      { t: 9.0, pos: [TALK_TABLE.x - 2.3, 1.3, TALK_TABLE.z + 0.9], look: [TALK_TABLE.x + 1.25, 0.95, TALK_TABLE.z] },
      // Over Mo's at Pebble, for the head shaking.
      { t: 9.1, cut: true, pos: [TALK_TABLE.x + 2.5, 1.35, TALK_TABLE.z - 1.0], look: [TALK_TABLE.x - 1.25, 0.95, TALK_TABLE.z] },
      { t: 13.2, pos: [TALK_TABLE.x + 2.3, 1.3, TALK_TABLE.z - 0.8], look: [TALK_TABLE.x - 1.25, 0.95, TALK_TABLE.z] },
      // And out again.
      { t: 13.4, cut: true, pos: [TALK_TABLE.x + 0.4, 1.9, TALK_TABLE.z + 4.2], look: [TALK_TABLE.x, 0.85, TALK_TABLE.z] },
      { t: 15, pos: [TALK_TABLE.x + 0.8, 2.5, TALK_TABLE.z + 5.6], look: [TALK_TABLE.x, 0.85, TALK_TABLE.z] },
    ],
  },

  // ---------------------------------------------------------------- one orders the other a drink
  {
    id: 'a-drink-for-a-friend',
    name: 'A DRINK FOR A FRIEND',
    level: 'hub',
    length: 17,
    cast: {
      slink: {
        who: { is: 'npc', kind: 'ferret', name: 'Slink' },
        keys: [
          // On his stool with nothing before him, chin down.
          { t: 0, at: [BAR.stoolX, 0, STOOLS[0]], face: EAST, seated: true, doing: 'stand', head: [0, 0.3], lean: [0.1, 0] },
          // Someone has come up beside him: a glance, and back to the bar.
          { t: 3.4, head: [0, 0.3] },
          { t: 4.0, headAt: [BAR.stoolX, BESIDE] },
          { t: 5.0, headAt: [BAR.stoolX, BESIDE] },
          { t: 5.7, head: [0, 0.3] },
          // A thimble stops in front of him. He looks at it; then at her; then at the one who bought it.
          { t: 10.2, head: [0, 0.3] },
          { t: 10.8, headAt: [BAR.x0 + 0.4, STOOLS[0]], lean: [0.1, 0] },
          { t: 11.6, headAt: [KEEPER[0], KEEPER[2]], lean: [0, 0] },
          { t: 12.4, headAt: [BAR.stoolX, BESIDE] },
          { t: 12.6, nod: 2 },
          { t: 13.8, head: [0, 0], doing: 'drink' },
        ],
      },
      vix: {
        who: { is: 'npc', kind: 'fox', name: 'Vix' },
        keys: [
          // In from the room, to the bar beside him.
          { t: 0, at: [14.2, 0, BAR_MID + 2.4], doing: 'stand' },
          { t: 3.2, at: [BAR.stoolX - 0.15, 0, BESIDE], face: EAST },
          // A look at the one on the stool. Then her order: one for him.
          { t: 3.6, head: [0, 0] },
          { t: 4.3, headAt: [BAR.stoolX, STOOLS[0]] },
          { t: 5.2, headAt: [BAR.stoolX, STOOLS[0]] },
          { t: 5.8, headAt: [KEEPER[0], KEEPER[2]], talk: 1.9, lean: [0.1, 0] },
          { t: 6.6, headAt: [BAR.stoolX, STOOLS[0]] },
          { t: 7.3, headAt: [KEEPER[0], KEEPER[2]] },
          { t: 8.0, lean: [0, 0] },
          // She watches it go to him, takes his thanks with a nod, and leans on the bar.
          { t: 9.2, headAt: [KEEPER[0], KEEPER[2]] },
          { t: 10.4, headAt: [BAR.x0 + 0.4, STOOLS[0]] },
          { t: 12.6, headAt: [BAR.stoolX, STOOLS[0]] },
          { t: 13.5, nod: 1 },
          { t: 14.4, head: [0, 0], doing: 'lean', face: EAST },
          { t: 15.4, face: EAST + 0.5 },
        ],
      },
      tawny: {
        who: { is: 'npc', kind: 'owl', name: 'Madam Tawny' },
        keys: [
          { t: 0, at: KEEPER, face: WEST, doing: 'tend', head: [0, 0] },
          // The order: she hears it, nods, and turns to the keg.
          { t: 5.6, headAt: [BAR.stoolX, BESIDE] },
          { t: 7.7, nod: 1 },
          { t: 8.3, face: WEST },
          { t: 8.9, faceAt: [BAR.x0 + 0.5, BAR.z1 - 0.7], head: [0, 0.2] },
          { t: 9.5, faceAt: [BAR.x0 + 0.5, BAR.z1 - 0.7] },
          // ...and back with it, and along the bar it goes to him.
          { t: 10.0, face: WEST, lean: [0, 0] },
          { t: 10.1, lean: [0.16, 0], headAt: [BAR.x0 + 0.4, STOOLS[0]] },
          { t: 10.9, lean: [0, 0] },
          { t: 12.0, headAt: [BAR.stoolX, STOOLS[0]] },
          { t: 14.0, head: [0, 0] },
        ],
      },
    },
    props: {
      thimble: {
        kind: 'mug',
        size: 1.3,
        keys: [
          { t: 0, at: onBar(BAR_MID + 0.5), hide: true },
          { t: 9.9, at: [BAR.x1 - 0.25, BAR.top, BAR_MID + 0.5], hide: false },
          // Set down before her, then a push along to him: off quick, and coming to rest.
          { t: 10.25, at: onBar(BAR_MID + 0.2) },
          { t: 11.1, at: onBar(STOOLS[0] + 0.05), ease: 'out' },
          // (He takes it up: the one in his paw is his own from here.)
          { t: 13.8, hide: true },
        ],
      },
    },
    cam: [
      // From the room: the bar, and her coming to it.
      { t: 0, pos: [15.6, 2.3, BAR_MID - 4.6], look: [BAR.x0, 1.1, BAR_MID - 0.6] },
      { t: 3.6, pos: [16.4, 1.9, BAR_MID - 3.4], look: [BAR.x0, 1.1, BAR_MID - 0.8] },
      // Close on the two at the bar.
      { t: 3.8, cut: true, pos: [17.0, 1.55, BESIDE + 2.6], look: [BAR.stoolX + 0.4, 1.0, (STOOLS[0] + BESIDE) / 2] },
      { t: 7.6, pos: [17.3, 1.5, BESIDE + 2.3], look: [BAR.stoolX + 0.4, 1.0, (STOOLS[0] + BESIDE) / 2] },
      // The keeper, from their side of the bar.
      { t: 7.65, cut: true, pos: [18.0, 1.95, BAR_MID + 2.3], look: [KEEPER[0], 1.2, BAR_MID + 0.7] },
      { t: 9.8, pos: [18.2, 1.9, BAR_MID + 2.1], look: [KEEPER[0], 1.2, BAR_MID + 0.8] },
      // Along the bar, low, with the thimble as it goes.
      { t: 9.85, cut: true, pos: [BAR.x0 + 0.1, BAR.top + 0.35, STOOLS[0] - 1.6], watch: 'thimble', watchUp: 0.1 },
      { t: 11.4, pos: [BAR.x0 + 0.0, BAR.top + 0.4, STOOLS[0] - 1.5], watch: 'thimble', watchUp: 0.1 },
      // His thanks, and the last of it from the room.
      { t: 11.5, cut: true, pos: [17.6, 1.5, STOOLS[0] - 1.9], look: [BAR.stoolX + 0.3, 1.0, (STOOLS[0] + BESIDE) / 2] },
      { t: 14.2, pos: [17.2, 1.6, STOOLS[0] - 2.3], look: [BAR.stoolX + 0.3, 1.0, (STOOLS[0] + BESIDE) / 2] },
      { t: 17, pos: [17.3, 1.75, STOOLS[0] - 2.5], look: [BAR.x0, 1.0, BESIDE - 0.3] },
    ],
  },

  // ---------------------------------------------------------------- a glass slid down the bar
  {
    id: 'down-the-bar',
    name: 'A GLASS DOWN THE BAR',
    level: 'hub',
    length: 11,
    // (Whoever has the far stool gives it up for the length of this.)
    clear: ['Professor Snow'],
    cast: {
      knight: {
        who: { is: 'knight' },
        keys: [
          // He comes to the far stool, and up onto it.
          { t: 0, at: [16.4, 0, BAR.z1 - 0.2] },
          { t: 1.9, at: [BAR.stoolX - 0.55, 0, STOOLS[2]] },
          { t: 2.3, at: [BAR.stoolX, STOOL_SEAT, STOOLS[2]], hop: 0.25, face: EAST, seated: true },
          { t: 2.6, head: [0, 0] },
          { t: 3.2, headAt: [KEEPER[0], BAR.z0 + 0.9], nod: 1 },
          // It is coming. His head goes with it all the way.
          { t: 4.6, headAt: [BAR.x0 + 0.4, BAR.z0 + 1] },
          { t: 5.2, headAt: [BAR.x0 + 0.4, BAR_MID] },
          { t: 6.3, headAt: [BAR.x0 + 0.4, STOOLS[2] - 0.1], lean: [0, 0] },
          // Caught. A paw out to it; then up it goes.
          { t: 6.5, doing: 'sitReach', lean: [0.12, 0] },
          { t: 7.6, lean: [0, 0] },
          { t: 8.0, doing: 'cheer', headAt: [KEEPER[0], BAR.z0 + 0.9] },
          { t: 9.6, doing: 'sit' },
          { t: 9.8, nod: 1 },
        ],
      },
      tawny: {
        who: { is: 'npc', kind: 'owl', name: 'Madam Tawny' },
        keys: [
          { t: 0, at: [KEEPER[0], KEEPER[1], BAR.z0 + 0.9], face: WEST, doing: 'tend', head: [0, 0] },
          { t: 2.4, headAt: [BAR.stoolX, STOOLS[2]] },
          { t: 3.6, nod: 1 },
          // The wind-up, and the push.
          { t: 4.0, face: WEST, lean: [-0.08, 0] },
          { t: 4.5, face: WEST - 0.5, lean: [0.2, 0.1] },
          { t: 5.3, face: WEST - 0.5, lean: [0, 0] },
          { t: 6.0, face: WEST, headAt: [BAR.stoolX, STOOLS[2]] },
          { t: 8.4, nod: 1 },
        ],
      },
    },
    props: {
      thimble: {
        kind: 'mug',
        size: 1.3,
        keys: [
          { t: 0, at: [BAR.x1 - 0.3, BAR.top, BAR.z0 + 0.8] },
          { t: 4.0, at: [BAR.x1 - 0.3, BAR.top, BAR.z0 + 0.8] },
          { t: 4.45, at: onBar(BAR.z0 + 1.1), ease: 'in' },
          // The length of the bar, and it stops at his paw.
          { t: 6.4, at: onBar(STOOLS[2] - 0.1), ease: 'out', yaw: 0 },
          { t: 6.4, yaw: 0 },
          { t: 8.0, hide: true },
        ],
      },
    },
    cam: [
      { t: 0, pos: [15.2, 2.2, BAR_MID + 0.5], look: [BAR.x0, 1.1, BAR_MID + 0.6] },
      { t: 3.8, pos: [16.2, 1.8, BAR_MID + 0.8], look: [BAR.x0, 1.1, BAR_MID + 0.4] },
      // Down the length of the bar from behind the thimble.
      { t: 3.9, cut: true, pos: [BAR.x0 + 0.5, BAR.top + 0.5, BAR.z0 - 0.9], watch: 'thimble', watchUp: 0.12 },
      { t: 4.45, pos: [BAR.x0 + 0.5, BAR.top + 0.45, BAR.z0 - 0.7], watch: 'thimble', watchUp: 0.12 },
      // ...and going down the bar after it, over the drinkers' edge: it runs ahead, and the view comes up with it as it stops.
      { t: 4.5, cut: true, pos: [BAR.x0 - 1.1, BAR.top + 0.95, BAR.z0 - 0.5], watch: 'thimble', watchUp: 0.05 },
      { t: 6.5, pos: [BAR.x0 - 1.2, BAR.top + 0.8, STOOLS[2] - 2.4], watch: 'thimble', watchUp: 0.05 },
      // The catch.
      { t: 6.6, cut: true, pos: [BAR.x0 - 2.6, 1.5, STOOLS[2] - 1.5], look: [BAR.stoolX + 0.3, 1.0, STOOLS[2] + 0.1] },
      { t: 11, pos: [BAR.x0 - 3.4, 1.8, STOOLS[2] - 2.6], look: [BAR.stoolX + 0.3, 1.0, STOOLS[2] - 0.2] },
    ],
  },

  // ---------------------------------------------------------------- the soldier, drinking by himself
  {
    id: 'the-soldier-alone',
    name: 'THE SOLDIER, ALONE',
    level: 'hub',
    length: 18,
    cast: {
      nib: {
        who: { is: 'npc', kind: 'ant', name: 'Corporal Nib' },
        keys: [
          // At his place at the table, on his own six feet, his thimble before him.
          { t: 0, at: [SOLDIER_TABLE.x, 0, SOLDIER_TABLE.z + 1.25], face: NORTH, doing: 'drink', head: [0, 0], lean: [0, 0] },
          // The empty stools. One, then the other.
          { t: 5.0, head: [0, 0] },
          { t: 6.2, headAt: [SOLDIER_TABLE.x + Math.sin(Math.PI * 0.75) * 1.25, SOLDIER_TABLE.z + Math.cos(Math.PI * 0.75) * 1.25] },
          { t: 7.6, headAt: [SOLDIER_TABLE.x + Math.sin(Math.PI * 0.75) * 1.25, SOLDIER_TABLE.z + Math.cos(Math.PI * 0.75) * 1.25] },
          { t: 9.0, headAt: [SOLDIER_TABLE.x - Math.sin(Math.PI * 0.75) * 1.25, SOLDIER_TABLE.z + Math.cos(Math.PI * 0.75) * 1.25] },
          { t: 10.2, headAt: [SOLDIER_TABLE.x - Math.sin(Math.PI * 0.75) * 1.25, SOLDIER_TABLE.z + Math.cos(Math.PI * 0.75) * 1.25] },
          // Back to the thimble. He sinks a little over it.
          { t: 11.4, head: [0, 0], lean: [0, 0] },
          { t: 13.0, lean: [0.14, 0] },
          { t: 16.2, lean: [0.14, 0] },
          { t: 17.4, lean: [0.04, 0] },
        ],
      },
    },
    cam: [
      // Once round his table, slowly, drawing in.
      { t: 0, orbit: { centre: [SOLDIER_TABLE.x, 0.95, SOLDIER_TABLE.z + 0.5], r: 5.2, h: 1.7, angle: 0.5 } },
      { t: 18, orbit: { centre: [SOLDIER_TABLE.x, 0.95, SOLDIER_TABLE.z + 0.5], r: 3.3, h: 0.75, angle: 0.5 + Math.PI * 2 } },
    ],
  },

  // ================================================================ FOUR MORE (the owner, 2026-11-17)
  // "I think I'd like to request a few more cutscene videos ... a few of the other characters talking at the bar
  // talking at the table drinking alone ... one with Dizzy Dave and like two other characters dancing with the
  // speakers in the background and maybe you could like zoom in and zoom out do like a little 10 second music video".

  // ---------------------------------------------------------------- Dizzy Dave, live: four bars
  {
    id: 'dizzy-dave-live',
    name: 'DIZZY DAVE, LIVE',
    level: 'hub',
    length: BAR_OF_FOUR * 4,
    cast: {
      dave: {
        who: { is: 'npc', kind: 'pigeon', name: 'Dizzy Dave' },
        keys: ([
          // On his stage, at it the whole time: a nod to every beat, rocking from side to side, a jump into the last bar.
          { t: 0, at: [0, 0.8, -16.5], face: 0, talk: BAR_OF_FOUR * 4, nod: 4, lean: [0.08, 0.1], doing: 'chat' },
          ...Array.from({ length: 15 }, (_, i): ActorKey => ({ t: (i + 1) * BEAT, lean: [i % 4 === 3 ? 0.2 : 0.08, i % 2 ? 0.1 : -0.1], ...((i + 1) % 4 === 0 ? { nod: 4 } : {}) })),
          { t: BEAT * 11.5, at: [0, 0.8, -16.5] },
          { t: BEAT * 12, at: [0, 0.8, -16.5], hop: 0.5 },
          { t: BEAT * 13, at: [0, 0.8, -16.5], hop: 0.5 },
          { t: BEAT * 16, lean: [0.1, 0] },
        ] as ActorKey[]).sort((a, b) => a.t - b.t),
      },
      jinx: { who: { is: 'npc', kind: 'rat', name: 'Jinx' }, keys: dancing([-2.5, 0, -8.7], 0.45, 16, { spins: [7, 15], big: [12] }) },
      vix: { who: { is: 'npc', kind: 'fox', name: 'Vix' }, keys: dancing([2.5, 0, -8.3], -0.45, 16, { first: 1, step: 0.5, spins: [11], big: [4, 13] }) },
    },
    cam: [
      // Bar one: the floor, the stage and the speakers beyond it, going in.
      // (From beside the hearth in the middle of the room, not through it.)
      // (And over the couch that faces the stage: from behind it, it hid the floor.)
      { t: 0, pos: [2.8, 3.8, 1.2], look: [0, 1.1, -13] },
      { t: BAR_OF_FOUR - 0.04, pos: [0.4, 2.5, -4.2], look: [0, 1.1, -13] },
      // Bar two: Dave, close; then low past Jinx to a speaker.
      { t: BAR_OF_FOUR, cut: true, pos: [2.3, 2.3, -13.1], look: [0, 1.7, -16.5] },
      { t: BAR_OF_FOUR * 1.5 - 0.04, pos: [1.5, 2.1, -14.1], look: [0, 1.7, -16.5] },
      { t: BAR_OF_FOUR * 1.5, cut: true, pos: [-0.2, 0.5, -6.3], look: [-4.6, 1.6, -14] },
      { t: BAR_OF_FOUR * 2 - 0.04, pos: [0.3, 0.6, -6.9], look: [-4.6, 1.7, -14] },
      // Bar three: round the two on the floor, Dave and his speakers going by behind them.
      { t: BAR_OF_FOUR * 2, cut: true, orbit: { centre: [0, 1.0, -8.5], r: 5.2, h: 2.0, angle: -1.05 } },
      { t: BAR_OF_FOUR * 3 - 0.04, orbit: { centre: [0, 1.0, -8.5], r: 5.2, h: 2.0, angle: 1.05 } },
      // Bar four: right in on him, and then away up over the whole room.
      { t: BAR_OF_FOUR * 3, cut: true, pos: [2.0, 2.1, -14.4], look: [0, 1.65, -16.5] },
      { t: BAR_OF_FOUR * 3.5 - 0.04, pos: [1.3, 2.0, -15.0], look: [0, 1.65, -16.5] },
      { t: BAR_OF_FOUR * 3.5, cut: true, pos: [0, 2.0, -4.5], look: [0, 1.3, -14] },
      { t: BAR_OF_FOUR * 4, pos: [0, 6.2, 7], look: [0, 1.0, -12] },
    ],
  },

  // ---------------------------------------------------------------- the foxes at cards
  {
    id: 'a-hand-of-cards',
    name: 'A HAND OF CARDS',
    level: 'hub',
    length: 13,
    cast: {
      vix: {
        who: { is: 'npc', kind: 'fox', name: 'Vix' },
        keys: [
          { t: 0, at: [CARD_TABLE.x + 1.25, 0, CARD_TABLE.z], face: WEST, seated: true, doing: 'cards', head: [0, 0.15], lean: [0.1, 0] },
          // She is sure of this one: she looks up at him, says so, and sits back to wait.
          { t: 1.6, head: [0, 0] },
          { t: 2.2, talk: 2.4, lean: [0.18, 0] },
          { t: 4.8, lean: [-0.08, 0], head: [0, -0.05] },
          // He plays. She looks at it. Her head goes down, and then she shakes it.
          { t: 7.4, head: [0, 0.3], lean: [0.12, 0] },
          { t: 8.6, shake: 2 },
          { t: 10.4, lean: [-0.12, 0], head: [0.5, 0] },
          { t: 13, lean: [-0.12, 0], head: [0.5, 0] },
        ],
      },
      ash: {
        who: { is: 'npc', kind: 'fox', name: 'Ash' },
        keys: [
          { t: 0, at: [CARD_TABLE.x - 1.25, 0, CARD_TABLE.z], face: EAST, seated: true, doing: 'cards', head: [0, 0.2], lean: [0.08, 0] },
          // He hears her out without looking up; one slow nod.
          { t: 3.4, nod: 1 },
          // Then he leans in and plays it, looks up at her, and says his two words.
          { t: 5.4, lean: [0.26, 0], head: [0, 0.25] },
          { t: 6.4, lean: [0.1, 0], head: [0, 0] },
          { t: 7.0, talk: 1.2 },
          { t: 9.6, nod: 2, lean: [-0.06, 0] },
          { t: 13, lean: [-0.06, 0] },
        ],
      },
    },
    cam: [
      { t: 0, pos: [CARD_TABLE.x - 0.5, 2.4, CARD_TABLE.z + 5.6], look: [CARD_TABLE.x, 0.85, CARD_TABLE.z] },
      { t: 2.0, pos: [CARD_TABLE.x - 0.3, 1.8, CARD_TABLE.z + 4.2], look: [CARD_TABLE.x, 0.85, CARD_TABLE.z] },
      // Over his shoulder at her, while she is sure of it.
      { t: 2.1, cut: true, pos: [CARD_TABLE.x - 2.5, 1.35, CARD_TABLE.z + 1.0], look: [CARD_TABLE.x + 1.25, 0.95, CARD_TABLE.z] },
      { t: 5.0, pos: [CARD_TABLE.x - 2.3, 1.3, CARD_TABLE.z + 0.8], look: [CARD_TABLE.x + 1.25, 0.95, CARD_TABLE.z] },
      // Over hers at him, for the card.
      { t: 5.1, cut: true, pos: [CARD_TABLE.x + 2.5, 1.35, CARD_TABLE.z - 1.0], look: [CARD_TABLE.x - 1.25, 0.9, CARD_TABLE.z] },
      { t: 7.3, pos: [CARD_TABLE.x + 2.2, 1.25, CARD_TABLE.z - 0.8], look: [CARD_TABLE.x - 1.25, 0.9, CARD_TABLE.z] },
      // Her, taking it in; and out.
      { t: 7.4, cut: true, pos: [CARD_TABLE.x - 1.9, 1.2, CARD_TABLE.z + 0.9], look: [CARD_TABLE.x + 1.25, 0.95, CARD_TABLE.z] },
      { t: 10.2, pos: [CARD_TABLE.x - 1.8, 1.2, CARD_TABLE.z + 0.8], look: [CARD_TABLE.x + 1.25, 0.95, CARD_TABLE.z] },
      { t: 10.3, cut: true, pos: [CARD_TABLE.x + 0.3, 1.9, CARD_TABLE.z + 4.0], look: [CARD_TABLE.x, 0.85, CARD_TABLE.z] },
      { t: 13, pos: [CARD_TABLE.x + 0.6, 2.5, CARD_TABLE.z + 5.4], look: [CARD_TABLE.x, 0.85, CARD_TABLE.z] },
    ],
  },

  // ---------------------------------------------------------------- two at the bar
  {
    id: 'two-at-the-bar',
    name: 'TWO AT THE BAR',
    level: 'hub',
    length: 13,
    // (Slink keeps the first stool as he always does; the two who talk have the other two.)
    cast: {
      snow: {
        who: { is: 'npc', kind: 'owl', name: 'Professor Snow' },
        keys: [
          { t: 0, at: [BAR.stoolX, 0, STOOLS[2]], face: EAST, seated: true, doing: 'drink', head: [0, 0] },
          // He has a thing to explain, and turns to her to explain it, at length.
          { t: 1.0, head: [0.9, 0] },
          { t: 1.4, talk: 4.2, doing: 'chat', lean: [0.06, 0.1] },
          { t: 5.8, lean: [0, 0], doing: 'drink' },
          // She has an answer. He considers it, and nods, twice, slowly; and back to his thimble.
          { t: 8.8, nod: 2 },
          { t: 11.0, head: [0.9, 0] },
          { t: 12.2, head: [0, 0] },
        ],
      },
      jinx: {
        who: { is: 'npc', kind: 'rat', name: 'Jinx' },
        keys: [
          { t: 0, at: [BAR.stoolX, 0, STOOLS[1]], face: EAST, seated: true, doing: 'drink', head: [0, 0.1] },
          // She lets him run on, looking at the bottles; a glance at him; her head shakes.
          { t: 2.6, head: [-0.7, 0] },
          { t: 4.6, shake: 2 },
          // Then she turns and tells him, short.
          { t: 6.0, head: [-0.9, 0], doing: 'chat', talk: 2.2, lean: [0.08, -0.12] },
          { t: 8.6, lean: [0, 0], doing: 'drink', head: [-0.4, 0] },
          { t: 11.4, head: [0, 0.1] },
          { t: 13, head: [0, 0.1] },
        ],
      },
    },
    cam: [
      // Along the bar from its south end, drawing level with them.
      { t: 0, pos: [BAR.stoolX - 2.4, 1.7, BAR.z1 + 2.6], look: [BAR.stoolX + 0.4, 1.0, BAR_MID + 0.6] },
      { t: 5.6, pos: [BAR.stoolX - 2.9, 1.45, STOOLS[2] - 0.2], look: [BAR.stoolX + 0.2, 1.05, (STOOLS[1] + STOOLS[2]) / 2] },
      // Her say, from past his shoulder.
      { t: 5.7, cut: true, pos: [BAR.stoolX - 1.3, 1.45, STOOLS[2] + 1.5], look: [BAR.stoolX, 1.1, STOOLS[1]] },
      { t: 8.7, pos: [BAR.stoolX - 1.1, 1.4, STOOLS[2] + 1.2], look: [BAR.stoolX, 1.1, STOOLS[1]] },
      // His nod, from past hers; and back off down the room.
      { t: 8.8, cut: true, pos: [BAR.stoolX - 1.3, 1.45, STOOLS[1] - 1.5], look: [BAR.stoolX, 1.15, STOOLS[2]] },
      { t: 11.0, pos: [BAR.stoolX - 1.2, 1.4, STOOLS[1] - 1.3], look: [BAR.stoolX, 1.15, STOOLS[2]] },
      { t: 11.1, cut: true, pos: [BAR.stoolX - 3.4, 1.6, BAR_MID + 0.4], look: [BAR.stoolX + 0.4, 1.0, BAR_MID + 0.4] },
      { t: 13, pos: [BAR.stoolX - 5.6, 2.2, BAR_MID + 0.4], look: [BAR.stoolX + 0.4, 1.0, BAR_MID + 0.4] },
    ],
  },

  // ---------------------------------------------------------------- the old stag, by himself
  {
    id: 'the-old-stag',
    name: 'THE OLD STAG',
    level: 'hub',
    length: 14,
    cast: {
      stag: {
        who: { is: 'npc', kind: 'stag', name: 'Sir Hobnail' },
        keys: [
          // He stands where he always stands, by the way in, with his back half to the room.
          { t: 0, at: [4.4, 0, 20.2], face: Math.atan2(-0.5, -1), doing: 'stand', head: [0, 0.1], lean: [0.04, 0] },
          // The music gets to him. His head comes round to the stage, slowly, and stays.
          { t: 2.4, head: [0, 0.1] },
          { t: 5.0, head: [0.6, -0.05] },
          { t: 8.0, head: [0.6, -0.05], nod: 1 },
          // One nod, with the beat. And then he remembers himself.
          { t: 10.2, head: [0.6, -0.05] },
          { t: 12.0, head: [0, 0.15], lean: [0.07, 0] },
          { t: 14, head: [0, 0.15], lean: [0.07, 0] },
        ],
      },
    },
    cam: [
      // Half round him and in: from the room's side to his own, so that what he looks at comes into the picture.
      { t: 0, orbit: { centre: [4.4, 1.5, 20.2], r: 6.2, h: 1.4, angle: Math.PI + 0.9 } },
      { t: 9.0, orbit: { centre: [4.4, 1.6, 20.2], r: 4.6, h: 0.6, angle: Math.PI - 0.9 } },
      { t: 14, orbit: { centre: [4.4, 1.6, 20.2], r: 4.0, h: 0.5, angle: Math.PI - 1.2 } },
    ],
  },
];

export const cutsceneById = (id: string): CutsceneDef | undefined => CUTSCENES.find((c) => c.id === id);
