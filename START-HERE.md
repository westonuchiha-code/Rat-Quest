# START HERE: handoff for the next Claude (written 2026-11-13, updated 2026-11-14)

Read this first. HANDOFF.md is a log of each feature, oldest first, and PLAN.md is the roadmap with numbered items 1–19.
Where they disagree with this file (an old test-room hash, "the story is in progress"), this file is right.

## The project
RATQUEST: THE KINGDOM BELOW is a PS1-style 3D action platformer: a rat knight, a hub (the Club), four worlds of
Golden Wedges in the style of Mario 64, and sword and shield combat in the style of Zelda.
- Stack: TypeScript (strict, no unused locals or parameters), Three.js 0.187, Vite 8. No other game libraries.
- The owner tests on a **phone** with single-file HTML builds opened in the Claude app. The real targets are
  keyboard and mouse, controllers, and **Steam** (Electron wrapper in `steam/`, Steam Deck included).
- Every mechanic has been built and tested by machine; the owner has not reported back on the latest builds.

## The owner's standing rules (follow all of them)
- **Deliver working files every turn**: run `bash scripts/deliver.sh <outdir>` and send all ten files it writes.
- When asked "what's next", give a numbered list. Every turn so far has ended with a short "what's next" list. The
  owner picks by number ("5 and 6") or says "Continue", which means the next item on the last list.
- No pop-up banners or alerts unless asked. The UI is wide/landscape-first. The on-screen pad is for testing only.
- Never auto-equip pickups or purchases. **Don't make the game easier.**
- **Keep the blocky talk-box portraits as they are.** The owner likes them simple and chunky, as a contrast with the
  rest of the game. Do not redraw them with more detail (Grimsqueak's was redrawn on 2026-11-14 and put back the same
  day, along with his sticker and the painting in Web Hollow). New characters get a face in that same plain style.
- The hero is silent (jump and attack squeaks only). Finch and Pip's sounds are placeholders (their models were
  reworked on 2026-11-14, along with every enemy's; the owner has not seen them yet).
- The story is **parked until the game is finished**. Do not offer to un-park it.
- **Never offer these again** (the owner said so, firmly, on 2026-11-14): a wave fight, Steam achievements, the story.
  Do not pad the "what's next" list with questions; list work, and when told to continue, do the work.
- Replies are plain language: what changed, what was tested, what wasn't (say so plainly), then the list.

## Setup in a fresh session
1. In the git repo (westonuchiha-code/Rat-Quest) the project is the repo root: `npm install`. From a zip: unzip `ratquest-source.zip`, `cd Rat-Quest`, `npm install`.
2. `npm run test:sim`: 1,762 checks, about 3 minutes. It must exit 0. (It builds each test into `.testdist`, so do not build a single test there while it runs.)
3. For screenshots and browser checks you need Chrome (`google-chrome`). `puppeteer-core` is a dev dependency.
   Headless screenshot:
   `google-chrome --headless=new --no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader --window-size=1000,520 --virtual-time-budget=9000 --screenshot=out.png "file:///abs/path/ratquest-nopad.html#level=keep&nostory"`
4. Build tests inside the project (`--outDir .testdist`). Built elsewhere, they can't find `three`.
   One test: `npx vite build --ssr tests/X.ts --outDir .testdist --emptyOutDir && node .testdist/X.js`

## Builds
- `bash scripts/deliver.sh ../deliver` writes all ten files:
  - ratquest.html (with the test pad)
  - ratquest-hub/cistern/foundry/hollows/keep.html (open on that place)
  - ratquest-testroom.html (the Club with every door open)
  - ratquest-nopad.html
  - ratquest-editor.html
  - ratquest-source.zip
- Single builds: `npm run build:test` (test pad), `npm run build:editor`, `npm run build` (the Steam/plain build).
- Browser checks (need Chrome; build the no-pad file first):
  - `npm run check:deck`: every screen at Steam Deck size (1280×800), no text under 13px.
  - `npm run check:files`: plays through the save-file screen with the keyboard.
