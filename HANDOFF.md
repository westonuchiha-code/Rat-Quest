# RATQUEST: THE KINGDOM BELOW: handoff

> **Read START-HERE.md first.** This file is a log, one section per feature, oldest first. Its early sections are out
> of date in places (the test room is now `level=hub&unlockall`, the story is parked, builds come from
> `scripts/deliver.sh`). Where they disagree, START-HERE.md is right.

PS1-style 3D collectible platformer / combat roguelite. A rat knight in a sewer kingdom. TypeScript + Three.js + Vite 8, strict TS (noUnusedLocals/Parameters).

## Combat rework: DONE, tested, built (not yet played by a human)
Roach (approach/circle/hop-back, bite and charge), director (turn-taking), toad pounce, Grimsqueak as a four-attack boss with openings and rage, parry window and 0.2 s input buffers. All numbers are first guesses (TUNING.scuttler, TOAD, GRIM, TUNING.guard.parryWindow, TUNING.buffer) and need a human playtest. Tests: tests/footing.ts (boss rewritten), tests/combat2.ts (new). `npm run test:sim` shows 0 FAIL. A toad's pounce now checks the middle of the jump as well as the landing.

## Start here
- `PLAN.md`: roadmap, architecture, every system's notes (long, read the Roadmap and the dated sections).
- `npm install`, then `npm run test:sim` (all headless tests must show 0 FAIL).
- Story brief (for a writing assistant): https://claude.ai/artifact/ARoC8GwyMicHovbLRPfazp

## Builds (phone testing is a single HTML file opened in the Claude app)
- `npm run build:test` -> dist-single/ratquest.html (with on-screen test pad)
- `npm run build:editor` -> dist-single/ratquest-editor.html
- No pad: `npx vite build --outDir dist-plain && DIST=dist-plain node scripts/make-single.mjs ratquest-nopad.html && rm -rf dist-plain`
- Test room: inject `<script>location.hash="level=davespot&at=0,0,14,0";</script>` after `<head>` of ratquest.html.
- Test room now also needs `&unlockall` in that hash if you want every level open from the LEVELS menu.
- Dev hashes: #story=open|exit|find|near &st=<sec> #bossdown &sthold #nostory #unlockall #level=<id> #at=x,y,z,yaw #talk #lockon #ar43 #filter=crt|scanlines|vhs|green #nopad #debug #cutscene #menu3 #rebind #ownall

## Story (in progress)
Story doc: 14-level campaign, told almost without words. Every level's story scenes are built, including the Grimsqueak fight and the ending; see the "Story" sections at the end of PLAN.md. Scenes live in src/story/ (scene.ts engine, scenes.ts per-level data, memory.ts sets and cast). Next: play it through on the phone and tune (scene timing, boss numbers in src/enemies/grimsqueak.ts, sound).

