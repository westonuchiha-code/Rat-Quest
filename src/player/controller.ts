import { FEELS, type Feel } from '../data/feel';
import { MAX_WALK_SLOPE , type SlimeZone } from '../world/layout';
import { findGrind, grindHeight, type GrindLine } from '../world/grind';
import { findRail, railAt, type RailCurve } from '../world/rails';
import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { Aabb, topAt, slopeOf, slopeXZ, keepInWell, type Well } from '../world/collision';
import type { WaterVolume } from '../world/layout';
import { NO_GEAR, type GearMods } from '../data/equipment';
import { ATTACK_CLIPS } from './animations';

export type PlayerState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'attack' | 'dodge' | 'guard' | 'plunge' | 'swim' | 'hurt' | 'dead' | 'longjump' | 'hang' | 'climb' | 'ride' | 'slide';
/** A move that just happened this step, for sounds and rumble. */
export type MoveEvent = 'longjump' | 'wallkick' | 'grab' | 'climb' | 'ride' | 'rideEnd' | 'ollie' | 'kickflip' | 'trick' | 'rideLand' | 'bail' | 'grind' | 'grindEnd' | 'slip' | 'slideHop' | 'slideEnd' | null;
/** 'parried' is a block made just as the shield came up: no shove, and the attacker reels. */
export type HitResult = 'dodged' | 'blocked' | 'parried' | 'hit' | 'killed';
/** 0 not plunging, 1 hanging with the sword raised, 2 diving, 3 stuck in the ground after landing. */
export type PlungeStage = 0 | 1 | 2 | 3;
export type DodgeKind = 'roll' | 'back';

const EPS = 1e-4;
/**
 * How far a ramp may fall away under his feet in one step and still hold him. Running down the steepest he walks it
 * falls a tenth of a unit a step; stepping off a landing onto one, he has been standing on the landing's edge with
 * the slope already most of a third of a unit down under his middle.
 */
const RAMP_HOLD = 0.48;
/** Seconds for stowing or drawing the weapons. */
const STOW_TIME = 0.6;

const NO_INPUT: PlayerInput = {
  move: new THREE.Vector3(),
  run: false,
  jumpPressed: false,
  jumpHeld: true, // held, so a knockback hop is not cut short
  attackPressed: false,
  dodgePressed: false,
  guardHeld: false,
  stowPressed: false,
};

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  return Math.max(value - maxDelta, target);
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/** Per-tick input the controller reads. */
export interface PlayerInput {
  move: THREE.Vector3; // world-space horizontal direction, length 0..1
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  dodgePressed: boolean;
  guardHeld: boolean;
  /** Toggles between drawn and stowed weapons. */
  stowPressed?: boolean;
}

/**
 * Character controller using a vertical cylinder against AABBs.
 * Walking, running, a floatier jump with a double jump, coyote time, jump buffering,
 * stepping onto low ledges, a three-hit sword combo that steps forward with each swing, a shield guard
 * that blocks hits from the front, a dodge that hits pass through (roll with input, backstep without),
 * health, and respawning after dying or falling into the pit.
 */
/** How much of a pull-up's height his feet have gained, `f` of the way through it (they rise early, then he moves in). */
export function climbRise(f: number): number {
  return 1 - (1 - Math.min(1, f * 1.6)) ** 2;
}
/** How far below the edge his feet hang. */
export const HANG_DROP = 1.05;

/** How far past the face of the wall his paws rest on the top of a ledge. */
const GRIP_IN = 0.04;

export class PlayerController {
  readonly position: THREE.Vector3;
  /** Position at the start of the last simulation tick, used for render interpolation. */
  readonly prevPosition: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  facing = 0;
  grounded = false;
  guarding = false;
  /** How long the shield has been up, for the perfectly timed block. */
  guardAge = 0;
  private attackBuffer = 0;
  private dodgeBuffer = 0;
  /** False while the sword and shield are on his back. Flips halfway through the stow/draw motion. */
  armed = true;
  /** Seconds into a stow/draw motion, or -1 when not doing one. */
  stowTimer = -1;
  /** Where the air attack is: see PlungeStage. */
  plungeStage: PlungeStage = 0;
  plungeTimer = 0;
  /** True for the one tick on which a dive lands, so combat can make the shockwave. */
  plungeImpact = false;
  /** Pools he can swim in. Set by the game from the room. */
  water: WaterVolume[] = [];
  swimming = false;
  /** True for the one tick he splashes into or jumps out of the water. */
  splash = false;
  /** Height of the water he is in or just left, for effects. */
  waterY = 0;
  private swimGrace = 0;
  private autoStowed = false;
  state: PlayerState = 'idle';
  hp: number = TUNING.health.max;
  /** What he is wearing does (from gearMods). Set when his gear changes. */
  gear: GearMods = NO_GEAR;
  /** Hearts he can have: the usual, plus or minus what he wears (never fewer than one). */
  get maxHp(): number {
    return Math.max(1, TUNING.health.max + this.gear.hearts);
  }
  /** Set each tick by the game: the direction (yaw) a new swing should face, or null to use the stick. */
  attackAim: number | null = null;
  /** Goes up by one each time a swing starts, so a swing can only hit each enemy once. */
  swingId = 0;

  /** Where he appears after a fall or a defeat. Levels move it. */
  readonly spawn: THREE.Vector3;
  private coyoteTimer = 0;
  private jumpBuffer = 0;
  private jumpCut = false;
  private wasGrounded = false;
  private landTimer = 0;
  private airJumpsLeft: number = TUNING.jump.airJumps;
  private flipTimer = -1; // -1 means no backflip playing

  private attackStep = 0;
  private attackTimer = -1; // -1 means not attacking
  private comboQueued = false;

  private dodgeKind: DodgeKind = 'roll';
  /** Standing on a ramp (see moveVertical). */
  private onRamp = false;
  /** What he is standing on (null in the air). */
  private groundBox: Aabb | null = null;
  /** He is standing on ice. */
  get onIce(): boolean {
    return this.grounded && !!this.groundBox?.slick;
  }
  private stickHeld = false;
  /**
   * He is gliding: on ice, moving, the stick let go, and doing nothing else. His feet are not driving him, so he is
   * drawn braced and still, not running on the spot.
   */
  get gliding(): boolean {
    return this.onIce && !this.stickHeld && (this.state === 'run' || this.state === 'walk') && Math.hypot(this.velocity.x, this.velocity.z) > 0.6;
  }
  /**
   * Riding his shield (see `rideStep` and TUNING.ride). While he is: `rideSteer` is how hard he is steering, from -1
   * to 1 (for his lean and his tail), and `rideFlipProgress` how far through a kickflip he is (0..1, -1 when not).
   */
  riding = false;
  /**
   * HOW THE PLACE HE IS IN PLAYS (data/feel.ts): the dream's tuck, its speed for tricks and its air tricks are the
   * dream's alone. The game sets this when a level loads; one who is not told is in the waking world.
   */
  feel: Feel = FEELS.waking;
  rideSteer = 0;
  /** How far he is TUCKED on his shield, 0 to 1 (the stick pushed the way he is going): crouched low, and faster for it. */
  rideTuck = 0;
  private rideHeading = 0;
  private rideAge = 0;
  private rideFlip = -1;
  private rideFlipDone = false;
  /** A SPIN (ATTACK in the air on his shield): how far round, 0..1, or -1. A GRAB (GUARD held in the air): how long held. */
  private rideSpin = -1;
  private rideGrab = 0;
  private rideGrabbed = false;
  /** How many tricks he has done in this air, to be paid for in speed when he lands them. */
  private rideTricks = 0;
  /** For how he is drawn: how far round a spin he is (0..1, -1 not spinning), and how far into a grab (0..1). */
  get rideSpinProgress(): number {
    return this.riding ? this.rideSpin : -1;
  }
  rideGrabPose = 0;
  /** A level that is a skate park (`LevelDef.skate`): the air attack puts him on his shield ANYWHERE, not only over a steep slope. */
  skateAnywhere = false;
  private rideAgain = 0;
  /**
   * Grinding: his shield across a ledge or a rail, sliding along it (see `grindStep`, TUNING.grind, world/grind.ts).
   * He is still `riding`. `s` is where he is along the line, `h` its height there, `v` his speed along it (+ toward
   * the + end of its axis), `slope` how it is rising that way.
   */
  private grind: { line: GrindLine; s: number; h: number; v: number; slope: number; off: number; air: number; fall: number; /** As fast as it will carry him: his standing top speed, or what he came onto it with if that was more (a tuck). */ top: number } | null = null;
  private grindAgain = 0;
  /** The level's LIGHT RAILS (world/rails.ts): lines through the air that he can grind, and that are not solid. Set when a level is made. */
  rails: RailCurve[] = [];
  /** On the line (not still coming down onto it). */
  get grinding(): boolean {
    return this.grind !== null && this.grind.air <= 0;
  }
  /**
   * Sliding down a slope too steep to stand on, on his own hide: no shield under him (see `slideStep`, TUNING.slide).
   * `slideBack`: he was going UP it when he lost his footing, and slides down it backwards on his belly, clawing.
   */
  sliding = false;
  slideBack = false;
  /**
   * In the air after the hop out of a slide. The hop ENDS the slide: he is jumping, and looks it (the owner,
   * 2026-11-16: "if you jump it should go back into a jump pose and he can slip again if he lands on an [incline] too
   * steep"). But it is still only the hop a slide allows: until he lands he is carried as he was going, with no
   * steering, no second jump, no wall kick and no catching an edge, so it does not get him up what he slid down.
   */
  slideHop = false;
  private slideHeading = 0;
  private slideAge = 0;
  private slipTimer = 0;
  private rideGroundAge = 0;
  /** Which side of him the drop is on as he grinds (+1 his model's +x side, -1 the other, 0 on a rail or not grinding). */
  get grindSide(): number {
    const g = this.grind;
    if (!g || g.line.side === 0) return 0;
    // (His model's +x, facing along +x, is toward -z; facing along +z, toward +x.)
    const dir = g.v >= 0 ? 1 : -1;
    return g.line.axis === 'x' ? -g.line.side * dir : g.line.side * dir;
  }
  get rideFlipProgress(): number {
    return this.riding ? this.rideFlip : -1;
  }
  /**
   * How the ground he rides on lies under him: its rise for a unit forward, and for a unit to the side his model calls
   * +x. Nothing on the flat or in the air. (His shield is drawn lying on the slope, not level and half inside it.)
   */
  get rideGround(): { along: number; across: number } {
    // (On a rail that slopes, it is the rail's slope the way he is going.)
    if (this.grind) return { along: this.grind.slope * Math.sign(this.grind.v), across: 0 };
    const under = this.riding || this.sliding ? this.slopeUnder() : null;
    if (!under) return { along: 0, across: 0 };
    const fx = Math.sin(this.facing);
    const fz = Math.cos(this.facing);
    return { along: -(under.dx * fx + under.dz * fz) * under.steep, across: -(under.dx * fz - under.dz * fx) * under.steep };
  }
  private dodgeTimer = -1; // -1 means not dodging
  private dodgeDuration = 0;
  private dodgeSpeed = 0;
  private dodgeCooldown = 0;
  private readonly dodgeDir = new THREE.Vector3();

  private hurtTimer = 0;
  private invulnTimer = 0;
  private blockStun = 0;
  private deadTimer = -1; // -1 means alive

