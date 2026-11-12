import type { OnyxiaKill } from "./types.js";

/**
 * The clean Onyxia kills that CONFIRM a specific detected raid: uploaded by one of that raid's
 * roster members, with a kill (pull) time inside the raid's active span. A match is proof this
 * exact raid downed Onyxia — the confirmation the caller lays on top of its own /who departure
 * detection, never a substitute for it. Names compared case-insensitively (WoW names). Pure.
 *
 * `spanFromMs`/`spanToMs` bound the pull time so a roster member's kill from an EARLIER raid
 * (Chronicle's window can hold ~a day of logs) can't be mistaken for this one.
 */
export function confirmingKills(
  kills: readonly OnyxiaKill[],
  roster: readonly string[],
  spanFromMs: number,
  spanToMs: number,
): OnyxiaKill[] {
  const members = new Set(roster.map((n) => n.toLowerCase()));
  return kills.filter((kill) => {
    const t = kill.at.getTime();
    return t >= spanFromMs && t <= spanToMs && members.has(kill.uploader.toLowerCase());
  });
}
