# Chronicle single-class spell review

Reviewed on 2026-11-22 from one public Blackwing Lair report (build 7272). Counts are damage **hits**, not casts.
Every row was read from the OctoWoW database page. The database does not state the owning class, so class comes from the log caster.
A catalogue entry records a validated identity only: it makes no claim about rank, learn level, cooldown or damage coefficients.

**65 spells reviewed, 20,674 hits.**

| Disposition | Spells | Hits |
|---|---|---|
| catalogue-entry | 51 | 17,586 |
| excluded | 10 | 1,550 |
| disputed | 4 | 1,538 |

| Classification | Spells | Hits |
|---|---|---|
| active-ability | 28 | 3,283 |
| proc | 15 | 9,105 |
| periodic-effect | 3 | 4,229 |
| talent-effect | 9 | 2,507 |
| excluded-event | 10 | 1,550 |

## Disputed (identity preserved, not accepted)

| ID | Class | Log label | Database | Effect class | Confidence | Hits | Reason |
|---|---|---|---|---|---|---|---|
| [10333](https://octowow.st/db/?spell=10333) | paladin | Holy Strike | zzOLDHoly Strike (Rank 8), L99 | proc | db | 905 | Kept disputed by instruction: the database lists a deprecated level-99 name while players cast it live. Unresolved until authoritative evidence. |
| [3668](https://octowow.st/db/?spell=3668) | hunter | Steady Shot | zzOLDTrueshot (Rank 5), L99 | active-ability | db | 604 | Kept disputed by instruction: the database names this ID a different spell than the Chronicle label Steady Shot. |
| [20729](https://octowow.st/db/?spell=20729) | paladin | Hand of Sacrifice | Blessing of Sacrifice (Rank 2), L54 | active-ability | db | 27 | Disputed: the log says Hand of Sacrifice, the database says Blessing of Sacrifice. The same spell family is plausible but the renaming is unverified, so no guess. |
| [10332](https://octowow.st/db/?spell=10332) | paladin | Holy Strike | zzOLDHoly Strike (Rank 7), L99 | proc | db | 2 | Kept disputed by instruction: same deprecated level-99 naming as 10333. |

## Excluded

| ID | Class | Log label | Database | Effect class | Confidence | Hits | Reason |
|---|---|---|---|---|---|---|---|
| [22600](https://octowow.st/db/?spell=22600) | paladin | Force Reactive Disk | Force Reactive Disk, L0 | excluded-event | db | 672 | Item effect; belongs to the item-effect catalogue, not class abilities. |
| [21992](https://octowow.st/db/?spell=21992) | paladin | Thunderfury | Thunderfury, L63 | excluded-event | db | 473 | Legendary weapon proc; belongs to the item-effect catalogue. |
| [23402](https://octowow.st/db/?spell=23402) | priest | Corrupted Healing | Corrupted Healing, L0 | excluded-event | inferred | 372 | Level-0 periodic affliction damaging the afflicted player; encounter-style effect, not player DPS. |
| [52948](https://octowow.st/db/?spell=52948) | paladin | Simple Slingshot | Simple Slingshot, L0 | excluded-event | db | 16 | Item-use ranged attack; belongs to the item catalogue. |
| [46771](https://octowow.st/db/?spell=46771) | paladin | Thorns Fire Dmg +4 | Thorns Fire Dmg +4 (Rank 1), L55 | excluded-event | db | 5 | Gear or enchant damage shield; belongs to the item catalogue. |
| [11374](https://octowow.st/db/?spell=11374) | paladin | Gift of Arthas | Gift of Arthas, L45 | excluded-event | db | 4 | External debuff modifier with no damage effect; not a class mechanic. |
| [27860](https://octowow.st/db/?spell=27860) | mage | Engulfing Shadows | Engulfing Shadows, L55 | excluded-event | inferred | 4 | No description; Shadow damage plus an energize looks like an item or encounter effect. Origin unresolved, so left excluded. |
| [23478](https://octowow.st/db/?spell=23478) | paladin | Burning Adrenaline | Burning Adrenaline, L0 | excluded-event | inferred | 2 | Level-0 spell with an enormous range and damage; encounter-style debuff, not player DPS. |
| [23418](https://octowow.st/db/?spell=23418) | paladin | Siphon Blessing | Siphon Blessing, L0 | excluded-event | inferred | 1 | Level-0 periodic trigger tied to a blessing spell; encounter-style effect, not player DPS. |
| [27869](https://octowow.st/db/?spell=27869) | shaman | Dark Rune | Dark Rune, L58 | excluded-event | db | 1 | Consumable; not an ability. |

## Catalogue entries

| ID | Class | Log label | Database | Effect class | Confidence | Hits | Reason |
|---|---|---|---|---|---|---|---|
| [11337](https://octowow.st/db/?spell=11337) | rogue | Instant Poison VI | Instant Poison VI (Rank 6), L60 | proc | inferred | 4,404 | Rogue weapon poison; the page shows direct Nature damage and no proc wording, so proc behaviour is inferred from the spell family. |
| [11682](https://octowow.st/db/?spell=11682) | warlock | Hellfire Effect | Hellfire Effect (Rank 3), L54 | periodic-effect | inferred | 2,457 | Tick damage of the channelled Warlock Hellfire; the page shows a direct area damage effect, so the tick behaviour is inferred. |
| [51714](https://octowow.st/db/?spell=51714) | warlock | Power Overwhelming | Power Overwhelming, L40 | active-ability | db | 1,912 | Castable demon cooldown (instant, 80 mana). Already a published identity in the simulator. |
| [12721](https://octowow.st/db/?spell=12721) | warrior | Deep Wound | Deep Wound, L1 | periodic-effect | db | 1,470 | Bleed applied by the Warrior talent Deep Wounds (12868). |
| [25228](https://octowow.st/db/?spell=25228) | warlock | Soul Link | Soul Link, L40 | talent-effect | inferred | 1,375 | Warlock talent that redirects 30% of damage taken to the demon. Logged events are redirected incoming damage, not outgoing DPS, and must not be compared with simulated damage. |
| [51977](https://octowow.st/db/?spell=51977) | mage | Arcane Instability | Arcane Instability, L0 | proc | inferred | 1,362 | Custom OctoWoW spell: level 0, no cast, no description. Damage-proc class is inferred and the mechanic is unverified. |
| [51810](https://octowow.st/db/?spell=51810) | paladin | Divine Strike | Divine Strike, L1 | proc | inferred | 1,339 | Extra damage on hit of 3 Holy; trigger source unverified (one caster in this report). |
| [49557](https://octowow.st/db/?spell=49557) | hunter | Strike Together | Strike Together, L0 | talent-effect | inferred | 467 | Custom Hunter damage effect scaling with Attack Power; trigger source unverified. |
| [7712](https://octowow.st/db/?spell=7712) | paladin | Fire Strike | Fire Strike, L1 | proc | inferred | 380 | Extra damage on hit of 2 Fire on a Paladin; trigger source unverified and it may be a gear effect. |
| [44095](https://octowow.st/db/?spell=44095) | mage | Ancient Accord | Ancient Accord, L60 | talent-effect | inferred | 317 | Custom Mage damage effect; trigger source unverified. |
| [51514](https://octowow.st/db/?spell=51514) | hunter | Piercing Shots | Piercing Shots, L4 | periodic-effect | db | 302 | Hunter bleed effect lasting 8 s. |
| [20286](https://octowow.st/db/?spell=20286) | paladin | Judgement of Righteousness | Judgement of Righteousness (Rank 8), L58 | proc | inferred | 252 | Judgement damage of Seal of Righteousness, triggered by casting Judgement. |
| [20966](https://octowow.st/db/?spell=20966) | paladin | Judgement of Command | Judgement of Command (Rank 5), L60 | proc | inferred | 214 | Judgement damage of Seal of Command, triggered by casting Judgement. |
| [52511](https://octowow.st/db/?spell=52511) | rogue | Surprise Attack | Surprise Attack, L1 | active-ability | db | 191 | Custom Rogue ability, usable after the target dodges, awards one combo point. |
| [51560](https://octowow.st/db/?spell=51560) | paladin | Repent | Repent (Rank 3), L40 | active-ability | db | 181 | Custom Paladin ranked damage ability. Distinct from Repentance (51558). |
| [52865](https://octowow.st/db/?spell=52865) | druid | Midnight Comet | Midnight Comet, L0 | talent-effect | inferred | 169 | Custom Druid Arcane damage effect (level 0, no description); trigger source unverified. |
| [52899](https://octowow.st/db/?spell=52899) | paladin | Hallowed Ground | Hallowed Ground, L1 | talent-effect | inferred | 159 | Custom Paladin area damage and slow; trigger source unverified. |
| [51519](https://octowow.st/db/?spell=51519) | hunter | Extra Shot | Extra Shot, L1 | proc | inferred | 134 | Custom Hunter extra ranged shot; trigger source unverified. |
| [58112](https://octowow.st/db/?spell=58112) | hunter | Explosive Ammunition | Explosive Ammunition, L0 | proc | inferred | 74 | Damage effect likely triggered by an ammunition mode. Two IDs share this name (58109 and 58112) and are kept as separate identities. |
| [7373](https://octowow.st/db/?spell=7373) | warrior | Hamstring | Hamstring (Rank 3), L54 | active-ability | db | 72 | Warrior ability. |
| [58111](https://octowow.st/db/?spell=58111) | hunter | Enchanted Ammunition | Enchanted Ammunition, L0 | active-ability | inferred | 49 | Custom Hunter ammunition mode (60 s aura). The same ID also carries damage, so whether logged hits are the mode or its trigger is unresolved. |
| [58110](https://octowow.st/db/?spell=58110) | hunter | Poisonous Ammunition | Poisonous Ammunition, L0 | active-ability | inferred | 48 | Custom Hunter ammunition mode (60 s aura); same ambiguity as Enchanted Ammunition. |
| [58109](https://octowow.st/db/?spell=58109) | hunter | Explosive Ammunition | Explosive Ammunition, L0 | active-ability | inferred | 37 | Custom Hunter ammunition mode (60 s aura); same ambiguity as the other ammunition IDs. |
| [20615](https://octowow.st/db/?spell=20615) | warrior | Intercept Stun | Intercept Stun (Rank 3), L1 | proc | db | 32 | Secondary stun and damage applied by the Intercept charge; not separately castable. |
| [51558](https://octowow.st/db/?spell=51558) | paladin | Repentance | Repentance (Rank 3), L60 | active-ability | db | 27 | Paladin crowd-control ability. |
| [10318](https://octowow.st/db/?spell=10318) | paladin | Holy Wrath | Holy Wrath (Rank 2), L60 | active-ability | db | 26 | Paladin area ability against Undead and Demons. |
| [51566](https://octowow.st/db/?spell=51566) | paladin | Bulwark of the Righteous | Bulwark of the Righteous (Rank 3), L60 | active-ability | db | 18 | Custom Paladin ability: Holy damage and a 12 s damage-taken reduction. |
| [1769](https://octowow.st/db/?spell=1769) | rogue | Kick | Kick (Rank 4), L58 | active-ability | db | 15 | Rogue interrupt. |
| [57707](https://octowow.st/db/?spell=57707) | priest | Pain Spike | Pain Spike (Rank 4), L60 | active-ability | db | 14 | Custom Priest ability (30 s category cooldown). |
| [10308](https://octowow.st/db/?spell=10308) | paladin | Hammer of Justice | Hammer of Justice (Rank 4), L54 | active-ability | db | 12 | Paladin stun. |
| [16922](https://octowow.st/db/?spell=16922) | druid | Starfire Stun | Starfire Stun, L0 | talent-effect | inferred | 12 | Stun riding on Starfire; talent link is inferred from the name. |
| [6552](https://octowow.st/db/?spell=6552) | warrior | Pummel | Pummel (Rank 1), L38 | active-ability | db | 11 | Warrior interrupt. |
| [51302](https://octowow.st/db/?spell=51302) | paladin | Hand of Reckoning | Hand of Reckoning, L10 | active-ability | db | 10 | Custom Paladin taunt. |
| [8983](https://octowow.st/db/?spell=8983) | druid | Bash | Bash (Rank 3), L46 | active-ability | db | 7 | Druid stun. |
| [12868](https://octowow.st/db/?spell=12868) | warrior | Deep Wounds | Deep Wounds (Rank 3), L1 | talent-effect | db | 6 | Warrior talent that triggers the Deep Wound bleed (12721). |
| [2139](https://octowow.st/db/?spell=2139) | mage | Counterspell | Counterspell, L24 | active-ability | db | 4 | Mage interrupt. |
| [6795](https://octowow.st/db/?spell=6795) | druid | Growl | Growl, L10 | active-ability | db | 4 | Taunt. Owning class is taken from the log caster, the database does not state it. |
| [8643](https://octowow.st/db/?spell=8643) | rogue | Kidney Shot | Kidney Shot (Rank 2), L50 | active-ability | db | 4 | Rogue finisher. |
| [19253](https://octowow.st/db/?spell=19253) | priest | Touch of Weakness | Touch of Weakness (Rank 5), L50 | proc | inferred | 3 | Damage when the Priest is hit under the Touch of Weakness buff; trigger inferred from the spell family. |
| [1833](https://octowow.st/db/?spell=1833) | rogue | Cheap Shot | Cheap Shot, L26 | active-ability | db | 2 | Rogue stealth opener. |
| [10912](https://octowow.st/db/?spell=10912) | priest | Mind Control | Mind Control (Rank 3), L58 | active-ability | db | 2 | Priest crowd-control ability. |
| [14278](https://octowow.st/db/?spell=14278) | rogue | Ghostly Strike | Ghostly Strike, L0 | active-ability | db | 2 | Rogue ability. |
| [28382](https://octowow.st/db/?spell=28382) | priest | Shadowguard | Shadowguard (Rank 6), L60 | proc | inferred | 2 | Shadow bolt fired when the Priest is hit under Shadowguard; trigger inferred from the spell family. |
| [355](https://octowow.st/db/?spell=355) | warrior | Taunt | Taunt, L10 | active-ability | db | 1 | Warrior taunt. |
| [7321](https://octowow.st/db/?spell=7321) | mage | Chilled | Chilled (Rank 1), L30 | proc | inferred | 1 | Chill effect applied when a Mage is hit under Frost Armor; inferred from the name. |
| [7922](https://octowow.st/db/?spell=7922) | warrior | Charge Stun | Charge Stun, L1 | proc | db | 1 | Secondary stun applied by the Warrior Charge. |
| [11286](https://octowow.st/db/?spell=11286) | rogue | Gouge | Gouge (Rank 5), L60 | active-ability | db | 1 | Rogue ability. |
| [12355](https://octowow.st/db/?spell=12355) | mage | Impact | Impact (Rank 1), L10 | talent-effect | inferred | 1 | Stun effect of the Impact talent; inferred from the name. |
| [12826](https://octowow.st/db/?spell=12826) | mage | Polymorph | Polymorph (Rank 4), L60 | active-ability | db | 1 | Mage crowd-control ability. |
| [18469](https://octowow.st/db/?spell=18469) | mage | Counterspell - Silenced | Counterspell - Silenced, L0 | talent-effect | inferred | 1 | Silence effect of Improved Counterspell; inferred from the name. |
| [18658](https://octowow.st/db/?spell=18658) | druid | Hibernate | Hibernate (Rank 3), L58 | active-ability | db | 1 | Druid crowd-control ability. |

## Not reviewed in this pass

62 observed spell rows (21,008 hits) were outside the single-class scope: 9 auto-attack rows and 53 labels that appear on several classes (item procs, reflect, totems, weapon enchants). They stay unmapped.

