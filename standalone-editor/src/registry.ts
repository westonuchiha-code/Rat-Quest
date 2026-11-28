/**
 * The tweak registry: numbers that set how a game feels, each with a slider's range, a label and a group.
 *
 * A tweak's `key` is a dotted path such as "jump.velocity". If the registry was given tables (`configure({ root,
 * tables })`) and the path leads to a number in one of them, the slider writes straight into that table, so a game that
 * reads its tuning from plain objects sees every change at once with no other wiring. A path that leads nowhere is
 * kept inside the registry instead: read it with `get(key)` or listen with `onChange`.
 *
 * Changes are kept in storage (localStorage by default) and put back on the next start. `text()` gives the changed
 * values as text that can be pasted back in with `load()`, or sent on to make them the game's defaults.
 */

export interface TweakDef {
  /** The heading it is shown under in the panel, e.g. "Jumping". */
  group: string;
  /** A dotted path, e.g. "jump.velocity". Unique. */
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** The shipped value. Optional when the key leads into a table: the table's value at definition is taken. */
  default?: number;
  /** A line shown under the label. */
  help?: string;
  /** When a change takes effect, if not at once, e.g. "from the next level". */
  later?: string;
}

/**
 * A preset: several sliders moved together, one press. Using one first puts every slider that any preset in the same
 * list moves back to its default, so presets do not pile up on one another.
 */
export interface TweakPreset {
  id: string;
  name: string;
  note: string;
  values: Record<string, number>;
}

/** A named list of presets, shown at the top of the groups it names. */
export interface PresetList {
  title: string;
  groups: string[];
  presets: TweakPreset[];
}

/** Headings for the group list: groups under each, in order. Groups named nowhere are shown under "More". */
export interface TweakSection {
  title: string;
  groups: string[];
}

export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RegistryOptions {
  /** Where changes are kept. Default "tweaks.v1". Give each game its own. */
  storageKey?: string;
  /** Default: localStorage, where there is one. null keeps nothing. */
  storage?: Store | null;
  /** The table a path is walked from when its first part names none of `tables`. */
  root?: object;
  /** Tables by name: "toad.hp" is `tables.toad.hp`. */
  tables?: Record<string, object>;
  sections?: TweakSection[];
  presets?: PresetList[];
  /** The first line of `text()`, e.g. "My Game tweaks (make these the defaults):". */
  heading?: string;
}

type Table = Record<string, unknown>;

export class TweakRegistry {
  readonly defs: TweakDef[] = [];
  sections: TweakSection[] = [];
  presetLists: PresetList[] = [];
  private storageKey = 'tweaks.v1';
  private storage: Store | null = null;
  private root: Table | null = null;
  private tables: Record<string, Table> = {};
  private heading = 'Tweaks (make these the defaults):';
  private readonly defaults: Record<string, number> = {};
  private readonly own: Record<string, number> = {};
  private readonly changed: Record<string, number> = {};
  private saved: Record<string, unknown> = {};
  private readonly listeners = new Set<(key: string, value: number) => void>();

  constructor(opts: RegistryOptions = {}) {
    this.configure(opts);
  }

  /** Sets the options. Call it before defining tweaks that point into tables, so their defaults can be read. */
  configure(opts: RegistryOptions): this {
    if (opts.storageKey !== undefined) this.storageKey = opts.storageKey;
    if (opts.root !== undefined) this.root = opts.root as Table;
    if (opts.tables !== undefined) this.tables = opts.tables as Record<string, Table>;
    if (opts.sections !== undefined) this.sections = opts.sections;
    if (opts.presets !== undefined) this.presetLists = opts.presets;
    if (opts.heading !== undefined) this.heading = opts.heading;
    if (opts.storage !== undefined) this.storage = opts.storage;
    else if (!this.storage) {
      try {
        this.storage = typeof localStorage !== 'undefined' ? localStorage : null;
      } catch {
        this.storage = null;
      }
    }
    try {
      this.saved = JSON.parse(this.storage?.getItem(this.storageKey) ?? '{}') as Record<string, unknown>;
    } catch {
      this.saved = {};
    }
    // Anything already defined picks up what was saved under the (possibly new) key.
    for (const d of this.defs) if (typeof this.saved[d.key] === 'number') this.apply(d, this.saved[d.key] as number);
    return this;
  }

  /** Adds tweaks. A saved change for one is put back at once. Returns the registry, so calls can be chained. */
  define(...defs: Array<TweakDef | TweakDef[]>): this {
    for (const d of defs.flat()) {
      if (this.defs.some((x) => x.key === d.key)) throw new Error(`tweak "${d.key}" is defined twice`);
      const inTable = this.locate(d.key);
      const def = d.default ?? (inTable ? (inTable.obj[inTable.prop] as number) : NaN);
      if (!Number.isFinite(def)) throw new Error(`tweak "${d.key}" has no default (give one, or point it at a number in a table)`);
      this.defaults[d.key] = def;
      if (!inTable) this.own[d.key] = def;
      this.defs.push(d);
      if (typeof this.saved[d.key] === 'number') this.apply(d, this.saved[d.key] as number);
    }
    return this;
  }

