# Phase 1 — Data integrity
Run `node tools/sim/audit-data-integrity.mjs` from the repository root. The JSON capture queue separates missing/anomalous base rows, existing non-live-verified reference rows, rank-level conflicts and unknown fields, and ability identity blockers. Counts are derived from the existing inventories, not duplicated constants.

## Evidence collection
For each base-stat coordinate record realm, phase, client build, race, class, level, timestamp, naked unbuffed attributes, health/mana, talents, racial effects and raw capture. Maximum health/mana is not necessarily base health/mana: record the extraction method and do not substitute displayed totals into base fields. Confirm recurring anomalies independently. No interpolation or borrowing another race is accepted as live evidence.

For spell observations record learned spell ID/rank, level, exact resource before/after, cast/cooldown timestamps, target armour/resistance, gear, buffs, talents, damage/healing outcomes and raw combat evidence. Separate direct observations from inferred coefficients; use controlled stat changes to estimate scaling, and retain contradictory measurements. Do not resolve a conflict merely by selecting a Classic reference.

Public execution remains disabled. This queue does not modify the engine's numerical inputs or promote any reference to verified status.
