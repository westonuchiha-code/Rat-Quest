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
- **Deliver working files every turn**: run `bash scripts/deliver.sh <outdir>` and send all eleven files it writes.
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
2. `npm run test:sim`: 2,672 checks, about 5 minutes. It must exit 0. (It builds each test into `.testdist`, so do not build a single test there while it runs.)
3. For screenshots and browser checks you need Chrome (`google-chrome`). `puppeteer-core` is a dev dependency.
   Headless screenshot:
   `google-chrome --headless=new --no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader --window-size=1000,520 --virtual-time-budget=9000 --screenshot=out.png "file:///abs/path/ratquest-nopad.html#level=keep&nostory"`
4. Build tests inside the project (`--outDir .testdist`). Built elsewhere, they can't find `three`.
   One test: `npx vite build --ssr tests/X.ts --outDir .testdist --emptyOutDir && node .testdist/X.js`

## Builds
- `bash scripts/deliver.sh ../deliver` writes all eleven files:
  - ratquest.html (with the test pad)
  - ratquest-hub/cistern/foundry/hollows/keep.html (open on that place)
  - ratquest-testroom.html (the Club with every door open)
  - ratquest-garden.html (the Move Garden: a test room for the jump numbers; see "The Move Garden" below)
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
**What they say, in brief** (the reports give the sources and how firm each is):
- *Mario 64* (from its own source code): every one of Mario's high jumps is EARNED (by speed, by a second jump within
  0.17 s of landing, by a crouch or a turn, or by a wall), and one wall kick (3.0 of his heights) out-climbs his
  second jump (2.8). Our knight is the reverse: a double jump anywhere reaches 4.3 of his heights, a wall kick 2.5.
  That is a large part of "I can just jump over stuff" and of the wall jump having little to do. Its team spent half
  the project on movement in a room of blocks, and changed the levels midway so a jump "close enough" lands.
- *Dark Souls with Kingdom Hearts 2*: Dark Souls is fair because it is READABLE (a shown wind-up, a committed blow, an
  opening after), not because it is slow; its makers' faster games kept those rules. Kingdom Hearts 2 gets fast by
  letting the hero grow over the game, and keeps its best fights fair by having the boss break out after a fixed
  number of hits (a hidden count, which its critics fault for being hidden). Our game already has this blend: the
  knight swings faster than any enemy warns, and several enemies already refuse to be mashed. What is missing is
  shortcuts that fold a world back on itself (wall-kick climbs are the natural ones) and showing those counts.
- *Ocarina of Time*: its lock-on came from a staged sword fight (one attacks, the rest wait), and its Stalfos
  fights harder when it is the one locked on to; ours ignore the lock. Its dungeon designer's ramp: one idea a room,
  then whole places built on one idea, then everything together; fewer enemies near a puzzle; no reward where it is
  useless. The Water Temple had to be rebuilt late because the hero's numbers changed after its maps were made:
  SETTLE THE JUMP NUMBERS BEFORE REBUILDING MORE LEVELS.
- *Found in our own code while writing them:* the wait before the next roll (0.5 s) started when a roll STARTED and
  a roll lasts 0.5 s, so rolls chained back to back. **Mended 2026-11-15** (see "Rolling" below). Still open: when a
  locked-on enemy dies the lock moves to another by itself (`keepTarget`), which turns the view without the right stick.
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

## The Move Garden and the jump sets (2026-11-15)
**THE OWNER HAS PLAYED IT AND DECIDED (2026-11-15): the jump numbers stay as they are.** His words: "it feels good
the way you've got it"; the wall jump "was pretty satisfying"; "the height was basically perfect to do a double jump
and then have to grab on the ledge"; "it required skill and I appreciate it". One change asked for: "the distance
between the walls for the wall jump could be a tiny bit more lenient". Done: a kick's push across went from 7 to 7.5
(`moves.wallKickPush`), so he reaches the far wall a little sooner and a little higher across a wide gap; a kick's
HEIGHT is untouched. (That is our reading of "distance between the walls"; if he meant the timing of the press, that
is `wallKickWindow`, 0.16 s, unchanged.) He added later the same day: "I'll do some more testing here in the future with
the sliders", so the numbers are settled for now, not for ever: if he sends slider text ("Copy settings"), make it
the default and re-run every level test. So:
- Do NOT lower the double jump or raise the wall kick on the strength of the Mario 64 report. The sets stay in the
  Tweaks panel for comparing, no more.
