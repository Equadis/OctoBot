import type { BotConfig } from "../config.js";
import { subscriberKey } from "../subscribers/store.js";

/**
 * The bot's own characters — Bufftracker and every listener — matched by name whatever the case.
 *
 * A whisper from one of them is never a player asking something. Answered as one, the characters
 * talk to each other without end: a listener hears Bufftracker's reply and routes it back to
 * Bufftracker as a new question, whose reply goes back again, each round posting "feedback" to
 * Discord and signing the bot up for its own alerts.
 */

type CharacterConfig = Pick<BotConfig, "characterName" | "listeners">;

/** Bufftracker's name, then every listener's. */
export function ownCharacterNames(config: CharacterConfig): string[] {
  return [config.characterName, ...config.listeners.map((listener) => listener.characterName)];
}

export class OwnCharacters {
  readonly #keys: ReadonlySet<string>;

  constructor(names: readonly string[]) {
    this.#keys = new Set(names.map(subscriberKey));
  }

  static of(config: CharacterConfig): OwnCharacters {
    return new OwnCharacters(ownCharacterNames(config));
  }

  has(name: string): boolean {
    return this.#keys.has(subscriberKey(name));
  }
}
