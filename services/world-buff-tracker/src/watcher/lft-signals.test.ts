import { describe, expect, it } from "vitest";
import { parseHeadIncoming, isOnyxiaHead } from "./lft-signals.js";

describe("parseHeadIncoming", () => {
  it("parses the dev's example line", () => {
    expect(parseHeadIncoming("OB_INC:1:A-O-Someplayer-14-32")).toEqual({
      version: 1,
      faction: "alliance",
      boss: "O",
      witness: "Someplayer",
      serverHour: 14,
      serverMinute: 32,
    });
  });

  it("maps H to horde", () => {
    const r = parseHeadIncoming("OB_INC:1:H-O-Thrallfan-9-5");
    expect(r?.faction).toBe("horde");
    expect(r?.serverHour).toBe(9);
    expect(r?.serverMinute).toBe(5);
  });

  it("is not confused by the real drop-timer prefix OB:", () => {
    expect(parseHeadIncoming("OB:1:A-O-Someplayer-14-32")).toBeNull();
  });

  it("rejects anything that is not the OB_INC prefix", () => {
    expect(parseHeadIncoming("hello world")).toBeNull();
    expect(parseHeadIncoming("LFT")).toBeNull();
    expect(parseHeadIncoming("")).toBeNull();
  });

  it("rejects an unknown faction code (never guesses a city)", () => {
    expect(parseHeadIncoming("OB_INC:1:X-O-Someplayer-14-32")).toBeNull();
  });

  it("rejects a wrong field count", () => {
    expect(parseHeadIncoming("OB_INC:1:A-O-Someplayer-14")).toBeNull(); // missing minute
    expect(parseHeadIncoming("OB_INC:1:A-O-14-32")).toBeNull(); // missing witness
  });

  it("rejects out-of-range or non-numeric time", () => {
    expect(parseHeadIncoming("OB_INC:1:A-O-Someplayer-24-00")).toBeNull(); // hour 24
    expect(parseHeadIncoming("OB_INC:1:A-O-Someplayer-14-60")).toBeNull(); // minute 60
    expect(parseHeadIncoming("OB_INC:1:A-O-Someplayer-xx-32")).toBeNull(); // non-numeric
  });

  it("rejects a non-integer version", () => {
    expect(parseHeadIncoming("OB_INC:v:A-O-Someplayer-14-32")).toBeNull();
  });

  it("keeps the boss code raw and flags Onyxia", () => {
    const ony = parseHeadIncoming("OB_INC:1:A-O-Someplayer-14-32");
    const nef = parseHeadIncoming("OB_INC:1:A-N-Someplayer-14-32");
    expect(ony && isOnyxiaHead(ony.boss)).toBe(true);
    expect(nef && isOnyxiaHead(nef.boss)).toBe(false);
  });
});
