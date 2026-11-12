/**
 * Types for the Chronicle Classic cross-reference. Chronicle is a community raid-log site;
 * each player running the logging addon uploads their OWN log of a raid, so one real raid
 * appears as several logs (one per uploader). We use it as an after-the-fact GROUND TRUTH for
 * Onyxia kills on our realm, to confirm the raids we detected via /who and surface the ones we
 * missed. It is NOT a live signal — uploads land after the raid — so it never drives alerts.
 */

/** A raid log as Chronicle's /recent returns it — only the fields we read, mirroring the wire
 *  shape (snake_case) so parsing is a plain field check with no renaming guesswork. */
export interface ChronicleLog {
  readonly id: string;
  readonly realm_name: string;
  readonly uploader_name: string;
  readonly guild_name: string;
  readonly first_encounter_time: string;
  readonly player_count: number;
  readonly encounters: readonly ChronicleEncounter[];
}

export interface ChronicleEncounter {
  readonly name: string;
  readonly boss: boolean;
  readonly kill_type: string;
}

/**
 * A clean Onyxia kill, normalised from a log — the unit we reconcile against our /who rosters.
 * `uploader` is the ONE character name a log carries (the player who uploaded it); a real raid
 * yields several kills with different uploaders, all of whom should be in the same roster window.
 */
export interface OnyxiaKill {
  readonly logId: string;
  readonly realm: string;
  readonly uploader: string;
  readonly guild: string | null;
  readonly at: Date;
  readonly playerCount: number;
}
