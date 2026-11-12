import { describe, expect, it } from "vitest";
import { matchBuffYell } from "./buff-yell.js";

describe("matchBuffYell", () => {
  it("matches the Alliance Onyxia turn-in yell as Onyxia's head", () => {
    expect(matchBuffYell("The dread lady, Onyxia, hangs from the arches!")).toEqual({
      faction: "alliance",
      head: "onyxia",
    });
  });

  it("matches the Alliance Nefarian turn-in yell as Nefarian's head", () => {
    expect(
      matchBuffYell(
        "Citizens of the Alliance, the Lord of Blackrock is slain! Nefarian has been subdued by our forces!",
      ),
    ).toEqual({ faction: "alliance", head: "bwl" });
  });

  it("matches the Horde Onyxia turn-in yell as Onyxia's head", () => {
    expect(matchBuffYell("The brood mother, Onyxia, has been slain! Let her death...")).toEqual({
      faction: "horde",
      head: "onyxia",
    });
  });

  it("matches the Horde Nefarian turn-in yell as Nefarian's head", () => {
    expect(matchBuffYell("NEFARIAN IS SLAIN! People of Orgrimmar, bow down before the might of...")).toEqual({
      faction: "horde",
      head: "bwl",
    });
  });

  it("returns null for an unrelated monster yell", () => {
    expect(matchBuffYell("You are already dead!")).toBeNull();
    expect(matchBuffYell("For the Horde!")).toBeNull();
    expect(matchBuffYell("")).toBeNull();
  });
});
