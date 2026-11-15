/**
 * Game feel: sliders for how the game plays. The game pauses while it is open; close it and play to feel the change.
 * Groups down the left (in sections, with a count of what has been changed), sliders on the right, each with a box
 * for an exact number and a way back to its default. A search box finds a slider in any group; "changed" shows only
 * what is off its default. The bottom row copies the changes as text (to send to Claude), pastes some in, or resets.
 */
import { JUMP_SETS, TWEAKS, TWEAK_GROUPS, TWEAK_SECTIONS, Tweaks, defaultTweak, type TweakDef } from '../core/tweaks';
import { esc, icon, useDevTheme } from './devTheme';

const CSS = `
.rq-tw { position: absolute; inset: 0; z-index: 62; display: none; flex-direction: column; background: #0f1218f2; touch-action: pan-y; }
.rq-tw.on { display: flex; }
.rq-tw > header { display: flex; align-items: center; gap: 0.7em; padding: 0.6em 1em; border-bottom: 1px solid var(--line); background: #151a24; flex-wrap: wrap; }
.rq-tw > header h1 { margin: 0; font-size: 1.2em; letter-spacing: 0.14em; color: var(--gold); display: flex; align-items: center; gap: 0.5em; }
.rq-tw > header .say { flex: 1; color: var(--dim); font-size: 0.9em; min-width: 8em; }
.rq-tw > header input[type=search] { width: 13em; }
.rq-tw .body { flex: 1; display: flex; min-height: 0; }
.rq-tw .groups { width: 13.5em; flex: none; padding: 0.5em; border-right: 1px solid var(--line); overflow-y: auto; background: var(--panel); }
.rq-tw .groups h4 { margin: 0.8em 0.3em 0.3em; font-size: 0.74em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--faint); }
.rq-tw .groups h4:first-child { margin-top: 0.2em; }
.rq-tw .groups button { width: 100%; justify-content: flex-start; border-color: #0000; background: none; margin-bottom: 0.15em; }
.rq-tw .groups button:hover { background: var(--raise); }
.rq-tw .groups button.on { background: #3a3110; border-color: var(--gold); color: #fff3c4; }
.rq-tw .groups button .badge { margin-left: auto; }
.rq-tw .list { flex: 1; overflow-y: auto; padding: 0.3em 1.1em 1em; min-width: 0; }
.rq-tw .list h3 { margin: 1em 0 0.2em; font-size: 0.8em; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dim); }
.rq-tw .tw { display: grid; grid-template-columns: minmax(10em, 17em) minmax(6em, 1fr) 5.2em 2.3em; align-items: center; gap: 0.8em; padding: 0.5em 0; border-bottom: 1px solid #232a38; }
.rq-tw .tw label small { display: block; color: var(--faint); font-size: 0.8em; }
.rq-tw .tw.ch label { color: var(--gold); }
.rq-tw .tw input[type=range] { width: 100%; height: 2em; touch-action: none; }
.rq-tw .tw input[type=number] { width: 100%; text-align: right; font-family: ui-monospace, Menlo, Consolas, monospace; }
.rq-tw .tw.ch input[type=number] { color: var(--gold); border-color: #7a6220; }
.rq-tw .tw button { padding: 0; min-height: 2em; }
.rq-tw > footer { display: flex; gap: 0.5em; align-items: center; padding: 0.55em 1em; border-top: 1px solid var(--line); background: #151a24; flex-wrap: wrap; }
.rq-tw > footer .msg { flex: 1; color: #fff3c4; font-size: 0.9em; min-width: 6em; }
.rq-tw .none { color: var(--dim); padding: 1.5em 0; }
.rq-tw .sets { padding: 0.7em 0 0.8em; border-bottom: 1px solid #232a38; }
.rq-tw .sets h3 { margin: 0 0 0.5em; }
.rq-tw .sets .row { display: flex; flex-wrap: wrap; gap: 0.5em; }
.rq-tw .sets button.on { background: #3a3110; border-color: var(--gold); color: #fff3c4; }
.rq-tw .sets p { margin: 0.6em 0 0; color: var(--dim); font-size: 0.9em; }
`;

