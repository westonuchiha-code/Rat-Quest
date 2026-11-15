# Ocarina of Time combat and Z-targeting: how it works, how it was invented, design thinking

METHOD NOTE (second pass): Primary pages were read in full via the fetch helper: Iwata Asks OoT 3D Vol. 2 (Part 1) pages 3 and 4, Vol. 3 (Part 2) page 3, Vol. 5 (Miyamoto) page 5, the shmuplations 1999 Miyamoto interview, English Wikipedia (OoT and later Zelda pages), and the zeldaret/oot decompilation (Stalfos actor). Items tagged (search snippet) come only from WebSearch summaries and were NOT read in full. The Iwata Asks wording below is the English translation for the 3DS remake interviews (2011), recalling 1990s events, so it is hindsight, not a 1998 statement. Not reached: zeldaspeedruns attacks page (404), zeldawiki.wiki, zeldadungeon.net, goombastomp.com, the Iwata Asks "Chanbara-style Action" page (404), Aonuma/Kawagoe-specific Z-targeting quotes (none found), Game Maker's Toolkit.

## 1. How did Z-targeting come about (developer account)

### Takeaway
Z-targeting was a fix for problems created by choosing a third-person view. Koizumi (3D model/camera) and Osawa (script) went to Toei Kyoto Studio Park; Koizumi took away "one attacker at a time, the rest wait" as the answer to multi-enemy fights, Osawa took away an "invisible kusarigama" tether for circling an opponent. The target marker became Navi.

### Cited Findings
- Why third person made this necessary. Koizumi: he was modelling Link and "couldn't stand to see my Link not appear"; "Link is cool, so I wanted to always be able to see him." Osawa: a first-person prototype was tried and abandoned as "not interesting visually". Koizumi: third person made "how to handle the camera and battles" really hard, "In order to solve those problems, we had to create a bunch of new devices, one of which was Z Targeting." — [Iwata Asks OoT 3D Vol.2 p.3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/3-Let-s-Go-to-Toei-Kyoto-Studio-Park-/3-Let-s-Go-to-Toei-Kyoto-Studio-Park--231680.html)
- Wikipedia (secondary, citing other sources) says Miyamoto initially intended first person, abandoned once child Link was introduced and Miyamoto felt Link must be visible — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time). Note: this differs slightly from the Iwata Asks account (Koizumi's wish to show Link; Osawa's abandoned prototype).
- Osawa on the problem origin: in Super Mario 64, "when you tried to read a sign, sometimes you would just go around it in circles" (axes not matching). When Koizumi joined, Osawa said "Since we're going to include chanbara-style action, let's go to Toei Kyoto Studio Park!" Boss approved; Koizumi, Ikeda and Osawa went in a hot summer — same page above.
- The ninja show (Osawa): "A number of ninja were surrounding the main samurai and one lashed out with a kusarigama (sickle-and-chain). The lead samurai caught it with his left arm, the chain stretched tight, and the ninja moved in a circle around him." Osawa answered that it led to Z Targeting "I think so, if my memory serves me correctly", and denied it inspired the Hookshot. The group visibly disagreed on who remembered what. They entered the playhouse by chance to cool off — same page.
- Koizumi's own account: they discussed wanting "a good way of hitting opponents in front of you" while making Super Mario 64 but could not do it; for OoT "I thought up something when we were making the camera system for fighting enemies." At the park: "there was no way one person could fight and win when surrounded by 20 opponents... It's a sword battle, so there's a script and a certain setup. The enemies don't all attack at once. First, one attacks while the others wait. When the first guy goes down, the next one steps in." His problem: "If I just made it like normal, the enemies would swarm the player all at once, so it would be a mess." Result: "Z Targeting flags one particular opponent, telling the other enemies to wait... the moment you beat that one, you can switch the Z Targeting to the next opponent." Iwata summarised it as fighting one-on-one repeatedly — same page.
- Koizumi: the two-Stalfos fight in the Forest Temple was the scene they built for this; "We were only able to pull off that scene because of that show." Without the trip "we wouldn't have hit on the system for fighting multiple opponents." — same page.
- Osawa's invisible kusarigama: "When you use Z Targeting, I would make it so something like a kusarigama you can't see exists between Link and the opponent. If you push the analogue stick forward, you can close in slowly, and if you move it to the side, you can move to the side in a circular motion, getting around behind your opponent, seeking for an opening." Iwata: "Then do a jump attack." Osawa: "Exactly!" — same page.
- Miyamoto did not go: "Oh, they talked about that too? I didn't go though." On hearing it: "Going to the studio park to see a historical drama because they were going to make a (medieval) sword and sorcery tale..." and "in chanbara, you grip the katana with both hands, but Link holds his sword with one hand... But they hit on some good ideas there, so in the end it's alright!" He called Z Targeting one of the game's "new discoveries" alongside auto jump — [Iwata Asks OoT 3D Vol.5 p.5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-5-Mr-Shigeru-Miyamoto/5-A-Sword-Sorcery-Tale-Admired-Worldwide/5-A-Sword-Sorcery-Tale-Admired-Worldwide-224778.html)
- Nintendo's own definition (footnote): pressing Z shifts the view to directly behind Link, lets him talk with characters at a distance, and "gain an advantage in battle by locking on to enemies" — same Vol.2/Vol.5 pages.
- Navi (Koizumi): during the battle-targeting prototype "we wanted to make it easy to see which enemy you're targeting, so we made a marker. An upside-down triangle" above the target's head. "But I was a designer, so I didn't want to use such a simple marker... I came up with a fairy." N64 limits meant "a ball of light with wings"; he called it the "Fairy Navigation System" and Osawa immediately said "Let's name it Navi... because she navigates." Naming it let ideas follow: colour showing whether the target is good or bad, strategy tips, story. Navi also solved Kokiri Forest's character-count limit (show fairies, owner appears when near). Osawa said early Link was adult only, "If you think about the chanbara element, that only made sense" because a child's sword and reach would be a disadvantage — [Iwata Asks Vol.2 p.4](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/4-Where-the-Name-Navi-Came-From/4-Where-the-Name-Navi-Came-From-231748.html)
- Miyamoto, 1999 strategy-guide interview: "I think the whole system with Navi giving you advice is the biggest weakpoint of Ocarina of Time" (about hints, not targeting) — [shmuplations](https://shmuplations.com/ocarinaoftime/)
- Camera when locked on: Wikipedia caption says the view shifts to a letterbox format, an arrow marks the target, and Link can circle-strafe; the camera follows the target, Link constantly faces it, and projectiles auto-aim — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time). A Kawagoe quote about building a system so the N64 could move the camera was relayed by a search summary but I could not find it in the pages read: UNVERIFIED.

