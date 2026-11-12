import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bigIntToBytesLE, bytesToBigIntLE, modPow } from "./bigint.js";
import { computeSessionKey, computeSrp6Proof } from "./srp6.js";

function sha1(...parts: Buffer[]): Buffer {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(part);
  return hash.digest();
}

// The standard WoW SRP6 large safe prime (big-endian hex), stored little-endian
// on the wire. Any modulus makes the mutual-agreement identity hold, but using
// the real value keeps the test faithful to what Turtle actually sends.
const N_LE = Buffer.from(
  "894B645E89E1535BBDAD5B8B290348B1B5EBF5A87BAB823CAB3E82872A3E9BB7",
  "hex",
).reverse();
const GENERATOR = Buffer.from([7]);

describe("computeSessionKey", () => {
  it("interleaves S into K to match an independent reference", () => {
    const s = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
    expect(computeSessionKey(s).toString("hex")).toBe(
      "16edc3768375f79d8d4d1a44d89ced6c5207ef9cf8b8ed4d0469eb68566b576c9320f181f6b7656f",
    );
  });
});

describe("computeSrp6Proof", () => {
  const username = "TESTBOT";
  const password = "SECRET123";
  const salt = Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 9 + 4) & 0xff));
  const clientPrivateKey = Buffer.from(
    Array.from({ length: 19 }, (_, i) => (i * 17 + 5) & 0xff),
  );

  it("agrees with an independently computed server on both K and M1", () => {
    const n = bytesToBigIntLE(N_LE);
    const g = bytesToBigIntLE(GENERATOR);

    // Server derives the verifier v = g^x mod N from the shared secret material.
    const identityHash = sha1(Buffer.from(`${username}:${password}`, "utf8"));
    const x = bytesToBigIntLE(sha1(salt, identityHash));
    const v = modPow(g, x, n);

    // Server ephemeral: B = (k*v + g^b) mod N, k = 3.
    const bPrivate = bytesToBigIntLE(
      Buffer.from(Array.from({ length: 19 }, (_, i) => (i * 11 + 2) & 0xff)),
    );
    const bPublic = (3n * v + modPow(g, bPrivate, n)) % n;
    expect(bPublic % n).not.toBe(0n);
    const bPublicBytes = bigIntToBytesLE(bPublic, 32);

    const proof = computeSrp6Proof({
      username,
      password,
      serverPublicKey: bPublicBytes,
      generator: GENERATOR,
      largeSafePrime: N_LE,
      salt,
      clientPrivateKey,
    });

    // Server recomputes the shared secret by the OTHER SRP formula:
    // S = (A * v^u) ^ b mod N. Matching K proves the exchange is correct.
    const aPublic = bytesToBigIntLE(proof.clientPublicKey);
    const u = bytesToBigIntLE(sha1(proof.clientPublicKey, bPublicBytes));
    const sServer = modPow((aPublic * modPow(v, u, n)) % n, bPrivate, n);
    const kServer = computeSessionKey(bigIntToBytesLE(sServer, 32));
    expect(proof.sessionKey.equals(kServer)).toBe(true);

    // And the server independently rebuilds M1 from that K.
    const groupHash = Buffer.alloc(20);
    const nHash = sha1(N_LE);
    const gHash = sha1(GENERATOR);
    for (let i = 0; i < 20; i += 1) groupHash[i] = nHash[i] ^ gHash[i];
    const m1Server = sha1(
      groupHash,
      sha1(Buffer.from(username, "utf8")),
      salt,
      proof.clientPublicKey,
      bPublicBytes,
      kServer,
    );
    expect(proof.clientProof.equals(m1Server)).toBe(true);

    // The server's own proof M2 = SHA1(A || M1 || K) is what the client verifies.
    expect(proof.expectedServerProof.equals(sha1(proof.clientPublicKey, m1Server, kServer))).toBe(
      true,
    );
  });

  it("is deterministic for a fixed client private key", () => {
    const args = {
      username,
      password,
      serverPublicKey: Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 3 + 1) & 0xff)),
      generator: GENERATOR,
      largeSafePrime: N_LE,
      salt,
      clientPrivateKey,
    } as const;
    expect(computeSrp6Proof(args)).toEqual(computeSrp6Proof(args));
  });

  it("uppercases the username and password before hashing", () => {
    const base = {
      serverPublicKey: Buffer.from(Array.from({ length: 32 }, (_, i) => (i * 3 + 1) & 0xff)),
      generator: GENERATOR,
      largeSafePrime: N_LE,
      salt,
      clientPrivateKey,
    } as const;
    const lower = computeSrp6Proof({ ...base, username: "testbot", password: "secret123" });
    const upper = computeSrp6Proof({ ...base, username: "TESTBOT", password: "SECRET123" });
    expect(lower.clientProof.equals(upper.clientProof)).toBe(true);
  });

  it("rejects a server public key that is 0 mod N", () => {
    expect(() =>
      computeSrp6Proof({
        username,
        password,
        serverPublicKey: Buffer.alloc(32),
        generator: GENERATOR,
        largeSafePrime: N_LE,
        salt,
        clientPrivateKey,
      }),
    ).toThrow(/invalid server public key/);
  });
});