- "He can just jump over stuff" is therefore a matter for the LEVELS: anything meant to be earned stands higher than
  5.7 (a double jump and a grab) from wherever he can stand, as in the Cistern.
- **The pattern he praised, to build with:** a wall kick, then a double jump, then a catch of the ledge, with nothing
  to spare. From the height of the kick that is about 2.8 (the kick) + 2.2 (the double jump) + 1 (the catch): a ledge
  some 6 above where he kicks from, across a gap of about 3.5. The garden's "one kick" ledge is the plain kick and
  catch; chained after a first kick up a chimney is where he met the harder one.

All three research reports say the same thing about order: settle the hero's numbers BEFORE building more levels to
them. So there is now a test room for feeling them, `src/levels/garden.ts` (`#level=garden`, the file
`ratquest-garden.html`, or the Workshop's list of places under "Test rooms"). It is no part of the game: not in
LEVELS, ALL_LEVELS or the archive, nothing to collect, its door leads back to the Club.
- **What is in it:** four steps on the west wall (2.3, 3.4, 4.5 and 5.6 up: what one jump, a jump and a grab, a double
  jump, and a double jump and a grab get him onto, from the floor, as the game is); four chimneys on the north wall
  (2.2, 4 and 6 wide, and a "one kick" ledge 6 up across a 3.5 gap from a tall wall), each with a ruler up the wall
  behind it; a ruler on a pole in the open to jump beside (not solid); and a ruler on the floor to jump along. Every
  thing has a board saying what it is (new decor kinds `sign` and `ruler`, `src/world/signs.ts`: only drawn).
  Whatever he could kick between is joined on or nine or more apart, so no climb is there by accident.
- **The jump sets:** at the top of "Jumping" and "Moves" in the Tweaks panel, five buttons that move the jump
  sliders together (`JUMP_SETS` in `src/core/tweaks.ts`): As it is; Stronger wall kick (`wallKickUp` 12); Smaller
  double jump (`doubleVelocity` 6); Both; Mario's proportions (11 and 4.5). They are sliders like any other: kept on
  the device, and they change the WHOLE game until "As it is" is pressed, so levels built for the present numbers
  will break under them.
- **What they measure to** (`tests/garden.ts` plays the room with the real controller under each set and prints
  this; a jump is 2.43 up in all of them):

  | Set | Double jump reaches | One wall kick lifts | Steps he can still jump onto | Kicks up the 4-wide chimney |
  |---|---|---|---|---|
  | As it is | 4.60 | 2.83 | all four | 3 |
  | Stronger wall kick | 4.60 | 3.90 | all four | 2 |
  | Smaller double jump | 3.38 | 2.83 | 2.3, 3.4, and 4.5 with a grab | 3 |
  | Both | 3.38 | 3.90 | 2.3, 3.4, and 4.5 with a grab | 2 |
  | Mario's proportions | 2.95 | 3.35 | 2.3 and 3.4 only | 3 |

  (The game's notes have long said "2.5 and 4.75": that is the arithmetic; played at sixty steps a second he gets
  2.43 and 4.6.) As the game is, a six-wide chimney can be climbed too (three kicks to 8 up): a kick carries him
  a little over eight across before he is back down to where he kicked from (8.3, with the push at 7.5). `reach.ts`
  only knows chimneys up to 4.5 wide, so two walls five to eight apart are a climb the checker DOES NOT SEE: the
  Cistern's "five or more from any other wall" was the checker's rule, not the knight's. Until the checker is
  taught, keep walls that are not meant as a chimney NINE or more apart, or joined.
- The room's own chimneys stand nine clear of one another (`CHIMNEY_CLEAR`), further than a kick carries.

## Rolling (the owner, 2026-11-15)
His words: "You can add like a pause between the rolls, that's okay ... but don't completely take away the player's
ability to roll around, cuz even in Dark Souls people do that and it's pretty fun to be able to kind of roll around
your enemies." So: `dodge.cooldown` is now the pause from one roll (or backstep) ENDING to the next starting, 0.25 s
(slider: Fighting, "Pause between rolls"). Mashing the button gives a roll every 0.75 s; a press made during the
pause is kept and comes out when it is over. Hits pass through him 44% of the time while he does that (it was 66%),
and rolling everywhere is about 9% faster than running (it was 13%, with no gap). Do not lengthen the pause much or
slow the roll without asking: rolling round an enemy is meant to stay.

## NEXT BIG JOB, asked for by the owner (2026-11-15): slopes, a cave, and riding the shield
His words, in the order he sent them:
- "everything right now it VERY angular. I want to introduce some more inclines. we are to do a cave level maybe a
  part of the sewer that eroded and met with a cave system. we can have inclined surfaces like the hill in Mario 64
  and zelda, we can introduce a sliding mechanic, perhaps a shield surf? maybe a butt slide like mario does. this will
  require a lot of effort because it will be working with angles and stuff we have not addressed before so be extra
  meticulous about it."
- "i was thinking for the slide, he could shield surf but he rides it like a skateboard, we could even give him a kick
  flip, his shield is not super long so he rides it like a much smaller board but he uses his tail to balance and make
  hard curves."
What that means for the code (our notes, nothing built yet): every solid in the game is a box square to the axes
(`Box`, `Aabb`); the controller's ground is the top of a box (`moveVertical`), its walls a box's sides (`moveAxis`);
the jump checker, the camera's `sight`, the enemies' footing and the level builder all assume the same. A slope is a
new kind of ground for ALL of them, so do it in this order and test each step with the real controller before the
next: (1) a ramp solid (a box whose top runs from one height to another along one axis) that he can stand, walk and
jump on, with the camera, shadows and `reach.ts` taught about it (done: see below; enemies are not taught yet); (2) the slide (too steep to stand: he
slides; and the shield ride as a move of its own: speed from the slope, the tail steering, a jump and a kickflip off
it: done, see below); (3) the cave area built for it, where the sewer has broken through. The Move Garden is the place to try (1)
and (2) first. Do not start it as a side task: it is a job for a turn of its own.

### Step one is DONE (2026-11-15): ramps
A ramp is a box whose top is a slope: `Box.ramp` / `Aabb.ramp` (`{ axis, up, low }`: its top runs from `low` at one
end up to the box's own top at the other). `rampBox(kind, x0, x1, z0, z1, low, high, toward)` in layout.ts makes one;
the level piece is `'ramp'` (like `'stairs'`: `box('ramp', x0, z0, x1, z1, top, { bottom, dir })`), and it is in the
level builder's pieces and stamps. `topAt(b, x, z)` in collision.ts is the height of any solid's top at a place.
**Who knows about ramps:**
- The knight (controller.ts): its slope is his ground (`moveVertical`); it is a wall only at its high end and along
  its sides (`moveAxis`); he is HELD to it going downhill (`RAMP_HOLD`: the slope falls away under him faster than he
  falls, so without that he left the ground at every step); only its high end has an edge to catch. He walks slopes
  up to one up for one along (`MAX_WALK_SLOPE`); a steeper one stops him at its foot, and on it he slides (step two).
- Shadows and where he is drawn (`groundBelow`, `feetGround`, `floorAt` in main.ts), falling embers (`groundFrom`),
  the camera's line of sight (`sight`: a ramp is its wedge, so standing on one he is not "inside" it), how it is
  drawn (chamber.ts: the box pressed down under its slope), the jump checker (reach.ts takes it a column at a time).
- **NOT yet: enemies.** To every creature a ramp is still its whole box: an obstacle they will not walk onto. None
  may be placed on one until they are taught (their footing is `canStand` in main.ts and each one's own `y`).
- The Move Garden has three in its south-east corner (one up in 4, in 2 and in 1) to a landing three up.
- `tests/ramps.ts` plays all of it with the real controller. Nobody has walked one by hand yet.

### Step two is DONE (2026-11-15): the slide and the shield ride
He rides his shield like a small skateboard. All of it is `TUNING.ride`, and a 'Riding' group of sliders in the
tweaks panel; the controller's part is `rideStep`, `startRideIfHeShould`, `endRide`, `bail` in controller.ts.
- **Getting on.** Running DOWN a slope (at least `minSlope`, one up in five), press SNEAK: the shield drops under his
  feet. On a slope too steep to stand on (over `MAX_WALK_SLOPE`) he has no choice: he slides the moment he is on it,
  and cannot step off till he is at its foot. Weapons must be out (not on his back, not mid-swing or mid-roll).
- **On it.** The slope pulls him (`gravity`), the flat slows him (`dragFlat`), top speed `max` (16; a run is 6.2). The
  stick ACROSS his heading steers; hard over is a carve (sharper, and it costs speed); the stick BACK brakes. He
  cannot guard, swing, roll or stow while riding. He steps off by himself below `stop`, or at once on the ROLL button.
- **Jump** is an ollie (`ollie`; tap for a short one, as on foot). **Jump again in the air** is the kickflip: it uses
  his air jump, takes `flipTime`, and landing it gives `trickBoost` of speed. Landing before it is finished, or riding
  into a wall at speed (`bailSpeed`), throws him off: no hearts lost, a moment on the floor (`bailTime`).
- **A ramp throws a rider**: leaving the top of a ramp he keeps the rise it was giving him (`rideClimb`), so a kicker
  is a kicker, and a jump at its lip adds the two together. On foot nothing has changed: a walker is not thrown.
- **How it is drawn** (ratModel.ts): poses `RIDE` and `RIDE_AIR`; the shield is a copy lying flat under his feet
  (`board`), hidden from his arm and back meanwhile; he leans into turns, his tail swings out the other way, and both
  he and the shield tip to the slope under them (`rideGround`: the shield all the way, his body six tenths of it).
- **Sounds**: `rideScrape` (a loop, louder the faster he goes), `ridePop`, `rideClatter`.
- **The Move Garden has THE RUN** along its south wall (`RUN` in garden.ts): a platform eight up in the south-east
  corner, a ramp to walk up to it, the run itself (one up in two) west down to the floor, a kicker on the roll-out
  (before the door, so a rider is in the air past it), and the CHUTE north off the platform (two up for one along).
- `tests/ride.ts` plays every rule above with the real controller; `tests/garden.ts` rides the run, the kicker (with
  and without a kickflip) and the chute. It has been watched in the running game with the keyboard from behind and
  from the side: the ride, a carve, the jump, the flip, the chute. **Nobody has ridden it with a controller in hand.**
**Three faults the running game showed that the tests had not** (worth knowing, they were all in step one's code):
- A slope too steep to stand on threw him back to its TOP every step: `moveAxis` judged it by the uphill edge of his
  footprint whichever way he was going. It is now a wall only to one going UP it; and one who cannot climb it is given
  his step back, not put at its foot.
- Running off a landing onto a steep slope he sailed clear over it: the slope is his own half-width down already when
  his middle crosses the edge. The hold on a ramp now grows with its steepness (`moveVertical`).
- The kicker did not throw him: grounded, his upward speed is nothing, and the short-hop rule then cut what he was
  given. See `rideLift` in `update`.
**Not done, and known:**
- Down the chute the camera loses him for a moment: it is still up behind the platform's lip, looking over it, while
  he is at the foot of a slope too steep to see down (he is at the bottom edge of the picture, or under it, for a
  few frames; then it catches up). The same is true of running off any high ledge. The camera may not turn by itself
  (the owner's rule), so the cure, if he wants one, is in how fast it comes forward and down, not in swinging round.
- Enemies still know nothing of ramps or of a rider. Nothing hurts or is hurt by a rider differently.
- A roll-out from top speed is about sixty units on the flat (`dragFlat` 1.6): longer than the garden. He can brake.
- No level but the garden has a slope in it yet. **Next, step three: the cave.**

### Grinding is DONE (2026-11-15; asked for by the owner the same day, his words are in the next section)
Riding, **STOW** (triangle / north on a pad, H on the keyboard: it has nothing else to do while the shield is under
his feet) puts the shield across the nearest edge he is going along, and he slides along it throwing sparks.
- **What can be ground** is found in the solids, nothing is marked (`world/grind.ts`): a LEDGE is the top edge of any
  solid with a drop of `grind.drop` (0.4) or more beside it; a RAIL is any solid under half a unit across, down its
  middle. Lines run along x or z. On a ramp they slope with it: the side of a ramp is a ledge going downhill, a thin
  ramp a rail going downhill. A line carries on from one solid to the next at the same height.
- **Getting on**: within `reach` (0.85) to his side, no more than `up` (0.75) above his feet (he hops onto it) or
  `down` (1.5) below (he comes down onto it out of a jump), going `minSpeed` or more, and mostly ALONG it.
- **On it**: the line carries him, the stick does nothing. A level line slows him less than the floor (`drag`), a
  sloping one pulls him as a slope does. JUMP hops off (the stick throws the hop to a side); ROLL steps off rail
  and shield; at its end he flies off still riding; too slow and he is set down; something across it at speed
  throws him off (`bail`, no hearts).
- **In the controller** it is `grind` (still `riding`, state still 'ride'), `startGrind`, `grindStep`, `leaveGrind`.
  While grinding nothing else moves him: `update` returns after `grindStep`, as it does for hanging from a ledge.
- **Drawn**: the shield turns across the way he goes (`board.rotation.y`), he crouches lower with his arms wide and
  his tail shivering; sparks (`grindSparks` in main.ts); sound `grindRing` (a loop) over a knock as he gets on.
- **The garden** has a RAIL and a KERB on the roll-out past the kicker (`RUN.rail`, `RUN.kerb`), and the run's own
  sides are ledges going downhill. Six 'Grind:' sliders are in the Riding group.
- `tests/grind.ts` plays every rule with the real controller; `tests/garden.ts` grinds the rail and the kerb. Watched
  in the running game on the rail (from behind) and down the edge of the run (from the side).
- **Not done**: no trick or score for it; he cannot kickflip ONTO a rail and have it count; a rail's end met head-on
  on the ground is a wall (he must be beside it, or jump and come down on it); lines do not turn corners or curve;
  enemies know nothing of it. Nobody has done it with a controller in hand.

### What the owner asked for after riding it (2026-11-15, his words)
- **Grinding** (asked for now; done, see above): "it would also be cool if you added in being able to grind a Ledge like so if you're
  board sliding down you can actually go to the edge and maybe like press triangle and he'll ... grind alongside that
  edge."
- **A whole downhill level, LATER**: "later we need to add a level that's just like a really long steep decline that's
  like a sewer pipe going down through some tunnels or something you could even have it break off into like an
  underground Railway and you can grind along the railroad tracks or just like slide down alongside them ... to sort
  of test out the limits of that sort of gameplay, I'm thinking like Sonic Adventure 2 level 1 Escape From the City
  kind of totally downhill and you're just on the board the whole time ... potentially with the grinding mechanic and
  some clever railroads and stuff but it's just a whole level where you're on the shield board sliding the whole
  time." (That is the KIND of level he means: all downhill, never off the board. Ours is our own place, the sewer
  pipe and the railway: not a copy of that level's layout, look or music.)
- **In that level**: "when you're sliding down the pipes ... there should be like a little bit of liquid in the bottom
  to give a sense that it's not in use anymore but it still carries some like slimy water and they'll be natural
  obstacles like maybe little plants growing out of cracks in the pipe ... it'll be sort of a circular level design
  with an interesting curved slope through the entire level or at least through the entire pipe sections so it'll be
  interesting to see how the board slide mechanics deal with that".
  What that needs that is NOT there: a ground that curves ACROSS his path (a pipe's bowl). Every slope now is a flat
  ramp along x or z. A pipe wants either many narrow ramps side by side (cheap, faceted, works with everything that
  knows ramps) or a new kind of ground. Decide that before building the level; try it in the garden first.
- **BACK BURNER, his word**: "maybe we can even add some like easy one hit enemies that are in the level so while
  you're bored sliding you can swing your sword at them and just kill them in one [hit] but put that on the back
  burner as an idea." (Now he cannot swing while riding at all.)

## Drawn and solid, again (2026-11-15: what the owner found walking round the Club)
He sent pictures of the knight standing inside things. The rule is old (what is DRAWN must match what is SOLID); these
were the places it was broken, and how each is held now:
- **Door frames** were only drawn. `doorFrameBoxes` (rooms.ts) gives a door's two jambs and its step from the same
  numbers `doorway.ts` draws them with (`DOOR_FRAME`); main.ts makes them solid, a course door's at once and the exit
  door's when it has grown out of the wall (and not while he stands where a jamb will be). tests/rooms.ts.
- **A couch's arms and cushion**, and **a beacon's bulb**, were not solid; **a barrel** was drawn a little wider than
  its box. custom.ts, chamber.ts; tests/wedges.ts (whose furniture checks stood after the file's `process.exit` and
  had never run: they run now).
- **Stairs:** the rules stand him on the highest thing any part of his round footprint is over, so coming up to a step
  he was lifted onto it while his feet were still over the tread below. He is now DRAWN on what is under his feet
  (`feetGround` and `drawnY` in main.ts), eased, so he walks up and down steps. The rules themselves are unchanged.
- **The fire bowl** (`brazier`) is a new model (`src/world/brazierModel.ts`), made twice. The first had a tripod of
  scrolled feet, a band and ring handles; the owner: "almost too much ... something maybe in between, a little less
  detailed with a nice texture like everything else in the game". So it is now a few plain shapes (a wide stone foot,
  a plain iron stem with one knuckle, a wide bowl with a rolled rim, three tongues of flame) and the pictures on them
  do the work (`cutStone` for the foot, one block with no joints: the room's own stone made it look like a piece of the floor; `wroughtIron`, repainted quiet; `charred`; `coals`). Its inside is drawn on both faces: it was seen
  through. Its sizes are `BRAZIER` in layout.ts, and custom.ts builds its two solid boxes from them. **When he asks
  for "more detail" on a thing, he means a better shape and a good texture, not more parts.**
- **Its fire burns** (the owner: "it's fire so you shouldn't be able to just stand in it"): `inBrazierFire`
  (layout.ts); in `lavaStep` (main.ts) it costs a heart and throws him up and off the bowl, in the Club as anywhere.
  The Ember Helm keeps him safe from it, as from any fire. Rest is offered beside the fire, on the floor it stands
  on, never up on the bowl.
- **The couch** (the owner: "a better texture, give it some rips and stains and stuff, it's like a sewer couch but
  still make it seem cozy") is a new model, `src/world/couchModel.ts`: two seat cushions and two back cushions on a
  low frame, rolled arms, piping, worn rust-red cloth with damp stains, a patch on the seat and another on the back,
  a rip with the stuffing coming out, a tear sewn up with big stitches, a plaid pillow, a knitted blanket thrown over
  one arm, and one foot that is a brick. Its sizes are `COUCH` in layout.ts; custom.ts builds its five solid boxes
  from them. Three more textures (`couchFabric`, `couchPatch`, `knitBlanket`). `tests/furniture.ts` holds the couch
  and the fire bowl to their solids.
- **Lamps** were a bright block floating in the air. Each is now a lantern (iron cap and frame, panes of light) hung
  on a rod from whatever is over it (`roofOver` in chamber.ts), which is usually the ceiling.
- **Ceilings:** over the walls there was nothing but the dark. Every level with walls round it now has one
  (`ceilingOf` in layout.ts): on top of the outer walls, or higher where something inside stands tall (then the walls
  are carried on up to it). It is only drawn, wears the walls' picture, and is seen from underneath only, so the
  level builder's view from above is as it was. tests/rooms.ts.

## The pause menu's SAVE screen, and the tweaks panel on a controller (2026-11-15)
- "settings need to be organized better in menu": the SAVE screen was one list of seventeen rows. It is now a short
  main list (save, load, the quick and auto saves, SETTINGS, TOOLS, photo mode, quit); SETTINGS opens a page in two
  columns under the headings SOUND, CONTROLS and PICTURE; TOOLS opens the editor, the tweaks, the workshop and the
  restart. Back leaves a page for the main list. From the title, OPTIONS opens straight onto SETTINGS. A setting the
  game adds (`extras` in main.ts) says which heading it goes under with `group`. tests/menu.ts.
- "game tweak menu can not be navigated via controller": `TweaksPanel.press` (bumpers: group; up and down: slider;
  left and right: change it, faster while held; the bottom button uses a jump set; the top one puts a slider back;
  the right one plays). main.ts feeds it from the controller and the touch pad while the panel is open. The keyboard
  is still the panel's own (its boxes are typed into). tests/menu.ts.

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
