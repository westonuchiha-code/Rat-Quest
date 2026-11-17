/**
 * WHERE A LEVEL'S WAY OUT LEADS. (Plain logic, so it can be checked without the game running: tests/hall.ts.)
 *
 * Since every level became a test room off the Hall (2026-11-17), a level can be reached from more than one place: the
 * Toy Box from the Hall and from the Move Garden, the Sewers from the Hall and from the Club. So:
 *   1. back to the place he CAME IN FROM, if that place has a door to it (he comes out of the door he went in by);
 *   2. else to the Hall, if the Hall has a door to it (a level opened by itself, from a file or the address);
 *   3. else to the area it is a side area of (`returnTo`);
 *   4. else, a course with wedges, one of his own levels, or the Club itself: to the Club, or from the Club to the Hall;
 *   5. else nowhere: an old level of the archive, which leads on to the next.
 */
import type { CourseDoorDef, LevelDef } from './types';

export interface WayOutWorld {
  /** The Hall. */
  home: LevelDef | null;
  /** The Club. */
  hub: LevelDef | null;
  byId(id: string): LevelDef | undefined;
  doorsOf(l: LevelDef): CourseDoorDef[];
  /** One of the player's own levels from the builder. */
  isMine(id: string): boolean;
}

export function wayOutOf(l: LevelDef, cameFrom: string | undefined, w: WayOutWorld): LevelDef | null {
  const leadsHere = (p: LevelDef | null | undefined): p is LevelDef => !!p && p !== l && w.doorsOf(p).some((d) => d.to === l.id);
  const from = cameFrom ? w.byId(cameFrom) : undefined;
  if (leadsHere(from)) return from;
  if (leadsHere(w.home)) return w.home;
  const side = l.returnTo ? w.byId(l.returnTo) : undefined;
  if (side && side !== l) return side;
  if ((l.wedges || w.isMine(l.id)) && w.hub && w.hub !== l) return w.hub;
  return l.hub && w.home && w.home !== l ? w.home : null;
}
