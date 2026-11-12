import { describe, expect, it } from "vitest";
import { ClearTracker } from "./clear-tracker.js";

const MIN = 60_000;
/** `n` roster members r0..r(n-1); a smaller n is a subset (a wipe trough of the same raid). */
const R = (n: number): string[] => Array.from({ length: n }, (_, i) => `r${i}`);
/** `n` DIFFERENT people c0..c(n-1) — a new crowd / ambient traffic. */
const C = (n: number): string[] => Array.from({ length: n }, (_, i) => `c${i}`);

function tracker(over: Partial<ConstructorParameters<typeof ClearTracker>[0]> = {}) {
  return new ClearTracker({ formAt: 15, sustainedMs: 5 * MIN, ...over });
}

describe("ClearTracker", () => {
  it("does not track until the zone reaches raid strength", () => {
    const t = tracker();
    expect(t.observe(R(10), 0, false).clear).toBeNull();
    expect(t.tracking).toBe(false);
    expect(t.observe(R(15), MIN, false).clear).toBeNull();
    expect(t.tracking).toBe(true);
  });

  it("reports a formation the poll it reaches strength, with the peak, and only that poll", () => {
    const t = tracker();
    expect(t.observe(R(10), 0, false).formed).toBeNull(); // below strength — no formation
    const formed = t.observe(R(18), MIN, false).formed;
    expect(formed).not.toBeNull();
    expect(formed?.peak).toBe(18);
    expect(t.observe(R(20), 2 * MIN, false).formed).toBeNull(); // already formed — not re-reported
  });

  it("TOLERATES a wipe — the same members drop out and run back inside the window", () => {
    const t = tracker();
    t.observe(R(30), 0, false); // formed
    expect(t.observe(R(6), 2 * MIN, false).clear).toBeNull(); // wipe: only 6 of the roster visible
    expect(t.observe(R(9), 4 * MIN, false).clear).toBeNull(); // still low, still inside 5 min
    expect(t.observe(R(30), 5 * MIN, false).clear).toBeNull(); // same members ran back → recovered
    expect(t.tracking).toBe(true); // still the same raid
  });

  it("CONFIRMS a clear when the roster leaves and stays gone past the window", () => {
    const t = tracker();
    t.observe(R(30), 0, false); // formed at 0
    // ...raid runs, then everyone leaves at 40 min and does not come back
    t.observe(R(30), 40 * MIN, false);
    expect(t.observe(R(2), 41 * MIN, false).clear).toBeNull(); // departure begins
    expect(t.observe(R(0), 45 * MIN, false).clear).toBeNull(); // 4 min in — not yet
    const clear = t.observe(R(0), 46 * MIN, false).clear; // 5 min sustained
    expect(clear).not.toBeNull();
    expect(clear?.durationMs).toBe(41 * MIN); // form(0) → departure start(41m), spanning nothing here
    expect(t.tracking).toBe(false); // reset, ready for the next raid
  });

  it("spans wipes: the duration runs from form through every wipe to the final departure", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(5), 10 * MIN, false); // wipe
    t.observe(R(30), 12 * MIN, false); // back
    t.observe(R(4), 30 * MIN, false); // wipe
    t.observe(R(30), 33 * MIN, false); // back
    t.observe(R(1), 50 * MIN, false); // real departure begins at 50m
    const clear = t.observe(R(0), 56 * MIN, false).clear; // sustained 6 min
    expect(clear?.durationMs).toBe(50 * MIN); // 0 → 50m, wipes absorbed
  });

  it("a DIFFERENT crowd arriving does NOT keep the old raid alive (roster sync)", () => {
    const t = tracker();
    t.observe(R(30), 0, false); // raid r0..r29
    // the raid leaves; 20 unrelated players are now in the lair
    t.observe(C(20), 20 * MIN, false); // cohort of the OLD roster = 0
    const clear = t.observe(C(20), 26 * MIN, false).clear; // old roster gone 6 min → clear
    expect(clear?.durationMs).toBe(20 * MIN);
  });

  it("does NOT confirm a clear while the /who view is incomplete (a packed-lair undercount)", () => {
    const t = tracker();
    t.observe(R(30), 0, false); // formed, roster r0..r29
    // Packed lair: /who truncated and slices timed out, so it shows only a few of the roster.
    // That below-floor count is unreliable and must not start or confirm a clear.
    expect(t.observe(R(2), 10 * MIN, false, false).clear).toBeNull();
    expect(t.observe(R(2), 20 * MIN, false, false).clear).toBeNull();
    expect(t.observe(R(2), 30 * MIN, false, false).clear).toBeNull(); // even long past sustainedMs
    expect(t.pending()).toBeNull(); // no pending departure was ever started on the incomplete views
    // A COMPLETE view starts the departure clock; it confirms only after the sustained wait.
    expect(t.observe(R(2), 40 * MIN, false, true).clear).toBeNull();
    const clear = t.observe(R(2), 46 * MIN, false, true).clear; // 6 min sustained on complete views
    expect(clear).not.toBeNull();
  });

  it("an incomplete undercount does not FALSELY clear a raid that a complete view shows is still there (#48)", () => {
    const t = tracker();
    t.observe(R(30), 0, false); // formed
    t.observe(R(3), 20 * MIN, false, false); // incomplete: looks below floor...
    t.observe(R(3), 25 * MIN, false, false);
    expect(t.observe(R(28), 30 * MIN, false, true).clear).toBeNull(); // ...complete view: they were here
    expect(t.pending()).toBeNull(); // never falsely cleared
  });

  it("keeps a pending clear across an incomplete blip mid-departure (does not reset the clock)", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(2), 40 * MIN, false, true); // departure begins on a complete view
    t.observe(R(2), 42 * MIN, false, false); // an incomplete blip must not reset the pending clock
    const clear = t.observe(R(2), 46 * MIN, false, true).clear; // 6 min after belowSince → confirm
    expect(clear).not.toBeNull();
  });

  it("a blackout with an EMPTY lair after discards the raid (no false clear on a mass DC)", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(4), 10 * MIN, false); // everyone drops...
    expect(t.observe([], 11 * MIN, true).clear).toBeNull(); // ...and the lair is empty across the gap
    expect(t.tracking).toBe(false); // discarded, not recorded as a clear
  });

  it("RESUMES the same raid across a blind gap when its members are still present (keeps its number)", () => {
    let n = 100;
    const t = new ClearTracker({ formAt: 15, sustainedMs: 5 * MIN, nextNumber: () => ++n });
    t.observe(R(30), 0, false); // forms raid #101
    t.observe(R(30), 20 * MIN, false); // running
    const obs = t.observe(R(30), 26 * MIN, true); // 6-min server crash; SAME roster present after
    expect(obs.formed).toBeNull(); // NOT re-formed as a new raid
    expect(t.tracking).toBe(true);
    expect(t.number).toBe(101); // same number — no re-count
    t.observe(R(0), 40 * MIN, false);
    const clear = t.observe(R(0), 46 * MIN, false).clear; // still catches the real clear
    expect(clear?.number).toBe(101);
    expect(clear?.durationMs).toBe(40 * MIN); // form(0) → departure(40m), spanning the crash
  });

  it("discards the tracked raid across a blind gap when a DIFFERENT crowd is present (users don't match)", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    expect(t.observe(C(25), 26 * MIN, true).clear).toBeNull(); // recovery shows a different crowd
    expect(t.tracking).toBe(false); // the tracked raid is gone — discarded, no false clear
  });

  it("on recovery it resumes only its OWN roster — a second raid present is NOT merged in", () => {
    let n = 100;
    const t = new ClearTracker({ formAt: 15, sustainedMs: 5 * MIN, nextNumber: () => ++n });
    t.observe(R(24), 0, false); // raid B forms as #101
    t.observe(R(24), 20 * MIN, false);
    // crash; recovery shows raid B still there PLUS a second raid (c*) that arrived during the gap
    t.observe([...R(24), ...C(24)], 26 * MIN, true); // raid B matches → resume #101
    expect(t.number).toBe(101);
    t.observe([...R(24), ...C(24)], 30 * MIN, false); // both present — c* must NOT be absorbed into #101
    t.observe(C(24), 40 * MIN, false); // raid B leaves; only c* remains
    const clear = t.observe(C(24), 46 * MIN, false).clear;
    expect(clear?.number).toBe(101); // #101 cleared correctly — c* did not prop it up / merge in
  });

  it("sizes the raid by the plateau peak, not a wipe trough", () => {
    const t = tracker({ rosterCap: 50 }); // room above the plateau so the cap isn't what's tested here
    t.observe(R(20), 0, false); // peak 20
    t.observe(R(34), 2 * MIN, false); // grew (within the fill window → absorbed)
    t.observe(R(34), 3 * MIN, false); // roster caught up → peak 34
    t.observe(R(5), 20 * MIN, false); // wipe trough (not the peak)
    const clear = t.observe(R(0), 26 * MIN, false).clear;
    expect(clear?.peak).toBe(34);
  });

  it("assigns a reference number at form, exposes it on the formation and the clear", () => {
    let n = 40;
    const t = new ClearTracker({ formAt: 15, sustainedMs: 5 * MIN, nextNumber: () => ++n });
    expect(t.number).toBeNull();
    const formed = t.observe(R(20), 0, false).formed; // forms → #41
    expect(formed?.number).toBe(41);
    expect(t.number).toBe(41);
    t.observe(R(0), 10 * MIN, false);
    const clear = t.observe(R(0), 16 * MIN, false).clear;
    expect(clear?.number).toBe(41);
    expect(t.number).toBeNull(); // reset
    expect(t.observe(C(20), 30 * MIN, false).formed?.number).toBe(42); // next raid → #42
  });

  it("leaves raids unnumbered when no counter is configured", () => {
    const t = tracker();
    expect(t.observe(R(20), 0, false).formed?.number).toBeNull();
    expect(t.number).toBeNull();
    t.observe(R(0), 10 * MIN, false);
    expect(t.observe(R(0), 16 * MIN, false).clear?.number).toBeNull();
  });

  it("snapshots a raid and RESUMES it after a restart, still catching the clear", () => {
    const a = tracker();
    a.observe(R(30), 0, false); // forms
    a.observe(R(30), 20 * MIN, false); // running
    const snap = a.snapshot();
    expect(snap).not.toBeNull();

    // A fresh tracker (simulating a restart) resumes from the snapshot.
    const b = tracker();
    expect(b.tracking).toBe(false);
    b.restore(snap!);
    expect(b.tracking).toBe(true);
    expect(b.elapsedMs(20 * MIN)).toBe(20 * MIN); // same form time

    // The raid leaves and stays gone — the resumed tracker confirms the clear.
    b.observe(R(0), 40 * MIN, false);
    const clear = b.observe(R(0), 46 * MIN, false).clear;
    expect(clear?.durationMs).toBe(40 * MIN); // 0 → 40m, spanning the restart
  });

  it("does NOT re-report a formation on restore (resumed raids don't re-alert)", () => {
    const a = tracker();
    a.observe(R(30), 0, false);
    const snap = a.snapshot();
    const b = tracker();
    b.restore(snap!);
    // The next poll sees a present raid, not a fresh formation.
    expect(b.observe(R(30), 21 * MIN, false).formed).toBeNull();
  });

  it("snapshot is null when no raid is tracked, and restore is ignored mid-raid", () => {
    const t = tracker();
    expect(t.snapshot()).toBeNull();
    t.observe(R(30), 0, false);
    const other: import("./clear-tracker.js").ClearTrackerState = {
      formedAt: 999,
      number: 5,
      roster: ["x"],
      peak: 99,
      belowSince: null,
    };
    t.restore(other); // ignored — already tracking
    expect(t.elapsedMs(10 * MIN)).toBe(10 * MIN); // kept its own form time (0), not 999
  });

  it("reports elapsed time from form, and null when not tracking", () => {
    const t = tracker();
    expect(t.elapsedMs(5 * MIN)).toBeNull();
    t.observe(R(20), 1 * MIN, false);
    expect(t.elapsedMs(10 * MIN)).toBe(9 * MIN); // form at 1m → 9m elapsed at 10m
    t.observe(R(0), 20 * MIN, false);
    t.observe(R(0), 26 * MIN, false); // clears
    expect(t.elapsedMs(30 * MIN)).toBeNull(); // reset
  });

  it("forms a fresh raid after a clear, timed from the NEW formation", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(0), 10 * MIN, false);
    expect(t.observe(R(0), 16 * MIN, false).clear).not.toBeNull(); // first raid cleared at 16m
    expect(t.tracking).toBe(false);
    // a new, different raid forms at 30m and later clears
    t.observe(C(20), 30 * MIN, false);
    expect(t.tracking).toBe(true);
    t.observe(C(1), 50 * MIN, false); // departs
    const clear = t.observe(C(0), 56 * MIN, false).clear; // sustained 6 min
    expect(clear?.durationMs).toBe(20 * MIN); // 30m → 50m, proving the fresh formedAt
  });
});

