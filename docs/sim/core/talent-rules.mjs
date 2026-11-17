/* All 54 warrior talents reviewed against https://octowow.st/talents/warrior/; snapshot SHA256 b8b800af1b9e2927d3fc7647a155fcf7fc87f216f520b8bf3d2782d2bf2879a2. */
export const AUDITED_CLASS="warrior";
export const TALENT_RULES={
  "56": [
    {
      "kind": "scoped",
      "scope": "Heroic Strike",
      "stat": "rageCostReduction",
      "param": 0
    }
  ],
  "58": [
    {
      "kind": "scoped",
      "scope": "Rend bleed",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "59": [
    {
      "kind": "scoped",
      "scope": "Charge",
      "stat": "rageGained",
      "param": 0
    }
  ],
  "60": [
    {
      "kind": "global",
      "stat": "parry",
      "param": 0
    }
  ],
  "61": [
    {
      "kind": "scoped",
      "scope": "Thunder Clap",
      "stat": "rageCostReduction",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Thunder Clap",
      "stat": "damagePct",
      "param": 1
    }
  ],
  "63": [
    {
      "kind": "scoped",
      "scope": "Overpower",
      "stat": "criticalChance",
      "param": 0
    }
  ],
  "65": [
    {
      "kind": "weapon",
      "weapon": "twohand",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "weapon",
      "weapon": "twohand",
      "stat": "skill",
      "param": 1
    }
  ],
  "66": [
    {
      "kind": "scoped",
      "scope": "Battle/Defensive/Berserker abilities",
      "stat": "criticalDamage",
      "param": 0
    }
  ],
  "67": [
    {
      "kind": "weapon",
      "weapon": "axe",
      "stat": "crit",
      "param": 0
    },
    {
      "kind": "weapon",
      "weapon": "mace",
      "stat": "armorPen",
      "param": 1,
      "perLevel": true
    },
    {
      "kind": "pending",
      "note": "Sword extra-attack proc and polearm range require combat/range support"
    }
  ],
  "69": [
    {
      "kind": "special",
      "stat": "maxRage",
      "param": 0
    }
  ],
  "70": [
    {
      "kind": "scoped",
      "scope": "Retaliation/Recklessness/Shield Wall",
      "stat": "cooldownReductionMinutes",
      "param": 0
    }
  ],
  "71": [
    {
      "kind": "scoped",
      "scope": "Slam",
      "stat": "castTimeReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Slam",
      "stat": "globalCooldownReductionSeconds",
      "param": 0
    }
  ],
  "72": [
    {
      "kind": "scoped",
      "scope": "Execute per extra Rage",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "74": [
    {
      "kind": "scoped",
      "scope": "Bloodrage",
      "stat": "instantRageGained",
      "param": 0
    }
  ],
  "75": [
    {
      "kind": "special",
      "stat": "blockChance",
      "param": 0,
      "when": {
        "shield": true
      }
    },
    {
      "kind": "pending",
      "note": "Rage generated after a successful block requires combat simulation"
    }
  ],
  "76": [
    {
      "kind": "global",
      "stat": "defense",
      "param": 0
    }
  ],
  "77": [
    {
      "kind": "scoped",
      "scope": "Stun/Charm",
      "stat": "resistChancePct",
      "param": 0
    }
  ],
  "78": [
    {
      "kind": "special",
      "stat": "itemArmourPct",
      "param": 0
    },
    {
      "kind": "special",
      "stat": "shieldBlockValuePct",
      "param": 1
    }
  ],
  "81": [
    {
      "kind": "scoped",
      "scope": "Taunt",
      "stat": "cooldownReductionSeconds",
      "param": 0
    }
  ],
  "82": [
    {
      "kind": "scoped",
      "scope": "Revenge",
      "stat": "stunChancePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Revenge",
      "stat": "cooldownReductionSeconds",
      "param": 1
    }
  ],
  "85": [
    {
      "kind": "scoped",
      "scope": "Defensive Stance",
      "stat": "threatPct",
      "param": 0,
      "when": {
        "stance": "Defensive"
      }
    }
  ],
  "86": [
    {
      "kind": "weapon",
      "weapon": "onehand",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "88": [
    {
      "kind": "scoped",
      "scope": "Shield Slam",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "pending",
      "note": "Temporary next-attack block chance requires an event model"
    }
  ],
  "89": [
    {
      "kind": "scoped",
      "scope": "Revenge",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "pending",
      "note": "Refund Rage on hit is event-dependent"
    }
  ],
  "90": [
    {
      "kind": "scoped",
      "scope": "Shield Wall",
      "stat": "durationIncreaseSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Shield Wall",
      "stat": "cooldownReductionMinutes",
      "param": 1
    }
  ],
  "93": [
    {
      "kind": "scoped",
      "scope": "Shouts",
      "stat": "areaOfEffectPct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Battle/Demoralizing Shout",
      "stat": "durationPct",
      "param": 1
    }
  ],
  "94": [
    {
      "kind": "global",
      "stat": "crit",
      "param": 0
    }
  ],
  "95": [
    {
      "kind": "offhand",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "offhand",
      "stat": "hit",
      "param": 0
    }
  ],
  "97": [
    {
      "kind": "pending",
      "note": "Increases the strength of selected shouts; buff source/stacking verification needed"
    },
    {
      "kind": "scoped",
      "scope": "Battle Shout",
      "stat": "attackPowerBonusPct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Demoralizing Shout",
      "stat": "attackPowerReductionPct",
      "param": 1
    }
  ],
  "100": [
    {
      "kind": "scoped",
      "scope": "Intercept/Intervene",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Charge",
      "stat": "cooldownReductionSeconds",
      "param": 1
    }
  ],
  "102": [
    {
      "kind": "scoped",
      "scope": "Pummel school lockout",
      "stat": "durationIncreaseSeconds",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "Pummel slow is proc/ability-specific"
    }
  ],
  "103": [
    {
      "kind": "scoped",
      "scope": "Whirlwind",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Cleave",
      "stat": "rageCostReduction",
      "param": 1
    }
  ],
  "105": [
    {
      "kind": "scoped",
      "scope": "Execute",
      "stat": "rageCostReduction",
      "param": 0
    }
  ],
  "107": [
    {
      "kind": "pending",
      "note": "Flurry is a three-swing proc, not permanent attack speed"
    }
  ]
};
export const TALENT_COVERAGE={
  "56": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "57": {
    "status": "proc-or-conditional",
    "note": "You retain up to 25 of your rage points when you change stances."
  },
  "58": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "59": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "60": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "61": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "62": {
    "status": "proc-or-conditional",
    "note": "Performs a skillful attack, dealing 35% weapon damage and causing an additional effect depending on your main hand weapon. Mace: Disorients the target for 3 sec. Any damage ca"
  },
  "63": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "64": {
    "status": "ability-specific",
    "note": "Your critical strikes cause the opponent to bleed, dealing 60% of your melee weapon's average damage over 6 sec."
  },
  "65": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "66": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "67": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "68": {
    "status": "proc-or-conditional",
    "note": "Your next 5 abilities and main-hand melee attacks strike an additional nearby opponent."
  },
  "69": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "70": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "71": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "72": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "73": {
    "status": "proc-or-conditional",
    "note": "A vicious strike that deals 115% weapon damage and wounds the target, reducing the effectiveness of any healing by 50% for 10 sec."
  },
  "74": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "75": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "76": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "77": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "78": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "79": {
    "status": "proc-or-conditional",
    "note": "When activated, this ability temporarily grants you 30% of your maximum hit points for 20 seconds. After the effect expires, the hit points are lost."
  },
  "80": {
    "status": "proc-or-conditional",
    "note": "Grants a 100% chance to gain immunity to movement impairing effects for 3 sec after using Intervene."
  },
  "81": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "82": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "83": {
    "status": "proc-or-conditional",
    "note": "Your Shield Slam has an additional 100% chance to dispel 1 magic effect on the target and your Shield Bash ability has a 100% chance to silence the target for 3 sec."
  },
  "84": {
    "status": "ability-specific",
    "note": "Decreases the cooldown of your Disarm ability by 20 secs."
  },
  "85": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "86": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "87": {
    "status": "proc-or-conditional",
    "note": "Slam the target with your shield, causing 174 to 184 damage, modified by your shield block value and attack power. This attack causes a high amount of threat, and has a 50% ch"
  },
  "88": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "89": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "90": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "91": {
    "status": "proc-or-conditional",
    "note": "While wearing a shield, you retain 180% of the increased threat generation from Defensive Stance in other stances."
  },
  "92": {
    "status": "proc-or-conditional",
    "note": "Deals 115 damage and stuns the opponent for 3 sec. This ability deals a high amount of threat and penetrates 100% of the enemy's armor. Instantly generates 10 rage."
  },
  "93": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "94": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "95": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "96": {
    "status": "proc-or-conditional",
    "note": "Gives you a 75% chance to generate an additional Rage point when you deal melee damage with a weapon. The effect is doubled for two-handed weapons."
  },
  "97": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "98": {
    "status": "proc-or-conditional",
    "note": "Causes all enemies near the warrior to be dazed, reducing movement speed by 50% for 6 sec."
  },
  "99": {
    "status": "proc-or-conditional",
    "note": "Regenerates 6% of your total Health over 6 sec after being the victim of a critical strike."
  },
  "100": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "101": {
    "status": "proc-or-conditional",
    "note": "Gives you a 20% melee damage bonus for 8 sec after being the victim of a critical strike."
  },
  "102": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "103": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "104": {
    "status": "proc-or-conditional",
    "note": "When activated, increases your physical damage by 20% and makes you immune to Fear effects, but lowers your armor and all resistances by 20%. Lasts 30 sec."
  },
  "105": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "106": {
    "status": "proc-or-conditional",
    "note": "Using Berserker Rage generates 10 Rage and grants a 100% chance to break free from movement impairing effects when activated."
  },
  "107": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "108": {
    "status": "proc-or-conditional",
    "note": "While affected by Enrage, Death Wish, or Recklessness, your melee attacks and abilities restore 2% of your maximum health."
  },
  "109": {
    "status": "proc-or-conditional",
    "note": "Instantly perform a reckless attack, dealing 100 damage plus 35% of your Attack Power and increasing your movement speed by 10% for 6 sec."
  }
};
