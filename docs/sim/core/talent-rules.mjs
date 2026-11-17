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
      "param": 1
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
    }
  ],
  "285": [
    {
      "kind": "scoped",
      "scope": "Mark/Gift of the Wild",
      "stat": "buffEffectivenessPct",
      "param": 0
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
  "289": [
    {
      "kind": "scoped",
      "scope": "Spells",
      "stat": "threatReductionPct",
      "param": 0
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
  "297": [
    {
      "kind": "scoped",
      "scope": "Regrowth with Rejuvenation",
      "stat": "periodicHealingPct",
      "param": 0
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
  "306": [
    {
      "kind": "spell",
      "scope": "Moonfire",
      "stat": "crit",
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
  "315": [
    {
      "kind": "pending",
      "note": "The Moonkin form armour multiplier is implemented by the existing form calculator. Remaining spell mana/damage effects need modelling."
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
    "note": "Causes you to charge an enemy, immobilizing and interrupting any spell being cast for 4 sec."
  },
  "275": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "276": {
    "status": "proc-or-conditional",
    "note": "Gives you a 100% chance to gain an additional 5 Rage anytime you get a critical strike while in Bear and Dire Bear Form and your critical strikes from Cat Form abilities that "
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
    "note": "Dodging an attack while in Bear or Dire Bear Form imbues you with the spirit of the Ancients, generating 4 Rage per second for 5 sec. This effect can only occur once every 9 s"
  },
  "281": {
    "status": "proc-or-conditional",
    "note": "Removes all Fear effects and increases your energy regeneration rate by 100% while in Cat form, and increases your total health by 20% while in Bear form. After the effect end"
  },
  "282": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "283": {
    "status": "proc-or-conditional",
    "note": "Your Maul, Swipe, and Savage Bite abilities return 10% of their damage as healing to you. In addition, gives your Ferocious Bite a 20% chance per combo point spent to refresh "
  },
  "284": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "285": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "286": {
    "status": "proc-or-conditional",
    "note": "Gives you 100% chance to gain 10 Rage when you shapeshift into Bear and Dire Bear Form or 40 Energy when you shapeshift into Cat Form."
  },
  "287": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "288": {
    "status": "proc-or-conditional",
    "note": "Gives you a 70% chance to avoid interruption caused by damage while casting the Healing Touch, Regrowth, and Tranquility spells."
  },
  "289": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "290": {
    "status": "active-or-non-stat",
    "note": "Consumes a Rejuvenation or Regrowth effect on a friendly target to instantly heal them an amount equal to 12 sec. of Rejuvenation or 18 sec. of Regrowth."
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
    "status": "ability-specific",
    "note": "Healing a target affected by Regrowth or Rejuvenation with your Healing Touch spells reduces the casting time of your next Healing Touch spell by 0.30 sec and refunds 10% of i"
  },
  "296": {
    "status": "proc-or-conditional",
    "note": "When activated, your next Nature spell becomes an instant cast spell."
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
    "note": "While active, any time an enemy strikes the caster they have a 35% chance to become afflicted by Entangling Roots (Rank 1). Only useable outdoors. 1 charge. Lasts 45 sec."
  },
  "303": {
    "status": "proc-or-conditional",
    "note": "Increases the chance for your Nature's Grasp to entangle an enemy by 65%."
  },
  "304": {
    "status": "proc-or-conditional",
    "note": "Gives you a 100% chance after killing a target that yields experience or honor to allow your Mana to regenerate at a 100% rate while casting. Lasts 15 sec."
  },
  "305": {
    "status": "proc-or-conditional",
    "note": "Gives you a 70% chance to avoid interruption caused by damage while casting your Balance spells."
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
    "note": "Imbues the Druid with natural energy. Each of the Druid's melee attacks or offensive spell casts has a chance of causing the caster to enter a Clearcasting state. The Clearcas"
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
    "note": "Damage taken while in Moonkin Form has a 10% chance to enrage you, granting a 30% chance to avoid interruption caused by damage while casting and regenerating 1% of your maxim"
  },
  "315": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "316": {
    "status": "ability-specific",
    "note": "All spell criticals grace you with a blessing of nature, reducing the casting time of your next spell by 0.5 sec."
  },
  "317": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "318": {
    "status": "proc-or-conditional",
    "note": "Damaging a target afflicted by Insect Swarm with Wrath refunds 30% of its mana cost. Starfire has a 9% increased chance to critically strike against targets affected by Moonfi"
  },
  "319": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "320": {
    "status": "proc-or-conditional",
    "note": "Aligns natural and astral energies. Damage from Wrath has a 40% chance to grant Arcane Eclipse, increasing Arcane damage dealt. Damage from Starfire has a 60% chance to grant "
  }
};
