import { describe, expect, it, vi } from "vitest";
import { buildFaireEmbed, DarkmoonWidget, type FaireChannel } from "./widget.js";
import { InMemoryDarkmoonWidgetStore } from "./widget-store.js";
import { FAIRE_SITES } from "./location.js";
import { silentLogger } from "../logger.js";
import type { FaireAnswer } from "./observation.js";

const NOW = Date.parse("2026-09-17T12:00:00Z");

const known = (over: Partial<Extract<FaireAnswer, { known: true }>> = {}): FaireAnswer => ({
  known: true,
  location: "elwynn",
  site: FAIRE_SITES.elwynn,
  observedAt: NOW - 240_000,
  source: "sighting",
  witness: "Someplayer",
  fresh: true,
  ...over,
});

describe("buildFaireEmbed", () => {
  it("leads with where to go and how recently it was seen", () => {
    const embed = buildFaireEmbed(known(), NOW);
    expect(embed.title).toBe("🎪 Darkmoon Faire");
    expect(embed.description).toContain("Elwynn Forest (south of Goldshire)");
    expect(embed.description).toContain("Seen 4m ago");
  });

  it("refuses the present tense on an old look, and colours it differently", () => {
    const stale = buildFaireEmbed(known({ fresh: false, observedAt: NOW - 2 * 86_400_000 }), NOW);
    expect(stale.description).toContain("Last seen 2d ago");
    expect(stale.description).toContain("may have moved on");
    expect(stale.color).not.toBe(buildFaireEmbed(known(), NOW).color);
  });

  it("says plainly when nobody has seen it, without naming a zone", () => {
    const embed = buildFaireEmbed({ known: false }, NOW);
    expect(embed.description).toContain("Location unknown");
    expect(embed.description).not.toMatch(/Elwynn|Mulgore/);
  });

  it("labels Discord own timestamp so it reads as a redraw, not a sighting time", () => {
    expect(buildFaireEmbed(known(), NOW).footer?.text).toBe("Updated");
    expect(buildFaireEmbed({ known: false }, NOW).footer?.text).toBe("Updated");
    // The time itself is Discord rendering the embed timestamp, localised per viewer.
    expect(buildFaireEmbed(known(), NOW).timestamp).toBe(new Date(NOW).toISOString());
  });
});

describe("DarkmoonWidget", () => {
  function harness(initialMessageId: string | null = null) {
    const created: unknown[] = [];
    const edits: { messageId: string }[] = [];
    let nextId = "msg-1";
    let failEditWith: { kind: "unreachable" | "error"; status?: number } | null = null;
    const channel: FaireChannel = {
      create: vi.fn(async (message) => {
        created.push(message);
        return { ok: true as const, messageId: nextId };
      }),
      edit: vi.fn(async (messageId) => {
        if (failEditWith) return { ok: false as const, ...failEditWith };
        edits.push({ messageId });
        return { ok: true as const };
      }),
    };
    const store = new InMemoryDarkmoonWidgetStore(
      initialMessageId === null ? null : { messageId: initialMessageId },
    );
    let now = NOW;
    let current: FaireAnswer = known();
    const widget = new DarkmoonWidget({
      channel,
      store,
      answer: () => current,
      now: () => now,
      logger: silentLogger,
    });
    return {
      widget,
      store,
      created,
      edits,
      setAnswer: (next: FaireAnswer) => {
        current = next;
      },
      setNow: (at: number) => {
        now = at;
      },
      setNextId: (id: string) => {
        nextId = id;
      },
      failEdit: (failure: { kind: "unreachable" | "error"; status?: number } | null) => {
        failEditWith = failure;
      },
    };
  }

  it("posts the board once, then edits that same message", async () => {
    const h = harness();
    await h.widget.refresh();
    expect(h.created).toHaveLength(1);

    h.setAnswer({ known: false });
    await h.widget.refresh();
    expect(h.created).toHaveLength(1);
    expect(h.edits).toEqual([{ messageId: "msg-1" }]);
  });

  it("keeps editing the same message after a restart", async () => {
    const h = harness("msg-from-last-deploy");
    await h.widget.load();
    await h.widget.refresh();
    expect(h.created).toHaveLength(0);
    expect(h.edits).toEqual([{ messageId: "msg-from-last-deploy" }]);
  });

  it("does not touch Discord when nothing about the answer changed", async () => {
    const h = harness();
    await h.widget.refresh();
    // The timer keeps firing; nothing about the answer has changed since the last render.
    for (let i = 1; i <= 20; i += 1) await h.widget.refresh();
    expect(h.created).toHaveLength(1);
    expect(h.edits).toHaveLength(0);
  });

  it("edits as soon as the age text actually moves", async () => {
    const h = harness();
    await h.widget.refresh();
    h.setNow(NOW + 3_600_000); // "4m ago" -> "1h ago"
    await h.widget.refresh();
    expect(h.edits).toHaveLength(1);
  });

  it("reposts the board if someone deleted the message", async () => {
    const h = harness();
    await h.widget.refresh();
    h.setAnswer({ known: false });
    h.failEdit({ kind: "unreachable", status: 404 });
    h.setNextId("msg-2");
    await h.widget.refresh();
    expect(h.created).toHaveLength(2);
    expect(await h.store.load()).toEqual({ messageId: "msg-2" });
  });

  it("keeps its message id on an ordinary edit failure, rather than posting a duplicate", async () => {
    const h = harness();
    await h.widget.refresh();
    h.setAnswer({ known: false });
    h.failEdit({ kind: "error", status: 500 });
    await h.widget.refresh();
    expect(h.created).toHaveLength(1);
  });

  it("persists the message id the first time it posts", async () => {
    const h = harness();
    await h.widget.refresh();
    expect(await h.store.load()).toEqual({ messageId: "msg-1" });
  });
});
