/* All 55 hunter talents reviewed against https://octowow.st/talents/hunter/; snapshot SHA256 5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854. */
export const AUDITED_CLASS="hunter";
export const TALENT_RULES={
  "374": [
    {
      "kind": "pet",
      "stat": "staminaFromOwnerPct",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "healthPct",
      "param": 1
    }
  ],
  "376": [
    {
      "kind": "global",
      "stat": "dodge",
      "param": 0,
      "when": {
        "aspect": "Aspect of the Monkey"
      }
    }
  ],
  "377": [
    {
      "kind": "pet",
      "stat": "armourFromOwnerPct",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "armourPct",
      "param": 1
    }
  ],
  "384": [
    {
      "kind": "pet",
      "stat": "crit",
      "param": 0
    }
  ],
  "388": [
    {
      "kind": "pet",
      "stat": "hit",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "spellHit",
      "param": 1
    },
    {
      "kind": "pet",
      "stat": "skill",
      "param": 2
    }
  ],
  "389": [
    {
      "kind": "pet",
      "stat": "attackPowerFromOwnerRangedPct",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "spellPowerFromOwnerRangedPct",
      "param": 1
    }
  ],
  "394": [
    {
      "kind": "global",
      "stat": "parry",
      "param": 0
    },
    {
      "kind": "special",
      "stat": "meleeHastePct",
      "param": 0
    }
  ],
  "396": [
    {
      "kind": "offhand",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "spell",
      "scope": [
        "Lacerate",
        "Raptor Strike",
        "Mongoose Bite",
        "Carve",
        "Wing Clip"
      ],
      "stat": "crit",
      "param": 1
    }
  ],
  "398": [
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
  "400": [
    {
      "kind": "special",
      "stat": "maxHealthPct",
      "param": 0
    }
  ],
  "404": [
    {
      "kind": "global",
      "stat": "hit",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "hit",
      "param": 1,
      "when": {
        "dualWield": true
      }
    },
    {
      "kind": "pending",
      "note": "Movement-impairing resistance bonus is not a displayed combat stat"
    }
  ],
  "406": [
    {
      "kind": "global",
      "stat": "crit",
      "param": 0
    },
    {
      "kind": "ranged",
      "stat": "crit",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Melee attacks",
      "stat": "criticalDamagePct",
      "param": 1
    }
  ],
  "410": [
    {
      "kind": "percent",
      "stat": "agi",
      "param": 0
    },
    {
      "kind": "special",
      "stat": "apFromAgiPct",
      "param": 1
    }
  ],
  "415": [
    {
      "kind": "ranged",
      "stat": "crit",
      "param": 0
    }
  ],
  "420": [
    {
      "kind": "ranged",
      "stat": "criticalDamagePct",
      "param": 0
    }
  ],
  "426": [
    {
      "kind": "ranged",
      "stat": "damagePct",
      "param": 0
    }
  ]
};
export const TALENT_COVERAGE={
  "373": {
    "status": "proc-or-conditional",
    "note": "While Aspect of the Hawk is active, all normal ranged attacks have a 10% chance of increasing ranged attack speed by 15% for 12 sec. While Aspect of the Wolf is active, all no"
  },
  "374": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "375": {
    "status": "proc-or-conditional",
    "note": "Increases the duration of your Eyes of the Beast by 60 sec. While channeling Eyes of the Beast, your pet deals 30% additional damage and gains 30% increased Focus regeneration"
  },
  "376": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "377": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "378": {
    "status": "ability-specific",
    "note": "Revive Pet's casting time is reduced by 6 sec, mana cost is reduced by 40%, and increases the health your pet returns with by an additional 30%."
  },
  "379": {
    "status": "ability-specific",
    "note": "Increases the speed bonus of your Aspect of the Cheetah and Aspect of the Pack by 6% and increases your pet's movement speed by 30%."
  },
  "380": {
    "status": "ability-specific",
    "note": "Hitting an enemy with Arcane Shot, Steady Shot, or Raptor Strike causes your pet's next attack within 6 sec to also strike for Physical damage equal to 20% of your Attack Powe"
  },
  "381": {
    "status": "ability-specific",
    "note": "Increases the damage done by your pets by 20%."
  },
  "382": {
    "status": "ability-specific",
    "note": "Increases the Focus regeneration of your pets by 5 each tick and reduces the cooldown of your pets' special ability by 20%."
  },
  "383": {
    "status": "proc-or-conditional",
    "note": "Increases amount you heal your pet with Mend Pet by 40% and gives the spell a 50% chance of cleansing 1 Curse, Disease, Magic or Poison effect from the pet each tick."
  },
  "384": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "385": {
    "status": "proc-or-conditional",
    "note": "Your attacks have a 15% chance to send your pet into a rage, causing it to deal 40% additional damage for 8 sec."
  },
  "386": {
    "status": "proc-or-conditional",
    "note": "Sends your pet into a rage, granting it Scent of Blood for 18 sec. While enraged, the beast does not feel pity, remorse, or fear, and cannot be stopped except by death."
  },
  "387": {
    "status": "proc-or-conditional",
    "note": "Command your pet to intimidate the target on the next successful melee attack, stunning the target for 3 sec, and increasing the pet's threat generation by 50% for 8 sec."
  },
  "388": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "389": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "390": {
    "status": "proc-or-conditional",
    "note": "Gives your pet a 100% chance to gain a 30% attack speed increase for 8 sec after dealing a critical strike."
  },
  "391": {
    "status": "proc-or-conditional",
    "note": "Commands your pet to instantly attack for 80% of its Attack Power. Can only be used after the Hunter lands a critical strike on the target."
  },
  "392": {
    "status": "ability-specific",
    "note": "Increases all damage caused against Beasts, Giants, Dragonkin, and Humanoid targets by 3% and increases critical damage caused against Beasts, Giants, Dragonkin, and Humanoid "
  },
  "393": {
    "status": "ability-specific",
    "note": "Reduces the Mana cost of all traps and melee abilities by 10%."
  },
  "394": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "395": {
    "status": "proc-or-conditional",
    "note": "Gives your Immolation Trap, Frost Trap, and Explosive Trap a 25% chance to entrap the target, preventing them from moving for 5 sec."
  },
  "396": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "397": {
    "status": "proc-or-conditional",
    "note": "Gives your Wing Clip ability a 40% chance to immobilize the target for 5 sec."
  },
  "398": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "399": {
    "status": "proc-or-conditional",
    "note": "The duration of Freezing and Frost Trap effects and the damage of Immolation and Explosive Trap effects are increased by 25% if the traps are not triggered within the first 5 "
  },
  "400": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "401": {
    "status": "ability-specific",
    "note": "A sweeping attack that strikes up to 5 enemies in a 10 yard cone in front of you, dealing 60% weapon damage. This ability shares a cooldown with Multi-Shot."
  },
  "402": {
    "status": "proc-or-conditional",
    "note": "When activated, increases your Dodge and Parry chance by 25% for 10 sec."
  },
  "403": {
    "status": "proc-or-conditional",
    "note": "Your Mongoose Bite and triggered Fire traps now apply your highest rank of Serpent Sting for 40% of the duration. Serpent Stings applied this way ignore resistances and immuni"
  },
  "404": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "405": {
    "status": "proc-or-conditional",
    "note": "Reduces the chance your Feign Death ability will be resisted by 8%."
  },
  "406": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "407": {
    "status": "proc-or-conditional",
    "note": "Increases the duration of Freezing and Frost Trap effects by 30% and the damage of Immolation and Explosive Trap effects by 30%. In addition, reduces the chance that enemies w"
  },
  "408": {
    "status": "proc-or-conditional",
    "note": "Deepens the target's open wound, dealing damage equal to 40% of melee Attack Power and causing the target to bleed for 20% of that damage over 8 sec. Can only be used after cr"
  },
  "409": {
    "status": "ability-specific",
    "note": "Reduces the cooldown of Raptor Strike and Mongoose Bite by 1 sec and increases the damage they deal by 10%."
  },
  "410": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "411": {
    "status": "proc-or-conditional",
    "note": "Reduces the mana cost of your Immolation Trap and Explosive Trap effects by 20% and increases their damage based on your melee Attack Power. In addition, all traps can be plac"
  },
  "412": {
    "status": "proc-or-conditional",
    "note": "Gives your Concussive Shot a 20% chance to stun the target for 3 sec."
  },
  "413": {
    "status": "ability-specific",
    "note": "Reduces the Mana cost of your Shots and Stings by 10%."
  },
  "414": {
    "status": "ability-specific",
    "note": "Increases the damage of Serpent Sting by 30%, increases the mana drained by Viper Sting by 5%, and causes Scorpid Sting to reduce attack speed by an additional 10%."
  },
  "415": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "416": {
    "status": "ability-specific",
    "note": "Increases the range of your ranged weapons by 6 yards."
  },
  "417": {
    "status": "ability-specific",
    "note": "An aimed shot that increases ranged damage by 70."
  },
  "418": {
    "status": "ability-specific",
    "note": "Reduces the cooldown of Arcane Shot by 1.5 sec and the cooldown of Aimed Shot by 6 sec."
  },
  "419": {
    "status": "proc-or-conditional",
    "note": "Your Auto Shot, Arcane Shot, Steady Shot and Multi-Shot have a 6% chance to fire an additional normal ranged attack. This additional shot does not spend ammo."
  },
  "420": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "421": {
    "status": "proc-or-conditional",
    "note": "A short-range shot that deals 50% weapon damage and disorients the target for 4 sec. Any damage caused will remove the effect. Turns off your attack when used."
  },
  "422": {
    "status": "proc-or-conditional",
    "note": "Your Aimed Shot deals an additional 5% of its damage as Fire, Arcane, or Nature damage, based on the active effect. Grants a further benefit depending on the element: Explosiv"
  },
  "423": {
    "status": "ability-specific",
    "note": "Your critical strikes from Multi-Shot, Steady Shot and Aimed Shot cause the target to bleed, dealing 30% of the damage over 8 sec. This damage generates no threat."
  },
  "424": {
    "status": "ability-specific",
    "note": "Increases the damage of Multi-Shot and Volley by 15% and reduces the cast time of Volley by 2 sec."
  },
  "425": {
    "status": "ability-specific",
    "note": "Increases the damage of Steady Shot and Aimed Shot by 10%."
  },
  "426": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "427": {
    "status": "proc-or-conditional",
    "note": "Your Steady Shot, Aimed Shot, and Arcane Shot critical strikes have a 100% chance to reset the cooldown of Aimed Shot and trigger Lock and Load. Lock and Load reduces the cast"
  }
};
