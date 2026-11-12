import {
  CORROBORATION_WINDOW_MS,
  DEFAULT_CORROBORATION,
  shouldSettle,
  SightingTally,
  type CorroborationPolicy,
  type SettledSighting,
} from "./corroboration.js";
import type { FaireLocation } from "./location.js";
import type { KnowledgeStore } from "./knowledge-store.js";
import { isFaireNpc } from "./npcs.js";
import {
  answerFaire,
  NO_KNOWLEDGE,
  type FaireAnswer,
  type FaireKnowledge,
  type FaireObservation,
} from "./observation.js";
import { isTrustedBroadcast, parseDmfBroadcast, sightedAt } from "./pwb.js";

/**
 * Holds where the Darkmoon Faire was last seen, fed by the two things the bot can actually
 * observe: its own parked character, and the PizzaWorldBuffs traffic on the LFT channel.
 *
 * The two are kept side by side rather than as one "latest observation" so the weaker source can
 * never quietly erase the stronger one's record — but when answering, the NEWEST wins, because the
 * faire moves and the fresher look is the more current one. Our own character is parked in exactly
 * one zone, so it goes quiet for the weeks the faire spends in the other; the channel covers that.
 *
 * Only the channel feed needs guarding. A `PWB_DMF:` line is text a player typed, so it has to
 * clear `corroboration.ts` before it counts. What our own client sees needs no such thing.
 */

/** What a line on the LFT channel did. Reported rather than reduced to a boolean so the caller can
 *  tell "nothing to do with us" from "we cannot identify senders any more", which look identical
 *  from outside and mean very different things. */
export type ObserveOutcome =
  /** Became the settled sighting. */
  | "accepted"
  /** A valid claim, counted towards consensus, not (yet) enough to settle. */
  | "counted"
  /** Not a faire broadcast, or from a client version whose sightings cannot be trusted. */
  | "ignored"
  /** A faire broadcast with no usable sender — it cannot vote, and a silent feed would follow. */
  | "unidentified";

/** The answer's zone changed. `from` is null when we had no usable answer before. */
export interface FaireMove {
  readonly from: FaireLocation | null;
  readonly to: FaireLocation;
  readonly observation: FaireObservation;
}

export interface FaireServiceDeps {
  readonly store: KnowledgeStore;
  /** Fired when an observation is accepted, so the caller can log it and redraw. */
  readonly onObservation?: (observation: FaireObservation) => void;
  /** Fired when accepting an observation CHANGES the answer's zone (or gives us one for the first
   *  time). Separate from onObservation because a move is the rare, interesting event — the rest is
   *  the same faire being re-seen — and a trail of moves is the only record of how this realm
   *  actually rotates, which nothing else here writes down. */
  readonly onMove?: (change: FaireMove) => void;
  /** How much agreement a channel sighting needs. Defaults to DEFAULT_CORROBORATION. */
  readonly corroboration?: CorroborationPolicy;
}

/** How often standing in the faire is worth re-recording. The staff re-enters visibility all day;
 *  the observation only needs to stay fresh enough to read as current, not to log every refresh. */
const ONSITE_REFRESH_MS = 30 * 60_000;

/**
 * How much fresher a channel sighting must be before it is worth recording again.
 *
 * PizzaWorldBuffs reports an AGE in whole seconds, so `seenAt = receivedAt - age` jitters by
 * milliseconds as the same sighting is rebroadcast — enough to look strictly newer every time, and
 * to write the same fact to Mongo every ten seconds forever. A genuinely fresher look (someone
 * walked past the tents again) moves it by minutes, so anything under this is the same look with
 * rounding noise on it. A different ZONE or a different WITNESS is always taken, whatever the gap.
 */
const SIGHTING_REFRESH_MS = 60_000;

/** Whether a channel sighting says anything the stored one does not. */
function isWorthRecording(
  current: FaireObservation,
  location: FaireLocation,
  witness: string,
  seenAt: number,
): boolean {
  // Never walk the record backwards: an older look is an older look, whoever made it.
  if (seenAt <= current.observedAt) return false;
  // A different zone or a different pair of eyes is new information, however small the gap.
  if (location !== current.location || witness !== current.witness) return true;
  // Same zone, same witness: only a real gap distinguishes a fresher look from rounding noise.
  return seenAt - current.observedAt >= SIGHTING_REFRESH_MS;
}

