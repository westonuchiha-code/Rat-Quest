/**
 * The campaign: the fourteen rooms of the story, in the order he plays them, and the rule for which ones are open.
 * Plain data, so tests can check it in node.
 */
export const CAMPAIGN = [
  'sewer', 'caps', 'hunt', 'waves', 'leap', 'crates', 'waterworks',
  'plankpit', 'cellars', 'liftshaft', 'furnace', 'webhollow', 'lair', 'davespot',
] as const;

/** 1 to 14 for a campaign room, 0 for anything else (bonus rooms, builder levels). */
export function campaignNumber(id: string): number {
  return (CAMPAIGN as readonly string[]).indexOf(id) + 1;
}

/**
 * A level is open when it is the first, when the one before it has been cleared, or when it has been cleared itself.
 * `order` is every level id in playing order; `cleared` says whether a level's main goals have been done.
 */
export function isUnlocked(id: string, order: readonly string[], cleared: (id: string) => boolean): boolean {
  const i = order.indexOf(id);
  if (i < 0) return true; // not in the list (a builder level): never locked
  return i === 0 || cleared(id) || cleared(order[i - 1]);
}

/** The level after this one. The last level leads back to the first. */
export function nextInOrder(id: string, order: readonly string[]): string {
  return order[(order.indexOf(id) + 1) % order.length];
}
