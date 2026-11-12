import { describe, expect, it } from "vitest";
import { ServerMonitor } from "./server-monitor.js";

const IDS = ["Bufftracker", "Onyxiabuffsw", "Onyxiabuffog"] as const;

/** Take all three down, and return the monitor mid-outage (announced). */
function downAll(now = 0): ServerMonitor {
  const m = new ServerMonitor(IDS);
  m.connectionDown("Bufftracker", now);
  m.connectionDown("Onyxiabuffsw", now);
  m.connectionDown("Onyxiabuffog", now);
  return m;
}

describe("ServerMonitor", () => {
  it("declares the realm down only when EVERY connection is down, once", () => {
    const m = new ServerMonitor(IDS);
    expect(m.connectionDown("Bufftracker", 1_000)).toBe(false); // 1 of 3
    expect(m.connectionDown("Onyxiabuffsw", 2_000)).toBe(false); // 2 of 3
    expect(m.outageActive).toBe(false);
    expect(m.connectionDown("Onyxiabuffog", 3_000)).toBe(true); // 3 of 3 -> announce
    expect(m.outageActive).toBe(true);
  });

  it("does not re-announce when an already-down connection reports down again", () => {
    const m = downAll();
    expect(m.connectionDown("Bufftracker", 4_000)).toBe(false); // already counted
  });

  it("STARTS a recovery on the first connection back (outage stays open until confirmed)", () => {
    const m = new ServerMonitor(IDS);
    m.connectionDown("Bufftracker", 0);
    m.connectionDown("Onyxiabuffsw", 0);
    m.connectionDown("Onyxiabuffog", 60_000); // down since 60s
    expect(m.connectionUp("Onyxiabuffsw", 300_000)).toBe(240_000); // outage duration to the reconnect
    expect(m.outageActive).toBe(true); // NOT over yet — awaiting the stability window
    // Later reconnects during the window don't start another recovery.
    expect(m.connectionUp("Bufftracker", 320_000)).toBeNull();
    // The window elapses with the realm still up -> confirm and close.
    expect(m.confirmRecovery()).toBe(true);
    expect(m.outageActive).toBe(false);
  });

  it("confirmRecovery does nothing when there is no pending recovery", () => {
    expect(new ServerMonitor(IDS).confirmRecovery()).toBe(false); // never down
    const m = downAll();
    expect(m.confirmRecovery()).toBe(false); // down, but nothing has reconnected yet
  });

  it("VOIDS a pending recovery if the realm flaps fully down again (one down, one back up)", () => {
    const m = downAll(0);
    expect(m.connectionUp("Bufftracker", 100_000)).toBe(100_000); // recovery starts
    expect(m.isFullyDown()).toBe(false);
    // ...but it drops fully again before the window ends.
    m.connectionDown("Bufftracker", 120_000);
    expect(m.isFullyDown()).toBe(true); // caller cancels its timer
    expect(m.confirmRecovery()).toBe(false); // a timer that still fired must NOT post "back up"
    expect(m.outageActive).toBe(true); // still down, and no repeat "down" was announced
    // It recovers again and, this time, stays up.
    expect(m.connectionUp("Bufftracker", 200_000)).toBe(200_000); // fresh window, duration from the original down
    expect(m.confirmRecovery()).toBe(true);
    expect(m.outageActive).toBe(false);
  });

  it("does not start a recovery when no outage was declared (partial down only)", () => {
    const m = new ServerMonitor(IDS);
    m.connectionDown("Bufftracker", 1_000); // only 1 of 3
    expect(m.connectionUp("Bufftracker", 2_000)).toBeNull();
    expect(m.outageActive).toBe(false);
  });

  it("a lone flaky connection cycling down/up never trips the realm signal", () => {
    const m = new ServerMonitor(IDS);
    for (let t = 0; t < 5; t++) {
      expect(m.connectionDown("Onyxiabuffsw", t * 1_000)).toBe(false);
      expect(m.connectionUp("Onyxiabuffsw", t * 1_000 + 500)).toBeNull();
    }
    expect(m.outageActive).toBe(false);
  });

  it("stays down through a chronically-dead character: the other two are the quorum", () => {
    const m = new ServerMonitor(IDS);
    m.connectionDown("Onyxiabuffog", 0); // dead the whole time
    m.connectionDown("Bufftracker", 10_000);
    expect(m.connectionDown("Onyxiabuffsw", 20_000)).toBe(true); // quorum completes at 20_000
    // First live character back starts recovery; confirmed once stable. Duration from the quorum.
    expect(m.connectionUp("Bufftracker", 80_000)).toBe(60_000); // 80_000 - 20_000
    expect(m.confirmRecovery()).toBe(true);
    expect(m.outageActive).toBe(false);
  });

  it("can declare a second outage after a confirmed recovery", () => {
    const m = downAll(0);
    // A real recovery: every connection reconnects (each clears the down-set); only the first starts
    // the recovery window, the rest return null.
    expect(m.connectionUp("Bufftracker", 100_000)).toBe(100_000);
    expect(m.connectionUp("Onyxiabuffsw", 100_000)).toBeNull();
    expect(m.connectionUp("Onyxiabuffog", 100_000)).toBeNull();
    expect(m.confirmRecovery()).toBe(true); // first outage over
    expect(m.outageActive).toBe(false);
    expect(m.isFullyDown()).toBe(false);
    // Second outage: all three down again -> announce on the third.
    m.connectionDown("Bufftracker", 200_000);
    m.connectionDown("Onyxiabuffsw", 200_000);
    expect(m.connectionDown("Onyxiabuffog", 200_000)).toBe(true);
    expect(m.outageActive).toBe(true);
  });

  it("ignores an unknown connection id (wiring guard) without affecting the quorum", () => {
    const m = new ServerMonitor(IDS);
    expect(m.connectionDown("Stranger", 1_000)).toBe(false);
    expect(m.connectionUp("Stranger", 2_000)).toBeNull();
    m.connectionDown("Bufftracker", 3_000);
    m.connectionDown("Onyxiabuffsw", 3_000);
    expect(m.connectionDown("Onyxiabuffog", 3_000)).toBe(true);
  });

  it("degrades to watcher-only when there are no listeners", () => {
    const m = new ServerMonitor(["Bufftracker"]);
    expect(m.connectionDown("Bufftracker", 1_000)).toBe(true);
    expect(m.connectionUp("Bufftracker", 5_000)).toBe(4_000);
    expect(m.confirmRecovery()).toBe(true);
  });
});