  // Open-course moves.
  /** What he just did this step (long jump, wall kick, grab, climb), for sounds. */
  moveEvent: MoveEvent = null;
  /** A round room in the dark he cannot leave (LevelDef.well), or none. Whoever loads the level sets it. */
  well: Well | null = null;
  /** The slime in this place (world/layout.ts `slimeZones`): the game sets it when a level is loaded. */
  slime: readonly SlimeZone[] = [];
  /** He is in slime: on the ground, on a green runnel. On foot it holds him (the shield rides over it as over anything). */
  get inSlime(): boolean {
    if (!this.grounded) return false;
    const p = this.position;
    for (const z of this.slime) if (p.x > z.x0 && p.x < z.x1 && p.z > z.z0 && p.z < z.z1 && p.y > z.y0 - 0.6 && p.y < z.y1 + 0.6) return true;
    return false;
  }
  /** Whether he can catch ledges in this level. */
  allowGrab = true;
  /** Whether the long jump works in this level. */
  allowLongJump = true;
  private longJump = false;
  /** Seconds since he was last running fast on the ground (a long jump needs it recent). */
  private sinceFast = 99;
  /** Touching a wall in the air: how long a jump still kicks off it, and which way is out from it. */
  private wallTimer = 0;
  private wallNX = 0;
  private wallNZ = 0;
  private wallBox: Aabb | null = null;
  private kickLock = 0;
  /**
   * The flight after a wall kick: seconds of it left, and which way it carries him (straight out from the wall he
   * kicked). While it lasts he keeps the kick's speed across, so he reaches the wall opposite squarely without the
   * stick; pressed against that wall by it he can kick again, and so on up a shaft.
   */
  private kickFlight = 0;
  private kickX = 0;
  private kickZ = 0;
  /** A jump pressed just before he reaches the far wall, kept for the kick off it (seconds left). */
  private kickHold = 0;
  /** Hanging from a ledge: where its top is and which way is out from the wall. */
  private hang: { top: number; nx: number; nz: number; lip: number } | null = null;
  /** How far he still has to swing out to hang clear of an overhanging edge (he caught it from underneath). */
  private hangSlide = 0;
  private hangDrop = 0;
  private hangAge = 0;
  /** The point on the edge his paws hold (world). */
  private readonly grip = new THREE.Vector3();
  private climbT = -1;
  private readonly climbFrom = new THREE.Vector3();
  private readonly climbTo = new THREE.Vector3();

  constructor(spawn: THREE.Vector3) {
    this.spawn = spawn.clone();
    this.position = spawn.clone();
    this.prevPosition = spawn.clone();
  }

  /** Which hit of the combo is playing: 0, 1 or 2. */
  get comboStep(): number {
    return this.attackStep;
  }

  /** Seconds into the current swing, or 0 when not attacking. */
  get attackTime(): number {
    return this.attackTimer < 0 ? 0 : this.attackTimer;
  }

  /** True while the sword is able to hit. Hit detection (M4) will use this. */
  get attackActive(): boolean {
    if (this.attackTimer < 0) return false;
    const clip = ATTACK_CLIPS[this.attackStep];
    return this.attackTimer >= clip.activeStart && this.attackTimer <= clip.activeEnd;
  }

  /** The clip of the swing that is playing. */
  get attackClip(): (typeof ATTACK_CLIPS)[number] {
    return ATTACK_CLIPS[this.attackStep];
  }

  get dead(): boolean {
    return this.deadTimer >= 0;
  }

  /** A test switch (the Workshop): nothing hurts him. Never set in a real game. */
  untouchable = false;

  /** True while hits pass through him: the safe part of a dodge, the moments after being hit, or when dead. */
  get invulnerable(): boolean {
    if (this.deadTimer >= 0 || this.invulnTimer > 0 || this.untouchable) return true;
    if (this.dodgeTimer >= 0) {
      const p = this.dodgeTimer / this.dodgeDuration;
      const safe = this.dodgeKind === 'roll' ? TUNING.dodge.rollSafe : TUNING.dodge.backSafe;
      return p >= safe[0] && p <= safe[1];
    }
    return false;
  }

  /** True during the flicker after a hit, so the model can blink. */
  get recentlyHit(): boolean {
    return this.invulnTimer > 0 && this.deadTimer < 0;
  }

  /**
   * An enemy's attack reaches the rat from (fromX, fromZ).
   * A dodge avoids it, a guard facing the attacker blocks it, otherwise it hurts and knocks him back.
   */
  /** Something solid just over his head, within `gap`. */
  private ceilingOver(colliders: readonly Aabb[], gap: number): boolean {
    const p = this.position;
    const r = TUNING.rat.radius * 0.9;
    const top = p.y + TUNING.rat.height;
    return colliders.some((b) => b.min.y >= top - 0.05 && b.min.y < top + gap && b.max.x > p.x - r && b.min.x < p.x + r && b.max.z > p.z - r && b.min.z < p.z + r);
  }

  /** A fall into the dark: no rolling or guarding out of it (but no second hurt straight after a hit that knocked him in). */
  takeFall(damage: number): HitResult {
    if (this.deadTimer >= 0 || this.invulnTimer > 0 || this.untouchable) return 'dodged';
    this.dodgeTimer = -1;
    this.guarding = false;
    return this.takeHit(this.position.x + 0.01, this.position.z, damage);
  }

  /** Flames on the floor: no rolling or guarding out of them, and he is thrown back from their middle. */
  takeBurn(fromX: number, fromZ: number, damage: number): HitResult {
    if (this.deadTimer >= 0 || this.invulnTimer > 0 || this.untouchable) return 'dodged';
    this.dodgeTimer = -1;
    this.guarding = false;
    const on = Math.hypot(fromX - this.position.x, fromZ - this.position.z) < 0.02;
    return this.takeHit(on ? this.position.x + 0.01 : fromX, fromZ, damage);
  }

  /** `heavy`: a blow too big for a shield (it lands through a plain block; only a perfectly timed guard turns it). */
  takeHit(fromX: number, fromZ: number, damage: number, heavy = false): HitResult {
    if (this.invulnerable) return 'dodged';
    let ax = this.position.x - fromX;
    let az = this.position.z - fromZ;
    const len = Math.hypot(ax, az) || 1;
    ax /= len;
    az /= len;
    const H = TUNING.health;
    if (this.guarding) {
      const toAttacker = Math.atan2(-ax, -az);
      const off = Math.abs(Math.atan2(Math.sin(toAttacker - this.facing), Math.cos(toAttacker - this.facing)));
      if (off <= H.blockArc * this.gear.blockArc) {
        if (this.guardAge <= TUNING.guard.parryWindow * this.gear.parry) return 'parried';
        if (!heavy) {
          this.velocity.x = ax * H.blockPush;
          this.velocity.z = az * H.blockPush;
          this.blockStun = H.blockStun;
          return 'blocked';
        }
      }
    }
    this.hp = Math.max(0, this.hp - damage);
    this.plungeStage = 0;
    this.attackTimer = -1;
    this.attackStep = 0;
    this.comboQueued = false;
    this.dodgeTimer = -1;
    this.flipTimer = -1;
    this.hang = null;
    this.climbT = -1;
    this.longJump = false;
    this.kickLock = 0;
    this.wallTimer = 0;
    this.guarding = false;
    this.velocity.x = ax * H.knockback;
    this.velocity.z = az * H.knockback;
    if (this.grounded) this.velocity.y = 3.2;
    this.grounded = false;
    if (this.hp <= 0) {
      this.deadTimer = 0;
      this.state = 'dead';
      return 'killed';
    }
    this.hurtTimer = H.hurtTime;
    this.invulnTimer = H.invulnTime;
    this.state = 'hurt';
    return 'hit';
  }

  /**
   * His sword glanced off armour: his arm bounces back. The swing ends, he is pushed back a step, and he cannot swing
   * again for a moment (like a blocked hit, but it is his own blow that is stopped).
   */
  recoil(fromX: number, fromZ: number): void {
    let ax = this.position.x - fromX;
    let az = this.position.z - fromZ;
    const len = Math.hypot(ax, az) || 1;
    ax /= len;
    az /= len;
    const H = TUNING.health;
    this.attackTimer = -1;
    this.attackStep = 0;
    this.comboQueued = false;
    this.velocity.x = ax * H.recoilPush;
    this.velocity.z = az * H.recoilPush;
    this.blockStun = H.recoilStun;
  }

  /** Which way the current dodge goes: 'roll' follows input, 'back' is a backstep with no input. */
  get currentDodgeKind(): DodgeKind {
    return this.dodgeKind;
  }

  /** 0..1 through the backflip that plays on an air jump, or 0 when not flipping. */
  get flipProgress(): number {
    return this.flipTimer >= 0 ? this.flipTimer / TUNING.jump.flipDuration : 0;
  }

  /** 0..1 through the dodge, or 0 when not dodging. */
  get dodgeProgress(): number {
    return this.dodgeTimer >= 0 ? this.dodgeTimer / this.dodgeDuration : 0;
  }

  /** 0..1 through a stow/draw motion, or -1 when not doing one. */
  /** How far through the push of a wall kick he is (0..1), or -1 when he is not kicking off. */
  get kickProgress(): number {
    return this.kickLock > 0 ? 1 - this.kickLock / TUNING.moves.wallKickLock : -1;
  }

  /** True while he is in the air against a wall he is facing and could kick off (the model braces his feet on it). */
  get onWall(): boolean {
    if (this.grounded || this.wallTimer <= 0 || this.hang || this.climbT >= 0 || this.plungeStage !== 0 || this.attackTimer >= 0) return false;
    return -(Math.sin(this.facing) * this.wallNX + Math.cos(this.facing) * this.wallNZ) > 0.5;
  }

  /** How far through pulling himself up he is (0..1), or -1 when he is not. */
  get climbProgress(): number {
    return this.climbT < 0 ? -1 : Math.min(1, this.climbT / TUNING.moves.climbTime);
  }

  /** How long he has been hanging from a ledge (seconds), or -1 when he is not. */
  get hangTime(): number {
    return this.hang ? this.hangAge : -1;
  }

  /**
   * Where the edge he is holding is, measured from his feet in the way he faces: `y` up, `z` forward. Null when he is
   * neither hanging nor climbing. The model plants his paws there.
   */
  get ledge(): { y: number; z: number } | null {
    if (!this.hang && this.climbT < 0) return null;
    const fx = Math.sin(this.facing);
    const fz = Math.cos(this.facing);
    return { y: this.grip.y - this.position.y, z: (this.grip.x - this.position.x) * fx + (this.grip.z - this.position.z) * fz };
  }

  get stowProgress(): number {
    return this.stowTimer < 0 ? -1 : this.stowTimer / STOW_TIME;
  }

  respawn(): void {
    this.armed = true;
    this.stowTimer = -1;
    this.plungeStage = 0;
    this.plungeImpact = false;
    this.swimming = false;
    this.swimGrace = 0;
    this.autoStowed = false;
    this.position.copy(this.spawn);
    this.prevPosition.copy(this.spawn);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.guarding = false;
    this.jumpCut = false;
    this.landTimer = 0;
    this.airJumpsLeft = TUNING.jump.airJumps;
    this.riding = false;
    this.sliding = false;
    this.slideHop = false;
    this.slipTimer = 0;
    this.grind = null;
    this.rideFlip = -1;
    this.flipTimer = -1;
    this.attackStep = 0;
    this.attackTimer = -1;
    this.comboQueued = false;
    this.dodgeTimer = -1;
    this.dodgeCooldown = 0;
    this.hurtTimer = 0;
    this.invulnTimer = 0;
    this.blockStun = 0;
    this.deadTimer = -1;
    this.hp = this.maxHp;
    this.state = 'idle';
  }

  /** Advances the controller one simulation step. */
  /**
   * One frame of him. ON HIS SHIELD, A LONG FRAME IS TAKEN IN PIECES of a sixtieth of a second or less.
   * (The owner, 2026-11-17, of the Toy Box's half pipe: "it's okay going down but then when you're trying to go back up
   * the other side your character just like phases through the wall like the physics doesn't seem to be there". At
   * sixty frames a second it was there. At thirty, which is what a phone gives this level, a rider at speed goes half
   * a unit in one step: up a curved wall that is further than the wall's own shape allows for, he is put INSIDE it,
   * and thrown off. Every test of the ride ran at sixty.)
   * A button pressed is pressed in the first piece only; what happened in any piece is what happened this frame.
   */
  update(dt: number, rawInput: PlayerInput, colliders: Aabb[]): void {
    const pieces = this.riding ? Math.min(6, Math.ceil(dt * 60 - 1e-6)) : 1;
    if (pieces <= 1) return this.step(dt, rawInput, colliders);
    const from = this.position.clone();
    const held: PlayerInput = { ...rawInput, jumpPressed: false, attackPressed: false, dodgePressed: false, stowPressed: false };
    let event: MoveEvent | null = null;
    let impact = false;
    let splash = false;
    for (let i = 0; i < pieces; i++) {
      this.step(dt / pieces, i === 0 ? rawInput : held, colliders);
      event ??= this.moveEvent;
      impact ||= this.plungeImpact;
      splash ||= this.splash;
    }
    this.moveEvent = event;
    this.plungeImpact = impact;
    this.splash = splash;
    this.prevPosition.copy(from);
  }

