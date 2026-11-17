/* All 52 priest talents reviewed against https://octowow.st/talents/priest/; snapshot SHA256 ae346edead76b1ad082b31ea373fc64f72b72538333746555c062f2d27bcf5fb. */
export const AUDITED_CLASS="priest";
export const TALENT_RULES={
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
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Vampiric Embrace",
      "stat": "partyManaReturnPct",
      "param": 1
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
};
export const TALENT_COVERAGE={
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
};
