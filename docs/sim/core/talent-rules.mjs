/* All 49 paladin talents reviewed against https://octowow.st/talents/paladin/; snapshot SHA256 16f76bfbdb4faba8636986e58db45a38ccc6ef84e83395d99ce7c7849de35ee4. */
export const AUDITED_CLASS="paladin";
export const TALENT_RULES={
  "428": [
    {
      "kind": "scoped",
      "scope": "Blessing of Might/Wisdom",
      "stat": "effectivenessPct",
      "param": 0
    },
    {
      "kind": "buff",
      "source": "might",
      "stat": "ap",
      "param": 0,
      "note": "Only the selected might buff is enhanced; unrelated buffs are unchanged"
    }
  ],
  "429": [
    {
      "kind": "scoped",
      "scope": "Judgement/Seals",
      "stat": "manaCostReductionPct",
      "param": 0
    }
  ],
  "430": [
    {
      "kind": "scoped",
      "scope": "Judgement",
      "stat": "cooldownReductionSeconds",
      "param": 0
    }
  ],
  "431": [
    {
      "kind": "scoped",
      "scope": "Seal of the Crusader",
      "stat": "attackPowerBonusPct",
      "param": 0,
      "when": {
        "seal": "Seal of the Crusader"
      }
    },
    {
      "kind": "scoped",
      "scope": "Judgement of the Crusader",
      "stat": "holyDamageIncreasePct",
      "param": 0
    }
  ],
  "432": [
    {
      "kind": "global",
      "stat": "parry",
      "param": 0
    }
  ],
  "433": [
    {
      "kind": "scoped",
      "scope": "Retribution Aura",
      "stat": "damagePct",
      "param": 0,
      "when": {
        "aura": "Retribution Aura"
      }
    }
  ],
  "434": [
    {
      "kind": "global",
      "stat": "crit",
      "param": 0
    }
  ],
  "435": [
    {
      "kind": "pending",
      "note": "Blessing of Kings talent grants the castable Blessing; stats only apply if the Kings buff is actually selected"
    }
  ],
  "436": [
    {
      "kind": "scoped",
      "scope": "Movement/Mounted",
      "stat": "movementSpeedPct",
      "param": 0
    }
  ],
  "437": [
    {
      "kind": "weapon",
      "weapon": "twohand-sword-mace-axe",
      "stat": "skill",
      "param": 1
    },
    {
      "kind": "weapon",
      "weapon": "twohand",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "438": [
    {
      "kind": "pending",
      "note": "Vindication chance on damaging melee attack applies a limited-level target damage debuff for 10 seconds"
    }
  ],
  "439": [
    {
      "kind": "pending",
      "note": "Eye for an Eye reflects incoming spell-critical damage with a health-based cap"
    }
  ],
  "440": [
    {
      "kind": "pending",
      "note": "Vengeance damage/threat modifiers stack on critical effects for 30 seconds; proc uptime is not permanent"
    }
  ],
  "441": [
    {
      "kind": "pending",
      "note": "Seal of Command requires selecting the seal, resolving procs and Judgement; no always-on flat damage bonus"
    }
  ],
  "442": [
    {
      "kind": "scoped",
      "scope": "Crusader Strike",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Zeal per stack",
      "stat": "attackCastSpeedPct",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "Zeal stack generation/duration requires an aura engine"
    }
  ],
  "443": [
    {
      "kind": "pending",
      "note": "Repentance crowd control or immunity fallback damage requires a target/ability model"
    }
  ],
  "444": [
    {
      "kind": "percent",
      "stat": "str",
      "param": 0
    }
  ],
  "445": [
    {
      "kind": "percent",
      "stat": "int",
      "param": 0
    }
  ],
  "446": [
    {
      "kind": "pending",
      "note": "Holy Judgement only modifies the next Holy Light after casting Judgement; needs triggered spell state"
    }
  ],
  "447": [
    {
      "kind": "scoped",
      "scope": "Flash of Light/Holy Light",
      "stat": "pushbackResistancePct",
      "param": 0
    }
  ],
  "448": [
    {
      "kind": "scoped",
      "scope": "Seal/Judgement of Righteousness",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "449": [
    {
      "kind": "scoped",
      "scope": "Holy Light / Flash of Light / Holy Shock",
      "stat": "healingPct",
      "param": 0
    }
  ],
  "450": [
    {
      "kind": "scoped",
      "scope": "Sanctity Aura",
      "stat": "holyDamagePct",
      "param": 0,
      "values": [
        10
      ],
      "when": {
        "aura": "Sanctity Aura"
      }
    },
    {
      "kind": "spell",
      "scope": "Holy",
      "stat": "damagePct",
      "param": 0,
      "values": [
        10
      ],
      "when": {
        "aura": "Sanctity Aura"
      }
    }
  ],
  "451": [
    {
      "kind": "scoped",
      "scope": "Lay on Hands",
      "stat": "cooldownReductionMinutes",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "Target receives a temporary item armour buff after Lay on Hands; not a personal permanent armour stat"
    }
  ],
  "452": [
    {
      "kind": "scoped",
      "scope": "Fear/Disorient",
      "stat": "resistChancePct",
      "param": 0
    }
  ],
  "453": [
    {
      "kind": "scoped",
      "scope": "Concentration Aura",
      "stat": "effectivenessPct",
      "param": 0,
      "when": {
        "aura": "Concentration Aura"
      }
    },
    {
      "kind": "scoped",
      "scope": "Concentration Aura",
      "stat": "resistSilenceInterruptPct",
      "param": 1,
      "when": {
        "aura": "Concentration Aura"
      }
    }
  ],
  "454": [
    {
      "kind": "pending",
      "note": "Illumination refunds mana on healing crits; requires spell cast and resource events"
    }
  ],
  "455": [
    {
      "kind": "special",
      "stat": "healingFromItemArmourPct",
      "param": 0
    }
  ],
  "456": [
    {
      "kind": "spell",
      "scope": "Holy Shock",
      "stat": "crit",
      "param": 0
    }
  ],
  "457": [
    {
      "kind": "pending",
      "note": "Holy Shock is an active damage/healing spell whose cooldown may reset after a cast"
    }
  ],
  "458": [
    {
      "kind": "spell",
      "scope": [
        "Holy Light",
        "Flash of Light"
      ],
      "stat": "crit",
      "param": 0
    }
  ],
  "459": [
    {
      "kind": "pending",
      "note": "Crusader Strike can reset Holy Shock cooldown"
    },
    {
      "kind": "scoped",
      "scope": "Holy Strike healing",
      "stat": "healingPct",
      "param": 1
    },
    {
      "kind": "scoped",
      "scope": "Holy Strike healing power",
      "stat": "coefficientBonusPct",
      "param": 2
    }
  ],
  "460": [
    {
      "kind": "pending",
      "note": "Daybreak applies on critical heal and is consumed on later target damage"
    }
  ],
  "461": [
    {
      "kind": "scoped",
      "scope": "Devotion Aura",
      "stat": "armourBonusPct",
      "param": 0,
      "when": {
        "aura": "Devotion Aura"
      }
    }
  ],
  "462": [
    {
      "kind": "pending",
      "note": "Redoubt grants temporary block chance after receiving an attack, ending after time or block charges"
    }
  ],
  "463": [
    {
      "kind": "global",
      "stat": "hit",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "spellHit",
      "param": 0
    }
  ],
  "464": [
    {
      "kind": "scoped",
      "scope": "Hand of Protection",
      "stat": "cooldownReductionSeconds",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Hand of Freedom",
      "stat": "durationIncreaseSeconds",
      "param": 1
    }
  ],
  "465": [
    {
      "kind": "special",
      "stat": "itemArmourPct",
      "param": 0
    }
  ],
  "466": [
    {
      "kind": "scoped",
      "scope": "Righteous Fury",
      "stat": "threatPct",
      "param": 0
    }
  ],
  "467": [
    {
      "kind": "pending",
      "note": "Blessing of Sanctuary must be cast/selected; target damage reduction and block retaliation are not a permanent player bonus"
    }
  ],
  "468": [
    {
      "kind": "special",
      "stat": "shieldBlockValuePct",
      "param": 0,
      "when": {
        "shield": true
      }
    },
    {
      "kind": "pending",
      "note": "Block-triggered mana restoration requires event simulation"
    }
  ],
  "469": [
    {
      "kind": "global",
      "stat": "defense",
      "param": 0
    }
  ],
  "470": [
    {
      "kind": "scoped",
      "scope": "Hand of Reckoning",
      "stat": "hit",
      "param": 0
    }
  ],
  "471": [
    {
      "kind": "scoped",
      "scope": "Hammer of Justice",
      "stat": "cooldownReductionSeconds",
      "param": 0
    }
  ],
  "472": [
    {
      "kind": "special",
      "stat": "damageTakenReductionPct",
      "param": 0,
      "when": {
        "righteousFury": "On"
      }
    }
  ],
  "473": [
    {
      "kind": "pending",
      "note": "Holy Shield temporary block charges/threat/damage need an on-use ability and attack engine"
    }
  ],
  "474": [
    {
      "kind": "pending",
      "note": "Reckoning grants an extra attack after blocking; cannot increase always-on weapon speed"
    }
  ],
  "475": [
    {
      "kind": "scoped",
      "scope": "Holy Strike",
      "stat": "threatPct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Holy Strike",
      "stat": "damagePct",
      "param": 1
    },
    {
      "kind": "pending",
      "note": "Zealous Defense temporarily reduces next blocked attack after Crusader Strike"
    }
  ],
  "476": [
    {
      "kind": "pending",
      "note": "Bulwark of the Righteous shield bash and 12-second damage reduction require an active ability model"
    }
  ]
};
export const TALENT_COVERAGE={
  "428": {
    "status": "partial",
    "note": "Static enhancement is applied only when its specific buff or pet is selected; other ability effects remain scoped or require verification."
  },
  "429": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "430": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
  },
  "431": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "432": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "433": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "434": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "435": {
    "status": "proc-or-conditional",
    "note": "Blessing of Kings talent grants the castable Blessing; stats only apply if the Kings buff is actually selected"
  },
  "436": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "437": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "438": {
    "status": "proc-or-conditional",
    "note": "Vindication chance on damaging melee attack applies a limited-level target damage debuff for 10 seconds"
  },
  "439": {
    "status": "proc-or-conditional",
    "note": "Eye for an Eye reflects incoming spell-critical damage with a health-based cap"
  },
  "440": {
    "status": "proc-or-conditional",
    "note": "Vengeance damage/threat modifiers stack on critical effects for 30 seconds; proc uptime is not permanent"
  },
  "441": {
    "status": "proc-or-conditional",
    "note": "Seal of Command requires selecting the seal, resolving procs and Judgement; no always-on flat damage bonus"
  },
  "442": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "443": {
    "status": "proc-or-conditional",
    "note": "Repentance crowd control or immunity fallback damage requires a target/ability model"
  },
  "444": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "445": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "446": {
    "status": "proc-or-conditional",
    "note": "Holy Judgement only modifies the next Holy Light after casting Judgement; needs triggered spell state"
  },
  "447": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
  },
  "448": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "449": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "450": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "451": {
    "status": "partial",
    "note": "Target receives a temporary item armour buff after Lay on Hands; not a personal permanent armour stat"
  },
  "452": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "453": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "454": {
    "status": "proc-or-conditional",
    "note": "Illumination refunds mana on healing crits; requires spell cast and resource events"
  },
  "455": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "456": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "457": {
    "status": "proc-or-conditional",
    "note": "Holy Shock is an active damage/healing spell whose cooldown may reset after a cast"
  },
  "458": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "459": {
    "status": "partial",
    "note": "Crusader Strike can reset Holy Shock cooldown"
  },
  "460": {
    "status": "proc-or-conditional",
    "note": "Daybreak applies on critical heal and is consumed on later target damage"
  },
  "461": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "462": {
    "status": "proc-or-conditional",
    "note": "Redoubt grants temporary block chance after receiving an attack, ending after time or block charges"
  },
  "463": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "464": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
  },
  "465": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "466": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "467": {
    "status": "proc-or-conditional",
    "note": "Blessing of Sanctuary must be cast/selected; target damage reduction and block retaliation are not a permanent player bonus"
  },
  "468": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "469": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "470": {
    "status": "partial",
    "note": "Published rank-based effect mapped to its ability or condition; the planner does not yet simulate its resulting casts, resource flows or damage."
  },
  "471": {
    "status": "partial",
    "note": "Active/ability-scoped contribution only; numerical combat validation pending."
  },
  "472": {
    "status": "proc-or-conditional",
    "note": "Damage reduction only while Righteous Fury is active; no Righteous Fury state control"
  },
  "473": {
    "status": "proc-or-conditional",
    "note": "Holy Shield temporary block charges/threat/damage need an on-use ability and attack engine"
  },
  "474": {
    "status": "proc-or-conditional",
    "note": "Reckoning grants an extra attack after blocking; cannot increase always-on weapon speed"
  },
  "475": {
    "status": "partial",
    "note": "Zealous Defense temporarily reduces next blocked attack after Crusader Strike"
  },
  "476": {
    "status": "proc-or-conditional",
    "note": "Bulwark of the Righteous shield bash and 12-second damage reduction require an active ability model"
  }
};
