/**
 * Pip's shop: what he sells at his counter in the Club, and what it costs.
 * Prices are in cheese crumbs, and the finer things also want bottle caps. Gear bought is his to keep (it is not put on:
 * he chooses that in the menu); snacks go in the bag, up to how many he can carry. The prices themselves are in balance.ts.
 */
import { BALANCE, type PricedId } from './balance';
export interface ShopItem {
  /** An equipment id (gear) or a consumable id (a snack). */
  id: string;
  kind: 'gear' | 'snack';
  crumbs: number;
  caps: number;
}

/** An item whose price is read from the balance table each time (so a change in Tweaks shows at once). */
function priced(id: PricedId, kind: ShopItem['kind']): ShopItem {
  return {
    id,
    kind,
    get crumbs() {
      return BALANCE.prices[id].crumbs;
    },
    get caps() {
      return BALANCE.prices[id].caps;
    },
  };
}

export const SHOP: ShopItem[] = [
  priced('nachoCheese', 'snack'),
  priced('mossScarf', 'gear'),
  priced('minerHelm', 'gear'),
  priced('sludgeScarf', 'gear'),
  priced('buckler', 'gear'),
  priced('emberHelm', 'gear'),
  priced('cleaver', 'gear'),
  priced('royalScarf', 'gear'),
];
