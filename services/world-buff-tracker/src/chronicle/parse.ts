import type { ChronicleEncounter, ChronicleLog, OnyxiaKill } from "./types.js";

/**
 * Turns the untyped /recent JSON into typed logs. Everything is validated field-by-field
 * (no casting) and anything malformed is skipped rather than throwing, because an external
 * site changing one field must not take the poller down — a dropped log is better than a crash.
 */
export function parseChronicleResponse(json: unknown): ChronicleLog[] {
  if (!isRecord(json) || !Array.isArray(json.instances)) return [];
  const out: ChronicleLog[] = [];
  for (const raw of json.instances) {
    const log = toLog(raw);
    if (log) out.push(log);
  }
  return out;
}

/** The clean-Onyxia-kill test: the boss encounter "Onyxia" present with a "clean" kill_type.
 *  A log can list Onyxia among many encounters (whelps, warders), so scan rather than take one. */
export function hasCleanOnyxiaKill(log: ChronicleLog): boolean {
  return log.encounters.some((e) => e.name === "Onyxia" && e.boss && e.kill_type === "clean");
}

/**
 * The clean Onyxia kills on `realm`, normalised. Filters to the realm, keeps only logs whose
 * encounters include a clean Onyxia kill, and drops any with an unparseable timestamp (they
 * can't be reconciled against a time window, so they're worthless here).
 */
export function cleanOnyxiaKills(logs: readonly ChronicleLog[], realm: string): OnyxiaKill[] {
  const out: OnyxiaKill[] = [];
  for (const log of logs) {
    if (log.realm_name !== realm || !hasCleanOnyxiaKill(log)) continue;
    const at = new Date(log.first_encounter_time);
    if (Number.isNaN(at.getTime())) continue;
    out.push({
      logId: log.id,
      realm: log.realm_name,
      uploader: log.uploader_name,
      guild: log.guild_name.trim() === "" ? null : log.guild_name,
      at,
      playerCount: log.player_count,
    });
  }
  return out;
}

function toLog(raw: unknown): ChronicleLog | null {
  if (!isRecord(raw)) return null;
  const { id, realm_name, uploader_name, guild_name, first_encounter_time, player_count, encounters } = raw;
  if (
    typeof id !== "string" ||
    typeof realm_name !== "string" ||
    typeof uploader_name !== "string" ||
    typeof first_encounter_time !== "string" ||
    typeof player_count !== "number" ||
    !Array.isArray(encounters)
  ) {
    return null;
  }
  const parsedEncounters: ChronicleEncounter[] = [];
  for (const e of encounters) {
    const encounter = toEncounter(e);
    if (encounter) parsedEncounters.push(encounter);
  }
  return {
    id,
    realm_name,
    uploader_name,
    guild_name: typeof guild_name === "string" ? guild_name : "",
    first_encounter_time,
    player_count,
    encounters: parsedEncounters,
  };
}

function toEncounter(raw: unknown): ChronicleEncounter | null {
  if (!isRecord(raw)) return null;
  const { name, boss, kill_type } = raw;
  if (typeof name !== "string" || typeof boss !== "boolean" || typeof kill_type !== "string") return null;
  return { name, boss, kill_type };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
