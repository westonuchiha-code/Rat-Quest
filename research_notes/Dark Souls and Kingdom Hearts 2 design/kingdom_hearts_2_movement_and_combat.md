# Kingdom Hearts II Movement and Combat (second pass, primary pages read)

Method and reliability. Second pass read about 20 pages in full through the fetch helper: KH Wiki (khwiki.com) pages, the wiki forum page "Notes 53" (a community-maintained English translation of the Japanese Kingdom Hearts II Ultimania plus fan-collected data), CritPoints, and Wikipedia. Treat khwiki as secondary (fan wiki, it flags "unofficial translation"). Notes 53 is the closest thing found to primary numbers (it translates Square Enix's own Ultimania), but it is a fan translation, flagged "work in progress", with at least one visible error (noted below). Nothing from khinsider, kh13, medium or the speedrun community could be read. CORRECTION to my first-pass notes: the "20 second timer" and per-hit values I quoted for Revenge Actions are Kingdom Hearts III facts, not KH2; they are removed. OG = original 2005 release, FM = Final Mix (2007 and HD 2.5 ReMIX).

## 1. Ground and air combo system, finishers, abilities, homing, commitment

### Takeaway
KH2 combat is a combo-chain system where each combo ends in a finisher, extra combo length is bought with abilities (Combo Plus etc.), and "Action abilities" (Slide Dash, Aerial Sweep, Guard Break...) are context-sensitive attacks that close distance or add reach. Per the Ultimania translation, the combo ceiling rises with Drive Forms, which is a large part of why late-game Sora feels faster and flashier. No frame data was found.

### Cited Findings
- Abilities are split into Action (used directly in combat, tied to button presses), Growth (affect movement, upgraded by levelling Drive Forms), Support (passive) and Weapon abilities. Sora's standard Action abilities are learned by completing events, not by levelling — [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability)
- Wiki one-line descriptions of key Action abilities (secondary): Slide Dash "Instantly closes in on and attacks a far target" (2 AP, learned at the Village Cave trap); Aerial Sweep "powerful leaping attack on targets in midair"; Aerial Spin ("Aerial Spiral") "Closes in on far targets in midair and unleashes spinning attacks"; Aerial Dive (FM) "powerful aerial attack on distant targets"; Horizontal Slash "hits a target from left to right during a midair combo"; Finishing Leap "powerful guard-piercing attack at the end of a combo" (5 AP); Guard Break "finishing combo move that pierces through a target's guard" (3 AP); Explosion "finishing combo move that knocks down several enemies. Damage dealt is relative to magic skill" (3 AP); Magnet Burst (FM) "Draws enemies in to unleash a finishing combo move" (3 AP); Counterguard "Counterattacks nearby enemies with Attack while performing Guard" (4 AP); Flash Step (FM) "guard-piercing attack on a slightly distant target while keeping up your own guard"; Slapshot "Rapidly attacks a nearby target without getting flung back"; Retaliating Slash "When knocked down, quickly regains balance and counterattacks" — [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability)
- Support abilities: Combo Plus "Increases maximum combo by 1 when on the ground"; Air Combo Plus the same in midair; Combo Boost raises finisher damage relative to hits in the combo; Combo Master (FM) "Unleash a combo whether or not your hit lands"; Aerial Recovery (2 AP) regains balance when knocked down — [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability)
- Ultimania translation of the same: Combo Boost/Air Combo Boost raise finisher damage proportionate to combo length; Negative Combo (2 AP) "Decreases maximum ground and air combo length by 1"; Berserk Charge (5 AP) "During MP Charge, increases Strength by 1 and increases maximum combo length to infinite"; Finishing Plus (5 AP) "Adds another combo finisher". Caveat: in the same table the Combo Plus and Air Combo Plus descriptions are printed swapped (Combo Plus says "air"), which is evidently a transcription error — [Notes 53 (KHII Ultimania translation)](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Glavewurm's note in Notes 53: Combo Boost is "(non-finisher hits+1)*10% increase on all Finishers' damage in the combo"; and the wiki says damage is rounded up at each step (community-derived, medium confidence) — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Lock-On: with no lock the player "will automatically attack the closest available target"; Lock-On pins one target and the camera follows it. In KH2 it is toggled by tapping a button and switched by holding it while moving the stick — [KH Wiki: Lock-On](https://www.khwiki.com/Lock-On)
- Explosion's finisher revenge value is 4 in OG and 6 in FM (change between versions) — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Per-attack data shape (Notes 53): each attack is listed with power modifier, Drive gain %, revenge value, hit count, whether Guard can repel/negate it, and whether it is a finisher. E.g. Upper Slash: x1 power, revenge value 3, Guard "Yes (negate)" — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Commitment: enemies' hit-stun means the player can keep chaining, then "a cool-down period happens for Sora before he can start a new set of attacks" after the finisher (community analysis on the wiki forum) — [Notes 41 Revenge Value](https://www.khwiki.com/Forum:Notes_41_(Revenge_Value))

### Inferences
- Slide Dash, Aerial Spin and Aerial Dive are described as gap-closers, which together with lock-on pinning explains the "attacks home in" feel; the pages give no speeds, so how fast they close distance is unverified.
- The structure (combo, then finisher, then cool-down) means the real commitment is the finisher and its recovery, not each hit; exact recovery frames not found.

### Gaps
- Exact base combo strings (hit counts per string), animation-cancel rules, frame data and homing distances were not found on the pages read.
- The first-pass search-summary claim that Slide Dash "Instantly closes in" is now sourced, but how far "far" is was not found.

## 2. Defensive options and timing

### Takeaway
Defence in KH2 is Guard (with parry/deflect and brief invulnerability when it succeeds), Reflect magic, Dodge Roll (FM), Quick Run and Aerial Dodge (invincibility seconds are documented), and recovery options (Aerial Recovery, Retaliating Slash). Growth-ability invincibility times are given in seconds; Guard window data was not found.

### Cited Findings
- Guard (Reflect Guard): "Blocks and shoots back enemy attacks using a parrying action"; pressing Guard on the ground assumes a defensive pose that blocks frontal attacks and deflects some. FM expanded its effective range. If Quick Run is equipped, Guard activates when the button is pressed without touching the stick — [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability); [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Notes 53 attack tags: "Repel indicates an attack that can be stopped (causing the attacker to stagger) or (in the case of projectiles) deflected. Negate ... continues throughout the guard." It describes Reflect (magic) as able to block attacks Guard won't "at the cost of MP, dexterity and a short 'sitting duck' period at the end", and says Reflect is not a substitute for Guard — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- A successful block gives invincibility that lets Sora pass through unblockable beams (Roxas fight, wiki strategy text, community) — [KH Wiki: Game:Roxas](https://www.khwiki.com/Game:Roxas)
- Dodge Roll: in OG it is only a Reaction Command (against Minute Bombs); in FM it is also a Limit Form growth ability, 3 AP, "Leveling it up increases the distance of the roll". Invincibility during the roll (Ultimania translation): LV1 0.3 s, LV2 0.5 s, LV3 0.8 s, MAX 1.1 s; distance stays at 1 standard-jump unit; "slightly faster than running" — [KH Wiki: Dodge Roll](https://www.khwiki.com/Dodge_Roll); [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Quick Run invincibility "at the moment you start moving": LV1 none, LV2 0.3 s, LV3 0.4 s, MAX 0.5 s — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Aerial Dodge: "Press in midair to jump again"; the start of the jump is a fast spin that can knock back enemy attacks. Invincibility: LV1 0.2 s, LV2 0.3 s, LV3 0.4 s, MAX 0.5 s — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Aerial Recovery (2 AP, learned by Roxas at the Station of Serenity): lets the user upright after being knocked airborne; "In contrast to Retaliating Slash, Sora is granted brief invulnerability when performing Aerial Recovery, and can parry enemy attacks" — [KH Wiki: Aerial Recovery](https://www.khwiki.com/Aerial_Recovery)
- Entering a Drive Form refills HP and MP and launches nearby foes with an "invincible aura burst" — [KH Wiki: Drive Form](https://khwiki.com/Drive_Form)
- Once More (4 AP in KH2): keeps the user at 1 HP after a combo that would kill, provided they had more than 1 HP; it holds while the player is still airborne from the combo, and is cancelled by using Aerial Recovery or Retaliating Slash or reverting from a Drive Form mid-combo. Second Chance: survive one fatal blow at 1 HP if above 1 HP. Wiki: Once More is "invaluable against bosses that attack quickly and relentlessly" — [KH Wiki: Once More](https://www.khwiki.com/Once_More); [KH Wiki: Second Chance](https://www.khwiki.com/Second_Chance)
- Critical Mode-style design trade-off: Lingering Will wiki advice warns that with Once More and Second Chance equipped a hit "will very likely reduce his HP to 1", so do not use Aerial Recovery or Retaliating Slash (they cancel Once More) — [KH Wiki: Game:Lingering Will](https://www.khwiki.com/Game:Lingering_Will)

### Inferences
- Because invincibility lasts 0.2 to 1.1 s and scales with ability level, defensive tools are themselves upgraded over the game, which pairs with later bosses being faster.
- The "second chance" abilities act as a fairness backstop for combo-based enemy offence (chains of hits), not just single blows; designers evidently expect bosses to string hits together.

### Gaps
- Guard parry window in frames, Reflect (magic) invincibility length, Counterguard window and Retaliating Slash timing: not found on the pages read.
- Aerial Recovery's recovery input window: not found.

## 3. Growth abilities, Drive Forms and speed growth

### Takeaway
Drive Forms are earned in story order, each levelled by a different action to level 7 (maximum starts at 3 and rises as forms unlock), and each form's growth ability can be used in standard form at a reduced level. The Ultimania translation gives concrete speed multipliers: Valor 1.4x, Wisdom 1.4x, Master 1.25x, Final 1.7x standard run/jump speed, and Glide from 2x to 4x run speed.

### Cited Findings
- Entering a form replaces Action and Growth abilities with the form's set; max form level starts at 3 with Valor, rises 1 per new form until Final Form raises all to 7 — [KH Wiki: Drive Form](https://khwiki.com/Drive_Form)
- Valor: Goofy form, dual Keyblades, cannot cast magic, High Jump; gets 1 EXP per successful hit (easiest to level), obtained at the Mysterious Tower. Wisdom: Quick Run, Shoot replaces Attack, hover-slides along the ground, 1 EXP per Heartless defeated. Master: Aerial Dodge (double jump), 1 EXP per small Drive orb, 3 per big. Final: Glide, 1 EXP per Nobody defeated; found after the Roxas fight and randomly via Anti-Form attempts. Limit (FM only): Dodge Roll, EXP per Limit finisher. Final Form "reduce[s] the likelihood of activating Antiform" — [KH Wiki: Drive Form](https://khwiki.com/Drive_Form)
- Ultimania translation, main changes: Valor "Runs and jumps at 1.4x Standard Form's speed", jump height 1.3x at LV1 up to 3.2x at MAX, ground and air combo length +1, no magic. Wisdom: moves at 1.4x, ground combo +1, "Cannot use air combos", can use techniques, magic and items while moving. Master: runs/jumps at 1.25x, jump height 1.25x, can double-jump, maximum air combo +2, magic combos indefinite. Final: "Runs and jumps at 1.7x Standard Form's speed", jumps 1.5x higher and further, glides, "Automatically attacks with Keyblades when jumping, using magic or items, when hit by an enemy's attack", slides along the ground. Limit (FM): jump height and length 1.5x — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- High Jump (distance/height relative to a standard jump = 1): LV1 1.3 high x 1.7 far; LV2 1.7 x 1.9; LV3 2.1 x 2.1; MAX 3.2 x 2.4. In standard form it is about 70% potency. Quick Run distance: LV1 1.5, LV2 1.9, LV3 2.2 (OG) or 2.8 (FM), MAX 3.7. Aerial Dodge height/distance: LV1 0.8/1.7, LV2 1.0/1.9, LV3 1.1/2.2, MAX 1.6/2.5. Glide max speed vs running speed 1x: LV1 2x, LV2 2.5x, LV3 3x, MAX 4x (gradually accelerates) — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- How earned: each growth ability has four levels (LV1 to MAX) tied to form levels 1/3/5/7 for the form and standard Sora learning them at form levels 3/5/7, e.g. High Jump LV1 for Sora at Valor LV3, LV2 at LV5, LV3 at LV7; MAX is form-only. Valor level table: EXP to levels 100/80 (LV2), 400/240 (LV3), 760/520 (LV4), 1210/968 (LV5), 1750/1528 (LV6), 2500/2200 (LV7), shown as OG/FM — the FM thresholds are lower, so forms level faster in FM — [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability); [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Final Form discovery odds from Anti-Form attempts: 25%/50%/100% (OG) vs 3%/9%/27%/75% (FM) by attempt — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Growth abilities gate FM's Cavern of Remembrance movement challenges (forum poster) — [KH-Vids thread](https://kh-vids.net/threads/abilities-needed-for-cavern-of-remembrance.148931)

### Inferences
- Speed growth comes from three stacking sources: form speed multipliers (to 1.7x), growth ability levels (glide to 4x run speed) leaking into base form, and combo caps (Combo Plus, Air Combo Plus, Master +2, Valor +1). Combined, late-game Sora can cross arenas and chain longer air combos far faster than at the start. The numbers for standard Sora's own run speed in absolute units were not found.
- Whether "faster attack animations" in Wisdom/Final are real is stated qualitatively ("executes actions more quickly") but not quantified.

### Gaps
- Absolute speeds (units/second) and attack animation speed in frames: not found.
- Early-game base moveset speed versus final-form attack speed comparison in frames: not found.

## 4. Reaction Commands

### Takeaway
Reaction Commands are context-sensitive actions on one button that appear in the command menu region. KH2 mostly does not penalise early presses; the timing window is generally the lifetime of the prompt.

### Cited Findings
- "Reaction Commands ... are a feature introduced in Kingdom Hearts II, intended to extend the level of combat", used for combat manoeuvres and mundane interactions, sometimes required to end a boss fight. "Only a select few ... require the player to press the moment it appears; in Kingdom Hearts II, one can press until the command is initiated, suffering no penalty if [pressed early]. Only three Reaction Commands in the entirety of Kingdom Hearts II penalize such an action." — [KH Wiki: Reaction Command](https://www.khwiki.com/Reaction_Command)
- Wikipedia: Reaction Commands are enemy-specific attacks triggered by pressing triangle at the correct time; battle director Yuichi Kanemori "made the Reaction Command actions contextual to avoid embedding it within the command menu; he felt too many commands in the menu would make accessing the options too complex" (Wikipedia's paraphrase of a developer interview) — [Wikipedia: Kingdom Hearts II](https://en.wikipedia.org/wiki/Kingdom_Hearts_II)
- Reaction Boost raises damage of offensive reaction commands 1.5x; Auto Valor/Wisdom/Limit/Master/Final set the Reaction Command to the form in a pinch — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark); [KH Wiki: Abilities (KHII)](https://www.khwiki.com/Growth_Ability)

### Inferences
- Reaction Commands act as low-skill-floor spectacle layers; the low penalty for early presses supports the common view that they add flash without much risk (critics' view not found in a read source).

### Gaps
- Critics' and designers' specific opinions on what Reaction Commands add or remove: not found in a source I could read.
- Exact frame windows: not found.

## 5. Boss internals: revenge, safety abilities, fights as case studies

### Takeaway
Revenge Value is a hidden per-attack number accumulated against a hidden per-boss threshold; when the threshold is reached the boss breaks out of the combo with a forced action. Typical standard bosses sit at 12.5 and the Lingering Will at 25, so a boss that looks stunlockable is actually on a hidden clock that skilled players track by counting finishers.

### Cited Findings
- Definition and purpose: "a series of mechanics in place for bosses in Kingdom Hearts II and Kingdom Hearts II Final Mix, whose purpose is to prevent the possibility to combo-stunlock bosses to death." After each hit most bosses stay staggered so the player can chain to the finisher; the bosses have an invisible gauge filled by Sora's actions, and at the maximum the boss "can and will ... choose an action between a predefined set (usually composed by only 1 action) and performs it ... even if it's still staggered" (a "Forced Revenge") — [KH Wiki Forum: Notes 41](https://www.khwiki.com/Forum:Notes_41_(Revenge_Value))
- The mechanic was introduced in KH2 and not officially named until KH3; attacks have a "Revenge Value", bosses a "Revenge Activation Value" — [KH Wiki: Revenge Action](https://www.khwiki.com/Revenge_Value)
- KH2 per-attack values (FM, normal Sora): basic ground opener 1; ground follow-up 1; Slapshot/Counterguard/Round Break 1; Slide Dash, Flash Step, Dodge Slash 1 (only if last small hit connects); Upper Slash 3; ground finisher 3; Guard Break and Finishing Leap 3; Explosion 6; aerial upper/down slash 1.5; Horizontal Slash 1.5; Retaliating Slash 3; aerial finisher 3.5; Firaga 1, Firaga finisher 3; Blizzaga 2 / finisher 4; Thundaga 4 / 4; Magnega 4.5; Reflega 4. Drive Form explosions, guarding, and growth abilities add none — [KH Wiki Forum: Notes 41](https://www.khwiki.com/Forum:Notes_41_(Revenge_Value))
- Boss thresholds from the Ultimania-translation page (credited to a fan, "ahirun255", for FM; some bosses differ between OG and FM): Seifer 6.25; Axel 12.5 and 11.5 (two phases); Shan-Yu, Thresholder/Possessor, Shadow Stalker, Dark Thorn, Pete, Barbossa, Volcanic/Blizzard Lords, Prison Keeper, Demyx, Xaldin, Grim Reaper, Experiment, Sephiroth, Xigbar: 12.5; Hades 10; Shenzi/Banzai/Ed 7.5; Xemnas second phase 9.375. The wiki also quotes "Lingering Will's revenge value is 25". Caveat: my text extraction attached some entries to the wrong boss headings, so check the source before relying on any specific boss beyond these; the threshold values themselves are as printed — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark); [Notes 41](https://www.khwiki.com/Forum:Notes_41_(Revenge_Value))
- Ultimania text on bosses: "Boss敵の多くは, 連続でdamageを受けつづけると, 途中で体勢を立て直して反撃を行なう" (most bosses, when taking continuous damage, recover and counterattack partway), confirming the mechanic exists in the official book — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Superboss damage floor 60 and cap 78 (Str/Mag) / 76 (Def); Lingering Will also has an escalating damage mechanic ("Continuous damage - 0.01 times") — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Lingering Will (FM only secret boss, 3400 HP listed): very high Revenge Value so "an inattentive player" can become "too combo-happy and not notice when its Revenge Value has been reached, making its counterattacks quite harsh and/or near-fatal"; advice is to "back off before dealing a 5th normal combo finisher in a row"; "The first combo landed on it each time it is left open will always do very little damage, until the subsequent ones increase in output"; its basic Rush Attack is three air dashes whose "timings ... are easy to predict"; Command Seal Attack is "telegraphed by a distinct sound cue"; hitting a phase threshold "will ALWAYS cause a Revenge move to come out"; it is invincible mid-attack, preventing Reflect-chaining; stopping combos "just short enough" lets the player manipulate which move it uses — [KH Wiki: Game:Lingering Will](https://www.khwiki.com/Game:Lingering_Will)
- Roxas (FM): "Revenge Value is the main danger"; if knocked airborne at his threshold he retaliates with Aerial Spin Swing or the near-instant Keyblade Throw combo; wiki strategy is to drop combos before the threshold ("only chaining into one combo finisher is enough to not trigger it") so he keeps looping known attacks; Keyblade Release at 75% and 40% HP is unblockable with Guard and must be dodged/reflected; guarding the final dash of Continuous Swing staggers him and gives Sora "multiple seconds" to attack; the opening swing is "fairly easily circumvented". Data Rematch: he "can now retaliate after just one finisher", projectiles are faster so Glide is recommended — [KH Wiki: Game:Roxas](https://www.khwiki.com/Game:Roxas)
- Sephiroth (KH2 secret boss, Hollow Bastion/Dark Depths): wiki table lists 12.5 revenge in the extracted data; I did not read his strategy text successfully (the page I read first returned the KH1 Platinum Match). Treat any KH2 Sephiroth claim as unverified.
- CritPoints (Celia Wagar, 2018): "Revenge Value is super simple. It's a system that exists to prevent infinite combos". She links it to Poise in Dark Souls and Ki in Nioh, and to Skullgirls "Drama". Criticism: "it's totally opaque. There's no feedback telling you how much revenge value you're dealing ... it's a matter of memorization"; she would have preferred "shorter combos instead with more varied revenge attacks", and "God Hand did it better" — [CritPoints: Kingdom Hearts 2 Revenge Value](https://critpoints.net/2018/02/19/kingdom-hearts-2-revenge-value)

### Inferences
- For the brief's "readable and fair" aim: the system gives a hidden but fixed, learnable budget. Fairness comes from the boss's counter being deterministic and from telegraphed attack patterns, not from visible feedback; CritPoints argues the lack of a visible meter is the weak point, which a Souls-like team could fix by making the poise/combo budget visible.
- The fights praised by players (Roxas, Lingering Will) are those where the hidden threshold is the main risk and the player can control it by dropping combos; this is stated by the wiki strategy text but the "why players consider them fair" framing is mine.

### Gaps
- Data Organization XIII fights (pattern pages): not read. Their revenge values were extracted but heading attribution was unreliable. Needs one more pass on khwiki Game: pages for each Data fight (e.g. "Organization XIII's Replica Data" page).
- Hit-stun and super-armour rules per attack, and the exact "Once More" safety rules beyond the above: not found.
- Original release vs FM revenge differences: only noted generally ("some bosses seem to have different RVs between OG and FM, but I'm unsure of the exact values").

## 6. Critical Mode (Final Mix)

### Takeaway
Critical Mode keeps enemy behaviour but doubles damage received, nerfs player stat growth and gives Roxas a preset kit, making every mistake expensive and forcing use of defensive tools.

### Cited Findings
- Critical: damage received doubled vs Standard; damage dealt 1.25x (except one enemy); HP from Bonus Levels +2 per level instead of +5 (maximum 60 HP); MP +5 instead of +10 (maximum 120 MP); EXP gained 75%; Roxas starts with 50 AP and gains AP by 3 per level rather than 2; Roxas starts with Reaction Boost, Finishing Plus, Draw, 2x Lucky Lucky, MP Hastera and No Experience. Proud: damage received doubled. Beginner: dealt 1.5x, received halved — [KH Wiki: Difficulty Level](https://www.khwiki.com/Difficulty_Level)
- Notes 53 agrees on the modifiers (Critical: x1.25 dealt, x2 taken; Proud x1/x2; Beginner x1.5/x0.5) — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- Opinion: a Medium design essay argues experts must use the systems "or Critical Mode is insurmountable" (from a search summary only, page unreadable); a Mein-MMO player piece and a fan write-up say Critical reveals the combat's potential and fixes Cure spam — [Game Balance in KH2 (Medium)](https://medium.com/game-design-fundamentals/game-balance-in-kingdom-hearts-ii-417db8cee9b3); [Mein-MMO](https://mein-mmo.de/en/for-9-years-i-avoided-the-hardest-test-of-my-favorite-arpg-now-i-would-recommend-it-to-everyone,1590900/); [Minishlan](https://minishlan.github.io/whykh2fmisgreat.txt)

### Inferences
- Same enemy patterns plus 2x damage and 60 HP cap equal roughly a one-hit-margin game, which is exactly the Souls-like "learn it or die" tuning; this reading is mine.

### Gaps
- The Medium, Mein-MMO and Minishlan quotes are from search summaries only (pages unreadable or not re-read), so they are low confidence.
- Speedrun/Level 1 Critical community documentation: not found.

## 7. Developer statements

### Takeaway
Only paraphrases in Wikipedia were obtained; direct interview text (Nomura, Yasue, battle planners) could not be read.

### Cited Findings
- Wikipedia: "The combat system was completely redone and did not use animations or data from the first game. Because Sora had matured, the developers wanted his fighting style to reflect that." Nomura "wanted to the retain the basis of the battle system while providing the player a wider range of strategies." Battle director Yuichi Kanemori "drew inspiration from fighting games when crafting the combat. He believed that players feel exhilaration when executing fighting maneuvers." Programmer Kentaro Yasui built a tool for quick changes to character actions, letting Kanemori fine-tune actions and variables. Camera: "controls were switched from the Dualshock controller's shoulder buttons to the right analog stick" in response to negative feedback — [Wikipedia: Kingdom Hearts II](https://en.wikipedia.org/wiki/Kingdom_Hearts_II)
- Wikipedia on the HD release: "As the developers felt that Kingdom Hearts II was already well balanced, they decided against making major gameplay changes" — [Wikipedia: Kingdom Hearts II](https://en.wikipedia.org/wiki/Kingdom_Hearts_II)
- Later Nomura remark (not KH2-era): the next battle system would evolve KH2's because everyone seemed to like it (search summary) — [Gematsu](https://gematsu.com/2016/10/tetsuya-nomura-discusses-world-final-fantasy-kingdom-hearts-2-8-iii-final-fantasy-vii-remake-dengeki-playstation) (exact quote location unverified)

### Inferences
- The Kanemori fighting-game influence plus the revenge system (a combo counter bounded by a hidden budget) is consistent with the fighting-game comparison CritPoints draws; the link is my inference.

### Gaps
- No Tai Yasue (Osaka team, note: the Wikipedia page names programmer Kentaro Yasui, a different person) or Nomura direct statement on wanting faster, more acrobatic combat. kh13/khinsider are unreachable; this remains open.
- Wikipedia's cited interview sources (reference numbers 19, 30, 32) were not opened.

## 8. Analyses, praise, and acknowledged weaknesses

### Takeaway
Contemporary reviews praised combo depth and excitement; critics noted camera issues and light RPG elements; the main acknowledged weaknesses (mashing, floatiness) lack a read source here beyond CritPoints' opacity critique.

### Cited Findings
- Metacritic 87/100 from 64 reviews. "The refined combat system was praised, with the drive forms, limit breaks, and combos being said to add depth, variety, and excitement." Game Informer's Andrew Reiner called combo potential "divine" and said it surpassed God of War's intensity; GameSpot noted the ease of customization allows "both deep and shallow gameplay"; Reiner noted dynamic controls that instilled confidence — [Wikipedia: Kingdom Hearts II](https://en.wikipedia.org/wiki/Kingdom_Hearts_II)
- Camera: reviewers praised increased responsiveness from the right-stick change; GameSpy's Villoria and another reviewer saw no improvement and mentioned "forced and awkward camera positions"; the first-person mode was dismissed as unhelpful. Items were called "practically useless" due to lack of need (RPG elements light) — [Wikipedia: Kingdom Hearts II](https://en.wikipedia.org/wiki/Kingdom_Hearts_II)
- Wiki and Ultimania text show the "mash" path exists: one Ultimania line on a Heartless says "You can easily dispatch it by pressing X and Triangle repeatedly" — [Notes 53](https://www.khwiki.com/Forum:Notes_53_(KHII,_mechanics_%2B_backups_from_Pastebin)_-_Ultima_Spark)
- RPGFan describes "an exciting balance between honest combat design and post-God of War cinematic spectacle" (search summary only, not re-read) — [RPGFan](https://rpgfan.com/feature/retro-encounter-final-thoughts-kingdom-hearts-ii)

### Inferences
- The same "accessible on the surface, deep underneath" quality that GameSpot notes is the design the team could copy: low-difficulty modes are mashable while Critical demands the full toolkit.

### Gaps
- Floatiness criticism and video-essay content: not found in a source I could read.
- Speedrun/challenge-run documentation: not found.
