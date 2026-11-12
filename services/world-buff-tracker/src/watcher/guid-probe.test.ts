import { describe, expect, it, vi } from "vitest";
import { FriendsResult } from "../protocol/opcodes.js";
import { GuidProbe, type FriendOps } from "./guid-probe.js";

const ZEZERVER = 0x2f1an;

/** Friend ops whose adds the server answers with `answer`, as it would a moment later. */
function setup(answer: (name: string) => { result: number; guid: bigint } | null) {
  let probe: GuidProbe | null = null;
  const ops = {
    addFriend: vi.fn((name: string) => {
      const status = answer(name);
      if (status) queueMicrotask(() => probe?.status(status));
    }),
    delFriend: vi.fn((_guid: bigint) => undefined),
  } satisfies FriendOps;
  probe = new GuidProbe(ops, { timeoutMs: 50 });
  return { probe, ops };
}

describe("GuidProbe", () => {
  it("reads the GUID from a fresh add, and takes the friend off again", async () => {
    const { probe, ops } = setup(() => ({ result: FriendsResult.AddedOffline, guid: ZEZERVER }));
    expect(await probe.lookup("Zezerver")).toBe(ZEZERVER);
    expect(ops.addFriend).toHaveBeenCalledWith("Zezerver");
    expect(ops.delFriend).toHaveBeenCalledWith(ZEZERVER);
  });

  it("reads the GUID of a player on the other side, who was never added", async () => {
    const { probe, ops } = setup(() => ({ result: FriendsResult.Enemy, guid: ZEZERVER }));
    expect(await probe.lookup("Zezerver")).toBe(ZEZERVER);
    expect(ops.delFriend).not.toHaveBeenCalled();
  });

  it("answers null for a name the server does not know", async () => {
    const { probe, ops } = setup(() => ({ result: FriendsResult.NotFound, guid: 0n }));
    expect(await probe.lookup("Nobody")).toBeNull();
    expect(ops.delFriend).not.toHaveBeenCalled();
  });

  it("answers null when the server says nothing", async () => {
    const { probe } = setup(() => null);
    expect(await probe.lookup("Zezerver")).toBeNull();
  });

  it("answers null when not in world to ask", async () => {
    const probe = new GuidProbe(
      {
        addFriend: () => {
          throw new Error("cannot add a friend before the character is in world");
        },
        delFriend: () => undefined,
      },
      { timeoutMs: 50 },
    );
    expect(await probe.lookup("Zezerver")).toBeNull();
  });

  it("does not take a friend going online for the answer", async () => {
    let probe: GuidProbe | null = null;
    probe = new GuidProbe(
      {
        addFriend: () =>
          queueMicrotask(() => {
            probe?.status({ result: FriendsResult.Online, guid: 0x999n }); // someone else's presence
            probe?.status({ result: FriendsResult.AddedOnline, guid: ZEZERVER });
          }),
        delFriend: () => undefined,
      },
      { timeoutMs: 50 },
    );
    expect(await probe.lookup("Zezerver")).toBe(ZEZERVER);
  });

  it("asks one name at a time, so each answer is matched to its name", async () => {
    const guids = new Map([
      ["Zezerver", ZEZERVER],
      ["Ganker", 0x555n],
    ]);
    const { probe, ops } = setup((name) => ({ result: FriendsResult.AddedOnline, guid: guids.get(name) ?? 0n }));
    const [first, second] = await Promise.all([probe.lookup("Zezerver"), probe.lookup("Ganker")]);
    expect(first).toBe(ZEZERVER);
    expect(second).toBe(0x555n);
    expect(ops.addFriend.mock.calls.map(([name]) => name)).toEqual(["Zezerver", "Ganker"]);
  });
});
