// Consolidated source-labelled talent catalogue. An audit is not a validated combat implementation.
export const TALENT_AUDITS = {
  "warrior": {
    "sourceBranch": "audit/talent-effects-warrior",
    "sourceBlob": "046c980fdaf97e88589bf969b3bb56b01c44092f",
    "sourceNote": "/* All 54 warrior talents reviewed against https://octowow.st/talents/warrior/; snapshot SHA256 b8b800af1b9e2927d3fc7647a155fcf7fc87f216f520b8bf3d2782d2bf2879a2. */",
    "rules": {
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
    },
    "coverage": {
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
    }
  },
  "rogue": {
    "sourceBranch": "audit/talent-effects-rogue",
    "sourceBlob": "30bc117a70bff519b0d4c811d3ca32e333cfce70",
    "sourceNote": "/* All 56 rogue talents reviewed against https://octowow.st/talents/rogue/; snapshot SHA256 865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65. */",
    "rules": {
      "110": [
        {
          "kind": "scoped",
          "scope": "Backstab/Garrote/Ambush from behind",
          "stat": "damagePct",
          "param": 0,
          "when": {
            "attackPosition": "Behind"
          }
        }
      ],
      "111": [
        {
          "kind": "global",
          "stat": "dodge",
          "param": 0
        }
      ],
      "112": [
        {
          "kind": "global",
          "stat": "parry",
          "param": 0
        }
      ],
      "113": [
        {
          "kind": "scoped",
          "scope": "Backstab",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Backstab also has a chance to add a combo point; no proc/event model"
        },
        {
          "kind": "scoped",
          "scope": "Backstab",
          "stat": "extraComboPointChancePct",
          "param": 1
        }
      ],
      "114": [
        {
          "kind": "global",
          "stat": "hit",
          "param": 0
        }
      ],
      "115": [
        {
          "kind": "pending",
          "note": "Riposte is an attack enabled after a successful parry, with damage and target disarm"
        }
      ],
      "116": [
        {
          "kind": "pending",
          "note": "Improved Sprint breaks movement impairments only when Sprint is activated"
        }
      ],
      "117": [
        {
          "kind": "pending",
          "note": "Setup gives combo points after dodging a hit or resisting a spell"
        }
      ],
      "118": [
        {
          "kind": "pending",
          "note": "Improved Kick applies a target silence when Kick lands"
        }
      ],
      "119": [
        {
          "kind": "pending",
          "note": "Concussive Blows mace stuns are chance-on-hit effects; not permanent critical chance"
        }
      ],
      "120": [
        {
          "kind": "offhand",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "121": [
        {
          "kind": "weapon",
          "weapon": "mace",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "weapon",
          "weapon": "dagger",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "weapon",
          "weapon": "fist",
          "stat": "crit",
          "param": 0
        }
      ],
      "122": [
        {
          "kind": "pending",
          "note": "Surprise Attack only enables following an enemy dodge and must use an attack table"
        }
      ],
      "123": [
        {
          "kind": "pending",
          "note": "Hack and Slash extra sword/axe attack chance needs melee hit events"
        }
      ],
      "124": [
        {
          "kind": "weapon",
          "weapon": "expertise-weapons",
          "stat": "skill",
          "param": 0
        }
      ],
      "125": [
        {
          "kind": "special",
          "stat": "meleeHastePct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Agility-based Energy tick reduction requires a resource model"
        }
      ],
      "126": [
        {
          "kind": "scoped",
          "scope": "Sinister Strike/Eviscerate/Riposte/Surprise Attack",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "127": [
        {
          "kind": "pending",
          "note": "Adrenaline Rush doubles Energy regeneration only while the timed ability is active"
        }
      ],
      "128": [
        {
          "kind": "scoped",
          "scope": "Eviscerate",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "129": [
        {
          "kind": "pending",
          "note": "Remorseless Attacks critical bonus activates after killing an eligible enemy and affects the next qualifying opener"
        }
      ],
      "130": [
        {
          "kind": "global",
          "stat": "crit",
          "param": 0
        }
      ],
      "131": [
        {
          "kind": "pending",
          "note": "Ruthlessness generates combo points probabilistically when finishing moves execute"
        }
      ],
      "132": [
        {
          "kind": "scoped",
          "scope": "Humanoid/Giant/Beast/Dragonkin targets",
          "stat": "damagePct",
          "param": 0,
          "when": {
            "targetCreature": [
              "Humanoid",
              "Giant",
              "Beast",
              "Dragonkin"
            ]
          }
        }
      ],
      "133": [
        {
          "kind": "scoped",
          "scope": "Slice and Dice/Flourish",
          "stat": "durationPct",
          "param": 0
        }
      ],
      "134": [
        {
          "kind": "pending",
          "note": "Relentless Strikes provides finisher-triggered energy refund and temporary stacking damage effects"
        }
      ],
      "135": [
        {
          "kind": "scoped",
          "scope": "Throw/Deadly Throw",
          "stat": "rangeIncreaseYards",
          "param": 0
        }
      ],
      "136": [
        {
          "kind": "scoped",
          "scope": "Combo-point generators",
          "stat": "criticalDamage",
          "param": 0
        }
      ],
      "137": [
        {
          "kind": "scoped",
          "scope": "Rupture",
          "stat": "durationIncreaseSeconds",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Melee damage bonus per combo point is a temporary Rupture aura"
        }
      ],
      "138": [
        {
          "kind": "scoped",
          "scope": "Poisons",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Poison dispels",
          "stat": "resistChancePct",
          "param": 1
        }
      ],
      "139": [
        {
          "kind": "global",
          "stat": "poisonChance",
          "param": 0
        }
      ],
      "140": [
        {
          "kind": "scoped",
          "scope": "Poison application",
          "stat": "resistReductionPct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Chance not to consume poison charges is event-driven"
        }
      ],
      "141": [
        {
          "kind": "pending",
          "note": "Envenom finisher duration/effectiveness varies by combo points and requires target poison state"
        }
      ],
      "142": [
        {
          "kind": "pending",
          "note": "Cold Blood on-use guarantees a critical on the next eligible ability; not permanent crit"
        }
      ],
      "143": [
        {
          "kind": "special",
          "stat": "maxEnergy",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Energy on poison application is event-driven"
        }
      ],
      "144": [
        {
          "kind": "pending",
          "note": "Seal Fate only grants an extra combo point after critical combo-point-builder attacks"
        }
      ],
      "145": [
        {
          "kind": "pending",
          "note": "Noxious Assault active dual-weapon strike triggers both poisons and awards a combo point"
        }
      ],
      "146": [
        {
          "kind": "scoped",
          "scope": "Stealth movement",
          "stat": "movementSpeedPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Stealth",
          "stat": "cooldownReductionSeconds",
          "param": 1
        }
      ],
      "147": [
        {
          "kind": "scoped",
          "scope": "Expose Armor",
          "stat": "armourReductionPct",
          "param": 0
        }
      ],
      "148": [
        {
          "kind": "scoped",
          "scope": "Gouge",
          "stat": "durationIncreaseSeconds",
          "param": 0
        }
      ],
      "149": [
        {
          "kind": "scoped",
          "scope": "Ambush",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Noncritical Ambush refunds Energy; no event model"
        },
        {
          "kind": "scoped",
          "scope": "Ambush",
          "stat": "energyRefundOnNonCrit",
          "param": 1
        }
      ],
      "150": [
        {
          "kind": "pending",
          "note": "Official Elusiveness rank values have conflicting units: 45 min at rank 1 and 1.5 min at rank 2; live verification required"
        }
      ],
      "151": [
        {
          "kind": "global",
          "stat": "armorPen",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Rupture/Garrote",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "152": [
        {
          "kind": "pending",
          "note": "Initiative awards extra combo points on successful opening abilities"
        }
      ],
      "153": [
        {
          "kind": "scoped",
          "scope": "Ghostly Strike",
          "stat": "energyCostReduction",
          "param": 2
        },
        {
          "kind": "pending",
          "note": "Ghostly Strike grants short-lived self/party movement speed effects after use"
        }
      ],
      "154": [
        {
          "kind": "pending",
          "note": "Smoke Bomb reduces hit chance inside its temporary area; requires target positioning and aura state"
        }
      ],
      "155": [
        {
          "kind": "pending",
          "note": "Hemorrhage active ability applies physical vulnerability charges with duration; not permanent global damage"
        }
      ],
      "156": [
        {
          "kind": "pending",
          "note": "Cloaked in Shadows only generates a temporary barrier after Vanish"
        }
      ],
      "157": [
        {
          "kind": "pending",
          "note": "Blackjack debuff and return-to-stealth only occur after Sap/Blind action outcomes"
        }
      ],
      "158": [
        {
          "kind": "scoped",
          "scope": "Distract",
          "stat": "energyCostReduction",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Hit reduction debuff requires a target-aura model"
        }
      ],
      "159": [
        {
          "kind": "scoped",
          "scope": "Cheap Shot/Garrote",
          "stat": "energyCostReduction",
          "param": 0
        }
      ],
      "160": [
        {
          "kind": "pending",
          "note": "Preparation actively resets cooldowns and requires per-ability timers"
        }
      ],
      "161": [
        {
          "kind": "pending",
          "note": "Shadow of Death finishing move captures incoming damage then releases it based on target state"
        }
      ],
      "162": [
        {
          "kind": "scoped",
          "scope": "Hemorrhage",
          "stat": "energyCostReduction",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Hemorrhage physical vulnerability",
          "stat": "damageBonusPct",
          "param": 1
        }
      ],
      "163": [
        {
          "kind": "pending",
          "note": "Honor Among Thieves generates Energy after party critical hits; requires shared party events"
        }
      ],
      "164": [
        {
          "kind": "pending",
          "note": "Tricks of the Trade temporarily buffs party crit after openers/finishers and stacks; not a personal passive"
        }
      ],
      "165": [
        {
          "kind": "pending",
          "note": "Mark for Death is an active strike applying a party AP/SP vulnerability effect with duration"
        }
      ]
    },
    "coverage": {
      "110": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "111": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "112": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "113": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "114": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "115": {
        "status": "proc-or-conditional",
        "note": "Riposte is an attack enabled after a successful parry, with damage and target disarm"
      },
      "116": {
        "status": "proc-or-conditional",
        "note": "Improved Sprint breaks movement impairments only when Sprint is activated"
      },
      "117": {
        "status": "proc-or-conditional",
        "note": "Setup gives combo points after dodging a hit or resisting a spell"
      },
      "118": {
        "status": "proc-or-conditional",
        "note": "Improved Kick applies a target silence when Kick lands"
      },
      "119": {
        "status": "proc-or-conditional",
        "note": "Concussive Blows mace stuns are chance-on-hit effects; not permanent critical chance"
      },
      "120": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "121": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "122": {
        "status": "proc-or-conditional",
        "note": "Surprise Attack only enables following an enemy dodge and must use an attack table"
      },
      "123": {
        "status": "proc-or-conditional",
        "note": "Hack and Slash extra sword/axe attack chance needs melee hit events"
      },
      "124": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "125": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "126": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "127": {
        "status": "proc-or-conditional",
        "note": "Adrenaline Rush doubles Energy regeneration only while the timed ability is active"
      },
      "128": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "129": {
        "status": "proc-or-conditional",
        "note": "Remorseless Attacks critical bonus activates after killing an eligible enemy and affects the next qualifying opener"
      },
      "130": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "131": {
        "status": "proc-or-conditional",
        "note": "Ruthlessness generates combo points probabilistically when finishing moves execute"
      },
      "132": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "133": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "134": {
        "status": "proc-or-conditional",
        "note": "Relentless Strikes provides finisher-triggered energy refund and temporary stacking damage effects"
      },
      "135": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "136": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "137": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "138": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "139": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "140": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "141": {
        "status": "proc-or-conditional",
        "note": "Envenom finisher duration/effectiveness varies by combo points and requires target poison state"
      },
      "142": {
        "status": "proc-or-conditional",
        "note": "Cold Blood on-use guarantees a critical on the next eligible ability; not permanent crit"
      },
      "143": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "144": {
        "status": "proc-or-conditional",
        "note": "Seal Fate only grants an extra combo point after critical combo-point-builder attacks"
      },
      "145": {
        "status": "proc-or-conditional",
        "note": "Noxious Assault active dual-weapon strike triggers both poisons and awards a combo point"
      },
      "146": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "147": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "148": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "149": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "150": {
        "status": "proc-or-conditional",
        "note": "Official Elusiveness rank values have conflicting units: 45 min at rank 1 and 1.5 min at rank 2; live verification required"
      },
      "151": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "152": {
        "status": "proc-or-conditional",
        "note": "Initiative awards extra combo points on successful opening abilities"
      },
      "153": {
        "status": "partial",
        "note": "Ghostly Strike grants short-lived self/party movement speed effects after use"
      },
      "154": {
        "status": "proc-or-conditional",
        "note": "Smoke Bomb reduces hit chance inside its temporary area; requires target positioning and aura state"
      },
      "155": {
        "status": "proc-or-conditional",
        "note": "Hemorrhage active ability applies physical vulnerability charges with duration; not permanent global damage"
      },
      "156": {
        "status": "proc-or-conditional",
        "note": "Cloaked in Shadows only generates a temporary barrier after Vanish"
      },
      "157": {
        "status": "proc-or-conditional",
        "note": "Blackjack debuff and return-to-stealth only occur after Sap/Blind action outcomes"
      },
      "158": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "159": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "160": {
        "status": "proc-or-conditional",
        "note": "Preparation actively resets cooldowns and requires per-ability timers"
      },
      "161": {
        "status": "proc-or-conditional",
        "note": "Shadow of Death finishing move captures incoming damage then releases it based on target state"
      },
      "162": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "163": {
        "status": "proc-or-conditional",
        "note": "Honor Among Thieves generates Energy after party critical hits; requires shared party events"
      },
      "164": {
        "status": "proc-or-conditional",
        "note": "Tricks of the Trade temporarily buffs party crit after openers/finishers and stacks; not a personal passive"
      },
      "165": {
        "status": "proc-or-conditional",
        "note": "Mark for Death is an active strike applying a party AP/SP vulnerability effect with duration"
      }
    }
  },
  "paladin": {
    "sourceBranch": "audit/talent-effects-paladin",
    "sourceBlob": "711a7fa05d97e52786ae1a68f223cfd658651d31",
    "sourceNote": "/* All 49 paladin talents reviewed against https://octowow.st/talents/paladin/; snapshot SHA256 16f76bfbdb4faba8636986e58db45a38ccc6ef84e83395d99ce7c7849de35ee4. */",
    "rules": {
      "428": [
        {
          "kind": "scoped",
          "scope": "Blessing of Might/Wisdom",
          "stat": "effectivenessPct",
          "param": 0
        },
        {
          "kind": "buff",
          "source": "might",
          "stat": "ap",
          "param": 0,
          "note": "Only the selected might buff is enhanced; unrelated buffs are unchanged"
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
      "430": [
        {
          "kind": "scoped",
          "scope": "Judgement",
          "stat": "cooldownReductionSeconds",
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
      "435": [
        {
          "kind": "pending",
          "note": "Blessing of Kings talent grants the castable Blessing; stats only apply if the Kings buff is actually selected"
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
      "438": [
        {
          "kind": "pending",
          "note": "Vindication chance on damaging melee attack applies a limited-level target damage debuff for 10 seconds"
        }
      ],
      "439": [
        {
          "kind": "pending",
          "note": "Eye for an Eye reflects incoming spell-critical damage with a health-based cap"
        }
      ],
      "440": [
        {
          "kind": "pending",
          "note": "Vengeance damage/threat modifiers stack on critical effects for 30 seconds; proc uptime is not permanent"
        }
      ],
      "441": [
        {
          "kind": "pending",
          "note": "Seal of Command requires selecting the seal, resolving procs and Judgement; no always-on flat damage bonus"
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
      "443": [
        {
          "kind": "pending",
          "note": "Repentance crowd control or immunity fallback damage requires a target/ability model"
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
      "446": [
        {
          "kind": "pending",
          "note": "Holy Judgement only modifies the next Holy Light after casting Judgement; needs triggered spell state"
        }
      ],
      "447": [
        {
          "kind": "scoped",
          "scope": "Flash of Light/Holy Light",
          "stat": "pushbackResistancePct",
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
        },
        {
          "kind": "spell",
          "scope": "Holy",
          "stat": "damagePct",
          "param": 0,
          "values": [
            10
          ],
          "when": {
            "aura": "Sanctity Aura"
          }
        }
      ],
      "451": [
        {
          "kind": "scoped",
          "scope": "Lay on Hands",
          "stat": "cooldownReductionMinutes",
          "param": 1
        },
        {
          "kind": "pending",
          "note": "Target receives a temporary item armour buff after Lay on Hands; not a personal permanent armour stat"
        },
        {
          "kind": "scoped",
          "scope": "Lay on Hands",
          "stat": "targetItemArmourPct",
          "param": 0
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
          "param": 0,
          "when": {
            "aura": "Concentration Aura"
          }
        },
        {
          "kind": "scoped",
          "scope": "Concentration Aura",
          "stat": "resistSilenceInterruptPct",
          "param": 1,
          "when": {
            "aura": "Concentration Aura"
          }
        }
      ],
      "454": [
        {
          "kind": "pending",
          "note": "Illumination refunds mana on healing crits; requires spell cast and resource events"
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
      "457": [
        {
          "kind": "pending",
          "note": "Holy Shock is an active damage/healing spell whose cooldown may reset after a cast"
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
      "459": [
        {
          "kind": "pending",
          "note": "Crusader Strike can reset Holy Shock cooldown"
        },
        {
          "kind": "scoped",
          "scope": "Holy Strike healing",
          "stat": "healingPct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Holy Strike healing power",
          "stat": "coefficientBonusPct",
          "param": 2
        }
      ],
      "460": [
        {
          "kind": "pending",
          "note": "Daybreak applies on critical heal and is consumed on later target damage"
        }
      ],
      "461": [
        {
          "kind": "scoped",
          "scope": "Devotion Aura",
          "stat": "armourBonusPct",
          "param": 0,
          "when": {
            "aura": "Devotion Aura"
          }
        }
      ],
      "462": [
        {
          "kind": "pending",
          "note": "Redoubt grants temporary block chance after receiving an attack, ending after time or block charges"
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
      "464": [
        {
          "kind": "scoped",
          "scope": "Hand of Protection",
          "stat": "cooldownReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Hand of Freedom",
          "stat": "durationIncreaseSeconds",
          "param": 1
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
          "param": 0,
          "when": {
            "righteousFury": "On"
          }
        }
      ],
      "467": [
        {
          "kind": "pending",
          "note": "Blessing of Sanctuary must be cast/selected; target damage reduction and block retaliation are not a permanent player bonus"
        }
      ],
      "468": [
        {
          "kind": "special",
          "stat": "shieldBlockValuePct",
          "param": 0,
          "when": {
            "shield": true
          }
        },
        {
          "kind": "pending",
          "note": "Block-triggered mana restoration requires event simulation"
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
      ],
      "471": [
        {
          "kind": "scoped",
          "scope": "Hammer of Justice",
          "stat": "cooldownReductionSeconds",
          "param": 0
        }
      ],
      "472": [
        {
          "kind": "special",
          "stat": "damageTakenReductionPct",
          "param": 0,
          "when": {
            "righteousFury": "On"
          }
        }
      ],
      "473": [
        {
          "kind": "pending",
          "note": "Holy Shield temporary block charges/threat/damage need an on-use ability and attack engine"
        }
      ],
      "474": [
        {
          "kind": "pending",
          "note": "Reckoning grants an extra attack after blocking; cannot increase always-on weapon speed"
        }
      ],
      "475": [
        {
          "kind": "scoped",
          "scope": "Holy Strike",
          "stat": "threatPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Holy Strike",
          "stat": "damagePct",
          "param": 1
        },
        {
          "kind": "pending",
          "note": "Zealous Defense temporarily reduces next blocked attack after Crusader Strike"
        }
      ],
      "476": [
        {
          "kind": "pending",
          "note": "Bulwark of the Righteous shield bash and 12-second damage reduction require an active ability model"
        }
      ]
    },
    "coverage": {
      "428": {
        "status": "partial",
        "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
      },
      "429": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "430": {
        "status": "partial",
        "note": "Active/ability-scoped contribution only; numerical combat validation pending."
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
        "status": "proc-or-conditional",
        "note": "Blessing of Kings talent grants the castable Blessing; stats only apply if the Kings buff is actually selected"
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
        "note": "Vindication chance on damaging melee attack applies a limited-level target damage debuff for 10 seconds"
      },
      "439": {
        "status": "proc-or-conditional",
        "note": "Eye for an Eye reflects incoming spell-critical damage with a health-based cap"
      },
      "440": {
        "status": "proc-or-conditional",
        "note": "Vengeance damage/threat modifiers stack on critical effects for 30 seconds; proc uptime is not permanent"
      },
      "441": {
        "status": "proc-or-conditional",
        "note": "Seal of Command requires selecting the seal, resolving procs and Judgement; no always-on flat damage bonus"
      },
      "442": {
        "status": "partial",
        "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
      },
      "443": {
        "status": "proc-or-conditional",
        "note": "Repentance crowd control or immunity fallback damage requires a target/ability model"
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
        "status": "proc-or-conditional",
        "note": "Holy Judgement only modifies the next Holy Light after casting Judgement; needs triggered spell state"
      },
      "447": {
        "status": "partial",
        "note": "Active/ability-scoped contribution only; numerical combat validation pending."
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
        "status": "partial",
        "note": "Target receives a temporary item armour buff after Lay on Hands; not a personal permanent armour stat"
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
        "note": "Illumination refunds mana on healing crits; requires spell cast and resource events"
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
        "note": "Holy Shock is an active damage/healing spell whose cooldown may reset after a cast"
      },
      "458": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "459": {
        "status": "partial",
        "note": "Crusader Strike can reset Holy Shock cooldown"
      },
      "460": {
        "status": "proc-or-conditional",
        "note": "Daybreak applies on critical heal and is consumed on later target damage"
      },
      "461": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "462": {
        "status": "proc-or-conditional",
        "note": "Redoubt grants temporary block chance after receiving an attack, ending after time or block charges"
      },
      "463": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "464": {
        "status": "partial",
        "note": "Active/ability-scoped contribution only; numerical combat validation pending."
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
        "note": "Blessing of Sanctuary must be cast/selected; target damage reduction and block retaliation are not a permanent player bonus"
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
        "status": "partial",
        "note": "Active/ability-scoped contribution only; numerical combat validation pending."
      },
      "472": {
        "status": "proc-or-conditional",
        "note": "Damage reduction only while Righteous Fury is active; no Righteous Fury state control"
      },
      "473": {
        "status": "proc-or-conditional",
        "note": "Holy Shield temporary block charges/threat/damage need an on-use ability and attack engine"
      },
      "474": {
        "status": "proc-or-conditional",
        "note": "Reckoning grants an extra attack after blocking; cannot increase always-on weapon speed"
      },
      "475": {
        "status": "partial",
        "note": "Zealous Defense temporarily reduces next blocked attack after Crusader Strike"
      },
      "476": {
        "status": "proc-or-conditional",
        "note": "Bulwark of the Righteous shield bash and 12-second damage reduction require an active ability model"
      }
    }
  },
  "hunter": {
    "sourceBranch": "audit/talent-effects-hunter",
    "sourceBlob": "fd1e2c904dc598485381f55d557c2068f688ca93",
    "sourceNote": "/* All 55 hunter talents reviewed against https://octowow.st/talents/hunter/; snapshot SHA256 5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854. */",
    "rules": {
      "373": [
        {
          "kind": "pending",
          "note": "Swift Aspects procs timed ranged or melee attack-speed buffs while the corresponding Hawk/Wolf aspect is active"
        }
      ],
      "374": [
        {
          "kind": "pet",
          "stat": "staminaFromOwnerPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "healthPct",
          "param": 1
        }
      ],
      "375": [
        {
          "kind": "scoped",
          "scope": "Eyes of the Beast",
          "stat": "durationIncreaseSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Eyes of the Beast pet",
          "stat": "damagePct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Eyes of the Beast pet",
          "stat": "focusRegenPct",
          "param": 2
        }
      ],
      "376": [
        {
          "kind": "global",
          "stat": "dodge",
          "param": 0,
          "when": {
            "aspect": "Aspect of the Monkey"
          }
        },
        {
          "kind": "scoped",
          "scope": "Aspect of the Wolf",
          "stat": "meleeDamageHealingPct",
          "param": 1,
          "when": {
            "aspect": "Aspect of the Wolf"
          }
        }
      ],
      "377": [
        {
          "kind": "pet",
          "stat": "armourFromOwnerPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "armourPct",
          "param": 1
        }
      ],
      "378": [
        {
          "kind": "scoped",
          "scope": "Revive Pet",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Revive Pet",
          "stat": "manaCostReductionPct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Revived Pet",
          "stat": "healthPct",
          "param": 2
        }
      ],
      "379": [
        {
          "kind": "scoped",
          "scope": "Aspect of Cheetah/Pack",
          "stat": "movementSpeedPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "movementSpeedPct",
          "param": 1
        }
      ],
      "380": [
        {
          "kind": "pending",
          "note": "Coordinated Assault grants a limited-timing pet extra strike after Arcane/Steady Shot or Raptor Strike"
        }
      ],
      "381": [
        {
          "kind": "pet",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "382": [
        {
          "kind": "pet",
          "stat": "focusRegenPerTick",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "specialCooldownReductionPct",
          "param": 1
        }
      ],
      "383": [
        {
          "kind": "scoped",
          "scope": "Mend Pet",
          "stat": "healingPct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Pet dispel effect is event-driven"
        }
      ],
      "384": [
        {
          "kind": "pet",
          "stat": "crit",
          "param": 0
        }
      ],
      "385": [
        {
          "kind": "pending",
          "note": "Scent of Blood is an owner-hit-triggered temporary pet damage bonus"
        }
      ],
      "386": [
        {
          "kind": "pending",
          "note": "Bestial Wrath is an on-use timed pet damage/CC immunity effect"
        }
      ],
      "387": [
        {
          "kind": "pending",
          "note": "Intimidation applies a stun and threat benefit on the pet's next successful melee attack"
        }
      ],
      "388": [
        {
          "kind": "pet",
          "stat": "hit",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "spellHit",
          "param": 1
        },
        {
          "kind": "pet",
          "stat": "skill",
          "param": 2
        }
      ],
      "389": [
        {
          "kind": "pet",
          "stat": "attackPowerFromOwnerRangedPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "spellPowerFromOwnerRangedPct",
          "param": 1
        },
        {
          "kind": "pet",
          "stat": "ownerAndPetHealthRegenPctPer5s",
          "param": 2
        }
      ],
      "390": [
        {
          "kind": "pending",
          "note": "Frenzy temporarily increases pet attack speed after pet critical strike; not permanent pet haste"
        }
      ],
      "391": [
        {
          "kind": "pending",
          "note": "Kill Command is an active pet attack enabled by the owner's critical strike"
        }
      ],
      "392": [
        {
          "kind": "scoped",
          "scope": "Beast/Giant/Dragonkin/Humanoid targets",
          "stat": "damagePct",
          "param": 0,
          "when": {
            "targetCreature": [
              "Humanoid",
              "Giant",
              "Beast",
              "Dragonkin"
            ]
          }
        },
        {
          "kind": "scoped",
          "scope": "These targets",
          "stat": "criticalDamagePct",
          "param": 1,
          "when": {
            "targetCreature": [
              "Humanoid",
              "Giant",
              "Beast",
              "Dragonkin"
            ]
          }
        }
      ],
      "393": [
        {
          "kind": "scoped",
          "scope": "Traps and melee abilities",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "394": [
        {
          "kind": "global",
          "stat": "parry",
          "param": 0
        },
        {
          "kind": "special",
          "stat": "meleeHastePct",
          "param": 0
        },
        {
          "kind": "ranged",
          "stat": "hastePct",
          "param": 0
        }
      ],
      "395": [
        {
          "kind": "pending",
          "note": "Entrapment gives active trap effects a chance to immobilise their target"
        }
      ],
      "396": [
        {
          "kind": "offhand",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": [
            "Lacerate",
            "Raptor Strike",
            "Mongoose Bite",
            "Carve",
            "Wing Clip"
          ],
          "stat": "crit",
          "param": 1
        }
      ],
      "397": [
        {
          "kind": "pending",
          "note": "Improved Wing Clip gives Wing Clip a chance to immobilise the target"
        }
      ],
      "398": [
        {
          "kind": "scoped",
          "scope": "All damage when no pet",
          "stat": "damagePct",
          "param": 0,
          "when": {
            "pet": "None"
          }
        }
      ],
      "399": [
        {
          "kind": "pending",
          "note": "Planning Ahead modifies traps only if their trigger is delayed more than 5 seconds after placement"
        }
      ],
      "400": [
        {
          "kind": "special",
          "stat": "maxHealthPct",
          "param": 0
        }
      ],
      "401": [
        {
          "kind": "pending",
          "note": "Carve is an active cone attack sharing cooldown with Multi-Shot and requires a multi-target model"
        }
      ],
      "402": [
        {
          "kind": "pending",
          "note": "Deterrence grants temporary dodge/parry on use; must never affect permanent sheet stats"
        }
      ],
      "403": [
        {
          "kind": "pending",
          "note": "Stinging Nettle applies a short Serpent Sting via Mongoose Bite or triggered Fire traps, requiring effect duration and resist handling"
        }
      ],
      "404": [
        {
          "kind": "global",
          "stat": "hit",
          "param": 0
        },
        {
          "kind": "special",
          "stat": "dualWieldHit",
          "param": 1,
          "when": {
            "dualWield": true
          }
        },
        {
          "kind": "pending",
          "note": "Movement-impairing resistance bonus is not a displayed combat stat"
        },
        {
          "kind": "scoped",
          "scope": "Movement impairing effects",
          "stat": "resistChancePct",
          "param": 2
        }
      ],
      "405": [
        {
          "kind": "scoped",
          "scope": "Feign Death",
          "stat": "resistReductionPct",
          "param": 0
        }
      ],
      "406": [
        {
          "kind": "global",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Melee attacks",
          "stat": "criticalDamagePct",
          "param": 1
        }
      ],
      "407": [
        {
          "kind": "scoped",
          "scope": "Frost/Freezing Trap",
          "stat": "durationPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Immolation/Explosive Trap",
          "stat": "damagePct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Trap effects",
          "stat": "resistReductionPct",
          "param": 2
        }
      ],
      "408": [
        {
          "kind": "pending",
          "note": "Lacerate requires a prior critical hit and then deals direct and periodic melee-AP-based damage"
        }
      ],
      "409": [
        {
          "kind": "scoped",
          "scope": "Raptor Strike/Mongoose Bite",
          "stat": "cooldownReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Raptor Strike/Mongoose Bite",
          "stat": "damagePct",
          "param": 1
        }
      ],
      "410": [
        {
          "kind": "percent",
          "stat": "agi",
          "param": 0
        },
        {
          "kind": "special",
          "stat": "apFromAgiPct",
          "param": 1
        }
      ],
      "411": [
        {
          "kind": "pending",
          "note": "Untamed Trapper is a passive with several cross-ability coefficients absent from the rankParameters snapshot; verify the full tooltip and live effect before mapping"
        }
      ],
      "412": [
        {
          "kind": "pending",
          "note": "Improved Concussive Shot adds a chance-based stun from a successful Concussive Shot"
        }
      ],
      "413": [
        {
          "kind": "scoped",
          "scope": "Shots and Stings",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "414": [
        {
          "kind": "scoped",
          "scope": "Serpent Sting",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Viper Sting",
          "stat": "manaDrainPct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Scorpid Sting",
          "stat": "attackSpeedReductionPct",
          "param": 2
        }
      ],
      "415": [
        {
          "kind": "ranged",
          "stat": "crit",
          "param": 0
        }
      ],
      "416": [
        {
          "kind": "scoped",
          "scope": "Ranged weapons",
          "stat": "rangeIncreaseYards",
          "param": 0
        }
      ],
      "417": [
        {
          "kind": "pending",
          "note": "Aimed Shot is an active ranged attack with +70 damage; requires ranged weapon and attack table"
        }
      ],
      "418": [
        {
          "kind": "scoped",
          "scope": "Arcane Shot",
          "stat": "cooldownReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Aimed Shot",
          "stat": "cooldownReductionSeconds",
          "param": 1
        }
      ],
      "419": [
        {
          "kind": "pending",
          "note": "Endless Quiver triggers an extra ranged attack after selected shot hits with no ammo cost"
        }
      ],
      "420": [
        {
          "kind": "ranged",
          "stat": "criticalDamagePct",
          "param": 0
        }
      ],
      "421": [
        {
          "kind": "pending",
          "note": "Scatter Shot is an active short-range ranged strike and disorient"
        }
      ],
      "422": [
        {
          "kind": "pending",
          "note": "Experimental Ammunition switches Aimed Shot secondary element and additional next-attack effects; requires active ammo choice"
        }
      ],
      "423": [
        {
          "kind": "pending",
          "note": "Piercing Shots creates a timed bleed from critical shots; cannot add bleed DPS without event simulation"
        }
      ],
      "424": [
        {
          "kind": "scoped",
          "scope": "Multi-Shot/Volley",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Volley",
          "stat": "castTimeReductionSeconds",
          "param": 1
        }
      ],
      "425": [
        {
          "kind": "scoped",
          "scope": "Steady Shot/Aimed Shot",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "426": [
        {
          "kind": "ranged",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "427": [
        {
          "kind": "pending",
          "note": "Lock and Load resets Aimed Shot after critical shot and grants a temporary cast-speed buff"
        }
      ]
    },
    "coverage": {
      "373": {
        "status": "proc-or-conditional",
        "note": "Swift Aspects procs timed ranged or melee attack-speed buffs while the corresponding Hawk/Wolf aspect is active"
      },
      "374": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "375": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "376": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "377": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "378": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "379": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "380": {
        "status": "proc-or-conditional",
        "note": "Coordinated Assault grants a limited-timing pet extra strike after Arcane/Steady Shot or Raptor Strike"
      },
      "381": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "382": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "383": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "384": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "385": {
        "status": "proc-or-conditional",
        "note": "Scent of Blood is an owner-hit-triggered temporary pet damage bonus"
      },
      "386": {
        "status": "proc-or-conditional",
        "note": "Bestial Wrath is an on-use timed pet damage/CC immunity effect"
      },
      "387": {
        "status": "proc-or-conditional",
        "note": "Intimidation applies a stun and threat benefit on the pet's next successful melee attack"
      },
      "388": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "389": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "390": {
        "status": "proc-or-conditional",
        "note": "Frenzy temporarily increases pet attack speed after pet critical strike; not permanent pet haste"
      },
      "391": {
        "status": "proc-or-conditional",
        "note": "Kill Command is an active pet attack enabled by the owner's critical strike"
      },
      "392": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "393": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "394": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "395": {
        "status": "proc-or-conditional",
        "note": "Entrapment gives active trap effects a chance to immobilise their target"
      },
      "396": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "397": {
        "status": "proc-or-conditional",
        "note": "Improved Wing Clip gives Wing Clip a chance to immobilise the target"
      },
      "398": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "399": {
        "status": "proc-or-conditional",
        "note": "Planning Ahead modifies traps only if their trigger is delayed more than 5 seconds after placement"
      },
      "400": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "401": {
        "status": "proc-or-conditional",
        "note": "Carve is an active cone attack sharing cooldown with Multi-Shot and requires a multi-target model"
      },
      "402": {
        "status": "proc-or-conditional",
        "note": "Deterrence grants temporary dodge/parry on use; must never affect permanent sheet stats"
      },
      "403": {
        "status": "proc-or-conditional",
        "note": "Stinging Nettle applies a short Serpent Sting via Mongoose Bite or triggered Fire traps, requiring effect duration and resist handling"
      },
      "404": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "405": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "406": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "407": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "408": {
        "status": "proc-or-conditional",
        "note": "Lacerate requires a prior critical hit and then deals direct and periodic melee-AP-based damage"
      },
      "409": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "410": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "411": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "412": {
        "status": "proc-or-conditional",
        "note": "Improved Concussive Shot adds a chance-based stun from a successful Concussive Shot"
      },
      "413": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "414": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "415": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "416": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "417": {
        "status": "proc-or-conditional",
        "note": "Aimed Shot is an active ranged attack with +70 damage; requires ranged weapon and attack table"
      },
      "418": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "419": {
        "status": "proc-or-conditional",
        "note": "Endless Quiver triggers an extra ranged attack after selected shot hits with no ammo cost"
      },
      "420": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "421": {
        "status": "proc-or-conditional",
        "note": "Scatter Shot is an active short-range ranged strike and disorient"
      },
      "422": {
        "status": "proc-or-conditional",
        "note": "Experimental Ammunition switches Aimed Shot secondary element and additional next-attack effects; requires active ammo choice"
      },
      "423": {
        "status": "proc-or-conditional",
        "note": "Piercing Shots creates a timed bleed from critical shots; cannot add bleed DPS without event simulation"
      },
      "424": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "425": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "426": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "427": {
        "status": "proc-or-conditional",
        "note": "Lock and Load resets Aimed Shot after critical shot and grants a temporary cast-speed buff"
      }
    }
  },
  "mage": {
    "sourceBranch": "audit/talent-effects-mage",
    "sourceBlob": "38a270bd5abf06bffd4ba14c638476414e39fa1f",
    "sourceNote": "/* All 55 mage talents reviewed against https://octowow.st/talents/mage/; snapshot SHA256 7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1. */",
    "rules": {
      "1": [
        {
          "kind": "scoped",
          "scope": "Fireball",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "2": [
        {
          "kind": "pending",
          "note": "Impact stuns on Fire spell proc; target crowd-control state pending"
        }
      ],
      "3": [
        {
          "kind": "pending",
          "note": "Ignite creates a DoT after Fire spell critical strikes; no event-driven periodic damage model"
        }
      ],
      "4": [
        {
          "kind": "scoped",
          "scope": "Fire spells",
          "stat": "rangeIncreaseYards",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Blast Wave",
          "stat": "radiusIncreasePct",
          "param": 1
        }
      ],
      "5": [
        {
          "kind": "scoped",
          "scope": "Fire Blast",
          "stat": "cooldownReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Fire Blast",
          "stat": "globalCooldownReductionSeconds",
          "param": 1
        }
      ],
      "6": [
        {
          "kind": "spell",
          "scope": [
            "Fire Blast",
            "Scorch"
          ],
          "stat": "crit",
          "param": 0
        }
      ],
      "7": [
        {
          "kind": "spell",
          "scope": "Flamestrike",
          "stat": "crit",
          "param": 0
        }
      ],
      "8": [
        {
          "kind": "pending",
          "note": "Pyroblast is an active Fire direct-plus-DoT spell; requires ability ranks and cast/target resolution"
        }
      ],
      "9": [
        {
          "kind": "scoped",
          "scope": "Fire spells",
          "stat": "pushbackResistancePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Fire spells",
          "stat": "threatReductionPct",
          "param": 1
        }
      ],
      "10": [
        {
          "kind": "pending",
          "note": "Fire Vulnerability debuff application and duration are target-state mechanics, not permanent personal Fire damage"
        }
      ],
      "11": [
        {
          "kind": "pending",
          "note": "Improved Fire Ward can reflect a Fire spell while Fire Ward aura is active, requiring incoming spell events"
        }
      ],
      "12": [
        {
          "kind": "pending",
          "note": "Master of Elements refunds mana only after Fire/Frost spell critical strikes"
        }
      ],
      "13": [
        {
          "kind": "pending",
          "note": "Blast Wave is an active area Fire spell with target daze"
        }
      ],
      "14": [
        {
          "kind": "spell",
          "scope": "Fire",
          "stat": "crit",
          "param": 0
        }
      ],
      "15": [
        {
          "kind": "pending",
          "note": "Hot Streak generates temporary stacked Pyroblast cast-time reduction after Fireball/Fire Blast crits"
        }
      ],
      "16": [
        {
          "kind": "spell",
          "scope": "Fire",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "17": [
        {
          "kind": "pending",
          "note": "Combustion is an active accumulating Fire crit buff that expires after three Fire critical hits"
        }
      ],
      "18": [
        {
          "kind": "scoped",
          "scope": "Frost/Ice Armor",
          "stat": "effectivenessPct",
          "param": 0,
          "when": {
            "armour": [
              "Frost Armor",
              "Ice Armor"
            ]
          }
        },
        {
          "kind": "pending",
          "note": "Frost Ward reflection chance requires event simulation"
        },
        {
          "kind": "scoped",
          "scope": "Frost Ward",
          "stat": "reflectChancePct",
          "param": 1
        }
      ],
      "19": [
        {
          "kind": "scoped",
          "scope": "Frostbolt",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "20": [
        {
          "kind": "spell",
          "scope": [
            "Fire",
            "Frost"
          ],
          "stat": "hit",
          "param": 0
        }
      ],
      "21": [
        {
          "kind": "spell",
          "scope": "Frost",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "22": [
        {
          "kind": "pending",
          "note": "Frostbite freezes targets probabilistically when Chill effects apply"
        }
      ],
      "23": [
        {
          "kind": "scoped",
          "scope": "Frost Nova",
          "stat": "cooldownReductionSeconds",
          "param": 0
        }
      ],
      "24": [
        {
          "kind": "scoped",
          "scope": "Chill effects",
          "stat": "durationIncreaseSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Chill effects",
          "stat": "slowIncreasePct",
          "param": 1
        }
      ],
      "25": [
        {
          "kind": "spell",
          "scope": "Frost",
          "stat": "criticalDamagePct",
          "param": 0
        }
      ],
      "26": [
        {
          "kind": "pending",
          "note": "Cold Snap resets eligible Frost cooldowns on use"
        }
      ],
      "27": [
        {
          "kind": "pending",
          "note": "Improved Blizzard applies a movement slow with Blizzard ticks; needs target aura and time modelling"
        }
      ],
      "28": [
        {
          "kind": "scoped",
          "scope": "Frostbolt/Icicles/Blizzard",
          "stat": "rangeIncreasePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Frost Nova/Cone of Cold",
          "stat": "radiusIncreasePct",
          "param": 0
        }
      ],
      "29": [
        {
          "kind": "scoped",
          "scope": "Frost spells",
          "stat": "manaCostReductionPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Frost spells",
          "stat": "threatReductionPct",
          "param": 1
        }
      ],
      "30": [
        {
          "kind": "pending",
          "note": "Shatter's critical bonus only applies to frozen targets"
        }
      ],
      "31": [
        {
          "kind": "pending",
          "note": "Ice Block temporarily prevents damage but disables actions; cannot add permanent damage immunity"
        }
      ],
      "32": [
        {
          "kind": "pending",
          "note": "Icicles is a channeled attack with stationary state and a damage-reactive explosion"
        }
      ],
      "33": [
        {
          "kind": "scoped",
          "scope": "Cone of Cold",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "34": [
        {
          "kind": "pending",
          "note": "Winter's Chill adds a stackable target debuff and is not player passive critical strike chance"
        }
      ],
      "35": [
        {
          "kind": "pending",
          "note": "Flash Freeze triggers only when freeze fails due to permanent target immunity and changes Icicles cooldown"
        }
      ],
      "36": [
        {
          "kind": "pending",
          "note": "Ice Barrier is a temporary shield with a conditional active Frost damage benefit, not permanent spell damage"
        }
      ],
      "37": [
        {
          "kind": "global",
          "stat": "spellPen",
          "param": 0
        }
      ],
      "38": [
        {
          "kind": "global",
          "stat": "arcaneRes",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "fireRes",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "frostRes",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "natureRes",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "shadowRes",
          "param": 0
        }
      ],
      "39": [
        {
          "kind": "scoped",
          "scope": "Arcane Missiles channel",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "40": [
        {
          "kind": "scoped",
          "scope": "Wand",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Wand",
          "stat": "hit",
          "param": 1
        }
      ],
      "41": [
        {
          "kind": "spell",
          "scope": "Arcane",
          "stat": "hit",
          "param": 0
        }
      ],
      "42": [
        {
          "kind": "pending",
          "note": "Arcane Concentration generates Clearcasting with hit-proc chance and internal cooldown; next-spell mana state pending"
        }
      ],
      "43": [
        {
          "kind": "scoped",
          "scope": "Amplify/Dampen Magic",
          "stat": "effectivenessPct",
          "param": 0,
          "values": [
            100
          ]
        },
        {
          "kind": "pending",
          "note": "Target eligibility and currently active magic buff are not modelled"
        }
      ],
      "44": [
        {
          "kind": "spell",
          "scope": "Arcane",
          "stat": "crit",
          "param": 0
        }
      ],
      "45": [
        {
          "kind": "pending",
          "note": "Arcane Rupture is an active Arcane hit and a timed Arcane Missiles damage/mana-cost aura"
        }
      ],
      "46": [
        {
          "kind": "scoped",
          "scope": "Mana Shield",
          "stat": "manaLossReductionPct",
          "param": 0
        }
      ],
      "47": [
        {
          "kind": "pending",
          "note": "Improved Counterspell applies silence only after a successful Counterspell"
        }
      ],
      "48": [
        {
          "kind": "pending",
          "note": "Temporal Convergence procs cooldown resets and refunds Arcane Rupture mana after Arcane Missiles events"
        }
      ],
      "49": [
        {
          "kind": "scoped",
          "scope": "Mana regeneration while casting",
          "stat": "regenPct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Regeneration is tripled below 35% mana and requires a resource model"
        },
        {
          "kind": "scoped",
          "scope": "Mana regeneration while casting",
          "stat": "extraRegenPct",
          "param": 0,
          "factor": 2,
          "when": {
            "lowMana": "Yes"
          }
        }
      ],
      "50": [
        {
          "kind": "pending",
          "note": "Arcane Instability has a chance to spend base mana for bonus Arcane damage on successful spells"
        }
      ],
      "51": [
        {
          "kind": "pending",
          "note": "Presence of Mind is an activated next-spell instant cast, not baseline casting speed"
        }
      ],
      "52": [
        {
          "kind": "spell",
          "scope": "Arcane",
          "stat": "castSpeedPct",
          "param": 0,
          "values": [
            5
          ]
        }
      ],
      "53": [
        {
          "kind": "spell",
          "scope": "Arcane",
          "stat": "criticalDamagePct",
          "param": 0
        }
      ],
      "54": [
        {
          "kind": "pending",
          "note": "Resonance Cascade duplicates Arcane spell damage probabilistically and can recursively trigger"
        }
      ],
      "55": [
        {
          "kind": "pending",
          "note": "Arcane Power temporarily hastens casting, changes mana income and drains mana; duration and expiry require combat resources"
        }
      ]
    },
    "coverage": {
      "1": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "2": {
        "status": "proc-or-conditional",
        "note": "Impact stuns on Fire spell proc; target crowd-control state pending"
      },
      "3": {
        "status": "proc-or-conditional",
        "note": "Ignite creates a DoT after Fire spell critical strikes; no event-driven periodic damage model"
      },
      "4": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "5": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "6": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "7": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "8": {
        "status": "proc-or-conditional",
        "note": "Pyroblast is an active Fire direct-plus-DoT spell; requires ability ranks and cast/target resolution"
      },
      "9": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "10": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "11": {
        "status": "proc-or-conditional",
        "note": "Improved Fire Ward can reflect a Fire spell while Fire Ward aura is active, requiring incoming spell events"
      },
      "12": {
        "status": "proc-or-conditional",
        "note": "Master of Elements refunds mana only after Fire/Frost spell critical strikes"
      },
      "13": {
        "status": "proc-or-conditional",
        "note": "Blast Wave is an active area Fire spell with target daze"
      },
      "14": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "15": {
        "status": "proc-or-conditional",
        "note": "Hot Streak generates temporary stacked Pyroblast cast-time reduction after Fireball/Fire Blast crits"
      },
      "16": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "17": {
        "status": "proc-or-conditional",
        "note": "Combustion is an active accumulating Fire crit buff that expires after three Fire critical hits"
      },
      "18": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "19": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "20": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "21": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "22": {
        "status": "proc-or-conditional",
        "note": "Frostbite freezes targets probabilistically when Chill effects apply"
      },
      "23": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "24": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "25": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "26": {
        "status": "proc-or-conditional",
        "note": "Cold Snap resets eligible Frost cooldowns on use"
      },
      "27": {
        "status": "proc-or-conditional",
        "note": "Improved Blizzard applies a movement slow with Blizzard ticks; needs target aura and time modelling"
      },
      "28": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "29": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "30": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "31": {
        "status": "proc-or-conditional",
        "note": "Ice Block temporarily prevents damage but disables actions; cannot add permanent damage immunity"
      },
      "32": {
        "status": "proc-or-conditional",
        "note": "Icicles is a channeled attack with stationary state and a damage-reactive explosion"
      },
      "33": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "34": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "35": {
        "status": "proc-or-conditional",
        "note": "Flash Freeze triggers only when freeze fails due to permanent target immunity and changes Icicles cooldown"
      },
      "36": {
        "status": "proc-or-conditional",
        "note": "Ice Barrier is a temporary shield with a conditional active Frost damage benefit, not permanent spell damage"
      },
      "37": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "38": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "39": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "40": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "41": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "42": {
        "status": "proc-or-conditional",
        "note": "Arcane Concentration generates Clearcasting with hit-proc chance and internal cooldown; next-spell mana state pending"
      },
      "43": {
        "status": "partial",
        "note": "Target eligibility and currently active magic buff are not modelled"
      },
      "44": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "45": {
        "status": "proc-or-conditional",
        "note": "Arcane Rupture is an active Arcane hit and a timed Arcane Missiles damage/mana-cost aura"
      },
      "46": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "47": {
        "status": "proc-or-conditional",
        "note": "Improved Counterspell applies silence only after a successful Counterspell"
      },
      "48": {
        "status": "proc-or-conditional",
        "note": "Temporal Convergence procs cooldown resets and refunds Arcane Rupture mana after Arcane Missiles events"
      },
      "49": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "50": {
        "status": "proc-or-conditional",
        "note": "Arcane Instability has a chance to spend base mana for bonus Arcane damage on successful spells"
      },
      "51": {
        "status": "proc-or-conditional",
        "note": "Presence of Mind is an activated next-spell instant cast, not baseline casting speed"
      },
      "52": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "53": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "54": {
        "status": "proc-or-conditional",
        "note": "Resonance Cascade duplicates Arcane spell damage probabilistically and can recursively trigger"
      },
      "55": {
        "status": "proc-or-conditional",
        "note": "Arcane Power temporarily hastens casting, changes mana income and drains mana; duration and expiry require combat resources"
      }
    }
  },
  "priest": {
    "sourceBranch": "audit/talent-effects-priest",
    "sourceBlob": "c1af71c9dc9a9f4c42b99a270fbdfdce6f309187",
    "sourceNote": "/* All 52 priest talents reviewed against https://octowow.st/talents/priest/; snapshot SHA256 ae346edead76b1ad082b31ea373fc64f72b72538333746555c062f2d27bcf5fb. */",
    "rules": {
      "166": [
        {
          "kind": "scoped",
          "scope": "Wand/Bow",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Wand/Bow",
          "stat": "hit",
          "param": 1
        }
      ],
      "167": [
        {
          "kind": "spell",
          "scope": [
            "Holy",
            "Discipline"
          ],
          "stat": "hit",
          "param": 0
        }
      ],
      "168": [
        {
          "kind": "scoped",
          "scope": "Instant/Holy/Discipline spells",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "169": [
        {
          "kind": "scoped",
          "scope": "All spells",
          "stat": "threatReductionPct",
          "param": 0
        }
      ],
      "170": [
        {
          "kind": "scoped",
          "scope": "Stun/Fear/Silence",
          "stat": "resistChancePct",
          "param": 0
        }
      ],
      "171": [
        {
          "kind": "pending",
          "note": "Blessed Concentration activates after taking melee/ranged crit damage; anti-pushback and spell effects expire after a short duration"
        }
      ],
      "172": [
        {
          "kind": "scoped",
          "scope": "Power Word: Fortitude",
          "stat": "buffEffectivenessPct",
          "param": 0
        }
      ],
      "173": [
        {
          "kind": "scoped",
          "scope": "Inner Fire",
          "stat": "buffEffectivenessPct",
          "param": 0
        }
      ],
      "174": [
        {
          "kind": "pending",
          "note": "Inner Focus is an on-use next-spell mana-free, extra-critical effect, not permanent crit chance"
        }
      ],
      "175": [
        {
          "kind": "scoped",
          "scope": "Power Word: Shield",
          "stat": "absorbPct",
          "param": 0
        }
      ],
      "176": [
        {
          "kind": "scoped",
          "scope": "Mana regeneration while casting",
          "stat": "regenPct",
          "param": 0
        }
      ],
      "177": [
        {
          "kind": "pending",
          "note": "Searing Light grants a timed instant and discounted Smite following Holy/Discipline spell critical hits"
        }
      ],
      "178": [
        {
          "kind": "pending",
          "note": "Purifying Flames grants temporary Holy damage after Holy Fire hits"
        }
      ],
      "179": [
        {
          "kind": "percent",
          "stat": "int",
          "param": 0
        },
        {
          "kind": "spell",
          "scope": "Spell casting",
          "stat": "castSpeedPct",
          "param": 1
        }
      ],
      "180": [
        {
          "kind": "pending",
          "note": "Enlighten links party member health/mana to the priest's helpful/harmful spell events"
        }
      ],
      "181": [
        {
          "kind": "pending",
          "note": "Resurgent Shield triggers a shield-break mana refund and temporary Holy damage/healing based on shield absorb amount"
        }
      ],
      "182": [
        {
          "kind": "spell",
          "scope": "Offensive spells",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "spell",
          "scope": "Offensive spells",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Power Word: Shield",
          "stat": "absorbPct",
          "param": 1
        }
      ],
      "183": [
        {
          "kind": "pending",
          "note": "Chastise is an active enemy disorient or ally haste spell requiring explicit target type and ability timing"
        }
      ],
      "184": [
        {
          "kind": "scoped",
          "scope": "Renew",
          "stat": "healingPct",
          "param": 0
        }
      ],
      "185": [
        {
          "kind": "scoped",
          "scope": "Holy spell casting",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "186": [
        {
          "kind": "spell",
          "scope": [
            "Holy",
            "Discipline"
          ],
          "stat": "crit",
          "param": 0
        }
      ],
      "187": [
        {
          "kind": "scoped",
          "scope": "Smite/Holy Fire/Heal/Greater Heal",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "188": [
        {
          "kind": "scoped",
          "scope": "Incoming spell damage",
          "stat": "damageReductionPct",
          "param": 0
        }
      ],
      "189": [
        {
          "kind": "scoped",
          "scope": "Smite/Holy Fire/Chastise",
          "stat": "rangeIncreasePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Prayer of Healing/Holy Nova",
          "stat": "radiusIncreasePct",
          "param": 0
        }
      ],
      "190": [
        {
          "kind": "pending",
          "note": "Blessed Recovery heals over time only after the priest receives a melee/ranged critical hit"
        }
      ],
      "191": [
        {
          "kind": "pending",
          "note": "Inspiration grants a temporary armour buff to a healed target after a critical heal, not to the priest"
        }
      ],
      "192": [
        {
          "kind": "pending",
          "note": "Holy Nova is an active area damage/healing spell and has different Shadowform interactions"
        }
      ],
      "193": [
        {
          "kind": "scoped",
          "scope": "Renew",
          "stat": "durationIncreaseSeconds",
          "param": 0,
          "values": [
            3,
            3
          ]
        },
        {
          "kind": "scoped",
          "scope": "Healing target with Renew",
          "stat": "healingPct",
          "param": 0,
          "when": {
            "targetRenew": "On"
          }
        }
      ],
      "194": [
        {
          "kind": "scoped",
          "scope": "Lesser Heal/Heal/Greater Heal/Prayer of Healing",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "195": [
        {
          "kind": "special",
          "stat": "spFromSpiritPct",
          "param": 0
        }
      ],
      "196": [
        {
          "kind": "pending",
          "note": "Book of Prayer refunds mana only when successive healing spells differ"
        }
      ],
      "197": [
        {
          "kind": "percent",
          "stat": "spi",
          "param": 0,
          "values": [
            10
          ]
        },
        {
          "kind": "pending",
          "note": "Spirit of Redemption on death requires combat context"
        }
      ],
      "198": [
        {
          "kind": "scoped",
          "scope": "Lightwell Splendor of Light",
          "stat": "effectivenessPct",
          "param": 0
        }
      ],
      "199": [
        {
          "kind": "scoped",
          "scope": "Healing spells",
          "stat": "healingPct",
          "param": 0
        }
      ],
      "200": [
        {
          "kind": "pending",
          "note": "Ascendance is an activated temporary healing-resource/cast-time buff with ally Apotheosis effects"
        }
      ],
      "201": [
        {
          "kind": "pending",
          "note": "Spirit Tap grants temporary Spirit and while-casting mana regeneration after qualifying kill or Mind Blast crit"
        }
      ],
      "202": [
        {
          "kind": "scoped",
          "scope": "Mind Blast",
          "stat": "cooldownReductionSeconds",
          "param": 0
        }
      ],
      "203": [
        {
          "kind": "scoped",
          "scope": "Shadow spells",
          "stat": "threatReductionPct",
          "param": 0
        }
      ],
      "204": [
        {
          "kind": "scoped",
          "scope": "Shadow Word: Pain",
          "stat": "durationIncreaseSeconds",
          "param": 0
        }
      ],
      "205": [
        {
          "kind": "spell",
          "scope": "Shadow",
          "stat": "hit",
          "param": 0
        }
      ],
      "206": [
        {
          "kind": "pending",
          "note": "Blackout stuns randomly following Shadow damage spell hits"
        }
      ],
      "207": [
        {
          "kind": "scoped",
          "scope": "Psychic Scream",
          "stat": "cooldownReductionSeconds",
          "param": 0
        }
      ],
      "208": [
        {
          "kind": "scoped",
          "scope": "Fade",
          "stat": "cooldownReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Fade end",
          "stat": "threatReturnReductionPct",
          "param": 1
        }
      ],
      "209": [
        {
          "kind": "pending",
          "note": "Mind Flay is an active channeled Shadow DoT applying slow to a target"
        }
      ],
      "210": [
        {
          "kind": "scoped",
          "scope": "Mana Burn",
          "stat": "castTimeReductionSeconds",
          "param": 0,
          "values": [
            0.25,
            0.5
          ]
        }
      ],
      "211": [
        {
          "kind": "scoped",
          "scope": "Shadow spells",
          "stat": "rangeIncreasePct",
          "param": 0
        }
      ],
      "212": [
        {
          "kind": "pending",
          "note": "Shadow Weaving is a temporary self/target stacking Shadow vulnerability aura generated by Shadow spell casts"
        }
      ],
      "213": [
        {
          "kind": "pending",
          "note": "Silence is an active target spell-lockout ability"
        }
      ],
      "214": [
        {
          "kind": "pending",
          "note": "Vampiric Embrace links Shadow damage against affected target into party healing for an aura duration"
        }
      ],
      "215": [
        {
          "kind": "scoped",
          "scope": "Vampiric Embrace",
          "stat": "healingPct",
          "param": 0,
          "when": {
            "useVampiricEmbrace": "On"
          }
        },
        {
          "kind": "scoped",
          "scope": "Vampiric Embrace",
          "stat": "partyManaReturnPct",
          "param": 1,
          "when": {
            "useVampiricEmbrace": "On"
          }
        },
        {
          "kind": "pending",
          "note": "Target damage and active Vampiric Embrace aura need event-driven party resource handling"
        }
      ],
      "216": [
        {
          "kind": "spell",
          "scope": "Shadow",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "217": [
        {
          "kind": "spell",
          "scope": "Shadow",
          "stat": "damagePct",
          "param": 0,
          "values": [
            15
          ],
          "when": {
            "form": "Shadowform"
          }
        },
        {
          "kind": "pending",
          "note": "Shadowform armour/damage reduction and ability restrictions need combat support"
        },
        {
          "kind": "special",
          "stat": "physicalDamageTakenReductionPct",
          "param": 0,
          "values": [
            15
          ],
          "when": {
            "form": "Shadowform"
          }
        }
      ]
    },
    "coverage": {
      "166": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "167": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "168": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "169": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "170": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "171": {
        "status": "proc-or-conditional",
        "note": "Blessed Concentration activates after taking melee/ranged crit damage; anti-pushback and spell effects expire after a short duration"
      },
      "172": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "173": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "174": {
        "status": "proc-or-conditional",
        "note": "Inner Focus is an on-use next-spell mana-free, extra-critical effect, not permanent crit chance"
      },
      "175": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "176": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "177": {
        "status": "proc-or-conditional",
        "note": "Searing Light grants a timed instant and discounted Smite following Holy/Discipline spell critical hits"
      },
      "178": {
        "status": "proc-or-conditional",
        "note": "Purifying Flames grants temporary Holy damage after Holy Fire hits"
      },
      "179": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "180": {
        "status": "proc-or-conditional",
        "note": "Enlighten links party member health/mana to the priest's helpful/harmful spell events"
      },
      "181": {
        "status": "proc-or-conditional",
        "note": "Resurgent Shield triggers a shield-break mana refund and temporary Holy damage/healing based on shield absorb amount"
      },
      "182": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "183": {
        "status": "proc-or-conditional",
        "note": "Chastise is an active enemy disorient or ally haste spell requiring explicit target type and ability timing"
      },
      "184": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "185": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "186": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "187": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "188": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "189": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "190": {
        "status": "proc-or-conditional",
        "note": "Blessed Recovery heals over time only after the priest receives a melee/ranged critical hit"
      },
      "191": {
        "status": "proc-or-conditional",
        "note": "Inspiration grants a temporary armour buff to a healed target after a critical heal, not to the priest"
      },
      "192": {
        "status": "proc-or-conditional",
        "note": "Holy Nova is an active area damage/healing spell and has different Shadowform interactions"
      },
      "193": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "194": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "195": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "196": {
        "status": "proc-or-conditional",
        "note": "Book of Prayer refunds mana only when successive healing spells differ"
      },
      "197": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "198": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "199": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "200": {
        "status": "proc-or-conditional",
        "note": "Ascendance is an activated temporary healing-resource/cast-time buff with ally Apotheosis effects"
      },
      "201": {
        "status": "proc-or-conditional",
        "note": "Spirit Tap grants temporary Spirit and while-casting mana regeneration after qualifying kill or Mind Blast crit"
      },
      "202": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "203": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "204": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "205": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "206": {
        "status": "proc-or-conditional",
        "note": "Blackout stuns randomly following Shadow damage spell hits"
      },
      "207": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "208": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "209": {
        "status": "proc-or-conditional",
        "note": "Mind Flay is an active channeled Shadow DoT applying slow to a target"
      },
      "210": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "211": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "212": {
        "status": "proc-or-conditional",
        "note": "Shadow Weaving is a temporary self/target stacking Shadow vulnerability aura generated by Shadow spell casts"
      },
      "213": {
        "status": "proc-or-conditional",
        "note": "Silence is an active target spell-lockout ability"
      },
      "214": {
        "status": "proc-or-conditional",
        "note": "Vampiric Embrace links Shadow damage against affected target into party healing for an aura duration"
      },
      "215": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "216": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "217": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      }
    }
  },
  "shaman": {
    "sourceBranch": "audit/talent-effects-shaman",
    "sourceBlob": "63ea5d77dcffc36f1431dc0853edb6542c8e2fc8",
    "sourceNote": "/* All 49 shaman talents reviewed against https://octowow.st/talents/shaman/; snapshot SHA256 8340d1af2ba89a41d8c28c5e9829f7cf5679b11864f6a7d00307fa1e2a02d2ac. */",
    "rules": {
      "218": [
        {
          "kind": "scoped",
          "scope": "Offensive Fire/Frost/Nature",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "219": [
        {
          "kind": "spell",
          "scope": [
            "Fire",
            "Frost",
            "Nature"
          ],
          "stat": "damagePct",
          "param": 0
        }
      ],
      "220": [
        {
          "kind": "scoped",
          "scope": "Stoneclaw Totem",
          "stat": "healthPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Earthbind Totem",
          "stat": "radiusIncreasePct",
          "param": 1
        }
      ],
      "221": [
        {
          "kind": "scoped",
          "scope": "Incoming Fire/Frost/Nature",
          "stat": "damageReductionPct",
          "param": 0
        }
      ],
      "222": [
        {
          "kind": "global",
          "stat": "hit",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "spellHit",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Melee-crit-triggered additional spell hit is a 10-second proc: rank 1/2/3 gives +3/+6/+9%, not passive"
        },
        {
          "kind": "spell",
          "scope": "Offensive spells",
          "stat": "hit",
          "param": 1,
          "when": {
            "elementalDevastationProc": "Active"
          },
          "note": "Manual scenario only; 10-second melee critical strike proc, not permanent hit"
        }
      ],
      "223": [
        {
          "kind": "pending",
          "note": "Elemental Focus triggers two Clearcasting charges on an eligible elemental spell or melee critical strike"
        }
      ],
      "224": [
        {
          "kind": "scoped",
          "scope": "Shock spells",
          "stat": "cooldownReductionSeconds",
          "param": 0
        }
      ],
      "225": [
        {
          "kind": "spell",
          "scope": [
            "Lightning Bolt",
            "Chain Lightning"
          ],
          "stat": "crit",
          "param": 0
        }
      ],
      "226": [
        {
          "kind": "pending",
          "note": "Improved Molten Blast deals extra damage only when Molten Blast refreshes Flame Shock; requires target aura state"
        }
      ],
      "227": [
        {
          "kind": "scoped",
          "scope": "Fire Nova Totem",
          "stat": "activationDelayReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Magma Totem",
          "stat": "threatReductionPct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Searing Totem",
          "stat": "hastePct",
          "param": 2
        },
        {
          "kind": "scoped",
          "scope": "Searing Totem",
          "stat": "rangeIncreaseYards",
          "param": 3
        }
      ],
      "228": [
        {
          "kind": "scoped",
          "scope": "Earth Shield",
          "stat": "maximumCharges",
          "param": 0
        }
      ],
      "229": [
        {
          "kind": "spell",
          "scope": "Fire",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Flame Shock",
          "stat": "rangeIncreaseYards",
          "param": 1
        }
      ],
      "230": [
        {
          "kind": "scoped",
          "scope": "Lightning Bolt/Chain Lightning",
          "stat": "rangeIncreaseYards",
          "param": 0
        }
      ],
      "231": [
        {
          "kind": "pending",
          "note": "Elemental Mastery grants temporary +15% elemental damage and offensive spell cost reduction for 10 seconds; not passive"
        }
      ],
      "232": [
        {
          "kind": "spell",
          "scope": [
            "Fire",
            "Frost",
            "Nature"
          ],
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Totem critical-damage effects remain combat-engine scoped"
        },
        {
          "kind": "spell",
          "scope": [
            "Fire",
            "Frost",
            "Nature"
          ],
          "stat": "criticalDamagePct",
          "param": 1
        }
      ],
      "233": [
        {
          "kind": "scoped",
          "scope": "Lightning Bolt/Chain Lightning",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "234": [
        {
          "kind": "pending",
          "note": "Earthquake is an activated multi-target Nature spell that spawns a slowing zone"
        }
      ],
      "235": [
        {
          "kind": "pending",
          "note": "Official calculator alternates 15 / 0.3 / 45 / 0.6 / 75 sec reductions across ranks; malformed data cannot be trusted"
        }
      ],
      "236": [
        {
          "kind": "scoped",
          "scope": "Healing spells",
          "stat": "manaCostReductionPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Totems",
          "stat": "manaCostReductionPct",
          "param": 1
        }
      ],
      "237": [
        {
          "kind": "scoped",
          "scope": "Reincarnation",
          "stat": "cooldownReductionMinutes",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Reincarnation",
          "stat": "returnedHealthManaPct",
          "param": 1
        }
      ],
      "238": [
        {
          "kind": "pending",
          "note": "Ancestral Healing grants a temporary armour buff to a healed target after a critical heal, not to the caster"
        }
      ],
      "239": [
        {
          "kind": "spell",
          "scope": [
            "Healing spells",
            "Lightning spells"
          ],
          "stat": "crit",
          "param": 0
        }
      ],
      "240": [
        {
          "kind": "pending",
          "note": "Healing Way creates or consumes stacks of a target healing increase following qualifying heals"
        }
      ],
      "241": [
        {
          "kind": "scoped",
          "scope": "Healing spells",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "242": [
        {
          "kind": "scoped",
          "scope": "Helpful Totems",
          "stat": "durationPct",
          "param": 0,
          "values": [
            20
          ]
        },
        {
          "kind": "scoped",
          "scope": "Totemic Recall",
          "stat": "manaRefundPct",
          "param": 0,
          "values": [
            15
          ]
        }
      ],
      "243": [
        {
          "kind": "scoped",
          "scope": "Nature spells",
          "stat": "threatReductionPct",
          "param": 0
        }
      ],
      "244": [
        {
          "kind": "scoped",
          "scope": "Mana Spring Totem",
          "stat": "manaCostReductionPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Healing Stream Totem",
          "stat": "effectivenessPct",
          "param": 1
        }
      ],
      "245": [
        {
          "kind": "pending",
          "note": "Water Shield conditional mana/5 requires an actual shield-state control"
        }
      ],
      "246": [
        {
          "kind": "pending",
          "note": "Tidal Surge refunds mana probabilistically only after healing a target with Healing Way"
        }
      ],
      "247": [
        {
          "kind": "pending",
          "note": "Ancestral Swiftness is an on-use next Nature spell instant cast with an offensive penalty"
        }
      ],
      "248": [
        {
          "kind": "pending",
          "note": "Undertow restores/consumes Water Shield charges after a qualifying heal; requires shield state and target events"
        }
      ],
      "249": [
        {
          "kind": "scoped",
          "scope": "Chain Heal",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "250": [
        {
          "kind": "pending",
          "note": "Spirit Link temporarily redistributes damage between party targets, requiring group health and damage timelines"
        }
      ],
      "251": [
        {
          "kind": "percent",
          "stat": "str",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "agi",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "sta",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "int",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "spi",
          "param": 0
        }
      ],
      "252": [
        {
          "kind": "special",
          "stat": "blockChance",
          "param": 0,
          "when": {
            "shield": true
          }
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
      "253": [
        {
          "kind": "scoped",
          "scope": "Totem threat",
          "stat": "transferredToOwnerPct",
          "param": 0
        }
      ],
      "254": [
        {
          "kind": "global",
          "stat": "crit",
          "param": 0
        }
      ],
      "255": [
        {
          "kind": "scoped",
          "scope": "Shield spells",
          "stat": "maximumCharges",
          "param": 0
        }
      ],
      "256": [
        {
          "kind": "scoped",
          "scope": "Ghost Wolf",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "257": [
        {
          "kind": "scoped",
          "scope": "Physical/imbue attacks",
          "stat": "threatReductionPct",
          "param": 0
        }
      ],
      "258": [
        {
          "kind": "pending",
          "note": "Lightning Strike is an active weapon strike with empowered active-shield charge effects"
        }
      ],
      "259": [
        {
          "kind": "special",
          "stat": "itemArmourPct",
          "param": 0
        },
        {
          "kind": "global",
          "stat": "dodge",
          "param": 1
        }
      ],
      "260": [
        {
          "kind": "pending",
          "note": "Flurry is temporary for three attacks after a crit; do not add permanent haste"
        }
      ],
      "261": [
        {
          "kind": "special",
          "stat": "shieldArmourPct",
          "param": 0,
          "when": {
            "shield": true
          }
        },
        {
          "kind": "scoped",
          "scope": "Shield active",
          "stat": "threatPct",
          "param": 1,
          "when": {
            "shield": true
          }
        }
      ],
      "262": [
        {
          "kind": "scoped",
          "scope": "Strength of Earth/Grace of Air Totems",
          "stat": "effectivenessPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Grounding Totem",
          "stat": "cooldownReductionSeconds",
          "param": 1
        },
        {
          "kind": "buff",
          "source": "earth",
          "stat": "str",
          "param": 0,
          "note": "Only the selected earth buff is enhanced; unrelated buffs are unchanged"
        },
        {
          "kind": "buff",
          "source": "air",
          "stat": "agi",
          "param": 0,
          "note": "Only the selected air buff is enhanced; unrelated buffs are unchanged"
        }
      ],
      "263": [
        {
          "kind": "pending",
          "note": "Weapon imbue effects are different per imbue and often triggered; an imbue-specific stat/aura model is required"
        }
      ],
      "264": [
        {
          "kind": "pending",
          "note": "Stormstrike is an active extra-attack ability with two Nature-damage charge bonuses"
        }
      ],
      "265": [
        {
          "kind": "scoped",
          "scope": "Weapons / Stormstrike / Lightning Strike",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "spell",
          "scope": "Instant spells",
          "stat": "crit",
          "param": 1
        },
        {
          "kind": "special",
          "stat": "weaponDamagePct",
          "param": 0
        }
      ],
      "266": [
        {
          "kind": "pending",
          "note": "Bloodlust applies temporary attack/cast-speed buffs and party crit-triggered haste effects"
        }
      ]
    },
    "coverage": {
      "218": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "219": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "220": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "221": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "222": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "223": {
        "status": "proc-or-conditional",
        "note": "Elemental Focus triggers two Clearcasting charges on an eligible elemental spell or melee critical strike"
      },
      "224": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "225": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "226": {
        "status": "proc-or-conditional",
        "note": "Improved Molten Blast deals extra damage only when Molten Blast refreshes Flame Shock; requires target aura state"
      },
      "227": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "228": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "229": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "230": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "231": {
        "status": "proc-or-conditional",
        "note": "Elemental Mastery grants temporary +15% elemental damage and offensive spell cost reduction for 10 seconds; not passive"
      },
      "232": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "233": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "234": {
        "status": "proc-or-conditional",
        "note": "Earthquake is an activated multi-target Nature spell that spawns a slowing zone"
      },
      "235": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "236": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "237": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "238": {
        "status": "proc-or-conditional",
        "note": "Ancestral Healing grants a temporary armour buff to a healed target after a critical heal, not to the caster"
      },
      "239": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "240": {
        "status": "proc-or-conditional",
        "note": "Healing Way creates or consumes stacks of a target healing increase following qualifying heals"
      },
      "241": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "242": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "243": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "244": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "245": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "246": {
        "status": "proc-or-conditional",
        "note": "Tidal Surge refunds mana probabilistically only after healing a target with Healing Way"
      },
      "247": {
        "status": "proc-or-conditional",
        "note": "Ancestral Swiftness is an on-use next Nature spell instant cast with an offensive penalty"
      },
      "248": {
        "status": "proc-or-conditional",
        "note": "Undertow restores/consumes Water Shield charges after a qualifying heal; requires shield state and target events"
      },
      "249": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "250": {
        "status": "proc-or-conditional",
        "note": "Spirit Link temporarily redistributes damage between party targets, requiring group health and damage timelines"
      },
      "251": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "252": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "253": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "254": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "255": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "256": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "257": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "258": {
        "status": "proc-or-conditional",
        "note": "Lightning Strike is an active weapon strike with empowered active-shield charge effects"
      },
      "259": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "260": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "261": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "262": {
        "status": "partial",
        "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
      },
      "263": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "264": {
        "status": "proc-or-conditional",
        "note": "Stormstrike is an active extra-attack ability with two Nature-damage charge bonuses"
      },
      "265": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "266": {
        "status": "proc-or-conditional",
        "note": "Bloodlust applies temporary attack/cast-speed buffs and party crit-triggered haste effects"
      }
    }
  },
  "warlock": {
    "sourceBranch": "audit/talent-effects-warlock",
    "sourceBlob": "b87dadf6b05bf74f536eb202cb24e3100a0da613",
    "sourceNote": "/* All 52 warlock talents reviewed against https://octowow.st/talents/warlock/; snapshot SHA256 d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81. */",
    "rules": {
      "321": [
        {
          "kind": "pending",
          "note": "Shadow Vulnerability applies a chance-based timed target Shadow-damage debuff after certain spells"
        }
      ],
      "322": [
        {
          "kind": "scoped",
          "scope": "Destruction spells",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "323": [
        {
          "kind": "scoped",
          "scope": "Imp Firebolt",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Succubus Lash of Pain",
          "stat": "cooldownReductionSeconds",
          "param": 1
        }
      ],
      "324": [
        {
          "kind": "scoped",
          "scope": "Shadow Bolt/Searing Pain/Immolate",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Soul Fire",
          "stat": "castTimeReductionSeconds",
          "param": 1
        }
      ],
      "325": [
        {
          "kind": "scoped",
          "scope": "Immolate periodic",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Destruction slow trigger requires combat event handling"
        }
      ],
      "326": [
        {
          "kind": "scoped",
          "scope": "Fire spell casting",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "327": [
        {
          "kind": "pending",
          "note": "Shadowburn is an active direct Shadow spell granting a Soul Shard only after qualifying target death"
        }
      ],
      "328": [
        {
          "kind": "spell",
          "scope": "Destruction",
          "stat": "crit",
          "param": 0
        }
      ],
      "329": [
        {
          "kind": "pending",
          "note": "Pyroclasm stun chance depends on particular Fire ability hits"
        }
      ],
      "330": [
        {
          "kind": "scoped",
          "scope": "Destruction spells",
          "stat": "rangeIncreasePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Hellfire",
          "stat": "radiusIncreasePct",
          "param": 1
        }
      ],
      "331": [
        {
          "kind": "spell",
          "scope": "Searing Pain",
          "stat": "crit",
          "param": 0
        }
      ],
      "332": [
        {
          "kind": "pending",
          "note": "Improved Soul Fire refunds a Soul Shard and applies temporary Fire bonus after Soul Fire resolves"
        }
      ],
      "333": [
        {
          "kind": "scoped",
          "scope": "Immolate",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "334": [
        {
          "kind": "spell",
          "scope": "Destruction",
          "stat": "criticalDamagePct",
          "param": 0,
          "values": [
            100
          ]
        }
      ],
      "335": [
        {
          "kind": "spell",
          "scope": "Fire",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "336": [
        {
          "kind": "pending",
          "note": "Conflagrate is an active Fire spell consuming remaining Immolate duration for extra damage"
        }
      ],
      "337": [
        {
          "kind": "spell",
          "scope": "Affliction",
          "stat": "hit",
          "param": 0
        }
      ],
      "338": [
        {
          "kind": "scoped",
          "scope": "Corruption",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "339": [
        {
          "kind": "scoped",
          "scope": "Curse of Weakness",
          "stat": "attackSpeedReductionPct",
          "param": 0
        }
      ],
      "340": [
        {
          "kind": "scoped",
          "scope": "Affliction dispel resistance",
          "stat": "chancePct",
          "param": 0
        }
      ],
      "341": [
        {
          "kind": "scoped",
          "scope": "Life Tap",
          "stat": "manaGainedPct",
          "param": 0
        }
      ],
      "342": [
        {
          "kind": "scoped",
          "scope": "Drain Soul/Life/Mana",
          "stat": "effectivenessPct",
          "param": 0
        }
      ],
      "343": [
        {
          "kind": "scoped",
          "scope": "Curse of Agony",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "344": [
        {
          "kind": "scoped",
          "scope": "Affliction spell casting",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "345": [
        {
          "kind": "pending",
          "note": "Curse of Exhaustion is an active movement curse with one-curse-per-target rules"
        }
      ],
      "346": [
        {
          "kind": "scoped",
          "scope": "Affliction spells",
          "stat": "rangeIncreasePct",
          "param": 0
        }
      ],
      "347": [
        {
          "kind": "pending",
          "note": "Nightfall is a chance-on-periodic-affliction-damage Shadow Trance affecting next Shadow Bolt"
        }
      ],
      "348": [
        {
          "kind": "scoped",
          "scope": "Drain Soul/Dark Harvest/Death Coil per Affliction effect",
          "stat": "damagePct",
          "param": 0,
          "perOption": "afflictionEffects",
          "maxOption": 4
        }
      ],
      "349": [
        {
          "kind": "spell",
          "scope": "Affliction",
          "stat": "castSpeedPct",
          "param": 0,
          "values": [
            6,
            6
          ]
        },
        {
          "kind": "pending",
          "note": "DoT/channeled tick-speed efficiency increases from 50% to 100% with talent rank; this is not a permanent extra 6% cast speed"
        }
      ],
      "350": [
        {
          "kind": "pending",
          "note": "Siphon Life is an active Shadow damage-over-time and healing drain; needs target timing"
        }
      ],
      "351": [
        {
          "kind": "scoped",
          "scope": "Curse of Exhaustion",
          "stat": "slowIncreasePct",
          "param": 0
        }
      ],
      "352": [
        {
          "kind": "pending",
          "note": "Malediction changes curse co-existence and automates Curse of Agony application, requiring target curse state"
        }
      ],
      "353": [
        {
          "kind": "spell",
          "scope": "Shadow",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "354": [
        {
          "kind": "pending",
          "note": "Dark Harvest is a channeled Shadow ability accelerating Affliction periodic effects and interacting with target deaths"
        }
      ],
      "355": [
        {
          "kind": "pet",
          "stat": "movementSpeedPct",
          "param": 0
        }
      ],
      "356": [
        {
          "kind": "percent",
          "stat": "sta",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "spi",
          "param": 1,
          "factor": -1
        }
      ],
      "357": [
        {
          "kind": "scoped",
          "scope": "All damage when no pet",
          "stat": "damagePct",
          "param": 0,
          "when": {
            "pet": "None"
          }
        }
      ],
      "358": [
        {
          "kind": "scoped",
          "scope": "Health Funnel",
          "stat": "healthTransferredPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Mana Funnel",
          "stat": "manaTransferredPct",
          "param": 1
        }
      ],
      "359": [
        {
          "kind": "scoped",
          "scope": "Demon Armor",
          "stat": "effectivenessPct",
          "param": 0
        }
      ],
      "360": [
        {
          "kind": "pet",
          "stat": "intellectFromOwnerPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "manaRegenCastingPct",
          "param": 1
        }
      ],
      "361": [
        {
          "kind": "pending",
          "note": "Fel Domination temporarily changes the next demon summoning cast time and mana cost"
        }
      ],
      "362": [
        {
          "kind": "pet",
          "stat": "staminaFromOwnerPct",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "reducedCriticalHitTakenPct",
          "param": 1
        }
      ],
      "363": [
        {
          "kind": "pending",
          "note": "Demonic Sacrifice consumes a selected demon and grants a demon-dependent temporary/persistent aura which ends on new summons; no sacrifice state control"
        }
      ],
      "364": [
        {
          "kind": "pending",
          "note": "Stone enhancement and Firestone bonuses require an equipped stone-state check"
        }
      ],
      "365": [
        {
          "kind": "scoped",
          "scope": "Common demon summon",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Common demon summon",
          "stat": "manaCostReductionPct",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "Greater demon abilities",
          "stat": "cooldownReductionPct",
          "param": 2
        }
      ],
      "366": [
        {
          "kind": "scoped",
          "scope": "Pet seduction/taunt/buff spells",
          "stat": "effectivenessPct",
          "param": 0
        }
      ],
      "367": [
        {
          "kind": "pet",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "368": [
        {
          "kind": "pending",
          "note": "Power Overwhelming is an on-use demon damage/CC modifier with self-damage to the pet"
        }
      ],
      "369": [
        {
          "kind": "pet",
          "stat": "hit",
          "param": 0
        },
        {
          "kind": "pet",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Pet inheritance of owner spell hit and critical strike requires pet calculation"
        },
        {
          "kind": "pet",
          "stat": "ownerHitCritInheritancePct",
          "param": 1
        }
      ],
      "370": [
        {
          "kind": "pending",
          "note": "Master Demonologist has five demon-specific rank vectors; bonuses need a controlled summon/active demon state and separate unit calculations"
        },
        {
          "kind": "scoped",
          "scope": "Imp",
          "stat": "spellCostReductionPct",
          "param": 0,
          "when": {
            "pet": "Imp"
          }
        },
        {
          "kind": "scoped",
          "scope": "Voidwalker",
          "stat": "physicalDamageReductionPct",
          "param": 1,
          "when": {
            "pet": "Voidwalker"
          }
        },
        {
          "kind": "scoped",
          "scope": "Succubus",
          "stat": "damagePct",
          "param": 2,
          "when": {
            "pet": "Succubus"
          }
        },
        {
          "kind": "global",
          "stat": "arcaneRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "global",
          "stat": "fireRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "global",
          "stat": "frostRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "global",
          "stat": "natureRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "global",
          "stat": "shadowRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "pending",
          "note": "Greater Demon spell-crit category and pet aura duplication require explicit live pet type verification"
        },
        {
          "kind": "pet",
          "stat": "spellCostReductionPct",
          "param": 0,
          "when": {
            "pet": "Imp"
          }
        },
        {
          "kind": "pet",
          "stat": "physicalDamageReductionPct",
          "param": 1,
          "when": {
            "pet": "Voidwalker"
          }
        },
        {
          "kind": "pet",
          "stat": "damagePct",
          "param": 2,
          "when": {
            "pet": "Succubus"
          }
        },
        {
          "kind": "pet",
          "stat": "allRes",
          "param": 3,
          "when": {
            "pet": "Felhunter"
          }
        },
        {
          "kind": "global",
          "stat": "spellCrit",
          "param": 4,
          "when": {
            "pet": [
              "Felguard",
              "Doomguard"
            ]
          },
          "note": "Greater demon eligibility uses planner's named greater-demon choices; verify client demon categories."
        },
        {
          "kind": "pet",
          "stat": "spellCrit",
          "param": 4,
          "when": {
            "pet": [
              "Felguard",
              "Doomguard"
            ]
          },
          "note": "Greater demon spell critical strike, not melee crit."
        }
      ],
      "371": [
        {
          "kind": "pending",
          "note": "Unleashed Potential temporarily transfers some Fire/Shadow bonus spell damage into a demon after owner hits and can stack"
        }
      ],
      "372": [
        {
          "kind": "scoped",
          "scope": "All damage while Soul Link demon active",
          "stat": "damagePct",
          "param": 0,
          "values": [
            5
          ],
          "when": {
            "pet": [
              "Imp",
              "Voidwalker",
              "Succubus",
              "Felhunter",
              "Felguard",
              "Doomguard"
            ],
            "soulLink": "On"
          }
        },
        {
          "kind": "pending",
          "note": "Soul Link shares incoming owner damage with an active demon and requires unit health/timing mechanics"
        },
        {
          "kind": "pet",
          "stat": "damagePct",
          "param": 0,
          "values": [
            5
          ],
          "when": {
            "pet": [
              "Imp",
              "Voidwalker",
              "Succubus",
              "Felhunter",
              "Felguard",
              "Doomguard"
            ],
            "soulLink": "On"
          }
        },
        {
          "kind": "scoped",
          "scope": "Soul Link",
          "stat": "transferredDamagePct",
          "param": 0,
          "values": [
            20
          ],
          "when": {
            "pet": [
              "Imp",
              "Voidwalker",
              "Succubus",
              "Felhunter",
              "Felguard",
              "Doomguard"
            ],
            "soulLink": "On"
          }
        }
      ]
    },
    "coverage": {
      "321": {
        "status": "proc-or-conditional",
        "note": "Shadow Vulnerability applies a chance-based timed target Shadow-damage debuff after certain spells"
      },
      "322": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "323": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "324": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "325": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "326": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "327": {
        "status": "proc-or-conditional",
        "note": "Shadowburn is an active direct Shadow spell granting a Soul Shard only after qualifying target death"
      },
      "328": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "329": {
        "status": "proc-or-conditional",
        "note": "Pyroclasm stun chance depends on particular Fire ability hits"
      },
      "330": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "331": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "332": {
        "status": "proc-or-conditional",
        "note": "Improved Soul Fire refunds a Soul Shard and applies temporary Fire bonus after Soul Fire resolves"
      },
      "333": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "334": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "335": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "336": {
        "status": "proc-or-conditional",
        "note": "Conflagrate is an active Fire spell consuming remaining Immolate duration for extra damage"
      },
      "337": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "338": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "339": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "340": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "341": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "342": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "343": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "344": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "345": {
        "status": "proc-or-conditional",
        "note": "Curse of Exhaustion is an active movement curse with one-curse-per-target rules"
      },
      "346": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "347": {
        "status": "proc-or-conditional",
        "note": "Nightfall is a chance-on-periodic-affliction-damage Shadow Trance affecting next Shadow Bolt"
      },
      "348": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "349": {
        "status": "partial",
        "note": "Permanent +6% Affliction cast speed at both ranks; the rank-dependent tick-speed conversion needs simulation."
      },
      "350": {
        "status": "proc-or-conditional",
        "note": "Siphon Life is an active Shadow damage-over-time and healing drain; needs target timing"
      },
      "351": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "352": {
        "status": "proc-or-conditional",
        "note": "Malediction changes curse co-existence and automates Curse of Agony application, requiring target curse state"
      },
      "353": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "354": {
        "status": "proc-or-conditional",
        "note": "Dark Harvest is a channeled Shadow ability accelerating Affliction periodic effects and interacting with target deaths"
      },
      "355": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "356": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "357": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "358": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "359": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "360": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "361": {
        "status": "proc-or-conditional",
        "note": "Fel Domination temporarily changes the next demon summoning cast time and mana cost"
      },
      "362": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "363": {
        "status": "proc-or-conditional",
        "note": "Demonic Sacrifice consumes a selected demon and grants a demon-dependent temporary/persistent aura which ends on new summons; no sacrifice state control"
      },
      "364": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "365": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "366": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "367": {
        "status": "partial",
        "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
      },
      "368": {
        "status": "proc-or-conditional",
        "note": "Power Overwhelming is an on-use demon damage/CC modifier with self-damage to the pet"
      },
      "369": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "370": {
        "status": "partial",
        "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
      },
      "371": {
        "status": "proc-or-conditional",
        "note": "Unleashed Potential temporarily transfers some Fire/Shadow bonus spell damage into a demon after owner hits and can stack"
      },
      "372": {
        "status": "partial",
        "note": "Soul Link shares incoming owner damage with an active demon and requires unit health/timing mechanics"
      }
    }
  },
  "druid": {
    "sourceBranch": "audit/talent-effects-druid",
    "sourceBlob": "c94b1b10fa8d6bac27252aa59a05e0b72433ee6a",
    "sourceNote": "/* All 54 druid talents reviewed against https://octowow.st/talents/druid/; snapshot SHA256 7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc. */",
    "rules": {
      "267": [
        {
          "kind": "scoped",
          "scope": "Feral abilities",
          "stat": "rageEnergyCostReduction",
          "param": 0
        }
      ],
      "268": [
        {
          "kind": "scoped",
          "scope": "Demoralizing Roar",
          "stat": "attackPowerReductionPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Ferocious Bite",
          "stat": "damagePct",
          "param": 1
        }
      ],
      "269": [
        {
          "kind": "scoped",
          "scope": "Bear Form",
          "stat": "threatPct",
          "param": 0,
          "when": {
            "form": "Bear"
          }
        }
      ],
      "270": [
        {
          "kind": "scoped",
          "scope": "Bash/Pounce",
          "stat": "stunDurationIncreaseSeconds",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Stun duration preview is not a full target crowd-control calculation; diminishing returns unverified"
        }
      ],
      "271": [
        {
          "kind": "special",
          "stat": "itemArmourPct",
          "param": 0
        }
      ],
      "272": [
        {
          "kind": "scoped",
          "scope": "Rip",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Claw per active Bleed",
          "stat": "damagePct",
          "param": 1,
          "perOption": "activeBleeds"
        }
      ],
      "273": [
        {
          "kind": "global",
          "stat": "dodge",
          "param": 1,
          "when": {
            "form": [
              "Cat",
              "Bear"
            ]
          }
        },
        {
          "kind": "pending",
          "note": "Outdoor Cat Form movement speed is not a permanent combat stat"
        },
        {
          "kind": "scoped",
          "scope": "Cat outdoor movement",
          "stat": "movementSpeedPct",
          "param": 0,
          "when": {
            "form": "Cat",
            "outdoors": "Yes"
          }
        }
      ],
      "274": [
        {
          "kind": "pending",
          "note": "Feral Charge is an active charge/interrupt/immobilise ability with range and target context"
        }
      ],
      "275": [
        {
          "kind": "global",
          "stat": "crit",
          "param": 0,
          "when": {
            "form": [
              "Cat",
              "Bear"
            ]
          }
        }
      ],
      "276": [
        {
          "kind": "pending",
          "note": "Primal Fury generates Rage after Bear critical hits or extra combo points after Cat critical builders"
        }
      ],
      "277": [
        {
          "kind": "special",
          "stat": "apPct",
          "param": 0,
          "when": {
            "form": [
              "Cat",
              "Bear"
            ]
          }
        },
        {
          "kind": "scoped",
          "scope": "Claw/Rake/Maul/Swipe/Savage Bite",
          "stat": "damagePct",
          "param": 1
        }
      ],
      "278": [
        {
          "kind": "scoped",
          "scope": "Tiger's Fury",
          "stat": "durationIncreaseSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Enrage",
          "stat": "instantRageGained",
          "param": 1
        },
        {
          "kind": "pending",
          "note": "Attack speed increase from active Tiger's Fury/Enrage is not passive"
        }
      ],
      "279": [
        {
          "kind": "scoped",
          "scope": "Shred",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Shred",
          "stat": "energyCostReduction",
          "param": 1
        }
      ],
      "280": [
        {
          "kind": "pending",
          "note": "Ancient Brutality triggers Rage on Bear dodge and modifies Cat periodic-bleed mechanics; event and aura modelling pending"
        }
      ],
      "281": [
        {
          "kind": "pending",
          "note": "Berserk is a temporary form-specific on-use buff; Cat Energy regeneration or Bear maximum health must not be permanently inflated"
        }
      ],
      "282": [
        {
          "kind": "percent",
          "stat": "int",
          "param": 0
        },
        {
          "kind": "percent",
          "stat": "sta",
          "param": 1,
          "when": {
            "form": "Bear"
          }
        },
        {
          "kind": "percent",
          "stat": "str",
          "param": 2,
          "when": {
            "form": "Cat"
          }
        }
      ],
      "283": [
        {
          "kind": "pending",
          "note": "Carnage returns ability damage as healing and conditionally refreshes bleeds from Ferocious Bite; needs target and attack events"
        }
      ],
      "284": [
        {
          "kind": "scoped",
          "scope": "Leader of the Pack",
          "stat": "partyCritPct",
          "param": 0,
          "values": [
            3
          ],
          "when": {
            "form": [
              "Cat",
              "Bear"
            ]
          }
        },
        {
          "kind": "pending",
          "note": "Aura self-application/party eligibility not independently validated"
        },
        {
          "kind": "special",
          "stat": "feralPackCrit",
          "values": [
            3
          ],
          "when": {
            "form": [
              "Cat",
              "Bear"
            ]
          },
          "note": "Self aura shown once; explicitly selected Leader of the Pack buff is not stacked again"
        }
      ],
      "285": [
        {
          "kind": "scoped",
          "scope": "Mark/Gift of the Wild",
          "stat": "buffEffectivenessPct",
          "param": 0
        },
        {
          "kind": "buff",
          "source": "wild",
          "stat": "str",
          "param": 0,
          "note": "Only the selected wild buff is enhanced; unrelated buffs are unchanged"
        },
        {
          "kind": "buff",
          "source": "wild",
          "stat": "agi",
          "param": 0,
          "note": "Only the selected wild buff is enhanced; unrelated buffs are unchanged"
        },
        {
          "kind": "buff",
          "source": "wild",
          "stat": "sta",
          "param": 0,
          "note": "Only the selected wild buff is enhanced; unrelated buffs are unchanged"
        }
      ],
      "286": [
        {
          "kind": "pending",
          "note": "Furor gains Rage/Energy on changing to Bear/Cat forms, rather than adding a passive resource cap"
        }
      ],
      "287": [
        {
          "kind": "scoped",
          "scope": "Healing Touch",
          "stat": "castTimeReductionSeconds",
          "param": 0
        }
      ],
      "288": [
        {
          "kind": "scoped",
          "scope": "Healing Touch/Regrowth/Tranquility",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "289": [
        {
          "kind": "scoped",
          "scope": "Spells",
          "stat": "threatReductionPct",
          "param": 0
        }
      ],
      "290": [
        {
          "kind": "pending",
          "note": "Swiftmend consumes existing Rejuvenation/Regrowth on the chosen target; needs a target HoT model"
        }
      ],
      "291": [
        {
          "kind": "scoped",
          "scope": "Periodic magic",
          "stat": "damageAndHealingPct",
          "param": 0
        }
      ],
      "292": [
        {
          "kind": "scoped",
          "scope": "Mana regeneration while casting",
          "stat": "regenPct",
          "param": 0
        }
      ],
      "293": [
        {
          "kind": "scoped",
          "scope": "Healing spells",
          "stat": "healingPct",
          "param": 0
        }
      ],
      "294": [
        {
          "kind": "scoped",
          "scope": "Healing Touch/Regrowth/Tranquility",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "295": [
        {
          "kind": "pending",
          "note": "Aessina's Bloom requires a target with Regrowth/Rejuvenation and grants a temporary Healing Touch cast-cost effect"
        }
      ],
      "296": [
        {
          "kind": "pending",
          "note": "Nature's Swiftness is an on-use next-Nature-spell instant cast"
        }
      ],
      "297": [
        {
          "kind": "scoped",
          "scope": "Regrowth with Rejuvenation",
          "stat": "periodicHealingPct",
          "param": 0,
          "when": {
            "targetRejuvenation": "On"
          }
        }
      ],
      "298": [
        {
          "kind": "spell",
          "scope": "Regrowth",
          "stat": "crit",
          "param": 0
        }
      ],
      "299": [
        {
          "kind": "scoped",
          "scope": "Tranquility",
          "stat": "healingPct",
          "param": 0
        }
      ],
      "300": [
        {
          "kind": "pending",
          "note": "Tree of Life cannot currently be selected in class form options; do not assume its aura or armour effect is active"
        }
      ],
      "301": [
        {
          "kind": "scoped",
          "scope": "Wrath",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Wrath",
          "stat": "globalCooldownReductionSeconds",
          "param": 0
        }
      ],
      "302": [
        {
          "kind": "pending",
          "note": "Nature's Grasp is an outdoor active one-charge reactive root; requires incoming attack and outdoor context"
        }
      ],
      "303": [
        {
          "kind": "pending",
          "note": "Improved Nature's Grasp increases chance of root application from active Nature's Grasp charges, not passive dodge"
        }
      ],
      "304": [
        {
          "kind": "pending",
          "note": "Sylvan Blessing triggers full while-casting mana regeneration only after killing an eligible target"
        }
      ],
      "305": [
        {
          "kind": "scoped",
          "scope": "Balance spell casting",
          "stat": "pushbackAvoidancePct",
          "param": 0
        }
      ],
      "306": [
        {
          "kind": "spell",
          "scope": "Moonfire",
          "stat": "crit",
          "param": 0
        },
        {
          "kind": "spell",
          "scope": "Moonfire",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "307": [
        {
          "kind": "global",
          "stat": "hit",
          "param": 1
        },
        {
          "kind": "global",
          "stat": "spellHit",
          "param": 1
        },
        {
          "kind": "scoped",
          "scope": "All physical attacks",
          "stat": "damagePct",
          "param": 0
        },
        {
          "kind": "special",
          "stat": "weaponDamagePct",
          "param": 0,
          "note": "Applies to the displayed equipped weapon contribution, not verified feral auto-attack damage"
        }
      ],
      "308": [
        {
          "kind": "scoped",
          "scope": "Shapeshifting",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "309": [
        {
          "kind": "scoped",
          "scope": "Starfire/Moonfire/Hurricane/Insect Swarm/Wrath",
          "stat": "damagePct",
          "param": 0
        }
      ],
      "310": [
        {
          "kind": "pending",
          "note": "Omen of Clarity triggers Clearcasting from melee hits/spell casts and consumes a later ability cost"
        }
      ],
      "311": [
        {
          "kind": "scoped",
          "scope": "Balance/utility spells",
          "stat": "rangeIncreasePct",
          "param": 0
        }
      ],
      "312": [
        {
          "kind": "scoped",
          "scope": "Starfire/Moonfire/Wrath",
          "stat": "criticalDamagePct",
          "param": 0
        }
      ],
      "313": [
        {
          "kind": "scoped",
          "scope": "Balance and healing spells",
          "stat": "manaCostReductionPct",
          "param": 0
        }
      ],
      "314": [
        {
          "kind": "pending",
          "note": "Owlkin Frenzy can trigger only after taking damage in Moonkin form; mana regeneration and pushback aura require incoming events"
        }
      ],
      "315": [
        {
          "kind": "pending",
          "note": "The Moonkin form armour multiplier is implemented by the existing form calculator. Remaining spell mana/damage effects need modelling."
        },
        {
          "kind": "special",
          "stat": "formItemArmourPct",
          "param": 0,
          "values": [
            180
          ],
          "when": {
            "form": "Moonkin"
          }
        },
        {
          "kind": "scoped",
          "scope": "Balance spells",
          "stat": "manaCostReductionPct",
          "param": 0,
          "values": [
            20
          ],
          "when": {
            "form": "Moonkin"
          }
        }
      ],
      "316": [
        {
          "kind": "pending",
          "note": "Nature's Grace shortens only the next cast following a spell critical"
        }
      ],
      "317": [
        {
          "kind": "scoped",
          "scope": "Starfire",
          "stat": "castTimeReductionSeconds",
          "param": 0
        },
        {
          "kind": "pending",
          "note": "Starfire stun chance requires hit/event resolution"
        }
      ],
      "318": [
        {
          "kind": "scoped",
          "scope": "Wrath",
          "stat": "manaRefundPct",
          "param": 0,
          "when": {
            "targetInsectSwarm": "On"
          }
        },
        {
          "kind": "scoped",
          "scope": "Starfire",
          "stat": "crit",
          "param": 1,
          "when": {
            "targetMoonfire": "On"
          }
        },
        {
          "kind": "pending",
          "note": "Wrath mana refund requires damage to land; scenario preview is not a net unconditional cast cost"
        }
      ],
      "319": [
        {
          "kind": "scoped",
          "scope": "Hurricane",
          "stat": "manaCostReductionPct",
          "param": 0
        },
        {
          "kind": "scoped",
          "scope": "Hurricane target slow",
          "stat": "attackSpeedReductionPct",
          "param": 1
        }
      ],
      "320": [
        {
          "kind": "pending",
          "note": "Eclipse is two triggered Arcane/Nature damage auras from Wrath/Starfire; proc and spell-family modelling pending"
        }
      ]
    },
    "coverage": {
      "267": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "268": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "269": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "270": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "271": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "272": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "273": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "274": {
        "status": "proc-or-conditional",
        "note": "Feral Charge is an active charge/interrupt/immobilise ability with range and target context"
      },
      "275": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "276": {
        "status": "proc-or-conditional",
        "note": "Primal Fury generates Rage after Bear critical hits or extra combo points after Cat critical builders"
      },
      "277": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "278": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "279": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "280": {
        "status": "proc-or-conditional",
        "note": "Ancient Brutality triggers Rage on Bear dodge and modifies Cat periodic-bleed mechanics; event and aura modelling pending"
      },
      "281": {
        "status": "proc-or-conditional",
        "note": "Berserk is a temporary form-specific on-use buff; Cat Energy regeneration or Bear maximum health must not be permanently inflated"
      },
      "282": {
        "status": "sheet",
        "note": "Passive stat or equipment-specific effect included in planning estimates."
      },
      "283": {
        "status": "proc-or-conditional",
        "note": "Carnage returns ability damage as healing and conditionally refreshes bleeds from Ferocious Bite; needs target and attack events"
      },
      "284": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "285": {
        "status": "partial",
        "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
      },
      "286": {
        "status": "proc-or-conditional",
        "note": "Furor gains Rage/Energy on changing to Bear/Cat forms, rather than adding a passive resource cap"
      },
      "287": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "288": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "289": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "290": {
        "status": "proc-or-conditional",
        "note": "Swiftmend consumes existing Rejuvenation/Regrowth on the chosen target; needs a target HoT model"
      },
      "291": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "292": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "293": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "294": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "295": {
        "status": "proc-or-conditional",
        "note": "Aessina's Bloom requires a target with Regrowth/Rejuvenation and grants a temporary Healing Touch cast-cost effect"
      },
      "296": {
        "status": "proc-or-conditional",
        "note": "Nature's Swiftness is an on-use next-Nature-spell instant cast"
      },
      "297": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "298": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "299": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "300": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "301": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "302": {
        "status": "proc-or-conditional",
        "note": "Nature's Grasp is an outdoor active one-charge reactive root; requires incoming attack and outdoor context"
      },
      "303": {
        "status": "proc-or-conditional",
        "note": "Improved Nature's Grasp increases chance of root application from active Nature's Grasp charges, not passive dodge"
      },
      "304": {
        "status": "proc-or-conditional",
        "note": "Sylvan Blessing triggers full while-casting mana regeneration only after killing an eligible target"
      },
      "305": {
        "status": "partial",
        "note": "Scoped rank data; exact combat calculation pending"
      },
      "306": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "307": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "308": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "309": {
        "status": "partial",
        "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
      },
      "310": {
        "status": "proc-or-conditional",
        "note": "Omen of Clarity triggers Clearcasting from melee hits/spell casts and consumes a later ability cost"
      },
      "311": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "312": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "313": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "314": {
        "status": "proc-or-conditional",
        "note": "Owlkin Frenzy can trigger only after taking damage in Moonkin form; mana regeneration and pushback aura require incoming events"
      },
      "315": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "316": {
        "status": "proc-or-conditional",
        "note": "Nature's Grace shortens only the next cast following a spell critical"
      },
      "317": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "318": {
        "status": "proc-or-conditional",
        "note": "Balance of All Things refunds mana only for Wrath against Insect Swarm targets and raises Starfire crit only against Moonfire targets"
      },
      "319": {
        "status": "partial",
        "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
      },
      "320": {
        "status": "proc-or-conditional",
        "note": "Eclipse is two triggered Arcane/Nature damage auras from Wrath/Starfire; proc and spell-family modelling pending"
      }
    }
  }
};
export function getTalentAudit(classId){if(!Object.hasOwn(TALENT_AUDITS,classId))throw new Error('Unsupported talent audit class: '+classId);return structuredClone(TALENT_AUDITS[classId]);}
