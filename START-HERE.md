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
2. `npm run test:sim`: 2,909 checks, about 5 minutes. It must exit 0. (It builds each test into `.testdist`, so do not build a single test there while it runs.)
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

## The Club, more alive (the owner, 2026-11-15. FIRST PART BUILT 2026-11-16: see the end of this section)
His words (dictated, so read past the slips: "busy days" and "dizzy Dave's" are Dizzy Dave's; "conquer" is Conker):
- "I want the main room you know where dizzy Dave and everybody else hangs out I want it to be a little more
  populated I'm thinking like I want it to feel almost like the Star Wars Cantina or maybe a better example would be
  like the bar at the beginning of Conker's Bad Fur Day".
- "I want to have more props and objects and maybe have the characters have sort of idle animations where ... they're
  kind of doing something maybe it looks like they're talking to each other you know like have maybe two characters
  drinking at a table".
- "you're going to end up having to create more characters but you can do like you did with the others where you just
  take an animal make it into a cute character and then you can make two of them by changing some textures and a
  little bit about the model". **"Ideas for animals are turtles, a ferret, maybe an owl, a fox could be cool."**
- "go crazy with the designs try to make some cool looking stuff ... think about the Legend of Zelda, think about
  Dark Souls and just the variety of different types of characters and enemies".
- **Enemies can be regulars too**: "those little things that shoot coconuts or whatever at you [in] Ocarina of Time
  those things can be friendly once you beat them they ... talk to you like people so maybe one of the ants that's an
  enemy can also just kind of be a chill dude drinking at dizzy Dave's Bar".
- **It grows**: "it would be even cooler actually if the room sort of grows over time so the more you clear out areas
  and maybe some of the little mini bosses will come hang out there or maybe like just once you've beaten enough ants
  like some of them just start hanging around ... to sort of show growth in the world".
- **But it is full from the first minute. This is the rule of the whole job**: "I want it to feel pretty alive
  regardless cuz I don't want people to have to like earn the reward of a world that feels good I don't want to just
  give them an empty world to have to fill themselves I want it to feel like a full world that gains extras over
  time."
What is there now, for whoever starts it: the Club is the hub in `src/levels/kingdom.ts` (level id `hub`), with six
characters: Dizzy Dave (the pigeon behind the bar), Mellow Mort and Pip (mice), Wren and Finch (birds), and
Grimsqueak hidden. Characters are `src/npc/npc.ts`: four builds (`NpcKind`: mouse, bird, villain, pigeon), and
`lookOf(kind, name)` gives two of one build different looks, which is the trick he means. They stand still and talk
when spoken to: none of them DOES anything. The furniture so far is the couch, the fire bowls, barrels, the speaker.
What it will take (our notes, nothing decided): new builds (turtle, ferret, owl, fox, and a friendly ant made from
the Ant Pikeman's own model); a way for a character to be doing something on a loop (drinking, talking in a pair,
leaning, dozing, playing cards), which is an idle animation plus a prop in the paw; tables, stools, mugs, a card
table, more of the bar; a table of "who is here once X is done" read from the save (areas cleared, a boss beaten, a
count of ants beaten), on top of a room that is already busy with nothing done. Each new creature gets the same care
as an enemy: looked at from all sides on the model sheet before it goes in (see the spear-through-the-head note).
These are OUR characters in that spirit: not the cantina's or that bar's own people, places or jokes.

**What is built (2026-11-16), the first part:**
- **Furniture** (`src/world/tavernModels.ts`; decor kinds `table` and `stool`; `TABLE`, `STOOL`, `tableSolids`,
  `stoolSolids` in layout.ts): a table is a wooden cable drum on its side, with thimbles for mugs, a candle stub in a
  bottle cap, or a game of cards; a stool is a cork with a bottle cap on it. Solid as drawn.
- **Three tables in the Club** (`TABLES` and `clubTables()` in junction.ts: a table, the stools round it, and who is
  on each). They are added to the compiled room in `junction()`; they are NOT builder pieces (the level editor does
  not offer them yet).
- **Two new builds, two looks each** (`src/npc/patrons.ts`): TURTLES Mossback Mo (old, mossy, glasses, a beard) and
  Pebble (young, a flat cap and a kerchief); FOXES Vix (red) and Ash (grey, an eyepatch, a notched ear). The look
  goes by name (`patronLook`), like the mice and birds.
- **THE FOX WAS REBUILT THE SAME DAY, and why (a rule for every creature to come).** The owner on the first one:
  "the turtle is pretty good ... but that fox just needs some more work right away ... I don't know if it's just too
  many pieces or something or they're all too round I don't know he just looks weird I don't really like it." It
  was balls strung together: three to a leg, three to the tail, a ball for a head with a cone stuck on. The second
  is a FEW pieces, each a shape of its own, cut in flat faces (`turned`, `limb`, `faceted` in patrons.ts): one
  tapered body, one head that is a wedge from the cheeks to the nose, one brush of a tail, thin tapered limbs.
  **So: build a creature from few shaped pieces, not many round ones.** (The same lesson as the fire bowl: "more
  detail" and "better" mean a better SHAPE, never more parts.) The round turtle suits a turtle; do not make the
  ferret or the owl out of balls.
- **Doing something** (`NpcSpec.doing`: stand, drink, chat, lean, cards; `seated`, `partner`, `turn`): the turtles
  sit across a table, one drinking and one talking, taking turns (the one listening nods; a turtle's neck comes out
  when he speaks); the foxes play cards, each looking at his hand and then at the other. One who is busy keeps to
  his table and turns only his HEAD to the rat (`busy` in `Npc.update`).
- **An enemy as a regular**: Corporal Nib, an Ant Pikeman off duty (`AntModel.offDuty()`: no pike, a thimble in the
  claw that held it), standing at the third table.
- **It grows** (`NpcSpec.when`): Nib is there only once the Hollows are cleared (`#unlockall` shows him). Everyone
  else is there from the first minute. That is the whole of the growth so far: one regular, one condition.
- Each has lines, a voice (a borrowed recording at his own pitch: `VOICES` in speech.ts) and a talk-box portrait.
- `tests/club.ts` checks the furniture is solid as drawn, who is where and doing what, that the room is full
  without the extras, and every body at everything it does. Each build was looked at from four sides in the model
  viewer (`#view&who=patron&kind=fox&name=Ash&doing=cards&seated=1&t=2`) and all three tables in the running game.
**The second part (2026-11-16):**
- **Two more builds, two looks each**, made the fox's way (a few shaped pieces, flat faces, each face ONE colour:
  `paintFaces`): FERRETS Slink (sable, a mask, a mustard waistcoat) and Biscuit (cream, a red waistcoat), who
  cannot keep still (the head darts about, the long back sways, seated the feet swing); OWLS Madam Tawny (brown,
  tufts, an apron) and Professor Snow (white, a monocle, a bow tie), whose heads turn further than anyone's and tip
  right over.
- **A bar** in the south-east corner against the east wall (`BAR`, `clubBar()` in junction.ts): a plank counter, a
  step behind it, a keg (a tin can on its side, tapped) and a row of thimbles on it (`buildKeg`, `buildMugRow`;
  decor kinds `keg`, `mugs`), three stools in front. **Madam Tawny keeps it** (`doing: 'tend'`: a mug in one wing, a
  rag going round it in the other), up on the step so she can be spoken to over the counter. Slink is on a stool.
- **Someone leaning**: Biscuit, his back to the wall by the Cistern door, arms folded.
- **It grows, three ways now**: Biscuit once the CISTERN is cleared, Professor Snow (on the far bar stool) once the
  FOUNDRY is, Corporal Nib once the HOLLOWS are. With nothing done there are six regulars and the six old friends.
**The third part (2026-11-16):**
- **Dressing, all of it only drawn** (`clubDressing()` in junction.ts; builders in tavernModels.ts; decor kinds
  `rug`, `dancefloor`, `bulbs`, `bottles`, `dartboard`): a round rug under each table and a runner in from the door;
  a dance floor of lit tiles before Dave's stage; four strings of little coloured lights (hung at about five up,
  LOW on purpose: the view looks down on him, and anything much higher is off the top of the picture); two shelves
  of bottles on the wall behind the bar; a dartboard on the east wall by the card table.
