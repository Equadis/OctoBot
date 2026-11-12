import { connect, type Socket } from "node:net";
import { computeSrp6Proof } from "../crypto/srp6.js";
import { integrityCrcHash } from "../crypto/integrity.js";
import { AuthCommand, LogonResult } from "../protocol/opcodes.js";
import { FatalError, VersionMismatchError } from "../errors.js";
import { createLogger, type Logger } from "../logger.js";
import type { NodeSocketLike } from "./socket.js";
import {
  buildLogonChallenge,
  buildLogonProof,
  buildRealmListRequest,
  parseLogonChallengeServer,
  parseLogonProofServer,
  parseRealmList,
  type RealmEntry,
} from "./auth-packets.js";

export interface AuthCredentials {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  /**
   * Client-integrity checksum for StrictVersionCheck servers. When set, the proof
   * carries crc_hash = SHA1(A || checksum); when null, a zero crc_hash is sent.
   */
  readonly integrityChecksum: Buffer | null;
  /** Client build advertised in the logon challenge. */
  readonly build: number;
}

export interface AuthResult {
  /** 40-byte SRP6 session key for the world handshake. */
  readonly sessionKey: Buffer;
  readonly realms: readonly RealmEntry[];
}

const LOGON_RESULT_MESSAGE: Partial<Record<number, string>> = {
  [LogonResult.UnknownAccount]: "unknown account",
  [LogonResult.IncorrectPassword]: "incorrect password",
  [LogonResult.Banned]: "account banned",
  [LogonResult.AlreadyOnline]: "account already online",
  [LogonResult.Suspended]: "account suspended",
  [LogonResult.VersionInvalid]: "client version rejected",
};

function describeLogonResult(result: number): string {
  return LOGON_RESULT_MESSAGE[result] ?? `logon failed (code 0x${result.toString(16)})`;
}

/** True once the full logical message has arrived (parser no longer needs bytes). */
export type Complete = (buffer: Buffer) => boolean;

export function whenParses(parse: (buffer: Buffer) => unknown): Complete {
  return (buffer) => {
    try {
      parse(buffer);
      return true;
    } catch (error) {
      if (error instanceof RangeError) return false; // not fully arrived yet
      throw error; // a real protocol error — let it surface
    }
  };
}

/** The realm-list response is [opcode u8][u16 size][payload]; complete when all present. */
export const whenRealmListComplete: Complete = (buffer) => {
  if (buffer.length < 3) return false;
  return buffer.length >= 3 + buffer.readUInt16LE(1);
};

/**
 * A proof reply is either the proof server packet (opcode 0x01) or a version /
 * integrity rejection, which the server sends in the 3-byte challenge-error shape
 * (opcode 0x00, result code). Complete on whichever arrives.
 */
export const whenProofResponse: Complete = (buffer) => {
  if (buffer.length < 1) return false;
  if (buffer[0] === AuthCommand.LogonChallenge) return buffer.length >= 3;
  return whenParses(parseLogonProofServer)(buffer);
};

/**
 * Reads the auth server's replies. That protocol has no length framing, and each
 * reply carries a trailing tail (crc / security-flag bytes) whose exact length
 * varies by server core. Rather than parse the tail, we wait until the logical
 * message has arrived AND the socket has gone briefly idle, then take the whole
 * buffer and discard whatever we didn't read. That makes each reply self-delimiting
 * without knowing its tail, and stops leftover bytes leaking into the next read.
 */
export class AuthReceiver {
  #buffer = Buffer.alloc(0);
  #idleTimer: NodeJS.Timeout | null = null;
  #pending: { resolve: () => void; reject: (error: Error) => void; complete: Complete } | null =
    null;
  #failure: Error | null = null;
  readonly #idleMs: number;
  readonly #logger: Logger;

