/* All 54 druid talents reviewed against https://octowow.st/talents/druid/; snapshot SHA256 7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc. */
export const AUDITED_CLASS="druid";
export const TALENT_RULES={
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
};
export const TALENT_COVERAGE={
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
};
