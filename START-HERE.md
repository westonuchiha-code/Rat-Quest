# START HERE

RATQUEST: THE KINGDOM BELOW. Rewritten 2026-11-18 as the CURRENT state, short enough to read whole. Everything that
happened before, day by day and in the owner's words, is kept unchanged in `docs/history/START-HERE-to-2026-11-18.md`
(and the older feature log and roadmap, `docs/history/HANDOFF.md` and `PLAN.md`). Search those when you need why something is the way it is.

**FABLE, BACK FROM THE SWITCH: read `docs/OPUS-WEEK.md` FIRST.** It is the handoff for everything Opus did from
2026-11-17 to 11-20 (82 commits, Test Rooms 12-19, the kit of parts, the thirteen playable characters), by risk, with
every unfixed thing in one list and the owner's standing rules. It points on to `docs/ROOMS.md`, `docs/KIT.md` and
`docs/ENEMY-IDEAS.md`.

**WHAT MATTERS NOW (the owner, 2026-11-22):** nothing here is a finished level. Every room is a test room, there to
get the feel of a kind of area right so real levels can be built later. The work is, in order: area feel, then enemies
and hazards, then the knight's movement and animation. Read BACKLOG.md, "WHERE THE TIME GOES", and docs/STATUS.md before
choosing what to do. Do not polish placeholders.

**HOW THE WORLD IS PUT TOGETHER (the owner approved this, 2026-11-25; `docs/RESEARCH-INSPIRATIONS.md`):** separate
biomes behind doors off a hub, as Mario 64 has them; and EACH BIOME BUILT INSIDE ITSELF THE DARK SOULS WAY: one
connected place that loops back to its own entrance and lanterns through shortcuts opened from the far side. The plan
he approved with it, in order: shortcuts that open from the far side; creatures placed as puzzles; teach, then test,
then twist; jump height that grows with run speed; a sharper cut on a short hop; seeing where you will go; one at a
time while locked on; sidehops while locked on. NOT to take: an auto-jump, a stamina bar, taking away the ledge
forgiveness, hazards he cannot learn of first. The rules for building a room are in `docs/KIT.md`, "BUILDING A ROOM".

**BEFORE ANY BUILD IS SENT: the smoke check** (`npm run smoke`, `scripts/smoke.mjs`; `bash scripts/deliver.sh` runs it
itself and stops if it fails). It opens the built game in a headless browser, presses the pad and reads where he is:
the knight must walk, jump and swing, a played character must move, no page may throw. `npm run test:all` does NOT
run main.ts; this does. (For two days in November every build sent had a knight who could not move.) After any change
to `src/main.ts`, run it. `npm run smoke -- --rooms` also opens every room and moves him in each (a few minutes).

