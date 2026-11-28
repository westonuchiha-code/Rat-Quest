/**
 * The tools page: one place for a game's development tools, every part of it optional. The host game says what it
 * can do (`EditorHost`) and only those tools are shown:
 *
 *   Game Feel   opens the tweak panel                              (a TweakPanel is passed in)
 *   Jump check  where the player can get to, from the game's own jump numbers and its level as boxes
 *   Warp        a list of places to go                             (host.warps / host.warp)
 *   Spawn       a list of things to put down, where the host's raycast points if it has one (host.spawns / host.spawn)
 *   Actions     one-off buttons: heal, clear the room...           (host.actions / host.act)
 *
 * Controller: the d-pad or stick moves, A uses, B goes back (from the front page: closes). See `PadNav`.
 */
import { computeReach, unreachable, type Box, type ReachMap, type Target } from './reach';
import { fullHeight, jumpHeight, jumpReach, maxChimney, maxClimb, type JumpParams } from './jumpMath';
import type { NavAction } from './padNav';
import type { TweakPanel } from './panel';
import { ensureStyle, esc } from './style';

export interface Place {
  id: string;
  name: string;
  /** A heading to list it under. */
  group?: string;
  note?: string;
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface EditorHost {
  /** The jump numbers, read each time the check runs (so tweaks are included). */
  jumpParams?(): JumpParams;
  /** The level for the jump check: solid boxes, where the player starts, and what he must be able to get to. */
  level?(): { boxes: Box[]; start: Point; targets?: Target[] };
  /** Shows the check in the world, if the game can (markers on what is out of reach, say). */
  showReach?(map: ReachMap, missing: Target[]): void;
  warps?(): Place[];
  warp?(id: string): void;
  spawns?(): Place[];
  /** `at`: where the host's raycast points, when it has one. */
  spawn?(id: string, at: Point | null): void;
  /** Where the camera or crosshair points, for Spawn. */
  raycast?(): Point | null;
  actions?(): Place[];
  /** Returns a line to show, if any. */
  act?(id: string): string | void;
  onClose?(): void;
}

type Page = 'home' | 'jump' | 'warp' | 'spawn' | 'act';
interface Item {
  id: string;
  label: string;
  note?: string;
  group?: string;
  run(): void;
}

export class ToolsPanel {
  open = false;
  readonly root: HTMLDivElement;
  private page: Page = 'home';
  private cur = -1;
  private msg = '';
  private report = '';