- **The save counts creatures beaten**, by kind (`LevelProgress.beaten(kind)`, `noteBeaten(kind)`, in the same
  saved record as the levels cleared, so it goes with the save file; main.ts counts on every kill). A regular's
  `when` can ask for a count (`beaten: [kind, count]`) as well as, or in place of, a level cleared; `isHere(when,
  progress)` in npc.ts is the one place that decides.
- **Two regulars come for the fighting**: Corporal Nib the ant now arrives after EIGHT Ant Pikemen beaten
  (`NIB_AFTER`; it was "the Hollows cleared"), and **Sir Hobnail, a Stag Knight, minds the south door** once one
  Stag Knight has been beaten (the same model as the enemy, standing easy with his hammer: `kind: 'stag'`).
  So the later regulars are four: Biscuit (Cistern cleared), Professor Snow (Foundry cleared), Nib, Sir Hobnail.
- **The ant drinks**: its thimble comes up to its jaws every seven seconds or so and its head goes back
  (`AntAnimInput.sip`), and its head turns to whoever is near (`look`).
**Not done yet:** voices of their own; the tables, the bar and the dressing are not in the level editor; the dance
floor's tiles do not flash to the beat; nobody dances on it; Sir Hobnail does not turn his head (he turns his
whole body, as the old friends do); no rule yet for the bosses (the Broodmother or the Wyrm would not fit through
the door). The ant's sip and the stag as a doorman were seen in still pictures only. Nobody has spoken to any of them in the running game: their
lines and portraits are untested by eye. The Conker research's first pass (below) found that game's bar is its
opening scene and its menu, not a room you walk about in: the owner means its FEEL, a room of people busy with
their own evening.

