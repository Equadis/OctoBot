/* All 52 warlock talents reviewed against https://octowow.st/talents/warlock/; snapshot SHA256 d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81. */
export const AUDITED_CLASS="warlock";
export const TALENT_RULES={
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
      "perOption": "afflictionEffects"
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
        ]
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
        ]
      }
    }
  ]
};
export const TALENT_COVERAGE={
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
};
