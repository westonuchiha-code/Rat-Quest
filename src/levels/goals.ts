/**
 * Goal bookkeeping for one level: how far along each goal is, and when the exit may open. Pure logic.
 */
import type { CollectibleKind, Count } from '../world/collectibles';
import type { EnemySpec, GoalDef, LevelDef } from './types';

export interface GoalStatus {
  label: string;
  /** Progress text such as "3/5". */
  text: string;
  done: boolean;
}

/** Sends enemies in groups: the next group arrives a moment after the last one is wiped out. */
export class WaveDirector {
  private next = 0;
  private wait: number;
  private started = false;
  private spawned = 0;

  constructor(
    private readonly waves: EnemySpec[][],
    private readonly firstDelay = 1.5,
    private readonly gap = 2.5,
  ) {
    this.wait = firstDelay;
  }

  get total(): number {
    return this.waves.length;
  }

  /** How many waves have arrived so far. */
  get arrived(): number {
    return this.next;
  }

  /** Waves beaten: every wave has arrived and none of them is left alive. */
  cleared(alive: number): boolean {
    return this.next >= this.waves.length && this.started && alive === 0 && this.spawned === this.waves.length;
  }

  /** Call every tick. Returns the enemies that arrive now, or null. */
  update(dt: number, alive: number): EnemySpec[] | null {
    if (this.next >= this.waves.length) return null;
    if (alive > 0) return null;
    this.wait -= dt;
    if (this.wait > 0) return null;
    const group = this.waves[this.next++];
    this.started = true;
    this.spawned++;
    this.wait = this.gap;
    return group;
  }

  reset(): void {
    this.next = 0;
    this.wait = this.firstDelay;
    this.started = false;
    this.spawned = 0;
  }
}

/** How far a shy wedge's keeper notices him from, before his gear changes it: a roach's range. */
export const SHY_RANGE = 8;
/** The beasts that keep a shy wedge: the ground beasts that start within `radius` of it (bats sleep through it). */
export function keepersOf<T extends { x: number; z: number; kind?: string; type?: string }>(wedge: { x: number; z: number }, radius: number, beasts: readonly T[]): T[] {
  return beasts.filter((e) => (e.kind ?? e.type ?? 'scuttler') !== 'bat' && Math.hypot(e.x - wedge.x, e.z - wedge.z) <= radius);
}
/**
 * Whether a shy wedge shows: every keeper alive and at rest, and he (at px, pz; height does not matter, so he cannot
 * jump in over their heads) outside the range they notice him from (`notice` is his gear's multiplier).
 */
export function shyShows(keepers: ReadonlyArray<{ x: number; z: number; alive: boolean; state: string }>, px: number, pz: number, notice: number): boolean {
  return keepers.every((k) => k.alive && k.state === 'idle' && Math.hypot(k.x - px, k.z - pz) >= SHY_RANGE * notice);
}

/** Reach checks for wedges are kept apart from the level's own goals by this offset. */
const WEDGE_REACH = 1000;

export class GoalTracker {
  readonly director: WaveDirector;
  /** Golden Wedges he has taken in this course (now or on an earlier visit). Filled in by the game. */
  readonly earned = new Set<string>();
  /** Enemies defeated so far. */
  kills = 0;
  /** Wall pipes smashed so far. */
  burst = 0;
  /** Attacks turned aside with a perfect guard, this visit. */
  parries = 0;
  /** For each shy wedge (by its place in the level's list): whether its keepers are letting it show. Set by the game. */
  readonly unseen = new Map<number, boolean>();
  private reached = new Set<number>();

  constructor(
    private readonly def: LevelDef,
    /** How many of a kind he has collected in this level. */
    private readonly counts: (kind: CollectibleKind) => Count,
  ) {
    this.director = new WaveDirector(def.waves);
  }

  /** How many enemies stand in the room at the start, which is what the 'defeat' goal counts (but for any marked as no part of it). */
  get enemyTotal(): number {
    return this.def.enemies.filter((e) => !e.uncounted).length;
  }