## A little cutscene system (the owner, 2026-11-16: ON THE LIST, NOT STARTED)
His words: "I want us to try to build a little cutscene system that works with all of our characters where we can
sort of marionette them around maybe find some common poses online they can nod their head and move around a little
bit to you know sort of look like they're talking we don't have to actually like animate their mouths or anything.
And I just want to see how far we can get with like just making a little couple of little cutscenes you know two of
them talking at a table or at the bar maybe one of them ordering the other one a drink or sliding a glass down the
bar, you know the soldier and drinking by himself maybe like you can pan around the table like a cool movie scene or
something just try to build something where we can make scenes like this frame by frame so we can sort of tell a
better story when we get around to actually telling one."
**What he asked for, plainly:**
- One system that works with EVERY character (the knight, the Club's regulars and patrons, the enemies).
- Characters moved like marionettes: walk to a place, turn, take a pose, nod, gesture, lean in. No mouths.
- Scenes made "frame by frame": something to author a scene with, not a one-off animation in code.
- A few first scenes to see how far it gets: two talking at a table or at the bar; one ordering the other a drink;
  a glass slid down the bar; "the soldier" drinking by himself with the view panning round his table.
- It is a TOOL for telling the story later. It is not the story (the story stays parked: do not offer to un-park it).
**Notes for whoever builds it (these are Claude's reading, not his words):**
- "The soldier" is most likely the off-duty ant in the Club (the one who drinks there). Ask if it matters.
- The rule that the view never turns by itself is about PLAY. A cutscene's pan is the thing he asked for here.
- What is already there to build on: every patron takes `doing` poses (stand, drink, chat, lean, cards, tend) and
  can sit; the ant has `sip` and `look`; the viewer (`#view&who=patron...&t=`) shows any of them at a set time;
  the Club has tables, a bar, mugs and stools as real things.
- A likely shape: a scene is DATA (who is in it, and for each a list of keys in time: place, facing, pose, a nod or
  a gesture; keys for props such as a mug; keys for the view), played by one player that every character model
  answers to, with a way to step through it a frame at a time in the dev suite.
- "Find some common poses online": this session can reach only two sites, so poses would have to come from what is
  known already or from a computer session where more sites can be allowed.

## Research the owner has asked for (2026-11-15: the first three DONE; reports in `reports/`, notes in `research_notes/`)
**TWO MORE ASKED FOR 2026-11-15: A FIRST PASS ONLY (2026-11-16), NO REPORTS YET.** The owner, when the sites could not
be allowed from his phone: "if you can't do the research that's fine we can save it for later". So: one researcher a
game read what could be reached (Wikipedia and Game Developer in full; everything else only as search summaries,
each finding marked READ or SEARCH SUMMARY) and left notes in `research_notes/Conker's Bad Fur Day design research/`
and `research_notes/Rayman 2 design research/` (three files each). The Rayman 2 researcher was cut off by a usage
limit as it finished: its three files are there but it never reported back, so READ THEM CRITICALLY and check the
last one is complete. **To finish:** the makers' own interviews are on sites this environment refuses (GamesRadar,
Nintendo Life, RareGamer, Kotaku, the Rayman 2 press kit, RayWiki, the Conker wiki, web.archive.org). Allowing them
needs the session opened at claude.ai on a computer, or a newer Claude app: the phone app could not show the
request. Then a second pass that reads those pages, then the two reports.
What the Conker pass says that matters at once: its bar (the Cock and Plucker) is the opening scene, the main menu
and the epilogue, not a walk-about hub; its only change is from full to EMPTY at the end; the walk-about hub is
another place, whose residents are gates and job-givers; three people voiced everyone; enemy kinds double as
talking individuals; many characters are objects (a box, a paint pot, a barrel).
The first ask, in his words: "Conker's Bad Fur Day from the Nintendo 64 is probably a really good
thing for you to research or add to your research for this game specifically because I think they're going to end up
being very similar in a lot of ways. Also Rayman 2 the one that was on the Nintendo 64 the 3D one that one is also a
good game to reference for this game." Same shape as the others: real sources (the makers' own interviews and
postmortems first), written up in `reports/` with the notes in `research_notes/`, each ending in what it means for
THIS game. For Conker, look hardest at its opening bar and hub (how a small room is made to feel full: who is in
it, what they are doing, how it changes), its context-sensitive pads, and how its humour is carried by animation;
for Rayman 2, its movement and its linear, set-piece levels (the slides and the rides are the nearest thing to our
downhill level). Do the Conker one BEFORE building the Club job above: it is the reference he named for it.
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
- **Getting on** (CHANGED the same day, see "How he gets on, and the slide on his hide" below): in the air over a
  slope at least `minSlope` steep (two up in five), ATTACK puts the shield under his feet and he comes down riding.
  SNEAK no longer does anything of the kind. Weapons out or on his back, either.
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

### Getting on the shield is a hop, not a snap (2026-11-15)
The owner: "Even if you have to use like smear frame kind of things or whatever you need to do just try to make the
animation better for whenever he hops on his shield right now it just seems like it's like an instant snap".
- It is DRAWN only (ratModel.ts): by the rules he is riding from the first frame, as before. Nothing about how the
  ride plays has changed.
- **Getting on** (`RIDE_MOUNT`, 0.36 s): he hops (`hopY`, stretched going up and squashed landing, `hopStretch`), the
  pose is `RIDE_HOP_POSE` then `RIDE_AIR` then the ride; the shield leaves his arm (or his back) from exactly where
  it was (`placeOf`), is thrown down and out in front of him tipping onto its face, and is flat under his feet two thirds of
  the way through (`RIDE_MOUNT_UNDER`); he comes down on it at `RIDE_MOUNT_LAND`. The SMEARS are two pale copies of
  it trailing where it was a moment before (`boardGhosts`), and it is stretched a little along its length mid-swing.
- **Stepping off** (`RIDE_DISMOUNT`, 0.22 s): the same swing backwards, from the ground up onto his arm. Thrown off
  (hurt), nothing is played.
- Sound: the whoosh as it swings, the crack when he lands on it (`rideLandIn` in main.ts).
- To LOOK at it: the model viewer, `#view&state=ride&speed=7&t=0.15&yaw=1.1&dist=3` (t is seconds into the ride;
  `&after=idle&t2=0.1` for stepping off), or the game in slow motion: `&slow=0.25` on the address (new; the Workshop's
  own switch).
- `tests/ride.ts` checks it: the shield starts where it was, only ever goes down, the smears show, he hops and lands.
- Seen frame by frame in the viewer and at quarter speed in the running game. **Not seen at full speed by a person.**

