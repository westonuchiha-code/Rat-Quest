# RATQUEST: THE KINGDOM BELOW - Development Plan

Status: M0 and M1 are built. The M1 feel gate still needs a human playtest on a phone. Build passes (`npm run build`), and headless movement checks pass (`npm run test:sim`). Neither the M0 nor the M1 visuals have been checked in a browser yet.

Work pulled forward from later milestones is in the build as a first pass. The rat has a rounded low-poly model, a spring-driven full-body animation system and foot IK (from M2). It has a three-hit combo with hit detection, health, guard blocking, dodge i-frames, hit-stop and a practice enemy called the Scuttler (from M4/M5). A collectible tracker with saving is in place (from M7). A library of 38 procedural textures covers sewer, tunnel and cave (art).

Headless tests: 76 checks across four suites (movement, combat, layout, collectibles), run with `npm run test:sim`.

## Stack
- Three.js 0.187 + TypeScript + Vite 8.
- Blender for models (glTF 2.0 export) once M2 begins.
- Custom capsule character controller, using three-mesh-bvh when needed. Rapier is deferred.
- Howler.js or a WebAudio wrapper for audio; start only after a user gesture.
- Keyboard plus Gamepad API.
- Saves: localStorage with a schema version number.

## Architecture
```
src/
  core/        fixed-timestep loop, input, event bus, asset loader   (loop lives in main.ts for now)
  render/      PS1 material (vertex snap, vertex-color light, fog), low-res target
  player/      state machine, movement, animation, equipment sockets
  camera/      follow rig, collision probe, room volumes, lock-on
  combat/      attack data, hitboxes, shield, dodge i-frames
  enemies/     base AI state machine, data-driven types
  world/       level loader, collision, triggers, hazards, moving platforms
  progression/ XP, attributes, upgrade rules
  equipment/   stat items, separate cosmetic skins
  save/        versioned serialization
  ui/          menus, HUD
  audio/       region music, ambience, SFX
data/          JSON: attributes, enemies, attacks, items, tuning, layouts
assets/        models, textures, audio
```

## Milestones
- **M0 Pipeline (in progress):** low-res internal canvas (320x240, CSS-scaled with nearest-neighbor), vertex snapping, vertex-color lighting, linear fog, fixed 60 Hz simulation, debug overlay with toggles [1] snap and [2] fog. Greybox test chamber with a toxic pool, ring of raised platforms, outer wall and a 1-unit rat-scale marker.
- **M1 Rat in greybox:** third-person camera, walk, run, jump, in a test room. Gate: two minutes of play feels right.
- **M2 Hero art pass:** final model, textures, helmet/sword/shield sockets, all animation clips.
- **M3 Platforming:** ledges, moving platforms, crawl passage, fall and land, camera in the chamber.
- **M4 Combat:** sword, heavy attack, block, dodge, lock-on, hit feedback, health, death and respawn.
- **M5 Enemies:** Sewer Rat and Giant Cockroach, telegraphed attacks.
- **M6 Drain Well:** final layout, art, hazards, collectibles.
- **M7 Progression and save:** XP, attributes, cosmetics, shrine upgrades, save and load. Death keeps XP.
- **M8 Polish:** audio, lighting and fog pass, tuning, playtesting.

## PS1 rendering
1. Low-res internal resolution with nearest-neighbor upscale. HUD text should stay at native resolution (addressed in M1 with a separate HUD layer).
2. Nearest filtering, no mipmaps, textures 32–128 px.
3. Vertex snapping (implemented in M0).
4. Vertex-color lighting, at most two or three dynamic point lights, evaluated per vertex (implemented in M0 as baked colors).
5. Affine texture mapping with `noperspective` interpolation, for large walls and floors (later).
6. Linear fog per region (implemented in M0).
7. Optional dithering, off by default (later).

No bloom, chromatic aberration or normal maps.

## Reference notes (inspiration only)

The following were studied as inspiration. **No models or textures from these references are used in the project or planned for use.** Many come from licensed games or named artists, so the project should only borrow principles such as proportions, polycount range, palette and layout.

- **Hero polycount:** a few reference rat bases are about 280 triangles (a very simple base) and about 700 (a mascot-style rat). That brackets the target, so keep the hero at roughly 700–1,200 triangles.
- **Enemy silhouettes:** the low-poly Dark Cloud-style rats (about 600 triangles, few parts) set the target for Sewer Rat enemies. A pirate-rat armor layering suggests improvised armor pieces for Rat Bandits. A spear-carrying rat suggests a polearm enemy variant.
- **Sewer palette and walls:** mossy brick walls and blue water tiles, as seen in the Final Fantasy III sewer backdrop, fit the Drain Well. Keep textures small and simple.
- **Sewer layout and scale:** the Sonic Adventure sewer reference is long, with pipes and walkways over water. Use it as a guide for Region 2 scale and walkway layout.
- **Toon-outline style:** one reference rat uses an outline/toon pass. Keep this out of the PS1 look. It could be considered later as an optional effect, behind a toggle.
- **Texture scale:** several references use 2048 px hand-painted atlases. The brief's 32–128 px target stands.

## Open decisions (assumed unless changed)
- Desktop browser, keyboard plus gamepad.
- Helmet: open-face bascinet or pot helm, with the face always visible. No cape by default.
- Enemies for the first slice: Sewer Rat and Giant Cockroach.

## Next steps (suggested)
- Lock-on targeting (Z-targeting / Souls lock-on) with strafing while locked.
- Stamina: swings, rolls and blocks cost stamina; it refills when idle.
- Attack variety: a running attack, a jump attack, a charged heavy, and a shield bash or parry.
- A second enemy type with a ranged or sweeping attack, and enemy placement data per level.
- Sound: footsteps, sword swings, hits, blocks, pickups.
- Replace procedural models with authored glTF models once the look is approved.
- Build the first real level (Drain Well) using the texture library.

## Development tools
- `npm run test:sim` runs all headless checks.
- Pose viewer: open the built page with `#view&state=attack&step=0&t=0.2&yaw=0.6` (see src/dev/viewer.ts for parameters); `scripts/shots.sh out.png "<params>" ...` renders a sheet of screenshots.
- `#at=x,y,z,cameraYaw` starts the rat at a position, for screenshots.
- `tests/textureSheet.ts` writes texture-sheet.png, a preview of every texture.

