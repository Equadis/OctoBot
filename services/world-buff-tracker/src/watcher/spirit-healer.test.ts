import { describe, expect, it } from "vitest";
import { isSpiritHealer } from "./spirit-healer.js";

describe("isSpiritHealer", () => {
  it("recognises the graveyard attendant", () => {
    expect(isSpiritHealer("Spirit Healer")).toBe(true);
  });

  it("tolerates casing and padding from the wire", () => {
    expect(isSpiritHealer("  spirit healer ")).toBe(true);
    expect(isSpiritHealer("SPIRIT HEALER")).toBe(true);
  });

  it("does not match anything else standing nearby", () => {
    for (const name of ["Spirit Guide", "Innkeeper Gryshka", "Thrall", "Healer", ""]) {
      expect(isSpiritHealer(name)).toBe(false);
    }
  });

  it("is an exact match, so a similarly named NPC cannot imply a death", () => {
    // Being wrong here reports a healthy listener as a corpse, which is worse than saying nothing.
    expect(isSpiritHealer("Spirit Healer's Apprentice")).toBe(false);
    expect(isSpiritHealer("Ancient Spirit Healer")).toBe(false);
  });
});