  private step(dt: number, rawInput: PlayerInput, colliders: Aabb[]): void {
    const T = TUNING;
    this.prevPosition.copy(this.position);

    // Dead: lie there, then respawn. Hurt: no control until the knockback ends.
    if (this.deadTimer >= 0) {
      this.deadTimer += dt;
      if (this.deadTimer >= T.health.deadTime) {
        this.respawn();
        return;
      }
    }
    this.plungeImpact = false;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.blockStun = Math.max(0, this.blockStun - dt);
    const helpless = this.deadTimer >= 0 || this.hurtTimer > 0;
    const input = helpless ? NO_INPUT : rawInput;
    const move = input.move;
    this.stickHeld = move.lengthSq() > 0.01;
    this.moveEvent = null;
    this.wallTimer = Math.max(0, this.wallTimer - dt);
    this.kickLock = Math.max(0, this.kickLock - dt);
    this.kickFlight = this.grounded || helpless || this.hang || this.plungeStage !== 0 ? 0 : Math.max(0, this.kickFlight - dt);
    this.kickHold = this.kickFlight > 0 ? Math.max(0, this.kickHold - dt) : 0;
    this.hangDrop = Math.max(0, this.hangDrop - dt);
    if (helpless) this.hang = null;

    // Pulling himself up onto a ledge: a short scripted climb.
    if (this.climbT >= 0) {
      this.climbT += dt;
      const f = Math.min(1, this.climbT / T.moves.climbTime);
      const up = climbRise(f);
      this.position.set(
        this.climbFrom.x + (this.climbTo.x - this.climbFrom.x) * f * f,
        this.climbFrom.y + (this.climbTo.y - this.climbFrom.y) * up,
        this.climbFrom.z + (this.climbTo.z - this.climbFrom.z) * f * f,
      );
      this.velocity.set(0, 0, 0);
      if (f >= 1) {
        this.climbT = -1;
        this.grounded = true;
        this.wasGrounded = true;
        this.airJumpsLeft = T.jump.airJumps;
        this.landTimer = T.landTime;
      }
      this.updateState(0, false);
      return;
    }
    // Hanging from a ledge: jump or push toward the wall climbs up; back away or dodge lets go.
    if (this.hang) {
      const h = this.hang;
      this.hangAge += dt;
      this.velocity.set(0, 0, 0);
      // Caught under an overhang, he swings out from the wall to hang from its edge (quickly: a twelfth of a second).
      const out = (all: boolean): void => {
        const step = all ? this.hangSlide : Math.min(this.hangSlide, (h.lip / 0.085) * dt);
        this.position.x += h.nx * step;
        this.position.z += h.nz * step;
        this.hangSlide -= step;
      };
      if (this.hangSlide > 0) out(false);
      const toward = -(move.x * h.nx + move.z * h.nz);
      if (input.jumpPressed || toward > 0.6) {
        out(true);
        this.climbFrom.copy(this.position);
        // Onto the top, the same distance in from the wall's own face whether or not something overhangs it.
        const inward = T.rat.radius * 2 + 0.15 + h.lip;
        this.climbTo.set(this.position.x - h.nx * inward, h.top, this.position.z - h.nz * inward);
        this.hang = null;
        this.climbT = 0;
        this.jumpBuffer = 0;
        this.moveEvent = 'climb';
      } else if (input.dodgePressed || toward < -0.6) {
        this.hang = null;
        this.hangDrop = 0.4;
      }
      this.updateState(0, false);
      if (this.hang) return;
      if (this.climbT >= 0) return;
    }

    // Grinding: he is on a line, and nothing else moves him till he is off it.
    this.grindAgain = Math.max(0, this.grindAgain - dt);
    if (helpless || !this.riding) this.grind = null;
    if (this.grind) {
      this.grindStep(dt, input, colliders);
      this.updateState(Math.hypot(this.velocity.x, this.velocity.z), false);
      return;
    }
    // Riding, STOW (which the shield under his feet leaves nothing else for) puts it across the nearest edge. And in
    // the air on his own feet, over a rail or beside a ledge he is going along fast enough, the same button puts the
    // shield under him and brings him down onto it. (The owner, 2026-11-15: "if you're jumping above a rail and you
    // push triangle your character should jump onto his board and grind along the rail ... as long as you have
    // enough speed".) Too slow, nothing happens: he comes down as he would have.
    const inTheAir = !this.grounded && !this.swimming && this.climbT < 0 && this.plungeStage === 0 && this.attackTimer < 0 && this.dodgeTimer < 0;
    if ((this.riding || inTheAir) && input.stowPressed && !helpless && this.grindAgain <= 0 && this.startGrind(colliders)) {
      this.updateState(Math.hypot(this.velocity.x, this.velocity.z), false);
      return;
    }

    // Jump buffering: remember a press briefly so an early press still jumps on landing.
    if (input.jumpPressed) this.jumpBuffer = T.jump.buffer;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    // Flying from one wall at another, a press made a moment before he gets there is for the kick off it: it is kept
    // until he touches, and does not spend his air jump meanwhile.
    if (input.jumpPressed && this.kickFlight > 0 && this.wallTimer <= 0 && this.wallAhead(colliders, T.moves.wallKickPush * T.moves.wallChainHold)) this.kickHold = T.moves.wallChainHold;
    if (this.kickHold > 0) this.jumpBuffer = Math.max(this.jumpBuffer, 0.02);

    // Water: below the surface of a pool he swims. Jumping out of it is a normal jump.
    this.splash = false;
    this.swimGrace = Math.max(0, this.swimGrace - dt);
    const pool = this.poolAt();
    const swimming = pool !== null && !helpless && this.swimGrace <= 0 && this.position.y < pool.y;
    if (pool) this.waterY = pool.y;
    if (swimming && !this.swimming) {
      // Splash in: weapons go on his back, and anything he was doing stops.
      this.splash = true;
      if (this.armed) this.autoStowed = true;
      this.armed = false;
      this.stowTimer = -1;
      this.plungeStage = 0;
      this.attackTimer = -1;
      this.attackStep = 0;
      this.comboQueued = false;
      this.dodgeTimer = -1;
      this.flipTimer = -1;
      this.guarding = false;
    }
    this.swimming = swimming;

    // Back on dry ground after swimming: the weapons come out again by themselves.
    if (this.autoStowed && !swimming && this.swimGrace <= 0 && this.grounded && !this.armed && this.stowTimer < 0) {
      this.autoStowed = false;
      this.stowTimer = 0;
    }
    if (input.stowPressed) this.autoStowed = false;

    // Stow / draw: on the ground, not mid-fight. The weapons swap places at the halfway point.
    if (input.stowPressed && !this.riding && !this.sliding && this.stowTimer < 0 && this.grounded && this.attackTimer < 0 && this.dodgeTimer < 0) {
      this.stowTimer = 0;
    }
    if (this.stowTimer >= 0) {
      const before = this.stowTimer;
      this.stowTimer += dt;
      if (before < STOW_TIME * 0.5 && this.stowTimer >= STOW_TIME * 0.5) this.armed = !this.armed;
      if (this.stowTimer >= STOW_TIME || this.dodgeTimer >= 0 || !this.grounded) {
        this.stowTimer = -1;
      }
    }
    const canFight = this.armed && this.stowTimer < 0 && !swimming;

    // Guard: held, on the ground, and not mid-swing or mid-dodge.
    this.guarding = canFight && !this.riding && !this.sliding && this.plungeStage === 0 && input.guardHeld && this.grounded && this.attackTimer < 0 && this.dodgeTimer < 0;
    this.guardAge = this.guarding ? this.guardAge + dt : 0;

    // A press made a moment too early (mid-roll, or while still shoved back from a block) is remembered and used as soon as it can be.
    this.attackBuffer = input.attackPressed ? T.buffer.attack : Math.max(0, this.attackBuffer - dt);
    this.dodgeBuffer = input.dodgePressed ? T.buffer.dodge : Math.max(0, this.dodgeBuffer - dt);
    const wantAttack = input.attackPressed || this.attackBuffer > 0;
    const wantDodge = input.dodgePressed || this.dodgeBuffer > 0;

    // In the air over a slope steep enough, the air attack is not the dive: it puts his shield under his feet, and
    // he comes down on the slope riding it. (The owner, 2026-11-15: "he should go into his shield surfing if he
    // presses the downward attack when the slope below him is beyond a certain incline".) With his weapons out or
    // on his back, and out of a slide as well as out of a jump.
    if (wantAttack && !this.grounded && !this.riding && !helpless && !swimming && !this.hang && this.climbT < 0 && this.plungeStage === 0 && this.attackTimer < 0 && this.dodgeTimer < 0 && this.stowTimer < 0 && this.slopeBelow(colliders)) {
      this.attackBuffer = 0;
      this.beginRide();
    }
    // Sword: a press starts the combo, or queues the next hit while a swing is already playing.
    // (ON HIS SHIELD TOO. The owner, 2026-11-17: "you should be able to swing your sword on attack while you're riding your
    // shield". The swing is the same swing and hits as it does; it does not turn him or slow him, the shield goes
    // where it was going; and in the air it is a swing, not the dive.)
    if (canFight && !this.sliding && wantAttack && this.dodgeTimer < 0 && (this.riding || !input.guardHeld) && this.blockStun <= 0) {
      this.attackBuffer = 0;
      if (this.plungeStage !== 0) {
        // Already plunging: nothing more to do until he lands.
      } else if (!this.grounded && this.attackTimer < 0 && !this.riding) {
        this.startPlunge();
      } else if (this.attackTimer < 0) {
        this.startSwing(0, move);
      } else {
        this.comboQueued = true;
      }
    }

    // Riding: the dodge button steps him off the shield. (He cannot roll or guard from it: it is under his feet.)
    if (this.riding && wantDodge && this.grounded) {
      this.dodgeBuffer = 0;
      this.endRide('rideEnd');
    }
    this.slipIfTooSteep(dt, input, helpless, swimming);

    // Dodge: from the ground. It can cancel the recovery of a swing, but not the swing itself.
    if (
      !this.riding &&
      !this.sliding &&
      wantDodge &&
      this.plungeStage === 0 &&
      this.grounded &&
      this.dodgeTimer < 0 &&
      this.dodgeCooldown <= 0 &&
      (this.attackTimer < 0 || this.attackTimer >= ATTACK_CLIPS[this.attackStep].chainAt)
    ) {
      this.attackTimer = -1;
      this.attackStep = 0;
      this.dodgeBuffer = 0;
      this.startDodge(move);
    }

    // Air attack stages: hang, then dive until the ground, then stay stuck for a moment.
    if (this.plungeStage === 1) {
      this.plungeTimer += dt;
      if (this.plungeTimer >= T.plunge.windup) {
        this.plungeStage = 2;
        this.plungeTimer = 0;
      }
    } else if (this.plungeStage === 3) {
      this.plungeTimer += dt;
      if (this.plungeTimer >= T.plunge.recover) this.plungeStage = 0;
    }

    // Advance timers.
    if (this.attackTimer >= 0) {
      this.attackTimer += dt * this.gear.swing;
      const clip = ATTACK_CLIPS[this.attackStep];
      if (this.comboQueued && this.attackStep < ATTACK_CLIPS.length - 1 && this.attackTimer >= clip.chainAt) {
        // A queued press cuts the recovery short and goes straight into the next hit.
        this.startSwing(this.attackStep + 1, move);
      } else if (this.attackTimer >= clip.duration) {
        this.attackTimer = -1;
        this.attackStep = 0;
        this.comboQueued = false;
      }
    }
    if (this.flipTimer >= 0) {
      this.flipTimer += dt;
      if (this.flipTimer >= TUNING.jump.flipDuration) this.flipTimer = -1;
    }
    if (this.dodgeTimer >= 0) {
      this.dodgeTimer += dt;
      if (this.dodgeTimer >= this.dodgeDuration) this.dodgeTimer = -1;
    }
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);

