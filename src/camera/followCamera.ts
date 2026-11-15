import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { Aabb } from '../world/collision';

function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/** A box is taken this much bigger all round when the view looks for a way over it, so it clears it and does not skim it. */
const CLEAR = 0.06;
/**
 * What it has to be able to see of him, for a line to count as clear: not just the point it looks at (his chest) but
 * his waist, this far below it, and this far to each side of it. (Or a barrel that hid him to the neck counted as out
 * of the way, and so did a brazier just beside the line, its bowl wider than its stand.)
 */
const SEE_DOWN = 0.25;
const SEE_SIDE = 0.22;
/** How finely it looks for the lowest line that clears (radians of pitch). */
const LIFT_STEP = 0.07;
/** Pulled in to less than this much of its distance it starts to go up over his head; at the second, it is all the way up. */
const SQUEEZE_FROM = 0.55;
const SQUEEZE_FULL = 0.2;
/** Up there it looks ahead of him by as much as puts him this far below the middle of the picture (radians): what is in front of him is in it. */
const SQUEEZE_DROP = 0.32;
/** Up over his head it keeps this far on his side of whatever is behind him, and no nearer the middle of him than the second. */
const SQUEEZE_OFF = 0.12;
const SQUEEZE_NEAR = 0.08;
/** Looking steeply down over something low, it looks a little ahead of him too: this far, at the steepest. */
const LIFT_AHEAD = 0.9;

/**
 * How far along the way from `a` to `b` the first solid thing is met: 0 at `a`, 1 at `b` or if nothing is in the way.
 * Each box is taken `grow` bigger all round. `met`, if given, is told which box that was (null: none).
 */
