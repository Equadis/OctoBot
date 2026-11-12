# Raid subsystem architecture

Everything the bot does about an Onyxia raid — seeing who is in the lair, deciding a raid has
formed/cleared, choosing whether to alert and whom, sending the alert, and recording it — as one
deliberate pipeline instead of the current tangle. This design is now IMPLEMENTED (all six migration
steps landed, 2026-09 — see "Migration COMPLETE" below); the one deferred piece is the
`FriendRosterSource` for concurrent raids.

## Why this exists (the tangle today)

- **Three overlapping trackers.** `RaidWatch`, `RaidTracker`, and `ClearTracker` each hold part of the
  raid state (arrivals/departures, cohorts+numbers, clear confirmation). Their boundaries are unclear,
  so a change to "when is a raid cleared" touches all three.
- **Roster acquisition is welded to `/who`.** `fetchRoster` (the 49-cap class-bucket slicing) is called
  directly in the poll loop. There is nowhere to add a second source (the friends-list idea) without
  rewiring detection.
- **Alerting is inlined in `index.ts`.** `processLane` → `gateAndAnnounce` / `announceRaidEnding` /
  `recordBuff` mix five concerns in one place: dedup, buff cooldown, crossfaction city routing, message
  rendering, and delivery to Discord/whisper/yell.
- **Cross-cutting logic is duplicated.** Dedup lived in *three* shapes (per-cycle, per-raid-number, the
  cooldown remnant) before we untangled two of them; the fixes were surgical because there was no single
  seam to change.
- **Concurrent raids are ambiguous.** A lair `/who` returns a *mixed* roster, so the tracker can't cleanly
  separate two simultaneous raids — the root of the #64 and #67/#68 mis-splits.

## Principles

1. **One responsibility per layer, one seam per concern.** Dedup, cooldown, and routing each live in
   exactly one module.
2. **Pluggable roster source.** Detection consumes an interface, never `/who` directly — so a
   friends-list source (or a fused one) drops in without touching the tracker.
3. **A pure, replayable core.** The tracker is deterministic and clock-injected: feed it recorded
   `LairView`s, assert the events. No network, no DB, no time in the logic.
4. **Ports for the outside world.** Persistence, Discord, whisper pool, yell — all behind small
   interfaces the core doesn't know the shape of.
5. **Strangler migration, never a big-bang rewrite.** The bot is live; extract one layer at a time behind
   its interface with tests green at each step.

## The pipeline

```
                 RosterSource            RaidTracker              RaidAlertPolicy         AlertDelivery
  /who ─┐      ┌─────────────┐        ┌──────────────┐          ┌───────────────┐       ┌────────────┐
 friends├────► │ LairView    │ ─────► │ raid state    │ ──────►  │ dedup+cooldown│ ────► │ Discord    │
  (later)      │ {present,   │  tick  │ machine:      │ Raid…    │ +faction route│ Alert │ Whisper    │
               │  complete}  │        │ identity,     │ Event    │ → decision    │Decision│ Yell       │
               └─────────────┘        │ cohorts,      │          └───────┬───────┘       └────────────┘
                                      │ lifecycle     │                  │ reads
                                      └──────┬────────┘          ┌───────▼───────┐
                                             │ persists          │  BuffTracker  │  drops, saved-head,
                                    ┌────────▼────────┐          │  cooldown     │  cooldown state
                                    │ RaidStateStore  │          └───────────────┘
                                    └─────────────────┘
```

`RaidService` (orchestrator) is the only place these are wired together.

### 1. `RosterSource` — who is in the lair

```ts
interface LairView { readonly present: readonly LairPlayer[]; readonly complete: boolean; readonly at: number }
interface LairPlayer { readonly name: string; readonly faction: Faction | null; readonly guid?: bigint }
interface RosterSource { poll(): Promise<LairView> }
```

- Isolates all `/who` mess (the 49 cap and class-bucket slicing in `roster.ts`; spreading the queries
  over every in-world character and pacing them in `net/who-pool.ts`) behind one call. `complete` tells the tracker how much to trust the view.
- Implementations: `WhoRosterSource` (wraps `fetchRoster`), later `FriendRosterSource` (below), later a
  `FusedRosterSource` that trusts friend pushes and backfills gaps with `/who`.
- A `SnapshotRecorder` decorator taps every `LairView` into the `snapshots` store for replay — recording
  is not the tracker's job.

### 2. `RaidTracker` — the state machine (replaces RaidWatch + RaidTracker + ClearTracker)

One module owning raid **identity, cohort partitioning, and lifecycle**, as a small state machine per
raid plus a manager that partitions each `LairView` into raids.

```ts
type RaidPhase = "forming" | "at-strength" | "ending" | "cleared" | "disbanded"
interface TrackedRaid { number: number; phase: RaidPhase; roster: Set<string>; formedAt: number; … }
type RaidLifecycleEvent =
  | { kind: "formed";    raid: TrackedRaid }
  | { kind: "at-strength"; raid: TrackedRaid }
  | { kind: "ending";    raid: TrackedRaid; elapsedMs: number }
  | { kind: "cleared";   raid: TrackedRaid; durationMs: number; killConfirmed: boolean }
  | { kind: "disbanded"; raid: TrackedRaid }
  | { kind: "stand-down"; raid: TrackedRaid }   // a forming we announced that fizzled
class RaidTracker { observe(view: LairView): RaidLifecycleEvent[]; snapshot(): RaidTrackerState; restore(s): void }
```