### The pipe: a floor that curves across his way (2026-11-15, the first step toward the downhill level)
The Move Garden has a half-pipe down its middle (`PIPE`, `pipeFacets`, `pipeDeck` in garden.ts): the room's own floor
three wide, and either side a wall curving up a quarter circle (radius four) to a deck three up, with a ramp up to
each deck at the south end. **A curve here is FACETS**: five ramps side by side to a wall, each steeper than the
last (0.13, 0.42, 0.77, 1.31, 2.41 up for one along). Nothing new was added to what the ground can be: it is still
boxes and ramps along x or z. That is the answer, for now, to "decide how a pipe is made": facets work, and
everything that knows ramps knows them.
**He drops in**: stands at the lip, a small hop out over the wall, ATTACK. (A running jump clears the whole wall
and lands on the floor: he gets no speed from the wall that way.) He comes down on the wall riding, crosses the
floor, climbs the far wall most of the way to its deck, and swings to and fro, lower each time, till he is on the
floor and steps off. Leaning along the pipe turns him down it.
**What the pipe showed in the controller, all fixed (each has a check; all were wrong for ANY ramp, not only here):**
- At the top of a climb he hung for ever: his speed was pointed up the wall each step and the slope took it off
  again. He now goes the way he is moving (`rideStep`, `reversed`).
- At the top of a climb he was stepped off the shield (slowest there). He steps off slow only on ground flatter
  than `ride.restSlope` (0.12), or when braking.
- Landing threw his falling speed away. A rider coming down on a slope now keeps what the slope turns along itself
  (`fallBefore` in `update`): the drop-in is where his speed comes from.
- A ramp already under him (or under his edge) was taken for a WALL by a move across it, and he was put out at the
  far end of the box (eleven units, at the pipe). A ramp is a wall only to one who comes to it from outside
  (`moveAxis`).
- The foot of the next facet up held him before he reached it: a shelf at every join. A ramp's LOW edge no longer
  holds one whose middle has not reached it (`moveVertical`).
- A fast rider up a steep facet rose more than a step in a step and met it as a wall. The step-up allowed on a
  ramp grows with how far he went along it.
**Not done (as it stood then; since DONE, see "Ramps tipped two ways" below):** the pipe is LEVEL. One that runs downhill needs ground that slopes two ways at once (down along it,
and up across it), and a ramp here slopes one way. That is the next thing to decide for the level: either a ramp
that can tilt both ways (`Aabb.ramp` gets a second slope: collision, drawing, the camera's `sight`, the jump
checker and shadows all read `topAt`, so it is mostly one function), or a pipe that goes down in level lengths
joined by straight drops. He cannot yet fly out over the lip and come back in (he rides onto the deck instead).
Nobody has ridden it with a controller: the drop-in asks for a slow approach, which may or may not feel right.
For pictures: `&riding` on the address starts him on his shield where `at=` puts him (new).

### Ramps tipped two ways, and the downhill pipe (2026-11-16)
The decision the level pipe left open is made: **a ramp can be tipped two ways.** `Ramp.cross` (collision.ts): as
well as its first slope (`axis`, `up`, `low`), its top rises by `cross` across its OTHER axis (toward that axis's +
side, or its - side if negative). It is still one flat plane. The box's own top (`y1`, `max.y`) is the top of its
highest corner; the first slope runs from `low` to the box's top LESS the cross rise. `rampBox(..., bottom, cross)`
makes one (`high` there is still the first slope's top on its low side). Without `cross`, nothing is different.
**Who was taught** (each asks `topAt`, `slopeXZ` or `slopeOf`, so most of it was one function):
- collision.ts: `topAt` (the plane), `slopeXZ` (its rise per unit toward +x and +z: NEW, and what to ask for a
  direction), `slopeOf` (how steep straight up it, whichever way that is), `topUnder` (its uphill CORNER).
- The knight: the way down a slope is now straight down the plane (`slopeUnder`), so the shield's pull, the slide,
  the lean of his body and "too steep to stand" all follow the two slopes together; the step-up allowed on a ramp is
  by how it climbs the way he is going; "beyond its low edge" (the shelf rule) is asked of either slope.
- The camera's `sight`, the jump checker (reach.ts), drawing (chamber.ts), shadows and grinding already went
  through `topAt`, and needed nothing or one line.
- NOT taught: the level editor's ramp piece (it makes ramps with no cross), and the ledge grab (a ramp tipped
  across has no edge to catch). Enemies still know nothing of any ramp.
**The downhill pipe** in the Move Garden (`DROP`, `dropFacets`, `dropHalf` in garden.ts), by the north wall east of
the strip: twelve long, falling five (0.42 in one: just over `ride.minSlope`, so the air attack is the shield
anywhere over it), a platform at its top with a ramp up to it from the west. Nine planes side by side: a floor
level across, and four facets a side, each tipped down the pipe AND up across it. He drops in from the platform,
rides it to its foot on it the whole way (no jolt at any join), and leaves it at about twelve a second (a run is
6.2); dropped in off its middle, the wall turns him back across. He must brake at its end: the room is not long
enough. `tests/ramps.ts` holds a tipped ramp to everything (he walks it six ways); `tests/garden.ts` rides the pipe.
**What this means for the level:** a long pipe is now only many of these lengths end to end, each with its own
fall, and turns are still to be worked out (a pipe that bends needs lengths at angles: ramps run along x or z
only, so a bend is a corner piece, or the pipe turns in right angles through a chamber). Not tried yet: two
lengths joined at different falls, a kicker or a rail inside a pipe, and the water in its bottom.

