import { describe, expect, it, vi } from "vitest";
import { prefixed, type Logger } from "./logger.js";

function fake(): Logger & { lines: string[] } {
  const lines: string[] = [];
  const push = (m: string) => lines.push(m);
  return { lines, debug: vi.fn(push), info: vi.fn(push), warn: vi.fn(push), error: vi.fn(push) };
}

describe("prefixed", () => {
  it("tags every level with the prefix", () => {
    const base = fake();
    const log = prefixed(base, "sw");
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(base.lines).toEqual(["[sw] d", "[sw] i", "[sw] w", "[sw] e"]);
  });
});
