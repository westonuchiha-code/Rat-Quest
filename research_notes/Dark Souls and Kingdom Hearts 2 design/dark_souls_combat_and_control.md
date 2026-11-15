# Dark Souls combat and character control: approach versus pace

**Source status (second pass).** Pages read in full via the fetch helper: Fextralife DS1 wiki (Stamina, Equip Load, Poise, Estus Flask, Asylum Demon, Taurus Demon, Capra Demon, Ornstein and Smough, Artorias), four CritPoints essays, and Wikipedia (Dark Souls, Bloodborne, Sekiro, Elden Ring). The wiki is community-maintained (secondary, but gives frame tables). Wikipedia is a tertiary summary of cited Miyazaki interviews. Still unreadable: Game Informer, PlayStation Blog, GamesRadar, NeoGAF, Eurogamer, Fandom, Design Works. Miyazaki quotes from those come only from search-tool paraphrase and are marked "search summary only". Not found: Fextralife pages for Parry, Backstab, Lock-on and Design Works (404); no Game Developer article on Souls combat was read.

## 1. Core mechanics and numbers

### Takeaway
DS1 puts every action on a stamina budget, gives the roll the same 11 invincibility frames at every weight (13 for the lightest "ninja flip"), and varies only recovery and vulnerability by equip load. Heavier loads make the roll slower and riskier to use, not shorter-lived. This is a risk-per-action design, and it is not tied to slow movement.

