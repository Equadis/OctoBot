/* All 52 warlock talents reviewed against https://octowow.st/talents/warlock/; snapshot SHA256 d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81. */
export const AUDITED_CLASS="warlock";
export const TALENT_RULES={
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
  "328": [
    {
      "kind": "spell",
      "scope": "Destruction",
      "stat": "crit",
      "param": 0
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
  "346": [
    {
      "kind": "scoped",
      "scope": "Affliction spells",
      "stat": "rangeIncreasePct",
      "param": 0
    }
  ],
  "348": [
    {
      "kind": "scoped",
      "scope": "Drain Soul/Dark Harvest/Death Coil per Affliction effect",
      "stat": "damagePct",
      "param": 0
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
  "351": [
    {
      "kind": "scoped",
      "scope": "Curse of Exhaustion",
      "stat": "slowIncreasePct",
      "param": 0
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
  "364": [
    {
      "kind": "pending",
      "note": "Stone enhancement and Firestone bonuses require an equipped stone-state check"
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
    }
  ],
  "370": [
    {
      "kind": "pending",
      "note": "Master Demonologist has five demon-specific rank vectors; bonuses need a controlled summon/active demon state and separate unit calculations"
    }
  ]
};
export const TALENT_COVERAGE={
  "321": {
    "status": "proc-or-conditional",
    "note": "Your Shadow Bolt and Drain Soul have a 10% chance to increase Shadow damage dealt to the target by 20% for 10 sec, with a higher chance to trigger on critical hits."
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
    "status": "proc-or-conditional",
    "note": "Gives your Fire spells a 70% chance to not lose casting time when you take damage."
  },
  "327": {
    "status": "ability-specific",
    "note": "Instantly blasts the target for 91 to 103 Shadow damage. If the target dies within 5 sec of Shadowburn, and yields experience or honor, the caster gains a Soul Shard."
  },
  "328": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "329": {
    "status": "proc-or-conditional",
    "note": "Gives your Rain of Fire, Hellfire, Conflagrate, and Soul Fire spells a 26% chance to stun the target for 3 sec."
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
    "note": "Your Soul Fire has a 100% chance to refund a Soul Shard and increase your Fire damage by 10% for 30 sec."
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
    "status": "ability-specific",
    "note": "Ignites the target, dealing 249 to 315 Fire damage and consuming 3 sec of your Immolate spell to deal an amount of damage equal to it."
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
    "status": "proc-or-conditional",
    "note": "Gives your Affliction spells a 70% chance to not lose casting time when you take damage."
  },
  "345": {
    "status": "proc-or-conditional",
    "note": "Reduces the target's movement speed by 10% for 12 sec. Only one Curse per Warlock can be active on any one target."
  },
  "346": {
    "status": "partial",
    "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
  },
  "347": {
    "status": "proc-or-conditional",
    "note": "Gives your Corruption, Dark Harvest and Drain spells a 4% chance to cause you to enter a Shadow Trance state after damaging the opponent. The Shadow Trance state reduces the c"
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
    "status": "active-or-non-stat",
    "note": "Transfers 150 Health from the target to the caster over 30 sec."
  },
  "351": {
    "status": "partial",
    "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
  },
  "352": {
    "status": "active-or-non-stat",
    "note": "Your Curse of Agony can be used alongside your other curses, except Curse of Doom. Applying Curse of Recklessness, Curse of Shadows, or Curse of Elements also afflicts the tar"
  },
  "353": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "354": {
    "status": "proc-or-conditional",
    "note": "Reaps the target's life, dealing 704 Shadow damage over 8 sec. While channeling, the time between periodic ticks of your Affliction spells on the target is reduced by 30%. If "
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
    "status": "ability-specific",
    "note": "Your next Common demon summoning spell has its casting time reduced by 4.5 sec and its Mana cost reduced by 40%."
  },
  "362": {
    "status": "partial",
    "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
  },
  "363": {
    "status": "proc-or-conditional",
    "note": "When activated, sacrifices your summoned demon to grant you an effect. The effect is canceled if any demon is summoned or enslaved. Imp: Increases spell damage done by 4%. Voi"
  },
  "364": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "365": {
    "status": "ability-specific",
    "note": "Reduces the casting time of your Imp, Voidwalker, Succubus, and Felhunter summoning spells by 4 sec and their mana cost by 60%. In addition, reduces the cooldown of Inferno, R"
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
    "note": "Channel energy into your demon, breaking all crowd control effects and increasing its damage dealt by 20% for 10 sec. The demon takes 40% of its base health as damage over the"
  },
  "369": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "370": {
    "status": "partial",
    "note": "Rank-based ability or conditional effect is scoped; numerical combat impact remains unimplemented and needs live verification."
  },
  "371": {
    "status": "proc-or-conditional",
    "note": "Your direct damage spell hits allow your demon to benefit from 15% of your Fire and Shadow spell bonus damage for 20 sec. Each tick of your funnel spells refreshes its duratio"
  },
  "372": {
    "status": "proc-or-conditional",
    "note": "While a demon is under your control, the damage dealt by you and your demon is increased by 5%. In addition, 20% of all damage you take is taken by your demon. Your Greater an"
  }
};
