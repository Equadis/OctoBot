import { createHash, randomBytes } from "node:crypto";
import { bigIntToBytesLE, bytesToBigIntLE, modPow } from "./bigint.js";

/**
 * WoW flavour of SRP6 — the client side of the logon handshake.
 *
 * Given the challenge the auth server sends (B, g, N, salt), this produces the
 * public key A and proof M1 the client must send back, plus the 40-byte session
 * key K used afterwards for the world handshake and header cipher.
 *
 * WoW fixes the multiplier k = 3 (SRP6, not SRP6a's k = H(N, g)), represents all
 * numbers little-endian, and derives K by a specific SHA1 interleave of S that
 * does NOT strip leading zeros — matching the MaNGOS/cmangos cores private
 * servers run. See computeSessionKey below.
 */

const SRP6_MULTIPLIER = 3n;

function sha1(...parts: Buffer[]): Buffer {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(part);
  return hash.digest();
}

function xorBytes(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(Math.min(a.length, b.length));
  for (let i = 0; i < out.length; i += 1) out[i] = a[i] ^ b[i];
  return out;
}

export interface Srp6Challenge {
  readonly username: string;
  readonly password: string;
  /** Server public key B, 32-byte little-endian. */
  readonly serverPublicKey: Buffer;
  /** Generator g, as received (usually a single byte, 7). */
  readonly generator: Buffer;
  /** Large safe prime N, 32-byte little-endian. */
  readonly largeSafePrime: Buffer;
  /** Salt, 32 bytes, used as received. */
  readonly salt: Buffer;
  /**
   * Test seam: the client private ephemeral `a`. Defaults to 19 secure random
   * bytes; provide a fixed value only in tests for determinism.
   */
  readonly clientPrivateKey?: Buffer;
}

export interface Srp6Proof {
  /** Client public key A, 32-byte little-endian — sent in CMD_AUTH_LOGON_PROOF. */
  readonly clientPublicKey: Buffer;
  /** Client proof M1, 20 bytes — sent in CMD_AUTH_LOGON_PROOF. */
  readonly clientProof: Buffer;
  /** Session key K, 40 bytes — kept for the world handshake and header cipher. */
  readonly sessionKey: Buffer;
  /** SHA1(A || M1 || K); compare with the server's returned proof to confirm auth. */
  readonly expectedServerProof: Buffer;
}

/** Derive the 40-byte session key K from S via WoW's SHA1 interleave. */
export function computeSessionKey(sBytes32: Buffer): Buffer {
  const even = Buffer.alloc(16);
  const odd = Buffer.alloc(16);
  for (let i = 0; i < 16; i += 1) {
    even[i] = sBytes32[i * 2];
    odd[i] = sBytes32[i * 2 + 1];
  }
  const evenHash = sha1(even);
  const oddHash = sha1(odd);
  const key = Buffer.alloc(40);
  for (let i = 0; i < 20; i += 1) {
    key[i * 2] = evenHash[i];
    key[i * 2 + 1] = oddHash[i];
  }
  return key;
}

export function computeSrp6Proof(challenge: Srp6Challenge): Srp6Proof {
  const username = challenge.username.toUpperCase();
  const password = challenge.password.toUpperCase();

  const nModulus = bytesToBigIntLE(challenge.largeSafePrime);
  const generator = bytesToBigIntLE(challenge.generator);
  const bServer = bytesToBigIntLE(challenge.serverPublicKey);

  if (bServer % nModulus === 0n) {
    throw new Error("invalid server public key B (0 mod N)");
  }

  // x = SHA1(salt || SHA1(USERNAME:PASSWORD))
  const identityHash = sha1(Buffer.from(`${username}:${password}`, "utf8"));
  const x = bytesToBigIntLE(sha1(challenge.salt, identityHash));

  // A = g^a mod N
  const aPrivate = bytesToBigIntLE(challenge.clientPrivateKey ?? randomBytes(19)) % nModulus;
  const aPublic = modPow(generator, aPrivate, nModulus);
  const aPublicBytes = bigIntToBytesLE(aPublic, 32);
  if (aPublic % nModulus === 0n) throw new Error("computed A is 0 mod N; retry");

  // u = SHA1(A || B)
  const u = bytesToBigIntLE(sha1(aPublicBytes, challenge.serverPublicKey));

  // S = (B - k * g^x) ^ (a + u * x) mod N
  const verifier = modPow(generator, x, nModulus);
  const kv = (SRP6_MULTIPLIER * verifier) % nModulus;
  const base = ((bServer - kv) % nModulus + nModulus) % nModulus;
  const sShared = modPow(base, aPrivate + u * x, nModulus);

  const sessionKey = computeSessionKey(bigIntToBytesLE(sShared, 32));

  // M1 = SHA1( (H(N) xor H(g)) || H(username) || salt || A || B || K )
  const groupHash = xorBytes(sha1(challenge.largeSafePrime), sha1(challenge.generator));
  const usernameHash = sha1(Buffer.from(username, "utf8"));
  const clientProof = sha1(
    groupHash,
    usernameHash,
    challenge.salt,
    aPublicBytes,
    challenge.serverPublicKey,
    sessionKey,
  );

  const expectedServerProof = sha1(aPublicBytes, clientProof, sessionKey);

  return { clientPublicKey: aPublicBytes, clientProof, sessionKey, expectedServerProof };
}
