/**
 * BigInt <-> little-endian byte helpers and modular exponentiation.
 *
 * WoW's SRP6 represents every large number (N, B, A, S, ...) as a little-endian
 * byte array on the wire. Keeping the conversion in one tested place means an
 * endianness mistake can only happen here, where a test will catch it.
 */

/** Interpret a little-endian byte buffer as a non-negative BigInt. */
export function bytesToBigIntLE(bytes: Buffer): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/** Serialize a non-negative BigInt to a fixed-length little-endian buffer. */
export function bigIntToBytesLE(value: bigint, length: number): Buffer {
  if (value < 0n) throw new RangeError("cannot serialize a negative bigint");
  const out = Buffer.alloc(length);
  let v = value;
  for (let i = 0; i < length; i += 1) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v > 0n) throw new RangeError(`bigint does not fit in ${length} bytes`);
  return out;
}

/** (base ** exponent) mod modulus, via square-and-multiply. */
export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= 0n) throw new RangeError("modulus must be positive");
  if (exponent < 0n) throw new RangeError("negative exponent is unsupported");
  if (modulus === 1n) return 0n;

  let result = 1n;
  let b = ((base % modulus) + modulus) % modulus;
  let e = exponent;
  while (e > 0n) {
    if ((e & 1n) === 1n) result = (result * b) % modulus;
    e >>= 1n;
    b = (b * b) % modulus;
  }
  return result;
}