describe("ClearTracker arrival-cohort separation", () => {
  it("a SECOND raid arriving late does not keep the first alive (the continuous-lair fix)", () => {
    const t = tracker(); // fill window 5m, cap 30
    t.observe(R(30), 0, false); // raid A forms — r0..r29
    // 40 min later A is ending, but raid B (c0..c19) has arrived — the lair stays full
    t.observe([...R(30), ...C(20)], 40 * MIN, false); // B arrived at 40m, well past A's 5m fill window
    t.observe(C(20), 41 * MIN, false); // A leaves; only B remains — A's cohort is now 0
    const clear = t.observe(C(20), 47 * MIN, false).clear; // sustained 6 min
    expect(clear).not.toBeNull(); // A's departure detected despite B filling the lair
    expect(clear?.durationMs).toBe(41 * MIN); // A ran 0 → 41m
    expect(t.tracking).toBe(false);
  });

  it("absorbs a joiner within the fill window but excludes one arriving after it", () => {
    const t = tracker();
    t.observe(R(20), 0, false); // r0..r19
    t.observe([...R(20), "early"], 3 * MIN, false); // 'early' at 3m — within 5m window → absorbed
    t.observe([...R(20), "early", "late"], 10 * MIN, false); // 'late' at 10m — past window → excluded
    t.observe([], 40 * MIN, false); // everyone leaves
    const clear = t.observe([], 46 * MIN, false).clear;
    expect(clear?.peak).toBe(21); // r0..r19 + early, but NOT late
  });

  it("caps the tracked roster as a backstop against absorbing a second raid", () => {
    const t = tracker({ rosterCap: 25 });
    t.observe(R(40), 0, false); // 40 present at formation → roster capped at 25
    t.observe(R(0), 40 * MIN, false); // departs
    const clear = t.observe(R(0), 46 * MIN, false).clear;
    expect(clear?.peak).toBe(25);
  });

  it("a player seen early, gone, then back late is a FRESH arrival — it can't keep the old raid alive", () => {
    const t = tracker();
    t.observe(["w", "a", "b"], 0, false); // ambient traffic, w among it (below strength)
    t.observe([], 15 * MIN, false); // all gone for > the stint gap → forgotten
    t.observe(R(20), 30 * MIN, false); // raid forms at 30m, WITHOUT w
    t.observe([...R(20), "w"], 40 * MIN, false); // w returns at 40m (past the 5m window) — must not be absorbed
    t.observe(["w"], 41 * MIN, false); // the raid leaves; only w remains → its cohort is 0
    const clear = t.observe(["w"], 47 * MIN, false).clear;
    expect(clear).not.toBeNull(); // detected — w's stale early sighting did not keep the raid alive
  });
});

