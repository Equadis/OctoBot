/* All 55 mage talents reviewed against https://octowow.st/talents/mage/; snapshot SHA256 7ad369269087cf74092696a5f10e3115d660a8b0fdbf36af0009fc9815de6ad1. */
export const AUDITED_CLASS="mage";
export const TALENT_RULES={
  "6": [
    {
      "kind": "spell",
      "scope": [
        "Fire Blast",
        "Scorch"
      ],
      "stat": "crit",
      "param": 0
    }
  ],
  "7": [
    {
      "kind": "spell",
      "scope": "Flamestrike",
      "stat": "crit",
      "param": 0
    }
  ],
  "14": [
    {
      "kind": "spell",
      "scope": "Fire",
      "stat": "crit",
      "param": 0
    }
  ],
  "16": [
    {
      "kind": "spell",
      "scope": "Fire",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "20": [
    {
      "kind": "spell",
      "scope": [
        "Fire",
        "Frost"
      ],
      "stat": "hit",
      "param": 0
    }
  ],
  "21": [
    {
      "kind": "spell",
      "scope": "Frost",
      "stat": "damagePct",
      "param": 0
    }
  ],
  "25": [
    {
      "kind": "spell",
      "scope": "Frost",
      "stat": "criticalDamagePct",
      "param": 0
    }
  ],
  "30": [
    {
      "kind": "pending",
      "note": "Shatter's critical bonus only applies to frozen targets"
    }
  ],
  "37": [
    {
      "kind": "global",
      "stat": "spellPen",
      "param": 0
    }
  ],
  "38": [
    {
      "kind": "global",
      "stat": "arcaneRes",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "fireRes",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "frostRes",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "natureRes",
      "param": 0
    },
    {
      "kind": "global",
      "stat": "shadowRes",
      "param": 0
    }
  ],
  "40": [
    {
      "kind": "scoped",
      "scope": "Wand",
      "stat": "damagePct",
      "param": 0
    },
    {
      "kind": "scoped",
      "scope": "Wand",
      "stat": "hit",
      "param": 1
    }
  ],
  "41": [
    {
      "kind": "spell",
      "scope": "Arcane",
      "stat": "hit",
      "param": 0
    }
  ],
  "44": [
    {
      "kind": "spell",
      "scope": "Arcane",
      "stat": "crit",
      "param": 0
    }
  ],
  "52": [
    {
      "kind": "spell",
      "scope": "Arcane",
      "stat": "castSpeedPct",
      "param": 0,
      "values": [
        5
      ]
    }
  ],
  "53": [
    {
      "kind": "spell",
      "scope": "Arcane",
      "stat": "criticalDamagePct",
      "param": 0
    }
  ]
};
export const TALENT_COVERAGE={
  "1": {
    "status": "active-or-non-stat",
    "note": "Reduces the casting time of your Fireball spell by 0.5 sec."
  },
  "2": {
    "status": "proc-or-conditional",
    "note": "Gives your Fire spells a 10% chance to stun the target for 2 sec."
  },
  "3": {
    "status": "ability-specific",
    "note": "Your critical strikes from Fire damage spells cause the target to burn for an additional 40% of your spell's damage over 4 sec."
  },
  "4": {
    "status": "ability-specific",
    "note": "Increases the range of your Fire spells by 6 yards and the radius of your Blast Wave by 20%."
  },
  "5": {
    "status": "ability-specific",
    "note": "Reduces the cooldown of your Fire Blast spell by 1.5 sec and its global cooldown by 1 sec."
  },
  "6": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "7": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "8": {
    "status": "ability-specific",
    "note": "Hurls an immense fiery boulder that causes 148 to 194 Fire damage and an additional 56 Fire damage over 12 sec."
  },
  "9": {
    "status": "proc-or-conditional",
    "note": "Gives your Fire spells a 70% chance to not lose casting time when you take damage and reduces the threat caused by your Fire spells by 30%."
  },
  "10": {
    "status": "proc-or-conditional",
    "note": "Your Scorch and Fire Blast spells have a 100% chance to cause your target to be vulnerable to Fire damage. This vulnerability increases the Fire damage dealt to your target by"
  },
  "11": {
    "status": "proc-or-conditional",
    "note": "Causes your Fire Ward to have a 20% chance to reflect Fire spells while active."
  },
  "12": {
    "status": "ability-specific",
    "note": "Your Fire and Frost spell criticals will refund 45% of their base mana cost."
  },
  "13": {
    "status": "proc-or-conditional",
    "note": "A wave of flame radiates outward from the caster, damaging all enemies caught within the 10 yard blast for 160 to 192 Fire damage, and dazing them for 6 sec."
  },
  "14": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "15": {
    "status": "proc-or-conditional",
    "note": "Gives your Fireball and Fire Blast critical strikes a 100% chance to grant Hot Streak, reducing the cast time of your next Pyroblast by 1 sec per stack for 3 min. Stacks up to"
  },
  "16": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "17": {
    "status": "proc-or-conditional",
    "note": "When activated, this spell causes each of your Fire damage spell hits to increase your critical strike chance with Fire damage spells by 10%. This effect lasts until you have "
  },
  "18": {
    "status": "proc-or-conditional",
    "note": "Increases the armor and resistances given by your Frost Armor and Ice Armor spells by 30%. In addition, gives your Frost Ward a 20% chance to reflect Frost spells and effects "
  },
  "19": {
    "status": "active-or-non-stat",
    "note": "Reduces the casting time of your Frostbolt spell by 0.5 sec."
  },
  "20": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "21": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "22": {
    "status": "proc-or-conditional",
    "note": "Gives your Chill effects a 15% chance to freeze the target for 5 sec."
  },
  "23": {
    "status": "ability-specific",
    "note": "Reduces the cooldown of your Frost Nova spell by 4 sec."
  },
  "24": {
    "status": "ability-specific",
    "note": "Increases the duration of your Chill effects by 3 sec and reduces the target's speed by an additional 10%."
  },
  "25": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "26": {
    "status": "proc-or-conditional",
    "note": "When activated, this spell finishes the cooldown on all of your Frost spells."
  },
  "27": {
    "status": "ability-specific",
    "note": "Adds a chill effect to your Blizzard spell. This effect lowers the target's movement speed by 40%. Lasts 1.5 sec."
  },
  "28": {
    "status": "ability-specific",
    "note": "Increases the range of your Frostbolt, Icicles and Blizzard spells and the radius of your Frost Nova and Cone of Cold spells by 20%."
  },
  "29": {
    "status": "ability-specific",
    "note": "Reduces the mana cost of your Frost spells by 15% and reduces the threat caused by your Frost spells by 30%."
  },
  "30": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "31": {
    "status": "proc-or-conditional",
    "note": "You become encased in a block of ice, protecting you from all physical attacks and spells for 10 sec, but during that time you cannot attack, move or cast spells."
  },
  "32": {
    "status": "proc-or-conditional",
    "note": "Draw upon frost leylines, becoming frozen in place, and launch icicles at the enemy, dealing 101 Frost damage every 1 sec for 5 sec. Damage taken has a high chance to shatter "
  },
  "33": {
    "status": "ability-specific",
    "note": "Increases the damage dealt by your Cone of Cold spell by 35%."
  },
  "34": {
    "status": "proc-or-conditional",
    "note": "Gives your Frost damage spells a 100% chance to apply the Winter's Chill effect, which increases the chance a Frost spell will critically hit the target by 2% for 15 sec. Stac"
  },
  "35": {
    "status": "proc-or-conditional",
    "note": "If an effect that causes a target to freeze is not applied due to the target being permanently immune to freeze effects, you have a 100% chance to gain Flash Freeze instead. F"
  },
  "36": {
    "status": "proc-or-conditional",
    "note": "Instantly shields you, absorbing 454 damage and increasing your Frost damage by 10% for 1 min. While the shield holds, spells will not be interrupted and Frost damage is incre"
  },
  "37": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "38": {
    "status": "sheet",
    "note": "Passive stat or equipment-specific effect included in planning estimates."
  },
  "39": {
    "status": "proc-or-conditional",
    "note": "Gives you a 100% chance to avoid interruption caused by damage while channeling Arcane Missiles."
  },
  "40": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "41": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "42": {
    "status": "proc-or-conditional",
    "note": "Gives you a 10% chance of entering a Clearcasting state after any damage spell hits a target. The Clearcasting state reduces the mana cost of your next damage spell by 100%. T"
  },
  "43": {
    "status": "active-or-non-stat",
    "note": "Increases the effect of your Amplify Magic and Dampen Magic spells by 100% and allows them to be cast on enemies. Only affects targets level 62 or lower."
  },
  "44": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "45": {
    "status": "proc-or-conditional",
    "note": "Rupture your target with the force of concentrated arcane energy, dealing 101 to 114 Arcane damage and increasing the damage and mana cost of your Arcane Missiles spell by 20%"
  },
  "46": {
    "status": "proc-or-conditional",
    "note": "Decreases the mana lost per point of damage taken when Mana Shield is active by 25%."
  },
  "47": {
    "status": "proc-or-conditional",
    "note": "Gives your Counterspell a 100% chance to silence the target for 4 sec."
  },
  "48": {
    "status": "proc-or-conditional",
    "note": "Your Arcane Missiles have a chance of 15% to reset the cooldown of Arcane Rupture and cause it to return its base mana cost on its next cast. This effect can occur once every "
  },
  "49": {
    "status": "proc-or-conditional",
    "note": "Allows 20% of your Mana regeneration to continue while casting. This effect is tripled while below 35% total mana."
  },
  "50": {
    "status": "proc-or-conditional",
    "note": "Your successful damaging Arcane spells have an 25% chance to uncontrollably erupt, consuming 2% of your base mana to deal 25% more damage."
  },
  "51": {
    "status": "proc-or-conditional",
    "note": "When activated, your next Mage spell with a casting time less than 10 sec becomes an instant cast spell."
  },
  "52": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "53": {
    "status": "partial",
    "note": "The scoped bonus is tracked, but at least one combat/conditional effect still awaits verified modelling."
  },
  "54": {
    "status": "proc-or-conditional",
    "note": "Your successful damaging Arcane spells have a 20% chance to duplicate for 50% of the damage. This effect can trigger off of itself and duplicated Arcane Missiles are channeled"
  },
  "55": {
    "status": "proc-or-conditional",
    "note": "When activated, your casting speed is increased by 30% while draining 1% of your maximum mana every second and reducing all mana gain by 50%. Falling below 10% maximum mana ca"
  }
};
