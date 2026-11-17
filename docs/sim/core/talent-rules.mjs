/* All 49 shaman talents reviewed against https://octowow.st/talents/shaman/; snapshot SHA256 8340d1af2ba89a41d8c28c5e9829f7cf5679b11864f6a7d00307fa1e2a02d2ac. */
export const AUDITED_CLASS="shaman";
export const TALENT_RULES={
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
  "249": [
    {
      "kind": "scoped",
      "scope": "Chain Heal",
      "stat": "castTimeReductionSeconds",
      "param": 0
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
      "param": 1
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
    }
  ],
  "263": [
    {
      "kind": "pending",
      "note": "Weapon imbue effects are different per imbue and often triggered; an imbue-specific stat/aura model is required"
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
    }
  ]
};
export const TALENT_COVERAGE={
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
    "note": "After landing a critical strike with a Fire, Frost, or Nature damage spell or melee attack, you enter a Clearcasting state. The Clearcasting state reduces the mana cost of you"
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
    "status": "ability-specific",
    "note": "Refreshing Flame Shock with Molten Blast deals damage equal to 60% of the refreshed duration."
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
    "note": "Increases your Fire, Frost, and Nature damage by 15% and reduces the mana cost of your offensive spells by 20% for 10 sec."
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
    "note": "Breaks the earth beneath the target, dealing 262 to 291 Nature damage to the target and an additional 35% of that damage as Nature damage to other enemies within 10 yards. Cre"
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
    "status": "ability-specific",
    "note": "Reduces the cooldown of your Reincarnation spell by 20 min and increases the amount of health and mana you reincarnate with by an additional 20%."
  },
  "238": {
    "status": "proc-or-conditional",
    "note": "Increases your target's armor value by 25% for 15 sec after getting a critical effect from one of your healing spells."
  },
  "239": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "240": {
    "status": "proc-or-conditional",
    "note": "Your Healing Wave and Lesser Healing Wave spells each have a 100% chance, and your Chain Heal spell has a 33% chance to increase the healing of your next Healing Wave or Chain"
  },
  "241": {
    "status": "proc-or-conditional",
    "note": "Gives you a 70% chance to avoid interruption caused by damage while casting any healing spell."
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
    "note": "After healing a target affected by your Healing Way effect, you have a 30% chance to regain mana equal to 15% of the base cost of the spell."
  },
  "247": {
    "status": "proc-or-conditional",
    "note": "When activated, your next Nature spell with a casting time less than 10 sec becomes an instant cast spell. Affected damaging spells have 25% reduced effectiveness."
  },
  "248": {
    "status": "proc-or-conditional",
    "note": "Your Healing Wave and Lesser Healing Wave spells have a 50% chance to restore a charge of your active Water Shield. When your Water Shield is at maximum charges, this effect c"
  },
  "249": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "250": {
    "status": "proc-or-conditional",
    "note": "Links the spirit of an ally to that of other group members within 35 yards. When the target takes damage, 30% is distributed among nearby allies. Lasts 20 sec."
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
    "status": "ability-specific",
    "note": "90% of the threat generated by your totems is transferred to you."
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
    "note": "Instantly strikes your target, causing 20% weapon damage and an additional 10% as Nature damage. This strike also triggers an empowered version of your active shield, consumin"
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
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "263": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "264": {
    "status": "proc-or-conditional",
    "note": "Gives you an extra attack for 100% weapon damage and increases the next 2 sources of Nature damage you deal by 25%. Lasts 12 sec."
  },
  "265": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "266": {
    "status": "proc-or-conditional",
    "note": "Fly into a frenzy, increasing your attack speed by 20% and spell casting speed by 20% for 30 sec. While under this effect, your melee critical strikes increase the attack and "
  }
};
