/**
 * The game's balance in one place: how many Golden Wedges each Club door wants, and what Pip charges.
 * All of it is on sliders in Tweaks (the "Doors and prices" group), so it can be tuned in the game; "Copy settings" there
 * gives the changes as text to make them the defaults.
 *
 * How the defaults were picked (when there were 38 wedges: Cistern 13, Foundry 10, Hollows 9, Keep 6; there are 45 now,
 * the extra ones mostly gear secrets, and the doors have not been raised to match):
 *   Each door asks for well under the wedges a player could have by then, so no single hard wedge is ever required.
 *   The Foundry wants 4 of the Cistern's 13 (about a third); the Hollows 10 of the 23 open by then (under half); the Keep,
 *   the last door, 20 of 32 (just under two thirds; Super Mario 64's last door asks for about 58% of every star).
 *   The shop: seven pieces of gear, each a trade (something gained, something given up). All of it costs about four
 *   fifths of the game's crumbs (117 of 147) and just over half its caps (25 of 45), so a thorough player can have
 *   everything, but not out of the first world alone.
 */
export const BALANCE = {
  doors: { foundry: 4, hollows: 10, keep: 20 },
  prices: {
    nachoCheese: { crumbs: 8, caps: 0 },
    mossScarf: { crumbs: 10, caps: 0 },
    minerHelm: { crumbs: 12, caps: 2 },
    sludgeScarf: { crumbs: 15, caps: 2 },
    buckler: { crumbs: 15, caps: 3 },
    emberHelm: { crumbs: 20, caps: 5 },
    cleaver: { crumbs: 20, caps: 5 },
    royalScarf: { crumbs: 25, caps: 8 },
  },
};

export type PricedId = keyof typeof BALANCE.prices;
