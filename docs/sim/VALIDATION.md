# Validation record

## Checks performed

`node --test tests/sim/core.test.mjs`: five tests passed on 11 November 2026.

- Chronological ordering, explicit tie priority and stable insertion order.
- Heap ordering against a sorted oracle for 10,000 events.
- Scheduling at the current timestamp, rejection of past/fractional/invalid
  timestamps and resetting between encounters.
- Seed-zero handling, pinned RNG output and rejected invalid seeds.
- 1,000 independent iteration streams, identical under sequential and four-way
  partitioned execution.

These are engine-foundation tests. **They are not 1,000 combat iterations, DPS
benchmarks, a performance claim, or class validation.**

No nonzero class simulation, upstream numerical comparison, browser worker
integration, persistence, gear/talent control, build-sharing or production-path
test has been performed. Existing dashboard files have not been changed.

## Required numerical reference fixture

### Official talent follow-up checks

`node --test tests/sim/*.test.mjs`: 10 tests pass (five existing core tests and
five talent tests). `python -m unittest discover -s tests/sim -p 'test_*.py'`:
four offline importer tests pass. The additional checks cover the 54-entry
snapshot, tree totals and prerequisites, custom rank parameters, tier/level
restrictions, transactional removal, serialisation, split JSON chunks, lazy
references, cyclic references and rejecting incomplete/non-calculator pages.

No network is used by these tests. Passing them verifies parsing/allocation,
not the talents' combat effects or server accuracy.

Each case must store:

1. Class/spec, engine and ruleset revisions, upstream commit or live version.
2. Full gear including enhancements and set bonuses; exact talent ranks.
3. Buffs/debuffs/consumables and their stacking assumptions.
4. Rotation priorities, thresholds, opener and cooldown plan.
5. Encounter duration/variation, target stats, latency/batching and resources.
6. Seed and iteration count; note if a reference does not expose a seed.
7. Expected and actual means, variance, uncertainty and distribution samples.
8. Ability counts, attack outcomes, damage ranges, resource flows and aura uptime.
9. Known unsupported mechanics, observed differences and their explanations.

Matching output from an adapter and the same vendored engine only validates
wiring. It cannot independently validate the inherited game formulas. Use
controlled game observations and an independent reference where possible.

Never treat an arbitrary percentage tolerance as a substitute for investigating
a known coefficient error. For Monte Carlo comparisons, report sampling
uncertainty and individual mechanism checks. Use paired seeds where the random
streams remain meaningfully comparable; explain divergence when changes consume
different random events.

## Warrior acceptance gate — all outstanding

- Talent ranks/prerequisites: published calculator metadata imported; combat
  effects and higher ability-rank data still require implementation/validation.
- Resolve remaining first-party ability-rank and hidden-mechanic discrepancies.
- Verify race/base stats, one/two-handed/dual-wield restrictions and item effects.
- Check attack tables, mitigation, rage generation/spending and swing timing.
- Validate abilities, queue interactions, stances, cooldowns, talents and procs.
- Complete the common gear/talents/buffs/rotation and results experience.
- Run real 1,000-iteration browser simulations with progress and cancellation.
- Compare matched builds with the dedicated reference and controlled game data.
- Test saved builds, schema validation, URL sharing and repeatability.
- Verify `/OctoBot/sim/` and unchanged Population/Status navigation.
- Record any difference and pass the completion checklist before Rogue begins.