describe("ClearTracker pending() / confirmNow() — Chronicle early-confirm", () => {
  it("reports no pending departure while a raid is present or none is tracked", () => {
    const t = tracker();
    expect(t.pending()).toBeNull(); // nothing tracked
    t.observe(R(30), 0, false); // formed, present
    expect(t.pending()).toBeNull(); // present, roster not below the floor
  });

  it("reports a pending departure once the roster drops below the floor, with the roster", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(1), 40 * MIN, false); // departure begins at 40m
    const p = t.pending();
    expect(p).not.toBeNull();
    expect(p?.belowSince).toBe(40 * MIN);
    expect(p?.formedAt).toBe(0);
    expect(p?.peak).toBe(30);
    expect(p?.roster).toContain("r0"); // the raid's members, to match a Chronicle uploader against
  });

  it("confirmNow() ends a pending departure early with the same clear the wait would give", () => {
    const t = tracker();
    t.observe(R(30), 0, false);
    t.observe(R(1), 40 * MIN, false); // departure begins — normally 5 more min of waiting
    const clear = t.confirmNow(); // Chronicle proved the kill — confirm at 41m, not 45m
    expect(clear).not.toBeNull();
    expect(clear?.durationMs).toBe(40 * MIN); // form(0) → departure start(40m), same as the sustained path
    expect(clear?.peak).toBe(30);
    expect(t.tracking).toBe(false); // reset, exactly as a sustained clear leaves it
    expect(t.pending()).toBeNull();
  });

  it("confirmNow() manufactures nothing without a detected departure (present raid, or none)", () => {
    const t = tracker();
    expect(t.confirmNow()).toBeNull(); // nothing tracked
    t.observe(R(30), 0, false); // formed, present, roster NOT below the floor
    expect(t.confirmNow()).toBeNull(); // no departure detected → no clear
    expect(t.tracking).toBe(true); // and it did not disturb the tracked raid
  });
});

