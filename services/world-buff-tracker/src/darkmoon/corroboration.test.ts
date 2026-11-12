import { describe, expect, it } from "vitest";
import {
  CORROBORATION_WINDOW_MS,
  DEFAULT_CORROBORATION,
  shouldSettle,
  SightingTally,
  type CorroborationPolicy,
} from "./corroboration.js";

const NOW = Date.parse("2026-09-10T12:00:00Z");

describe("SightingTally", () => {
  it("counts distinct senders, not messages", () => {
    const tally = new SightingTally(CORROBORATION_WINDOW_MS);
    // One client rebroadcasting every 30s must not out-vote a room.
    for (let i = 0; i < 20; i += 1) {
      tally.record({ location: "mulgore", senderId: "troll", at: NOW + i * 30_000 });
    }
    expect(tally.leader(NOW + 600_000)).toEqual({ location: "mulgore", senders: 1 });
  });

  it("lets the majority win over a determined minority", () => {
    const tally = new SightingTally(CORROBORATION_WINDOW_MS);
    for (const sender of ["a", "b", "c", "d"]) {
      tally.record({ location: "elwynn", senderId: sender, at: NOW });
    }
    for (const sender of ["troll1", "troll2"]) {
      tally.record({ location: "mulgore", senderId: sender, at: NOW + 1000 });
    }
    expect(tally.leader(NOW + 1000)).toEqual({ location: "elwynn", senders: 4 });
  });

  it("decides nothing on a tie", () => {
    const tally = new SightingTally(CORROBORATION_WINDOW_MS);
    tally.record({ location: "elwynn", senderId: "a", at: NOW });
    tally.record({ location: "mulgore", senderId: "b", at: NOW });
    expect(tally.leader(NOW)).toBeNull();
  });

  it("moves a sender's vote rather than letting them hold two", () => {
    const tally = new SightingTally(CORROBORATION_WINDOW_MS);
    tally.record({ location: "elwynn", senderId: "a", at: NOW });
    tally.record({ location: "mulgore", senderId: "a", at: NOW + 1000 });
    expect(tally.leader(NOW + 1000)).toEqual({ location: "mulgore", senders: 1 });
  });

  it("forgets votes once they age out of the window", () => {
    const tally = new SightingTally(CORROBORATION_WINDOW_MS);
    tally.record({ location: "elwynn", senderId: "a", at: NOW });
    expect(tally.size(NOW + CORROBORATION_WINDOW_MS)).toBe(1);
    expect(tally.size(NOW + CORROBORATION_WINDOW_MS + 1)).toBe(0);
    expect(tally.leader(NOW + CORROBORATION_WINDOW_MS + 1)).toBeNull();
  });

  it("has no opinion when nothing has been said", () => {
    expect(new SightingTally(CORROBORATION_WINDOW_MS).leader(NOW)).toBeNull();
  });
});

describe("shouldSettle", () => {
  const policy: CorroborationPolicy = DEFAULT_CORROBORATION;

  it("refuses a claim nobody corroborates", () => {
    expect(shouldSettle(policy, null, { location: "mulgore", senders: 1 }, NOW)).toBe(false);
    expect(shouldSettle(policy, null, { location: "mulgore", senders: 2 }, NOW)).toBe(false);
    expect(shouldSettle(policy, null, null, NOW)).toBe(false);
  });

  it("settles a fresh location once enough distinct senders agree", () => {
    expect(shouldSettle(policy, null, { location: "mulgore", senders: 3 }, NOW)).toBe(true);
  });

  it("still demands quorum to re-confirm the zone it already believes", () => {
    // Accepting refreshes how recently the faire was seen, which is what "it is up now" reads off.
    // Without quorum here, one player could keep the faire looking live weeks after it left.
    const settled = { location: "mulgore" as const, acceptedAt: NOW };
    expect(shouldSettle(policy, settled, { location: "mulgore", senders: 1 }, NOW + 60_000)).toBe(false);
    expect(shouldSettle(policy, settled, { location: "mulgore", senders: 3 }, NOW + 60_000)).toBe(true);
  });

  it("will not move zones inside the cooldown, however many agree", () => {
    const settled = { location: "mulgore" as const, acceptedAt: NOW };
    expect(shouldSettle(policy, settled, { location: "elwynn", senders: 25 }, NOW + 3_600_000)).toBe(false);
  });

  it("allows the real monthly move, which comes after weeks of silence", () => {
    const settled = { location: "mulgore" as const, acceptedAt: NOW };
    const nextMonth = NOW + 25 * 86_400_000;
    expect(shouldSettle(policy, settled, { location: "elwynn", senders: 3 }, nextMonth)).toBe(true);
  });

  it("releases the cooldown exactly on time", () => {
    const settled = { location: "mulgore" as const, acceptedAt: NOW };
    const consensus = { location: "elwynn" as const, senders: 3 };
    expect(shouldSettle(policy, settled, consensus, NOW + policy.changeCooldownMs - 1)).toBe(false);
    expect(shouldSettle(policy, settled, consensus, NOW + policy.changeCooldownMs)).toBe(true);
  });

  it("can be relaxed to PizzaWorldBuffs' own trust-the-latest behaviour", () => {
    const trusting: CorroborationPolicy = { quorum: 1, changeCooldownMs: 0 };
    const settled = { location: "mulgore" as const, acceptedAt: NOW };
    expect(shouldSettle(trusting, settled, { location: "elwynn", senders: 1 }, NOW)).toBe(true);
  });
});
