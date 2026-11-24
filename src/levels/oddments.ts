/**
 * ODDS AND ENDS ABOUT THE LEVELS (2026-11-19; the owner, of the household junk in the Hall and the Club: "I really
 * like the addition of all the little extra items, I think it really fills out the world"). Up to four in each of the
 * main rooms and their side areas, chosen to suit the place: spoons and teacups in the sewers, batteries and matches
 * in the Foundry, a chess pawn and candles in the Keep, reels and dice in the caves.
 *
 * The places were found by a probe of each room's floor: flat under all of it, nothing solid there, a wall close by
 * (so each lies along an edge, not in a way through), and well clear of characters, pickups, gear, doors, creatures,
 * buttons, moving platforms, water, lava, fire, pits, the heaps of pots and rocks, where he starts and the way out;
 * and well away from every creature and the space it fights in (the Keep's pawn first stood in the ward, in the ant
 * pikemen's way). The glowing cave and the webs have no such place, and none. tests/oddments.ts checks it all. To move one, change its numbers here; to add a room, add a line.
 */
import type { LevelDef } from './types';
import { junkSolids, type JunkKind } from '../world/layout';

/** Per room: [what, x, z, floor height, a quarter turn (1) or none (0)]. */
export const ODDMENTS: Record<string, Array<[JunkKind, number, number, number, 0 | 1]>> = {
  cistern: [['spoon', 37, 46, 0, 0], ['teacup', -46, -46, 0, 0], ['sardines', 41, -46, 0, 0], ['button', -46, 46, 0, 0], ['safetypin', -32, 29, 0, 0], ['paperclip', 46, -40, 0, 0]],
  // (The Cold Main's ice is pale: a red button where a grey spoon was lost against it.)
  coldmain: [['battery', -13, 8, 0, 0], ['teacup', 13, -9, 0, 0], ['button', -6, -10.2, 0, 0], ['sardines', 3, -9, 0, 0]],
  foundry: [['battery', 46, 38, 0, 1], ['matchbox', -46, -23, 0, 0], ['pencil', 35, -46, 0, 0], ['candle', -21, 45, 0, 0]],
  hollows: [['spool', 25, 22, 0, 0], ['cheese', 4, -46, 0, 0], ['pawn', -24, 11, 0, 0], ['button', 46, -31, 0, 0]],
  keep: [['candle', -41, -41, 12, 0], ['die', 46, 13, 0, 0], ['teacup', 37, -41, 0, 0], ['pawn', -34, -46, 12, 0]],
  pumpworks: [['battery', 27, 19, 0, 1], ['spoon', -8, -28, 2.4, 0], ['sardines', -28, 19, 0, 0], ['matchbox', 28, -19, 0, 1]],
  works: [['battery', 36, 32, 0, 1], ['pencil', -36, -48, 2.4, 0], ['candle', -36, 48, 0, 0], ['matchbox', 36, -41, 2.4, 0], ['safetypin', 36, 42, 0, 0], ['paperclip', -36, -20, 0, 0]],
  sludgepit: [['spoon', -22, 20, 0, 1], ['button', 22, -22, 0, 0], ['sardines', 22, 22, 0, 0], ['teacup', -21, -22, 0, 0], ['paperclip', 13, 22, 0, 0], ['safetypin', -22, -16, 0, 1]],
  coalcellars: [['matchbox', -14, -2, 0, 0], ['candle', 12, 20, 0, 0], ['battery', 13, -7, 0, 0], ['pencil', -11, 20, 0, 1]],
  glimmer: [['die', 18, 14, 7, 0], ['button', -22, 7, 0, 0], ['cheese', 22, -18, 16.5, 0], ['spool', -10, 18, 7, 0]],
  forge: [['matchbox', -14, 10, 0, 1], ['battery', 14, -10, 0, 0], ['candle', 7, 10, 0, 0], ['pencil', -11, -10, 0, 0]],
  // (2026-11-19, more: the dream rooms get the nursery's things, a crayon and marbles; a corner of the Brood Pit by the
  // way in, and the shaft. Not the Long Drop, the Widow's pit or the dark: nowhere clear of their fights. Not the
  // villain's lair: the whole room is his fight.)
  toybox: [['crayon', 18, -22, 0, 0], ['marble', -34, 54, 0, 0], ['die', 34, 45, 0, 0], ['marble', -34, -54, 0, 0]],
  milkyway: [['marble', 9, 251, 0, 0], ['crayon', -9, 265, 0, 1]],
  bigdipper: [['marble', -10, 3610, 0, 0], ['crayon', 10, 3631, 0, 1]],
  brood: [['spool', -15, 20, 0, 0], ['button', 9, 21, 0, 0]],
  shaft: [['battery', -6, 20, 0, 0]],
  garden: [['teacup', 8, -10, 0, 0], ['spoon', -34, 22, 0, 1], ['cheese', 34, 22, 8, 0], ['button', -31, -17, 0, 0]],
};

/** The odds and ends of one room: [what, x, y, z, yaw]. Empty for a room not in the list. */
export function oddmentsIn(def: LevelDef): Array<[JunkKind, number, number, number, number]> {
  return (ODDMENTS[def.id] ?? []).map(([what, x, z, y, turn]) => [what, x, y, z, turn ? Math.PI / 2 : 0]);
}

/** Puts them in: drawn, and solid to stand on. Once per level. */
export function layOddments(all: LevelDef[]): void {
  for (const def of new Set(all)) {
    if ((def as { oddmentsLaid?: boolean }).oddmentsLaid) continue;
    const things = oddmentsIn(def);
    if (!things.length) continue;
    (def as { oddmentsLaid?: boolean }).oddmentsLaid = true;
    for (const [what, x, y, z, yaw] of things) {
      def.decor.push({ kind: 'junk', what, x, y, z, yaw });
      def.solids.push(...junkSolids(what, x, y, z, yaw));
    }
  }
}
