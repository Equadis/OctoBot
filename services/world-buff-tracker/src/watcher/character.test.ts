import { describe, expect, it } from "vitest";
import { describeCharacter, isKnownRace } from "./character.js";

describe("describeCharacter", () => {
  it("names the faction, race and class", () => {
    expect(describeCharacter({ raceId: 2, classId: 9 })).toBe("Horde Orc Warlock");
    expect(describeCharacter({ raceId: 4, classId: 11 })).toBe("Alliance Night Elf Druid");
    expect(describeCharacter({ raceId: 5, classId: 4 })).toBe("Horde Undead Rogue");
  });

  it("shows an unmapped race by its id, with no faction guessed", () => {
    expect(describeCharacter({ raceId: 10, classId: 8 })).toBe("race #10 Mage");
  });

  it("shows an unmapped class by its id", () => {
    expect(describeCharacter({ raceId: 1, classId: 6 })).toBe("Alliance Human class #6");
  });
});

describe("isKnownRace", () => {
  it("is true for the eight vanilla races only", () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8]) expect(isKnownRace(id)).toBe(true);
    expect(isKnownRace(10)).toBe(false);
  });
});
