/**
 * The two places the Darkmoon Faire is ever found, and what to call them.
 *
 * Deliberately all this module knows. There is no schedule here and nowhere else either: the bot
 * learns where the faire is by SEEING it, never by computing it. Turtle does not run the vanilla
 * calendar — it alternates weekly and is up almost every day — and a rule copied from anywhere is
 * one server patch away from being confidently wrong, in a way nobody notices for a month.
 * Observation cannot go stale like that; it just gets old, and says so.
 */

export type FaireLocation = "elwynn" | "mulgore";

export const FAIRE_LOCATIONS: readonly FaireLocation[] = ["elwynn", "mulgore"];

export function isFaireLocation(value: string): value is FaireLocation {
  return FAIRE_LOCATIONS.some((location) => location === value);
}

/** Reader-facing names: the zone, and the landmark a player actually navigates to. */
export interface FaireSite {
  readonly zone: string;
  readonly landmark: string;
}

export const FAIRE_SITES: Record<FaireLocation, FaireSite> = {
  elwynn: { zone: "Elwynn Forest", landmark: "south of Goldshire" },
  mulgore: { zone: "Mulgore", landmark: "below Thunder Bluff" },
};