### Cited Findings
- Stamina caps: 91 at 10 Endurance, 110 at 20, 133 at 30, 160 at 40 (hard cap); Ring of Favor and Protection +20%. — [Fextralife DS1 Stamina](https://darksouls.wiki.fextralife.com/Stamina) (community wiki, tables; fairly reliable)
- Attacking, blocking, running, jumping, rolling, parrying, backstepping, backstabbing and riposting all consume stamina. At zero you cannot repeat them. Blocking a hit that empties stamina breaks the guard and stuns you. Same page.
- You can still attack on empty stamina and go negative, to a minimum of -50. You cannot raise the shield until back above zero. Same page.
- Base recovery is 45 per second. Attacking stops all recovery until the animation ends. Raising the shield or climbing a ladder cuts recovery 80%. Over 50% equip load cuts it 20%, over 100% cuts it 30%. Recovery does not depend on maximum stamina. Same page.
- Roll table (frames): fat roll (over 50% load) has 11 i-frames, 9 recovery frames after them, 25 "instability" frames taking 1.4x damage, and 46 to 48 frames total. Mid roll (25 to 50%): 11 i-frames, 33 total. Fast roll (up to 25%): 11 i-frames, 21 to 24 total. "Ninja flip" (up to 25% in the table): 13 i-frames, 19 to 22 total. — [Fextralife DS1 Equip Load](https://darksouls.wiki.fextralife.com/Equip+Load) (community datamine; the 11/13 figures contradict the 9/11/13 by tier seen earlier on the Fandom wiki, which could not be re-read, so use Fextralife's but treat as moderately sure)
- Equip load maxes at 50 at 10 Endurance, 60 at 20, 70 at 30, 80 at 40. The medium-roll breakpoint is exactly half of maximum equip load. Same page.
- Poise is a hidden bar. Each hit has a hidden poise damage, and the character staggers at 0. The bar refills instantly after 5 seconds unhit (3.4 with armour). — [Fextralife DS1 Poise](https://darksouls.wiki.fextralife.com/Poise)
- Typical enemy poise damage per hit: 5 to 10 weak, 20 to 35 normal, 45 to 50 bosses, 60 for very large enemies; one earthshake does 120; Kalameet 300. Same page (community estimates).
- Estus Flask: a bonfire restores 5 uses by default, 10 when kindled, up to 20 with the Rite of Kindling. Drinking is the only portable healing. — [Fextralife Estus Flask](https://darksouls.wiki.fextralife.com/Estus+Flask)
- Wikipedia confirms the verbs: block, dodge roll, backstep, parry, plus magic with limited uses restored at a bonfire. — [Wikipedia: Dark Souls](https://en.wikipedia.org/wiki/Dark_Souls_(video_game))
- Commitment: CritPoints notes DS1 has "IASA frames" at the tail of attack animations, meaning the end of a swing can be interrupted, and that cancelling into movement lowers the feeling of commitment. — [CritPoints: Treatise on Commitment](https://critpoints.net/2015/03/24/treatise-on-commitment-in-action-games/) (opinion; the essay calls itself unfinished)

### Inferences
- The roll is not "invincible for free". Within ~11 i-frames the player wins, and the recovery tail afterwards is where the player is punished. A faster game can keep this structure by shortening both numbers together.
- Stamina is a pacing governor. Making attacks cost stamina forces the player to choose when to swing, which is the "risk and reward in when to attack" principle. It does not itself require slow animations.

### Gaps
- Not found in verified form: attack wind-up/active/recovery frames per weapon, backstep i-frames, parry window and riposte damage, backstab frames, guard-break numbers, turn rate, lock-on rules, health pool and damage figures.

## 2. Enemy and boss design

### Takeaway
The boss pages describe a consistent pattern: few moves, each with a visible wind-up, a weak point in range or tracking, and a recovery the player can punish. Difficulty ramps by combining those moves with extra enemies or terrain, not by hiding information.

### Cited Findings
- Asylum Demon (first boss): Hammer Drive has "poor range and tracking", so move out of the way when he raises the hammer. The long-range hammer tracks "somewhat so beware of dodging too early". The ground pound tracks even in the air, so keep moving. On the second encounter he smashes the platform if you wait too long. Health 813 on NG. — [Fextralife Asylum Demon](https://darksouls.wiki.fextralife.com/Asylum+Demon)
- Taurus Demon: Standing Smash "has a long, obvious buildup" and circling to his back is the answer, which also opens him. Horizontal swing: "does not have much range", roll back or under it. Jump attack overshoots if you run towards him. Can be staggered with large weapons, and can stun-lock you. — [Fextralife Taurus Demon](https://darksouls.wiki.fextralife.com/Taurus+Demon)
- Capra Demon: horizontal swings are "fairly easy to see coming due to the wind up" and can be dodged between swings. The two-hand swing breaks guard but is one of the easiest to see ("he takes the time to put his weapons together then wind up"). The dogs "can easily stun-lock you, leaving you vulnerable to a fatal blow", so the fight is about killing them first on the stairs. Heavy attack is used only when you are far away. — [Fextralife Capra Demon](https://darksouls.wiki.fextralife.com/Capra+Demon)
- Ornstein and Smough: Ornstein's gliding stab is telegraphed by kneeling into a pounce. His lightning bolt has a long cast and tracks until thrown. Smough's hammer smash "is slow and has poor tracking" with slow recovery, which is the punish window. His trample charge goes straight, so pillars separate the two. Lightning Impale tracking is "sub-par but unpredictable", and rolling too soon gets you hit. — [Fextralife Ornstein and Smough](https://darksouls.wiki.fextralife.com/Ornstein+and+Smough)
- Artorias: much faster, with gliding slashes, a three-hit somersault combo where each swing re-tracks, and "considerable range and tracking, punishing all but the most perfectly timed" dodges. Guides recommend staying within one to two reach lengths, rolling in a set pattern, and hitting once or twice, not greedily. He power-ups at about a third health and must be interrupted. — [Fextralife Artorias](https://darksouls.wiki.fextralife.com/Artorias+the+Abysswalker)
- Attack speed: "The standard attack speed of most weapons is roughly the same speed as enemy attacks", so attacking after an enemy usually means they hit first. The effect is a neutral game of positioning and whiff-punishing. — [CritPoints: How Dark Souls Changed Combat](https://critpoints.net/2020/09/12/how-dark-souls-changed-combat/) (analyst opinion; clear and concrete)
- Group fights are defended as fair: you can choose when to attack, enemies "are committed to their own attacks", and the issue is encounter balance, not the system. Critics in the comments say DS1's attacks hit only one or two targets. — [CritPoints: Multiple Enemy Fights are Fair](https://critpoints.net/2017/03/24/multiple-enemy-fights-are-fair/) (opinion, contested in its own comment thread)

### Inferences
- The teaching order is inferred: Asylum Demon (slow, one pattern, you can flee or ignore a plunge attack on the second visit) leads to Taurus (wind-up plus terrain) then Capra (adds dogs, so priority and positioning). The wiki does not describe this as an intentional curriculum.
- Tracking is used as a tuning dial. Short-tracking moves reward early commitment to a dodge, and long-tracking moves (Artorias) reward late dodges. A faster game can use the same dial with shorter windows.

### Gaps
- Aggro ranges and enemy placement are not covered (and are partly level design). No frame-level wind-up times for any boss.

## 3. Miyazaki on combat, fairness and difficulty

### Takeaway
Developer statements found: difficulty is a route to accomplishment, not the goal, and Dark Souls aimed to keep the challenge while giving players freedom to experiment. Weight, "realistic" swordplay and the cost of every action were not found.

### Cited Findings
- Dark Souls: the team meant to keep and raise the challenge "not simply by making the game harder", but by giving players freedom to experiment with strategies and to feel rewarded for overcoming obstacles. — [Wikipedia: Dark Souls](https://en.wikipedia.org/wiki/Dark_Souls_(video_game)) (paraphrase of Miyazaki's pre-release comments)
- Search summary only (originals unreadable): in 2009 he said being "difficult" was never the goal, with difficulty one way to give a sense of accomplishment — [Game Informer 2009](https://gameinformer.com/games/demons_souls/b/ps3/archive/2009/11/05/feature-demon-s-souls-director-discusses-difficulty-sequels-and-more); he cited King's Field as a definite influence on Demon's Souls — same page; in 2024 he said players should understand why they died and feel it was justified — [Game Informer 2024](https://gameinformer.com/interview/2024/06/24/from-softwares-hidetaka-miyazaki-discusses-his-approach-to-difficulty).
- Reception evidence: IGN said "there's a difference between punishing, and downright unfair" and Game Informer blamed frustration on a lack of direction. — [Wikipedia: Dark Souls](https://en.wikipedia.org/wiki/Dark_Souls_(video_game))

### Inferences
- The "justified death" statement and CritPoints' point that attacks match enemy speed fit together: fairness comes from the player seeing a hit coming and having time to answer.

### Gaps
- No readable primary quote on weight, realism, or the cost of actions. The Fextralife Design Works page returned 404.

## 4. Analysts' principles

### Takeaway
Analysts converge on four points: committed actions, matched speeds, spacing, and separate defence and offence tools. All are opinion, from CritPoints.

### Cited Findings
- Commitment makes actions feel weighty; being able to cancel into a dodge at any time "reduces the feeling of commitment"; Bayonetta cancels freely, DMC does not. — [CritPoints: Treatise on Commitment](https://critpoints.net/2015/03/24/treatise-on-commitment-in-action-games/)
- Matching player attack speed to enemy speed is "a simple effective trick for emphasizing more of the neutral game". The same essay notes it makes individual enemies and multi-enemy fights more threatening. — [CritPoints: How Dark Souls Changed Combat](https://critpoints.net/2020/09/12/how-dark-souls-changed-combat/)
- In DS1 the character cannot rotate while swinging, so moving around a swinging opponent is the core move, and "a lot of dark souls matches end up being circle strafing". There is almost no jumping or ducking mid-combat, so the combat is "mostly 2d". — [CritPoints: Spatial dynamics](https://critpoints.net/2015/03/20/65/) (opinion, Q&A format)

### Inferences
- For a fast acrobatic game the spacing and commitment lessons survive. The "almost no jumping" point does not, since acrobatics add a vertical axis that these analyses say Souls deliberately leaves out.

### Gaps
- No GMTK, Extra Credits, Errant Signal, Matthewmatosis or GDC source read; Game Developer articles not read.

## 5. How FromSoftware sped the formula up

### Takeaway
Bloodborne, Sekiro and Elden Ring all changed pace but kept stamina or posture pressure, readable telegraphs, committed attacks and enemies that follow rules. The developers' stated reason was to stop passive play, not to remove consequence.

### Cited Findings
- Bloodborne: the team did not want to raise the difficulty above earlier games because it would make the game "pretty much unplayable for anyone"; to balance this they made "a more aggressive combat system focusing on both action and strategy". Guns replaced shields. — [Wikipedia: Bloodborne](https://en.wikipedia.org/wiki/Bloodborne) (citing a Miyazaki interview; paraphrase)
- Bloodborne combat "emphasizes dodging, counterattacking, and close-range aggression". Rally regains health by striking quickly after damage. Trick weapons transform between two forms. Guns interrupt or parry attacks, opening a visceral attack. Target frame rate was 30 fps. — same page
- Search summary only: Famitsu quote that players must "think much faster" and cannot rely on defence; 4Gamer: shields made Demon's Souls combat feel "a bit passive", and removing them was not out of frustration with turtling. — [Push Square](https://www.pushsquare.com/news/2014/06/e3_2014_ps4_exclusive_bloodborne_will_force_you_to_think_on_your_feet), [NeoGAF 4Gamer translation](https://www.neogaf.com/threads/bloodborne-4gamer-interview-with-hidetaka-miyazaki-fully-translated.840059/)
- Sekiro: combat revolves around attacking posture and deflecting, "eventually leading to an opening" for one killing blow. Miyazaki wanted the feel of "swords clashing". It has a dedicated jump button and a grappling hook, where earlier games felt "rooted firmly to the ground" (IGN reviewer). Death can be reversed once by resurrection. — [Wikipedia: Sekiro](https://en.wikipedia.org/wiki/Sekiro:_Shadows_Die_Twice)
- Search summary only: he called Sekiro a "turning point" and said games could get faster still; he said Sekiro needs a different approach from Dark Souls. — [GamesRadar](https://gamesradar.com/games/action/sekiro-was-a-turning-point-for-fromsoftware-says-hidetaka-miyazaki-who-thinks-the-studios-games-can-still-get-faster-theres-one-more-level-we-can-crank-it-up-to)
- Elden Ring: Miyazaki said its combat resembles Sekiro's but neither game directly inspired the other's mechanics; Ashes of War add weapon arts. Enemy attacks can be dodged or blocked with shields. — [Wikipedia: Elden Ring](https://en.wikipedia.org/wiki/Elden_Ring)
- Search summary only: Edge called the Guard Counter a concession to defensive players. — [Edge via PressReader](https://www.pressreader.com/australia/edge/20220324/283459259823502)

### Inferences (what was kept versus what was only pace)
- Kept in every game (inferred from the sources above, not stated by Miyazaki in one place): readable enemy attacks with a chance to respond, a resource or meter that limits how long you can stay safe (stamina, then rally/posture), and one-at-a-time boss move sets.
- Changed: how long the player's own actions take, what defence is (block, then gun parry, then deflect), and whether the player can leave the ground.
- Bloodborne and Sekiro both turn defence into a timing act, which is a faster form of the same risk/reward trade.

### Gaps
- No primary Miyazaki quote on exactly which principles were kept unchanged, and no numbers for Bloodborne's quickstep or rally window.

## 6. Character control, camera and known weaknesses

### Takeaway
DS1 control is limited by design (no mid-combat jump, locked facing during swings), and lock-on is useful but not mandatory. The commonly reported weaknesses are camera behaviour in tight spaces and groups.

### Cited Findings
- Lock-on camera: the Souls camera is good enough to track several enemies, and attack buttons on the shoulder buttons let you move the camera and attack at once. Locking off lets you move around enemies faster, while locking on lets you move backwards and attack forwards. The essay author admits camera systems "could be improved". — [CritPoints: Multiple Enemy Fights are Fair](https://critpoints.net/2017/03/24/multiple-enemy-fights-are-fair/)
- Counterpoint in the same thread: a reader says telling players to avoid lock-on in groups "says more about the mechanic itself" and that a lock-on that tracks several targets would help. Same page.
- The same essay says Metal Gear Rising "slowly push[es] you into the wall" in group fights, which is the camera-against-wall failure. Same page.
- Search summary only: forum complaints of camera failure near walls and lock-on aiming at the centre of giant bosses. — [Steam Sekiro thread](https://steamcommunity.com/app/814380/discussions/0/1815422173046189998), [Steam Elden Ring thread](https://steamcommunity.com/app/1245620/discussions/0/4343240481093057874) (anecdotal)
- Extreme lock-on reduces a 3D fight to one dimension (distance); DS1 escapes this because swings lock facing, so circling works. — [CritPoints: Spatial dynamics](https://critpoints.net/2015/03/20/65/)

### Inferences
- A team borrowing the approach should make swings lock facing for a short window (this creates the dodge-around-the-attacker play), keep manual camera control available during combat, and test camera collision against walls with large enemies early.

### Gaps
- No sources found on turn speed, acceleration, roll distance, jump physics, input buffering or queueing (the brief names this as a criticism; nothing was found, so it remains unverified).
