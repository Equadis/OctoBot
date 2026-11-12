import { FAIRE_SITES, type FaireLocation, type FaireSite } from "./location.js";

/**
 * What the bot knows about the Darkmoon Faire: the last time it was actually SEEN, and by whom.
 *
 * Two sources, and nothing else:
 *
 *   onsite    our own character, parked at a faire site, with the faire's staff standing next to
 *             it. First-party and unforgeable — but it only ever covers the one zone it is parked
 *             in, and sees nothing at all while the faire is in the other.
 *   sighting  a PizzaWorldBuffs broadcast on the LFT channel: some player mouseovered a faire NPC
 *             and their client told the realm. Covers both zones, but it is text a player typed,
 *             so it only counts once enough distinct senders agree (see `corroboration.ts`).
 *
 * The newest observation wins, because the faire really does move and the fresher look is simply
 * the more current one. A tie goes to our own eyes.
 *
 * There is no calendar. Nothing here predicts where the faire will be, only where it was last
 * seen and how long ago — the same answer PizzaWorldBuffs gives, for the same reason: a schedule
 * is a guess about a server that can change it, while an observation is a fact that merely ages.
 */

export type ObservationSource = "onsite" | "sighting";

export interface FaireObservation {
  readonly location: FaireLocation;
  /** When the faire was seen — not when we heard about it. */
  readonly observedAt: number;
  readonly source: ObservationSource;
  /** The NPC we saw, or the player who saw it. Forgeable for a sighting, so it is for logs only. */
  readonly witness: string;
}

/** The newest observation held from each source. Either may be absent. */
export interface FaireKnowledge {
  readonly onsite: FaireObservation | null;
  readonly sighting: FaireObservation | null;
}

export const NO_KNOWLEDGE: FaireKnowledge = { onsite: null, sighting: null };

/**
 * How recent a look has to be to state plainly that the faire IS there.
 *
 * The faire sits in one zone for about a week, in a zone busy with players, and every PWB client
 * rebroadcasts what it knows every 10-60s — so while it is somewhere, the newest sighting is
 * minutes old around the clock. A few hours of silence is therefore already unusual, and the
 * honest thing past that is to date the observation rather than assert the present tense.
 */
export const FRESH_MS = 6 * 3_600_000;

/**
 * How old an observation may be before it is not worth repeating at all.
 *
 * Matches the window PizzaWorldBuffs itself will accept a sighting within, and for the same
 * reason: the faire moves on a weekly rhythm, so a week-old look describes a faire that has
 * almost certainly packed up and gone to the other zone. Saying nothing beats saying that.
 */
export const STALE_MS = 7 * 86_400_000;

export type FaireAnswer =
  /** Nothing has been seen recently enough to be worth saying. */
  | { readonly known: false }
  | {
      readonly known: true;
      readonly location: FaireLocation;
      readonly site: FaireSite;
      readonly observedAt: number;
      readonly source: ObservationSource;
      readonly witness: string;
      /** True = seen recently enough to state in the present tense. False = date it instead. */
      readonly fresh: boolean;
    };

/**
 * The most recent usable observation. An observation dated in the future is clock skew or a
 * forgery and is never treated as the latest word.
 */
function newest(knowledge: FaireKnowledge, now: number): FaireObservation | null {
  const candidates = [knowledge.onsite, knowledge.sighting].filter(
    (observation): observation is FaireObservation => observation !== null && observation.observedAt <= now,
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, candidate) => {
    if (candidate.observedAt > best.observedAt) return candidate;
    // Same instant: believe our own character over a stranger's broadcast.
    if (candidate.observedAt === best.observedAt && candidate.source === "onsite") return candidate;
    return best;
  });
}

/** Where the faire is, as far as anyone has actually looked. */
export function answerFaire(knowledge: FaireKnowledge, now: number): FaireAnswer {
  const observation = newest(knowledge, now);
  if (observation === null) return { known: false };
  const age = now - observation.observedAt;
  if (age > STALE_MS) return { known: false };
  return {
    known: true,
    location: observation.location,
    site: FAIRE_SITES[observation.location],
    observedAt: observation.observedAt,
    source: observation.source,
    witness: observation.witness,
    fresh: age <= FRESH_MS,
  };
}
