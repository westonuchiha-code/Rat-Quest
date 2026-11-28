/**
 * An example set of tweaks for a 3D platformer, in the words Rat Quest uses: a tuning table the game reads, sliders
 * pointed into it, sections, and jump presets. Copy it and change the numbers to your game's.
 */
import { TweakRegistry, type JumpParams } from '../src/index';

/** The game's tuning: it reads these every frame, so the sliders change the game at once. */
export const TUNING = {
  move: { walk: 3.2, run: 6.5, groundAccel: 40, groundDecel: 45, airAccel: 14, turnRate: 14 },
  jump: { velocity: 9.5, doubleVelocity: 8.5, airJumps: 1, cutMultiplier: 0.4, coyoteTime: 0.12 },
  physics: { gravity: 24, fallGravityMultiplier: 1.6, maxFall: 30 },
  moves: { longJumpSpeed: 11, longJumpUp: 6, wallKickUp: 10.5, wallKickPush: 6.5, wallKickWindow: 0.18 },
  rat: { radius: 0.3 },
};

export function makeTweaks(storageKey = 'example.tweaks.v1'): TweakRegistry {
  const reg = new TweakRegistry({
    storageKey,
    root: TUNING,
    heading: 'Example tweaks (make these the defaults):',
    sections: [{ title: 'The player', groups: ['Moving', 'Jumping', 'Moves'] }],
    presets: [
      {
        title: 'Jump sets to try',
        groups: ['Jumping', 'Moves'],
        presets: [
          { id: 'asis', name: 'As it is', note: 'The game as it is.', values: {} },
          { id: 'kick', name: 'Stronger wall kick', note: 'A wall kick climbs higher. Nothing else changes.', values: { 'moves.wallKickUp': 12 } },
          { id: 'double', name: 'Smaller double jump', note: 'A double jump reaches less high. Nothing else changes.', values: { 'jump.doubleVelocity': 6 } },
          { id: 'both', name: 'Both', note: 'The wall is the way up.', values: { 'moves.wallKickUp': 12, 'jump.doubleVelocity': 6 } },
        ],
      },
    ],
  });
  reg.define([
    { group: 'Moving', key: 'move.walk', label: 'Walk speed', min: 1, max: 8, step: 0.1 },
    { group: 'Moving', key: 'move.run', label: 'Run speed', min: 2, max: 14, step: 0.1 },
    { group: 'Moving', key: 'move.groundAccel', label: 'Speed-up on the ground', min: 5, max: 80, step: 1 },
    { group: 'Moving', key: 'move.groundDecel', label: 'Slow-down on the ground', min: 5, max: 80, step: 1 },
    { group: 'Moving', key: 'move.airAccel', label: 'Steering in the air', min: 2, max: 40, step: 1 },
    { group: 'Moving', key: 'move.turnRate', label: 'Turning speed', min: 3, max: 30, step: 0.5 },
    { group: 'Jumping', key: 'jump.velocity', label: 'Jump power', min: 5, max: 16, step: 0.1 },
    { group: 'Jumping', key: 'jump.doubleVelocity', label: 'Double-jump power', min: 4, max: 16, step: 0.1 },
    { group: 'Jumping', key: 'jump.airJumps', label: 'Jumps in the air', min: 0, max: 3, step: 1 },
    { group: 'Jumping', key: 'physics.gravity', label: 'Gravity', min: 8, max: 40, step: 0.5 },
    { group: 'Jumping', key: 'physics.fallGravityMultiplier', label: 'Extra pull when falling', min: 1, max: 3, step: 0.05 },
    { group: 'Jumping', key: 'jump.cutMultiplier', label: 'Short hop', help: 'Lower is shorter; Mario 64 is 0.25', min: 0.1, max: 1, step: 0.05 },
    { group: 'Jumping', key: 'jump.coyoteTime', label: 'Grace after leaving a ledge', min: 0, max: 0.4, step: 0.01 },
    { group: 'Jumping', key: 'physics.maxFall', label: 'Top falling speed', min: 10, max: 60, step: 1 },
    { group: 'Moves', key: 'moves.longJumpSpeed', label: 'Long jump speed', min: 6, max: 18, step: 0.25 },
    { group: 'Moves', key: 'moves.longJumpUp', label: 'Long jump height', min: 3, max: 12, step: 0.1 },
    { group: 'Moves', key: 'moves.wallKickUp', label: 'Wall kick height', min: 5, max: 16, step: 0.25 },
    { group: 'Moves', key: 'moves.wallKickPush', label: 'Wall kick push', min: 2, max: 14, step: 0.25 },
    { group: 'Moves', key: 'moves.wallKickWindow', label: 'Wall kick timing window', min: 0.04, max: 0.5, step: 0.01 },
    // A tweak with no table behind it: the registry keeps it, and the game reads reg.get('camera.distance').
    { group: 'Camera', key: 'camera.distance', label: 'Camera distance', min: 3, max: 14, step: 0.25, default: 7 },
  ]);
  return reg;
}

/** The jump numbers for the jump checker, read from the table (so they follow the sliders). */
export function jumpParams(): JumpParams {
  return {
    gravity: TUNING.physics.gravity,
    fallGravityMultiplier: TUNING.physics.fallGravityMultiplier,
    jumpVelocity: TUNING.jump.velocity,
    doubleJumpVelocity: TUNING.jump.doubleVelocity,
    airJumps: TUNING.jump.airJumps,
    runSpeed: TUNING.move.run,
    coyoteTime: TUNING.jump.coyoteTime,
    longJumpUp: TUNING.moves.longJumpUp,
    longJumpSpeed: TUNING.moves.longJumpSpeed,
    wallKickUp: TUNING.moves.wallKickUp,
    wallKickPush: TUNING.moves.wallKickPush,
    ledgeGrab: 1.05,
    radius: TUNING.rat.radius,
  };
}
