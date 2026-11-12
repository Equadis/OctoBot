import { describe, expect, it, vi } from "vitest";
import { WhisperRefusals } from "./whisper-refusals.js";

const DAY = 24 * 60 * 60_000;

function setup(subscribed: readonly string[] = ["Grumpy"], failing = false) {
  let clock = 0;
  const lines: string[] = [];
  const unsubscribe = vi.fn(async (name: string): Promise<boolean> => {
    if (failing) throw new Error("mongo down");
    return subscribed.includes(name);
  });
  const refusals = new WhisperRefusals(
    { unsubscribe, log: (line) => lines.push(line), now: () => clock },
    { quietMs: DAY },
  );
  return { refusals, unsubscribe, lines, advance: (ms: number) => (clock += ms) };
}

describe("WhisperRefusals.ignoredBy", () => {
  it("unsubscribes a player who is ignoring one of our characters, and says so", async () => {
    const { refusals, unsubscribe, lines } = setup();
    await refusals.ignoredBy("Onyxiabuffog", "Grumpy");
    expect(unsubscribe).toHaveBeenCalledWith("Grumpy");
    expect(lines).toEqual(["whispers: Grumpy is ignoring Onyxiabuffog — unsubscribed"]);
  });

  it("says so too when they were never subscribed — they only heard a /say", async () => {
    const { refusals, lines } = setup([]);
    await refusals.ignoredBy("Onyxiabuffog", "Passerby");
    expect(lines).toEqual(["whispers: Passerby is ignoring Onyxiabuffog — was not subscribed"]);
  });

  it("unsubscribes on every notice — one who subscribes again while ignoring us comes straight back off", async () => {
    const subscribed = new Set(["Grumpy"]);
    let clock = 0;
    const lines: string[] = [];
    const refusals = new WhisperRefusals(
      { unsubscribe: async (name) => subscribed.delete(name), log: (line) => lines.push(line), now: () => clock },
      { quietMs: DAY },
    );
    await refusals.ignoredBy("Onyxiabuffog", "Grumpy");
    subscribed.add("Grumpy"); // whispered "subscribe" again, a minute later
    clock += 60_000;
    await refusals.ignoredBy("Onyxiabuffog", "Grumpy");
    expect(subscribed.has("Grumpy")).toBe(false);
    expect(lines).toEqual([
      "whispers: Grumpy is ignoring Onyxiabuffog — unsubscribed",
      "whispers: Grumpy is ignoring Onyxiabuffog — unsubscribed",
    ]);
  });

  it("lets the echoes of one already off the list pass quietly — logged once a day, whatever the case", async () => {
    const { refusals, unsubscribe, lines, advance } = setup([]);
    await refusals.ignoredBy("Onyxiabuffog", "Passerby");
    await refusals.ignoredBy("Onybuffogb", "passerby");
    expect(unsubscribe).toHaveBeenCalledTimes(2); // every notice still checks the list
    expect(lines).toHaveLength(1);
    advance(DAY);
    await refusals.ignoredBy("Onyxiabuffog", "Passerby");
    expect(lines).toHaveLength(2);
  });

  it("logs a failed unsubscribe instead of throwing", async () => {
    const { refusals, lines } = setup(["Grumpy"], true);
    await refusals.ignoredBy("Bufftracker", "Grumpy");
    expect(lines[0]).toContain("could not be unsubscribed");
  });
});

describe("WhisperRefusals.notFound", () => {
  it("logs a whisper to a player not online, once a day each, and unsubscribes nobody", () => {
    const { refusals, unsubscribe, lines, advance } = setup();
    refusals.notFound("Bufftracker", "Grumpy");
    refusals.notFound("Onybuffswb", "Grumpy");
    refusals.notFound("Bufftracker", "Sleepy");
    expect(lines).toEqual([
      "whispers: Bufftracker could not reach Grumpy — not online",
      "whispers: Bufftracker could not reach Sleepy — not online",
    ]);
    advance(DAY);
    refusals.notFound("Bufftracker", "Grumpy");
    expect(lines).toHaveLength(3);
    expect(unsubscribe).not.toHaveBeenCalled();
  });
});
