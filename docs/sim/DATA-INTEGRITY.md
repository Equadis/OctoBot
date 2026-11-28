# Phase 4 — Data integrity
Run `node tools/sim/audit-data-integrity.mjs` from the repository root. The JSON capture queue separates missing/anomalous base rows, existing non-live-verified reference rows, rank-level conflicts and unknown fields, and ability identity blockers. Counts are derived from the existing inventories, not duplicated constants.

## Evidence collection
For each base-stat coordinate record realm, phase, client build, race, class, level, timestamp, naked unbuffed attributes, health/mana, talents, racial effects and raw capture. Maximum health/mana is not necessarily base health/mana: record the extraction method and do not substitute displayed totals into base fields. Confirm recurring anomalies independently. No interpolation or borrowing another race is accepted as live evidence.

For spell observations record learned spell ID/rank, level, exact resource before/after, cast/cooldown timestamps, target armour/resistance, gear, buffs, talents, damage/healing outcomes and raw combat evidence. Separate direct observations from inferred coefficients; use controlled stat changes to estimate scaling, and retain contradictory measurements. Do not resolve a conflict merely by selecting a Classic reference.

Public execution remains disabled. This queue does not modify the engine's numerical inputs or promote any reference to verified status.

## Review a capture packet

Run `node tools/sim/review-integrity-packet.mjs packet.json`. Use one realm, phase and client build per packet. Carry the same values on each observation alongside its capture ID, independent observer ID and raw evidence reference. The queue starts with the 19 missing level-60 builds, followed by the three flagged rows and the remaining levels. Base observations for existing reference rows are also reported with their deltas so corroboration can cover the entire table.

- `base` accepts reviewed extraction of five naked attributes and raw class health and mana. The stat capture add-on supplies client observations for comparison, including displayed resource maxima. An extraction still needs an independently documented method before it can enter this array.
- `spells` accepts deterministic observations of an exact queued rank and field. Include units and controlled conditions. Timing uses milliseconds, mana costs use mana, and learn level uses character level. Distinct results from different condition groups remain visible as condition-dependent.
- `identities` accepts records with `method: "learned-cast-identity"`, `learned: true`, the exact English `spellName`, `abilityId`, `rank` ordinal, `characterLevel`, numeric `spellId` and an `idSource` of `client-spell-link` or `cast-event-id`. Record Holy Strike ranks individually. Record the reported single Trueshot Aura as ordinal 1. If a separately learned rank 2 or 3 is observed, submit it at its own ordinal so the reviewer flags a conflict with the single-rank model. The optional spell link captured by OctoSimCapture is supporting evidence and should still be checked against its spellbook entry.
- `companions` accepts `method: "clean-companion-observation"`, `classId`, `pet` family or demon, `level`, `ownerLevel`, `conditions`, `ownerUnbuffed: true`, `companionUnbuffed: true`, `trainingRecorded: true` and `stats`. The required measurements are max health, attack power and spell power. The report tracks armour and school resistances when captured.
- `inheritance` accepts `method: "controlled-companion-stat-pair"` with the same companion context, `oneVariableChanged: true`, `ownerStat`, `petStat` and `ownerBefore`, `ownerAfter`, `petBefore`, `petAfter`. Record the actual values so different control pairs stay separate. The reviewer reports observed deltas. Estimating an inheritance coefficient requires reviewed measurements across multiple controlled changes.

Independent agreeing captures are candidates for authentication. The reviewer leaves runtime tables and public readiness unchanged.
