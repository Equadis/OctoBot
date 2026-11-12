// Original OctoBot presets, retained independently of new templates.
export const LEGACY_PROFILES={
  "warrior": {
    "abilities": [
      "Execute",
      "Bloodthirst",
      "Mortal Strike",
      "Whirlwind",
      "Heroic Strike",
      "Cleave",
      "Slam",
      "Overpower",
      "Rend",
      "Master Strike",
      "Shield Slam",
      "Revenge",
      "Sunder Armor",
      "Battle Shout",
      "Demoralizing Shout",
      "Thunder Clap",
      "Bloodrage",
      "Berserker Rage",
      "Death Wish",
      "Recklessness",
      "Sweeping Strikes",
      "Shield Block"
    ],
    "resources": [
      "rage"
    ],
    "presets": [
      {
        "id": "arms-twohand",
        "name": "Arms | Two-Handed",
        "description": "Execute, Mortal Strike and Overpower; Slam and Heroic Strike as rage allows.",
        "rows": [
          {
            "ability": "Execute",
            "conditions": [
              {
                "metric": "targetHealth",
                "operator": "<=",
                "value": 20,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Mortal Strike",
            "conditions": []
          },
          {
            "ability": "Overpower",
            "conditions": []
          },
          {
            "ability": "Slam",
            "conditions": [
              {
                "metric": "rage",
                "operator": ">=",
                "value": 40,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Heroic Strike",
            "conditions": [
              {
                "metric": "rage",
                "operator": ">=",
                "value": 60,
                "aura": ""
              }
            ]
          }
        ]
      },
      {
        "id": "fury-dual",
        "name": "Fury | Dual Wield",
        "description": "Execute, Bloodthirst and Whirlwind; Heroic Strike at high rage.",
        "rows": [
          {
            "ability": "Execute",
            "conditions": [
              {
                "metric": "targetHealth",
                "operator": "<=",
                "value": 20,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Bloodthirst",
            "conditions": []
          },
          {
            "ability": "Whirlwind",
            "conditions": []
          },
          {
            "ability": "Heroic Strike",
            "conditions": [
              {
                "metric": "rage",
                "operator": ">=",
                "value": 60,
                "aura": ""
              }
            ]
          }
        ]
      },
      {
        "id": "fury-twohand",
        "name": "Fury | Two-Handed",
        "description": "Execute, Bloodthirst and Whirlwind; Slam as rage allows.",
        "rows": [
          {
            "ability": "Execute",
            "conditions": [
              {
                "metric": "targetHealth",
                "operator": "<=",
                "value": 20,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Bloodthirst",
            "conditions": []
          },
          {
            "ability": "Whirlwind",
            "conditions": []
          },
          {
            "ability": "Slam",
            "conditions": [
              {
                "metric": "rage",
                "operator": ">=",
                "value": 40,
                "aura": ""
              }
            ]
          }
        ]
      },
      {
        "id": "protection-shield",
        "name": "Protection | Shield",
        "description": "Shield Slam and Revenge; maintain Sunder Armor and spend excess rage with Heroic Strike.",
        "rows": [
          {
            "ability": "Shield Slam",
            "conditions": []
          },
          {
            "ability": "Revenge",
            "conditions": []
          },
          {
            "ability": "Sunder Armor",
            "conditions": []
          },
          {
            "ability": "Heroic Strike",
            "conditions": [
              {
                "metric": "rage",
                "operator": ">=",
                "value": 60,
                "aura": ""
              }
            ]
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "rogue": {
    "abilities": [
      "Sinister Strike",
      "Backstab",
      "Hemorrhage",
      "Noxious Assault",
      "Garrote",
      "Rupture",
      "Slice and Dice",
      "Eviscerate",
      "Envenom",
      "Expose Armor",
      "Adrenaline Rush",
      "Cold Blood",
      "Blade Flurry",
      "Vanish",
      "Preparation",
      "Mark for Death",
      "Shadow of Death"
    ],
    "resources": [
      "energy",
      "comboPoints"
    ],
    "presets": [
      {
        "id": "assassination-noxious-rupture",
        "name": "Assassination | Noxious Assault (Rupture)",
        "description": "Noxious Assault builder; Envenom and Slice and Dice upkeep, then finishers.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Noxious Assault",
            "conditions": []
          }
        ]
      },
      {
        "id": "assassination-noxious",
        "name": "Assassination | Noxious Assault (No Rupture)",
        "description": "Noxious Assault builder; Envenom and Slice and Dice upkeep, then finishers.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Noxious Assault",
            "conditions": []
          }
        ]
      },
      {
        "id": "assassination-noxious-expose-rupture",
        "name": "Assassination | Noxious Assault Expose Armour (Rupture)",
        "description": "Noxious Assault builder; Envenom and Slice and Dice upkeep, then finishers.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Expose Armor",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Expose Armor"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Noxious Assault",
            "conditions": []
          }
        ]
      },
      {
        "id": "assassination-noxious-expose",
        "name": "Assassination | Noxious Assault Expose Armour (No Rupture)",
        "description": "Noxious Assault builder; Envenom and Slice and Dice upkeep, then finishers.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Expose Armor",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Expose Armor"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Noxious Assault",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-spam",
        "name": "Combat | 1Cp Eviscerate Spam",
        "description": "Sinister Strike builder, 1 CP buff upkeep and Eviscerate.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Sinister Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-sinister-ar-rupture",
        "name": "Combat | Sinister Strike AR (Rupture)",
        "description": "Sinister Strike builder with Slice and Dice upkeep, Adrenaline Rush at low energy.",
        "rows": [
          {
            "ability": "Adrenaline Rush",
            "conditions": [
              {
                "metric": "energy",
                "operator": "<=",
                "value": 30,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Sinister Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-sinister-ar",
        "name": "Combat | Sinister Strike AR (No Rupture)",
        "description": "Sinister Strike builder with Slice and Dice upkeep, Adrenaline Rush at low energy.",
        "rows": [
          {
            "ability": "Adrenaline Rush",
            "conditions": [
              {
                "metric": "energy",
                "operator": "<=",
                "value": 30,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Sinister Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-sinister-envenom-rupture",
        "name": "Combat | Sinister Strike Envenom (Rupture)",
        "description": "Sinister Strike builder with Slice and Dice upkeep, Envenom upkeep.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Sinister Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-sinister-envenom",
        "name": "Combat | Sinister Strike Envenom (No Rupture)",
        "description": "Sinister Strike builder with Slice and Dice upkeep, Envenom upkeep.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Sinister Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-backstab-ar-rupture",
        "name": "Combat | Backstab AR (Rupture)",
        "description": "Backstab builder with Slice and Dice upkeep, Adrenaline Rush at low energy.",
        "rows": [
          {
            "ability": "Adrenaline Rush",
            "conditions": [
              {
                "metric": "energy",
                "operator": "<=",
                "value": 30,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Backstab",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-backstab-ar",
        "name": "Combat | Backstab AR (No Rupture)",
        "description": "Backstab builder with Slice and Dice upkeep, Adrenaline Rush at low energy.",
        "rows": [
          {
            "ability": "Adrenaline Rush",
            "conditions": [
              {
                "metric": "energy",
                "operator": "<=",
                "value": 30,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Backstab",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-backstab-envenom-rupture",
        "name": "Combat | Backstab Envenom (Rupture)",
        "description": "Backstab builder with Slice and Dice upkeep, Envenom upkeep.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 4,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 9,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Backstab",
            "conditions": []
          }
        ]
      },
      {
        "id": "combat-backstab-envenom",
        "name": "Combat | Backstab Envenom (No Rupture)",
        "description": "Backstab builder with Slice and Dice upkeep, Envenom upkeep.",
        "rows": [
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Envenom",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Envenom"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 2,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Eviscerate",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Backstab",
            "conditions": []
          }
        ]
      },
      {
        "id": "subtlety-hemorrhage-expose",
        "name": "Subtlety | Hemorrhage (Expose Armour)",
        "description": "Garrote opener, Slice and Dice and Rupture upkeep, Hemorrhage builder.",
        "rows": [
          {
            "ability": "Garrote",
            "conditions": [
              {
                "metric": "combatTime",
                "operator": "<=",
                "value": 0,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Expose Armor",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Expose Armor"
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Hemorrhage",
            "conditions": []
          }
        ]
      },
      {
        "id": "subtlety-hemorrhage",
        "name": "Subtlety | Hemorrhage (No Expose Armour)",
        "description": "Garrote opener, Slice and Dice and Rupture upkeep, Hemorrhage builder.",
        "rows": [
          {
            "ability": "Garrote",
            "conditions": [
              {
                "metric": "combatTime",
                "operator": "<=",
                "value": 0,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Slice and Dice",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 1,
                "aura": ""
              },
              {
                "metric": "comboPoints",
                "operator": "<=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Slice and Dice"
              }
            ]
          },
          {
            "ability": "Rupture",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              },
              {
                "metric": "auraDuration",
                "operator": "<",
                "value": 1,
                "aura": "Rupture"
              }
            ]
          },
          {
            "ability": "Hemorrhage",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "paladin": {
    "abilities": [
      "Holy Strike",
      "Crusader Strike",
      "Seal of Command",
      "Seal of Righteousness",
      "Judgement",
      "Consecration",
      "Exorcism",
      "Hammer of Wrath",
      "Holy Shock",
      "Holy Shield",
      "Holy Light",
      "Flash of Light"
    ],
    "resources": [
      "mana",
      "manaPercent"
    ],
    "presets": [
      {
        "id": "retribution",
        "name": "Retribution",
        "description": "",
        "rows": [
          {
            "ability": "Seal of Command",
            "conditions": []
          },
          {
            "ability": "Holy Strike",
            "conditions": []
          },
          {
            "ability": "Crusader Strike",
            "conditions": []
          },
          {
            "ability": "Judgement",
            "conditions": []
          },
          {
            "ability": "Consecration",
            "conditions": []
          }
        ]
      },
      {
        "id": "holy-shock",
        "name": "Holy | Holy Shock",
        "description": "",
        "rows": [
          {
            "ability": "Holy Shock",
            "conditions": []
          },
          {
            "ability": "Judgement",
            "conditions": []
          },
          {
            "ability": "Consecration",
            "conditions": []
          }
        ]
      },
      {
        "id": "protection",
        "name": "Protection",
        "description": "",
        "rows": [
          {
            "ability": "Holy Shield",
            "conditions": []
          },
          {
            "ability": "Consecration",
            "conditions": []
          },
          {
            "ability": "Judgement",
            "conditions": []
          },
          {
            "ability": "Holy Strike",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "druid": {
    "abilities": [
      "Wrath",
      "Starfire",
      "Moonfire",
      "Insect Swarm",
      "Hurricane",
      "Shred",
      "Claw",
      "Rake",
      "Rip",
      "Ferocious Bite",
      "Tiger’s Fury",
      "Maul",
      "Swipe",
      "Demoralizing Roar",
      "Faerie Fire",
      "Rejuvenation",
      "Regrowth",
      "Healing Touch",
      "Swiftmend"
    ],
    "resources": [
      "mana",
      "manaPercent",
      "energy",
      "comboPoints",
      "rage"
    ],
    "presets": [
      {
        "id": "balance",
        "name": "Balance",
        "description": "",
        "rows": [
          {
            "ability": "Moonfire",
            "conditions": []
          },
          {
            "ability": "Insect Swarm",
            "conditions": []
          },
          {
            "ability": "Starfire",
            "conditions": []
          }
        ]
      },
      {
        "id": "feral-cat",
        "name": "Feral | Cat",
        "description": "",
        "rows": [
          {
            "ability": "Rip",
            "conditions": [
              {
                "metric": "comboPoints",
                "operator": ">=",
                "value": 5,
                "aura": ""
              }
            ]
          },
          {
            "ability": "Shred",
            "conditions": []
          }
        ]
      },
      {
        "id": "feral-bear",
        "name": "Feral | Bear",
        "description": "",
        "rows": [
          {
            "ability": "Maul",
            "conditions": []
          },
          {
            "ability": "Swipe",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "shaman": {
    "abilities": [
      "Lightning Bolt",
      "Chain Lightning",
      "Earth Shock",
      "Flame Shock",
      "Frost Shock",
      "Stormstrike",
      "Lightning Shield",
      "Searing Totem",
      "Magma Totem",
      "Fire Nova Totem",
      "Elemental Mastery",
      "Nature’s Swiftness",
      "Healing Wave",
      "Lesser Healing Wave",
      "Chain Heal"
    ],
    "resources": [
      "mana",
      "manaPercent"
    ],
    "presets": [
      {
        "id": "elemental",
        "name": "Elemental",
        "description": "",
        "rows": [
          {
            "ability": "Elemental Mastery",
            "conditions": []
          },
          {
            "ability": "Chain Lightning",
            "conditions": []
          },
          {
            "ability": "Lightning Bolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "enhancement",
        "name": "Enhancement",
        "description": "",
        "rows": [
          {
            "ability": "Stormstrike",
            "conditions": []
          },
          {
            "ability": "Flame Shock",
            "conditions": []
          },
          {
            "ability": "Earth Shock",
            "conditions": []
          }
        ]
      },
      {
        "id": "restoration-damage",
        "name": "Restoration | Damage",
        "description": "",
        "rows": [
          {
            "ability": "Flame Shock",
            "conditions": []
          },
          {
            "ability": "Lightning Bolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "hunter": {
    "abilities": [
      "Aimed Shot",
      "Multi-Shot",
      "Arcane Shot",
      "Serpent Sting",
      "Raptor Strike",
      "Mongoose Bite",
      "Counterattack",
      "Rapid Fire",
      "Bestial Wrath",
      "Trueshot Aura",
      "Hunter’s Mark",
      "Intimidation",
      "Scatter Shot",
      "Volley",
      "Mend Pet"
    ],
    "resources": [
      "mana",
      "manaPercent",
      "petFocus"
    ],
    "presets": [
      {
        "id": "beast-mastery",
        "name": "Beast Mastery",
        "description": "",
        "rows": [
          {
            "ability": "Bestial Wrath",
            "conditions": []
          },
          {
            "ability": "Aimed Shot",
            "conditions": []
          },
          {
            "ability": "Multi-Shot",
            "conditions": []
          }
        ]
      },
      {
        "id": "marksmanship",
        "name": "Marksmanship",
        "description": "",
        "rows": [
          {
            "ability": "Rapid Fire",
            "conditions": []
          },
          {
            "ability": "Aimed Shot",
            "conditions": []
          },
          {
            "ability": "Multi-Shot",
            "conditions": []
          }
        ]
      },
      {
        "id": "survival",
        "name": "Survival",
        "description": "",
        "rows": [
          {
            "ability": "Serpent Sting",
            "conditions": []
          },
          {
            "ability": "Aimed Shot",
            "conditions": []
          },
          {
            "ability": "Multi-Shot",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "mage": {
    "abilities": [
      "Frostbolt",
      "Fireball",
      "Scorch",
      "Fire Blast",
      "Pyroblast",
      "Arcane Missiles",
      "Arcane Explosion",
      "Blizzard",
      "Flamestrike",
      "Arcane Power",
      "Presence of Mind",
      "Combustion",
      "Evocation",
      "Cold Snap"
    ],
    "resources": [
      "mana",
      "manaPercent"
    ],
    "presets": [
      {
        "id": "arcane",
        "name": "Arcane",
        "description": "",
        "rows": [
          {
            "ability": "Arcane Power",
            "conditions": []
          },
          {
            "ability": "Arcane Missiles",
            "conditions": []
          }
        ]
      },
      {
        "id": "fire",
        "name": "Fire",
        "description": "",
        "rows": [
          {
            "ability": "Combustion",
            "conditions": []
          },
          {
            "ability": "Scorch",
            "conditions": []
          },
          {
            "ability": "Fireball",
            "conditions": []
          }
        ]
      },
      {
        "id": "frost",
        "name": "Frost",
        "description": "",
        "rows": [
          {
            "ability": "Frostbolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "warlock": {
    "abilities": [
      "Shadow Bolt",
      "Corruption",
      "Curse of Agony",
      "Curse of Doom",
      "Immolate",
      "Conflagrate",
      "Searing Pain",
      "Soul Fire",
      "Drain Soul",
      "Drain Life",
      "Life Tap",
      "Shadowburn",
      "Death Coil",
      "Drain Mana"
    ],
    "resources": [
      "mana",
      "manaPercent",
      "soulShards"
    ],
    "presets": [
      {
        "id": "affliction",
        "name": "Affliction",
        "description": "",
        "rows": [
          {
            "ability": "Curse of Agony",
            "conditions": []
          },
          {
            "ability": "Corruption",
            "conditions": []
          },
          {
            "ability": "Shadow Bolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "demonology",
        "name": "Demonology",
        "description": "",
        "rows": [
          {
            "ability": "Corruption",
            "conditions": []
          },
          {
            "ability": "Shadow Bolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "destruction",
        "name": "Destruction",
        "description": "",
        "rows": [
          {
            "ability": "Immolate",
            "conditions": []
          },
          {
            "ability": "Conflagrate",
            "conditions": []
          },
          {
            "ability": "Shadow Bolt",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  },
  "priest": {
    "abilities": [
      "Mind Blast",
      "Mind Flay",
      "Shadow Word: Pain",
      "Smite",
      "Holy Fire",
      "Devouring Plague",
      "Vampiric Embrace",
      "Power Infusion",
      "Inner Focus",
      "Shadowform",
      "Power Word: Shield",
      "Flash Heal",
      "Heal",
      "Greater Heal",
      "Renew"
    ],
    "resources": [
      "mana",
      "manaPercent"
    ],
    "presets": [
      {
        "id": "discipline",
        "name": "Discipline",
        "description": "",
        "rows": [
          {
            "ability": "Power Infusion",
            "conditions": []
          },
          {
            "ability": "Holy Fire",
            "conditions": []
          },
          {
            "ability": "Smite",
            "conditions": []
          }
        ]
      },
      {
        "id": "holy",
        "name": "Holy",
        "description": "",
        "rows": [
          {
            "ability": "Holy Fire",
            "conditions": []
          },
          {
            "ability": "Smite",
            "conditions": []
          }
        ]
      },
      {
        "id": "shadow",
        "name": "Shadow",
        "description": "",
        "rows": [
          {
            "ability": "Shadow Word: Pain",
            "conditions": []
          },
          {
            "ability": "Mind Blast",
            "conditions": []
          },
          {
            "ability": "Mind Flay",
            "conditions": []
          }
        ]
      },
      {
        "id": "custom",
        "name": "New Custom Rotation",
        "description": "",
        "rows": []
      }
    ]
  }
};
