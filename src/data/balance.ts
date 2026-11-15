/**
 * The game's balance in one place: how many Golden Wedges each Club door wants, and what Pip charges.
 * All of it is on sliders in Tweaks (the "Doors and prices" group), so it can be tuned in the game; "Copy settings" there
 * gives the changes as text to make them the defaults.
 *
 * How the defaults were picked (there are 47 wedges: Cistern 16, Foundry 12, Hollows 12, Keep 7):
 *   Each door asks for well under the wedges a player could have by then, so no single hard wedge is ever required.
 *   The Foundry wants 5 of the Cistern's 16 (about a third); the Hollows 12 of the 28 open by then (under half); the Keep,
 *   the last door, 25 of 40 (just under two thirds; Super Mario 64's last door asks for about 58% of every star).
 *   They were 4, 10 and 20 when there were 38 wedges (13, 10, 9, 6), and were left there while nine more were added
 *   (gear secrets and the two bosses), which made every door a little easier than it was meant to be. On 2026-11-15
 *   they were put back to the same shares. tests/balance.ts holds the shares: add wedges and it will say so.
 *   A door he has already been through stays open whatever it asks now (main.ts, `doorOpen`): raising a door must
 *   not shut a world on a save that had got there.
 *   The shop: seven pieces of gear, each a trade (something gained, something given up). All of it costs about four
 *   fifths of the game's crumbs (117 of 147) and three fifths of its caps (25 of 42), so a thorough player can have
 *   everything, but not out of the first world alone.
 *   "Crumbs" here is what the cheese is WORTH. Since 2026-11-15 the Great Cistern's cheese is three hunks worth eight
 *   each in place of twenty-four crumbs (the owner: fewer things, each one earned), so the prices did not have to move.
 *   When another world's crumbs are traded for hunks, keep what they are worth the same and nothing here changes. Caps
 *   are one each: the Cistern has five now where it had eight; cut many more and the caps prices will want looking at.
 */
export const BALANCE = {
  doors: { foundry: 5, hollows: 12, keep: 25 },
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
