# Source reconciliation checkpoint
Public OctoWoW census is population data, not server stat tables. Community RelationshipsDashboard has approximate level-60 offsets, and a Turtle community planner explicitly reported missing custom race base values. None establish OctoWoW's 1,140 full missing rows. Sources: https://octowow.st/player-census ; https://octowow.st/git/Relationship/RelationshipsDashboard/src/commit/96fc4647d859ed19d8d565ed20c80aa6b00fb474/RelationshipsDashboard.lua ; https://www.reddit.com/r/turtlewow/comments/1sc31yd/i_updated_the_gear_finder_and_gear_planner_tools/ .

Current official class guides reviewed: https://octowow.st/mage (Fireball ranks 11/12 275/295 mana), https://octowow.st/index.php/hunter (Aimed Shot rank 6 205 mana, 26-second cooldown; Trueshot Aura removed), https://octowow.st/index.php/rogue (Sinister Strike 40, Eviscerate 30, Rupture/Slice and Dice 20 energy), https://octowow.st/index.php/priest (Holy Nova in Shadowform 180 mana, rank unspecified). Aimed Shot database https://octowow.st/db/?spell=20904 reports 310 mana. Historical Turtle archive gives additional Fireball costs but is not a current OctoWoW source. These are guide candidates and not live resolved values. Rank-unspecified scope must not be propagated to all ranks.

The automated queue now reports guide candidates without mutating the research engine. Independent observation authentication and real live measurements remain necessary. Main and public gate unchanged.

## 20 November 2026 — Phase 4 source reconciliation

- The [current Paladin guide](https://forge.octowow.st/paladin) describes eight Holy Strike ranks from levels 4 to 60, a six-second cooldown, and mana costs of 5 and 90 at the endpoints. [Database record 679](https://octowow.st/db/?spell=679) is labelled obsolete. [Database record 17284](https://octowow.st/db/?spell=17284) describes a next-swing effect rather than the guide's strike and restoration. These records leave learned cast identity unresolved.
- The [Hunter guide](https://octowow.st/index.php/hunter) lists Trueshot Aura as removed. [Database record 19506](https://octowow.st/db/?spell=19506) shows a legacy rank-one flat attack-power effect. Retain both alongside the existing single-rank player report until a current learned spell link or cast event can be reviewed.
- The [RelationshipsDashboard source](https://octowow.st/git/Relationship/RelationshipsDashboard/blame/commit/779cb2168731bfc72daf17f17474cf9138271618/RelationshipsDashboard.lua) labels its race adjustments as typical Vanilla deltas. It provides no verified missing OctoWoW base rows.

### Additional rank evidence

- The [29 April hotfix](https://octowow.st/forum/viewtopic.php?t=20) documents restored rank-one Holy Strike trainer availability. An [18 November player report](https://octowow.st/forum/viewtopic.php?p=21212) discusses its healing in the current game. Neither source supplies a learned cast ID. Staging [13953](https://forge.octowow.st/database/?spell=13953) describes a next-swing effect and staging [20216](https://forge.octowow.st/database/?spell=20216) is labelled Divine Favor.
- The database also lists legacy Trueshot Aura [rank 2](https://octowow.st/db/?spell=20905) and [rank 3](https://octowow.st/db/?spell=20906) with flat bonuses of 75 and 100 respectively. The review packet flags a separately learned higher rank as a conflict with the reported single-rank model.

### Chronicle raid evidence

A [public Blackwing Lair report](https://octo.chronicleclassic.com/instances/LIGCnEjGyLkG4cXS) from N’Zoth on 20 November 2026 recorded client build 7272. The documented [External API](https://octo.chronicleclassic.com/developers/api) provided the encounter metadata and gzip-compressed protobuf streams. The successful spell stream records 443 Holy Strike casts as 10333 from two Paladins and four Trueshot Aura casts as 19506 from three Hunters. Damage and aura events separately corroborate the IDs. Counts exclude events marked synthetic and spell events without a matching player class. The report provides neither the learned rank ordinal nor the complete list of trainable ranks. These observations are available in the identity plans without changing the spell tables or readiness gates.

The sampled unit-resource stream contains maximum health but provides no attack power, spell power, or armour values. Its raid snapshots are unsuitable for naked base-stat rows or controlled pet inheritance. Additional reports can serve as spell and combat benchmarks, with known roster, encounter, gear, and buff context.
