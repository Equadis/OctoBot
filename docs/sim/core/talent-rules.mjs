/* All 52 warlock talents reviewed against https://octowow.st/talents/warlock/; snapshot SHA256 d468b1c035cfcbb2572a508d84e37d184e17c009bcfe5db399db175a4c6ced81. */
export const AUDITED_CLASS="warlock";
export const TALENT_RULES={
  "328": [
    {
      "kind": "spell",
      "scope": "Destruction",
      "stat": "crit",
      "param": 0
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
  "342": [
    {
      "kind": "scoped",
      "scope": "Drain Soul/Life/Mana",
      "stat": "effectivenessPct",
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
  "353": [
    {
      "kind": "spell",
      "scope": "Shadow",
      "stat": "damagePct",
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
  "364": [
    {
      "kind": "pending",
      "note": "Stone enhancement and Firestone bonuses require an equipped stone-state check"
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
  ]
};
export const TALENT_COVERAGE={
  "321": {
    "status": "proc-or-conditional",
    "note": "Your Shadow Bolt and Drain Soul have a 10% chance to increase Shadow damage dealt to the target by 20% for 10 sec, with a higher chance to trigger on critical hits."
  },
  "322": {
    "status": "ability-specific",
    "note": "Reduces the Mana cost of your Destruction spells by 10%."
  },
  "323": {
    "status": "ability-specific",
    "note": "Reduces the casting time of your Imp's Firebolt spell by 0.5 sec and reduces the cooldown of your Succubus' Lash of Pain spell by 6 sec."
  },
  "324": {
    "status": "active-or-non-stat",
    "note": "Reduces the casting time of your Shadow Bolt, Searing Pain, and Immolate spells by 0.5 sec and your Soul Fire spell by 2 sec."
  },
  "325": {
    "status": "proc-or-conditional",
    "note": "Increases the periodic damage of your Immolate spell by 6% and gives your Destruction spells a 10% chance to slow the target by 50% for 5 sec."
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
    "status": "ability-specific",
    "note": "Increases the range of your Destruction spells by 20% and the radius of your Hellfire by 20%."
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
    "status": "ability-specific",
    "note": "Increases the damage of your Immolate spell by 20%."
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
    "status": "active-or-non-stat",
    "note": "Reduces the casting time of your Corruption spell by 1.5 sec."
  },
  "339": {
    "status": "ability-specific",
    "note": "Increases the attack speed reduction of your Curse of Weakness by 5%."
  },
  "340": {
    "status": "proc-or-conditional",
    "note": "Reduces the chance your Affliction spells will be dispelled by an additional 15%."
  },
  "341": {
    "status": "active-or-non-stat",
    "note": "Increases the amount of Mana awarded by your Life Tap spell by 20%."
  },
  "342": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "343": {
    "status": "ability-specific",
    "note": "Increases the damage done by your Curse of Agony by 10%."
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
    "status": "ability-specific",
    "note": "Increases the range of your Affliction spells by 20%."
  },
  "347": {
    "status": "proc-or-conditional",
    "note": "Gives your Corruption, Dark Harvest and Drain spells a 4% chance to cause you to enter a Shadow Trance state after damaging the opponent. The Shadow Trance state reduces the c"
  },
  "348": {
    "status": "ability-specific",
    "note": "Increases the damage of your Drain Soul, Dark Harvest and Death Coil by an additional 6% for each of your Affliction effects on the target, up to a maximum of 4 effects."
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
    "status": "ability-specific",
    "note": "Increases the speed reduction of your Curse of Exhaustion by 30%."
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
    "status": "ability-specific",
    "note": "Increases the movement speed of your demons by 10%."
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
    "status": "active-or-non-stat",
    "note": "Increases the amount of Health transferred by your Health Funnel by 20% of your demon's missing Health and the Mana transferred by your Mana Funnel by 20% of your demon's miss"
  },
  "359": {
    "status": "ability-specific",
    "note": "Increases the effectiveness of your Demon Armor spell by 60%."
  },
  "360": {
    "status": "proc-or-conditional",
    "note": "Increases your demon's Intellect by 30% of your total Intellect and allows 15% of its Mana regeneration to continue while casting."
  },
  "361": {
    "status": "ability-specific",
    "note": "Your next Common demon summoning spell has its casting time reduced by 4.5 sec and its Mana cost reduced by 40%."
  },
  "362": {
    "status": "proc-or-conditional",
    "note": "Increases your demon's Stamina by 50% of your total Stamina and reduces its chance to be critically struck by 5%."
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
    "status": "active-or-non-stat",
    "note": "Increases the effect of your Succubus' Seduction, your Voidwalker's Torment, your Imp's Blood Pact, and your Felhunter's Tainted Blood spells by 45%."
  },
  "367": {
    "status": "ability-specific",
    "note": "Increases the damage done by your demons by 15%."
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
    "status": "proc-or-conditional",
    "note": "Grants both the Warlock and the summoned demon an effect as long as that demon is active. Imp - Reduces spell costs by 15%. Voidwalker - Reduces physical damage taken by 10%. "
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
