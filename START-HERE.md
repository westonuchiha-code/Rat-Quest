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
2. `npm run test:sim`: 2,411 checks, about 5 minutes. It must exit 0. (It builds each test into `.testdist`, so do not build a single test there while it runs.)
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
  - `#photo` (or `#photo=look,pose,frame`), `#boot&title`, `#boot&files`, `#nopad`, `#tweaks`, `#ownall`, `#allstickers`, `#debug`
    (the readout ends with the last six sounds played), `#wedges=9` (gives him the first nine Golden Wedges, in the
    order of the worlds: for looking at the doors and the WORLDS page part-way through. They are kept, like anything found).

## The game right now
| World | Area id | Name | Wedges | Notes |
|---|---|---|---|---|
| (hub) | hub | The Club | 0 | Doors to the worlds. Pip's shop, rest at the fire |
| Cistern (door 0) | cistern | The Great Cistern | 6 | Includes the drain secret (Sludge Scarf) |
| | pumpworks / works / sludgepit | Pump Room, Waterworks, Sludge Pit | 3 / 4 / 2 | Side areas (returnTo cistern). works: the Fencer's Wedge (three perfect guards; the Buckler makes it fair) |
| | sump | The Sump | 1 | A boss: the Sump Wyrm, a great centipede. Its door is in the Cistern's north-east corner. Its wedge appears where it lay |
| Foundry (door 4) | foundry | The Foundry | 6 | Ironback behind the Crucible. Mouth secret (Royal Scarf) |
| | shaft / coalcellars | Lift Shaft, Coal Cellars | 2 / 4 | Ironback behind the cellar gate. coalcellars: the Coal Bin secret (Cleaver) |
| Hollows (door 10) | hollows | The Hollows | 5 | Fall-back level. Bats over the gallery |
| | webs / faith / dark | Web Hollow, Leap of Faith, Lightless Way | 3 / 2 / 1 | webs: the Sleeper's Wedge secret (Moss Scarf). faith: no grab, no long jump. dark: fog 1–5 (the Miner's Helm lamp) |
| | brood | The Brood Pit | 1 | A boss: the Broodmother. Its door is on the gallery's north ledge. Her wedge appears where she falls |
| Keep (door 20) | keep | Grimsqueak's Keep | 6 | The Pyre secret (Ember Helm). Fall-back level. Two Keep Guards and an Ironback in the courtyard; a guard, and bats on chains, on the battlements |
| | lair | Grimsqueak's Throne | 1 | The boss; the ending plays back in the Club |

- 47 wedges in all (Cistern 16, Foundry 12, Hollows 12, Keep 7). The Club's doors ask 5 (Foundry), 12 (Hollows) and
  25 (Keep): about a third, under half and just under two thirds of what is open by then. They were 4, 10 and 20,
  set when there were 38 wedges, and were raised on 2026-11-15 to the same shares (tests/balance.ts holds the shares:
  add wedges to a world and it will say the doors want looking at). A door he has already been through stays open
  whatever it asks now (`doorLetsIn` in `src/levels/junction.ts`), so an old save is not shut out of a world it had
  reached. Door costs are in `src/data/balance.ts` (BALANCE). Shop prices are there too.
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

## The owner on collectibles and wall jumps (2026-11-15: a note for future changes, not yet acted on)
His words, in short:
- The collectibles "sometimes feel a little annoying"; he does not like where a lot of them are. Some are too easy.
  Some have an obvious way he is meant to get them, "but the walls and stuff aren't high enough so I can just jump
  over stuff".
- "We're not using the wall jump enough ... a real missed opportunity. The wall jump is a really cool mechanic that
  we should utilize more."
- "There should be less collectibles and each collectible should be more rewarding to get." Parkouring round a level
  (up a wall jump, across platforms that are a little difficult, or moving) for ONE object is fun; running along
  picking up fifteen in a row "like Pac-Man" is not.

