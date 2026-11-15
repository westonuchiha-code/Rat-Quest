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
import { WYRM } from '../enemies/wyrm';
import { CRATE_DROPS } from '../data/consumables';
import { BAT } from '../enemies/bat';
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

  { group: 'Fighting', path: 'health.max', label: 'Hearts', min: 1, max: 12, step: 1, later: 'after the game restarts' },
  { group: 'Fighting', path: 'health.invulnTime', label: 'Safe time after a hit', min: 0.2, max: 3, step: 0.05 },
  { group: 'Fighting', path: 'health.knockback', label: 'Knockback when hit', min: 0, max: 15, step: 0.5 },
  { group: 'Fighting', path: 'guard.parryWindow', label: 'Parry window', min: 0.04, max: 0.5, step: 0.01 },
  { group: 'Fighting', path: 'guard.moveMultiplier', label: 'Speed with shield up', min: 0.1, max: 1, step: 0.05 },
  { group: 'Fighting', path: 'dodge.roll.speed', label: 'Roll speed', min: 3, max: 14, step: 0.1 },
  { group: 'Fighting', path: 'dodge.roll.duration', label: 'Roll length (time)', min: 0.2, max: 1, step: 0.02 },
  { group: 'Fighting', path: 'dodge.cooldown', label: 'Wait between rolls', min: 0, max: 1.5, step: 0.05 },
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
  { group: 'Camera', path: 'camera.lookAhead', label: 'Looks ahead', min: 0, max: 0.6, step: 0.01 },
  { group: 'Camera', path: 'camera.heightRate', label: 'Follows jumps', min: 0.5, max: 20, step: 0.5 },

  { group: 'Doors and prices', path: 'balance.doors.foundry', label: 'Foundry door: wedges', min: 0, max: 38, step: 1, later: 'next time you are in the Club' },
  { group: 'Doors and prices', path: 'balance.doors.hollows', label: 'Hollows door: wedges', min: 0, max: 38, step: 1, later: 'next time you are in the Club' },
  { group: 'Doors and prices', path: 'balance.doors.keep', label: 'Keep door: wedges', min: 0, max: 38, step: 1, later: 'next time you are in the Club' },
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
  { title: 'The knight', groups: ['Moving', 'Jumping', 'Moves', 'Fighting', 'Camera'] },
  { title: 'Creatures', groups: ['Roaches', 'Toads', 'Ironbacks', 'Flitters', 'Keep Guards', 'Mantises', 'Stag Knights'] },
  { title: 'Bosses', groups: ['The Sump Wyrm', 'The Broodmother', 'Grimsqueak'] },
  { title: 'The game', groups: ['Doors and prices'] },
];
/** Every group that has a slider, sections first. */
export const TWEAK_GROUPS: string[] = (() => {
  const named = TWEAK_SECTIONS.flatMap((sec) => sec.groups);
  const all = [...new Set(TWEAKS.map((t) => t.group))];
  return [...named.filter((g) => all.includes(g)), ...all.filter((g) => !named.includes(g))];
})();

type Table = Record<string, unknown>;
const ROOTS: Record<string, Table> = { toad: TOAD as unknown as Table, ironback: IRONBACK as unknown as Table, keepguard: GUARD as unknown as Table, mantis: MANTIS as unknown as Table, stag: STAG as unknown as Table, brood: BROOD as unknown as Table, wyrm: WYRM as unknown as Table, crates: CRATE_DROPS[0] as unknown as Table, bat: BAT as unknown as Table, grim: GRIM as unknown as Table, balance: BALANCE as unknown as Table };

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
