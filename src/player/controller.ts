import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { Aabb } from '../world/collision';
import type { WaterVolume } from '../world/layout';
import { NO_GEAR, type GearMods } from '../data/equipment';
import { ATTACK_CLIPS } from './animations';

export type PlayerState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'attack' | 'dodge' | 'guard' | 'plunge' | 'swim' | 'hurt' | 'dead' | 'longjump' | 'hang' | 'climb';
/** A move that just happened this step, for sounds and rumble. */
export type MoveEvent = 'longjump' | 'wallkick' | 'grab' | 'climb' | null;
/** 'parried' is a block made just as the shield came up: no shove, and the attacker reels. */
export type HitResult = 'dodged' | 'blocked' | 'parried' | 'hit' | 'killed';
/** 0 not plunging, 1 hanging with the sword raised, 2 diving, 3 stuck in the ground after landing. */
export type PlungeStage = 0 | 1 | 2 | 3;
export type DodgeKind = 'roll' | 'back';

const EPS = 1e-4;
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
  update(dt: number, rawInput: PlayerInput, colliders: Aabb[]): void {
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
    if (input.stowPressed && this.stowTimer < 0 && this.grounded && this.attackTimer < 0 && this.dodgeTimer < 0) {
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
    this.guarding = canFight && this.plungeStage === 0 && input.guardHeld && this.grounded && this.attackTimer < 0 && this.dodgeTimer < 0;
    this.guardAge = this.guarding ? this.guardAge + dt : 0;

    // A press made a moment too early (mid-roll, or while still shoved back from a block) is remembered and used as soon as it can be.
    this.attackBuffer = input.attackPressed ? T.buffer.attack : Math.max(0, this.attackBuffer - dt);
    this.dodgeBuffer = input.dodgePressed ? T.buffer.dodge : Math.max(0, this.dodgeBuffer - dt);
    const wantAttack = input.attackPressed || this.attackBuffer > 0;
    const wantDodge = input.dodgePressed || this.dodgeBuffer > 0;

    // Sword: a press starts the combo, or queues the next hit while a swing is already playing.
    if (canFight && wantAttack && this.dodgeTimer < 0 && !input.guardHeld && this.blockStun <= 0) {
      this.attackBuffer = 0;
      if (this.plungeStage !== 0) {
        // Already plunging: nothing more to do until he lands.
      } else if (!this.grounded && this.attackTimer < 0) {
        this.startPlunge();
      } else if (this.attackTimer < 0) {
        this.startSwing(0, move);
      } else {
        this.comboQueued = true;
      }
    }

    // Dodge: from the ground. It can cancel the recovery of a swing, but not the swing itself.
    if (
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
    if (dodging) {
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
    } else if (this.kickLock > 0) {
      // Just kicked off a wall: momentum carries him out before the stick takes over again.
    } else if (this.kickFlight > 0 && !this.grounded && !swimming && this.kickCarry(move, dt)) {
      // Carried across by the kick (see kickCarry).
    } else {
      const mul = this.guarding ? Math.min(1, T.guard.moveMultiplier * this.gear.guardMove) : 1;
      const target = swimming ? (input.run ? T.swim.fast : T.swim.speed) * this.gear.swim : (input.run ? T.move.run * this.gear.run : T.move.walk) * mul;
      const hasInput = move.lengthSq() > 0.01;
      const accel = swimming ? T.swim.accel : this.grounded ? (hasInput ? T.move.groundAccel : T.move.groundDecel * this.gear.grip) : T.move.airAccel;
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
    if (!dodging && !helpless && this.plungeStage === 0 && this.jumpBuffer > 0) {
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
    this.moveAxis('x', (this.velocity.x + (flow ? flow[0] : 0)) * dt, colliders);
    this.moveAxis('z', (this.velocity.z + (flow ? flow[1] : 0)) * dt, colliders);

    // Vertical motion, including landing and head bumps.
    this.moveVertical(dt, colliders);
    if (this.plungeStage === 2 && this.grounded) {
      this.plungeStage = 3;
      this.plungeTimer = 0;
      this.plungeImpact = true;
    }

    if (this.grounded || swimming) this.longJump = false;
    // Ledge grab: falling past the top of a wall he is facing, with room on top, he catches it.
    const wb = this.wallBox;
    if (wb && this.allowGrab && !this.grounded && !swimming && !helpless && this.velocity.y < 0 && this.hangDrop <= 0 && this.plungeStage === 0 && this.attackTimer < 0 && this.wallTimer > 0) {
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
    this.wasGrounded = this.grounded;
    this.landTimer = justLanded ? T.landTime : Math.max(0, this.landTimer - dt);

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
    this.dodgeCooldown = TUNING.dodge.cooldown;
    this.jumpBuffer = 0;
    this.comboQueued = false;
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
      if (p.x + r <= b.min.x || p.x - r >= b.max.x) continue;
      if (p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
      // Touching a tall wall in the air: remember it for a wall kick or a ledge grab.
      if (!this.grounded && b.max.y > p.y + 0.6) {
        this.wallTimer = TUNING.moves.wallKickWindow;
        this.wallNX = axis === 'x' ? (delta > 0 ? -1 : 1) : 0;
        this.wallNZ = axis === 'z' ? (delta > 0 ? -1 : 1) : 0;
        this.wallBox = b;
        if (this.longJump) this.longJump = false;
      }
      // Overlap on this axis: push back out.
      if (axis === 'x') {
        p.x = delta > 0 ? b.min.x - r : b.max.x + r;
        this.velocity.x = 0;
      } else {
        p.z = delta > 0 ? b.min.z - r : b.max.z + r;
        this.velocity.z = 0;
      }
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
    let support: number | null = null;
    for (const b of colliders) {
      if (!this.overlapsXZ(b, r)) continue;
      const top = b.max.y;
      // Support must be reachable: at most a step above where we started, and at or below our feet now.
      if (top <= prevY + TUNING.physics.stepHeight + EPS && p.y <= top + EPS) {
        if (support === null || top > support) support = top;
      }
    }

    if (support !== null) {
      p.y = support;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
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