export class TweaksPanel {
  open = false;
  private readonly root: HTMLDivElement;
  private group = TWEAK_GROUPS[0];
  private msg = '';
  private find = '';
  private onlyChanged = false;
  private pasting = false;
  private armedReset = false;

  constructor(parent: HTMLElement, private readonly tweaks: Tweaks, private readonly onClose: () => void) {
    useDevTheme();
    if (!document.getElementById('rq-tw-css')) {
      const st = document.createElement('style');
      st.id = 'rq-tw-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-tw rqd';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      // An exact number typed into a slider's box.
      if (el.dataset.n && Number.isFinite(Number(el.value)) && el.value.trim() !== '') this.tweaks.set(el.dataset.n, Number(el.value));
      if (el.dataset.p || el.dataset.n) this.render();
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

  private row(x: TweakDef): string {
    const t = this.tweaks;
    const v = t.get(x.path);
    const ch = t.isChanged(x.path);
    const note = ch ? `was ${this.fmt(defaultTweak(x.path), x.step)}` : '';
    return `<div class="tw${ch ? ' ch' : ''}"><label>${esc(x.label)}<small>${[note, x.later ?? ''].filter(Boolean).join(' · ')}</small></label>
      <input type="range" data-p="${x.path}" min="${x.min}" max="${x.max}" step="${x.step}" value="${v}" />
      <input type="number" data-n="${x.path}" min="${x.min}" max="${x.max}" step="${x.step}" value="${this.fmt(v, x.step)}" title="${x.min} to ${x.max}" />
      <button data-r="${x.path}" class="ghost" title="Back to the default (${this.fmt(defaultTweak(x.path), x.step)})"${ch ? '' : ' disabled'}>${icon('undo')}</button></div>`;
  }

  /** The sets to try, over the groups whose sliders they move: several sliders moved together, one press. */
  private setsHtml(): string {
    if (this.group !== 'Jumping' && this.group !== 'Moves') return '';
    const now = this.tweaks.activeSet(JUMP_SETS);
    return `<div class="sets"><h3>Jump sets to try (in the Move Garden)</h3><div class="row">${JUMP_SETS.map((s) => `<button data-set="${s.id}" class="${s === now ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>
      <p>${esc(now ? now.note : 'The jump sliders are somewhere of their own: none of these sets.')}</p></div>`;
  }

  /** The sliders on show: one group, or (searching, or showing only what has changed) whatever matches, from every group. */
  private listHtml(): string {
    const t = this.tweaks;
    const find = this.find.trim().toLowerCase();
    if (!find && !this.onlyChanged) return this.setsHtml() + TWEAKS.filter((x) => x.group === this.group).map((x) => this.row(x)).join('');
    const hits = TWEAKS.filter((x) => (!find || x.label.toLowerCase().includes(find) || x.group.toLowerCase().includes(find) || x.path.toLowerCase().includes(find)) && (!this.onlyChanged || t.isChanged(x.path)));
    if (!hits.length) return `<div class="none">${this.onlyChanged && !find ? 'Nothing has been changed: everything is at its default.' : 'No slider by that name.'}</div>`;
    return TWEAK_GROUPS.map((g) => {
      const rows = hits.filter((x) => x.group === g);
      return rows.length ? `<h3>${esc(g)}</h3>${rows.map((x) => this.row(x)).join('')}` : '';
    }).join('');
  }

  private render(): void {
    const t = this.tweaks;
    const count = (g: string): number => TWEAKS.filter((x) => x.group === g && t.isChanged(x.path)).length;
    const btn = (g: string): string => {
      const n = count(g);
      return `<button data-g="${esc(g)}" class="${g === this.group && !this.find && !this.onlyChanged ? 'on' : ''}">${esc(g)}${n ? `<span class="badge warn">${n}</span>` : ''}</button>`;
    };
    const named = TWEAK_SECTIONS.flatMap((s) => s.groups);
    const more = TWEAK_GROUPS.filter((g) => !named.includes(g));
    const groups = TWEAK_SECTIONS.map((s) => `<h4>${s.title}</h4>${s.groups.filter((g) => TWEAK_GROUPS.includes(g)).map(btn).join('')}`).join('') + (more.length ? `<h4>More</h4>${more.map(btn).join('')}` : '');
    const n = t.count();
    this.root.innerHTML = `
      <header><h1>${icon('sliders')}GAME FEEL</h1><span class="say">The game is paused. Change something, then press Play to feel it.</span>
        <input type="search" data-f="find" placeholder="Find a slider" value="${esc(this.find)}" />
        <button data-a="changed" class="${this.onlyChanged ? 'on' : ''}" title="Show only what is off its default">${n ? `<span class="badge warn">${n}</span>` : ''}Changed</button>
        <button class="go" data-a="close">${icon('play')}Play</button></header>
      <div class="body"><div class="groups">${groups}</div><div class="list">${this.listHtml()}${this.pasting ? '<p class="muted">Paste tweak text here (the JSON line is enough):</p><textarea data-paste rows="4"></textarea><p><button class="primary" data-a="usepaste">Use it</button></p>' : ''}</div></div>
      <footer><span class="msg">${esc(this.msg)}</span>
        <button data-a="copy" title="The changed values as text: send it to Claude to make them the game's defaults">${icon('copy')}Copy settings</button><button data-a="paste">${icon('paste')}Paste</button>
        <button data-a="resetgroup">Reset ${esc(this.group)}</button><button data-a="resetall" class="danger">${this.armedReset ? 'Sure? Click again' : 'Reset everything'}</button></footer>`;
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (el.dataset.f === 'find') {
      this.find = el.value;
      // Only the list changes, so the box keeps its place while he types.
      const list = this.root.querySelector('.list');
      if (list) list.innerHTML = this.listHtml();
      this.root.querySelectorAll('.groups button').forEach((b) => b.classList.toggle('on', !this.find && !this.onlyChanged && (b as HTMLElement).dataset.g === this.group));
      return;
    }
    const path = el.dataset.p;
    if (!path) return;
    this.tweaks.set(path, Number(el.value));
    const def = TWEAKS.find((x) => x.path === path)!;
    const row = el.closest('.tw');
    const out = row?.querySelector('input[type=number]') as HTMLInputElement | null;
    if (out) out.value = this.fmt(this.tweaks.get(path), def.step);
    // A full redraw would drop the drag, so only this row changes now; the rest is redrawn when the finger lets go.
    row?.classList.toggle('ch', this.tweaks.isChanged(path));
  }

  private onClick(e: Event): void {
    const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!el) return;
    const ds = el.dataset;
    if (ds.g) {
      this.group = ds.g;
      this.find = '';
      this.onlyChanged = false;
      this.pasting = false;
    } else if (ds.set) {
      const set = JUMP_SETS.find((x) => x.id === ds.set);
      if (set) this.tweaks.useSet(set, JUMP_SETS);
    } else if (ds.r) {
      this.tweaks.reset(ds.r);
    } else if (ds.a === 'close') return this.hide();
    else if (ds.a === 'changed') this.onlyChanged = !this.onlyChanged;
    else if (ds.a === 'copy') {
      const text = this.tweaks.text();
      const shown = (): void => {
        this.msg = 'Could not copy by itself: the text is in the box below. Select it and copy it.';
        this.pasting = true;
        this.render();
        const box = this.root.querySelector('textarea');
        if (box) box.value = text;
      };
      if (!navigator.clipboard) return shown();
      navigator.clipboard.writeText(text).then(() => {
        this.msg = 'Copied. Paste it to Claude to make these the defaults.';
        this.render();
      }, shown);
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
      this.msg = 'Everything is back to its default.';
    }
    this.armedReset = false;
    this.render();
  }
}
