import { describe, expect, it } from "vitest";
import { DEFAULT_INTEGRITY_CHECKSUM, integrityCrcHash } from "./integrity.js";

describe("integrityCrcHash", () => {
  it("reproduces a real OctoWoW login's crc_hash from A and the checksum", () => {
    // Captured from a genuine client login via the auth proxy:
    //   crc_hash === SHA1(A || checksum), and the server accepted it.
    const clientPublicKey = Buffer.from(
      "9c52abc06dc6baf820815a2b0a079df0ebd4f14ed3f2827ccc161db5cac35148",
      "hex",
    );
    const checksum = Buffer.from(DEFAULT_INTEGRITY_CHECKSUM, "hex");

    expect(integrityCrcHash(clientPublicKey, checksum).toString("hex")).toBe(
      "f5a245ea6ba4d8e7423b11a1da2f7f70750301b3",
    );
  });

  it("changes with the client public key", () => {
    const checksum = Buffer.from(DEFAULT_INTEGRITY_CHECKSUM, "hex");
    const a = integrityCrcHash(Buffer.alloc(32, 1), checksum);
    const b = integrityCrcHash(Buffer.alloc(32, 2), checksum);
    expect(a.equals(b)).toBe(false);
    expect(a.length).toBe(20);
  });
});
