# OctoSim MVP — reference implementation status
Development branch only; production remains gated. The planner's public Run Simulation stays disabled.

## Research execution
59 executable rank definitions across nine classes, 47 distinct abilities, including 27 external-only rank definitions. Warrior Slam, Mortal Strike, Whirlwind and Cleave and Paladin Consecration have explicit reference models. Consecration uses supplied declining tick multipliers rather than the old constant-tick Turtle formula; unknown live scaling and stance restrictions remain explicit inputs. The actual build compiler uses unrounded sheet values, rank identity and explicit rules. The opt-in reference lab runs one learned spell using a worker; the CLI, adapter and configured-rotation lab run explicitly configured supported rotations. Unsupported actions are rejected, not removed. The phase filter prevents known AQ-book ranks from being selected during BWL. Reference-only phase and learnability still require confirmation on OctoWoW.

External source provenance is attached to each rank. ClassicDB healing rows and a pinned WoWSims Turtle commit are reference values, not live OctoWoW evidence. The Fireball, sting, Backstab and Eviscerate conflicts must be acknowledged. Unknown coefficients and observed costs must be supplied rather than silently imputed.

## Local reference command
Run from repository root:
```sh
node tools/sim/reference-scenario.mjs explicit-scenario.json results.json
```
The JSON contains build, exact gearById, learnedSpellIds, rankByAbility, policies, encounter, optional rows, seed and iterations. See the tests for explicit inputs. The result includes rank provenance, seeded distributions, example combat events and limitations.

## Release blockers
- Complete rank/effect implementation for all registered abilities and actual learnability.
- Live capture verification for cast, damage, resource, hit, crit, cooldown, tick timing and procs.
- Verified missing race/class and companion base data.
- Dynamic class talents, weapon imbues, poisons, pet abilities, trinket swaps, item/set procs, raid aura behaviour, complete tank mechanics, automatic resource regeneration and resistances still require implementation and verification. Scripted incoming damage, shields, dynamic swing haste, chained targets, ammunition, combo bleeds, health conversion and periodic consumption now have research runtime support.
- Browser integration is branch-only and needs real-browser smoke testing.
No claim of full simulator completion or validated DPS.
