import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatType } from "../protocol/opcodes.js";
import type { UnitOwner } from "../protocol/unit-owner.js";
import type { DeathAccount } from "./death-report.js";
import { ListenerDeathWatch, type ListenerDeathWatchDeps } from "./listener-death-watch.js";

const US = 0x77n;
const GANKER = 0x555n;
const GRUNT = 0xf130_000c_9300_0042n;
const INFERNAL = 0xf130_0000_5900_0abcn; // creature entry 89

function setup(selfGuid: bigint | null = US) {
  const names = new Map<bigint, string>();
  const owners = new Map<bigint, UnitOwner>();
  const deps = {
    selfGuid: () => selfGuid,
    playerName: (guid: bigint) => names.get(guid),
    queryName: vi.fn<(guid: bigint) => void>(),
    queryCreature: vi.fn<(entry: number, guid: bigint) => void>(),
    ownerOf: vi.fn((guid: bigint): UnitOwner | null => owners.get(guid) ?? null),
    report: vi.fn<(death: DeathAccount) => void>(),
  } satisfies ListenerDeathWatchDeps;
  const watch = new ListenerDeathWatch(deps, { windowMs: 30_000, reportDelayMs: 2_000 });
  return { watch, deps, names, owners };
}

describe("ListenerDeathWatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports who killed us, once names have had a moment to resolve", () => {
    const { watch, deps, names } = setup();
    watch.health(3000);
    vi.advanceTimersByTime(1_000);
    watch.combat({ kind: "spell", attacker: GANKER, target: US, spellId: 12294, damage: 3000 });
    watch.health(0);

    names.set(GANKER, "Ganker"); // the name query answers during the grace period
    expect(deps.report).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000);

    expect(deps.report).toHaveBeenCalledTimes(1);
    const death = deps.report.mock.calls[0]?.[0];
    expect(death?.verdict).toBe("killing blow: Ganker (player) hits us for 3000 with spell 12294");
    expect(death?.timeline).toContain("   0.0s  health 0 — dead");
  });

  it("names a player attacker by name query and an NPC by creature query", () => {
    const { watch, deps } = setup();
    watch.combat({ kind: "melee", attacker: GANKER, target: US, damage: 10 });
    watch.combat({ kind: "melee", attacker: GRUNT, target: US, damage: 10 });
    expect(deps.queryName).toHaveBeenCalledWith(GANKER);
    expect(deps.queryCreature).toHaveBeenCalledWith(0x0c93, GRUNT);
  });

  it("uses creature names as they are answered", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    watch.combat({ kind: "melee", attacker: GRUNT, target: US, damage: 3000 });
    watch.creatureName(0x0c93, "Orgrimmar Grunt");
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].verdict).toContain("Orgrimmar Grunt (npc) hits us for 3000 (melee)");
  });

  it("names whoever the attacker answered to, asking for their name at the hit", () => {
    const { watch, deps, names, owners } = setup();
    owners.set(INFERNAL, { relation: "controlled", guid: GANKER, current: false });
    watch.health(100);
    watch.combat({ kind: "spell", attacker: INFERNAL, target: US, spellId: 20153, damage: 100 });
    expect(deps.queryCreature).toHaveBeenCalledWith(89, INFERNAL);
    expect(deps.queryName).toHaveBeenCalledWith(GANKER);

    watch.creatureName(89, "Infernal");
    names.set(GANKER, "Ganker");
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].verdict).toBe(
      "killing blow: Infernal (npc) formerly controlled by Ganker (player) hits us for 100 with spell 20153",
    );
  });

  it("keeps the owner as it stood at the hit, after the unit is gone from view", () => {
    const { watch, deps, names, owners } = setup();
    owners.set(INFERNAL, { relation: "created", guid: GANKER, current: true });
    names.set(GANKER, "Ganker");
    watch.health(100);
    watch.combat({ kind: "spell", attacker: INFERNAL, target: US, spellId: 20153, damage: 100 });
    owners.delete(INFERNAL); // it despawned before the report was written
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].verdict).toContain("creature #89 (npc) created by Ganker (player) hits us");
  });

  it("looks for no owner behind damage from the world", () => {
    const { watch, deps } = setup();
    watch.combat({ kind: "environmental", target: US, cause: "falling", damage: 50 });
    expect(deps.ownerOf).not.toHaveBeenCalled();
  });

  it("ignores hits on anyone else", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    watch.combat({ kind: "melee", attacker: GRUNT, target: GANKER, damage: 500 });
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.queryCreature).not.toHaveBeenCalled();
    expect(deps.report.mock.calls[0]?.[0].verdict).toMatch(/^no damage was seen/);
  });

  it("keeps nearby chat without naming the speaker while we are alive", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    watch.chat({ type: ChatType.Say, language: 1, senderGuid: GANKER, text: "hello" });
    watch.chat({ type: ChatType.Yell, language: 1, senderGuid: 0x999n, text: "wts" });
    expect(deps.queryName).not.toHaveBeenCalled();
  });

  it("names the speakers in the window when we die, before the report is written", () => {
    const { watch, deps, names } = setup();
    watch.health(3000);
    watch.chat({ type: ChatType.Yell, language: 1, senderGuid: GANKER, text: "die bot" });
    watch.health(0);
    expect(deps.queryName).toHaveBeenCalledWith(GANKER);

    names.set(GANKER, "Ganker"); // answered during the grace period
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].timeline).toContain('   0.0s  Ganker (player) yells: "die bot"');
  });

  it("shows a speaker whose name never came back by guid, keeping the line", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    watch.chat({ type: ChatType.Say, language: 1, senderGuid: GANKER, text: "hm" });
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].timeline).toContain('   0.0s  0x555 (player) says: "hm"');
  });

  it("includes system messages in the report", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    vi.advanceTimersByTime(5_000);
    watch.system("You have been kicked from the battleground queue.");
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.report.mock.calls[0]?.[0].timeline).toContain(
      '   0.0s  system: "You have been kicked from the battleground queue."',
    );
    expect(deps.queryName).not.toHaveBeenCalled(); // a system message names no one
  });

  it("records nothing before it knows who we are", () => {
    const { watch, deps } = setup(null);
    watch.health(3000);
    watch.combat({ kind: "melee", attacker: GANKER, target: US, damage: 3000 });
    watch.health(0);
    vi.advanceTimersByTime(2_000);
    expect(deps.queryName).not.toHaveBeenCalled();
    expect(deps.report).not.toHaveBeenCalled();
  });

  it("drops a pending report when the session ends", () => {
    const { watch, deps } = setup();
    watch.health(3000);
    watch.health(0);
    watch.dispose();
    vi.advanceTimersByTime(2_000);
    expect(deps.report).not.toHaveBeenCalled();
  });
});