**Read in this order:** `docs/OPUS-WEEK.md`; this file; then `BACKLOG.md` (what is left, hardest first: Part A is
Fable's, Part B Opus's, every Opus commit starts `[opus]` so Fable can review it); then `PLAYTEST.md` (what waits on
the owner's own play).

## THE GAME IS: A TITLE SCREEN, AN INTRO CUTSCENE, AND ONE EMPTY ROOM HE WAKES UP IN (the owner, 2026-11-27). READ THE TOP OF `docs/GAME.md`

Nothing else is in the game until he puts it in a level. Every other room is a test room in the Hall. He decides
what goes into the game's levels: describe-and-place with him, or he builds them in the editor.

## THERE ARE TWO THINGS NOW: THE GAME AND THE HALL (the owner, 2026-11-25). READ `docs/GAME.md`

"take everything that we currently have and incorporate it into the Hub room, The Hub room is now going to be our
main test area ... then I would like you to start a second thing that is just going to be the actual game and we're
going to build it from front to back." THE GAME is NEW GAME on the title: its areas are `GAME_ROOMS`
(`src/levels/levels.ts`), the first is Flotsam (`src/levels/flotsam.ts`), and a new game's knight has a broken sword
and no shield. THE HALL is TEST HALL on the title, with its own save file. His words, the plan and the state of it:
`docs/GAME.md`.

## PLAYTEST SCREENSHOTS FROM HIS TV: branch `xmb-playtest` (2026-11-27)

He plays the no-pad build on his TV from his PC launcher (it pulls the default branch, builds
`dist-single/ratquest-nopad.html` with vite build and make-single, and SKIPS `scripts/assets/pack.mjs`, so keep
`src/assets/dropped.ts` committed whenever assets change). Pressing Home there sends a screenshot to the orphan branch
`xmb-playtest` (never code, never merged): `screenshots/<YYYY-MM-DD_HH-MM-SS>.png` (3840x2160) and
`screenshots/INDEX.md` (one line a shot: time, build sha, that commit's message, file). When he mentions a playtest
screenshot: `git fetch origin xmb-playtest`, `git show origin/xmb-playtest:screenshots/INDEX.md`, then
`git show origin/xmb-playtest:screenshots/<file>.png > <scratch>/shot.png` and look at it.

## THREE BUILDS (the owner, 2026-11-27)

"the nopad version becomes the one we used for testing just with a real controller on the TV and you sort of in the
background keep us separate version of the game that doesn't have any of the testing stuff in it and that's the
version eventually we will ship as the final version." So: `ratquest.html` (on-screen pad) and `ratquest-nopad.html`
(controller, on his TV) are TESTING builds, with TEST HALL, LEVEL EDITOR and WORKSHOP on the title and the tools in
the pause menu. `ratquest-final.html` (`vite build --mode final`, `VITE_FINAL`) is THE FINAL BUILD: the game only.
`scripts/deliver.sh` makes all three; send the first two, and the final only when he asks. His PC launcher pulls the
default branch, runs `bash scripts/deliver.sh deliver` and opens `dist-single/ratquest-nopad.html`: keep that name,
and keep the script working on a fresh clone after `npm ci`.

## The project
A PS1-style 3D action platformer: a rat knight with a sword and a shield. TypeScript (strict: no unused locals or
parameters), Three.js 0.187, Vite 8, no other game library. The owner tests on a PHONE with single-file HTML builds
opened in the Claude app; the real targets are keyboard and mouse, controllers, and Steam (`steam/`, Steam Deck too).
**Since 2026-11-17 it is a set of numbered TEST ROOMS off one hallway, the Hall** (the old hub, the Club, and four
worlds of Golden Wedges are still in the code and still work, but they are no longer "the game").

## THE VISION CHANGED (the owner, 2026-11-17). READ THIS BEFORE ANYTHING ELSE ABOUT LEVELS

**His words** (spoken, so the punctuation is his dictation's; nothing is left out that says what he wants):

> "At the beginning of this project I was thinking of a Mario 64 Style game or a Zelda Style game where you're going
> from room to room and you have a big sort of normal space you can run around or whatever but **the vision is slowly
> changing.** So right now **I want all the levels in the game to be labeled as test rooms and we're basically going
> to use them all as playgrounds** just like we are currently doing with the dream world the wacky Pomo dream world.
> We're going to make each different space feel unique. So **each current level we have right now is going to be a
> representation of I guess a level genre in the game.** None of them are complete yet. **Nothing is officially part
> of a story or anything**, all of the assets, little cut scenes and videos that we have, all of that kind of stuff,
> **even things like fonts may change in the future so they all need to be well organized, kept track of and easily
> replaceable.**"

> "I also want to create **one big Hub world**, it should be pretty simple, it'll just be **a long hallway where NPCs
> are all hanging out kind of like Dizzy Dave's room already is, except this one's going to be much longer and it's
> going to have a door to each different test room.** Each test room instead of being labeled how they are now after
> whatever name we came up with **they will just be labeled test room 1, Test Room 2, test room 3, test room 4 and we
> can come up with nicknames for them in the future. The doors will be labeled after their sort of like biome type, as
> placeholder names** so door one could be wacky Pomo dream world, then door two could be Mushroom cave, door three
> could be the sewers, door four could be the ice world we were working on, etc. Anything that doesn't have a good
> nickname title yet we can just keep it the number for now and we'll come up with the name later when we're testing
> that specific level biome out. So **this hallway will have all the NPCs in the game, if we come up with new ones
> they will join the crowd in the hallway**, then we will have a door for each different world like I just discussed,
> **I would also like doors to specific boss fights we might want to work out** so like the spider boss fight should
> have a room that we can use to test it out, the Grimsqueak fight should have its own room that we can work on, and
> atmosphere, at this point we can tune the atmosphere while we tune the fight, I think that's a better workflow
> anyways. **I also want each different enemy type to have a room where it spawns that enemy one at a time so you can
> practice fighting them, maybe those rooms can even have buttons on the floor that spawn the enemy so you can spawn a
> few of them at a time by jumping on the button** or something."

> "And **certain physics should be kept separate.** So right now we're building the wacky Pomo skateboard type dream
> world thing. The shield shouldn't work like that [elsewhere], and the surfing part, like **you'll still be able to
> surf on your shield outside the wacky Pomo world but you shouldn't be able to like lean forward and give yourself
> momentum and that kind of stuff**, like the dream world is supposed to be fantastical, it's supposed to feel
> floatier and more high velocity and hyperactive and different than the normal world, so when you're playing the game
> in the normal levels you want to have different physics. So along with separating the test room biomes, **we also
> want to keep track of how the physics act in each biome**, or sort of whatever we end up calling it, I'm just going
> to keep calling them biomes."

**What each kind of level is to FEEL like (his examples; the numbers of the levels are only his for-instances):**
 - **The sewers: Dark Souls.** "You're blocking, you're parrying, you're having more difficult fights, you're moving
   slower through the level."
 - **A platform level: a 3D Mario.** "A lot of wall jumping and double jumping and the enemies that you fight you can
   kind of just ground pound your way out of because they're weaker enemies."
 - **A railway: Sonic Adventure.** "A lot of grinding ... you're grinding down the railway on your shield and you're
   smacking bats out of the air with your sword while you're grinding down the rail."
 - **The wacky Pomo dream: Tony Hawk's Pro Skater mixed with everything else.** He gets there "after you get knocked
   out by a bad guy or you eat a weird mushroom or however we end up getting them there". "Everything there is
   fantastical and crazy and weird colors and his scarf is going crazy and **he can jump higher and move faster and
   maybe we'll give him a triple jump** and he can like skate around". "You might fight some of the same enemies in
   the wacky Pomo world that you fight in the sewers but in the wacky world they're not as scary because they have some
   kind of crazy skin texture and they look funny and even though they fight the same **you're kind of way floatier
   and stronger in this world so you almost feel like a superhero fighting them.**"
 - **Then he wakes:** "things will start feeling more like Dark Souls again or like a Legend of Zelda Ocarina of Time
   and things will start to be a little more scary and dangerous and enemies will be a little harder and **you'll
   start to miss that feeling of superpowered, just long enough for the game to give it to you again**". "We want to
   give people a smorgasbord of different kinds of feelings this game can give them even though technically every
   single level is more or less an action hack and slash souls-like 3D platformer."
 - And: "Your work on the ramp is looking good."

**WHAT FOLLOWS FROM IT (rules for whoever works here next):**
 1. **Every level is a TEST ROOM, a playground for one kind of play.** None is finished, none is part of a story.
    They are named "Test Room N"; their old names are kept only as notes (`was` in `src/levels/testRooms.ts`).
 2. **THE HALL (`hall`, `src/levels/hall.ts`) is the hub**: a long hallway, every NPC in the game standing about in
    it, a door to every test room, to each boss fight, and to a practice room for each kind of enemy. **A new NPC
    joins the crowd in the Hall. A new room gets a door in the Hall.** Both are done in ONE list:
    `src/levels/testRooms.ts`.
 3. **A door's sign is its BIOME, a placeholder** ("WACKY POMO DREAM", "THE SEWERS"); a room with no good nickname
    yet shows only its number.
 4. **PHYSICS ARE PER BIOME, and written down in one table: `src/data/feel.ts`.** The dream's tuck (lean forward for
    speed), its speed for tricks and its air tricks are the DREAM'S. He can still ride his shield elsewhere, without
    them. Anything new that changes how he moves goes in that table, per biome, never as a global change.
 5. **Everything may be replaced: models, textures, sounds, music, cutscenes, fonts, names.** Keep each in one named
    place, and keep the list of them current. **THE LIST IS `ASSETS.md`, and it is WRITTEN BY A SCRIPT from the
    game's own lists: `npm run assets`. Run it whenever something is added, renamed or removed** (a level, a
    creature, a sound, a tune, a scene, a texture, a font); `tests/assets.ts` fails until it is. Do not edit
    `ASSETS.md` by hand: change what it says in `scripts/assets/inventory.ts`.
    **FONTS ARE NAMED IN ONE FILE, `src/ui/fonts.ts`**, and nowhere else (the same test fails if one is). CSS reads
    them as `var(--rq-font-game)` and the like; a canvas reads `FONTS.game`.
    **The scripts that make stills and films are in `scripts/film/`** (they used to live only in a session's scratch
    folder). The films themselves are not kept in the project.
    **DROP-IN FILES (`assets/`, built 2026-11-17 after his "3").** A picture, a sound or a song replaces the game's
    own with NO code edited: put it in `assets/textures/`, `assets/sounds/` or `assets/music/`, NAMED for what it
    replaces (a texture's name; a sound effect's name; for music a ROOM'S ID, a KIND of music, or a jingle), and run
    `npm run assets` (`scripts/deliver.sh` does it first by itself). `scripts/assets/pack.mjs` packs the files INTO
    the game (`src/assets/dropped.ts`: the game is one .html, nothing can be loaded when it runs); `src/assets/drop.ts`
    is asked first by the three places that make a texture, an effect and a tune. A file named for nothing is
    REFUSED. Rules for him: `assets/README.md`. **WHEN HE SENDS A FILE IN CHAT to use as a texture, a sound, a song, a
    font or a voice: this is where it goes** (fonts and voices since 2026-11-18). Nothing is dropped in as it stands.
    **Not this way yet:** a model, a cutscene.
 6. The Club, the wedges, the worlds' doors and their prices are still in the code and still work, but they are no
    longer "the game": do not build on them as if they were.

## NO DIFFICULTY SETTINGS: THE PLAYER GETS THE SLIDERS (the owner, 2026-11-17: a note for later, NOT to build now)

**His words:** "I don't want this game to have difficulty settings I just want the way we build it to be the way it is,
however in place of difficulty settings I want people to be able to make their own custom difficulty by giving them
sliders for a lot of the stuff we do in the game so if they want the game to be hard they can crank up the enemies'
health, they can decrease their jump height, they can change all sorts of stuff in the game that we already have like
basically on sliders anyways and then the players can make their own little custom difficulty, we still want to try to
make it feel balanced but I mean we're basically giving people the ability to break the game if they want to so they
can either beat the game the way it's originally designed or they can do their own thing." And: "This is nothing you
have to implement right now."
 - **So:** never add an Easy / Normal / Hard. The game as built is THE game. The Tweaks panel (`src/core/tweaks.ts`,
   about 280 sliders) is the seed of what players will get. Keep putting every new number on a slider.
 - **When it is built (it is in BACKLOG.md, Part B):** a player's version of the panel (plain words, grouped, a way
   back to "as designed", and a mark on a save that says the numbers were changed).

## The owner's standing rules (all of them, every turn)
- **Deliver working files every turn:** `bash scripts/deliver.sh deliver`, and send TWO game files and no more
  (the owner, 2026-11-25: "I just need the stuff I need which is the notepad version the version that I'm actually
  testing with and then any screenshots or movies ... you can send me an additional one if I ask for it and the
  other ones ... you don't really need to keep updating them you could just throw them in the background as like
  old test stuff"): `ratquest.html` (the game, with the on-screen pad: what he tests with) and
  `ratquest-nopad.html` (the game, no pad: what he tests with on the TV). Both have the test Hall. The final build is
  made too, and sent only on request. The Hall is TEST HALL on the title of both. One place by itself only
  when he asks: `bash scripts/deliver.sh deliver <level id>` writes `ratquest-<id>.html` too. Films and pictures
  are still wanted every time (`deliver/` is git-ignored). Send a FILM of anything that moves (stills are not enough), made with the drives below.
- Replies in plain language: what changed, what was tested, what was NOT (say so plainly), then a short numbered
  "what's next". He picks by number or says "Continue" (the first item). **Decide and do the work; do not pad with
  questions.** When a design is contested: think, show, get a yes.
- **Don't make the game easier.** No difficulty settings, ever (see above). Never auto-equip. No pop-up banners or
  alerts unless asked. The UI is landscape-first; the on-screen pad is for testing only.
- The hero is silent (squeaks only). The story is parked: never offer to un-park it. **Never offer** a wave fight,
  Steam achievements, or the story. Keep the blocky talk-box portraits as they are.
- **What is drawn must match what is solid.** The camera must not turn by itself. A new model is not done until it is
  textured (but read "the soft characters" below before texturing anyone friendly).
- **Claude cannot hear:** say so whenever sound is delivered. **The sound of this game is hip-hop** (below).
- The Robot Voice Box SPEAKS only in the dream. A fall costs nothing in the dream or on any downhill ride (`fallFree`).
- **What waits on his own play goes in `PLAYTEST.md`, grouped, never one line per feature** (his words, 2026-11-18:
  "I'm eventually going to have to play test everything so ... you're just doubling the list"). Things he has set
  aside are listed in BACKLOG.md: do not offer them again.
- `create_environment` / `update_environment` cannot be shown on his phone: do not call them unless he asks from a computer.
- Commits end with the attribution lines the session gives. No model name anywhere in the repo. His email is private.

## Taste he has stated (keep to it)
## THE SOUND OF THIS GAME IS HIP-HOP (the owner, 2026-11-17). THIS IS THE BRIEF FOR ALL SOUND FROM HERE. Tests `tests/tunes.ts`

**His words (keep them; they are the brief):** "So I like a lot of the sound effects on the sound effects reel I think that
those could be used where appropriate. The defeat sound is okay I think we can use that for now. The jingle wedge
sound I think is just too long. The glitch music sounds great for a boss battle so definitely keep that on the back
burner for me for when we get around to the boss for the glitched out area wacky Pomo area. I don't dislike the
kingdom music I think it's good it's just I'm not sure it fits the vibe of this game. I'm telling you the vibe of this
game I want it to be **hip-hop oriented** I want it to be **boom bap rap kind of beat oriented**, I want to try to see if
we can do some like **record scratching sounds here and there not just in the music but even for certain sound
effects** I think would be really cool. You know we want things to have like a **loose sort of chillaxed hanging out
with your friends beatboxing kind of vibe not necessarily a like super overly serious vibe**. ... Think about the kind
of sound chips we're working with it's the future so we can use those sound chips in a lot of different ways ... **we
can layer stuff we can sample stuff we can mix stuff around** ... we can sample sounds off the internet ... open source
stuff ... then maybe we could run them through one of the sound chips to change the sound to fit the game more. I
think you're making a lot of stuff that sounds good but **it sounds like grand fantasy** like something that you would
get from like a Legend of Zelda or ... a Final Fantasy ... but **I'm more like down to earth gritty crunchy kind of
stuff** like I'd much rather something that you might have gotten out of **Conker's Bad Fur Day** or ... a Sega Genesis
platformer ... like a **Vectorman** ... really grindy and crunchy, maybe something like **ToeJam and Earl** kind of with
that sort of hip hop flavor."
**And of each place:** "our main space is in a **drippy dark wet sewer tunnel** ... a cistern ... pipes and cockroaches
and toads and rats, it's grungy and drippy and wet and dank and cold, then when you're in **the Foundry it's hot and
it's loud and it's clanky and it's industrial**, when you're **underground with the mushrooms it's got to breathe it
feels like a cave maybe you hear some echoes and some drips** ... bats squeaking or rocks tumbling ... maybe those
**mushrooms make a little bit of a sound to each other** ... glow bugs flapping their wings ... **the glitched out wacky
Pomo environment should take a lot of inspiration from like early 90s kids cartoons and toys ... a Nickelodeon type of
vibe and then when it starts glitching out ... Tron ... Terminator ... rogue AI digital synthesized voices ... screaming
like modem sounds** ... top all that off with boom bap you know kick kick beat kind of background hip-hop funkiness to
all of it and it could sound really f****** crunchy cool. ... what I'd like you to do is look at all those videos you
made and I'd like you to try to make a **custom tailored song for each one of those videos**."
**And then he sent a THIRD TOOL, the Robot Voice Box:** "Here's another fun tool we can use this is for approximating
voices, and it does a bunch of cool old robot voices, I'm sure you could do even more with it by like combining it
with the other tools. You're allowed to use this for additional sound effects and music if you want to. However **the
main use for this is I want it to be used for all the voices in the glitched out wacky Pomo world**, I think I want to
make that a really cool part of the game so **I want to kind of hyper focus on that area biome level variety soon.**"

**THE ROBOT VOICE SPEAKS ONLY IN THE DREAM (he said so the same day, after hearing the reel; A STANDING RULE):** "Now the
robot voice isn't going to be very good for doing spoken words in the normal levels I kind of want it to be a thing
that's **locked to the wacky Pomo levels**, like I said you can use it for sound effects but **I only want it to be used
for speech in the wacky Pomo world**."
 - **Words said by the Robot Voice Box: only in the Milky Way and whatever dream levels come after it** (its creatures'
   voices, its tunes). Nowhere else: not a character, not a sign, not a tune of another place.
 - **As a SOUND EFFECT it may be used anywhere.** What is in the game outside the dream is only that: the record that is
   scratched in the wedge jingle, in backing out of a menu and in the put-back after a fall is a Speak & Spell saying
   "fresh", played back and forth under a hand; no word is said. If he hears a word in any of them, change the record
   (`fresh()` in `scripts/chip/sfx.mjs`, `scratches.say` of `JINGLES.wedge`) to Dave's or Wren's voice.
 - **In the music it is held by the file itself**: `scripts/chip/songs.mjs` throws when read if a tune has a `say` layer
   and is not marked `dream: true` (only `cartoon` and `rogue` are). The Hollows' tune has the STUDIO's speech-chip
   voices holding "ooh" on two notes for the mushrooms: a sound, not a word, and told to him; his to throw out.
 - The people of the other levels keep the voices they have: his own recordings (`recordings/*.m4a`).

**THE RULES THAT COME OUT OF IT (for every tune from here):**
 - **Boom bap, swung, on a gritty kit, crunched** (`crunch: {bits, hold}`). A Genesis slap bass with a **RIFF** (a bar or
   two that comes round, written as a `line`), not a bass following chords about. **ONE chord for most of it.** Short
   licks and stabs, not a long tune. Scratches at the ends of phrases. **The place's own sounds, sampled out of the game
   and put on the beat.** NOT grand fantasy: no fanfares, no string-and-choir swells.
 - **KEPT ON THE BACK BURNER, BY HIS WORD:** "Star Slide (Broken)" (`glitch`) is **the glitch boss's tune**. "Three
   Machines" (`kingdom`) is good but "not sure it fits the vibe": not used.
 - **THE DREAM WORLD (the Milky Way, "the wacky Pomo world") IS WHAT HE WANTS WORKED ON NEXT, HARD**: a kids' cartoon and
   a toy box that glitches into a rogue machine; **all its voices from the Robot Voice Box.**

**WHAT WAS MADE (nothing of the music below is in the game: HE MUST HEAR IT FIRST; it is all in `deliver/sound/` and under
the films):**
 - **Nine new tunes** (`scripts/chip/songs.mjs`, after "THE VIBE"), each eight bars:
   `sewer` "Drip Tape" (the Cistern: 84, cold electric piano, the game's own DRIP on the beat with an echo);
   `forge` "Clank" (the Foundry and the Forge: 96, the game's CLANK on the backbeat, steam HISS, brass stabs);
   `cave` "Spore Breath" (the Hollows: 78, two speech-chip voices saying "ooh" to each other for the mushrooms, drips,
   a bat's squeak, pebbles, wings); `stone` "Cold Stone" (the Keep: 88, a dark piano loop, chains, a far bell);
   `teeth` "Big Teeth" (bosses: 100, the Wyrm's roar and the roach's screech in it); `cartoon` "Saturday Morning" (the
   Milky Way ride: 104, a toy tune, **a Speak & Spell saying "yeah" and "let's play", a Speak & Math saying "wow"**, and
   the scratches are of a Speak & Spell saying "fresh"); `sheep` "Counting Sheep" (the sleepers: 72, a music box, a low
   snore); `late` "After Hours" (the Club, late: 76, a lazy trumpet, Dave ticking half asleep);
   `rogue` "Does Not Compute" (the dream GLITCHING OUT, as a boom bap: the toys low, flat and crushed, saying "error",
   "I can see you", "play with me"; **a modem** calling out; broken after it is made). No film has `rogue` under it.
 - **What the music maker learnt** (`scripts/chip/make.mjs`; shared bits in `lib.mjs`): `layers` (a sampled sound on the
   grid: `src: 'src/<name>'` is one of the GAME'S OWN sounds, exported to `recordings/chip/src/*.wav`; `'sfx/<name>'`
   one made with his tools; `'gen/modem'` the modem; or `say: {chip, text, opts}` WORDS SPOKEN by the Robot Voice Box;
   with `tune`/`tunes`, `echo`, `crush`); `scratches` (`b` a baby scratch, `r` a rewind, `c` a chirp, on the grid, of a
   voice or of `say`); `crunch` (the drums through an old sampler); `crackle` (dust on the record).
 - **THE ROBOT VOICE BOX** is `recordings/tools/robot-voice-box.html`, driven headless like the other two:
   `tools.voice.say(text, chip, opts)` in `scripts/chip/lib.mjs`. **Five chips**: `sns` Speak & Spell, `snm` Speak &
   Math, `ti` TI-99/4A, `vtx` Votrax, `sp0` Intellivoice. `opts`: `{pitch, speed, tone: 'flat'|'talk'|'lively'}` for
   the first three, `{clock}` (0.6 to 1.6) for the last two. **`node scripts/chip/voices.mjs <dir>`** makes a REEL of
   voices for the dream: the five chips saying one line; five toys, bright; the same toys gone wrong (low, flat,
   crushed, stuck). **None of these voices is in the game yet.**
 - **Every film was cut again over its own tune** (`cut2.sh` in the scratch folder: frames + `<id>.wav` gone round to the
   film's length and faded): Cistern `sewer`; Foundry and the Forge `forge`; Hollows `cave`; Keep `stone`; bosses
   `teeth`; the ride `cartoon`; the sleepers `sheep`; the Club's film `bap2`; scenes 1 and 5 `bap1`, 3 and 6 `bap2`,
   2 and 7 `bap3` (the duet), 4 and 8 `late`.

**WHAT WENT INTO THE GAME (these he asked for outright):**
 - **A wedge won plays a JINGLE, and it is SHORT**: one bar (3.1 seconds, was 7.9): Genesis horns over a beat with a
   scratch in its tail. Not a fanfare. (`JINGLES.wedge`; the sparkle still sounds over it.)
 - **Defeat plays the slow piano piece** ("okay I think we can use that for now"), over the music turned right down, and
   it stops when he is up again. (His own death groan still sounds.)
   Both through `AudioEngine.jingle(id, {under})` / `stopJingle` / `jingleOn`; the sound is in `src/audio/tunes.ts`
   `JINGLES`, packed by `node scripts/chip/embed.mjs <dir> <tunes...> jingle:wedge jingle:defeat`.
 - **Six more of the reel's effects**: `block`, `splash`, `whoosh`, `swing`, `dodge`, `land` (`recordings/map.json`).
   **`whoosh` and `land` are also what creatures' lunges and thuds are made of** (played faster or slower): if a fight
   sounds wrong to him, those two are the first to take back out (delete the entry, run `scripts/make-recorded.py`).
 - **Two effects that are a RECORD SCRATCHED** (a Speak & Spell saying "fresh" under a hand): **backing out of a menu**
   (`menuBack`, a baby scratch) and **being put back after a fall into the dark** (`rewind`, a new sound: the record
   pulled back and let go).

**NOT TESTED / NOT KNOWN:** Claude cannot hear. Everything above was checked by numbers only (loudness, how much of each
tune is bass, that the scratches sweep in pitch, that the jingles decode and start in a real browser at a fall and a
defeat). Whether any of it SOUNDS like hip-hop, or good, only he can say. The first render of the new tunes was two
thirds bass by energy (his favourite, `bap2`, is a half); the bass was turned down to match.

## HIS VERDICT ON THE SOFT CHARACTERS' TEXTURES (2026-11-16): TAKEN OFF. READ THIS BEFORE TEXTURING ANYONE FRIENDLY

"okay so the mice an birds look wayaaaaaayyyyyy worse than before. same with the rat king, its like you just threw a
bunch of shit all over them."
 - TAKEN OFF AT ONCE, back to exactly what they were: the mice (Pip, Mort), the birds (Finch, Wren), Dave, the owl,
   Lord Grimsqueak. The picture `plumage` is gone; `shortFur` is back at the strength he had seen on the fox, the
   ferret and Jinx. (`npc/npc.ts` and `npc/grimsqueakModel.ts` are as they were before the second sitting.)
 - KEPT, because he did not speak against them (ask if in doubt): the ten creatures (roach, toad, ironback, mantis,
   ant, bat, hornet, glow bug, broodmother, wyrm), and from before: the stag, the turtles, the fox, the ferret, Jinx.
 - THE RULE IT LEAVES: MARKS SCATTERED OVER A SMOOTH CARTOON CHARACTER READ AS DIRT. Strokes of fur, flecks of
   feather, noise of any kind: no. What he liked on the stag was STRUCTURE THAT FOLLOWS THE FORM and says what a thing
   is made of: grooves down a wing case, plates down a belly, iron with rivets. A soft friendly character has no such
   thing on his fur or feathers; if he gets any picture at all it belongs on what he WEARS AND CARRIES (a knitted
   jumper's rows, a leather pack's stitching, a scarf's weave, a gold chain), drawn to fit that one thing.
 - WHAT HE SAID NEXT, with six pictures of old games' characters (flat colour with soft painted shading, a few
   painted folds, strands in hair; nothing gritty): "Their texture doesn't have to be intense remember we're going for
   an old school game"; and: "its hard to capture that feeling all over especially when we can cheat, and want to
   cheat when it makes the game better, but some stuff needs to be thought about carefully." So: GENTLE, and thought
   about one character at a time; not a pass over everybody.
 - A TRY-OUT WAS SHOWN HIM AS STILLS ONLY: `softPaint` and `softPaintStrong` (slow clouds of a little lighter and
   darker, nothing else), worn by nobody in the game; the viewer puts them on anything with `&soft=1` or `&soft=2`.
   Waiting on his word: A plain, B soft, C deeper, or something else.
 - AND THE WAY OF WORKING: this is a contested look now. Stills first, in the model viewer, of ONE character; his
   yes; then the rest. Nothing of the kind goes into the game unseen again. The same holds for the knight.

## How to work here
- **Setup:** `npm install` at the repo root. Chrome is `google-chrome`; `puppeteer-core` is a dev dependency.
- **Tests:** `npm run test:all` runs every suite (103 of them, about 4,050 checks) in ONE build, four at a time:
  about a minute and a half. It must end `0 fail`. `node scripts/test-all.mjs hall lifting` runs only those.
  It type-checks the game AND the tests first (`tests/tsconfig.json`; alone: `npm run typecheck:tests`): its last line
  says "types clean" or "TYPE ERRORS", and a suite thrown out part way is said there too ("STOPPED PART WAY").
  A new suite goes in the `test:sim` list in package.json (that list is what test:all runs). One suite by hand:
  `npx vite build --ssr tests/X.ts --outDir .testdist --emptyOutDir && node .testdist/X.js`. `tsc -p .` checks the
  game only; `tsc -p tests` checks the game and the tests (the build alone checks no types at all).
- **The asset list:** `npm run assets` packs the drop-in folder (`assets/`) and rewrites `ASSETS.md`. Run it whenever
  anything is added, renamed or removed; `tests/assets.ts` fails until you do. Never edit ASSETS.md by hand.
- **Deliver:** `bash scripts/deliver.sh deliver` (it runs the asset pack first). Two files: `ratquest.html` (the game, on-screen
  pad) and `ratquest-nopad.html` (the game, no pad). More arguments are level ids:
  each gets a `ratquest-<id>.html` that opens there. `ALL=1` also writes the editor and the source zip.
- **Address switches** (`#level=<id>` opens a room; ids are in `src/levels/testRooms.ts`): `&nostory`, `&god` (nothing
  hurts him), `&at=x,y,z,yaw`, `&eye=x,y,z&look=x,y,z` (a fixed camera), `&chase=dx,dy,dz`, `&film=4` (film mode: a
  frame at a time, for the film scripts), `&lockon`, `&boards=old|number|both`. Older ones are in the history file.
- **Drives that play by themselves** (`src/dev/filmDrive.ts`): `&autoride` (=pipe, =bowl, =spine; &tuck), `&autorail`,
  `&autowalk=x,z`, `&autogo=x,z,...` (&gostow=N), `&autojump`, and `&chaos=N`: he runs about at random into walls,
  jumping, swinging, rolling, and anything wrong (a NaN, inside a solid, out of the world, stuck) is written to the
  console as `CHAOS ...`. In main.ts still: `&autofight`, `&autolift`, `&carryfoe`.
  To film him by a thing, `&at=x,y,z,0&autojump` with a fixed `&eye`/`&look` is the sure way: `&autogo` runs him there,
  and its route is often blocked (by a table, a pot he stops at, a character he can talk to).
- **Films and stills:** `scripts/film/stills.mjs`, `film.mjs`, `cut.sh` (the header of each says how).

## Where things are
- `src/main.ts` (about 4,550 lines): the game loop and all the wiring. Big but linear: search it for the feature.
- **The rooms:** `src/levels/testRooms.ts` is THE LIST (`ROOMS`, `BOSS_ROOMS`, `PRACTICE_ROOMS`): a new room or a new
  door is one line there. `levels.ts` names them ("Test Room N", side areas N-B...; the old name is kept in `was`;
  `BOARDS_SAY` decides what a room's own title board says: he chose BOTH, the old name and the number).
  `hall.ts` (the Hall: its doors, its crowd, its dressing, its bar), `practice.ts` (practice rooms, spawn buttons),
  `throwables.ts` (pots and rocks by each room's way in), `wayOut.ts` (where a way out leads).
- **Physics per biome:** `src/data/feel.ts` (waking, dream, sewers, platform). Every number is in `src/data/tuning.ts`
  and almost every one has a slider in `src/core/tweaks.ts` (the Tweaks panel). New number: new slider.
- **The rat:** `src/player/controller.ts` (moves), `ratModel.ts` (poses), `trickLog.ts` (what he did in the air).
  **Combat:** `src/combat/combat.ts`, `lockon.ts`. **Lifting:** `src/world/lifting.ts`.
- **Creatures:** `src/enemies/`, a logic class (no Three.js: runs in tests) and a `*Model.ts` for each. `director.ts`
  hands out turns and, when he is locked on to one, places round him for the others (`flankWay`).
- **Characters:** `src/npc/`. **Sound:** `src/audio/` (`synth.ts` makes every effect; `speech.ts` the voices;
  `music.ts`). **Fonts:** `src/ui/fonts.ts` only. **Drop-in files:** `assets/` (textures, sounds, music, fonts,
  voices; rules in `assets/README.md`), packed by `scripts/assets/pack.mjs`, read by `src/assets/drop.ts`.
- **The level editor:** `src/levels/custom.ts` (the pieces and how they compile), `src/ui/builder.ts` (the editor).
- **Tests:** `tests/`, one file per feature. They use the REAL PlayerController and `resolveCombat`.

## Habits that caught real bugs (keep them)
- Every feature gets a test file in `tests/`, added to the `test:sim` list in package.json. Use the **real**
  PlayerController and `resolveCombat` for fights, not just the enemy class.
- Every enemy roll goes through `this.rng` (tests fix the dice). A raw `Math.random` in toad.ts once made a test fail
  about 1 run in 20. footing.ts now checks that the same dice give the same result.
- Look at it. Screenshots in the game and on the model sheet found the problems the tests missed: invisible banners,
  the bat flying above the frame, a shell that read as two bubbles, steam drawn as white squares.
- After a change, run the whole suite (`npm run test:all`) before building.

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
