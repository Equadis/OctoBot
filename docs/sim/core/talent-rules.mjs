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
  "193": [
    {
      "kind": "scoped",
      "scope": "Renew",
      "stat": "durationIncreaseSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Healing target with Renew",
      "stat": "healingPct",
      "param": 0
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
    "note": "Gives you a 100% chance to gain the Focused Casting effect that lasts for 6 sec after being the victim of a melee or ranged critical strike. The Focused Casting effect prevent"
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
    "note": "When activated, reduces the Mana cost of your next spell by 100% and increases its critical effect chance by 25% if it is capable of a critical effect."
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
    "note": "Your damaging Holy and Discipline spell critical strikes have a 100% chance to cause your next Smite spell to be instant cast and cost 60% less mana. Lasts 10 sec."
  },
  "178": {
    "status": "proc-or-conditional",
    "note": "Your Holy Fire has a 100% chance to increase your Holy damage by 12% for 10 sec."
  },
  "179": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "180": {
    "status": "proc-or-conditional",
    "note": "Bring a party member under your tutelage for 30 min. Whenever you cast a Discipline or Holy spell, you have a 10% chance with helpful spells, or 15% chance with harmful spells"
  },
  "181": {
    "status": "proc-or-conditional",
    "note": "When your Power Word: Shield is broken, 25% of its base mana cost is refunded and increases damage and healing done by Holy spells and effects by up to 10% of the shield's tot"
  },
  "182": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "183": {
    "status": "proc-or-conditional",
    "note": "Chastise the target, causing 139 to 160 Holy damage. If the target is an enemy, they are disoriented for up to 2 sec or until they take damage. If the target is an ally, their"
  },
  "184": {
    "status": "partial",
    "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
  },
  "185": {
    "status": "proc-or-conditional",
    "note": "Gives you a 70% chance to avoid interruption caused by damage while casting any Holy spell."
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
    "note": "After being struck by a melee or ranged critical hit, heal 25% of the damage taken over 6 sec."
  },
  "191": {
    "status": "proc-or-conditional",
    "note": "Increases your target's armor by 25% for 15 sec after getting a critical effect from your Flash Heal, Heal, Greater Heal, or Prayer of Healing spell."
  },
  "192": {
    "status": "proc-or-conditional",
    "note": "Causes an explosion of holy light around the caster, causing 27 to 31 Holy damage to all enemy targets within 10 yards and healing all party members within 10 yards for 54 to "
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
    "note": "Whenever you cast a healing spell, you regain 30% of its mana cost if it is different from your previous healing spell."
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
    "note": "Calls upon divine aid, purging all forms of crowd control and empowering your healing spells. Healing spells cost 33% less mana and their cast time is reduced by 20%. Allies h"
  },
  "201": {
    "status": "proc-or-conditional",
    "note": "Gives you a 100% chance to gain a 100% bonus to your Spirit after killing a target that yields experience or critically striking a target with Mind Blast. For the duration, ma"
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
    "note": "Gives your Shadow damage spells a 10% chance to stun the target for 2 sec."
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
    "status": "ability-specific",
    "note": "Assault the target's mind with Shadow energy, causing 75 Shadow damage over 3 sec and slowing their movement speed by 50%."
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
    "note": "Your Shadow damage spells have a 100% chance to grant you Shadow Weaving for 10 sec. Your Shadow damage spells apply a vulnerability that increases Shadow damage taken by 3% p"
  },
  "213": {
    "status": "proc-or-conditional",
    "note": "Silences the target, preventing them from casting spells for 5 sec."
  },
  "214": {
    "status": "ability-specific",
    "note": "Afflicts your target with Shadow energy that causes all party members to be healed for 20% of any Shadow spell damage you deal for 1 min."
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