  constructor(socket: NodeSocketLike, idleMs: number, logger: Logger) {
    this.#idleMs = idleMs;
    this.#logger = logger;
    socket.on("data", (chunk: Buffer) => this.#onData(chunk));
    socket.once("error", (error: Error) => this.#fail(error));
    socket.once("close", () => this.#fail(new Error("auth connection closed early")));
    socket.once("timeout", () => this.#fail(new Error("auth connection timed out")));
  }

  #onData(chunk: Buffer): void {
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    this.#logger.debug(`auth: recv ${chunk.length}B [${chunk.subarray(0, 48).toString("hex")}]`);
    if (this.#pending) this.#armIdle();
  }

  #armIdle(): void {
    if (this.#idleTimer) clearTimeout(this.#idleTimer);
    this.#idleTimer = setTimeout(() => this.#onIdle(), this.#idleMs);
    this.#idleTimer.unref?.();
  }

  #onIdle(): void {
    this.#idleTimer = null;
    const pending = this.#pending;
    if (!pending) return;
    let done = false;
    try {
      done = pending.complete(this.#buffer);
    } catch (error) {
      this.#pending = null;
      pending.reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    if (done) {
      this.#pending = null;
      pending.resolve();
    }
    // otherwise keep waiting; the next chunk re-arms the idle timer
  }

  #fail(error: Error): void {
    if (this.#failure) return;
    this.#failure = error;
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
      this.#idleTimer = null;
    }
    const pending = this.#pending;
    this.#pending = null;
    pending?.reject(error);
  }

  /** Resolve once `complete(buffer)` holds and the socket has been idle briefly. */
  settle(complete: Complete): Promise<void> {
    if (this.#failure) return Promise.reject(this.#failure);
    return new Promise((resolve, reject) => {
      this.#pending = { resolve, reject, complete };
      if (this.#buffer.length > 0) this.#armIdle();
    });
  }

  /** Return everything received so far and clear the buffer. */
  take(): Buffer {
    const taken = this.#buffer;
    this.#buffer = Buffer.alloc(0);
    return taken;
  }
}

export class AuthClient {
  readonly #logger: Logger;

  constructor(logger: Logger = createLogger()) {
    this.#logger = logger;
  }

  async login(credentials: AuthCredentials, timeoutMs = 15_000): Promise<AuthResult> {
    const socket = connect({ host: credentials.host, port: credentials.port });
    socket.setTimeout(timeoutMs);
    const receiver = new AuthReceiver(socket, 200, this.#logger);

    try {
      await waitForConnect(socket, timeoutMs);
      this.#logger.debug(`auth: connected to ${credentials.host}:${credentials.port}`);

      socket.write(buildLogonChallenge(credentials.username, credentials.build));
      await receiver.settle(whenParses(parseLogonChallengeServer));
      const challenge = parseLogonChallengeServer(receiver.take());
      if (challenge.result !== LogonResult.Success) {
        // A version rejection here means a wrong build — recoverable by re-resolving.
        if (challenge.result === LogonResult.VersionInvalid) {
          throw new VersionMismatchError(`auth: ${describeLogonResult(challenge.result)}`);
        }
        throw new FatalError(`auth: ${describeLogonResult(challenge.result)}`);
      }
      if (
        !challenge.serverPublicKey ||
        !challenge.generator ||
        !challenge.largeSafePrime ||
        !challenge.salt
      ) {
        throw new FatalError("auth: incomplete challenge response");
      }

      const proof = computeSrp6Proof({
        username: credentials.username,
        password: credentials.password,
        serverPublicKey: challenge.serverPublicKey,
        generator: challenge.generator,
        largeSafePrime: challenge.largeSafePrime,
        salt: challenge.salt,
      });

      const crcHash = credentials.integrityChecksum
        ? integrityCrcHash(proof.clientPublicKey, credentials.integrityChecksum)
        : Buffer.alloc(20);
      socket.write(buildLogonProof(proof.clientPublicKey, proof.clientProof, crcHash));
      await receiver.settle(whenProofResponse);
      const proofResponse = receiver.take();
      if (proofResponse[0] === AuthCommand.LogonChallenge) {
        const code = proofResponse[2] ?? 0xff;
        throw new VersionMismatchError(
          `auth: client version/integrity rejected (code 0x${code.toString(16)})`,
        );
      }
      const proofResult = parseLogonProofServer(proofResponse);
      if (proofResult.result !== LogonResult.Success || !proofResult.serverProof) {
        throw new FatalError(`auth: ${describeLogonResult(proofResult.result)}`);
      }
      if (!proofResult.serverProof.equals(proof.expectedServerProof)) {
        throw new FatalError("auth: server proof mismatch (wrong password or spoofed server)");
      }
      this.#logger.debug("auth: SRP6 proof accepted");

      socket.write(buildRealmListRequest());
      await receiver.settle(whenRealmListComplete);
      const realmResponse = receiver.take();
      if (realmResponse.length < 3 || realmResponse[0] !== AuthCommand.RealmList) {
        throw new Error("auth: unexpected realm-list response");
      }
      const realms = parseRealmList(realmResponse.subarray(3));
      this.#logger.debug(`auth: ${realms.length} realm(s) returned`);
      // Log the population float + character count the realm list carries (parseRealmList used to
      // discard both). Kept as a diagnostic only: the status widget's player count comes from the
      // /who online count instead (see realm-population.ts), which is a live head count rather than
      // this core-specific float, and is refreshed every poll instead of once per logon.
      for (const realm of realms) {
        this.#logger.info(`auth: realm "${realm.name}" population=${realm.population} characters=${realm.characters}`);
      }

      return { sessionKey: proof.sessionKey, realms };
    } finally {
      socket.destroy();
    }
  }
}

function waitForConnect(socket: Socket, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("timed out waiting for connect")), timeoutMs);
    const finish = (error?: Error): void => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("error", onError);
      if (error) reject(error);
      else resolve();
    };
    const onConnect = (): void => finish();
    const onError = (error: Error): void => finish(error);
    socket.once("connect", onConnect);
    socket.once("error", onError);
  });
}