export class FaireService {
  readonly #deps: FaireServiceDeps;
  #knowledge: FaireKnowledge = NO_KNOWLEDGE;
  /** Live corroboration window over the LFT feed — deliberately not persisted. */
  readonly #tally = new SightingTally(CORROBORATION_WINDOW_MS);
  /** The zone the channel feed has settled on, for the change cooldown. */
  #settled: SettledSighting | null = null;

  constructor(deps: FaireServiceDeps) {
    this.#deps = deps;
  }

  /** Load the persisted observations. Call once on boot, before the first answer. */
  async load(): Promise<void> {
    this.#knowledge = await this.#deps.store.load();
  }

  /** What is currently held, for logging and tests. */
  get knowledge(): FaireKnowledge {
    return this.#knowledge;
  }

  /**
   * Offer a line heard on the LFT channel, with the SERVER-STAMPED id of whoever sent it.
   *
   * A line on its own is never believed — see `corroboration.ts`. It is a vote, and only a
   * corroborated majority is allowed to settle. `senderId` must be the sender from the packet,
   * never anything out of the message body, or the guard is worthless.
   */
  async observeChannel(text: string, senderId: string, receivedAt: number): Promise<ObserveOutcome> {
    const broadcast = parseDmfBroadcast(text);
    if (broadcast === null || !isTrustedBroadcast(broadcast)) return "ignored";

    // An unidentifiable sender cannot vote — counting it would hand a troll unlimited ballots.
    // Reported rather than swallowed: if the channel's sender field ever stops parsing, this is
    // the only thing that would make the whole feed go quiet, and silence should be visible.
    if (senderId === "" || senderId === "0") return "unidentified";

    this.#tally.record({ location: broadcast.location, senderId, at: receivedAt });
    const consensus = this.#tally.leader(receivedAt);
    // This line may only be believed if the majority is saying what IT says. Checking the
    // consensus alone would let a troll's line ride in on the quorum the honest clients built:
    // the gate would pass on their zone and then write his.
    if (consensus === null || consensus.location !== broadcast.location) return "counted";
    if (!shouldSettle(this.#deps.corroboration ?? DEFAULT_CORROBORATION, this.#settled, consensus, receivedAt)) {
      return "counted";
    }

    const seenAt = sightedAt(broadcast, receivedAt);
    const current = this.#knowledge.sighting;
    if (current !== null && !isWorthRecording(current, broadcast.location, broadcast.witness, seenAt)) {
      return "counted";
    }

    const observation: FaireObservation = {
      location: broadcast.location,
      observedAt: seenAt,
      source: "sighting",
      witness: broadcast.witness,
    };
    this.#settled = { location: observation.location, acceptedAt: receivedAt };
    await this.#accept({ ...this.#knowledge, sighting: observation }, observation, receivedAt);
    return "accepted";
  }

  /**
   * Offer the name of an NPC standing next to our own parked character.
   *
   * Needs no corroboration: this is our own client's object stream, not something a player typed.
   * `location` is where the character is parked — configuration, not a guess, because a unit
   * update says what is nearby and never which zone we are in.
   */
  async observeNearbyNpc(npc: string, location: FaireLocation, seenAt: number): Promise<boolean> {
    if (!isFaireNpc(npc)) return false;

    const current = this.#knowledge.onsite;
    // The faire's staff is re-seen every time visibility refreshes. Re-recording the same zone is
    // only worth a write once the last look has aged; a MOVE is always worth one immediately.
    if (current !== null && current.location === location && seenAt - current.observedAt < ONSITE_REFRESH_MS) {
      return false;
    }
    const observation: FaireObservation = { location, observedAt: seenAt, source: "onsite", witness: npc };
    return this.#accept({ ...this.#knowledge, onsite: observation }, observation, seenAt);
  }

  /** Where the faire is, as far as anyone has actually looked. */
  answer(now: number): FaireAnswer {
    return answerFaire(this.#knowledge, now);
  }

  /** `now` is the present moment, NOT the observation's own timestamp: a move is a change to what
   *  a player asking right now would be told, and an older look that never becomes the newest one
   *  changes nothing. Judging at the observation's timestamp would hide every newer look behind it
   *  and read as a move every time. */
  async #accept(knowledge: FaireKnowledge, accepted: FaireObservation, now: number): Promise<boolean> {
    const before = answerFaire(this.#knowledge, now);
    this.#knowledge = knowledge;
    const after = answerFaire(knowledge, now);
    await this.#deps.store.save(knowledge);
    this.#deps.onObservation?.(accepted);
    if (after.known && (!before.known || before.location !== after.location)) {
      this.#deps.onMove?.({
        from: before.known ? before.location : null,
        to: after.location,
        observation: accepted,
      });
    }
    return true;
  }
}
