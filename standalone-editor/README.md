# Standalone Editor

The development tools from Rat Quest, made to fit into any browser game:

- **Tweak registry**: the numbers that set how a game feels, each with a slider's range, a label and a group. Presets move several sliders at once. Changes are saved, and can be copied out as text and pasted back in.
- **Game Feel panel**: groups down the left, sliders on the right, a search box, a "Changed" filter, and copy, paste and reset. Every part of it works with a controller, so it can be used on a TV with a gamepad.
- **Jump arithmetic**: how high, how far, how tall a ledge and how wide a wall-kick chimney, worked out from your game's own jump numbers. It is the same arithmetic Rat Quest's jump checker uses, and a test keeps the two identical.
- **Jump checker**: given your level as solid boxes and a starting point, it works out where the player can get to and lists anything out of reach.
- **Workshop page**: a front page for your tools (Game Feel, Jump check, Warp, Spawn, Actions). It shows only the ones your game provides hooks for.

Nothing in the folder depends on Rat Quest or on any library. It is plain TypeScript and DOM, so copy the folder in and import `src/index.ts`.

## Try it

```
npx vite standalone-editor/demo
```

The demo is a side view of an example game's jumps. Open Game Feel and move a slider: the arcs change at once. Open the Workshop (Start on a pad, or F1) and run the Jump check.

## Embed it

### 1. Define your tweaks

Point each tweak at a number in your tuning table. The slider then writes straight into the table, and your game sees the change on its next frame with no other wiring.

```ts
import { TweakRegistry } from './standalone-editor/src';

export const TUNING = { jump: { velocity: 9.5 }, physics: { gravity: 24 } };
export const ENEMY = { hp: 3 };

export const reg = new TweakRegistry({
  storageKey: 'mygame.tweaks.v1',     // give each game its own
  root: TUNING,                       // "jump.velocity" means TUNING.jump.velocity
  tables: { toad: ENEMY },            // "toad.hp" means ENEMY.hp
  sections: [{ title: 'The player', groups: ['Jumping'] }, { title: 'Creatures', groups: ['Toads'] }],
});

reg.define(
  { group: 'Jumping', key: 'jump.velocity', label: 'Jump power', min: 5, max: 16, step: 0.1 },
  { group: 'Jumping', key: 'physics.gravity', label: 'Gravity', min: 8, max: 40, step: 0.5, help: 'Higher falls faster' },
  { group: 'Toads', key: 'toad.hp', label: 'Health', min: 1, max: 12, step: 1, later: 'from the next level' },
  // No table behind this one: the registry keeps the value. Read it with reg.get('camera.distance').
  { group: 'Camera', key: 'camera.distance', label: 'Camera distance', min: 3, max: 14, step: 0.25, default: 7 },
);
```

If you'd rather have one shared registry, use `defineTweaks({ group, key, label, min, max, step, default, help })`, which adds to the exported `tweaks` registry. Call `tweaks.configure({ ... })` first.

A tweak's fields:

| Field | Meaning |
|---|---|
| `group` | The heading it's listed under ("Jumping"). |
| `key` | A dotted path into your tables, or any unique name. |
| `label` | What the slider says. |
| `min` / `max` / `step` | The slider's range and step. Values are clamped and rounded to them. |
| `default` | The shipped value. Optional when the key points into a table, which already holds it. |
| `help` | A line under the label. |
| `later` | When it takes effect, if not at once ("after a restart"). |

Other calls you may want: `reg.get(key)`, `reg.set(key, v)`, `reg.reset(key?)`, `reg.isChanged(key)`, `reg.count()`, `reg.changes()`, `reg.onChange((key, value) => ...)`, `reg.text()` (the changes as text, for sending on) and `reg.load(text)`.

### 2. Presets

Presets work like Rat Quest's jump sets. A preset moves several sliders together. Using one first puts every slider any preset in that list moves back to its default, so presets don't pile up on each other.

```ts
reg.configure({ presets: [{
  title: 'Jump sets to try',
  groups: ['Jumping', 'Moves'],       // shown at the top of these groups
  presets: [
    { id: 'asis', name: 'As it is', note: 'The game as it is.', values: {} },
    { id: 'kick', name: 'Stronger wall kick', note: 'Nothing else changes.', values: { 'moves.wallKickUp': 12 } },
  ],
}] });
```

### 3. The panel and the controller

