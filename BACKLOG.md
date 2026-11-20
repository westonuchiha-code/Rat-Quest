# BACKLOG: what is left, hardest first (written 2026-11-17)

**Why this file:** the owner is nearly out of Fable for the week and will switch to Opus 5.5. His words: "organize all
the things we still have to do and the things we need to fix and the things we need to check on in order from hardest
to least hardest so that you can get most of the hardest stuff out of the way with fable ... everything else will be
handled by Opus and Fable can look over all of Opus's changes next week."

**How to use it.** Work from the top. Part A is for Fable while there is any left. Part B is for Opus. Part C is what
only the owner, or a hand on the controls, can settle. Part D is what Fable looks over next week. When an item is
done, move it to "Done" at the bottom with the commit; do not delete it. Read START-HERE.md first, always
("THE VISION CHANGED" is the part that governs all of this).

**What makes a thing HARD here:** it needs a design decision nobody has made; or it touches how he moves or fights
(the controller, combat, the camera), where a small change breaks something far away; or it must be measured at 60,
30 and 20 frames a second; or it is new geometry that the ride, the camera and the collision must all agree on.
**What makes a thing easy:** the pattern exists already and a test will say when it is right.

**WHERE THINGS STAND (2026-11-20, end of the Opus week).** Part A is Fable's and was not touched, but for A9's first
part. Part B has three open items, B8, B9 and B11, and each waits on him. B12 (drawing cost) is done as far as it goes
without rebuilding models. Everything Opus did, by risk, is ONE PAGE: `docs/OPUS-WEEK.md`. What only he can judge is
`PLAYTEST.md`. Done items are one line each at the bottom. NEW PARTS FOR BUILDING LEVELS (moving platforms of six
kinds, household objects, a floor piano and an echo puzzle, levers, cracked walls and floors, belts, blades, spikes,
fans, crushers, flame jets, more to come) are catalogued in `docs/KIT.md` and shown in the Workshop (Test Room 12), the Music Room (Test
Room 13), the Yard (Test Room 14), the Gauntlet (Test Room 15) and the Press (Test Room 16).
New characters for Fable (a mole and a hedgehog, two of each) are in the Green Room (Test Room 17).

---

## THE SWITCH TO OPUS (written by Fable, 2026-11-17, at 98.8% of the week's Fable)

**Where things stand.** Everything is committed and pushed on `claude/new-session-0uiaps`. The full suite passes:
3,868 checks, 101 suites, 0 failing (last full run after the flanking, commit 6b8de9b). The twelve delivered files are current.

**Opus, before you change anything:**
1. Read START-HERE.md from the top through "The owner's standing rules". The rules there are his, and all still hold.
2. Every commit's subject starts with `[opus]`. Fable reviews those next week (Part D).
3. After any change: the full suite, `npm run test:all` (one build, four at a time: about a minute and a half;
   the old loop in START-HERE took twelve), then
   `npm run assets`, then `bash scripts/deliver.sh deliver`, then send him the twelve files and a FILM of anything
   that moves. Never stop with uncommitted work.
