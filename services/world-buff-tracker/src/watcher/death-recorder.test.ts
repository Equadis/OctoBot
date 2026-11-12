import { describe, expect, it } from "vitest";
import { ChatType } from "../protocol/opcodes.js";
import { DeathRecorder, type DeathClue } from "./death-recorder.js";

const US = 0x77n;
const GANKER = 0x555n;

const hit = (at: number, damage: number): DeathClue => ({
  at,
  kind: "combat",
  event: { kind: "melee", attacker: GANKER, target: US, damage },
  attackerOwner: null,
});

describe("DeathRecorder", () => {
  it("reports the clues leading up to the moment our health reaches zero", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000 });
    expect(recorder.observeHealth(0, 3000)).toBeNull();
    recorder.record(hit(1_000, 1800));
    expect(recorder.observeHealth(1_001, 1200)).toBeNull();
    recorder.record(hit(2_000, 1200));

    const report = recorder.observeHealth(2_001, 0);
    expect(report?.diedAt).toBe(2_001);
    expect(report?.clues).toEqual([
      { at: 0, kind: "health", health: 3000 },
      hit(1_000, 1800),
      { at: 1_001, kind: "health", health: 1200 },
      hit(2_000, 1200),
      { at: 2_001, kind: "health", health: 0 },
    ]);
  });

  it("keeps only the window before the death", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000 });
    recorder.observeHealth(0, 3000);
    recorder.record({ at: 5_000, kind: "chat", senderGuid: GANKER, chatType: ChatType.Say, text: "old news" });
    recorder.record(hit(40_000, 3000));

    const report = recorder.observeHealth(40_001, 0);
    expect(report?.clues).toEqual([hit(40_000, 3000), { at: 40_001, kind: "health", health: 0 }]);
  });

  it("stays silent for a character first seen already dead", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000 });
    expect(recorder.observeHealth(0, 0)).toBeNull();
  });

  it("reports a death once, and again only after coming back to life", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000 });
    recorder.observeHealth(0, 3000);
    expect(recorder.observeHealth(1, 0)).not.toBeNull();
    expect(recorder.observeHealth(2, 0)).toBeNull(); // the same corpse, updated again
    recorder.observeHealth(3, 1500); // resurrected
    expect(recorder.observeHealth(4, 0)?.diedAt).toBe(4);
  });

  it("does not keep an unchanged health reading as a clue", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000 });
    recorder.observeHealth(0, 3000);
    recorder.observeHealth(1, 3000);
    expect(recorder.observeHealth(2, 0)?.clues).toEqual([
      { at: 0, kind: "health", health: 3000 },
      { at: 2, kind: "health", health: 0 },
    ]);
  });

  it("caps how many clues it holds, dropping the oldest", () => {
    const recorder = new DeathRecorder({ windowMs: 30_000, maxClues: 2 });
    recorder.observeHealth(0, 3000);
    recorder.record(hit(1, 10));
    recorder.record(hit(2, 20));
    expect(recorder.observeHealth(3, 0)?.clues).toEqual([hit(2, 20), { at: 3, kind: "health", health: 0 }]);
  });
});
