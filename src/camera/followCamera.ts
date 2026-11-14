import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { Aabb, segmentAabbT } from '../world/collision';

function lerpAngle(a: number, b: number, t: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

/**
 * Third-person camera. It sits behind and slightly above the rat, eases behind him when he moves,
 * and is pulled in when a wall would block its line of sight.
 */
export class FollowCamera {
  /** Angle of the camera around the rat, measured from +Z. Movement is relative to this. */
  yaw = Math.PI;
  pitch = 0.3;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly pos = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly probeEnd = new THREE.Vector3();
  private readonly free = new THREE.Vector3();
  private smoothY = 0;
  /** The view leans a little the way he is running, so there is more to see ahead. */
  private ahead = { x: 0, z: 0 };
  /** How much of the way out to the free spot the camera is allowed (1 = all of it); eased so walls never snap it. */
  private pull = 1;
  private initialized = false;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
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

    if (turn !== 0) {
      this.yaw += turn * dt * C.turnSpeed;
    } else if (moving) {
      // Ease behind the rat's facing direction while he moves.
      this.yaw = lerpAngle(this.yaw, facing + Math.PI, 1 - Math.exp(-C.autoFollowRate * dt));
    }
    this.pitch = Math.min(C.maxPitch, Math.max(C.minPitch, this.pitch + pitchInput * dt * C.pitchSpeed));

    // The view follows him sideways closely but rides up and down gently, so hops and landings do not jolt it.
    if (!this.initialized) this.smoothY = focus.y;
    this.smoothY += (focus.y - this.smoothY) * (1 - Math.exp(-C.heightRate * dt));
    this.smoothY = Math.min(focus.y + C.heightSlack, Math.max(focus.y - C.heightSlack, this.smoothY));
    const wantX = Math.max(-C.lookAheadMax, Math.min(C.lookAheadMax, (velocity?.x ?? 0) * C.lookAhead));
    const wantZ = Math.max(-C.lookAheadMax, Math.min(C.lookAheadMax, (velocity?.z ?? 0) * C.lookAhead));
    const k = this.initialized ? 1 - Math.exp(-C.lookAheadRate * dt) : 1;
    this.ahead.x += (wantX - this.ahead.x) * k;
    this.ahead.z += (wantZ - this.ahead.z) * k;
    this.target.set(focus.x + this.ahead.x, this.smoothY + C.targetHeight, focus.z + this.ahead.z);
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * cp * C.distance,
      this.target.y + Math.sin(this.pitch) * C.distance,
      this.target.z + Math.cos(this.yaw) * cp * C.distance,
    );

    if (!this.initialized) {
      this.free.copy(this.desired);
      this.pull = 1;
      this.initialized = true;
    } else {
      this.free.lerp(this.desired, 1 - Math.exp(-C.followRate * dt));
    }

    // Pull the camera in if a wall lies between the rat and where it wants to be: quickly in, slowly back out.
    let hit: number | null = null;
    for (const b of colliders) {
      const t = segmentAabbT(this.target, this.free, b);
      if (t !== null && (hit === null || t < hit)) hit = t;
    }
    const want = hit === null ? 1 : Math.max(0.12, hit - 0.05);
    const rate = want < this.pull ? C.pullInRate : C.pullOutRate;
    this.pull += (want - this.pull) * (1 - Math.exp(-rate * dt));
    this.probeEnd.copy(this.target).lerp(this.free, this.pull);
    this.pos.copy(this.probeEnd);

    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target);
  }
}
