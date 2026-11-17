/* All 49 paladin talents reviewed against https://octowow.st/talents/paladin/; snapshot SHA256 16f76bfbdb4faba8636986e58db45a38ccc6ef84e83395d99ce7c7849de35ee4. */
export const AUDITED_CLASS="paladin";
export const TALENT_RULES={
  "428": [
    {
      "kind": "scoped",
      "scope": "Blessing of Might/Wisdom",
      "stat": "effectivenessPct",
      "param": 0
    }
  ],
  "429": [
    {
      "kind": "scoped",
      "scope": "Judgement/Seals",
      "stat": "manaCostReductionPct",
      "param": 0
    }
  ],
  "431": [
    {
      "kind": "scoped",
      "scope": "Seal of the Crusader",
      "stat": "attackPowerBonusPct",
      "param": 0,
      "when": {
        "seal": "Seal of the Crusader"
      }
    },
    {
      "kind": "scoped",
      "scope": "Judgement of the Crusader",
      "stat": "holyDamageIncreasePct",
      "param": 0
    }
  ],
  "432": [
    {
      "kind": "global",
      "stat": "parry",
      "param": 0
    }
  ],
  "433": [
    {
      "kind": "scoped",
      "scope": "Retribution Aura",
      "stat": "damagePct",
      "param": 0,
      "when": {
        "aura": "Retribution Aura"
      }
    }
  ],
  "434": [
    {
      "kind": "global",
      "stat": "crit",
      "param": 0
    }
  ],
  "436": [
    {
      "kind": "scoped",
      "scope": "Movement/Mounted",
      "stat": "movementSpeedPct",
      "param": 0
    }
  ],
  "437": [
    {
      "kind": "weapon",
      "weapon": "twohand-sword-mace-axe",
      "stat": "skill",
      "param": 1
    },
    {
      "kind": "weapon",
      "weapon": "twohand",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "442": [
    {
      "kind": "scoped",
      "scope": "Crusader Strike",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Zeal per stack",
      "stat": "attackCastSpeedPct",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "Zeal stack generation/duration requires an aura engine"
    }
  ],
  "444": [
    {
      "kind": "percent",
      "stat": "str",
      "param": 0
    }
  ],
  "445": [
    {
      "kind": "percent",
      "stat": "int",
      "param": 0
    }
  ],
  "448": [
    {
      "kind": "scoped",
      "scope": "Seal/Judgement of Righteousness",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "449": [
    {
      "kind": "scoped",
      "scope": "Holy Light / Flash of Light / Holy Shock",
      "stat": "healingPct",
      "param": 0
    }
  ],
  "450": [
    {
      "kind": "scoped",
      "scope": "Sanctity Aura",
      "stat": "holyDamagePct",
      "param": 0,
      "values": [
        10
      ],
      "when": {
        "aura": "Sanctity Aura"
      }
    }
  ],
  "452": [
    {
      "kind": "scoped",
      "scope": "Fear/Disorient",
      "stat": "resistChancePct",
      "param": 0
    }
  ],
  "453": [
    {
      "kind": "scoped",
      "scope": "Concentration Aura",
      "stat": "effectivenessPct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Concentration Aura",
      "stat": "resistSilenceInterruptPct",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "The planner does not offer Concentration Aura as a selectable aura"
    }
  ],
  "455": [
    {
      "kind": "special",
      "stat": "healingFromItemArmourPct",
      "param": 0
    }
  ],
  "456": [
    {
      "kind": "spell",
      "scope": "Holy Shock",
      "stat": "crit",
      "param": 0
    }
  ],
  "458": [
    {
      "kind": "spell",
      "scope": [
        "Holy Light",
        "Flash of Light"
      ],
      "stat": "crit",
      "param": 0
    }
  ],
  "461": [
    {
      "kind": "scoped",
      "scope": "Devotion Aura",
      "stat": "armourBonusPct",
      "param": 0
    }
  ],
  "463": [
    {
      "kind": "global",
      "stat": "hit",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "spellHit",
      "param": 0
    }
  ],
  "465": [
    {
      "kind": "special",
      "stat": "itemArmourPct",
      "param": 0
    }
  ],
  "466": [
    {
      "kind": "scoped",
      "scope": "Righteous Fury",
      "stat": "threatPct",
      "param": 0
    }
  ],
  "468": [
    {
      "kind": "scoped",
      "scope": "Shield",
      "stat": "blockValuePct",
      "param": 0,
      "when": {
        "shield": true
      }
    },
    {
      "kind": "pending",
      "note": "Mana restoration on blocking is conditional"
    }
  ],
  "469": [
    {
      "kind": "global",
      "stat": "defense",
      "param": 0
    }
  ],
  "470": [
    {
      "kind": "scoped",
      "scope": "Hand of Reckoning",
      "stat": "hit",
      "param": 0
    }
  ]
};
export const TALENT_COVERAGE={
  "428": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "429": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "430": {
    "status": "ability-specific",
    "note": "Decreases the cooldown of your Judgement spell by 2 sec."
  },
  "431": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "432": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "433": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "434": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "435": {
    "status": "active-or-non-stat",
    "note": "Places a Blessing on the friendly target, increasing total stats by 10% for 10 min. Players may only have one Blessing on them per Paladin at any one time."
  },
  "436": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "437": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "438": {
    "status": "proc-or-conditional",
    "note": "Gives the Paladin's damaging melee attacks a chance to reduce the target's damage dealt by 9% for 10 sec. Only affects targets of level 62 or lower."
  },
  "439": {
    "status": "ability-specific",
    "note": "All spell criticals against you cause 30% of the damage taken to the caster as well. The damage caused by Eye for an Eye will not exceed 50% of the Paladin's total health."
  },
  "440": {
    "status": "proc-or-conditional",
    "note": "Gives you a 5% bonus to all damage you deal and decreases threat you generate by 10% for 30 sec after dealing a critical strike from a weapon swing, spell, or ability. This ef"
  },
  "441": {
    "status": "proc-or-conditional",
    "note": "Gives the Paladin a chance to deal additional Holy damage equal to 70% of melee damage. Only one Seal can be active on the Paladin at any one time. Lasts 30 sec. Unleashing th"
  },
  "442": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "443": {
    "status": "proc-or-conditional",
    "note": "Puts the enemy target in a state of meditation, incapacitating them for up to 6 sec. Any damage caused will awaken the target. If the target is immune to the effect, they repe"
  },
  "444": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "445": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "446": {
    "status": "active-or-non-stat",
    "note": "Casting Judgement reduces the casting time of your next Holy Light by 1 sec."
  },
  "447": {
    "status": "proc-or-conditional",
    "note": "Gives your Flash of Light and Holy Light spells a 70% chance to not lose casting time when you take damage."
  },
  "448": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "449": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "450": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "451": {
    "status": "ability-specific",
    "note": "Gives the target of your Lay on Hands spell a 30% bonus to their armor value from items for 2 min. In addition, the cooldown for your Lay on Hands spell is reduced by 20 min."
  },
  "452": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "453": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "454": {
    "status": "proc-or-conditional",
    "note": "After getting a critical effect from your Flash of Light, Holy Light, or Holy Shock heal spell, you regain Mana equal to 60% of the base cost of the spell."
  },
  "455": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "456": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "457": {
    "status": "proc-or-conditional",
    "note": "Blasts the target with Holy energy, causing 97 to 104 Holy damage to an enemy, or 311 to 320 healing to an ally. Casting Holy Shock has a chance to have no cooldown for its ne"
  },
  "458": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "459": {
    "status": "proc-or-conditional",
    "note": "Crusader Strike has a 100% chance to reset the cooldown of your Holy Shock. In addition, the healing effect of your Holy Strike is increased by 100% and benefits from an addit"
  },
  "460": {
    "status": "proc-or-conditional",
    "note": "Critically healing an ally applies Daybreak for 30 sec. When the ally takes damage, Daybreak is consumed to heal them for 248 to 289."
  },
  "461": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "462": {
    "status": "proc-or-conditional",
    "note": "Successful melee and ranged attacks against you have a 10% chance to increase your chance to block by 15%. Lasts 10 sec or 5 blocks."
  },
  "463": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "464": {
    "status": "ability-specific",
    "note": "Reduces the cooldown of your Hand of Protection by 120 sec and increases the duration of your Hand of Freedom by 6 sec."
  },
  "465": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "466": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "467": {
    "status": "proc-or-conditional",
    "note": "Places a Blessing on the friendly target, reducing damage taken from all sources by up to 10 for 10 min. In addition, when the target blocks a melee attack, the attacker takes"
  },
  "468": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "469": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "470": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "471": {
    "status": "ability-specific",
    "note": "Decreases the cooldown of your Hammer of Justice spell by 15 sec."
  },
  "472": {
    "status": "proc-or-conditional",
    "note": "While Righteous Fury is active, your damage taken is reduced by 10%."
  },
  "473": {
    "status": "proc-or-conditional",
    "note": "Increases chance to block by 45% for 10 sec. While active, each blocked attack deals 35 Holy damage to the attacker. Damage caused by Holy Shield generates 50% additional thre"
  },
  "474": {
    "status": "proc-or-conditional",
    "note": "Gives you a 50% chance after blocking an attack to generate an additional attack."
  },
  "475": {
    "status": "ability-specific",
    "note": "Increases the threat generated by your Holy Strike by 25% and its damage by 25%. In addition, Crusader Strike grants Zealous Defense, reducing the damage of the next blocked a"
  },
  "476": {
    "status": "proc-or-conditional",
    "note": "Bash the target with your shield, dealing 274 to 301 Holy damage and reducing the damage you take by 30% for 12 sec."
  }
};
