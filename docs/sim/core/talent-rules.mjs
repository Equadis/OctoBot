/* All 56 rogue talents reviewed against https://octowow.st/talents/rogue/; snapshot SHA256 865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65. */
export const AUDITED_CLASS="rogue";
export const TALENT_RULES={
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
};
export const TALENT_COVERAGE={
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
};