describe("ServerMonitor persistence (snapshot/restore) — no re-announce across a restart", () => {
  it("snapshots the announced outage and its start time", () => {
    expect(downAll(7_000).snapshot()).toEqual({ announced: true, downSince: 7_000 });
    expect(new ServerMonitor(IDS).snapshot()).toEqual({ announced: false, downSince: null });
  });

  it("resumes a persisted outage without re-announcing 'down', and posts 'back up' once on recovery", () => {
    const prior = downAll(7_000).snapshot(); // a prior process already announced this outage then died
    const m = new ServerMonitor(IDS);
    m.restore(prior);
    expect(m.outageActive).toBe(true); // carried forward — not a fresh, unannounced state

    // The realm is still down at boot, so each connection crosses sustained-down again. None may
    // re-announce — this is the redeploy-bombardment the persistence exists to stop.
    expect(m.connectionDown("Bufftracker", 600_000)).toBe(false);
    expect(m.connectionDown("Onyxiabuffsw", 600_000)).toBe(false);
    expect(m.connectionDown("Onyxiabuffog", 600_000)).toBe(false); // 3 of 3, already announced -> quiet

    // When it recovers, 'back up' fires once, its duration timed from the PERSISTED downSince.
    expect(m.connectionUp("Bufftracker", 700_000)).toBe(693_000); // 700_000 - 7_000
    expect(m.confirmRecovery()).toBe(true);
    expect(m.outageActive).toBe(false);
  });

  it("a restored clean state behaves like a fresh monitor (a later outage announces normally)", () => {
    const m = new ServerMonitor(IDS);
    m.restore({ announced: false, downSince: null });
    expect(m.outageActive).toBe(false);
    m.connectionDown("Bufftracker", 0);
    m.connectionDown("Onyxiabuffsw", 0);
    expect(m.connectionDown("Onyxiabuffog", 0)).toBe(true); // a genuine new outage still announces
  });
});
