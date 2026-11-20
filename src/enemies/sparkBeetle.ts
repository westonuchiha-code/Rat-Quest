/**
 * THE SPARK BEETLE (2026-11-20; the owner: "come up with a few different enemy designs"; the others are designs only,
 * docs/ENEMY-IDEAS.md). A beetle with a copper coil grown into its back, at home in the Coil Room: it hunts as the
 * roach does (the roach's own code, world/scuttler.ts, does the chasing, circling, lunging and biting: this wraps it),
 * and it is charged by the coil's beat (world/teslaCoil.ts, the snare's lane):
 *   CHARGING  through the half second before each snare its antennae and shell glow brighter; a sword (or a plunge)
 *             glances off it then, as off the ironback's shell: no harm, his arm jarred.
 *   DISCHARGE on the snare it lets go: a burst all round it, for a moment, that shocks him if he is close (a heavy blow:
 *             no shield turns it).
 *   SPENT     the rest of the bar it is soft: hit it then. (The kicks do nothing to it.)
 * So the fight is the room's rhythm again: wait out the backbeat, strike between.
 */
import { Scuttler } from './scuttler';
import type { CanStand, FloorUnder, HitHow } from './foe';
import { laneState } from '../world/teslaCoil';

export const SPARK = {
  /** How charged before it is proof against a blade (0..1 of the warning glow). */
  proof: 0.25,
  /** Its discharge: how far beyond its body it reaches, how hard. */
  burst: { reach: 0.7, damage: 1 },
  /** Tougher than a roach: blows to kill it. */
  hp: 4,
} as const;

export class SparkBeetle {
  readonly kind = 'sparkbeetle' as const;
  private readonly body: Scuttler;
  /** The room's clock (set by the game, so its charge is on the room's beat); its own count if not. */
  clock: (() => number) | null = null;
  private own = 0;

  constructor(spec?: ConstructorParameters<typeof Scuttler>[0]) {
    this.body = new Scuttler(spec);
    this.body.hp = SPARK.hp;
  }

  private now(): number {
    return this.clock ? this.clock() : this.own;
  }
  /** How charged it is now (0..1), and whether it is letting go (the discharge). */
  get charge(): number {
    return laneState('snare', this.now()).warn;
  }
  get discharging(): boolean {
    return laneState('snare', this.now()).live;
  }

  // ---- What the game asks of any creature: the roach's, but for the charge ----
  get x(): number { return this.body.x; }
  set x(v: number) { this.body.x = v; }
  get y(): number { return this.body.y; }
  set y(v: number) { this.body.y = v; }
  get z(): number { return this.body.z; }
  set z(v: number) { this.body.z = v; }
  get facing(): number { return this.body.facing; }
  set facing(v: number) { this.body.facing = v; }
  get state(): string { return this.body.state; }
  set state(v: string) { this.body.state = v as Scuttler['state']; }
  get stateTime(): number { return this.body.stateTime; }
  set stateTime(v: number) { this.body.stateTime = v; }
  get lastSwing(): number { return this.body.lastSwing; }
  set lastSwing(v: number) { this.body.lastSwing = v; }
  get radius(): number { return this.body.radius; }
  get alive(): boolean { return this.body.alive; }
  get respawns(): boolean { return this.body.respawns; }
  get canStand(): CanStand | null { return this.body.canStand; }
  set canStand(v: CanStand | null) { this.body.canStand = v; }
  get floorUnder(): FloorUnder | null { return this.body.floorUnder; }
  set floorUnder(v: FloorUnder | null) { this.body.floorUnder = v; }
  get mayAttack(): boolean { return this.body.mayAttack; }
  set mayAttack(v: boolean) { this.body.mayAttack = v; }
  get flank(): number | null { return this.body.flank; }
  set flank(v: number | null) { this.body.flank = v; }
  get ready(): boolean { return this.body.ready; }
  get down(): boolean { return this.body.down; }
  get hp(): number { return this.body.hp; }
  /** Its bite (the roach's lunge), or its discharge all round it. */
  get attackActive(): boolean {
    return this.body.attackActive || (this.alive && this.discharging);
  }
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean } | undefined {
    return this.discharging && !this.body.attackActive ? { reach: SPARK.burst.reach, arc: Math.PI, damage: SPARK.burst.damage, heavy: true } : undefined;
  }
  /** Charged: a blade glances off it. */
  deflects(_fromX: number, _fromZ: number, _how?: HitHow): boolean {
    return this.alive && (this.discharging || this.charge >= SPARK.proof);
  }
  takeHit(damage: number, fromX: number, fromZ: number, _how?: HitHow): boolean {
    return this.body.takeHit(damage, fromX, fromZ);
  }
  lungeLanded(blocked: boolean, parried = false): void {
    // (Only its own bite is spent by landing; a discharge is not a lunge.)
    if (this.body.attackActive) this.body.lungeLanded(blocked, parried);
  }
  nudge(dx: number, dz: number): void {
    this.body.nudge(dx, dz);
  }
  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean, threat = false): void {
    this.own += dt;
    this.body.update(dt, playerX, playerY, playerZ, playerAlive, threat);
  }
}