- **Concurrent raids are first-class.** The manager partitions a `LairView` into cohorts (arrival window /
  guild / grouping mode) and tracks each as a distinct `TrackedRaid` with its own number and phase — so
  two simultaneous raids are two objects, not one mixed blob. This is where the #64 / #67-#68 mis-splits
  are prevented, and where a `FriendRosterSource` shines (see below).
- **Completeness-aware.** A `complete: false` view never confirms a clear or a split on its own —
  departures on a truncated view are held, matching today's ClearTracker guard, but in one place.
- Persists via a `RaidStateStore` port so a restart resumes mid-raid.

### 3. `RaidAlertPolicy` — whether, and to whom (the single dedup/cooldown/routing seam)

```ts
interface AlertDecision { readonly cities: readonly Faction[]; readonly suppressedReason?: string }
interface RaidAlertPolicy { decide(event: RaidLifecycleEvent, buff: BuffState): AlertDecision }
```

Everything that today is scattered across `gateAndAnnounce`, `announceRaidEnding`, `shouldBroadcastRaid`,
and the cooldown checks collapses here:

- **Per-raid dedup** — fire once per raid number per kind (survives restarts via the dedup ledger port).
- **Buff cooldown** — drop a city still within `buffCooldownMs` of its last drop.
- **Faction routing** — crossfaction ⇒ both cities; faction mode ⇒ the raid's own side.

Pure given `BuffState`; the whole gating story is one file with one test suite.

### 4. `AlertDelivery` — rendering and sending

