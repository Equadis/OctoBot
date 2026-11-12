import { describe, expect, it } from "vitest";
import { InMemorySubscriberStore } from "./memory-store.js";

describe("InMemorySubscriberStore", () => {
  it("adds a subscriber once and reports the first add as new", async () => {
    const store = new InMemorySubscriberStore();
    expect(await store.add("Raider")).toBe(true);
    expect(await store.add("Raider")).toBe(false);
    expect(await store.all()).toHaveLength(1);
  });

  it("matches names case-insensitively but keeps the display casing", async () => {
    const store = new InMemorySubscriberStore();
    await store.add("Raider");
    expect(await store.has("raider")).toBe(true);
    expect(await store.add("RAIDER")).toBe(false);
    expect((await store.all())[0]?.name).toBe("Raider");
  });

  it("removes a subscriber and reports whether one was there", async () => {
    const store = new InMemorySubscriberStore();
    await store.add("Raider");
    expect(await store.remove("raider")).toBe(true);
    expect(await store.remove("raider")).toBe(false);
    expect(await store.has("Raider")).toBe(false);
  });

  it("ignores blank names", async () => {
    const store = new InMemorySubscriberStore();
    expect(await store.add("   ")).toBe(false);
    expect(await store.all()).toHaveLength(0);
  });

  it("defaults a new subscriber to both sides, source 'default' (unresolved)", async () => {
    const store = new InMemorySubscriberStore();
    await store.add("Raider");
    expect(await store.get("raider")).toMatchObject({
      name: "Raider",
      factions: ["alliance", "horde"],
      factionSource: "default",
    });
  });

  it("updates the subscribed side", async () => {
    const store = new InMemorySubscriberStore();
    await store.add("Raider");
    expect(await store.update("raider", { factions: ["horde"] })).toBe(true);
    expect((await store.get("raider"))?.factions).toEqual(["horde"]);
  });

  it("does not update a name that isn't subscribed", async () => {
    const store = new InMemorySubscriberStore();
    expect(await store.update("Ghost", { factions: ["alliance"] })).toBe(false);
    expect(await store.get("Ghost")).toBeNull();
  });
});
