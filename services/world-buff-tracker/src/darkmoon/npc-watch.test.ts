import { describe, expect, it } from "vitest";
import { NpcWatch } from "./npc-watch.js";

describe("NpcWatch", () => {
  it("asks about an entry once, however often it comes back into view", () => {
    const watch = new NpcWatch();
    expect(watch.take([14823, 14822])).toEqual([14823, 14822]);
    expect(watch.take([14823, 14822])).toEqual([]);
    expect(watch.asked).toBe(2);
  });

  it("only returns the entries it has not seen before", () => {
    const watch = new NpcWatch();
    watch.take([14823]);
    expect(watch.take([14823, 14841])).toEqual([14841]);
  });

  it("caps how many it asks about at once, so a crowd is not a burst of queries", () => {
    const watch = new NpcWatch();
    expect(watch.take([1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([1, 2, 3]);
    // The rest are still unseen, so the next update picks them up.
    expect(watch.take([1, 2, 3, 4, 5, 6, 7, 8], 3)).toEqual([4, 5, 6]);
  });

  it("remembers an entry as ASKED, not as answered, so a silent entry is not retried forever", () => {
    const watch = new NpcWatch();
    watch.take([99999]);
    expect(watch.take([99999])).toEqual([]);
  });

  it("ignores entries that cannot be real", () => {
    const watch = new NpcWatch();
    expect(watch.take([0, -1, 14823])).toEqual([14823]);
  });

  it("stops asking once the ceiling is reached", () => {
    const watch = new NpcWatch(3);
    watch.take([1, 2, 3], 10);
    expect(watch.take([4, 5], 10)).toEqual([]);
    expect(watch.asked).toBe(3);
  });
});
