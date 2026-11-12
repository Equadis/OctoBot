import { describe, expect, it } from "vitest";
import { needsFactionResolution, type Subscriber } from "./store.js";

const sub = (factions: Subscriber["factions"], factionSource: Subscriber["factionSource"]): Subscriber => ({
  name: "X",
  factions,
  factionSource,
  subscribedAt: new Date(),
});

describe("needsFactionResolution", () => {
  it("is true for the unresolved both-default (the backlog to resolve)", () => {
    expect(needsFactionResolution(sub(["alliance", "horde"], "default"))).toBe(true);
    // an auto-set "both" is a detection artifact, not a choice — still resolvable
    expect(needsFactionResolution(sub(["alliance", "horde"], "auto"))).toBe(true);
  });

  it("is false for a deliberate (manual) both — never override a choice", () => {
    expect(needsFactionResolution(sub(["alliance", "horde"], "manual"))).toBe(false);
  });

  it("is false for an already-resolved single side, whatever the source", () => {
    expect(needsFactionResolution(sub(["alliance"], "auto"))).toBe(false);
    expect(needsFactionResolution(sub(["horde"], "default"))).toBe(false);
    expect(needsFactionResolution(sub(["horde"], "manual"))).toBe(false);
  });
});
