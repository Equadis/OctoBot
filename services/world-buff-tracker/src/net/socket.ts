import type { EventEmitter } from "node:events";

/**
 * The slice of a Node socket the clients use. Both `net.Socket` and an
 * EventEmitter-based mock satisfy it, so the protocol logic can be driven by a
 * scripted fake server in tests without touching the network.
 */
export interface NodeSocketLike extends Pick<EventEmitter, "on" | "off" | "once"> {
  write(data: Buffer): boolean;
  destroy(error?: Error): void;
}
