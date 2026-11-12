import type { LairStatus } from "./chat/command-router.js";
import type { RaidWatchConfig, RealmType } from "./config.js";
import type { DetectionLane } from "./lanes.js";
import type { GroupingMode } from "./watcher/raid-events.js";
import { RaidTracker, type RaidTrackerOptions } from "./watcher/raid-tracker.js";
import type { RaidZone, RaidZoneId } from "./watcher/raid-zone.js";

/**
 * Where one lair's raids are kept apart in MongoDB: its raid-number counter, alert ledger, clear
 * times and poll snapshots. Onyxia's are the original names, so its history carries on untouched;
 * Blackwing Lair's are prefixed, so its hours-long clears never skew Onyxia's timer, and its alerts
 * never dedup against Onyxia's.
 */
export interface RaidZoneStoreNames {
  readonly counterId: string;
  readonly broadcasts: string;
  readonly durations: string;
  readonly snapshots: string;
}

export const RAID_ZONE_STORE_NAMES: Readonly<Record<RaidZoneId, RaidZoneStoreNames>> = {
  onyxia: { counterId: "raid", broadcasts: "broadcasts", durations: "raiddurations", snapshots: "snapshots" },
  bwl: { counterId: "raid-bwl", broadcasts: "bwlbroadcasts", durations: "bwlraiddurations", snapshots: "bwlsnapshots" },
};

/** Which slice of a lair a lane watches: the whole lair (crossfaction) or one side. */
export type LaneSlice = "lair" | "alliance" | "horde";

/**
 * A lane's label — the key its raid in progress and lockouts persist under. Onyxia's keep their
 * original "lair"/"alliance"/"horde", so a raid in progress at deploy resumes; Blackwing Lair's are
 * "bwl"/"bwl-alliance"/"bwl-horde".
 */
export function laneLabel(zone: RaidZoneId, slice: LaneSlice): string {
  if (zone === "onyxia") return slice;
  return slice === "lair" ? zone : `${zone}-${slice}`;
}

/** A lair's RaidTracker settings, from its watch config. */
export function trackerOptions(
  watch: RaidWatchConfig,
  grouping: GroupingMode,
  nextRaidNumber: () => number,
): RaidTrackerOptions {
  return {
    minRaidSize: watch.minRaidSize,
    grouping,
    clearSize: watch.raidClearSize,
    strengthSize: watch.raidStrengthSize,
    leftFloor: watch.raidLeftFloor,
    clearSustainedMs: watch.raidClearSustainedMs,
    formConfirmMs: watch.raidFormConfirmMs,
    fillWindowMs: watch.raidFillWindowMs,
    rosterCap: watch.raidRosterCap,
    lockoutMs: watch.raidLockoutMs,
    nextRaidNumber,
  };
}

/** A lair's detection lanes: one over the whole lair gating both cities on a crossfaction realm,
 *  else one per side, each gating its own capital. */
export function buildLanes(zone: RaidZoneId, realmType: RealmType, options: RaidTrackerOptions): DetectionLane[] {
  if (realmType === "faction") {
    return [
      { label: laneLabel(zone, "alliance"), watch: new RaidTracker(options), cities: ["alliance"], players: (s) => s.alliance },
      { label: laneLabel(zone, "horde"), watch: new RaidTracker(options), cities: ["horde"], players: (s) => s.horde },
    ];
  }
  return [
    {
      label: laneLabel(zone, "lair"),
      watch: new RaidTracker(options),
      cities: ["alliance", "horde"],
      players: (s) => [...s.alliance, ...s.horde, ...s.unknown],
    },
  ];
}

/** A lair's raid in progress for the whisper status, read across its lanes: the longest-running
 *  raid's time in, and the first numbered raid. */
export function lairStatus(zone: RaidZone, lanes: readonly DetectionLane[], now: number): LairStatus {
  const elapsed = lanes.map((lane) => lane.watch.raidElapsedMs(now)).filter((ms): ms is number => ms !== null);
  const number = lanes.map((lane) => lane.watch.raidNumber()).find((n): n is number => n !== null) ?? null;
  return {
    raidName: zone.raidName,
    raids: lanes.flatMap((lane) => lane.watch.activeRaids()),
    elapsedMs: elapsed.length > 0 ? Math.max(...elapsed) : null,
    number,
  };
}
