// Published ranks and distinct Classic reference assumptions. A reference
// coefficient is not a verified OctoWoW coefficient; all ranks are research-only.
// Exact rank observations are kept in combat-rank-evidence.mjs.
import {EXTERNAL_REFERENCE_RANKS} from './combat-external-ranks.mjs';
import {rankEvidence} from './combat-rank-evidence.mjs';
const coefficientSource='https://www.warcrafttavern.com/wow-classic/guides/ozgars-downranking-guide-tool';
const c=(kind,stat,coefficient,extra={})=>({kind,stat,coefficient,...extra});
const row=(classId,slug,spellId,resource,mode,components,extra={})=>{
 const abilityId=classId+':'+slug,record=rankEvidence(abilityId,spellId);
 if(!record)throw new Error('Missing rank evidence: '+abilityId);
 return {classId,abilityId,spellId,rank:record.rank,learnLevel:record.level,resource,mode,components,record,source:record.source,status:'reference-implementation',liveVerified:false,...extra};
};
export const REFERENCE_RANKS=Object.freeze([
 ...EXTERNAL_REFERENCE_RANKS,
 ...[
  {
    "classId": "priest",
    "abilityId": "priest:holy-nova",
    "spellId": 15237,
    "rank": 1,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "instant",
    "cost": 185,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "damage",
        "stat": "holy",
        "coefficient": null,
        "min": 29,
        "max": 33
      },
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 54,
        "max": 62
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/holy-nova",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "holyNovaModel",
      "componentCoefficients",
      "costOverride",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:holy-nova",
      "spellId": 15237,
      "rank": 1,
      "level": 20,
      "fields": {
        "school": "holy",
        "referenceDamage": [
          29,
          33
        ],
        "referenceHeal": [
          54,
          62
        ],
        "referenceRadius": 10
      },
      "unknown": [
        "live ranked base amounts, mana cost, coefficients, threat, Shadowform penalty"
      ],
      "conflicts": [
        {
          "field": "manaThreat",
          "classic": "rank cost 185, zero threat",
          "guide": "180 mana, reduced threat; rank unspecified"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/holy-nova",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:holy-nova",
    "spellId": 15430,
    "rank": 2,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "instant",
    "cost": 290,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "damage",
        "stat": "holy",
        "coefficient": null,
        "min": 52,
        "max": 60
      },
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 89,
        "max": 101
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/holy-nova",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "holyNovaModel",
      "componentCoefficients",
      "costOverride",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:holy-nova",
      "spellId": 15430,
      "rank": 2,
      "level": 28,
      "fields": {
        "school": "holy",
        "referenceDamage": [
          52,
          60
        ],
        "referenceHeal": [
          89,
          101
        ],
        "referenceRadius": 10
      },
      "unknown": [
        "live ranked base amounts, mana cost, coefficients, threat, Shadowform penalty"
      ],
      "conflicts": [
        {
          "field": "manaThreat",
          "classic": "rank cost 290, zero threat",
          "guide": "180 mana, reduced threat; rank unspecified"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/holy-nova",
      "liveVerified": false
    }
  }
],
 row('priest','holy-nova',15431,'mana','instant',[{kind:'damage',stat:'holy',coefficient:null,min:76,max:89},{kind:'heal',stat:'healingPower',coefficient:null,min:121,max:140}],{cost:400,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:0,referenceGcdMs:1500,requiredPolicy:["holyNovaModel","componentCoefficients","costOverride","acceptSourceConflict"]}),
 row('priest','holy-nova',27799,'mana','instant',[{kind:'damage',stat:'holy',coefficient:null,min:106,max:123},{kind:'heal',stat:'healingPower',coefficient:null,min:161,max:188}],{cost:520,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:0,referenceGcdMs:1500,requiredPolicy:["holyNovaModel","componentCoefficients","costOverride","acceptSourceConflict"]}),
 row('priest','holy-nova',27800,'mana','instant',[{kind:'damage',stat:'holy',coefficient:null,min:140,max:163},{kind:'heal',stat:'healingPower',coefficient:null,min:235,max:272}],{cost:635,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:0,referenceGcdMs:1500,requiredPolicy:["holyNovaModel","componentCoefficients","costOverride","acceptSourceConflict"]}),
 row('priest','holy-nova',27801,'mana','instant',[{kind:'damage',stat:'holy',coefficient:null,min:181,max:210},{kind:'heal',stat:'healingPower',coefficient:null,min:302,max:351}],{cost:750,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:0,referenceGcdMs:1500,requiredPolicy:["holyNovaModel","componentCoefficients","costOverride","acceptSourceConflict"]}),
 {
  "classId": "priest",
  "abilityId": "priest:inner-focus",
  "spellId": 14751,
  "rank": 1,
  "learnLevel": 20,
  "resource": "mana",
  "mode": "instant",
  "cost": 0,
  "castMs": 0,
  "minRange": 0,
  "maxRange": 0,
  "components": [
    {
      "kind": "priest-inner-focus"
    }
  ],
  "source": "https://octowow.st/talents/priest/",
  "referenceSource": "https://www.wowhead.com/classic/spell=14751/inner-focus",
  "status": "external-reference-only",
  "liveVerified": false,
  "learnability": "talent-reference",
  "requiredPolicy": [
    "innerFocusModel"
  ],
  "referenceGcdMs": 0,
  "referenceCooldownMs": 180000,
  "refreshStrategy": "actor-buff",
  "record": {
    "classId": "priest",
    "abilityId": "priest:inner-focus",
    "spellId": 14751,
    "rank": 1,
    "level": 20,
    "fields": {
      "school": "shadow",
      "manaCostReductionPct": 100,
      "critBonusPct": 25
    },
    "unknown": [
      "live cooldown, duration, GCD, interaction with Searing Light, channel and periodic eligibility"
    ],
    "conflicts": [],
    "status": "external-reference-only",
    "source": "https://octowow.st/talents/priest/",
    "liveVerified": false
  }
},
 ...[
  {
    "classId": "priest",
    "abilityId": "priest:fade",
    "spellId": 586,
    "rank": 1,
    "learnLevel": 8,
    "resource": "mana",
    "mode": "instant",
    "cost": 40,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "priest-fade"
      }
    ],
    "source": "https://classicdb.ch/?spell=586",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "fadeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "actor-buff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:fade",
      "spellId": 586,
      "rank": 1,
      "level": 8,
      "fields": {
        "school": "shadow",
        "referenceFlat": 55,
        "referenceDurationMs": 10000
      },
      "unknown": [
        "live cooldown, cost, flat and percentage reduction, restoration order"
      ],
      "conflicts": [
        {
          "field": "percentageReduction",
          "classic": "flat only",
          "archive": "15% in addition to flat"
        }
      ],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=586",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:fade",
    "spellId": 9578,
    "rank": 2,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "instant",
    "cost": 75,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "priest-fade"
      }
    ],
    "source": "https://classicdb.ch/?spell=9578",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "fadeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "actor-buff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:fade",
      "spellId": 9578,
      "rank": 2,
      "level": 20,
      "fields": {
        "school": "shadow",
        "referenceFlat": 155,
        "referenceDurationMs": 10000
      },
      "unknown": [
        "live cooldown, cost, flat and percentage reduction, restoration order"
      ],
      "conflicts": [
        {
          "field": "percentageReduction",
          "classic": "flat only",
          "archive": "15% in addition to flat"
        }
      ],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=9578",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:fade",
    "spellId": 10941,
    "rank": 5,
    "learnLevel": 50,
    "resource": "mana",
    "mode": "instant",
    "cost": 225,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "priest-fade"
      }
    ],
    "source": "https://classicdb.ch/?spell=10941",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "fadeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "actor-buff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:fade",
      "spellId": 10941,
      "rank": 5,
      "level": 50,
      "fields": {
        "school": "shadow",
        "referenceFlat": 620,
        "referenceDurationMs": 10000
      },
      "unknown": [
        "live cooldown, cost, flat and percentage reduction, restoration order"
      ],
      "conflicts": [
        {
          "field": "percentageReduction",
          "classic": "flat only",
          "archive": "15% in addition to flat"
        }
      ],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=10941",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:fade",
    "spellId": 10942,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 275,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 0,
    "components": [
      {
        "kind": "priest-fade"
      }
    ],
    "source": "https://classicdb.ch/?spell=10942",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "fadeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "actor-buff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:fade",
      "spellId": 10942,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "shadow",
        "referenceFlat": 820,
        "referenceDurationMs": 10000
      },
      "unknown": [
        "live cooldown, cost, flat and percentage reduction, restoration order"
      ],
      "conflicts": [
        {
          "field": "percentageReduction",
          "classic": "flat only",
          "archive": "15% in addition to flat"
        }
      ],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=10942",
      "liveVerified": false
    }
  }
],
 row('priest','fade',9579,'mana','instant',[{kind:'priest-fade'}],{cost:125,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:30000,referenceGcdMs:1500,requiredPolicy:['fadeModel','acceptSourceConflict'],refreshStrategy:'actor-buff'}),
 row('priest','fade',9592,'mana','instant',[{kind:'priest-fade'}],{cost:175,castMs:0,minRange:0,maxRange:0,referenceCooldownMs:30000,referenceGcdMs:1500,requiredPolicy:['fadeModel','acceptSourceConflict'],refreshStrategy:'actor-buff'}),
 {
  "classId": "priest",
  "abilityId": "priest:vampiric-embrace",
  "spellId": 15286,
  "rank": 1,
  "learnLevel": 30,
  "resource": "mana",
  "mode": "instant",
  "cost": 0,
  "castMs": 0,
  "minRange": 0,
  "maxRange": 30,
  "components": [
    {
      "kind": "vampiric-embrace"
    }
  ],
  "source": "https://octowow.st/talents/priest/",
  "referenceSource": "https://octowow.st/index.php/priest",
  "status": "external-reference-only",
  "liveVerified": false,
  "learnability": "talent-reference",
  "requiredPolicy": [
    "costOverride",
    "castOverrideMs",
    "vampiricEmbraceModel",
    "acceptSourceConflict"
  ],
  "referenceGcdMs": 1500,
  "referenceCooldownMs": 0,
  "refreshStrategy": "target-debuff",
  "record": {
    "classId": "priest",
    "abilityId": "priest:vampiric-embrace",
    "spellId": 15286,
    "rank": 1,
    "level": 30,
    "fields": {
      "school": "shadow",
      "durationMs": 60000,
      "healPct": 20
    },
    "unknown": [
      "live cost, range, GCD, cooldown, target eligibility, damage basis, threat"
    ],
    "conflicts": [
      {
        "field": "castMs",
        "archive": "instant and 2-second versions",
        "reference": "instant; explicit override required"
      }
    ],
    "status": "external-reference-only",
    "source": "https://octowow.st/talents/priest/",
    "liveVerified": false
  }
},
 ...[[2944,215,19],[19278,645,68]].map(([id,cost,tick])=>row('priest','devouring-plague',id,'mana','instant',[c('periodic-damage','shadow',null,{min:tick,max:tick,durationMs:24000,intervalMs:3000,leech:true})],{cost,castMs:0,minRange:0,maxRange:30,referenceCooldownMs:180000,referenceGcdMs:1500,referenceSource:'https://octowow.st/index.php/priest',requiredPolicy:['componentCoefficients','leechModel',...(id===2944?['acceptSourceConflict']:[])],refreshStrategy:'target-debuff'})),
 ...[
  {
    "classId": "priest",
    "abilityId": "priest:devouring-plague",
    "spellId": 19276,
    "rank": 2,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "instant",
    "cost": 350,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 34,
        "max": 34,
        "durationMs": 24000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=19276/devouring-plague",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "componentCoefficients",
      "leechModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 180000,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:devouring-plague",
      "spellId": 19276,
      "rank": 2,
      "level": 28,
      "fields": {
        "school": "shadow",
        "classicManaCost": 350,
        "classicBaseTick": 34,
        "referenceDurationMs": 24000,
        "referenceTickMs": 3000,
        "referenceCooldownMs": 180000
      },
      "unknown": [
        "OctoWoW rank cost and damage",
        "live cooldown, coefficient, leech basis and threat"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=19276/devouring-plague",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:devouring-plague",
    "spellId": 19277,
    "rank": 3,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "instant",
    "cost": 495,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 50,
        "max": 50,
        "durationMs": 24000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://classicdb.ch/?spell=19277",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "componentCoefficients",
      "leechModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 180000,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:devouring-plague",
      "spellId": 19277,
      "rank": 3,
      "level": 36,
      "fields": {
        "school": "shadow",
        "classicManaCost": 495,
        "classicBaseTick": 50,
        "referenceDurationMs": 24000,
        "referenceTickMs": 3000,
        "referenceCooldownMs": 180000
      },
      "unknown": [
        "OctoWoW rank cost and damage",
        "live cooldown, coefficient, leech basis and threat"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classicdb.ch/?spell=19277",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:devouring-plague",
    "spellId": 19279,
    "rank": 5,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "instant",
    "cost": 810,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 89,
        "max": 89,
        "durationMs": 24000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://classic.warcraftdb.com/data/spell/19279",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "componentCoefficients",
      "leechModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 180000,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:devouring-plague",
      "spellId": 19279,
      "rank": 5,
      "level": 52,
      "fields": {
        "school": "shadow",
        "classicManaCost": 810,
        "classicBaseTick": 89,
        "referenceDurationMs": 24000,
        "referenceTickMs": 3000,
        "referenceCooldownMs": 180000
      },
      "unknown": [
        "OctoWoW rank cost and damage",
        "live cooldown, coefficient, leech basis and threat"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://classic.warcraftdb.com/data/spell/19279",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:devouring-plague",
    "spellId": 19280,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": 985,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 113,
        "max": 113,
        "durationMs": 24000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=19280/devouring-plague",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "componentCoefficients",
      "leechModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 180000,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "priest",
      "abilityId": "priest:devouring-plague",
      "spellId": 19280,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "shadow",
        "classicManaCost": 985,
        "classicBaseTick": 113,
        "referenceDurationMs": 24000,
        "referenceTickMs": 3000,
        "referenceCooldownMs": 180000
      },
      "unknown": [
        "OctoWoW rank cost and damage",
        "live cooldown, coefficient, leech basis and threat"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=19280/devouring-plague",
      "liveVerified": false
    }
  }
],
 ...[{
  "classId": "hunter",
  "abilityId": "hunter:steady-shot",
  "spellId": 45974,
  "rank": 8,
  "learnLevel": 60,
  "resource": "mana",
  "mode": "cast",
  "cost": 5,
  "castMs": 1000,
  "minRange": 8,
  "maxRange": 35,
  "components": [
    {
      "kind": "ranged-weapon",
      "stat": "physical",
      "coefficient": null,
      "flat": 0
    }
  ],
  "source": "https://octowow.st/git/Meta/MetaHunt/commit/8479607a1396943e15862443be03c90c9be190f3?show-outdated=&style=split&whitespace=ignore-eol",
  "referenceSource": "https://octowow.st/index.php/hunter",
  "status": "external-reference-only",
  "liveVerified": false,
  "learnability": "imported-candidate-reference",
  "requiredPolicy": [
    "steadyShotModel",
    "rangedModel",
    "acceptSourceConflict"
  ],
  "referenceGcdMs": 1500,
  "referenceCooldownMs": 0,
  "record": {
    "classId": "hunter",
    "abilityId": "hunter:steady-shot",
    "spellId": 45974,
    "rank": 8,
    "level": 60,
    "fields": {
      "school": "physical",
      "referenceBaseManaPct": 5,
      "referenceCastMs": 1000,
      "referenceRange": [
        8,
        35
      ]
    },
    "unknown": [
      "live rank damage coefficient and flat bonus",
      "other live learned rank identities and levels",
      "live cast, cooldown, weapon and ammunition policies"
    ],
    "conflicts": [
      {
        "field": "rank",
        "guide": "six ranks from level 4",
        "imported": "rank 8, level 60",
        "archive": "five ranks from level 20",
        "addon": "45974, 1s cast"
      }
    ],
    "status": "external-reference-only",
    "source": "https://octowow.st/index.php/hunter",
    "liveVerified": false
  }
}],
 ...[{
  "classId": "hunter",
  "abilityId": "hunter:scatter-shot",
  "spellId": 19503,
  "rank": 1,
  "learnLevel": 30,
  "resource": "mana",
  "mode": "instant",
  "cost": 8,
  "castMs": 0,
  "minRange": 0,
  "maxRange": 15,
  "components": [
    {
      "kind": "ranged-weapon",
      "stat": "physical",
      "coefficient": 0.5,
      "flat": 0
    }
  ],
  "source": "https://octowow.st/talents/hunter/",
  "referenceSource": "https://www.wowhead.com/classic/spell=19503/scatter-shot",
  "status": "external-reference-only",
  "liveVerified": false,
  "learnability": "talent-reference",
  "requiredPolicy": [
    "scatterShotModel",
    "rangedModel"
  ],
  "referenceGcdMs": 1500,
  "referenceCooldownMs": 30000,
  "record": {
    "classId": "hunter",
    "abilityId": "hunter:scatter-shot",
    "spellId": 19503,
    "rank": 1,
    "level": 30,
    "fields": {
      "school": "physical",
      "weaponCoefficient": 0.5,
      "classicBaseManaPct": 8,
      "classicMaxRange": 15,
      "referenceDurationMs": 4000
    },
    "unknown": [
      "live mana cost and range",
      "live weapon damage basis, ammo policy and auto restart conditions",
      "target control eligibility"
    ],
    "conflicts": [],
    "status": "external-reference-only",
    "source": "https://octowow.st/talents/hunter/",
    "liveVerified": false
  }
}],
 // Placed fire trap candidate ranks, with explicit trigger/expiry policies.
 ...[
  {
    "classId": "hunter",
    "abilityId": "hunter:immolation-trap",
    "spellId": 13795,
    "rank": 1,
    "learnLevel": 16,
    "resource": "mana",
    "mode": "instant",
    "cost": 50,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:immolation-trap",
      "spellId": 13795,
      "rank": 1,
      "level": 16,
      "fields": {
        "school": "fire",
        "classicTotal": 105,
        "classicInitial": null,
        "referenceDurationMs": 15000,
        "referenceTickMs": 3000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": null,
        "referenceMana": 50
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:immolation-trap",
    "spellId": 14302,
    "rank": 2,
    "learnLevel": 26,
    "resource": "mana",
    "mode": "instant",
    "cost": 90,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:immolation-trap",
      "spellId": 14302,
      "rank": 2,
      "level": 26,
      "fields": {
        "school": "fire",
        "classicTotal": 215,
        "classicInitial": null,
        "referenceDurationMs": 15000,
        "referenceTickMs": 3000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": null,
        "referenceMana": 90
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:immolation-trap",
    "spellId": 14303,
    "rank": 3,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "instant",
    "cost": 135,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:immolation-trap",
      "spellId": 14303,
      "rank": 3,
      "level": 36,
      "fields": {
        "school": "fire",
        "classicTotal": 340,
        "classicInitial": null,
        "referenceDurationMs": 15000,
        "referenceTickMs": 3000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": null,
        "referenceMana": 135
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:immolation-trap",
    "spellId": 14304,
    "rank": 4,
    "learnLevel": 46,
    "resource": "mana",
    "mode": "instant",
    "cost": 190,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:immolation-trap",
      "spellId": 14304,
      "rank": 4,
      "level": 46,
      "fields": {
        "school": "fire",
        "classicTotal": 510,
        "classicInitial": null,
        "referenceDurationMs": 15000,
        "referenceTickMs": 3000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": null,
        "referenceMana": 190
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:immolation-trap",
    "spellId": 14305,
    "rank": 5,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "instant",
    "cost": 245,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:immolation-trap",
      "spellId": 14305,
      "rank": 5,
      "level": 56,
      "fields": {
        "school": "fire",
        "classicTotal": 690,
        "classicInitial": null,
        "referenceDurationMs": 15000,
        "referenceTickMs": 3000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": null,
        "referenceMana": 245
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/immolation-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:explosive-trap",
    "spellId": 13813,
    "rank": 1,
    "learnLevel": 34,
    "resource": "mana",
    "mode": "instant",
    "cost": 275,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:explosive-trap",
      "spellId": 13813,
      "rank": 1,
      "level": 34,
      "fields": {
        "school": "fire",
        "classicTotal": 150,
        "classicInitial": [
          104,
          134
        ],
        "referenceDurationMs": 20000,
        "referenceTickMs": 2000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": 10,
        "referenceMana": 275
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:explosive-trap",
    "spellId": 14316,
    "rank": 2,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "instant",
    "cost": 395,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:explosive-trap",
      "spellId": 14316,
      "rank": 2,
      "level": 44,
      "fields": {
        "school": "fire",
        "classicTotal": 240,
        "classicInitial": [
          145,
          193
        ],
        "referenceDurationMs": 20000,
        "referenceTickMs": 2000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": 10,
        "referenceMana": 395
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:explosive-trap",
    "spellId": 14317,
    "rank": 3,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "instant",
    "cost": 520,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "hunter-fire-trap"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "fireTrapModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:explosive-trap",
      "spellId": 14317,
      "rank": 3,
      "level": 54,
      "fields": {
        "school": "fire",
        "classicTotal": 330,
        "classicInitial": [
          208,
          264
        ],
        "referenceDurationMs": 20000,
        "referenceTickMs": 2000,
        "referenceLifetimeMs": 60000,
        "referenceRadius": 10,
        "referenceMana": 520
      },
      "unknown": [
        "current OctoWoW base damage and costs",
        "live activation delay, shared cooldown, hit/crit outcomes and area membership",
        "live AP coefficients and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/explosive-trap",
      "liveVerified": false
    }
  }
],
 // Current imported Hunter talent identities (not ambiguous effect ranks).
 ...[
  {
    "classId": "hunter",
    "abilityId": "hunter:lacerate",
    "spellId": 48049,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 8,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 5,
    "components": [
      {
        "kind": "physical-ap",
        "stat": "attackPower",
        "coefficient": 0.4,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/hunter/",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "talent-reference",
    "requiredPolicy": [
      "lacerateModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 10000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:lacerate",
      "spellId": 48049,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "physical",
        "referenceBaseManaPct": 8,
        "referenceAPCoefficient": 0.4,
        "referenceBleedFraction": 0.2,
        "referenceDurationMs": 8000,
        "referenceSideBonusPct": 15
      },
      "unknown": [
        "live cost, cooldown, reaction window, hit and timing policy",
        "live target selection and bleed/command resolution"
      ],
      "conflicts": [
        {
          "field": "AP/side coefficient",
          "earlier": "35%/10%",
          "current": "40%/15%"
        },
        {
          "field": "rank identity",
          "database": "multiple archived ranks and effect IDs",
          "currentTalent": 48049
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/hunter/",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:intimidation",
    "spellId": 19577,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-intimidation"
      }
    ],
    "source": "https://octowow.st/talents/hunter/",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2322",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "talent-reference",
    "requiredPolicy": [
      "costOverride",
      "intimidationModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": null,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:intimidation",
      "spellId": 19577,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "physical",
        "referenceStunMs": 3000,
        "referenceThreatDurationMs": 8000,
        "referenceThreatPct": 50
      },
      "unknown": [
        "live cost, cooldown, reaction window, hit and timing policy",
        "live target selection and bleed/command resolution"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/hunter/",
      "liveVerified": false
    }
  }
],
 // Hunter pet and target marking reference candidates.
 ...[
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 136,
    "rank": 1,
    "learnLevel": 12,
    "resource": "mana",
    "mode": "channel",
    "cost": 50,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 136,
      "rank": 1,
      "level": 12,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 20,
        "referenceTotalHeal": 100,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 3111,
    "rank": 2,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "channel",
    "cost": 90,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 3111,
      "rank": 2,
      "level": 20,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 38,
        "referenceTotalHeal": 190,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 3661,
    "rank": 3,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "channel",
    "cost": 155,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 3661,
      "rank": 3,
      "level": 28,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 68,
        "referenceTotalHeal": 340,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 3662,
    "rank": 4,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "channel",
    "cost": 225,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 3662,
      "rank": 4,
      "level": 36,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 103,
        "referenceTotalHeal": 515,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 13542,
    "rank": 5,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "channel",
    "cost": 300,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 13542,
      "rank": 5,
      "level": 44,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 142,
        "referenceTotalHeal": 710,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 13543,
    "rank": 6,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "channel",
    "cost": 385,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 13543,
      "rank": 6,
      "level": 52,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 189,
        "referenceTotalHeal": 945,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:mend-pet",
    "spellId": 13544,
    "rank": 7,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": 480,
    "castMs": 5000,
    "minRange": 0,
    "maxRange": 20,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "mendPetModel",
      "channelTickAtEnd"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "tickMs": 1000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:mend-pet",
      "spellId": 13544,
      "rank": 7,
      "level": 60,
      "fields": {
        "school": "nature",
        "referenceTickHeal": 245,
        "referenceTotalHeal": 1225,
        "referenceTickMs": 1000,
        "referenceDurationMs": 5000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/mend-pet",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:bestial-wrath",
    "spellId": 19574,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 12,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-bestial-wrath"
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2322",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "bestialWrathModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 0,
    "referenceCooldownMs": 90000,
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:bestial-wrath",
      "spellId": 19574,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "physical",
        "referenceBaseManaPct": 12,
        "referenceDurationMs": 18000,
        "referenceDamageBonusPct": 40
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [
        {
          "field": "damage bonus",
          "classic": 50,
          "earlierArchive": 30,
          "currentScent": 40
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2322",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:hunters-mark",
    "spellId": 1130,
    "rank": 1,
    "learnLevel": 6,
    "resource": "mana",
    "mode": "instant",
    "cost": 15,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-mark"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "hunterMarkModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:hunters-mark",
      "spellId": 1130,
      "rank": 1,
      "level": 6,
      "fields": {
        "school": "arcane",
        "referenceRangedAP": 20,
        "referenceDurationMs": 120000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:hunters-mark",
    "spellId": 14323,
    "rank": 2,
    "learnLevel": 22,
    "resource": "mana",
    "mode": "instant",
    "cost": 30,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-mark"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "hunterMarkModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:hunters-mark",
      "spellId": 14323,
      "rank": 2,
      "level": 22,
      "fields": {
        "school": "arcane",
        "referenceRangedAP": 45,
        "referenceDurationMs": 120000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:hunters-mark",
    "spellId": 14324,
    "rank": 3,
    "learnLevel": 40,
    "resource": "mana",
    "mode": "instant",
    "cost": 45,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-mark"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "hunterMarkModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:hunters-mark",
      "spellId": 14324,
      "rank": 3,
      "level": 40,
      "fields": {
        "school": "arcane",
        "referenceRangedAP": 75,
        "referenceDurationMs": 120000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:hunters-mark",
    "spellId": 14325,
    "rank": 4,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 60,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 100,
    "components": [
      {
        "kind": "hunter-mark"
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "hunterMarkModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:hunters-mark",
      "spellId": 14325,
      "rank": 4,
      "level": 58,
      "fields": {
        "school": "arcane",
        "referenceRangedAP": 110,
        "referenceDurationMs": 120000
      },
      "unknown": [
        "live rank quantities and application timing",
        "live pet or ranged attack interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/hunter/hunters-mark",
      "liveVerified": false
    }
  }
],
 // Druid armour and AP utility reference candidates.
 ...[
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire",
    "spellId": 770,
    "rank": 1,
    "learnLevel": 18,
    "resource": "mana",
    "mode": "instant",
    "cost": 55,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=770",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire",
      "spellId": 770,
      "rank": 1,
      "level": 18,
      "fields": {
        "school": "nature",
        "referenceAmount": 175,
        "referenceDurationMs": 40000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=770",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire",
    "spellId": 778,
    "rank": 2,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 75,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=778",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire",
      "spellId": 778,
      "rank": 2,
      "level": 30,
      "fields": {
        "school": "nature",
        "referenceAmount": 285,
        "referenceDurationMs": 40000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=778",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire",
    "spellId": 9749,
    "rank": 3,
    "learnLevel": 42,
    "resource": "mana",
    "mode": "instant",
    "cost": 95,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=9749",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire",
      "spellId": 9749,
      "rank": 3,
      "level": 42,
      "fields": {
        "school": "nature",
        "referenceAmount": 395,
        "referenceDurationMs": 40000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=9749",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire",
    "spellId": 9907,
    "rank": 4,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "instant",
    "cost": 115,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=9907",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire",
      "spellId": 9907,
      "rank": 4,
      "level": 54,
      "fields": {
        "school": "nature",
        "referenceAmount": 505,
        "referenceDurationMs": 40000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=9907",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire-feral",
    "spellId": 16857,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=16857",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 6000,
    "refreshStrategy": "target-debuff",
    "forms": [
      "Cat",
      "Bear"
    ],
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire-feral",
      "spellId": 16857,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "nature",
        "referenceAmount": 175,
        "referenceDurationMs": 40000,
        "referenceBaselineLevel": 30
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [
        {
          "field": "learn level",
          "classic": 25,
          "octowowGuide": 30
        }
      ],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=16857",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire-feral",
    "spellId": 17390,
    "rank": 2,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=17390",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 6000,
    "refreshStrategy": "target-debuff",
    "forms": [
      "Cat",
      "Bear"
    ],
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire-feral",
      "spellId": 17390,
      "rank": 2,
      "level": 30,
      "fields": {
        "school": "nature",
        "referenceAmount": 285,
        "referenceDurationMs": 40000,
        "referenceBaselineLevel": 30
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=17390",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire-feral",
    "spellId": 17391,
    "rank": 3,
    "learnLevel": 42,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=17391",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 6000,
    "refreshStrategy": "target-debuff",
    "forms": [
      "Cat",
      "Bear"
    ],
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire-feral",
      "spellId": 17391,
      "rank": 3,
      "level": 42,
      "fields": {
        "school": "nature",
        "referenceAmount": 395,
        "referenceDurationMs": 40000,
        "referenceBaselineLevel": 30
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=17391",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:faerie-fire-feral",
    "spellId": 17392,
    "rank": 4,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "instant",
    "cost": 0,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=17392",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 6000,
    "refreshStrategy": "target-debuff",
    "forms": [
      "Cat",
      "Bear"
    ],
    "record": {
      "classId": "druid",
      "abilityId": "druid:faerie-fire-feral",
      "spellId": 17392,
      "rank": 4,
      "level": 54,
      "fields": {
        "school": "nature",
        "referenceAmount": 505,
        "referenceDurationMs": 40000,
        "referenceBaselineLevel": 30
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=17392",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:demoralizing-roar",
    "spellId": 99,
    "rank": 1,
    "learnLevel": 10,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=99",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "feralModel",
      "targetPolicy"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "form": "Bear",
    "record": {
      "classId": "druid",
      "abilityId": "druid:demoralizing-roar",
      "spellId": 99,
      "rank": 1,
      "level": 10,
      "fields": {
        "school": "physical",
        "referenceAmount": 30,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=99",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:demoralizing-roar",
    "spellId": 1735,
    "rank": 2,
    "learnLevel": 20,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=1735",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "feralModel",
      "targetPolicy"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "form": "Bear",
    "record": {
      "classId": "druid",
      "abilityId": "druid:demoralizing-roar",
      "spellId": 1735,
      "rank": 2,
      "level": 20,
      "fields": {
        "school": "physical",
        "referenceAmount": 60,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=1735",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:demoralizing-roar",
    "spellId": 9490,
    "rank": 3,
    "learnLevel": 32,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=9490",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "feralModel",
      "targetPolicy"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "form": "Bear",
    "record": {
      "classId": "druid",
      "abilityId": "druid:demoralizing-roar",
      "spellId": 9490,
      "rank": 3,
      "level": 32,
      "fields": {
        "school": "physical",
        "referenceAmount": 75,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=9490",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:demoralizing-roar",
    "spellId": 9747,
    "rank": 4,
    "learnLevel": 42,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=9747",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "feralModel",
      "targetPolicy"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "form": "Bear",
    "record": {
      "classId": "druid",
      "abilityId": "druid:demoralizing-roar",
      "spellId": 9747,
      "rank": 4,
      "level": 42,
      "fields": {
        "school": "physical",
        "referenceAmount": 110,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=9747",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:demoralizing-roar",
    "spellId": 9898,
    "rank": 5,
    "learnLevel": 52,
    "resource": "rage",
    "mode": "instant",
    "cost": 10,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "druid-debuff"
      }
    ],
    "source": "https://www.wowhead.com/classic/spell=9898",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "druidDebuffModel",
      "feralModel",
      "targetPolicy"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "target-debuff",
    "form": "Bear",
    "record": {
      "classId": "druid",
      "abilityId": "druid:demoralizing-roar",
      "spellId": 9898,
      "rank": 5,
      "level": 52,
      "fields": {
        "school": "physical",
        "referenceAmount": 138,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank costs, aura amount, range, application outcomes and threat",
        "live stacking and NPC action power interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://www.wowhead.com/classic/spell=9898",
      "liveVerified": false
    }
  }
],
 // Elemental Shaman direct, refresh and ground-area candidate ranks.
 ...[
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36916,
    "rank": 1,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "cast",
    "cost": 65,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36916,
      "rank": 1,
      "level": 20,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          61,
          73
        ],
        "referenceCost": 65,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36917,
    "rank": 2,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "cast",
    "cost": 95,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36917,
      "rank": 2,
      "level": 28,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          96,
          119
        ],
        "referenceCost": 95,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36918,
    "rank": 3,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "cast",
    "cost": 120,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36918,
      "rank": 3,
      "level": 36,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          136,
          155
        ],
        "referenceCost": 120,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36919,
    "rank": 4,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "cast",
    "cost": 145,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36919,
      "rank": 4,
      "level": 44,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          185,
          204
        ],
        "referenceCost": 145,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36920,
    "rank": 5,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "cast",
    "cost": 175,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36920,
      "rank": 5,
      "level": 52,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          238,
          268
        ],
        "referenceCost": 175,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:molten-blast",
    "spellId": 36921,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 210,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "book-required-or-confirmed",
    "requiredPolicy": [
      "costOverride",
      "moltenBlastModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "referenceAvailableFromPhase": 3,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:molten-blast",
      "spellId": 36921,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "fire",
        "referenceDamage": [
          290,
          331
        ],
        "referenceCost": 210,
        "referenceCoefficient": 0.5714285714285714,
        "referenceCastMs": 2000
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "Flame Shock refresh",
          "archive": "refresh and Searing Totem focus",
          "currentGuide": "refresh talent bonus; player reports conflict on refresh behavior"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:earthquake",
    "spellId": 48306,
    "rank": 1,
    "learnLevel": 40,
    "resource": "mana",
    "mode": "cast",
    "cost": 225,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "earthquakeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 18000,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:earthquake",
      "spellId": 48306,
      "rank": 1,
      "level": 40,
      "fields": {
        "school": "nature",
        "referenceDamage": [
          262,
          291
        ],
        "referenceCost": 225,
        "referenceCoefficient": 0.6,
        "referenceSplash": 0.35,
        "referenceAftershock": 0.3,
        "referenceRadius": 10,
        "referenceDelayMs": 4000,
        "referenceSlowPct": 15
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "rank damage and cooldown",
          "earlier": "227–253/343–387/510–551; 20 seconds",
          "later": "262–291/395–446/587–634; 18 seconds"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:earthquake",
    "spellId": 48307,
    "rank": 2,
    "learnLevel": 50,
    "resource": "mana",
    "mode": "cast",
    "cost": 335,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "earthquakeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 18000,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:earthquake",
      "spellId": 48307,
      "rank": 2,
      "level": 50,
      "fields": {
        "school": "nature",
        "referenceDamage": [
          395,
          446
        ],
        "referenceCost": 335,
        "referenceCoefficient": 0.6,
        "referenceSplash": 0.35,
        "referenceAftershock": 0.3,
        "referenceRadius": 10,
        "referenceDelayMs": 4000,
        "referenceSlowPct": 15
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "rank damage and cooldown",
          "earlier": "227–253/343–387/510–551; 20 seconds",
          "later": "262–291/395–446/587–634; 18 seconds"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:earthquake",
    "spellId": 48308,
    "rank": 3,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 440,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 36,
    "components": [
      {
        "kind": "damage",
        "stat": "nature",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2327",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "earthquakeModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 18000,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:earthquake",
      "spellId": 48308,
      "rank": 3,
      "level": 60,
      "fields": {
        "school": "nature",
        "referenceDamage": [
          587,
          634
        ],
        "referenceCost": 440,
        "referenceCoefficient": 0.6,
        "referenceSplash": 0.35,
        "referenceAftershock": 0.3,
        "referenceRadius": 10,
        "referenceDelayMs": 4000,
        "referenceSlowPct": 15
      },
      "unknown": [
        "live rank DPS scaling, cost, outcome and timing",
        "live bonus/refresh and area targeting semantics"
      ],
      "conflicts": [
        {
          "field": "rank damage and cooldown",
          "earlier": "227–253/343–387/510–551; 20 seconds",
          "later": "262–291/395–446/587–634; 18 seconds"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2327",
      "liveVerified": false
    }
  }
],
 // Dark Harvest candidate ranks and explicit temporal policy.
 ...[
  {
    "classId": "warlock",
    "abilityId": "warlock:dark-harvest",
    "spellId": 52550,
    "rank": 1,
    "learnLevel": 40,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/index.php/warlock",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "darkHarvestModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:dark-harvest",
      "spellId": 52550,
      "rank": 1,
      "level": 40,
      "fields": {
        "school": "shadow",
        "historicalTotal": 700,
        "talentTooltipTotal": 704,
        "referenceDurationMs": 8000,
        "referenceIntervalReductionPct": 30,
        "historicalPerTickCoefficient": 0.25,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live damage, resource costs, channel tick timing and coefficient",
        "whether accelerated DoTs retain expiry or preserve tick count; application timing and Agony stage progression"
      ],
      "conflicts": [
        {
          "field": "periodic haste",
          "talentTooltip": "30% interval reduction",
          "archive": "30% haste (different possible interval factor)"
        },
        {
          "field": "rank 1 damage",
          "archive": 700,
          "talentTooltip": 704
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/warlock",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:dark-harvest",
    "spellId": 52551,
    "rank": 2,
    "learnLevel": 50,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/index.php/warlock",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "darkHarvestModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:dark-harvest",
      "spellId": 52551,
      "rank": 2,
      "level": 50,
      "fields": {
        "school": "shadow",
        "historicalTotal": 900,
        "referenceDurationMs": 8000,
        "referenceIntervalReductionPct": 30,
        "historicalPerTickCoefficient": 0.25,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live damage, resource costs, channel tick timing and coefficient",
        "whether accelerated DoTs retain expiry or preserve tick count; application timing and Agony stage progression"
      ],
      "conflicts": [
        {
          "field": "periodic haste",
          "talentTooltip": "30% interval reduction",
          "archive": "30% haste (different possible interval factor)"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/warlock",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:dark-harvest",
    "spellId": 52552,
    "rank": 3,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/index.php/warlock",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "darkHarvestModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:dark-harvest",
      "spellId": 52552,
      "rank": 3,
      "level": 60,
      "fields": {
        "school": "shadow",
        "historicalTotal": 1150,
        "referenceDurationMs": 8000,
        "referenceIntervalReductionPct": 30,
        "historicalPerTickCoefficient": 0.25,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live damage, resource costs, channel tick timing and coefficient",
        "whether accelerated DoTs retain expiry or preserve tick count; application timing and Agony stage progression"
      ],
      "conflicts": [
        {
          "field": "periodic haste",
          "talentTooltip": "30% interval reduction",
          "archive": "30% haste (different possible interval factor)"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/index.php/warlock",
      "liveVerified": false
    }
  }
],
 // Drain Soul published candidate identities and historical numerical evidence.
 ...[
  {
    "classId": "warlock",
    "abilityId": "warlock:drain-soul",
    "spellId": 1120,
    "rank": 1,
    "learnLevel": 10,
    "resource": "mana",
    "mode": "channel",
    "cost": 15,
    "castMs": 6000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2328",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "drainSoulModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:drain-soul",
      "spellId": 1120,
      "rank": 1,
      "level": 10,
      "fields": {
        "school": "shadow",
        "historicalTotal": 110,
        "historicalInitialCost": 15,
        "historicalTickCost": 10,
        "historicalPerTickCoefficient": 0.2,
        "referenceDurationMs": 6000,
        "referenceTickMs": 1000
      },
      "unknown": [
        "live damage, effective channel interval, mana charges, coefficient and shard eligibility",
        "live application resistance and haste interactions"
      ],
      "conflicts": [
        {
          "field": "mana schedule",
          "archiveEarlier": "flat mana cost",
          "archiveLater": "initial plus per-second cost"
        },
        {
          "field": "damage progression",
          "archiveEarlier": "increasing tick damage",
          "archiveLater": "uniform tick damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2328",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:drain-soul",
    "spellId": 8288,
    "rank": 2,
    "learnLevel": 24,
    "resource": "mana",
    "mode": "channel",
    "cost": 35,
    "castMs": 6000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2328",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "drainSoulModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:drain-soul",
      "spellId": 8288,
      "rank": 2,
      "level": 24,
      "fields": {
        "school": "shadow",
        "historicalTotal": 280,
        "historicalInitialCost": 35,
        "historicalTickCost": 25,
        "historicalPerTickCoefficient": 0.2,
        "referenceDurationMs": 6000,
        "referenceTickMs": 1000
      },
      "unknown": [
        "live damage, effective channel interval, mana charges, coefficient and shard eligibility",
        "live application resistance and haste interactions"
      ],
      "conflicts": [
        {
          "field": "mana schedule",
          "archiveEarlier": "flat mana cost",
          "archiveLater": "initial plus per-second cost"
        },
        {
          "field": "damage progression",
          "archiveEarlier": "increasing tick damage",
          "archiveLater": "uniform tick damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2328",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:drain-soul",
    "spellId": 8289,
    "rank": 3,
    "learnLevel": 38,
    "resource": "mana",
    "mode": "channel",
    "cost": 70,
    "castMs": 6000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2328",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "drainSoulModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:drain-soul",
      "spellId": 8289,
      "rank": 3,
      "level": 38,
      "fields": {
        "school": "shadow",
        "historicalTotal": 460,
        "historicalInitialCost": 70,
        "historicalTickCost": 40,
        "historicalPerTickCoefficient": 0.2,
        "referenceDurationMs": 6000,
        "referenceTickMs": 1000
      },
      "unknown": [
        "live damage, effective channel interval, mana charges, coefficient and shard eligibility",
        "live application resistance and haste interactions"
      ],
      "conflicts": [
        {
          "field": "mana schedule",
          "archiveEarlier": "flat mana cost",
          "archiveLater": "initial plus per-second cost"
        },
        {
          "field": "damage progression",
          "archiveEarlier": "increasing tick damage",
          "archiveLater": "uniform tick damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2328",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:drain-soul",
    "spellId": 11675,
    "rank": 4,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "channel",
    "cost": 100,
    "castMs": 6000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2328",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "drainSoulModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:drain-soul",
      "spellId": 11675,
      "rank": 4,
      "level": 52,
      "fields": {
        "school": "shadow",
        "historicalTotal": 760,
        "historicalInitialCost": 100,
        "historicalTickCost": 55,
        "historicalPerTickCoefficient": 0.2,
        "referenceDurationMs": 6000,
        "referenceTickMs": 1000
      },
      "unknown": [
        "live damage, effective channel interval, mana charges, coefficient and shard eligibility",
        "live application resistance and haste interactions"
      ],
      "conflicts": [
        {
          "field": "mana schedule",
          "archiveEarlier": "flat mana cost",
          "archiveLater": "initial plus per-second cost"
        },
        {
          "field": "damage progression",
          "archiveEarlier": "increasing tick damage",
          "archiveLater": "uniform tick damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2328",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:drain-soul",
    "spellId": 51687,
    "rank": 5,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "channel",
    "cost": 135,
    "castMs": 6000,
    "tickMs": 1000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://octowow.st/forum/viewtopic.php?t=2328",
    "referenceSource": "https://octowow.st/forum/viewtopic.php?t=2328",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "drainSoulModel",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:drain-soul",
      "spellId": 51687,
      "rank": 5,
      "level": 60,
      "fields": {
        "school": "shadow",
        "historicalTotal": 950,
        "historicalInitialCost": 135,
        "historicalTickCost": 65,
        "historicalPerTickCoefficient": 0.2,
        "referenceDurationMs": 6000,
        "referenceTickMs": 1000
      },
      "unknown": [
        "live damage, effective channel interval, mana charges, coefficient and shard eligibility",
        "live application resistance and haste interactions"
      ],
      "conflicts": [
        {
          "field": "mana schedule",
          "archiveEarlier": "flat mana cost",
          "archiveLater": "initial plus per-second cost"
        },
        {
          "field": "damage progression",
          "archiveEarlier": "increasing tick damage",
          "archiveLater": "uniform tick damage"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/forum/viewtopic.php?t=2328",
      "liveVerified": false
    }
  }
],
 // Area damage and party healing candidate ranks.
 ...[
  {
    "classId": "warlock",
    "abilityId": "warlock:rain-of-fire",
    "spellId": 5740,
    "rank": 1,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "tickMs": 1000,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:rain-of-fire",
      "spellId": 5740,
      "rank": 1,
      "level": 20,
      "fields": {
        "school": "fire",
        "classicTotal": 172,
        "classicCost": 295,
        "archivedTickMs": 1000,
        "classicTickMs": 2000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "channel interval",
          "classic": 2000,
          "archive": 1000
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:rain-of-fire",
    "spellId": 6219,
    "rank": 2,
    "learnLevel": 34,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "tickMs": 1000,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:rain-of-fire",
      "spellId": 6219,
      "rank": 2,
      "level": 34,
      "fields": {
        "school": "fire",
        "classicTotal": 384,
        "classicCost": 605,
        "archivedTickMs": 1000,
        "classicTickMs": 2000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "channel interval",
          "classic": 2000,
          "archive": 1000
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:rain-of-fire",
    "spellId": 11677,
    "rank": 3,
    "learnLevel": 46,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "tickMs": 1000,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:rain-of-fire",
      "spellId": 11677,
      "rank": 3,
      "level": 46,
      "fields": {
        "school": "fire",
        "classicTotal": 620,
        "classicCost": 885,
        "archivedTickMs": 1000,
        "classicTickMs": 2000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "channel interval",
          "classic": 2000,
          "archive": 1000
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:rain-of-fire",
    "spellId": 11678,
    "rank": 4,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "channel",
    "cost": null,
    "castMs": 8000,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "channelPeriodic": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "channelApplicationPolicy",
      "channelTickAtEnd",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "tickMs": 1000,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:rain-of-fire",
      "spellId": 11678,
      "rank": 4,
      "level": 58,
      "fields": {
        "school": "fire",
        "classicTotal": 908,
        "classicCost": 1185,
        "archivedTickMs": 1000,
        "classicTickMs": 2000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "channel interval",
          "classic": 2000,
          "archive": 1000
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/rain-of-fire",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:prayer-of-healing",
    "spellId": 596,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "cast",
    "cost": null,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:prayer-of-healing",
      "spellId": 596,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "holy",
        "classicCost": 410,
        "referencePartyCap": 5,
        "referencePartyRadius": 30
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "healing and targeting",
          "classic": "caster party within 30 yards",
          "archive": "target ally party within 30 yards; healing rank changes"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:prayer-of-healing",
    "spellId": 996,
    "rank": 2,
    "learnLevel": 40,
    "resource": "mana",
    "mode": "cast",
    "cost": null,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:prayer-of-healing",
      "spellId": 996,
      "rank": 2,
      "level": 40,
      "fields": {
        "school": "holy",
        "classicCost": 560,
        "referencePartyCap": 5,
        "referencePartyRadius": 30
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "healing and targeting",
          "classic": "caster party within 30 yards",
          "archive": "target ally party within 30 yards; healing rank changes"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:prayer-of-healing",
    "spellId": 10960,
    "rank": 3,
    "learnLevel": 50,
    "resource": "mana",
    "mode": "cast",
    "cost": null,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:prayer-of-healing",
      "spellId": 10960,
      "rank": 3,
      "level": 50,
      "fields": {
        "school": "holy",
        "classicCost": 770,
        "referencePartyCap": 5,
        "referencePartyRadius": 30
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "healing and targeting",
          "classic": "caster party within 30 yards",
          "archive": "target ally party within 30 yards; healing rank changes"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:prayer-of-healing",
    "spellId": 10961,
    "rank": 4,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": null,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:prayer-of-healing",
      "spellId": 10961,
      "rank": 4,
      "level": 60,
      "fields": {
        "school": "holy",
        "classicCost": 1030,
        "referencePartyCap": 5,
        "referencePartyRadius": 30
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "healing and targeting",
          "classic": "caster party within 30 yards",
          "archive": "target ally party within 30 yards; healing rank changes"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:prayer-of-healing",
    "spellId": 25316,
    "rank": 5,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": null,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
    "referenceSource": "https://octowow.st/index.php/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "book-required-or-confirmed",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "referenceAvailableFromPhase": 3,
    "record": {
      "classId": "priest",
      "abilityId": "priest:prayer-of-healing",
      "spellId": 25316,
      "rank": 5,
      "level": 60,
      "fields": {
        "school": "holy",
        "classicCost": 1070,
        "referencePartyCap": 5,
        "referencePartyRadius": 30
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "healing and targeting",
          "classic": "caster party within 30 yards",
          "archive": "target ally party within 30 yards; healing rank changes"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/prayer-of-healing",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:blast-wave",
    "spellId": 11113,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/mage/",
    "referenceSource": "https://octowow.st/index.php/mage",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "mage",
      "abilityId": "mage:blast-wave",
      "spellId": 11113,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "fire",
        "referenceRadius": 10,
        "referenceSlowMs": 6000,
        "referenceCooldownMs": 30000,
        "referenceDamage": [
          160,
          192
        ]
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "classic": 45000,
          "archive": 30000
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/mage/",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:blast-wave",
    "spellId": 13018,
    "rank": 2,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/mage/",
    "referenceSource": "https://octowow.st/index.php/mage",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "mage",
      "abilityId": "mage:blast-wave",
      "spellId": 13018,
      "rank": 2,
      "level": 36,
      "fields": {
        "school": "fire",
        "referenceRadius": 10,
        "referenceSlowMs": 6000,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "classic": 45000,
          "archive": 30000
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/mage/",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:blast-wave",
    "spellId": 13019,
    "rank": 3,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/mage/",
    "referenceSource": "https://octowow.st/index.php/mage",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "mage",
      "abilityId": "mage:blast-wave",
      "spellId": 13019,
      "rank": 3,
      "level": 44,
      "fields": {
        "school": "fire",
        "referenceRadius": 10,
        "referenceSlowMs": 6000,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "classic": 45000,
          "archive": 30000
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/mage/",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:blast-wave",
    "spellId": 13020,
    "rank": 4,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/mage/",
    "referenceSource": "https://octowow.st/index.php/mage",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "mage",
      "abilityId": "mage:blast-wave",
      "spellId": 13020,
      "rank": 4,
      "level": 52,
      "fields": {
        "school": "fire",
        "referenceRadius": 10,
        "referenceSlowMs": 6000,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "classic": 45000,
          "archive": 30000
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/mage/",
      "liveVerified": false
    }
  },
  {
    "classId": "mage",
    "abilityId": "mage:blast-wave",
    "spellId": 13021,
    "rank": 5,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "damage",
        "stat": "fire",
        "coefficient": null,
        "min": 0,
        "max": 0
      }
    ],
    "source": "https://octowow.st/talents/mage/",
    "referenceSource": "https://octowow.st/index.php/mage",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "areaModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 30000,
    "record": {
      "classId": "mage",
      "abilityId": "mage:blast-wave",
      "spellId": 13021,
      "rank": 5,
      "level": 60,
      "fields": {
        "school": "fire",
        "referenceRadius": 10,
        "referenceSlowMs": 6000,
        "referenceCooldownMs": 30000
      },
      "unknown": [
        "live rank damage/healing, costs and scaling",
        "live target selection, coefficient, control and channel timing"
      ],
      "conflicts": [
        {
          "field": "cooldown",
          "classic": 45000,
          "archive": 30000
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/mage/",
      "liveVerified": false
    }
  }
],
 // Bear, melee Hunter and Affliction reference candidates.
 ...[
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 6807,
    "rank": 1,
    "learnLevel": 10,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 6807,
      "rank": 1,
      "level": 10,
      "fields": {
        "school": "physical",
        "classicFlat": 18
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 6808,
    "rank": 2,
    "learnLevel": 18,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 6808,
      "rank": 2,
      "level": 18,
      "fields": {
        "school": "physical",
        "classicFlat": 27
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 6809,
    "rank": 3,
    "learnLevel": 26,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 6809,
      "rank": 3,
      "level": 26,
      "fields": {
        "school": "physical",
        "classicFlat": 37
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 8972,
    "rank": 4,
    "learnLevel": 34,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 8972,
      "rank": 4,
      "level": 34,
      "fields": {
        "school": "physical",
        "classicFlat": 49
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 9745,
    "rank": 5,
    "learnLevel": 42,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 9745,
      "rank": 5,
      "level": 42,
      "fields": {
        "school": "physical",
        "classicFlat": 71
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 9880,
    "rank": 6,
    "learnLevel": 50,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 9880,
      "rank": 6,
      "level": 50,
      "fields": {
        "school": "physical",
        "classicFlat": 101
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:maul",
    "spellId": 9881,
    "rank": 7,
    "learnLevel": 58,
    "resource": "rage",
    "mode": "queued-melee",
    "cost": 15,
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
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
    "referenceSource": "https://octowow.st/index.php/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "feralModel",
      "weaponDamageModel",
      "costOverride",
      "flatThreat"
    ],
    "referenceGcdMs": 0,
    "form": "Bear",
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:maul",
      "spellId": 9881,
      "rank": 7,
      "level": 58,
      "fields": {
        "school": "physical",
        "classicFlat": 128
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/maul",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:siphon-life",
    "spellId": 18265,
    "rank": 1,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "instant",
    "cost": 150,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "durationMs": 30000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "siphonLifeModel",
      "leechModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:siphon-life",
      "spellId": 18265,
      "rank": 1,
      "level": 30,
      "fields": {
        "school": "shadow",
        "classicTotal": 150,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "damage timing and scaling",
          "staging": "fixed tick amount over 30 seconds; rank 4 45 every 3 seconds",
          "guide": "total health transfer over full duration",
          "archive": "total spell power scaling changed from 50% to 100%"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:siphon-life",
    "spellId": 18879,
    "rank": 2,
    "learnLevel": 38,
    "resource": "mana",
    "mode": "instant",
    "cost": 205,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "durationMs": 30000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "siphonLifeModel",
      "leechModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:siphon-life",
      "spellId": 18879,
      "rank": 2,
      "level": 38,
      "fields": {
        "school": "shadow",
        "classicTotal": 220,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "damage timing and scaling",
          "staging": "fixed tick amount over 30 seconds; rank 4 45 every 3 seconds",
          "guide": "total health transfer over full duration",
          "archive": "total spell power scaling changed from 50% to 100%"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:siphon-life",
    "spellId": 18880,
    "rank": 3,
    "learnLevel": 48,
    "resource": "mana",
    "mode": "instant",
    "cost": 285,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "durationMs": 30000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "siphonLifeModel",
      "leechModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:siphon-life",
      "spellId": 18880,
      "rank": 3,
      "level": 48,
      "fields": {
        "school": "shadow",
        "classicTotal": 330,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "damage timing and scaling",
          "staging": "fixed tick amount over 30 seconds; rank 4 45 every 3 seconds",
          "guide": "total health transfer over full duration",
          "archive": "total spell power scaling changed from 50% to 100%"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
      "liveVerified": false
    }
  },
  {
    "classId": "warlock",
    "abilityId": "warlock:siphon-life",
    "spellId": 18881,
    "rank": 4,
    "learnLevel": 58,
    "resource": "mana",
    "mode": "instant",
    "cost": 365,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 30,
    "components": [
      {
        "kind": "periodic-damage",
        "stat": "shadow",
        "coefficient": null,
        "min": 0,
        "max": 0,
        "durationMs": 30000,
        "intervalMs": 3000,
        "leech": true
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
    "referenceSource": "https://octowow.st/index.php/warlock",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "siphonLifeModel",
      "leechModel",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "warlock",
      "abilityId": "warlock:siphon-life",
      "spellId": 18881,
      "rank": 4,
      "level": 58,
      "fields": {
        "school": "shadow",
        "classicTotal": 450,
        "referenceDurationMs": 30000
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "damage timing and scaling",
          "staging": "fixed tick amount over 30 seconds; rank 4 45 every 3 seconds",
          "guide": "total health transfer over full duration",
          "archive": "total spell power scaling changed from 50% to 100%"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/warlock/siphon-life",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:carve",
    "spellId": 51575,
    "rank": 1,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://octowow.st/talents/hunter/",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "weaponDamageModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 10000,
    "multiTarget": {
      "cap": 5,
      "radius": 10,
      "falloff": 1
    },
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:carve",
      "spellId": 51575,
      "rank": 1,
      "level": 20,
      "fields": {
        "school": "physical",
        "archivedWeaponCoefficient": 0.6,
        "archivedManaPct": 8,
        "cap": 5,
        "radius": 10
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "rank weapon coefficient",
          "archive": "60/65/70% weapon damage after December 2024 revision",
          "currentTalent": "rank 1 60%, upper ranks unverified"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/hunter/",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:carve",
    "spellId": 52415,
    "rank": 2,
    "learnLevel": 38,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://octowow.st/talents/hunter/",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "weaponDamageModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 10000,
    "multiTarget": {
      "cap": 5,
      "radius": 10,
      "falloff": 1
    },
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:carve",
      "spellId": 52415,
      "rank": 2,
      "level": 38,
      "fields": {
        "school": "physical",
        "archivedWeaponCoefficient": 0.65,
        "archivedManaPct": 8,
        "cap": 5,
        "radius": 10
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "rank weapon coefficient",
          "archive": "60/65/70% weapon damage after December 2024 revision",
          "currentTalent": "rank 1 60%, upper ranks unverified"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/hunter/",
      "liveVerified": false
    }
  },
  {
    "classId": "hunter",
    "abilityId": "hunter:carve",
    "spellId": 52416,
    "rank": 3,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "instant",
    "cost": null,
    "castMs": 0,
    "minRange": 0,
    "maxRange": 10,
    "components": [
      {
        "kind": "weapon",
        "stat": "mainhand",
        "coefficient": null,
        "flat": 0
      }
    ],
    "source": "https://octowow.st/talents/hunter/",
    "referenceSource": "https://octowow.st/index.php/hunter",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "weaponDamageModel",
      "targetPolicy",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 10000,
    "multiTarget": {
      "cap": 5,
      "radius": 10,
      "falloff": 1
    },
    "record": {
      "classId": "hunter",
      "abilityId": "hunter:carve",
      "spellId": 52416,
      "rank": 3,
      "level": 56,
      "fields": {
        "school": "physical",
        "archivedWeaponCoefficient": 0.7,
        "archivedManaPct": 8,
        "cap": 5,
        "radius": 10
      },
      "unknown": [
        "live rank coefficients, cost, cooldown and outcome policies",
        "live timing and talent interactions"
      ],
      "conflicts": [
        {
          "field": "rank weapon coefficient",
          "archive": "60/65/70% weapon damage after December 2024 revision",
          "currentTalent": "rank 1 60%, upper ranks unverified"
        }
      ],
      "status": "external-reference-only",
      "source": "https://octowow.st/talents/hunter/",
      "liveVerified": false
    }
  }
],
 {"classId":"hunter","abilityId":"hunter:rapid-fire","spellId":3045,"rank":1,"learnLevel":26,"resource":"mana","mode":"instant","cost":100,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"hunter-rapid-fire","stat":"arcane","coefficient":null}],"source":"https://octowow.st/db/?spell=3045","referenceSource":"https://octowow.st/hunter","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["rapidFireModel"],"referenceGcdMs":1500,"referenceCooldownMs":300000,"refreshStrategy":"actor-buff","record":{"classId":"hunter","abilityId":"hunter:rapid-fire","spellId":3045,"rank":1,"level":26,"fields":{"school":"arcane","durationMs":15000,"rangedHastePct":40,"referenceCost":100},"unknown":["live cooldown and GCD","Aimed Shot and Steady Shot cast reduction magnitude","live swing rescheduling policy"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=3045","liveVerified":false}},
 // Classic healing rank candidates; coefficients and mana cost must be explicitly acknowledged.
 ...[
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 5185,
    "rank": 1,
    "learnLevel": 1,
    "resource": "mana",
    "mode": "cast",
    "cost": 25,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 40,
        "max": 54
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 5185,
      "rank": 1,
      "level": 1,
      "fields": {
        "school": "nature",
        "classicCost": 25,
        "classicHealingRange": [
          40,
          54
        ],
        "referenceCost": 25
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 5186,
    "rank": 2,
    "learnLevel": 8,
    "resource": "mana",
    "mode": "cast",
    "cost": 55,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 94,
        "max": 118
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 5186,
      "rank": 2,
      "level": 8,
      "fields": {
        "school": "nature",
        "classicCost": 55,
        "classicHealingRange": [
          94,
          118
        ],
        "referenceCost": 55
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 5187,
    "rank": 3,
    "learnLevel": 14,
    "resource": "mana",
    "mode": "cast",
    "cost": 110,
    "castMs": 2500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 204,
        "max": 252
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 5187,
      "rank": 3,
      "level": 14,
      "fields": {
        "school": "nature",
        "classicCost": 110,
        "classicHealingRange": [
          204,
          252
        ],
        "referenceCost": 110
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 5188,
    "rank": 4,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "cast",
    "cost": 185,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 376,
        "max": 458
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 5188,
      "rank": 4,
      "level": 20,
      "fields": {
        "school": "nature",
        "classicCost": 185,
        "classicHealingRange": [
          376,
          458
        ],
        "referenceCost": 185
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 5189,
    "rank": 5,
    "learnLevel": 26,
    "resource": "mana",
    "mode": "cast",
    "cost": 270,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 589,
        "max": 711
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 5189,
      "rank": 5,
      "level": 26,
      "fields": {
        "school": "nature",
        "classicCost": 270,
        "classicHealingRange": [
          589,
          711
        ],
        "referenceCost": 270
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 6778,
    "rank": 6,
    "learnLevel": 32,
    "resource": "mana",
    "mode": "cast",
    "cost": 335,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 762,
        "max": 914
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 6778,
      "rank": 6,
      "level": 32,
      "fields": {
        "school": "nature",
        "classicCost": 335,
        "classicHealingRange": [
          762,
          914
        ],
        "referenceCost": 335
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 8903,
    "rank": 7,
    "learnLevel": 38,
    "resource": "mana",
    "mode": "cast",
    "cost": 405,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 958,
        "max": 1142
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 8903,
      "rank": 7,
      "level": 38,
      "fields": {
        "school": "nature",
        "classicCost": 405,
        "classicHealingRange": [
          958,
          1142
        ],
        "referenceCost": 405
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 9758,
    "rank": 8,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "cast",
    "cost": 495,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 1224,
        "max": 1452
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 9758,
      "rank": 8,
      "level": 44,
      "fields": {
        "school": "nature",
        "classicCost": 495,
        "classicHealingRange": [
          1224,
          1452
        ],
        "referenceCost": 495
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 9888,
    "rank": 9,
    "learnLevel": 50,
    "resource": "mana",
    "mode": "cast",
    "cost": 600,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 1545,
        "max": 1825
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 9888,
      "rank": 9,
      "level": 50,
      "fields": {
        "school": "nature",
        "classicCost": 600,
        "classicHealingRange": [
          1545,
          1825
        ],
        "referenceCost": 600
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 9889,
    "rank": 10,
    "learnLevel": 56,
    "resource": "mana",
    "mode": "cast",
    "cost": 720,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 1916,
        "max": 2256
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 9889,
      "rank": 10,
      "level": 56,
      "fields": {
        "school": "nature",
        "classicCost": 720,
        "classicHealingRange": [
          1916,
          2256
        ],
        "referenceCost": 720
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:healing-touch",
    "spellId": 25297,
    "rank": 11,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 800,
    "castMs": 3500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 2267,
        "max": 2677
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "book-required-or-confirmed",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "referenceAvailableFromPhase": 3,
    "record": {
      "classId": "druid",
      "abilityId": "druid:healing-touch",
      "spellId": 25297,
      "rank": 11,
      "level": 60,
      "fields": {
        "school": "nature",
        "classicCost": 800,
        "classicHealingRange": [
          2267,
          2677
        ],
        "referenceCost": 800
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/healing-touch",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 8936,
    "rank": 1,
    "learnLevel": 12,
    "resource": "mana",
    "mode": "cast",
    "cost": 96,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 92,
        "max": 106
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 14,
        "max": 14,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 8936,
      "rank": 1,
      "level": 12,
      "fields": {
        "school": "nature",
        "classicCost": 120,
        "classicHealingRange": [
          92,
          106
        ],
        "referenceCost": 96,
        "classicPeriodicTotal": 98
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 120,
          "octoGuide": 96
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 8938,
    "rank": 2,
    "learnLevel": 18,
    "resource": "mana",
    "mode": "cast",
    "cost": 164,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 176,
        "max": 200
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 25,
        "max": 25,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 8938,
      "rank": 2,
      "level": 18,
      "fields": {
        "school": "nature",
        "classicCost": 205,
        "classicHealingRange": [
          176,
          200
        ],
        "referenceCost": 164,
        "classicPeriodicTotal": 175
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 205,
          "octoGuide": 164
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 8939,
    "rank": 3,
    "learnLevel": 24,
    "resource": "mana",
    "mode": "cast",
    "cost": 224,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 255,
        "max": 289
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 37,
        "max": 37,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 8939,
      "rank": 3,
      "level": 24,
      "fields": {
        "school": "nature",
        "classicCost": 280,
        "classicHealingRange": [
          255,
          289
        ],
        "referenceCost": 224,
        "classicPeriodicTotal": 259
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 280,
          "octoGuide": 224
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 8940,
    "rank": 4,
    "learnLevel": 30,
    "resource": "mana",
    "mode": "cast",
    "cost": 280,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 335,
        "max": 377
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 49,
        "max": 49,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 8940,
      "rank": 4,
      "level": 30,
      "fields": {
        "school": "nature",
        "classicCost": 350,
        "classicHealingRange": [
          335,
          377
        ],
        "referenceCost": 280,
        "classicPeriodicTotal": 343
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 350,
          "octoGuide": 280
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 8941,
    "rank": 5,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "cast",
    "cost": 336,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 425,
        "max": 477
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 61,
        "max": 61,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 8941,
      "rank": 5,
      "level": 36,
      "fields": {
        "school": "nature",
        "classicCost": 420,
        "classicHealingRange": [
          425,
          477
        ],
        "referenceCost": 336,
        "classicPeriodicTotal": 427
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 420,
          "octoGuide": 336
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 9750,
    "rank": 6,
    "learnLevel": 42,
    "resource": "mana",
    "mode": "cast",
    "cost": 408,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 534,
        "max": 598
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 78,
        "max": 78,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 9750,
      "rank": 6,
      "level": 42,
      "fields": {
        "school": "nature",
        "classicCost": 510,
        "classicHealingRange": [
          534,
          598
        ],
        "referenceCost": 408,
        "classicPeriodicTotal": 546
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 510,
          "octoGuide": 408
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 9856,
    "rank": 7,
    "learnLevel": 48,
    "resource": "mana",
    "mode": "cast",
    "cost": 492,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 672,
        "max": 750
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 98,
        "max": 98,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 9856,
      "rank": 7,
      "level": 48,
      "fields": {
        "school": "nature",
        "classicCost": 615,
        "classicHealingRange": [
          672,
          750
        ],
        "referenceCost": 492,
        "classicPeriodicTotal": 686
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 615,
          "octoGuide": 492
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 9857,
    "rank": 8,
    "learnLevel": 54,
    "resource": "mana",
    "mode": "cast",
    "cost": 592,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 839,
        "max": 935
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 123,
        "max": 123,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 9857,
      "rank": 8,
      "level": 54,
      "fields": {
        "school": "nature",
        "classicCost": 740,
        "classicHealingRange": [
          839,
          935
        ],
        "referenceCost": 592,
        "classicPeriodicTotal": 861
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 740,
          "octoGuide": 592
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "druid",
    "abilityId": "druid:regrowth",
    "spellId": 9858,
    "rank": 9,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 704,
    "castMs": 2000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 1003,
        "max": 1119
      },
      {
        "kind": "periodic-heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 152,
        "max": 152,
        "durationMs": 21000,
        "intervalMs": 3000
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
    "referenceSource": "https://octowow.st/druid",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "refreshStrategy": "do-not-gate",
    "record": {
      "classId": "druid",
      "abilityId": "druid:regrowth",
      "spellId": 9858,
      "rank": 9,
      "level": 60,
      "fields": {
        "school": "nature",
        "classicCost": 880,
        "classicHealingRange": [
          1003,
          1119
        ],
        "referenceCost": 704,
        "classicPeriodicTotal": 1064
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "mana cost",
          "classic": 880,
          "octoGuide": 704
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/druid/regrowth",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:heal",
    "spellId": 2054,
    "rank": 1,
    "learnLevel": 16,
    "resource": "mana",
    "mode": "cast",
    "cost": 155,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 307,
        "max": 353
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
    "referenceSource": "https://octowow.st/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:heal",
      "spellId": 2054,
      "rank": 1,
      "level": 16,
      "fields": {
        "school": "holy",
        "classicCost": 155,
        "classicHealingRange": [
          307,
          353
        ],
        "referenceCost": 155
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:heal",
    "spellId": 2055,
    "rank": 2,
    "learnLevel": 22,
    "resource": "mana",
    "mode": "cast",
    "cost": 205,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 445,
        "max": 507
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
    "referenceSource": "https://octowow.st/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:heal",
      "spellId": 2055,
      "rank": 2,
      "level": 22,
      "fields": {
        "school": "holy",
        "classicCost": 205,
        "classicHealingRange": [
          445,
          507
        ],
        "referenceCost": 205
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:heal",
    "spellId": 6063,
    "rank": 3,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "cast",
    "cost": 255,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 586,
        "max": 662
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
    "referenceSource": "https://octowow.st/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:heal",
      "spellId": 6063,
      "rank": 3,
      "level": 28,
      "fields": {
        "school": "holy",
        "classicCost": 255,
        "classicHealingRange": [
          586,
          662
        ],
        "referenceCost": 255
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
      "liveVerified": false
    }
  },
  {
    "classId": "priest",
    "abilityId": "priest:heal",
    "spellId": 6064,
    "rank": 4,
    "learnLevel": 34,
    "resource": "mana",
    "mode": "cast",
    "cost": 305,
    "castMs": 3000,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 734,
        "max": 826
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
    "referenceSource": "https://octowow.st/priest",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients",
      "acceptSourceConflict"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "priest",
      "abilityId": "priest:heal",
      "spellId": 6064,
      "rank": 4,
      "level": 34,
      "fields": {
        "school": "holy",
        "classicCost": 305,
        "classicHealingRange": [
          734,
          826
        ],
        "referenceCost": 305
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [
        {
          "field": "base healing and scaling",
          "classic": [
            734,
            826
          ],
          "archive": "historical 15% reduction; current values unconfirmed"
        }
      ],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/priest/heal",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 8004,
    "rank": 1,
    "learnLevel": 20,
    "resource": "mana",
    "mode": "cast",
    "cost": 105,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 170,
        "max": 194
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 8004,
      "rank": 1,
      "level": 20,
      "fields": {
        "school": "nature",
        "classicCost": 105,
        "classicHealingRange": [
          170,
          194
        ],
        "referenceCost": 105
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 8008,
    "rank": 2,
    "learnLevel": 28,
    "resource": "mana",
    "mode": "cast",
    "cost": 145,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 257,
        "max": 291
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 8008,
      "rank": 2,
      "level": 28,
      "fields": {
        "school": "nature",
        "classicCost": 145,
        "classicHealingRange": [
          257,
          291
        ],
        "referenceCost": 145
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 8010,
    "rank": 3,
    "learnLevel": 36,
    "resource": "mana",
    "mode": "cast",
    "cost": 185,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 349,
        "max": 393
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 8010,
      "rank": 3,
      "level": 36,
      "fields": {
        "school": "nature",
        "classicCost": 185,
        "classicHealingRange": [
          349,
          393
        ],
        "referenceCost": 185
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 10466,
    "rank": 4,
    "learnLevel": 44,
    "resource": "mana",
    "mode": "cast",
    "cost": 235,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 473,
        "max": 529
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 10466,
      "rank": 4,
      "level": 44,
      "fields": {
        "school": "nature",
        "classicCost": 235,
        "classicHealingRange": [
          473,
          529
        ],
        "referenceCost": 235
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 10467,
    "rank": 5,
    "learnLevel": 52,
    "resource": "mana",
    "mode": "cast",
    "cost": 305,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 648,
        "max": 722
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 10467,
      "rank": 5,
      "level": 52,
      "fields": {
        "school": "nature",
        "classicCost": 305,
        "classicHealingRange": [
          648,
          722
        ],
        "referenceCost": 305
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  },
  {
    "classId": "shaman",
    "abilityId": "shaman:lesser-healing-wave",
    "spellId": 10468,
    "rank": 6,
    "learnLevel": 60,
    "resource": "mana",
    "mode": "cast",
    "cost": 380,
    "castMs": 1500,
    "minRange": 0,
    "maxRange": 40,
    "components": [
      {
        "kind": "heal",
        "stat": "healingPower",
        "coefficient": null,
        "min": 832,
        "max": 928
      }
    ],
    "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
    "referenceSource": "https://octowow.st/shaman",
    "status": "external-reference-only",
    "liveVerified": false,
    "learnability": "imported-candidate-reference",
    "requiredPolicy": [
      "costOverride",
      "componentCoefficients"
    ],
    "referenceGcdMs": 1500,
    "referenceCooldownMs": 0,
    "record": {
      "classId": "shaman",
      "abilityId": "shaman:lesser-healing-wave",
      "spellId": 10468,
      "rank": 6,
      "level": 60,
      "fields": {
        "school": "nature",
        "classicCost": 380,
        "classicHealingRange": [
          832,
          928
        ],
        "referenceCost": 380
      },
      "unknown": [
        "live rank identity and learnability",
        "live healing range, mana cost, cast time and coefficient",
        "live periodic timing, spell-specific procs and talent interactions"
      ],
      "conflicts": [],
      "status": "external-reference-only",
      "source": "https://wowcalc.net/en/classic/wiki/spells/shaman/lesser-healing-wave",
      "liveVerified": false
    }
  }
],
 ...[{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51949,"rank":1,"learnLevel":20,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51949,"rank":1,"level":20,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":[101,114]},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51950,"rank":2,"learnLevel":28,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51950,"rank":2,"level":28,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":null},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51951,"rank":3,"learnLevel":36,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51951,"rank":3,"level":36,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":null},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51952,"rank":4,"learnLevel":44,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51952,"rank":4,"level":44,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":null},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51953,"rank":5,"learnLevel":52,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51953,"rank":5,"level":52,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":null},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51954,"rank":6,"learnLevel":60,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","arcaneRuptureModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"mage","abilityId":"mage:arcane-rupture","spellId":51954,"rank":6,"level":60,"fields":{"school":"arcane","referenceDurationMs":8000,"referenceMissileDamagePct":20,"referenceMissileCostPct":20,"classicDamageRange":null},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:cold-snap","spellId":12472,"rank":1,"learnLevel":20,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"mage-reset","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride"],"referenceGcdMs":1500,"referenceCooldownMs":600000,"record":{"classId":"mage","abilityId":"mage:cold-snap","spellId":12472,"rank":1,"level":20,"fields":{"school":"frost"},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}},{"classId":"mage","abilityId":"mage:evocation","spellId":12051,"rank":1,"learnLevel":20,"resource":"mana","mode":"channel","cost":null,"castMs":8000,"tickMs":2000,"minRange":0,"maxRange":0,"components":[{"kind":"evocation","stat":"arcane","coefficient":null,"min":0,"max":0}],"source":"https://octowow.st/talents/mage/","referenceSource":"https://octowow.st/mage","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","evocationModel"],"referenceGcdMs":1500,"referenceCooldownMs":480000,"record":{"classId":"mage","abilityId":"mage:evocation","spellId":12051,"rank":1,"level":20,"fields":{"school":"arcane"},"unknown":["Live rank identity, timings, cost, range, scaling, interrupt and cooldown behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/mage/","liveVerified":false}}],
 ...[{"classId":"mage","abilityId":"mage:frost-nova","spellId":122,"rank":1,"learnLevel":10,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=122","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":25000,"record":{"classId":"mage","abilityId":"mage:frost-nova","spellId":122,"rank":1,"level":10,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=122","liveVerified":false}},{"classId":"mage","abilityId":"mage:frost-nova","spellId":865,"rank":2,"learnLevel":26,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=865","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":25000,"record":{"classId":"mage","abilityId":"mage:frost-nova","spellId":865,"rank":2,"level":26,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=865","liveVerified":false}},{"classId":"mage","abilityId":"mage:frost-nova","spellId":6131,"rank":3,"learnLevel":40,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=6131","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":25000,"record":{"classId":"mage","abilityId":"mage:frost-nova","spellId":6131,"rank":3,"level":40,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=6131","liveVerified":false}},{"classId":"mage","abilityId":"mage:frost-nova","spellId":10230,"rank":4,"learnLevel":54,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10230","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":25000,"record":{"classId":"mage","abilityId":"mage:frost-nova","spellId":10230,"rank":4,"level":54,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10230","liveVerified":false}},{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":120,"rank":1,"learnLevel":26,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=120","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"record":{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":120,"rank":1,"level":26,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=120","liveVerified":false}},{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":8492,"rank":2,"learnLevel":34,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=8492","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"record":{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":8492,"rank":2,"level":34,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=8492","liveVerified":false}},{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10159,"rank":3,"learnLevel":42,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10159","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"record":{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10159,"rank":3,"level":42,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10159","liveVerified":false}},{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10160,"rank":4,"learnLevel":50,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10160","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"record":{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10160,"rank":4,"level":50,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10160","liveVerified":false}},{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10161,"rank":5,"learnLevel":58,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":10,"components":[{"kind":"damage","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10161","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","frostControlModel","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"record":{"classId":"mage","abilityId":"mage:cone-of-cold","spellId":10161,"rank":5,"level":58,"fields":{"school":"frost","referenceDurationMs":8000},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10161","liveVerified":false}},{"classId":"mage","abilityId":"mage:ice-barrier","spellId":11426,"rank":1,"learnLevel":40,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"ice-barrier","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=11426","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","iceBarrierModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"mage","abilityId":"mage:ice-barrier","spellId":11426,"rank":1,"level":40,"fields":{"school":"frost","referenceAbsorb":454,"referenceDurationMs":60000,"referenceDamagePct":10,"referenceShieldBonusPct":5},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=11426","liveVerified":false}},{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13031,"rank":2,"learnLevel":46,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"ice-barrier","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=13031","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","iceBarrierModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13031,"rank":2,"level":46,"fields":{"school":"frost","referenceAbsorb":null,"referenceDurationMs":60000,"referenceDamagePct":10,"referenceShieldBonusPct":5},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=13031","liveVerified":false}},{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13032,"rank":3,"learnLevel":52,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"ice-barrier","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=13032","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","iceBarrierModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13032,"rank":3,"level":52,"fields":{"school":"frost","referenceAbsorb":null,"referenceDurationMs":60000,"referenceDamagePct":10,"referenceShieldBonusPct":5},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=13032","liveVerified":false}},{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13033,"rank":4,"learnLevel":58,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"ice-barrier","stat":"frost","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=13033","referenceSource":"https://octowow.st/talents/mage/","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","iceBarrierModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"mage","abilityId":"mage:ice-barrier","spellId":13033,"rank":4,"level":58,"fields":{"school":"frost","referenceAbsorb":null,"referenceDurationMs":60000,"referenceDamagePct":10,"referenceShieldBonusPct":5},"unknown":["OctoWoW live rank identity, damage, cost, scaling, cooldown, eligibility and control behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=13033","liveVerified":false}}],
 ...[{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20925,"rank":1,"learnLevel":40,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"holy-shield","stat":"holy"}],"source":"https://octowow.st/index.php/paladin","referenceSource":"https://octowow.st/db/?spell=20925","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDefenseModel"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20925,"rank":1,"level":40,"fields":{"school":"holy","durationMs":10000,"charges":4,"blockBonusPct":45,"additionalThreatPct":50,"referenceDamage":35},"unknown":["live rank tooltip, cost, coefficients, block and retaliation hit rules, threat stacking"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/index.php/paladin","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20927,"rank":2,"learnLevel":50,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"holy-shield","stat":"holy"}],"source":"https://octowow.st/index.php/paladin","referenceSource":"https://octowow.st/db/?spell=20927","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDefenseModel"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20927,"rank":2,"level":50,"fields":{"school":"holy","durationMs":10000,"charges":4,"blockBonusPct":45,"additionalThreatPct":50,"referenceDamage":null},"unknown":["live rank tooltip, cost, coefficients, block and retaliation hit rules, threat stacking"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/index.php/paladin","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20928,"rank":3,"learnLevel":60,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"holy-shield","stat":"holy"}],"source":"https://octowow.st/index.php/paladin","referenceSource":"https://octowow.st/db/?spell=20928","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDefenseModel"],"referenceGcdMs":1500,"referenceCooldownMs":10000,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:holy-shield","spellId":20928,"rank":3,"level":60,"fields":{"school":"holy","durationMs":10000,"charges":4,"blockBonusPct":45,"additionalThreatPct":50,"referenceDamage":null},"unknown":["live rank tooltip, cost, coefficients, block and retaliation hit rules, threat stacking"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/index.php/paladin","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:righteous-fury","spellId":25780,"rank":1,"learnLevel":16,"resource":"mana","mode":"instant","cost":0,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"righteous-fury","stat":"holy"}],"source":"https://octowow.st/index.php/paladin","referenceSource":"https://octowow.st/db/?spell=25780","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["paladinDefenseModel"],"referenceGcdMs":0,"referenceCooldownMs":0,"record":{"classId":"paladin","abilityId":"paladin:righteous-fury","spellId":25780,"rank":1,"level":16,"fields":{"school":"holy","toggle":true,"cost":0},"unknown":["live rank tooltip, cost, coefficients, block and retaliation hit rules, threat stacking"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/index.php/paladin","liveVerified":false}}],
 ...[{"classId":"paladin","abilityId":"paladin:exorcism","spellId":879,"rank":1,"learnLevel":20,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=879","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":879,"rank":1,"level":20,"fields":{"school":"holy","classicDamageRange":[90,102],"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=879","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:exorcism","spellId":5614,"rank":2,"learnLevel":28,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=5614","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":5614,"rank":2,"level":28,"fields":{"school":"holy","classicDamageRange":[160,180],"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=5614","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:exorcism","spellId":5615,"rank":3,"learnLevel":36,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=5615","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":5615,"rank":3,"level":36,"fields":{"school":"holy","classicDamageRange":[227,255],"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=5615","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10312,"rank":4,"learnLevel":44,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10312","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10312,"rank":4,"level":44,"fields":{"school":"holy","classicDamageRange":null,"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10312","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10313,"rank":5,"learnLevel":52,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10313","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10313,"rank":5,"level":52,"fields":{"school":"holy","classicDamageRange":null,"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10313","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10314,"rank":6,"learnLevel":60,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=10314","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel"],"referenceGcdMs":1500,"referenceCooldownMs":15000,"record":{"classId":"paladin","abilityId":"paladin:exorcism","spellId":10314,"rank":6,"level":60,"fields":{"school":"holy","classicDamageRange":null,"classicTargetTypes":["Undead","Demon"],"historicalThreatFactor":0.3},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=10314","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24275,"rank":1,"learnLevel":44,"resource":"mana","mode":"cast","cost":null,"castMs":1000,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=24275","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel","castOverrideMs"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"targetHealthMaxPct":20,"record":{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24275,"rank":1,"level":44,"fields":{"school":"holy","classicDamageRange":[316,348],"classicHealthMaxPct":20,"classicCastMs":1000},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=24275","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24274,"rank":2,"learnLevel":52,"resource":"mana","mode":"cast","cost":null,"castMs":1000,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=24274","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel","castOverrideMs"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"targetHealthMaxPct":20,"record":{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24274,"rank":2,"level":52,"fields":{"school":"holy","classicDamageRange":[412,455],"classicHealthMaxPct":20,"classicCastMs":1000},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=24274","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24239,"rank":3,"learnLevel":60,"resource":"mana","mode":"cast","cost":null,"castMs":1000,"minRange":0,"maxRange":30,"components":[{"kind":"damage","stat":"holy","coefficient":null,"min":0,"max":0}],"source":"https://www.wowhead.com/classic/spell=24239","referenceSource":"https://octowow.st/index.php/paladin","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","paladinDamageModel","castOverrideMs"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"targetHealthMaxPct":20,"record":{"classId":"paladin","abilityId":"paladin:hammer-of-wrath","spellId":24239,"rank":3,"level":60,"fields":{"school":"holy","classicDamageRange":[504,556],"classicHealthMaxPct":20,"classicCastMs":1000},"unknown":["OctoWoW live damage, cost, coefficient, hit table, cooldown and eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://www.wowhead.com/classic/spell=24239","liveVerified":false}}],
 ...[{"classId":"warrior","abilityId":"warrior:recklessness","spellId":1719,"rank":1,"learnLevel":50,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"warrior-discipline","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=1719","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorDisciplineModel"],"referenceGcdMs":1500,"referenceCooldownMs":1800000,"record":{"classId":"warrior","abilityId":"warrior:recklessness","spellId":1719,"rank":1,"level":50,"fields":{"school":"physical","durationMs":15000,"critBonusPct":100,"damageTakenPct":20},"unknown":["current cooldown, eligible attacks, crit conversion and stance"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=1719","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:sweeping-strikes","spellId":12292,"rank":1,"learnLevel":30,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"warrior-discipline","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=12292","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorDisciplineModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"warrior","abilityId":"warrior:sweeping-strikes","spellId":12292,"rank":1,"level":30,"fields":{"school":"physical","durationMs":20000,"charges":5},"unknown":["live cost, copying, charge use and targeting"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=12292","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-block","spellId":2565,"rank":1,"learnLevel":16,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"warrior-discipline","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=2565","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorDisciplineModel"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:shield-block","spellId":2565,"rank":1,"level":16,"fields":{"school":"physical","classicReference":true},"unknown":["current tooltip unavailable; duration, charge count, block bonus, amount, stance, cooldown and rage cost"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=2565","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:master-strike","spellId":54023,"rank":1,"learnLevel":40,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":0.35,"flat":0}],"source":"https://octowow.st/db/?spell=54023","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","masterStrikeModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:master-strike","spellId":54023,"rank":1,"level":40,"fields":{"school":"physical","weaponCoefficient":0.35,"variantIds":[54016,54017,54018,54019,54020,54021,54022]},"unknown":["live cast identity/level, weapon mapping, cost, cooldown, mounted bonus, effect immunity"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=54023","liveVerified":false}}],
 ...[{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":6343,"rank":1,"learnLevel":6,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=6343","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":6343,"rank":1,"level":6,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6343","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8198,"rank":2,"learnLevel":18,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=8198","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8198,"rank":2,"level":18,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8198","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8204,"rank":3,"learnLevel":28,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=8204","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8204,"rank":3,"level":28,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8204","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8205,"rank":4,"learnLevel":38,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=8205","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":8205,"rank":4,"level":38,"fields":{"school":"physical","referenceDamage":55,"referenceDurationMs":22000,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8205","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":11580,"rank":5,"learnLevel":48,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=11580","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":11580,"rank":5,"level":48,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11580","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":11581,"rank":6,"learnLevel":58,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":8,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=11581","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","thunderClapModel","flatThreat","targetPolicy"],"referenceGcdMs":1500,"referenceCooldownMs":4000,"multiTarget":{"cap":4,"falloff":1,"radius":8},"record":{"classId":"warrior","abilityId":"warrior:thunder-clap","spellId":11581,"rank":6,"level":58,"fields":{"school":"physical","referenceDamage":103,"referenceDurationMs":30000,"referenceSlowPct":10,"referenceRadius":8,"referenceCap":4},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11581","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23922,"rank":1,"learnLevel":40,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=23922","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","shieldSlamModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"record":{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23922,"rank":1,"level":40,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceTalentMin":174,"referenceTalentMax":184},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table","shield block scaling, dispel and live rank tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=23922","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23923,"rank":2,"learnLevel":48,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=23923","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","shieldSlamModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"record":{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23923,"rank":2,"level":48,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceTalentMin":174,"referenceTalentMax":184},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table","shield block scaling, dispel and live rank tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=23923","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23924,"rank":3,"learnLevel":54,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=23924","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","shieldSlamModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"record":{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23924,"rank":3,"level":54,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceTalentMin":174,"referenceTalentMax":184},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table","shield block scaling, dispel and live rank tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=23924","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23925,"rank":4,"learnLevel":60,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=23925","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","shieldSlamModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"record":{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":23925,"rank":4,"level":60,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceTalentMin":174,"referenceTalentMax":184},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table","shield block scaling, dispel and live rank tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=23925","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":52315,"rank":5,"learnLevel":60,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=52315","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","shieldSlamModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":6000,"record":{"classId":"warrior","abilityId":"warrior:shield-slam","spellId":52315,"rank":5,"level":60,"fields":{"school":"physical","referenceDamage":null,"referenceDurationMs":null,"referenceTalentMin":174,"referenceTalentMax":184},"unknown":["current coefficients, resource cost, learned rank/phase, threat and attack table","shield block scaling, dispel and live rank tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=52315","liveVerified":false}}],
 ...[{"classId":"warrior","abilityId":"warrior:overpower","spellId":7384,"rank":1,"learnLevel":12,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":1,"flat":0}],"source":"https://octowow.st/db/?spell=7384","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","weaponDamageModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:overpower","spellId":7384,"rank":1,"level":12,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":1,"trigger":"target dodge"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=7384","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:overpower","spellId":7887,"rank":2,"learnLevel":28,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":1,"flat":0}],"source":"https://octowow.st/db/?spell=7887","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","weaponDamageModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:overpower","spellId":7887,"rank":2,"level":28,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":1,"trigger":"target dodge"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=7887","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:overpower","spellId":11584,"rank":3,"learnLevel":44,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":1,"flat":0}],"source":"https://octowow.st/db/?spell=11584","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","weaponDamageModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:overpower","spellId":11584,"rank":3,"level":44,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":1,"trigger":"target dodge"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11584","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:overpower","spellId":11585,"rank":4,"learnLevel":60,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":1,"flat":0}],"source":"https://octowow.st/db/?spell=11585","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","weaponDamageModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:overpower","spellId":11585,"rank":4,"level":60,"fields":{"school":"physical","referenceFlat":35,"referenceWeaponCoefficient":1,"trigger":"target dodge"},"unknown":["current server coefficients, window, stance, threat, rank availability"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11585","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":6572,"rank":1,"learnLevel":14,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=6572","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":6572,"rank":1,"level":14,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6572","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":6574,"rank":2,"learnLevel":24,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=6574","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":6574,"rank":2,"level":24,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6574","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":7379,"rank":3,"learnLevel":34,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=7379","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":7379,"rank":3,"level":34,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=7379","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":11600,"rank":4,"learnLevel":44,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=11600","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":11600,"rank":4,"level":44,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11600","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":11601,"rank":5,"learnLevel":54,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=11601","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":11601,"rank":5,"level":54,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11601","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:revenge","spellId":25288,"rank":6,"learnLevel":60,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"physical-flat","stat":"attackPower","coefficient":0,"min":0,"max":0}],"source":"https://octowow.st/db/?spell=25288","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","reactiveModel","flatThreat"],"referenceGcdMs":1500,"referenceCooldownMs":5000,"record":{"classId":"warrior","abilityId":"warrior:revenge","spellId":25288,"rank":6,"level":60,"fields":{"school":"physical","referenceFlat":null,"referenceWeaponCoefficient":null,"trigger":"incoming dodge/parry/block"},"unknown":["current server coefficients, window, stance, threat, rank availability","database tooltip unavailable"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=25288","liveVerified":false}}],
 ...[{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":1160,"rank":1,"learnLevel":14,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"demoralizing-shout","stat":"attackPower","referenceAmount":35,"durationMs":30000}],"source":"https://octowow.st/db/?spell=1160","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":1160,"rank":1,"level":14,"fields":{"school":"physical","referenceAmount":35,"radius":10,"durationMs":30000},"unknown":["live cost, hit, threat, AP value and stacking"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=1160","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":6190,"rank":2,"learnLevel":24,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"demoralizing-shout","stat":"attackPower","referenceAmount":55,"durationMs":30000}],"source":"https://octowow.st/db/?spell=6190","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":6190,"rank":2,"level":24,"fields":{"school":"physical","referenceAmount":55,"radius":10,"durationMs":30000},"unknown":["live cost, hit, threat, AP value and stacking"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6190","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11554,"rank":3,"learnLevel":34,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"demoralizing-shout","stat":"attackPower","referenceAmount":null,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11554","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11554,"rank":3,"level":34,"fields":{"school":"physical","referenceAmount":null,"radius":10,"durationMs":30000},"unknown":["live cost, hit, threat, AP value and stacking","tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11554","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11555,"rank":4,"learnLevel":44,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"demoralizing-shout","stat":"attackPower","referenceAmount":null,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11555","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11555,"rank":4,"level":44,"fields":{"school":"physical","referenceAmount":null,"radius":10,"durationMs":30000},"unknown":["live cost, hit, threat, AP value and stacking","tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11555","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11556,"rank":5,"learnLevel":54,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"demoralizing-shout","stat":"attackPower","referenceAmount":140,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11556","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":0,"record":{"classId":"warrior","abilityId":"warrior:demoralizing-shout","spellId":11556,"rank":5,"level":54,"fields":{"school":"physical","referenceAmount":140,"radius":10,"durationMs":30000},"unknown":["live cost, hit, threat, AP value and stacking"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11556","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:bloodrage","spellId":2687,"rank":1,"learnLevel":10,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"bloodrage","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=2687","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":60000,"record":{"classId":"warrior","abilityId":"warrior:bloodrage","spellId":2687,"rank":1,"level":10,"fields":{"school":"physical","instantRage":10,"referenceDurationMs":10000,"databasePeriodicRage":100},"unknown":["live health cost, periodic rage and Enrage interaction"],"conflicts":[{"field":"resource","database":"mana","class":"rage"},{"field":"periodicRage","database":"100 over 10 seconds","classic":"10 over 10 seconds"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=2687","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:death-wish","spellId":12328,"rank":1,"learnLevel":30,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"death-wish","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=12328","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":180000,"record":{"classId":"warrior","abilityId":"warrior:death-wish","spellId":12328,"rank":1,"level":30,"fields":{"school":"physical","durationMs":30000,"physicalDamagePct":20,"armourResistanceReductionPct":20},"unknown":["live cost/cooldown and stance eligibility","tooltip unavailable","fear not implemented"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=12328","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:berserker-rage","spellId":18499,"rank":1,"learnLevel":32,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"berserker-rage","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=18499","referenceSource":"https://octowow.st/warrior","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorActivationModel"],"referenceGcdMs":1500,"referenceCooldownMs":30000,"record":{"classId":"warrior","abilityId":"warrior:berserker-rage","spellId":18499,"rank":1,"level":32,"fields":{"school":"physical","referenceDurationMs":10000},"unknown":["live cost/cooldown, rage multiplier and stance eligibility","tooltip unavailable","fear and movement impairments not implemented"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=18499","liveVerified":false}}],
 ...[{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":7386,"rank":1,"learnLevel":10,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"sunder-armor","stat":"attackPower","referenceAmount":90,"durationMs":30000}],"source":"https://octowow.st/db/?spell=7386","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"record":{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":7386,"rank":1,"level":10,"fields":{"school":"physical","referenceAmount":90,"durationMs":30000,"tooltipReadBack":true,"maxStacks":5,"historicalRageCost":10},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=7386","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":7405,"rank":2,"learnLevel":22,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"sunder-armor","stat":"attackPower","referenceAmount":null,"durationMs":30000}],"source":"https://octowow.st/db/?spell=7405","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"record":{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":7405,"rank":2,"level":22,"fields":{"school":"physical","referenceAmount":null,"durationMs":30000,"tooltipReadBack":false,"maxStacks":5,"historicalRageCost":10},"unknown":["live cost, threat, stacking, hit table","intermediate rank tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=7405","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":8380,"rank":3,"learnLevel":34,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"sunder-armor","stat":"attackPower","referenceAmount":null,"durationMs":30000}],"source":"https://octowow.st/db/?spell=8380","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"record":{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":8380,"rank":3,"level":34,"fields":{"school":"physical","referenceAmount":null,"durationMs":30000,"tooltipReadBack":false,"maxStacks":5,"historicalRageCost":10},"unknown":["live cost, threat, stacking, hit table","intermediate rank tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8380","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":11596,"rank":4,"learnLevel":46,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"sunder-armor","stat":"attackPower","referenceAmount":null,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11596","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"record":{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":11596,"rank":4,"level":46,"fields":{"school":"physical","referenceAmount":null,"durationMs":30000,"tooltipReadBack":false,"maxStacks":5,"historicalRageCost":10},"unknown":["live cost, threat, stacking, hit table","intermediate rank tooltip unavailable"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11596","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":11597,"rank":5,"learnLevel":58,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"sunder-armor","stat":"attackPower","referenceAmount":450,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11597","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"record":{"classId":"warrior","abilityId":"warrior:sunder-armor","spellId":11597,"rank":5,"level":58,"fields":{"school":"physical","referenceAmount":450,"durationMs":30000,"tooltipReadBack":true,"maxStacks":5,"historicalRageCost":10},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11597","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":6673,"rank":1,"learnLevel":1,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":15,"durationMs":120000}],"source":"https://octowow.st/db/?spell=6673","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":6673,"rank":1,"level":1,"fields":{"school":"physical","referenceAmount":15,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6673","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":5242,"rank":2,"learnLevel":12,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":35,"durationMs":120000}],"source":"https://octowow.st/db/?spell=5242","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":5242,"rank":2,"level":12,"fields":{"school":"physical","referenceAmount":35,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=5242","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":6192,"rank":3,"learnLevel":22,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":55,"durationMs":120000}],"source":"https://octowow.st/db/?spell=6192","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":6192,"rank":3,"level":22,"fields":{"school":"physical","referenceAmount":55,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=6192","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11549,"rank":4,"learnLevel":32,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":85,"durationMs":120000}],"source":"https://octowow.st/db/?spell=11549","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11549,"rank":4,"level":32,"fields":{"school":"physical","referenceAmount":85,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11549","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11550,"rank":5,"learnLevel":42,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":130,"durationMs":120000}],"source":"https://octowow.st/db/?spell=11550","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11550,"rank":5,"level":42,"fields":{"school":"physical","referenceAmount":130,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11550","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11551,"rank":6,"learnLevel":52,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":185,"durationMs":120000}],"source":"https://octowow.st/db/?spell=11551","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":11551,"rank":6,"level":52,"fields":{"school":"physical","referenceAmount":185,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11551","liveVerified":false}},{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":25289,"rank":7,"learnLevel":60,"resource":"rage","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"battle-shout","stat":"attackPower","referenceAmount":232,"durationMs":120000}],"source":"https://octowow.st/db/?spell=25289","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2329","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","warriorUtilityModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"warrior","abilityId":"warrior:battle-shout","spellId":25289,"rank":7,"level":60,"fields":{"school":"physical","referenceAmount":232,"durationMs":120000,"tooltipReadBack":true,"radius":20},"unknown":["live cost, threat, stacking, hit table"],"conflicts":[{"field":"resource","database":"mana","class":"rage"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=25289","liveVerified":false}}],
 {"classId":"rogue","abilityId":"rogue:mark-for-death","spellId":52538,"rank":1,"learnLevel":40,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":1.35,"flat":0}],"source":"https://octowow.st/talents/rogue/","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"talent-reference","requiredPolicy":["costOverride","markForDeathModel"],"referenceGcdMs":1000,"comboGain":2,"record":{"classId":"rogue","abilityId":"rogue:mark-for-death","spellId":52538,"rank":1,"level":40,"fields":{"school":"physical","weaponCoefficient":1.35,"comboGain":2,"durationMs":8000,"attackPowerPct":30,"magicalDamageMaxPctOwnerAP":18,"unavoidable":["block","dodge","parry"]},"unknown":["live cost and cooldown, miss and crit behaviour, range, buff recipients and AP basis, magic implementation, stacking and application conditions"],"conflicts":[{"field":"AP recipient scaling","guide":"party attack power +30%","archive":"percentage of caster melee AP"}],"status":"external-reference-only","source":"https://octowow.st/talents/rogue/","liveVerified":false}},
 ...[{"classId":"rogue","abilityId":"rogue:garrote","spellId":703,"rank":1,"learnLevel":14,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":24,"max":24,"durationMs":18000,"intervalMs":3000}],"source":"https://classicdb.ch/?spell=703","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":703,"rank":1,"level":14,"fields":{"school":"physical","tickBase":24,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=703","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:garrote","spellId":8631,"rank":2,"learnLevel":22,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":34,"max":34,"durationMs":18000,"intervalMs":3000}],"source":"https://octowow.st/db/?spell=8631","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":8631,"rank":2,"level":22,"fields":{"school":"physical","tickBase":34,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8631","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:garrote","spellId":8632,"rank":3,"learnLevel":30,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":47,"max":47,"durationMs":18000,"intervalMs":3000}],"source":"https://octowow.st/db/?spell=8632","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":8632,"rank":3,"level":30,"fields":{"school":"physical","tickBase":47,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8632","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:garrote","spellId":8633,"rank":4,"learnLevel":38,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":59,"max":59,"durationMs":18000,"intervalMs":3000}],"source":"https://octowow.st/db/?spell=8633","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":8633,"rank":4,"level":38,"fields":{"school":"physical","tickBase":59,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8633","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:garrote","spellId":11289,"rank":5,"learnLevel":46,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":74,"max":74,"durationMs":18000,"intervalMs":3000}],"source":"https://octowow.st/db/?spell=11289","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":11289,"rank":5,"level":46,"fields":{"school":"physical","tickBase":74,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11289","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:garrote","spellId":11290,"rank":6,"learnLevel":54,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"position":"behind","components":[{"kind":"physical-bleed","stat":"attackPower","coefficient":null,"min":92,"max":92,"durationMs":18000,"intervalMs":3000}],"source":"https://classicdb.ch/?spell=11290","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["costOverride","componentCoefficients"],"referenceGcdMs":1000,"comboGain":1,"requiresStealth":true,"record":{"classId":"rogue","abilityId":"rogue:garrote","spellId":11290,"rank":6,"level":54,"fields":{"school":"physical","tickBase":92,"durationMs":18000,"intervalMs":3000,"comboGain":1,"requiresStealth":true},"unknown":["live AP coefficient, energy cost, hit outcomes, phase and learnt rank"],"conflicts":[{"field":"resource","dbDetails":"mana","class":"energy"}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=11290","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:vanish","spellId":1856,"rank":1,"learnLevel":22,"resource":"energy","mode":"instant","cost":0,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"vanish","stat":"attackPower"}],"source":"https://classicdb.ch/?spell=1856","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["vanishModel"],"referenceGcdMs":0,"referenceCooldownMs":300000,"record":{"classId":"rogue","abilityId":"rogue:vanish","spellId":1856,"rank":1,"level":22,"fields":{"school":"physical","referenceDurationMs":10000,"referenceReagent":"Flash Powder"},"unknown":["live stealth mechanics, cost, cooldown and threat, reagent rules"],"conflicts":[],"status":"external-reference-only","source":"https://classicdb.ch/?spell=1856","liveVerified":false}},{"classId":"rogue","abilityId":"rogue:vanish","spellId":1857,"rank":2,"learnLevel":42,"resource":"energy","mode":"instant","cost":0,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"vanish","stat":"attackPower"}],"source":"https://classicdb.ch/?spell=1857","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["vanishModel"],"referenceGcdMs":0,"referenceCooldownMs":300000,"record":{"classId":"rogue","abilityId":"rogue:vanish","spellId":1857,"rank":2,"level":42,"fields":{"school":"physical","referenceDurationMs":10000,"referenceReagent":"Flash Powder"},"unknown":["live stealth mechanics, cost, cooldown and threat, reagent rules"],"conflicts":[],"status":"external-reference-only","source":"https://classicdb.ch/?spell=1857","liveVerified":false}}],
 {"classId":"rogue","abilityId":"rogue:blade-flurry","spellId":13877,"rank":1,"learnLevel":30,"resource":"energy","mode":"instant","cost":25,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"blade-flurry","stat":"attackPower"}],"source":"https://octowow.st/index.php/rogue","referenceSource":"https://octowow.st/db/?spell=13877","status":"external-reference-only","liveVerified":false,"learnability":"trainer-reference","requiredPolicy":["bladeFlurryModel"],"referenceGcdMs":1000,"referenceCooldownMs":4000,"record":{"classId":"rogue","abilityId":"rogue:blade-flurry","spellId":13877,"rank":1,"level":30,"fields":{"school":"physical","energyCost":25,"cooldownMs":4000,"toggle":true},"unknown":["penalty values, eligible attacks, cleave basis, deactivate cost, GCD and timing"],"conflicts":[{"field":"behaviour","guide":"persistent toggle, damage and energy regeneration reduced","database":"15 sec, 20% haste","databaseResource":"mana"}],"status":"external-reference-only","source":"https://octowow.st/index.php/rogue","liveVerified":false}},
 {"classId":"rogue","abilityId":"rogue:shadow-of-death","spellId":52710,"rank":1,"learnLevel":30,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"shadow-of-death","stat":"attackPower"}],"source":"https://octowow.st/talents/rogue/","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2326","status":"external-reference-only","liveVerified":false,"learnability":"talent-reference","requiredPolicy":["costOverride","shadowOfDeathModel"],"referenceGcdMs":1000,"comboSpend":true,"refreshStrategy":"target-debuff","record":{"classId":"rogue","abilityId":"rogue:shadow-of-death","spellId":52710,"rank":1,"level":30,"fields":{"school":"physical","durationMs":6000,"accumulatedDamagePct":[10,20,30,40,50],"apCapPct":[50,100,150,200,250]},"unknown":["actual cost, range, application outcomes, damage basis, detonation defence, threat, replacement and party eligibility"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/talents/rogue/","liveVerified":false}},
 ...[{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8647,"rank":1,"learnLevel":14,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"expose-armor","stat":"attackPower","armourPerCombo":80,"durationMs":30000}],"source":"https://octowow.st/db/?spell=8647","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","exposeModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8647,"rank":1,"level":14,"fields":{"school":"physical","armourPerCombo":80,"durationMs":30000,"tooltipCost":25,"tooltipResource":"mana"},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[{"field":"resource","database":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8647","liveVerified":false},"comboSpend":true,"refreshStrategy":"target-debuff"},{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8649,"rank":2,"learnLevel":26,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"expose-armor","stat":"attackPower","armourPerCombo":145,"durationMs":30000}],"source":"https://octowow.st/db/?spell=8649","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","exposeModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8649,"rank":2,"level":26,"fields":{"school":"physical","armourPerCombo":145,"durationMs":30000,"tooltipCost":25,"tooltipResource":"mana"},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[{"field":"resource","database":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8649","liveVerified":false},"comboSpend":true,"refreshStrategy":"target-debuff"},{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8650,"rank":3,"learnLevel":36,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"expose-armor","stat":"attackPower","armourPerCombo":210,"durationMs":30000}],"source":"https://octowow.st/db/?spell=8650","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","exposeModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":8650,"rank":3,"level":36,"fields":{"school":"physical","armourPerCombo":210,"durationMs":30000,"tooltipCost":25,"tooltipResource":"mana"},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[{"field":"resource","database":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=8650","liveVerified":false},"comboSpend":true,"refreshStrategy":"target-debuff"},{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":11197,"rank":4,"learnLevel":46,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"expose-armor","stat":"attackPower","armourPerCombo":275,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11197","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","exposeModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":11197,"rank":4,"level":46,"fields":{"school":"physical","armourPerCombo":275,"durationMs":30000,"tooltipCost":25,"tooltipResource":"mana"},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[{"field":"resource","database":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11197","liveVerified":false},"comboSpend":true,"refreshStrategy":"target-debuff"},{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":11198,"rank":5,"learnLevel":56,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"expose-armor","stat":"attackPower","armourPerCombo":340,"durationMs":30000}],"source":"https://octowow.st/db/?spell=11198","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","exposeModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:expose-armor","spellId":11198,"rank":5,"level":56,"fields":{"school":"physical","armourPerCombo":340,"durationMs":30000,"tooltipCost":25,"tooltipResource":"mana"},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[{"field":"resource","database":"mana","class":"energy"}],"status":"external-reference-only","source":"https://octowow.st/db/?spell=11198","liveVerified":false},"comboSpend":true,"refreshStrategy":"target-debuff"},{"classId":"rogue","abilityId":"rogue:adrenaline-rush","spellId":13750,"rank":1,"learnLevel":40,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"rogue-cooldown","stat":"attackPower","durationMs":15000}],"source":"https://octowow.st/db/?spell=13750","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","rogueCooldownModel"],"referenceGcdMs":1000,"record":{"classId":"rogue","abilityId":"rogue:adrenaline-rush","spellId":13750,"rank":1,"level":40,"fields":{"school":"physical","durationMs":15000,"energyRegenBonusPct":100},"unknown":["live cost/cooldown and energy tick behaviour"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=13750","liveVerified":false},"referenceCooldownMs":180000,"refreshStrategy":"actor-buff"},{"classId":"rogue","abilityId":"rogue:cold-blood","spellId":14177,"rank":1,"learnLevel":30,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"rogue-cooldown","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=14177","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","rogueCooldownModel"],"referenceGcdMs":0,"record":{"classId":"rogue","abilityId":"rogue:cold-blood","spellId":14177,"rank":1,"level":30,"fields":{"school":"physical","critBonusPct":100,"eligible":["sinister-strike","backstab","ambush","noxious-assault","eviscerate"]},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=14177","liveVerified":false},"referenceCooldownMs":180000,"refreshStrategy":"actor-buff"},{"classId":"rogue","abilityId":"rogue:preparation","spellId":14185,"rank":1,"learnLevel":30,"resource":"energy","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"rogue-cooldown","stat":"attackPower"}],"source":"https://octowow.st/db/?spell=14185","referenceSource":"https://octowow.st/index.php/rogue","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","rogueCooldownModel"],"referenceGcdMs":0,"record":{"classId":"rogue","abilityId":"rogue:preparation","spellId":14185,"rank":1,"level":30,"fields":{"school":"physical","resetsOtherRogueAbilities":true},"unknown":["live cost, hit table, stacking, availability"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?spell=14185","liveVerified":false},"referenceCooldownMs":420000}],
 ...[{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":1490,"rank":1,"learnLevel":32,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","referenceSource":"https://classicdb.ch/?spell=1490","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":1490,"rank":1,"level":32,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":11721,"rank":2,"learnLevel":46,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","referenceSource":"https://classicdb.ch/?spell=11721","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":11721,"rank":2,"level":46,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":11722,"rank":3,"learnLevel":60,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","referenceSource":"https://classicdb.ch/?spell=11722","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-the-elements","spellId":11722,"rank":3,"level":60,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20the%20Elements","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-shadow","spellId":17862,"rank":1,"learnLevel":44,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Shadow","referenceSource":"https://classicdb.ch/?spell=17862","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-shadow","spellId":17862,"rank":1,"level":44,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Shadow","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-shadow","spellId":17937,"rank":2,"learnLevel":56,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Shadow","referenceSource":"https://classicdb.ch/?spell=17937","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-shadow","spellId":17937,"rank":2,"level":56,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Shadow","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":704,"rank":1,"learnLevel":14,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","referenceSource":"https://classicdb.ch/?spell=704","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":704,"rank":1,"level":14,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":7658,"rank":2,"learnLevel":28,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","referenceSource":"https://classicdb.ch/?spell=7658","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":7658,"rank":2,"level":28,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":7659,"rank":3,"learnLevel":42,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","referenceSource":"https://classicdb.ch/?spell=7659","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":7659,"rank":3,"level":42,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","liveVerified":false}},{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":11717,"rank":4,"learnLevel":56,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":30,"components":[{"kind":"utility-curse","stat":"shadow"}],"source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","referenceSource":"https://classicdb.ch/?spell=11717","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","utilityCurseModel"],"referenceGcdMs":1500,"refreshStrategy":"target-debuff","record":{"classId":"warlock","abilityId":"warlock:curse-of-recklessness","spellId":11717,"rank":4,"level":56,"fields":{"school":"shadow"},"unknown":["live cost, duration, exact school and resistance modifiers, armour and attack power, hit table, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Curse%20of%20Recklessness","liveVerified":false}}],
 ...[{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":51387,"rank":1,"learnLevel":20,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":0.2,"flat":0}],"source":"https://octowow.st/talents/shaman/","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2327","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["lightningStrikeModel"],"referenceCooldownMs":9000,"referenceGcdMs":1500,"record":{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":51387,"rank":1,"level":20,"fields":{"school":"physical","historicalPhysicalWeaponCoefficient":0.2,"historicalNatureWeaponCoefficient":0.1,"historicalNatureSPCoefficient":0.05,"historicalManaCostPct":12,"historicalCooldownMs":9000},"unknown":["current live coefficients, costs, separate nature hit and crit rules, empowered shield bases and AP coefficients"],"conflicts":[{"field":"candidateCastIdentity","selected":51387,"otherCandidate":51386},{"field":"historicalManaCostPct","initial":8,"subsequent":15,"later":12}],"status":"external-reference-only","source":"https://octowow.st/talents/shaman/","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":52420,"rank":2,"learnLevel":38,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":0.4,"flat":0}],"source":"https://octowow.st/talents/shaman/","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2327","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["lightningStrikeModel"],"referenceCooldownMs":9000,"referenceGcdMs":1500,"record":{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":52420,"rank":2,"level":38,"fields":{"school":"physical","historicalPhysicalWeaponCoefficient":0.4,"historicalNatureWeaponCoefficient":0.15,"historicalNatureSPCoefficient":0.05,"historicalManaCostPct":12,"historicalCooldownMs":9000},"unknown":["current live coefficients, costs, separate nature hit and crit rules, empowered shield bases and AP coefficients"],"conflicts":[{"field":"candidateCastIdentity","selected":52420,"otherCandidate":52419},{"field":"historicalManaCostPct","initial":8,"subsequent":15,"later":12}],"status":"external-reference-only","source":"https://octowow.st/talents/shaman/","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":52422,"rank":3,"learnLevel":56,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":5,"components":[{"kind":"weapon","stat":"attackPower","coefficient":0.6,"flat":0}],"source":"https://octowow.st/talents/shaman/","referenceSource":"https://octowow.st/forum/viewtopic.php?t=2327","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["lightningStrikeModel"],"referenceCooldownMs":9000,"referenceGcdMs":1500,"record":{"classId":"shaman","abilityId":"shaman:lightning-strike","spellId":52422,"rank":3,"level":56,"fields":{"school":"physical","historicalPhysicalWeaponCoefficient":0.6,"historicalNatureWeaponCoefficient":0.2,"historicalNatureSPCoefficient":0.05,"historicalManaCostPct":12,"historicalCooldownMs":9000},"unknown":["current live coefficients, costs, separate nature hit and crit rules, empowered shield bases and AP coefficients"],"conflicts":[{"field":"candidateCastIdentity","selected":52422,"otherCandidate":52421},{"field":"historicalManaCostPct","initial":8,"subsequent":15,"later":12}],"status":"external-reference-only","source":"https://octowow.st/talents/shaman/","liveVerified":false}}],
 ...[{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":324,"rank":1,"learnLevel":8,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":324,"rank":1,"level":8,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":325,"rank":2,"learnLevel":16,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":325,"rank":2,"level":16,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":905,"rank":3,"learnLevel":24,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":905,"rank":3,"level":24,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":945,"rank":4,"learnLevel":32,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":945,"rank":4,"level":32,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":8134,"rank":5,"learnLevel":40,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":8134,"rank":5,"level":40,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":10431,"rank":6,"learnLevel":48,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":10431,"rank":6,"level":48,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":10432,"rank":7,"learnLevel":56,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Lightning+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:lightning-shield","spellId":10432,"rank":7,"level":56,"fields":{"school":"nature","historicalAmount":null,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Lightning+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:water-shield","spellId":45528,"rank":1,"learnLevel":26,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Water+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:water-shield","spellId":45528,"rank":1,"level":26,"fields":{"school":"nature","historicalAmount":34,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[{"field":"candidateCastIdentity","selected":45528,"alternative":45527}],"status":"external-reference-only","source":"https://octowow.st/db/?search=Water+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51533,"rank":2,"learnLevel":34,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Water+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51533,"rank":2,"level":34,"fields":{"school":"nature","historicalAmount":55,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[{"field":"candidateCastIdentity","selected":51533,"alternative":51529}],"status":"external-reference-only","source":"https://octowow.st/db/?search=Water+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51534,"rank":3,"learnLevel":42,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Water+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51534,"rank":3,"level":42,"fields":{"school":"nature","historicalAmount":76,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[{"field":"candidateCastIdentity","selected":51534,"alternative":51530}],"status":"external-reference-only","source":"https://octowow.st/db/?search=Water+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51535,"rank":4,"learnLevel":50,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Water+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51535,"rank":4,"level":50,"fields":{"school":"nature","historicalAmount":102,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[{"field":"candidateCastIdentity","selected":51535,"alternative":51531}],"status":"external-reference-only","source":"https://octowow.st/db/?search=Water+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51536,"rank":5,"learnLevel":58,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Water+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:water-shield","spellId":51536,"rank":5,"level":58,"fields":{"school":"nature","historicalAmount":130,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[{"field":"candidateCastIdentity","selected":51536,"alternative":51532}],"status":"external-reference-only","source":"https://octowow.st/db/?search=Water+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":45525,"rank":1,"learnLevel":40,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Earth+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":45525,"rank":1,"level":40,"fields":{"school":"nature","historicalAmount":85,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Earth+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":51525,"rank":2,"learnLevel":48,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Earth+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":51525,"rank":2,"level":48,"fields":{"school":"nature","historicalAmount":115,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Earth+Shield","liveVerified":false}},{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":51526,"rank":3,"learnLevel":60,"resource":"mana","mode":"instant","cost":null,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"elemental-shield","stat":"nature"}],"source":"https://octowow.st/db/?search=Earth+Shield","referenceSource":"https://octowow.st/index.php/shaman","status":"external-reference-only","liveVerified":false,"learnability":"imported-candidate-reference","requiredPolicy":["costOverride","elementalShieldModel"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"shaman","abilityId":"shaman:earth-shield","spellId":51526,"rank":3,"level":60,"fields":{"school":"nature","historicalAmount":150,"referenceCharges":3,"referenceDurationMs":600000},"unknown":["live cast identity, cost, charge amount, proc eligibility and cooldown, scaling, threat"],"conflicts":[],"status":"external-reference-only","source":"https://octowow.st/db/?search=Earth+Shield","liveVerified":false}}],
 ...[{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":21082,"rank":1,"learnLevel":6,"resource":"mana","mode":"instant","cost":25,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=21082","referenceSource":"https://www.wowhead.com/classic/spell=21082","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":21082,"rank":1,"level":6,"fields":{"school":"holy","referenceManaCost":25,"referenceAP":31,"referenceHastePct":40,"referenceHolyBonus":20,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":31,"wowheadClassic":36}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=21082","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20162,"rank":2,"learnLevel":12,"resource":"mana","mode":"instant","cost":40,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=20162","referenceSource":"https://www.wowhead.com/classic/spell=20162","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20162,"rank":2,"level":12,"fields":{"school":"holy","referenceManaCost":40,"referenceAP":51,"referenceHastePct":40,"referenceHolyBonus":30,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":51,"wowheadClassic":60}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=20162","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20305,"rank":3,"learnLevel":22,"resource":"mana","mode":"instant","cost":65,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=20305","referenceSource":"https://www.wowhead.com/classic/spell=20305","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20305,"rank":3,"level":22,"fields":{"school":"holy","referenceManaCost":65,"referenceAP":94,"referenceHastePct":40,"referenceHolyBonus":50,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":94,"wowheadClassic":108}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=20305","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20306,"rank":4,"learnLevel":32,"resource":"mana","mode":"instant","cost":90,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=20306","referenceSource":"https://www.wowhead.com/classic/spell=20306","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20306,"rank":4,"level":32,"fields":{"school":"holy","referenceManaCost":90,"referenceAP":145,"referenceHastePct":40,"referenceHolyBonus":80,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":145,"wowheadClassic":161}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=20306","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20307,"rank":5,"learnLevel":42,"resource":"mana","mode":"instant","cost":125,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=20307","referenceSource":"https://www.wowhead.com/classic/spell=20307","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20307,"rank":5,"level":42,"fields":{"school":"holy","referenceManaCost":125,"referenceAP":221,"referenceHastePct":40,"referenceHolyBonus":110,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":221,"wowheadClassic":239}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=20307","liveVerified":false}},{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20308,"rank":6,"learnLevel":52,"resource":"mana","mode":"instant","cost":160,"castMs":0,"minRange":0,"maxRange":0,"components":[{"kind":"seal-aura","stat":"holy"}],"source":"https://classicdb.ch/?spell=20308","referenceSource":"https://www.wowhead.com/classic/spell=20308","status":"external-reference-only","liveVerified":false,"learnability":"trainer-classic-reference","requiredPolicy":["sealModel","costOverride"],"referenceGcdMs":1500,"refreshStrategy":"actor-buff","record":{"classId":"paladin","abilityId":"paladin:seal-of-the-crusader","spellId":20308,"rank":6,"level":52,"fields":{"school":"holy","referenceManaCost":160,"referenceAP":306,"referenceHastePct":40,"referenceHolyBonus":140,"referenceSealDurationMs":30000,"referenceJudgementDurationMs":10000},"unknown":["live values, damage penalty, holy coefficients and stacking"],"conflicts":[{"field":"attackPower","classicdb":306,"wowheadClassic":326}],"status":"external-reference-only","source":"https://classicdb.ch/?spell=20308","liveVerified":false}}],
 ...[20165,20347,20348,20349].map((spellId,i)=>{const rank=i+1,learnLevel=30+10*i,cost=[110,140,180,210][i],source='https://classicdb.ch/?spell='+spellId;return {classId:'paladin',abilityId:'paladin:seal-of-light',spellId,rank,learnLevel,resource:'mana',mode:'instant',cost,castMs:0,minRange:0,maxRange:0,components:[{kind:'seal-aura',stat:'holy'}],source,referenceSource:'https://wowcalc.net/en/classic/wiki/spells/paladin/seal-of-light',status:'external-reference-only',liveVerified:false,learnability:'trainer-classic-reference',requiredPolicy:['sealModel','costOverride'],referenceGcdMs:1500,refreshStrategy:'actor-buff',record:{classId:'paladin',abilityId:'paladin:seal-of-light',spellId,rank,level:learnLevel,fields:{school:'holy',referenceManaCost:cost,referenceSealHeal:[39,53,76,94][i],referenceJudgementHeal:[25,34,49,61][i],referenceSealDurationMs:30000,referenceJudgementDurationMs:10000},unknown:['OctoWoW rank identities and costs','live healing scaling, proc chance, ICD and eligibility','threat and refresh policy'],conflicts:[],status:'external-reference-only',source,liveVerified:false}};}),
 {classId:'hunter',abilityId:'hunter:kill-command',spellId:41827,rank:1,learnLevel:40,resource:'mana',mode:'instant',cost:5,castMs:0,minRange:0,maxRange:0,components:[{kind:'companion-command',stat:'attackPower',coefficient:.8}],source:'https://octowow.st/talents/hunter/',referenceSource:'https://octowow.st/index.php/hunter',status:'external-reference-only',liveVerified:false,learnability:'talent-reference',requiredPolicy:['killCommandModel'],referenceCooldownMs:8000,record:{classId:'hunter',abilityId:'hunter:kill-command',spellId:41827,rank:1,level:40,fields:{school:'physical',petAPCoefficient:.8,baseManaCostPct:5,cooldownMs:8000,requiresOwnerCrit:true},unknown:['live trigger window','GCD','eligible attacks','hit table','range','consumption on miss','pet cast interaction'],conflicts:[],status:'external-reference-only',source:'https://octowow.st/talents/hunter/',liveVerified:false}},
 {classId:'paladin',abilityId:'paladin:seal-of-wisdom',spellId:51746,rank:5,learnLevel:58,resource:'mana',mode:'instant',cost:200,castMs:0,minRange:0,maxRange:0,components:[{kind:'seal-aura',stat:'holy'}],source:'https://forge.octowow.st/database/?spell=51746',referenceSource:'https://forge.octowow.st/database/?spell=51746',status:'external-reference-only',liveVerified:false,learnability:'trainer-reference',requiredPolicy:['sealModel'],referenceGcdMs:1500,refreshStrategy:'actor-buff',record:{classId:'paladin',abilityId:'paladin:seal-of-wisdom',spellId:51746,rank:5,level:58,fields:{school:'holy',manaCost:200,sealDurationMs:30000,sealMana:187,judgementDurationMs:10000,judgementMana:59},unknown:['live cost and learnability','proc chances, eligibility, resistance, ICD and threat','rank 1–4 identities'],conflicts:[{field:'judgement proc',stagingTooltip:'59 mana per proc',playerReport:'rank 4 and 5 proc failures; open report May 29, 2026 https://forge.octowow.st/bug-report?id=33'}],status:'external-reference-only',source:'https://forge.octowow.st/database/?spell=51746',liveVerified:false}},
 ...[40,48,56,60].map((learnLevel,i)=>{
  const spellId=52714+i,rank=i+1,abilityId='rogue:noxious-assault',source='https://octowow.st/rogue';
  return {classId:'rogue',abilityId,spellId,rank,learnLevel,resource:'energy',mode:'instant',cost:45,castMs:0,minRange:0,maxRange:5,components:[c('physical-ap','attackPower',null,{min:0,max:0})],source,referenceSource:'https://octowow.st/forum/viewtopic.php?t=2326',status:'external-reference-only',liveVerified:false,learnability:i===3?'book-required-or-confirmed':'trainer-reference',...(i===3?{referenceAvailableFromPhase:3}:{}),comboGain:1,referenceGcdMs:1000,requiredPolicy:['costOverride','physicalAPModel','noxiousModel'],record:{classId:'rogue',abilityId,spellId,rank,level:learnLevel,fields:{school:'physical',guideAPCoefficient:.30,archivedFlatDamage:[30,55,85,105][i]},unknown:['rank availability, aggregate versus per-hand attack outcomes, damage, cost, poison triggering, combo gain'],conflicts:[{field:'attackPowerCoefficient',guide:.30,archive:.35},{field:'poison application',guide:'both weapon poisons',playerReport:'May 2026 report of missing applications; current behaviour unverified'}],status:'external-reference-only',source,liveVerified:false}};
 }),
 row('warlock','curse-of-agony',11713,'mana','instant',[c('periodic-damage','shadow',null,{min:87,max:87,durationMs:24000,intervalMs:2000,baseTickMultipliers:[.5,.5,.5,.5,1,1,1,1,1.5,1.5,1.5,1.5],replacePeriodicAuras:['Curse of Doom']})],{cost:215,castMs:0,minRange:0,maxRange:30,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/curses.go',requiredPolicy:['componentCoefficients','acceptSourceConflict']}),
 row('warlock','curse-of-doom',603,'mana','instant',[c('periodic-damage','shadow',1,{min:3200,max:3200,durationMs:60000,intervalMs:60000,replacePeriodicAuras:['Curse of Agony']})],{cost:300,castMs:0,minRange:0,maxRange:30,referenceCooldownMs:60000,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/curses.go'}),

 row('mage','arcane-explosion',10202,'mana','instant',[c('damage','arcane',.143,{min:243,max:264})],{cost:390,castMs:0,minRange:0,maxRange:10,multiTarget:{cap:40,falloff:1},referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/arcane_explosion.go',requiredPolicy:['targetPolicy','acceptSourceConflict']}),
 row('mage','flamestrike',10216,'mana','cast',[c('damage','fire',.157,{min:375,max:460}),c('periodic-damage','fire',.02,{min:85,max:85,durationMs:8000,intervalMs:2000,ground:true})],{cost:990,castMs:3000,minRange:0,maxRange:30,multiTarget:{cap:40,falloff:1},referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/flamestrike.go',requiredPolicy:['targetPolicy','acceptSourceConflict','costOverride','castOverrideMs'],refreshStrategy:'do-not-gate'}),
 row('priest','holy-fire',15261,'mana','cast',[c('damage','holy',null,{min:355,max:450}),c('periodic-damage','holy',.05,{min:29,max:29,durationMs:10000,intervalMs:2000,reusePreviousHit:true})],{cost:255,castMs:3500,minRange:0,maxRange:30,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/priest/holy_fire.go',requiredPolicy:['componentCoefficients','acceptSourceConflict'],refreshStrategy:'do-not-gate'}),
 row('warlock','drain-life',11700,'mana','channel',[c('damage','shadow',.1,{min:71,max:71,leech:true,channelPeriodic:true})],{cost:300,castMs:5000,minRange:0,maxRange:20,tickMs:1000,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/drain_life.go',requiredPolicy:['channelTickAtEnd','leechModel','channelApplicationPolicy']}),
 row('warlock','death-coil',17926,'mana','instant',[c('damage','shadow',.214,{min:470,max:470,leech:true})],{cost:565,castMs:0,minRange:0,maxRange:30,referenceCooldownMs:120000,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/death_coil.go',requiredPolicy:['acceptSourceConflict','leechModel']}),

 row('warrior','slam',45961,'rage','cast',[c('weapon','mainhand',1,{flat:0})],{cost:15,castMs:2500,minRange:0,maxRange:5,referenceSource:'https://octowow.st/db/?spell=45961',requiredPolicy:['weaponPolicy','costOverride']}),
 row('warrior','mortal-strike',21553,'rage','instant',[c('weapon','mainhand',null,{flat:0})],{cost:30,castMs:0,minRange:0,maxRange:5,referenceCooldownMs:6000,referenceSource:'https://octowow.st/index.php/warrior',requiredPolicy:['acceptSourceConflict','weaponPolicy','weaponDamageModel']}),
 row('warrior','whirlwind',1680,'rage','instant',[c('weapon','mainhand',1,{flat:0})],{cost:25,castMs:0,minRange:0,maxRange:8,referenceCooldownMs:10000,multiTarget:{cap:4,falloff:1},referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warrior/whirlwind.go',requiredPolicy:['weaponPolicy','targetPolicy','stancePolicy']}),
 row('warrior','cleave',20569,'rage','queued-melee',[c('weapon','mainhand',1,{flat:50})],{cost:20,castMs:0,minRange:0,maxRange:5,multiTarget:{cap:2,falloff:1},referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warrior/heroic_strike_cleave.go',requiredPolicy:['weaponPolicy','targetPolicy','flatThreat']}),

 row('hunter','aimed-shot',20904,'mana','cast',[c('ranged-weapon','ranged',1,{flat:600})],{cost:205,castMs:3000,minRange:8,maxRange:35,referenceCooldownMs:26000,referenceSource:'https://octowow.st/index.php/hunter',requiredPolicy:['rangedModel','acceptSourceConflict']}),
 row('hunter','multi-shot',25294,'mana','instant',[c('ranged-weapon','ranged',1,{flat:150})],{cost:230,castMs:0,minRange:8,maxRange:35,referenceCooldownMs:10000,referenceAvailableFromPhase:3,referenceSource:'https://octowow.st/db/?spell=25294',multiTarget:{cap:3,falloff:1},requiredPolicy:['rangedModel','targetPolicy']}),
 row('shaman','chain-lightning',10605,'mana','cast',[c('damage','nature',.714,{min:493,max:552})],{cost:605,castMs:2500,minRange:0,maxRange:30,referenceCooldownMs:6000,multiTarget:{cap:3,falloff:.7},referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/shaman/chain_lightning.go',requiredPolicy:['targetPolicy','acceptSourceConflict']}),
 row('shaman','chain-heal',10623,'mana','cast',[c('heal','healingPower',null,{min:551,max:630})],{cost:405,castMs:2500,minRange:0,maxRange:40,multiTarget:{cap:3,falloff:.5},referenceSource:coefficientSource,requiredPolicy:['targetPolicy','componentCoefficients']}),

 row('warrior','execute',20662,'rage','instant',[c('execute','attackPower',null,{min:600,max:600})],{cost:15,castMs:0,minRange:0,maxRange:5,referenceSource:'https://octowow.st/forum/viewtopic.php?t=2329',requiredPolicy:['executeModel','acceptSourceConflict'],targetHealthMaxPct:20}),
 row('warrior','bloodthirst',23894,'rage','instant',[c('physical-ap','attackPower',null,{min:0,max:0})],{cost:30,castMs:0,minRange:0,maxRange:5,referenceCooldownMs:6000,referenceSource:'https://octowow.st/index.php/warrior',requiredPolicy:['physicalAPModel','acceptSourceConflict']}),
 row('rogue','slice-and-dice',6774,'energy','instant',[c('combo-aura','meleeHasteFactor',null,{hastePct:30,durations:[9000,12000,15000,18000,21000]})],{cost:20,castMs:0,minRange:0,maxRange:100,referenceSource:'https://octowow.st/index.php/rogue',comboSpend:true,requiredPolicy:['acceptSourceConflict','swingHastePolicy'],refreshStrategy:'actor-buff'}),
 row('mage','arcane-missiles',10212,'mana','channel',[c('damage','arcane',.328,{min:192,max:192})],{cost:595,castMs:5000,minRange:0,maxRange:30,tickMs:1000,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/arcane_missiles.go',requiredPolicy:['acceptSourceConflict','channelTickAtEnd']}),
 row('priest','flash-heal',10917,'mana','cast',[c('heal','healingPower',1.5/3.5,{min:812,max:959})],{cost:380,castMs:1500,minRange:0,maxRange:40,referenceSource:coefficientSource}),

 row('mage','fireball',10151,'mana','cast',[c('damage','fire',1,{min:561,max:716}),c('periodic-damage','fire',null,{min:18,max:18,durationMs:8000,intervalMs:2000,reusePreviousHit:true})],{cost:275,costSource:'https://octowow.st/index.php/mage',castMs:3500,minRange:0,maxRange:35,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/mage/fireball.go',requiredPolicy:['acceptSourceConflict','componentCoefficients'],refreshStrategy:'do-not-gate'}),
 row('warlock','corruption',11672,'mana','cast',[c('periodic-damage','shadow',.167,{min:111,max:111,durationMs:18000,intervalMs:3000})],{cost:290,castMs:2000,minRange:0,maxRange:30,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/corruption.go'}),
 row('warlock','immolate',11668,'mana','cast',[c('damage','fire',.2,{min:258,max:258}),c('periodic-damage','fire',.13,{min:97,max:97,durationMs:15000,intervalMs:3000,reusePreviousHit:true})],{cost:370,castMs:2000,minRange:0,maxRange:30,referenceSource:'https://github.com/isfir/wowsims-turtle/blob/64cfa6ae2777b20bc95f3573dd9b2572634dddd7/sim/warlock/immolate.go'}),
 row('warrior','heroic-strike',11567,'rage','queued-melee',[c('weapon','mainhand',1,{flat:138})],{cost:15,castMs:0,minRange:0,maxRange:5,referenceSource:'https://www.wowhead.com/classic/spell=11567/heroic-strike',learnability:'trainer-reference',requiredPolicy:['flatThreat','weaponPolicy']}),
 row('rogue','backstab',11281,'energy','instant',[c('weapon','mainhand',1.5,{flat:210})],{cost:60,castMs:0,minRange:0,maxRange:5,position:'behind',weaponSubclass:15,comboGain:1,referenceSource:'https://www.wowhead.com/classic/spell=11281/backstab',learnability:'trainer-reference',requiredPolicy:['weaponPolicy','acceptSourceConflict']}),
 row('warlock','shadow-bolt',11661,'mana','cast',[c('damage','shadow',3/3.5,{min:455,max:508})],{cost:370,castMs:3000,minRange:0,maxRange:30,referenceSource:coefficientSource,learnability:'trainer-reference'}),
 row('priest','greater-heal',10965,'mana','cast',[c('heal','healingPower',3/3.5,{min:1798,max:2007})],{cost:655,castMs:3000,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'trainer-reference'}),
 row('warrior','heroic-strike',25286,'rage','queued-melee',[c('weapon','mainhand',1,{flat:157})],{cost:15,castMs:0,minRange:0,maxRange:5,referenceSource:'https://www.wowhead.com/classic/spell=25286/heroic-strike',learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3,requiredPolicy:['flatThreat','weaponPolicy']}),
 row('rogue','backstab',25300,'energy','instant',[c('weapon','mainhand',1.5,{flat:225})],{cost:60,castMs:0,minRange:0,maxRange:5,position:'behind',weaponSubclass:15,comboGain:1,referenceSource:'https://www.wowhead.com/classic/spell=25300/backstab',learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3,requiredPolicy:['weaponPolicy','acceptSourceConflict']}),
 row('rogue','eviscerate',11300,'energy','instant',[c('combo','attackPower',null,{ranges:[[199,295],[350,446],[501,597],[652,748],[803,899]]})],{cost:30,castMs:0,minRange:0,maxRange:5,comboSpend:true,referenceSource:'https://octowow.st/index.php/rogue',requiredPolicy:['apPerComboPoint','acceptSourceConflict','spendOnMiss']}),
 row('paladin','holy-light',25292,'mana','cast',[c('heal','healingPower',2.5/3.5,{min:1590,max:1771})],{cost:660,castMs:2500,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('hunter','serpent-sting',25295,'mana','instant',[c('periodic-damage','nature',.2,{min:111,max:111,durationMs:15000,intervalMs:3000})],{cost:165,castMs:0,minRange:8,maxRange:35,referenceSource:'https://www.wowhead.com/classic/spell=25295/serpent-sting',costSource:'https://octowow.st/index.php/hunter',requiredPolicy:['acceptSourceConflict'],learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('mage','frostbolt',25304,'mana','cast',[c('damage','frost',3/3.5*.95,{min:515,max:556})],{cost:290,castMs:3000,minRange:0,maxRange:30,referenceSource:'https://us.forums.blizzard.com/en/wow/t/how-will-spell-power-work-in-classic/99279',learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('warlock','shadow-bolt',25307,'mana','cast',[c('damage','shadow',3/3.5,{min:482,max:539})],{cost:380,castMs:3000,minRange:0,maxRange:30,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('warlock','immolate',25309,'mana','cast',[c('damage','fire',null,{min:279,max:279}),c('periodic-damage','fire',null,{min:102,max:102,durationMs:15000,intervalMs:3000,reusePreviousHit:true})],{cost:380,castMs:2000,minRange:0,maxRange:30,referenceSource:coefficientSource,requiredPolicy:['componentCoefficients'],learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('priest','greater-heal',25314,'mana','cast',[c('heal','healingPower',3/3.5,{min:1966,max:2195})],{cost:710,castMs:3000,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('priest','renew',25315,'mana','instant',[c('periodic-heal','healingPower',.2,{min:194,max:194,durationMs:15000,intervalMs:3000})],{cost:410,castMs:0,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('shaman','healing-wave',25357,'mana','cast',[c('heal','healingPower',3/3.5,{min:1620,max:1851})],{cost:620,castMs:3000,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3}),
 row('druid','rejuvenation',25299,'mana','instant',[c('periodic-heal','healingPower',.2,{min:222,max:222,durationMs:12000,intervalMs:3000})],{cost:360,castMs:0,minRange:0,maxRange:40,referenceSource:coefficientSource,learnability:'book-required-or-confirmed',referenceAvailableFromPhase:3})
].map(r=>{if(![13021,18881].includes(r.spellId)||!['mage:blast-wave','warlock:siphon-life'].includes(r.abilityId))return r;const observed=rankEvidence(r.abilityId,r.spellId);if(!observed)throw new Error('Missing observed rank for consolidated reference');return {...r,status:'reference-implementation',source:observed.source,record:{...observed,fields:{...r.record.fields,...observed.fields},unknown:[...new Set([...observed.unknown,...r.record.unknown])],conflicts:[...observed.conflicts,...r.record.conflicts]},requiredPolicy:[...new Set([...r.requiredPolicy,'acceptSourceConflict'])]};}));
// A class/spell ID must identify exactly one executable rank. Never silently select the first duplicate.
const referenceKeys=new Set();for(const r of REFERENCE_RANKS){const k=r.classId+':'+r.spellId;if(referenceKeys.has(k))throw new Error('Duplicate executable reference rank: '+k);referenceKeys.add(k);}
export function referenceRanks(classId){return REFERENCE_RANKS.filter(r=>r.classId===classId).map(r=>structuredClone(r));}
export function referenceRank(classId,spellId){const r=REFERENCE_RANKS.find(r=>r.classId===classId&&r.spellId===spellId);if(!r)throw new Error('No executable reference rank: '+classId+' '+spellId);return structuredClone(r);}
