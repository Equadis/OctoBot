/* All 55 mage talents reviewed against https://octowow.st/talents/mage/; snapshot SHA256 7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1. */
export const AUDITED_CLASS="mage";
export const TALENT_RULES={
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
};
export const TALENT_COVERAGE={
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
};
