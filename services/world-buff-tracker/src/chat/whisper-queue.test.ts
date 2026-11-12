import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WhisperQueue } from "./whisper-queue.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("WhisperQueue", () => {
  it("sends the first whisper immediately and paces the rest", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t, m) => sent.push(`${t}:${m}`), 1000);

    queue.enqueue("A", "1");
    expect(sent).toEqual(["A:1"]); // immediate while idle

    queue.enqueue("B", "2");
    queue.enqueue("C", "3");
    expect(sent).toHaveLength(1); // throttled

    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["A:1", "B:2"]);
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["A:1", "B:2", "C:3"]);
  });

  it("fans one message out to many targets, paced", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 500);
    queue.enqueueAll(["A", "B", "C"], "raid up");
    expect(sent).toEqual(["A"]);
    vi.advanceTimersByTime(500);
    vi.advanceTimersByTime(500);
    expect(sent).toEqual(["A", "B", "C"]);
  });

  it("keeps going when a send throws, reporting the failure", () => {
    const sent: string[] = [];
    const errors: string[] = [];
    const queue = new WhisperQueue(
      (t) => {
        if (t === "B") throw new Error("offline");
        sent.push(t);
      },
      1000,
      (_e, t) => errors.push(t),
    );
    queue.enqueueAll(["A", "B", "C"], "x");
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["A", "C"]);
    expect(errors).toEqual(["B"]);
  });

  it("reports the distinct-recipient count to the metric hook on throttle", () => {
    const metrics: string[] = [];
    const queue = new WhisperQueue(() => {}, 1000, undefined, (line) => metrics.push(line));
    queue.enqueueAll(["A", "B", "C", "D"], "x"); // A sent immediately
    vi.advanceTimersByTime(1000); // B
    vi.advanceTimersByTime(1000); // C  -> 3 sent, D pending
    queue.notifyThrottled();
    expect(metrics.some((m) => m.includes("THROTTLED after 3 distinct"))).toBe(true);
  });

  it("reports the drained count and time to the metric hook", () => {
    const metrics: string[] = [];
    const queue = new WhisperQueue(() => {}, 1000, undefined, (line) => metrics.push(line));
    queue.enqueueAll(["A", "B"], "x"); // A immediate, B pending
    vi.advanceTimersByTime(1000); // B sent
    vi.advanceTimersByTime(1000); // queue empties -> drain reported
    expect(metrics.some((m) => /drained 2 whispers in [\d.]+s/.test(m))).toBe(true);
  });

  it("drops pending whispers on stop", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 1000);
    queue.enqueueAll(["A", "B", "C"], "x");
    queue.stop();
    vi.advanceTimersByTime(5000);
    expect(sent).toEqual(["A"]); // A already went; B and C were dropped
    expect(queue.size).toBe(0);
  });

  it("dropForFaction purges only the pending park alerts about that capital", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 1000);
    queue.enqueue("A", "park SW", { cities: ["alliance"] }); // sent immediately (idle)
    queue.enqueue("B", "park SW", { cities: ["alliance"] }); // queued
    queue.enqueue("C", "park OG", { cities: ["horde"] }); // queued, other side
    queue.enqueue("D", "your status: ..."); // queued, untagged (a command reply)
    expect(sent).toEqual(["A"]);

    const dropped = queue.dropForFaction("alliance"); // alliance buff dropped → its park alerts stale
    expect(dropped).toBe(1); // only B (still queued, alliance)
    vi.advanceTimersByTime(5000);
    expect(sent).toEqual(["A", "C", "D"]); // B gone; the horde park and the reply still delivered
  });

  it("does NOT re-send around a throttle — resumes with the next recipient, no duplicate", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 1000);
    queue.enqueueAll(["A", "B", "C"], "x"); // A sent immediately, B/C queued
    expect(sent).toEqual(["A"]);
    queue.notifyThrottled(); // server accepted A then blocked — A must NOT be re-sent
    vi.advanceTimersByTime(30_000); // cooldown elapses
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["A", "B", "C"]); // A once; resumed forward — no retry duplicate
  });

  it("sends nothing during the throttle cooldown, then resumes", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 1000);
    queue.enqueueAll(["A", "B", "C"], "x"); // A sent, B/C queued
    expect(sent).toEqual(["A"]);
    queue.notifyThrottled();
    vi.advanceTimersByTime(29_000); // still within the cooldown
    expect(sent).toEqual(["A"]); // fully paused
    vi.advanceTimersByTime(5_000); // past the cooldown
    expect(sent.length).toBeGreaterThan(1); // resumed delivering
  });

  it("drops a stale time-sensitive whisper but keeps an untagged reply through the same delay", () => {
    const sent: string[] = [];
    const queue = new WhisperQueue((t) => sent.push(t), 1000);
    queue.enqueue("A", "immediate"); // sent right away (idle)
    queue.enqueue("Park", "park now", { cities: ["alliance"], maxAgeMs: 5_000 }); // maxAge 5s
    queue.enqueue("Reply", "you're subscribed"); // no maxAge — a command reply
    expect(sent).toEqual(["A"]);
    queue.notifyThrottled(); // 30s cooldown — Park will be >5s old when the queue resumes
    vi.advanceTimersByTime(31_000);
    vi.advanceTimersByTime(1000);
    expect(sent).toEqual(["A", "Reply"]); // Park dropped as stale; the reply (no maxAge) survives
    expect(queue.size).toBe(0);
  });

  it("reports a dropped-stale whisper to the metric hook", () => {
    const metrics: string[] = [];
    const queue = new WhisperQueue(() => {}, 1000, undefined, (line) => metrics.push(line));
    queue.enqueue("A", "immediate");
    queue.enqueue("Park", "park now", { cities: ["alliance"], maxAgeMs: 5_000 });
    queue.notifyThrottled();
    vi.advanceTimersByTime(31_000);
    expect(metrics.some((m) => /dropped stale whisper to Park/.test(m))).toBe(true);
  });
});