What that means for any work on a level from now on:
- FEWER things to pick up, each one EARNED by a piece of movement. No trails of crumbs along a floor.
- Wherever there is one intended way to a thing, CHECK THAT IT IS THE ONLY WAY: a double jump carries about 10 and
  climbs about 4.75, a jump with a double jump and a grab climbs about 5.8. A wall he is meant to go round has to be
  higher than that. `src/levels/reach.ts` works out what he can reach; use it, and test the short cut as well as the
  route.
- Build wall-jump routes: chimneys (two walls 2 to 2.5 apart) and wall-to-wall kicks across a gap.

How things stood when he said it (counted 2026-11-15): 154 crumbs, 45 bottle caps and 10 relics across the game (24
crumbs in the Cistern, 19 in the Foundry, 18 in the Keep, 17 in the Hollows), and TWO wall-jump chimneys in the whole
game: behind the Cistern's tower, and up to the throne in the Keep.

**The Great Cistern is done to this rule (2026-11-15), as the pattern for the rest** (HANDOFF, "The Cistern's things
to find"). Eight things where there were thirty-two: five caps and three HUNKS of cheese. How to do the next level:
- A crumb can be WORTH more than one (`props: { worth: 8 }` on the piece): that is a hunk of cheese, drawn big, with
  an id of its own (`...:hunk:01`). Trade a level's crumbs for a few hunks worth the same in all and the shop's prices
  do not have to move. Caps are one each; a wedge that asks for "all the caps" follows the count by itself, but its
  name and hint say the number: change them.
- For EVERY thing: play its route in the level's test with the real controller (and pick the thing up at the end),
  and take the route's key piece away and ask `unreachable()` whether it can still be got. tests/cistern.ts is the
  pattern. That second check found two short cuts in the first hour (a slab reachable from the grand stairs, a roof
  reachable from one of the Teeth); each was closed by moving something a unit or two.
- Wall kicks: a chimney 2.2 wide gains about 1.8 a kick, one 4 wide about 2.7 (he is carried across). Give him a
  landing at the top at least 2.4 thick. Keep a chimney five or more from any other wall, or the other wall makes a
  second chimney with its end. The jump checker (`reach.ts`) knows chimneys up to 4.5 wide.
The other fifteen levels are as they were.

## Research the owner has asked for (2026-11-15: DONE; reports in `reports/`, notes in `research_notes/`)
He asked for these to be added to the list. Each is in-depth research from real sources (interviews with the people
who made the games, postmortems, design analyses), written up in the repo with its sources, and each write-up ends
with what it means for THIS game: things to do, not just things learned. Home: notes in `research_notes/<title>/`, reports in `reports/`.
**Where it stands:** done in two passes. The first could open no site; for the second, twelve sites were allowed and
the pages themselves were read (the 1996 Mario 64 team interviews, Iwata Asks and the 1998 interviews on Ocarina,
the Dark Souls Design Works interview, the Kingdom Hearts 2 Ultimania numbers, and the public source of Mario 64 and
Ocarina). `research_notes/README.md` says what was read, what could not be, and how to read more. Three reports:
`reports/Super Mario 64 design research.md`, `reports/Dark Souls and Kingdom Hearts 2 design.md`,
`reports/Ocarina of Time design research.md`. **Read each report's last section before designing a level, an enemy or
a move.** Nothing in the game has been changed on the strength of them yet.
1. **Super Mario 64**: how it was made; its level design choices; the philosophy behind the character's movement,
   the level layouts and the variety of levels; and anything else on 3D platforming and how it was built.
2. **Dark Souls**: how it builds its worlds; its philosophy of level design; how it does combat and character
   control.
3. **Kingdom Hearts 2**: movement and combat only (he does not care about its menus). This goes WITH the Dark Souls
   research, as its counterweight. His words on why, in short: he wants "more of a Dark Souls philosophy" but "faster,
   more sort of flashing movement". Do not get "locked down on the slowness" of Dark Souls: lean too far that way and
   "we're going to sort of ruin the Mario 64 vibe". If Mario 64 had the combat of a modern action RPG it would be
   nearer Kingdom Hearts 2, which is very fast, most of all late in the game as the character grows. Take from Dark
   Souls how it APPROACHES combat (he thinks the game already does this "pretty well"), not its pace.
4. **The Legend of Zelda: Ocarina of Time**: its combat, level design and platforming. He sees "a lot of parallels
   with the game we're making" and expects it to be useful for "basically everything".
The first bears on the level work now under way (the Cistern is done; the Foundry, the Hollows and the Keep are
not): do it before the next level is reworked.

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
   Built to that so far: the Orchid Mantis, the **Stag Knight**, the **Hornet Lancer** (a flyer: one over the west
   end of the Foundry's dock, the first he meets; one over the east bank of the Hollows; one over the east plate of
   the Keep's courtyard) and the **Ant Pikeman** (fights in pairs: two on the north floor of the Hollows, two in the
   Keep's inner ward) and the **Firefly Bomber** (a flyer that never comes at him: it drops fire where he is GOING,
   and hangs low and dark when its light is spent; one over the west end of the Hollows' Undershelf, one over the
   Foundry's north floor, one over the west end of the Keep's inner ward). HANDOFF has a
   section on each, and one on where they were placed and why they do not count towards the older "beat every
   beast" wedges.
   (A spider was on the earlier list; the owner asked for insects.)
   Lessons from building these, for the next: (1) give a weapon-holder its WEAPON's place first and lay the arms to
   it (the stag), or pose by directions not joint angles (the mantis); (2) before any picture, measure every frame of
   every move: weapon against own body, hands on the weapon, nothing under the floor; (3) a head that sticks out in
   front, or horns over it, will be in the way of anything held in two hands: decide where the weapon lives first.
5. **Two boss battles: both built, neither played by the owner yet.** **The Broodmother**, a giant spider, in the
   Brood Pit off the Hollows (HANDOFF, "Boss: the Broodmother"), and **the Sump Wyrm**, a great centipede with a long
   body every piece of which is solid and can be hit, in the Sump off the Cistern (HANDOFF, "Boss: the Sump Wyrm").
   A boss gets its name and health along the bottom of the screen (`src/ui/bossBar.ts`: give the creature a
   `bossName`, `maxHp` and `awake` and add it to the loop in main.ts that feeds the bar; Grimsqueak has it too).
   A third idea, not built and not asked for: a Great Ironback / forge beetle in the Foundry over the lava.

**The development suite (rebuilt 2026-11-14 at the owner's asking; HANDOFF, "The development suite").** Three things,
one look (`src/ui/devTheme.ts`): the **level editor** (`src/ui/builder.ts`, rewritten; its rules are in
`src/levels/editOps.ts`), **Game feel** (the tweaks panel) and the **Workshop** (`src/ui/workshop.ts`: a hub for
those two plus a sound test, go-to-any-place, and test switches: no damage, slow motion, hit shapes, creatures
still, every door open). The Workshop is on the title screen, in the pause menu, on F4 and at `#...&workshop`.
The 3D editor (`src/ui/flyEdit.ts`, the level editor's cube button) was given the same look on 2026-11-15, with
copy, move, redo and the full palette. The title screen (`src/ui/boot.ts`) was rebuilt the same day as the suite: CONTINUE, NEW GAME, LOAD GAME, LEVEL EDITOR, WORKSHOP,
OPTIONS, with a card saying what the chosen one does. The owner has seen none of it yet: expect notes.

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
**The view with something behind him (2026-11-15).** It no longer ends up inside his head. Something LOW in the way (a
brazier, a barrel, a crate or two) does not pull it in: it rises to look over it from its usual distance. A wall still
pulls it in, but pulled in close it goes up over his head and looks down ahead of him. Neither turns it: only its
height changes. Two sliders under Camera turn each off (HANDOFF, "The view when something is behind him").

Also open: fire and iron-bound crates in the level builder;
playtest the Ironback, Flitter, Keep Guard, Orchid Mantis, Stag Knight, Hornet Lancer, Ant Pikemen, Firefly Bomber, the Broodmother and the Sump Wyrm (none of them has been played by hand; both bosses' numbers are first guesses, all on sliders). (The plunge wind-up the owner asked about is done: the sword is raised
over his head, blade up, before he dives.)
