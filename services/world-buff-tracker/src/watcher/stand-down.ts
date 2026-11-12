import type { Threat } from "./threat-watch.js";

/**
 * What a listener does about a threat its watch reported: log out and stay away a while — when it can.
 *
 * Already in a fight, it can't: the server refuses the logout, and a dropped connection leaves the
 * character in the fight all the same, only now blind to who is killing it and unable to accept a
 * resurrection. So it stays connected, and tries again shortly — the fight may end with the danger
 * still near. A dead listener never leaves at all: a resurrection is its way back, and needs it online.
 */

/** How asking the server to log out went. */
export type LogoutResult = "logged-out" | "refused" | "no-answer";

export interface StandDownDeps {
  /** Whether the listener is alive — or not known yet, which counts as alive. */
  readonly isAlive: () => boolean;
  readonly logout: () => Promise<LogoutResult>;
  /** Drop the connection — logged out, or with no answer to the logout. */
  readonly close: () => void;
  /** Let the threat watch report again, judging what is still near. */
  readonly rearm: () => void;
  /** It left, to stay away a while. */
  readonly onLeft: (threat: Threat, result: "logged-out" | "no-answer") => void;
  /** Mid-fight, it could not leave, and stays connected — once per fight, not on every retry. */
  readonly onCornered: (threat: Threat) => void;
}

export interface StandDownOptions {
  /** How long after a refused logout, or a threat met while dead, the watch may report again. */
  readonly retryMs: number;
}

export class StandDown {
  readonly #deps: StandDownDeps;
  readonly #retryMs: number;
  #leaving = false;
  #cornered = false;
  #retry: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: StandDownDeps, options: StandDownOptions) {
    this.#deps = deps;
    this.#retryMs = options.retryMs;
  }

  /** The watch reported `threat`: leave if it can. */
  async face(threat: Threat): Promise<void> {
    if (this.#leaving) return;
    if (!this.#deps.isAlive()) {
      this.#rearmLater();
      return;
    }
    this.#leaving = true;
    const result = await this.#deps.logout();
    this.#leaving = false;
    if (result === "refused") {
      if (!this.#cornered) {
        this.#cornered = true;
        this.#deps.onCornered(threat);
      }
      this.#rearmLater();
      return;
    }
    this.#deps.close();
    this.#deps.onLeft(threat, result);
  }

  /** The connection is over — nothing more to retry. */
  dispose(): void {
    if (this.#retry) clearTimeout(this.#retry);
    this.#retry = null;
  }

  #rearmLater(): void {
    if (this.#retry) return;
    this.#retry = setTimeout(() => {
      this.#retry = null;
      this.#deps.rearm();
    }, this.#retryMs);
    this.#retry.unref?.();
  }
}
