/* All 55 hunter talents reviewed against https://octowow.st/talents/hunter/; snapshot SHA256 5de146011a25875988790d305d181c8798dd371aa5d74d058fd2f4d81f0e0854. */
export const AUDITED_CLASS="hunter";
export const TALENT_RULES={
  "373": [
    {
      "kind": "pending",
      "note": "Swift Aspects procs timed ranged or melee attack-speed buffs while the corresponding Hawk/Wolf aspect is active"
    }
  ],
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
  "375": [
    {
      "kind": "scoped",
      "scope": "Eyes of the Beast",
      "stat": "durationIncreaseSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Eyes of the Beast pet",
      "stat": "damagePct",
      "param": 1
    },
    {
      "kind": "scoped",
      "scope": "Eyes of the Beast pet",
      "stat": "focusRegenPct",
      "param": 2
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
    },
    {
      "kind": "scoped",
      "scope": "Aspect of the Wolf",
      "stat": "meleeDamageHealingPct",
      "param": 1,
      "when": {
        "aspect": "Aspect of the Wolf"
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
  "378": [
    {
      "kind": "scoped",
      "scope": "Revive Pet",
      "stat": "castTimeReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Revive Pet",
      "stat": "manaCostReductionPct",
      "param": 1
    },
    {
      "kind": "scoped",
      "scope": "Revived Pet",
      "stat": "healthPct",
      "param": 2
    }
  ],
  "379": [
    {
      "kind": "scoped",
      "scope": "Aspect of Cheetah/Pack",
      "stat": "movementSpeedPct",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "movementSpeedPct",
      "param": 1
    }
  ],
  "380": [
    {
      "kind": "pending",
      "note": "Coordinated Assault grants a limited-timing pet extra strike after Arcane/Steady Shot or Raptor Strike"
    }
  ],
  "381": [
    {
      "kind": "pet",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "382": [
    {
      "kind": "pet",
      "stat": "focusRegenPerTick",
      "param": 0
    },
    {
      "kind": "pet",
      "stat": "specialCooldownReductionPct",
      "param": 1
    }
  ],
  "383": [
    {
      "kind": "scoped",
      "scope": "Mend Pet",
      "stat": "healingPct",
      "param": 0
    },
    {
      "kind": "pending",
      "note": "Pet dispel effect is event-driven"
    }
  ],
  "384": [
    {
      "kind": "pet",
      "stat": "crit",
      "param": 0
    }
  ],
  "385": [
    {
      "kind": "pending",
      "note": "Scent of Blood is an owner-hit-triggered temporary pet damage bonus"
    }
  ],
  "386": [
    {
      "kind": "pending",
      "note": "Bestial Wrath is an on-use timed pet damage/CC immunity effect"
    }
  ],
  "387": [
    {
      "kind": "pending",
      "note": "Intimidation applies a stun and threat benefit on the pet's next successful melee attack"
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
    },
    {
      "kind": "pet",
      "stat": "ownerAndPetHealthRegenPctPer5s",
      "param": 2
    }
  ],
  "390": [
    {
      "kind": "pending",
      "note": "Frenzy temporarily increases pet attack speed after pet critical strike; not permanent pet haste"
    }
  ],
  "391": [
    {
      "kind": "pending",
      "note": "Kill Command is an active pet attack enabled by the owner's critical strike"
    }
  ],
  "392": [
    {
      "kind": "scoped",
      "scope": "Beast/Giant/Dragonkin/Humanoid targets",
      "stat": "damagePct",
      "param": 0,
      "when": {
        "targetCreature": [
          "Humanoid",
          "Giant",
          "Beast",
          "Dragonkin"
        ]
      }
    },
    {
      "kind": "scoped",
      "scope": "These targets",
      "stat": "criticalDamagePct",
      "param": 1,
      "when": {
        "targetCreature": [
          "Humanoid",
          "Giant",
          "Beast",
          "Dragonkin"
        ]
      }
    }
  ],
  "393": [
    {
      "kind": "scoped",
      "scope": "Traps and melee abilities",
      "stat": "manaCostReductionPct",
      "param": 0
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
    },
    {
      "kind": "ranged",
      "stat": "hastePct",
      "param": 0
    }
  ],
  "395": [
    {
      "kind": "pending",
      "note": "Entrapment gives active trap effects a chance to immobilise their target"
    }
  ],
  "396": [
    {
      "kind": "offhand",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
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
  "397": [
    {
      "kind": "pending",
      "note": "Improved Wing Clip gives Wing Clip a chance to immobilise the target"
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
  "399": [
    {
      "kind": "pending",
      "note": "Planning Ahead modifies traps only if their trigger is delayed more than 5 seconds after placement"
    }
  ],
  "400": [
    {
      "kind": "special",
      "stat": "maxHealthPct",
      "param": 0
    }
  ],
  "401": [
    {
      "kind": "pending",
      "note": "Carve is an active cone attack sharing cooldown with Multi-Shot and requires a multi-target model"
    }
  ],
  "402": [
    {
      "kind": "pending",
      "note": "Deterrence grants temporary dodge/parry on use; must never affect permanent sheet stats"
    }
  ],
  "403": [
    {
      "kind": "pending",
      "note": "Stinging Nettle applies a short Serpent Sting via Mongoose Bite or triggered Fire traps, requiring effect duration and resist handling"
    }
  ],
  "404": [
    {
      "kind": "global",
      "stat": "hit",
      "param": 0
    },
    {
      "kind": "special",
      "stat": "dualWieldHit",
      "param": 1,
      "when": {
        "dualWield": true
      }
    },
    {
      "kind": "pending",
      "note": "Movement-impairing resistance bonus is not a displayed combat stat"
    },
    {
      "kind": "scoped",
      "scope": "Movement impairing effects",
      "stat": "resistChancePct",
      "param": 2
    }
  ],
  "405": [
    {
      "kind": "scoped",
      "scope": "Feign Death",
      "stat": "resistReductionPct",
      "param": 0
    }
  ],
  "406": [
    {
      "kind": "global",
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
  "407": [
    {
      "kind": "scoped",
      "scope": "Frost/Freezing Trap",
      "stat": "durationPct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Immolation/Explosive Trap",
      "stat": "damagePct",
      "param": 1
    }
  ],
  "408": [
    {
      "kind": "pending",
      "note": "Lacerate requires a prior critical hit and then deals direct and periodic melee-AP-based damage"
    }
  ],
  "409": [
    {
      "kind": "scoped",
      "scope": "Raptor Strike/Mongoose Bite",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Raptor Strike/Mongoose Bite",
      "stat": "damagePct",
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
  "411": [
    {
      "kind": "pending",
      "note": "Untamed Trapper is a passive with several cross-ability coefficients absent from the rankParameters snapshot; verify the full tooltip and live effect before mapping"
    }
  ],
  "412": [
    {
      "kind": "pending",
      "note": "Improved Concussive Shot adds a chance-based stun from a successful Concussive Shot"
    }
  ],
  "413": [
    {
      "kind": "scoped",
      "scope": "Shots and Stings",
      "stat": "manaCostReductionPct",
      "param": 0
    }
  ],
  "414": [
    {
      "kind": "scoped",
      "scope": "Serpent Sting",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Viper Sting",
      "stat": "manaDrainPct",
      "param": 1
    },
    {
      "kind": "scoped",
      "scope": "Scorpid Sting",
      "stat": "attackSpeedReductionPct",
      "param": 2
    }
  ],
  "415": [
    {
      "kind": "ranged",
      "stat": "crit",
      "param": 0
    }
  ],
  "416": [
    {
      "kind": "scoped",
      "scope": "Ranged weapons",
      "stat": "rangeIncreaseYards",
      "param": 0
    }
  ],
  "417": [
    {
      "kind": "pending",
      "note": "Aimed Shot is an active ranged attack with +70 damage; requires ranged weapon and attack table"
    }
  ],
  "418": [
    {
      "kind": "scoped",
      "scope": "Arcane Shot",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Aimed Shot",
      "stat": "cooldownReductionSeconds",
      "param": 1
    }
  ],
  "419": [
    {
      "kind": "pending",
      "note": "Endless Quiver triggers an extra ranged attack after selected shot hits with no ammo cost"
    }
  ],
  "420": [
    {
      "kind": "ranged",
      "stat": "criticalDamagePct",
      "param": 0
    }
  ],
  "421": [
    {
      "kind": "pending",
      "note": "Scatter Shot is an active short-range ranged strike and disorient"
    }
  ],
  "422": [
    {
      "kind": "pending",
      "note": "Experimental Ammunition switches Aimed Shot secondary element and additional next-attack effects; requires active ammo choice"
    }
  ],
  "423": [
    {
      "kind": "pending",
      "note": "Piercing Shots creates a timed bleed from critical shots; cannot add bleed DPS without event simulation"
    }
  ],
  "424": [
    {
      "kind": "scoped",
      "scope": "Multi-Shot/Volley",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Volley",
      "stat": "castTimeReductionSeconds",
      "param": 1
    }
  ],
  "425": [
    {
      "kind": "scoped",
      "scope": "Steady Shot/Aimed Shot",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "426": [
    {
      "kind": "ranged",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "427": [
    {
      "kind": "pending",
      "note": "Lock and Load resets Aimed Shot after critical shot and grants a temporary cast-speed buff"
    }
  ]
};
export const TALENT_COVERAGE={
  "373": {
    "status": "proc-or-conditional",
    "note": "Swift Aspects procs timed ranged or melee attack-speed buffs while the corresponding Hawk/Wolf aspect is active"
  },
  "374": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "375": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
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
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "379": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "380": {
    "status": "proc-or-conditional",
    "note": "Coordinated Assault grants a limited-timing pet extra strike after Arcane/Steady Shot or Raptor Strike"
  },
  "381": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "382": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "383": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "384": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "385": {
    "status": "proc-or-conditional",
    "note": "Scent of Blood is an owner-hit-triggered temporary pet damage bonus"
  },
  "386": {
    "status": "proc-or-conditional",
    "note": "Bestial Wrath is an on-use timed pet damage/CC immunity effect"
  },
  "387": {
    "status": "proc-or-conditional",
    "note": "Intimidation applies a stun and threat benefit on the pet's next successful melee attack"
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
    "note": "Frenzy temporarily increases pet attack speed after pet critical strike; not permanent pet haste"
  },
  "391": {
    "status": "proc-or-conditional",
    "note": "Kill Command is an active pet attack enabled by the owner's critical strike"
  },
  "392": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "393": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "394": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "395": {
    "status": "proc-or-conditional",
    "note": "Entrapment gives active trap effects a chance to immobilise their target"
  },
  "396": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "397": {
    "status": "proc-or-conditional",
    "note": "Improved Wing Clip gives Wing Clip a chance to immobilise the target"
  },
  "398": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "399": {
    "status": "proc-or-conditional",
    "note": "Planning Ahead modifies traps only if their trigger is delayed more than 5 seconds after placement"
  },
  "400": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "401": {
    "status": "proc-or-conditional",
    "note": "Carve is an active cone attack sharing cooldown with Multi-Shot and requires a multi-target model"
  },
  "402": {
    "status": "proc-or-conditional",
    "note": "Deterrence grants temporary dodge/parry on use; must never affect permanent sheet stats"
  },
  "403": {
    "status": "proc-or-conditional",
    "note": "Stinging Nettle applies a short Serpent Sting via Mongoose Bite or triggered Fire traps, requiring effect duration and resist handling"
  },
  "404": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "405": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "406": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "407": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "408": {
    "status": "proc-or-conditional",
    "note": "Lacerate requires a prior critical hit and then deals direct and periodic melee-AP-based damage"
  },
  "409": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "410": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "411": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "412": {
    "status": "proc-or-conditional",
    "note": "Improved Concussive Shot adds a chance-based stun from a successful Concussive Shot"
  },
  "413": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "414": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "415": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "416": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "417": {
    "status": "proc-or-conditional",
    "note": "Aimed Shot is an active ranged attack with +70 damage; requires ranged weapon and attack table"
  },
  "418": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "419": {
    "status": "proc-or-conditional",
    "note": "Endless Quiver triggers an extra ranged attack after selected shot hits with no ammo cost"
  },
  "420": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "421": {
    "status": "proc-or-conditional",
    "note": "Scatter Shot is an active short-range ranged strike and disorient"
  },
  "422": {
    "status": "proc-or-conditional",
    "note": "Experimental Ammunition switches Aimed Shot secondary element and additional next-attack effects; requires active ammo choice"
  },
  "423": {
    "status": "proc-or-conditional",
    "note": "Piercing Shots creates a timed bleed from critical shots; cannot add bleed DPS without event simulation"
  },
  "424": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "425": {
    "status": "partial",
    "note": "Published rank-based ability or conditional effect recorded; live effects and combat contributions need independent verification."
  },
  "426": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "427": {
    "status": "proc-or-conditional",
    "note": "Lock and Load resets Aimed Shot after critical shot and grants a temporary cast-speed buff"
  }
};
