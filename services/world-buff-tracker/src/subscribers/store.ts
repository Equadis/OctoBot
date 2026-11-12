import { FACTIONS, type Faction } from "../watcher/buff-store.js";

/**
 * Persistence for who wants raid alerts, and which side they care about. The rest
 * of the bot depends only on this interface, so the Mongo-backed store and the
 * in-memory test fake are interchangeable. Character names are the identity (unique
 * per realm), matched case-insensitively; the display casing from subscribe is kept.
 * Alerts are delivered by in-game whisper only — Discord is a separate channel post.
 */

export type { Faction };

/**
 * Which side(s) a subscriber wants alerts for — the Rallying Cry drops per capital
 * (Stormwind = alliance, Orgrimmar = horde), and a subscriber only cares about their
 * own. Defaults to BOTH until we learn their side (a `/who` at subscribe, or a manual
 * alliance/horde command), so nobody silently misses a buff.
 */
export const DEFAULT_FACTIONS: readonly Faction[] = FACTIONS;

export function isFaction(value: string): value is Faction {
  return FACTIONS.some((faction) => faction === value);
}

/**
 * How a subscriber's `factions` was decided:
 *   - "manual"  — the player ran an explicit alliance/horde/both command,
 *   - "auto"    — resolved from the listener they came through, or a /who,
 *   - "default" — the both-default we haven't resolved yet.
 * Auto-resolution (at subscribe or retroactively on a listener contact) must NEVER override a
 * "manual" choice, so a player who deliberately picked "both" keeps it.
 */
export type FactionSource = "manual" | "auto" | "default";

export interface Subscriber {
  readonly name: string;
  readonly factions: readonly Faction[];
  readonly factionSource: FactionSource;
  readonly subscribedAt: Date;
}

/** Fields a subscriber can change after subscribing. Omit a field to leave it. */
export interface SubscriberUpdate {
  readonly factions?: readonly Faction[];
  readonly factionSource?: FactionSource;
}

export interface SubscriberStore {
  /** Add a subscriber. True if newly added. */
  add(name: string): Promise<boolean>;
  /** Remove a subscriber. True if one was removed. */
  remove(name: string): Promise<boolean>;
  has(name: string): Promise<boolean>;
  get(name: string): Promise<Subscriber | null>;
  /** Apply changes to an existing subscriber. False if they aren't subscribed. */
  update(name: string, changes: SubscriberUpdate): Promise<boolean>;
  all(): Promise<Subscriber[]>;
  close(): Promise<void>;
}

/** Canonical case-insensitive key for a character name. */
export function subscriberKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Whether a subscriber's side is still the unresolved "both" default and so is a candidate for
 * resolution — both factions AND not a "manual" choice. The backlog both the passive listener
 * re-resolve and the active /who resolver target; never touches a deliberate "both".
 */
export function needsFactionResolution(sub: Subscriber): boolean {
  return (
    sub.factionSource !== "manual" &&
    sub.factions.includes("alliance") &&
    sub.factions.includes("horde")
  );
}