- Model sheet (every pose of every beast and every character side by side; needs Chrome):
  `bash scripts/sheet-shots.sh <outdir> [spin] [only]` builds it and writes pictures: whole rows (`roach`, `toad`,
  `ironback`, `bat`, `guard`, `npcs`, `npcs2` for Mort and Wren) and close-ups (`roach-a`, `toad-face`, `npcs-pip`...). `only` is a word to match, so
  `bash scripts/sheet-shots.sh out 0.6 toad-` takes just the toad's close-ups. The page takes `#roach`, `#toad`,
  `#ironback`, `#bat`, `#npcs`, `#grim` (Grimsqueak's twelve poses), `#faces` (every flat portrait), `#items` (every collectible), `#guard` (the Keep Guard; `&only=N` for one state), `#mantis` (the Orchid Mantis, the same), `#stag` (the Stag Knight, the same), `#hero` or `#moves`, plus `&spin=yaw` and `&cam=x,y,z,tx,ty,tz` (camera and where it
  looks). On `#hero` and `#moves`, `&only=N` shows one figure and `&settle` lets its springs come to rest.
  `python3 scripts/contact.py <dir> move 5` joins the single-move pictures into one sheet.
- Dev hashes:
  - `#level=<id>`, `#at=x,y,z,yaw` (the camera sits behind him at (sin yaw, cos yaw); yaw 1.5708 looks west).
  - `#nostory`, `#unlockall`, `#menuN` (open the menu on screen N; 3 is SAVE), `#shop`, `#talk`.
  - `#photo` (or `#photo=look,pose,frame`), `#boot&title`, `#boot&files`, `#nopad`, `#tweaks`, `#ownall`, `#allstickers`, `#debug`.

## The game right now
| World | Area id | Name | Wedges | Notes |
|---|---|---|---|---|
| (hub) | hub | The Club | 0 | Doors to the worlds. Pip's shop, rest at the fire |
| Cistern (door 0) | cistern | The Great Cistern | 6 | Includes the drain secret (Sludge Scarf) |
| | pumpworks / works / sludgepit | Pump Room, Waterworks, Sludge Pit | 3 / 4 / 2 | Side areas (returnTo cistern). works: the Fencer's Wedge (three perfect guards; the Buckler makes it fair) |
| Foundry (door 4) | foundry | The Foundry | 6 | Ironback behind the Crucible. Mouth secret (Royal Scarf) |
| | shaft / coalcellars | Lift Shaft, Coal Cellars | 2 / 4 | Ironback behind the cellar gate. coalcellars: the Coal Bin secret (Cleaver) |
| Hollows (door 10) | hollows | The Hollows | 5 | Fall-back level. Bats over the gallery |
| | webs / faith / dark | Web Hollow, Leap of Faith, Lightless Way | 3 / 2 / 1 | webs: the Sleeper's Wedge secret (Moss Scarf). faith: no grab, no long jump. dark: fog 1–5 (the Miner's Helm lamp) |
| | brood | The Brood Pit | 1 | A boss: the Broodmother. Its door is on the gallery's north ledge. Her wedge appears where she falls |
| Keep (door 20) | keep | Grimsqueak's Keep | 6 | The Pyre secret (Ember Helm). Fall-back level. Two Keep Guards and an Ironback in the courtyard; a guard, and bats on chains, on the battlements |
| | lair | Grimsqueak's Throne | 1 | The boss; the ending plays back in the Club |

- 46 wedges in all (41 until 2026-11-14; four gear secrets and the Broodmother's were added and the door costs were NOT raised, so
  the doors are very slightly easier to open than before: the owner has been told). Door costs are in
  `src/data/balance.ts` (BALANCE). Shop prices are there too.
