import { describe, expect, it, vi } from "vitest";
import { CharacterLookups, type CharacterLookup } from "./character-lookups.js";

type NameResolver = CharacterLookup<bigint, string>;

const WARLOCK = 0x1234n;

describe("CharacterLookups", () => {
  it("asks a character in world", async () => {
    const names = new CharacterLookups<bigint, string>();
    const resolver = vi.fn<NameResolver>(async () => "Warlockz");
    names.register("Onybuffogb", resolver);
    expect(await names.resolve(WARLOCK)).toBe("Warlockz");
    expect(resolver).toHaveBeenCalledWith(WARLOCK);
  });

  it("tries the next character when one gets no answer", async () => {
    const names = new CharacterLookups<bigint, string>();
    names.register("Onybuffogb", async () => null);
    names.register("Onyxiabuffsw", async () => "Warlockz");
    expect(await names.resolve(WARLOCK)).toBe("Warlockz");
  });

  it("tries again later while nobody can say, and gives up after the last round", async () => {
    const sleep = vi.fn(async (_ms: number) => undefined);
    const names = new CharacterLookups<bigint, string>(sleep);
    expect(await names.resolve(WARLOCK, { attempts: 3, retryMs: 30_000 })).toBeNull();
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(30_000);
  });

  it("answers from a character that came into world between rounds — the one that fled, say", async () => {
    const names = new CharacterLookups<bigint, string>(async () => {
      names.register("Onybuffogb", async () => "Warlockz");
    });
    expect(await names.resolve(WARLOCK, { attempts: 2, retryMs: 1 })).toBe("Warlockz");
  });

  it("stops asking a character that left", async () => {
    const names = new CharacterLookups<bigint, string>();
    const resolver = vi.fn<NameResolver>(async () => "Warlockz");
    names.register("Onybuffogb", resolver);
    names.unregister("Onybuffogb");
    expect(await names.resolve(WARLOCK)).toBeNull();
    expect(resolver).not.toHaveBeenCalled();
  });
});
