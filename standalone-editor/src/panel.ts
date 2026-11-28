/**
 * The tweak panel: groups down the left (under section headings, each with a count of what has been changed), sliders
 * on the right, each with a box for an exact number and a way back to its default. A search box finds a slider in any
 * group; "Changed" shows only what is off its default. The bottom row copies the changes as text, pastes some in, or
 * resets.
 *
 * Every part of it works with a controller (see `press`, and `PadNav` to drive it from a gamepad):
 *   in the groups:  up / down choose a group (shown at once);  right or A go into its sliders;  B closes.
 *   in the sliders: up / down move;  left / right change the slider by one step (held: repeats), or move along a row
 *                   of presets, where A uses the one under the cursor;  X puts the slider back to its default;
 *                   down past the last goes to the bottom row;  B goes back to the groups.
 *   in the bottom row: left / right choose a button;  A presses it;  up or B go back to the sliders.
 *   anywhere: L1 / R1 previous / next group;  Y copies the changes.
 */
import type { PresetList, TweakDef, TweakRegistry } from './registry';
import type { NavAction } from './padNav';
import { ensureStyle, esc } from './style';

export interface PanelOptions {
  /** Shown at the top. Default "GAME FEEL". */
  title?: string;
  /** The line beside it. */
  say?: string;
  /** Called when the panel closes (to unpause the game, say). */
  onClose?: () => void;
  /** What "Copy" says once done. */
  copied?: string;
}

type Zone = 'groups' | 'list' | 'foot';
type Row = { kind: 'sets'; list: PresetList } | { kind: 'tweak'; def: TweakDef };
const FOOT = ['changed', 'copy', 'paste', 'resetgroup', 'resetall', 'close'] as const;
type FootId = (typeof FOOT)[number];

export class TweakPanel {
  open = false;
  readonly root: HTMLDivElement;
  private group: string;
  private msg = '';
  private find = '';
  private onlyChanged = false;
  private pasting = false;
  private armedReset = false;
  /** Where a controller's cursor is; -1 row: none drawn until a controller (or the keys) is used. */
  private zone: Zone = 'groups';
  private row = -1;
  private setIdx = 0;
  private foot = 0;
  private readonly opts: PanelOptions;