    // Horizontal velocity. A dodge sets it directly; otherwise it eases toward the target speed.
    const dodging = this.dodgeTimer >= 0;
    if (helpless || swimming) this.riding = false;
    if (helpless || swimming || this.riding) this.sliding = false;
    if (this.grounded || helpless || swimming || this.riding || this.plungeStage !== 0) this.slideHop = false;
    this.rideAgain = Math.max(0, this.rideAgain - dt);
    this.rideGroundAge = this.riding && this.grounded ? this.rideGroundAge + dt : 0;
    let rideSpeed = 0;
    if (this.riding) {
      rideSpeed = this.rideStep(dt, input);
    } else if (this.sliding) {
      this.slideStep(dt, input);
    } else if (dodging) {
      this.velocity.x = this.dodgeDir.x * this.dodgeSpeed;
      this.velocity.z = this.dodgeDir.z * this.dodgeSpeed;
    } else if (helpless) {
      // Knockback slides to a stop.
      const drag = (this.grounded ? 16 : 4) * dt;
      this.velocity.x = approach(this.velocity.x, 0, drag);
      this.velocity.z = approach(this.velocity.z, 0, drag);
    } else if (this.plungeStage !== 0) {
      // Plunging: no sideways drift.
      this.velocity.x = approach(this.velocity.x, 0, 80 * dt);
      this.velocity.z = approach(this.velocity.z, 0, 80 * dt);
    } else if (this.attackTimer >= 0 && this.grounded) {
      // A swing commits him: he steps forward along his facing during the lunge window and is planted otherwise.
      const clip = ATTACK_CLIPS[this.attackStep];
      const lunging = this.attackTimer >= clip.lunge.from && this.attackTimer <= clip.lunge.to;
      const speed = lunging ? clip.lunge.speed : 0;
      this.velocity.x = approach(this.velocity.x, Math.sin(this.facing) * speed, 60 * dt);
      this.velocity.z = approach(this.velocity.z, Math.cos(this.facing) * speed, 60 * dt);
    } else if (this.longJump && !this.grounded) {
      // Long jump: he keeps his speed and can only bend the leap a little.
      if (move.lengthSq() > 0.01) {
        this.velocity.x = approach(this.velocity.x, move.x * T.moves.longJumpSpeed * this.gear.longJump, T.moves.longJumpSteer * dt);
        this.velocity.z = approach(this.velocity.z, move.z * T.moves.longJumpSpeed * this.gear.longJump, T.moves.longJumpSteer * dt);
      }
    } else if (this.slideHop) {
      // The hop out of a slide: carried as he was going (see `slideHop`).
    } else if (this.kickLock > 0) {
      // Just kicked off a wall: momentum carries him out before the stick takes over again.
    } else if (this.kickFlight > 0 && !this.grounded && !swimming && this.kickCarry(move, dt)) {
      // Carried across by the kick (see kickCarry).
    } else {
      // (On ground too steep to stand on he scrabbles, for the moment he has before he slips: the steeper, the slower.)
      const steepUnder = this.slopeUnder();
      const scrabble = steepUnder && steepUnder.steep > MAX_WALK_SLOPE + 1e-6 ? 1 / (1 + steepUnder.steep) : 1;
      const mul = (this.guarding ? Math.min(1, T.guard.moveMultiplier * this.gear.guardMove) : 1) * scrabble;
      // (In slime his feet are held: he wades.)
      const mire = !swimming && this.inSlime ? T.slime.walk : 1;
      const target = swimming ? (input.run ? T.swim.fast : T.swim.speed) * this.gear.swim : (input.run ? T.move.run * this.gear.run : T.move.walk) * mul * mire;
      const hasInput = move.lengthSq() > 0.01;
      // (On ice he has no grip: slow to get going or to turn, and a long slide before he stops. See TUNING.ice.)
      const ice = this.onIce;
      const accel = swimming ? T.swim.accel : this.grounded ? (hasInput ? T.move.groundAccel * (ice ? T.ice.accel : 1) : T.move.groundDecel * this.gear.grip * (ice ? T.ice.decel : 1)) : T.move.airAccel;
      this.velocity.x = approach(this.velocity.x, move.x * target, accel * dt);
      this.velocity.z = approach(this.velocity.z, move.z * target, accel * dt);
    }

    // A long jump needs him to have been running fast just now.
    if (this.grounded && Math.hypot(this.velocity.x, this.velocity.z) > T.move.walk + 1.5) this.sinceFast = 0;
    else this.sinceFast += dt;

    // In the water he can always jump, and gets his air jump back.
    if (swimming) {
      this.coyoteTimer = T.jump.coyoteTime;
      this.airJumpsLeft = T.jump.airJumps;
    }

    // Jumps. Not during a dodge. Ground jump uses coyote time; the air jump is the extra one.
    if (!this.riding && !this.sliding && !this.slideHop && !dodging && !helpless && this.plungeStage === 0 && this.jumpBuffer > 0) {
      const kick = !this.grounded && !swimming && this.coyoteTimer <= 0 && this.wallTimer > 0;
      const long = this.allowLongJump && this.coyoteTimer > 0 && this.grounded && !swimming && !input.run && this.sinceFast < T.moves.longJumpWindow && this.attackTimer < 0 && !this.guarding;
      if (kick) {
        // Wall kick: off the wall he just touched, up and away.
        this.velocity.set(this.wallNX * T.moves.wallKickPush, T.moves.wallKickUp * this.gear.wallKick, this.wallNZ * T.moves.wallKickPush);
        this.facing = Math.atan2(this.wallNX, this.wallNZ);
        this.kickLock = T.moves.wallKickLock;
        this.kickFlight = T.moves.wallChainTime;
        this.kickX = this.wallNX;
        this.kickZ = this.wallNZ;
        this.kickHold = 0;
        this.wallTimer = 0;
        this.longJump = false;
        this.jumpBuffer = 0;
        this.jumpCut = false;
        this.moveEvent = 'wallkick';
      } else if (long) {
        // Long jump: low and fast along where he faces, with no air jump after.
        this.velocity.set(Math.sin(this.facing) * T.moves.longJumpSpeed * this.gear.longJump, T.moves.longJumpUp, Math.cos(this.facing) * T.moves.longJumpSpeed * this.gear.longJump);
        this.grounded = false;
        this.coyoteTimer = 0;
        this.airJumpsLeft = 0;
        this.longJump = true;
        this.jumpBuffer = 0;
        this.jumpCut = true; // letting go does not cut it short
        this.moveEvent = 'longjump';
      } else if (this.coyoteTimer > 0 && !(swimming && this.ceilingOver(colliders, 0.9))) {
        // (Not out of the water with a roof right over his head: there is no room to jump.)
        this.velocity.y = T.jump.velocity;
        this.grounded = false;
        this.coyoteTimer = 0;
        if (swimming) {
          this.swimGrace = T.swim.jumpGrace;
          this.splash = true;
        }
        this.jumpBuffer = 0;
        this.jumpCut = false;
      } else if (!this.grounded && this.airJumpsLeft > 0 && this.kickHold <= 0) {
        this.velocity.y = T.jump.doubleVelocity;
        this.airJumpsLeft--;
        this.flipTimer = 0;
        this.jumpBuffer = 0;
        this.jumpCut = false;
      }
    }

    // Variable jump height: releasing the button early cuts the rise once.
    if (!input.jumpHeld && this.velocity.y > 0 && !this.jumpCut) {
      this.velocity.y *= T.jump.cutMultiplier;
      this.jumpCut = true;
    }

    // Gravity. Falling is a little stronger than rising, so the arc hangs at the top and drops with snap.
    const gravity = this.velocity.y < 0 ? T.physics.gravity * T.physics.fallGravityMultiplier : T.physics.gravity;
    if (swimming && pool) {
      // Buoyancy: a spring toward floating height, so a splash sinks him a little and he bobs back up.
      const target = pool.y - T.swim.sink;
      this.velocity.y += (T.swim.stiffness * (target - this.position.y) - T.swim.damping * this.velocity.y) * dt;
    } else {
      this.velocity.y = Math.max(-T.physics.maxFall, this.velocity.y - gravity * dt);
    }
    if (this.plungeStage === 1) this.velocity.y = 0; // hanging
    else if (this.plungeStage === 2) this.velocity.y = -T.plunge.speed;

    // Horizontal motion, one axis at a time so walls slide instead of blocking diagonally.
    // A current carries him along while he swims in it.
    const flow = swimming && pool?.flow ? pool.flow : null;
    // (A rider keeps the rise or fall the slope was giving him when it ends under him: a kicker throws him up.)
    const rideLift = this.riding && this.grounded ? this.rideClimb() : null;
    const liftedFrom = this.riding && this.grounded ? this.groundBox : null;
    this.moveAxis('x', (this.velocity.x + (flow ? flow[0] : 0)) * dt, colliders);
    this.moveAxis('z', (this.velocity.z + (flow ? flow[1] : 0)) * dt, colliders);
    // Riding into a wall: at any speed worth the name, he comes off.
    if (this.riding && rideSpeed > T.ride.bailSpeed && Math.hypot(this.velocity.x, this.velocity.z) < rideSpeed * 0.6) this.bail();

    // Vertical motion, including landing and head bumps.
    const fallBefore = this.velocity.y;
    this.moveVertical(dt, colliders);
    // A rider coming down on a slope keeps what of his fall the slope turns along itself: dropping in onto the wall
    // of a pipe is how he gets his speed. (Before, every landing threw his falling speed away, slope or flat.)
    if (this.riding && this.grounded && !this.wasGrounded && fallBefore < 0) {
      const on = this.slopeUnder();
      if (on) {
        const along = this.velocity.x * on.dx + this.velocity.z * on.dz;
        const turned = (along - on.steep * fallBefore) / (1 + on.steep * on.steep);
        if (turned > along) {
          // (No faster for it than his standing top speed, unless he was going faster already: a tuck's speed is not lost on landing.)
          const more = Math.min(turned, Math.max(T.ride.max, along)) - along;
          this.velocity.x += on.dx * more;
          this.velocity.z += on.dz * more;
        }
      }
    }
    if (rideLift !== null && this.riding && !this.grounded && this.velocity.y <= 0 && rideLift !== 0) {
      this.velocity.y = rideLift;
      // (The top of a pipe's wall, going up it: straight up. At some speeds the wall lets go of him a moment before
      // its lip; left to the slope's own lift he went on OUT over the deck, and into the box's side.)
      if (liftedFrom?.vert && rideLift > 0 && rideLift / Math.max(1e-6, slopeOf(liftedFrom)) > TUNING.ride.vertMin) this.vertLaunch(liftedFrom);
      this.jumpCut = true; // (it is the ramp's throw, not a jump: no button is held, and none let go cuts it short)
    }
    if (this.plungeStage === 2 && this.grounded) {
      this.plungeStage = 3;
      this.plungeTimer = 0;
      this.plungeImpact = true;
    }

