/**
 * Tweaks: the feel of the game on sliders. Each one points at a number in the tuning tables (TUNING, TOAD, GRIM).
 * Changes are written straight into those tables, so most take effect at once; they are kept on this device and put
 * back on the next start. "Copy settings" gives the changed ones as text, to send to Claude to make them the defaults.
 */
import { TUNING } from '../data/tuning';
import { TOAD } from '../enemies/toad';
import { IRONBACK } from '../enemies/ironback';
import { GUARD } from '../enemies/guard';
import { MANTIS } from '../enemies/mantis';
import { STAG } from '../enemies/stag';
import { BROOD } from '../enemies/brood';
import { WIDOW } from '../enemies/widow';
import { WYRM } from '../enemies/wyrm';
import { CRATE_DROPS } from '../data/consumables';
import { BAT } from '../enemies/bat';
import { HORNET } from '../enemies/hornet';
import { ANT } from '../enemies/ant';
import { FIREFLY } from '../enemies/firefly';
import { GRIM } from '../enemies/grimsqueak';
import { BALANCE } from '../data/balance';

export const TWEAKS_KEY = 'ratquest.tweaks.v1';

export interface TweakDef {
  /** e.g. "jump.velocity" (in TUNING), "toad.hp", "grim.hp". */
  path: string;
  label: string;
  group: string;
  min: number;
  max: number;
  step: number;
  /** When it takes effect, if not at once (shown under the slider). */
  later?: string;
}