### The Long Drop: a minute and a half downhill, a giant ramp, and a fall into a dark arena (2026-11-16)
The level the owner asked for on 2026-11-15 (his words are under "What the owner asked for after riding it"), and
then, the next day, after riding its first version (178 long, eleven seconds):
"I'm loving this tunnel kind of it's almost like a Sonic the Hedgehog type of level ... I want to see a level built
like this that's like a minute and a half of like flying down through the sewer surfing on your Shield jumping on
ramps collecting collectibles in the air and you're like flying down doing kickflips and s*** and then at the end of
the tunnel there's this giant ramp that you fly off of and you catch this huge amount of air but then you fall like
into the darkness and you land in a room it's like a boss room where like the floor is lit for a certain amount of
radius but then it's like total darkness beyond that and the Darkness is filled with like little twinkling white
eyes but you can't actually go beyond the lit up part of the floor and there's a boss that comes out".
**All of that is built, and the boss too (the next section).** `src/levels/longdrop.ts`, id `longdrop`, a TEST ROOM
(in `TEST_ROOMS` with the garden; in none of the game's lists). **Way in:** the door in the Move Garden's west wall
(z -15.6), or `#level=longdrop&nostory`. Its way out is at the east edge of the arena's light, appears when the
Widow is beaten, and leads back.
**What it is:** 1,386 long, 656 down, dead straight south. The line worth riding takes 91 seconds, all of it on the
shield, about 14 of them in the air. It is a LIST OF SECTIONS (`COURSE` in longdrop.ts), laid end to end:
- a PIPE: a trough (slime down its middle, weeds on its walls) with a shoulder either side, falling;
- a FLAT: the same trough run level for 14, a kicker on each shoulder;
- a BED: the whole width one slope: rails to grind (`rails`), kickers (`kickers`), or a field of weeds;
- a LEDGE: the floor steps down 4 to 6 and he flies off it. Three beds with a kicker at the end of each and a
  ledge after are "the steps": jump, land, jump.
To change the level, edit `COURSE`: everything else (heights, walls, torches, crumbs, the arena's place) follows.
**Rules the builder keeps (each is tested):**
- Every falling section is at least `ride.minSlope` steep, so one thrown off can hop and ATTACK back onto the
  shield wherever he stands.
- Nothing ever stands across his way but a weed. Where a bed meets a trough, the trough is cut DOWN into the bed
  (its shoulders carry on level with the bed); where a trough meets a bed, the bed is at the trough's floor.
- After a ledge he is in the air and cannot steer: the first weeds, rails and line crumbs of the next section are
  well in (see the slalom's and the field's first gate, and the rails after the steps).
- Each section has a `lane`: the line that misses every weed (`dropLine(z)`). Crumbs on the ground are hung along
  it, so in a slalom the crumbs show the way through.
- Crumbs in the air are hung along the way each kicker really throws him: `flight()` in longdrop.ts repeats the
  game's own fall, frame for frame, and the test rides every kicker and takes every crumb. 235 crumbs: 108 on the
  line, 74 in the air, 53 over rails. None is anywhere he does not ride.
**The giant ramp** (`LIP`) is a ski jump: the last bed is its in-run (64 long, the steepest), then a short table
and a lip that turns up in two pieces. He leaves it at 12.7 going up at 9.5, rises 2.4, and falls 49 into the dark:
2.9 seconds in the air. WHY IT IS NOT A BIG CLIMBING RAMP: climbing costs him speed and his speed has a top (16), so
a lip that climbs far throws him LESS. A pop (jump) on the lip throws him much higher.
**The arena** (`ARENA`, `LevelDef.well`): a round floor 13 across its radius, 36 past the lip, at y 0. Decor `arena`
draws its floor (lit in the middle, fading to nothing at the edge) and decor `eyes` the pairs of white eyes out in
the dark, which blink. **He cannot leave the light:** `well` (collision.ts `keepInWell`, applied by the knight) keeps
him within its radius; there is nothing drawn there and nothing solid, by the owner's own asking. High above the
floor the well is a FUNNEL (wider the higher he is), so however he leaves the lip, even walking off it, he is brought
down inside the light. On the floor, jumping does not get him past the edge (`clear`).
**Built from `src/levels/pipes.ts`:** `pipeRun(kind, shape, x, z0, z1, top, bottom, shoulder, base)`, `wallAt`.
**Weeds** are a hidden solid 0.44 square and 1.1 high (`WEED`): a WALL to a rider. (Half that high, on a falling
floor, he rode up onto them like kickers.) **Rails** are thin ramps 0.3 high; `RAIL_DROP` in grind.ts lets a rail
that low be ground.
- `tests/longdrop.ts` (34 checks) rides it every way: the whole line from the head to the arena, every kicker,
  every rail, the giant ramp three ways, getting back on in every section, and the arena's edge.
- **NOT done:** turns (the view may not turn by itself); one-hit enemies to swing at while riding (his
  back-burner idea); the slime doing anything; sounds of its own (it plays the 'pump' music); branches or more
  than one route; a second look to the tunnel (it is one sewer theme for the whole length). The in-run does not
  yet LOOK like a giant ramp from above: it is a steep plain bed. And nobody has PLAYED it by hand: it was ridden
  by tests and looked at in still pictures of the running game.

### The Widow: the boss in the Long Drop's arena (asked for by the owner 2026-11-16; BUILT the same day)
His words: "there's a boss that comes out he's in the room he's in the darkness he comes out and he's like a I don't
like a giant spider or something that you got to fight. It could be one of those fights too or like it's actually so
big that he doesn't even really fit in the arena it's just like a giant spider's head connected to a body that goes
into the darkness and then you have to deal with like his front four legs and his like I don't know just spiders
have a mandibles he has mandibles and his front four legs and he'll like slam down one side of the field and sweep
across and then slam down the other side of the field and sweep across or he'll like bite down on certain parts of
the field and you have to like Dodge all his attacks."
**What was built** (`src/enemies/widow.ts` the rules, `src/enemies/widowModel.ts` the look, kind `widow`).
THIS IS THE THIRD VERSION, AND THE RULE FOR HER IS: **EVERYTHING SHE DOES IS DONE WITH A LEG OR HER HEAD, AND IS SEEN
TO BE. NO RAYS, NO BEAMS, NO POISON FLUNG ACROSS THE ROOM. AND THERE IS NO BACK OF THE ROOM TO SIT IN.**
- Version one: her legs reached right across the floor. The owner: "it's like a big pillar that comes out but it
  doesn't really look like one of the legs ... you kind of have to see the leg move ... you don't have to like make
  the spiders leg gigantic". (He also said: if a leg is not long enough, poison or an "energy slash" could cover
  the area. That was tried next, and he hated it.)
- Version two: short legs that flung poison (a green slash along a line, a crescent wave to jump, gobs). The owner:
  "Do you just have her shooting rays of light no I don't want that's ugly that's horrible no I was asking you to
  make animations with the legs like just pull the leg forward and slam it down on the ground like you're going to
  have to move it around a little bit ... it's a stationary boss but you can still slam its legs down and move it
  around and stuff you can't just like sit in the back and have the main character jump over a raise of light
  that's not fun at all".
- **Version three (now):** her legs are a spider's legs (two bones, a knuckle at the knee, a claw; reach 11.5), and
  SHE MOVES. She stays out past the edge of the light, but CRAWLS ROUND THE RIM in the dark to whichever side he is
  on (0.7 radians a second: faster than he can run round the edge), and LEANS IN over the edge (up to 3.6) to reach
  him. Wherever he stands and waits, the middle and the far edge included, she is beside him in a few seconds and a
  leg comes down on him (tested at eight places).
**VERSION THREE WAS THROWN OUT TOO (the owner, 2026-11-16, with a screenshot of the leg laid flat and swept).**
His words: "this looks goofy as hell ... I'm telling you to use the ... models arms to attack and you're like
inventing [things]. ... what is that coming out ... I guess it's supposed to be his leg cuz it's the same color but
it looks totally detached from him and if this was attached to him in some way what is he a freaking Scorpion or a
snake or something like he's supposed to be a spider the legs that are standing right there in front are the legs
that should be attacking you know the imaginary back legs that are in the shadows or whatever ... we can use our
imagination that those are holding up the spider and the legs that are in the light where you can see are the ones
being used to attack ... Don't invent imaginary limbs that don't make any sense and stick them out into the middle
of the Arena that's not an attack ... please think about what you're doing think about it don't just jump into
developing something".
**What that means (Claude's reading; a plan was put to him, NOT YET BUILT, and what is in the game is still version
three):**
- The same mistake three times: trying to make her blows reach the whole room, and inventing something to cross the
  distance each time (legs as long as the room; rays; a limb laid flat at full stretch from a hip dropped to the
  floor out in the dark, which is what his screenshot shows and why it looks like a tail with nothing joining it).
- What he asked for from the start: THE FOUR LEGS THAT STAND IN THE LIGHT IN FRONT OF HER ARE THE ONES THAT ATTACK,
  from where they stand, as a spider's legs move: lifted with the knee up and still joined to her, brought down on a
  place; raked sideways across the floor still arched. Nothing lies flat, nothing reaches past what that leg could.
- For that to read, the JOIN must be seen: her head and the roots of those legs lit at the edge of the light, not
  black. (In every version her body was black and only loose limbs showed.)
- She reaches only what her legs reach, so either the arena is made smaller (she fills one side; recommended), or
  the far side is simply out of her reach. Her crawling round the rim was also an invention he did not ask for.
- Show him still pictures of the poses for a yes or no BEFORE rebuilding the fight.

**His answer to that plan (2026-11-16): DO NOT SHRINK THE ARENA.** "This character moves too fast and jumps too high
and far for you to shrink the arena. ... it has to be a big arena ... you don't need to shrink the arena you can make
the spider bigger it never had to be that size ... you can make their two spiders so it's like one on each side of
the arena and you have to take out both of them ... have her send out baby spiders that make you have to keep moving
around ... make more baby spiders come out of the back of the Arena so they want to get her close ... there's all
sorts of different ways gameplay wise that you can fix this problem without just shrinking the game and putting the
player in a little box". (He also offered, if wanted: build the whole spider and make it a Dark Souls fight, take
out two or three legs, she limps, falls, he stabs her; or a boss like the big spider in the first dungeon of
Ocarina of Time. But: "My imagination for this battle though was how I was describing it".)
**So the direction is: THE SAME ARENA, A MUCH BIGGER SPIDER** whose own standing front legs are big enough to reach
well into it, her front LIT so the legs are seen to join her, and (next) baby spiders from the far side to keep him
moving and bring him toward her; perhaps a second spider on the other side.
**VERSION FOUR IS BUILT (2026-11-16). He was shown stills of the bigger spider and said "Good continue".**
THE RULE NOW: she is VERY big (her head 4.5 in radius, her legs reaching 21), she STAYS WHERE SHE IS at the south
edge with her face and the roots of her legs IN THE LIGHT, and IT IS THE FOUR LEGS SHE STANDS ON THAT STRIKE, from
where they stand, still arched and joined to her. Nothing lies flat, nothing is flung, she does not crawl or lean
(`crawl` and `lean` are 0; the code for them is still there and does nothing). Do not shrink the arena.
She wakes when he stands on the floor (a scream, 1.9 s). Then, in a round that repeats: slams, stabs, a bite,
slams, a bite, stabs.
- **The slam.** An outer leg lifts from where it stands; a red RING on the floor marks where it will come down,
  follows him, then holds (brighter once it has stopped following). The leg comes down on it: 2 hearts, no shield
  stops it, a jump does not get him out of it: GET OUT OF THE RING. Its foot is stuck 0.8 s (hit it).
