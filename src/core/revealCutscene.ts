/**
 * The little scene when every collectible in the room has been found: he looks around, the room rumbles, the
 * camera swings to the east wall, sparkles trace a door, and the door fades in. Plain timing data, so a test can run it.
 */
export const REVEAL = {
  look: 2.4, // he looks left and right
  rumbleStart: 1.2,
  rumbleEnd: 4.4,
  panEnd: 4.0, // the camera is on the wall by now (the pan starts when the looking stops)
  sparkleEnd: 5.8,
  fadeEnd: 8.0,
  holdEnd: 8.6,
  total: 9.8, // the camera is back behind him
};

export interface RevealFrame {
  /** Added to the way he was facing, in radians. */
  lookOffset: number;
  /** 0 = facing as before, 1 = facing the door. */
  faceDoor: number;
  /** Camera shake strength. */
  rumble: number;
  /** 0 = normal camera, 1 = the camera watching the wall. */
  camBlend: number;
  /** 0..1: how much of the door's outline has sparkled into view. */
  sparkle: number;
  /** 0..1: how solid the door is. */
  fade: number;
  done: boolean;
}

const smooth = (a: number, b: number, t: number): number => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

export function revealFrame(t: number): RevealFrame {
  const R = REVEAL;
  const look = t < R.look ? Math.sin((t / R.look) * Math.PI * 2.5) * 1.0 * Math.min(1, t / 0.4) : 0;
  const rumble = t < R.rumbleStart || t > R.rumbleEnd ? 0 : 0.05 * smooth(R.rumbleStart, R.rumbleStart + 0.3, t) * (1 - smooth(R.rumbleEnd - 1, R.rumbleEnd, t));
  const camIn = smooth(R.look, R.panEnd, t);
  const camOut = smooth(R.holdEnd, R.total, t);
  return {
    lookOffset: look,
    faceDoor: smooth(R.look, R.panEnd, t),
    rumble,
    camBlend: camIn * (1 - camOut),
    sparkle: smooth(R.panEnd - 0.4, R.sparkleEnd, t),
    fade: smooth(R.sparkleEnd, R.fadeEnd, t),
    done: t >= R.total,
  };
}
