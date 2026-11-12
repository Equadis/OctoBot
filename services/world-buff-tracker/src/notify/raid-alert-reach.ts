import type { RaidEvent } from "../watcher/raid-events.js";

/**
 * How far each raid alert reaches.
 *
 * The start is only yelled in the capitals. Posted to Discord and whispered it was the weakest alert —
 * most raids that form see no buff within the hour — so there the "might end soon" is the first word of
 * a raid, sent early enough to act on, and the clear the second. A disband is posted and whispered too:
 * it stands down, on Discord and by whisper, whoever was told of the raid there.
 *
 * The start, the "might end soon" and the clear are yelled, so a player standing in the city hears the
 * raid through: that one is under way, when to come park, and that a head now exists. A disband is not.
 */

/** Every raid alert the service sends. */
export type RaidAlertKind = RaidEvent["kind"] | "raid-ending" | "raid-disbanded";

/** The raid alerts posted to the Discord channel and whispered to the subscribers. */
const POSTED_AND_WHISPERED: ReadonlySet<RaidAlertKind> = new Set<RaidAlertKind>(["raid-ending", "raid-left", "raid-disbanded"]);

/** The raid alerts yelled in the capitals too. A kind left out stays out of the city. */
const YELLED_IN_CAPITALS: ReadonlySet<RaidAlertKind> = new Set<RaidAlertKind>(["raid-forming", "raid-ending", "raid-left"]);

/**
 * Whether a buff drop is whispered to the subscribers. A drop they were told was coming — a raid
 * cleared — is, closing the loop for whoever waited in the city. A saved head is not: nothing led up
 * to it, the buff reaches only those already standing there, and a whisper minutes later would only
 * tell everyone else they missed it. Its Discord post stays, saying it was a saved head.
 */
export function isDropWhispered(savedHead: boolean): boolean {
  return !savedHead;
}

/** Whether `kind` is posted to the Discord channel and whispered to the subscribers. */
export function postedAndWhispered(kind: RaidAlertKind): boolean {
  return POSTED_AND_WHISPERED.has(kind);
}

/** Whether `kind` is yelled in the capitals as well. */
export function yelledInCapitals(kind: RaidAlertKind): boolean {
  return YELLED_IN_CAPITALS.has(kind);
}
