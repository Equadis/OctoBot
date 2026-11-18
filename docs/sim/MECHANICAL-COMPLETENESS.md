# Phase 3 — Mechanical completeness
The first shared timed/proc effect adapter accepts explicitly sourced on-use and landed/critical attack-triggered stat auras or resource restoration, per-effect cooldowns, optional shared cooldown, and aura exclusivity. It is opt-in research, not a complete item catalogue; exact source names and eligibility are supplied, and a proc is not a permanent character-sheet bonus. Item/set/enchant/consumable identities and all numerical values still require mapping and validation. Proc auras activate after the triggering attack outcome is calculated; they can affect subsequent events. No public gate changes.

## Restoration consumables
Selected source-observed, exact single-resource or health restoration tooltips compile into actual scheduled uses with bounded inventory, explicit individual/shared cooldown assumptions and sampled ranges. Unsupported compound effects fail closed. Cooldown values remain research inputs rather than verified server claims.

## Companion stats
Owner-to-pet inheritance and known Great Stamina health contribution may now be explicitly applied to raw companion inputs. Included mode disallows duplicate application. No custom family coefficients or unseen trained ranks inferred; armour and resistance training remain unsupported by this adapter.

## Trinket swap reference transition
The equipment runtime can transition explicitly scheduled before/after loadouts with preserved cooldowns, equip lock, and configurable old aura retention. The build adapter checks replacement legality, exact item IDs for loadout effects and unchanged static combat snapshot; it rejects stat-changing swaps. The combat drop is an acknowledged research scenario input, not an actual Vanish/Feign Death cast or success model. Public readiness stays blocked; integration of real cast outcomes and dynamic stat/attack-table changes remains outstanding.
