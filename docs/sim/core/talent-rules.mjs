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
  "57": [
    {
      "kind": "scoped",
      "scope": "Stance switching",
      "stat": "rageRetained",
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
  "62": [
    {
      "kind": "pending",
      "note": "Master Strike is an activated weapon-dependent ability: damage and mace/sword/axe/polearm outcomes require an attack and target-state model"
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
  "64": [
    {
      "kind": "pending",
      "note": "Critical hits trigger Deep Wounds over time based on weapon average damage; uptime, tick and crit modelling pending"
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
    },
    {
      "kind": "weapon",
      "weapon": "polearm",
      "stat": "rangeYards",
      "param": 3
    }
  ],
  "68": [
    {
      "kind": "pending",
      "note": "Sweeping Strikes is a five-charge on-use multi-target effect; requires target count and charge consumption"
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
  "73": [
    {
      "kind": "pending",
      "note": "Mortal Strike active weapon strike plus target-healing reduction; no attack table or target healing model yet"
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
      "param": 1,
      "when": {
        "shield": true
      }
    }
  ],
  "79": [
    {
      "kind": "pending",
      "note": "Last Stand temporarily increases maximum health and later removes it; cannot count as baseline health"
    }
  ],
  "80": [
    {
      "kind": "pending",
      "note": "Temporary movement-impairment immunity follows active Intervene use"
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
    },
    {
      "kind": "scoped",
      "scope": "Revenge",
      "stat": "stunDurationSeconds",
      "param": 0,
      "values": [
        3,
        3,
        3
      ]
    }
  ],
  "83": [
    {
      "kind": "pending",
      "note": "Shield Slam dispel and Shield Bash silence require successful active attacks and target auras"
    }
  ],
  "84": [
    {
      "kind": "scoped",
      "scope": "Disarm",
      "stat": "cooldownReductionSeconds",
      "param": 0
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
  "87": [
    {
      "kind": "pending",
      "note": "Shield Slam is an active damage/threat/dispel ability; requires shield block value and ability attack resolution"
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
  "91": [
    {
      "kind": "scoped",
      "scope": "Non-Defensive stance with shield",
      "stat": "retainedDefensiveThreatPct",
      "param": 0,
      "when": {
        "shield": true,
        "stance": [
          "Battle",
          "Berserker"
        ]
      }
    }
  ],
  "92": [
    {
      "kind": "pending",
      "note": "Concussion Blow is an active shield-related strike with stun, threat, full armour penetration and rage generation"
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
      "param": 1
    }
  ],
  "96": [
    {
      "kind": "pending",
      "note": "Chance-based rage generated on weapon hits, doubled for two-handed weapons; requires attack event timing"
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
    },
    {
      "kind": "buff",
      "source": "battle-shout",
      "stat": "ap",
      "param": 0,
      "note": "Only the selected battle-shout buff is enhanced; unrelated buffs are unchanged"
    }
  ],
  "98": [
    {
      "kind": "pending",
      "note": "Piercing Howl is an active nearby-area snare; no target movement or area combat engine"
    }
  ],
  "99": [
    {
      "kind": "pending",
      "note": "Blood Craze heals after receiving a critical strike; needs incoming combat events"
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
  "101": [
    {
      "kind": "pending",
      "note": "Enrage 8-second melee-damage proc requires received critical-hit events and uptime"
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
    },
    {
      "kind": "scoped",
      "scope": "Pummel",
      "stat": "slowChancePct",
      "param": 0
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
  "104": [
    {
      "kind": "pending",
      "note": "Death Wish on-use temporary damage/fear/armour/resistance trade-off; must not count permanently"
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
  "106": [
    {
      "kind": "scoped",
      "scope": "Berserker Rage activation",
      "stat": "rageGenerated",
      "param": 0
    },
    {
      "kind": "pending",
      "note": "Movement impairment break occurs when Berserker Rage is activated"
    }
  ],
  "107": [
    {
      "kind": "pending",
      "note": "Flurry is a three-swing proc, not permanent attack speed"
    }
  ],
  "108": [
    {
      "kind": "pending",
      "note": "Blood Drinker restores health per melee strike only while Enrage/Death Wish/Recklessness is active; requires aura and attack events"
    }
  ],
  "109": [
    {
      "kind": "pending",
      "note": "Bloodthirst active physical strike and 6-second movement buff require attack and aura models"
    }
  ]
};
export const TALENT_COVERAGE={
  "56": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "57": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
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
    "note": "Master Strike is an activated weapon-dependent ability: damage and mace/sword/axe/polearm outcomes require an attack and target-state model"
  },
  "63": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "64": {
    "status": "proc-or-conditional",
    "note": "Critical hits trigger Deep Wounds over time based on weapon average damage; uptime, tick and crit modelling pending"
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
    "note": "Sweeping Strikes is a five-charge on-use multi-target effect; requires target count and charge consumption"
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
    "note": "Mortal Strike active weapon strike plus target-healing reduction; no attack table or target healing model yet"
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
    "note": "Last Stand temporarily increases maximum health and later removes it; cannot count as baseline health"
  },
  "80": {
    "status": "proc-or-conditional",
    "note": "Temporary movement-impairment immunity follows active Intervene use"
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
    "note": "Shield Slam dispel and Shield Bash silence require successful active attacks and target auras"
  },
  "84": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
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
    "note": "Shield Slam is an active damage/threat/dispel ability; requires shield block value and ability attack resolution"
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
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
  },
  "92": {
    "status": "proc-or-conditional",
    "note": "Concussion Blow is an active shield-related strike with stun, threat, full armour penetration and rage generation"
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
    "note": "Chance-based rage generated on weapon hits, doubled for two-handed weapons; requires attack event timing"
  },
  "97": {
    "status": "partial",
    "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
  },
  "98": {
    "status": "proc-or-conditional",
    "note": "Piercing Howl is an active nearby-area snare; no target movement or area combat engine"
  },
  "99": {
    "status": "proc-or-conditional",
    "note": "Blood Craze heals after receiving a critical strike; needs incoming combat events"
  },
  "100": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "101": {
    "status": "proc-or-conditional",
    "note": "Enrage 8-second melee-damage proc requires received critical-hit events and uptime"
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
    "note": "Death Wish on-use temporary damage/fear/armour/resistance trade-off; must not count permanently"
  },
  "105": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "106": {
    "status": "partial",
    "note": "Movement impairment break occurs when Berserker Rage is activated"
  },
  "107": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "108": {
    "status": "proc-or-conditional",
    "note": "Blood Drinker restores health per melee strike only while Enrage/Death Wish/Recklessness is active; requires aura and attack events"
  },
  "109": {
    "status": "proc-or-conditional",
    "note": "Bloodthirst active physical strike and 6-second movement buff require attack and aura models"
  }
};
