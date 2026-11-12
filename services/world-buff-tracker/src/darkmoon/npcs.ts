/**
 * The Darkmoon Faire's travelling staff, matched by NAME.
 *
 * This is the roster PizzaWorldBuffs matches on, and it is the whole faire: if any of these is
 * standing next to us, the faire is here. Names rather than entry ids on purpose — an entry table
 * would be copied from a database and never checked against this realm, and a wrong id fails
 * SILENTLY, leaving a detector that never fires and an absent faire that looks identical. A wrong
 * name shows up in the log the first time we stand next to the tents.
 *
 * "Darkmoon Faire Carnie" is deliberately NOT on this list. Carnies stand in the capitals all
 * month whether or not a faire is running, which is exactly the bug that made PizzaWorldBuffs
 * 1.4.0 report faires that were not there (see `pwb.ts`, which rejects that version for it).
 * Including them would report a faire every single day.
 */

const FAIRE_NPCS: ReadonlySet<string> = new Set([
  "Silas Darkmoon",
  "Sayge",
  "Flik",
  "Flik's Frog",
  "Burth",
  "Lhara",
  "Morja",
  "Jubjub",
  "Chronos",
  "Felinni",
  "Rinling",
  "Sylannia",
  "Hornsley",
  "Kerri Hicks",
  "Yebb Neblegear",
  "Selina Dourman",
  "Khaz Modan Ram",
  "Pygmy Cockatrice",
  "Gelvas Grimegate",
  "Stamp Thunderhorn",
  "Maxima Blastenheimer",
  "Professor Thaddeus Paleo",
]);

/** Whether a resolved NPC name belongs to the faire itself. */
export function isFaireNpc(name: string): boolean {
  return FAIRE_NPCS.has(name.trim());
}

/** The roster, for the startup log and tests. */
export function faireNpcNames(): readonly string[] {
  return [...FAIRE_NPCS];
}
