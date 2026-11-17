/* All 56 rogue talents reviewed against https://octowow.st/talents/rogue/; snapshot SHA256 865b889058c29c8485d457a3817094b4c289fd588ead58d9ec7d1a295b5fbf65. */
export const AUDITED_CLASS="rogue";
export const TALENT_RULES={
  "110": [
    {
      "kind": "scoped",
      "scope": "Backstab/Garrote/Ambush from behind",
      "stat": "damagePct",
      "param": 0
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
      "kind": "spell",
      "scope": "Backstab",
      "stat": "crit",
      "param": 0
    }
  ],
  "114": [
    {
      "kind": "global",
      "stat": "hit",
      "param": 0
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
  "128": [
    {
      "kind": "scoped",
      "scope": "Eviscerate",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "130": [
    {
      "kind": "global",
      "stat": "crit",
      "param": 0
    }
  ],
  "132": [
    {
      "kind": "scoped",
      "scope": "Humanoid/Giant/Beast/Dragonkin targets",
      "stat": "damagePct",
      "param": 0
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
      "kind": "spell",
      "scope": "Ambush",
      "stat": "crit",
      "param": 0
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
    "note": "A strike that becomes active after parrying an opponent's attack. This attack deals 150% weapon damage and disarms the target for 6 sec."
  },
  "116": {
    "status": "proc-or-conditional",
    "note": "Gives a 100% chance to remove all movement impairing effects when you activate your Sprint ability."
  },
  "117": {
    "status": "proc-or-conditional",
    "note": "Gives you a 45% chance to add a combo point to your target after dodging their attack or fully resisting one of their spells."
  },
  "118": {
    "status": "proc-or-conditional",
    "note": "Gives your Kick ability a 100% chance to silence the target for 2 sec."
  },
  "119": {
    "status": "proc-or-conditional",
    "note": "Gives you a 6% chance to stun your target for 3 sec with a mace."
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
    "note": "A surprise strike that deals 25% of your Attack Power as damage. Only useable after the target dodges and cannot be blocked, dodged or parried by the target. Awards 1 combo po"
  },
  "123": {
    "status": "proc-or-conditional",
    "note": "Gives you a 5% chance to get an extra attack on the same target after dealing damage with your Axe or Sword."
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
    "note": "Increases your Energy regeneration rate by 100% for 15 sec."
  },
  "128": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "129": {
    "status": "proc-or-conditional",
    "note": "After killing an opponent that yields experience or honor, gives you a 40% increased critical strike chance on your next Combo Point generating ability. Lasts 40 sec."
  },
  "130": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "131": {
    "status": "proc-or-conditional",
    "note": "Gives your finishing moves a 100% chance to add a combo point to your target."
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
    "note": "Your finishing moves have a 20% chance per combo point to restore 20 energy and increase the damage of your finishing moves by 5% for 30 sec. Stacks up to 5 times."
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
    "note": "Finishing move that increases the effectiveness and the chance to apply poisons to your target by 30%. Lasts longer per combo point: 1 point : 12 seconds 2 points: 16 seconds "
  },
  "142": {
    "status": "proc-or-conditional",
    "note": "When activated, increases the critical strike chance of your next Sinister Strike, Backstab, Ambush, Noxious Assault, or Eviscerate by 100%."
  },
  "143": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "144": {
    "status": "proc-or-conditional",
    "note": "Your critical strikes from abilities that add combo points have a 100% chance to add an additional combo point."
  },
  "145": {
    "status": "ability-specific",
    "note": "Strikes with both weapons, dealing 30 damage plus 30% of your Attack Power and applies poisons from both weapons. Awards 1 combo point."
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
    "status": "ability-specific",
    "note": "Reduces the cooldown of your Vanish and Blind abilities by 1.5 min."
  },
  "151": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "152": {
    "status": "proc-or-conditional",
    "note": "Gives you a 100% chance to add an additional combo point to your target when using your Ambush, Garrote, or Cheap Shot ability."
  },
  "153": {
    "status": "proc-or-conditional",
    "note": "Your Ghostly Strike increases your movement speed by 15% and increases your party members' movement speed by 6% within 30 yards for 5 sec. In addition, reduces the Energy cost"
  },
  "154": {
    "status": "proc-or-conditional",
    "note": "Creates a cloud of thick smoke in 8 yards around you for 8 sec. All targets inside the smoke have a 20% reduced chance of being hit by attacks and spells for the duration."
  },
  "155": {
    "status": "ability-specific",
    "note": "An instant strike that deals 110% weapon damage and causes the target to hemorrhage, increasing any Physical damage dealt to the target by 2%. Lasts 50 charges or 15 sec. Awar"
  },
  "156": {
    "status": "proc-or-conditional",
    "note": "Whenever you Vanish, you and nearby party members within 20 yards are cloaked in shadows, gaining a barrier that absorbs up to 12% of your maximum health for 20 sec."
  },
  "157": {
    "status": "proc-or-conditional",
    "note": "Your Sap and Blind abilities reduce the target's damage dealt by 10% for 8 sec when their effect ends or fails to apply. In addition, you have a 100% chance to return to steal"
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
    "note": "When activated, this ability immediately finishes the cooldown on your other Rogue abilities."
  },
  "161": {
    "status": "proc-or-conditional",
    "note": "A finishing move that etches a sigil onto the target for 6 sec. The sigil accumulates damage equal to a percentage of all damage the target takes during its duration, up to a "
  },
  "162": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "163": {
    "status": "ability-specific",
    "note": "Physical critical strikes by you or party members within 20 yards grant you 5 Energy."
  },
  "164": {
    "status": "proc-or-conditional",
    "note": "Your opening moves have a 100% chance and your finishing moves have a 20% chance per combo point to increase your party members' critical strike chance by 2% for 12 sec. This "
  },
  "165": {
    "status": "proc-or-conditional",
    "note": "A marking strike that deals 135% weapon damage and reveals the target’s vulnerabilities, increasing your party members' Attack Power by 30% and damage done by magical spells a"
  }
};