- 13 retired levels live in ARCHIVE (`levelById` still finds them).
- **Enemies:**
  - Roach (`scuttler`): circles, bites, charges.
  - Toad: spits, pounces.
  - **Ironback**: iron shell turns the sword (get behind it); rams; flipped by a wall, a perfect guard or a plunge.
  - **Flitter** (`bat`): roosts and wakes to footsteps but not sneaking; swoops; hittable only at the bottom of the swoop.
  - **Keep Guard** (`guard`): a rat with a spear and a tall shield. His shield turns to face you too fast to run
    round; a sword on it clanks and throws your arm back; two blows on it and he stabs back at once. Open after a
    thrust that missed or was blocked, when a perfect guard or a plunge has knocked his shield wide, or before he
    has seen you. Three stand in the Keep (two at the courtyard gate, one on the battlements).
  - **Orchid Mantis** (`mantis`): tall, pale, two scythes, no armour, a body all its own. Swing at it while it sways
    and it springs back (not twice running), then usually leaps in. Its cuts: a scythe goes up and glints, comes
    down, and a second usually follows, at once or after a held beat. Its leap: it crouches and flares its wings,
    jumps to where you stood for two hearts, and if it misses its scythes are stuck in the floor. Open after its
    cuts, longer when stuck, longest when a perfect guard throws its arms wide. One on the Hollows' Webbed Gallery
    (middle ledge), one in Web Hollow (the middle floor).
  - **Stag Knight** (`stag`): a great beetle on its hind legs with a forge hammer. Slow, 10 hits, and it does not
    flinch: a sword does not stop what it is doing. The slam (hammer up over its head, glowing, a RED glint: nearly
    a second of warning) is two hearts and a shield does not stop it; then the hammer is stuck in the floor. Close in
    front it sweeps its whole front (one heart; a shield stops that). It turns slowly, but stay behind it and its
    wing cases lift and it stomps: a ring along the floor all round (jump it). Five quick blows, or a perfect guard,
    put it on one knee. The rat cannot shove it. One on the Crucible's island in the Foundry, one in the Coal Cellars.
  - Grimsqueak (boss).
  - A director makes them take turns.
- **Gear:** each item has real effects (`GearFx` in `src/data/equipment.ts`). Gear secrets, proven in
  `tests/secrets.ts`:
  - the Sludge Scarf (up the Cistern drain against the current);
  - the Royal Scarf (a long jump to the Furnace Mouth);
  - the Miner's Helm (its lamp makes the Lightless Way fair).

  Four more, proven in `tests/gearsecrets.ts`:
  - the Cleaver (the Coal Bin, Coal Cellars: an iron-bound crate, `Box.tough`, that only `gear.damage >= 2` breaks);
  - the Ember Helm (the Heart of the Pyre, Keep: a wedge inside a fire, `LevelDef.fire`, only the fireproof cross);
  - the Moss Scarf (the Sleeper's Wedge, Web Hollow: a shy wedge, goal type `unseen`, there only while its roach is
    alive, idle and he is outside its notice range; the scarf halves that range);
  - the Buckler (the Fencer's Wedge, Waterworks: goal type `parry`, three perfect guards in one visit; the Buckler
    doubles the window. This one is made fair, not gated: a plain shield can do it).

  Every piece of gear Pip sells now has a secret.
- **Systems:**
  - Three save files (`src/core/slots.ts`; File 1 is the old keys).
  - Button prompts that follow the device, including the Steam Deck (`src/ui/glyphs.ts`).
  - Rumble off/low/full.
  - Photo mode.
  - Sticker book.
  - Level builder with a jump checker and trap finder.
  - Tweaks sliders (F3 in the test build).
  - Ambience, music per world, coloured lights.

## Code map
- `src/main.ts` (2,700 lines): the game loop and all the wiring (levels, enemies, combat events, sounds, menus,
  saves, files, prompts). Big but linear; search it for the feature name.
- `src/levels/`:
  - Each world is a CustomLevel (pieces) built by `compileCustom(level, id)`. The worlds are `cistern.ts`,
    `foundry.ts`, `hollows.ts`, `keep.ts` and `cisternHalls.ts`; the Club is `junction.ts`.
  - `levels.ts`: ALL_LEVELS / LEVELS / ARCHIVE.
  - `reach.ts`: the jump checker, plus trap mode (`computeReach(def, { traps: true })`) for soft-locks.
  - `goals.ts`: wedge goals.
