import { describe, expect, it } from "vitest";
import { FriendsResult } from "../protocol/opcodes.js";
import type { FriendStatus } from "../protocol/chat.js";
import { PresenceSweeper, type FriendOps, type PresenceSweeperOptions } from "./presence-sweep.js";

/**
 * A fake realm that answers friend ops the way the live server does: a fresh add of a known
 * character replies ADDED_ONLINE/ADDED_OFFLINE with its guid, a name already on the list replies
 * ALREADY, a full list replies LIST_FULL, an unresolvable ("silent") name replies NOTHING, and a
 * del replies REMOVED. Replies are synchronous so the happy path needs no real timers.
 */
class FakeRealm implements FriendOps {
  sweeper!: PresenceSweeper;
  readonly known = new Map<string, { guid: bigint; online: boolean }>();
  readonly silent = new Set<string>();
  readonly list = new Map<bigint, string>();
  cap = 50;
  readonly ops: string[] = [];

  addKnown(name: string, guid: bigint, online: boolean): void {
    this.known.set(name, { guid, online });
  }

  requestFriendList(): void {
    this.ops.push("list");
    const friends = [...this.list.entries()].map(([guid, name]) => ({
      guid,
      online: this.known.get(name)?.online ?? false,
    }));
    this.sweeper.handleFriendList({ count: friends.length, friends });
  }

  addFriend(name: string): void {
    this.ops.push(`add:${name}`);
    if (this.silent.has(name)) return; // unresolvable name — the server drops it, no reply
    const info = this.known.get(name);
    if (!info) {
      this.reply(FriendsResult.NotFound, 0n);
      return;
    }
    if ([...this.list.values()].includes(name)) {
      this.reply(FriendsResult.Already, info.guid);
      return;
    }
    if (this.list.size >= this.cap) {
      this.reply(FriendsResult.ListFull, info.guid);
      return;
    }
    this.list.set(info.guid, name);
    this.reply(info.online ? FriendsResult.AddedOnline : FriendsResult.AddedOffline, info.guid);
  }

  delFriend(guid: bigint): void {
    this.ops.push(`del:${guid}`);
    if (this.list.delete(guid)) this.reply(FriendsResult.Removed, guid);
  }

  private reply(result: number, guid: bigint): void {
    this.sweeper.handleFriendStatus({ result, guid });
  }
}

