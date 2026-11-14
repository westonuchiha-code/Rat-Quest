/**
 * Things he can carry and use from the ITEMS screen. Gear (what he wears) lives in equipment.ts.
 */
export interface ConsumableDef {
  id: string;
  name: string;
  description: string;
  /** Health pips restored when used. */
  heal: number;
  /** How many he can carry of one kind. */
  maxStack: number;
}

export const CONSUMABLES: Record<string, ConsumableDef> = {
  nachoCheese: {
    id: 'nachoCheese', name: 'Nacho Cheese', description: 'A dented can of warm, glowing cheese. Restores 2 hearts.',
    heal: 2, maxStack: 9,
  },
};

/**
 * What a broken crate or barrel may leave behind, each with its own chance. Tune `chance` to change how generous they
 * are. One in ten gives a can of nacho cheese (the owner's number, 2026-11-14: every one of them used to).
 */
export const CRATE_DROPS: Array<{ itemId: string; chance: number }> = [{ itemId: 'nachoCheese', chance: 0.1 }];

/** Rolls the crate table once. `random` returns a number from 0 up to (not including) 1. */
export function rollCrateDrop(random: () => number = Math.random): string | null {
  for (const d of CRATE_DROPS) if (random() < d.chance) return d.itemId;
  return null;
}
