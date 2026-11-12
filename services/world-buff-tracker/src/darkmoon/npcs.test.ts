import { describe, expect, it } from "vitest";
import { faireNpcNames, isFaireNpc } from "./npcs.js";

describe("isFaireNpc", () => {
  it("recognises the faire's travelling staff", () => {
    for (const name of ["Silas Darkmoon", "Sayge", "Gelvas Grimegate", "Maxima Blastenheimer"]) {
      expect(isFaireNpc(name)).toBe(true);
    }
  });

  it("does NOT match the Carnie, who stands in the capitals all month", () => {
    // The exact bug that made PizzaWorldBuffs 1.4.0 report faires that were not there. Matching
    // them here would report a faire every single day of the year.
    expect(isFaireNpc("Darkmoon Faire Carnie")).toBe(false);
  });

  it("ignores everyone else", () => {
    for (const name of ["Thrall", "Innkeeper Farley", "Stormwind Guard", ""]) {
      expect(isFaireNpc(name)).toBe(false);
    }
  });

  it("tolerates padding but not a different name", () => {
    expect(isFaireNpc("  Sayge  ")).toBe(true);
    expect(isFaireNpc("Sayge the Fortune Teller")).toBe(false);
  });

  it("carries the whole roster", () => {
    expect(faireNpcNames().length).toBeGreaterThan(20);
    expect(faireNpcNames()).not.toContain("Darkmoon Faire Carnie");
  });
});
