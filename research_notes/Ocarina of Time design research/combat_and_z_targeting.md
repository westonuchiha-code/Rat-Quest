# Ocarina of Time combat and Z-targeting: how it works, how it was invented, design thinking

NOTE ON METHOD AND LIMITS: In this session WebFetch could not resolve any host (iwataasks.nintendo.com, nintendo.co.uk, zeldawiki.wiki, zeldadungeon.net, goombastomp.com all returned getaddrinfo ENOTFOUND; they would need allowing in the session network settings). All findings below therefore come from WebSearch result summaries, not full-page reads. Quotes are as relayed by the search summaries and should be checked against the primary Iwata Asks pages before publication. Speaker attributions in transcript copies were reported as garbled, so they are flagged. Most mechanics, enemy, boss, later-game and critic questions could not be researched and are listed under Gaps.

## 1. How did Z-targeting come about (developer account)

### Takeaway
Developers (Iwata Asks, OoT 3D, Original Development Staff Part 1) say the idea began as a wish to hit enemies in front of Link during Super Mario 64, and was sharpened by a trip to Toei Kyoto Studio Park where a chanbara/ninja show showed enemies attacking one at a time while the rest wait. Navi began as the prototype's target marker; the lock-on also doubled as a camera aid.

### Cited Findings
- Developer statement: the Iwata Asks interview is the primary source; relevant pages are "Let's Go to Toei Kyoto Studio Park!" and "Where the Name Navi Came From" — [Iwata Asks Part 1 p.3](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/2/); [Nintendo mirror](https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-2-Original-Development-Staff-Part-1/3-Let-s-Go-to-Toei-Kyoto-Studio-Park-/3-Let-s-Go-to-Toei-Kyoto-Studio-Park--231680.html) (URLs seen in search results; page text not read by me).
- Koizumi (as quoted in a search summary): "With regard to Z-targeting, I believe we started talking about how we wanted a good way of hitting opponents in front of you when we were making Super Mario 64." — summary citing [Zelda Wiki Iwata Asks transcriptions](https://zelda.fandom.com/wiki/Iwata_Asks/Transcriptions) and [Zelda Dungeon wiki transcript](https://www.zeldadungeon.net/wiki/Interview:Iwata_Asks:_Ocarina_of_Time_3D_(Original_Development_Staff_-_Part_1))
- Osawa proposed the trip: "Since we're going to include chanbara-style action, let's go to Toei Kyoto Studio Park!" Miyamoto did not go but heard of what they found; Osawa was less certain of details of who noticed what ("if my memory serves me correctly") — [Siliconera](https://www.siliconera.com/z-targeting-in-the-legend-of-zelda-ocarina-of-time-was-inspired-by-ninjas/); [Iwata Asks p.3](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/2/)
- The show: a hero fighting a ring of ninja (nearly 20 opponents), one ninja lashing out with a kusarigama (sickle and chain). A quote relayed: "Watching the kusarigama show, I hit on the idea of making a kusarigama that you can't see when you use Z Targeting" (i.e. an invisible tether to the target, allowing circling). Which developer said it is UNVERIFIED: transcript copies disagree on speaker labels — [Zelda Wiki transcriptions](https://zelda.fandom.com/wiki/Iwata_Asks/Transcriptions); [Iwata Asks p.3](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/2/)
- Koizumi observed that only one ninja attacked at a time while the others waited; this became the solution for multi-enemy fights: "First, you have the other enemies wait while you fight with the first one, and the moment you beat that one, you can switch the Z-targeting to the next opponent." Z-targeting "flags one particular opponent, telling the other enemies to wait." — [Iwata Asks p.3](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/2/); [Wikipedia: Yoshiaki Koizumi](https://en.wikipedia.org/wiki/Yoshiaki_Koizumi) (secondary)
- Navi: while prototyping battle targeting they wanted it easy to see which enemy was targeted, so they made a marker; Koizumi first called it the "Fairy Navigation System", then "Let's name it Navi"; name from "navigation". Iwata remarked the name gave life to an impersonal marker — [Zelda Dungeon wiki transcript](https://www.zeldadungeon.net/wiki/Interview:Iwata_Asks:_Ocarina_of_Time_3D_(Original_Development_Staff_-_Part_1)); [Zelda Dungeon forum thread](https://www.zeldadungeon.net/forum/threads/where-navis-name-comes-from.19960/)
- Camera: Z-targeting doubles as a camera tool; the camera snaps to where Link faces so what is in front is always visible. Kawagoe said the game's construction meant they had to build a system so the N64 could move the camera (relayed paraphrase/quote, unverified wording) — [Iwata Asks p.3](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/2/) (via search summary)
- Miyamoto reportedly regarded Navi's advice as a weakness of OoT (secondary) — [Wikipedia: Navi](https://en.wikipedia.org/wiki/Navi_(The_Legend_of_Zelda))

### Inferences
- The design logic is "stage-fight choreography translated into rules": the lock-on is both the targeting UI and the permission token for which enemy is currently allowed to attack, which is why it works for a sword-and-shield lock-on in a new game.
- Aonuma's role in this origin story was not found.

### Gaps
- Aonuma and Miyamoto direct quotes on Z-targeting; exact Koizumi/Osawa attribution of the kusarigama line; full text of the camera passage. Primary pages could not be fetched.

## 2. Combat mechanics (lock-on modes, camera, moves, damage, enemy turn-taking)

### Takeaway
Not researched in depth; only the enemy-waiting rule and one critic framing were retrieved.

### Cited Findings
- Critical Hit argues locking one enemy gives combat readable structure so enemies do not overwhelm the player, and cites Stalfos patience as a model — [Critical Hit](https://www.criticalhit.net/gaming/ocarina-of-time-remake-why-adventure-still-works/) (via search summary, not read)
- Goomba Stomp frames OoT combat as back-and-forth where you "bide your time" and wait for openings — [Goomba Stomp](https://goombastomp.com/legend-of-zelda-ocarina-of-time-combat-analysis/) (via search summary, not read)
- A student-style analysis says lock-on picks the nearest enemy via vector math and keeps the camera facing the target; treat with caution — [OU Gamers journal](https://journal.ougamers.org/2026/01/27/gda-game-analysis-ocarina-of-time)
- Wikipedia: OoT introduced a target-lock system and context-sensitive buttons — [Wikipedia: OoT](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Ocarina_of_Time)

### Inferences
- Context-sensitive A plus Z-held strafing gives few inputs for many verbs, a useful template.

### Gaps
- Switch vs hold modes, sidestep/backflip/side hop/jump attack inputs, sword strings, spin attack, shield/crouch-stab, Deku nut, stagger, damage and heart numbers. Candidate sources: zeldawiki.wiki/wiki/Z-Targeting, zeldadungeon.net/wiki/Z-Targeting, zeldaspeedruns.com, OoT decomp (all blocked this session).

## 3. Enemy and boss design (Stalfos, Lizalfos, Wolfos, Iron Knuckle, Dark Link, Gerudo, Redeads; item use; bosses)

### Takeaway
Not researched; no sourced findings.

### Cited Findings
- None retrieved beyond the Stalfos patience mention in section 2.

### Gaps
- All enemy tells/openings and all boss-item relationships. Needs zeldawiki.wiki / zeldadungeon.net enemy pages.

## 4. Developer statements on teaching 3D swordplay, A button/C items, difficulty

### Takeaway
Only Navi/marker and Miyamoto's Navi remark found; nothing on difficulty targets.

### Cited Findings
- See Navi marker and Miyamoto remark in section 1.

### Gaps
- Iwata Asks Miyamoto volume (https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/4/4/ appeared in results) and the Part 2 volume on difficulty/context button were not read.

## 5. Later 3D Zeldas compared (Majora's Mask, Wind Waker, Twilight Princess, Skyward Sword, BotW)

### Takeaway
Not researched.

### Cited Findings
- None.

### Gaps
- All; comparisons would need Wikipedia/wiki/Eurogamer sources.

## 6. Lineage to Dark Souls and Kingdom Hearts

### Takeaway
Widely asserted but I found no developer statement from FromSoftware or Square Enix tying their lock-on to Z-targeting.

### Cited Findings
- Kingdom Hearts wiki lists lock-on in all main installments except Chain of Memories and coded; button varies per game — [KH Wiki: Lock-On](https://khwiki.com/Lock-On)
- A blog says Z-targeting "which Zelda popularized (if not invented)" is used throughout Dark Souls, which complicates the simple system — [Sunset Over Ithaca](https://sunsetoverithaca.com/2019/02/03/six-years-before-breath-of-the-wild-dark-souls-reinvented-the-legend-of-zelda/) (opinion, via summary)
- Forum claim that OoT originated 3D third-person melee lock-on: opinion, unverified — [Famiboards thread](https://famiboards.com/threads/was-ocarina-of-time-the-origin-of-3d-3rd-person-soulslike-lock-on-melee-combat.10634/)
- Zelda wiki: carried to GameCube by moving the target button from Z to L; spread to games from Metroid Prime to Kingdom Hearts (claim from wiki summary, wording unverified) — [Zelda Wiki: Z-Targeting](https://zeldawiki.wiki/wiki/Z-Targeting)

### Inferences
- Because no Miyazaki/Nomura statement was found, lineage claims should be framed as analyst consensus, not documented influence.

### Gaps
- Developer interviews on lock-on from FromSoftware/Square Enix; Metroid Prime/other priors (note: whether OoT was literally first lock-on in 3D is contested; earlier games such as Hideo Kojima-era or Fighting Vipers not checked — unverified).

## 7. Critical analyses of strengths and limits

### Takeaway
Only snippet-level material from Critical Hit and Goomba Stomp; Game Maker's Toolkit, Game Developer, Edge, Eurogamer, Polygon pieces were not found.

### Cited Findings
- See section 2 (Critical Hit, Goomba Stomp). Fandom feature on OoT influence: [Fandom](https://www.fandom.com/articles/ocarina-of-time-influence-gaming) (not read)

### Gaps
- Limits of the system (e.g. enemy-passivity, shallow depth) lack a sourced critic. A follow-up with network access to GMTK transcript and Game Developer is needed.
