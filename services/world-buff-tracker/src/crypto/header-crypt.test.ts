import { describe, expect, it } from "vitest";
import { VanillaHeaderCrypt } from "./header-crypt.js";

describe("VanillaHeaderCrypt", () => {
  it("matches a vector from an independent reference implementation", () => {
    const key = Buffer.from(
      "030a11181f262d343b424950575e656c737a81888f969da4abb2b9c0c7ced5dce3eaf1f8ff060d14",
      "hex",
    );
    const header = Buffer.from("0006ed010000", "hex");
    new VanillaHeaderCrypt(key).encryptSend(header);
    expect(header.toString("hex")).toBe("030f0b244369");
  });

  it("round-trips a header: one side encrypts, the other decrypts", () => {
    const key = Buffer.from(Array.from({ length: 40 }, (_, i) => (i * 13 + 1) & 0xff));
    const client = new VanillaHeaderCrypt(key);
    const server = new VanillaHeaderCrypt(key);

    const plain = Buffer.from([0x00, 0x06, 0xed, 0x01, 0x00, 0x00]);
    const wire = Buffer.from(plain);

    client.encryptSend(wire);
    expect(wire.equals(plain)).toBe(false);

    server.decryptRecv(wire);
    expect(wire.equals(plain)).toBe(true);
  });

  it("keeps send/receive state in sync across a stream of headers", () => {
    const key = Buffer.from(Array.from({ length: 40 }, (_, i) => (i * 5 + 9) & 0xff));
    const client = new VanillaHeaderCrypt(key);
    const server = new VanillaHeaderCrypt(key);

    for (let n = 0; n < 50; n += 1) {
      const plain = Buffer.from([n & 0xff, (n * 3) & 0xff, 0x25, 0x00, 0x00, 0x00]);
      const wire = Buffer.from(plain);
      client.encryptSend(wire);
      server.decryptRecv(wire);
      expect(wire.equals(plain)).toBe(true);
    }
  });

  it("rejects an empty session key", () => {
    expect(() => new VanillaHeaderCrypt(Buffer.alloc(0))).toThrow(/must not be empty/);
  });
});
