// Pinned third-party reference values. Not OctoWoW observations. Exact current-server costs and effects require validation.
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
  }
]);
