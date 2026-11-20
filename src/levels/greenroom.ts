/**
 * THE GREEN ROOM (Test Room 17, 2026-11-20). New characters for Fable, waiting to be given a place in the world: a
 * MOLE and a HEDGEHOG, two of each (npc/patrons.ts, as the Club's regulars are made). The owner, the same day: "most
 * of the characters were designed by Opus in the first place so we could also pump out a bunch of different
 * characters for Fable to work on later."
 *   Digger and Dot, the moles, at a table playing cards.
 *   Bramble, the hedgehog, keeping a little counter; Thistle on a stool across it, with a drink.
 * Each can be talked to. Each kind has a voice (audio/speech.ts), a portrait (npc/portrait.ts) and can be cast in a
 * cutscene (cutscene/stage.ts).
 */
import { compileCustom, type CustomLevel } from './custom';
import type { LevelDef } from './types';
import { stoolSolids, tableSolids, type Decor } from '../world/layout';
import type { NpcSpec } from '../npc/npc';

const HX = 14;
const HZ = 10;
/** The card table and the counter. */
export const GREEN = { cards: { x: -4, z: -4 }, counter: { x: 5, z: -5 }, out: 1.25 } as const;

const room: CustomLevel = {
  name: 'The Green Room',
  blurb: 'New characters for Fable: two moles at cards, two hedgehogs at a counter. Talk to them.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 8,
  pieces: [
    { t: 'floor', x0: -HX, z0: -HZ, x1: HX, z1: HZ, top: 0 },
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
  ],
};

export function greenRoom(): LevelDef {
  const def = compileCustom(room, 'greenroom');
  const C = GREEN.cards;
  const K = GREEN.counter;
  const decor: Decor[] = [
    { kind: 'table', x: C.x, y: 0, z: C.z, yaw: 0, mugs: [[0, 0.5], [Math.PI, 0.5]], candle: true },
    { kind: 'table', x: K.x, y: 0, z: K.z, yaw: 0, mugs: [[Math.PI / 2, 0.55], [-Math.PI / 2, 0.55]] },
    { kind: 'stool', x: C.x + GREEN.out, y: 0, z: C.z },
    { kind: 'stool', x: C.x - GREEN.out, y: 0, z: C.z },
    { kind: 'stool', x: K.x, y: 0, z: K.z + GREEN.out },
    { kind: 'sign', x: 0, y: 4.2, z: -HZ + 0.06, yaw: 0, w: 9, h: 2.2, lines: ['THE GREEN ROOM', 'new faces, waiting for a place:', 'a mole and a hedgehog, two of each'], post: 0 },
  ];
  const solids = [
    ...tableSolids(C.x, 0, C.z), ...tableSolids(K.x, 0, K.z),
    ...stoolSolids(C.x + GREEN.out, 0, C.z), ...stoolSolids(C.x - GREEN.out, 0, C.z), ...stoolSolids(K.x, 0, K.z + GREEN.out),
  ];
  const npcs: NpcSpec[] = [
    { name: 'Digger', kind: 'mole', x: C.x + GREEN.out, z: C.z, y: 0, facing: -Math.PI / 2, seated: true, doing: 'cards', turn: 0, partner: [C.x - GREEN.out, C.z], lines: [
      'Eh? Oh, a visitor. Mind the lamp, it is brighter than it looks. Most things are, to me.',
      'Dot cheats. I cannot prove it. I cannot see the cards either, mind.',
    ] },
    { name: 'Dot', kind: 'mole', x: C.x - GREEN.out, z: C.z, y: 0, facing: Math.PI / 2, seated: true, doing: 'cards', turn: 1, partner: [C.x + GREEN.out, C.z], lines: [
      'Good evening. Or morning. Down here it hardly matters, does it?',
      'I knitted this scarf in the dark. You can tell, apparently.',
    ] },
    { name: 'Bramble', kind: 'hedgehog', x: K.x, z: K.z - GREEN.out, y: 0, facing: 0, doing: 'tend', partner: [K.x, K.z + GREEN.out], lines: [
      'What will it be? We have got water, and we have got water that has been near a lemon.',
      'Do not lean on the counter. I mean, you can. I just will not hug you after.',
    ] },
    { name: 'Thistle', kind: 'hedgehog', x: K.x, z: K.z + GREEN.out, y: 0, facing: Math.PI, seated: true, doing: 'drink', partner: [K.x, K.z - GREEN.out], lines: [
      'Oh! A rat with a sword. How exciting. Do sit down. Not there, that is a cushion. I am the cushion.',
      'This flower? A thistle. Named after me. Or I was named after it. One of us was first.',
    ] },
  ];
  return { ...def, decor: [...def.decor, ...decor], solids: [...def.solids, ...solids], npcs: [...(def.npcs ?? []), ...npcs] };
}
