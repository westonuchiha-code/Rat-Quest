# Super Mario 64 (N64, 1996): Character Movement, Controls and Camera

Research caveat for the report writer: in this session only `raw.githubusercontent.com` (the sm64 decompilation source) and the search tool were reachable. ukikipedia.net, shmuplations.com, nintendolife.com, gamedeveloper.com, Wikipedia, avclub.com and the Wurzburg CoG paper all failed DNS ("host outside allowed network domains"). So hard numbers below are first-hand from decomp source; developer statements and design analyses are only second-hand search-result summaries and are flagged as such. Units: decomp values are in game units per frame (the game runs logic at 30 fps; positions are in world units, Mario's collision height is ~160 units; angles are s16 where 0x10000 = 360 degrees, so 0x4000 = 90 degrees). Velocities are "units per frame" unless stated. The decomp is a byte-matching reconstruction of the shipped code, so it is highly reliable for the version it targets (US/JP differences exist, e.g. a JP-only check noted below).

## What is the full move set, and what is each move for?

### Takeaway
The decompiled code confirms a layered ground/air action set (walk/run, jump -> double -> triple, long jump, backflip, side flip, wall kick, ground pound, dive, slide kick, jump kick, twirl, crawl, ledge grab, ceiling hang, pole jump). Jump launch values are fixed in code, so each move has a distinct, designable height/distance/speed profile. Level-design purpose is inferred from those profiles; I found no developer statement mapping moves to level-design roles.

### Cited Findings
- Vertical launch velocity (`vel[1]`) and forward-speed change per move (units/frame, from decomp `set_mario_y_vel_based_on_fspeed` etc.). Single jump 42.0 + 0.25*forwardVel, forwardVel x0.8; double jump 52.0 + 0.25*forwardVel, forwardVel x0.8; triple jump 69.0, forwardVel x0.8; backflip 62.0 with forwardVel set to -16.0; side flip 62.0 with forwardVel 8.0 and facing set to stick direction; wall kick 62.0 with forwardVel at least 24.0; long jump 30.0 with forwardVel x1.5 capped at 48.0; slide kick 12.0 with forwardVel at least 32.0; jump kick 20.0; dive adds +15 to forward speed capped at 48; flying (wing-cap) triple jump 82.0; lava boost 84.0 — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Long jump is flagged "slow" if forward speed is 16 or less before the x1.5 multiplier — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Long jump uses a reduced gravity decrement of 2.0/frame (vs 4.0 default), same as slide kick — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Wall kick in the air sets vel[1] = 52.0 in the instant-kick path (from `act_air_hit_wall`) and flips facing by 0x8000 (180 degrees) — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c). Note this differs from the 62.0 in mario.c's table for the wall-kick-air jump; the decomp excerpts I read do not reconcile the two (one is the instant path, one the general `set_mario_y_vel`/jump setup); treat 52 vs 62 as unresolved.
- Ground pound: ~10 frames of windup where Mario rises by `20 - 2*actionTimer` per frame (if ceiling clearance), then vel[1] = -50.0 with forward speed zeroed — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Dive entry: in jump/double jump, pressing B gives a dive if forwardVel > 28.0, otherwise a jump kick; triple jump, freefall, side flip, wall kick, steep jump and flying triple jump go to dive on B with no speed check; backflip, long jump and twirl have no B-dive; Z (ground pound) has no speed requirement in any of these air actions — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Dive pitches down by 0x200 per frame, clamped to -0x2AAA (about -60 degrees) — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Crouch slide: jumping from crouch with speed > 10 within the first 30 frames of crouching triggers a long jump; B with speed >= 10 gives a slide kick, otherwise a punch — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Crawling uses `intendedMag x 0.1` target speed, capped at 10 on wall hits; "hold walking" (carrying an object) uses x0.4, heavy objects x0.1 — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Twirl (e.g. after certain spinning dives/ledge sequences in code): yaw velocity targets 0x2000 while A is held, 0x1800 otherwise; no fall damage while twirling — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Wing cap: with A held while falling, gravity is reduced (2.0 with correction) and terminal velocity is -37.5; flying actions skip gravity — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Metal cap in water: gravity 1.6, terminal velocity -16.0; metal-water jump vel 32.0 — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c), [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Ledge grab is enabled in the air actions: jump, double jump, hold jump, freefall, hold freefall, side flip, wall kick air, long jump, water jump, top-of-pole jump; NOT in steep jump or twirl. Ceiling hang is enabled only in jump and double jump — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Swimming, pole/tree climbing, punch-combo timing and the cap powers' pickup logic: not covered by the files I could read (see Gaps).

### Inferences
- Computed from the table, ignoring variable-jump cut and drag: apex height = v^2/(2*g) with g = 4/frame gives roughly 220 units (single, v~42-ish scaling with speed), ~340 (double, v=52), ~595 (triple, v=69) and ~480 (backflip/side flip/wall kick, v=62); long jump (v=30, g=2) gives ~225 but with 1.5x horizontal speed and half gravity, so it trades height for roughly 3x+ the distance of a walking jump. These are my arithmetic on decomp constants, not sourced figures (the discrete per-frame integration shifts them slightly).
- Role mapping (inference): single = default traversal; double = small extra height with some speed kept; triple = the "height + distance" reward move that requires momentum (speed > 20 gate); long jump = distance/speed; backflip and side flip = high, short-distance, direction-reversing recovery and vertical-gap moves; wall kick = vertical chaining in shafts; ground pound = precise landing/enemy-breaking/object trigger; dive = committed forward burst, slide recovery; slide kick = speed maintenance on flat ground.

### Gaps
- No decomp excerpt for swim, pole/tree climbing, punch/kick combo timings, or cap power activation was read; no wiki access (ukikipedia, MarioWiki) to cover them.
- Reconcile wall-kick 52 vs 62 vertical velocity.

## Momentum, acceleration, turning, slopes, sliding; air control; windows (coyote time, wall-kick/firsties, ledge grab)

### Takeaway
Ground movement is an accelerate-toward-target model with speed-dependent acceleration (strong at low speed, tapering near the cap), per-surface-class slope and friction constants, and almost no air drag. Windows are tight and frame-based, there is no coyote time in the code I read, and the notorious wall-kick "firsties" is a documented quirk of a missing return.

### Cited Findings
- Stick mapping: `mag = (stickMag/64)^2 * 64`, `intendedMag = mag/2` (mag/8 when squished); `intendedYaw = atan2s(-stickY, stickX) + camera yaw` — so stick direction is camera-relative and magnitude is squared (finer control at low deflection) — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Walking target speed = intendedMag, capped at 32 (24 on slow surfaces). Below target, speed rises each frame by `1.1 - forwardVel/43`; above target on near-flat floor (normal.y >= 0.95) it drops by 1.0 per frame; hard cap 48 — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Starting from rest, walking raises forward speed to min(intendedMag, 8.0) immediately if lower (half when holding an object), except on very slippery floors — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Turn-around/skid starts when the stick is held back (more than about 100 degrees from facing) and speed >= 16; skid deceleration is `apply_slope_decel(2.0)` x class multiplier (very slippery 0.4, slippery 1.4, default 4.0, not slippery 6.0 per frame); turn finishes at speed 8.0; wall hit while braking at speed > 16 bonks backward — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Slope acceleration (down-slope) by class: very slippery 5.3, slippery 2.7, default 1.7, not slippery 0.0. Slide acceleration: 10 / 8 / 7 / 5; slide speed loss factors 0.98 / 0.96 / 0.92 / 0.92; slide speed cap 100 — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Slope thresholds (floor-normal based, approximate angles): "slippery" check ~10 degrees (very slippery), ~20 (slippery), ~38 (default); "slope" check ~5/10/15/20 degrees; "steep" ~15/20/30/30 degrees (only when not facing downhill). Surface angle beyond steep forces Mario to slide/push off (`mario_push_off_steep_floor`: speed +-16) — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c), [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Gravity: 4.0 per frame default, terminal velocity -75.0; long jump / slide kick 2.0; shot from cannon 1.0; releasing A while rising with vel > 20 divides vertical velocity by 4 (variable jump height) — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Air drag: forward speed approaches zero by 0.35 per frame; above a threshold (32, or 48 for long jump) speed additionally drops 1.0 per frame. Air steering: `update_air_without_turn` forward += 1.5 * cos(angle diff) * (intendedMag/32) and a sideways component of 10 scaled likewise; `update_air_with_turn` yaw += 512 * sin * (intendedMag/32). Reverse-speed floor -16 — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c). Note: mario_step.c itself contains no air drag/horizontal damping; the drag lives in the airborne actions file.
- Physics resolution: air steps split velocity into four quarter steps (`intendedPos = pos + vel/4`); ground steps scale horizontal motion by floor normal.y; gravity applied once after the quarter-step loop; Mario leaves the ground when more than 100 units above floor — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c), [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Wall collision probes: air upper radius 150/height 50, lower radius 30/height 50; ground lower radius 30/height 24, upper radius 60/height 50 — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Jump chain timers: on landing, `doubleJumpTimer` is set to 5 (frames) for single-jump, freefall, double-jump and long-jump landings, 0 for triple-jump and backflip landings. Pressing A in the landing window gives a double jump from a single-jump landing, a jump from a double-jump landing that becomes a triple jump if speed > 20 (single jump otherwise), nothing from a triple-jump landing. Landing lasts 4 frames (6 for long jump) — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c), [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Wall kick: on impact `wallKickTimer = 5` frames; a kick requires A press, timer non-zero and previous action being air-hit-wall; the "instant wall kick" window is `actionTimer <= 2`. At impact with forward speed >= 38 Mario is knocked backward instead; otherwise speed is capped to -8 and he soft-bonks (the kick can still be done from the bonk) — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Firsties: the decomp notes a missing return at the end of `act_air_hit_wall` so the action effectively runs twice on the same frame; the source comment says this makes firsties last one frame instead of two — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c). (Interpretation of the comment from the tool's summary of the source; the term "firsties" is community jargon I could not confirm elsewhere.)
- Ledge grab (`check_ledge_grab`): requires vel[1] <= 0 and displacement opposing the wall; probes 60 units into the wall normal, searches for floor starting 160 above the next position; grabs only if the ledge floor is more than 100 units above the next position — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Clearance: Mario's step is blocked if floor + 160 >= ceiling (160 = standing height); squish detection in dynamic gaps 0-150 — [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c), [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)

### Inferences
- Coyote time: none of the ground/air step code I read grants grace frames after leaving a ledge (leaving ground is simply position > floor+100 / floor lost), so the game appears to have no explicit coyote time; this is an absence-of-evidence inference from partial files, not a confirmed statement.
- The 5-frame (about 0.17 s at 30 fps) landing window for double/triple jumps, 2-frame instant wall-kick window, and 5-frame wall-kick grace timer show the game combines tight chaining windows with some leniency (the 5-frame wall-kick grace and the ability to kick out of a bonk).
- Squared stick magnitude plus `1.1 - v/43` acceleration explains the "weighty but responsive" feel: instant 8-unit start, then a rise that slows as speed nears the cap (asymptotically ~47 from the formula 1.1*43 = 47.3, hence the 48 hard cap).

### Gaps
- Exact long-jump launch speed in a real setting, triple jump chaining across multiple frames beyond these timers, and measured walk/run speeds from video (the CoG 2024 paper "JumpAndRunFlow" reportedly measures Mario 64 acceleration/max speed from footage; could not fetch it).
- No access to ukikipedia/pannenkoek2012 to cross-check "firsties", coyote-like behaviors, or parallel universes.

## How moves chain; skilled vs. beginner routes

### Takeaway
The code makes speed a resource carried between actions: the triple-jump gate (speed > 20), the long jump (needs speed > 10 from crouch), the dive (needs speed > 28 from a jump), and slide kick (speed >= 10) all reward momentum, while low speed degrades gracefully to a plain jump or punch. That structure yields optional faster lines without forcing them.

### Cited Findings
- Triple jump requires forward speed > 20 on the second-jump landing; otherwise the player gets only a single jump — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Long jump from crouch requires speed > 10 within 30 frames of crouching; slide kick requires B with speed >= 10; a speed-kick dive needs stick magnitude > 48 and speed >= 29 — [mario_actions_moving.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_moving.c)
- Slide kick launches with vel 12.0 and forward speed at least 32.0 at half gravity, i.e. a speed-conserving move — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c), [mario_step.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_step.c)
- Wall kick vertical velocity is higher than a double jump and forward speed at least 24, so wall kicks chain upward — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Air speed is uncapped by the engine's own comment ("Uncapped air speed. Net positive when moving forward.") — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)