- **The rake.** That foot is pulled free and RAKES the floor round its hip across her front, the leg still arched
  over it: 1 heart, no shield: JUMP THE FOOT, or be out of its way (under the arch of the leg, nearer her, he is
  not touched: only the foot strikes; and it cannot strike in the instant it starts). Where it stops, the foot
  rests a moment (hit it). Then the other leg does the same from the other side.
- **The stab.** An inner leg spikes down on a small RING marked on him: 1 heart; a shield stops it; or step away.
  Two, one from each side (but strike at a stuck foot while another stab is coming and that one catches him).
- **The bite**, when he is within 12 of her place: her head rears, a big RING marks the place, and it comes down on
  it: 2 hearts, no shield. Her head then LIES ON THE FLOOR for 1.6 s: the great opening.
- **Her face is armoured:** while her head is up, a sword only glances off it (`deflects`). It can be hurt only
  when it lies on the floor (after a bite, or thrown down by a perfect guard: 2.4 s).
- **Harm to her:** a blow on a foot counts HALF, on her head DOUBLE. 54 health. Angry below half: leg wind-ups a
  fifth shorter, each rake comes BACK as well, four stabs, three bites, less rest.
- **How far she reaches:** her legs cover the near two thirds of the room (tested at six places); THE FAR THIRD IS
  OUT OF HER REACH. That is on purpose for now: the owner's answer is HER YOUNG (baby spiders coming out of the dark
  at the far side to keep him moving and bring him to her), or a second spider on the other side. NOT BUILT YET:
  until then one who stays at the far edge is safe (and cannot hurt her from there).
