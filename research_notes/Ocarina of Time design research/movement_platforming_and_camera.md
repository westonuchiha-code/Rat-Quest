# Ocarina of Time: movement, platforming and camera, and the design decisions behind them

**Status of this second pass.** Read in full via the fetch helper: Iwata Asks (Nintendo UK mirror) Vol.2 Part 1 pages 2, 3, 5 and Vol.5 (Miyamoto) page 5; the ZeldaSpeedRuns movement-speeds page; the zeldaret/oot decompilation file z_player.c (raw, 531k chars, grepped locally); Wikipedia pages for OoT, Breath of the Wild, Skyward Sword, Twilight Princess, Wind Waker (nothing useful). Partly read: Vol.5 page 3 (horses, middle section only). Search snippets only (not read in full): critpoints.net, Game Developer, ZeldaSpeedRuns Twilight Princess fall-damage page. NOT reached (host blocked): iwataasks.nintendo.com, zeldadungeon.net, shmuplations/glitterberri pages were not opened in this pass (budget), so 1997-99 Japanese interviews (Famimaga 64 etc.) remain unverified. No GMTK transcript or Steve Swink text was found or read.

## Why does Link jump automatically at ledges? (developer accounts)

### Takeaway
Early in development Ocarina had a jump button. Miyamoto says he thought of auto-jump on a day off and told the team on Monday; the team (who had made Mario) were shocked to give up the jump button. He lists as benefits: scripted post-jump poses chosen from the terrain ahead (headfirst dive off high drops, which produces the weak-in-the-knees height feeling). Koizumi frames the origin as the difficulty of action in 3D (axes not aligned) and a wish to reduce action and increase puzzles in Zelda. Miyamoto's stated rule (via Osawa) was that a Zelda game "doesn't need any difficult actions". Aonuma's "control where players can go" point is NOT confirmed in this pass (only seen as a search paraphrase of a source I could not open).