/** A sweeper wired to a fake, with instant sleep and short timeouts so tests are fast. */
function make(realm: FakeRealm, overrides: Partial<PresenceSweeperOptions> = {}): PresenceSweeper {
  const sweeper = new PresenceSweeper({
    ops: realm,
    sleep: async () => {},
    perOpTimeoutMs: 20,
    listTimeoutMs: 20,
    settleMs: 0,
    ...overrides,
  });
  realm.sweeper = sweeper;
  return sweeper;
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("PresenceSweeper", () => {
  it("keeps the online names, drops the confirmed-offline ones", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Onlineone", 1n, true);
    realm.addKnown("Offlineone", 2n, false);
    realm.addKnown("Onlinetwo", 3n, true);
    const sweeper = make(realm);

    const online = await sweeper.sweep(["Onlineone", "Offlineone", "Onlinetwo"]);

    expect([...online].sort()).toEqual(["Onlineone", "Onlinetwo"]);
    expect(online.has("Offlineone")).toBe(false);
  });

  it("returns each probed slot — every add is followed by a del of its guid", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Aaa", 10n, true);
    realm.addKnown("Bbb", 20n, false);
    const sweeper = make(realm);

    await sweeper.sweep(["Aaa", "Bbb"]);

    // Both the online and the offline add put their slot back, so the list ends empty.
    expect(realm.list.size).toBe(0);
    expect(realm.ops).toContain("del:10");
    expect(realm.ops).toContain("del:20");
  });

  it("clears pre-existing friends before probing (an ALREADY carries no presence)", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Resident", 99n, true);
    realm.list.set(99n, "Resident"); // already on the list from a prior run
    realm.addKnown("Fresh", 5n, true);
    const sweeper = make(realm);

    await sweeper.sweep(["Fresh"]);

    // The list was read and the resident deleted before the sweep's own adds.
    const firstDel = realm.ops.indexOf("del:99");
    const freshAdd = realm.ops.indexOf("add:Fresh");
    expect(firstDel).toBeGreaterThanOrEqual(0);
    expect(firstDel).toBeLessThan(freshAdd);
  });

  it("fail-open: a name the server never answers (unresolvable) is kept, not dropped", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Realone", 1n, false); // offline — would be dropped
    realm.silent.add("Ghostname"); // renamed/deleted char — no reply at all
    const sweeper = make(realm);

    const online = await sweeper.sweep(["Ghostname", "Realone"]);

    expect(online.has("Ghostname")).toBe(true); // kept despite no answer
    expect(online.has("Realone")).toBe(false); // the only drop is a CONFIRMED offline
  });

  it("fail-open: a NOT_FOUND result is kept", async () => {
    const realm = new FakeRealm(); // no known chars -> every add replies NOT_FOUND
    const sweeper = make(realm);
    const online = await sweeper.sweep(["Missingone", "Missingtwo"]);
    expect([...online].sort()).toEqual(["Missingone", "Missingtwo"]);
  });

  it("ignores a stray REMOVED/push arriving before the real add reply", async () => {
    const realm = new FakeRealm();
    const sweeper = make(realm);
    // Custom add: emit a stray REMOVED and a stray ONLINE push FIRST, then the true ADDED_ONLINE.
    realm.addFriend = (name: string): void => {
      realm.ops.push(`add:${name}`);
      realm.sweeper.handleFriendStatus({ result: FriendsResult.Removed, guid: 7n }); // stray, must be ignored
      realm.sweeper.handleFriendStatus({ result: FriendsResult.Online, guid: 7n }); // stray push, ignored
      realm.sweeper.handleFriendStatus({ result: FriendsResult.AddedOnline, guid: 42n }); // the real reply
    };

    const online = await sweeper.sweep(["Someone"]);

    expect(online.has("Someone")).toBe(true); // resolved on the ADDED_ONLINE, not the stray REMOVED
    expect(realm.ops).toContain("del:42"); // and it removed the guid from the real reply
  });

  it("a second sweep while one is running keeps all names (no interleaving)", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Offlineone", 1n, false);
    // A sweep that blocks inside clear until we let it go, so we can start a second concurrently.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const sweeper = make(realm, { sleep: async () => gate });
    realm.list.set(1n, "Offlineone"); // force a non-empty clear so the settle sleep (our gate) runs

    const first = sweeper.sweep(["Offlineone"]);
    await flush(); // let the first sweep reach the gate inside clear
    expect(sweeper.busy).toBe(true);

    const second = await sweeper.sweep(["Offlineone"]); // rejected — kept whole
    expect(second.has("Offlineone")).toBe(true);

    release();
    await first;
  });

  it("honours the sweep deadline — unprobed names are kept, not probed", async () => {
    const realm = new FakeRealm();
    realm.addKnown("First", 1n, true);
    realm.addKnown("Second", 2n, true);
    realm.addKnown("Third", 3n, true);
    let t = 0;
    const sweeper = make(realm, { now: () => (t += 100), sweepDeadlineMs: 150 });
    // now() calls: start=100; iter0 check=200 (200-100=100 <=150 -> probe); iter1 check=300 (>150 -> stop)

    const online = await sweeper.sweep(["First", "Second", "Third"]);

    expect([...online].sort()).toEqual(["First", "Second", "Third"]); // all kept
    expect(realm.ops).toContain("add:First"); // First was probed
    expect(realm.ops).not.toContain("add:Second"); // Second/Third kept unprobed past the deadline
    expect(realm.ops).not.toContain("add:Third");
  });

  it("fail-open on a thrown op: returns every name", async () => {
    const realm = new FakeRealm();
    const sweeper = make(realm);
    realm.requestFriendList = () => {
      throw new Error("socket closed");
    };
    const online = await sweeper.sweep(["Aaa", "Bbb"]);
    expect([...online].sort()).toEqual(["Aaa", "Bbb"]);
  });

  it("streams kept names via onKeep — once each, offline excluded, matching the returned set", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Onlineone", 1n, true);
    realm.addKnown("Offlineone", 2n, false);
    realm.addKnown("Onlinetwo", 3n, true);
    realm.silent.add("Ghostname"); // unresolvable -> fail-open kept
    const sweeper = make(realm);

    const streamed: string[] = [];
    const keep = await sweeper.sweep(["Onlineone", "Offlineone", "Onlinetwo", "Ghostname"], (n) => streamed.push(n));

    expect(streamed.sort()).toEqual(["Ghostname", "Onlineone", "Onlinetwo"]); // offline not streamed
    expect(streamed).not.toContain("Offlineone");
    expect([...keep].sort()).toEqual(streamed.slice().sort()); // callback and return agree
    expect(new Set(streamed).size).toBe(streamed.length); // no duplicates
  });

  it("on a thrown op mid-sweep, streams the whole remainder once (fail-open)", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Aaa", 1n, true);
    realm.addKnown("Bbb", 2n, false);
    const sweeper = make(realm);
    // Let the clear/list succeed, then throw on the first add so the loop fails partway.
    realm.addFriend = () => {
      throw new Error("socket closed mid-sweep");
    };

    const streamed: string[] = [];
    const keep = await sweeper.sweep(["Aaa", "Bbb"], (n) => streamed.push(n));

    expect(streamed.sort()).toEqual(["Aaa", "Bbb"]); // both streamed despite the failure
    expect([...keep].sort()).toEqual(["Aaa", "Bbb"]);
    expect(new Set(streamed).size).toBe(2); // and each only once
  });

  it("resets busy after a sweep so the next one runs", async () => {
    const realm = new FakeRealm();
    realm.addKnown("Aaa", 1n, true);
    const sweeper = make(realm);
    await sweeper.sweep(["Aaa"]);
    expect(sweeper.busy).toBe(false);
    const again = await sweeper.sweep(["Aaa"]);
    expect(again.has("Aaa")).toBe(true);
  });
});