  /** Call every tick with the rat's position (feet). */
  update(x: number, y: number, z: number): void {
    this.def.goals.forEach((g, i) => {
      if (g.type === 'reach' && !this.reached.has(i)) {
        const near = Math.hypot(g.x - x, g.z - z) <= g.radius && Math.abs(g.y - y) < 1.5;
        if (near) this.reached.add(i);
      }
    });
    this.def.wedges?.forEach((w, i) => {
      const g = w.appears;
      if (g?.type === 'reach' && !this.reached.has(WEDGE_REACH + i)) {
        if (Math.hypot(g.x - x, g.z - z) <= g.radius && Math.abs(g.y - y) < 1.5) this.reached.add(WEDGE_REACH + i);
      }
    });
  }

  /** True when this wedge is out in the course to be taken (it may already be his). */
  wedgeOut(i: number, alive = 0): boolean {
    const g = this.def.wedges?.[i]?.appears;
    if (!g) return true;
    const p = this.progress(g, WEDGE_REACH + i, alive);
    return p.have >= p.need;
  }

  private progress(g: GoalDef, i: number, alive: number): { have: number; need: number } {
    switch (g.type) {
      case 'collect': {
        const c = this.counts(g.kind);
        const need = g.count === 'all' ? c.total : Math.min(g.count, c.total);
        return { have: Math.min(c.have, need), need };
      }
      case 'defeat':
        return { have: Math.min(this.kills, this.enemyTotal), need: this.enemyTotal };
      case 'waves': {
        const need = this.director.total;
        const beaten = this.director.cleared(alive) ? need : Math.max(0, this.director.arrived - 1);
        return { have: beaten, need };
      }
      case 'burst': {
        const total = this.def.pipes?.length ?? 0;
        const need = g.count === 'all' ? total : Math.min(g.count, total);
        return { have: Math.min(this.burst, need), need };
      }
      case 'reach':
        return { have: this.reached.has(i) ? 1 : 0, need: 1 };
      case 'parry':
        return { have: Math.min(this.parries, g.count), need: g.count };
      case 'unseen':
        return { have: this.unseen.get(i - WEDGE_REACH) === false ? 0 : 1, need: 1 };
    }
  }

  status(alive = 0): GoalStatus[] {
    const ws = this.def.wedges;
    if (ws) {
      return ws.map((w, i) => {
        const got = this.earned.has(w.id);
        const out = this.wedgeOut(i, alive);
        let text = got ? 'got' : out ? 'out' : '';
        if (!got && !out && w.appears && w.appears.type !== 'reach' && w.appears.type !== 'unseen') {
          const p = this.progress(w.appears, WEDGE_REACH + i, alive);
          text = `${p.have}/${p.need}`;
        }
        return { label: w.name, text, done: got };
      });
    }
    return this.def.goals.map((g, i) => {
      const p = this.progress(g, i, alive);
      return { label: g.label, text: g.type === 'reach' ? (p.have ? 'done' : '') : `${p.have}/${p.need}`, done: p.have >= p.need };
    });
  }

  /** True when every main goal is done. */
  mainDone(alive = 0): boolean {
    if (this.def.wedges) return this.def.wedges.some((w) => this.earned.has(w.id));
    return this.status(alive).every((s) => s.done);
  }

  /** The goal the screen should show now: the first one not yet done, or the last one. */
  current(alive = 0): GoalStatus | null {
    const ws = this.def.wedges;
    if (ws) {
      const n = ws.filter((w) => this.earned.has(w.id)).length;
      return { label: 'Golden Wedges', text: `${n}/${ws.length}`, done: n === ws.length };
    }
    const all = this.status(alive);
    return all.find((s) => !s.done) ?? all[all.length - 1] ?? null;
  }

  reset(): void {
    this.kills = 0;
    this.burst = 0;
    this.parries = 0;
    this.unseen.clear();
    this.reached.clear();
    this.director.reset();
  }
}
