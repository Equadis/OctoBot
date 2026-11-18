# Phase 1 development handoff
The audit, reference reconciliation, capture addon and evidence review tooling are implemented. The new packet CLI combines raw reviewed base and exact spell observations for a single realm/phase/client build. Run:
```
node tools/sim/audit-data-integrity.mjs
node tools/sim/audit-base-reconciliation.mjs
node tools/sim/review-integrity-packet.mjs packet.json
```
Packet shape: {"realm":"actual realm","phase":"actual phase","clientBuild":"actual build","base":[],"spells":[]}. See evidence-review and spell-evidence-review for record fields. Explicit context prevents pooling unrelated realms/patches. Candidate observations require manually authenticated raw evidence; reports do not write runtime data or assert public readiness. Unknown fields and identity blockers remain visible independently of numerical candidates.

Evidence priorities: level 60 custom race/class naked stat observations, three anomalous Vanilla reference coordinates, exact spell rank identities (Holy Strike and Trueshot Aura availability), conflicting field costs/cooldowns, then repeated controlled damage and coefficient measurements. The addon remains untested on the actual client. Missing source data is an external dependency, not a passed release gate. Phase 2 shared combat formula work may proceed with explicit reference assumptions; no public simulation until independent numerical verification.
