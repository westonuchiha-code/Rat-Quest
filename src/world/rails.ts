/**
 * LIGHT RAILS: rails that CURVE, for the dream.
 *
 * The owner, 2026-11-17, of a long course to ride in the dream: "lots of like jumps and you can add some rails too but
 * obviously wacky Pomo style so you'll have to make a new version of a rail. You can make it curved you know which is
 * going to be different than a lot of the other rails we have in the game but I think it would really fit the wacky
 * vibe we have here."
 *
 * The game's other rails are found in what is solid (world/grind.ts): the top edge of a box, a thin box. Those run
 * along x or along z, as boxes do. A light rail is a LINE through the air, any shape: it bends, climbs, falls, goes
 * round. It is a ribbon of light, drawn as one (chamber.ts, decor `lightrail`), and it is NOT SOLID: light is not.
 * He passes through it unless he is grinding it; he cannot stand on it. On his shield (or in the air), near it and
 * going along it, the grind button puts him on it, and it carries him as a rail does.
 *
 * A rail is given as a few points; the line goes through them smoothly (`railCurve`), and what is drawn and what is
 * ridden are the same sampled line.
 */
export interface RailSpec {
  /** The points it goes through, in the order he rides it: [x, y, z]. */
  pts: Array<[number, number, number]>;
}

export interface RailCurve {
  x: number[];
  y: number[];
  z: number[];
  /** How far along it each sample is, measured ACROSS THE GROUND (as a slope's run is). */
  s: number[];
  len: number;
}

/**
 * How a light rail is DRAWN (chamber.ts): a tube this thick, lying UNDER the line he rides by this much, so that its
 * top is just under his shield and the shield sits ON it.
 * (The owner, 2026-11-17: "when you're grinding on the rails you kind of clip through ... right now the board is like
 * inside the light rail and his feet kind of are too ... I need that to be redone ... a tighter fit with the shield on
 * the rail". The tube was drawn ROUND the line he rides, so the line, his feet and his shield were down its middle.)
 */
export const RAIL_TUBE = { r: 0.15, under: 0.04 } as const;

/** How far apart its samples are (about), across the ground. */
const STEP = 0.5;

/** The line through a rail's points: a Catmull-Rom curve (it passes through every point), sampled. */
export function railCurve(spec: RailSpec): RailCurve {
  const P = spec.pts;
  const c: RailCurve = { x: [], y: [], z: [], s: [], len: 0 };
  const at = (i: number): [number, number, number] => P[Math.max(0, Math.min(P.length - 1, i))];
  const push = (x: number, y: number, z: number): void => {
    const n = c.x.length;
    if (n) c.len += Math.hypot(x - c.x[n - 1], z - c.z[n - 1]);
    c.x.push(x);
    c.y.push(y);
    c.z.push(z);
    c.s.push(c.len);
  };
  for (let i = 0; i < P.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[2] - p1[2]) / STEP));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      const q = [0, 1, 2].map((a) => 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t * t + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t * t * t));
      push(q[0], q[1], q[2]);
    }
  }
  return c;
}

/** Where the rail is `s` along it, and which way it is going there (a unit vector across the ground, and its rise over run). */
export function railAt(c: RailCurve, s: number): { x: number; y: number; z: number; tx: number; tz: number; slope: number } {
  const n = c.s.length;
  const q = Math.max(0, Math.min(c.len, s));
  // (Its samples are near enough evenly spaced that a guess lands beside the right one.)
  let i = Math.max(0, Math.min(n - 2, Math.floor((q / Math.max(1e-6, c.len)) * (n - 1))));
  while (i > 0 && c.s[i] > q) i--;
  while (i < n - 2 && c.s[i + 1] < q) i++;
  const run = Math.max(1e-6, c.s[i + 1] - c.s[i]);
  const t = (q - c.s[i]) / run;
  return {
    x: c.x[i] + (c.x[i + 1] - c.x[i]) * t,
    y: c.y[i] + (c.y[i + 1] - c.y[i]) * t,
    z: c.z[i] + (c.z[i + 1] - c.z[i]) * t,
    tx: (c.x[i + 1] - c.x[i]) / run,
    tz: (c.z[i + 1] - c.z[i]) / run,
    slope: (c.y[i + 1] - c.y[i]) / run,
  };
}

/**
 * How near a light rail must be for the grind button to take it: further than a solid rail's reach, for it is light
 * and draws him to it; as far above and below him as any rail may be.
 */
export const RAIL_REACH = 1.6;

export interface RailStart {
  rail: RailCurve;
  s: number;
  h: number;
  /** His speed along it, signed: + is the way its points run. */
  v: number;
}

/**
 * The light rail nearest a rider at (x, y, z) going (vx, vz), if one is in reach and he is going along it fast enough.
 * `up`, `down`: how far above his feet it may be, and below (TUNING.grind's).
 */
export function findRail(rails: RailCurve[], x: number, y: number, z: number, vx: number, vz: number, G: { up: number; down: number; minSpeed: number }): RailStart | null {
  let best: RailStart | null = null;
  let bestD = RAIL_REACH;
  for (const c of rails) {
    for (let i = 0; i < c.s.length - 1; i++) {
      const dx = c.x[i + 1] - c.x[i];
      const dz = c.z[i + 1] - c.z[i];
      const run2 = dx * dx + dz * dz;
      if (run2 < 1e-9) continue;
      const t = Math.max(0, Math.min(1, ((x - c.x[i]) * dx + (z - c.z[i]) * dz) / run2));
      const d = Math.hypot(x - (c.x[i] + dx * t), z - (c.z[i] + dz * t));
      if (d >= bestD) continue;
      const h = c.y[i] + (c.y[i + 1] - c.y[i]) * t;
      if (y < h - G.up || y > h + G.down) continue;
      const run = Math.sqrt(run2);
      const v = (vx * dx + vz * dz) / run;
      if (Math.abs(v) < G.minSpeed) continue;
      bestD = d;
      best = { rail: c, s: c.s[i] + run * t, h, v };
    }
  }
  return best;
}
