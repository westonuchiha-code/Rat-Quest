/**
 * Compact collectible counter: one centred row with three CSS icons. DOM is only touched in the constructor.
 */
import type { Count } from '../world/collectibles';

const CSS = `
.rq-collect { position: absolute; top: 8px; right: 8px; z-index: 20;
  display: flex; gap: 0.8em; align-items: center; padding: 0.25em 0.6em; border-radius: 0.4em;
  background: rgba(8, 12, 10, 0.5); color: #e8efe0; font: max(13px, 1.8vh)/1 ui-monospace, Menlo, Consolas, monospace;
  pointer-events: none; user-select: none; white-space: nowrap; }
.rq-collect .rq-item { display: flex; align-items: center; gap: 0.35em; transition: transform 0.15s, color 0.15s; }
.rq-collect .rq-item.rq-bump { transform: scale(1.3); color: #fff2a0; }
.rq-collect .rq-icon { display: inline-block; width: 0.85em; height: 0.85em; }
.rq-collect .rq-crumb { background: #f2c230; clip-path: polygon(0 15%, 100% 55%, 100% 100%, 0 100%); }
.rq-collect .rq-cap { border-radius: 50%; background: radial-gradient(circle, #c0392b 0 38%, #9aa0a6 42%); }
.rq-collect .rq-relic { width: 0.65em; height: 0.65em; margin: 0.1em; background: #ffd23a; transform: rotate(45deg);
  box-shadow: 0 0 4px #ffd23a; }
`;

interface Slot {
  box: HTMLElement;
  label: HTMLElement;
  last: number;
  timer: number;
}

export class CollectHud {
  private readonly slots: Slot[] = [];

  constructor(parent: HTMLElement) {
    if (!document.getElementById('rq-collect-style')) {
      const style = document.createElement('style');
      style.id = 'rq-collect-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const row = document.createElement('div');
    row.className = 'rq-collect';
    for (const icon of ['rq-crumb', 'rq-cap', 'rq-relic']) {
      const box = document.createElement('span');
      box.className = 'rq-item';
      const ic = document.createElement('span');
      ic.className = `rq-icon ${icon}`;
      const label = document.createElement('span');
      label.textContent = '0/0';
      box.append(ic, label);
      row.appendChild(box);
      this.slots.push({ box, label, last: -1, timer: 0 });
    }
    parent.appendChild(row);
  }

  set(crumbs: Count, caps: Count, relics: Count): void {
    [crumbs, caps, relics].forEach((c, i) => {
      const s = this.slots[i];
      s.label.textContent = `${c.have}/${c.total}`;
      s.box.style.display = c.total > 0 ? '' : 'none';
      if (s.last >= 0 && c.have > s.last) {
        s.box.classList.add('rq-bump');
        window.clearTimeout(s.timer);
        s.timer = window.setTimeout(() => s.box.classList.remove('rq-bump'), 180);
      }
      s.last = c.have;
    });
  }
}
