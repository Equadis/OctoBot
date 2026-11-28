# OctoCombatCapture (experimental)
Copy this directory into the 1.12 client's Interface/AddOns directory. Client compatibility and event availability require live verification. No live capture is bundled.

1. Prepare an isolated controlled encounter, record the exact build, level, gear, buffs and target.
2. Use `/octocombat start`, perform the encounter, then `/octocombat stop`. Log out or use `/reload`.
3. Find the addon saved-variable file under WTF/Account/<account>/SavedVariables. Keep the original local and back it up before clearing. Combat text can include player names: review/redact before sharing. No private chat events or automatic upload are implemented.
4. From the repository root, run `node tools/sim/review-combat-captures.mjs PATH_TO_LUA raw-capture.json`.

The importer checks record format, monotonic clocks, sequence continuity and session boundaries. Raw text is not yet a normalized damage/healing log; local timestamping, locale, event availability, source/target attribution, completeness and actual effects must be independently checked before comparison. Missing events are not zero damage. A manually completed capture is not proof of full event coverage. Use explicitly attributed observations with the normalized log verification module only after reviewing the raw evidence.