  constructor(parent: HTMLElement, private readonly reg: TweakRegistry, opts: PanelOptions = {}) {
    this.opts = opts;
    ensureStyle();
    this.group = reg.groups()[0] ?? '';
    this.root = document.createElement('div');
    this.root.className = 'se-root se-tweaks';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => {
      const el = e.target as HTMLInputElement;
      if (el.dataset.n && el.value.trim() !== '' && Number.isFinite(Number(el.value))) this.reg.set(el.dataset.n, Number(el.value));
      if (el.dataset.p || el.dataset.n) this.render();
    });
  }

  show(): void {
    this.open = true;
    this.msg = '';
    this.pasting = false;
    this.armedReset = false;
    if (!this.reg.groups().includes(this.group)) this.group = this.reg.groups()[0] ?? '';
    this.root.classList.add('on');
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.opts.onClose?.();
  }

  toggle(): void {
    if (this.open) this.hide();
    else this.show();
  }

  /** For tests and hosts: where the cursor is. */
  cursor(): { zone: Zone; group: string; row: number; set: number; foot: string } {
    return { zone: this.zone, group: this.group, row: this.row, set: this.setIdx, foot: FOOT[this.foot] };
  }

  /** The rows on show: a row for each list of presets that belongs to the group, then the sliders. */
  private rows(): Row[] {
    const find = this.find.trim().toLowerCase();
    if (find || this.onlyChanged) {
      return this.reg.defs
        .filter((d) => (!find || d.label.toLowerCase().includes(find) || d.group.toLowerCase().includes(find) || d.key.toLowerCase().includes(find)) && (!this.onlyChanged || this.reg.isChanged(d.key)))
        .sort((a, b) => this.reg.groups().indexOf(a.group) - this.reg.groups().indexOf(b.group))
        .map((def) => ({ kind: 'tweak', def }));
    }
    const sets: Row[] = this.reg.presetLists.filter((l) => l.groups.includes(this.group)).map((list) => ({ kind: 'sets', list }));
    return [...sets, ...this.reg.defs.filter((d) => d.group === this.group).map((def): Row => ({ kind: 'tweak', def }))];
  }

  /** A press from a controller or the keys. */
  press(a: NavAction): void {
    if (!this.open) return;
    const first = this.row < 0;
    if (first) this.row = 0;
    const groups = this.reg.groups();
    if (a === 'prev' || a === 'next') {
      const i = groups.indexOf(this.group);
      this.group = groups[(i + (a === 'next' ? 1 : -1) + groups.length) % groups.length];
      this.find = '';
      this.onlyChanged = false;
      if (this.zone === 'list') this.row = 0;
      return this.redraw();
    }
    if (a === 'copy') return this.copy();
    if (first && a !== 'back') return this.redraw();
    const rows = this.rows();
    if (this.zone === 'groups') {
      const i = Math.max(0, groups.indexOf(this.group));
      if (a === 'up' || a === 'down') {
        this.group = groups[Math.min(groups.length - 1, Math.max(0, i + (a === 'down' ? 1 : -1)))];
        this.find = '';
        this.onlyChanged = false;
      } else if (a === 'right' || a === 'confirm') {
        this.zone = 'list';
        this.row = 0;
        this.syncSet();
      } else if (a === 'back') return this.hide();
    } else if (this.zone === 'list') {
      const r = rows[this.row];
      if (a === 'back') this.zone = this.find || this.onlyChanged ? 'foot' : 'groups';
      else if (a === 'up') {
        this.row = Math.max(0, this.row - 1);
        this.syncSet();
      } else if (a === 'down') {
        if (this.row >= rows.length - 1) this.zone = 'foot';
        else {
          this.row++;
          this.syncSet();
        }
      } else if (r?.kind === 'sets') {
        const n = r.list.presets.length;
        if (a === 'left') this.setIdx = Math.max(0, this.setIdx - 1);
        else if (a === 'right') this.setIdx = Math.min(n - 1, this.setIdx + 1);
        else if (a === 'confirm') this.reg.usePreset(r.list.presets[this.setIdx], r.list.presets);
      } else if (r?.kind === 'tweak') {
        const d = r.def;
        if (a === 'left' || a === 'right') this.reg.set(d.key, this.reg.get(d.key) + (a === 'right' ? d.step : -d.step));
        else if (a === 'reset') this.reg.reset(d.key);
      } else if (!rows.length && (a === 'left' || a === 'confirm')) this.zone = 'groups';
    } else {
      if (a === 'left') this.foot = Math.max(0, this.foot - 1);
      else if (a === 'right') this.foot = Math.min(FOOT.length - 1, this.foot + 1);
      else if (a === 'up' || a === 'back') {
        this.zone = rows.length ? 'list' : 'groups';
        this.row = Math.max(0, rows.length - 1);
      } else if (a === 'confirm') return this.act(FOOT[this.foot]);
    }
    this.redraw();
  }

  private syncSet(): void {
    const r = this.rows()[this.row];
    if (r?.kind === 'sets') this.setIdx = Math.max(0, r.list.presets.indexOf(this.reg.activePreset(r.list.presets) ?? r.list.presets[0]));
  }

  private redraw(): void {
    const rows = this.rows();
    this.row = Math.min(Math.max(0, rows.length - 1), Math.max(0, this.row));
    this.render();
    (this.root.querySelector('.list .cur') as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
    (this.root.querySelector('.groups button.on') as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
  }

  private fmt(v: number, step: number): string {
    const d = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
    return v.toFixed(d);
  }

  private tweakHtml(d: TweakDef, cur: boolean): string {
    const r = this.reg;
    const v = r.get(d.key);
    const ch = r.isChanged(d.key);
    const def = this.fmt(r.defaultOf(d.key), d.step);
    const small = [ch ? `was ${def}` : '', d.help ?? '', d.later ?? ''].filter(Boolean).join(' · ');
    return `<div class="tw${ch ? ' ch' : ''}${cur ? ' cur' : ''}"><label>${esc(d.label)}<small>${esc(small)}</small></label>
      <input type="range" data-p="${esc(d.key)}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" />
      <input type="number" data-n="${esc(d.key)}" min="${d.min}" max="${d.max}" step="${d.step}" value="${this.fmt(v, d.step)}" title="${d.min} to ${d.max}" />
      <button data-r="${esc(d.key)}" title="Back to the default (${def})"${ch ? '' : ' disabled'}>&#8634;</button></div>`;
  }

  private setsHtml(l: PresetList, cur: boolean): string {
    const now = this.reg.activePreset(l.presets);
    return `<div class="sets${cur ? ' cur' : ''}"><h3>${esc(l.title)}</h3><div class="row">${l.presets
      .map((p, i) => `<button data-set="${esc(p.id)}" data-list="${esc(l.title)}" class="${p === now ? 'on' : ''}${cur && i === this.setIdx ? ' cur' : ''}">${esc(p.name)}</button>`)
      .join('')}</div><p>${esc(now ? now.note : 'The sliders are somewhere of their own: none of these.')}</p></div>`;
  }

  private listHtml(): string {
    const rows = this.rows();
    const cursorOn = this.row >= 0 && this.zone === 'list';
    if (!rows.length) return `<div class="none">${this.onlyChanged && !this.find ? 'Nothing has been changed: everything is at its default.' : this.find ? 'No slider by that name.' : 'No sliders here.'}</div>`;
    const grouped = !!(this.find.trim() || this.onlyChanged);
    let last = '';
    return rows
      .map((r, i) => {
        const cur = cursorOn && i === this.row;
        if (r.kind === 'sets') return this.setsHtml(r.list, cur);
        const head = grouped && r.def.group !== last ? `<h3>${esc(r.def.group)}</h3>` : '';
        last = r.def.group;
        return head + this.tweakHtml(r.def, cur);
      })
      .join('');
  }

  private render(): void {
    const r = this.reg;
    const groups = r.groups();
    const count = (g: string): number => r.defs.filter((d) => d.group === g && r.isChanged(d.key)).length;
    const btn = (g: string): string => {
      const n = count(g);
      const on = g === this.group && !this.find && !this.onlyChanged;
      return `<button data-g="${esc(g)}" class="${on ? 'on' : ''}">${esc(g)}${n ? `<span class="badge">${n}</span>` : ''}</button>`;
    };
    const named = r.sections.flatMap((s) => s.groups);
    const more = groups.filter((g) => !named.includes(g));
    const groupHtml =
      r.sections.map((s) => {
        const gs = s.groups.filter((g) => groups.includes(g));
        return gs.length ? `<h4>${esc(s.title)}</h4>${gs.map(btn).join('')}` : '';
      }).join('') + (more.length ? `${r.sections.length ? '<h4>More</h4>' : ''}${more.map(btn).join('')}` : '');
    const n = r.count();
    const fc = (id: FootId): string => (this.row >= 0 && this.zone === 'foot' && FOOT[this.foot] === id ? ' cur' : '');
    const pad = this.row >= 0;
    const help = !pad
      ? ''
      : this.zone === 'groups'
        ? 'Up / down: group · Right or A: its sliders · L1 / R1: group · Y: copy · B: close'
        : this.zone === 'list'
          ? 'Up / down: move · Left / right: change it · A: use a preset · X: back to default · B: groups · Y: copy'
          : 'Left / right: choose · A: press it · Up or B: back to the sliders';
    this.root.innerHTML = `
      <header><h1>${esc(this.opts.title ?? 'GAME FEEL')}</h1><span class="say">${esc(this.opts.say ?? 'Change something, then play to feel it.')}</span>
        <input type="search" data-f="find" placeholder="Find a slider" value="${esc(this.find)}" />
        <button data-a="changed" class="${this.onlyChanged ? 'on' : ''}${fc('changed')}" title="Show only what is off its default">Changed${n ? `<span class="badge">${n}</span>` : ''}</button>
        <button class="go${fc('close')}" data-a="close">Play</button></header>
      <div class="body"><div class="groups${pad && this.zone === 'groups' ? ' zone' : ''}">${groupHtml}</div><div class="list">${this.listHtml()}${
        this.pasting ? '<p>Paste tweak text here (the JSON line is enough):</p><textarea data-paste rows="4"></textarea><p><button class="go" data-a="usepaste">Use it</button></p>' : ''
      }</div></div>
      <footer>${help ? `<span class="help">${help}</span>` : ''}<span class="msg">${esc(this.msg)}</span>
        <button data-a="copy" class="${fc('copy')}" title="The changed values as text">Copy settings</button><button data-a="paste" class="${fc('paste')}">Paste</button>
        <button data-a="resetgroup" class="${fc('resetgroup')}">Reset ${esc(this.group)}</button><button data-a="resetall" class="danger${fc('resetall')}">${this.armedReset ? 'Sure? Press again' : 'Reset everything'}</button></footer>`;
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (el.dataset.f === 'find') {
      this.find = el.value;
      const list = this.root.querySelector('.list');
      if (list) list.innerHTML = this.listHtml();
      return;
    }
    const key = el.dataset.p;
    if (!key) return;
    this.reg.set(key, Number(el.value));
    const d = this.reg.def(key)!;
    const row = el.closest('.tw');
    const out = row?.querySelector('input[type=number]') as HTMLInputElement | null;
    if (out) out.value = this.fmt(this.reg.get(key), d.step);
    // A full redraw would drop the drag: only this row changes now, the rest when the finger lets go.
    row?.classList.toggle('ch', this.reg.isChanged(key));
  }

  private copy(): void {
    const text = this.reg.text();
    const shown = (): void => {
      this.msg = 'Could not copy by itself: the text is in the box below. Select it and copy it.';
      this.pasting = true;
      this.render();
      const box = this.root.querySelector('textarea');
      if (box) box.value = text;
    };
    if (typeof navigator === 'undefined' || !navigator.clipboard) return shown();
    navigator.clipboard.writeText(text).then(() => {
      this.msg = this.opts.copied ?? 'Copied.';
      this.render();
    }, shown);
  }

  private act(id: FootId | 'usepaste'): void {
    if (id === 'close') return this.hide();
    if (id === 'copy') return this.copy();
    if (id === 'changed') {
      this.onlyChanged = !this.onlyChanged;
      this.find = '';
    } else if (id === 'paste') this.pasting = !this.pasting;
    else if (id === 'usepaste') {
      const n = this.reg.load((this.root.querySelector('textarea') as HTMLTextAreaElement | null)?.value ?? '');
      this.msg = n ? `Used ${n} setting${n === 1 ? '' : 's'}.` : 'Found nothing to use in that text.';
      this.pasting = !n;
    } else if (id === 'resetgroup') {
      for (const d of this.reg.defs) if (d.group === this.group) this.reg.reset(d.key);
    } else if (id === 'resetall') {
      if (!this.armedReset) {
        this.armedReset = true;
        return this.render();
      }
      this.reg.reset();
      this.msg = 'Everything is back to its default.';
    }
    this.armedReset = false;
    this.redraw();
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
      const list = this.reg.presetLists.find((l) => l.title === ds.list);
      const p = list?.presets.find((x) => x.id === ds.set);
      if (list && p) this.reg.usePreset(p, list.presets);
    } else if (ds.r) this.reg.reset(ds.r);
    else if (ds.a) return this.act(ds.a as FootId | 'usepaste');
    this.armedReset = false;
    this.render();
  }
}