  constructor(parent: HTMLElement, private readonly host: EditorHost, private readonly tweaks?: TweakPanel, private readonly title = 'WORKSHOP') {
    ensureStyle();
    this.root = document.createElement('div');
    this.root.className = 'se-root se-tools';
    parent.appendChild(this.root);
    this.root.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      if (b.dataset.back !== undefined) return this.back();
      const i = Number(b.dataset.i);
      const it = this.items()[i];
      if (it) {
        this.cur = this.cur < 0 ? -1 : i;
        it.run();
      }
    });
  }

  show(): void {
    this.open = true;
    this.page = 'home';
    this.msg = '';
    this.root.classList.add('on');
    this.render();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.host.onClose?.();
  }

  /** For tests and hosts: the page and the item under the cursor. */
  cursor(): { page: Page; item: string | null } {
    return { page: this.page, item: this.items()[this.cur]?.id ?? null };
  }

  /** Runs the jump check and returns the report (also shown on the Jump check page). */
  jumpCheck(): string {
    const p = this.host.jumpParams?.();
    if (!p) return (this.report = 'This game has not given its jump numbers (host.jumpParams).');
    const f = (n: number): string => n.toFixed(2);
    const lines = [
      `First jump: ${f(jumpHeight(p))} up.  With every air jump: ${f(fullHeight(p))} up.`,
      `Running jump across flat ground: ${f(jumpReach(p, 0))}.  Onto a ledge 1 higher: ${f(jumpReach(p, 1))}.  Down 2: ${f(jumpReach(p, -2))}.`,
      `Highest ledge from the ground: ${f(maxClimb(p))}.` + (maxChimney(p) ? `  Widest chimney to wall-kick up: ${f(maxChimney(p))}.` : ''),
    ];
    const lv = this.host.level?.();
    if (lv) {
      const map = computeReach(lv.boxes, lv.start, p);
      const missing = unreachable(map, lv.targets ?? [], p);
      lines.push(`Surfaces reached: ${map.reached} of ${map.total}.`);
      lines.push(missing.length ? `Out of reach (${missing.length}): ${missing.map((t) => t.name).join(', ')}.` : lv.targets?.length ? 'Everything that must be reached can be.' : '(No targets given to check.)');
      this.host.showReach?.(map, missing);
    }
    return (this.report = lines.join('\n'));
  }

  private items(): Item[] {
    const h = this.host;
    if (this.page === 'home') {
      const out: Item[] = [];
      if (this.tweaks) out.push({ id: 'tweaks', label: 'Game Feel', note: 'Sliders for how the game plays.', run: () => { this.hide(); this.tweaks!.show(); } });
      if (h.jumpParams) out.push({ id: 'jump', label: 'Jump check', note: 'How high and far he jumps, and what in the level he can get to.', run: () => { this.page = 'jump'; this.jumpCheck(); if (this.cur >= 0) this.cur = 0; this.render(); } });
      if (h.warps && h.warp) out.push({ id: 'warp', label: 'Warp', note: 'Go anywhere.', run: () => this.go('warp') });
      if (h.spawns && h.spawn) out.push({ id: 'spawn', label: 'Spawn', note: h.raycast ? 'Put something down where you are looking.' : 'Put something down.', run: () => this.go('spawn') });
      if (h.actions && h.act) out.push({ id: 'act', label: 'Actions', note: 'One-off buttons.', run: () => this.go('act') });
      return out;
    }
    if (this.page === 'jump') return [{ id: 'again', label: 'Check again', run: () => { this.jumpCheck(); this.render(); } }];
    const list = (this.page === 'warp' ? h.warps?.() : this.page === 'spawn' ? h.spawns?.() : h.actions?.()) ?? [];
    return list.map((p) => ({
      id: p.id,
      label: p.name,
      note: p.note,
      group: p.group,
      run: () => {
        if (this.page === 'warp') {
          h.warp!(p.id);
          this.hide();
        } else if (this.page === 'spawn') {
          h.spawn!(p.id, h.raycast?.() ?? null);
          this.msg = `${p.name}: put down.`;
          this.render();
        } else {
          this.msg = h.act!(p.id) || `${p.name}: done.`;
          this.render();
        }
      },
    }));
  }

  private go(page: Page): void {
    this.page = page;
    this.msg = '';
    if (this.cur >= 0) this.cur = 0;
    this.render();
  }

  private back(): void {
    if (this.page === 'home') return this.hide();
    const was = this.page;
    this.page = 'home';
    this.msg = '';
    if (this.cur >= 0) this.cur = Math.max(0, this.items().findIndex((i) => i.id === was));
    this.render();
  }

  press(a: NavAction): void {
    if (!this.open) return;
    if (a === 'back') return this.back();
    const items = this.items();
    if (this.cur < 0) {
      this.cur = 0;
      return this.render();
    }
    if (a === 'up' || a === 'left') this.cur = Math.max(0, this.cur - 1);
    else if (a === 'down' || a === 'right') this.cur = Math.min(items.length - 1, this.cur + 1);
    else if (a === 'confirm') return items[this.cur]?.run();
    this.render();
    (this.root.querySelector('.cur') as HTMLElement | null)?.scrollIntoView?.({ block: 'nearest' });
  }

  private render(): void {
    const items = this.items();
    const c = (i: number): string => (i === this.cur ? ' cur' : '');
    let body: string;
    if (this.page === 'home') {
      body = items.length
        ? `<div class="cards">${items.map((it, i) => `<button class="card${c(i)}" data-i="${i}"><b>${esc(it.label)}</b><span>${esc(it.note ?? '')}</span></button>`).join('')}</div>`
        : '<div class="none">This game has given the tools nothing to work with yet (see EditorHost).</div>';
    } else if (this.page === 'jump') {
      body = `<div class="items"><pre style="white-space:pre-wrap;font:inherit;margin:0 0 1em">${esc(this.report)}</pre>${items.map((it, i) => `<button class="${c(i).trim()}" data-i="${i}">${esc(it.label)}</button>`).join('')}</div>`;
    } else {
      let last: string | undefined;
      body = `<div class="items">${items.length ? items.map((it, i) => {
        const head = it.group && it.group !== last ? `<h3>${esc(it.group)}</h3>` : '';
        last = it.group;
        return `${head}<button class="${c(i).trim()}" data-i="${i}">${esc(it.label)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</button>`;
      }).join('') : '<div class="none">Nothing here.</div>'}</div>`;
    }
    const names: Record<Page, string> = { home: '', jump: 'Jump check', warp: 'Warp', spawn: 'Spawn', act: 'Actions' };
    this.root.innerHTML = `<header><h1>${esc(this.title)}</h1><span class="say">${esc(names[this.page])}</span><button data-back>${this.page === 'home' ? 'Close' : 'Back'}</button></header>
      <main>${body}</main>
      <footer>${this.cur >= 0 ? '<span class="help">D-pad: move · A: use · B: back</span>' : ''}<span class="msg">${esc(this.msg)}</span></footer>`;
  }
}