### Inferences
- The design in one line: stage-fight choreography became a rule. The lock-on is both the UI (marker) and the "permission token" for who may attack (see decomp evidence below).
- The invisible-tether idea explains why held lock plus stick = circle-strafe and approach; it is a movement scheme, not just aiming.

### Gaps
- No direct Aonuma quote on Z-targeting; Kawagoe's camera quote unverified; Iwata Asks "The Legend of Zelda with Chanbara-style Action" page returned 404, not read.

## 2. Combat mechanics

### Takeaway
Developer sources give the design intent; exact button behaviour, move properties and per-weapon numbers come from the decompilation (Stalfos damage table) and secondary sources. Much of the move list (sidestep, backflip, side hop, spin charge, crouch-stab, Deku nut stun details, Hold vs Switch targeting) remains unsourced here.

### Cited Findings
- Control scheme (Wikipedia): Link fights mainly with sword and shield plus projectiles, bombs, magic; Z-targeting makes the camera follow the target and Link face it; context-sensitive actions put several tasks on one button and the HUD shows what the button will do; the example is the button pushing a box, or climbing it if the stick points toward it. Reviewers said it allowed simpler control but "occasionally caused the player to perform unintended actions" and that the combat camera made combat "second nature" though it took time to learn — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Auto-jump (movement, but it shapes combat verbs): Miyamoto thought of it on a day off and told the team "We're going to do something called auto jump!"; "The team that had made Mario games was going to give up the jump button." Jump pose is chosen from terrain data — [Iwata Asks Vol.5 p.5](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-5-Mr-Shigeru-Miyamoto/5-A-Sword-Sorcery-Tale-Admired-Worldwide/5-A-Sword-Sorcery-Tale-Admired-Worldwide-224778.html); [shmuplations](https://shmuplations.com/ocarinaoftime/)
- Damage table for Stalfos (decomp, per-weapon numbers; Stalfos health 10): Kokiri sword 1, Master Sword 2, Giant's Knife 4; spin: Kokiri 1, Master 2, Giant 4; jump slash: Kokiri 2, Master 4, Giant 8; hammer swing 2, hammer jump 4; Deku stick 2; slingshot 1; arrow 2; fire/light arrows 2, ice arrow 4 (freezes); bombs 2; Deku nut, boomerang and hookshot do 0 but stun. A shield hit does 0 — [OoT decomp, z_en_test.c](https://raw.githubusercontent.com/zeldaret/oot/master/src/overlays/actors/ovl_En_Test/z_en_test.c) (read: lines through the Stalfos damage table). Note: values apply to this enemy; other enemies have their own tables.
- Sword damage pattern from speedrun wiki (search snippet, not read): Master Sword 2 per swing and 4 jump attack; Biggoron's/Giant's Knife 4 and 8 — [ZeldaSpeedRuns](https://www.zeldaspeedruns.com/oot/generalknowledge/items-and-power-ups) (consistent with the decomp figures above).
- Design intent on depth/difficulty (Miyamoto, 1999): "The sword combat in Ocarina didn't turn out as well as I'd hoped, unfortunately. I'm pretty bad at action games myself, so I wanted Ocarina to have a system with depth... though it didn't need to be as complex as Tekken." He also wanted the action easier than Mario 64 because players had said they couldn't finish its later stages: "About a year into the development, I realized that if we lean too heavily into the sword combat, it will definitely end up being more difficult than Mario 64, so we pulled back and eased into the simpler system we have today." — [shmuplations](https://shmuplations.com/ocarinaoftime/)
- Difficulty feedback (Miyamoto, 1999): he worried the action was "a little too difficult", but postcards said "tough, but really satisfying"; his fifth-grade daughter reached each dungeon boss with one continue. He notes skilled players mis-predict beginner difficulty, a problem "for setting the difficulty of 3D games, in particular." Later: "the action difficulty was just right." — [shmuplations](https://shmuplations.com/ocarinaoftime/)
- Jump grammar: Miyamoto says jump data is written into terrain, "a new 'grammar' for jumping," and that adding a jump button would be "one-too-many gameplay elements." — [shmuplations](https://shmuplations.com/ocarinaoftime/)
- CritPoints (search snippet, not read): Z-targeting was a compromise because aiming with a behind-the-character camera is hard, and a too-perfect lock-on makes attack animations matter less than range and startup time — [CritPoints](https://critpoints.net/2015/05/24/what-is-your-ideal-form-of-lock-on-in-action-games/)

### Inferences
- Miyamoto's "pulled back" statement is the best evidence that the shallow combat was intentional, a difficulty-for-beginners decision, not a technical limit.
- The 1, 2, 4 damage ladder with doubled jump damage rewards the Z-target-then-jump-slash loop that Osawa described.

### Gaps
- Switch vs Hold targeting, sidestep/backflip/side hop inputs and i-frames, sword combo strings, charged spin, crouch-stab, Deku nut effect on other enemies, hearts/damage Link takes: zeldaspeedruns attacks page was 404; zeldawiki not reachable. Could be taken from player.c in the decomp if needed.

## 3. Enemy and boss design around lock-on and shield

### Takeaway
The decompiled Stalfos shows the "wait your turn" idea implemented in code: enemies check whether they or another enemy are the locked-on target and change behaviour. Developer comments on enemy and boss design are about process (Aonuma specs, Takizawa design, Morita animation), not tells; per-enemy tells for most enemies remain unsourced.

### Cited Findings
- Stalfos AI (decomp): it hovers in a guard stance, then picks between walk-and-block with shield, sidestep circling, a jump back, a downward slash and a jump slash. It keeps spacing: backs off if within 80 units, advances beyond 110; if another enemy is the locked-on target it adds 150 to those distances (stays further away). A jump slash from 160-220 units is only chosen when the player has it locked on (30% chance in Idle, 10% in WalkAndBlock). Downward slash at under 110 units mostly when it is the locked-on target; otherwise it sidesteps instead. If Link swings a sword at it while Link faces it from the side/behind (yaw difference at least 0x1F40), it turns and 70% of the time jumps back, unless Link started a jump slash — [OoT decomp z_en_test.c](https://raw.githubusercontent.com/zeldaret/oot/master/src/overlays/actors/ovl_En_Test/z_en_test.c)
- Stalfos reacts to projectiles (an EnTest_ReactToProjectile check precedes most states), and ice arrows freeze it, Deku nut/boomerang/hookshot stun it — same file.
- This is the code realisation of Koizumi's "enemies wait" idea, though note the decomp shows probabilistic spacing and behaviour keyed to lock-on status, not a strict single-attacker queue. That interpretation is mine and needs checking against other actors.
- Making enemies and bosses (Iwata Asks Vol.3): Takizawa receives enemy specs from Aonuma, designs and describes functions, then takes them to Morita at SRD who programs movement; iterations took about 15 minutes each ("playing catch"). Aonuma gave only a basic character arc: how the boss appears, how it attacks, how you beat it, how it ends. Volvagia's dragon undulation reuses Morita's Star Fox 64 tailing-fighter movement code — [Iwata Asks Vol.3 p.3](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-3-Original-Development-Staff-Part-2/3-Making-the-Bosses-and-Enemies/3-Making-the-Bosses-and-Enemies-216367.html)
- Miyamoto 1999: the Megaton Hammer works on Dark Link, but "not all of those uses are perfectly planned out by us... sometimes we just run out of time to check everything"; unintended item uses are often left in as part of a trust between player and creator — [shmuplations](https://shmuplations.com/ocarinaoftime/)
- Cut idea: a Chain Chomp in Gerudo's Fortress would bind Link in chains, escape via hammer — same page.
- Critic framing (search snippet): Critical Hit cites the Stalfos' patience as a model for encounters; Goomba Stomp frames combat as waiting for openings — [Critical Hit](https://www.criticalhit.net/gaming/ocarina-of-time-remake-why-adventure-still-works/); [Goomba Stomp](https://goombastomp.com/legend-of-zelda-ocarina-of-time-combat-analysis/)

### Inferences
- A Stalfos-style enemy with a lock-aware spacing rule is a small, reusable pattern for a lock-on action game: attack choices depend on whether the player is locked on to you.
- The boss-per-item design (Gohma/slingshot, King Dodongo/bombs, Phantom Ganon/..., Morpha/hookshot, Bongo Bongo/Lens + arrows, Twinrova/mirror shield) is well known but I did not source it; do not treat as verified.

### Gaps
- Lizalfos/Dinolfos, Wolfos, Iron Knuckle, Dark Link, Gerudo thieves, Redead tells; all boss item-gating; Aonuma's developer comments on specific bosses; Edge/Eurogamer discussions of them.

## 4. Developer statements on teaching 3D swordplay, A-button/C-items, difficulty

### Takeaway
Developers framed the system as removing needless inputs (auto-jump, context-sensitive action) and keeping combat simple enough to finish. Direct quotes on explaining swordplay to players or the C-button design were not found.

### Cited Findings
- Simplification: see Miyamoto "pulled back" and daughter anecdote in section 2; auto-jump quotes in section 2.
- Navi as an onboarding/UI device: colour-coding good/bad targets and tips (Koizumi, Osawa) — [Iwata Asks Vol.2 p.4](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/4-Where-the-Name-Navi-Came-From/4-Where-the-Name-Navi-Came-From-231748.html)
- Miyamoto: the opening 30-60 minutes and the Deku Tree were the part he supervised most closely — [shmuplations](https://shmuplations.com/ocarinaoftime/)

### Gaps
- C-button item design rationale; context-sensitive A button developer quotes; Iwata Asks Vol.4 (Development Staff) and other pages not read.

## 5. Later 3D Zeldas compared

### Takeaway
Only light-weight comparisons were verified, all from Wikipedia; the specific features (MM, TP hidden skills, BotW flurry rush/perfect guard) were not confirmed from the pages searched.

### Cited Findings
- Wind Waker keeps the lock-on and adds a movable camera; reviewers praised "the ability to move the camera, perform counterattacks, and use enemy items" as enhancements over Ocarina — [Wikipedia WW](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_The_Wind_Waker)
- Twilight Princess "uses the basic control scheme introduced in Ocarina of Time, including context-sensitive action buttons and L-targeting (Z-targeting on the Wii)" — [Wikipedia TP](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Twilight_Princess)
- Skyward Sword maps sword direction to Wii Remote swings; "Enemy movements are designed to anticipate and block Link's combat movements"; shields (other than Hylian) take damage if not parried properly — [Wikipedia SS](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Skyward_Sword)
- Breath of the Wild: "players can lock onto targets for more precise attacks, while certain button combinations allow for advanced offensive and defensive moves" — [Wikipedia BotW](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Breath_of_the_Wild)
- Majora's Mask: shield blocking/reflecting, Deku Nut stun — [Wikipedia MM](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask)

### Inferences
- Reviewer language ("counterattacks," "enemy items") implies Ocarina lacked a reactive defensive layer; to be confirmed with parry/flurry-rush sources.

### Gaps
- Hidden skills, parry timing in WW, flurry rush/perfect guard details, Aonuma/Fujibayashi commentary: not found in the pages read.

## 6. Lineage to Dark Souls and Kingdom Hearts

### Takeaway
No developer statement from FromSoftware or Square Enix tying their lock-on to Z-targeting was found; the lineage is asserted by analysts.

### Cited Findings
- Wikipedia: OoT "popularized features such as a target lock system and context-sensitive buttons that have since become common elements in 3D adventure games" — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Game Developer designer spotlight (search snippet) credits Miyamoto's team with pioneering the ability to lock on to enemies — [Game Developer](https://www.gamedeveloper.com/design/how-the-creator-of-mario-designs-games-shigeru-miyamoto-game-designer-spotlight)
- CritPoints has "Comparing Zelda to Souls" (title seen, not read) — [CritPoints](https://critpoints.net/2016/05/27/comparing-zelda-to-souls/)
- Blog opinion that Z-targeting "which Zelda popularized (if not invented)" runs through Dark Souls — [Sunset Over Ithaca](https://sunsetoverithaca.com/2019/02/03/six-years-before-breath-of-the-wild-dark-souls-reinvented-the-legend-of-zelda/)
- Kingdom Hearts wiki: lock-on exists in all installments except Chain of Memories and coded — [KH Wiki](https://khwiki.com/Lock-On)
- An editorial aside on shmuplations: OoT would be unlikely to have become the "Dark Souls of its time" given Miyamoto's easing off — [shmuplations](https://shmuplations.com/ocarinaoftime/) (editor opinion, not Miyamoto)

### Gaps
- Any Miyazaki or Nomura statement; "first lock-on in 3D" is contested and unverified.

## 7. Critical analyses: strengths and limits

### Takeaway
Critics credit Z-targeting for readable one-on-one structure; later criticism calls the lock-on imprecise and shallow.

### Cited Findings
- 1998-99 reception (Wikipedia): context-sensitive controls among the strongest elements; combat camera made combat "second nature" — [Wikipedia OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)
- Game Developer's 3DS critical-reception roundup (search snippet) quotes a reviewer calling the once-revolutionary lock-on imprecise and the camera clumsy — [Game Developer](https://www.gamedeveloper.com/business/critical-reception-nintendo-s-i-zelda-ocarina-of-time-3d-i-)
- CritPoints (snippet): perfect lock-on reduces animation's importance to range/startup — [CritPoints](https://critpoints.net/2015/05/24/what-is-your-ideal-form-of-lock-on-in-action-games/)
- Creator self-assessment: Miyamoto, "didn't turn out as well as I'd hoped" — [shmuplations](https://shmuplations.com/ocarinaoftime/)

### Gaps
- Game Maker's Toolkit, Edge, Eurogamer, Polygon pieces not found or not readable.
