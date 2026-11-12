import { describe, expect, it } from "vitest";
import { describeError, FatalError } from "./errors.js";

function coded(message: string, code: string): Error {
  return Object.assign(new Error(message), { code });
}

describe("describeError", () => {
  it("unwraps an AggregateError to its inner codes", () => {
    const aggregate = new AggregateError([
      coded("connect ECONNREFUSED 185.165.170.6:3724", "ECONNREFUSED"),
      coded("connect ETIMEDOUT 185.165.170.6:3724", "ETIMEDOUT"),
    ]);
    const text = describeError(aggregate);
    expect(text).toContain("ECONNREFUSED");
    expect(text).toContain("ETIMEDOUT");
  });

  it("prefixes a coded error with its code", () => {
    expect(describeError(coded("getaddrinfo ENOTFOUND play.octowow.st", "ENOTFOUND"))).toBe(
      "ENOTFOUND: getaddrinfo ENOTFOUND play.octowow.st",
    );
  });

  it("falls back to the message for an uncoded error", () => {
    expect(describeError(new Error("something broke"))).toBe("something broke");
  });

  it("falls back to the name when there is no message or code", () => {
    expect(describeError(new FatalError(""))).toBe("FatalError");
  });

  it("stringifies a non-error", () => {
    expect(describeError("plain string")).toBe("plain string");
  });
});
