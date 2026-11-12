import { describe, expect, it } from "vitest";
import { OwnCharacters } from "./own-characters.js";

describe("OwnCharacters", () => {
  const ours = OwnCharacters.of({
    characterName: "Bufftracker",
    listeners: [
      { characterName: "Onyxiabuffog", account: "a", password: "p", faction: "horde", onLogin: "none", yeller: true, logNpcChat: false },
      { characterName: "Onybuffswb", account: "b", password: "p", faction: "alliance", onLogin: "none", yeller: false, logNpcChat: false },
    ],
  });

  it("knows Bufftracker and every listener, whatever the case", () => {
    expect(ours.has("Bufftracker")).toBe(true);
    expect(ours.has("onyxiabuffog")).toBe(true);
    expect(ours.has("ONYBUFFSWB")).toBe(true);
  });

  it("does not claim a player", () => {
    expect(ours.has("Raider")).toBe(false);
  });
});
