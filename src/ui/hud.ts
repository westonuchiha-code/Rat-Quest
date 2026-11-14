import { heartIcon } from './icons';

/** Health hearts in the top-left corner. Builds its own DOM. */
export class Hud {
  private readonly pips: HTMLDivElement[] = [];
  private readonly row: HTMLDivElement;
  private last = -1;

  constructor(parent: HTMLElement, max: number) {
    const style = document.createElement('style');
    style.textContent = `
      .hp-row { position: absolute; top: 8px; left: 8px; display: flex; gap: 1px; pointer-events: none; z-index: 20; filter: drop-shadow(0 1px 0 #000a); }
      .hp-pip { width: 22px; height: 22px; transition: transform 0.12s; }
      .hp-pip svg { width: 100%; height: 100%; display: block; }
      .hp-pip.pop { animation: hp-pop 0.25s; }
      .hp-row.hit { animation: hp-shake 0.25s; }
      @keyframes hp-shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      @keyframes hp-pop { 40% { transform: scale(1.35); } }
    `;
    document.head.appendChild(style);
    this.row = document.createElement('div');
    this.row.className = 'hp-row';
    for (let i = 0; i < max; i++) {
      const pip = document.createElement('div');
      pip.className = 'hp-pip';
      pip.innerHTML = heartIcon(true, 22);
      this.row.appendChild(pip);
      this.pips.push(pip);
    }
    parent.appendChild(this.row);
  }

  /** How many hearts show (what he wears can add or take one away). */
  setMax(max: number): void {
    this.pips.forEach((pip, i) => (pip.style.display = i < max ? '' : 'none'));
  }

  setHealth(hp: number): void {
    if (hp === this.last) return;
    this.pips.forEach((pip, i) => {
      const full = i < hp;
      const was = this.last >= 0 && i < this.last;
      if (full !== was || this.last < 0) pip.innerHTML = heartIcon(full, 22);
      if (full && this.last >= 0 && i >= this.last) {
        pip.classList.remove('pop');
        void pip.offsetWidth;
        pip.classList.add('pop');
      }
    });
    if (this.last >= 0 && hp < this.last) {
      this.row.classList.remove('hit');
      void this.row.offsetWidth; // restart the shake animation
      this.row.classList.add('hit');
    }
    this.last = hp;
  }
}
