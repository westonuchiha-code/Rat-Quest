/**
 * The Tweaks panel: sliders for how the game feels. The game pauses while it is open; close it and play to feel the change.
 * Groups down the left, sliders on the right (wide screens first). Each changed slider has a reset; the bottom row copies
 * the changes as text (to send to Claude), pastes some back in, or resets everything.
 */
import { TWEAKS, TWEAK_GROUPS, Tweaks, defaultTweak } from '../core/tweaks';

const CSS = `
.rq-tw{position:absolute;inset:0;z-index:60;display:none;background:rgba(8,12,9,0.82);color:#e8eedc;font:14px/1.3 ui-monospace,monospace;
  -webkit-user-select:none;user-select:none;touch-action:pan-y}
.rq-tw.on{display:flex;flex-direction:column}
.rq-tw .top{display:flex;align-items:center;gap:.6em;padding:.5em .8em;border-bottom:1px solid #34402e}
.rq-tw .top b{color:#ffe27a;letter-spacing:.12em}
.rq-tw .top span{flex:1;color:#9fae90;font-size:.85em}
.rq-tw button{font:inherit;color:#e8eedc;background:#26301f;border:1px solid #4a5a3c;border-radius:6px;padding:.35em .7em}
.rq-tw button:active{background:#3c4a30}
.rq-tw button.go{background:#3d5a2a;border-color:#7aa05a}
.rq-tw .body{flex:1;display:flex;min-height:0}
.rq-tw .groups{display:flex;flex-direction:column;gap:.35em;padding:.6em;border-right:1px solid #34402e;overflow-y:auto}
.rq-tw .groups button{text-align:left;min-width:8.5em}
.rq-tw .groups button.sel{background:#5a4a1a;border-color:#ffe27a;color:#ffe27a}
.rq-tw .groups button i{font-style:normal;color:#ffb060;margin-left:.3em}
.rq-tw .list{flex:1;overflow-y:auto;padding:.4em .9em 1em}
.rq-tw .tw{display:grid;grid-template-columns:minmax(9em,15em) 1fr 4.2em 2.4em;align-items:center;gap:.7em;padding:.45em 0;border-bottom:1px solid #222a1d}
.rq-tw .tw label{color:#d6dccb}
.rq-tw .tw label small{display:block;color:#8a9880;font-size:.78em}
.rq-tw .tw.ch label{color:#ffd27a}
.rq-tw .tw output{text-align:right;color:#ffe27a}
.rq-tw input[type=range]{width:100%;height:2em;accent-color:#c9a23a;touch-action:none}
.rq-tw .tw button{padding:.25em .45em}
.rq-tw .tw button[disabled]{opacity:.2}
.rq-tw .bottom{display:flex;gap:.5em;align-items:center;padding:.5em .8em;border-top:1px solid #34402e;flex-wrap:wrap}
.rq-tw .bottom .msg{flex:1;color:#b8c8a8;font-size:.85em}
.rq-tw textarea{width:100%;height:4.5em;background:#10150d;color:#e8eedc;border:1px solid #4a5a3c;font:12px ui-monospace,monospace}
`;

export class TweaksPanel {
  open = false;
  private readonly root: HTMLDivElement;
  private group = TWEAK_GROUPS[0];
  private msg = '';
  private pasting = false;
  private armedReset = false;

