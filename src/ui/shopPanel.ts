/**
 * Pip's shop screen: Pip and the purse on the left, the goods on the right. The game is paused while it is open.
 * Tap Buy (touch), or move with up/down and confirm (pad / keyboard); back closes it.
 */
import { capIcon, crumbIcon } from './icons';
import type { Money } from '../core/wallet';

export interface ShopRow {
  id: string;
  name: string;
  description: string;
  /** Inline SVG. */
  icon: string;
  crumbs: number;
  caps: number;
  /** buy: can buy now; poor: cannot afford it; owned: gear he has; full: carrying all he can. */
  state: 'buy' | 'poor' | 'owned' | 'full';
  /** e.g. "carrying 2 of 9" */
  note?: string;
  /** Gear: what it does for him and what it costs him. */
  perk?: string;
  cost?: string;
}

export interface ShopHost {
  rows(): ShopRow[];
  money(): Money;
  /** Buys it; returns what Pip says. */
  buy(id: string): string;
  onClose(): void;
  /** The controls, as button chips (the game fills it in). */
  help?(): string;
}

const CSS = `
.rq-shop{position:absolute;inset:0;z-index:70;display:none;background:rgba(12,9,6,0.95);color:#f2e8cf;font:clamp(12px,2.4vh,16px)/1.3 var(--rq-font-game);
  -webkit-user-select:none;user-select:none}
.rq-shop.on{display:flex}
.rq-shop .up{color:#9fe08a}.rq-shop .down{color:#f08a7a}
.rq-shop .who{width:min(32%,20em);padding:2.2em 1em 1em;border-right:1px solid #4a3a24;display:flex;flex-direction:column;gap:.8em}
.rq-shop .who b{color:#ffe27a;letter-spacing:.12em}
.rq-shop .say{background:#2a2016;border:1px solid #5a4630;border-radius:.4em;padding:.6em;color:#f8eed8;min-height:4em}
.rq-shop .purse{display:flex;gap:1.2em;align-items:center;font-size:1.15em;color:#ffe27a}
.rq-shop .purse span{display:flex;align-items:center;gap:.3em}
.rq-shop .who button{margin-top:auto}
.rq-shop .help{display:flex;flex-direction:column;align-items:flex-start;gap:.45em;color:#d8ccb0}
.rq-shop .help .rqg-pair{margin:0}
.rq-shop .goods{flex:1;overflow-y:auto;padding:.6em .9em;display:flex;flex-direction:column;gap:.45em}
.rq-shop .row{display:grid;grid-template-columns:3.2em 1fr auto 6.5em;gap:.7em;align-items:center;background:#1e1810;border:1px solid #3a2e1e;border-radius:.4em;padding:.4em .6em}
.rq-shop .row.sel{border-color:#ffe27a;background:#2c2214}
.rq-shop .row b{color:#ffe9b0}
.rq-shop .row small{display:block;color:#c8b898;font-size:.82em}
.rq-shop .price{display:flex;gap:.6em;align-items:center;color:#ffe27a;white-space:nowrap}
.rq-shop .price span{display:flex;align-items:center;gap:.2em}
.rq-shop .price .short{color:#ff8a6a}
.rq-shop button{font:inherit;color:#f2e8cf;background:#3a2c1a;border:1px solid #7a6040;border-radius:.4em;padding:.45em .7em}
.rq-shop button.go{background:#3d6a2a;border-color:#8ad06a;font-weight:700}
.rq-shop button[disabled]{opacity:.45}
.rq-shop .icon svg{width:2.8em;height:2.8em;display:block}
`;

export class ShopPanel {
  open = false;
  private readonly root: HTMLDivElement;
  private sel = 0;
  private line = '';

  constructor(parent: HTMLElement, private readonly host: ShopHost) {
    if (!document.getElementById('rq-shop-css')) {
      const st = document.createElement('style');
      st.id = 'rq-shop-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-shop';
    parent.appendChild(this.root);
    this.root.addEventListener('pointerdown', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (b?.dataset.buy) {
        e.preventDefault();
        this.sel = Number(b.dataset.i);
        this.buy();
      } else if (b?.dataset.a === 'close') {
        e.preventDefault();
        this.close();
      } else {
        const row = (e.target as HTMLElement).closest('.row') as HTMLElement | null;
        if (row) {
          this.sel = Number(row.dataset.i);
          this.render();
        }
      }
    });
  }

  show(greeting: string): void {
    this.open = true;
    this.sel = 0;
    this.line = greeting;
    this.root.classList.add('on');
    this.render();
  }

  /** Draws it again if it is open (the button prompts changed). */
  refresh(): void {
    if (this.open) this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.host.onClose();
  }

  move(d: number): void {
    const n = this.host.rows().length;
    if (!n) return;
    this.sel = (this.sel + d + n) % n;
    this.render();
    (this.root.querySelector('.row.sel') as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  }

  buy(): void {
    const row = this.host.rows()[this.sel];
    if (!row) return;
    this.line = this.host.buy(row.id);
    this.render();
  }

  private render(): void {
    const m = this.host.money();
    const rows = this.host.rows();
    const price = (r: ShopRow): string => {
      const parts: string[] = [];
      if (r.crumbs) parts.push(`<span class="${m.crumbs < r.crumbs ? 'short' : ''}">${crumbIcon(18)}${r.crumbs}</span>`);
      if (r.caps) parts.push(`<span class="${m.caps < r.caps ? 'short' : ''}">${capIcon(18)}${r.caps}</span>`);
      return parts.join('');
    };
    const label = (r: ShopRow): string => (r.state === 'owned' ? 'Owned' : r.state === 'full' ? 'Bag full' : 'Buy');
    this.root.innerHTML = `
      <div class="who"><b>PIP'S</b><div class="say">${this.line}</div>
        <div class="purse"><span>${crumbIcon(22)}${m.crumbs}</span><span>${capIcon(22)}${m.caps}</span></div>
        <div class="help">${this.host.help?.() ?? ''}</div>
        <button data-a="close">Leave</button></div>
      <div class="goods">${rows.map((r, i) => `
        <div class="row${i === this.sel ? ' sel' : ''}" data-i="${i}">
          <div class="icon">${r.icon}</div>
          <div><b>${r.name}</b><small>${r.perk ? `<span class="up">+ ${r.perk}</span> <span class="down">&minus; ${r.cost ?? ''}</span>` : r.description}${r.note ? ` (${r.note})` : ''}</small></div>
          <div class="price">${r.state === 'owned' ? '' : price(r)}</div>
          <button class="${r.state === 'buy' ? 'go' : ''}" data-buy="1" data-i="${i}"${r.state === 'owned' || r.state === 'full' ? ' disabled' : ''}>${label(r)}</button>
        </div>`).join('')}</div>`;
  }
}