    if (this.grounded || swimming) this.longJump = false;
    // Ledge grab: falling past the top of a wall he is facing, with room on top, he catches it.
    const wb = this.wallBox;
    // (Of a ramp, only the wall at its high end has an edge to catch: its sides slope, and its low end is no wall.)
    // (A ramp has an edge to catch only at its high end, and only one that is not tipped across as well.)
    const edge = !wb?.ramp || (!wb.ramp.cross && (wb.ramp.axis === 'x' ? this.wallNX === wb.ramp.up : this.wallNZ === wb.ramp.up));
    if (wb && edge && !this.riding && !this.sliding && !this.slideHop && this.allowGrab && !this.grounded && !swimming && !helpless && this.velocity.y < 0 && this.hangDrop <= 0 && this.plungeStage === 0 && this.attackTimer < 0 && this.wallTimer > 0) {
      const top = wb.max.y;
      const p = this.position;
      // Pushing toward the wall at all (a stick held at an angle slides him along it, turning him sideways), or facing it.
      const facingIn = -(Math.sin(this.facing) * this.wallNX + Math.cos(this.facing) * this.wallNZ);
      const pushIn = -(move.x * this.wallNX + move.z * this.wallNZ);
      // The edge passed his paws at some point during this step (a fast fall cannot skip over it).
      const passed = top >= p.y + 0.5 && top <= this.prevPosition.y + 1.25;
      if (passed && (pushIn > 0.2 || facingIn > 0.35)) {
        const r = T.rat.radius;
        const ix = p.x - this.wallNX * (r * 2 + 0.15);
        const iz = p.z - this.wallNZ * (r * 2 + 0.15);
        const floor = colliders.some((b) => Math.abs(b.max.y - top) < 0.05 && ix > b.min.x && ix < b.max.x && iz > b.min.z && iz < b.max.z);
        // If something drawn on the top overhangs it (a pillar's capital), it is that edge he hangs from, his body
        // clear of it: unless there is no room out there for him to hang.
        let lip = wb.lip ?? 0;
        const ox = p.x + this.wallNX * lip;
        const oz = p.z + this.wallNZ * lip;
        if (lip > 0 && colliders.some((b) => b !== wb && b.max.y > top - HANG_DROP + 0.05 && b.min.y < top - HANG_DROP + T.rat.height && ox + r > b.min.x && ox - r < b.max.x && oz + r > b.min.z && oz - r < b.max.z)) lip = 0;
        // Room for the whole pull-up, not only for standing at the end of it: from where he hangs, over the edge, to
        // where he will stand, as high as his head goes. Without it he does not catch the edge at all. (He used to
        // catch it, haul himself up into whatever was overhead, and be hurt for it.)
        const hx = p.x + this.wallNX * lip;
        const hz = p.z + this.wallNZ * lip;
        const room = !colliders.some((b) => b.max.y > top + 0.02 && b.min.y < top + T.rat.height + 0.05 && Math.max(hx, ix) + r > b.min.x && Math.min(hx, ix) - r < b.max.x && Math.max(hz, iz) + r > b.min.z && Math.min(hz, iz) - r < b.max.z);
        if (room && floor) {
          this.hang = { top, nx: this.wallNX, nz: this.wallNZ, lip };
          this.hangAge = 0;
          this.hangSlide = lip;
          p.y = top - HANG_DROP;
          // His paws are on the edge at once (the overhang's, if there is one); his body swings out under them.
          this.grip.set(p.x + this.wallNX * (lip - r - GRIP_IN), top, p.z + this.wallNZ * (lip - r - GRIP_IN));
          this.velocity.set(0, 0, 0);
          this.longJump = false;
          this.flipTimer = -1;
          this.facing = Math.atan2(-this.wallNX, -this.wallNZ);
          this.moveEvent = 'grab';
        }
      }
    }
    if (this.wallTimer <= 0) this.wallBox = null;

    // Refills while grounded.
    this.coyoteTimer = this.grounded || swimming ? T.jump.coyoteTime : Math.max(0, this.coyoteTimer - dt);
    if (this.grounded) this.airJumpsLeft = T.jump.airJumps;

    // Landing detection drives the short land state.
    const justLanded = !this.wasGrounded && this.grounded;
    if (this.riding && justLanded) {
      // (A spin all but round when he lands is a spin done.)
      if (this.rideSpin >= T.ride.spinSafe) {
        this.rideSpin = -1;
        this.rideTricks++;
      }
      if (this.rideFlip >= 0 || this.rideSpin > 0.12) {
        // Down before the shield came round: he comes off it.
        this.bail();
      } else if (this.rideFlipDone || this.rideTricks > 0) {
        // Tricks landed: speed for each of them, past his standing top speed if they take him there (it goes as a tuck's does).
        const tricks = this.rideTricks + (this.rideFlipDone ? 1 : 0);
        this.rideFlipDone = false;
        this.rideTricks = 0;
        this.rideSpin = -1;
        const had = Math.hypot(this.velocity.x, this.velocity.z);
        // (PAST his standing top speed is the dream's: elsewhere a trick landed brings him up towards that speed, as
        // it did before there was a dream, and no further.)
        const v = Math.max(had, Math.min(this.feel.ride.trickSpeed ? T.ride.tuckMax : T.ride.max, had + T.ride.trickBoost * tricks));
        this.velocity.x = Math.sin(this.rideHeading) * v;
        this.velocity.z = Math.cos(this.rideHeading) * v;
        this.moveEvent = 'trick';
      } else this.moveEvent = 'rideLand';
    }
    this.wasGrounded = this.grounded;
    this.landTimer = justLanded ? T.landTime : Math.max(0, this.landTimer - dt);

    // The edge of the light in a round room: he goes no further out (and one falling in is brought inside it).
    if (this.well) keepInWell(this.well, this.position, this.velocity, T.rat.radius);

    // Fell out of the chamber: respawn.
    if (this.position.y < T.pit.respawnY) this.respawn();

    // Facing turns toward held input only. Momentum from a backstep, or a slide after letting go, doesn't turn him.
    const backstepping = this.dodgeTimer >= 0 && this.dodgeKind === 'back';
    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (planarSpeed > 0.2 && move.lengthSq() > 0.01 && !backstepping && this.attackTimer < 0 && this.kickFlight <= 0) {
      this.facing = lerpAngle(this.facing, Math.atan2(this.velocity.x, this.velocity.z), 1 - Math.exp(-T.move.turnRate * dt));
    }

