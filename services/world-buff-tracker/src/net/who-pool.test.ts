import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WhoQuery, WhoResult } from "../protocol/who.js";
import { WhoPool, type WhoRunner } from "./who-pool.js";

const GAP = 31_000;
const SPACING = 1_500;
const QUERY: WhoQuery = { minLevel: 0, maxLevel: 100, zoneIds: [2159] };
const REPLY: WhoResult = { players: [], onlineCount: 1800 };

/** A character's /who that answers at once and records when it was asked. */
function character(): { run: ReturnType<typeof vi.fn<WhoRunner>>; sentAt: number[] } {
  const sentAt: number[] = [];
  const run = vi.fn<WhoRunner>(async () => {
    sentAt.push(Date.now());
    return REPLY;
  });
  return { run, sentAt };
}

describe("WhoPool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const pool = (): WhoPool => new WhoPool({ minGapMs: GAP, minSpacingMs: SPACING });

  it("sends a lookup at once when a character is free", async () => {
    const p = pool();
    const a = character();
    p.register("A", a.run);

    await expect(p.who(QUERY)).resolves.toEqual(REPLY);
    expect(a.run).toHaveBeenCalledWith(QUERY);
  });

  it("spreads back-to-back lookups over the characters, paced by the bot-wide spacing", async () => {
    const p = pool();
    const a = character();
    const b = character();
    p.register("A", a.run);
    p.register("B", b.run);

    const both = Promise.all([p.who(QUERY), p.who(QUERY)]);
    await vi.advanceTimersByTimeAsync(SPACING);
    await both;

    expect(a.sentAt).toEqual([0]);
    expect(b.sentAt).toEqual([SPACING]);
  });

  it("never sends from one character twice within the gap", async () => {
    const p = pool();
    const a = character();
    p.register("A", a.run);

    const second = (async () => {
      await p.who(QUERY);
      return p.who(QUERY);
    })();
    await vi.advanceTimersByTimeAsync(GAP - 1);
    expect(a.sentAt).toEqual([0]);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(a.sentAt).toEqual([0, GAP]);
  });

  it("picks the character that has gone longest without a lookup", async () => {
    const p = pool();
    const a = character();
    const b = character();
    p.register("A", a.run);
    p.register("B", b.run);
    await p.who(QUERY); // A, at 0
    await vi.advanceTimersByTimeAsync(SPACING);
    await p.who(QUERY); // B, at 1.5s
    await vi.advanceTimersByTimeAsync(GAP);

    await p.who(QUERY); // both free again: A has waited longer
    expect(a.run).toHaveBeenCalledTimes(2);
    expect(b.run).toHaveBeenCalledTimes(1);
  });

  it("answers lookups first come, first served", async () => {
    const p = pool();
    const a = character();
    p.register("A", a.run);
    const order: string[] = [];

    const first = p.who({ ...QUERY, playerName: "first" }).then(() => order.push("first"));
    const second = p.who({ ...QUERY, playerName: "second" }).then(() => order.push("second"));
    await vi.advanceTimersByTimeAsync(GAP);
    await Promise.all([first, second]);

    expect(order).toEqual(["first", "second"]);
    expect(a.run.mock.calls.map(([q]) => q.playerName)).toEqual(["first", "second"]);
  });

  it("passes a lookup's failure to its caller and keeps serving the rest", async () => {
    const p = pool();
    const failing = vi.fn<WhoRunner>().mockRejectedValue(new Error("/who timed out after 8000ms"));
    const b = character();
    p.register("A", failing);
    p.register("B", b.run);

    const failed = p.who(QUERY);
    await expect(failed).rejects.toThrow("timed out");
    const next = p.who(QUERY);
    await vi.advanceTimersByTimeAsync(SPACING);
    await expect(next).resolves.toEqual(REPLY);
  });

  it("does not send on a character whose lookup is still out", async () => {
    let answer: (result: WhoResult) => void = () => undefined;
    const slow = vi.fn<WhoRunner>(() => new Promise<WhoResult>((resolve) => (answer = resolve)));
    const q = new WhoPool({ minGapMs: 0, minSpacingMs: 0 }); // no gaps: only "busy" holds it back
    q.register("A", slow);

    const first = q.who(QUERY);
    const second = q.who(QUERY);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(slow).toHaveBeenCalledTimes(1);
    answer(REPLY);
    await first;
    await vi.advanceTimersByTimeAsync(0);
    expect(slow).toHaveBeenCalledTimes(2);
    answer(REPLY);
    await second;
  });

  it("fails at once when no character is in world", async () => {
    await expect(pool().who(QUERY)).rejects.toThrow("no character in world to /who");
  });

  it("fails the waiting lookups when the last character leaves", async () => {
    const p = pool();
    const a = character();
    p.register("A", a.run);
    await p.who(QUERY);

    const waiting = p.who(QUERY); // A is inside its gap, so this waits
    p.unregister("A");
    await expect(waiting).rejects.toThrow("no character in world to /who");
  });

  it("sends a waiting lookup on a character that logs in", async () => {
    const p = pool();
    const a = character();
    const b = character();
    p.register("A", a.run);
    await p.who(QUERY);

    const waiting = p.who(QUERY);
    await vi.advanceTimersByTimeAsync(SPACING);
    p.register("B", b.run);
    await waiting;
    expect(b.sentAt).toEqual([SPACING]);
  });

  it("still holds a reconnected character to the gap of its lookup before it left", async () => {
    const p = pool();
    const a = character();
    p.register("A", a.run);
    await p.who(QUERY);
    p.unregister("A");
    await vi.advanceTimersByTimeAsync(10_000);
    p.register("A", a.run);

    const again = p.who(QUERY);
    await vi.advanceTimersByTimeAsync(GAP - 10_000 - 1);
    expect(a.run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await again;
    expect(a.sentAt).toEqual([0, GAP]);
  });
});