- **Formatters** (message text) stay separate from **sinks** (how it's sent). One `AlertSink` per
  channel: `DiscordSink` (role pings), `WhisperSink` (subscriber broadcast via the pool, presence-gated —
  route B), `YellSink` (in-city). Delivery renders once and fans to the enabled channels named by the
  `AlertDecision`. Adding a channel = one sink; changing wording = one formatter.

### 5. `BuffTracker` — the drop/cooldown domain (adjacent, not inside the raid tracker)

- Owns detected drops (`recordBuff`), duplicate-detection dedup (`RecentBuffs`), saved-head vs fresh
  classification (`drop-origin`), the per-faction last-drop/cooldown state, and clear-duration recording.
- Exposes `BuffState` (last drop per faction, cooldown remaining) to the policy, and emits its own
  "buff dropped" alert through the same delivery layer. Detected drops are ground truth — never gated by
  the cooldown; the cooldown only gates *expectation* (park alerts).

### Orchestration

```ts
// once per poll tick:
const view = await source.poll()
for (const event of tracker.observe(view)) {
  const decision = policy.decide(event, buffs.state())
  if (decision.cities.length) await delivery.send(event, decision)
}
// on a heard buff yell (listeners): buffs.record(...) → delivery.send(dropAlert)
```

`RaidService` holds this loop. `index.ts` shrinks to wiring: build the sources/stores/sinks, construct
the service, hand it the poll tick and the buff-yell callback.

### Several lairs

Onyxia's Lair and Blackwing Lair both feed the Rallying Cry, so the loop above runs once per lair.

- **Per lair** (`RaidZoneServices`, built in `index.ts` with `raid-zone-setup.ts`): the `RosterSource` and its
  poll cadence, the lanes (`RaidTracker`s), the broadcast ledger, the duration store, the snapshot store,
  the `LairActivity` signal and the Discord channel. `raid-zone-pipeline.ts` is the loop for one lair.
  Onyxia keeps its original lane labels and collections, so a deploy resumes a raid in progress; BWL's
  are named apart (`RAID_ZONE_STORE_NAMES`). Raid state and lockouts share one store, keyed by lane label.
- **Shared** (`RaidService`): the buff cooldown (one buff, either head), the drop whisper,
  the capital status yell listing every lair's raid, and the heartbeat with each lair's timer.
- **Drops**: `BuffTracker` reads each drop's head off the yell and classifies it against that head's
  lair's `LairActivity`. The post goes to that lair's channel.
- Chronicle early-confirm is Onyxia only; BWL's clears wait out the sustained wait.

## How it resolves the specific pains

| Pain we hit | Where it lives now (tangled) | Where it lives after |
|---|---|---|
| `/who` 49-cap + throttle | `fetchRoster` called in the loop | `WhoRosterSource` behind `RosterSource` |
| dedup in three shapes | `gateAndAnnounce`, `announceRaidEnding`, `shouldBroadcast*` | `RaidAlertPolicy` (one place) |
| cooldown gating | inlined per call site | `RaidAlertPolicy` reads `BuffState` |
| crossfaction routing | `lane.cities` loops in index.ts | `RaidAlertPolicy` routing |
| spurious splits / concurrent raids | mixed across 3 trackers | `RaidTracker` cohort partitioning |
| can't add a roster source | `/who` hard-wired | new `RosterSource` impl, zero tracker change |

## How the friends-list idea plugs in

The friends-list membership feed (per-listener 50-slot lists, one listener per raid — see the design
discussion) is **just a `RosterSource`**, gated on verifying the friend `area` field resolves to the lair
(2159). Because each listener's friend list *is* one raid's roster, a `FriendRosterSource` can emit per-raid
`LairView`s that are already cleanly separated — feeding the `RaidTracker`'s per-raid cohorts directly and
sidestepping the mixed-`/who` ambiguity. It requires **no change to the tracker, policy, or delivery** —
that extensibility is the whole point of the seam.

## Migration path (strangler, tests green at each step)

1. **Extract `RosterSource`.** Wrap `fetchRoster` in `WhoRosterSource`; the loop calls the interface.
   Behaviour-identical; pure refactor.
2. **Extract `AlertDelivery` + formatters.** Move the Discord/whisper/yell sends out of `gateAndAnnounce`
   behind sinks. Still driven by the old inline gating for now.
3. **Extract `RaidAlertPolicy`.** Fold `shouldBroadcastRaid` + cooldown + routing into one `decide()`; the
   loop calls it and hands the decision to delivery. Delete the scattered gating.
4. **Consolidate the trackers into `RaidTracker`.** Merge `RaidWatch`/`RaidTracker`/`ClearTracker` into one
   state machine emitting `RaidLifecycleEvent`s; port the existing tests onto replayed `LairView`s.
5. **Extract `BuffTracker`.** Pull `recordBuff`/`RecentBuffs`/`drop-origin`/duration recording together and
   expose `BuffState` to the policy.
6. **Land `RaidService`** as the single orchestrator; `index.ts` becomes wiring only.

Each step is independently shippable and reversible; the live bot never sees a big-bang cut-over.

**Migration COMPLETE (2026-09): all six steps landed**, each behaviour-identical with its own unit
tests (676 in total). `RosterSource` (`WhoRosterSource`), `AlertDelivery`, `RaidAlertPolicy`, the
unified `RaidTracker`, `BuffTracker`, and `RaidService` (`src/raid-service.ts`, the `createRaidService`
factory) are all extracted and live. `index.ts` is wiring only for detection now (1627 lines, down
from ~2070): it builds the sources/stores/sinks and the service, and hands the service the poll loop,
the buff-drop sink and the yell timer. The service runs the pipeline — the poll `LairView` →
`RaidTracker.observe()` `RaidLifecycleEvent`s (`formed`/`cleared`/`resumed`) → `alertPolicy.decide()` (reading
`BuffTracker`'s last-drop/cooldown state) → `delivery.sendCityAlert()` — plus the disband stand-down,
Chronicle early-confirm, about-to-clear heads-up, buff-drop announce and heartbeat log. `BuffTracker`
owns the buff-drop domain (dedup + fresh/saved/unknown classification + persistence + cooldown state).
The old inline gating and the three overlapping trackers are gone.

**Step 4 was done as consolidation, NOT the concurrent-raid rewrite — deliberately.** `RaidTracker`
composes `PresenceTracker` + one `ClearTracker` over the whole roster (the authoritative,
thoroughly-tested single-raid path), and the dead count/temporal shadow detectors were deleted
(`RaidSessions` entirely; `CohortDetector`'s class, keeping only the raid-event vocab in
`raid-events.ts`). The doc's concurrent-raid cohort partitioning was **not** built, on a finding made
during the work: that partitioning IS the guild/pickup approach the codebase already demoted for
flaky per-cohort transitions ("a guild crossing the split line, a flickery /who, a wipe"), and the
#64/#67-#68 mis-splits it was meant to fix were actually incomplete-`/who` (completeness) bugs,
already handled by `ClearTracker`'s `complete:false` hold. Concurrent-raid separation is therefore
deferred to the **`FriendRosterSource`** (see below) — per-listener friend lists yield pre-separated
per-raid rosters, so the tracker gets clean concurrency with no flaky `/who` guessing. The
`RaidLifecycleEvent` stream is the seam that lets that source drop in later without touching the loop.

**Step 5 note:** clear-DURATION recording was deliberately left in the raid-timer path (it feeds the
about-to-clear prediction, not buff state) rather than folded into `BuffTracker` per the doc, to avoid
spreading the buff module into the clear handler.

Still to do (optional, when wanted): the `FriendRosterSource` for concurrent raids — the one piece
deliberately deferred (see the step 4 note above). It drops in as a new `RosterSource` behind the
existing seam, needing no change to the tracker, policy, delivery or service.

## Testing

- `RaidTracker`, `RaidAlertPolicy`, `BuffTracker`, and the roster codecs are **pure** — driven by fixtures
  and injected clocks, no network or DB. The concurrent-raid, spurious-split, dedup, and cooldown cases
  become table-driven unit tests.
- Ports (stores, sinks) are faked in tests and real in `index.ts`. The only thing that needs the live
  server is the `RosterSource` implementation — the one seam where reality is unavoidable.