```ts
import { TweakPanel, PadNav } from './standalone-editor/src';

const feel = new TweakPanel(gameContainer, reg, { title: 'GAME FEEL', onClose: () => game.resume() });
const nav = new PadNav((a) => {
  if (feel.open) return feel.press(a);
  if (a === 'menu') { game.pause(); feel.show(); }   // Start on the pad, F1 on the keys
});
nav.start();          // polls the pads itself each frame; or call nav.update(dt) from your game loop
```

`gameContainer` should be `position: relative`, because the panel fills it.

The controls (standard gamepad mapping; the keys in brackets):

| | |
|---|---|
| D-pad or left stick (arrows) | Move. Held directions repeat. In the sliders, left and right change the value. |
| A (Enter / Space) | Go into a group, use a preset, press a button. |
| B (Escape / Backspace) | Back: sliders, then groups, then close. |
| X (R) | Put the slider under the cursor back to its default. |
| Y (C) | Copy the changes. |
| L1 / R1 (Page Up / Page Down) | Previous / next group. |
| Start (F1) | Sent to you as `'menu'`, for opening a panel. The panels ignore it. |

If your game already reads the pad, don't let PadNav poll: give it the actions held each frame with `nav.feed(new Set(['up', 'confirm']), dt)`. Turn off its key listener with `new PadNav(fn, { keys: false })`.

### 4. The jump checker and the Workshop (all optional)

Give the Workshop whatever your game can do. Tools you don't give hooks for aren't shown.

```ts
import { ToolsPanel, type JumpParams } from './standalone-editor/src';

const jumpParams = (): JumpParams => ({
  gravity: TUNING.physics.gravity, fallGravityMultiplier: 1.6,
  jumpVelocity: TUNING.jump.velocity, doubleJumpVelocity: 8.5, airJumps: 1,
  runSpeed: 6.5, coyoteTime: 0.12, ledgeGrab: 1.05,
  // optional: longJumpUp, longJumpSpeed, wallKickUp, wallKickPush, radius
});

const tools = new ToolsPanel(gameContainer, {
  jumpParams,                                             // Jump check: the numbers
  level: () => ({ boxes: level.solids, start: level.spawn, targets: level.collectibles }),
  showReach: (map, missing) => drawMarkers(missing),      // optional: show it in the world
  warps: () => [{ id: 'cave', name: 'The cave', group: 'World 1' }],
  warp: (id) => game.loadLevel(id),
  spawns: () => [{ id: 'crate', name: 'A crate' }],
  spawn: (id, at) => game.spawn(id, at),                  // `at` comes from raycast, when given
  raycast: () => game.crosshairHit(),
  actions: () => [{ id: 'heal', name: 'Heal' }],
  act: (id) => (game.heal(), 'Healed.'),
  onClose: () => game.resume(),
}, feel);                                                 // pass the TweakPanel to get the Game Feel card
```

A box is `{ x0, x1, y0, y1, z0, z1 }` with y up. A target is `{ name, x, y, z, r? }`. The jump math can also be used on its own: `jumpReach(p, dh)`, `maxClimb(p)`, `maxChimney(p)`, `jumpHeight(p)`, `fullHeight(p)`, and `jumpArc(p)` for drawing.

**What the checker doesn't do:** it treats nothing in the air as blocking a jump, and it doesn't follow moving platforms or wall kicks. For a moving platform, give it a few boxes along the platform's path. Its answers fall a little short of a perfect jump (`FAIR`, 92%), so "reachable" means a jump a player can actually make.

## Restyling

Every colour and font is a CSS custom property on `.se-root`, for example:

```css
.se-root { --se-gold: #6cf; --se-gold-bg: #0d2a3a; --se-font: "My Font", sans-serif; }
```

## Files

| File | |
|---|---|
| `src/registry.ts` | Tweak registry, presets, saving, copy and paste |
| `src/panel.ts` | Game Feel panel |
| `src/padNav.ts` | Gamepad and keyboard navigation |
| `src/jumpMath.ts` | Jump arithmetic |
| `src/reach.ts` | Jump checker over boxes |
| `src/toolsPanel.ts` | Workshop page and the `EditorHost` hooks |
| `src/style.ts` | The shared look |
| `examples/platformer.ts` | A worked set of platformer tweaks in Rat Quest's words |
| `demo/` | The demo page |

Rat Quest checks it with `tests/standaloneeditor.ts`, which covers the registry, the panels driven by a controller, the jump checker, and an exact match with Rat Quest's own jump arithmetic.
