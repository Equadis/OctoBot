import type { Logger } from "../logger.js";
import type { WhoQuery, WhoResult } from "../protocol/who.js";
import { subscriberKey } from "../subscribers/store.js";
import { describeCharacter, isKnownRace } from "./character.js";
import type { ShameList } from "./shame-list.js";

/**
 * Finds out who each player on the shame list is — race and class, and so faction — with a /who by
 * their name.
 *
 * A /who is the source because its reply is the one the raid poll already reads every minute, so
 * its race and class fields are proven on this server; the name-query reply also carries them, but
 * in a layout never confirmed here. A killer is nearly always still online seconds after the kill,
 * so the first look usually finds them. One who logged off is looked for again on every sweep until
 * they are seen, so nobody stays on the wall without it.
 *
 * A player listed by name alone — before GUIDs were kept — also gets their GUID found, so they can be
 * spotted standing near a listener. That lookup works whether they are online or not.
 */

export type WhoRunner = (query: WhoQuery) => Promise<WhoResult>;

export interface ShameProfilerDeps {
  readonly list: ShameList;
  /** A /who to ask on — a listener's, so the raid poll is never delayed — or null while none is up. */
  readonly who: () => WhoRunner | null;
  /** A player's GUID from their name, or null when no character could find it. */
  readonly guidOf: (name: string) => Promise<bigint | null>;
  /** The list now says more about someone: repaint whatever shows it. */
  readonly onDescribed: () => void;
  readonly logger: Logger;
}

export class ShameProfiler {
  readonly #deps: ShameProfilerDeps;
  #sweeping = false;

  constructor(deps: ShameProfilerDeps) {
    this.#deps = deps;
  }

  /** Look the player up now. True when they were found online. */
  async profile(name: string): Promise<boolean> {
    const { list, logger } = this.#deps;
    const who = this.#deps.who();
    if (!who) return false;
    let result: WhoResult;
    try {
      result = await who({ minLevel: 0, maxLevel: 100, playerName: name });
    } catch (error) {
      logger.debug(`shame list: /who ${name} failed (${messageOf(error)})`);
      return false;
    }
    // A /who by name matches any name containing it, so only the exact name counts.
    const player = result.players.find((candidate) => subscriberKey(candidate.name) === subscriberKey(name));
    if (!player) return false;

    const details = { raceId: player.raceId, classId: player.classId };
    if (!isKnownRace(player.raceId)) {
      logger.warn(`shame list: ${name} is race #${player.raceId}, which has no name or faction mapped yet`);
    }
    const changed = await list.describe(name, details).catch((error: unknown) => {
      // Known for this run all the same; only a restart would lose it, and the sweep would find it again.
      logger.error(`shame list: could not save who ${name} is (${messageOf(error)})`);
      return true;
    });
    if (changed) {
      logger.info(`shame list: ${name} is a ${describeCharacter(details)}`);
      this.#deps.onDescribed();
    }
    return true;
  }

  /** Find a player's GUID from their name. True when it was found. */
  async identify(name: string): Promise<boolean> {
    const { list, logger } = this.#deps;
    const guid = await this.#deps.guidOf(name);
    if (guid === null) return false;
    await list.add(name, guid).catch((error: unknown) => {
      // Known for this run all the same; only a restart would lose it, and the sweep would find it again.
      logger.error(`shame list: could not save ${name}'s GUID (${messageOf(error)})`);
    });
    logger.info(`shame list: ${name} is GUID 0x${guid.toString(16)} — now spotted if they come near a listener`);
    return true;
  }

  /** Look again, one at a time, for every GUID, race and class still unknown. */
  async sweep(): Promise<void> {
    if (this.#sweeping) return;
    this.#sweeping = true;
    try {
      for (const name of this.#deps.list.unidentified) await this.identify(name);
      for (const name of this.#deps.list.undescribed) await this.profile(name);
    } finally {
      this.#sweeping = false;
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