  /** Every group that has a tweak: those named in sections first, in that order, then the rest as defined. */
  groups(): string[] {
    const named = this.sections.flatMap((s) => s.groups);
    const all = [...new Set(this.defs.map((d) => d.group))];
    return [...named.filter((g) => all.includes(g)), ...all.filter((g) => !named.includes(g))];
  }

  def(key: string): TweakDef | undefined {
    return this.defs.find((d) => d.key === key);
  }

  get(key: string): number {
    const at = this.locate(key);
    if (at) return at.obj[at.prop] as number;
    return this.own[key] ?? NaN;
  }

  defaultOf(key: string): number {
    return this.defaults[key];
  }

  isChanged(key: string): boolean {
    return key in this.changed;
  }

  count(): number {
    return Object.keys(this.changed).length;
  }

  /** The changed values, by key. */
  changes(): Record<string, number> {
    return { ...this.changed };
  }

  /** Sets one (clamped to its range and rounded to its step). */
  set(key: string, value: number): void {
    const d = this.def(key);
    if (!d) return;
    this.apply(d, value);
    this.save();
  }

  /** One back to its default, or (no key) every one. */
  reset(key?: string): void {
    for (const d of this.defs) if (!key || d.key === key) this.apply(d, this.defaults[d.key]);
    this.save();
  }

  /** Called with (key, value) whenever a value changes. Returns a function that stops it. */
  onChange(fn: (key: string, value: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Uses a preset: every slider any of `list` moves goes back to its default, then this preset's are put on. */
  usePreset(preset: TweakPreset, list: TweakPreset[]): void {
    const keys = new Set(list.flatMap((p) => Object.keys(p.values)));
    for (const d of this.defs) if (keys.has(d.key)) this.apply(d, preset.values[d.key] ?? this.defaults[d.key]);
    this.save();
  }

  /** Which preset of `list` the sliders are at now, or null. */
  activePreset(list: TweakPreset[]): TweakPreset | null {
    const keys = [...new Set(list.flatMap((p) => Object.keys(p.values)))];
    return list.find((p) => keys.every((k) => Math.abs(this.get(k) - (p.values[k] ?? this.defaults[k])) < 1e-9)) ?? null;
  }

  /** The changed values as text: a line each, then one JSON line that `load()` takes back. */
  text(): string {
    const lines = this.defs.filter((d) => this.changed[d.key] !== undefined).map((d) => `  ${d.group} / ${d.label}: ${this.defaults[d.key]} -> ${this.changed[d.key]}   (${d.key})`);
    return lines.length ? `${this.heading}\n${lines.join('\n')}\nJSON: ${JSON.stringify(this.changed)}` : 'No tweaks: everything is at the default.';
  }

  /** Takes text holding a JSON object of {key: value} (as `text()` gives) and applies it. Returns how many were used. */
  load(text: string): number {
    const m = /\{[\s\S]*\}/.exec(text);
    if (!m) return 0;
    let n = 0;
    try {
      const d = JSON.parse(m[0]) as Record<string, unknown>;
      for (const def of this.defs) {
        if (typeof d[def.key] === 'number') {
          this.apply(def, d[def.key] as number);
          n++;
        }
      }
    } catch {
      return 0;
    }
    this.save();
    return n;
  }

  /** The table and property a key points at, if it leads to a number in one. */
  private locate(key: string): { obj: Table; prop: string } | null {
    const parts = key.split('.');
    let obj: Table | null = this.root;
    if (this.tables[parts[0]] && parts.length > 1) obj = this.tables[parts.shift()!];
    if (!obj) return null;
    for (let i = 0; i < parts.length - 1; i++) {
      const next: unknown = obj[parts[i]];
      if (!next || typeof next !== 'object') return null;
      obj = next as Table;
    }
    const prop = parts[parts.length - 1];
    return typeof obj[prop] === 'number' ? { obj, prop } : null;
  }

  private apply(d: TweakDef, value: number): void {
    if (!Number.isFinite(value)) return;
    const v = Math.min(d.max, Math.max(d.min, Math.round(value / d.step) * d.step));
    const clean = Number(v.toFixed(4));
    const before = this.get(d.key);
    const at = this.locate(d.key);
    if (at) at.obj[at.prop] = clean;
    else this.own[d.key] = clean;
    if (Math.abs(clean - this.defaults[d.key]) < 1e-9) delete this.changed[d.key];
    else this.changed[d.key] = clean;
    if (before !== clean) for (const fn of this.listeners) fn(d.key, clean);
  }

  private save(): void {
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(this.changed));
    } catch {
      // Saving is best effort.
    }
  }
}

/** The shared registry, for games that want just one. */
export const tweaks = new TweakRegistry();

/** Adds tweaks to the shared registry: `defineTweaks({ group, key, label, min, max, step, default, help })`. */
export function defineTweaks(...defs: Array<TweakDef | TweakDef[]>): TweakRegistry {
  return tweaks.define(...defs);
}