describe("ClearTracker formation confirm window (formConfirmMs)", () => {
  const opts = { formAt: 15, sustainedMs: 5 * MIN, formConfirmMs: 5 * MIN };

  it("does not announce until the roster has held >= floor for the confirm window", () => {
    const t = tracker(opts);
    expect(t.observe(R(20), 0, false).formed).toBeNull(); // reached strength, not yet confirmed
    expect(t.observe(R(20), 2 * MIN, false).formed).toBeNull(); // still holding, 2m < 5m
    const formed = t.observe(R(20), 5 * MIN, false).formed; // 5m held → announce
    expect(formed).not.toBeNull();
    expect(formed?.peak).toBe(20);
  });

  it("keeps a forming raid out of status/persistence until it confirms", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false);
    expect(t.elapsedMs(2 * MIN)).toBeNull(); // not "in" yet
    expect(t.snapshot()).toBeNull(); // a restart mid-forming restarts the count, so nothing to persist
    expect(t.pending()).toBeNull();
    t.observe(R(20), 5 * MIN, false); // confirm
    expect(t.elapsedMs(6 * MIN)).toBe(6 * MIN); // counts from strength (t=0), not from confirmation
    expect(t.snapshot()).not.toBeNull();
  });

  it("RESETS the count when the roster drops below the floor and returns (left and re-entered)", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false);
    t.observe(R(20), 3 * MIN, false); // 3m held
    t.observe(R(5), 4 * MIN, false); // below floor — "left"
    t.observe(R(20), 5 * MIN, false); // back — the count restarts here
    expect(t.observe(R(20), 9 * MIN, false).formed).toBeNull(); // only 4m since the restart
    expect(t.observe(R(20), 10 * MIN, false).formed).not.toBeNull(); // 5m since the restart → announce
  });

  it("RESETS the count on a disconnect, resuming when the members return", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false);
    t.observe(R(20), 3 * MIN, false); // 3m held
    t.observe(R(20), 4 * MIN, true); // BLACKOUT, members still present → resume, count restarts
    expect(t.observe(R(20), 8 * MIN, false).formed).toBeNull(); // only 4m since the reconnect
    expect(t.observe(R(20), 9 * MIN, false).formed).not.toBeNull(); // 5m since the reconnect → announce
  });

  it("discards a flash that leaves before confirming — and it consumes no raid number", () => {
    let n = 40;
    const t = tracker({ ...opts, nextNumber: () => ++n });
    t.observe(R(20), 0, false); // strength, forming
    t.observe(R(0), 1 * MIN, false);
    t.observe(R(0), 6 * MIN, false); // sustained gone → discarded as a flash, no formation announced
    expect(t.tracking).toBe(false);
    // The next REAL raid is #41 — the flash never took a number (numbers are assigned at confirm).
    t.observe(C(20), 20 * MIN, false);
    expect(t.observe(C(20), 25 * MIN, false).formed?.number).toBe(41);
  });

  it("discards a forming raid if the realm comes back empty after a disconnect", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false);
    expect(t.observe(R(0), 4 * MIN, true).formed).toBeNull(); // blackout, empty on recovery → discard
    expect(t.tracking).toBe(false);
  });

  it("a truncated /who undercount neither confirms early nor resets the count (untrusted)", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false); // strength
    t.observe(R(2), 3 * MIN, false, false); // below floor BUT incomplete → held, count not reset
    expect(t.observe(R(20), 5 * MIN, false).formed).not.toBeNull(); // 5m since strength → confirm
  });

  it("confirms on a continuous hold even across ordinary churn above the floor", () => {
    const t = tracker(opts);
    t.observe(R(20), 0, false);
    t.observe(R(16), 2 * MIN, false); // dipped to 16 — above the 15 floor, not a reset
    expect(t.observe(R(20), 5 * MIN, false).formed).not.toBeNull(); // still a 5m continuous hold
  });
});

