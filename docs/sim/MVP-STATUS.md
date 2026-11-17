# OctoSim MVP — reference implementation status
Development branch only; production remains gated. The planner's public Run Simulation stays disabled.

## Research execution
74 executable rank definitions across nine classes, 61 distinct abilities, including 33 external-only/staging-reference rank definitions. Agony and Doom now replace one another per caster/target, Agony ramps base damage separately from spell power, and Power Word: Shield is compiled with explicit shield and lockout inputs. APS reports actual absorption, not shield capacity. Added Mage AoE, Pyroblast, Blizzard, Priest Holy Fire and Smite, and Warlock damage-linked self-healing. Database and archived changes remain separate for conflicting rank values. Channel application and leech basis require explicit policies; stationary ground effects use the supplied target list. Staging Flash of Light rank 7 and Holy Shock rank 4 are explicitly acknowledged reference inputs; Holy Shock supports one chosen role per rotation and explicit proc-driven cooldown reset probability. Warrior Slam, Mortal Strike, Whirlwind and Cleave and Paladin Consecration have explicit reference models. Consecration uses supplied declining tick multipliers rather than the old constant-tick Turtle formula; unknown live scaling and stance restrictions remain explicit inputs. The actual build compiler uses unrounded sheet values, rank identity and explicit rules. The opt-in reference lab runs one learned spell using a worker; the CLI, adapter and configured-rotation lab run explicitly configured supported rotations. Unsupported actions are rejected, not removed. The phase filter prevents known AQ-book ranks from being selected during BWL. Reference-only phase and learnability still require confirmation on OctoWoW.

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
- Dynamic class talents, weapon imbues, poisons, pet abilities, trinket swaps, item/set procs, raid aura behaviour, complete tank mechanics, live resource coefficients and automatic mana/energy regeneration and resistances still require implementation and verification. Scripted incoming damage, shields, dynamic swing haste, chained targets, ammunition, combo bleeds, health conversion and periodic consumption now have research runtime support.
- Browser integration is branch-only and needs real-browser smoke testing.
No claim of full simulator completion or validated DPS.

Warrior swings can now generate rage using explicit damage/speed/hand/critical/rounding policies. Incoming rage and single-outcome miss refunds accept explicit policies. Exact server coefficients are not assumed. The configured rotation template exposes rage inputs; the isolated benchmark remains a fixed starting-resource experiment.

Timed casting proc research now consumes temporary buffs on a successful action start: Hot Streak (imported 2-rank, 5-stack version), Searing Light (60% mana discount), and Nightfall (instant guaranteed landed Shadow Bolt; duration explicitly supplied). Trigger eligibility comes from imported class talent descriptions, not older forum revisions; no live proc validation. Only compiled eligible trigger and consumer spells are included.

Fixed-form Feral reference: Claw, Shred, Rake, Rip, Ferocious Bite, Swipe, Savage Bite. Explicit paw damage and hit/speed inputs replace equipped weapon damage. Extra Energy percentage scaling, target-owned bleed count, Primal Fury and Ancient Brutality CAT effects, Bear leech and charged Stormstrike Nature damage have research implementations. Hunter Raptor Strike is reference-queued with explicit weapon coefficient. No live validation; legacy rank values are not presented as observed OctoWoW data.