### Cited Findings
- Iwata: "If you were to state the difference, it would be how The Legend of Zelda is the one you don't press a button to jump in." Koizumi: "Even when it comes to that, you had to press a button to jump when we first started making The Legend of Zelda: Ocarina of Time." Iwata: "At first, it didn't have auto jump." Koizumi: "That's right. There was no way we could take jumping out of a Super Mario Bros. game, but when we actually tried making Super Mario 64, the action hurdle was a high one. For example, if you tried to beat an enemy in front of you, the axes weren't aligned, so it was hard." — [Iwata Asks Vol.2 Pt1 p.2](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/2-The-Legend-of-Zelda-with-Chanbara-style-Action/2-The-Legend-of-Zelda-with-Chanbara-style-Action-231626.html)
- Koizumi: "As we were making Super Mario 64, we were thinking about The Legend of Zelda the whole time, and started talking about decreasing the action element in The Legend of Zelda and increasing the puzzle elements." He wrote memos for Zelda during Mario 64 and consulted them when Ocarina began — same page.
- Miyamoto (Iwata Asks Vol.5): "I thought of auto jump on one of my days off. I couldn't wait to get to work on Monday! ... I gathered everyone on Monday morning and said, 'We're going to do something called auto jump!' Everyone's response was, 'What?!' The team that had made Mario games was going to give up the jump button." Iwata: you could jump over a hole without pressing a button. Miyamoto: "An added benefit was that we could program the pose Link would assume after jumping. ... We could look at the landform ahead and determine how Link would jump." Iwata: headfirst dive in front of a high waterfall ("a Caribbean diving position"). Miyamoto: "I thought, 'If we use auto jump, then we can do all kinds of things.'" — [Iwata Asks Vol.5 p.5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-5-Mr-Shigeru-Miyamoto/5-A-Sword-Sorcery-Tale-Admired-Worldwide/5-A-Sword-Sorcery-Tale-Admired-Worldwide-224778.html)
- Miyamoto, same page: the feeling of height ("first video game that could make you feel weak in the knees when looking down", Iwata's framing) "was born once we incorporated auto jump. You go in headfirst like you're diving in the Caribbean ... but if you raised your arms high and jumped feet first ... you're just a falling person."
- Epona jumps automatically too. Osawa: "The reason the horse jumps automatically is Miyamoto-san said that a Legend of Zelda game doesn't need any difficult actions." Koizumi notes the contradiction with the "Carrot System" (whip timing; with no carrots left you cannot jump barriers) that Miyamoto also added: "isn't there a contradiction between cracking the whip at just the right timing and not requiring any difficult game operation?" — [Iwata Asks Vol.2 Pt1 p.5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/5-What-We-Couldn-t-Do-with-Ocarina-of-Time/5-What-We-Couldn-t-Do-with-Ocarina-of-Time-231818.html)
- Wikipedia: Miyamoto wanted the difficulty to be accessible, easier than Super Mario 64 (cites a secondary interview) — [Wikipedia OoT, Development](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Remake (comparison only): Wikipedia states a Nintendo Switch 2 remake was released 5 Nov 2026 with a freely controllable camera and the ability to sprint and manually jump; it cites GamesRadar+ ("remake fixes rolling spam and adds the jump button players demanded 28 years ago", 8 Sep 2026) — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time). This resolves my earlier "Switch 2 remake" flag: it is real per Wikipedia, but I have not read the GamesRadar or Nintendo statements. The VGC/Inven pieces about why auto-jump was hard to drop are still unread.
- Earlier search-only items, still UNVERIFIED: Aonuma calling auto-jump "convenient" because it controls where players can go ([Nintendo World Report](https://nintendoworldreport.com/news/26926), not opened); Famimaga 64, 26 Nov 1997, Miyamoto on "full auto jump" ([Zelda Dungeon wiki](https://www.zeldadungeon.net/wiki/Interview:Famimaga_64_November_26th_1997), host blocked); claim that Aonuma's and Miyamoto's accounts conflict ([Zeldawiki](https://zeldawiki.wiki/wiki/Auto_Jump), not opened).

### Inferences
- Stated reasons break into: (1) Miyamoto: new expressive possibilities (landform-aware poses, height sensation); (2) Koizumi: 3D action is hard to control, so shift Zelda away from action toward puzzles; (3) Miyamoto's difficulty principle. The "level designers can fence off jumps" argument is plausible but not confirmed here.
- For a team with manual jump: auto-jump buys authored animation and a simpler input surface (frees A for context verbs), and costs player-driven platforming skill, because it removes timing/arc choice.

### Gaps
- Iwata Asks pages on iwataasks.nintendo.com and 1997-99 Japanese interviews not read; Aonuma's exact words missing.

## Full traversal move set and items as movement upgrades

### Takeaway
Only partly documented from primary sources here. Decompilation and speedrun data confirm the existence of walking/running, backwalking, rolling, sidehopping, backflips, ledge climbing, iron and hover boots, Epona. No sourced account of how each move is used in level design.

### Cited Findings
- ZeldaSpeedRuns lists speeds for walking, diagonal walking, backwalking/rolling, sidehopping, constant backflipping, Iron Boots, Hover Boots, Epona (see Feel section) — [ZeldaSpeedRuns Movement Speeds](https://www.zeldaspeedruns.com/oot/generalknowledge/movement-speeds)
- Koizumi: about 500 basic motion patterns for Link; Young Link reuses Adult Link's motions via a scaled model but needed about 1.5 times the animation — [Iwata Asks Vol.2 Pt1 p.5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/5-What-We-Couldn-t-Do-with-Ocarina-of-Time/5-What-We-Couldn-t-Do-with-Ocarina-of-Time-231818.html)
- Osawa: with Z-targeting, an "invisible kusarigama" between Link and the target lets you push the stick forward to close in slowly or sideways to circle around the opponent — [Iwata Asks Vol.2 Pt1 p.3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/3-Let-s-Go-to-Toei-Kyoto-Studio-Park-/3-Let-s-Go-to-Toei-Kyoto-Studio-Park--231680.html)
- Koizumi: horse talk began during Mario 64 development. Miyamoto's only request for Epona was camera work: see the jump from below, over a chasm, against the light — Iwata Asks Vol.2 Pt1 p.5 (above).

### Inferences
- None sourced for the items-as-upgrades structure.

### Gaps
- Per-move level-design usage; hookshot/longshot, climbing, push/pull, swimming. Needs zeldawiki.wiki (not read).

## Context-sensitive A button

### Takeaway
Primary developer commentary not found. Wikipedia describes the behaviour and credits the game with popularising it; critics liked it but noted unintended actions.

### Cited Findings
- Wikipedia: context-sensitive actions let multiple tasks share one button, the on-screen display shows what will happen, and the same button pushes a box if Link stands next to it but climbs it if the stick is pushed toward it — [Wikipedia OoT, Gameplay](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Wikipedia (reception): reviewers saw the context-sensitive system as one of the strongest elements, allowing simpler control with fewer buttons, but it occasionally caused unintended actions — same page.
- Decompilation: Link's behaviour is a state machine with ordered "action handler" lists per state (talk, roll, ledge, etc.), consistent with context priority — [z_player.c](https://raw.githubusercontent.com/zeldaret/oot/master/src/overlays/actors/ovl_player_actor/z_player.c) (my reading of the structure; high confidence it exists, interpretation is mine).

### Inferences
- Removing the jump button freed a button for context verbs; no developer statement links the two.

### Gaps
- Why the action icon was designed; developer quotes.

## Camera (and comparison with Mario 64)

### Takeaway
The team tried to keep Link visible (Koizumi, Miyamoto's first-person idea abandoned), which made camera and combat hard, and Z-targeting was one of the "new devices" built to solve it. Wikipedia reports (via Miyamoto) the OoT camera is more limited and AI-controlled than Mario 64's, reflecting focus on the world rather than the character.

### Cited Findings
- Koizumi: Miyamoto initially asked "How about making it so that Link will not show up?": first-person walking, switching to a side-on view with Link when an enemy appeared. Koizumi: "I didn't try a first-person scene even once!" because he knew from Mario 64 that a constantly displayed character on a large field would be very hard — [Iwata Asks Vol.2 Pt1 p.2](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/2-The-Legend-of-Zelda-with-Chanbara-style-Action/2-The-Legend-of-Zelda-with-Chanbara-style-Action-231626.html)
- Koizumi: "I was making the model for Link, so I couldn't stand to see my Link not appear ... Link is cool, so I wanted to always be able to see him." Osawa: they made something to try first person but "decided it wasn't interesting visually and abandoned it right away." Koizumi: "Thanks to him [Iwawaki], we were able to show Link the whole time, but it got really hard in ways that would have been extremely easy in first-person view, like how to handle the camera and battles ... In order to solve those problems, we had to create a bunch of new devices, one of which was Z Targeting." — [Iwata Asks Vol.2 Pt1 p.3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/3-Let-s-Go-to-Toei-Kyoto-Studio-Park-/3-Let-s-Go-to-Toei-Kyoto-Studio-Park--231680.html)
- Osawa: "In Super Mario 64, for example, when you tried to read a sign, sometimes you would just go around it in circles." Iwata: "The axes wouldn't match up." — same page. Koizumi: they began talking about a good way to hit opponents in front of you during Mario 64, and "I thought up something when we were making the camera system for fighting enemies" — same page.
- Footnote in the interview defines Z-targeting as shifting the viewpoint to directly behind Link, and allowing distant talking and lock-on — same page.
- Wikipedia: OoT "originally ran on the same engine as Super Mario 64 but was so heavily modified that Miyamoto considers the final products different engines"; the OoT camera "is much more limited and is largely controlled by the AI"; Miyamoto said OoT's camera reflects focus on the game's world, Mario 64's on the character. Wikipedia also says Miyamoto intended first person and abandoned it once child Link was introduced. — [Wikipedia OoT, Development](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time) (secondary; original citations not checked)
- Wikipedia reception: IGN praised "flawless camera work" in cinematics; camera control made combat "second nature" though it took time to learn — same page.
- Miyamoto, camera in cut scenes: Gohma intro uses Gohma's viewpoint, then Link's fear, then Link looking up, to show where the boss is — [Iwata Asks Vol.5 Pt3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-5-Mr-Shigeru-Miyamoto/3-Everyone-Loves-Horses/3-Everyone-Loves-Horses-224665.html)
- Critpoints (search snippet only, not read): Z-targeting framed as a compromise because aiming with a behind-the-character camera is hard, and good automatic cameras are needed because players cannot operate camera and face buttons together — [Lock-On Styles in Action Games](https://critpoints.net/2015/05/24/what-is-your-ideal-form-of-lock-on-in-action-games/)

### Inferences
- OoT had no manual camera control stick (N64 had C buttons used for items), so the camera had to be automated; Z recentres behind Link. This is partly from Wikipedia and Iwata Asks' definition of Z-targeting; fixed cameras in towns/rooms were not sourced.

### Gaps
- Fixed-camera rooms, first-person look mechanics (C-up), camera-mode details, Mario 64's Lakitu camera as described by developers.

## Feel: speeds, jumps, fall damage, edges

### Takeaway
Speedrun-measured speeds are available (moderate-high confidence, community memory-viewer measurements). The decompilation gives exact fall thresholds and the analogue-stick-to-speed curve (high confidence for code; unit meanings partly inferred).

### Cited Findings
- Speeds (units per frame, at 20 FPS game rate; short acceleration delay so values are maxima; Adult Link unless stated): walking (Kokiri Boots) 9; Child walking 8.25; Kokiri Boots backwalking/rolling 13.5 (fastest normal movement as adult); Child backwalking/rolling 12.375; sidehopping 12.75; constant backflipping 9; diagonal walking 8.1 (child 7.42); Hover Boots walk 8.25, backwalk/roll 12.375 ("larger acceleration delays"); Iron Boots walk 4.5, backwalk/roll 6.75, diagonal 1.8 (slowest); Epona 12-14 cycling, sprint 20 (13.3) decaying over 5 seconds, backwalk 3; supersliding 27. The page also says internal velocity is reported as two thirds of the listed values, "most likely" because the engine derives from Mario 64's 30 FPS. — [ZeldaSpeedRuns Movement Speeds](https://www.zeldaspeedruns.com/oot/generalknowledge/movement-speeds) (measured via memory viewer by a community member; the 2/3 explanation is the author's guess)
- Roll/backwalk speed 13.5 vs walk 9 is therefore 1.5 times (calculated from that table).
- Stick-to-speed curve in the decomp: stick magnitude under 20 gives zero speed; otherwise target = (1 - cos(magnitude-20 scaled))^2 * 30 + 7, then *0.14, minus a slope penalty, clamped to a speed cap (`R_RUN_SPEED_LIMIT / 100`, REG(45)). The code comment says the cosine "happens to give a desirable curve for grounded movement speed relative to control stick magnitude." The default value of REG(45) was NOT found. — [z_player.c](https://raw.githubusercontent.com/zeldaret/oot/master/src/overlays/actors/ovl_player_actor/z_player.c) Player_CalcSpeedAndYawFromControlStick (high confidence on code, unknown default)
- Fall damage in the decomp (func_80843E64): fall distance is measured as drop in world units from the fall start height. At 400 or more, Link takes damage (-8 health units, i.e. half a heart if 16 units equals a heart; I did not verify the unit) for a fall under 800, and -16 for 800 or more, with 40 frames of invulnerability. Between 200 and 400 only rumble. Landing from a drop of more than 80 and under 800 with the stick held forward triggers an automatic roll (`Player_SetupRoll`), which prevents the heavy landing animation. — z_player.c (same URL). Damage unit interpretation: moderate.
- Ledge handling: the code uses `yDistToLedge` thresholds, e.g. 79.0 for climbing/hanging decisions, age properties of 79.4 (adult) vs 47 (child) and 70.0 vs 50.0; wall-interaction code also checks a 150 height. I could not map these to named behaviours confidently. — z_player.c (low confidence on meaning)
- Wikipedia states Miyamoto wanted the game accessible and easier than Mario 64 — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)

### Inferences
- Rolling is both the fastest ground traversal in speed terms (1.5x walk) and an auto-landing outcome, which together explain "rolling everywhere" by players; the speed ratio is sourced, the player-motive explanation is mine. A critpoints snippet also says backwalking while locked on was designed for retreat and became a movement exploit (search snippet, unverified).

### Gaps
- Jump distances/heights of the auto-jump, acceleration/turn rates (REG values), maximum ledge reach in OoT units, default run cap. Twilight Princess fall bands seen only in a search snippet and must not be used for OoT.

## Platforming in dungeons/overworld; critics

### Takeaway
Little gathered. Reception data comes from Wikipedia only.

### Cited Findings
- Wikipedia: Nintendo Power cited OoT with Super Mario 64 as two games that "blazed trails" into 3D; Houser (Rockstar) quote about borrowing from Mario or Zelda — [Wikipedia OoT, Reception/Legacy](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Koizumi: they discussed cutting action and adding puzzles — Iwata Asks Vol.2 Pt1 p.2 (above).

### Inferences
- Because Link cannot jump on demand, dungeon platforming is mostly authored (push blocks, switches, item use) rather than precision jumping; this follows from the design statements, not from a survey of dungeons.

### Gaps
- Moving platforms, timed switches, comparisons to Mario 64 difficulty, critics' frustrations.

## Mario 64 vs Ocarina: shared staff and engine

### Takeaway
Same engine lineage, shared staff, deliberate shift towards less action.

### Cited Findings
- Koizumi worked on Super Mario 64 then joined Ocarina as the third staff member; Osawa was director; Kawagoe worked on Mario 64 before — [Iwata Asks Vol.2 Pt1 p.2](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/2-The-Legend-of-Zelda-with-Chanbara-style-Action/2-The-Legend-of-Zelda-with-Chanbara-style-Action-231626.html)
- Miyamoto's initial first-person idea and its rejection: see Camera section.
- Wikipedia: Ocarina was developed concurrently with Mario 64; some of Miyamoto's ideas went to Mario 64 since it released first; engine "so heavily modified" Miyamoto considers it different — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- ZeldaSpeedRuns author says the Zelda 64 engine "was derived from the Super Mario 64 engine" (opinion; community) — [ZeldaSpeedRuns](https://www.zeldaspeedruns.com/oot/generalknowledge/movement-speeds)

### Inferences
- "Slower, more deliberate hero" is not directly sourced in this pass (no quote found).

### Gaps
- "Half Done By Mario" interview text; explicit engine comments.

## Later 3D Zeldas and other games

### Takeaway
Auto-jump persisted through Twilight Princess and Skyward Sword; Breath of the Wild replaced it with player climbing and gliding; the Switch 2 remake reportedly added a manual jump.

### Cited Findings
- Twilight Princess: Link "will automatically jump when running off of or reaching for a ledge" — [Wikipedia TP](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Twilight_Princess)
- Skyward Sword: "Jumping across gaps and scaling ledges happen automatically within context." — [Wikipedia SS](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Skyward_Sword). Stamina/dash details not read.
- Breath of the Wild: players can climb nearly anything, limited by stamina, and glide with a paraglider; the team aimed to "rethink the conventions of Zelda" — [Wikipedia BotW](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Breath_of_the_Wild). Fujibayashi: wall climbing the single change with the biggest impact; Miyamoto spent about an hour climbing trees in the prototype (search snippets from [Twinfinite](https://twinfinite.net/news/zeldas-creator-loved-climbing-trees-in-breath-of-the-wild/), [Zelda Dungeon](https://www.zeldadungeon.net/?p=126509), not opened).
- Switch 2 remake: see auto-jump section (Wikipedia).

### Inferences
- The series moved from authored traversal to systemic traversal only when the physics/stamina systems made free movement safe to design around; this is my synthesis.

### Gaps
- Wind Waker auto-jump (Wikipedia page search found nothing); BotW free-jump rationale quotes.

## Respected analyses (GMTK, Game Developer, Swink)

### Takeaway
Nothing substantive read.

### Cited Findings
- Critpoints glossary/lock-on pieces on Z-targeting as a camera compromise (snippets) — [Critpoints](https://critpoints.net/2015/05/24/what-is-your-ideal-form-of-lock-on-in-action-games/)
- Game Developer "The Foundation of a Third Person Camera" appeared in search but is not OoT-specific and was not read — [link](https://www.gamedeveloper.com/programming/the-foundation-of-a-third-person-camera)

### Inferences
- None.

### Gaps
- GMTK transcript, Swink "Game Feel" text on Zelda, any Game Developer OoT postmortem.