// The Onyxia lockout rule: a player in one raid can't found/join a DIFFERENT raid. A cleared raid's
// members, lingering in the lair, must NOT re-trip "formed" as a phantom duplicate (the #96/#97 case).
describe("ClearTracker — lockout rule", () => {
  /** Form + confirm a raid of r0..r29, then clear it (roster leaves and stays gone). */
  function formThenClear(t: ClearTracker): void {
    t.observe(R(30), 0, false); // forms + confirms (confirmMs 0), locks r0..r29
    t.observe(R(30), 30 * MIN, false); // still up — refreshes the lock
    t.observe(R(0), 41 * MIN, false); // departure begins
    const clear = t.observe(R(0), 46 * MIN, false).clear; // 5 min sustained → cleared
    expect(clear).not.toBeNull();
    expect(t.tracking).toBe(false);
  }

  it("a cleared raid's members back at strength never re-form it as a phantom new raid", () => {
    let n = 0;
    const t = tracker({ nextNumber: () => ++n });
    formThenClear(t); // raid #1
    // The SAME members are again at strength — locked, so NO new raid forms: raid #1 carries on.
    const back = t.observe(R(30), 48 * MIN, false);
    expect(back.formed).toBeNull();
    expect(back.resumed?.number).toBe(1);
    expect(t.number).toBe(1);
  });

  it("a genuinely different crowd forms a new raid after a clear", () => {
    const t = tracker();
    formThenClear(t);
    expect(t.observe(C(30), 48 * MIN, false).formed).not.toBeNull(); // c0..c29 are unlocked
    expect(t.tracking).toBe(true);
  });

  it("forms from the FRESH players when locked stragglers are mixed in", () => {
    const t = tracker();
    formThenClear(t);
    // 10 locked stragglers (r) + 20 fresh (c): fresh 20 >= formAt 15 → forms.
    expect(t.observe([...R(10), ...C(20)], 48 * MIN, false).formed).not.toBeNull();
  });

  it("does NOT form when the fresh players alone are below strength", () => {
    const t = tracker();
    formThenClear(t);
    // 12 locked stragglers (r) + 10 fresh (c): only 10 fresh < 15 → no raid; 12 back < 15 → no resume.
    const obs = t.observe([...R(12), ...C(10)], 48 * MIN, false);
    expect(obs.formed).toBeNull();
    expect(obs.resumed).toBeNull();
    expect(t.tracking).toBe(false);
  });

  it("releases a player once the lockout elapses (a genuinely new, later raid)", () => {
    let n = 0;
    const t = tracker({ lockoutMs: 60 * MIN, nextNumber: () => ++n });
    formThenClear(t); // raid #1; r's last locked at 30 min
    // 80-30 = 50 < 60 → still locked: 17 present but only 5 are free, and 12 back can't resume #1.
    expect(t.observe([...R(12), ...C(5)], 80 * MIN, false).formed).toBeNull();
    // 95-30 = 65 >= 60 → released: they found raid #2 rather than resuming #1.
    const later = t.observe(R(30), 95 * MIN, false);
    expect(later.resumed).toBeNull();
    expect(later.formed?.number).toBe(2);
  });

  it("persists and restores the ledger across a restart — the rule survives a redeploy", () => {
    const t = tracker();
    formThenClear(t);
    const saved = t.lockoutSnapshot(); // what the store would persist
    expect(Object.keys(saved).length).toBe(30); // the cleared raid's roster is locked

    // A fresh tracker (a restarted process) restores the ledger, and the phantom is STILL blocked.
    const restarted = tracker();
    restarted.restoreLockout(saved);
    expect(restarted.observe(R(30), 48 * MIN, false).formed).toBeNull(); // same members → still locked
    expect(restarted.observe(C(30), 49 * MIN, false).formed).not.toBeNull(); // a new crowd still forms
  });

  it("exposes the roster as members while forming, keeps leavers on it, and empties it on a clear", () => {
    const t = tracker({ formConfirmMs: 2 * MIN });
    expect(t.members.size).toBe(0);
    t.observe(R(20), 0, false); // forming, not yet confirmed
    expect([...t.members]).toEqual(R(20));
    t.observe(R(16), MIN, false); // four left — still this raid's members
    expect(t.members.has("r19")).toBe(true);
    t.observe([], 2 * MIN, false);
    t.observe([], 20 * MIN, false); // gone well past the sustained window → cleared
    expect(t.tracking).toBe(false);
    expect(t.members.size).toBe(0);
  });
});