  constructor(parent: HTMLElement, private readonly tweaks: Tweaks, private readonly onClose: () => void) {
    if (!document.getElementById('rq-tw-css')) {
      const st = document.createElement('style');
      st.id = 'rq-tw-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-tw';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => {
      if ((e.target as HTMLElement).dataset.p) this.render();
    });
    // Keys go to the sliders, not to the game.
    this.root.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.hide();
    });
  }

  show(): void {
    this.open = true;
    this.msg = '';
    this.pasting = false;
    this.armedReset = false;
    this.root.classList.add('on');
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.onClose();
  }

  private fmt(v: number, step: number): string {
    const d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    return v.toFixed(d);
  }

  private render(): void {
    const t = this.tweaks;
    const groups = TWEAK_GROUPS.map((g) => {
      const n = TWEAKS.filter((x) => x.group === g && t.isChanged(x.path)).length;
      return `<button data-g="${g}" class="${g === this.group ? 'sel' : ''}">${g}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('');
    const rows = TWEAKS.filter((x) => x.group === this.group).map((x) => {
      const v = t.get(x.path);
      const ch = t.isChanged(x.path);
      const note = ch ? `was ${this.fmt(defaultTweak(x.path), x.step)}` : '';
      return `<div class="tw${ch ? ' ch' : ''}"><label>${x.label}<small>${[note, x.later ?? ''].filter(Boolean).join(' · ')}</small></label>
        <input type="range" data-p="${x.path}" min="${x.min}" max="${x.max}" step="${x.step}" value="${v}" />
        <output>${this.fmt(v, x.step)}</output>
        <button data-r="${x.path}" title="Back to the default"${ch ? '' : ' disabled'}>↺</button></div>`;
    }).join('');
    const n = t.count();
    this.root.innerHTML = `
      <div class="top"><b>TWEAKS</b><span>${n ? `${n} changed. ` : ''}The game is paused. Change something, then Play to feel it.</span><button class="go" data-a="close">Play</button></div>
      <div class="body"><div class="groups">${groups}</div><div class="list">${rows}${this.pasting ? '<p>Paste tweak text (the JSON line is enough):</p><textarea data-paste></textarea><button class="go" data-a="usepaste">Use it</button>' : ''}</div></div>
      <div class="bottom"><span class="msg">${this.msg}</span>
        <button data-a="copy">Copy settings</button><button data-a="paste">Paste</button>
        <button data-a="resetgroup">Reset ${this.group}</button><button data-a="resetall">${this.armedReset ? 'Sure? Tap again' : 'Reset all'}</button></div>`;
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    const path = el.dataset.p;
    if (!path) return;
    this.tweaks.set(path, Number(el.value));
    const def = TWEAKS.find((x) => x.path === path)!;
    const row = el.closest('.tw');
    const out = row?.querySelector('output');
    if (out) out.textContent = this.fmt(this.tweaks.get(path), def.step);
    // A full redraw would drop the drag, so only this row changes now; the rest is redrawn when the finger lets go.
    row?.classList.toggle('ch', this.tweaks.isChanged(path));
  }

  private onClick(e: Event): void {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!el) return;
    const ds = el.dataset;
    if (ds.g) {
      this.group = ds.g;
      this.pasting = false;
    } else if (ds.r) {
      this.tweaks.reset(ds.r);
    } else if (ds.a === 'close') return this.hide();
    else if (ds.a === 'copy') {
      const text = this.tweaks.text();
      navigator.clipboard?.writeText(text).then(
        () => { this.msg = 'Copied. Paste it to Claude to make these the defaults.'; this.render(); },
        () => { this.msg = 'Could not copy: select the text below and copy it.'; this.pasting = true; this.render(); this.root.querySelector('textarea')!.value = text; },
      );
      return;
    } else if (ds.a === 'paste') this.pasting = !this.pasting;
    else if (ds.a === 'usepaste') {
      const n = this.tweaks.load((this.root.querySelector('textarea') as HTMLTextAreaElement)?.value ?? '');
      this.msg = n ? `Used ${n} setting${n === 1 ? '' : 's'}.` : 'Found nothing to use in that text.';
      this.pasting = !n;
    } else if (ds.a === 'resetgroup') {
      for (const x of TWEAKS) if (x.group === this.group) this.tweaks.reset(x.path);
    } else if (ds.a === 'resetall') {
      if (!this.armedReset) {
        this.armedReset = true;
        return this.render();
      }
      this.tweaks.reset();
      this.msg = 'Everything is back to the default.';
    }
    this.armedReset = false;
    this.render();
  }
}
