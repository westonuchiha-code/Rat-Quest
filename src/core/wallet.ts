/**
 * His purse. What he has is everything he has ever picked up in the worlds (crumbs and caps stay picked up, so this
 * cannot be farmed) less what he has spent at Pip's. Only the spending is stored here.
 */
export const WALLET_KEY = 'ratquest.wallet.v1';

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Money {
  crumbs: number;
  caps: number;
}

export class Wallet {
  private spent: Money = { crumbs: 0, caps: 0 };

  /** `earned` says how much he has picked up in all. */
  constructor(private readonly storage: Store | null, private readonly earned: () => Money) {
    this.read();
  }

  /** Reads it again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.spent = { crumbs: 0, caps: 0 };
    this.read();
  }

  private read(): void {
    try {
      const d = JSON.parse(this.storage?.getItem(WALLET_KEY) ?? '{}') as Partial<Money>;
      this.spent = { crumbs: Math.max(0, Number(d.crumbs) || 0), caps: Math.max(0, Number(d.caps) || 0) };
    } catch {
      // A broken purse is an empty one.
    }
  }

  balance(): Money {
    const e = this.earned();
    return { crumbs: Math.max(0, e.crumbs - this.spent.crumbs), caps: Math.max(0, e.caps - this.spent.caps) };
  }

  canAfford(price: Money): boolean {
    const b = this.balance();
    return b.crumbs >= price.crumbs && b.caps >= price.caps;
  }

  /** Pays, if he can. */
  pay(price: Money): boolean {
    if (!this.canAfford(price)) return false;
    this.spent = { crumbs: this.spent.crumbs + price.crumbs, caps: this.spent.caps + price.caps };
    this.save();
    return true;
  }

  /** A new game: nothing spent. */
  reset(): void {
    this.spent = { crumbs: 0, caps: 0 };
    this.save();
  }

  private save(): void {
    try {
      this.storage?.setItem(WALLET_KEY, JSON.stringify(this.spent));
    } catch {
      // Best effort.
    }
  }
}