- A rat who keeps to the rules, strikes what is on the floor and is not greedy beats her in about two minutes,
  unhurt; one who stays in her reach and does nothing about her blows dies in 12 s.
**How she is drawn:** a few big flat-faced pieces: one faceted head with a brow plate, two jaws with a pale fang
each, eight red eyes, a broad body tapering back into the dark, four legs of two bones with a knuckle at the knee
and a claw. Everything goes by one number (`SIZE`, from `legReach`). The light in
the room is a pool on the floor, but it reaches well past the floor's edge and up (`lightAt`): her face and where
her legs join her are SEEN, and she fades back into the dark behind. She is drawn in the world's own places exactly where the rules have
her (tested: a stuck foot is where the rules have it, a sweeping leg lies on the line it strikes along from hip to
tip, the ring on the floor is where each blow will land, her head is where the sword meets it).
**In the game:** her name and health show along the bottom; the level's goal is "Beat the Widow"; the WAY OUT is at
the EAST edge of the light and is not there until she is beaten (then the game's own door scene shows it). Once he
has stood on the arena's floor, that is where he comes back to if he dies: he is not sent up to ride the whole way
down again. She keeps the health she had.
**Three things that were wrong the first time she was put in the game (each has a test or a note now):**
- She never attacked: the game's turn-taking (`director.ts`) only gives a turn to a beast that has a `ready`.
- Standing straight in front of her was safe from both slams (each leg could only aim to its own side).
- He could walk out of the door past her: a level with `returnTo` had its way out open from the start. Now only if
  it has no goals (main.ts, where the level is loaded).
**NOT done, and said plainly:**
- Nobody has fought her by hand. Her numbers are first guesses, tested only by a rat that plays by rule.
- Beating her and the door appearing has NOT been seen in the running game (the tests beat her; the game's door
  scene is the same one every level uses, but it has not been watched here).
- Her sounds are her own now (below), but NOBODY HAS HEARD THEM: they are drawn by sums and checked for loudness,
  pitch and length, not by ear. Tell me which are wrong.
- The game's view looks down at him, so what shows of her in play is her legs coming down from the top of the
  picture; her head and body are mostly above it (she is far bigger now, so this matters more). What he must read is on the floor (the line, the rings, the legs and head when down), and
  that is all in view. A view that pulls back in this room would show her better; the owner's rule is that the
  view does not TURN by itself, so that is his to ask for.
- Her legs are plain bars with a knuckle and a claw: they could do with hair or markings.
- Not in the level editor. No story scene.
**Her sounds and her sliders (2026-11-16).** Five sounds of her own in `src/audio/synth.ts`, played from
`beastSounds` in main.ts by what she does: `widowScream` (waking; played a little slower when she turns angry),
`widowRear` (a leg pulled up, a leg laid out, or her head rearing: stretched to the length of the wind-up),
`widowBite`, `widowHurt` (struck; slowed when she is thrown down, quicker for her head), `widowDie`. Her feet tap as
she goes round the rim (`chitinTap`, low). She borrows `shock`, `spikeHit`, `whoosh` and `rumble`. (Four `poison*`
sounds from version two are still in synth.ts and are played by nothing: they may do for the slime.) Her numbers are
on 22 sliders in the tweaks panel under Bosses, "The Widow". Health takes effect from the next time the level is
loaded; the rest at once.

See her: `#view&who=widow&t=<seconds>&yaw=..&pitch=..&dist=46&h=3&lz=9` (`&rage=1`, `&die=<seconds>`, `&px=&pz=` for
where the rat stands). In the game: `#level=longdrop&nostory&at=2,0.5,1419,3.1416`.

### How he gets on, and the slide on his hide (the owner, 2026-11-15: this REPLACED the first way on)
His words: "Instead of having to push the sneak button I think he should go into his shield surfing if he presses the
downward attack when the slope below him is beyond a certain incline. Also there should be surfaces that are too
steep for him to walk up so he will automatically start sliding down them if he gets too far up like how Mario does
... maybe you should make an animation for him just sliding rather than board sliding, since he would basically be
like tripping and sliding down ... So that would mean he would have two ways to slide down something, one that's
probably a little slower and you have less control where he's not on his shield ... and then the other one that
would be when you jump and then push the attack button above an incline". And, sent while that was being built:
"if you're jumping above a rail and you push triangle your character should jump onto his board and grind along
the rail ... kind of snap to the rail and slide down it, as long as you have enough speed otherwise you just hop
off if you're below a certain speed threshold."
What is built (controller.ts; numbers in `TUNING.ride`, `TUNING.slide`, `TUNING.grind`; sliders in the Riding group):
- **The shield: the air attack over a slope.** In the air, with a slope straight below him at least `ride.minSlope`
  steep (0.4: two up in five) and no more than `ride.surfDrop` (10) down, ATTACK is not the dive: `beginRide`, and he
  lands riding. Over the flat, or a gentler slope, it is the dive as ever. **We chose 0.4**, not "too steep to
  stand": a slope he can walk (up to one in one) can be ridden, as the garden's run is; and the dive is still his on
  gentle ramps. It is one slider if the owner wants the mark elsewhere.
- **The slide on his hide: ground too steep to stand on** (over `MAX_WALK_SLOPE`, one in one). `slipIfTooSteep`: going
  UP it he has `slide.grip` (0.3 s) of scrabbling, slowly, and gets a little way (under two units up a two-in-one);
  any other way he is on it he is off his feet at once. `slideStep`: pulled less than a shield (10 against 15),
  slower at his fastest (9.5 against 16), steers far less (0.8 against 2.2), cannot swing, guard or roll. On ground
  he can stand on he scrapes to a stop and gets up. Jump there is a small hop with NO second jump (so a steep slope
  is never a way to climb higher than a jump does), but it is enough to press ATTACK in the air: out of a slide,
  onto the shield. A rider on his shield stays on it down such ground: only one on his feet slips.
- **A slope too steep is no longer a wall at its foot** (`moveAxis`): he steps onto it. That is what lets him "get
  too far up", and lets a rider go up one (a pipe's far wall). One so steep that a single step is more than a step
  up still stops him, and gives him his step back.
- **Drawn** (ratModel.ts, state 'slide'): `SLIDE_SIT`, on his seat feet first, arms flung out; and `SLIDE_BELLY`
  (`slideBack`), on his belly going down backwards, clawing at the slope he was climbing. He lies all the way to
  the slope. Sounds: a yelp and a thump at the slip, the ride's scrape very quiet while he slides.
- **Triangle in the air: onto a rail from his own feet.** STOW in the air, on foot, with a grind line in reach
  (`grind.reach` to the side, `grind.down` 2.6 below: a jump's height) that he is going along at `grind.minSpeed`
  (3.5; a walk is 3.2, a run 6.2) or more: the shield goes under him and he comes DOWN onto the line over a few
  frames, drawn in over it (`grind.air`, `off`, `dropSpeed`, `dropPull`, `dropIn`): not put on it at a stroke.
  Too slow: nothing happens. **It works on ledges as well as rails** (they are one thing in the code): say so to
  the owner; if he wants rails only, it is the `side === 0` lines in `findGrind`.
- The garden's boards now say 'JUMP, ATTACK' (the run) and 'JUMP, THEN STOW' (the rail).
- Tests: `tests/ride.ts` (getting on; the slide; out of a slide onto the shield), `tests/grind.ts` (from his own
  feet), `tests/garden.ts` (the run, the chute both ways, the rail from his feet). Watched in the running game at
  slow speed: the air attack over the run, the slide down the chute, the scrabble up it and the slide back.
- **Not done / to know**: the camera still loses him down the chute. Enemies know nothing of any of it. `ride.again`
  and `rideAgain` are left over from the SNEAK start and do nothing now. The Move Garden's "1 UP IN 1" ramp is the
  steepest he can stand on: anything steeper anywhere is now a slide.

### Which way up the shield lies (the owner, 2026-11-15)
"I think the wood should be the part that he's standing on and the curved part of The Shield is where he should be
sliding on ... I think he's on it upside down." And then: "we should turn the shield around as well ... it makes
more sense to have the top of the shield facing forward, just because of the way that you would want to stand on it
and if you threw it down in front of you you probably wouldn't throw it and spin it upside down". So: its painted,
curved FACE is down on the ground, its flat wooden BACK up under his feet, its TOP forward and its point behind
(`BOARD_LIES` and `BOARD_Y` in ratModel.ts; `tests/ride.ts` checks which way it faces, that its boss is just clear
of the ground, and that getting on never shows its face upward). That is the shield as he holds it tipped straight
forward onto its face, so the hop no longer turns it over on the way down: it is thrown down in front of him.
Do not turn it back, and do not put the spin back.

### Grinding is DONE (2026-11-15; asked for by the owner the same day, his words are in the next section)
Riding, **STOW** (triangle / north on a pad, H on the keyboard: it has nothing else to do while the shield is under
his feet) puts the shield across the nearest edge he is going along, and he slides along it throwing sparks.
- **What can be ground** is found in the solids, nothing is marked (`world/grind.ts`): a LEDGE is the top edge of any
  solid with a drop of `grind.drop` (0.4) or more beside it; a RAIL is any solid under half a unit across, down its
  middle. Lines run along x or z. On a ramp they slope with it: the side of a ramp is a ledge going downhill, a thin
  ramp a rail going downhill. A line carries on from one solid to the next at the same height.
- **Getting on**: within `reach` (0.85) to his side, no more than `up` (0.75) above his feet (he hops onto it) or
  `down` (2.6) below (he comes down onto it out of a jump), going `minSpeed` or more, and mostly ALONG it. Riding
  already, or (since the same day) in the air on his own feet.
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
