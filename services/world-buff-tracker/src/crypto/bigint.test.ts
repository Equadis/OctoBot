import { describe, expect, it } from "vitest";
import { bigIntToBytesLE, bytesToBigIntLE, modPow } from "./bigint.js";

describe("bytesToBigIntLE", () => {
  it("reads little-endian order", () => {
    expect(bytesToBigIntLE(Buffer.from([0x01, 0x02]))).toBe(0x0201n);
    expect(bytesToBigIntLE(Buffer.from([0xff, 0x00, 0x00, 0x00]))).toBe(0xffn);
  });

  it("returns 0 for an empty buffer", () => {
    expect(bytesToBigIntLE(Buffer.alloc(0))).toBe(0n);
  });
});

describe("bigIntToBytesLE", () => {
  it("writes little-endian order and zero-pads to length", () => {
    expect(bigIntToBytesLE(0x0201n, 2)).toEqual(Buffer.from([0x01, 0x02]));
    expect(bigIntToBytesLE(0xffn, 4)).toEqual(Buffer.from([0xff, 0x00, 0x00, 0x00]));
  });

  it("round-trips with bytesToBigIntLE", () => {
    const original = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x01]);
    expect(bigIntToBytesLE(bytesToBigIntLE(original), original.length)).toEqual(original);
  });

  it("throws when the value does not fit", () => {
    expect(() => bigIntToBytesLE(0x1_0000n, 2)).toThrow(/does not fit/);
  });

  it("throws on a negative value", () => {
    expect(() => bigIntToBytesLE(-1n, 4)).toThrow(/negative/);
  });
});

describe("modPow", () => {
  it("matches known values", () => {
    expect(modPow(2n, 10n, 1000n)).toBe(24n);
    expect(modPow(4n, 13n, 497n)).toBe(445n); // classic RSA worked example
    expect(modPow(7n, 0n, 13n)).toBe(1n);
  });

  it("reduces a base larger than the modulus first", () => {
    expect(modPow(123n, 1n, 7n)).toBe(123n % 7n);
  });

  it("rejects a non-positive modulus and a negative exponent", () => {
    expect(() => modPow(2n, 3n, 0n)).toThrow(/modulus/);
    expect(() => modPow(2n, -1n, 5n)).toThrow(/exponent/);
  });
});
