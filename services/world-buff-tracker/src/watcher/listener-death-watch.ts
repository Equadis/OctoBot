import type { IncomingChat } from "../protocol/chat.js";
import type { CombatEvent } from "../protocol/combat-log.js";
import { unitRef } from "../protocol/guid.js";
import type { UnitOwner } from "../protocol/unit-owner.js";
import { DeathRecorder, type DeathClue } from "./death-recorder.js";
import { describeDeath, type DeathAccount } from "./death-report.js";

/**
 * One listener session's account of its own death.
 *
 * Feeds the recorder the combat log lines that hit us, nearby player chat, server system messages
 * and our health. Whoever hits us is named at once (a name query for a player, a creature query for
 * an NPC) — that only happens in a real fight. So is whoever that attacker answers to, as it stood
 * at the hit: the warlock behind an Infernal, the hunter behind a pet.
 *
 * Nearby speakers are NOT: a capital talks all day, and naming every one would be a steady stream
 * of queries and an ever-growing name cache for a report that almost never comes. They are named
 * when a death actually needs them, and the report waits a moment for those answers before it is
 * handed to `report`; one still unanswered by then is shown by its GUID.
 */

export interface ListenerDeathWatchDeps {
  /** Our character's GUID, once logged in. */
  readonly selfGuid: () => bigint | null;
  readonly playerName: (guid: bigint) => string | undefined;
  /** Resolve a player's name in the background. */
  readonly queryName: (guid: bigint) => void;
  /** Resolve a creature entry's name in the background; `guid` is a live instance of it. */
  readonly queryCreature: (entry: number, guid: bigint) => void;
  /** Who a unit in view answers to — its charmer, summoner or creator — or null for no one. */
  readonly ownerOf: (guid: bigint) => UnitOwner | null;
  /** The death, put into words once the names have had their moment. */
  readonly report: (death: DeathAccount) => void;
}

export interface ListenerDeathWatchOptions {
  /** How far back a report reaches. */
  readonly windowMs: number;
  /** Grace between the death and the report, for name queries still in flight. */
  readonly reportDelayMs: number;
}

export class ListenerDeathWatch {
  readonly #deps: ListenerDeathWatchDeps;
  readonly #options: ListenerDeathWatchOptions;
  readonly #recorder: DeathRecorder;
  readonly #creatureNames = new Map<number, string>();
  #reportTimer: NodeJS.Timeout | null = null;

  constructor(deps: ListenerDeathWatchDeps, options: ListenerDeathWatchOptions) {
    this.#deps = deps;
    this.#options = options;
    this.#recorder = new DeathRecorder({ windowMs: options.windowMs });
  }

  /** A combat log line. Only the ones aimed at us are kept; the city fights all day. */
  combat(event: CombatEvent): void {
    const self = this.#deps.selfGuid();
    if (self === null || event.target !== self) return;
    const attackerOwner = event.kind === "environmental" ? null : this.#deps.ownerOf(event.attacker);
    this.#recorder.record({ at: Date.now(), kind: "combat", event, attackerOwner });
    if (event.kind !== "environmental") this.#learnName(event.attacker);
    if (attackerOwner) this.#learnName(attackerOwner.guid);
  }

  /** A nearby player spoke. Kept, but not named until a death needs it. */
  chat(chat: IncomingChat): void {
    this.#recorder.record({
      at: Date.now(),
      kind: "chat",
      senderGuid: chat.senderGuid,
      chatType: chat.type,
      text: chat.text,
    });
  }

  /** A server system message — how the server explains a refused action or announces a change. */
  system(text: string): void {
    this.#recorder.record({ at: Date.now(), kind: "system", text });
  }

  /** A creature query answered. */
  creatureName(entry: number, name: string | null): void {
    if (name !== null) this.#creatureNames.set(entry, name);
  }

  /** Our health, from an object update. */
  health(health: number): void {
    const report = this.#recorder.observeHealth(Date.now(), health);
    const self = this.#deps.selfGuid();
    if (!report || self === null) return;
    for (const guid of involvedUnits(report.clues)) this.#learnName(guid);
    if (this.#reportTimer) clearTimeout(this.#reportTimer);
    this.#reportTimer = setTimeout(() => {
      this.#reportTimer = null;
      const names = {
        player: this.#deps.playerName,
        creature: (entry: number): string | undefined => this.#creatureNames.get(entry),
      };
      this.#deps.report(describeDeath(report, self, names));
    }, this.#options.reportDelayMs);
    this.#reportTimer.unref?.();
  }

  /** Drop a pending report — the session is gone. */
  dispose(): void {
    if (this.#reportTimer) clearTimeout(this.#reportTimer);
    this.#reportTimer = null;
  }

  #learnName(guid: bigint): void {
    const ref = unitRef(guid);
    if (ref.kind === "player") this.#deps.queryName(guid);
    else if (ref.kind === "creature" || ref.kind === "pet") this.#deps.queryCreature(ref.entry, guid);
  }
}

/** Every unit a report mentions by GUID, once each. */
function involvedUnits(clues: readonly DeathClue[]): Set<bigint> {
  const units = new Set<bigint>();
  for (const clue of clues) {
    if (clue.kind === "chat") units.add(clue.senderGuid);
    else if (clue.kind === "combat" && clue.event.kind !== "environmental") {
      units.add(clue.event.attacker);
      if (clue.attackerOwner) units.add(clue.attackerOwner.guid);
    }
  }
  return units;
}
