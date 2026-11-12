import { unitRef } from "../protocol/guid.js";
import { ChatType } from "../protocol/opcodes.js";
import type { UnitOwner } from "../protocol/unit-owner.js";
import type { DeathClue, DeathReport } from "./death-recorder.js";

/**
 * Turns a death report into log lines a person can read: who hit us (and whose it was, for a pet,
 * guardian or charmed unit), with what, what was said nearby, and a one-line verdict naming the
 * killing blow.
 *
 * Names are looked up at format time, so whatever resolved while the fight was on is used; a unit
 * still unnamed is shown by its guid, which is enough to look it up later.
 */

export interface UnitNames {
  /** A player's name, when a name query has resolved it. */
  player(guid: bigint): string | undefined;
  /** A creature entry's name, when a creature query has resolved it. */
  creature(entry: number): string | undefined;
}

export function describeUnit(guid: bigint, selfGuid: bigint, names: UnitNames): string {
  if (guid === selfGuid) return "us";
  const ref = unitRef(guid);
  const hex = `0x${guid.toString(16)}`;
  switch (ref.kind) {
    case "player":
      return `${names.player(guid) ?? hex} (player)`;
    case "creature":
      return `${names.creature(ref.entry) ?? `creature #${ref.entry}`} (npc)`;
    case "pet":
      return `${names.creature(ref.entry) ?? `pet #${ref.entry}`} (pet)`;
    case "other":
      return hex;
  }
}

type CombatClue = Extract<DeathClue, { kind: "combat" }>;

/** Who a unit answers to: "controlled by Xyz (player)", or "formerly …" once it broke free. */
function describeOwner(owner: UnitOwner, selfGuid: bigint, names: UnitNames): string {
  return `${owner.current ? "" : "formerly "}${owner.relation} by ${describeUnit(owner.guid, selfGuid, names)}`;
}

function describeAttacker(guid: bigint, owner: UnitOwner | null, selfGuid: bigint, names: UnitNames): string {
  const unit = describeUnit(guid, selfGuid, names);
  return owner ? `${unit} ${describeOwner(owner, selfGuid, names)}` : unit;
}

function describeCombat({ event, attackerOwner }: CombatClue, selfGuid: bigint, names: UnitNames): string {
  const target = describeUnit(event.target, selfGuid, names);
  if (event.kind === "environmental") return `${target} takes ${event.damage} ${event.cause} damage`;
  const attacker = describeAttacker(event.attacker, attackerOwner, selfGuid, names);
  switch (event.kind) {
    case "attack-start":
      return `${attacker} starts attacking ${target}`;
    case "melee":
      return `${attacker} hits ${target} for ${event.damage} (melee)`;
    case "spell":
      return `${attacker} hits ${target} for ${event.damage} with spell ${event.spellId}`;
    case "periodic":
      return `${attacker} ticks ${target} for ${event.damage} with spell ${event.spellId}`;
  }
}

const CHAT_VERBS: ReadonlyMap<number, string> = new Map([
  [ChatType.Say, "says"],
  [ChatType.Yell, "yells"],
  [ChatType.Emote, "emotes"],
]);

function describeClue(clue: DeathClue, selfGuid: bigint, names: UnitNames): string {
  switch (clue.kind) {
    case "combat":
      return describeCombat(clue, selfGuid, names);
    case "chat":
      return `${describeUnit(clue.senderGuid, selfGuid, names)} ${CHAT_VERBS.get(clue.chatType) ?? "says"}: ${JSON.stringify(clue.text)}`;
    case "system":
      return `system: ${JSON.stringify(clue.text)}`;
    case "health":
      return clue.health === 0 ? "health 0 — dead" : `health ${clue.health}`;
  }
}

/** The last damage we took before the death, or null when none was seen. */
function killingBlowClue(report: DeathReport, selfGuid: bigint): CombatClue | null {
  for (let i = report.clues.length - 1; i >= 0; i -= 1) {
    const clue = report.clues[i];
    if (clue?.kind !== "combat" || clue.event.kind === "attack-start") continue;
    if (clue.event.target !== selfGuid) continue;
    return clue;
  }
  return null;
}

/** Where the last damage before the death came from, or null when none was seen. */
export function killingBlow(report: DeathReport, selfGuid: bigint, names: UnitNames): string | null {
  const clue = killingBlowClue(report, selfGuid);
  return clue ? describeCombat(clue, selfGuid, names) : null;
}

/**
 * The player to blame for a blow: whoever held, summoned or made the attacker, or the attacker
 * itself when it answers to no one. A unit whose owner is not a player — an NPC's add, a player
 * mind-controlled by an NPC — puts no player to blame.
 */
function blamedPlayer({ event, attackerOwner }: CombatClue): bigint | null {
  if (event.kind === "environmental") return null;
  const blamed = attackerOwner ? attackerOwner.guid : event.attacker;
  return unitRef(blamed).kind === "player" ? blamed : null;
}

/** The player behind a death. */
export interface Culprit {
  readonly guid: bigint;
  /** Null when the name query had not answered by the time the report was written. */
  readonly name: string | null;
}

/** What a death report says, before it is laid out for the log or for Discord. */
export interface DeathAccount {
  /** The killing blow — who, whose, with what — or that no damage was seen. */
  readonly verdict: string;
  /** Every clue, oldest first, each timed relative to the death. */
  readonly timeline: readonly string[];
  /** The player the killing blow comes back to, or null when it was no player's doing. */
  readonly culprit: Culprit | null;
}

/** Put the report into words: a verdict, then every clue timed relative to the death. */
export function describeDeath(report: DeathReport, selfGuid: bigint, names: UnitNames): DeathAccount {
  const blow = killingBlowClue(report, selfGuid);
  const verdict = blow
    ? `killing blow: ${describeCombat(blow, selfGuid, names)}`
    : "no damage was seen before it — not killed by a hit we could see (an instant kill, or the combat log was not sent)";
  const timeline = report.clues.map((clue) => {
    const offset = ((clue.at - report.diedAt) / 1000).toFixed(1).padStart(6);
    return `${offset}s  ${describeClue(clue, selfGuid, names)}`;
  });
  const blamed = blow ? blamedPlayer(blow) : null;
  const culprit = blamed === null ? null : { guid: blamed, name: names.player(blamed) ?? null };
  return { verdict, timeline, culprit };
}

/** The account as log lines: the verdict, then the timeline indented under it. */
export function formatDeathReport(account: DeathAccount, windowMs: number): string[] {
  return [
    `DIED — ${account.verdict}. Last ${Math.round(windowMs / 1000)}s:`,
    ...account.timeline.map((line) => `  ${line}`),
  ];
}