- `src/enemies/`: logic classes (no Three.js, so they run in tests) and a separate `*Model.ts` for each.
  The models and `src/npc/npc.ts` (Pip, Finch, Dave, Grimsqueak) are built from painted shapes with
  `src/render/modelKit.ts`; `tests/models.ts` plays every pose of each.
  `foe.ts` is the shared interface (`takeHit(dmg, x, z, how)`, `deflects`, `biteDir`, `SENSES`).
- `src/combat/combat.ts`: sword, plunge, bites, guard and parry, body push.
- `src/player/controller.ts`: movement and moves (long jump, wall kick, ledge grab, plunge, dodge, guard, recoil).
- `src/ui/`: menu, boot (title and save files), HUD, shop, photo mode, glyphs, builder.
- `src/core/`: input, controls (pads), bindings, rumble, save, slots, tweaks.
- `src/data/`: tuning, balance, equipment, shop, stickers.
- `steam/`: Electron main and preload, steamworks.js (achievements, Deck flag, pad type). See `steam/README.md`.

## Habits that caught real bugs (keep them)
- Every feature gets a test file in `tests/`, added to the `test:sim` list in package.json. Use the **real**
  PlayerController and `resolveCombat` for fights, not just the enemy class.
- Every enemy roll goes through `this.rng` (tests fix the dice). A raw `Math.random` in toad.ts once made a test fail
  about 1 run in 20. footing.ts now checks that the same dice give the same result.
- Look at it. Screenshots in the game and on the model sheet found the problems the tests missed: invisible banners,
  the bat flying above the frame, a shell that read as two bubbles, steam drawn as white squares.
- After a change, run the whole `npm run test:sim` before building.

## Gotchas
- The game camera sees only about 5–7 units up a wall. Anything hung higher is invisible.
- A "defeat" wedge counts **every** enemy in its level. Adding an enemy anywhere changes that goal, so put new enemies
  in the group the hint names, or update the hint.
- The plain jump checker lets jumps pass through walls (on purpose, so it never cries wolf). Trap mode is strict.
- The menu remembers its last screen and row. Scripts must navigate by title, not by counting key presses.
- Enemies remember the last swing number that hit them, and a new test rat counts swings from 1. Use a fresh enemy
  for each check.
- Rumble ignores a weaker buzz for 60 ms after a stronger one.
- Photo mode on a pad: B / ○ means back (leave). Don't put a photo action on the east button.
- An empty save file means no save and under a second played. The game writes a few things at start-up before a file
  is chosen.
- Fall-back levels (Hollows, Keep, Lightless Way) put him back where he was, with 1 damage. Other levels respawn him at
  the start.

## Not tested on real hardware
- Steam: the Deck detection and the Steam Input pad-type lookup follow the steamworks.js API but have never run with a
  real app id or on a Deck.
- Feel: no human has played the latest combat numbers, the Ironback, the Flitter, the Keep Guard, the Orchid Mantis or the Stag Knight. Tuning sliders exist for all of them.
- Looks: the reworked models (2026-11-14) were checked on the model sheet and in a few game screenshots, not on a phone.

## What the owner wants next (his own list, 2026-11-14)
He gave this list himself; work through it, do not ask about it again:
1. **Hero animations must match his actions.** Audited 2026-11-14 on the model sheet's `#moves` page (25 moves, played
   by the real controller) and `#hero` (the ledge). Fixed: ledge grab, hang, pull-up; the plunge (hang, dive, landing);
   wall brace and wall kick (he had no pose for either). Looked right and left alone: idle, walk, run, jump, air jump,
   fall, land, long jump, roll, backstep, guard, guard walk, the three swings, hurt, dead, treading water, swimming,
   running with weapons stowed. All of this was judged from stopped frames, not in motion.
2. **A new look for Grimsqueak's evil form.** Built 2026-11-14 (`src/npc/grimsqueakModel.ts`): the gaunt king, in the
   hero's own style so he reads as the old friend stretched thin; long drooping whiskers; real arms with a gesture
   for every tell of the fight. The owner has NOT seen it yet: he disliked the old one (the whiskers most), so
   expect notes. The earlier form (the 'friend' in story/memory.ts) was not touched.
