/* All 54 druid talents reviewed against https://octowow.st/talents/druid/; snapshot SHA256 7137a9837ef004335ceefa79899e196be18fcdde24f303cbbd4615deb26d5bdc. */
export const AUDITED_CLASS="druid";
export const TALENT_RULES={
  "271": [
    {
      "kind": "special",
      "stat": "itemArmourPct",
      "param": 0
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
  "291": [
    {
      "kind": "scoped",
      "scope": "Periodic magic",
      "stat": "damageAndHealingPct",
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
  "309": [
    {
      "kind": "scoped",
      "scope": "Starfire/Moonfire/Hurricane/Insect Swarm/Wrath",
      "stat": "damagePct",
      "param": 0
    }
  ]
};
export const TALENT_COVERAGE={
  "267": {
    "status": "active-or-non-stat",
    "note": "Reduces the cost of your Maul, Swipe, Savage Bite, Claw, and Rake abilities by 5 Rage or Energy."
  },
  "268": {
    "status": "ability-specific",
    "note": "Increases the Attack Power reduction of your Demoralizing Roar by 40% and the damage caused by your Ferocious Bite by 15%."
  },
  "269": {
    "status": "proc-or-conditional",
    "note": "Increases threat caused in Bear and Dire Bear Form by 15% and reduces the chance enemies have to detect you while Prowling."
  },
  "270": {
    "status": "active-or-non-stat",
    "note": "Increases the stun duration of your Bash and Pounce abilities by 1 sec."
  },
  "271": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "272": {
    "status": "ability-specific",
    "note": "Increases the damage of Rip by 15%. In addition, increases the damage of Claw by 30% for each of your active Bleed effects on the target."
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
    "status": "proc-or-conditional",
    "note": "Increases the duration of Tiger's Fury by 12 sec, and causes Enrage to instantly generate 10 Rage. In addition, Tiger's Fury and Enrage increase your attack speed by 20% for 1"
  },
  "279": {
    "status": "ability-specific",
    "note": "Increases the damage of Shred by 10% and reduces its Energy cost by 12."
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
    "status": "active-or-non-stat",
    "note": "Increases the effects of your Mark of the Wild and Gift of the Wild spells by 35%."
  },
  "286": {
    "status": "proc-or-conditional",
    "note": "Gives you 100% chance to gain 10 Rage when you shapeshift into Bear and Dire Bear Form or 40 Energy when you shapeshift into Cat Form."
  },
  "287": {
    "status": "ability-specific",
    "note": "Reduces the cast time of your Healing Touch spell by 0.5 sec."
  },
  "288": {
    "status": "proc-or-conditional",
    "note": "Gives you a 70% chance to avoid interruption caused by damage while casting the Healing Touch, Regrowth, and Tranquility spells."
  },
  "289": {
    "status": "ability-specific",
    "note": "Reduces the threat generated by your spells by 20%."
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
    "status": "proc-or-conditional",
    "note": "Allows 15% of your Mana regeneration to continue while casting."
  },
  "293": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "294": {
    "status": "ability-specific",
    "note": "Reduces the mana cost of your Healing Touch, Regrowth and Tranquility spells by 10%."
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
    "status": "ability-specific",
    "note": "Increases the periodic healing of Regrowth by 30% if the friendly target is affected by Rejuvenation."
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
    "status": "proc-or-conditional",
    "note": "Shapeshift into the Tree of Life. While in this form armor contribution from items is inreased by 180%, the healing power of nearby party members is increased by an amount equ"
  },
  "301": {
    "status": "ability-specific",
    "note": "Reduces the cast time and global cooldown of your Wrath spell by 0.5 sec."
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
    "status": "ability-specific",
    "note": "Reduces the mana cost of all shapeshifting by 30%."
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
    "status": "ability-specific",
    "note": "Increases the range of your Wrath, Entangling Roots, Faerie Fire, Moonfire, Starfire, Insect Swarm, Hurricane, Remove Curse, Abolish Poison, and Cure Poison spells by 20%."
  },
  "312": {
    "status": "ability-specific",
    "note": "Increases the critical strike damage bonus of your Starfire, Moonfire, and Wrath spells by 100%."
  },
  "313": {
    "status": "ability-specific",
    "note": "Reduces the Mana cost of your Moonfire, Starfire, Wrath, Hurricane, Insect Swarm, Healing Touch, Regrowth and Rejuvenation spells by 9%."
  },
  "314": {
    "status": "proc-or-conditional",
    "note": "Damage taken while in Moonkin Form has a 10% chance to enrage you, granting a 30% chance to avoid interruption caused by damage while casting and regenerating 1% of your maxim"
  },
  "315": {
    "status": "proc-or-conditional",
    "note": "Transforms the Druid into Moonkin Form. While in this form the armor contribution from items is increased by 180%, the Mana cost of your Balance spells is reduced by 20%, and "
  },
  "316": {
    "status": "ability-specific",
    "note": "All spell criticals grace you with a blessing of nature, reducing the casting time of your next spell by 0.5 sec."
  },
  "317": {
    "status": "proc-or-conditional",
    "note": "Reduces the cast time of Starfire by 0.5 sec and gives it a 15% chance to stun the target for 3 sec."
  },
  "318": {
    "status": "proc-or-conditional",
    "note": "Damaging a target afflicted by Insect Swarm with Wrath refunds 30% of its mana cost. Starfire has a 9% increased chance to critically strike against targets affected by Moonfi"
  },
  "319": {
    "status": "ability-specific",
    "note": "Reduces the mana cost of Hurricane by 20% and causes it to reduce the attack speed of affected enemies by 25%."
  },
  "320": {
    "status": "proc-or-conditional",
    "note": "Aligns natural and astral energies. Damage from Wrath has a 40% chance to grant Arcane Eclipse, increasing Arcane damage dealt. Damage from Starfire has a 60% chance to grant "
  }
};