## Controls (updated)
- The game reads keyboard (WASD/arrows/Space/J/K/L/H) plus any gamepad (standard mapping) through `src/core/controls.ts`.
- The on-screen PS3-style pad (`src/dev/touchPad.ts`) is a phone-test harness only. It is installed only by `npm run build:test` (VITE_TOUCHPAD=1) and sits beside/below the picture, never over it. `npm run build` ships without it.
- Pad map: left stick move, right stick camera, X jump, O dodge, square/R1 attack, triangle stow/draw, L1 guard, L2 run, START reset.
- Air attack (plunge): attack while airborne hangs 0.16s, dives straight down (3 dmg to what's below), landing blasts radius 2.3 all round (2 dmg). Tuning in TUNING.plunge.
- Swimming: the pit's sludge is a WaterVolume (layout.ts). Entering it stows weapons automatically (redrawn on dry ground unless he stowed them himself), floats him at the surface on a spring, tread/crawl animations, jump out like a ground jump. Tuning in TUNING.swim.
- Breakable crates: Crate data in world/crates.ts, broken by sword, plunge dive or plunge landing (combat.ts). Debris pieces (world/debris.ts) fly, bounce, lie flat, shrink and vanish after ~5 s. Dev: #...&smash breaks all crates; #...&nopad hides the test pad.
- Gear: data/equipment.ts (items: helmet/sword/shield with colours and a stats slot for later), player/equipment.ts (owned + worn, saved in localStorage), world/pickups.ts (floating pickups), ui/toast.ts. Ember Helm floats over the highest ring platform. RESET also resets gear. Sword and shield slots exist but only the helmet changes the model so far.
- Pause menu (ui/menu.ts): START opens; screens ITEMS / EQUIP / QUEST / SAVE; L1/R1 or taps switch screens; left stick/arrows move; X select, O back. Picking up gear no longer equips it; wear it from EQUIP. SAVE keeps position+health (core/save.ts); gear and collectibles autosave. Dev: #...&menu2 opens a screen, #...&ownall gives all gear. Desktop keys: Esc/P/Enter menu, Q/E tabs.
- Menu redesigned: stone/brass panels, icon tabs with L1/R1 neighbours, grid-based inventory and equipment (scales to many items), live 3D rat preview on EQUIP (tries on the focused helmet), progress bars on QUEST, save card. Files: ui/menu.ts, ui/icons.ts, ui/ratPreview.ts.
- Menu redesigned wide-first (landscape, container-query sizing; portrait falls back to one column). Test pad is a harness only.
- Scarf slot: collar split from torso; redScarf (start), mossScarf (ring platform 4th from top), royalScarf (unplaced).
- ITEMS screen is now for usable items (Inventory, consumables.ts); gear only on EQUIP. Nacho Cheese heals 2; every crate drops one for testing (CRATE_DROPS chance).
- Floor/walls subdivided into ~2.5-unit squares to stop vertex-snap shimmer when walking.
- No pop-up banners/toasts in the game unless the user asks for one.
- Door reveal: collecting everything triggers revealCutscene (look, rumble, camera to east wall, sparkles, fade-in). Door A (east wall) <-> room 2 at x=100 via fade. Dev hashes: cutscene, cut=N, door, room2, go2.

## Core loop (from the user, 2026-11-11)
- Each level is one big room that loads all at once. Tasks inside it unlock the way forward.
- Goals vary per level: collect the cheese, beat every enemy, reach a spot, etc. They do not have to be "everything".
- Finishing the MAIN goals opens the exit. Collecting everything else (100%) earns extra unlockables (gear, scarves, items).
- No story for now; cutscenes get added later. Target: at least 50 levels.
- Not built yet: level data format, goal types, per-level exit rules, a level list/progression, 100% rewards.

## Levels (built 2026-11-11)
- Levels are data: src/levels/{types,builders,levels,goals,jumpMath}.ts. main.ts loadLevel(def) builds the room, collectibles, enemies and exit door.
- Goal types: collect (a kind, N or all), defeat (every enemy), waves (WaveDirector), reach (a spot). Main goals open the exit with the door scene; everything collected = 100% (reward gear, e.g. royalScarf from the sewer).
- Test levels: sewer, caps, hunt, waves, leap (parkour: gaps = 0.9 x measured max running jump, tests/leap.ts plays them with the real controller), crates (items hidden in crates).
- Entering a level resets its collectibles; LevelProgress (cleared/perfect/last) persists. Menu: QUEST shows main goals + bonus; LEVELS tab lists levels. Dev hashes: #level=<id>, #cutscene, #cut=N, #door, #go2.
- Not done: more than 6 levels, level unlocking order (all open now), checkpoints in parkour (fall = back to start).

## The Waterworks (first big open level)
76x100 hall, sludge channel with a tower island, high plank bridge, side galleries, plateau with the exit. 16 crumbs (12 needed), 6 caps, 3 relics, 7 guards, hidden items in crates. Reward: sludgeScarf. Dev hash: #level=waterworks.

## Kit, water, pipes, new enemy, NPC, builder (this session)
- Breakable barrels (kind 'barrel'), shared crate list with crates; debris staves.
- Level kit: src/levels/kit.ts (floors/styles, walls, gaps, bridges, stepping stones, catwalks, plinths, stairs, columns, barrels, portcullis, outflow grates, wall pipes, lamps, chains). Boxes take a `skin` (any texture).
- Flowing water: WaterVolume.flow carries swimmers and scrolls the surface; wall grates ('fall' decor) pour into it.
- Wall pipes (PipeSpec) break with a sword and gush; 'burst' goal; gates (portcullis) open from pipes or goals.
- Toad (spits globs, hops away) in src/enemies/toad.ts; Foe interface shared with the roach.
- NPC Pip + talk box: jump button talks when near; world freezes while talking.
- Level builder: src/ui/builder.ts + src/levels/custom.ts. Open from SAVE screen (LEVEL BUILDER), F2, or #build. Saves to device, copy/paste text, PLAY; reaching the exit returns to the builder.
- HUD: hearts top-left, collectibles + goal small top-right, fps only with #debug. Run is the default; hold Shift/L2 to sneak.
- Pillar capital z-fight fixed (shaft stops under the capital).
- TODO: sound (PS1/N64-style synth), more levels, level unlock order, parkour checkpoints.


## Sound + companion (latest)
- src/audio: synth (PS1-style sampled SFX incl. rat squeak grunts and roach screech), music (drift, pump), voices (24-voice pool), audio.ts (WebAudio engine, reverb, ducking, saved volumes). `#nosound` disables.
- NPC kinds: mouse (Pip, Pumpworks), bird (Finch, Waterworks) with talk-box face portraits and a JUMP-to-talk hint.
- TODO: hear it on the phone and tune levels; more voice lines (NPC voices), more music tracks.

## Builder upgrade
- Pieces: stairs, goal marker. Props: crate contents, NPC name/kind/lines, enemy respawn. Level settings dialog: name, description, size, wall height, music, goals (collect/defeat/burst/reach).
- Editing: drag to move, arrow-key nudge, duplicate (Ctrl+D), exact numbers panel, Fit, PLAY HERE (starts at the last tapped cell), 12 stamps (src/levels/stamps.ts).
- NEXT: environment kits (more floors/walls/doors/themed sets), then real levels.
- Separate editor build: npm run build:editor -> dist-single/ratquest-editor.html (opens straight into the builder in live mode; shares code with the game).
- Themes (sewer/mine/cave/dungeon) + per-piece look; decor pieces (lamp/chain/window/slime); samples 6-7.

## Notes
- Finch (bird NPC) and Pip (mouse NPC) are PLACEHOLDER models in src/npc/npc.ts. Don't polish them; replace with real models later. Talk text, portraits (src/npc/portrait.ts) and the builder 'who' setting are separate from the model.
- Sounds: made-up ones in src/audio/synth.ts; recordings go in recordings/ and are mapped in recordings/map.json, then python3 scripts/make-recorded.py writes src/audio/recorded.ts (overrides the made-up sound of the same name).
- Waves goal (enemy wave number in props; wave enemies hunt from anywhere), floor plates + gates opened by goals/pipes/plates; sample 8.

## Planned (added by user, reference clip: platform lifts player up a pillar, camera follows smoothly)
- Moving platforms: lifts/elevators, back-and-forth and looping tracks; player rides them (carry velocity, no sliding off); builder piece with path/speed/pause; sim + tests.
- Smoother camera: damped follow (esp. vertical on lifts/jumps), look-ahead, collision-safe pull-in, no snapping on landing/respawn.
- Moving platforms (MoverSpec, builder 'Moving platform' piece, sample 9) and a smoother camera (damped height follow, eased wall pull-in; TUNING.camera.heightRate/pullIn/pullOut) are done.
- Real levels so far (src/levels/kingdom.ts, made from builder pieces): Plank Pit, The Cellars, Lift Shaft. tests/movers.ts walks each on paper (reach-by-jump graph). Inspiration images the user sent: PS1/N64 platformers with floating islands and rope bridges, toxic pools with plank bridges, brick cellars/arches/pipes, cave webs, lava floors.
- Next level ideas: web-hung cave (cave theme, hanging webs decor), lava furnace (needs a lava hazard), flooded arches (rivers + pipes), rope bridges over a pit (new narrow-bridge piece with sway), a hub level.
- New pieces: lava (hurts, throws him back to last safe ground), rope bridge, cobweb, brazier; levels The Furnace and Web Hollow.
- Platform polish: jumping off a platform keeps its motion; crushing against a ceiling hurts. NOT done: crates and enemies riding platforms (items in crates have fixed positions).
- Camera: look-ahead toward the run direction (TUNING.camera.lookAhead*).

## Roadmap (agreed with user, work down in this order)
1. Combat feel: tiny hit-freeze (0.025s) + slow-motion beat on kills (TUNING.feel). [DONE first pass]
2. Controller rumble (+ ON/OFF toggle in SAVE screen): hits, kills, damage, blocks, landing, smashing, pickups, shockwave. [DONE] (speaker-beat rumble not done: no way to sync to the music yet)
3. Enemy lock-on: Q / R2 / R3 toggles; right stick or Left/Right flicks to the next foe; camera orbits to keep him centred, rat circles facing him, sword aims at him. [DONE; keyboard Q, pad R2/R3, on-screen R2 LOCK button]
4. Coloured lights: lamps (warm yellow), braziers (flickering orange) and a new Light piece (red/yellow/blue/green/purple/white, steady or flashing) shed banded colour on nearby walls, floor and characters; the 8 nearest are used. [DONE] TODO: add red warning lights to the pump levels, light toggle in display options.
5. Display options (SAVE screen rows): SCREEN wide/4:3 (black bars), FILTER off/scanlines/old TV/VHS/green handheld, COLOUR LIGHTS on/off; saved. [DONE] src/ui/display.ts; dev hashes #ar43 #filter=crt.
6. Subtitle UI polish: speaker colour themes, portrait hops while talking, no re-wrapping while typing, page pips, *emphasis* markup, slide-in, TALK TEXT size option; NPCs face the rat while talking. [DONE]
7. Controller glyphs (PlayStation/Xbox/Switch/keyboard, generic fallback) + full key/button rebinding.
8. Autosave + quicksave.
9. Dynamic music (layers react to combat, area, water).
10. Sticker book — DONE (menu BOOK tab: characters, beasts, finds, gear, places; found ones in colour, unfound as "?"; fills as you play).
11. New gear, each a distinct model (not recolours): scimitar, light sword, giant toothpick, cheese-wheel shield, king's crown helmet, more hats and scarves.
12. Photo mode (free camera, retro filters, save a screenshot).
Voices: formant shifting and layered moods still possible; reactions are recorded in recordings/react8.m4a.

- Item 7 DONE: src/core/bindings.ts (defaults, swap, reserved keys, saved as 'ratquest.bindings'), src/ui/glyphs.ts (PlayStation/Xbox/Switch/generic labels, key names, last-device detection), rebind screen under SAVE > CONTROLS, talk hint shows the right button. Movement, camera and menu keys stay fixed. Test: tests/bindings.ts.

## Story foundation (campaign order, unlocking, scenes) - from the 14-level story handoff
- Campaign: src/levels/campaign.ts lists the 14 rooms in story order (sewer, caps, hunt, waves, leap, crates, waterworks, plankpit, cellars, liftshaft, furnace, webhollow, lair, davespot). LEVELS is sorted to match; The Pumpworks is a bonus room after them. Level names now match the story doc.
- Unlocking: a level is open if it is first, already cleared, or the one before it is cleared (isUnlocked). LEVELS menu shows locked rows as "? ? ?" with a padlock and will not go there. Dev: #unlockall opens everything; #level=<id> still jumps anywhere.
- Builder no longer wipes campaign progress: it only forgets the 'custom' level (LevelProgress.forget).
- Scene engine: src/story/scene.ts. A scene is a list of beats (walkTo, face/faceAt, head/headAt, gesture, cam shot or 'game', cut, cover, bars, memory, sound). compileScene + sceneFrame(t) are pure, so tests run scenes in node. Flags: stowed (weapons on his back, drawn as it ends), hold (stay on the last frame for the fade to the next room).
- Gestures (player/ratModel.ts GESTURES, laid over the normal pose via RatAnimInput.act): touchScarf, reachPaw, hesitate. Head turn/nod with a little chest follow covers look around / look down / look over shoulder.
- src/story/scenes.ts: STORY[levelId] = { open, exit } scene builders, and StorySeen (saved as 'ratquest.story.v1'; new game resets it). An opening plays the first time he arrives in an uncleared level; an exit scene plays at the open door, then the fade.
- src/ui/storyOverlay.ts: black bars, flashback tint (memory 0..1), hides the HUD during a scene. JUMP skips a scene. The world holds still while one plays.
- Level 1 done: tunnel mouth on the south wall ('hole' decor), dark start, he walks out, stops, looks both ways, touches his scarf, turns towards the east wall, camera settles behind him. Exit: at the door he looks back over his shoulder. New 'mark' decor (sword in a diamond) on the east wall beside the door.
- Dev: #story=open|exit plays this level's scene now; &st=6.5 starts that far in; &sthold freezes it there (screenshots); #nostory turns scenes off (also off with #at= and in the editor build).
- Tests: tests/story.ts (34 checks).
- FIX: rumble called navigator.getGamepads() unguarded; in the Claude app's file viewer that throws (permissions policy) and killed the frame loop on the first landing (black picture, HUD showing). Now caught once and rumble switches itself off there. Test in tests/rumble.ts.

## Story, levels 2-6 (memories)
- Scene engine now has a cast (beat.cast: at/hide/walkTo/hop/face/head/gesture/scarf per named actor), memory sets (beat.set), a found keepsake (beat.prop: ground/hand/gone) and jumps (hop). A gesture held over consecutive beats does not drop at the joins.
- src/story/memory.ts: MemoryStage builds four small sets far below the level (STAGE, y -300): doorway, gap, gift, campfire (campfire is built, not used yet). Cast: 'young' (the knight as he was: helmet, no gear, no scarf until given) and 'friend' (young Grimsqueak: grey-violet fur like the villain model, dark tunic, wears the red scarf until he gives it). RatModel takes colour overrides and has setDress({scarf, helmet, gear}) and setHeld(obj).
- A memory = dip to black, cut to the set with the warm tint, play, dip back (memory() helper in scenes.ts). New gestures: pickUp, inspect, stowItem, adjust, cheer.
- Triggers (LevelStory in scenes.ts, places from LevelDef.storySpots): open, exit, find (break the crate on a spot: a keepsake drops, he picks it up), near (walk within r of a spot). Each plays once per new game, once he is standing still; the door-reveal scene waits for it.
- Level 2 Cap Collector: three crates by the east wall; one holds a cap (moved from the wall, still 8 caps) and an old compass. Memory: the two of them before a far lit doorway.
- Level 3 Roach Hunt: nothing added (the doc's "some roaches flee" is an AI change; left alone for now).
- Level 4 Endurance: royal crown mark on the north wall ('mark' decor, glyph 'crown'); short opening where he looks at it. Training props / abandoned weapons not added.
- Level 5 Leap of Faith: carved stone with the adventurers' mark on the goal platform (far corner). Walking up to the door passes it: memory of the two jumping a gap, a paw held out, a cheer; then he looks down and touches his scarf.
- Level 6 Crate Search: crumb crate #9 also holds a wooden whistle. Memory: his partner gives him the scarf and sets it straight; back in the room he touches the scarf.
- Dev: #story=find and #story=near also work (stand him by the spot and play).
- FIX (gap you could swim out through): in builder-made levels (Plank Pit, Furnace, any level from the editor) the outer walls stopped at floor height, so where water or lava ran up to a wall there was an open strip along the surface. compileCustom now takes the walls down past the liquid bed. Same fix in The Pumpworks (inlets meet the walls). tests/story.ts checks every pool edge in every level.

## Story, levels 7-9
- Level 7 Waterworks (opening): he hears marching; cut to two tax collectors (cast 'guardA'/'guardB': grey rats in royal purple, each carrying a cheese wedge) walking into a new low tunnel in the east wall under the crown mark; then he crosses to an iron grate in the landing floor ('grate' decor) and looks down at a glow far below. Crown marks added by the tunnel and on the west wall.
- Level 8 Plank Pit: Finch now has only the story line ("Watch those planks! They don't look terribly trustworthy."). A broken lantern lies by the planks (near trigger with a prop, r 3). Memory on the 'gap' set: the knight jumps first and reaches back, paw to paw, and they walk on side by side.
- Level 9 Cellars (opening): bare shelves ('shelf' decor) on the south wall; Pip moved beside them; he looks at the shelves, looks at the knight, shrugs; the knight looks down.
- Scene engine: beat.npc directs the level's own NPCs by name (lookAt a point / 'hero' / null, shrug); Npc.act in src/npc/npc.ts. beat.sound can be a list. New gesture 'carry'.

## Sound pass
- Richer recipes (src/audio/synth.ts) for the sounds that are not replaced by recordings: land, swing, dodge, hit, kill, hurt, block, crate, crumb, cap, splash, plunge, shock. (Layered: low punch under hits, struck-iron partials on block, resonant wood knocks on crates, air sweep on swings.)
- New story sounds: memoryIn, memoryOut, cloth, keepsake, recall, whoosh, softStep. Scenes now have footsteps (hero and cast), cloth on scarf touches, a pickup tick, a two-note "he knows it", and a chime in and out of each memory.
- audio.play: everyday sounds get a small random pitch change each time (VARY table), and crumbs collected in a run climb a scale, resetting after 1.4 s (CRUMB_STREAK). playRate() is pure and tested.
- Untouched: recorded sounds (talk, menuMove, step, drip, rat voices, item, toadWind, roachDie, villainLaugh) and music. None of this has been heard: it needs a listen on the phone.

## FIX: enemies in walls (toads hopping through, then spitting from where they cannot be hit)
- Enemies were held only by the rectangle of their patch, with no idea of the scenery: a toad's hop, a knockback or a hunter's chase could carry one into a wall, a raised block or a stair, or out over a drop.
- src/enemies/foe.ts: CanStand + keepOnFloor(). The game gives every enemy a canStand(x, y, z, r) (main.ts: floor under its middle at its own height, nothing solid at body height). After every move an enemy that ends somewhere bad slides along the free axis or stays put. Applies to toads and roaches, including wave hunters.
- Toads look before they leap: the middle and end of a hop must be open floor; they try wider angles; with nowhere to go they stay and spit.
- tests/footing.ts: a toad chased for two minutes x12 never enters scenery; cornered toad spits; hunting roach stays in the room; every enemy in every level starts on open floor.

## Story, levels 10-12
- Level 10 Lift Shaft: 'engine' decor far below (rings, spokes, a glowing heart, the kingdom's lamps, a pulse of light every 4.5 s; drawn without fog). On the second landing (after the slider) he walks to the edge and looks down; the camera lifts away and looks down the shaft.
- Level 11 Furnace (opening): 'machine' decor on the east wall of the near shore (wheel, hopper with a cheese wedge, lit window, pipes, crown mark). It runs, stalls (beat.power 0, picture dims, hall shakes), catches again; then a shot of him watching. storyPower in chamber.ts drives the machine and the engine.
- Level 12 Web Hollow: an old pack hangs in a web by the door (near trigger, r 4.5, so walking to the door sets it off). He pulls it free; the campfire memory (sit / sitReach / sitLean gestures: his partner sets the scarf straight, the knight leans to him, they sit; the longest memory, about 9 s). Then the faded royal portrait ('portrait' decor) and he touches his scarf.
- Scene engine: beat.power, beat.shake.

## Story, levels 13-14 (the lair and the ending). The 14-level story pass is now complete end to end.
- Level 13 opening (STORY.lair.open): doors shut, he walks in, the camera goes up the hall to the dais. Grimsqueak's only lines in the whole game are here, as timed talk-box lines (beat.say, no button): "Many have come before you... none of them squeaked for very long." / laugh / he sees the scarf and stops / "That scarf..." / "Still wearing it?" / the knight touches the scarf / he turns away / "Go home, old friend." Then he is gone from the dais and in the hall. His old five-line speech and the auto-talk are removed.
- The fight (src/enemies/grimsqueak.ts): no new mechanics. Grimsqueak extends Toad with his own numbers (Toad now takes a tuning object). He floats out of sword reach, gathers the Engine's light (shudder + hum), throws a bolt (teal glob: dodge or block), then sinks low for 2.1 s: that is when he can be hit. Come close while he is up and he drifts away. 10 hp. He sleeps (untouchable) until the opening ends; on later visits he is awake from the start. The lair's goal is now 'defeat'. Drawn with the villain NPC model.
- After the fight (STORY.lair.after, LevelStory.after = "when the last enemy is beaten, before the door opens"): he is not beaten for good. He hangs low where he fell, head down, looks at the knight, turns, floats to the passage under the dais (the exit) and is gone; the floor shakes (power 0, rumble). Then the normal door reveal.
- Level 14 ending (STORY.davespot.open; plays once the lair is cleared, even if Dave's Spot was cleared before): he walks in; Dave stops dancing; Mort and Wren look round; the camera pulls back; cut to the 'vista' set (the Engine and every lamp of the kingdom, steady); back in the room Grimsqueak is beside him, down on the ground, head lowered; he looks up; the knight holds out a paw; a pause; he takes it; they stand; fade. No words. Afterwards Grimsqueak stays there whenever you come back, and the knight's weapons stay on his back (sheathe).
- Dave's Spot no longer has Grimsqueak floating in the corner (he is in the level data as a hidden NPC for the ending). Blurb updated.
- NPC direction (Npc.act / NpcAct, beat.npc): lookAt, shrug, at / moveTo (glide), gone, still (stops his dance or sway), and for the villain low (down on the ground), bow (head down), reach (a paw out). gone and the pose last after the scene. NPC bodies (colliders) follow them (syncNpcBodies). An NPC with an explicitly empty lines list says nothing (a missing list still gets the stock line).
- Dev: #bossdown beats the boss at once (to see the after scene); #story=open works for lair and davespot.
- Tests: tests/story.ts (lines, timing, fight setup, after scene, ending), tests/footing.ts (boss asleep/awake, reach rule, beatable).
- NOT done / known gaps: no throne model (he floats over the bare dais); Mort cannot "open one eye" and Wren/Mort only turn to look (placeholder models); the doc's level 3 "some roaches flee" and level 4 training props; NPCs reacting to progress in the hub; Dave's Spot as a hub you can return to between levels (it is only level 14, and its exit leads to the bonus Pumpworks); the boss fight has never been played by a human, so its numbers (GRIM in grimsqueak.ts) are a first guess.

## Grimsqueak's new look (src/npc/npc.ts, kind 'villain')
- The upside-down cone is gone. Same head (crown, burning eyes, whiskers, teeth), now with a red stone on the crown, on a real body: a belted purple robe flaring to a ragged hem, a tattered black cloak lined in crimson that sways, a high pointed collar (black outside, crimson inside), ermine and spiked iron on the shoulders, clawed paws in wide gold-cuffed sleeves, a long tail, and a pulsing shard of the Deep Engine on a gold chain at his chest. Under the hem a ring of the same cold light turns with sparks in it; it goes out when he comes down to the ground (the ending, and when he sinks in the fight).
- He floats a little higher (VILLAIN_FLOAT 2.0) and stands taller on the ground (VILLAIN_DROP 0.6): about half again the knight's height.
- Unchanged: the flashback rat ('friend'), the talk-box face (src/npc/portrait.ts) and the wall portrait in Web Hollow.

## Combat rework (DONE and tested; never played by a human)
Goal: fights that feel more like Ocarina of Time / Dark Souls. Enemies with tells, commitment and openings; turn-taking in groups (src/enemies/director.ts); roach circles and picks a bite or a charge; toad crouches and pounces; Grimsqueak has volley, swoop, slam and orb attacks, opens only after an attack, bursts away after three hits, rages at half health (16 hp). The knight can parry (shield raised within TUNING.guard.parryWindow of a hit) and attack/dodge presses are buffered 0.2 s. Tests: tests/footing.ts, tests/combat2.ts. All numbers are first guesses: tune after playing.

## Item 8 DONE: autosave + quicksave
- src/core/save.ts has three slots: manual (SAVE GAME), quick (F5 save, F9 load, chime only, no banner) and auto. newestSave() drives the title CONTINUE.
- Autosave (main.ts autosave()): every 20 s while he stands somewhere safe (calm, grounded, not in a scene, talk, menu or attack), and when a level is cleared. Not in builder levels.
- SAVE screen: LOAD QUICKSAVE / LOAD AUTOSAVE rows (with the time). The ACTIONS list now scrolls and follows the cursor (it had run off the panel). Test: tests/saves.ts.

## Item 9 DONE: dynamic music
- Lanes carry a layer (src/audio/music.ts): 'base' always plays, 'combat' (drums, driving parts) fades in during a fight down to an optional floor, 'calm' (bells, soft leads) thins out in a fight. Drift gained kick/snare/hat lanes that only sound in combat; pump's kick, hat and lead sit at a floor and rise; groove (Dave's hangout) never changes.
- Water: a low-pass filter over the whole track (waterCutoff: 18 kHz dry, 650 Hz in the water, a little dull near it).
- Engine: audio.setMood({combat, water}); one gain per lane, eased. main.ts feeds it every frame: combat = any awake enemy within 14 (or a lock-on), rising fast and falling over about 4 s, forced calm during scenes and talk; water = swimming, or near the river.
- Tests: tests/music.ts. NOT HEARD: needs a listen on the phone to tune the drum levels, the fade times and the filter.

## Exit door rebuilt (src/world/doorway.ts)
- A real stone arch (a step, two jambs of stacked stones, seven wedge stones and a keystone) with an arched door (iron-banded plate in sewers and dungeons, planks with iron bands in mines and caves) and an iron ring pull. Stone and timber follow the level's theme (LevelDef.theme, set by compileCustom; hand-built levels default to sewer).
- Growing, not appearing: a line of light and dust traces the outline on the flat wall (sparkle 0..1), then the step and stones push out of the wall bottom to top, each easing out with a little twist (fade 0..0.7), then the door slides out last and light spills from the slit round its edge onto the floor. Same setReveal(sparkle, fade, time) API and cutscene timings. Stones start hidden inside the wall, so they depend on the wall hiding them.
- Dev: #level=<id>&cut=<seconds> shows any moment of it (5.8 to 8.0 is the growing).
- FIX: wall grate waterfalls flowed upward (texture offset sign); now flows down (chamber.ts fallOffset).
- FIX: the wall portrait in Web Hollow flickered and clipped into the wall (a dozen flat shapes a few mm apart fought in the depth buffer). Now one flat picture painted by src/world/portraitTexture.ts, 6 cm off the wall. Other flat wall decor ('mark', 'hole') may stack layers the same way: fix the same way if one flickers.

## The Great Cistern (rebuilt as the first "really solid" level)
Layout and play first (owner's priorities); five landmarks, all visible from the start, each its own challenge, linked:
- South: entrance balcony (start at 0,8,39 looking out; exit door behind), grand stairs down, the Undercroft beneath (secret wedge).
- Middle: tower on a moated island; 11-slab spiral to a chimney floor (12); wall-kick chimney (2.2 wide, tower face + a
  2-wide outer wall) to the perch (20); double jump/grab onto the top (22). Tested with the real controller (tests/cistern.ts):
  kicks lift him above the perch, late presses still work, no kicks = cannot climb, perch -> top works.
- West: the Bastion (walled fort, gate gap with stairs, keep with stairs); 4 roaches + 2 toads; wedge on defeat.
- North: Drain Cliffs (3.2 / 7 / 11.5 tiers, stairs to tier 1) and the High Drain ledge (17) by jump + grab.
- East: the Pump House, gate opens on both plates (roof via lift; tier 2 of the cliffs). Wedge inside, visible through bars.
- SW: the Teeth (pillar hops, cap on top); SE: crate yard. 8 caps on landmarks -> "Eight Bottle Caps" wedge on the balcony.
- LevelDef.fogRange [40,150] so landmarks show (default 18..90). Each landmark has its own light colour.
- Jump checker: wall-kick chimneys (two walls within 4.5) and grab-assisted jumps are modelled.
- Next for it: the owner's playtest; then looks (props, arches), sound and life.

## Wedge Hall (hub for open courses)
- `src/levels/junction.ts` (level id `hub`): 40x40 hall, dais in the middle, Pip at the start. Its own door (south) is open from
  the start and goes back to the Kingdom (first level).
- Course doors (`LevelDef.courseDoors`, `CourseDoorDef {to, name, need, door}`): North = The Great Cistern (needs 0),
  West = Course Two (needs 3, not built), East = Course Three (needs 8, not built). `to: null` = not built yet.
- `src/world/courseDoors.ts`: finished door + painted sign. Open: edge glow, sign shows the course name and wedges taken there.
  Shut: dark, iron bars, sign shows "wedge x N".
- Wedge total = discoveries with prefix `wedge:`; the HUD in the hub shows "Golden Wedges n/total".
- Leaving a course goes back to the hub, standing in front of that course's door (`trans.arrive`).
- Tests: hub checks in tests/wedges.ts. Next: build Course Two and Three, a wedge list on course entry.

## Story: parked (pitch kept for later)
"The Lights Below": the Deep Engine was fed by the Golden Wheel, found by the knight and his partner; it cracked into the
Golden Wedges the day they brought it home. The knight left; the partner stayed, became Grimsqueak, and hoards cheese to keep
the Engine (and the lights) going. Beats: homecoming -> Dave's Spot as the last lit hub (Mort = old Engine keeper) ->
districts going dark, one wedge each (pumps, roaches fleeing the cold, furnace, Web Hollow portrait) -> midpoint "Go home,
old friend" -> last memory shows the Wheel cracking -> lair -> they set the last wedge together. Owner chose gameplay first.

## Builder: My Levels, wedges, Wedge Hall doors (editing without Claude)
- **My Levels** (`src/levels/library.ts`, key `ratquest.mylevels.v1`): Save in the builder keeps the level in a library
  (ids `my-1`, `my-2`...). MY LEVELS button: open, delete (tap twice), new, save as copy. Saved levels show in the game's
  LEVELS menu as "MY LEVEL: name" (always open) via `setExtraLevels` in levels.ts; leaving one goes to the Wedge Hall.
- **Golden Wedge piece** (COLLECT group): name, clue, and what makes it appear (start, enemies, waves, pipes, crumbs, caps,
  relics, goal marker). Any wedge makes the level an open course (`compileCustom` builds `wedges`, goals follow them).
  Wedges taken while trying a level from the builder (id `custom`) are not saved.
- **Wedge Hall door** (LEVEL settings): hang the level on the west or east door and set the wedges needed. One level per
  door (newest wins). main.ts `hubDoors()` merges these over HUB_DOORS (`HUB_SLOTS` in junction.ts).
- **Characters**: a character list (Pip, Finch, Dizzy Dave, Mellow Mort, Wren, Lord Grimsqueak, another mouse/bird) sets
  name and look; "talks when near" checkbox (auto = 3).
- To make a level permanent: Copy text, send it to Claude.
- Tests: tests/mylevels.ts. Toad pounce now checks its whole path; footing tests use fixed dice. (2026-11-13: still flaky about 1 run in 20 until two hop-away rolls that skipped the toad's rng were routed through it, and the pounce check was made exact at box corners; see HANDOFF 'The flaky toad test'.)
- Next for tools: Tweaks panel (feel sliders), 3D place/fly mode, jump checker, shapes and group select.

## Tweaks panel (game feel on sliders)
- Menu → TWEAKS (GAME FEEL), or F3. `src/core/tweaks.ts` (TWEAKS list: path into TUNING / TOAD / GRIM, range, step, group),
  `src/ui/tweaksPanel.ts` (UI). Groups: Moving, Jumping, Fighting, Roaches, Toads, Grimsqueak, Camera (56 sliders).
- Values are written straight into the tables, so most apply at once; enemy health from the next level, hearts after a restart.
  Kept on the device under `ratquest.tweaks.v1`, applied at the very start of startGame.
- Copy settings gives text with a JSON line; paste that to Claude to make them the defaults (edit tuning.ts / TOAD / GRIM).
  Paste puts copied text back in. Reset per slider, per group, or all (tap twice). Game paused while open. Dev hash #tweaks.
- Tests: tests/tweaks.ts.

## 3D EDIT (builder)
- Builder bar → 3D EDIT. The game pauses; a free camera flies inside the room (`src/ui/flyEdit.ts`), crosshair in the middle.
  Gold outline = what PLACE adds; red outline = what DEL removes. Bottom bar: piece ◀ ▶, width, depth, height above the
  surface, turn. MAP goes back to the 2D builder (one Undo there takes back the whole 3D session).
- Placing rules in `src/levels/place3d.ts` (makePiece: grid-snapped, box centred on the point, raised pieces stand on the
  surface; pickPiece: singles by distance to the line of sight, boxes by footprint and top). Tests: tests/place3d.ts.
- Keys: WASD fly, arrows/drag look, Space up, C down, Shift fast, E/Enter place, X delete, [ ] piece, R/F height, 1/2 width,
  3/4 depth, T turn, Z undo, Esc map. Pad: sticks, jump up, sneak down, attack place, dodge delete, L1/R1 piece, stow turn.
  Touch: drag to look, on-screen fly buttons. Dev hash #flyedit.

## Jump checker (builder)
- `src/levels/reach.ts`: `computeReach(def)` samples the level on a half-unit grid (surfaces with headroom; water = swim;
  lava excluded; moving platforms sampled along their path) and floods out from the start: walk, step up 0.4, drop down,
  swim, and jump to edge points within `jumpReach(dh)` (real TUNING numbers incl. double jump, x0.92 margin; so Tweaks count).
  `unreachable(def)` lists collectibles (incl. crate contents and mid-air crumbs within 3.6), wedges, exit, reach marker, NPCs.
- Builder bar → JUMP CHECK (remembered): green dots where he can get to, red rings on what he cannot, status line lists them.
  In 3D EDIT: red diamonds. Gates are taken as open; nothing in the air blocks a jump (an estimate, not a simulation).
- tests/reach.ts: every built-in level has nothing out of reach; a crumb on a too-tall pillar is caught.

## Builder: shapes and groups
- SHAPES (was STAMPS) in `src/levels/stamps.ts`, new: Spiral climb, Tower + spiral (relic on top), Slab ring, Pillar steps,
  Zigzag planks, Moat island. A placed shape is selected as a group straight away.
- Groups (`src/levels/groupOps.ts`): with Select, drag on empty ground to box-select; "Add to group" (or Shift-click) to add
  or remove single pieces. Drag any member to move them all; arrows nudge; Turn 90° (about the group's grid centre, facings
  turn too); Duplicate (copy offset 2,2, selected); Delete; Raise/Lower; Facing. Single pieces can be turned too.
- Map draws pools over the floor and bridges over pools.
- tests/groups.ts: box-select, four quarter turns round trip, every shape builds and passes the jump checker.

## Open-course moves (controller)
- Long jump: running fast (sinceFast < moves.longJumpWindow), hold SNEAK and press JUMP: low fast leap (12 across, 7.5 up),
  no air jump after, slight steering, state 'longjump' (body stretched forward). About 9.4 units vs 6.2 for a running jump.
- Wall kick: touching a tall wall in the air (moveAxis records wall normal, wallKickWindow), press JUMP: kicks up and out;
  stick locked out for wallKickLock so he flies clear. Can chain between two walls.
- Ledge grab: falling past the top of a wall he is pushing toward (or facing; any stick angle), checked across the whole step, with room and floor on top: hangs (state 'hang', arms up).
  JUMP or push toward the wall climbs (state 'climb', climbTime); pull back or dodge lets go.
- Per-level switches: LevelDef.noGrab / noLongJump (Leap of Faith has both, its gaps are about running-jump timing);
  builder LEVEL settings has the two checkboxes. Jump checker follows them (long jump reach, grab +1.05 height).
- Tuning: TUNING.moves; Tweaks group "Moves". Sounds via player.moveEvent. Controls card in the menu explains the moves.
- tests/moves.ts (long jump distance, wall kick, grab/hang/climb/let go, no grab without room); tests/leap.ts uses the flags.

## World structure (owner's direction, 2026-11-13)
Home hub + big worlds, each opening into sub-areas; old levels folded in where they fit, filler retired.
1. DONE: **The Club** (`src/levels/junction.ts`, level id `hub`, replaces the Wedge Hall): Dave's stage, the fire (rest:
   JUMP near it -> sits, full hearts, autosave; `LevelDef.restSpot`, hint "to rest by the fire"), couches, Pip's counter
   (on a step so he shows), Mort's couch, Wren, Finch. Doors: west = Great Cistern (0), east = World Two (4), north = World
   Three (10). South door = old tunnels (first level). Builder hub slots: 'west' -> World Two, 'east' -> World Three.
   The Club has no door of its own any more (its ways out are the world doors). New games start in the Club; an old
   campaign level as the last place played also starts in the Club. LEVELS menu and sticker places show only world areas
   (hub, courses, side areas, my levels) unless #unlockall.
2. DONE: doors from any area into side areas. `LevelDef.courseDoors` works in any level (signs + trigger via doorsOf);
   `LevelDef.returnTo` (side area: door open from the start, leads back to the parent in front of the door that led
   in); `LevelDef.world` (areas of one world; the Club's sign counts every area's wedges). First: the Cistern's pump house
   (behind the plate gate) has a door on its back wall into **the Pump Room** (old Pumpworks: 3 wedges - burst the pumps,
   toads on the plateau, the river island; way out south by the entrance). The Cistern's own pump wedge moved there.
3. DONE: **Pip's shop.** Talk to Pip at his counter in the Club (NpcSpec.shop) -> shop screen (`src/ui/shopPanel.ts`,
   paused; touch Buy, or up/down + confirm, back leaves). Purse (`src/core/wallet.ts`): every crumb and cap ever picked
   up in the built-in levels (they stay picked up, so no farming) minus what was spent (`ratquest.wallet.v1`; reset on
   new game). Stock in `src/data/shop.ts`: Nacho Cheese 8, Moss Scarf 12, Sludge Scarf 15+1 cap, Ember Helm 20+2,
   Royal Scarf 30+4. Gear bought is owned, never put on (equip from the menu). Dev hash #shop. tests/shop.ts.
   New gear (item 11) goes on sale here when it is made.
4. World map in the menu (replaces the long LEVELS list). [DONE] The WORLDS tab lists The Club (home), each hub door as a world with its Golden Wedge count, and the side areas indented under it (hidden until found). Locked worlds show a lock and the wedges needed. Details show every wedge in the area, got or not. Your own levels follow; old levels only show with #unlockall.
5. World Two. [DONE] The Foundry (src/levels/foundry.ts), behind the Club's east door (4 wedges). New 'foundry' theme
   (iron plate, sooty brick, magma rock, warm red fog). Main hall 96x96: the Gantry start, the Crucible on a lava island
   (pistons up its sides; the Slag Crew on its rim), the Slag Run (beams a double jump apart over lava, Hopper to Ladle),
   the Storehouse (gate opens when the three steam pipes burst; inside, the door to the Coal Cellars), the Slag Heaps,
   two machines. Five wedges. Side areas: The Lift Shaft ('shaft', 2 wedges) and The Coal Cellars ('coalcellars', 3).
   The old Furnace / Lift Shaft / Cellars stay in the list as OLD levels (their story scenes are tied to the old ids).
   Also: builder levels now hang on two guest doors on the Club's south wall (shown only when used), not on world doors.
   The jump checker no longer counts a wall-kick chimney under a ceiling (a doorway's lintel). tests/foundry.ts.
6. World Three. [DONE] The Hollows (src/levels/hollows.ts), behind the Club's north door (10 wedges). Cave theme, its own
   music ('echo': Phrygian drone, heartbeat bass, bells that echo; drums only in fights). A chasm with no bottom: falls cost
   a heart and put him back on the last ground (LevelDef.fallBack). The Mouth and the Lip (start), Spider Rock (a 13.5
   leap down off the Lip, or the slider from the Root Shelf), the Faith Stones (double jumps over the chasm), the Webbed
   Gallery (beasts on ledges over the drop), the Mushroom Climb to the High Hollow, the Crystal Grotto. Five wedges, one
   for three hidden relics. Side areas: Web Hollow ('webs', 2) and Leap of Faith ('faith', 2; no grab, no long jump).
   The old Web Hollow and Leap of Faith stay as OLD levels. tests/hollows.ts.
   Note: the long jump only beats a perfect double jump by about 2 units even on big drops; it is the forgiving way
   across, not the only way. Gaps that need it would be pixel-perfect.
7. The last world. [DONE] Grimsqueak's Keep (src/levels/keep.ts), behind a new Club door (north wall, west of the stage,
   18 wedges). New 'keep' theme with two new textures (keepStone, royalCarpet) and its own music ('march'). Over the pit
   where the Deep Engine turns (fallBack): the courtyard and portcullis (plates), the Burning Walk (lava stones, toads), the
   Broken Stair, the landing and the chimney (wall kicks, 12 high) up to the Throne Ledge, the battlements (guards) and a
   slider to the Engine Stack. Five wedges.
   The throne room keeps the id 'lair' (so STORY.lair's speech, boss wake and after-scene still play). It is in the Keep's
   world but is not a side area: its door opens only once he is beaten and the wedge taken, and the way out goes home.
   The ending (the old Dave's Spot scene) now plays in the Club (STORY.hub, fromSpawn), and Grimsqueak stays there after.
   The old lair level is gone (replaced). tests/keep.ts.
8. Cistern side halls. [DONE] src/levels/cisternHalls.ts. The Waterworks ('works', off the NW corner; the old hall
   wrapped: door moved beside the start, tower relic replaced by a wedge, pickups renamed 'cworks:'; 3 wedges) and the
   Sludge Pit ('sludgepit', off the east wall by the crate yard; the old Plank Pit with a harder west row of stones and a
   lookout; 2 wedges). The Cistern world is now 13 wedges; the game has 38. tests/halls.ts also checks that no two places
   share a pickup id.
9. Balance pass. [DONE] src/data/balance.ts holds the Club door costs and Pip's prices; all on sliders in Tweaks
   ("Doors and prices"). Doors 4 / 10 / 20 (31% / 43% / 63% of the wedges open by then; the Keep went up from 18).
   Shop: gear now 110 crumbs and 20 caps in all (was 77 and 7), against 147 crumbs and 45 caps in the worlds.
   tests/balance.ts keeps doors under two thirds of what is open, and the shop beyond the first world alone.
10. Gear with real effects. [DONE] Every piece Pip sells is a trade (gains and costs, both shown in the shop and the
   menu): Moss Scarf (quiet / slower run), Sludge Scarf (fast swim / slides), Royal Scarf (higher wall kicks, longer long
   jump / a heart fewer), Ember Helm (lava and falls cost no heart / slow swim), Miner's Helm (see further in the dark /
   beasts notice the lamp), Cleaver (double damage / slower swings), Buckler (longer parry, faster guard / narrow block).
   equipment.ts: GearFx and gearMods(); PlayerController.gear and maxHp; SENSES.notice for the beasts; fog x sight.
   Sword and shield now recolour on the model. Prices in balance.ts (all gear 117 crumbs, 25 caps). tests/gear.ts.
11. Photo mode. [DONE] src/ui/photoMode.ts. From the menu (PHOTO MODE, top of the system list) or the O key. The game
   holds still, the HUD hides, a camera circles him (turn, tilt, closer/further, look higher/lower, field of view). Six
   looks (CSS filter chains, baked into the saved picture by the same maths in JS), seven poses (story gestures), four
   frames (cinema bars, vignette), hide the rat, turn him. Take saves a PNG scaled up with sharp pixels (long side 1600+)
   with a small RATQUEST mark. Buttons fade after 4 still seconds. #photo / #photo=look,pose,frame opens it. tests/photo.ts.
12. Old levels retired. [DONE] levels.ts: ALL_LEVELS (everything, old order), LEVELS (the Club and the worlds only),
   ARCHIVE (the 13 old levels: out of menus, counts and the Club; kept for the parked story; #level=<id> still opens
   one). The testroom build now opens in the Club with #unlockall. tests/archive.ts.
13. Looks and sound pass (first round). [DONE] Each world has its own sound under the music (src/audio/ambience.ts):
   a bed (Cistern drain rumble, Foundry machine hum and beat, Hollows wind, Keep cold hall drone) and far-off noises
   now and then (drips; clanks and steam; echoing drips and pebbles; chains and a distant bell). Lava roils and pops
   near it; braziers crackle near them; the Club keeps just its music and fire. Each world has its own air too
   (src/world/motes.ts): rising embers in the Foundry, glowing spores in the Hollows, falling dust in the Keep, a faint
   mist in the Cistern. tests/ambience.ts.
14. Looks, round two. [DONE] New dressing (layout.ts Decor, built in chamber.ts; also builder pieces under DECOR):
   banner (swallow-tailed cloth on a rod, gold trim and diamond, sways; colours), torch (iron bracket, flame, light),
   gauge (brass dial, trembling needle), crystal (glowing cluster with light; a little solid), roots (hang from the roof,
   sway). The Keep and throne room are hung with his purple banners and torches; the Foundry has gauges and pipe runs
   feeding its machines; the Hollows has crystals and roots; the Cistern torches and gauges; the Club a torch either side
   of each world door. Banners hang at eye level (the game camera looks slightly down: higher than about 7 above the floor
   is never seen). tests/decor.ts.
15. Gear secrets. [DONE] Three secret wedges (41 in all), each for one piece of gear, checked with the real controller
   (tests/secrets.ts; WedgeDef.gear tells the jump checker to leave one out):
   - Cistern, Against the Current: an old drain past the Teeth with a current of 3.2 (he swims 3, the Sludge Scarf 4.5)
     under a low stone lid; a sealed room at the end. No jumping out of water with a roof just over his head (controller).
   - Foundry, The Furnace Mouth (gear: royalScarf): a ledge 21 out and 13.5 below the Crucible's top. Plain long jump
     reaches 19.8, any double jump 17.5, a royal long jump 21.9-23.7.
   - Hollows, The Lightless Way ('dark', a side area under the Mouth): stones over a drop in fog [1, 5]; each next stone
     is 5.6-6.2 from the edge of the last, so it shows only with the Miner's lamp (sight 8.5).
   Hints from Pip, Finch and the wedge clues. River pieces take props.speed.
16. Playthrough / soft-lock check. [DONE] tests/softlock.ts. The jump checker runs backwards too: every step it finds is
   recorded, then searched back from the door; anything he can get into but not back out of is a trap
   (computeReach(def, { traps: true }).traps). A fall into the void counts as a way out where it sends him to the start;
   in fall-back levels and lava it does not. In trap mode a wall taller than the top of his jump stops a jump (the plain
   checker lets jumps through walls); also run with every gate shut. Plus, with the real controller: he lands on his
   feet at every start and in front of all 15 doors he comes back out of, and the way on is open from each.
   Result: no traps in any area. One checker fix: swimming he fits under a lower lid (0.6, not 0.9), so the drain's
   covered run is seen. The builder's jump check now shows trap spots in orange too.
17. Controller and Steam pass. [DONE] Button prompts everywhere are chips for the device used last (src/ui/glyphs.ts:
   prompt(), helpLine(), keyChip/padChip): keyboard keycaps, Xbox, PlayStation (drawn shapes), Switch, Steam Deck
   (new pad kind, 28de:1205). Steam passes every pad on as an Xbox pad, so the desktop wrapper asks Steam Input what it
   really is (setPadKindOverride); on a Deck the Deck's buttons show from the start. Options: BUTTON ICONS (AUTO / XBOX
   / PLAYSTATION / SWITCH / STEAM DECK). Rumble OFF / LOW / FULL, plus a wedge buzz and the door quake. Photo mode on a
   pad: frame moved to R2 (it was on B, which also left photo mode). Steam Deck screen: HUD text scales; every screen
   checked at 1280x800 and 1280x720 with no text under 13px (scripts/deck-check.mjs, npm run check:deck).
18. Save files. [DONE] Three files (src/core/slots.ts). Title: CONTINUE opens the SAVE FILES screen (where, wedges, time
   played, last saved; play, copy, erase with a second press); START on a fresh device. File 1 is the old keys, so an
   older game is File 1. SAVE screen: SAVE AND QUIT TO TITLE, and the card shows the file. Checked in a real browser with
   the keyboard (scripts/files-check.mjs, npm run check:files).
19. Two new beasts. [DONE]
   IRONBACK (src/enemies/ironback.ts, ironbackModel.ts): a rhinoceros beetle in an iron shell. The sword glances off
   the front and sides (clank, sparks, the rat bounced back, no swing for 0.35 s); its tail is soft and it turns
   slowly (1.5 rad/s), so get behind it. Two hits from behind (or lingering there) and it bucks, kicking backwards.
   The ram: a long tell (horn down and heating, pawing, snorting steam), then a straight charge for 2 hearts. Into a
   wall it bonks and flips; a perfect guard flips it; a plunge onto it flips it. On its back it is soft all over for
   2.6 s. Close in front it tosses its horn (1 heart). 4 hp. Placed: the Foundry (behind the Crucible, for the crew),
   the Coal Cellars (behind the gate; Wren warns of it), the Keep courtyard (by the west plate).
   FLITTER (src/enemies/bat.ts, batModel.ts): a cave bat. Roosts out of reach and wakes to footsteps within 7, or
   sneaking within 2 (the first thing the sneak button does against beasts); one waking wakes the roost within 7.
   Circles above the sword (1.9 up); swoops after a 0.7 s tell (it rises and screeches), slowing at the bottom: there
   is about 0.2 s to hit it as it comes down, before its bite at the very bottom (1 heart). Struck or blocked it drops
   to the floor (a second hit kills it; over a pit it is lost). 2 hp. Perched on a knob of rock, or a chain in halls.
   Placed: the Hollows gallery's first ledge (two), the Web Hollow landing, the Keep battlements (two, on chains).
   Defeat wedges still match their hints (new beasts joined the groups they name). Builder: Ironback and Flitter
   pieces (waves, comes back; bats take a perch). Tweaks: Ironbacks and Flitters groups. Sticker book entries.
   Tests: tests/ironback.ts, bat.ts, beasts.ts. Model sheet: tools/modelsheet (every pose side by side).
Proposed folding of old levels:
- Cistern world: Pumpworks -> the Pump House interior; Waterworks and Plank Pit -> flooded side halls.
- World Two (the Foundry): Furnace, Lift Shaft, Cellars.
- World Three (the Hollows): Web Hollow, Leap of Faith.
- Final: Grimsqueak's Lair. Sewer Chamber stays as the prologue that leads to the Club.
- Retire: Crate Search, Cap Collector, Roach Hunt, Endurance (plain box rooms).
