/**
 * All feel-related numbers live here so they can be tuned without touching logic.
 * Units: the rat is about 1 unit tall. Times are in seconds.
 */
export const TUNING = {
  rat: {
    height: 1.1,
    radius: 0.3,
  },
  move: {
    walk: 3.2,
    run: 6.2,
    groundAccel: 30,
    groundDecel: 26,
    airAccel: 14,
    turnRate: 12,
  },
  jump: {
    velocity: 9.5, // with gravity 18 this gives about 2.5 units of height and a longer hang time
    doubleVelocity: 9, // second jump in the air
    airJumps: 1, // extra jumps allowed before touching ground again
    flipDuration: 0.6, // seconds for the backflip that goes with an air jump
    cutMultiplier: 0.5, // releasing jump early cuts upward speed
    coyoteTime: 0.1,
    buffer: 0.12,
  },
  physics: {
    gravity: 18, // lower than before, for a floatier arc
    fallGravityMultiplier: 1.25, // falls are a little snappier than the rise
    maxFall: 30,
    stepHeight: 0.35,
  },
  attack: {
    aimRange: 3.4, // a swing turns to face an enemy this close...
    aimCone: 1.9, // ...if it is within this angle (radians) of where the stick or the rat points
  },
  health: {
    max: 5,
    hurtTime: 0.38, // seconds of being knocked back with no control
    invulnTime: 1.0, // seconds of safety after being hit
    deadTime: 2.0, // seconds lying down before respawning
    knockback: 6.5,
    blockPush: 3.2, // how hard a blocked hit shoves the rat back
    blockArc: 1.4, // a guard blocks hits coming from within this angle of the rat's facing
    blockStun: 0.22, // seconds after a block before he can swing
    recoilStun: 0.35, // seconds after his sword glances off armour before he can swing again
    recoilPush: 4.8, // how hard he is bounced back when it does
  },
  guard: {
    moveMultiplier: 0.5, // movement speed while holding the shield up
    parryWindow: 0.16, // a hit caught this soon after the shield goes up is turned aside: no shove, and the attacker reels
  },
  /** A press made a moment too early is remembered, so a swing or a roll comes out as soon as it can. */
  buffer: { attack: 0.2, dodge: 0.2 },
  dodge: {
    roll: { duration: 0.5, speed: 7.0 }, // rolls in the direction you hold
    back: { duration: 0.3, speed: 5.5 }, // backstep when no direction is held
    // The pause between one roll (or backstep) ending and the next starting. Short: he can still roll round an enemy,
    // roll after roll (the owner, 2026-11-15: "don't completely take away the player's ability to roll around"), but
    // there is a beat between them in which he can be hit.
    cooldown: 0.25,
    rollSafe: [0.06, 0.72], // the part of the roll (0..1) during which hits pass through him
    backSafe: [0.0, 0.5],
  },
  scuttler: {
    hp: 4,
    radius: 0.42,
    speed: 2.5,
    turnRate: 7,
    noticeRange: 8,
    attackRange: 1.75, // starts its wind-up when the rat is this close
    windup: 0.62, // the tell: it rears up and its eyes turn red
    lungeTime: 0.22,
    lungeSpeed: 9.5,
    recover: 0.95, // it sits spent after a lunge. This is the opening
    blockedRecover: 1.3, // longer if the lunge hit a raised shield
    stagger: 0.42,
    knockback: 5,
    biteReach: 0.6, // from its front edge
    biteArc: 0.9,
    damage: 1,
    respawn: 5,
    // How it fights: it closes in, circles at arm's length, and picks its moment.
    engageRange: 3.6, // nearer than this it stops running at him and starts to circle
    circleRadius: 2.7, // the distance it tries to keep while circling
    circleSpeed: 2.0,
    circleTime: [0.7, 2.0], // how long it circles before it wants to attack (a random time in this range)
    retaliate: [0.25, 0.7], // after being hit it wants to attack again this soon
    // The quick bite: a short tell, a short snap, a short opening. Used when he is close.
    bite: { range: 2.1, windup: 0.4, track: 0.6, lungeTime: 0.17, lungeSpeed: 8.5, recover: 0.75 },
    // The charge: a long tell, then it hurls itself a long way in a straight line. Step aside and it skids past, wide open.
    charge: { windup: 0.85, track: 0.7, lungeTime: 0.42, lungeSpeed: 11.5, recover: 1.35 },
    parriedRecover: 2.0, // flipped on its back by a perfectly timed shield
    // It hops back out of reach when it sees a swing coming (sometimes).
    hopBack: { time: 0.24, speed: 7.5, chance: 0.4, cooldown: 2.6, range: 2.5 },
    arena: { x0: -14, x1: -3, z0: 14, z1: 19 }, // it never leaves this patch of floor
    home: { x: -8.5, z: 17.2 },
  },
  /** Extra moves for open courses: the long jump (sneak while running, then jump), the wall kick, the ledge grab. */
  moves: {
    longJumpSpeed: 12, // across the ground
    longJumpUp: 7.5, // a low, flat leap
    longJumpWindow: 0.3, // he must have been running this recently when he crouches and jumps
    longJumpSteer: 3, // how much he can bend it in the air
    wallKickUp: 10,
    // Away from the wall. (7 until 2026-11-15: the owner, after playing the Move Garden, liked the kick as it was and
    // asked for the distance between the walls to be "a tiny bit more lenient". The height is untouched.)
    wallKickPush: 7.5,
    wallKickWindow: 0.16, // a jump pressed this soon after touching a wall in the air kicks off it
    wallKickLock: 0.25, // seconds the stick cannot pull him straight back to the wall
    // After a kick he is carried straight across at the kick's speed, towards whatever wall is opposite, for this long
    // or until he lands; the stick only trims him sideways (this fast) unless he hauls right back.
    wallChainTime: 1.5,
    wallChainSteer: 2.5,
    wallChainHold: 0.3, // a jump pressed this long before he reaches the far wall is kept for the kick off it
    climbTime: 0.5, // pulling himself up onto a ledge (long enough to see: pull, knee up, stand)
  },
  /**
   * Riding his shield down a slope, like a board (the owner, 2026-11-15: "he rides it like a skateboard ... he uses
   * his tail to balance and make hard curves"). Running down a slope, SNEAK drops it under his feet; on a slope too
   * steep to stand on he has no choice. Speeds are along the ground, in units a second.
   */
  ride: {
    minSlope: 0.2, // a slope has to be at least this steep (rise over run) to start a ride on it from a run
    gravity: 15, // how hard a slope pulls him down it (times how steep it is)
    dragSlope: 0.5, // what slows him on a slope
    dragFlat: 1.6, // ...and on the flat, where he rolls on a long way
    max: 16, // top speed
    stop: 1.4, // slower than this, on ground he can stand on, he steps off
    turn: 2.2, // how fast he turns with the stick held to one side (radians a second)
    carve: 1.8, // ...and how much faster with it held hard over: a carve, his tail out
    carveDrag: 3.2, // a carve scrubs speed off
    brake: 9, // the stick pulled back against the way he is going
    airTurn: 0.5, // how much of his turning he keeps in the air
    ollie: 8.2, // the jump off the board
    flipLift: 5.4, // the little lift a kickflip gives (the second jump, in the air)
    flipTime: 0.42, // seconds the shield takes to spin round under his feet
    trickBoost: 2.6, // speed added for landing one
    bailSpeed: 6, // into a wall faster than this, he comes off
    bailTime: 0.5, // ...and is this long picking himself up
    again: 0.4, // after stepping off, this long before SNEAK starts another
  },
    /** Attacking in the air: a short hang, a straight dive, and a shockwave all round on landing. */
  plunge: {
    windup: 0.16, // seconds hanging with the sword raised
    speed: 26, // dive speed
    recover: 0.5, // seconds stuck in the ground after landing
    shockRadius: 2.3, // 360 degree landing blast, measured from the rat
    shockDamage: 2,
    diveRadius: 0.85, // anything this close directly below is struck on the way down
    diveDamage: 3,
  },
  /** Swimming in the pit's sludge. */
  swim: {
    speed: 2.0, // while sneaking
    fast: 3.0, // the usual swim
    accel: 12,
    sink: 0.62, // how far his feet hang below the surface, so his head and shoulders ride above it
    stiffness: 40, // how hard the water pushes him back to the surface after a splash
    damping: 8,
    jumpGrace: 0.45, // after jumping out, the water ignores him for this long
  },
  landTime: 0.12,
  pit: {
    respawnY: -6,
  },
  spawn: { x: 0, y: 0, z: 8 },
  /** Combat feel: a tiny freeze on hits (see main.ts) and a short slow-motion beat on a kill. */
  feel: {
    killSlowSeconds: 0.45,
    /** How slow time runs at the start of the kill beat (1 = normal), easing back to normal. */
    killSlowScale: 0.2,
  },
  camera: {
    distance: 3.5,
    targetHeight: 0.8,
    minPitch: 0.1,
    maxPitch: 0.9,
    turnSpeed: 2.2,
    pitchSpeed: 0.8,
    // How fast the view swings round behind him as he moves. 0: it does not; only the right stick turns it. (It was
    // 1.4. Since the left stick steers relative to the view, a view that turned by itself changed what the stick meant
    // under the player's thumb: worst in a wall jump, where he turns right round at every kick. The owner, 2026-11-14.)
    autoFollowRate: 0,
    followRate: 12,
    /** How quickly the view follows him up and down (jumps, landings, lifts). Lower is smoother. */
    heightRate: 5,
    /** The most the view can lag behind him vertically before it is dragged along. */
    heightSlack: 1.4,
    /** The view leans toward where he is running: seconds of travel to look ahead, the most it leans, and how fast it settles. */
    lookAhead: 0.12,
    lookAheadMax: 0.9,
    lookAheadRate: 3,
    /** The camera is pulled in by a wall at this rate, and eases back out at the slower one. */
    pullInRate: 22,
    pullOutRate: 2.5,
    /**
     * Something low behind him (a brazier, a crate, a step) does not pull the view in: it rises to look over it. This
     * is the steepest it may look to do that (radians above level; he can tilt it to 0.9 himself). At or under the
     * pitch it is at, it never rises, and everything pulls it in as walls do. Then how fast it rises, and comes down.
     */
    liftMaxPitch: 1.2,
    liftInRate: 10,
    liftOutRate: 3,
    /** What counts as low: nothing of it more than this far above his feet (two crates, one on the other, are 2). */
    liftOver: 2.4,
    /**
     * A wall right behind him still pulls the view in; but pulled in close, it goes this far up over his head and
     * looks down ahead of him, where it used to sit in the back of his head. 0: it stays level, as it used to.
     */
    squeezeRise: 2.6,
    /** How fast it goes up there. (It comes down at `liftOutRate`.) */
    squeezeInRate: 14,
  },
} as const;