describe("WhisperQueue delay note", () => {
  it("tells a subscriber their alert was late, and how late", () => {
    vi.useFakeTimers();
    const sent: { target: string; message: string }[] = [];
    const queue = new WhisperQueue((target, message) => sent.push({ target, message }), 1000);
    queue.enqueue("Raider", "Onyxia raid cleared. Buff may drop in Stormwind.", { maxAgeMs: 20 * 60_000 });
    queue.enqueue("Latecomer", "Onyxia raid cleared. Buff may drop in Stormwind.", { maxAgeMs: 20 * 60_000 });
    // The first goes out immediately. The realm then spam-mutes us repeatedly — 110 throttle
    // events in 19h of production — and THAT is what stretches a broadcast to minutes.
    for (let i = 0; i < 12; i += 1) {
      queue.notifyThrottled();
      vi.advanceTimersByTime(29_000);
    }
    vi.advanceTimersByTime(60_000);

    expect(sent[0]?.message).not.toContain("late");
    expect(sent[1]?.message).toContain("late");
    expect(sent[1]?.message).toContain('Whisper "discord" for instant alerts.');
    vi.useRealTimers();
  });

  it("counts an alert's lateness from its event, not from when it reached the queue", () => {
    vi.useFakeTimers();
    const sent: string[] = [];
    const queue = new WhisperQueue((_t, m) => sent.push(m), 1000);
    const dropped = Date.now() - 3 * 60_000; // the buff dropped 3 minutes ago; the online check took that long
    queue.enqueue("Raider", "The Rallying Cry just dropped in Orgrimmar!", { maxAgeMs: 5 * 60_000, since: dropped });
    expect(sent[0]).toContain("(sent 3m late"); // sent at once, but three minutes after the drop
    vi.useRealTimers();
  });

  it("drops an alert whose event is already older than its max age when it reaches the queue", () => {
    vi.useFakeTimers();
    const sent: string[] = [];
    const queue = new WhisperQueue((_t, m) => sent.push(m), 1000);
    queue.enqueue("First", "hello"); // occupies the idle slot
    queue.enqueue("Raider", "park now", { maxAgeMs: 5 * 60_000, since: Date.now() - 6 * 60_000 });
    vi.advanceTimersByTime(2000);
    expect(sent).toEqual(["hello"]);
    vi.useRealTimers();
  });

  it("leaves a command reply alone, however long the queue was", () => {
    vi.useFakeTimers();
    const sent: string[] = [];
    const queue = new WhisperQueue((_t, m) => sent.push(m), 1000);
    // No maxAge = not time-sensitive. "Here is the Discord link" is not wrong for being late.
    queue.enqueue("Raider", "You're subscribed!");
    queue.enqueue("Other", "You're subscribed!");
    vi.advanceTimersByTime(6 * 60_000);
    expect(sent.every((m) => !m.includes("late"))).toBe(true);
    vi.useRealTimers();
  });
});
