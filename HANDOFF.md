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