export const TWEAKS: TweakDef[] = [
  { group: 'Moving', path: 'move.walk', label: 'Walk speed', min: 1, max: 8, step: 0.1 },
  { group: 'Moving', path: 'move.run', label: 'Run speed', min: 2, max: 14, step: 0.1 },
  { group: 'Moving', path: 'move.groundAccel', label: 'Speed-up on the ground', min: 5, max: 80, step: 1 },
  { group: 'Moving', path: 'move.groundDecel', label: 'Slow-down on the ground', min: 5, max: 80, step: 1 },
  { group: 'Moving', path: 'move.airAccel', label: 'Steering in the air', min: 2, max: 40, step: 1 },
  { group: 'Moving', path: 'move.turnRate', label: 'Turning speed', min: 3, max: 30, step: 0.5 },
  { group: 'Moving', path: 'swim.fast', label: 'Swim speed', min: 1, max: 8, step: 0.1 },

  { group: 'Jumping', path: 'jump.velocity', label: 'Jump power', min: 5, max: 16, step: 0.1 },
  { group: 'Jumping', path: 'jump.doubleVelocity', label: 'Double-jump power', min: 4, max: 16, step: 0.1 },
  { group: 'Jumping', path: 'jump.airJumps', label: 'Jumps in the air', min: 0, max: 3, step: 1 },
  { group: 'Jumping', path: 'physics.gravity', label: 'Gravity', min: 8, max: 40, step: 0.5 },
  { group: 'Jumping', path: 'physics.fallGravityMultiplier', label: 'Extra pull when falling', min: 1, max: 3, step: 0.05 },
  { group: 'Jumping', path: 'jump.cutMultiplier', label: 'Short hop (lower = shorter)', min: 0.1, max: 1, step: 0.05 },
  { group: 'Jumping', path: 'jump.coyoteTime', label: 'Grace after leaving a ledge', min: 0, max: 0.4, step: 0.01 },
  { group: 'Jumping', path: 'physics.maxFall', label: 'Top falling speed', min: 10, max: 60, step: 1 },

  { group: 'Moves', path: 'moves.longJumpSpeed', label: 'Long jump speed', min: 6, max: 18, step: 0.25 },
  { group: 'Moves', path: 'moves.longJumpUp', label: 'Long jump height', min: 3, max: 12, step: 0.1 },
  { group: 'Moves', path: 'moves.longJumpWindow', label: 'Long jump: running grace', min: 0.05, max: 1, step: 0.05 },
  { group: 'Moves', path: 'moves.longJumpSteer', label: 'Long jump steering', min: 0, max: 15, step: 0.5 },
  { group: 'Moves', path: 'moves.wallKickUp', label: 'Wall kick height', min: 5, max: 16, step: 0.25 },
  { group: 'Moves', path: 'moves.wallKickPush', label: 'Wall kick push', min: 2, max: 14, step: 0.25 },
  { group: 'Moves', path: 'moves.wallKickWindow', label: 'Wall kick timing window', min: 0.04, max: 0.5, step: 0.01 },
  { group: 'Moves', path: 'moves.wallChainTime', label: 'After a wall kick: seconds he is carried straight across (0: as before)', min: 0, max: 3, step: 0.05 },
  { group: 'Moves', path: 'moves.wallChainSteer', label: 'After a wall kick: how fast the stick can trim him sideways', min: 0, max: 6, step: 0.1 },
  { group: 'Moves', path: 'moves.wallChainHold', label: 'An early jump press is kept for the next wall this long', min: 0, max: 0.6, step: 0.02 },
  { group: 'Moves', path: 'moves.climbTime', label: 'Ledge climb time', min: 0.1, max: 1, step: 0.02 },

  { group: 'Riding', path: 'ride.minSlope', label: 'Air attack is the shield over slopes this steep or more (rise over run)', min: 0.05, max: 2, step: 0.05 },
  { group: 'Ice', path: 'ice.decel', label: 'How much of his usual stopping he has on ice (less: he glides further)', min: 0.02, max: 1, step: 0.02 },
  { group: 'Ice', path: 'ice.accel', label: 'How much of his usual push he has on ice (less: slower to start, wider turns)', min: 0.05, max: 1, step: 0.05 },
  { group: 'Riding', path: 'slide.grip', label: 'Too steep: seconds he scrabbles up before he slips', min: 0, max: 1.5, step: 0.05 },
  { group: 'Riding', path: 'slide.gravity', label: 'Sliding on his hide: how hard a slope pulls him', min: 2, max: 30, step: 0.5 },
  { group: 'Riding', path: 'slide.max', label: 'Sliding on his hide: top speed', min: 3, max: 20, step: 0.5 },
  { group: 'Riding', path: 'slide.turn', label: 'Sliding on his hide: turning', min: 0, max: 4, step: 0.1 },
  { group: 'Riding', path: 'slide.hop', label: 'Sliding on his hide: the hop out of it', min: 0, max: 10, step: 0.1 },
  { group: 'Riding', path: 'ride.gravity', label: 'How hard a slope pulls him', min: 4, max: 40, step: 0.5 },
  { group: 'Riding', path: 'ride.max', label: 'Top riding speed, standing', min: 8, max: 30, step: 0.5 },
  { group: 'Riding', path: 'ride.tuckMax', label: 'Top riding speed, tucked (stick forward)', min: 8, max: 40, step: 0.5 },
  { group: 'Riding', path: 'ride.tuckGain', label: 'How fast a tuck builds speed', min: 0.1, max: 1, step: 0.05 },
  { group: 'Riding', path: 'ride.dragFlat', label: 'Slow-down on the flat', min: 0, max: 8, step: 0.1 },
  { group: 'Riding', path: 'ride.dragSlope', label: 'Slow-down on a slope', min: 0, max: 4, step: 0.1 },
  { group: 'Riding', path: 'ride.turn', label: 'Turning', min: 0.5, max: 6, step: 0.1 },
  { group: 'Riding', path: 'ride.carve', label: 'Hard turn: how much sharper', min: 1, max: 4, step: 0.1 },
  { group: 'Riding', path: 'ride.carveDrag', label: 'Hard turn: speed it costs', min: 0, max: 10, step: 0.2 },
  { group: 'Riding', path: 'ride.brake', label: 'Braking (stick back)', min: 0, max: 20, step: 0.5 },
  { group: 'Riding', path: 'ride.ollie', label: 'Jump off the shield', min: 4, max: 14, step: 0.1 },
  { group: 'Riding', path: 'ride.flipLift', label: 'Kickflip lift', min: 0, max: 12, step: 0.1 },
  { group: 'Riding', path: 'ride.flipTime', label: 'Kickflip: seconds it takes', min: 0.15, max: 1, step: 0.01 },
  { group: 'Riding', path: 'ride.trickBoost', label: 'Speed a landed kickflip gives', min: 0, max: 8, step: 0.1 },
  { group: 'Riding', path: 'grind.reach', label: 'Grind: how near the edge he must be', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'Riding', path: 'grind.up', label: 'Grind: how high an edge he can hop onto', min: 0, max: 2, step: 0.05 },
  { group: 'Riding', path: 'grind.minSpeed', label: 'Grind: slowest he can get on at', min: 0.5, max: 10, step: 0.25 },
  { group: 'Riding', path: 'grind.drag', label: 'Grind: slow-down on a level edge', min: 0, max: 4, step: 0.1 },
  { group: 'Riding', path: 'grind.hop', label: 'Grind: the jump off it', min: 3, max: 14, step: 0.1 },
  { group: 'Riding', path: 'grind.hopSide', label: 'Grind: how far the stick throws that jump sideways', min: 0, max: 8, step: 0.2 },
  { group: 'Riding', path: 'ride.stop', label: 'He steps off below this speed', min: 0.2, max: 5, step: 0.1 },

  { group: 'Fighting', path: 'health.max', label: 'Hearts', min: 1, max: 12, step: 1, later: 'after the game restarts' },
  { group: 'Fighting', path: 'health.invulnTime', label: 'Safe time after a hit', min: 0.2, max: 3, step: 0.05 },
  { group: 'Fighting', path: 'health.knockback', label: 'Knockback when hit', min: 0, max: 15, step: 0.5 },
  { group: 'Fighting', path: 'guard.parryWindow', label: 'Parry window', min: 0.04, max: 0.5, step: 0.01 },
  { group: 'Fighting', path: 'guard.moveMultiplier', label: 'Speed with shield up', min: 0.1, max: 1, step: 0.05 },
  { group: 'Fighting', path: 'dodge.roll.speed', label: 'Roll speed', min: 3, max: 14, step: 0.1 },
  { group: 'Fighting', path: 'dodge.roll.duration', label: 'Roll length (time)', min: 0.2, max: 1, step: 0.02 },
  { group: 'Fighting', path: 'dodge.cooldown', label: 'Pause between rolls (from one ending to the next starting)', min: 0, max: 1.5, step: 0.05 },
  { group: 'Fighting', path: 'attack.aimRange', label: 'Swing auto-aim range', min: 0, max: 6, step: 0.1 },
  { group: 'Fighting', path: 'plunge.shockRadius', label: 'Plunge blast size', min: 0.5, max: 5, step: 0.1 },
  { group: 'Fighting', path: 'feel.killSlowSeconds', label: 'Slow-motion on a kill', min: 0, max: 1.5, step: 0.05 },

  { group: 'Roaches', path: 'scuttler.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Roaches', path: 'scuttler.damage', label: 'Damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Roaches', path: 'scuttler.speed', label: 'Run speed', min: 0.5, max: 8, step: 0.1 },
  { group: 'Roaches', path: 'scuttler.noticeRange', label: 'Notices him from', min: 2, max: 20, step: 0.5 },
  { group: 'Roaches', path: 'scuttler.bite.windup', label: 'Bite warning time', min: 0.1, max: 1.5, step: 0.02 },
  { group: 'Roaches', path: 'scuttler.charge.windup', label: 'Charge warning time', min: 0.2, max: 2, step: 0.05 },
  { group: 'Roaches', path: 'scuttler.recover', label: 'Opening after a lunge', min: 0.2, max: 3, step: 0.05 },
  { group: 'Roaches', path: 'scuttler.hopBack.chance', label: 'Chance it hops back from a swing', min: 0, max: 1, step: 0.05 },

  { group: 'Toads', path: 'toad.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Toads', path: 'toad.globDamage', label: 'Spit damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Toads', path: 'toad.windup', label: 'Spit warning time', min: 0.2, max: 2, step: 0.05 },
  { group: 'Toads', path: 'toad.globSpeed', label: 'Spit speed', min: 2, max: 20, step: 0.5 },
  { group: 'Toads', path: 'toad.pounceChance', label: 'Chance it pounces', min: 0, max: 1, step: 0.05 },
  { group: 'Toads', path: 'toad.pounceRange', label: 'Pounce distance', min: 1, max: 10, step: 0.25 },
  { group: 'Toads', path: 'toad.pounceRecover', label: 'Opening after a pounce', min: 0.2, max: 3, step: 0.05 },

  { group: 'Ironbacks', path: 'ironback.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Ironbacks', path: 'ironback.turnRate', label: 'Turn speed (lower: easier to get behind)', min: 0.5, max: 5, step: 0.1 },
  { group: 'Ironbacks', path: 'ironback.rearArc', label: 'Soft spot width (behind it)', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'Ironbacks', path: 'ironback.windup', label: 'Ram warning time', min: 0.3, max: 2, step: 0.05 },
  { group: 'Ironbacks', path: 'ironback.ramSpeed', label: 'Ram speed', min: 3, max: 16, step: 0.5 },
  { group: 'Ironbacks', path: 'ironback.ramDamage', label: 'Ram damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Ironbacks', path: 'ironback.flipTime', label: 'Time on its back', min: 0.5, max: 6, step: 0.1 },
  { group: 'Ironbacks', path: 'ironback.buckAfter', label: 'Hits from behind before it bucks', min: 1, max: 6, step: 1 },

  { group: 'Keep Guards', path: 'keepguard.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Keep Guards', path: 'keepguard.turnRate', label: 'Turn speed (lower: he can be run round)', min: 1, max: 9, step: 0.1 },
  { group: 'Keep Guards', path: 'keepguard.blockArc', label: 'Shield width (each side of his front)', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'Keep Guards', path: 'keepguard.windup', label: 'Thrust warning time', min: 0.2, max: 2, step: 0.05 },
  { group: 'Keep Guards', path: 'keepguard.counterWindup', label: 'Warning time when he strikes back', min: 0.2, max: 2, step: 0.05 },
  { group: 'Keep Guards', path: 'keepguard.counterAfter', label: 'Blows on his shield before he strikes back', min: 1, max: 6, step: 1 },
  { group: 'Keep Guards', path: 'keepguard.recover', label: 'Open after a thrust that missed', min: 0.3, max: 3, step: 0.05 },
  { group: 'Keep Guards', path: 'keepguard.brokenParry', label: 'Open after a perfect guard', min: 0.5, max: 6, step: 0.1 },
  { group: 'Keep Guards', path: 'keepguard.damage', label: 'Thrust damage (hearts)', min: 0, max: 5, step: 1 },

  { group: 'Mantises', path: 'mantis.hp', label: 'Health', min: 1, max: 14, step: 1, later: 'from the next level' },
  { group: 'Mantises', path: 'mantis.windup', label: 'Warning before the first cut', min: 0.2, max: 2, step: 0.05 },
  { group: 'Mantises', path: 'mantis.quick', label: 'Warning before a quick second cut', min: 0.1, max: 1.5, step: 0.02 },
  { group: 'Mantises', path: 'mantis.delayed', label: 'Warning before a held second cut', min: 0.2, max: 2, step: 0.02 },
  { group: 'Mantises', path: 'mantis.comboChance', label: 'How often a second cut follows', min: 0, max: 1, step: 0.05 },
  { group: 'Mantises', path: 'mantis.delayChance', label: 'How often the second cut is held', min: 0, max: 1, step: 0.05 },
  { group: 'Mantises', path: 'mantis.recover', label: 'Open after its cuts', min: 0.3, max: 3, step: 0.05 },
  { group: 'Mantises', path: 'mantis.leapWindup', label: 'Warning before a leap', min: 0.2, max: 2, step: 0.05 },
  { group: 'Mantises', path: 'mantis.stuck', label: 'Stuck in the floor after a leap that missed', min: 0.3, max: 4, step: 0.05 },
  { group: 'Mantises', path: 'mantis.leapDamage', label: 'Leap damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Mantises', path: 'mantis.evadeCooldown', label: 'Rest between hops out of reach', min: 0.5, max: 10, step: 0.1 },
  { group: 'Mantises', path: 'mantis.escapeAfter', label: 'Hits in a row before it springs away', min: 1, max: 6, step: 1 },
  { group: 'Mantises', path: 'mantis.reel', label: 'Open after a perfect guard', min: 0.5, max: 6, step: 0.1 },

  { group: 'Stag Knights', path: 'stag.hp', label: 'Health', min: 1, max: 24, step: 1, later: 'from the next level' },
  { group: 'Stag Knights', path: 'stag.speed', label: 'Walking speed', min: 0.5, max: 4, step: 0.1 },
  { group: 'Stag Knights', path: 'stag.turnRate', label: 'Turn speed (lower: easier to get behind)', min: 0.5, max: 6, step: 0.1 },
  { group: 'Stag Knights', path: 'stag.windup', label: 'Warning before the slam', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'Stag Knights', path: 'stag.slamDamage', label: 'Slam damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Stag Knights', path: 'stag.stuck', label: 'Stuck after a slam', min: 0.3, max: 4, step: 0.05 },
  { group: 'Stag Knights', path: 'stag.sweepWindup', label: 'Warning before the sweep', min: 0.2, max: 2, step: 0.05 },
  { group: 'Stag Knights', path: 'stag.sweepChance', label: 'Close in front: how often it sweeps, not slams', min: 0, max: 1, step: 0.05 },
  { group: 'Stag Knights', path: 'stag.behindTime', label: 'Seconds he may stand behind it before it stomps', min: 0.2, max: 4, step: 0.1 },
  { group: 'Stag Knights', path: 'stag.stompWindup', label: 'Warning before the stomp', min: 0.2, max: 2, step: 0.05 },
  { group: 'Stag Knights', path: 'stag.poise', label: 'Quick blows that put it on one knee', min: 1, max: 12, step: 1 },
  { group: 'Stag Knights', path: 'stag.kneel', label: 'How long it is down', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Widow', path: 'widow.hp', label: 'Health', min: 4, max: 80, step: 1, later: 'from the next level' },
  { group: 'The Widow', path: 'widow.rageAt', label: 'Angry below this much of her health', min: 0, max: 1, step: 0.05 },
  { group: 'The Widow', path: 'widow.legPart', label: 'A blow on a foot counts this much', min: 0, max: 2, step: 0.05 },
  { group: 'The Widow', path: 'widow.headDouble', label: 'A blow on her head counts this many times', min: 0.5, max: 5, step: 0.5 },
  { group: 'The Widow', path: 'widow.crawl', label: 'How fast she goes round the rim', min: 0, max: 3, step: 0.05 },
  { group: 'The Widow', path: 'widow.legReach', label: 'How far a leg reaches', min: 4, max: 30, step: 0.5 },
  { group: 'The Widow', path: 'widow.slamWind', label: 'Warning before the slam (the ring)', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'The Widow', path: 'widow.slamTrack', label: 'How much of that the ring follows him', min: 0, max: 0.95, step: 0.05 },
  { group: 'The Widow', path: 'widow.slamDamage', label: 'Slam damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Widow', path: 'widow.slamStuck', label: 'Foot stuck after a slam', min: 0.2, max: 3, step: 0.05 },
  { group: 'The Widow', path: 'widow.sweepWind', label: 'Warning before the sweep (the leg laid out)', min: 0.1, max: 2, step: 0.05 },
  { group: 'The Widow', path: 'widow.sweepRate', label: 'Speed of the sweep', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Widow', path: 'widow.sweepRateRage', label: '...when she is angry', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Widow', path: 'widow.sweepDamage', label: 'Sweep damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Widow', path: 'widow.stabWind', label: 'Warning before the first stab', min: 0.24, max: 2, step: 0.02 },
  { group: 'The Widow', path: 'widow.stabGap', label: 'Warning before each stab after it', min: 0.2, max: 1.5, step: 0.02 },
  { group: 'The Widow', path: 'widow.stabStuck', label: 'Foot stuck after a stab', min: 0.2, max: 3, step: 0.05 },
  { group: 'The Widow', path: 'widow.biteWind', label: 'Warning before the bite (the big ring)', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'The Widow', path: 'widow.biteReach', label: 'How far her head can come (beyond: a leg instead)', min: 2, max: 28, step: 0.5 },
  { group: 'The Widow', path: 'widow.biteDamage', label: 'Bite damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Widow', path: 'widow.biteStuck', label: 'Her head lying there after a bite', min: 0.3, max: 4, step: 0.05 },
  { group: 'The Widow', path: 'widow.reel', label: 'Thrown down by a perfect guard', min: 0.5, max: 5, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.hp', label: 'Health', min: 4, max: 60, step: 1, later: 'from the next level' },
  { group: 'The Broodmother', path: 'brood.speed', label: 'Walking speed', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Broodmother', path: 'brood.turnRate', label: 'Turn speed (lower: easier to get behind)', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Broodmother', path: 'brood.stabWind', label: 'Warning before the first stab', min: 0.24, max: 2, step: 0.02 },
  { group: 'The Broodmother', path: 'brood.stabGap', label: 'Warning before each stab after it', min: 0.2, max: 1.5, step: 0.02 },
  { group: 'The Broodmother', path: 'brood.stabStuck', label: 'Spikes stuck after the last stab', min: 0.3, max: 3, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.sweepWind', label: 'Warning before the scissor', min: 0.3, max: 2, step: 0.02 },
  { group: 'The Broodmother', path: 'brood.sweepChance', label: 'Close in front: how often she scissors, not stabs', min: 0, max: 1, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.leapWind', label: 'Warning before the pounce', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.slamDamage', label: 'Pounce and drop damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Broodmother', path: 'brood.stuck', label: 'In a heap after a pounce', min: 0.3, max: 4, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.behindTime', label: 'Seconds he may stand behind her before she whirls', min: 0.2, max: 4, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.rageAt', label: 'Angry below this much of her health', min: 0, max: 1, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.hangSpeed', label: 'On the thread: how fast she follows him', min: 1, max: 9, step: 0.1 },
  { group: 'The Broodmother', path: 'brood.dropTell', label: 'Warning before she drops', min: 0.2, max: 2, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.dropStuck', label: 'In a heap after a drop', min: 0.3, max: 5, step: 0.05 },
  { group: 'The Broodmother', path: 'brood.poise', label: 'Quick blows that put her down', min: 1, max: 16, step: 1 },
  { group: 'The Broodmother', path: 'brood.kneel', label: 'How long she is down', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Sump Wyrm', path: 'wyrm.hp', label: 'Health', min: 4, max: 80, step: 1, later: 'from the next level' },
  { group: 'The Sump Wyrm', path: 'wyrm.speed', label: 'Crawling speed', min: 1, max: 9, step: 0.1 },
  { group: 'The Sump Wyrm', path: 'wyrm.orbit', label: 'How far off it circles him', min: 2, max: 12, step: 0.5 },
  { group: 'The Sump Wyrm', path: 'wyrm.biteWind', label: 'Warning before the bite', min: 0.25, max: 2, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.reel', label: 'Reeling after a perfect guard', min: 0.4, max: 4, step: 0.1 },
  { group: 'The Sump Wyrm', path: 'wyrm.chargeWind', label: 'Warning before the charge', min: 0.3, max: 2.5, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.chargeSpeed', label: 'Charge speed', min: 6, max: 24, step: 0.5 },
  { group: 'The Sump Wyrm', path: 'wyrm.chargeDamage', label: 'Charge damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Sump Wyrm', path: 'wyrm.chargeChance', label: 'Far off: how often it charges, not comes in to bite', min: 0, max: 1, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.stunned', label: 'Stunned after running into a wall', min: 0.5, max: 6, step: 0.1 },
  { group: 'The Sump Wyrm', path: 'wyrm.soft', label: 'Head hit while helpless: times the harm', min: 1, max: 4, step: 0.5 },
  { group: 'The Sump Wyrm', path: 'wyrm.tailTime', label: 'Seconds he may hang about its tail before it lashes', min: 0.2, max: 4, step: 0.1 },
  { group: 'The Sump Wyrm', path: 'wyrm.whipWind', label: 'Warning before the lash', min: 0.2, max: 2, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.rageAt', label: 'Angry below this much of its health', min: 0, max: 1, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.coilWind', label: 'Coil: warning once it has closed', min: 0.25, max: 2, step: 0.05 },
  { group: 'The Sump Wyrm', path: 'wyrm.squeezeDamage', label: 'Coil damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'The Sump Wyrm', path: 'wyrm.spent', label: 'Spent after the coil', min: 0.5, max: 5, step: 0.1 },

  { group: 'Hornet Lancers', path: 'hornet.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Hornet Lancers', path: 'hornet.hover', label: 'How high it hangs', min: 1.5, max: 5, step: 0.1 },
  { group: 'Hornet Lancers', path: 'hornet.standOff', label: 'How far off it hangs', min: 3, max: 12, step: 0.1 },
  { group: 'Hornet Lancers', path: 'hornet.diveWind', label: 'Warning before a dive', min: 0.2, max: 2, step: 0.05 },
  { group: 'Hornet Lancers', path: 'hornet.diveTrack', label: 'How much of that warning it follows him for', min: 0, max: 1, step: 0.05 },
  { group: 'Hornet Lancers', path: 'hornet.diveSpeed', label: 'Dive speed', min: 6, max: 30, step: 0.5 },
  { group: 'Hornet Lancers', path: 'hornet.diveDamage', label: 'Dive damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Hornet Lancers', path: 'hornet.stuck', label: 'Lance stuck in the floor (the opening)', min: 0.3, max: 4, step: 0.1 },
  { group: 'Hornet Lancers', path: 'hornet.joustChance', label: 'How often it runs at him instead', min: 0, max: 1, step: 0.05 },
  { group: 'Hornet Lancers', path: 'hornet.joustWind', label: 'Warning before a run', min: 0.2, max: 2, step: 0.05 },
  { group: 'Hornet Lancers', path: 'hornet.joustSpeed', label: 'Run speed', min: 5, max: 25, step: 0.5 },
  { group: 'Hornet Lancers', path: 'hornet.joustDamage', label: 'Run damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Hornet Lancers', path: 'hornet.grounded', label: 'Time on the floor when struck', min: 0.3, max: 4, step: 0.1 },
  { group: 'Hornet Lancers', path: 'hornet.groundedParried', label: 'Time on the floor after a perfect guard', min: 0.3, max: 6, step: 0.1 },

  { group: 'Ant Pikemen', path: 'ant.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Ant Pikemen', path: 'ant.pairRange', label: 'Two this near each other fight as a pair', min: 4, max: 30, step: 1 },
  { group: 'Ant Pikemen', path: 'ant.holdRange', label: 'How far off it stands', min: 2, max: 5, step: 0.1 },
  { group: 'Ant Pikemen', path: 'ant.flankSpeed', label: 'How fast one goes round behind him', min: 1, max: 8, step: 0.1 },
  { group: 'Ant Pikemen', path: 'ant.turnRate', label: 'How fast it turns to keep its point on him', min: 1, max: 10, step: 0.5 },
  { group: 'Ant Pikemen', path: 'ant.windup', label: 'Warning before a thrust', min: 0.2, max: 1.5, step: 0.05 },
  { group: 'Ant Pikemen', path: 'ant.track', label: 'How much of that warning it follows him for', min: 0, max: 1, step: 0.05 },
  { group: 'Ant Pikemen', path: 'ant.pikeOut', label: 'How far the thrust reaches', min: 2.3, max: 4, step: 0.1 },
  { group: 'Ant Pikemen', path: 'ant.damage', label: 'Thrust damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Ant Pikemen', path: 'ant.recover', label: 'Stretched out after a thrust that misses (the opening)', min: 0.2, max: 3, step: 0.1 },
  { group: 'Ant Pikemen', path: 'ant.crowdRange', label: 'Nearer than this it cannot thrust', min: 1.6, max: 3, step: 0.1 },
  { group: 'Ant Pikemen', path: 'ant.biteWind', label: 'Warning before a bite', min: 0.1, max: 1.2, step: 0.02 },
  { group: 'Ant Pikemen', path: 'ant.biteDamage', label: 'Bite damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Ant Pikemen', path: 'ant.reel', label: 'Open after a perfect guard', min: 0.3, max: 5, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  { group: 'Firefly Bombers', path: 'firefly.height', label: 'How high it flies', min: 2.5, max: 6, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.standOff', label: 'How far off it flies round him', min: 3, max: 12, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.runWind', label: 'Warning before a bombing run', min: 0.2, max: 2, step: 0.05 },
  { group: 'Firefly Bombers', path: 'firefly.runTrack', label: 'How much of that warning it follows him for', min: 0, max: 1, step: 0.05 },
  { group: 'Firefly Bombers', path: 'firefly.lead', label: 'How far ahead of him it aims (0 where he is, 1 where he will be)', min: 0, max: 1.2, step: 0.05 },
  { group: 'Firefly Bombers', path: 'firefly.runSpeed', label: 'Run speed', min: 6, max: 20, step: 0.5 },
  { group: 'Firefly Bombers', path: 'firefly.bombs', label: 'Drops of fire in a run', min: 1, max: 5, step: 1 },
  { group: 'Firefly Bombers', path: 'firefly.bombGap', label: 'How far apart they land', min: 1, max: 5, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.flameRadius', label: 'How wide the flames are', min: 0.4, max: 2, step: 0.05 },
  { group: 'Firefly Bombers', path: 'firefly.flameTime', label: 'How long the flames burn', min: 0.5, max: 8, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.burn', label: 'Burn damage (hearts)', min: 0, max: 5, step: 1 },
  { group: 'Firefly Bombers', path: 'firefly.runs', label: 'Runs before its light is spent', min: 1, max: 6, step: 1 },
  { group: 'Firefly Bombers', path: 'firefly.rest', label: 'Hanging low with its light out (the opening)', min: 0.5, max: 8, step: 0.1 },
  { group: 'Firefly Bombers', path: 'firefly.grounded', label: 'Time on the floor when struck', min: 0.3, max: 4, step: 0.1 },
  { group: 'Flitters', path: 'bat.hp', label: 'Health', min: 1, max: 6, step: 1, later: 'from the next level' },
  { group: 'Flitters', path: 'bat.hear', label: 'Hears footsteps from', min: 1, max: 16, step: 0.5 },
  { group: 'Flitters', path: 'bat.hearQuiet', label: 'Hears sneaking from', min: 0, max: 8, step: 0.25 },
  { group: 'Flitters', path: 'bat.swoopWind', label: 'Swoop warning time', min: 0.2, max: 2, step: 0.05 },
  { group: 'Flitters', path: 'bat.swoopTime', label: 'Swoop length (time)', min: 0.4, max: 2, step: 0.05 },
  { group: 'Flitters', path: 'bat.swoopEase', label: 'Slows at the bottom', min: 0, max: 0.9, step: 0.05 },
  { group: 'Flitters', path: 'bat.grounded', label: 'Time on the floor when struck', min: 0.3, max: 4, step: 0.1 },

  { group: 'Grimsqueak', path: 'grim.hp', label: 'Health', min: 4, max: 40, step: 1, later: 'from the next level' },
  { group: 'Grimsqueak', path: 'grim.poise', label: 'Hits before he bursts away', min: 1, max: 8, step: 1 },
  { group: 'Grimsqueak', path: 'grim.orbitSpeed', label: 'Circling speed', min: 1, max: 8, step: 0.1 },
  { group: 'Grimsqueak', path: 'grim.volley.boltSpeed', label: 'Bolt speed', min: 3, max: 20, step: 0.5 },
  { group: 'Grimsqueak', path: 'grim.swoop.speed', label: 'Swoop speed', min: 5, max: 30, step: 0.5 },
  { group: 'Grimsqueak', path: 'grim.slam.ringSpeed', label: 'Slam ring speed', min: 3, max: 20, step: 0.5 },
  { group: 'Grimsqueak', path: 'grim.orb.speed', label: 'Orb speed', min: 2, max: 15, step: 0.25 },

  { group: 'Camera', path: 'camera.distance', label: 'Distance', min: 2, max: 10, step: 0.1 },
  { group: 'Camera', path: 'camera.targetHeight', label: 'Height it looks at', min: 0, max: 2.5, step: 0.05 },
  { group: 'Camera', path: 'camera.turnSpeed', label: 'Turn speed', min: 0.5, max: 6, step: 0.1 },
  { group: 'Camera', path: 'camera.autoFollowRate', label: 'Swings behind him as he moves (0: only the right stick turns it)', min: 0, max: 5, step: 0.1 },
  { group: 'Camera', path: 'camera.lookUp', label: 'Looking up: how much further the stick tilts it past its lowest (0: it stops there)', min: 0, max: 1, step: 0.05 },
  { group: 'Camera', path: 'camera.lookUpTilt', label: 'Looking up: how far it tilts up', min: 0, max: 0.8, step: 0.02 },
  { group: 'Camera', path: 'camera.lookAhead', label: 'Looks ahead', min: 0, max: 0.6, step: 0.01 },
  { group: 'Camera', path: 'camera.heightRate', label: 'Follows jumps', min: 0.5, max: 20, step: 0.5 },
  { group: 'Camera', path: 'camera.liftMaxPitch', label: 'Rises to look over a low thing behind him: how steeply it may (0: never, it closes in)', min: 0, max: 1.4, step: 0.05 },
  { group: 'Camera', path: 'camera.squeezeRise', label: 'A wall right behind him: how far up over his head it goes (0: it stays in the back of his head)', min: 0, max: 3, step: 0.1 },

  { group: 'Doors and prices', path: 'balance.doors.foundry', label: 'Foundry door: wedges', min: 0, max: 47, step: 1, later: 'next time you are in the Club' },
  { group: 'Doors and prices', path: 'balance.doors.hollows', label: 'Hollows door: wedges', min: 0, max: 47, step: 1, later: 'next time you are in the Club' },
  { group: 'Doors and prices', path: 'balance.doors.keep', label: 'Keep door: wedges', min: 0, max: 47, step: 1, later: 'next time you are in the Club' },
  { group: 'Doors and prices', path: 'balance.prices.nachoCheese.crumbs', label: 'Nacho cheese: crumbs', min: 0, max: 60, step: 1 },
  { group: 'Doors and prices', path: 'crates.chance', label: 'Chance a broken crate or barrel drops a nacho can', min: 0, max: 1, step: 0.05 },
  { group: 'Doors and prices', path: 'balance.prices.mossScarf.crumbs', label: 'Moss scarf: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.minerHelm.crumbs', label: "Miner's helm: crumbs", min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.minerHelm.caps', label: "Miner's helm: caps", min: 0, max: 45, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.sludgeScarf.crumbs', label: 'Sludge scarf: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.sludgeScarf.caps', label: 'Sludge scarf: caps', min: 0, max: 45, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.buckler.crumbs', label: 'Buckler: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.buckler.caps', label: 'Buckler: caps', min: 0, max: 45, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.emberHelm.crumbs', label: 'Ember helm: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.emberHelm.caps', label: 'Ember helm: caps', min: 0, max: 45, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.cleaver.crumbs', label: 'Cleaver: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.cleaver.caps', label: 'Cleaver: caps', min: 0, max: 45, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.royalScarf.crumbs', label: 'Royal scarf: crumbs', min: 0, max: 150, step: 1 },
  { group: 'Doors and prices', path: 'balance.prices.royalScarf.caps', label: 'Royal scarf: caps', min: 0, max: 45, step: 1 },
];

/**
 * The panel's sections, and the groups under each, in the order they are shown. A group of sliders that is not named
 * here is still shown (under "More"): the list of groups is read from the sliders themselves, so none can be left out.
 * (It used to be a list kept by hand, and six groups of creature sliders were never on it.)
 */
export const TWEAK_SECTIONS: Array<{ title: string; groups: string[] }> = [
  { title: 'The knight', groups: ['Moving', 'Jumping', 'Moves', 'Riding', 'Ice', 'Fighting', 'Camera'] },
  { title: 'Creatures', groups: ['Roaches', 'Toads', 'Ironbacks', 'Flitters', 'Keep Guards', 'Mantises', 'Stag Knights', 'Hornet Lancers', 'Ant Pikemen', 'Firefly Bombers'] },
  { title: 'Bosses', groups: ['The Sump Wyrm', 'The Broodmother', 'The Widow', 'Grimsqueak'] },
  { title: 'The game', groups: ['Doors and prices'] },
];
/** Every group that has a slider, sections first. */
export const TWEAK_GROUPS: string[] = (() => {
  const named = TWEAK_SECTIONS.flatMap((sec) => sec.groups);
  const all = [...new Set(TWEAKS.map((t) => t.group))];
  return [...named.filter((g) => all.includes(g)), ...all.filter((g) => !named.includes(g))];
})();

type Table = Record<string, unknown>;
const ROOTS: Record<string, Table> = { toad: TOAD as unknown as Table, ironback: IRONBACK as unknown as Table, keepguard: GUARD as unknown as Table, mantis: MANTIS as unknown as Table, hornet: HORNET as unknown as Table, ant: ANT as unknown as Table, firefly: FIREFLY as unknown as Table, stag: STAG as unknown as Table, brood: BROOD as unknown as Table, widow: WIDOW as unknown as Table, wyrm: WYRM as unknown as Table, crates: CRATE_DROPS[0] as unknown as Table, bat: BAT as unknown as Table, grim: GRIM as unknown as Table, balance: BALANCE as unknown as Table };

/**
 * Sets to try: a few sliders moved together, for a question that takes more than one of them. The jump sets are
 * for the Move Garden (reports/Super Mario 64 design research.md: Mario's wall kick out-climbs his second jump; the
 * knight's double jump out-climbs his wall kick). Using a set puts every slider that any set moves back to its
 * default first, so the sets do not pile up on one another.
 */
export interface TweakSet {
  id: string;
  name: string;
  note: string;
  values: Record<string, number>;
}
export const JUMP_SETS: TweakSet[] = [
  { id: 'asis', name: 'As it is', note: 'The game as it is: a double jump reaches 4.6, a wall kick climbs 2.8.', values: {} },
  { id: 'kick', name: 'Stronger wall kick', note: 'A wall kick climbs 3.9 where it climbed 2.8. Nothing else changes.', values: { 'moves.wallKickUp': 12 } },
  { id: 'double', name: 'Smaller double jump', note: 'A double jump reaches 3.4 where it reached 4.6. Nothing else changes.', values: { 'jump.doubleVelocity': 6 } },
  { id: 'both', name: 'Both', note: 'A wall kick climbs 3.9 and a double jump reaches 3.4: the wall is the way up.', values: { 'moves.wallKickUp': 12, 'jump.doubleVelocity': 6 } },
  { id: 'mario', name: "Mario's proportions", note: 'For his size, what Mario has: a double jump that reaches 3 and a wall kick that climbs 3.4.', values: { 'moves.wallKickUp': 11, 'jump.doubleVelocity': 4.5 } },
];

/** The table and key a path points at: "toad.hp" is in TOAD, "jump.velocity" in TUNING. */
function locate(path: string): { obj: Table; key: string } | null {
  const parts = path.split('.');
  let obj: Table = TUNING as unknown as Table;
  if (ROOTS[parts[0]]) obj = ROOTS[parts.shift()!];
  for (let i = 0; i < parts.length - 1; i++) {
    const next = obj[parts[i]];
    if (!next || typeof next !== 'object') return null;
    obj = next as Table;
  }
  const key = parts[parts.length - 1];
  return typeof obj[key] === 'number' ? { obj, key } : null;
}

export function readTweak(path: string): number {
  const at = locate(path);
  return at ? (at.obj[at.key] as number) : NaN;
}

/** The values the game shipped with, taken before anything is changed. */
const DEFAULTS: Record<string, number> = Object.fromEntries(TWEAKS.map((t) => [t.path, readTweak(t.path)]));

export function defaultTweak(path: string): number {
  return DEFAULTS[path];
}

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Tweaks {
  private changed: Record<string, number> = {};

  constructor(private readonly storage: Store | null) {
    try {
      const d = JSON.parse(storage?.getItem(TWEAKS_KEY) ?? '{}') as Record<string, unknown>;
      for (const t of TWEAKS) if (typeof d[t.path] === 'number') this.apply(t, d[t.path] as number);
    } catch {
      // Broken saved tweaks are ignored.
    }
  }

  get(path: string): number {
    return readTweak(path);
  }

  isChanged(path: string): boolean {
    return path in this.changed;
  }

  count(): number {
    return Object.keys(this.changed).length;
  }

  set(path: string, value: number): void {
    const t = TWEAKS.find((x) => x.path === path);
    if (!t) return;
    this.apply(t, value);
    this.save();
  }

  reset(path?: string): void {
    for (const t of TWEAKS) if (!path || t.path === path) this.apply(t, DEFAULTS[t.path]);
    this.save();
  }

  /** Uses a set: every slider any of `sets` moves goes back to its default, then this set's are put on. */
  useSet(set: TweakSet, sets: TweakSet[]): void {
    const paths = new Set(sets.flatMap((s) => Object.keys(s.values)));
    for (const t of TWEAKS) if (paths.has(t.path)) this.apply(t, set.values[t.path] ?? DEFAULTS[t.path]);
    this.save();
  }

  /** Which of `sets` the sliders are at now (every slider the sets move is where that set puts it), or null. */
  activeSet(sets: TweakSet[]): TweakSet | null {
    const paths = [...new Set(sets.flatMap((s) => Object.keys(s.values)))];
    return sets.find((s) => paths.every((p) => Math.abs(readTweak(p) - (s.values[p] ?? DEFAULTS[p])) < 1e-9)) ?? null;
  }

  /** The changed values as text: what to send to Claude to make them the game's defaults. */
  text(): string {
    const lines = TWEAKS.filter((t) => this.changed[t.path] !== undefined).map((t) => `  ${t.group} / ${t.label}: ${DEFAULTS[t.path]} -> ${this.changed[t.path]}   (${t.path})`);
    return lines.length ? `RatQuest tweaks (make these the defaults):\n${lines.join('\n')}\nJSON: ${JSON.stringify(this.changed)}` : 'No tweaks: everything is at the default.';
  }

  /** Takes a JSON object of {path: value} (as in the text above) and applies it. Returns how many were used. */
  load(json: string): number {
    const m = /\{[\s\S]*\}/.exec(json);
    if (!m) return 0;
    let n = 0;
    try {
      const d = JSON.parse(m[0]) as Record<string, unknown>;
      for (const t of TWEAKS) {
        if (typeof d[t.path] === 'number') {
          this.apply(t, d[t.path] as number);
          n++;
        }
      }
    } catch {
      return 0;
    }
    this.save();
    return n;
  }

  private apply(t: TweakDef, value: number): void {
    const at = locate(t.path);
    if (!at || !Number.isFinite(value)) return;
    const v = Math.min(t.max, Math.max(t.min, Math.round(value / t.step) * t.step));
    const clean = Number(v.toFixed(4));
    at.obj[at.key] = clean;
    if (Math.abs(clean - DEFAULTS[t.path]) < 1e-9) delete this.changed[t.path];
    else this.changed[t.path] = clean;
  }

  private save(): void {
    try {
      this.storage?.setItem(TWEAKS_KEY, JSON.stringify(this.changed));
    } catch {
      // Saving is best effort.
    }
  }
}
