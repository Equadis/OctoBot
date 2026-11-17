# OctoSim MVP — reference implementation status
Development branch only; production remains gated. The planner's public Run Simulation stays disabled.

## Research execution
99 executable rank definitions across nine classes, 82 distinct abilities, including 58 external-only/staging-reference rank definitions. Agony and Doom now replace one another per caster/target, Agony ramps base damage separately from spell power, and Power Word: Shield is compiled with explicit shield and lockout inputs. APS reports actual absorption, not shield capacity. Added Mage AoE, Pyroblast, Blizzard, Priest Holy Fire and Smite, and Warlock damage-linked self-healing. Database and archived changes remain separate for conflicting rank values. Channel application and leech basis require explicit policies; stationary ground effects use the supplied target list. Staging Flash of Light rank 7 and Holy Shock rank 4 are explicitly acknowledged reference inputs; Holy Shock supports one chosen role per rotation and explicit proc-driven cooldown reset probability. Warrior Slam, Mortal Strike, Whirlwind and Cleave and Paladin Consecration have explicit reference models. Consecration uses supplied declining tick multipliers rather than the old constant-tick Turtle formula; unknown live scaling and stance restrictions remain explicit inputs. The actual build compiler uses unrounded sheet values, rank identity and explicit rules. The opt-in reference lab runs one learned spell using a worker; the CLI, adapter and configured-rotation lab run explicitly configured supported rotations. Unsupported actions are rejected, not removed. The phase filter prevents known AQ-book ranks from being selected during BWL. Reference-only phase and learnability still require confirmation on OctoWoW.

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
- Browser integration has passed CI smoke tests on all nine class planners and both reference workers; actual live combat validation remains outstanding.
No claim of full simulator completion or validated DPS.

Warrior swings can now generate rage using explicit damage/speed/hand/critical/rounding policies. Incoming rage and single-outcome miss refunds accept explicit policies. Exact server coefficients are not assumed. The configured rotation template exposes rage inputs; the isolated benchmark remains a fixed starting-resource experiment.

Timed casting proc research now consumes temporary buffs on a successful action start: Hot Streak (imported 2-rank, 5-stack version), Searing Light (60% mana discount), and Nightfall (instant guaranteed landed Shadow Bolt; duration explicitly supplied). Trigger eligibility comes from imported class talent descriptions, not older forum revisions; no live proc validation. Only compiled eligible trigger and consumer spells are included.

Fixed-form Feral reference: Claw, Shred, Rake, Rip, Ferocious Bite, Swipe, Savage Bite. Explicit paw damage and hit/speed inputs replace equipped weapon damage. Extra Energy percentage scaling, target-owned bleed count, Primal Fury and Ancient Brutality CAT effects, Bear leech and charged Stormstrike Nature damage have research implementations. Hunter Raptor Strike is reference-queued with explicit weapon coefficient. No live validation; legacy rank values are not presented as observed OctoWoW data.

Hunter Arcane Shot (explicit ranged vs spell defense and magical resistance), dual-hand Mongoose Bite, Wing Clip, Volley, Druid Hurricane, Warrior Rend and Rogue Hemorrhage are additional executable reference models. Current guide/archived differences require confirmation; stationary ground effects and slows are not live movement models. Hemorrhage uses a per-target charged physical vulnerability rather than globally increasing AP.

The readiness inventory separates database observations from external rank references, and includes source discrepancies in either category without promoting their validation status.

Crusader Strike: all five official-guide ranks with stacked Holy flat bonus (5/9/14/21/29 per stack, up to five), explicit AP scaling and Holy bonus policy, plus Blessed Strikes cooldown reset in the adapter. Illumination uses the undiscounted cost on crit; Vengeance stacks dynamically on damaging crits. Envenom: exact imported tooltip durations and 30% poison modifiers; poison application itself requires the separate weapon proc policy. No live confirmation of individual spell database records.

Experimental per-hand poison models bind to explicitly eligible damaging physical contacts and white attacks, respect independent weapon charges, explicit resist/crit/application policies, imported Vile/Improved/Efficient Poisons and Vigor talents, Envenom, and shared Deadly Poison stacks. Instant/Deadly/Wound/Agitating damage only; Wound healing reduction, Crippling/Mind-numbing utility effects, force-application attacks and poison rank measurement are outstanding. Single-rank and rotation templates require the explicit model rather than inventing exact current-server numbers.

Seal of Righteousness and Seal of Command are mutually exclusive timed self auras, with explicit white-hit rate/PPM, weapon-basis, scaling, outcomes and threat policies. Judgement consumes the active seal under the explicit cast/landed policy and selects its damage model. The single-rank lab cannot cast Judgement in isolation; use the rotation lab. Twisting, utility seals and Judgement debuff refreshing are still outstanding. Crusader Strike now accepts explicit weapon and Holy Spell Power coefficients alongside the official-guide base values; older archived formula variations must not be mistaken for current server observations.
