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
};