3. **Redo every collectible's model and look.** Done 2026-11-14 for the crumb, cap, relic, Golden Wedge and nacho can
   (`src/world/itemModels.ts`; see HANDOFF). Not touched: gear pickups (they are the hero's own helmet and scarf
   models, and only old levels have them) and the story's keepsakes. The owner has not seen them yet.
4. **A few more enemies.** IN PROGRESS. Built 2026-11-14: the **Keep Guard** and the **Orchid Mantis** (see HANDOFF).
   What the owner said about them (2026-11-14), which sets the direction:
   - He likes the Keep Guard, and likes how the fight against him looks: "getting closer to the Dark Souls feel that
     I'm aiming for". Keep going that way: enemies with tells, commitments and openings, that punish mashing.
   - But the guard is "basically exactly the same as the main character". New enemies must be **as detailed as the
     guard but NOT rats or mice**. Most of the game's enemies are insects, so make them insects, each with a body of
     its own. The mantis is the first built to that.
   - He saw an early sheet picture of the guard with the spear standing up through his own head and was rightly
     angry: the fight tests all passed because none of them looked at the model. So for every new creature: look at
     EVERY state, alone and large, from three sides, and give it looks checks in tests/models.ts (its weapons
     ray-tested against its own body on every frame of every move) before saying it is done.
   Built to that so far: the Orchid Mantis and the **Stag Knight** (HANDOFF has a section on each). After them,
   ideas (all insects, none built; pick one, do not ask): a hornet lancer that dives, an ant pikeman that fights in
   pairs, a firefly bomber. (A spider was on the earlier list; the owner asked for insects.)
   Lessons from building these, for the next: (1) give a weapon-holder its WEAPON's place first and lay the arms to
   it (the stag), or pose by directions not joint angles (the mantis); (2) before any picture, measure every frame of
   every move: weapon against own body, hands on the weapon, nothing under the floor; (3) a head that sticks out in
   front, or horns over it, will be in the way of anything held in two hands: decide where the weapon lives first.
5. **Two boss battles.** The first is built: **the Broodmother**, a giant spider, in the Brood Pit off the Hollows
   (HANDOFF, "Boss: the Broodmother"). The owner has not played her yet. The second is not built. Ideas (pick one, do
   not ask): a great centipede in the Cistern that bursts out of the wall drains and charges (its body following its
   head along the floor: it will need the sword to be able to hit any part of a long body, which combat cannot do
   yet); or a Great Ironback / forge beetle in the Foundry over the lava. A boss gets its name and health along the
   bottom of the screen (`src/ui/bossBar.ts`: give the creature a `bossName`, `maxHp` and `awake` and add it to the
   loop in main.ts that feeds the bar; Grimsqueak has it too now).

**The owner plays the builds and sends screenshots of what looks wrong.** On 2026-11-14 he sent seven from the
Cistern in one sitting, all fixed the same turn (HANDOFF, "Fixes from the owner's Cistern playthrough"). What they had
in common: something DRAWN did not match what was SOLID or where it was PUT (a capital wider than its pillar, hangings
half a unit off their walls, a lift whose body was in the floor, two faces in one plane). When adding anything, check
that. tests/fit.ts is where such checks live.

**Camera and wall jumps (the owner, 2026-11-14).** The view no longer swings round behind him as he moves: only the
right stick turns it (`camera.autoFollowRate` is 0; the slider "Swings behind him" turns it back on). Do not bring
that back by another road: the left stick steers relative to the view, so a view that turns itself changes what the
stick means. Lock-on pressed with nobody near brings the view round behind him. After a wall kick he is carried
straight across to the opposite wall and can kick again without the stick (HANDOFF, "Camera and wall-to-wall kicks").

Also open: raise the door costs to match 46 wedges or leave them; fire and iron-bound crates in the level builder;
playtest the Ironback, Flitter, Keep Guard, Orchid Mantis, Stag Knight and the Broodmother (none of them has been played by hand; the Broodmother's numbers are a first guess, all on sliders). (The plunge wind-up the owner asked about is done: the sword is raised
over his head, blade up, before he dives.)