// A wipe whose run-back outlasts the sustained wait reads as a clear. The same members coming back
// are the same raid (they are locked to it), so it resumes with its number and its timer.
describe("ClearTracker — false clear", () => {
  /** Raid #1 of r0..r29 forms at 0, wipes at 20 min, and is read as cleared at 25 (5 min wait). */
  function wipeReadAsClear(over: Partial<ConstructorParameters<typeof ClearTracker>[0]> = {}): ClearTracker {
    let n = 0;
    const t = tracker({ nextNumber: () => ++n, ...over });
    t.observe(R(30), 0, false);
    t.observe(R(30), 19 * MIN, false);
    t.observe(R(4), 20 * MIN, false); // the wipe
    expect(t.observe(R(4), 25 * MIN, false).clear?.durationMs).toBe(20 * MIN);
    return t;
  }

  it("resumes the raid when its members run back after the wait: same number, timer from formation", () => {
    const t = wipeReadAsClear();
    const back = t.observe(R(28), 27 * MIN, false);
    expect(back.resumed).toEqual({ number: 1, elapsedMs: 27 * MIN, awayMs: 7 * MIN });
    expect(back.formed).toBeNull();
    expect(t.tracking).toBe(true);
    expect(t.elapsedMs(30 * MIN)).toBe(30 * MIN);
  });

  it("measures the resumed raid's real clear from its original formation", () => {
    const t = wipeReadAsClear();
    t.observe(R(28), 27 * MIN, false); // resumed
    t.observe(R(28), 44 * MIN, false);
    t.observe(R(0), 45 * MIN, false); // the real departure
    const clear = t.observe(R(0), 50 * MIN, false).clear;
    expect(clear).toEqual({ durationMs: 45 * MIN, peak: 30, number: 1 });
  });

  it("persists the resumed raid again, so a restart keeps it", () => {
    const t = wipeReadAsClear();
    expect(t.snapshot()).toBeNull();
    t.observe(R(28), 27 * MIN, false);
    expect(t.snapshot()).toMatchObject({ formedAt: 0, number: 1, peak: 30, belowSince: null });
  });

  it("does not resume while fewer than the clear floor of its members are back", () => {
    const t = wipeReadAsClear();
    expect(t.observe(R(14), 27 * MIN, false).resumed).toBeNull(); // floor is 15
    expect(t.tracking).toBe(false);
    expect(t.observe(R(15), 28 * MIN, false).resumed?.number).toBe(1);
  });

  it("does not resume a kill Chronicle proved", () => {
    let n = 0;
    const t = tracker({ nextNumber: () => ++n });
    t.observe(R(30), 0, false);
    t.observe(R(4), 20 * MIN, false); // departure pending
    expect(t.confirmNow()?.number).toBe(1);
    const back = t.observe(R(30), 27 * MIN, false);
    expect(back.resumed).toBeNull();
    expect(back.formed).toBeNull(); // still locked — no phantom either
    expect(t.tracking).toBe(false);
  });

  it("resumes only the last raid read as cleared", () => {
    const t = wipeReadAsClear(); // #1 of r's cleared at 25
    t.observe(C(30), 30 * MIN, false); // #2 of c's forms
    t.observe(C(0), 40 * MIN, false);
    expect(t.observe(C(0), 45 * MIN, false).clear?.number).toBe(2);
    expect(t.observe(R(30), 47 * MIN, false).resumed).toBeNull(); // #1 was superseded
    expect(t.observe(C(30), 48 * MIN, false).resumed?.number).toBe(2);
  });

  it("lets the raid go once its members' lockout ends — they found a new raid then", () => {
    const t = wipeReadAsClear({ lockoutMs: 60 * MIN }); // r's last locked at 19 min
    const later = t.observe(R(30), 80 * MIN, false);
    expect(later.resumed).toBeNull();
    expect(later.formed?.number).toBe(2);
  });
});
