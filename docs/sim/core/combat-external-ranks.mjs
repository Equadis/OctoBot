// External and official guide reference values; no live verification.
export const EXTERNAL_REFERENCE_RANKS=Object.freeze([
  {
    "classId": "rogue",
    "abilityId": "rogue:sinister-strike",
    "spellId": 11294,
    "rank": 8,
    "learnLevel": 54,
    "resource": "energy",
    "mode": "instant",
    "cost": 40,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": 1,
        "flat": 68
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/sinister_strike.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/sinister_strike.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "rogue",
      "abilityId": "rogue:sinister-strike",
      "spellId": 11294,
      "rank": 8,
      "level": 54,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/sinister_strike.go",
      "liveVerified": false
    },
    "costSource": "https://octowow.st/index.php/rogue",
    "comboGain": 1,
    "requiredPolicy": [
      "weaponPolicy"
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:serpent-sting",
    "spellId": 13555,
    "rank": 8,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 230,
    "castMs": 0,
    "minRange": 8,
    "maxRange": 35,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "nature",
        "coefficient": 0.2,
        "min": 98,
        "max": 98,
        "durationMs": 15000,
        "intervalMs": 3000,
        "reusePreviousHit": false
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/serpent_sting.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/serpent_sting.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:serpent-sting",
      "spellId": 13555,
      "rank": 8,
      "level": 58,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/serpent_sting.go",
      "liveVerified": false
    },
    "requiredPolicy": [
      "costOverride"
    ],
    "costNote": "Legacy 230 mana; OctoWoW guide changes sting cost, exact rank-8 cost not established."
  },
  {
    "classId": "mage",
    "abilityId": "mage:frostbolt",
    "spellId": 10181,
    "rank": 10,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "cast",
    "cost": 260,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "frost",
        "coefficient": 0.814,
        "min": 440,
        "max": 475
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/frostbolt.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/frostbolt.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "mage",
      "abilityId": "mage:frostbolt",
      "spellId": 10181,
      "rank": 10,
      "level": 56,
      "fields": {
        "school": "frost"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/frostbolt.go",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:fire-blast",
    "spellId": 10199,
    "rank": 7,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "instant",
    "cost": 340,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 0.429,
        "min": 446,
        "max": 524
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/fire_blast.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/fire_blast.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "mage",
      "abilityId": "mage:fire-blast",
      "spellId": 10199,
      "rank": 7,
      "level": 54,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/fire_blast.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 8000
  },
  {
    "classId": "mage",
    "abilityId": "mage:scorch",
    "spellId": 10207,
    "rank": 7,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "cast",
    "cost": 150,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 0.429,
        "min": 237,
        "max": 280
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/scorch.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/scorch.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "mage",
      "abilityId": "mage:scorch",
      "spellId": 10207,
      "rank": 7,
      "level": 58,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/scorch.go",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:searing-pain",
    "spellId": 17923,
    "rank": 6,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "cast",
    "cost": 168,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 0.429,
        "min": 208,
        "max": 244
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/searing_pain.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/searing_pain.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:searing-pain",
      "spellId": 17923,
      "rank": 6,
      "level": 58,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/searing_pain.go",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:mind-blast",
    "spellId": 10947,
    "rank": 9,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "cast",
    "cost": 350,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": 0.429,
        "min": 508,
        "max": 537
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_blast.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_blast.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:mind-blast",
      "spellId": 10947,
      "rank": 9,
      "level": 58,
      "fields": {
        "school": "shadow"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_blast.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 8000
  },
  {
    "classId": "priest",
    "abilityId": "priest:shadow-word-pain",
    "spellId": 10894,
    "rank": 8,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 470,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": 0.167,
        "min": 142,
        "max": 142,
        "durationMs": 18000,
        "intervalMs": 3000,
        "reusePreviousHit": false
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/shadow_word_pain.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/shadow_word_pain.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:shadow-word-pain",
      "spellId": 10894,
      "rank": 8,
      "level": 58,
      "fields": {
        "school": "shadow"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/shadow_word_pain.go",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lightning-bolt",
    "spellId": 15208,
    "rank": 10,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "cast",
    "cost": 265,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": 0.857,
        "min": 428,
        "max": 477
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/lightning_bolt.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/lightning_bolt.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lightning-bolt",
      "spellId": 15208,
      "rank": 10,
      "level": 56,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/lightning_bolt.go",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:earth-shock",
    "spellId": 10414,
    "rank": 7,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 450,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": 0.386,
        "min": 517,
        "max": 545
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/earth_shock.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/earth_shock.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:earth-shock",
      "spellId": 10414,
      "rank": 7,
      "level": 60,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/earth_shock.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 6000,
    "sharedCooldownGroup": "shaman:shock"
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:flame-shock",
    "spellId": 29228,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 410,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 0.214,
        "min": 292,
        "max": 292
      },
      {
        "kind": "periodic-damage",
        "stat": "fire",
        "coefficient": 0.1,
        "min": 80,
        "max": 80,
        "durationMs": 12000,
        "intervalMs": 3000,
        "reusePreviousHit": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/flame_shock.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/flame_shock.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:flame-shock",
      "spellId": 29228,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/flame_shock.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 6000,
    "sharedCooldownGroup": "shaman:shock"
  },
  {
    "classId": "druid",
    "abilityId": "druid:wrath",
    "spellId": 9912,
    "rank": 8,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "cast",
    "cost": 180,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": 0.571,
        "min": 248,
        "max": 277
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/wrath.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/wrath.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:wrath",
      "spellId": 9912,
      "rank": 8,
      "level": 54,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/wrath.go",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:starfire",
    "spellId": 9876,
    "rank": 6,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "cast",
    "cost": 315,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "arcane",
        "coefficient": 1,
        "min": 451,
        "max": 531
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/starfire.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/starfire.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:starfire",
      "spellId": 9876,
      "rank": 6,
      "level": 58,
      "fields": {
        "school": "arcane"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/starfire.go",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:moonfire",
    "spellId": 9835,
    "rank": 10,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 375,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "arcane",
        "coefficient": 0.15,
        "min": 195,
        "max": 228
      },
      {
        "kind": "periodic-damage",
        "stat": "arcane",
        "coefficient": 0.13,
        "min": 96,
        "max": 96,
        "durationMs": 12000,
        "intervalMs": 3000,
        "reusePreviousHit": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/moonfire.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/moonfire.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:moonfire",
      "spellId": 9835,
      "rank": 10,
      "level": 58,
      "fields": {
        "school": "arcane"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live cooldown",
        "live hit and resistance",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/moonfire.go",
      "liveVerified": false
    }
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:holy-light",
    "spellId": 10329,
    "rank": 8,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "cast",
    "cost": 580,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": 0.7142857142857143,
        "min": 1246,
        "max": 1389
      }
    ],
    "source": "https://classicdb.ch/?spell=10329",
    "referenceSource": "https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:holy-light",
      "spellId": 10329,
      "rank": 8,
      "level": 54,
      "fields": {
        "school": "holy"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=10329",
      "liveVerified": false
    }
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:flash-of-light",
    "spellId": 19943,
    "rank": 6,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "cast",
    "cost": 140,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": 0.42857142857142855,
        "min": 343,
        "max": 384
      }
    ],
    "source": "https://classicdb.ch/?spell=19943",
    "referenceSource": "https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:flash-of-light",
      "spellId": 19943,
      "rank": 6,
      "level": 58,
      "fields": {
        "school": "holy"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=19943",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:healing-wave",
    "spellId": 10396,
    "rank": 9,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "cast",
    "cost": 560,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": 0.8571428571428571,
        "min": 1367,
        "max": 1562
      }
    ],
    "source": "https://classicdb.ch/?spell=10396",
    "referenceSource": "https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:healing-wave",
      "spellId": 10396,
      "rank": 9,
      "level": 56,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=10396",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:rejuvenation",
    "spellId": 9841,
    "rank": 10,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 335,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": 0.2,
        "min": 189,
        "max": 189,
        "durationMs": 12000,
        "intervalMs": 3000
      }
    ],
    "source": "https://classicdb.ch/?spell=9841",
    "referenceSource": "https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:rejuvenation",
      "spellId": 9841,
      "rank": 10,
      "level": 58,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=9841",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:renew",
    "spellId": 10929,
    "rank": 9,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "instant",
    "cost": 365,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": 0.2,
        "min": 162,
        "max": 162,
        "durationMs": 15000,
        "intervalMs": 3000
      }
    ],
    "source": "https://classicdb.ch/?spell=10929",
    "referenceSource": "https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:renew",
      "spellId": 10929,
      "rank": 9,
      "level": 56,
      "fields": {
        "school": "holy"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=10929",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:multi-shot",
    "spellId": 14290,
    "rank": 4,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "cast",
    "cost": 210,
    "castMs": 500,
    "minRange": 8,
    "maxRange": 35,
    "components": [
      {
        "kind": "ranged-weapon",
        "stat": "ranged",
        "coefficient": 1,
        "flat": 120
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/multi_shot.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/multi_shot.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:multi-shot",
      "spellId": 14290,
      "rank": 4,
      "level": 54,
      "fields": {
        "school": "ranged"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/multi_shot.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 10000,
    "multiTarget": {
      "cap": 3,
      "falloff": 1
    },
    "requiredPolicy": [
      "rangedModel",
      "targetPolicy"
    ]
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:conflagrate",
    "spellId": 18932,
    "rank": 4,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 255,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 0.429,
        "min": 447,
        "max": 557
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/conflagrate.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/conflagrate.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:conflagrate",
      "spellId": 18932,
      "rank": 4,
      "level": 60,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/conflagrate.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 10000,
    "requiresOwnedAura": {
      "name": "Immolate",
      "minRemainingMs": 1
    },
    "consumePeriodic": {
      "auraName": "Immolate",
      "durationMs": 3000
    },
    "guideSource": "https://octowow.st/index.php/warlock",
    "requiredPolicy": [
      "consumeOnMiss"
    ]
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:life-tap",
    "spellId": 11689,
    "rank": 6,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "health-to-resource",
        "stat": "shadow",
        "coefficient": 0.8,
        "min": 424,
        "max": 424
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/lifetap.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/lifetap.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:life-tap",
      "spellId": 11689,
      "rank": 6,
      "level": 56,
      "fields": {
        "school": "shadow"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/lifetap.go",
      "liveVerified": false
    },
    "requiredPolicy": [
      "lifeTapFactor"
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:insect-swarm",
    "spellId": 24977,
    "rank": 5,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 160,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "nature",
        "coefficient": 0.158,
        "min": 54,
        "max": 54,
        "durationMs": 12000,
        "intervalMs": 2000
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/insect_swarm.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/insect_swarm.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:insect-swarm",
      "spellId": 24977,
      "rank": 5,
      "level": 60,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/insect_swarm.go",
      "liveVerified": false
    },
    "guideSource": "https://octowow.st/index.php/druid"
  },
  {
    "classId": "priest",
    "abilityId": "priest:mind-flay",
    "spellId": 18807,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": 205,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": 0.15,
        "min": 142,
        "max": 142
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_flay.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_flay.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:mind-flay",
      "spellId": 18807,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "shadow"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/mind_flay.go",
      "liveVerified": false
    },
    "tickMs": 1000,
    "requiredPolicy": [
      "channelTickAtEnd"
    ]
  },
  {
    "classId": "rogue",
    "abilityId": "rogue:rupture",
    "spellId": 11275,
    "rank": 6,
    "learnLevel": 60,
    "resource": "energy",
    "mode": "instant",
    "cost": 20,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "combo-bleed",
        "stat": "attackPower",
        "coefficient": 0,
        "ranges": [
          [
            68,
            68
          ],
          [
            76,
            76
          ],
          [
            84,
            84
          ],
          [
            92,
            92
          ],
          [
            100,
            100
          ]
        ],
        "comboCoefficients": [
          0.01,
          0.02,
          0.03,
          0.03,
          0.03
        ],
        "durations": [
          8000,
          10000,
          12000,
          14000,
          16000
        ],
        "intervalMs": 2000
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/rupture.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/rupture.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "rogue",
      "abilityId": "rogue:rupture",
      "spellId": 11275,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "attackPower"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/rupture.go",
      "liveVerified": false
    },
    "comboSpend": true,
    "guideSource": "https://octowow.st/index.php/rogue",
    "requiredPolicy": [
      "spendOnMiss"
    ]
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:frost-shock",
    "spellId": 10473,
    "rank": 4,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 430,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "damage",
        "stat": "frost",
        "coefficient": 0.386,
        "min": 492,
        "max": 520
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/frost_shock.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/frost_shock.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:frost-shock",
      "spellId": 10473,
      "rank": 4,
      "level": 58,
      "fields": {
        "school": "frost"
      },
      "unknown": [
        "OctoWoW current rank effects",
        "live coefficient and cost",
        "live timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/frost_shock.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 6000,
    "sharedCooldownGroup": "shaman:shock"
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:consecration",
    "spellId": 20924,
    "rank": 5,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 205,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 8,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "holy",
        "coefficient": null,
        "min": 48,
        "max": 48,
        "durationMs": 8000,
        "intervalMs": 1000
      }
    ],
    "source": "https://forge.octowow.st/paladin",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/paladin/consecration.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:consecration",
      "spellId": 20924,
      "rank": 5,
      "level": 60,
      "fields": {
        "school": "holy",
        "guideManaCost": 205,
        "guideDecay": true
      },
      "unknown": [
        "exact tick decay",
        "base damage",
        "coefficient",
        "tick miss",
        "target movement"
      ],
      "conflicts": [
        {
          "field": "cost/decay",
          "guide": "205 mana; declining ticks",
          "externalReference": "565 mana; constant ticks"
        }
      ],
      "status": "external-reference-only",
      "source": "https://forge.octowow.st/paladin",
      "liveVerified": false
    },
    "referenceCooldownMs": 8000,
    "multiTarget": {
      "cap": 40,
      "falloff": 1
    },
    "requiredPolicy": [
      "targetPolicy",
      "consecrationModel",
      "acceptSourceConflict"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:flash-of-light",
    "spellId": 51743,
    "rank": 7,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 180,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 428,
        "max": 494
      }
    ],
    "source": "https://forge.octowow.st/database/?spell=51743",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-staging-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:flash-of-light",
      "spellId": 51743,
      "rank": 7,
      "level": 60,
      "fields": {
        "school": "holy",
        "staging": true
      },
      "unknown": [
        "production client rank, coefficients, proc rates and timing"
      ],
      "conflicts": [],
      "status": "staging-database-reference",
      "source": "https://forge.octowow.st/database/?spell=51743",
      "liveVerified": false
    },
    "requiredPolicy": [
      "componentCoefficients"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:holy-shock",
    "spellId": 51786,
    "rank": 4,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "instant",
    "cost": 485,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 628,
        "max": 681
      }
    ],
    "source": "https://forge.octowow.st/database/?spell=51786",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-staging-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:holy-shock",
      "spellId": 51786,
      "rank": 4,
      "level": 56,
      "fields": {
        "school": "holy",
        "staging": true
      },
      "unknown": [
        "production client rank, coefficients, proc rates and timing"
      ],
      "conflicts": [],
      "status": "staging-database-reference",
      "source": "https://forge.octowow.st/database/?spell=51786",
      "liveVerified": false
    },
    "damageComponent": {
      "kind": "damage",
      "stat": "holy",
      "coefficient": null,
      "min": 256,
      "max": 272
    },
    "referenceCooldownMs": 20000,
    "requiredPolicy": [
      "holyShockModel"
    ]
  },
  {
    "classId": "mage",
    "abilityId": "mage:pyroblast",
    "spellId": 18809,
    "rank": 8,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 440,
    "castMs": 6000,
    "minRange": 0,
    "maxRange": 35,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": 1,
        "min": 716,
        "max": 890
      },
      {
        "kind": "periodic-damage",
        "stat": "fire",
        "coefficient": 0.15,
        "min": 67,
        "max": 67,
        "durationMs": 12000,
        "intervalMs": 3000,
        "reusePreviousHit": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/pyroblast.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/pyroblast.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "mage",
      "abilityId": "mage:pyroblast",
      "spellId": 18809,
      "rank": 8,
      "level": 60,
      "fields": {
        "school": "fire"
      },
      "unknown": [
        "live rank, effects, coefficient and cost"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/pyroblast.go",
      "liveVerified": false
    },
    "refreshStrategy": "do-not-gate",
    "referenceGcdMs": 1000
  },
  {
    "classId": "mage",
    "abilityId": "mage:blizzard",
    "spellId": 10187,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": 1400,
    "castMs": 8000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "frost",
        "coefficient": 0.042,
        "min": 149,
        "max": 149,
        "channelPeriodic": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/blizzard.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/blizzard.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "mage",
      "abilityId": "mage:blizzard",
      "spellId": 10187,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "frost"
      },
      "unknown": [
        "live rank, effects, coefficient and cost"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/blizzard.go",
      "liveVerified": false
    },
    "tickMs": 1000,
    "multiTarget": {
      "cap": 40,
      "falloff": 1
    },
    "requiredPolicy": [
      "targetPolicy",
      "channelTickAtEnd",
      "channelApplicationPolicy"
    ]
  },
  {
    "classId": "priest",
    "abilityId": "priest:smite",
    "spellId": 10934,
    "rank": 8,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "cast",
    "cost": 280,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "holy",
        "coefficient": 0.714,
        "min": 384,
        "max": 429
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/smite.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/smite.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:smite",
      "spellId": 10934,
      "rank": 8,
      "level": 54,
      "fields": {
        "school": "holy"
      },
      "unknown": [
        "live rank, effects, coefficient and cost"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/smite.go",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:power-word-shield",
    "spellId": 10901,
    "rank": 10,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 500,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "absorb",
        "stat": "healingPower",
        "coefficient": null,
        "min": 942,
        "max": 942
      }
    ],
    "source": "https://classic.warcraftdb.com/data/spell/10901",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "priest",
      "abilityId": "priest:power-word-shield",
      "spellId": 10901,
      "rank": 10,
      "level": 60,
      "fields": {
        "school": "holy"
      },
      "unknown": [
        "live shield amount, cooldown, stat scaling, duration, Weakened Soul and break proc"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classic.warcraftdb.com/data/spell/10901",
      "liveVerified": false
    },
    "referenceCooldownMs": 4000,
    "requiredPolicy": [
      "shieldModel"
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:claw",
    "spellId": 9850,
    "rank": 5,
    "learnLevel": 58,
    "resource": "energy",
    "mode": "instant",
    "cost": 45,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": 1,
        "flat": 115
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/claw.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/claw.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:claw",
      "spellId": 9850,
      "rank": 5,
      "level": 58,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/claw.go",
      "liveVerified": false
    },
    "form": "Cat",
    "referenceGcdMs": 1000,
    "requiredPolicy": [
      "feralModel"
    ],
    "comboGain": 1
  },
  {
    "classId": "druid",
    "abilityId": "druid:shred",
    "spellId": 9830,
    "rank": 5,
    "learnLevel": 54,
    "resource": "energy",
    "mode": "instant",
    "cost": 60,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/shred.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/shred.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:shred",
      "spellId": 9830,
      "rank": 5,
      "level": 54,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [
        {
          "field": "weapon scaling",
          "externalReference": "2.25 × (weapon + 80)",
          "guide": "six ranks; rank-dependent bonus damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/shred.go",
      "liveVerified": false
    },
    "form": "Cat",
    "referenceGcdMs": 1000,
    "position": "behind",
    "comboGain": 1,
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel"
    ],
    "conflicts": [
      {
        "field": "weapon scaling",
        "externalReference": "2.25 × (weapon + 80)",
        "guide": "six ranks; rank-dependent bonus damage"
      }
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:rake",
    "spellId": 9904,
    "rank": 4,
    "learnLevel": 54,
    "resource": "energy",
    "mode": "instant",
    "cost": 40,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 58,
        "max": 58,
        "ignoreArmour": true
      },
      {
        "kind": "physical-bleed",
        "stat": "attackPower",
        "coefficient": null,
        "min": 32,
        "max": 32,
        "durationMs": 9000,
        "intervalMs": 3000,
        "reusePreviousHit": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rake.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rake.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:rake",
      "spellId": 9904,
      "rank": 4,
      "level": 54,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [
        {
          "field": "attack power scaling",
          "externalReference": "no AP scaling",
          "guide": "Rake scales with AP; coefficients unverified",
          "archive": "0.12 initial and 0.03/tick"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rake.go",
      "liveVerified": false
    },
    "form": "Cat",
    "referenceGcdMs": 1000,
    "comboGain": 1,
    "requiredPolicy": [
      "feralModel",
      "componentCoefficients"
    ],
    "conflicts": [
      {
        "field": "attack power scaling",
        "externalReference": "no AP scaling",
        "guide": "Rake scales with AP; coefficients unverified",
        "archive": "0.12 initial and 0.03/tick"
      }
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:rip",
    "spellId": 9896,
    "rank": 6,
    "learnLevel": 60,
    "resource": "energy",
    "mode": "instant",
    "cost": 30,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "combo-bleed",
        "stat": "attackPower",
        "coefficient": 0,
        "ranges": [
          [
            45,
            45
          ],
          [
            73,
            73
          ],
          [
            101,
            101
          ],
          [
            129,
            129
          ],
          [
            157,
            157
          ]
        ],
        "comboCoefficients": [
          0.01,
          0.02,
          0.03,
          0.04,
          0.04
        ],
        "durations": [
          12000,
          12000,
          12000,
          12000,
          12000
        ],
        "intervalMs": 2000
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rip.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rip.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:rip",
      "spellId": 9896,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/rip.go",
      "liveVerified": false
    },
    "form": "Cat",
    "referenceGcdMs": 1000,
    "comboSpend": true,
    "requiredPolicy": [
      "feralModel",
      "spendOnMiss"
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:ferocious-bite",
    "spellId": 22829,
    "rank": 4,
    "learnLevel": 56,
    "resource": "energy",
    "mode": "instant",
    "cost": 35,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "combo",
        "stat": "attackPower",
        "coefficient": null,
        "ranges": [
          [
            173,
            223
          ],
          [
            301,
            351
          ],
          [
            429,
            479
          ],
          [
            557,
            607
          ],
          [
            685,
            735
          ]
        ]
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/ferocious_bite.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/ferocious_bite.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:ferocious-bite",
      "spellId": 22829,
      "rank": 4,
      "level": 56,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [
        {
          "field": "excess energy",
          "externalReference": "flat per-energy damage",
          "guide": "percentage increase"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/ferocious_bite.go",
      "liveVerified": false
    },
    "form": "Cat",
    "referenceGcdMs": 1000,
    "comboSpend": true,
    "requiredPolicy": [
      "feralModel",
      "biteModel",
      "spendOnMiss"
    ],
    "conflicts": [
      {
        "field": "excess energy",
        "externalReference": "flat per-energy damage",
        "guide": "percentage increase"
      }
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:swipe",
    "spellId": 9908,
    "rank": 5,
    "learnLevel": 54,
    "resource": "rage",
    "mode": "instant",
    "cost": 20,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 83,
        "max": 83
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/swipe.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/swipe.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:swipe",
      "spellId": 9908,
      "rank": 5,
      "level": 54,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/swipe.go",
      "liveVerified": false
    },
    "form": "Bear",
    "multiTarget": {
      "cap": 3,
      "falloff": 1
    },
    "requiredPolicy": [
      "feralModel",
      "targetPolicy",
      "componentCoefficients"
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:savage-bite",
    "spellId": 45736,
    "rank": 1,
    "learnLevel": 58,
    "resource": "rage",
    "mode": "instant",
    "cost": 30,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": 0.8,
        "flat": 30
      }
    ],
    "source": "https://octowow.st/index.php/druid",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:savage-bite",
      "spellId": 45736,
      "rank": 1,
      "level": 58,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/druid",
      "liveVerified": false
    },
    "form": "Bear",
    "referenceCooldownMs": 6000,
    "requiredPolicy": [
      "feralModel",
      "flatThreat"
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:raptor-strike",
    "spellId": 14266,
    "rank": 8,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "queued-melee",
    "cost": 100,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/raptor_strike.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/raptor_strike.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:raptor-strike",
      "spellId": 14266,
      "rank": 8,
      "level": 56,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [
        {
          "field": "weapon scaling",
          "externalReference": "normal weapon +140",
          "guide": "percentage weapon damage plus flat bonus"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/raptor_strike.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 6000,
    "requiredPolicy": [
      "weaponDamageModel",
      "weaponPolicy"
    ],
    "conflicts": [
      {
        "field": "weapon scaling",
        "externalReference": "normal weapon +140",
        "guide": "percentage weapon damage plus flat bonus"
      }
    ]
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:stormstrike",
    "spellId": 17364,
    "rank": 1,
    "learnLevel": 40,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/stormstrike.go",
    "referenceSource": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/stormstrike.go",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:stormstrike",
      "spellId": 17364,
      "rank": 1,
      "level": 40,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "exact live rank scaling, cost and attack timing"
      ],
      "conflicts": [
        {
          "field": "nature bonus",
          "externalReference": "20 sec cooldown; target debuff",
          "guide": "rank-dependent nature bonus",
          "archive": "8 sec cooldown; next two nature damage sources; self buff"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/stormstrike.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 8000,
    "requiredPolicy": [
      "weaponDamageModel",
      "costOverride",
      "stormstrikeModel"
    ],
    "conflicts": [
      {
        "field": "nature bonus",
        "externalReference": "20 sec cooldown; target debuff",
        "guide": "rank-dependent nature bonus",
        "archive": "8 sec cooldown; next two nature damage sources; self buff"
      }
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:arcane-shot",
    "spellId": 14287,
    "rank": 8,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 125,
    "castMs": 0,
    "minRange": 8,
    "maxRange": 35,
    "components": [
      {
        "kind": "ranged-arcane",
        "stat": "arcane",
        "coefficient": null,
        "flat": 166
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/arcane_shot.go",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:arcane-shot",
      "spellId": 14287,
      "rank": 8,
      "level": 60,
      "fields": {
        "school": "arcane"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "cost and scaling",
          "externalReference": "183 + 0.429 SP; 190 mana",
          "guide": "ranged weapon contribution; 125 mana",
          "archive": "166 +45% ranged weapon damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/arcane_shot.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 6000,
    "requiredPolicy": [
      "rangedModel",
      "arcaneShotModel"
    ],
    "conflicts": [
      {
        "field": "cost and scaling",
        "externalReference": "183 + 0.429 SP; 190 mana",
        "guide": "ranged weapon contribution; 125 mana",
        "archive": "166 +45% ranged weapon damage"
      }
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mongoose-bite",
    "spellId": 14271,
    "rank": 4,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 65,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 70,
        "hand": "mainhand"
      },
      {
        "kind": "weapon",
        "stat": "offhand",
        "coefficient": null,
        "flat": 0,
        "hand": "offhand",
        "optional": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/mongoose_bite.go",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mongoose-bite",
      "spellId": 14271,
      "rank": 4,
      "level": 58,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "attack mechanic",
          "externalReference": "115 flat; dodge prerequisite",
          "guide": "on demand; both hands when dual wielding",
          "archive": "60% weapon +70; offhand partition unresolved"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/mongoose_bite.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 5000,
    "requiredPolicy": [
      "dualWeaponModel",
      "weaponPolicy"
    ],
    "conflicts": [
      {
        "field": "attack mechanic",
        "externalReference": "115 flat; dodge prerequisite",
        "guide": "on demand; both hands when dual wielding",
        "archive": "60% weapon +70; offhand partition unresolved"
      }
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:wing-clip",
    "spellId": 14268,
    "rank": 3,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 80,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": 0.35,
        "flat": 0
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/wing_clip.go",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:wing-clip",
      "spellId": 14268,
      "rank": 3,
      "level": 60,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "damage and cooldown",
          "externalReference": "50 flat",
          "guide": "weapon percentage; 3 s cooldown",
          "archive": "35% weapon damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/wing_clip.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 3000,
    "requiredPolicy": [
      "weaponPolicy"
    ],
    "conflicts": [
      {
        "field": "damage and cooldown",
        "externalReference": "50 flat",
        "guide": "weapon percentage; 3 s cooldown",
        "archive": "35% weapon damage"
      }
    ]
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:volley",
    "spellId": 14295,
    "rank": 3,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "channel",
    "cost": 330,
    "castMs": 6000,
    "minRange": 0,
    "maxRange": 35,
    "components": [
      {
        "kind": "damage",
        "stat": "arcane",
        "school": "arcane",
        "coefficient": 0.056,
        "min": 80,
        "max": 80,
        "channelPeriodic": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/volley.go",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:volley",
      "spellId": 14295,
      "rank": 3,
      "level": 58,
      "fields": {
        "school": "arcane"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "cost",
          "externalReference": 490,
          "guide": 330
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/hunter/volley.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 60000,
    "tickMs": 1000,
    "multiTarget": {
      "cap": 40,
      "falloff": 1
    },
    "requiredPolicy": [
      "targetPolicy",
      "channelTickAtEnd",
      "channelApplicationPolicy"
    ],
    "conflicts": [
      {
        "field": "cost",
        "externalReference": 490,
        "guide": 330
      }
    ]
  },
  {
    "classId": "druid",
    "abilityId": "druid:hurricane",
    "spellId": 17402,
    "rank": 3,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": 1495,
    "castMs": 10000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "school": "nature",
        "coefficient": 0.03,
        "min": 134,
        "max": 134,
        "channelPeriodic": true
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/hurricane.go",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "druid",
      "abilityId": "druid:hurricane",
      "spellId": 17402,
      "rank": 3,
      "level": 60,
      "fields": {
        "school": "nature"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "externalReference": 60000,
          "guide": 10000
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/druid/hurricane.go",
      "liveVerified": false
    },
    "referenceCooldownMs": 10000,
    "tickMs": 1000,
    "multiTarget": {
      "cap": 40,
      "falloff": 1
    },
    "requiredPolicy": [
      "targetPolicy",
      "channelTickAtEnd",
      "channelApplicationPolicy"
    ],
    "conflicts": [
      {
        "field": "cooldown",
        "externalReference": 60000,
        "guide": 10000
      }
    ]
  },
  {
    "classId": "warrior",
    "abilityId": "warrior:rend",
    "spellId": 11574,
    "rank": 7,
    "learnLevel": 60,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-bleed",
        "stat": "attackPower",
        "coefficient": null,
        "min": 21,
        "max": 21,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warrior/rend.go",
    "referenceSource": "https://octowow.st/index.php/warrior",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "warrior",
      "abilityId": "warrior:rend",
      "spellId": 11574,
      "rank": 7,
      "level": 60,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "AP scaling",
          "externalReference": "flat 21/tick",
          "archive": "5% AP per tick"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warrior/rend.go",
      "liveVerified": false
    },
    "requiredPolicy": [
      "componentCoefficients",
      "rendStancePolicy"
    ],
    "conflicts": [
      {
        "field": "AP scaling",
        "externalReference": "flat 21/tick",
        "archive": "5% AP per tick"
      }
    ]
  },
  {
    "classId": "rogue",
    "abilityId": "rogue:hemorrhage",
    "spellId": 16511,
    "rank": 1,
    "learnLevel": 30,
    "resource": "energy",
    "mode": "instant",
    "cost": 45,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": 1.1,
        "flat": 0
      }
    ],
    "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/hemorrhage.go",
    "referenceSource": "https://octowow.st/index.php/rogue",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "rogue",
      "abilityId": "rogue:hemorrhage",
      "spellId": 16511,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "current live attack table, rank scaling and timings"
      ],
      "conflicts": [
        {
          "field": "rank and charge mechanics",
          "externalReference": "17348, rank 3, flat vulnerability",
          "importedTalent": "16511, 110% weapon damage; +2% physical, 50 charges or 15 s"
        }
      ],
      "status": "external-reference-only",
      "source": "https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/rogue/hemorrhage.go",
      "liveVerified": false
    },
    "referenceGcdMs": 1000,
    "comboGain": 1,
    "requiredPolicy": [
      "weaponPolicy",
      "hemorrhageModel"
    ],
    "conflicts": [
      {
        "field": "rank and charge mechanics",
        "externalReference": "17348, rank 3, flat vulnerability",
        "importedTalent": "16511, 110% weapon damage; +2% physical, 50 charges or 15 s"
      }
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:crusader-strike",
    "spellId": 45409,
    "rank": 1,
    "learnLevel": 10,
    "resource": "mana",
    "mode": "instant",
    "cost": 20,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 30,
        "max": 30
      }
    ],
    "source": "https://octowow.st/index.php/paladin",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:crusader-strike",
      "spellId": 45409,
      "rank": 1,
      "level": 10,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/paladin",
      "liveVerified": false
    },
    "holyBonus": 5,
    "requiredPolicy": [
      "crusaderModel"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:crusader-strike",
    "spellId": 45410,
    "rank": 2,
    "learnLevel": 22,
    "resource": "mana",
    "mode": "instant",
    "cost": 40,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 46,
        "max": 46
      }
    ],
    "source": "https://octowow.st/index.php/paladin",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:crusader-strike",
      "spellId": 45410,
      "rank": 2,
      "level": 22,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/paladin",
      "liveVerified": false
    },
    "holyBonus": 9,
    "requiredPolicy": [
      "crusaderModel"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:crusader-strike",
    "spellId": 45411,
    "rank": 3,
    "learnLevel": 34,
    "resource": "mana",
    "mode": "instant",
    "cost": 70,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 70,
        "max": 70
      }
    ],
    "source": "https://octowow.st/index.php/paladin",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:crusader-strike",
      "spellId": 45411,
      "rank": 3,
      "level": 34,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/paladin",
      "liveVerified": false
    },
    "holyBonus": 14,
    "requiredPolicy": [
      "crusaderModel"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:crusader-strike",
    "spellId": 45412,
    "rank": 4,
    "learnLevel": 46,
    "resource": "mana",
    "mode": "instant",
    "cost": 100,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 106,
        "max": 106
      }
    ],
    "source": "https://octowow.st/index.php/paladin",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:crusader-strike",
      "spellId": 45412,
      "rank": 4,
      "level": 46,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/paladin",
      "liveVerified": false
    },
    "holyBonus": 21,
    "requiredPolicy": [
      "crusaderModel"
    ]
  },
  {
    "classId": "paladin",
    "abilityId": "paladin:crusader-strike",
    "spellId": 45413,
    "rank": 5,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 120,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-flat",
        "stat": "attackPower",
        "coefficient": null,
        "min": 160,
        "max": 160
      }
    ],
    "source": "https://octowow.st/index.php/paladin",
    "referenceSource": "https://octowow.st/index.php/paladin",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "paladin",
      "abilityId": "paladin:crusader-strike",
      "spellId": 45413,
      "rank": 5,
      "level": 58,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/paladin",
      "liveVerified": false
    },
    "holyBonus": 29,
    "requiredPolicy": [
      "crusaderModel"
    ]
  },
  {
    "classId": "rogue",
    "abilityId": "rogue:envenom",
    "spellId": 52531,
    "rank": 1,
    "learnLevel": 30,
    "resource": "energy",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "poison-aura",
        "stat": "attackPower",
        "durations": [
          12000,
          16000,
          20000,
          24000,
          28000
        ]
      }
    ],
    "source": "https://octowow.st/index.php/rogue",
    "referenceSource": "https://octowow.st/index.php/rogue",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "trainer-reference",
    "record": {
      "classId": "rogue",
      "abilityId": "rogue:envenom",
      "spellId": 52531,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "physical"
      },
      "unknown": [
        "unmeasured live damage, rank learnability, coefficients or timings"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/rogue",
      "liveVerified": false
    },
    "comboSpend": true,
    "referenceGcdMs": 1000,
    "refreshStrategy": "actor-buff",
    "requiredPolicy": [
      "costOverride"
    ]
  }
]);