4. Stills and films: `scripts/film/stills.mjs`, `film.mjs`, `cut.sh` (the header of each says how). Film aids on the
   address: `&autoride` (and `=pipe`, `=bowl`, `=spine`), `&autorail`, `&autofight`, `&autolift`, `&autowalk=x,z`,
   `&autojump`, `&autogo=x,z,x,z` (runs to each place and hops: presses the practice rooms' buttons), `#lockon`, `&god`, `&at=x,y,z,yaw`, `&eye=&look=`, `&chase=dx,dy,dz`.
5. Claude cannot hear: say so whenever sound is delivered.

**Do NOT, without Fable or without his asking:** change `src/player/controller.ts`, `src/combat/combat.ts` or
`src/camera/followCamera.ts` beyond what a Part B item plainly needs; weaken, skip or delete a test to get to green;
change a number in `TUNING` that he has not asked about (add a slider instead); start anything in Part A.
If a Part B item turns out to need one of those, write what you found under the item and move to the next.

**Start with:** the rest of A9 (the one Part A item handed to you: it is marked out line by line under A9, the
roach is the pattern, and tests/combat2.ts shows how to test it), then B1 (things to throw in the other rooms), then B3 (finish the lifting), B2 (teach the editor the new
pieces), B4 (tricks polish). They are the best marked out.

**What is left of Part A after today** (Fable's, next week): A2's rest (banked turns, round corners for the bowl; the launcher is DONE), A3's rest (the camera at a deck's edge and against a wall: his to judge first), A6 (model files), A7 (the
glitch), A8 (a cutscene editor), A9's second half (the locked one using its bigger moves). Done today: A1, A4, A5, A10, the
first parts of A2 and A3, the launcher, the bats on the rails, and A9's first part (the roach flanks).

**Waiting on HIM (Part C), most wanted first:** a hands-on play of this week's work. Nothing made since the Toy Box
has been played by hand: the dream's jump, lifting and throwing, the Sewers' and the platform room's numbers, the
bowl and the spine, the bats on the rails, grabbing a roach after a perfect guard, the launcher, the roaches going to his sides under lock-on.

---

## PART A. FOR FABLE FIRST (hardest at the top)

**A1. Each waking biome its own feel, starting with the Sewers (Dark Souls).**
His words: "you're blocking, you're parrying, you're having more difficult fights, you're moving slower through the
level". The table exists (`src/data/feel.ts`) and holds only the dream's differences. What is wanted is a `sewers`
feel: slower, heavier movement; fights that punish; guard and parry mattering more. HARD because it is a design of
combat feel with no numbers given, it must not make the game easier, and every creature's test assumes today's
numbers. Do it as multipliers in the table (run, recover times, his damage, creatures' damage and health), set on the
Sewers (Test Room 3 and 3B to 3E), nothing global. Then the Mario room (Test Room 8) and the Sonic room (Test Room 5)
the same way. Show him one room, in a film, before doing the rest.

**A2. More to ride in the dream: a bowl, a spine, banked turns, launchers, loops of light rail.**
He asked for a playground. Each is new geometry the ride, the lip launch (`Box.vert`), the camera and the solids must
agree on. HARD: the half pipe alone took a day of fixes (walls taken as walls, a frame-rate bug, the camera). Rules
learned: build solids through `buildChamber` in tests; test at 60, 30, 24 and 20 fps; film it with the real follow
camera; a new mark on a box must be copied in `chamber.ts`.

**A3. The camera's known weak places.**
(a) With the view on the wall's side at the top of a pipe wall, it looks down over the deck's edge and the deck
fills the bottom third. (b) Knocked back against a wall (seen in the throne room in the first seconds), it goes
overhead and shows only floor. (c) "The camera still loses him down the chute" (the Long Drop's fall). (d) The
shield-follow slider (`camera.rideFollowRate`, 0) wants his verdict, and if he likes it, tuning. HARD: every camera
change has moved something else; `tests/camera.ts` (42) must stay green.

**A4. A stun long enough to grab the roach and the toad.**
They cannot be picked up: their flinch is a third of a second. A real stun (a plunge landing near them? a perfect
guard?) is a new state in two creatures' minds and changes how they fight. HARD because of "don't make the game
easier": the stun must be earned. Then add them to `DOWN_STATES` (`src/world/lifting.ts`).

**A5. The Sonic room: the Long Drop as a railway with bats to hit while grinding.**
His words: "you're grinding down the railway on your shield and you're smacking bats out of the air with your sword
while you're grinding down the rail". The sword already swings on the shield. Wanted: bats placed along the rails at
sword height, timed to the ride; the hit not stopping him. HARD: placing against a measured ride, and creatures that
must be where a moving rider is.

**A6. Model files as creatures and props (drop-in).**
`assets/` takes pictures, sounds and songs. A model is code. To take a file means a loader (glTF) inside a one-file
game, a way to give it the PS1 material, and a mapping from the game's poses to the file's. HARD and large; do not
start it unless he asks for it by name.

**A7. The glitch: the dream going wrong.**
Recorded early and never built: rogue robot voices, modem noise, "Does Not Compute". Mostly design. The tunes
`glitch` and `rogue` exist, not in the game.

**A8. An editor for cutscenes inside the game.**
The cutscene system is data (`src/cutscene/scenes.ts`); there is no way to make one without writing code. Large.

**A9. The others flank when he is locked on to one.** FIRST PART DONE (2026-11-17), for the ROACH.
Done: the director (`src/enemies/director.ts`, `flank()`, `DIRECTOR.flanks`) hands every waiting creature a place
round him measured from the one he is locked on to (right hand, left hand, behind each shoulder, dead behind), each
place to whoever is nearest it already. `Foe.flank` carries it. The roach (`scuttler.ts`, circle mode) goes round
to its place by the short way, hurrying (`TUNING.scuttler.flankHurry`), and waits there. Turns are untouched: the
same number of attacks, never two at once (tests/combat2.ts). Film aid `&autogo=x,z,x,z` and `#lockon`.
[opus] 2026-11-17: the rest done for the scorpion, guard, mantis and ant. One helper, `flankWay()` in director.ts,
says which way round and how hard; the roach uses it too. The scorpion sidles (`SCORPION.flankHurry` 1.8), the guard
steps round with his shield on the rat, the mantis sways to its place, and the ant takes the director's place over
its mate's. Tests: tests/combat2.ts, two checks per creature (most waiting frames at his sides; turns unchanged).
LEFT OUT on purpose: the roller (it only walks forward and rolls), the ironback (it only plods where it faces) and
the brood mother (a boss, alone).
[opus] 2026-11-18, TRIED AND TAKEN OUT AGAIN: walking the roller and the ironback round to their places (turn, walk
there, turn back to him). Measured in tests/combat2.ts's three-of-a-kind fight, 40 s: the IRONBACK reached its place
(4083 of 4200 waiting frames at his sides) but made 8 to 15 attacks where it makes 52 with no lock, in every way tried
(walking only between attacks, only while it was not its turn, asking for a turn as it walked): its fight is plodding
at him and attacking, and going round costs it that. That is easier, so it is not in. The ROLLER spends little of its
time waiting (it rolls, and comes back), and its time at his sides did not change (385 against 360). Left as they were. Flying creatures (bat, hornet, firefly) are not on the ground and were not asked.
STILL NOT DONE: the locked one using its bigger moves. Not played by hand.

**A10. Stronger in the dream.**
His words: "you're kind of way floatier and stronger in this world so you almost feel like a superhero". A damage
multiplier in the dream's line of the table, applied where his sword's damage is worked out
(`src/combat/combat.ts`, `player.gear.damage`), and to a thrown thing. Small, but it is balance: Fable sets the
number and films a fight; after that it is a slider.

---

## PART B. FOR OPUS (well marked out; hardest at the top)

B1-B7 and B10 are done: one line each under Done at the bottom (their full notes are in `git log`, and in
this file's history before 2026-11-19).

**B8. The Foundry in the Forge's look.** Waiting on his yes to the Forge (Test Room 7). Then: the furnace's fire and
its pour should burn him (noted NOT DONE), and the Forge wants sounds.

**B9. Music.** Fifteen tunes are written and not in the game (ASSETS.md, part 8). Put one in only after he has
heard it and said yes. `assets/music/<room id>.mp3` is the quick way to try one in a room.

**B11. Custom difficulty by sliders (his note of 2026-11-17: NOT yet asked for; do not start it unasked).** No difficulty
settings, ever. Players get the sliders instead. When he asks: a player's version of the Tweaks panel, a way back to
"as designed", a mark on a save whose numbers were changed. His words are in START-HERE.md.

**B12. What a room asks of the graphics card.** DONE as far as it goes (2026-11-18/19): the Hall from 2,020 draw calls to
1,199, the Club 760 to 529, the Toy Box 1,703 to 617, each the same picture, proven by test (tests/rooms.ts,
stillparts.ts, gather.ts; `&nojoin`, `&nogather` to compare); the steps are in `docs/OPUS-WEEK.md`, part 2.
`window.__cost()` in a built page reports draw calls, triangles and the heaviest groups. Each frame's own work in the
test browser: a fifth less. NOT measured on his phone. TRIED AND LEFT OUT: one mesh for a room's still walls (the Long
Drop drew three times the triangles). LEFT: models built with fewer joints (his eyes wanted).

**SET ASIDE BY HIM (2026-11-18), not to be offered again unless he raises them:** what to do about old place names
in wedge hints and characters' lines; the Club's own doors asking for Golden Wedges; new lines for Madam Tawny in
the Hall; "anything you find while playing" and re-running the chaos drive as standing items.

`ASSETS.md` must be rewritten (`npm run assets`) whenever anything is added: the test will say so.

---

## PART C. WHAT ONLY HE CAN SETTLE: MOVED TO PLAYTEST.md (2026-11-18)

He: "set everything that needs me directly aside because I'm going to do my own play testing ... I don't want each
thing you want me to play test as a separate item on the list because I'm eventually going to have to play test
everything". So it is one short note, PLAYTEST.md, grouped (things Claude could not check; numbers that were guessed;
decisions only he makes), not one line per thing. Add to it only what is NEW and guessed; never one item per feature.

---

## PART D. FOR FABLE TO LOOK OVER NEXT WEEK

Every commit made by Opus: `git log --author` will not tell them apart, so **Opus: start each commit's subject with
`[opus]`**. Fable then reads `git log --grep='^\[opus\]'` and, for each: runs the full suite; reads the diff of
`src/player/controller.ts`, `src/combat/combat.ts`, `src/camera/followCamera.ts` and `src/main.ts` line by line (the
four files where a small change breaks something far away); films anything that moves; checks that no test was
weakened, skipped or deleted to get to green; checks `ASSETS.md` and the notes were kept.

---

## THE BUG SWEEPS

2026-11-17: every level opened, every Hall door walked through, all cutscenes played part-way, the editor toured:
one fault (a practice room's corner said "The Hall"; fixed). Since then, four robot runs through all 38 rooms
(PLAYTEST.md) and `tests/chaos.ts` in every test run: nothing but one mid-jump graze.

---

## Done
(Move items here, with the commit.)
- **A1 (first part): the Sewers' feel.** Run 0.88, his blows 0.67, a blow on him costs double. `TUNING.sewers`. STILL OPEN under A1: the Mario room (Test Room 8) and the Sonic room (Test Room 5); and his verdict on the numbers.
- **A10: stronger in the dream.** His blows do 1.5 there (`TUNING.dream.dealt`). His verdict wanted.
- **A2 (first part): a bowl and a spine in the Toy Box.** STILL OPEN under A2: banked turns (need a new kind of solid: ramps lie along x or z only), a launcher, loops of light rail, round corners for the bowl.
- **A4: the roach and the toad can be grabbed** after a perfect guard (the stun was there already; it is now a grab window). No film: nothing automatic can time a perfect guard.
- **A3 (part): the camera in the bowl** measured and held by a test. STILL OPEN under A3: (a) the deck edge, (b) knocked against a wall (the view goes overhead: that is how it was designed; his to judge), (c) the long fall, (d) his verdict on the follow slider.
- **A5: bats to hit while grinding** in the Long Drop (Test Room 5): flutterers beside every rail; the sword swings on a rail and reaches all round. STILL OPEN: a reward for hitting them; his verdict.
- **A1 (the rest): the platform room's feel** on Test Room 8: blows 1.34, ground pound double. His verdict wanted on the numbers.
- **A2 (more): a launcher in the Toy Box** (`LAUNCHER`: x -22..-17, z 26..30, 2 high, pointing EAST down the lane south of the half pipe). Measured: from a push-off 0.3 over its tip and 5 on; at 16, 1.0 and 14; at 24, 2.1 and 25; at 30, 3.5 and 39. It pointed south and was 3 high at first: at tucked speed he met the wall. At 30 he lands with 14 left before the east kerb: he must turn. Not filmed.
- **B1: things to throw** in every test room, side area and boss room but the Leap of Faith and the Sump Wyrm's (`levels/throwables.ts`, tests/throwables.ts).
- **B2: the editor knows** pots, rocks, tables, stools, the bar, and a floor plate that puts creatures in (a button). tests/editops.ts.
- **B3: lifting finished**: a carried creature on its back (`HELD_POSE`, the scorpion on its side), six sounds (unheard), a crate rides a moving platform, all six creatures and an iron-bound crate filmed.
- **B4: tricks**: poses and sounds for the spin and the grab. The names on screen were taken off again at his word.
- **B5: drop-in fonts and voices** (`assets/fonts`, `assets/voices`; assets/README.md). The cutting of one voice recording tried on beeps only.
- **B6: boards** say the old name and TEST ROOM N under it (`BOARDS_SAY = 'both'`, his answer).
- **B7: the Hall dressed**: banners, benches, a bar with Tawny behind it and Slink on a stool, two tables. Practice rooms: banners.
- **B10: small things**: the page's icon (a wedge of cheese); the Toy Box's walls raised so no jump leaves it.
- **Odds and ends (2026-11-18/19, his "making some new objects")**: a candle stub (it gives light), cotton reel, matchbox, wheel of cheese, sardine tin, coat button, pencil stub, die. `world/junkModels.ts`, sizes and solids `JUNK` in world/layout.ts, all in the editor. Some in the Hall and the Club. HIS WORDS (2026-11-19): "I really like the addition of all the little extra items, I think it really fills out the world." So: four more (a chess pawn, a battery, a teacup on its saucer, a teaspoon), and up to four in each of twelve main rooms and side areas, suited to the place (levels/oddments.ts; tests/oddments.ts keeps them on the floor, out of the way, and out of every fight). The glowing cave and the webs have no quiet corner and have none. Then (same day) four more: a safety pin and a paperclip for the sewers, a crayon and a marble for the dream rooms; the Toy Box, the Milky Way, the Big Dipper, the Brood Pit's way in and the shaft got some too (not the Long Drop, the Widow's pit or the dark: nowhere clear of a fight; not the villain's lair). A cotton reel's loose thread sways; a teacup steams; a candle drips (a drop of wax every nine seconds); a marble glints; a matchbox's matches rattle when he lands beside it (chamber.thump, one line in main.ts by the landing sound, with a quiet high knock unheard by Claude); a battery sparks now and then; a die tips away from a landing beside it and drops back; a marble rolls a little way off and rocks back to its place (never past a fifth of its width: it stays inside its solid). A cotton reel rocks on its rim (less than a die); a teacup rattles on its saucer and its tea slops; a spoon rocks on its bowl and taps; a sardine tin's curled lid wobbles on its key; a chess pawn rocks on its foot; a battery rolls a little across its length (metal: it tinks). thump now says WHICH kinds answered, and main.ts plays a knock (matchbox, die, marble, reel) or a tink (spoon, tin, teacup), quietly: all unheard by Claude. What an object moves itself is tagged `userData.moves` and kept out of the gathering. FOR FABLE: docs/OPUS-WEEK.md, one page on everything Opus changed, by risk.
- **Textures on plain props (2026-11-18)**: the Club's furniture, banners, torches, shelves; then pipes, chains, lamps, light posts, gauges, roots, the speaker, the dartboard. Counted by `tests/proptextures.ts` (not a test: a count). Left plain on purpose: painted faces, rings, bulbs, flowers, rugs, crystals, marks.
- **Dead code (2026-11-18/19)**: 19 unused exports and three textures nothing used (frostPipe, starfield, emberBrick) taken out. Nothing else is unused: the build refuses unused names, and every file is imported.