## Roadmap status
Done: combat feel, rumble, lock-on, coloured lights, display options, subtitle polish, controller glyphs + rebinding, autosave/quicksave, dynamic music (unheard).
Done: 10 sticker book (BOOK tab, index 5; src/core/stickers.ts, src/data/stickers.ts; discoveries saved under ratquest.stickers.v1; dev hash #allstickers fills it). Next: 11 new distinct gear (scimitar, lightsaber-like, giant toothpick, cheese-wheel shield, king's crown), 12 photo mode. Prototype open course: The Great Cistern (Golden Wedges), see PLAN.md. Hub for courses: The Wedge Hall (level id hub). Builder: My Levels library, wedge piece, Wedge Hall doors (see PLAN.md). Tweaks panel (F3 / menu): feel sliders. 3D EDIT mode in the builder. Jump checker in the builder. Shapes + group select in the builder. New moves: long jump, wall kick, ledge grab. Great Cistern rebuilt as a proper course. The Club (home hub, rest at the fire). Pip's shop.
Later: red flashing lights in pump levels, formant/mood voices, more levels (50+ target), Pip shopkeeper, speaker-beat rumble, editor<->game level transfer, Steam.

## Testroom build
After `npm run build:test`: copy dist-single/ratquest.html to ratquest-testroom.html with `<script>location.hash="level=davespot&at=0,0,14,0&unlockall";</script>` inserted right after `<head>`.

## Standing rules from the owner
- No pop-up banners/alerts unless asked. Wide/landscape-first UI. On-screen pad is test-only.
- Never auto-equip pickups. Don't make the game easier.
- Always deliver working files each turn, including ratquest.html.
- When asked "what's next", give a list.
- Hero has no voice besides jump/attack squeaks. Finch/Pip models and placeholder sounds are placeholders.

## Voices and audio
recordings/ holds the owner's voice recordings; voices.json and map.json drive scripts/make-recorded.py, which writes src/audio/recorded.ts. Speech is assembled from syllables per character (src/audio/speech.ts).

## Known gaps
Audio and motion are only verifiable on the owner's phone. Speaker-beat rumble not synced. Crates/enemies don't ride moving platforms. Speaker/couch have no collision.

## Collision pass (furniture and props)
Decor is drawn only; anything you should bump into also needs a box in `solids` (use `hidden: true` so it collides but is not drawn).
Now solid: couches (seat you can stand on + back), speakers, braziers, coloured light posts, bridge railing posts (custom.ts);
the Pump Room's floor-to-ceiling wall pipes (pumpworks.ts); the Cellars shelves and the Furnace machine (kingdom.ts, via `dressed(..., { solids })`).
Left passable on purpose: hanging lamps and chains (overhead), webs/slime/windows/marks (flat on walls), the bridge hand-rail itself, the Deep Engine (far below).

## World Two: the Foundry
- src/levels/foundry.ts: foundry() (id 'foundry', world 'foundry'), foundryShaft() ('shaft'), foundryCellars() ('coalcellars'); both side areas returnTo 'foundry'.
- Wedges: FOUNDRY_WEDGES (crucible, crew, run, steam, caps), SHAFT_WEDGES (top, crumbs), CELLAR_WEDGES (crew, ledge, caps). World total 10; with the Cistern's 8 that is 18.
- Club: HUB_DOORS[1] is now the Foundry (need 4). Player levels use HUB_GUEST_DOORS (south wall, left/right), added by hubDoors() only when hung.
- Theme 'foundry' in themes.ts / doorway.ts / courseDoors.ts. Outer room walls take the theme's wall skin for 'foundry' only (older themes still show sewer brick there on purpose; see custom.ts).
- machine(x, z, yaw) in foundry.ts makes the boiler decor plus matching hidden solids.

## World Three: the Hollows
- src/levels/hollows.ts: hollows() ('hollows', world 'hollows', fallBack), hollowsWebs() ('webs'), hollowsFaith() ('faith', hand-built like the old leap()).
- Wedges: HOLLOWS_WEDGES (rock, faith, gallery, high, relics), WEBS_WEDGES (far, crumbs), faith (far, relics). World total 9; all worlds 27.
- LevelDef.fallBack: in main's lavaStep, below y -3 he goes back to lastSafe and takes PlayerController.takeFall(1) (no rolling or guarding out of it; no second hurt during post-hit invulnerability). lastSafe is now kept up in every level, not only lava ones.
- New track 'echo' (music.ts); the builder's music menu now lists all four tracks.
- The gallery's enemies have their arenas clamped to their own ledge.
- Room walls in the Hollows areas are set to roughRock in hollows.ts (rockWalls), leaving the shared cave theme alone.

## The last world: Grimsqueak's Keep
- src/levels/keep.ts: keep() ('keep', world 'keep', fallBack) and throne() (id 'lair', world 'keep', no returnTo). The old lair CustomLevel in kingdom.ts is removed.
- Wedges: KEEP_WEDGES (walk, chimney, stack, guard, caps) + THRONE_WEDGES (boss). Club door need 18. All worlds: 33 wedges.
- Theme 'keep' (themes.ts, doorway.ts, courseDoors.ts; room walls take keepStone). Textures keepStone and royalCarpet (textures.ts, 'keep' section).
- Music 'march' (music.ts): kick and snare are combat layers with floors, so the march is always there and swells in a fight.
- Ending: STORY.hub = davespotOpen with id 'hub.open', openAfter 'lair', fromSpawn (LevelStory.fromSpawn: main skips the door arrival so the scene starts at the Club's spawn). Club storySpots dave/mort/wren; hidden villain NPC shown after (same code as davespot).
- tests/story.ts pool check: lava may run to the edge of a drop (it is never swum in).

## Cistern side halls
- src/levels/cisternHalls.ts: cisternWorks() wraps waterworks() (id 'works'; pickups renamed works: -> cworks:; tower relic removed for the wedge; exit on the south wall by the spawn), sludgePit() (id 'sludgepit', custom pieces copied from the old Plank Pit).
- Cistern courseDoors: Pump Room (east, z 2), Waterworks (north, x -36), Sludge Pit (east, z 40).
- Wedge totals: Cistern 13, Foundry 10, Hollows 9, Keep 6 = 38. Club doors want 4 / 10 / 18.

## Balance
- src/data/balance.ts: BALANCE.doors (foundry 4, hollows 10, keep 20) and BALANCE.prices. HUB_DOORS' `need` and SHOP's crumbs/caps are getters reading it, so Tweaks changes show at once (door signs on the next Club visit).
- Tweaks: group 'Doors and prices', paths 'balance.*' (ROOTS has `balance`).
- tests/balance.ts: each door asks between a quarter and two thirds of the wedges open by then; doors climb; all gear affordable from the worlds but not from the Cistern alone.

## Gear effects
- equipment.ts: ItemDef.perk / cost (words) and fx (GearFx); gearMods(ids) multiplies them (hearts add, fireproof ORs). NO_GEAR is the identity; the starting gear has no fx.
- PlayerController.gear (set in main's applyGearFx on every equipment change): run, swim, grip (ground stop), wallKick, longJump, swing (attack timer rate), parry, guardMove, blockArc; maxHp = health.max + hearts. combat.ts multiplies sword damage.
- SENSES.notice (enemies/foe.ts) scales roach and toad notice range. Sight scales the level's fog in applySight(). Fireproof skips the heart in lavaStep (lava and fallBack).
- Hud.setMax(n) hides hearts beyond n. RatModel.setSword / setShield recolour by mapping the model's first colours (remap()).
- New items: minerHelm, cleaver, buckler (shop and balance prices, Tweaks sliders).

## Photo mode
- src/ui/photoMode.ts: PhotoMode (overlay, input, camera, capture) and pure helpers (LOOKS, lookCss, applyLook, orbitFrom/orbitPosition/stepOrbit, photoScale).
- main: `photo` pauses like fly (frameDt 0); its input block sits before fly's; the rat animates on rawDt with the pose as `act`; photo.applyCamera() before render; photo.capture() straight after render (the canvas has no preserveDrawingBuffer). canPhoto() keeps it out of scenes, talks, the builder, the shop.
- Keys: O opens; in photo mode arrows/drag circle, W/S zoom, A/D turn him, Q/E rise, Z/X field of view, 1 look, 2 pose, 3 frame, 4 hide, Enter/Space take, Esc/O/P leave. Pad: right stick circle, left stick zoom/turn, L1/R1 look, stow pose, dodge frame, attack take, menu leave.
- The gameWrap gets .rq-photo-on, which hides every overlay but the canvas and the photo UI.

## The archive
- levels.ts: ALL_LEVELS / LEVELS / ARCHIVE. LEVELS = hub + levels with a `world`; ARCHIVE = the rest (sewer, caps, hunt, waves, leap, crates, waterworks, plankpit, cellars, liftshaft, furnace, webhollow, davespot). levelById falls back to the archive.
- main: the tracker covers ALL_LEVELS (so an archived level opened by hash works); the purse counts LEVELS only; levelOrder is the archive's chain; the WORLDS menu no longer lists OLD: rows.
- Tests that exercise old levels import ALL_LEVELS as LEVELS (leap, levels, movers, story).
- Testroom build hash: level=hub&unlockall.

## World sound and air
- synth.ts: new loops drain, machine, wind, hall, lavaBubble, fire (seamless via sfx()); one-shots clank, hiss, pebbles, chainClink, toll. `wob()` makes loop modulation fit the loop length.
- audio/ambience.ts: WORLD_SOUND by theme (and hub), Ambience.step() schedules the far-off noises. main: beds via audio.loop each frame (WORLD_BEDS), lava and brazier nearness loops; `braziers` filled on level load.
- world/motes.ts: MOTES by theme; MoteField (THREE.Points, additive, vertex colours as brightness, fades with distance, wraps round him). main: setTheme on load, update(frameDt...) per frame (so photo mode freezes them).

## Dressing, round two
- Decor kinds banner, torch, gauge, crystal, roots (layout.ts; chamber.ts builds them; `swayers` and `needles` animate in update()). Banners use their own double-sided clothMat.
- Builder pieces of the same names (custom.ts: BANNER_COLORS, WALL_YAW; dir = the wall it hangs on, like webs and windows). Crystals add a small hidden solid.
- Keep in mind: the game camera only sees about 5-7 units up a wall at normal distances; tests/decor.ts keeps banners within 7.2 of the floor in front of them, wall pieces against a wall, roots 2.5+ above the floor.

## Gear secrets
- WedgeDef.gear (item id): reach.ts `unreachable` skips such wedges (and their reach goals); tests/secrets.ts proves them with that gear.
- Controller: no jump from water when ceilingOver(colliders, 0.9) (a roof right over his head).
- custom.ts: river `props.speed` sets the current's strength (default 1.8).
- Cistern drain constants DRAIN_* (cistern.ts); Foundry MOUTH (foundry.ts); Hollows hollowsDark() with DARK_FOG / DARK_STONES / DARK_START / DARK_END (hollows.ts).
- Wedges: Cistern 14 (6 + 3 + 3 + 2), Foundry 11, Hollows 10, Keep 6 = 41.
## Soft-lock check
- reach.ts: `computeReach(def, { traps: true, gatesShut? })`. Records every step (int pairs), builds reverse adjacency, searches back from the exit's front (the spawn in the hub) plus void-fall nodes (not in fallBack levels or over lava). `traps` = reached but not reached back.
- Trap mode only: clearFlight() stops jumps through walls taller than his apex (maxClimb(false) + 0.15). gatesShut adds gates as 0.6-thick walls.
- SWIM_HEADROOM 0.6 (was HEADROOM 0.9 for swim nodes).
- tests/softlock.ts: all LEVELS trap-free; starts and the 15 door arrivals (door + 3.2 along yaw, as main.ts) stand with the real controller; a synthetic walled yard must be caught.
- Builder: jump check runs the trap search 60 ms after the plain one; orange squares, and a line in the message.
- Exits: a world's own door opens after its first wedge (GoalTracker.mainDone); side areas open at once; the menu's WORLDS screen always warps out.
## The flaky toad test
- tests/footing.ts "a chased toad never ends up in a wall, in the block, or over the hole" failed about 1 run in 20.
- Cause 1 (why it would not repeat): Toad.hop() rolled its away-angle and its side with Math.random, not this.rng, so the test's fixed dice did not cover them. Both use this.rng now. New check: the same dice give the same chase (catches any new raw roll).
- Cause 2 (the real slip): a short diagonal pounce near a corner could pass a few thousandths into a block's corner or a hole's corner between its quarter-step checks. The path check (crouch -> pounce in toad.ts) now also tests the two other corners of the box between each check and the last; with box scenery, a line clipping a corner always puts one of them inside. 0 of 5000 seeded runs fail (5 of 1500 before).
- The chase test runs 60 seeds now (run 23 was a failing one). All 49 test files ran 60 times (quick) or 5 times (slow) with no failures.
- Roaches and the boss move in small steps guarded by keepOnFloor every frame; only the toad's pounce flies a straight line, so only it needed this.
## Button prompts, Steam Deck, rumble
- glyphs.ts: TABLES per PadKind (playstation, xbox, nintendo, deck, generic). labelKind(): player's GlyphMode ('ratquest.glyphs') > gamepadInfo.kind > default. lastDevice() before any input = setDefaultDevice (touch on web, keyboard on desktop, pad on Deck).
- prompt(action, device?) for BindAction or fixed UI actions (confirm south/Enter, back east/Esc, tabPrev l1/Q, tabNext r1/E, menu start/Esc, respawn select/R) and 'move'/'look'/'nav'. helpLine([[action(s), word]]), pair(chips, word). CSS once via ensureGlyphCss(); chip text floor 13px.
- promptStamp() changes with device/kind/mode; main's frame() then calls menu/shop/photo/boot refresh(). Talk hint and dialog (dialog.morePrompt) use chips.
- controls.ts: PadKind 'deck' (28de:1205); setPadKindOverride(kind) for labels only (layout still by the pad's id). platform.ts: steamDeck, padType(). steam/main.cjs: steam.input.init(), ipc 'rq:info' (deck) and 'rq:padType'; main.ts polls every 2 s (kindForSteamType).
- rumble.ts: RumbleLevel off/low/full ('ratquest.rumble': '0', 'low', '1'), wedge(), quake(amount). Menu RUMBLE row cycles.
- Photo mode pad: frame = lock (R2/R3), rat = select; back/menu leave.
- HUD (collectHud, goalHud): font max(13px, 1.8vh).
- scripts/deck-check.mjs: puppeteer-core + Chrome; W/H/MIN/SCREENS/SEED/PAD env. scripts/files-check.mjs: keyboard run through the file screen.
## Save files
- slots.ts: FILE_COUNT 3; GAME_KEYS (save, quicksave, autosave, collectibles, equipment, inventory, levels, story, wallet, stickers, meta). fileKey(1, k) = k; files 2-3 'ratquest.fN.*'. Shared: settings, bindings, glyphs, rumble, display, audio, tweaks, my levels, builder.
- FileStore (the per-game stores and the saves use it); main.ts: deviceStore, files, useFile(n) (flush time, switch, reload all), reloadFile(), playFile(n) (empty -> erase leftovers + restartGame; else loadLevel(saved, true) + applySave).
- Every per-game store has reload(): LevelProgress, CollectibleTracker, Equipment, Inventory, Wallet, StorySeen, Discoveries.
- Empty file = no save and under a second played (start-up writes a few things to the last file before one is chosen).
- Time played: meta.v1 {played}, counted when not on the title/menu and the window shows; flushed every 30 s, on autosave, save, quit to title, pagehide.
- Boot: stages logo/title/files/loading; BootCmd adds left/right/copy/erase (pad: north copies, west erases; keys C, Delete/X). OK on "erase?" cancels.
- Menu: inGame() false when opened from the title (no save/load/restart/quit-to-title there); fileInfo(); toTitle().
## New beasts: Ironback and Flitter
- foe.ts: Foe.kind adds 'ironback' | 'bat'; takeHit(damage, x, z, how?: 'sword' | 'plunge' | 'shock'); optional deflects(), biteDir, wallAt, canFly. SENSES.quiet = sneaking on the ground (main sets it each tick).
- combat.ts: a sword hit on something that deflects() -> events.glanced, player.recoil() (TUNING.health.recoilPush 4.8, recoilStun 0.35), no damage. Plunge dive passes 'plunge', the landing blast 'shock' (a blast from the front also glances). Bites use biteDir ?? facing. No body push during 'ram'.
- ironback.ts: IRONBACK table; states idle/chase/windup/ram/tossWind/toss/buckWind/buck/recover/stagger/flipped/rise/dead/return. deflects = more than rearArc (1.2) from straight behind, unless flipped or a plunge. Ram: wallAt ahead -> flip ('bonk'); stopped by an edge -> recover. lungeLanded: parried ram flips; blocked -> recover. events[] for sounds.
- bat.ts: BAT table; y = bottom of its body (so the usual same-level test is only true at the bottom of a swoop or on the floor). Swoop path from -> low point (his feet + 0.25) -> mirrored far side; progress u(t) = t + ease/2pi sin(2pi t) slows it at the bottom; bite only for u in swoopGrab. rouseRoost(bats) wakes neighbours (main calls it after updates, before events are emptied). Knocked down: 'fall' to floorY, 'lost' (dead) if canStand says no floor there.
- Models: ironbackModel (steam wisps, glance sparks, hot horn tip, flips over); batModel (root stays at the origin: 'flier' moves, 'perch' stays at the roost; perch 'rock' or 'chain').
- main.ts: addEnemy cases; wallAt and canFly from chamber.colliders; beastSounds() (snort, flipClang, batSqueak, flap: new SFX); glance -> clank + sparks + small hit-stop.
- Levels: EnemySpec.type 'ironback' | 'bat', perch. Custom pieces 'beetle' and 'bat' (ENEMY_PIECES), builder palette (Ironback X, Flitter A).
- tools/modelsheet: npx vite build tools/modelsheet --outDir ../../.sheet --emptyOutDir --base ./ ; open .sheet/index.html (#ironback, #bat, &spin=yaw).
## Model rework (enemies and NPCs)
- render/modelKit.ts: paint(geo, color | (nx, ny, nz) => color, shade) colours by position in the shape's own box (-1..1) and darkens the underside; modelKit(mat) gives blob/spar/cone/box; bead() for unlit eyes; mix().
- scuttlerModel: two hinged wing cases (flare in the tell, rattle on a hit, fall open dead), ribbed belly, amber-rimmed shield, brows + pupils, palps, tail prongs, knee joints, leg spines, feet. Dead: legs fold over the belly (they used to point at the floor). Legs splay as the body drops so the feet stay on the floor.
- toadModel: blotched skin, warts and glands as bumps, nostrils, eyes (rim, slit pupil, glint) that blink outside tells, a lower jaw with a dark mouth and tongue, bent front legs with fingers, webbed back feet, shaded throat sac (belly-coloured at rest, same bright green when full). BUG FIXED: dying, it rolled about y = 0 and ended under the floor; it now turns about its middle.
- ironbackModel: eye slits and brows, clubbed feelers, rings on the horn root, knee joints, shin plates, claws, a bright worn rim on the shell.
- batModel: paler trailing edge on the wing skin, neck ruff, eye sockets and brows, pink inner ears, nose leaf, longer fangs, toe claws, thumb claws.
- npc.ts: mouse (Pip) has arms (right paw on the pole, left waves when talking and shrugs), a tapered tube tail, whiskers, teeth, scarf, pack with flap/buckles/pockets/map/swinging pot, cap with a bobble, a caged lantern that flickers, ears that twitch; bird (Finch) has barred wings on shoulder pivots, a two-part beak that opens on pulse(), forked tail that flicks, knotted neckerchief, toes, head that snaps between tilts; both blink. Pigeon: wing bars, toes, banded tail. Villain: eye sockets, hot centres, slit pupils.
- Sizes, feet-on-floor, talk range, tells (sac swell, eye colours, horn heat) and every state name are unchanged; no logic file was touched.
- tools/modelsheet now has #roach, #toad, #npcs and &cam=...; scripts/sheet-shots.sh takes the pictures. tests/models.ts (29 checks).
- Left as it was: the grounded bat's far wing edge and the roach's feelers can dip under the floor a little (measured in tests/models.ts so it cannot get worse). The hero's model was not touched.
## Wren and Mellow Mort
- npc.ts: NpcLook + lookOf(kind, name): a bird whose name contains WREN is 'wren', a mouse whose name contains MORT is 'mort' (levels upper-case names; player-built levels get it too). NpcKind, voices and level data are unchanged.
- Wren: brown, pale below, barred wings and tail, tail cocked up (tailRest), thin yellow beak, one pink head feather, teal collar with a gold stud, 0.9 scale.
- Mort: grey-lilac, olive jumper with a cream stripe, maroon hat, slippers, half-open eyes with lids (eyeOpen 0.45, long blinks), both paws on a steaming mug, slow nod, drooping ears. No pack, pole or lantern.
- portrait.ts: drawPortrait(canvas, kind, name) draws their own faces (dialog passes the name). Colours follow their sticker icons.
- Sheet page #npcs2; tests/models.ts has 9 more checks (38).
## Four more gear secrets (45 wedges)
- Cleaver / Coal Bin (coalcellars 'bin'): foundry.ts BIN, BIN_CRATE. Box.tough -> Crate.tough (chamber draws iron straps and studs). combat.ts resolveCrates: a tough crate breaks only to a sword blow with gear.damage >= HEAVY_BLADE (2); anything else sets events.crateRang (main: low clank, hit-stop). sameLevel for crates now uses the crate's own top and bottom (a 2-unit crate could not be hit from the floor).
- Ember Helm / the Pyre (keep 'pyre'): keep.ts PYRE; LevelDef.fire / Layout.fire (FireVolume), layout.fireAt(). chamber draws coals, flame cones and a light. main lavaStep: in a fire and not fireproof -> takeFall(1) (no roll or guard helps) and back to lastSafe; fireproof walks through. lastSafe is never set inside a fire.
- Moss Scarf / the Sleeper's Wedge (webs 'hush'): GoalDef 'unseen' {radius}. goals.ts SHY_RANGE (8), keepersOf() (ground beasts that start within radius; not bats), shyShows() (all keepers alive and 'idle', and he is at least SHY_RANGE * gear.notice from each, height ignored). main sets goals.unseen each frame; no chime when it comes and goes. A dead keeper hides it until the level is entered again.
- Buckler / the Fencer's Wedge (works 'duel'): GoalDef 'parry' {count}; goals.parries++ on every 'parried' result; reset() clears it. Not tagged gear (so the jump checker still checks it).
- Wedge totals are counted from the levels, so menus and the Club show 45 by themselves. BALANCE.doors unchanged (4 / 10 / 20).
- Not in the level builder: fire, tough crates and the two new goal types exist only in the built-in levels.
## Hero: ledge grab, hang and pull-up
- controller.ts: `ledge` (the edge he holds, from his feet in his facing frame: y up, z forward), `hangTime`, `climbProgress`; `climbRise(f)`, `HANG_DROP` (1.05), GRIP_IN (paws 0.04 past the wall face). TUNING.moves.climbTime 0.32 -> 0.5 (slower, never easier).
- ratModel.ts: poses HANG, CLIMB_PULL, CLIMB_MANTLE; `plantPaws()` is a two-bone solve run after the springs that puts both paws on the edge (weight `gripAmount`: on while hanging and for the first half of the climb). Drawn HANG_LIFT (0.17) higher and against the wall while hanging so the paws reach; drawn rising evenly through the climb (the game lifts his feet early). Sword and shield show on his back in 'hang' and 'climb'.
- RatAnimInput: ledge, hangTime, climbProgress (optional; main.ts passes them).
- Sheet: `#hero` (seven moments of the climb, real controller), `&only=N` for one figure; scripts/sheet-shots.sh takes hero-side0..6. tests/models.ts: six hero checks (paws within 2 cm of the lip while hanging).
## Hero: audit of every move
- tools/modelsheet `#moves`: 25 scenarios (idle ... stowed run), each driven through the real PlayerController and stopped at its telling moment; `&only=N`, `&settle`. scripts/sheet-shots.sh writes move0..24 and scripts/contact.py tiles them.
- Plunge: PLUNGE_WIND (sword high, point down in front), PLUNGE_DIVE (blade straight down under him), PLUNGE_LAND (one knee, blade standing in the ground). Before, the blade lay forward along the floor on landing. Wrist note: blade is local +Z of the forearm; wrist x of about +2.1 points it down from a lowered arm, about -2.2 from a raised one.
- Wall: controller `onWall` (in the air, touching a wall he faces) and `kickProgress` (0..1 over wallKickLock); poses WALL_BRACE (feet on the wall) and WALL_KICK (legs driven out behind), blended into the air pose. main.ts passes both.
- tests/models.ts: five more hero checks (blade direction in dive and landing, feet on the wall, legs behind in the kick).
## Grimsqueak's new look (the evil form)
- src/npc/grimsqueakModel.ts: GrimsqueakModel (root at the ground; `update(dt, GrimInput)`: low, float, bow, still, talking, mouth, gesture, reach). Built from modelKit shapes in the hero's proportions (long cone snout, big ears), scaled 0.94 to GRIM_HEIGHT 2.4. Parts: crown (uneven iron spikes, one snapped, red stone), torn ears, sunken burning eyes with slits under scowling brows, hinged jaw with a beard tuft, four tapered tube whiskers on pivots (they lag behind his turning and rising), standing crimson-lined collar, ermine and spiked pauldrons, the Engine shard set in his chest with pulsing veins, robe with ragged hem, two-bone arms with three fingers and a thumb, cloak with a stitched crown, a rip and seven swinging rags, a nine-joint tail (hooked up when he floats, laid on the floor when he is down), the turning rings of light under him.
- GrimGesture: rest (a paw on the shard), cast, conjure (a ball of light grows in his raised claw), point, rear, sweep, raise, smash, slump, rage, offer. STANCES holds each one's arm poses, spine, head, jaw, eye heat, tremble, ears.
- npc.ts: the villain branch is now `this.grim`; NpcAct gained `gesture` and `float`; VILLAIN_FLOAT 0.6 for a level; Npc.flash(). The old blob villain (huge round head, floating paws) is gone.
- main.ts: GRIM_GESTURE maps every GrimState to a gesture (volley cast, orbWind conjure, bat point, swoopWind rear, swoop sweep, slamWind raise, slamFall smash, spent/stunned/dead slump, repel/rage rage). In the fight he hangs at GRIM_FIGHT_FLOAT 1.15, so his lowest rag at the bottom of his bob is above the sword's reach (the old one's hem hung inside it though he could not be hit). The scale shudder and swell tells are unchanged. No fight logic was touched.
- Flat pictures: redrawn to match, then PUT BACK to the originals at the owner's wish (he likes the blocky portraits as they were): portrait.ts (talk box), icons.ts sticker 'grimsqueak', world/portraitTexture.ts (the painting in Web Hollow). Only the 3D model is new.
- Sheet pages `#grim` (twelve poses, &only=N) and `#faces`. tests/models.ts: 17 Grimsqueak checks (every gesture floating and grounded, each tell's claws in a different place, whisker shape, orb, reach height).
- Seen in the game: the throne-room opening scene and a live fight with lock-on (puppeteer scripts in the session scratchpad, not kept). At 7 units he fits the camera; rising for the slam his crown can touch the top of the screen.
## Collectibles: new models and look
- src/world/itemModels.ts: `facet(geo, paint)` (flat faces, one colour per face by its middle and normal); `itemMaterial(shine)`; crumbGeometry (doorstop wedge of cheese, bowed orange rind, six holes with pale rims), capGeometry (crown cap on its edge: star on red enamel, crimped skirt, cork back), relicGeometry + relicRingGeometry (eight-sided cut gem and a thin ring), wedgeGeometry (chamfered wedge, ridged rind arc, ten holes; painted, not lit, so fog and dark do not dim it); twinkleGeometry, raysGeometry, shadowGeometry, glowMaterial, twinkleSize; `Sparks` (pickup bursts, own dice).
- ps1Material: option and uniform `shine` (with `lit`): a face square to the half-vector flashes. 0 everywhere else, so nothing else changed.
- collectibleMeshes.ts: CollectibleVisuals(level, tracker, { floorAt }) and update(dt, time, face?). ITEM_LOOK per kind (turn speed, shadow width, twinkle period and size, spark colour and count). Caps turn fast like coins; relics carry a counter-turning ring. Shadows only where main's `floorAt` finds floor within three units below (not on movers, not across water or lava). `prep` and `merge` are still exported from here.
- wedges.ts: WedgeVisuals.update(dt, time, out, got, face?): body, a `glory` group facing the camera (halo, turning rays, three twinkles), shadow and a pool of light at its base; a taken wedge is the same shape in pale see-through paint; taking one bursts 24 sparks (not on load, not when a hidden one comes back).
- drops.ts: the nacho can is faceted and lit with a maker's mark, and carries its shadow (held on the floor as it hops).
- Sizes and pickup distances are unchanged. HUD and sticker icons were NOT redrawn (the owner likes the flat pictures as they are).
- Sheet page `#items`; tests/items.ts (30 checks).

## Plunge wind-up
- animations.ts PLUNGE_WIND: the sword is raised over his head, blade up and tipped back, both paws to it, knees tucked (it sat in front of his face). tests/models.ts holds it there ("winding up a plunge, the sword is raised over his head").
- DEAD: the tail is laid along the floor between his feet (`tail: [-1.07, 0.1, -0.08]`); it used to hang down through the floor and vanish. This is the hero's pose and the Keep Guard's.

## New enemy: the Keep Guard
- Rules: src/enemies/guard.ts (`Guard`, kind `guard`, table `GUARD`). States idle, chase, hold, windup, thrust, recover, broken, stagger, return, dead. He stands his post facing `facing`; noticed at 9 (Moss Scarf rules apply); holds at 2.5 with his shield towards the rat, turning at 5.5 rad/s (too fast to run round), backing off if crowded. `deflects()` is true while chase/hold/windup and the blow comes from within 1.2 rad of his front: the sword clanks (`events.glanced`, hero recoils). Two blocked blows inside 2.2 s and he strikes back at once with a 0.45 s tell, without waiting his turn. His own thrust: 0.6 s tell (tip glints), 0.2 s lunge, reach 1.2, 1 damage; a miss leaves him open 1.05 s, a block 1.5 s, a perfect guard breaks his guard for 2.6 s, a plunge onto a raised shield breaks it for 2.0 s without wounding him. 4 hit points. Does not respawn unless the spec says so.
- Model: src/enemies/guardModel.ts. He is the hero's `RatModel` in grey fur and royal purple, 1.1 times the size, with hooks added to RatModel for this: `ownMaterials()` (so flashing him does not flash the hero), `setWeapon(obj)` (the spear in place of the sword), `setShieldScale(k)`, and `act.pose` + `act.each` (parts of a pose laid over the body's own, each part with its own weight).
- The laid-over poses are POST, MARCH, LEVEL, DRAW, THRUST, SPENT, BROKEN. **The spear-arm numbers in them were solved, not guessed**: for each pose the hand was put at a chosen point and the shaft along a chosen line, by searching the seven arm angles on the real rig, and rejected if the shaft touched his body. If a pose's chest or hips change, its arm must be solved again: `tools/posesolve.ts` does it (how to run it is at its top; it prints the numbers to paste in and says what the shaft touches). Hand-tuned Euler angles are what put the spear through his head the first time.
- A part a pose does not name is let go (`hold` weights fade to 0 and the body underneath has it back). Before this, parts stuck: after one thrust his feet stayed planted and his hips stayed turned for good.
- Dead, the spear leaves his hand (`dropSpear`: re-parented to the model's root, falls flat beside him in a third of a second); alive again it goes back with `setWeapon`.
- Piece `guard` in levels and the builder (palette "Keep Guard", symbol D, takes `dir`); `EnemySpec.facing`. Combat's body separation skips state `thrust`. Sounds in main.ts `beastSounds`/`soundWorld` (existing sounds re-pitched). Sticker `foe:guard` with a flat icon in the same plain style as the others. Tweaks group "Keep Guards" (root `keepguard`; `guard` is taken by the hero's shield tuning).
- The Keep: the two courtyard roaches and one battlement roach became guards (enemy count unchanged at 10, so the "Beat every guard" wedge still counts the same number).
- Tests: tests/guard.ts (33 checks, the fight, with the real controller, combat and director) and tests/models.ts (11 checks on how he looks: on every frame of every move the shaft is ray-tested against his head, ears, body, shield, legs and tail; neither end under the floor; upright at his post with the butt on the ground; level and pointing at his mark coming on, drawn and thrusting; the thrust's point reaches where the blow lands; nothing of a lunge left in him afterwards; feet step; dead, the spear lies flat; alive again it is back in his hand).
- Sheet page `#guard` (ten states; `&only=N`); `sheet-shots.sh` takes each state alone from the front, his spear side and behind (`guard0-front` ... `guard9-back`).
- Not done: nobody has fought him by hand. He has no voice of his own (re-pitched hero sounds).

## New enemy: the Orchid Mantis
- Why: the owner liked the Keep Guard's fight ("closer to the Dark Souls feel") but not that he is the hero's body again. New enemies are to be as detailed, insects, and their own shape.
- Rules: src/enemies/mantis.ts (`Mantis`, kind `mantis`, table `MANTIS`). States idle, stalk, sway, windup, slash, crouch, leap, stuck, recover, hop, stagger, reel, return, dead.
  - It sways 2.5 from the rat, stepping round him. `poised` (swaying or stalking, hop off cooldown): when the rat STARTS a swing (`threat` going true, as the roach uses) within 2.8 and in front of it, it hops 2 back out of reach, then cannot for 3.2 s. After a hop it is in leap range and usually leaps straight back in.
  - Cuts: wind-up 0.5 s (scythe raised, tip glints), slash 0.16 s stepping in, reach 1.3, 1 heart. Three times in four a second cut follows with the other scythe: quick (0.26 s) or held (0.64 s), a coin toss; the held one is there to catch a roll made on the rhythm of the first. Then `recover` 0.95 s, open. A blocked cut does not stop the combo. A perfect guard on either: `reel` 2.4 s.
  - Leap: from 3.4 to 6.5 away, when its wait runs out while it is still coming in, or the rat has backed off. `crouch` 0.6 s (wings flare, both scythes glint), turning with him for the first 60%; then 0.42 s through the air to 0.8 short of where he stood, 2 hearts as it lands. Missed or blocked: `stuck` 1.3 s (0.7 if it hit). It never leaps through a wall (`wallAt`, set by main.ts) or lands off the floor (`canStand`), and a hop goes sideways if there is no floor behind.
  - No armour, no `deflects`. Hit while stuck, reeling or spent it stays so. Two hits in a row and it hops away as soon as it can, cooldown or not. 6 hit points. A plunge lands (it does not see it coming).
- Model: src/enemies/mantisModel.ts. Nothing from RatModel. **A pose is a set of directions, not joint angles**: where the neck, the abdomen and each of an arm's three pieces point, as [outward, up, forward]; the pieces are laid end to end. So poses can be read and written by hand without the Euler guesswork that sank the guard's first poses. 35 numbers on springs. `yaw`/`roll` turn and lean the whole upper body about the hips.
  - Four legs with two-bone IK, feet planted in the world and stepping in diagonal pairs when the body has moved 0.26 off them (0.16 standing); `tuck` draws them up (hop), streams them behind (leap), or curls them to the belly (dead).
  - Wing cases on the abdomen lift with `wings`; the bright ringed hind wings under them only show when flared (the leap's tell). Glints on the scythe tips in the tells, as on the guard's spear.
  - `blades()` gives each arm's elbow, wrist and tip in the world (the tests use it).
- Piece `mantis` in levels and the builder ("Orchid Mantis", symbol N, takes `dir`). Sounds in main.ts `beastSounds` (existing sounds re-pitched). Sticker `foe:mantis` with a flat icon. Tweaks group "Mantises". Combat's body separation skips states `slash` and `leap`.
- Placed: Hollows, Webbed Gallery middle ledge (was a roach); Web Hollow, middle floor (was a roach). Enemy counts unchanged.
- Tests: tests/mantis.ts (38 checks: the fight, with the real controller, combat and director) and tests/models.ts (18 checks on how it looks: both scythe arms ray-tested against its head, neck, body, wings and legs on every frame of 20 moves with their lead-ins; nothing under the floor except scythes driven in after a leap; feet planted while it sways and stepping when it walks; where the raised scythe, the cut, the crouch, the leap, the stuck scythes and the reel put things; dead on the floor, then gone). Those checks found two faults before any picture did: scythes through its own head in the leap, and one side under the floor when dead.
- Sheet page `#mantis` (15 states; `&only=N`); `sheet-shots.sh` takes each from the front, its right side and behind (`mantis0-front` ... `mantis14-back`).
- Not done: nobody has fought it by hand. In Web Hollow its cuts can knock the rat off the middle floor into the drop.

## Fixes from the owner's Cistern playthrough (2026-11-14)
He sent screenshots as he played. Each of these is his report, the cause, and the fix. Tests: tests/fit.ts (41 checks) unless said.
- **Hanging from a pillar clipped into its capital.** A pillar's capital is drawn 0.3 wider than its collider all round (chamber.ts, `PILLAR_LIP`); he hung flush against the shaft, head and shoulders inside it. Now `Aabb.lip` says how far something drawn overhangs a box's top; the grab hangs him from that edge (he swings out over a twelfth of a second, `hangSlide`), and the pull-up lands him where it always did. Tests in tests/models.ts ("hero on a pillar"); sheet: `#hero&lip`.
- **Catching a ledge with no room to pull up hurt him.** Two faults. (1) The grab only checked for room to STAND at the end; now it checks the whole pull-up (from where he hangs, over the edge, to where he stands, to head height), and without room he does not catch the edge. (2) What hurt him was `crushCheck` in main.ts, which fired whenever his body was inside the underside of any block in a level that had a platform. It is now `pinnedUnder()` (src/world/crush.ts) and needs a moving platform to be carrying him. The owner said a squeeze like that is a fair mechanic for moving things, not for static ones. The test prints how many tight places each world has (cistern 4, hub 3, foundry 3...): they are not errors now, just edges he will not catch.
- **Wall hangings floated off the wall and ran into the floor.** Levels put them by hand near a wall (94 of 108 were more than a quarter of a unit off it). `mount()` (src/world/hangings.ts), called for every piece of decor as a room is built, stands slime, webs, banners, torches, gauges, windows and portraits flat on the wall behind them, turns them to face out (windows had been drawn back to front: the levels do not agree which way a hanging's arrow points, so the side is taken from where it was put), and keeps their lower ends above the floor or ledge under them (shorter drips, shorter banner, smaller web; torch or window moved up).
- **The lift sank into the floor.** A mover's `y` is its TOP; one put "at floor level" had its whole body in the floor at the bottom. `seatMovers()` (hangings.ts), run by compileCustom and again by buildChamber, raises any platform whose body would be inside the top of something solid under its middle. A lift keeps its top stop and travels less; a slider rides higher. A slider over a gap, level with the ledges, is untouched. **So a lift on a floor now rests half a unit up and is hopped onto, not walked onto.** A rat standing where one comes down is pushed out from under it (chamber.ts `stepMovers`). tests/movers.ts was updated for this.
- **The floor button flickered.** Its pressed pad dropped to exactly the height of the slab under it. It is now a pad in a ring-shaped frame (src/world/plates.ts): up it stands proud, down it is sunk inside the frame, never level with anything.
- **The black holes in walls looked like ways in.** `buildDrain()` (src/world/drain.ts): the mouth has iron bars and a ring of separate bricks with a keystone. `gap: true` on a hole (the two story tunnels) breaks one bar off short: room for a rat.
- **Every crate dropped nacho cheese.** `CRATE_DROPS` chance 1 -> 0.1 (he said "an RNG thing, 10%"; speech-to-text wrote "orangey"). Slider "Chance a broken crate or barrel drops a nacho can". tests/drops.ts.

## Shared insect rig (src/render/bugRig.ts)
`Springs` (a row of numbers on springs), `aim(obj, dir, edge)` (point a part's +X along a direction), `Walker` (legs of two bones with feet planted in the world, stepping in pairs; `fold` says where a foot goes when it is off the ground), `ease`, `twoBone` (two bones laid from a joint to a target), `Probe` (the points of a part's meshes, for holding it off the floor: the hornet's and the ant's use it). The mantis model uses all of it; the Stag Knight's is to.

## New enemy: the Stag Knight
- The heavy. Where the Keep Guard asks "when do I swing?" and the mantis "can I make it miss?", this one asks "where do I stand, and how greedy am I?".
- Rules: src/enemies/stag.ts (`Stag`, kind `stag`, table `STAG`). States idle, chase, windup, slam, stuck, sweepWind, sweep, recover, stompWind, stomp, settle, kneel, return, dead.
  - It walks at 1.7 and turns at 1.9 rad/s (a running rat gets behind it). 10 hit points. `immovable`: combat pushes the RAT out of it, not it out of the rat.
  - **No flinch.** `takeHit` never changes its state, except: each blow takes poise (5; a plunge 3; all of it back after 3.5 s without a blow), and at none it `kneel`s for 2.2 s (open; hits land and it stays down), then rises with it all back.
  - Slam: square in front (within 0.5 rad) and within 2.6. `windup` 0.9 s (turning with him for the first 55%), `slam` 0.18 s stepping in, then `stuck` 1.4 s. Narrow (0.42 rad each side), reach 1.3, 2 hearts, `heavy`: a plain block does nothing (`takeHit(..., heavy)` in the controller); a perfect guard turns it and drops it to its knee.
  - Sweep: within 2.0 and anywhere in its front (if square on, 55% of the time, else the slam). `sweepWind` 0.65 s, `sweep` 0.22 s, `recover` 0.8 s. Wide (1.9 rad each side), reach 1.25, 1 heart, blockable.
  - Stomp: the rat further than 1.9 rad round from its front and within 2.3 for 0.9 s, whoever's turn it is. `stompWind` 0.55 s, `stomp` 0.14 s, `settle` 0.6 s, then not again for 2.5 s. All round, reach 1.9, 1 heart, `ground`: it misses a rat in the air (`bite.ground`, combat).
- Model: src/enemies/stagModel.ts, on bugRig. **The hammer is posed first** (`grip`: where its right-hand grip is over the floor; `dir`: which way the shaft points) and both arms are laid to it with `twoBone()`, so its hands are on it by construction (`reachShort` says how far short they fall, for the tests). The slam and the sweep are arcs worked out from how far through the state it is (`slamArc`, `sweepArc`), so the hammer comes over the top and lands when the blow does. Its hands are kept 0.6 from the middle of its chest and 0.38 from its head, which carries them round its own body between a pose overhead and one in front; and the floor holds the hammer's head up.
  - Its head is on TOP of its shell and its antlers sweep back over its shoulders. It began with the head low in front and the antlers forward, like a real stag beetle: the hammer went through them in most poses. Do not move them back without re-measuring everything.
  - Wing cases on hinges (`shell`): they lift in the stomp's tell and show the glow under them. The hammer's core is an unlit box behind six iron plates; `heat` runs it from ember to white-hot, and a RED glint sits on it before the slam (white glints mean a blow a shield will stop; red, one it will not).
  - A ring runs out over the floor from where the slam lands and from under the stomp (it shows the stomp's reach).
  - Two feet on the shared `Walker`; dead, it is on its back with its limbs curled and the hammer on the floor beside it.
- Piece `stag` in levels and the builder ("Stag Knight", symbol J, takes `dir`). Sounds in main.ts `beastSounds` (existing sounds re-pitched; the slam and the stomp shake the view). Sticker `foe:stag` with a flat icon. Tweaks group "Stag Knights".
- Placed: the Foundry, east rim of the Crucible's island (was a roach); the Coal Cellars, first bay (was a roach). Enemy counts unchanged.
- Tests: tests/stag.ts (32, the fight) and tests/models.ts (15 on how it looks: on every frame of 16 moves with their lead-ins, hands on the shaft, the shaft and the head of the hammer ray-tested against its head, antlers, body, wing cases and legs, nothing under the floor; then where each pose puts the hammer, and that the slam and the sweep reach where their blows land).
- Sheet page `#stag` (12 states; `&only=N`); `sheet-shots.sh` takes each from three sides.
- Not done: nobody has fought it by hand. It is dark, in a dark place: if it is hard to see in the Foundry, lighten `C.shell` in the model.

## Camera and wall-to-wall kicks (the owner, 2026-11-14)
His words: the left stick "also messes with the camera", worst in wall-jump stretches where "the character won't wall jump anymore"; and after one wall jump towards another wall "there should be something that makes sure that continues to happen instead of ... a slightly wrong angle".
- Cause of the first: followCamera eased the view round behind his facing whenever he moved and the right stick was still (`autoFollowRate` 1.4). A wall kick turns him right round, so the view set off round him, and the stick he was holding towards the next wall no longer pointed at it. `TUNING.camera.autoFollowRate` is now 0. The code and the slider are still there.
- main.ts: lock-on pressed with no target sets `recentre` (0.35 s) and the view eases round behind him (the Souls habit). The right stick or a lock cancels it. KeyC still snaps it.
- controller.ts, the flight after a wall kick (`kickFlight`, `kickX/Z`, `kickCarry()`): for `moves.wallChainTime` (1.5 s) or until he lands, hangs, is hurt or plunges, he keeps the kick's speed (7) straight out from the wall he kicked, whatever the stick does; the stick only trims him sideways (`wallChainSteer` 2.5) and his facing stays along the flight. Hauling the stick right back (more than half of it towards the wall he left) ends the flight. Carried into the opposite wall he is pressed against it, so the ordinary wall-kick window keeps being renewed and he can kick whenever he likes while the flight lasts; falling past its top, he catches the ledge.
- A jump pressed during the flight with a wall within 0.3 s ahead (`wallAhead()`, `wallChainHold`) is kept (`kickHold`) until he touches, and does not spend his air jump.
- The first kick of a chain is as it was (touch a wall in the air, jump within 0.16 s).
- Tests: tests/moves.ts ("Wall to wall", 8 checks; "The view", 3). The chimney climbs in tests/cistern.ts and tests/keep.ts still pass unchanged.
- Not done: nobody has played it. If the carry feels too sticky, shorten `wallChainTime`; 0 turns the whole thing off.

## The Cistern's things to find (2026-11-15: the first level done to the owner's note on collectibles)
His note is in START-HERE ("The owner on collectibles and wall jumps"): fewer, each one earned by a piece of movement,
no trails, no jumping past the way a thing is meant to be got, and far more wall jumps.
- **What there is now**: five bottle caps and three hunks of cheese (24 crumbs and 8 caps before). None is on the floor
  or in a crate, and no two are within twelve of each other.
  - caps: the tallest of the Teeth; the perch at the top of the tower's chimney; the keep in the Bastion (a fight);
    the top of the CLEFT (new: two walls 2.2 apart standing by themselves in the north-west, ten high, kicked up from
    the floor); the top of the FLUE (new: a wall on the pump house roof four units in from the hall's east wall, seven
    up from the roof, kicked up wall to wall).
  - hunks: the OUTRIGGER (new: a slab level with the spiral's last slab and nine north of it, a full double jump);
    the roof of the old drain's room (onto the Bastion's south wall, west along the top of it, a hop off its end);
    the ledge at the end of the WINCH (new, north-east: a lift up nine to a perch, a slider from beside the perch ten
    north, and a jump up three to a ledge on the east wall; the double jump has to come early or he is under the
    ledge by then).
  - So the Cistern has three wall-kick climbs now (it had one) and one ride on moving platforms (it had none).
- **A hunk of cheese** is a crumb with `worth` (collectibles.ts; `props.worth` on a level piece). `tracker.worth()`
  is what the purse counts; `tracker.count()` still counts things (the HUD says 0/3; the pause menu says "Hunks of
  cheese"). Drawn at twice a crumb's size (`HUNK_LOOK`), with the crumb's note and a flourish after it. The shop's
  prices did not move: the Cistern's cheese is worth 24, as it was. The editor cannot set `worth` yet.
- **The caps wedge** is "Five Bottle Caps" and its hint names the five places. Finch has a line about the Cleft.
- **Moved to close short cuts** (each found by the checker with the route taken away): the Outrigger was first hung
  off the seventh slab over the bridge, and could be got from the grand stairs with a running double jump and a
  grab; the second of the Teeth stood a unit nearer the old drain's room, and its roof could be got from it (the roof
  is also half a unit higher now: 7).
- **Tests**: tests/cistern.ts (41): each route played by the real controller at more than one timing, with the thing
  picked up at the end; each route's key piece taken away (the Cleft's second wall, the Flue's wall, the spiral, the
  Winch's slider, its lift, the Bastion, the Teeth) and that thing, and only that thing, then out of reach; the two
  old short cuts shown to have been real. tests/wedges.ts and tests/balance.ts follow (balance counts worth).
- **Old saves**: the hunks are new ids, so nobody has them already; the 24 crumbs an old save picked up there no
  longer count (the purse never goes below nothing). The five caps keep the ids `cap:01` to `cap:05`, so an old save
  that had those has them still, wherever they now are.
- **Not done**: nobody has played it. The other fifteen levels still have their trails. Whether eight is too few for
  a hall this size, and whether the Winch's wait (six seconds or so on the perch) is tedious, are for a player to
  say. The crate yard, the moat stone, the pump house roof and the cliffs' third tier now hold nothing.

## The view when something is behind him (2026-11-15)
Seen while recording the ant pikemen beside a brazier in the Hollows: the view "closed right in". A brazier is a
solid box 0.8 wide and 1.1 high, and the view was one line from his chest to where it wanted to be: anything that
line met pulled it in to just short of it. Backed against a brazier, a crate or a wall it came to rest 0.42 from the
middle of him, which is inside his head. A step away from a brazier or a barrel the line just cleared the top of the
box, and he was hidden behind the thing to the neck. All in `src/camera/followCamera.ts`:
- **Something low is looked over** (`lift`). When something stands between it and him and nothing of it is more than
  `camera.liftOver` (2.4) above his feet, it looks for the lowest line, the same way round him and as far off, from
  which it can SEE him: his chest, his waist (0.25 lower) and 0.22 to each side of him, every box taken 0.06 bigger.
  If there is one within `camera.liftMaxPitch` (1.2 radians; he can tilt it to 0.9 himself) it rises to it
  (`liftInRate` 10) and comes down when the thing is out of the way (`liftOutRate` 3). Looking steeply down it also
  looks up to 0.9 ahead of him, so there is floor in front of him to see. Low things only, on purpose: from far
  enough off there is a clear line down past the face of ANY wall, and without the limit it climbed to a bird's
  view every time he came near one.
- **A wall still pulls it in; pulled in close it goes over his head** (`rise`, `over`, `tuck`). From `pull` 0.55
  down to 0.2 it changes over to a view built round HIM (his chest, not the point leaned ahead of him): 0.12 on his
  side of whatever is behind him, `camera.squeezeRise` (2.6) higher (less under a low roof; with under 0.35 of room
  it stays as it was), looking ahead of him by as much as puts him 18 degrees below the middle of the picture. All
  of him is in the picture and so is the floor three ahead of him.
- **The lean stops short of anything solid.** The point the view is built round leans up to 0.9 the way he runs.
  Running into a wall, that point went on into the wall for a quarter of a second, and with nothing to be seen from
  in there the view shot in to the back of his head and out again. It is now cut back to what can be seen from his
  chest. (This was in every level, whatever was behind him.)
- **It never turns.** `yaw` is not touched; only height and distance change, so the stick means what it meant.
- **Sliders** (Camera): "Rises to look over a low thing behind him: how steeply it may" and "A wall right behind
  him: how far up over his head it goes". With both at 0 the view is the old one frame for frame (tested), the cut
  to the lean included.
- **Tests**: tests/camera.ts (36: the Hollows' brazier, the Club's barrels, the Cistern's crates, a wall, a corner, a
  low roof, backing into each from the open, the sliders off against a copy of the old code, and a minute and a
  half of the real knight running about the Cistern: the old view was within 0.75 of the middle of him for 475
  frames of 5,400, the new for none; he is never out of the picture; it never swings more than 11 degrees in a
  frame).
- **Not done**: nobody has played with it. A brazier's flame is not solid, so looking over the bowl he can still be
  half behind the flame. Something tall and thin (a pipe, a three-crate stack, a pillar) still pulls the view in as
  a wall does. The overhead view shows about four units ahead of him; less under a low roof.

## The Waterworks' high bridge, moved (the owner, 2026-11-14)
He sent a picture from the hop slabs: the plank bridge from gallery to gallery ran 1.5 over them (it stopped jumps)
and was never needed (both galleries have stairs, and the channel can be swum). "Bridges are a cool idea but it needs
to be somewhere else and have an actual function." Now (`src/levels/waterworks.ts`): it starts at the TOP of the pump
tower (8 up) and runs east to a new loft on the east wall, which nothing else reaches (his best climb is 5.8). The
relic that was at the end of the east gallery is on the loft; the cap that was on the old bridge is on the new one.
Two posts hold it up (island, east promenade). tests/fit.ts checks: nothing in the hall hangs low enough over a
standing place to stop a double jump; the loft is reachable with the bridge and NOT without it.
**The rule to take from it:** a walkway must be the way to something, and nothing may hang within his jump height
(5.86 with his head) over a place he jumps from.

## Crates: the smash, the pieces, the sound (the owner, 2026-11-14)
He asked for a sound for breaking crates and better-looking pieces. There WAS a sound, but measured it was the
quietest in the game (half as loud as the sword's own hit, which played over it). `src/audio/synth.ts`: `crate` and
`barrel` are rebuilt (crack, low thump, boards knocking apart through wooden resonances, soft-clipped by DRIVE_C /
DRIVE_B: raise those for heavier, lower for cleaner), and `plank` is a new short knock played as each board lands
(`debris.takeKnocks()` in main.ts). `src/world/debris.ts` is rewritten: a crate comes apart into what it is made of
(frame boards, planks, a corner still nailed together, splinters), each piece starting where it sat on the crate and
showing ITS OWN STRIP of the crate's picture (the old pieces were little boxes each showing a whole tiny crate);
ends are snapped (slant, point, notch) with bare wood showing; a barrel gives staves, four hoop arcs and two lid
halves. A tumbling piece rests on its lowest corner (`Debris.low`), so boards bounce on their ends and never dip into
the floor. tests/crates.ts checks all of it, loudness included.

## The bosses' own sounds (2026-11-15)
Both bosses used to borrow: the roach's screech slowed down for a scream, a crate breaking for the coil. Nineteen new
recipes in `src/audio/synth.ts` (under "The great insects"), played from `beastSounds` in main.ts:
- `chitinTap`: one hard foot on stone. Both of them walk on it (hers lower and louder, its quicker and lighter).
- **The Broodmother** (high and thin): `broodScream` (sees him; lower when she turns angry), `broodHiss` (the rasp as
  a spike goes up; slowed right down as she sinks to spring), `spikeHit` (the spike going in), `broodRattle` (before
  her legs sweep or whirl), `threadTwang` (the thread let go before she drops: the tell to move), `broodHurt`,
  `broodDie` (her scream running down into her legs ticking).
- **The Sump Wyrm** (low and heavy): `wyrmRoar`, `wyrmHiss` (head going up to bite) and `wyrmSnap` (the fangs),
  `wyrmRattle` (its plates, slow then fast: THE tell for a charge; quick and high from its tail before a lash; slow as
  it winds its coil), `wyrmRam` (head into the wall: the heaviest sound either makes), `wyrmLash`, `wyrmCreak` (the
  coil drawing tight) and `wyrmCrunch` (it closing), `plateKnock` (a sword on its plates: dull, it does not ring),
  `wyrmCry` (struck on the head while helpless; parried), `wyrmDie`.
- The wind-up sounds are as long as the wind-ups (0.55, 0.85, 0.65 s) and are played faster when a wind-up is
  shorter (the second bite, the second charge), so the sound still ends as the blow lands. Change a wind-up's length
  on its slider and the sound follows; change the default and look at the recipe's length too.
- `rattle(c, rate, len, from, to, hz, ring)` is the helper: clicks on a tuned plate at a rate that changes.
- Still shared, on purpose: `whoosh` (air), `shock` and `rumble` (the floor), `plunge` (her drop), `recall` (the two
  sad notes at a boss's end, Grimsqueak's too).
- Nobody has HEARD any of these: they were built by measurement (how loud, how long, where the weight of the pitch
  lies, whether a rattle quickens) and by looking at pictures of their pitch over time. tests/audio.ts holds those
  measurements: her voice at least three times higher than its, rattles quicken, ends run down, the ram heaviest.

## The Stag Knight's, the Mantis's and the Keep Guard's own sounds (2026-11-15)
They borrowed too: the Ironback's snort and the roach's wind-up for the stag, the roach's screech for the mantis,
the hero's own squeaks slowed down for the guard. Sixteen recipes in `src/audio/synth.ts`, played from `beastSounds`:
- **Stag Knight** (the lowest voice, and iron): `stagBellow` (sees him; shorter and higher when it rises or is
  brought to its knee), `stagStep` (weight, then plates), `hammerHum` (the hammer going up: a creak, then a hum that
  climbs, with sparks; played quicker and higher for the sweep), `hammerSlam` (iron on stone, over the old `shock`
  for the floor), `stagRattle` (wing cases before a stomp), `stagDie`. A sword on it is `plateKnock`, slowed.
- **Orchid Mantis** (the highest, thin and dry): `mantisHiss` (a rising trill), `scytheRing` (a scythe going up: lower
  and longer when the second cut is the held one, which is the tell that matters), `scytheCut`, `mantisWings` (before
  a leap; short and fast for a hop away), `mantisCry` (two chirps), `mantisDie`. Its scythes into the floor: `spikeHit`.
- **Keep Guard** (a rat, but lower than the hero): `guardBark` (sees him; again as he thrusts), `spearReady` (his
  spear sliding back over his shield's rim), `guardYelp`, `guardDie` (a groan, then his gear hitting the floor).
- Every tell is as long as its wind-up and is played at `length / wind-up`, so it follows the sliders.
- Still shared on purpose: `whoosh`, `land`, `shock`, `flipClang` (a shield knocked wide, a knee going down).
- Nobody has heard these either: built by measurement and by looking at their pitch over time. tests/audio.ts: the
  mantis's cry over three times higher than the guard's and the guard's over three times higher than the stag's;
  the guard lower than the hero; tells as long as their wind-ups; the hammer heavier than an Ironback going over.
- (What still borrowed after that, the Ironback and Grimsqueak, has its own now: see the next section.)

## Nothing borrows a sound now: the Ironback, Grimsqueak, and two strays (2026-11-15)
An audit found more borrowing than the notes said, all fixed:
- **The Ironback** played the toad's wind-up under its snort (it fell through to the toad's branch in `soundWorld`),
  the roach's lunge for its ram, the roach's wind-up for its toss, a plain `land` for getting up, and it DIED with
  the toad's croak. Its own now: `ironScrape` (horn and feet scraping, three rasps, as long as the ram's tell),
  `ironCharge` (feet drumming, as long as the ram), `ironBonk` (head on a wall: a dull knock, in place of `shock`),
  `ironToss`, `ironRise`, `ironDie` (the steam going out of it). Its `snort` and `flipClang` were already its own.
- **The Flitter** died with the toad's croak too: `batDie`.
- **The Broodmother's** drop off her thread used the knight's plunge: `broodDrop`.
- **Lord Grimsqueak** had only his laugh. Now: `grimGather` (the Engine's light gathering: every tell, played at the
  length of that attack's wind-up, so quicker and higher in his rage), `grimBolt` (each bolt; it was the toad's spit,
  twice over: once from his event and once from the glob counter) and `boltBurst` (a bolt landing; it was the toad's
  splat, with the toad's green ring: the ring is the light's own colour now), `grimSwoop`, `grimSlam`, `orbHum`,
  `orbStrike` (the orb struck: higher each time the knight sends it back, lower when Grimsqueak bats it), `grimCry`
  (the orb bursting on him; and, shorter, whenever the sword finds him: bossTick watches his hp), `grimRepel`,
  `grimSag` (sinking spent, or stunned: it was a story sound) and `grimDie` (with the `recall` sting the other
  bosses' ends have). `Glob.kind` ('energy') is how the game tells a bolt from a toad's spit.
- **Shared on purpose** (the world's sounds, not anyone's voice): `whoosh`, `shock` (the floor shaking under the
  Broodmother's and the Stag's slams, under their own sounds), `land`, `rumble`, `spikeHit` (anything sharp going into
  the floor: her spikes, the mantis's scythes, the hornet's lance), `chitinTap` (an insect's foot), `clank`, and
  `flipClang` for the Stag Knight going down (iron armour hitting stone).
- **A debug aid**: the readout (`#...&debug`, or the dev suite's switch) now ends with the last six sounds the game
  asked for (`audio.recent`): "which sound was that?". Used to check, in the built game, that Grimsqueak's fight and
  the Ironback's ram play the new ones (they do); see "Not done" for the ones that did not come up.
- **Tests**: tests/audio.ts +16 (each set exists and is neither too loud nor too quiet; tells as long as what they
  warn of and growing; the Ironback all low, nothing like the roach or toad; the Flitter's end a bat's; a bolt bright
  and short; his slam his heaviest; his cry a rat's; each end runs down). 135 sounds in all.
- **Not done**: nobody has heard any of it. In the live runs these did not come up, so they are tested only as
  sounds, not as moments in the game: `ironBonk`, `ironRise`, `ironDie`, `batDie`, `broodDrop`, `orbStrike`, `grimCry`,
  `grimRepel`, `grimDie`.

## The quiet sounds (2026-11-15)
The sound test marked nine sounds as too quiet. Measured, most were not quiet so much as nearly empty: `clank` was a
twentieth of a second's tick followed by 0.85 s of silence (its resonators died in 15 ms), `flipClang` and
`chainClink` much the same. In `src/audio/synth.ts`:
- `struck(c, parts, tick)`: struck metal as a tick plus partials that are not in tune, each dying at its own rate.
  `clank` (rings 0.43 s, two partials a hair apart so it shimmers), `flipClang` (a thud under a low clang, 0.57 s,
  soft-clipped a little for weight: the 0.45 in its recipe), `chainClink` (five links knocking, not two ticks).
- `pebbles`: a dozen knocks with some body. `lavaBubble`: a mid seething over the rumble (which small speakers
  cannot carry) and more pops; about as loud as the fire now. `block`, `keepsake`, `softStep`: the same sounds with
  more of their ring, or simply turned up a little.
- `villainLaugh` was not touched: it is a recording, loud where it sounds and quiet only in its gaps. That is why the
  measure changed from the average over a sound's whole length to its loudest fifth of a second.
- NOT changed: the volumes these are played at. So the far-off clanks, chains and pebbles of the ambience
  (`src/audio/ambience.ts`), the Ironback going over, a shield breaking, the Stag Knight kneeling and a blow off an
  iron-bound crate are all louder than they were. Nobody has heard them yet: if any is too much, turn down its `vol`
  where it is played, not the sound.
tests/audio.ts: no sound is under `QUIET`; struck iron rings; block >= hit; the great clang is the heaviest metal and
a crate heavier still; soft things stay soft; nothing over 0.3 (not flattened into a buzz).

## New enemy: the Hornet Lancer (2026-11-15)
A great hornet with a lance: the first flyer that fights, not just swoops. One is in the game, over the east plate
of the Keep's courtyard (the Ironback has the west one). It is a piece in the level editor ("Hornet Lancer").
- **Rules** `src/enemies/hornet.ts` (kind `hornet`, `HORNET` table, 14 sliders under "Hornet Lancers"). hp 4. Its `y`
  is the BOTTOM of its body, as the bat's is, so combat's same-level test is true only when it is low.
  - At its post it hangs 2.7 up. Seeing him (11 off) it comes to hang 6.2 from him, going slowly round, facing him.
  - *The dive* (the usual one): its lance swings down to point at him (0.8 s; it follows him for 70% of that, then
    is set on the spot), and it comes down the line of the lance at 15. The blow is the lance's POINT (`tip`, given
    to combat as `bite.at`): 1 heart; a shield stops it; a perfect guard knocks it out of the air. Whatever happens,
    the lance goes into the floor and STICKS for 1.6 s (`stuck`), the hornet hanging on it: that is the opening.
  - *The joust* (40% of the time, from 5 or more off): it drops to chest height (0.55), levels its lance (0.75 s),
    and runs straight through where he stood and 5 past, at 12.5. Step aside (a cut timed as it passes knocks it
    down), jump it, or shield it (it glances off and pulls up: no opening); a perfect guard knocks it down.
  - Struck in the air it falls and lies 1.5 s (2.6 after a perfect guard). Over a drop it is gone.
  - Its attacks are aimed at the GROUND he stands on (or last stood on, if he is in the air), so jumping does not
    confuse it, and it will dive onto a ledge he is on. `floor` is the height it has to do with at the moment.
- **Model** `src/enemies/hornetModel.ts`: THE LANCE COMES FIRST and its point comes from the rules: diving, stuck and
  running, the lance is laid with its point exactly on the rules' `tip` and its front legs are then laid to the shaft
  (`twoBone`). Otherwise the lance is carried from a place under its chest on its right (so it runs past its body
  and under its head, not through them) and swings round on a spring. Probes hold every part off the floor it is
  given: its body is lifted, wings turned on their hinges (whichever way lifts them), knees and elbows held up, the
  pennant folded over on its side. Four wings beating 11 times a second; a shadow on the floor under it.
- **Sounds** (its own): `hornetBuzz` (a loop while one is near, in main.ts by the lava's), `hornetWhine` (the
  wind-ups, as long as they are), `hornetHurt`, `hornetDie`; `spikeHit` for the lance going in.
- **Tests**: tests/hornet.ts (40: every attack and each of its answers, in the Keep's real courtyard with the real
  controller and combat; never in a wall in a minute and a half; goes home) and tests/models.ts (13: point drawn
  where the rules have it, legs on the shaft, lance never through its body, nothing under the floor, each move's
  look). Sheet: `#hornet` (`&only=N`). Every state looked at alone from three sides.
- **Measured before any picture** (as asked): the first run found wings and the pennant under the floor when it lay
  down, the raised lance through its own head (so its lance is never raised above level now), its front legs
  losing the shaft between moves, and its feelers not being counted by the floor guard. All fixed before drawing.
- **Not done**: nobody has fought it by hand; its numbers are first guesses. In the Keep its patch is the whole
  courtyard, so it will follow him across to the guards. (Two more are placed now: see "More of the new insects"
  below.)

## New enemy: the Ant Pikeman (2026-11-15)
A soldier ant with a pike: the first enemy that fights as a PAIR. Two hold the Keep's inner ward (the ledge behind the
gate, x 22 and 26, facing west; `WARD` in keep.ts is now one of the Keep's `FLOORS`, so they keep to it). It is a piece
in the level editor ("Ant Pikeman"): any two placed within 12 of each other pair up by themselves.
- **Rules** `src/enemies/ant.ts` (kind `ant`, `ANT` table, 14 sliders under "Ant Pikemen"). hp 4.
  - It comes to pike's length (3.0, further than the sword reaches) and keeps its point on him. The point (`tip`) is
    what strikes, given to combat as `bite.at`, as the hornet's is.
  - *The thrust*: the pike slides back (0.55 s; its point glints; it follows him for half of that), then a lunge to
    3.44 from where it stood. 1 heart. Step aside (it is stretched out 0.8 s: `recover`), shield it (1.1 s), or a
    perfect guard beats the pike down to the floor (`reel`, 1.9 s: long enough to kill it).
  - *Inside its point* (`close`: nearer than 2.1) it cannot thrust: it tips its pike up out of the way (`level` is
    false), gives ground, and if he is in front of it within 1.55 it BITES (jaws wide 0.38 s, then a snap forward;
    1 heart; back off, or shield it). 1.55 is more than the sword's reach on purpose: there is no distance from
    which he can cut it and it can do nothing.
  - Every blow staggers it, but it does not stand to be cut down: 0.38 s after the first blow it SPRINGS BACK about
    2.4 (slantwise if a wall or the ledge's edge is behind it). So getting in is worth two cuts, not his whole
    combo (which would kill a 4-hp enemy outright); he has to get past the point twice. A second blow does not
    restart the stagger. (Before this, a test rat killed the pair in under 5 s by standing and swinging.)
  - *The pair* (`pairAnts(ants, px, pz)`, called once a tick from main.ts just after the director): nearest two
    within `pairRange` are mates. The nearer to him is the FRONT (holds him), the other the FLANK (goes round him at
    3.8 to the far side from its mate). They change over when the other comes 0.6 nearer. One waking wakes the
    other. The game's director already makes them thrust by turns; and when he is inside one's point, or cutting at
    it, the other's wait is cut to 0.3 s (`hurry`). Its abdomen is a second hit circle (`parts`), 0.6 behind it.
- **Model** `src/enemies/antModel.ts`: four walking legs on the shared `Walker`, its front pair holding the pike. THE
  PIKE COMES FIRST: while `level`, it is laid with its point exactly on the rules' `tip`, running back along the
  ant's right side; the right front leg holds it fast near the butt and the shaft slides through the left. Not
  levelled (upright at its post, sloped going home, tipped up when he is inside, beaten down, dropped) the pose says
  where it is, on springs. It is held near the butt on purpose: with the hand at shoulder height the butt stays
  above its own knees whichever way the pike turns (`CLEAR`); the first version, held further up, swung its butt
  through its own legs. Dying, the pike is flung out sideways before it falls, clear of its legs.
- **Sounds** (its own): `antClick` (jaws clacking: seen him; faster, before a bite), `pikeReady` (the wind-up, as
  long as it is), `antSnap` (the bite; and with the thrust), `antHurt`, `antDie`.
- **Tests**: tests/ant.ts (54: every move and each answer to it, the pair, the changeover, the ledge, a whole fight;
  in the Keep's real ward with the real controller, combat and director), tests/models.ts (22: point drawn where
  the rules have it, front legs on the shaft, pike never through its body or legs, nothing under the floor, each
  move's look), tests/audio.ts (6). Sheet: `#ant` (`&only=N`, 0 to 14; 14 is a pair). Every state looked at alone
  from three sides.
- **Also fixed on the way**: `Walker` threw a creature's feet out ahead of it for a quarter of a second whenever it
  was first placed or put somewhere new (it took the jump for speed). That was true of the mantis too. And the
  model sheet's clock could run backwards on its first frame after a long set-up, which flashed the model white.
- **Not done**: nobody has fought them by hand; the numbers are first guesses. A rat who stands still between them
  is dead in about 8 s. The ward is a ledge 8 deep with the pit along it: that may be too hard a place for them.
  (A second pair is placed now, in the Hollows: see the next section.)

## More of the new insects, placed through the worlds (2026-11-15)
- **Foundry**: a Hornet Lancer over the west end of the dock (`DOCK_HORNET`, -36, 37), by the crates (one has a bottle
  cap in it). It is the first he meets, on purpose: open floor, nothing else about, and none of its patch is over the
  lava, so it cannot be lost.
- **Hollows**: the ways north are held. A Hornet Lancer over the east bank (`BANK_HORNET`, 32, -16), the chasm at his
  elbow; and two Ant Pikemen on the north floor (`NORTH_ANTS`, -28/-24, -45), well back from the mouth of the west path
  so the fight is out on the open floor, not beside the brazier in the mouth (the camera closes right in there). They
  keep to `NORTH_WEST_FLOOR` and do not follow him down the path. The Faith Stones (the middle way) are unguarded:
  their landing is too far from the ants to be seen from.
- **`EnemySpec.uncounted`** (types.ts): "not one of those a 'defeat' goal asks for". `GoalTracker.enemyTotal` leaves
  them out, and main.ts does not add their deaths to `goals.kills`. foundry() marks everything off the Crucible's
  island (`ISLAND`), hollows() everything off the gallery ledges. So "The Slag Crew" still asks for the six on the
  island and "The Webbed Gallery" for the seven on the gallery, as their hints say; the new ones are obstacles, not
  part of a wedge. (The Keep's wedge asks for every guard in it, its hornet and pikemen included, and says so.)
- **The hornet's fall, fixed**: knocked down right above a crate, a barrel or a spike of rock, it was taken to be over
  a pit (nowhere to stand there) and was gone. Now it comes down on the nearest floor beside the thing (`startFall`
  in hornet.ts tells "something stands here" from "nothing is here" with `canFly` at floor height). And one that IS
  lost over a pit, or killed over one, goes on falling out of sight (`pitFall`), where it used to lie in the air at
  the height of the floor until it shrivelled.
- **Tests**: tests/hornet.ts +16 (each new one: clear air, real floor, not counted, a minute and a half over its own
  patch without touching anything solid, its lance sticks in that floor, the crate and the chasm), tests/ant.ts +8
  (the Hollows pair: seen only out on the floor, pincer, never off the floor at the chasm's edge, do not follow him
  down the path), tests/levels.ts +2 (`uncounted`).
- **Not done**: none of it played by hand. The Cistern (world one) was left alone on purpose: it is roaches and toads.

## The Club's doors on the WORLDS page (2026-11-15)
The pause menu's WORLDS page now shows what each door in the Club asks and how near he is to it. (It did say so
before, but only in words, and only for a world you had picked that was still shut.)
- **The Club chosen** (the top row; it is what is chosen when he opens the menu at home): DETAILS starts with THE
  DOORS: every door of the Club, its name, a bar, and "open", or a tick and what it asked, or how many he has of how
  many (`9 / 12`). The doors come BEFORE the Club's blurb on purpose: on a small screen it is the blurb that is cut
  off, never a door (looked at down to 740 x 360). The Club's row in the list shows how many doors are open (`2/4`).
- **A world behind a shut door**: its row shows a lock and `9/12`; its DETAILS show the door with a bar and the same
  in plain words ("It wants 12 Golden Wedges. You have 9: 3 more to go.").
- **A world whose door is open**: only a small tag by its name ("door open, 5"). A card there pushed the list of its
  wedges off the bottom of DETAILS, which a controller cannot scroll: the wedges matter more once you are in.
- **Where it lives**: `doorState()` and `doorWords()` in levels/junction.ts (pure, tested); `LevelRow.door` / `.doors`
  filled by `worldRows()` in main.ts; `Menu.doorCard()` and `doorIcon()` (a flat arched door, shut with a brass lock or
  open) draw it. A door he has been through shows open even if he is short of what it asks now, and says so.
- **Dev hash** `#...&wedges=9`: gives him the first nine wedges, for looking at this part-way through the game.
- **Tests**: tests/menu.ts +15. **Not done**: nobody has looked at it on a real phone or TV; a player's own levels hung
  on the Club's guest doors are listed too (up to six rows), which has not been looked at.

## The pause menu: reading on, and the d-pad (2026-11-15)
- **The DETAILS card can be moved** when there is more written in it than fits (the Foundry's on WORLDS; a piece of
  gear's on EQUIP, which had always lost its last line at 1280 x 720): the RIGHT STICK on a controller, R and F on a
  keyboard; the mouse wheel and a finger always could. `Menu.scroll(by)` (in heights of the card), fed from
  handleMenuInput in main.ts at `MENU_READ` (1.5 heights a second at full tilt, less for less). A marker sits on the
  card's lower edge while there is more below ("more", with the stick or keys that do it), one on its upper edge once
  it has been moved, the words fade out towards an edge they run past, and the help line gains "read on". The markers
  are placed from the card's own `offsetTop` (on EQUIP the card is not at the top of its column). Choosing something
  else starts at the top again (the page is drawn afresh).
- **The d-pad moved the cursor two rows a press.** A d-pad press is a button (`up`/`down` actions) AND, with the stick
  at rest, a push of the stick (controls.ts makes the d-pad walk): handleMenuInput acted on both. Everything asked
  for in a frame is now gathered and done once (`menuOrder`). Found with a pretend controller (a script that fakes
  `navigator.getGamepads`); nobody had used a real one. The title screen and the shop were not affected.
- **Tests**: tests/menu.ts +7 (moved by half a card, stops at each end, markers, a card that fits is left alone).
  The d-pad fix is in main.ts and is checked only by the pretend-controller script, not by a test in the suite.
- **Not done**: no real controller, phone or TV. R and F are not shown anywhere but the help line and the marker.

## New enemy: the Firefly Bomber (2026-11-15)
A great firefly whose lantern drips fire: the first enemy that never comes at him, and the first whose harm is a
thing left on the FLOOR. One flies over the west end of the Hollows' Undershelf (`SHELF_FIREFLY`, its air
`FIREFLY_AIR`: that end of the shelf and out over the chasm; not counted by the gallery's wedge). A piece in the
level editor ("Firefly Bomber"), a sticker with a flat icon, 15 sliders under "Firefly Bombers".
- **Rules** `src/enemies/firefly.ts` (kind `firefly`, `FIREFLY` table). hp 7. Its y is the bottom of its body, as the
  hornet's is. It takes NO turns with the others (no `ready`/`mayAttack`: the director leaves it alone) and has no
  blow of its own (`attackActive` is always false).
  - It flies round him 7 off and 4 up: over a jump, inside a double jump (a plunge from a double jump strikes it out
    of the air: 3 of its 7).
  - *The tell* (0.7 s): it stops, turns to line up, and its lantern flares white (`light` goes from 1 to 1.8). Its
    mark (`mark`) follows where he is GOING for 85% of that (it works out where he will be when its middle drop
    lands, from how fast he is going; never out over a pit), then the line is set.
  - *The run*: straight along the line at 11 (he runs at 6.2), level, letting three drops go so that they land 2.4
    apart: before its mark, on it, past it. Each drop leaves from `vent` (the tip of its lantern), drifts down for a
    second, and leaves a patch of flame 0.95 round that burns 2.8 s.
  - After two runs its light is SPENT: it sinks to hang 0.7 over floor he can reach (`pickRest`: never over the
    chasm), dark, for 3.4 s while its lantern fills. That is the opening. A cut knocks it to the floor for 1.3 s
    (once an opening: another cut as it gets up hurts it but does not put it down again, or a rat who kept swinging
    could keep it down for good). The sword alone takes 6 of its 7 in one opening, so it is two openings, or one
    begun with a plunge.
  - A rat running flat out in a straight line IS burned (it leads him exactly: `lead` 1); one who turns off the line
    once it is set is not. Standing in a patch costs a heart a second.
- **The fire** `src/world/embers.ts` (no Three.js): `makeEmber` works out where a drop will land the moment it is
  let go (`emberLanding`, the same fixed 1/60 steps the fall takes, so it is exact at any frame rate); `stepEmbers`;
  `Flames` (`burning(x, y, z, radius)`: in it, near its height, and it is burning well). `resolveFlames` in
  combat.ts: no roll and no shield helps (`PlayerController.takeBurn`, thrown back from the patch's middle); the
  Ember Helm walks through; a jump clears it. A drop let go over a pit, a wall's top or water has no mark and
  nothing catches (main.ts).
- **Drawn** `src/world/emberFx.ts`: the falling drop; a ring on the floor where it WILL land, as wide as the flames
  it will leave, from the moment it is let go (it fills as the drop falls); the flames (tongues inside the patch,
  as high as it is hot). The flames, the falling drops and each firefly's lantern LIGHT THE ROOM round them:
  `chamber.updateLights(time, focus, extra)` takes lights that come and go.
- **Model** `src/enemies/fireflyModel.ts`: a soft dark body, a flat orange hood with a black spot over a small head
  with big eyes, wing cases edged in yellow that stand up out of the way when it flies, clear wings that beat, six
  thin legs, and an abdomen whose last three rings are the lantern. THE TIP OF THE LANTERN COMES FROM THE RULES:
  lining up and on a run it is drawn exactly on `vent` (the body is moved the last hair), so a drop appears where
  the lantern is. The lantern's colour is its `light` (dark, yellow-green, white-hot). Unshaded colours (the
  lantern, the marks on the floor) come out BRIGHTER on screen than their numbers (the renderer converts them, the
  PS1 shader's colours it leaves alone): they are chosen for how they look, and say so where they are set.
- **Sounds** (its own): `fireflyHum` (its wings, a loop: a soft whirr, nothing like the hornet's rasp),
  `fireflyBlink` (the tell: glass notes quickening, as long as the tell; also, short, when it sees him and when it
  goes back up), `emberDrop`, `emberBurst` (a drop catching), `fireflyFade` (spent), `fireflyHurt`, `fireflyDie`.
  Its flames crackle with the braziers' `fire` loop.
- **Tests**: tests/firefly.ts (69: in the Hollows' real cave with the real controller, combat and falling fire: the
  tell, the run, where every drop lands against where it was marked, leading a runner, the flames against shield,
  roll, jump and helm, the opening and what it is worth, its end, a minute's fight three times over), tests/models.ts
  (18 looks checks), tests/audio.ts (7). Sheet: `#firefly` (`&only=N`, 0 to 13; 12 and 13 are its fire). Every state
  looked at alone from three sides, and a fight watched in the built game.
- **Found on the way**: a flier stopped by a ledge under it tried one way only and stuck there (it now slides along
  whatever stops it; the hornet's `moveTo` still has the older form and has not shown the fault).
- **Two more placed** (the same day). Each is over an empty stretch with a wall along one side and a drop along the
  other, is not counted by any wedge, and has its air given by name in its level file:
  - *The Foundry*, over the north floor under the Slag Run (`NORTH_FIREFLY`, `NORTH_AIR`): the lava is along the
    floor's south side and one of the three steam pipes is on its wall. Drops over the lava do not catch. A rat up on
    the beams is over its head and is left alone (it only comes for a rat less than 6 above its floor).
  - *The Keep*, over the west end of the inner ward (`WARD_FIREFLY`, `WARD_AIR`): the ledge is 8 deep, the
    gatehouse wall at his back and the pit in front, a bottle cap at the far end. It is not one of "every guard":
    that wedge asks for what it did (13), and its hint is still true. From the courtyard it does not see him.
  - A drop of fire now falls PAST anything that moves (a lift, a cart): `groundFrom(colliders, skip)` in embers.ts is
    the floor the game gives it. It used to be marked on a lift that would have moved on by the time it landed.
  - tests/firefly.ts +19 (88 now): each place's air, a minute's fight twice over in each (never in anything solid or
    out of its air, spent always within reach, no drop catching on lava or over the pit), cut down over the lava and
    the pit, the two wedges untouched.
- **Not done**: nobody has fought it by hand or heard it; every number is a first guess. Its fire does nothing to
  other creatures or to crates. In the test a rat who keeps changing direction is burned only once or twice a minute;
  one who stands still loses four hearts to two runs. Whether that is the right spread is for a player to say.

## Boss: the Broodmother (the first of the owner's two boss battles)
A giant spider in her own pit off the Hollows (level id `brood`, door on the gallery's north ledge; one wedge, for
beating her). Not strictly an insect: she was one of the boss ideas offered earlier, and the Hollows is all webs.
- **Rules** `src/enemies/brood.ts` (kind `brood`, `immovable`, `BROOD` table, all on sliders under "The Broodmother").
  hp 26. Lurks until he is within 13, screams (1.3 s), then:
  - *Stabs*: a foreleg goes up (0.62 s; she turns with him for the first 60% and `stabAt` records how far off he
    stood), comes down on that spot (1 heart, narrow: step aside; a shield stops it; a perfect guard throws her
    down); then the other leg after 0.44 s. After the last, both spikes are in the floor for 0.95 s: an opening.
  - *Scissor*: both forelegs wide and low (0.78 s), then shut along the floor across her front (`ground`: jump it).
  - *Pounce*: from 5.5 to 12 away she sinks (0.9 s) and springs onto where he is; where she lands is 2 hearts all
    round and `heavy` (no shield); then 1.7 s in a heap, the best opening.
  - *Whirl*: 0.75 s behind her and she spins, legs out low, all round (`ground`).
  - *Angry below half*: three stabs, shorter waits, and the thread: she climbs to the roof (out of reach: her `y` is
    raised so combat's same-level test fails), follows him at 5.4 (he runs faster), stops, the thread twangs (0.5 s),
    she drops (2 hearts, heavy) and lies 2.3 s.
  - Poise 7 (plunge 3, parry on a stab all of it): down for 2.6 s.
- **Model** `src/enemies/broodModel.ts`: her SPIKES are posed first (each pose gives the two tips over the floor) and
  the forelegs are laid to them with `twoBone`; the stab's landing place comes from the rules, so what is drawn is
  what hits. Six walking legs on the shared `Walker` (threes); in the air their feet go to `spread`, dead to `curled`.
  Floor guards: every point of her head, chest, fangs, feelers and abdomen is held above the floor each frame
  (`chestProbes`, `bellyProbes`, `abdomenLow`). On the floor: her shadow, a red ring the size of the blow while she
  hangs (faint following, beating once the thread twangs), a pale ring running out where she lands.
- **Shown** by `src/ui/bossBar.ts`: name and health along the bottom while a boss is awake (Grimsqueak too).
- **Tests**: tests/brood.ts (47: the pit, every attack and its answer, the thread, a whole seeded fight staying on
  her floor), tests/models.ts (15 more: every frame of 63 moves measured: forelegs reach their tips, pass through
  none of her, nothing under the floor). Sheet: `#brood` (`&only=N`). Looked at alone from three sides, every state.
- **Not done**: nobody has fought her by hand; her numbers are a first guess. No story scene. (Her sounds are her
  own now: "The bosses' own sounds".)

## Boss: the Sump Wyrm (the second of the owner's two boss battles)
A great centipede in its own room off the Cistern (level id `sump`, door in the Cistern's north-east corner; one
wedge, for beating it). Its whole body is in the fight: thirteen segments behind the head, each solid, each hittable.
- **A long body in combat** (`src/enemies/foe.ts`, `src/combat/combat.ts`): a `Foe` may have `parts` (extra circles:
  `{ x, z, r }`). The sword tries its own circle first, then the nearest part; `takeHit(damage, fx, fz, how, part)`
  is told which (-1: its own circle), and so is `deflects`. Plunges, shockwaves and lock-on aim use the nearest piece;
  an `immovable` foe pushes him out of every part. `bite.at` lets a blow come from somewhere other than its middle
  (the tail). Hit shapes (the Workshop switch) draw a ring for every part. Nothing else uses `parts` yet.
- **Rules** `src/enemies/wyrm.ts` (kind `wyrm`, `immovable`, `WYRM` table, 17 sliders under "The Sump Wyrm"). hp 32.
  Its body follows the path its head has crawled (`trail`, a point every 0.05; segments 0.85 apart).
  - It prowls round him in a ring (5.5 off) and then means to *bite* or *charge* (an `intent`), comes round to face
    him by crawling, and does it when it can.
  - *Bite*: head up over him (0.55 s, turning with him for 60%), snaps forward (1 heart; a shield stops it, a perfect
    guard throws its head back for 1.8 s: `reel`). Angry: two bites.
  - *Charge*: rears and screams (0.85 s, eyes red), then runs at 14 until it meets a wall (2 hearts, `heavy`: no
    shield). It stuns itself there for 2.6 s. Angry: charges come in twos, the first wall only turns it (`bump`).
  - *Tail lash*: struck on its last four segments, or with him hanging about them while it is slow, its tail goes up
    (0.5 s) and whips round along the floor (`ground`: jump it; `bite.at` is its tail).
  - *Coil* (angry, every 9 to 13 s): winds a ring round where he stands (a ring on the floor marks it), rears
    (0.65 s), tightens (2 hearts): jump out over its body. Then it lies spent for 2.3 s, its grip easing back out.
  - Its head takes double while it is helpless (stunned, reeling, spent). Angry below half.
- **It must not tie itself up** (most of the work, and easy to break). A body that may not pass through itself, in a
  walled room, driven by simple steering, winds into knots, wedges its head between a wall and its own side, or sits
  against a wall for good. What stops that, in `wyrm.ts`:
  - it turns by crawling (no tighter than `MIN_TURN`), with a little swing of the head where it stands in wind-ups;
  - `windRoom()`: its heading may never be more than `WIND` (4.5: three quarters of a ring) from that of any segment
    behind it, counted along its body, so it cannot curl right round onto itself (the coil apart);
  - `ownBody()`: a step is refused if it brings its head nearer a segment it is already touching, measured against
    where the segments WILL be after the step (measured against where they are, a head spiralling in is never caught);
  - `wayOut()`: stopped by a wall or itself, it swings its head to the nearest open way (within its neck's reach and
    the winding limit); stopped for half a second, it BACKS UP 2.4 along its own path (`retreat`; the path is kept 6.5
    past its tail for this) and then turns the other way for a moment.
  tests/wyrm.ts plays twenty fights with a rat all over it and fails if it is ever stopped for a second, lies through
  itself, or leaves its floor. Change anything about how it moves and run that.
- **Model** `src/enemies/wyrmModel.ts`: drawn in world coordinates exactly where the rules have each segment
  (`setFloor(y)`), so what is seen is what is hit. Springs for the head's poses; legs by `twoBone` in a wave down the
  body (they walk backwards when it backs up, since `crawled` goes down); `Probe` floor guards for the head, fangs,
  feelers, spurs and feet. Eyes green, red before a charge and in the coil.
- **Tests**: tests/wyrm.ts (55: the room and door, the long body in combat, every attack and its answer, a whole
  fight, the twenty-fight stress run), tests/models.ts (16: drawn where it is solid, every leg reaches, nothing
  through itself or under the floor, each move's look). Sheet: `#wyrm` (`&only=N`, `&focus=head`).
- **Not done**: nobody has fought it by hand; its numbers are first guesses. (Its sounds are its own now: "The
  bosses' own sounds".)
  A rat who keeps running round it close can stay off its head for a while (it cannot curl onto itself to follow):
  the lash and the coil are its answers, and whether they are enough needs a hand on the pad. No story scene.

## The development suite (the owner, 2026-11-14)
He asked for the start menu to be overhauled, and for the development tools to be reworked: friendlier, better
looking, more intuitive, more options in the editor, and any other tools that would help. What was done:

**One look for all of it**: `src/ui/devTheme.ts` (`.rqd`: colours, buttons, fields, a set of line icons, `esc`).
Anything new for developers should use it.

**Title screen** (`src/ui/boot.ts`). Was RATQUEST / START / OPTIONS, centred. Now the logo and a menu down the left
over the live room (the view drifts slowly round him: main.ts, `drifting`), with CONTINUE (straight into the file
played last), NEW GAME (the first empty file; with none, it opens the file screen saying so), LOAD GAME (the file
screen), LEVEL EDITOR, WORKSHOP, OPTIONS, each with a small icon, and a card beside the menu that says what the chosen
one does (the save file's place, wedges and time for CONTINUE). In a tall or square window (the game inside the
on-screen pad) it is one centred column (`@container (max-aspect-ratio: 5 / 4)`). Closing the editor or the Workshop
opened from here comes back here (`editorBack`, `workshopBack`, `tweaksBack` in main.ts). "Start menu" could also have
meant the pause menu (the pad's button is labelled START): that one was left as it was, except for a bug found on
its QUEST page (two styles both called `.rq-q` made the goals 2.4 times too big; the sticker one is `.rq-unk` now).

**Level editor** (`src/ui/builder.ts`, rewritten; same `Builder` class and host, so main.ts hardly changed).
- Layout: a bar along the top (File menu, name, saved or not, undo/redo, copy/paste/duplicate/delete, grid, snap,
  layers, jump check, problems count, Watch, 3D, Play here, Play, help); pieces on the left (the four tools, a search
  box, the last six pieces used, then groups that fold); the map; on the right the game (while watching) and four
  tabs: Piece, Level, Outline, Problems. A status line along the bottom says what the tool or the piece under the
  pointer is for, and where the pointer is.
- New: redo; copy, cut, paste at the pointer; stretching a rectangle by its edges and corners; flip left-right and
  north-south; half-square snapping; layers (hide a kind of piece: it goes faint and cannot be clicked); a Measure
  tool (drag across a gap: how far, how much higher, and which jump makes it, from the real jump numbers); an Outline
  of every piece (click to select and go to it); a Problems list (what stops it being played, and the jump checker's
  findings, each a click away); a right-click menu; rulers, a north arrow, higher ground drawn lighter, steps drawn on
  stairs, a preview of the piece under the pointer; zoom about the pointer; two-finger pinch and pan; save to a file
  and open one; a picture of the map; a keys-and-tips sheet (?); the level being worked on is kept on the device as
  it changes. The level settings are a tab now, not a window over the map.
- New things a level can hold (`src/levels/custom.ts`): the **Broodmother** as a piece (`brood`: a boss, with the
  run of the whole room), **fire** (an area, like lava: `fire` on the LevelDef), **iron-bound crates** (a crate's
  `tough`), **falls put him back** (`fallBack`) and **how far he sees** (`fogRange`, from a short list).
- A placed piece is no longer left selected (the same piece can be placed again at once), and selecting a piece no
  longer changes the height of the next one (it used to: pick a river and the next slab went in at -0.85).
- Not done: nothing was tried by hand on a real touch screen.

**The 3D editor** (`src/ui/flyEdit.ts`, rewritten 2026-11-15; its rules are in `src/levels/place3d.ts`). Reached by
the level editor's cube button, or `#flyedit`. It wears the suite's look and shows the level editor's own palette
(`PIECE_GROUPS`, exported from builder.ts: the same groups, colours and one-line descriptions).
- The bar along the bottom: the piece (click it, or B, for the whole list with a search: type a name, Enter takes the
  first), its width, depth and height above the surface pointed at, and the way it faces (only for pieces that face).
- On the right: Place, Copy, Move, Undo, Redo, Delete. **Copy** (Q, or lock-on) takes the piece pointed at, size,
  height, facing and SETTINGS (what a crate holds, what a character says: placing from the list used to be the only
  way, and always made a plain one); Place then puts down others like it. **Move** (G) picks it up: Place puts it
  down, Esc or Undo puts it back, and it is one step to undo. Redo is new (`History`, shared with the level editor).
- Gold outline: what Place would add (red, and the crosshair too, if it would stick out of the room). Blue outline:
  the piece pointed at. **That used to be wrong on a side face**: point at the side of a slab and it took the floor in
  front of it (Delete would have removed the floor). `aimPoint` now says which piece the crosshair is ON; a piece is
  still placed AGAINST a side, half a square out.
- Along the top: back to the map, where the crosshair is and what it is on, the jump check (J: it can be switched on
  and off in here now), and a card of every control (H) for keyboard, controller and touch.
- The game's own hearts, counts and goal are hidden while it is open (`.rq-fly-on`, as photo mode does).
- While he types in the piece search, the game is told nothing is pressed (`fly.typing` in main.ts), and the Escape
  or Enter that shuts the list is not also read as "back to the map" or "place" (`deaf`).
- The fly arrows on the left show only on a touch screen. The mouse wheel goes forward and back.
- tests/place3d.ts (28, the d-pad among them): placing, what is pointed at (side, top, the room's wall, a crate), copy putting down the
  same piece, what a piece stands on, sticking out. The screen itself was driven in a browser at desktop and phone
  size (keys, the list, copy, move, undo, redo, into 3D from the level editor and back with the change kept).
- **With a controller** the d-pad shapes the piece (`PadShaper` in place3d.ts; main.ts feeds it `gamepadDpad`, which
  controls.ts now gives: the d-pad as held, and whether it is what he is walking by). Left and right: narrower and
  wider. Up and down: deeper and shallower, or, after Select, higher and lower (Select switches back). A press acts
  at once; held, it repeats. The measures it changes are marked gold on the bar. In the game the d-pad walks when
  the stick is at rest; in here that is taken back out of the movement, so shaping does not fly him about.
  Height is a switch and not a held button because every button a thumb could hold already does something here
  (guard is L1, which is also "the piece before": my first try, and it changed the piece).
- Not done: nobody has used it on a real phone or with a real controller (it was driven with a pretend one in a
  browser: d-pad right for a second took a slab from 3 wide to 13, and the view did not move).

**Game feel** (`src/ui/tweaksPanel.ts`, rewritten). **A real fault was found here:** the panel's list of groups was
kept by hand and six groups (Ironbacks, Flitters, Keep Guards, Mantises, Stag Knights, The Broodmother: 67 sliders)
were never on it, so those sliders existed but could not be reached. `TWEAK_GROUPS` is now read from the sliders
themselves (`TWEAK_SECTIONS` only orders them under headings) and tests/editops.ts checks none can be left out. Also
new: a search across every slider, a "Changed" filter, a box for an exact number beside each slider.

**Workshop** (`src/ui/workshop.ts`; host functions in main.ts next to the builder's).
- *Sound test*: every sound by name, playable at any pitch, each with a bar for how loud it seems (`loudness()` in
  `src/audio/synth.ts`: the level of its loudest fifth of a second; red: under `QUIET`, 0.1, quiet enough to be
  lost). It is how the crate sound would have been caught. Nothing is red now (see "The quiet sounds"). The five tunes.
- *Go to a place*: any level, by world; the retired ones too.
- *Test switches* (`src/core/devSwitches.ts`, `DEV`; never saved, all off at start; what is on is written small at
  the top of the screen): no damage (`player.untouchable`), speed (1, 0.5, 0.25, 0.1), hit shapes
  (`src/render/hitShapes.ts`: a ring for each body, the wedge of each attack in yellow while it winds up and red
  while it can hurt, his sword's sweep, his shield's cover: drawn from the very numbers combat tests), creatures
  stand still, every door open, a readout. And: heal, beat every creature here, give all gear, start the place again.
- So that hit shapes can draw what is coming, the Stag Knight's and the Broodmother's `bite` now answer with the right
  shape during each wind-up, not only during the blow.

**Tests**: tests/editops.ts (55: the editor's rules, the new level options, the slider groups, the switches, the hit
shapes, the sound loudness numbers). The screens themselves have no tests (they need a browser); they were driven
with puppeteer scripts and looked at.

## The Move Garden (2026-11-15)
A test room, no part of the game: `src/levels/garden.ts`, opened by `#level=garden`, by `ratquest-garden.html`, or from
the Workshop's places ("Test rooms"; `TEST_ROOMS` in `levels.ts`, which `levelById` also looks in). START-HERE has
what is in it and the table of what each jump set measures to.
- Boards and rulers are two new kinds of decor, `sign` and `ruler` (`src/world/signs.ts`, built in `chamber.ts`):
  writing painted on a canvas, drawn only, nothing collides with them. The game is drawn coarsely, so a board holds
  two short lines at most (`tests/garden.ts` holds them to that); smaller writing cannot be read from where he stands.
  A ruler lying on the floor cannot be read either: little number boards stand beside the strip. They are not in the
  level builder's list of pieces.
- The jump sets are `JUMP_SETS` in `src/core/tweaks.ts` (`Tweaks.useSet`, `Tweaks.activeSet`); their buttons are drawn
  by `setsHtml` in `src/ui/tweaksPanel.ts`. Each set's note states its numbers, and the test checks the notes
  against the room, so a set that is changed must have its note changed with it.
- `tests/garden.ts` (in `npm run test:sim`): each step needs the move on its board and no less; each chimney is
  climbed by kicks and by nothing else, under every set; the one-kick ledge; the table.
- Open: nobody has played it by hand. The room is plain (one look, eight lamps). It has nothing that moves; a
  moving platform and a wall-to-wall run over a gap would be the next things to add if the owner wants them.

## The jump checker and wide chimneys (2026-11-15)
`maxChimney(gain)` in reach.ts works out, from the kick's own numbers, how far apart two walls can be and still be
kicked up between: about 8.1 with the default (half a unit gained a kick: anything a determined player could do), about
6.7 for the trap search (two units a kick: a way OUT has to be one an ordinary player can take). tests/reach.ts holds
it against the real controller. It found Grimsqueak's throne room could be climbed out of (the last wall columns now
stand in the corners, `THRONE_COLUMNS`) and that the Cistern's Cleft was just near enough to the hall's west wall.
Rule for building: walls not meant as a chimney go NINE or more apart, or joined.

## What the owner found walking round the Club (2026-11-15)
START-HERE ("Drawn and solid, again"; "The pause menu's SAVE screen, and the tweaks panel on a controller") has what
changed and where. Open things, said plainly:
- Nobody has played any of it by hand. The pictures were taken in the running game; the tweaks panel was worked with
  a pretend controller in a real browser.
- The barrel picture he sent may have been about something else than the barrel's width (his head simply being in
  front of it): ask if it comes up again.
- Standing on steps is a matter of how he is DRAWN; the rules still lift his body onto a step when the edge of his
  footprint reaches it. Enemies are drawn as the rules have them.
- A fire bowl's solid is two square boxes for a round thing: a little inside the bowl on the straight, a little
  outside it at the corners.
- The ceiling is dark, like everything far from a lamp; lanterns hang on plain rods, not chains (a chain of links for
  every lamp in a big level is a great many corners for a phone to draw).
- The exit door's frame becomes solid when the door has finished growing out of the wall; before that there is
  nothing there to bump into.

## Ramps (2026-11-15: step one of slopes, the cave and the shield ride)
START-HERE has what a ramp is and who knows about it. Things to know before touching it:
- The order of a step is: move sideways (`moveAxis`), then up and down (`moveVertical`). So when `moveAxis` asks
  whether a ramp is in his way, his feet are still where they were the moment before; a walkable ramp is judged by
  its slope under his middle (where he is about to stand), not by the uphill edge of his footprint, or the steepest
  ramp stops him. A ramp too steep to walk is judged by that uphill edge, which is what stops him at its foot.
- Stepping off a landing onto a ramp going down, he has been standing on the landing's edge with the slope already
  most of a third of a unit below his middle: `RAMP_HOLD` (0.48) is as big as it is for that.
- He is only held to the ground on a ramp (or stepping onto one). Stairs and ledges are as they were.
- A ramp's low end may be above its box's bottom (`low` > `y0`): a ramp up from a step.
- Things still treating a ramp as its whole box (safe, but blunt): every enemy, the wall-kick chain's look ahead
  (`wallAhead`), wall hangings (`mount`), the camera's "low thing in the way" rule, crushing.

## The shield ride (2026-11-15: step two)
START-HERE has the rules. Things to know before touching it:
- The ride is a state of the controller (`riding`), entered in `startRideIfHeShould` and run by `rideStep` in place
  of the ordinary ground and air steering. His heading is his velocity's (`rideHeading`); the stick only turns it.
- `groundBox` is the solid he stood on at the end of the last step; `slopeUnder()` reads the slope from it. Past the
  high end of a ramp, while his footprint still overlaps it, he is still "on the ramp" (its top is clamped), which is
  what lets `rideLift` see the ramp's rise in the very step he leaves it.
- The short-hop rule (`jumpCut`) cuts any upward speed when jump is not held. Anything that throws him up without a
  button (the kicker) must set `jumpCut = true`, or the throw is cut to a third the next frame.
- The hold on a ramp (`moveVertical`) is `(speed * dt + radius) * slope` and a little: a chute two up for one along
  needs most of a unit. A rider leaving a ramp for the FLAT is not held (the flat's hold is the old 0.48), which is
  why he flies off a kicker 1.2 high; a kicker under about half a unit would not throw him.
- In `moveAxis` a too-steep ramp is judged by the uphill edge of his footprint only when he moves up it along its own
  axis. Going down or across it is judged like any ramp, by the slope under his middle.
- The garden's kicker stands east of the door on purpose: the exit takes anyone GROUNDED at the door (`atDoor`), and
  the roll-out runs right past it. `tests/garden.ts` checks a straight rider is never at the door.
- For pictures of it: `ride.mjs` in the scratchpad pattern (keys down/up, `burst:N` screenshots) worked better than
  timed single shots; the first second after a page loads runs slow, so start him close to the slope.

## Grinding (2026-11-15)
START-HERE has the rules. Things to know before touching it:
- `grindHeight(line, s, was, moved, ...)` is the whole of "is there still a line here": the highest top at a point
  just inside the line that is no more than a little above where he was (`give` grows with how far he moved, so a
  steep rail is followed), 'end' if that has dropped away or the ground beside it has come up, 'wall' if something
  stands across it. The controller asks it again a body's half-width ahead, so he stops at a wall with his front.
- A ledge's line is ON the box's edge: his middle is on the edge, half of him over the drop. He is placed, not
  collided, while grinding. When it ends the ordinary rules have him again from exactly there.
- `findGrind` wants the solid's own top to be the top of what is there (nothing standing on the edge) and tests the
  drop at the very place he gets on. The seam between two boxes at one height is not an edge (no drop).
- Where he is DRAWN while grinding is where the rules have him (`drawnY` in main.ts skips `feetGround`): his middle
  is on a box's boundary, and what is "under his feet" there could be the floor below.
- STOW's own press still clears `autoStowed` in the controller; nothing else of stowing happens while riding.
- The garden's rail and kerb stop ten short of the west wall on purpose: from a rail's end at speed he needs about
  eight units to brake. A longer rail there threw the test rider into the wall.

## The hop onto the shield (2026-11-15)
- The shield under his feet (`board`) is a child of `lean`, which the hop lifts and stretches. The swing is worked
  out in `lean`'s space as if there were no hop, then put back through it (`swingBoard`'s `place`), so the shield
  goes to the ground while he goes up.
- `placeOf` finds where a shield is from the joints' own matrices, up the chain to `lean`: it needs nothing drawn,
  so it works in the tests and the viewer, where no frame is ever rendered.
- The smears are `MeshBasicMaterial` with the shield's own vertex colours: the game's own material has no opacity.
- The clocks run at the very top of `RatModel.update`, before the pose is chosen, so the pose and the shield start
  on the same frame.

## The air attack onto the shield, the slide on his hide, the drop onto a rail (2026-11-15)
START-HERE has the rules and the owner's words. Things to know before touching it:
- `slopeBelow` looks straight down from his middle only. A slope beside him, or under his edge, does not count.
- The surf start is checked BEFORE the sword block in `update`, so it takes the press and the dive never starts.
- `rideGroundAge` (time on the ground since landing) is what the "too slow: step off" rule waits on, not `rideAge`:
  he can come down out of a long jump already riding, with no speed yet, and must be given time for the slope to
  take him.
- A jump pressed on too-steep ground makes him slip THAT frame (`slipIfTooSteep` reads the press), so the jump is
  the slide's hop. Otherwise the scrabble plus a full double jump was a way up things.
- **The hop ENDS the slide (the owner, 2026-11-16: "if you jump it should go back into a jump pose and he can slip
  again if he lands on an [incline] too steep").** It used to leave him `sliding` in the air, in the slide's pose,
  and still sliding when he came down. Now `sliding` goes false at the hop and `slideHop` is true until he lands:
  his state is jump, then fall (the ordinary poses); while `slideHop` holds he is carried as he was going (no
  steering), with no second jump, no wall kick and no catching an edge, so the hop is still no way up what he slid
  down. Landing on ground he can stand on, he is on his feet; on ground too steep, `slipIfTooSteep` takes him again.
  (A jump held as he lands on steep ground makes him hop again at once: the slip and the hop are the same frame.)
  Sliding OFF an edge with no jump still leaves him in the slide's pose in the air: not asked about, not changed.
- The short-hop rule again: in the tests, `jumpHeld` must be true on the frame of the press, or the jump is cut to
  a hop a third as high. (A test that pressed STOW "at the top of his jump" was in fact a hand's height up.)
- Coming down onto a rail, `grind.air` is his height above the line and `grind.off` how far to its side; he is
  not `grinding` (the getter) until `air` is 0, so sparks and the ring start when he touches. If the line ends
  under him on the way down, the grind is dropped and he is simply riding in the air.
- Onto a rail from within 0.3 above it he is put on it at once, and the event that frame is 'grind', not 'ride'.

## The pipe, and ramps met from on top (2026-11-15)
- In `moveAxis` a ramp is skipped as a wall if his footprint already overlapped it BEFORE this axis' move (with a
  ten-thousandth of slack, or one standing exactly against its side counts as on it and walks in). Boxes that are
  not ramps are as they were.
- In `moveVertical` a ramp does not hold one whose middle is beyond its LOW end. Its high end and its sides still
  do (that is the ledge of a landing).
- The step-up allowance on a ramp is `stepHeight` + how far he went along it times its slope (+ in `moveAxis`,
  his half-width of the slope he is standing on, for the join from one facet up to the next).
- `rideGroundAge`, `restSlope`: see START-HERE. Braking (stick back) still steps him off on a slope he can stand on.
- My picture script could not time a drop-in by keyboard (the page's first seconds run unevenly): `&riding` and
  `&slow=0.1` with `at=` on the wall was the way to see the ride across the pipe.

## Ramps tipped two ways (2026-11-16)
- `b.max.y` of a ramp with `cross` is its highest CORNER, not its first slope's high end. Anything that read
  "`b.max.y` is where the ramp gets to" must use `topAt`. (All that did were changed; check any new code.)
- Ask `slopeXZ(b)` for how a ramp climbs in a direction; `slopeOf(b)` is only how steep it is. `ramp.axis` and
  `ramp.up` no longer say which way is down by themselves.
- Facets of a curved wall share edges exactly only if they are built from the same numbers (the garden builds each
  from `f.h0`, `f.h1`): floating sums differ in the sixteenth place, which is why the test rounds join lines.
- A pipe's fall must be at least `ride.minSlope` (0.4) if the air attack is to work over its flat middle; the
  garden's is 5 in 12.

## The Long Drop (2026-11-16: the downhill level; the giant ramp and the dark arena)
- `src/levels/longdrop.ts`: `COURSE` (the list of sections: edit this to change the level), `longDropPlan()` (where
  everything lies: `placed`, `launches`, `rails`, `weeds`, `lineCrumbs`, `lip`, `arena`, `well`), `dropFloor(z)`,
  `dropLine(z)`, `sectionAt(z)`, `flight(up, seconds)`. `src/levels/pipes.ts`: `pipeRun`, `wallAt`, `SEWER_PIPE`.
- Try it: `#level=longdrop&nostory`; add `&at=x,y,z,3.1416` to stand anywhere (heights: print `longDropPlan().placed`),
  `&riding` to start on the shield, `&slow=0.2` to watch. The arena's middle is at z 1422.4, y 0.
- Decor kinds (layout.ts, drawn in chamber.ts): `runnel`, `sleepers`, `weed`, `arena`, `eyes`.
- `LevelDef.well` / `Well` / `keepInWell` (collision.ts): a round room he cannot leave. `main.ts` hands it to the
  knight (`player.well`) when a level loads; tests must set `p.well = def.well` themselves. ENEMIES DO NOT KNOW OF IT.
- The level is built ONCE (`longDropPlan()` caches) and `longDrop()` copies it: do not change what the plan holds.
- Each section is solid only 8 deep (`DEEP`), not down to the ground: the course hangs over the dark, and nothing
  of it is lower than the well's top. A ledge must drop less than that or its face would have a hole under it.
- An obstacle on a falling floor must be TALL at its uphill face (see `WEED.high`): the step-up allowance on a ramp
  grows with the slope, so a low solid is ridden up onto, not hit.
- He cannot steer in the air, and he is in the air after every ledge and every cut-down trough mouth: put nothing
  he must steer round in the first 20 or so of the section after.
- In the air his speed along the ground does not change, and his fall is the game's (18 up, 22.5 down, 30 at most):
  that is all `flight()` is. If the jump numbers ever change, the crumbs in the air move with them (and the test
  rides them all to be sure).
- Riding UP costs speed fast (15 times the slope, a second): a ramp that climbs 5 leaves him under 10. A throw is
  his speed times the lip's slope, so a SHORT STEEP lip throws furthest.
- The pipe's two outer facets are under 0.6 wide and its last is under 0.5 (a "rail" by width). It is not ground
  as one because the shoulder beside it is higher (`grindHeight` ends the line); without a shoulder, check again.
- `RAIL_DROP` 0.2 (grind.ts): how far a rail must stand over the ground either side. Any thin solid (under 0.5
  wide, over 0.5 long) that stands 0.2 proud is now a grind line: mind that when placing kerbs and trims.
- One mesh is made for each solid (363 here) and the camera sees 200 far: most of the level is culled, which is why
  so long a level costs no more to draw than a room. A wall the whole length of it would always be drawn: its
  walls are a pair for each section.

## Boss: the Widow (2026-11-16: the Long Drop's arena; third version)
- Rules `src/enemies/widow.ts` (`WIDOW` table, `Widow`), look `src/enemies/widowModel.ts`, tests `tests/widow.ts`.
  START-HERE.md has what she does and the owner's words on the two versions he threw out. THE RULE: everything is a
  leg or her head, seen to move; no rays or flung poison; no back of the room. Do not bring back long legs or beams.
- **Where she is:** `theta`, a bearing round the lit floor (`field`). `px, pz` (getters) is the edge of the light
  there, less her `lean`; she faces the floor's middle; each leg turns about its own `hip(side, inner)`; a leg's
  angle is counted from the way she faces, + to her LEFT. `x, z` (what the game takes her to be, and what the sword
  meets) is her HEAD, which is back in the dark except in a bite, when thrown down, and dead.
- **She crawls only while idle** (toward his bearing, `crawl` radians a second), and strikes when within `near` of
  it, or after `patience` if he will not stand still. She leans in during a leg's wind-up (`aimLeg` sets `spot` and
  `leanGoal`), and is exactly at `leanGoal` when the blow falls.
- **A leg's reach is worked out, not guessed** (`aimLeg`): along the floor it is what `legReach` allows from a hip
  `hipHigh` up and `hip` to the side, plus her lean; the spot is pulled in if it is still further than the leg from
  where the hip will be. With the numbers as they are the ring just covers the floor's middle from the rim. Change
  `legReach`, `lean`, `hip`, `hipHigh` or the arena's size and run "THERE IS NO BACK OF THE ROOM".
- **One blow's shape at a time** goes to combat through `bite`: a slam, a stab or a bite is a circle at `spot`
  (`at`), with `from` = her place so that his shield must face HER (`Foe.bite.from`, used by combat.ts for the
  shield and the knock-back only); the sweep is a thin wedge from the leg's hip to its tip (`arc` = as wide as the
  leg where HE is: it asks his distance), `ground`.
- **A blow from above** (slam, bite, stab): her `y` is set to his height while it is active, so a jump is no way out
  (combat only settles blows between things on the same level). The sweep is `ground`: a jump is the way out.
- `parts`: a stuck foot (after a slam or a stab), and the leg lying on the floor (laid out before a sweep, and
  where it stops after). She is `immovable`, so those push him out of them: the leg cannot be laid ON him (it was,
  at first, and struck him the instant the sweep began).
- `ready` MUST exist or `director.ts` never lets her attack. `events` are emptied by the game (`beastSounds`), not
  by her `update`: a blow's result (`reel`, `hurt`) is added during combat, after `update`.
- Fairness is arithmetic, and tests hold it: from a standstill he covers 0.96 in 0.25 s, 1.27 in 0.30, 1.89 in 0.40,
  2.51 in 0.50. Each ring stops following him at `*Track` of its wind-up; what is left of the wind-up must take him
  out of the blow (its radius and his own 0.3). That is why the slam's ring is 1.2 and why bites and follow-up stabs
  are NOT hurried when angry.
- The model: every piece is tinted each frame by `lightAt` (how far out from the floor's middle, how high). Legs are
  two bones of `BONE` solved in the world (`lay(mesh, a, b)` stretches a unit bar from a to b); a leg that lies on
  the floor is at full reach with its hip lowered, so it is flat. `w.crawling` makes her step.
- `LevelDef.well` keeps HIM in the light; nothing keeps her out of it but her own rules (tested through whole fights).
- The checkpoint is in `main.ts` `lavaStep`: standing on a well's floor moves `player.spawn` there.
- `main.ts`: a level with `returnTo` is marked cleared on loading ONLY IF it has no goals.
- Her sounds: `widow*` in synth.ts (seeds 225, 226, 231 to 233), played in `beastSounds`. `widowRear` is played at
  `0.8 / windTime` so the creak lasts as long as the wind-up it warns of. (`poison*`, seeds 227 to 230: unused.)
- Her sliders: group 'The Widow' in tweaks.ts (root `widow` = the `WIDOW` table). A slider's default must be on its
  own step grid (min + n * step) or the panel's "reset" test fails. A new number in `WIDOW` is on no slider until a
  line is added there.

## The Glow Cave (2026-11-16: a try-out room for a theme; `#level=glowcave&nostory`)
- Level `src/levels/glowcave.ts` (in `TEST_ROOMS`), tests `tests/glowcave.ts`.
- `LevelDef.ambient` (default 1; the cave 0.4) sets `ps1Uniforms.ambient` on level load (main.ts, beside the fog):
  the shader's plain light is `vColor * ambient`, the coloured lights are added on top as before.
- Pictures: `caveRock`, `caveFloor` (64 px, a tile covers 4: bare rock, no glow in them), `glowMoss` (32 px, greys).
- Decor in chamber.ts: `moss` (MeshBasic, vertex colours times `glowMoss`; lobes of a ragged fan; threads; optional
  light and halo), `mushroom` (stem lit like the room, cap MeshBasic; `halo()` is an additive sprite; a light if its
  size is 1.5 or more), `stalactite` (five-sided, lit like the rock, hangs from `roofOver`).
- `MUSHROOM`, `mushroomCap`, `mushroomSolids` in layout.ts: the shape drawn and the shape solid come from the same
  numbers. A level must push `mushroomSolids(...)` for each mushroom it places.
- Glow bugs: `EnemySpec.color` -> `Firefly.color` -> `Drop.color` -> `Ember.color` -> `Flame.color` (main.ts passes
  it at `makeEmber` and `flames.add`). `FireflyModel(color)` lights its lantern and tints its hood. `EmberFx.look(color)`
  makes one set of materials a colour (cached): MeshBasic tongues, reach 5, power 0.75; no colour = the old look,
  untouched. `EmberFx.colours()` is for the tests. Viewer: `#view&who=firefly&color=<hex>&light=<0..1>`.
- Mushroom shape (layout.ts): `MUSHROOM { solid, deep, top, capSolid, stemSolid }`, `mushroomCap(x, z, size, cap?)`,
  `mushroomStem(size, stem?)`, `mushroomTop(x, y, z, size, cap?)` (where he stands), `mushroomSolids(x, y, z, size,
  cap?, stem?)`. The cap's depth is a share of its RADIUS, not of the mushroom's height. In chamber.ts the lathe's
  faces come out wound inward: `outward` reads the first face's normal to know which faces look up.
- The Cap Walk: `CAP_WALK`, `WALK_CAP`, `WALK_STEM`, `WALK_PRIZES`, `GAP_PRIZE` in glowcave.ts. The glow bugs' air
  stops at x 2.5 so the first two caps (at their flying height) are outside it; caps inside it are above 4.6 under
  the cap or below 4. tests/glowcave.ts has `hop(from, to, jumpFrame, secondJumpAfter, grab)`: use it to lay out
  any hop course by trying timings, not by eye. The stalactites are given by the height of their POINT; the roof
  follows the tallest thing (`ceilingOf`), so adding a tall mushroom lengthens them all.

## The Lamp Scorpion (2026-11-16; in the Glow Cave)
- Rules `src/enemies/scorpion.ts` (`SCORPION` table, `Scorpion`, kind 'scorpion'), look `src/enemies/scorpionModel.ts`,
  tests `tests/scorpion.ts`. START-HERE has what it does and that the owner has not judged it yet.
- States: idle, stalk, stingWind, sting, stuck, snapWind, snap, recover, stagger, douse, dark, sprawl, dead, return.
- For the game and the model: `light` (lamp, 0..1.6), `tail {ahead, up}` (the barb's point in its own frame), `tip`
  (the same in the room: main.ts puts its lamp's light there, `stingLamps`), `aimDist` / `aim` / `mark` (the ring: the
  blow is `bite.at` on the ring, so if it is shoved the ring and the blow go together), `claw` (-1 shut, 0, 1 wide).
- The model reuses the Widow's shape helpers (`flat`, `loft`, `horn`, now exported from widowModel.ts). `tailJoints`
  solves the tail: equal bend at every link, found by halving, clockwise (up and over forward) ALWAYS, so every pose
  the rules give must have the barb ahead of the root or it would arch through the floor.
- Its own sounds: scorpRasp (alert; quick, the claws' tell), scorpCharge (the sting's tell, 0.7 s like the tell;
  played fast and quiet when its lamp relights), scorpSting, scorpSnap, scorpHurt, scorpDouse, scorpDie.
- Pictures: scorpShell 64, scorpTail 32, scorpClaw 32 (ps1 lit materials `mat`, `tailMat`, `clawMat`), scorpLamp 32
  (MeshBasic `bulbMat`, in greys, drawn 1.5 times as bright as the barb's plain light). `join()` in the model keeps
  the pieces' picture places (uv). The finger's uv is turned so the horn's point is at the claw picture's dark end.
- Builder piece 'scorpion' (custom.ts, builder.ts, place3d.ts): a patch 9 each way, facing as set. In polycount.
- No sticker on purpose (see START-HERE). No Tweaks sliders.
- Mushroom pictures (chamber.ts): cap = MeshBasic with `mushroomCap` map times the per-face colours, its uv doubled
  round; stem = its own lit material with `mushroomStem`, uv flipped so the picture's top is the stem's top.

## The Cold Main (2026-11-16: a try-out room for the ice theme; `#level=coldmain&nostory`)
- Level `src/levels/coldmain.ts` (`COLDMAIN`, `ICE_BLOCKS`, `ICE_BLOCK`, `ICE_SPIKES`, `ICE_PRIZES`), tests
  `tests/coldmain.ts`. START-HERE has the owner's words and his two corrections.
- Slick ice: `Box.slick` -> `Aabb.slick` (chamber.ts and `aabbOf`) -> controller `onIce` (grounded on a slick box) ->
  the ground accel and decel are multiplied by `TUNING.ice`. `gliding` (on ice, moving, stick let go, state run or
  walk) goes to the rat's model as `glide`, which holds the LAND pose. Only the ordinary walk and run: dodge, lunge, the
  shield ride and the body slide are as on any ground.
- Decor in chamber.ts: `icicle` and `iceSpike` (four-sided cones in `iceMat`, lit with a glint, picture
  `iceClear`); `jet` (nine sprites with `puffTexture()`, white with alpha; moved in `update(time)`; `every`/`on`
  make gusts). `haloTexture()` is the additive glow's; do not use it for fog.
- Pictures: iceBrick 32 (painted over paintSewerBrick), frostCobbles 64 (HIS CHOICE: see its comment), iceSheet 64
  (tile 5), iceBlock 64, frostPipe 32 (not yet worn by anything: the `pipe` decor is plain colour), iceClear 32.
- `LevelDef.motes` picks what drifts in the air apart from the theme; 'ice' is snow (world/motes.ts).
- tests/coldmain.ts has `hop(from, to, jumpFrame, secondJumpAfter, brakeWithin, runUp)` for hops onto slick tops.
- Gusts: `src/world/gusts.ts` (`JET_SPEED`, `GUST_ACCEL`, `gustsOf(decor)`, `gasAt`, `gasWidth`, `gustOn`, `blow`).
  main.ts keeps `gusts` (set on level load) and `worldClock` (the frame's time, the same the chamber draws the puffs
  by) and calls `blow(...)` on his velocity just before `player.update`. Because his own stopping (26 a second
  squared on stone, a tenth of that on ice) is taken off in that update, a push of 12 is nothing on stone and a
  shove on ice. In the level: `NORTH_BURSTS`, `SOUTH_BURSTS`, `FALL`, `GUST` in coldmain.ts; each burst is two jets,
  the fall (drawn only) and the gust (with `push`, and `delay` = the fall's travel time).
- Gas sounds (main.ts `soundWorld`): `jets` = `jetsOf(def.decor)` (all jets); a jet with `delay` 0 plays `gasBurst`
  when `gasAt(j, worldClock, 0)` turns true; `gasHiss` loops at a volume from `gasNear` (the nearest gas of any jet).

## The Club fixes, the look-up and the picture (2026-11-16; tests `tests/clubfixes.ts`)
START-HERE has the owner's words and the rules. Where things are:
- `lyingOn(material, level)` (ps1Material.ts): polygon offset for a thing lying on another. chamber.ts `plainOn(level)`.
- `src/render/pixelFont.ts` (`drawText`, `textWidth`, `wrapText`, `hasGlyph`); `signPixels`, `SIGN` in courseDoors.ts.
- `src/world/shadow.ts` (`shadowSpokes`, `groundAt`); main.ts rebuilds his shadow's twelve spokes each frame.
- `buildBulbs(dx, dz, sag, count, hang)`; `bulbHang` in chamber.ts decides each end.
- `light` decor `bare`; piece prop `bare` in custom.ts (no post, no solid).
- `shellGeometry(seam, plate, rim)` in patrons.ts.
- Camera: `FollowCamera.pitch` now runs from `minPitch - lookUp` to `maxPitch`; `lookingUp` 0..1; the swing behind
  him uses `max(pitch, minPitch) - up * lookUpDrop`; at the end of `update` the position is kept `floorClear` over
  the ground under it and `look.y` is raised by `up * lookUpTilt`.
- Controller `moveAxis`: EPS on the perpendicular overlap test; push-out to the nearer face if he did not cross the
  travel face this step.
- `src/render/picture.ts` (`pictureSize`, `SHARPS`, `SHARP_ROWS`, `PICTURE`); `Display.sharp`, `cycleSharp`; main.ts
  `resize()` sets the canvas's own size in px and its box to `overflow: hidden`.
- Scratch tools used: frames from a video with `ffmpeg -vf fps=N`; `shot.mjs <out> <w> <h> <hash>` for a screenshot
  at a chosen window size (the others are fixed at 1100 by 620).

## The clipping sweep (2026-11-16; test `tests/clipsweep.ts`)
START-HERE has what it is, the rule, and why things are PAINTED ON AFTERWARDS instead of pulled in depth. Where
things are:
- `src/render/layering.ts`: `sweep(root, where, buried?, every?)` → `Finding[]`; `decalOf(material, pull)` (a copy
  that writes no depth and SHARES a shader material's uniforms; one copy a material a pull; `userData.layerOf`,
  `userData.decal`); `asDecal(mesh, level, pull)` (material → its decal copy, `renderOrder` and `userData.layer` =
  level); `autoLayer(root, buried?)` → `{ layeredMeshes, skins, skipped }`; `LAYER_BUDGET` 90,000 faces;
  `LAYER_MOST` 12; `GAP` 0.03; `AREA` 0.0015.
- `autoLayer`: (1) every hand-made FLAT mesh in a depth-writing `lyingOn` material becomes a decal on that layer
  (done for the Long Drop too: it is cheap); (2) if over budget, stop; (3) sweep with `every`, give each front a
  level one over its back until nothing changes; (4) in order of level: a flat or already no-depth front →
  `asDecal`; a solid front → a child mesh with the same geometry, `userData.skin`, a decal copy of its material,
  `renderOrder` = level. A front's pull is one more than whatever WROTE depth under it (a decal under it wrote
  none, so a stack of flat things is all one hair over the floor).
- A mesh's layer for the sweep is `userData.layer`, else its material's pull. A thing and its own skin are one
  thing. Two things are "of one material" if their materials are copies of one (`userData.layerOf`).
- A pair is passed over if: the two are on different layers; they are of one material and one painted colour; either
  looks straight into a solid (`buried`: main.ts gives it the room's colliders, ramps left out); they are in one mesh
  and in one plane, or one is the back of a two-sided face, or the mesh writes no depth.
- Of two things the same size, the one made later is on top (so the answer is the same every run).
- It is written with plain numbers and one scratch table, and asks "how much do they overlap" and "is it buried"
  last: the first version took 0.8 s on the Keep, this one 0.1 s. Keep it that way if it is changed.
- main.ts: `autoLayer(chamber.group, ...)` right after `buildChamber` in the level load.
- chamber.ts: pipe bands `max(r * 1.25, r + 0.04)`; moss material `depthWrite: false` + `lyingOn`, mesh
  `asDecal(patch, 1)`; runnel `asDecal(strip, 1)`.
- longdrop.ts: a rail's box foot is `floor(z0 + to)` (was 0.2 lower).
- `lyingOn(...)` wraps every shadow material in the enemy models, npc.ts and itemModels.ts, and the warning
  rings/marks in emberFx.ts, scorpionModel, widowModel, broodModel, wyrmModel, stagModel (ring a layer over its
  fill). These are see-through and write no depth already; they are not in the room's group and are not touched by
  `autoLayer`.
- npc.ts: no shadow of its own for a character built on `AntModel` or `StagModel`.
- `tests/clubfixes.ts` still builds the Club's props on their own (not through `autoLayer`) and checks their
  hand-made layers; in the game those hand-made flat layers are then made painted-on as the room loads.

## Creatures on slopes (2026-11-16; test `tests/foeramps.ts`)
- `src/enemies/footing.ts`: `standsOn(colliders, x, y, z, r)`, `floorUnder(colliders, x, y, z, r?)`,
  `slopeUnder(colliders, x, y, z)` → [rise per +x, rise per +z], `wallOver(...)`, `FOOT_STEP` 0.25. On a slope a
  creature's step is `FOOT_STEP + slope * r` (its uphill edge is over higher ground than its middle; without that
  it could not walk off the top of a steep ramp onto the landing). `floorUnder` allows the same step.
- foe.ts: `FloorUnder` type; `Foe.floorUnder`; `keepOnFloor` sets `y` after resolving x and z; `sameGround(e, px,
  py, pz)` replaces `Math.abs(playerY - this.y) < 0.9` in scuttler, guard, ironback, stag, mantis, ant, scorpion.
- Each of those and the toad: `floorUnder` field, `homeY`, `this.y = this.homeY` on a respawn.
- mantis.ts: the crouch walks the leap's line by the floor (`ground[]`, `groundAt(d)`), `leapFromY`/`leapToY`, and
  `y` goes from one to the other over the leap.
- main.ts: `canStand` → `standsOn`, `foeFloor` → `floorUnder`, `wallAt` → `wallOver`; `WALKERS`; `foeTilt` (a
  WeakMap of eased slopes) and a quaternion premultiplied on the model's root after `setTransform` (the root's
  rotation is put back to zero first on a frame after a tipped one, since `setTransform` only sets its yaw).

## Cutscenes (2026-11-16; test `tests/cutscene.ts`)
- `src/cutscene/cutscene.ts` (pure): `CutsceneDef`, `ActorKey`, `PropKey`, `CamKey`, `compileCutscene`,
  `sampleCutscene(sc, t)` → `CutFrame` (cast, props, cam), `checkCutscene(def)` → what is wrong in words, `CUT_FPS`
  30, `NOD_TIME`, `SHAKE_TIME`. A walker's turns are worked out at compile (he faces his way a moment after he sets
  off and until a moment before he arrives; a key that says a facing at a moment wins it). `Ease`: smooth, out, in,
  line.
- `src/cutscene/stage.ts`: `makePuppet(who)` → `{ root, pose(frame, dt) }`; `CutStage` (cast and props in one
  group; `apply(frame, dt)`; `dispose()`); `PUPPET_NPCS`, `PUPPET_FOES`. `strings()` is the marionette's part for
  any root (rotation order YXZ: lean, a body nod for those with none of their own, a bob for those with no walk).
- `src/cutscene/scenes.ts`: `CUTSCENES`, `cutsceneById`. Places come from `BAR` in junction.ts.
- npc.ts: `Npc.puppet` (facing, headYaw, nod, talking), `Npc.nods`; `update` is now a wrapper round `step`.
  patrons.ts: `PatronCtx.nod`.
- main.ts: `show`, `showPending`, `playCutscene(def, at, hold)`, `endCutscene()`. A cutscene plays INSIDE a story
  scene of one long beat (`playScene({ id: 'show:...', beats: [{dur 0, bars 1}, {dur length, bars 1}] })`), which
  is what freezes the knight, takes the buttons and puts up the bars; its time is `story.t`. The stage is applied
  in the story block; the view is set just before `fly.applyCamera()`. Held: models are still given the frame's
  time so that eased parts settle. The dev `talk` address is now matched as a whole word (it used to match
  "table-talk").
- menu.ts: `MenuHost.scenes`, `playCutscene`; rows `scene:<id>` on the TOOLS page.
- Scratch: `scenesheet.sh <id> <t1> <t2> ...` makes a sheet of held frames (needs the dev server on 5199).

## Lock-on (2026-11-16)
- `keepTarget` (combat/lockon.ts) returns the current foe or null; it never picks another.
- `Director.update(dt, foes, px, pz, locked)`; `DIRECTOR.lockedGap` 0.3. main.ts passes `lockTarget`.
- Tests: tests/lockon.ts, tests/combat2.ts (the director's block).

## The Glimmer Deep (2026-11-16; test `tests/glimmer.ts`)
- `src/levels/glimmer.ts`: `GLIMMER`, `LANDING`, `RIFT`, `FAR_BANK`, `HIGH_SHELF`, `CAPS`, `CAP_WIDE`, `CAP_STEM`,
  `RIFT_STEPS`, `SPIRE`, `GLIMMER_PRIZES`, `GLIMMER_WEDGES`, `glimmerDeep()`. In `built` in levels.ts after
  `hollowsFaith()`; door in hollows.ts `courseDoors`.
- Moss heights and stalactite tips in its lists are given above the Landing.
- tests/glimmer.ts has `hop`, `ways` (how many timings land a hop with one jump and with two) and `reachUp` (every
  way of climbing tried: back from the wall or against it, second jump or wall kick at every moment, a caught edge
  hauled up by a press of jump). Use `reachUp` when a thing must NOT be reachable.
- Tests that count things and were moved on: gearsecrets and halls (49 wedges), softlock (18 doors he comes back out
  of), glowcave (the Glimmer Deep is the one level of the game that turns the plain light down).
- Sticker `foe:scorpion` in data/stickers.ts; icon `scorpion` in ui/icons.ts.

## The Milky Way, and three fixes from his play (2026-11-16; tests `tests/milkyway.ts`, `tests/falls.ts`)
- `src/levels/milkyway.ts`: `ROAD`, `LENGTHS` (len, x, gap {wide, under}), `HEAD`, `RUNOUT`, `MOON`, `FALL_DEPTH`,
  `WAY_PRIZES`, `CAP_UP`, `milkyWayPlan()`, `wayAt(z)`, `milkyWay()`. In `TEST_ROOMS`; door in garden.ts (north).
- types.ts: `LevelDef.sky`, `fallDepth`, `look`; motes `'stars'`. layout.ts decor `planet`. chamber.ts builds it
  (`skyMat`, `spinners`), `TILE.rainbowRoad` 7, `TILE.pomoTiles` 4.
- `src/world/sky.ts`: `paintSpace(canvas)`, `SkyDome` (`show(sky)`, `follow(eye)`; radius 150, no depth test, drawn
  first). main.ts: `sky`, `dreamRat`, `dreaming`, `wearDream()`; `applyGear` takes the dream's paint off, paints
  gear, puts it back on; the fall-back test is `(fallBack && y < -3) || (fallDepth !== undefined && y < lastSafe.y
  - fallDepth)`; the dev `at=` address sets `lastSafe` too.
- ratModel.ts: `DREAM_LOOK`, `wearColours(other | null)` (pairs meshes by their path from the root; keeps his own
  paint by geometry), `setScarfLong(k)` (and the scarf's wave uses it).
- tests/milkyway.ts `ride({ jump, brakeTo, frames, steer })` rides from the head pad; `WAY_TRACE=1` prints where
  the ride is at the middle of each gap.
- `src/player/standing.ts`: `drawnHeight(was, want, loose, frameDt)`, `safeToReturnTo(colliders, x, y, z)`.
  main.ts uses both (`loose` = not grounded, or riding, or sliding).
- courseDoors.ts: `roomOverDoor(solids, door)`, `signFit(room)` → `{ scale, foot, out, fits }`, `SIGN_HANG`;
  `CourseDoors(defs, states, theme, rooms)`. doorway.ts: `DOOR_LOOKS` (exported); cave key is `sandstone`.

## The Frost Roller (2026-11-16; test `tests/roller.ts`)
- `src/enemies/roller.ts`: `ROLLER`, `Roller` (states idle, walk, tuck, roll, spilled, right, stagger, dead, return;
  `curl`, `spin`, `moving`, `events`, `onIce`, `deflects`, `bite` with `ground: true`, `biteDir`).
- `src/enemies/rollerModel.ts`: `RollerModel`, `BALL_R`, `update(dt, { state, stateTime, curl, spin, moving })`.
- Wired in: foe.ts kind `'roller'`; types.ts `EnemySpec.type`; main.ts (creation with `onIce`, `WALKERS`,
  `beastSounds`); dev viewer `who=roller`; tests/polycount.ts; coldmain.ts `ROLLERS`, `ROLLER_ICE`.
- tests/roller.ts `meet(what)` plays it against the real knight through `resolveCombat` (stand, guard, jump, side).
  `ROLL_TRACE=1` prints the sword-swing case.

## Sign boards, surface pictures, cave steps, shadow cuts, old screens (2026-11-16; tests `tests/signs.ts`, `tests/shadowcut.ts`, `tests/screens.ts`)

- `world/signs.ts`: `boardPixels(lines, w, h)` (pure: a Uint8Array picture, top row first, `big` 1 or 2) and
  `signBoard` (a DataTexture from it, nearest filter). `render/pixelFont.ts` has `,` and `:`.
- SURFACE PICTURES: `SURFACE` (seven greys) in `render/textures.ts`; `stagShell`, `stagBelly`, `stagHorn`, `stagIron`,
  `ashWood`, `turtleScute`, `turtleSkin`, `turtleBelly`. `StagModel` has five materials (`mat`, `matPlain`, `matBelly`,
  `matIron`, `matWood`), all flashed together. `npc/patrons.ts`: `scuteMat`, `skinKit`, `bellyKit`; `shellGeometry`
  now writes a `uv` for every corner (a plate's middle is the picture's middle; the rim is a band across it).
  A ball's picture wraps once round it: its front (+z) is a quarter of the way across.
- `caveStep` (tile 2) for steps in a cave; `STEP_LAMP` in `levels/glimmer.ts`.
- `render/cutShadow.ts`: `ShadowCuts.cut(root, colliders)`, `isBlobShadow`; `world/shadow.ts` `cutOutline`. Called in
  main.ts after each creature's `tick`, each npc's `update`, and a cutscene's `stage.apply`.
- `ui/display.ts`: `screenMeasures(height, dpr)` sets `--rq-line`, `--rq-mask`, `--rq-cell`, `--rq-gap`;
  `FILTER_DEFS` holds the SVG filters `rq-green`, `rq-vhs`, `rq-glow`; `HANDHELD_GREENS`. The handheld's grid is a
  pseudo-element of `#frame` (outside the green filter, which is on `#gameWrap`).
- The dream world's next pass (blinking digital textures, butterflies, flowers, dozing dream versions of the scary
  creatures) is the owner's note in START-HERE.md: not built.

## Second lot of 2026-11-16: turtle, steps, Milky Way head, LEAVE, streamer, Jinx

- `render/textures.ts`: `paintTurtleScuteAs(mossy)`, `paintTurtleSkin` (a wrapped Voronoi), `turtleScuteMossy`;
  `shortFur`, `hairStrands`, `knit`, `ratTail`, `tartan`, `stripeSock`. `caveStep` removed.
- `world/layout.ts`: decor `bracket` {x, y (its TOP), z, yaw, wide, deep, color}, `BRACKET`, `bracketSolids`. Drawn in
  `world/chamber.ts` (the mushrooms' glowing material, a halo, a light).
- `levels/glimmer.ts`: `SHELF`, `SHELVES_HOME`, `SHELVES_BANK` replace `RIFT_STEPS`; the scorpions' den starts at
  x = -12.2. `levels/glowcave.ts`: steps in `caveFloor` with flat moss on their free corners.
- `levels/milkyway.ts`: `GATE`; the head is a strip of road, two strips of tiles, five kerbs, a gate of three boxes.
- `ui/menu.ts` `host.leave?(): { to, go } | null`; row id `leave` on the SAVE screen. main.ts gives it.
- `player/ratModel.ts`: `STREAMER`, `buildStreamer`, `paintStreamer`, `flowStreamer(dt)`, `streamerPoints()`. The
  streamer is the LAST child of `root` (the dream rat has one at the same place, so `wearColours` paints it).
- `npc/patrons.ts`: kind `rat`, look `jinx`; `ratEar(r, notch, fur, inside)`, `lock(path, wide, out, color)`,
  `class Jinx`; `ink`; `furMat`. `audio/speech.ts` `VOICES.rat`; `npc/portrait.ts` a `rat` portrait;
  `cutscene/stage.ts` `PUPPET_NPCS` has `rat`.

## The texture pass, second sitting (2026-11-16)

- `render/textures.ts`: `chitin`, `wartSkin`, `leafChitin`, `membrane`, `plumage`; a note above them on the rule
  (nothing organic in rows of oblongs: marks scattered on a ground).
- Each creature model's materials take `tex: getTexture(...)` (scuttler, toad, ironback, mantis, ant, bat, hornet,
  firefly, brood, wyrm). `npc/npc.ts`: `coat`, `mat` (the coat), `plainMat`, `kit` = soft blobs and spars, hard
  boxes and cones; the coat's `uv` multiplied at the end of the constructor. `npc/patrons.ts`: `plumeMat` on the owl.
- `dev/viewer.ts`: `who=foe&type=`, `who=npc&kind=&name=`.
- `npc/grimsqueakModel.ts`: `mat` shortFur, `both` knit.
- Not done: `player/ratModel.ts` (the knight; the guard is made from it).

## The soft characters' textures taken off (2026-11-16, the owner's verdict)

- `npc/npc.ts` and `npc/grimsqueakModel.ts` restored to what they were before the second sitting (no `coat`,
  `plainMat`, or `uv` multiplying). The owl's `ink` is plain again; `plumeMat` and the picture `plumage` are gone;
  `shortFur` is back at its first strength. The ten creatures keep theirs.
- The rule and the way of working are in START-HERE.md ("HIS VERDICT ON THE SOFT CHARACTERS' TEXTURES").

## Soft paint, Pip, the owl, Grimsqueak's teeth and spells (2026-11-16; test `tests/grimspells.ts`)

- `render/textures.ts`: `softPaint` (one strength, the deeper), `owlFeathers`, `owlWing`.
- `npc/npc.ts`: `mat` has `softPaint`; `rounded(w,h,d,r,color,x,y,z)`; `strapOn(side)` with `BODY`; Pip's shoes.
- `npc/patrons.ts`: `OWL_BODY`, `OWL_HEAD`, `OWL_DEEP`, `outAt(profile, y)`, `laidOn(profile, deep, rim, mid, lift,
  color, material)`, `finer(mesh, ku, kv)`, `owlMat`, `owlWingMat`, `softMat`; `class Owl` rewritten (same fields).
- `npc/grimsqueakModel.ts`: `GrimSpell`, `GRIM_SPELLS`, `GrimInput.spell`, `SPELL_KEYS`, `spellStance`,
  `buildSpells`, `lightSpells`; the teeth are children of the snout mesh; materials wear `softPaint`.
- `dev/viewer.ts`: `who=grim&spell=&st=`; `&soft=1` puts `softPaint` on anything.

## Grimsqueak's spells in his fight (2026-11-16; test `tests/grimfight.ts`)

- `enemies/grimsqueak.ts`: states `stormWind`, `storm`, `summon`, `heal`; events `storm`, `summon`, `heal`, `healed`,
  `healBroken`; `GRIM.storm`, `GRIM.summon`, `GRIM.heal`; `summons`, `stormDir`, `lastAttack`, `stormAtRat`,
  `stormTaken`, `rehearse(what)`. `rise()` goes to `heal` once; the end of `rage` goes to `summon`.
- `enemies/toad.ts`: `Spit.kind` and `Glob.kind` may be `'fire'`. main.ts: `fireMat`, `grimSpell(boss)`, the storm's
  hit and the summoned roaches in `bossTick`, sounds for the new events, `#bossdo=`.
- `npc/npc.ts`: `NpcAct.spell`. `npc/grimsqueakModel.ts`: `spell.plain` (only what is in his claws is shown),
  `spell.reach` (how far the forks run).

## 2026-11-17: dozers, static, flowers, hatchlings, pointer, ice piece, slime, vents

- `world/dozers.ts`: `DozerSpec`, `DOZER`, `dozerSolids`, `dreamColour`, `dreamify`, `class Dozer` (its own model, Z
  sprites). `LevelDef.dozers`; main.ts makes them on load beside `sky.show`, updates them with the npcs.
- `render/textures.ts`: `dreamStatic`, `blinkTextures(time)`. `world/chamber.ts`: decor `flowers`, `butterflies`
  (`nodders`, `flutterers`, `petalMat` = createPs1Material, both sides), decor `vent` (plate in `steamVent` + a jet).
- `levels/milkyway.ts`: `fuzz` kerbs, beds, `dozers` in the plan; `HEAD.half` 9.
- `player/ratModel.ts`: teeth are children of the snout mesh (the dream rat is built the same, so `wearColours`
  still matches part for part).
- `enemies/widow.ts`: `WIDOW.young`, `WIDOW.youngIn`, `young[]` filled on 'rage'. `widowModel.ts`: `strip` is the
  pointer. main.ts: `HATCHLING_SIZE`, the hatchling branch of `addEnemy`, the deep voice.
- `levels/custom.ts`: pieces `'ice'` (in `KIND` and `BOX_TYPES`) and `'vent'`. `ui/builder.ts` lists both.
- `player/controller.ts`: `slime`, `inSlime`; on a tie of tops he is on the box his middle is over, the slick one
  first. `world/layout.ts`: `SlimeZone`, `slimeZones`. `TUNING.slime.walk`.
- `dev/viewer.ts`: `who=dozer&type=&awake=1&pose=`, `who=hatchling&state=`.

## The Foundry's things to find (2026-11-17; `tests/foundry.ts`)

- `levels/foundry.ts`: `FINS`, `STACK`, `HEAPS_TOP`, `TRAY`, `CLINKERS`, `CLINKER`, `HUNKS`; the pieces are under
  "Things to find". A hunk is `at('crumb', x, z, top, { props: { worth } })`.
- `tests/foundry.ts`: `kickUp` (along z), `hopUp`, `leap` (run at a place, jump on frame d, again e later, catch and
  climb edges), `stand`; `lost(drop, { chimney })` takes pieces away and asks `unreachable`.
- `maxChimney()` is 8.14: keep single-route things more than 8.2 from any other upright face. `jumpReach(dh)` gives
  what a (long) jump carries for a height difference.
- `player/ratModel.ts`: `material`, `materialTwoSided` and `ownMaterials` all take `softPaint`.
- `render/textures.ts` `blinkTextures`: winks are put back in reverse order.


## The Hollows' and the Keep's things to find; the cutscenes filmed (2026-11-17; `tests/hollows.ts`, `tests/keep.ts`)

- `levels/hollows.ts`: `NEEDLE`, `CLEFT`, `DRIP`, `SPIRE`, `HUNKS`; `levels/keep.ts`: `CORBEL`, `OVER_GATE`, `CINDER`,
  `FLUE`, `BUTTRESS`, `RIDE_HUNK`, `HUNKS`. The pieces are under "The things to find" in each.
- Tests ride a slider with `buildChamber({ solids, pit, water, decor: [], movers })`, `room.stepMovers(DT, p)` and
  `room.colliders` (the Needle; the Slider's Hunk). `walkTo` takes him across a top to the thing once he has landed:
  landing on a top does not pick up what is in the middle of it.
- A `fallBack` level counts a fall at y < -3 (`main.ts`): nothing to stand on below that.
- A `light` piece with `props: { bare: true }` is light only (nothing drawn, nothing solid).
- Filming a cutscene: open `#level=hub&scene=<id>&t=0&hold`, press ArrowRight once per frame of thirty (the readout
  div whose text has "HELD:" gives "frame N of M"; set its opacity to 0 for the picture), screenshot every second
  frame, then `ffmpeg -framerate 15 -i f-%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 out.mp4`.

## The Forge: the furnace's try-out room (2026-11-17; `tests/forge.ts`)

- `levels/forge.ts` (`FORGE_ROOM`, `BAY`, `STAGING`, `STEP`, `LADLE_HANG`, `COGS_AT`, `forgeThings()`); in
  `TEST_ROOMS`; the garden's sixth door (north wall, x 30).
- `world/forge.ts`: `FORGE` (sizes), `ForgeSpec`, `forgeSolids(spec)` (hidden boxes, quarter turns only), and the
  clocks `ladleAt`, `bellowsAt`, `cogsAt`. `world/forgeModels.ts`: `buildForge(spec, mats, roof)` gives
  `{ group, update?, flames, lights }`; `heatColor`, `cogShape`. Decor kind `forge` (`{ kind: 'forge', ...spec }`);
  `chamber.ts` hands its flames to the room's flicker, its lights to `lightDefs` (the model keeps the object and
  changes its `power`), its `update` to `animators`.
- Textures: `fireBrick` (128), `deckPlate`, `castIron`, `girder`, `castingSand` (64), `coalLumps` (32); their world
  sizes are in `TILE` in chamber.ts. `Def.size` is `32 | 64 | 128`.
- A dev camera: `&eye=x,y,z&look=x,y,z`. Filming a level: `&slow=0.2`, a screenshot every 333 ms, ffmpeg at 15.

## Films, more scenes, and his two sound tools (2026-11-17)

- Film aids in `main.ts`: `&film=4` (fixed step, waits for each picture: `window.__filmReady`, `__filmGo()`),
  `&autoride`, `&autofight`, `&god`, `&chase=dx,dy,dz`, `&orbit=x,y,z,r,h,rate[,from]`, `&eye=&look=`. Slow motion
  slows the scenery clock too (`slowClock`). `levels/milkyway.ts` `makeAutoRide()`.
- `cutscene/scenes.ts`: `BEAT`, `dancing()`, and scenes `dizzy-dave-live`, `a-hand-of-cards`, `two-at-the-bar`,
  `the-old-stag`. `world/forge.ts` ladle: pours 4.5 s in a round of 12.
- `scripts/chip/` (`lib.mjs`, `songs.mjs`, `make.mjs`, `sfx.mjs`, `probe.mjs`) drive `recordings/tools/*.html`.
  Needs `puppeteer-core` and Chrome at /usr/bin/google-chrome, and ffmpeg for the MP3s.

## Recorded tunes in the game; effects from his tools (2026-11-17; `tests/tunes.ts`)

- `src/audio/tunes.ts` (generated by `scripts/chip/embed.mjs`): `TUNES[id] = { name, lead, length, bpm, b64 }` (MP3).
- `src/audio/music.ts`: `TrackName` has `dream`; `PLAYLISTS[name] = { tunes, rounds }`.
- `src/audio/audio.ts`: `startMusic` picks `startTunes` (recorded) or `startNotes`; `loadTune` decodes once;
  `MusicRun.sources`. `LevelDef.music` takes `'dream'` (the Milky Way).
- `recordings/chip/*.wav` + `recordings/map.json` (`_chip` note) -> `python3 scripts/make-recorded.py`.
- `scripts/chip/`: `songs.mjs` (SONGS incl. `bap1`, `bap2`, `kingdom`, `glitch`; JINGLES; parts with `from`/`to`;
  `dave` bars), `make.mjs` (drum lengths `[{ at, con, order, pats, gain }]`, `daveSounds`, `breakIt`), `sfx.mjs`,
  `embed.mjs`. To change a tune: edit songs.mjs, `node scripts/chip/make.mjs <dir> <id>`, then embed ALL the ids the
  game plays again: `node scripts/chip/embed.mjs <dir> bap2 bap1 cistern foundry hollows keep dream`.

## The sound is hip-hop: nine boom bap tunes, scratches, a third tool for robot voices (2026-11-17)

The owner's brief for all sound (his words are in START-HERE.md, "THE SOUND OF THIS GAME IS HIP-HOP"): boom bap, record
scratches in music and in effects, loose and gritty and crunchy (Conker, Vectorman, ToeJam and Earl), NOT grand
fantasy; each place sounding like itself; the dream a kids' cartoon that glitches into a rogue machine. He asked for a
tailored tune for each film, and sent a third tool, the Robot Voice Box (five speech chips), chiefly for the dream
world's voices, which he wants worked on hard next.
 - Tunes `sewer forge cave stone teeth cartoon sheep late rogue` in `scripts/chip/songs.mjs`; `make.mjs` gained
   `layers` (the game's own sounds, or words said by the Voice Box, on the grid), `scratches`, `crunch`, `crackle`, a
   modem. Every film re-cut over its own tune. NONE OF THE NEW MUSIC IS IN THE GAME: he has not heard it.
 - `scripts/chip/lib.mjs`: `tools.voice.say(text, chip, opts)`; `scripts/chip/voices.mjs`: a reel of dream voices.
 - In the game: a short wedge jingle and the defeat piece (`AudioEngine.jingle`, `tunes.ts` `JINGLES`); six more reel
   effects (`block splash whoosh swing dodge land`); two scratch effects (`menuBack`, and `rewind` at a fall).
 - Claude cannot hear: all of it is checked by numbers and by what starts in a real browser, not by ear.
 - RULE (the owner, the same day): the robot voice SPEAKS only in the dream world; elsewhere it may only be a sound
   effect (the scratched record). `songs.mjs` refuses a tune with spoken words that is not marked `dream: true`.

## The Big Dipper, light rails, and the dream's creatures' voices (2026-11-17)

 - `src/levels/bigdipper.ts`: the dream's long ride, a try-out room: four rides (2 min 25 on the shield by the test
   rider) with three fight pads between, 16 gaps, 6 rail crossings, 12 caps. Written as a list of pieces (`COURSE`).
 - `src/world/rails.ts`: LIGHT RAILS, rails that curve: a line through the air, not solid, ground with the grind button
   (`PlayerController.rails`; `GrindLine.curve`; decor `lightrail`).
 - `GateSpec.foes`: a gate that opens when the creatures it names are beaten.
 - `src/audio/dreamVoices.ts`, `robotVoices.ts` (made by `scripts/chip/robot.mjs`): in dream levels ONLY, a creature
   says a word as it attacks, grunts when struck, says one as it goes down. Four voices by kind.
 - A level's creatures are recoloured (`dreamify`) when its `look` is `'dream'`.

## The tuck: stick forward on the shield to crouch and build speed (2026-11-17)

The owner found the Big Dipper's sliding a little slow and asked for momentum with a top speed, and a snowboard-style
lean forward. `TUNING.ride.tuckMax/tuckGain/tuckShed`; `rideStep`; `rideTuck` (the crouch). Standing top speed is
unchanged (16); tucked it builds to 24. Everywhere he rides. The Big Dipper lengthened so a fully tucked run is
still two minutes (2:07; standing 2:55). The Long Drop has NOT been checked at 24.