    this.updateState(planarSpeed, input.run && planarSpeed > 4.4);
  }

  /**
   * The flight after a wall kick. He keeps the kick's speed straight across (it used to bleed away as soon as the
   * stick was let go, and to go wherever the stick pointed, which was rarely square at the next wall); the stick
   * trims him sideways a little. Hauling the stick right back towards the wall he left ends it: he is his to steer
   * again (returns false).
   */
  private kickCarry(move: THREE.Vector3, dt: number): boolean {
    const M = TUNING.moves;
    const along = move.x * this.kickX + move.z * this.kickZ;
    if (along < -0.5) {
      this.kickFlight = 0;
      return false;
    }
    const sx = move.x - this.kickX * along;
    const sz = move.z - this.kickZ * along;
    const accel = TUNING.move.airAccel * dt;
    this.velocity.x = approach(this.velocity.x, this.kickX * M.wallKickPush + sx * M.wallChainSteer, accel);
    this.velocity.z = approach(this.velocity.z, this.kickZ * M.wallKickPush + sz * M.wallChainSteer, accel);
    return true;
  }

  /** Whether a wall stands within `dist` of him the way his kick is carrying him. */
  private wallAhead(colliders: Aabb[], dist: number): boolean {
    const p = this.position;
    const r = TUNING.rat.radius;
    for (const b of colliders) {
      if (b.max.y <= p.y + 0.6 || b.min.y >= p.y + TUNING.rat.height) continue;
      if (this.kickX !== 0) {
        if (p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
        const gap = ((this.kickX > 0 ? b.min.x : b.max.x) - p.x) * this.kickX - r;
        if (gap > -0.05 && gap <= dist) return true;
      } else if (this.kickZ !== 0) {
        if (p.x + r <= b.min.x || p.x - r >= b.max.x) continue;
        const gap = ((this.kickZ > 0 ? b.min.z : b.max.z) - p.z) * this.kickZ - r;
        if (gap > -0.05 && gap <= dist) return true;
      }
    }
    return false;
  }

  /** Starts one hit of the combo, turning to face the aim target, or the stick if there is none. */
  private startSwing(step: number, move: THREE.Vector3): void {
    this.attackStep = step;
    this.attackTimer = 0;
    this.comboQueued = false;
    this.swingId++;
    if (this.attackAim !== null) this.facing = this.attackAim;
    else if (move.lengthSq() > 0.01) this.facing = Math.atan2(move.x, move.z);
  }

  /** The pool he is over (feet inside its footprint), or null. */
  private poolAt(): WaterVolume | null {
    const p = this.position;
    for (const w of this.water) {
      if (p.x >= w.x0 && p.x <= w.x1 && p.z >= w.z0 && p.z <= w.z1 && p.y > w.y - 3) return w;
    }
    return null;
  }

  /** Starts the air attack: a short hang with the sword raised, then a dive straight down. */
  private startPlunge(): void {
    this.plungeStage = 1;
    this.plungeTimer = 0;
    this.swingId++;
    this.velocity.y = 0;
    this.flipTimer = -1;
    this.comboQueued = false;
  }

  private startDodge(move: THREE.Vector3): void {
    if (move.lengthSq() > 0.01) {
      // Roll the way the stick is held, and turn to face that way.
      this.dodgeKind = 'roll';
      this.dodgeDir.copy(move).normalize();
      this.dodgeDuration = TUNING.dodge.roll.duration;
      this.dodgeSpeed = TUNING.dodge.roll.speed;
      this.facing = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
    } else {
      // No input: a short step straight back, without turning.
      this.dodgeKind = 'back';
      this.dodgeDir.set(-Math.sin(this.facing), 0, -Math.cos(this.facing));
      this.dodgeDuration = TUNING.dodge.back.duration;
      this.dodgeSpeed = TUNING.dodge.back.speed;
    }
    this.dodgeTimer = 0;
    // The wait before the next one is counted from when this one ENDS (it used to be counted from its start, and was
    // no longer than a roll, so there was no wait at all: rolls ran one into the next).
    this.dodgeCooldown = this.dodgeDuration + TUNING.dodge.cooldown;
    this.jumpBuffer = 0;
    this.comboQueued = false;
  }

  /** The way down the slope he is standing on ([x, z], a unit long) and how steep it is; null on the flat or in the air. */
  private slopeUnder(): { dx: number; dz: number; steep: number } | null {
    const b = this.grounded ? this.groundBox : null;
    if (!b?.ramp) return null;
    // (Straight down it, whichever way it is tipped: one that is tipped two ways falls away between the two.)
    const [sx, sz] = slopeXZ(b);
    const steep = Math.hypot(sx, sz);
    if (steep <= 1e-9) return null;
    return { dx: -sx / steep, dz: -sz / steep, steep };
  }

  /**
   * Ground too steep to stand on (over MAX_WALK_SLOPE): he loses his footing on it and slides down it on his own
   * hide. (The owner, 2026-11-15: "there should be surfaces that are too steep for him to walk up so he will
   * automatically start sliding down them if he gets too far up like how Mario does".) Going UP it he has a moment's
   * purchase first (TUNING.slide.grip), scrabbling slowly, and so gets a little way up; any other way he is on it,
   * he is off his feet at once. A jump from such ground is only the little hop a slide allows: he slips first.
   */
  private slipIfTooSteep(dt: number, input: PlayerInput, helpless: boolean, swimming: boolean): void {
    if (this.riding || this.sliding || helpless || swimming || this.hang || this.climbT >= 0 || this.plungeStage !== 0) {
      this.slipTimer = 0;
      return;
    }
    const under = this.slopeUnder();
    if (!under || under.steep <= MAX_WALK_SLOPE + 1e-6) {
      this.slipTimer = 0;
      return;
    }
    const S = TUNING.slide;
    const uphill = -(this.velocity.x * under.dx + this.velocity.z * under.dz);
    this.slipTimer = uphill > 0.4 && this.jumpBuffer <= 0 && !input.jumpPressed ? this.slipTimer + dt : S.grip;
    if (this.slipTimer < S.grip) return;
    this.slipTimer = 0;
    this.sliding = true;
    this.slideAge = 0;
    // (Facing up the slope he goes down it backwards, on his belly; any other way, feet first on his seat.)
    this.slideBack = Math.sin(this.facing) * under.dx + Math.cos(this.facing) * under.dz < -0.2;
    this.slideHeading = Math.atan2(under.dx, under.dz);
    // What he had of speed down the slope he keeps; what he had up it, or across it, is gone.
    const down = Math.max(0, -uphill);
    this.velocity.x = under.dx * down;
    this.velocity.z = under.dz * down;
    this.attackTimer = -1;
    this.attackStep = 0;
    this.comboQueued = false;
    this.dodgeTimer = -1;
    this.guarding = false;
    this.stowTimer = -1;
    this.moveEvent = 'slip';
  }

  /**
   * A step of sliding on his hide. The slope pulls him, less than it pulls a shield, and he is slower at his fastest;
   * the stick only bends his way a little. On ground he can stand on he scrapes to a stop and is on his feet again.
   * Jump is a small hop that ends the slide (see `slideHop`), with no second jump after it: enough to get the shield
   * under him in the air (the air attack), not enough to climb anything by.
   */
  private slideStep(dt: number, input: PlayerInput): void {
    const S = TUNING.slide;
    this.slideAge += dt;
    this.guarding = false;
    let vx = this.velocity.x;
    let vz = this.velocity.z;
    const under = this.slopeUnder();
    if (under) {
      const pull = (S.gravity * under.steep) / Math.sqrt(1 + under.steep * under.steep);
      vx += under.dx * pull * dt;
      vz += under.dz * pull * dt;
    }
    let speed = Math.hypot(vx, vz);
    const reversed = vx * Math.sin(this.slideHeading) + vz * Math.cos(this.slideHeading) < 0;
    if (speed > 0.3 || (reversed && speed > 1e-6)) this.slideHeading = Math.atan2(vx, vz);
    if (this.grounded) {
      // (The stick across the way he is sliding bends it, slowly.)
      const across = input.move.x * Math.cos(this.slideHeading) - input.move.z * Math.sin(this.slideHeading);
      this.slideHeading += Math.max(-1, Math.min(1, across)) * S.turn * dt;
      speed = Math.max(0, speed - (under ? S.drag : S.dragFlat) * dt);
    }
    speed = Math.min(S.max, speed);
    this.velocity.x = Math.sin(this.slideHeading) * speed;
    this.velocity.z = Math.cos(this.slideHeading) * speed;
    this.facing = this.slideBack ? this.slideHeading + Math.PI : this.slideHeading;
    if (this.jumpBuffer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = S.hop;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      this.jumpCut = true;
      this.airJumpsLeft = 0;
      // (The slide is over: he is in the air on a jump, and lands on his feet, or slips again if what he lands on is
      // too steep to stand on.)
      this.sliding = false;
      this.slideHop = true;
      this.moveEvent = 'slideHop';
      return;
    }
    // Slow enough, on ground he can stand on: up he gets.
    if (this.grounded && this.slideAge > 0.25 && speed < S.stop && !(under && under.steep > MAX_WALK_SLOPE + 1e-6)) {
      this.sliding = false;
      this.moveEvent = 'slideEnd';
    }
  }

  /**
   * Whether what is under him, straight down, is a slope steep enough to ride (TUNING.ride.minSlope) and near enough
   * (TUNING.ride.surfDrop): what the air attack asks before it becomes the shield under his feet.
   */
  private slopeBelow(colliders: Aabb[]): boolean {
    const p = this.position;
    let top = -Infinity;
    let under: Aabb | null = null;
    for (const b of colliders) {
      if (p.x < b.min.x || p.x > b.max.x || p.z < b.min.z || p.z > b.max.z) continue;
      const t = topAt(b, p.x, p.z);
      if (t <= p.y + 0.05 && t > top) {
        top = t;
        under = b;
      }
    }
    // (In a skate park he gets on his shield over any ground at all.)
    if (this.skateAnywhere && under && p.y - top <= TUNING.ride.surfDrop) return true;
    return !!under?.ramp && p.y - top <= TUNING.ride.surfDrop && slopeOf(under) >= TUNING.ride.minSlope - 1e-6;
  }

  /** Development aid (the address's `&riding`): he starts on his shield where he stands, for pictures of the ride. */
  devRide(): void {
    this.beginRide();
  }

  /** Onto his shield, wherever he is: in the air (the air attack over a slope, or onto a rail) he comes down riding. */
  private beginRide(): void {
    this.riding = true;
    this.sliding = false;
    this.rideAge = 0;
    this.rideGroundAge = 0;
    this.rideFlip = -1;
    this.rideFlipDone = false;
    this.rideSpin = -1;
    this.rideGrab = 0;
    this.rideGrabbed = false;
    this.rideTricks = 0;
    this.rideSteer = 0;
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.rideHeading = speed > 0.5 ? Math.atan2(this.velocity.x, this.velocity.z) : this.facing;
    this.attackTimer = -1;
    this.attackStep = 0;
    this.comboQueued = false;
    this.dodgeTimer = -1;
    this.flipTimer = -1;
    this.longJump = false;
    this.guarding = false;
    this.stowTimer = -1;
    this.moveEvent = 'ride';
  }

  private endRide(event: MoveEvent): void {
    this.riding = false;
    this.rideFlip = -1;
    this.rideFlipDone = false;
    this.rideSpin = -1;
    this.rideGrab = 0;
    this.rideGrabbed = false;
    this.rideTricks = 0;
    this.rideSteer = 0;
    this.rideAgain = TUNING.ride.again;
    this.moveEvent = event;
  }

  /** Thrown off it: into a wall, or down on the ground with the shield still turning under him. No harm done but to his pride. */
  private bail(): void {
    const back = 2.5;
    this.endRide('bail');
    this.velocity.set(-Math.sin(this.rideHeading) * back, Math.max(this.velocity.y, 3.5), -Math.cos(this.rideHeading) * back);
    this.grounded = false;
    this.hurtTimer = Math.max(this.hurtTimer, TUNING.ride.bailTime);
  }

  /** Onto the nearest ledge or rail he is riding along, if one is in reach. */
  private startGrind(colliders: Aabb[]): boolean {
    const G = TUNING.grind;
    const p = this.position;
    // (A light rail first: it is what he is reaching for where there is one, and it reaches further.)
    const lit = findRail(this.rails, p.x, p.y, p.z, this.velocity.x, this.velocity.z, G);
    const found = lit ? { line: { axis: 'z' as const, c: 0, side: 0 as const, curve: lit.rail }, s: lit.s, h: lit.h, v: lit.v } : findGrind(p.x, p.y, p.z, this.velocity.x, this.velocity.z, colliders, G);
    if (!found) return false;
    if (!this.riding) this.beginRide();
    // Well above it, he is not put on it at a stroke: he comes down onto it, drawn in over it as he falls.
    const above = p.y - found.h;
    const drop = above > 0.3;
    let off = (found.line.axis === 'x' ? p.z : p.x) - found.line.c;
    if (found.line.curve) {
      // (To one side of a line that curves: across the way it is going there.)
      const q = railAt(found.line.curve, found.s);
      off = (p.x - q.x) * q.tz - (p.z - q.z) * q.tx;
    }
    this.grind = { line: found.line, s: found.s, h: found.h, v: found.v, slope: 0, off: drop ? off : 0, air: drop ? above : 0, fall: Math.max(G.dropSpeed, -this.velocity.y), top: Math.max(TUNING.ride.max, Math.min(TUNING.ride.tuckMax, Math.abs(found.v))) };
    this.placeOnGrind();
    // (A kickflip he was in the middle of is over: his shield is on the rail. He has his air jump again for after.)
    this.rideFlip = -1;
    this.rideFlipDone = false;
    this.rideSpin = -1;
    this.rideGrab = 0;
    this.rideGrabbed = false;
    this.rideTricks = 0;
    this.airJumpsLeft = TUNING.jump.airJumps;
    this.jumpBuffer = 0;
    this.rideSteer = 0;
    // (The knock of it meeting the edge is when it meets it.)
    if (!drop) this.moveEvent = 'grind';
    return true;
  }

  /** Puts him where his grind has him: on the line, at its height, going along it. */
  private placeOnGrind(): void {
    const g = this.grind;
    if (!g) return;
    const falling = g.air > 0;
    if (g.line.curve) {
      const q = railAt(g.line.curve, g.s);
      this.position.set(q.x + q.tz * g.off, g.h + g.air, q.z - q.tx * g.off);
      this.velocity.set(q.tx * g.v, falling ? -g.fall : 0, q.tz * g.v);
    } else if (g.line.axis === 'x') {
      this.position.set(g.s, g.h + g.air, g.line.c + g.off);
      this.velocity.set(g.v, falling ? -g.fall : 0, 0);
    } else {
      this.position.set(g.line.c + g.off, g.h + g.air, g.s);
      this.velocity.set(0, falling ? -g.fall : 0, g.v);
    }
    this.grounded = !falling;
    this.onRamp = false;
    this.groundBox = null;
    this.wasGrounded = !falling;
    this.coyoteTimer = falling ? 0 : TUNING.jump.coyoteTime;
    this.rideHeading = Math.atan2(this.velocity.x, this.velocity.z);
    this.facing = this.rideHeading;
  }

  /** Off the line, into the air, with what speed he had along it (and the rise or fall it was giving him). */
  private leaveGrind(up: number, side: number): void {
    const g = this.grind;
    if (!g) return;
    this.grind = null;
    this.grindAgain = TUNING.grind.again;
    const ax = g.line.axis === 'x';
    if (g.line.curve) {
      // (Off a line that curves: on the way it was going where he left it, and thrown across that.)
      const q = railAt(g.line.curve, g.s);
      this.velocity.set(q.tx * g.v + q.tz * side, up, q.tz * g.v - q.tx * side);
    } else this.velocity.set(ax ? g.v : side, up, ax ? side : g.v);
    this.grounded = false;
    this.wasGrounded = false;
    this.jumpCut = true; // (no button's letting go cuts this short)
  }

  /** A grind line's height `s` along it (see grindHeight). A light rail has no solid to ask: it is where it is, till it ends. */
  private lineHeight(line: GrindLine, s: number, was: number, moved: number, colliders: Aabb[]): number | 'end' | 'wall' {
    if (line.curve) return s < 0 || s > line.curve.len ? 'end' : railAt(line.curve, s).y;
    return grindHeight(line, s, was, moved, colliders, TUNING.grind.drop);
  }

  /**
   * A step of a grind. The line carries him: he does not steer. A rail that slopes pulls him down it as a slope
   * does; on the level he slows a little. Jump hops off it (the stick throws the hop to one side); the ROLL button
   * steps off; at its end he flies off with the speed he had. Something across it at speed throws him off.
   */
  private grindStep(dt: number, input: PlayerInput, colliders: Aabb[]): void {
    const g = this.grind;
    if (!g) return;
    const G = TUNING.grind;
    const R = TUNING.ride;
    this.rideAge += dt;
    this.guarding = false;
    this.rideSteer = 0;
    if (g.air > 0) {
      // Coming down onto it: faster and faster, drawn in over the line, going along it all the while.
      g.fall += G.dropPull * dt;
      g.air = Math.max(0, g.air - g.fall * dt);
      g.off *= Math.exp(-G.dropIn * dt);
      const along = g.v * dt;
      const there = this.lineHeight(g.line, g.s + along, g.h, along, colliders);
      if (there === 'end' || there === 'wall') {
        // (It stopped before he got to it: he is riding, in the air, and comes down where he will.)
        this.grind = null;
        this.grindAgain = G.again;
        return;
      }
      g.s += along;
      g.h = there;
      if (g.air <= 0) {
        g.off = 0;
        this.moveEvent = 'grind';
      }
      this.placeOnGrind();
      return;
    }
    if (input.jumpPressed) {
      // (Across the line: the stick's push to the side he will land on.)
      let push = (g.line.axis === 'x' ? input.move.z : input.move.x) * G.hopSide;
      if (g.line.curve) {
        const q = railAt(g.line.curve, g.s);
        push = (input.move.x * q.tz - input.move.z * q.tx) * G.hopSide;
      }
      this.leaveGrind(G.hop + Math.max(0, g.v * g.slope), push);
      this.jumpCut = false;
      this.coyoteTimer = 0;
      this.jumpBuffer = 0;
      this.moveEvent = 'ollie';
      return;
    }
    if (input.dodgePressed) {
      this.leaveGrind(0, 0);
      this.endRide('rideEnd');
      return;
    }
    let v = g.v - ((R.gravity * g.slope) / Math.sqrt(1 + g.slope * g.slope)) * dt;
    const slowed = Math.max(0, Math.abs(v) - G.drag * dt);
    v = Math.sign(v) * Math.min(g.top, slowed);
    if (Math.abs(v) < G.stop) {
      // Too slow to grind: he is set down where he is, and the ride goes on (or ends) from there.
      this.grind = null;
      this.grindAgain = G.again;
      this.moveEvent = 'grindEnd';
      return;
    }
    const moved = v * dt;
    const next = this.lineHeight(g.line, g.s + moved, g.h, moved, colliders);
    // (He is as wide as he is: what stands across the line stops him when his front reaches it, not his middle.)
    const reach = Math.sign(v) * TUNING.rat.radius;
    if (next === 'wall' || this.lineHeight(g.line, g.s + moved + reach, g.h, moved + reach, colliders) === 'wall') {
      this.grind = null;
      this.grindAgain = G.again;
      if (Math.abs(v) > R.bailSpeed) this.bail();
      else this.moveEvent = 'grindEnd';
      return;
    }
    if (next === 'end') {
      g.v = v;
      g.s += moved;
      this.placeOnGrind();
      this.leaveGrind(v * g.slope, 0);
      this.moveEvent = 'grindEnd';
      return;
    }
    g.slope = moved !== 0 ? (next - g.h) / moved : g.slope;
    g.v = v;
    g.s += moved;
    g.h = next;
    this.placeOnGrind();
  }

  /**
   * OFF THE LIP OF A PIPE (TUNING.ride.vertMin): what he had up the wall is all UPWARD now; what he had ALONG the pipe he
   * keeps; he is put just short of the lip, over the wall, and drifts back in over it. He comes down on the wall he left.
   */
  private vertLaunch(wall: Aabb): void {
    const R = TUNING.ride;
    const [sx, sz] = slopeXZ(wall);
    const steep = Math.hypot(sx, sz);
    if (!wall.ramp || steep < 1e-9) return;
    const dx = -sx / steep; // (downhill)
    const dz = -sz / steep;
    const up = -(this.velocity.x * dx + this.velocity.z * dz);
    const ax = wall.ramp.axis;
    const edge = wall.ramp.up > 0 ? (ax === 'x' ? wall.max.x : wall.max.z) : ax === 'x' ? wall.min.x : wall.min.z;
    // (No nearer the lip than a tenth, and never beyond it.)
    const inside = edge - wall.ramp.up * 0.1;
    if (ax === 'x') this.position.x = wall.ramp.up > 0 ? Math.min(this.position.x, inside) : Math.max(this.position.x, inside);
    else this.position.z = wall.ramp.up > 0 ? Math.min(this.position.z, inside) : Math.max(this.position.z, inside);
    this.position.y = Math.max(this.position.y, topAt(wall, this.position.x, this.position.z) + 0.02);
    this.velocity.x += dx * (up + R.vertDrift);
    this.velocity.z += dz * (up + R.vertDrift);
    this.velocity.y = Math.min(R.vertTop, up * steep + R.vertPop + (this.jumpBuffer > 0 ? R.ollie * 0.6 : 0));
    this.jumpBuffer = 0;
    this.grounded = false;
    this.wasGrounded = false;
    this.onRamp = false;
    this.groundBox = null;
    this.coyoteTimer = 0;
    this.jumpCut = true;
    this.rideFlip = -1;
    this.rideFlipDone = false;
    this.airJumpsLeft = TUNING.jump.airJumps;
    this.moveEvent = 'ollie';
  }

  /** How fast the slope he is riding on is carrying him up (or, going down it, down): nothing on the flat or in the air. */
  private rideClimb(): number {
    const under = this.riding ? this.slopeUnder() : null;
    return under ? -(this.velocity.x * under.dx + this.velocity.z * under.dz) * under.steep : 0;
  }

  /**
   * One step of riding the shield: the slope pulls him down it, the stick turns him (hard over is a carve, which
   * turns him faster and scrubs speed off; pulled back it brakes), the ground slows him, and jump is an ollie (and,
   * in the air, a kickflip). Sets his sideways speed; comes back with how fast that is.
   */
  private rideStep(dt: number, input: PlayerInput): number {
    const R = TUNING.ride;
    this.rideAge += dt;
    this.guarding = false;
    let vx = this.velocity.x;
    let vz = this.velocity.z;
    const under = this.slopeUnder();
    if (under) {
      // (Down the slope, by as much of gravity as the slope turns that way.)
      const pull = (R.gravity * under.steep) / Math.sqrt(1 + under.steep * under.steep);
      vx += under.dx * pull * dt;
      vz += under.dz * pull * dt;
    }
    let speed = Math.hypot(vx, vz);
    // He goes the way he is moving. (And when a slope has stopped him and started him back down, that is the other
    // way: without this he hung at the top of his climb for ever, his speed pointed up the wall each step and the
    // slope taking it off again.)
    const reversed = vx * Math.sin(this.rideHeading) + vz * Math.cos(this.rideHeading) < 0;
    if (speed > 0.3 || (reversed && speed > 1e-6)) this.rideHeading = Math.atan2(vx, vz);
    // The stick, against the way he is going: across it steers, back along it brakes.
    const hx = Math.sin(this.rideHeading);
    const hz = Math.cos(this.rideHeading);
    const side = Math.max(-1, Math.min(1, input.move.x * hz - input.move.z * hx));
    const fwd = input.move.x * hx + input.move.z * hz;
    const hard = Math.abs(side) > 0.85;
    this.rideHeading += side * R.turn * (hard ? R.carve : 1) * (this.grounded ? 1 : R.airTurn) * dt;
    this.rideSteer += (side * (hard ? 1 : 0.6) - this.rideSteer) * Math.min(1, dt * 10);
    // THE TUCK: the stick pushed the way he is going (and not hard over in a carve). He crouches.
    const tuck = this.feel.ride.tuck && fwd > 0.5 && !hard;
    this.rideTuck += ((tuck ? 1 : 0) - this.rideTuck) * Math.min(1, dt * 8);
    let slow = 0;
    if (this.grounded) {
      slow = under ? R.dragSlope : R.dragFlat;
      if (hard) slow += R.carveDrag;
      // (Not on a wall too steep to stand on: there the stick held toward the wall he has just come down is no brake.
      // One who holds the stick at the far wall of a pipe has it against him the moment the wall turns him round.)
      else if (fwd < -0.5 && !(under && under.steep > MAX_WALK_SLOPE)) slow += R.brake * -fwd;
    }
    // Past his standing top speed: only a tuck on a slope gains any more, and gains it more slowly (he builds speed
    // as he goes down); standing up, what he has over it goes, a little at a time. In the air he keeps what he has.
    const was = Math.hypot(this.velocity.x, this.velocity.z);
    const floor = Math.max(R.max, Math.min(was, R.tuckMax));
    // (Below his standing top speed a tuck PUSHES him along, on any ground: on the flat he skates.)
    if (tuck && this.grounded && speed < R.max) speed = Math.min(R.max, speed + R.tuckPush * dt);
    if (speed > floor) speed = floor + (tuck && this.grounded ? (speed - floor) * R.tuckGain : 0);
    if (this.grounded && !tuck && speed > R.max) speed = Math.max(R.max, speed - R.tuckShed * dt);
    speed = Math.max(0, Math.min(R.tuckMax, speed - slow * dt));
    this.velocity.x = Math.sin(this.rideHeading) * speed;
    this.velocity.z = Math.cos(this.rideHeading) * speed;
    this.facing = this.rideHeading;

    // THE LIP OF A PIPE: off the high end of a wall marked for it, going up it fast enough, he goes STRAIGHT UP.
    // (Here, as he comes to its very edge; and in `update`, if the wall lets go of him a moment before that.)
    const wall = this.grounded ? this.groundBox : null;
    if (under && wall?.vert && wall.ramp) {
      const up = -(this.velocity.x * under.dx + this.velocity.z * under.dz); // how fast he is going up it, across the ground
      const ax = wall.ramp.axis;
      const edge = wall.ramp.up > 0 ? (ax === 'x' ? wall.max.x : wall.max.z) : ax === 'x' ? wall.min.x : wall.min.z;
      const toEdge = Math.abs(edge - (ax === 'x' ? this.position.x : this.position.z));
      if (up > R.vertMin && up * dt >= toEdge - 0.04) {
        this.vertLaunch(wall);
        return Math.hypot(this.velocity.x, this.velocity.z);
      }
    }

    // The jump is an ollie; a second, in the air, is a kickflip: the shield spins round under his feet.
    if (this.jumpBuffer > 0) {
      if (this.coyoteTimer > 0) {
        // (Popped going up a ramp, he has the ramp's own lift as well: the lip of a kicker is the place to jump.)
        this.velocity.y = R.ollie + Math.max(0, this.rideClimb());
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBuffer = 0;
        this.jumpCut = false;
        this.rideFlip = -1;
        this.rideFlipDone = false;
        this.moveEvent = 'ollie';
      } else if (!this.grounded && this.airJumpsLeft > 0 && this.rideFlip < 0) {
        this.velocity.y = Math.max(this.velocity.y, R.flipLift);
        this.airJumpsLeft--;
        this.rideFlip = 0;
        this.rideFlipDone = false;
        this.jumpBuffer = 0;
        this.jumpCut = true;
        this.moveEvent = 'kickflip';
      }
    }
    if (this.rideFlip >= 0) {
      this.rideFlip += dt / R.flipTime;
      if (this.rideFlip >= 1) {
        this.rideFlip = -1;
        this.rideFlipDone = true;
      }
    }
    // A SPIN: the ROLL button in the air. He and his shield go right round. One after another, as many as the air has
    // room for. (That press is not kept for the ground: on the ground the roll button steps him off.)
    if (this.feel.ride.airTricks && !this.grounded && input.dodgePressed && this.rideSpin < 0 && this.rideAge > 0.15) {
      this.rideSpin = 0;
      this.dodgeBuffer = 0;
      this.moveEvent = 'kickflip';
    }
    if (this.rideSpin >= 0) {
      this.rideSpin += dt / R.spinTime;
      if (this.rideSpin >= 1) {
        this.rideSpin = -1;
        this.rideTricks++;
      }
    }
    // A GRAB: GUARD held in the air. Held long enough it counts, once an air.
    const grabbing = this.feel.ride.airTricks && !this.grounded && input.guardHeld;
    this.rideGrab = grabbing ? this.rideGrab + dt : 0;
    if (this.grounded) this.rideGrabbed = false;
    if (grabbing && !this.rideGrabbed && this.rideGrab >= R.grabTime) {
      this.rideGrabbed = true;
      this.rideTricks++;
    }
    this.rideGrabPose += ((grabbing ? 1 : 0) - this.rideGrabPose) * Math.min(1, dt * 12);
    // Too slow to ride, on ground that will not start him again: he steps off. A slope will start him again, so on
    // one he stays on unless he is braking (and on one too steep to stand on, whatever he does): the top of his
    // climb up the wall of a pipe is the slowest he ever is, and he was stepped off there every time.
    const steepness = under ? under.steep : 0;
    // (Nor while he is PUSHING: from a standstill a push takes a moment to get him going, and he was stepped off his
    // shield before it had. Found in a skate park: on it from standing, the stick forward, and off it again.)
    if (this.grounded && speed < R.stop && !tuck && this.rideGroundAge > 0.4 && steepness <= MAX_WALK_SLOPE + 1e-6 && (steepness < R.restSlope || fwd < -0.5)) this.endRide('rideEnd');
    return speed;
  }

  private moveAxis(axis: 'x' | 'z', delta: number, colliders: Aabb[]): void {
    if (delta === 0) return;
    const p = this.position;
    const r = TUNING.rat.radius;
    p[axis] += delta;
    const feet = p.y;
    const head = p.y + TUNING.rat.height;
    for (const b of colliders) {
      // Ledges low enough to step onto are not walls.
      if (b.max.y <= feet + TUNING.physics.stepHeight + EPS) continue;
      // Boxes entirely above our head are ignored.
      if (b.min.y >= head - EPS) continue;
      // (ACROSS the way he is going, touching is not overlapping. Pressed against the south face of a thing he is
      // exactly his own half-width from it, and that sum comes out a hair inside it as often as not: then the least
      // sideways push "met" the thing he was only standing beside, and he was put out at its far END, the length of
      // it away in one step. The owner's "weird bug", 2026-11-16: thrown from one corner of the Club's hearth to
      // the other.)
      const ex = axis === 'z' ? EPS : 0;
      const ez = axis === 'x' ? EPS : 0;
      if (p.x + r <= b.min.x + ex || p.x - r >= b.max.x - ex) continue;
      if (p.z + r <= b.min.z + ez || p.z - r >= b.max.z - ez) continue;
      // A ramp is a wall only where it stands higher than a step above his feet: at its high end and along its
      // sides. Where its slope is under him, or is the air over its low end, it is not. What he has to step onto is
      // its slope under his middle, where he will be standing: on any ramp he can take a step up, that is never more
      // than a step above where he stood the moment before. (That is so of one too steep to STAND on as well: he
      // gets onto it, and a little way up it, before he slips.)
      // One who was over a ramp already, before this step of his, has not walked into it by this step: it is under
      // him (or under his edge), and where its slope puts him is the business of the step up and down. A ramp is a
      // wall only to one who comes to it from outside it: at its sides and its high end. (Riding fast up the steep
      // wall of a pipe, the next facet up was already under his edge, a little higher than a step: with the least
      // drift ALONG the pipe it was taken for a wall across that drift, and he was put out at the end of the pipe,
      // eleven units away.)
      if (b.ramp && feet >= b.min.y - EPS) {
        const was = p[axis] - delta;
        // (Truly over it: one stopped at its side stands exactly a body's half-width off, and is not.)
        const in0 = (axis === 'x' ? b.min.x : b.min.z) + 1e-4;
        const in1 = (axis === 'x' ? b.max.x : b.max.z) - 1e-4;
        if (was + r > in0 && was - r < in1) continue;
      }
      const high = !b.ramp ? b.max.y : topAt(b, p.x, p.z);
      // (Going up a ramp fast, its slope rises under him by more than a step in one step of his: that is the ramp
      // he is on, not a wall. A rider at speed up the wall of a pipe met it as a wall, and was thrown off.)
      // (And coming to the foot of one up another ramp, as from one facet of a curve to the next: the ground he is
      // on rises to meet it under him, by his own half-width of its slope, before his middle is there.)
      const mine = b.ramp ? slopeXZ(b)[axis === 'x' ? 0 : 1] : 0; // how it climbs the way he is going
      // (And a BOX that stands at the head of the ramp he is on, no higher than the ramp comes up to at its face: the deck
      // at the top of a curved wall. The edge of his body reaches the deck's side while his feet are still down the
      // slope, and that was more than a step: the deck was a wall to him, and a fast rider came off at the lip every
      // time. But the ground he is on rises to the deck before his middle is there. So: as high as his ramp is AT THE
      // BOX'S FACE counts as under his feet already. The owner, 2026-11-17: "the tops of the half pipes should be more
      // flush". They can be, now.)
      // (The ramp's height is read no further along than the ramp itself goes, and only for a box that stands AT its end:
      // read beyond its end its slope runs on up for ever, and every wall in the level was "under his feet".)
      let rampHead = 0;
      // (And only for a RIDER going fast enough that the deck would have thrown him off: one who comes up to the lip
      // slowly is stopped by it and comes back down the wall, as he always was. That is the half pipe's to and fro.)
      if (!b.ramp && this.onRamp && this.groundBox && this.riding && Math.hypot(this.velocity.x, this.velocity.z) > TUNING.ride.bailSpeed) {
        const g = this.groundBox;
        const face = axis === 'x' ? (delta > 0 ? b.min.x : b.max.x) : delta > 0 ? b.min.z : b.max.z;
        const lo = axis === 'x' ? g.min.x : g.min.z;
        const hi = axis === 'x' ? g.max.x : g.max.z;
        if (face >= lo - 0.05 && face <= hi + 0.05) {
          const at = Math.max(lo, Math.min(hi, face));
          rampHead = Math.max(0, topAt(g, axis === 'x' ? at : p.x, axis === 'z' ? at : p.z) - feet);
        }
      }
      const rise = Math.abs(delta * mine) + (b.ramp && this.onRamp && this.groundBox ? slopeOf(this.groundBox) * r : 0) + rampHead;
      if (high <= feet + TUNING.physics.stepHeight + rise + EPS) continue;
      // One so steep that a single step up it is more than he can take, met going up it: he is given his step
      // back, no more. It does not put him at its foot, which may be a long way behind one who jumped at it.
      if (b.ramp && slopeOf(b) > MAX_WALK_SLOPE + 1e-6 && delta * mine > 0) {
        if (axis === 'x') {
          p.x -= delta;
          this.velocity.x = 0;
        } else {
          p.z -= delta;
          this.velocity.z = 0;
        }
        continue;
      }
      // Touching a tall wall in the air: remember it for a wall kick or a ledge grab.
      if (!this.grounded && high > p.y + 0.6) {
        this.wallTimer = TUNING.moves.wallKickWindow;
        this.wallNX = axis === 'x' ? (delta > 0 ? -1 : 1) : 0;
        this.wallNZ = axis === 'z' ? (delta > 0 ? -1 : 1) : 0;
        this.wallBox = b;
        if (this.longJump) this.longJump = false;
      }
      // Overlap on this axis: push back out, to the face he came in at. (If that face is further back than he came
      // this step, he did not come in at it: he was in the thing already, by whatever put him there. Then he is put
      // out at whichever of its two faces is nearer, and never thrown the length of it.)
      const lo = (axis === 'x' ? b.min.x : b.min.z) - r;
      const hi = (axis === 'x' ? b.max.x : b.max.z) + r;
      let out = delta > 0 ? lo : hi;
      if (Math.abs(p[axis] - out) > Math.abs(delta) + 1e-3) {
        const was = p[axis] - delta;
        out = Math.abs(was - lo) <= Math.abs(was - hi) ? lo : hi;
      }
      p[axis] = out;
      if (axis === 'x') this.velocity.x = 0;
      else this.velocity.z = 0;
    }
  }

  private moveVertical(dt: number, colliders: Aabb[]): void {
    const p = this.position;
    const r = TUNING.rat.radius;
    const prevY = p.y;
    p.y += this.velocity.y * dt;

    if (this.velocity.y > 0) {
      // Rising: bump the head on any ceiling we pass through.
      for (const b of colliders) {
        if (!this.overlapsXZ(b, r)) continue;
        if (prevY + TUNING.rat.height <= b.min.y + EPS && p.y + TUNING.rat.height > b.min.y) {
          p.y = b.min.y - TUNING.rat.height;
          this.velocity.y = 0;
        }
      }
      this.grounded = false;
      return;
    }

    // Falling or standing: find the highest support we have reached this step.
    // On a ramp the floor falls away under him as he walks down it, by more in a step than gravity takes him: so one
    // who was standing (on a ramp, or stepping onto one) is kept on the slope under his feet, if it is no further
    // down than a ramp can fall away in a step. (Without this he left the ground at every step downhill.)
    const wasOn = this.grounded && this.velocity.y <= 0;
    let support: number | null = null;
    let under: Aabb | null = null;
    for (const b of colliders) {
      if (!this.overlapsXZ(b, r)) continue;
      // (A ramp's top is its slope under his middle; beside it, its nearest edge. But not its LOW edge: one whose
      // middle has not reached the foot of a ramp is not on it yet. Where one facet of a curve met the next, the
      // steeper one's foot held him up before he got to it: a shelf a body's half-width deep at every join.)
      if (b.ramp) {
        // (He is beyond a LOW edge of it if, from where he is, its top climbs as it goes in under him. That is so
        // of either of its slopes, for one tipped two ways.)
        const [sx, sz] = slopeXZ(b);
        const inX = p.x < b.min.x ? 1 : p.x > b.max.x ? -1 : 0;
        const inZ = p.z < b.min.z ? 1 : p.z > b.max.z ? -1 : 0;
        if (inX * sx > 1e-9 || inZ * sz > 1e-9) continue;
      }
      const top = b.ramp ? topAt(b, p.x, p.z) : b.max.y;
      // Support must be reachable: at most a step above where we started, and at or below our feet now.
      // (Riding fast down a steep one it falls away further in a step than at a run.)
      // (And where a flat gives way to a steep one, its slope is already his own half-width down by the time his
      // middle is over it: one who runs off a landing onto a chute is put on the chute, he does not sail over it.)
      const hold = b.ramp ? Math.max(RAMP_HOLD, (Math.hypot(this.velocity.x, this.velocity.z) * dt + r) * slopeOf(b) + (this.riding ? 0.15 : 0.05)) : RAMP_HOLD;
      const held = wasOn && (b.ramp || this.onRamp) && top >= prevY - hold;
      // (The same going up one fast: it has risen under him by as much as he has gone along it.)
      const rise = b.ramp ? Math.hypot(this.velocity.x, this.velocity.z) * dt * slopeOf(b) : 0;
      if (top <= prevY + TUNING.physics.stepHeight + rise + EPS && (p.y <= top + EPS || held)) {
        if (support === null || top > support) {
          support = top;
          under = b;
        } else if (under && Math.abs(top - support) < 1e-6) {
          // (Two things with their tops level, one laid on the other: a sheet of ice on a floor, in a level from the
          // builder. He is on the ice if his MIDDLE is over it, and off it if it is not. Before, it was whichever came
          // first, and ice laid on a floor was not ice.)
          const over = (q: Aabb): boolean => p.x >= q.min.x && p.x <= q.max.x && p.z >= q.min.z && p.z <= q.max.z;
          // (Only where ICE is one of the two: anything else is left as it was, the first found.)
          if (!b.ramp && !under.ramp && b.slick !== under.slick && over(b) && (b.slick || !over(under))) under = b;
        }
      }
    }

    if (support !== null) {
      p.y = support;
      this.velocity.y = 0;
      this.grounded = true;
      this.onRamp = !!under?.ramp;
      this.groundBox = under;
    } else {
      this.grounded = false;
      this.onRamp = false;
      this.groundBox = null;
    }
  }

  private overlapsXZ(b: Aabb, r: number): boolean {
    const p = this.position;
    return p.x + r > b.min.x && p.x - r < b.max.x && p.z + r > b.min.z && p.z - r < b.max.z;
  }

  private updateState(planarSpeed: number, running: boolean): void {
    if (this.deadTimer >= 0) {
      this.state = 'dead';
    } else if (this.hurtTimer > 0) {
      this.state = 'hurt';
    } else if (this.hang) {
      this.state = 'hang';
    } else if (this.climbT >= 0) {
      this.state = 'climb';
    } else if (this.swimming) {
      this.state = 'swim';
    } else if (this.riding) {
      this.state = 'ride';
    } else if (this.sliding) {
      this.state = 'slide';
    } else if (this.plungeStage !== 0) {
      this.state = 'plunge';
    } else if (this.attackTimer >= 0) {
      this.state = 'attack';
    } else if (this.dodgeTimer >= 0) {
      this.state = 'dodge';
    } else if (this.guarding) {
      this.state = 'guard';
    } else if (!this.grounded && this.longJump) {
      this.state = 'longjump';
    } else if (!this.grounded) {
      this.state = this.velocity.y > 0 ? 'jump' : 'fall';
    } else if (this.landTimer > 0) {
      this.state = 'land';
    } else if (planarSpeed < 0.3) {
      this.state = 'idle';
    } else {
      this.state = running ? 'run' : 'walk';
    }
  }
}
