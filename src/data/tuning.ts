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
  /**
   * PICKING UP AND THROWING (world/lifting.ts): crates and barrels, with STOW (triangle) beside one.
   */
  lift: {
    reach: 0.55, // how far past touching it he may be and still lift it
    liftTime: 0.25, // seconds for it to come up over his head
    walk: 0.72, // of his speed while he carries it
    jump: 0.85, // of his jump
    hold: 0.12, // the gap between his head and the thing
    throwSpeed: 11, // how fast it leaves him, the way he faces
    throwUp: 3.5, // and upward (with nothing to aim at: a low arc, six along)
    aimRange: 10, // a creature this near, in front of him, is what he throws AT
    aimArc: 0.5, // ...within this much of the way he faces (radians each side)
    gravity: 22, // (as crates fall: chamber.ts)
    throwTime: 0.3, // seconds his arms take to come down after a throw (he cannot swing in them)
    damage: 2, // to a creature it hits: the last blow of his three
    down: 0.2, // set down, the gap left between him and it
  },
  /**
   * THE DREAM, ON FOOT (data/feel.ts reads these as the dream's `foot`): how much faster he runs, how much harder he
   * jumps, and how much of the world's gravity pulls on him. The owner, 2026-11-17: "the dream world is supposed to
   * be fantastical, it's supposed to feel floatier and more high velocity and hyperactive ... he can jump higher and
   * move faster". Together a jump is 4 high where the waking world's is 2.5, and he is in the air half as long again.
   * ON FOOT ONLY: on his shield the air is as it was, because the dream's rides are measured to it (their gaps, their
   * landings, the half pipe's launch).
   */
  dream: {
    run: 1.25,
    jump: 1.1,
    gravity: 0.75,
  },
  ride: {
    minSlope: 0.4, // over a slope at least this steep (rise over run) the air attack is the shield under his feet, not the dive
    surfDrop: 10, // ...if it is no further below him than this
    gravity: 15, // how hard a slope pulls him down it (times how steep it is)
    dragSlope: 0.5, // what slows him on a slope
    dragFlat: 1.6, // ...and on the flat, where he rolls on a long way
    max: 16, // top speed, standing up on it
    // THE TUCK (the owner, 2026-11-17, of the Big Dipper: "the sliding seems a little slow ... make it gain momentum as
    // you go down, with a maximum speed obviously ... like a snowboarding game ... push forward on the left analog
    // stick in order to sort of crouch down and go a little faster"). The stick pushed the way he is going: he
    // crouches, and a slope goes on speeding him up past his standing top speed, more slowly, to a higher one.
    // (And then, of a tuck that took four seconds to build to 24: "the leaning forward needs to have more of an effect on
    // his momentum right now it feels like a realistic amount of momentum increase for the incline but this is a video
    // game and it's supposed to ... have fun". So it is MORE than the slope gives: it takes two seconds, to a higher top.)
    tuckMax: 30, // top speed, tucked
    tuckGain: 1.3, // above his standing top speed, how much of a slope's pull speeds him up (tucked): more than all of it
    tuckShed: 4, // standing up again (or on the flat), what he has over his standing top speed goes at this rate a second
    tuckPush: 5, // below his standing top speed, a tuck pushes him along at this rate on ANY ground: on the flat he skates
    // MORE TRICKS (the owner, the same day: "maybe different things you can do while you're in the air we already have
    // the kick flip so we could do a couple more things like that"). In the air on his shield: JUMP is the kickflip (as
    // it was); the ROLL button is a SPIN, right round; GUARD held is a GRAB. Each one landed is speed, and they add up.
    // (The spin was on ATTACK for a day. Then: "you should be able to swing your sword on attack while you're riding your
    // shield". ATTACK is the sword, on the shield as off it.)
    spinTime: 0.45, // seconds a spin takes
    // THE LIP OF A PIPE (the owner, 2026-11-17: "when riding up a half pipe ramp you should disconnect up at the top like in
    // Tony Hawk's Pro Skater and come back down into the pipe"). Off the high end of a wall that is marked for it
    // (`Box.vert`), a rider going up fast enough goes STRAIGHT UP, with what speed he had up the wall, and drifts back
    // in over the wall he left: he comes down on it and rides back into the pipe.
    vertMin: 2.5, // going up the wall at least this fast (across the ground), or he only comes to its top and back
    vertPop: 1.5, // a little more than the wall gave him
    vertTop: 20, // ...and never faster upward than this (eleven up over the lip, two seconds and a bit in the air)
    vertDrift: 1.1, // how fast he drifts back in over the wall while he is in the air
    spinSafe: 0.75, // landed this far round a spin or further, it counts; less than that (and well begun) and he comes off
    grabTime: 0.3, // a grab held this long counts
    stop: 1.4, // slower than this, on ground he can stand on, he steps off
    restSlope: 0.12, // ...if it is flatter than this (or he is braking): a real slope will start him again
    turn: 2.2, // how fast he turns with the stick held to one side (radians a second)
    carve: 1.8, // ...and how much faster with it held hard over: a carve, his tail out
    carveDrag: 3.2, // a carve scrubs speed off
    brake: 16, // the stick pulled back against the way he is going (it was 9: at a tuck's speed that was fifty units to stop in)
    airTurn: 0.5, // how much of his turning he keeps in the air
    ollie: 8.2, // the jump off the board
    flipLift: 5.4, // the little lift a kickflip gives (the second jump, in the air)
    flipTime: 0.42, // seconds the shield takes to spin round under his feet
    trickBoost: 3.5, // speed added for landing one, for EACH trick done in that air (up to his tucked top speed)
    bailSpeed: 6, // into a wall faster than this, he comes off
    bailTime: 0.5, // ...and is this long picking himself up
    again: 0.4, // after stepping off, this long before SNEAK starts another
  },
  /**
   * Ice (a box that is `slick`): he keeps his momentum on it. (The owner, 2026-11-16: "not necessarily sliding the
   * same way you do on a steep slope but like a slower loss of momentum than you would normally have so you might
   * maintain a little bit of your momentum for a few seconds longer while you're on ice".)
   * `decel`: how much of his usual stopping he has, the stick let go: a tenth, so from a run he glides on for about
   * two and a half seconds, seven units or so. `accel`: how much of his usual push he has with the stick held (to
   * get going, and to turn or brake against the way he is sliding): a third, so he turns wide but is not helpless.
   * He is always on his feet and steering: it is not the slide down a steep slope. His jump, and the air, are as ever.
   */
  ice: { accel: 0.35, decel: 0.1 },
  /**
   * Slime (the green runnel down the middle of a pipe): ON FOOT it holds him, he goes at this share of his speed.
   * (ON THE SHIELD it does nothing: it was tried as the fast line, the board's drag cut and its top speed raised, and
   * the Long Drop, which is tuned to the speed he leaves its lip at, threw him clean over its arena. 2026-11-17.)
   */
  slime: { walk: 0.55 },
  /**
   * Sliding on his own hide down ground too steep to stand on (the owner, 2026-11-15: "he would basically be like
   * tripping and sliding down ... probably a little slower and you have less control"). Compare `ride`.
   */
  slide: {
    grip: 0.3, // going UP such ground, this long before he loses his footing
    gravity: 10, // how hard the slope pulls him (a shield: 15)
    drag: 1.2, // what slows him on the slope
    dragFlat: 7, // ...and on ground he can stand on, where he scrapes to a stop
    max: 9.5, // his fastest (a shield: 16; a run: 6.2)
    turn: 0.8, // how fast the stick bends his way (a shield: 2.2)
    hop: 5.2, // the hop out of it: no second jump after
    stop: 1.0, // slower than this on ground he can stand on, he gets up
  },
  /**
   * Grinding, while he rides (the owner, 2026-11-15: "go to the edge and ... press triangle and he'll ... grind
   * alongside that edge"): STOW, which has nothing else to do on the shield, puts it across the nearest ledge or rail
   * he is going along. See world/grind.ts for what counts as one.
   */
  grind: {
    reach: 0.85, // how far to the side of him the edge may be
    up: 0.75, // how far above his feet (he hops up onto it)
    down: 2.6, // ...and below them (he comes down onto it out of the air: a jump's height)
    dropSpeed: 7, // coming down onto one from above, he starts at this speed at least...
    dropPull: 45, // ...and gathers this much more a second
    dropIn: 14, // ...and is drawn in over the line this fast
    minSpeed: 3.5, // he must be going this fast along it to get on
    drop: 0.4, // an edge is one to grind only with this much of a drop beside it
    drag: 0.5, // what slows him on it: less than the flat, so a rail keeps his speed
    stop: 1.2, // slower than this he comes off it
    hop: 7.4, // the jump off it
    hopSide: 3.6, // ...and how hard the stick throws that jump to one side
    again: 0.25, // after leaving one, this long before he can get on another
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
    /**
     * LOOKING UP (the owner, 2026-11-16: "i want to be able to pan up, look up more with the right stick. i dont want
     * to clip the floor with the camera but we could still do something"). Pushed on past its lowest place behind him,
     * the view does not go down through the floor: it sinks a little more (`lookUpDrop`, radians of its swing: to
     * about knee height), is kept `floorClear` over whatever ground is under it, and TILTS UP (`lookUpTilt`, radians)
     * with him at the foot of the picture. `lookUp`: how much further the stick goes for all of that (radians of
     * stick travel at `pitchSpeed`; 0: it stops at `minPitch`, as it used to).
     */
    lookUp: 0.5,
    lookUpDrop: 0.2,
    lookUpTilt: 0.36,
    floorClear: 0.3,
    turnSpeed: 2.2,
    pitchSpeed: 0.8,
    // How fast the view swings round behind him as he moves. 0: it does not; only the right stick turns it. (It was
    // 1.4. Since the left stick steers relative to the view, a view that turned by itself changed what the stick meant
    // under the player's thumb: worst in a wall jump, where he turns right round at every kick. The owner, 2026-11-14.)
    autoFollowRate: 0,
    /**
     * ON HIS SHIELD ONLY: how fast the view comes round behind the way he is going (0: it does not, as on foot). His
     * rule is that the view does not turn by itself, and this is 0 for that reason. It is here to be TRIED (the Tweaks
     * panel, "Camera"): in a skate park, where he turns round at every wall, a view that never follows shows his face
     * for half of every run. At full riding speed it turns at this rate; slower, in proportion; standing, not at all.
     */
    rideFollowRate: 0,
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