export function sight(a: THREE.Vector3, b: THREE.Vector3, colliders: Aabb[], grow = 0, met?: { box: Aabb | null }): number {
  let first = 1;
  if (met) met.box = null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  for (const box of colliders) {
    let tmin = 0;
    let tmax = first;
    let miss = false;
    for (let axis = 0; axis < 3 && !miss; axis++) {
      const o = axis === 0 ? a.x : axis === 1 ? a.y : a.z;
      const d = axis === 0 ? dx : axis === 1 ? dy : dz;
      const lo = (axis === 0 ? box.min.x : axis === 1 ? box.min.y : box.min.z) - grow;
      const hi = (axis === 0 ? box.max.x : axis === 1 ? box.max.y : box.max.z) + grow;
      if (Math.abs(d) < 1e-9) {
        miss = o < lo || o > hi;
        continue;
      }
      let t1 = (lo - o) / d;
      let t2 = (hi - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      miss = tmin > tmax;
    }
    if (!miss) {
      first = tmin;
      if (met) met.box = box;
    }
  }
  return first;
}

/**
 * Third-person camera. It sits behind and slightly above the rat, eases behind him when he moves,
 * and is pulled in when a wall would block its line of sight.
 *
 * Something LOW in the way (a brazier, a crate, a barrel, a step) does not pull it in: it rises until it can see him
 * over the thing, from as far off as ever, and comes down again when the thing is no longer in the way. (Pulled in by
 * a crate he was backed against, it used to end up inside his head.) It never turns to do this: only its height
 * changes, so the stick still means what it meant. A wall, or anything too tall to see over from where it is, pulls
 * it in as before; but pulled in close it goes up over his head and looks ahead of him (see `squeezed` below), where
 * it used to sit in the back of his head.
 */
export class FollowCamera {
  /** Angle of the camera around the rat, measured from +Z. Movement is relative to this. */
  yaw = Math.PI;
  pitch = 0.3;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly pos = new THREE.Vector3();
  /** The middle of him (his chest), and the point the view is built round: that, leaned the way he is running. */
  private readonly chest = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly free = new THREE.Vector3();
  private smoothY = 0;
  /** The view leans a little the way he is running, so there is more to see ahead. */
  private ahead = { x: 0, z: 0 };
  /** How much of the way out to the free spot the camera is allowed (1 = all of it); eased so walls never snap it. */
  private pull = 1;
  /** How much steeper than he asked it is looking, to see over something low (radians); eased. */
  lift = 0;
  /** How far up over his head it has gone because it is squeezed against him; eased. */
  rise = 0;
  /** How far it has changed over to the view from over his head (0: not at all, 1: wholly); eased. */
  private over = 0;
  /** Up over his head, how far out from the middle of him it keeps (flat); eased. */
  private tuck = 0;
  private readonly lifted = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly sideA = new THREE.Vector3();
  private readonly sideB = new THREE.Vector3();
  private initialized = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  private readonly met: { box: Aabb | null } = { box: null };
  /**
   * Is something in the way of its seeing him (his chest, his waist, either side of him) from where it has eased to,
   * and is all of what is in the way low: nothing of it higher than `top`?
   */
  private lowThingInTheWay(colliders: Aabb[], top: number, ux: number, uz: number): boolean {
    const a = this.sideA;
    const b = this.sideB;
    let blocked = false;
    for (let ray = 0; ray < 4; ray++) {
      const side = ray === 2 ? -1 : ray === 3 ? 1 : 0;
      a.set(this.target.x + uz * SEE_SIDE * side, this.target.y - (ray === 1 ? SEE_DOWN : 0), this.target.z - ux * SEE_SIDE * side);
      b.set(this.free.x + uz * SEE_SIDE * side, this.free.y, this.free.z - ux * SEE_SIDE * side);
      if (sight(a, b, colliders, CLEAR, this.met) >= 1 || !this.met.box) continue;
      if (this.met.box.max.y > top) return false;
      blocked = true;
    }
    return blocked;
  }

  /** Jumps the camera straight to where it wants to be, for when he is moved somewhere else. */
  snap(): void {
    this.initialized = false;
  }

  /**
   * @param turn manual yaw input: -1, 0 or 1
   * @param pitchInput manual pitch input: -1, 0 or 1
   */
  update(
    dt: number,
    focus: THREE.Vector3,
    facing: number,
    moving: boolean,
    turn: number,
    pitchInput: number,
    colliders: Aabb[],
    velocity?: { x: number; z: number },
  ): void {
    const C = TUNING.camera;
    const fresh = !this.initialized;
    const ease = (rate: number): number => (fresh ? 1 : 1 - Math.exp(-rate * dt));

    if (turn !== 0) {
      this.yaw += turn * dt * C.turnSpeed;
    } else if (moving) {
      // Ease behind the rat's facing direction while he moves.
      this.yaw = lerpAngle(this.yaw, facing + Math.PI, 1 - Math.exp(-C.autoFollowRate * dt));
    }
    this.pitch = Math.min(C.maxPitch, Math.max(C.minPitch, this.pitch + pitchInput * dt * C.pitchSpeed));

    // The view follows him sideways closely but rides up and down gently, so hops and landings do not jolt it.
    if (fresh) this.smoothY = focus.y;
    this.smoothY += (focus.y - this.smoothY) * (1 - Math.exp(-C.heightRate * dt));
    this.smoothY = Math.min(focus.y + C.heightSlack, Math.max(focus.y - C.heightSlack, this.smoothY));
    const wantX = Math.max(-C.lookAheadMax, Math.min(C.lookAheadMax, (velocity?.x ?? 0) * C.lookAhead));
    const wantZ = Math.max(-C.lookAheadMax, Math.min(C.lookAheadMax, (velocity?.z ?? 0) * C.lookAhead));
    const k = this.initialized ? 1 - Math.exp(-C.lookAheadRate * dt) : 1;
    this.ahead.x += (wantX - this.ahead.x) * k;
    this.ahead.z += (wantZ - this.ahead.z) * k;
    this.chest.set(focus.x, this.smoothY + C.targetHeight, focus.z);
    this.target.set(this.chest.x + this.ahead.x, this.chest.y, this.chest.z + this.ahead.z);
    // The lean stops short of anything solid. (Running into a wall, the point it looked at went on into the wall for
    // a quarter of a second, and with nothing to be seen from in there the view shot in to the back of his head.)
    if (C.liftMaxPitch > 0 || C.squeezeRise > 0) {
      const open = sight(this.chest, this.target, colliders, 0.12);
      if (open < 1) {
        const keep = Math.max(0, open - 0.02);
        this.ahead.x *= keep;
        this.ahead.z *= keep;
        this.target.set(this.chest.x + this.ahead.x, this.chest.y, this.chest.z + this.ahead.z);
      }
    }
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * cp * C.distance,
      this.target.y + Math.sin(this.pitch) * C.distance,
      this.target.z + Math.cos(this.yaw) * cp * C.distance,
    );

    if (fresh) {
      this.free.copy(this.desired);
      this.pull = 1;
      this.initialized = true;
    } else {
      this.free.lerp(this.desired, 1 - Math.exp(-C.followRate * dt));
    }

    // Which way round him it is (flat), how far off, and how steeply it looks: from where it has eased to.
    const vx = this.free.x - this.target.x;
    const vy = this.free.y - this.target.y;
    const vz = this.free.z - this.target.z;
    const flat = Math.max(1e-6, Math.hypot(vx, vz));
    const ux = vx / flat;
    const uz = vz / flat;
    const len = Math.hypot(flat, vy);
    const base = Math.atan2(vy, flat);
    const at = (pitch: number): THREE.Vector3 => this.lifted.set(this.target.x + ux * Math.cos(pitch) * len, this.target.y + Math.sin(pitch) * len, this.target.z + uz * Math.cos(pitch) * len);
    /** From there, can it see him: his chest, his waist, and a little to each side of him? */
    const sees = (from: THREE.Vector3): boolean => {
      if (sight(this.target, from, colliders, CLEAR) < 1) return false;
      const a = this.sideA;
      const b = this.sideB;
      if (sight(a.set(this.target.x, this.target.y - SEE_DOWN, this.target.z), from, colliders, CLEAR) < 1) return false;
      for (const side of [-1, 1]) {
        a.set(this.target.x + uz * SEE_SIDE * side, this.target.y, this.target.z - ux * SEE_SIDE * side);
        b.set(from.x + uz * SEE_SIDE * side, from.y, from.z - ux * SEE_SIDE * side);
        if (sight(a, b, colliders, CLEAR) < 1) return false;
      }
      return true;
    };

    // Something in the way that it could see over? Then it looks for the lowest line, the same way round and as far
    // off, from which it can see him; if there is one (within how steeply it may look), it rises to it.
    // (Only something LOW: a brazier, a barrel, a crate or two. From far enough off there is a clear line down past
    // the face of any wall, and it would go up to that every time he came near one.)
    let wantLift = 0;
    if (C.liftMaxPitch > base + LIFT_STEP && this.lowThingInTheWay(colliders, focus.y + C.liftOver, ux, uz)) {
      let lo = base;
      let hi = -1;
      for (let p = base + LIFT_STEP; hi < 0 && lo < C.liftMaxPitch; p += LIFT_STEP) {
        // (The steepest it may look is always tried, whatever the steps come to.)
        const q = Math.min(p, C.liftMaxPitch);
        if (sees(at(q))) hi = q;
        else lo = q;
      }
      if (hi >= 0) {
        // (Between the last line that was blocked and the first that was not: nearer still.)
        for (let i = 0; i < 4; i++) {
          const mid = (lo + hi) / 2;
          if (sees(at(mid))) hi = mid;
          else lo = mid;
        }
        wantLift = hi - base + 0.02;
      }
    }
    this.lift += (wantLift - this.lift) * ease(wantLift > this.lift ? C.liftInRate : C.liftOutRate);
    const end = this.lift > 1e-4 ? at(base + this.lift) : this.free;

    // Pull the camera in if a wall lies between the rat and where it wants to be: quickly in, slowly back out.
    // (On its way up to a clear line it comes back out as fast as it rises.)
    const hit = sight(this.target, end, colliders);
    const want = hit >= 1 ? 1 : Math.max(0.12, hit - 0.05);
    const rate = want < this.pull ? C.pullInRate : wantLift > 0 ? Math.max(C.pullOutRate, C.liftInRate) : C.pullOutRate;
    this.pull += (want - this.pull) * ease(rate);
    this.pos.copy(this.target).lerp(end, this.pull);
    this.look.copy(this.target);
    // (Looking steeply down over something, it looks a little ahead of him as well, so there is floor in front of him to see.)
    if (this.lift > 1e-4) {
      const more = LIFT_AHEAD * Math.max(0, Math.min(1, (base + this.lift - 0.6) / 0.6)) * Math.min(1, this.lift / 0.3);
      this.look.x -= ux * more;
      this.look.z -= uz * more;
    }

    // Squeezed right up to him (a wall at his back, or a thing against a wall), it does not sit in the back of his
    // head: it goes up the wall to look down over him, and looks a little ahead of him, so that he is in the lower
    // half of the picture and what he is fighting is in it. It stays on his side of the wall and under any roof,
    // and it is built round HIM there, not round the point leaned ahead of him.
    let wantRise = 0;
    let wantOver = 0;
    let wantTuck = this.tuck;
    const out = Math.hypot(this.pos.x - this.chest.x, this.pos.z - this.chest.z);
    const squeezed = Math.max(0, Math.min(1, (SQUEEZE_FROM - this.pull) / (SQUEEZE_FROM - SQUEEZE_FULL)));
    if (squeezed > 0 && C.squeezeRise > 0) {
      // (How far behind him the first solid thing is, at the height of his chest.)
      this.sideA.set(this.chest.x + ux * 1.5, this.chest.y, this.chest.z + uz * 1.5);
      const wallAt = sight(this.chest, this.sideA, colliders) * 1.5;
      wantTuck = Math.max(SQUEEZE_NEAR, Math.min(out, wallAt - SQUEEZE_OFF));
      // (Room over that spot: up to whatever is above it, less a little. With no room to speak of it stays as it was.)
      this.sideA.set(this.chest.x + ux * wantTuck, this.pos.y, this.chest.z + uz * wantTuck);
      this.sideB.copy(this.sideA).y += C.squeezeRise + 0.2;
      const room = Math.max(0, sight(this.sideA, this.sideB, colliders) * (C.squeezeRise + 0.2) - 0.2);
      if (room > 0.35) {
        wantOver = squeezed * squeezed * (3 - 2 * squeezed);
        wantRise = Math.min(C.squeezeRise, room) * wantOver;
      }
    }
    if (this.over < 1e-3) this.tuck = wantTuck;
    else this.tuck += (wantTuck - this.tuck) * ease(C.liftInRate);
    this.over += (wantOver - this.over) * ease(wantOver > this.over ? C.squeezeInRate : C.liftOutRate);
    this.rise += (wantRise - this.rise) * ease(wantRise > this.rise ? C.squeezeInRate : C.liftOutRate);
    if (this.over > 1e-4) {
      const tx = this.chest.x + ux * Math.min(this.tuck, out);
      const tz = this.chest.z + uz * Math.min(this.tuck, out);
      this.pos.set(this.pos.x + (tx - this.pos.x) * this.over, this.pos.y + this.rise, this.pos.z + (tz - this.pos.z) * this.over);
      // It looks ahead of him by as much as puts him a little below the middle of the picture from where it now is.
      const o = Math.hypot(this.pos.x - this.chest.x, this.pos.z - this.chest.z);
      const h = Math.max(0, this.pos.y - this.chest.y);
      const down = Math.max(0.25, Math.atan2(h, o) - SQUEEZE_DROP * this.over);
      const more = Math.max(0, Math.min(2.5, h / Math.tan(down) - o));
      this.look.set(
        this.look.x + (this.chest.x - this.look.x) * this.over - ux * more,
        this.look.y,
        this.look.z + (this.chest.z - this.look.z) * this.over - uz * more,
      );
    }

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);
  }
}
