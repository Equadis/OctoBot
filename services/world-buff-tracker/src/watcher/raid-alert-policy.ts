import type { Logger } from "../logger.js";
import type { Faction } from "./buff-store.js";
import { onBuffCooldown, shouldBroadcastRaid, type BroadcastKind, type BroadcastRecord } from "./broadcast-ledger.js";

/**
 * The ONE place that decides whether a raid alert fires and to which cities — the dedup, the buff
 * cooldown, and the faction routing that used to be smeared across gateAndAnnounce and
 * announceRaidEnding. See RAID_ARCHITECTURE.md (RaidAlertPolicy layer).
 *
 * Per city: skip it if its side is within the buff cooldown (a fresh Rallying Cry can't drop yet),
 * else fire it unless this exact raid was already broadcast for this (city, kind) — the per-raid dedup
 * that lets every DISTINCT raid alert both sides while a single raid's wipe/churn re-emit is
 * suppressed. Reading the ledger + buff state is injected, so the whole decision is unit-tested.
 */
export interface RaidAlertPolicyDeps {
  /** The last broadcast recorded for a (city, kind), or null. */
  readonly lastBroadcast: (city: Faction, kind: BroadcastKind) => Promise<Pick<BroadcastRecord, "raidNumber" | "lastBroadcastAt"> | null>;
  /** When this side's Rallying Cry last dropped, or null. */
  readonly lastBuffDropAt: (city: Faction) => Promise<Date | null>;
  readonly cooldownMs: number;
  readonly dedupMs: number;
  readonly logger?: Pick<Logger, "info">;
}

export interface RaidAlertRequest {
  /** Candidate cities (the lane's sides — both in crossfaction, the one side in faction mode). */
  readonly cities: readonly Faction[];
  readonly kind: BroadcastKind;
  readonly raidNumber: number | null;
  /** Lane label for the suppression log line (e.g. "lair"). */
  readonly label: string;
  /** The poll's timestamp (shared across the cooldown + dedup checks). */
  readonly now: number;
}

export class RaidAlertPolicy {
  readonly #deps: RaidAlertPolicyDeps;

  constructor(deps: RaidAlertPolicyDeps) {
    this.#deps = deps;
  }

  /** The cities this event should alert — empty if every candidate is suppressed. */
  async decide(req: RaidAlertRequest): Promise<Faction[]> {
    const { lastBroadcast, lastBuffDropAt, cooldownMs, dedupMs, logger } = this.#deps;
    const fresh: Faction[] = [];
    for (const city of req.cities) {
      const dropAt = await lastBuffDropAt(city);
      if (onBuffCooldown(dropAt, req.now, cooldownMs)) {
        logger?.info(`${req.label} ${req.kind} for ${city} suppressed — Rallying Cry on cooldown`);
        continue;
      }
      const last = await lastBroadcast(city, req.kind);
      if (shouldBroadcastRaid(last, req.raidNumber, dropAt, req.now, dedupMs)) {
        fresh.push(city);
      } else {
        logger?.info(
          `${req.label} ${req.kind} for ${city} suppressed — ` +
            (req.raidNumber != null ? `already broadcast for raid #${req.raidNumber}` : "already broadcast this cycle"),
        );
      }
    }
    return fresh;
  }
}