### Inferences
- A beginner can complete levels with single jumps, stomps and walking; advanced routes (triple jump, long jump, wall-kick shafts, dive-slide recovery) cut time/distance. No developer quote confirming this was intentional design was obtained.

### Gaps
- No developer or analyst source captured on intended difficulty layering or on speedrun-route examples; these require ukikipedia/speedrun wiki access.

## Developer statements on feel (analog stick, weight, animation, sound)

### Takeaway
Only second-hand summaries were reachable: the team built a very large number of animations and spent time tuning Mario's friction and weight in a test "garden", with analog stick control as the starting point. Direct quotes were not retrievable.

### Cited Findings
- Per a search-result summary of Nintendo Life / Kotaku / aggregator pages: Miyamoto had the team build as many distinct motions as possible, nearly 250 animation patterns of which 193 were used; one account says he spent months perfecting Mario's friction and weight in a "garden" built to test them. This was an unverified aggregator summary — [search summary citing nintendolife.com](https://www.nintendolife.com/news/2016/09/retro_freshly_translated_interview_with_miyamoto_delves_into_the_development_of_super_mario_64) (page itself not fetched); aggregator mirrors such as cavac.at flagged low reliability
- Per a search summary of the shmuplations 1996 strategy-guide interview, Miyamoto described the aim as smooth analog 3D stick control, and appeal as moving Mario with the stick and switching camera with a button — [shmuplations Super Mario 64 interviews](https://shmuplations.com/mario64/) (not fetched; secondary summary)
- Per a search summary, Giles Goddard said Mario's movement derived from the N64 controller's central stick and the camera went through many systems before settling — [Pixelatron NGC Goddard interview](https://pixelatron.com/blog/the-making-of-super-mario-64-full-giles-goddard-interview-ngc/) (not fetched; secondary summary)
- Per a search summary, Koizumi reportedly said thinking about the camera is game design too — [Game Developer, MIGS 2007 Koizumi](https://www.gamedeveloper.com/game-platforms/migs-2007-nintendo-s-koizumi-on-the-path-from-garden-to-i-galaxy-i-) (not fetched; secondary summary)
- Voice/sound feedback in code: distinct sounds are keyed to animation frames, e.g. triple jump sounds on frames 2, 8, 20, backflip on 2, 3, 17, side flip frame 6; the C-buttons play distinct sounds and "buzz" sounds signal disabled camera input — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c), [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)

### Inferences
- Frame-keyed sounds on each jump variant confirm audio was authored as per-move feedback (hence the escalating "wah / yah / wahoo" for the chain), consistent with Swink's "polish" idea; the vocal escalation specifically is common knowledge but I did not fetch a source.

### Gaps
- No verified direct quotes from Miyamoto, Koizumi, Goddard, Iwata Asks about weight, animation-serves-control, or voice. Shmuplations, Nintendo Life, Iwata Asks pages need to be fetched when network allows.

## Camera (Lakitu, C-buttons, modes, tight spaces, failings)

### Takeaway
The camera is a diegetic "Lakitu cameraman" with many mode functions (free/default, behind-Mario, radial, 8-direction, fixed, spiral stairs, parallel tracking, boss, C-Up first-person look). It auto-rotates around walls and uses level-authored camera modes; the player gets four C-button options. Critics note it was imperfect and divisive.

### Cited Findings
- Modes in the decomp: level-oriented (radial, outward radial, 8 directions at 45-degree steps, fixed, spiral stairs, parallel tracking, boss fight) and Mario-oriented (behind Mario, default close/free-roam, Mario camera, C-Up, cannon, slide) — [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)
- C-buttons: C-Up enters first-person look (head turn clamped about 80 degrees up / 45 down), C-Left/C-Right rotate about 90 degrees in behind-Mario mode (45 degrees in 8-direction mode), C-Down zooms out; each has its own sound, and buzzer sounds mark disabled input (slide, fixed) — [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)
- Lakitu's yaw approaches its target at 0x400 per frame; in default mode the camera can lag at most 50 units behind its goal position — [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)
- Wall handling: default camera calls `rotate_camera_around_walls()` with 0x600 yaw rate, turning about twice as fast near a wall and sharply (0x1000) when Mario is within 250 units; wall collision probe `collide_with_walls(cPos, 10, 80)`; camera held 125 units above floor; C-Up exit searches 16 sectors of 22.5 degrees for an open direction — [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)
- Zoom distances: default 800 units; Mario cam (R trigger) 350; C-Up 250; radial base 1000; boss fight 800-5000; zoom step 30/frame; fixed-camera base position and per-area `scaleToMario` factor (0.5 default, 0 in Rainbow Ride and Big Boo's Haunt, 0.3 castle lobby) — [camera.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/camera.c)
- Only the first ~100k of ~403k characters of camera.c were read; `handle_c_button_movement`, `next_lakitu_state` and the wall rotation internals were not seen.
- Search summary: AV Club describes the camera as far from perfect but its problems relatively rare given the vertical level design — [AV Club](https://www.avclub.com/super-mario-64-introduced-the-camera-as-a-friend-and-fo-1798250469) (not fetched)
- Search summary: Miyamoto told Kenji Eno that many players found the camera chaotic — [shmuplations Miyamoto x Eno](https://shmuplations.com/miyamotoxeno/) (not fetched)
- Search summary: Game Developer essay by Andreas Buehler catalogs third-person camera problems citing SM64 — [Game Developer](https://www.gamedeveloper.com/design/third-person-camera-view-in-games-a-record-of-the-most-common-problems-in-modern-games-solutions-taken-from-new-and-retro-games) (not fetched)

### Inferences
- Fixed and radial modes are applied per-area by the level author (the per-area `scaleToMario` values for BBH/RR suggest handcrafted camera behavior in difficult spaces); that levels were shaped to suit the camera is plausible but no quoted source was obtained.

### Gaps
- Developer statements about why Lakitu was chosen (only an unverified search summary from Nintendojo), level-geometry-for-camera commentary, camera failings list (clipping, wall-hugging) from critics — all need source fetches.

## Combat

### Takeaway
Only code-level combat facts were obtained: attacks are movement actions (punch, kick, dive, ground pound, slide kick, jump kick, stomp) with interaction flags; no separate combat system.

### Cited Findings
- Attack-capable moves are movement actions: jump kick (vel 20), slide kick (vel 12, speed >= 32), dive, ground pound (-50 fall speed, forward speed 0), punch from crouch slide — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c), [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Hitbox height is 100 for short-hitbox actions and 160 otherwise; invincibility flickers; health max 0x880 and heal/hurt tick 0x40 — [mario.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario.c)
- Dive and ground pound fall-damage thresholds: 1150 normal fall; ground-pound threshold 600 is commented "Never true" — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- Wall hit while diving or pounding bonks Mario (ground pound hit gives forward speed -16) — [mario_actions_airborne.c](https://raw.githubusercontent.com/n64decomp/sm64/master/src/game/mario_actions_airborne.c)
- A Game Developer piece "Analysing the AI of Super Mario 64" exists — [Game Developer](https://www.gamedeveloper.com/game-platforms/analysing-the-ai-of-super-mario-64) (found in search results only, not read)

### Gaps
- Boss design (Bowser throws, King Bob-omb, Whomp), enemy design around the move set, punch/kick combo timing, and attack speeds: no sources captured.

## Design analyses (Swink, GMTK, GDC, Game Developer)

### Takeaway
Only pointers were obtained. Swink frames game feel as real-time control of virtual objects with polish, and uses SM64 as a canonical example; a 2024 academic paper measured SM64 walk acceleration and speed from video.

### Cited Findings
- Swink defines game feel as real-time control of virtual objects in a simulated space, broken into categories including input, response and polish, using Mario 64 as an example, per a search summary — [Game Developer, "Game Feel: The Secret Ingredient"](https://www.gamedeveloper.com/game-platforms/feature-game-feel---the-secret-ingredient-) (not fetched; secondary summary)
- A 2024 CoG paper compares movement parameters of Mario 64, Banjo-Kazooie and Donkey Kong 64 measured from video (acceleration, max speed, deceleration) — [JumpAndRunFlow PDF](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-JumpAndRunFlow.pdf) (not fetched; numbers unknown)
- Search summary: Sunshine analysis argues SM64 taught players they control Mario's viewing through Lakitu — [Soundtrack Central/Sunshine analysis](https://soundtrackcentral.com/super-mario-sunshine-gc/tp7558) (not fetched)

### Gaps
- No Game Maker's Toolkit transcript found (search did not surface it), no GDC Vault talk found, Swink's actual SM64 chapter text unread.
