import { describe, expect, it } from "vitest";
import { loadConfig, onyxiaWatch, ONYXIA_MAX_CLEAR_MS, parseAddress } from "./config.js";

const minimalEnv = {
  WOW_ACCOUNT: "botacct",
  WOW_PASSWORD: "secret",
  WOW_CHARACTER: "Botchar",
} satisfies NodeJS.ProcessEnv;

describe("loadConfig", () => {
  it("fills defaults for a minimal valid environment", () => {
    const config = loadConfig({ ...minimalEnv });
    expect(config.authHost).toBe("play.octowow.st");
    expect(config.authPort).toBe(3724);
    expect(config.realm).toBe("N'Zoth");
    expect(config.watchAreaId).toBe(2159);
    expect(config.watchAreaName).toBe("Onyxia's Lair");
    expect(config.pollIntervalMs).toBe(20_000);
    expect(config.worldHost).toBeNull();
    expect(config.worldPort).toBeNull();
    expect(config.logLevel).toBe("info");
  });

  it("collects every missing required field into one error", () => {
    expect(() => loadConfig({})).toThrow(
      /WOW_ACCOUNT is required[\s\S]*WOW_PASSWORD is required[\s\S]*WOW_CHARACTER is required/,
    );
  });

  it("converts the poll interval from seconds to milliseconds", () => {
    const config = loadConfig({ ...minimalEnv, POLL_INTERVAL_SECONDS: "30" });
    expect(config.pollIntervalMs).toBe(30_000);
  });

  it("rejects a poll interval below the floor", () => {
    expect(() => loadConfig({ ...minimalEnv, POLL_INTERVAL_SECONDS: "2" })).toThrow(
      /POLL_INTERVAL_SECONDS must be an integer >= 5/,
    );
  });

  it("keeps a world-server override when provided", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_WORLD_HOST: "world.example.com",
      WOW_WORLD_PORT: "8085",
    });
    expect(config.worldHost).toBe("world.example.com");
    expect(config.worldPort).toBe(8085);
  });

  it("rejects an unknown log level", () => {
    expect(() => loadConfig({ ...minimalEnv, LOG_LEVEL: "verbose" })).toThrow(/LOG_LEVEL must be/);
  });

  it("rejects a non-numeric faction role id", () => {
    expect(() => loadConfig({ ...minimalEnv, DISCORD_ALLIANCE_ROLE_ID: "@Alliance" })).toThrow(
      /DISCORD_ALLIANCE_ROLE_ID must be a numeric/,
    );
    expect(() => loadConfig({ ...minimalEnv, DISCORD_HORDE_ROLE_ID: "@Horde" })).toThrow(
      /DISCORD_HORDE_ROLE_ID must be a numeric/,
    );
  });

  it("defaults the integrity checksum to a 20-byte value", () => {
    const checksum = loadConfig({ ...minimalEnv }).integrityChecksum;
    expect(checksum?.length).toBe(20);
  });

  it("disables the integrity checksum when set to 'none'", () => {
    const config = loadConfig({ ...minimalEnv, WOW_INTEGRITY_CHECKSUM: "none" });
    expect(config.integrityChecksum).toBeNull();
  });

  it("rejects a malformed integrity checksum", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_INTEGRITY_CHECKSUM: "xyz" })).toThrow(
      /WOW_INTEGRITY_CHECKSUM must be 40 hex/,
    );
  });

  it("defaults the build and accepts a WOW_BUILD override", () => {
    expect(loadConfig({ ...minimalEnv }).build).toBe(7272);
    expect(loadConfig({ ...minimalEnv, WOW_BUILD: "5875" }).build).toBe(5875);
  });

  it("defaults the world build to 5875", () => {
    expect(loadConfig({ ...minimalEnv }).worldBuild).toBe(5875);
  });

  it("enables auto-resolve by default and points at the OctoWoW CDN", () => {
    const config = loadConfig({ ...minimalEnv });
    expect(config.autoResolve).toBe(true);
    expect(config.clientCdn).toContain("octowow");
  });

  it("disables auto-resolve when set to false/0/none", () => {
    for (const value of ["false", "0", "none"]) {
      expect(loadConfig({ ...minimalEnv, WOW_AUTO_RESOLVE: value }).autoResolve).toBe(false);
    }
  });

  it("defaults the raid-forming threshold to 15 and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).minRaidSize).toBe(15);
    expect(loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "20" }).minRaidSize).toBe(20);
  });

  it("rejects a raid-forming threshold below 1", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "0" })).toThrow(
      /WOW_MIN_RAID_SIZE must be an integer >= 1/,
    );
  });

  it("defaults the raid clear floor to a third of the raid size and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidClearSize).toBe(5); // floor(15 / 3)
    expect(loadConfig({ ...minimalEnv, WOW_RAID_CLEAR_SIZE: "8" }).raidClearSize).toBe(8);
  });

  it("rejects a clear floor at or above the raid size", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_RAID_CLEAR_SIZE: "15" })).toThrow(
      /WOW_RAID_CLEAR_SIZE must be less than WOW_MIN_RAID_SIZE/,
    );
  });

  it("defaults the strength size and left floor to the forming size (single-point)", () => {
    const config = loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "20" });
    expect(config.raidStrengthSize).toBe(20);
    expect(config.raidLeftFloor).toBe(20);
  });

  it("reads a two-point setup: form early, start the clock at strength, leave below the floor", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_MIN_RAID_SIZE: "20",
      WOW_RAID_STRENGTH_SIZE: "23",
      WOW_RAID_LEFT_FLOOR: "15",
    });
    expect(config.minRaidSize).toBe(20);
    expect(config.raidStrengthSize).toBe(23);
    expect(config.raidLeftFloor).toBe(15);
  });

  it("rejects a strength size below the forming size", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "20", WOW_RAID_STRENGTH_SIZE: "18" })).toThrow(
      /WOW_RAID_STRENGTH_SIZE must be >= WOW_MIN_RAID_SIZE/,
    );
  });

  it("rejects a left floor above the strength size", () => {
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "20", WOW_RAID_STRENGTH_SIZE: "23", WOW_RAID_LEFT_FLOOR: "24" }),
    ).toThrow(/WOW_RAID_LEFT_FLOOR must be <= WOW_RAID_STRENGTH_SIZE/);
  });

  it("defaults the about-to-clear lead to 20m and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidEndingLeadMs).toBe(20 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_ENDING_LEAD_MINUTES: "15" }).raidEndingLeadMs).toBe(15 * 60_000);
  });

  it("defaults the whisper max-age to 5m and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).whisperMaxAgeMs).toBe(5 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_WHISPER_MAX_AGE_MINUTES: "3" }).whisperMaxAgeMs).toBe(3 * 60_000);
  });

  it("defaults the arrival-cohort fill window to 5m and the roster cap to 30, both overridable", () => {
    const cfg = loadConfig({ ...minimalEnv });
    expect(cfg.raidFillWindowMs).toBe(5 * 60_000);
    expect(cfg.raidRosterCap).toBe(30);
    const over = loadConfig({ ...minimalEnv, WOW_RAID_FILL_WINDOW_MINUTES: "8", WOW_RAID_ROSTER_CAP: "40" });
    expect(over.raidFillWindowMs).toBe(8 * 60_000);
    expect(over.raidRosterCap).toBe(40);
  });

  it("defaults the disband threshold to 20m and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidDisbandMs).toBe(20 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_DISBAND_MINUTES: "25" }).raidDisbandMs).toBe(25 * 60_000);
  });

  it("defaults the raid-duration estimate to 45m and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidDurationEstimateMs).toBe(45 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_DURATION_MINUTES: "30" }).raidDurationEstimateMs).toBe(
      30 * 60_000,
    );
  });

  it("defaults the learn-min-samples to 15 and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidLearnMinSamples).toBe(15);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_LEARN_MIN_SAMPLES: "25" }).raidLearnMinSamples).toBe(25);
  });

  it("defaults the min-clear floor to 10 minutes and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidMinClearMs).toBe(10 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_MIN_CLEAR_MINUTES: "8" }).raidMinClearMs).toBe(8 * 60_000);
  });

  it("defaults the clear-sustained window to 3 minutes and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidClearSustainedMs).toBe(3 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_CLEAR_SUSTAINED_MINUTES: "7" }).raidClearSustainedMs).toBe(7 * 60_000);
  });

  it("defaults the raid lockout to 2 hours and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).raidLockoutMs).toBe(2 * 60 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_RAID_LOCKOUT_HOURS: "12" }).raidLockoutMs).toBe(12 * 60 * 60_000);
  });

  it("keeps the capital status yell off by default, and takes a cadence to switch it on", () => {
    expect(loadConfig({ ...minimalEnv }).statusYellMs).toBe(0);
    expect(loadConfig({ ...minimalEnv, WOW_STATUS_YELL_MINUTES: "0" }).statusYellMs).toBe(0);
    expect(loadConfig({ ...minimalEnv, WOW_STATUS_YELL_MINUTES: "15" }).statusYellMs).toBe(15 * 60_000);
  });

  it("defaults the /who timeout to 8s and accepts an override for slow peak load", () => {
    expect(loadConfig({ ...minimalEnv }).whoTimeoutMs).toBe(8_000);
    expect(loadConfig({ ...minimalEnv, WOW_WHO_TIMEOUT_MS: "15000" }).whoTimeoutMs).toBe(15_000);
  });

  it("holds each character to 31s between /who lookups by default, and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).whoMinGapMs).toBe(31_000);
    expect(loadConfig({ ...minimalEnv, WOW_WHO_MIN_GAP_SECONDS: "45" }).whoMinGapMs).toBe(45_000);
  });

  it("rejects a per-character /who gap that is not a whole number of seconds", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_WHO_MIN_GAP_SECONDS: "-1" })).toThrow(/WOW_WHO_MIN_GAP_SECONDS/);
  });

  it("defaults the interact range to 8 yards and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).interactMaxYd).toBe(8);
    expect(loadConfig({ ...minimalEnv, WOW_INTERACT_MAX_YD: "5" }).interactMaxYd).toBe(5);
  });

  it("has no interact-entry target by default, and reads a numeric one", () => {
    expect(loadConfig({ ...minimalEnv }).interactEntry).toBeNull();
    expect(loadConfig({ ...minimalEnv, WOW_INTERACT_ENTRY: "25329" }).interactEntry).toBe(25329);
    expect(loadConfig({ ...minimalEnv, WOW_INTERACT_ENTRY: "notanumber" }).interactEntry).toBeNull();
  });

  it("defaults the realm stability window to 5 minutes and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).realmStableMs).toBe(5 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_REALM_STABLE_MINUTES: "10" }).realmStableMs).toBe(10 * 60_000);
  });

  it("defaults the realm type to crossfaction and accepts faction", () => {
    expect(loadConfig({ ...minimalEnv }).realmType).toBe("crossfaction");
    expect(loadConfig({ ...minimalEnv, WOW_REALM_TYPE: "faction" }).realmType).toBe("faction");
    expect(loadConfig({ ...minimalEnv, WOW_REALM_TYPE: "CROSSFACTION" }).realmType).toBe("crossfaction");
    expect(() => loadConfig({ ...minimalEnv, WOW_REALM_TYPE: "pvp" })).toThrow(/WOW_REALM_TYPE/);
  });

  it("defaults the raid detector to count and accepts temporal", () => {
    expect(loadConfig({ ...minimalEnv }).raidDetector).toBe("count");
    expect(loadConfig({ ...minimalEnv, WOW_RAID_DETECTOR: "temporal" }).raidDetector).toBe("temporal");
    expect(() => loadConfig({ ...minimalEnv, WOW_RAID_DETECTOR: "magic" })).toThrow(/WOW_RAID_DETECTOR/);
  });

  it("defaults raid grouping to auto and accepts guild/lair", () => {
    expect(loadConfig({ ...minimalEnv }).raidGrouping).toBe("auto");
    expect(loadConfig({ ...minimalEnv, WOW_RAID_GROUPING: "lair" }).raidGrouping).toBe("lair");
    expect(loadConfig({ ...minimalEnv, WOW_RAID_GROUPING: "GUILD" }).raidGrouping).toBe("guild");
  });

  it("rejects an unknown raid grouping", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_RAID_GROUPING: "instance" })).toThrow(
      /WOW_RAID_GROUPING must be one of/,
    );
  });

  it("keeps the startup announcement off by default and on when opted in", () => {
    expect(loadConfig({ ...minimalEnv }).announceStartup).toBe(false);
    for (const value of ["true", "1"]) {
      expect(loadConfig({ ...minimalEnv, WOW_ANNOUNCE_STARTUP: value }).announceStartup).toBe(true);
    }
    expect(loadConfig({ ...minimalEnv, WOW_ANNOUNCE_STARTUP: "false" }).announceStartup).toBe(false);
  });

  it("defaults to no listeners", () => {
    expect(loadConfig({ ...minimalEnv }).listeners).toEqual([]);
  });

  it("parses the WOW_LISTENERS JSON array (one object per character)", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_LISTENERS: JSON.stringify([
        { account: "ONYXIABUFFOG", password: "pw;1:with!specials", character: "Onyxiabuffog", faction: "horde", onLogin: "sit", yeller: true, darkmoonWatchLocation: "mulgore" },
        { account: "ONYXIABUFFSW", password: "pw2", character: "Onyxiabuffsw", faction: "alliance", onLogin: "interact" },
        { account: "ONYXIABUFFOGB", password: "pw3", character: "Onybuffogb", faction: "horde", onLogin: "sit", yeller: false, logNpcChat: true },
      ]),
    });
    expect(config.listeners).toEqual([
      { account: "ONYXIABUFFOG", password: "pw;1:with!specials", characterName: "Onyxiabuffog", onLogin: "sit", faction: "horde", yeller: true, logNpcChat: false, darkmoonWatchLocation: "mulgore" },
      { account: "ONYXIABUFFSW", password: "pw2", characterName: "Onyxiabuffsw", onLogin: "interact", faction: "alliance", yeller: true, logNpcChat: false, darkmoonWatchLocation: null }, // yeller defaults true
      { account: "ONYXIABUFFOGB", password: "pw3", characterName: "Onybuffogb", onLogin: "sit", faction: "horde", yeller: false, logNpcChat: true, darkmoonWatchLocation: null },
    ]);
  });

  it("defaults optional fields (faction null, onLogin none, yeller true, logNpcChat false)", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_LISTENERS: JSON.stringify([{ account: "A", password: "p", character: "Ca" }]),
    });
    expect(config.listeners).toEqual([
      { account: "A", password: "p", characterName: "Ca", onLogin: "none", faction: null, yeller: true, logNpcChat: false, darkmoonWatchLocation: null },
    ]);
  });

  it("inherits the primary password for a secondary account when omitted", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_LISTENERS: JSON.stringify([{ account: "MULGORE", character: "FaireWatch", darkmoonWatchLocation: "mulgore", yeller: false }]),
    });
    expect(config.listeners[0]?.password).toBe("secret");
    expect(config.listeners[0]?.darkmoonWatchLocation).toBe("mulgore");
  });

  it("rejects invalid secondary darkmoon site names", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([
      { account: "PVP", password: "test", character: "Scout", darkmoonWatchLocation: "stranglethorn" },
    ]) })).toThrow(/darkmoonWatchLocation/);
  });

  it("rejects invalid WOW_LISTENERS JSON with a clear error", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_LISTENERS: "{not json" })).toThrow(/WOW_LISTENERS is not valid JSON/);
    expect(() => loadConfig({ ...minimalEnv, WOW_LISTENERS: '{"account":"A"}' })).toThrow(
      /WOW_LISTENERS must be a JSON array/,
    );
  });

  it("errors on a listener object missing required fields", () => {
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([{ account: "A" }]) }),
    ).toThrow(/entry 1 needs a non-empty "character"/);
  });

  it("rejects a bad faction / onLogin / yeller / logNpcChat value in a listener object", () => {
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([{ account: "A", password: "p", character: "C", faction: "pandaren" }]) }),
    ).toThrow(/entry 1 "faction" must be "alliance" or "horde"/);
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([{ account: "A", password: "p", character: "C", onLogin: "dance" }]) }),
    ).toThrow(/entry 1 "onLogin" must be "sit", "interact", or "none"/);
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([{ account: "A", password: "p", character: "C", yeller: "yes" }]) }),
    ).toThrow(/entry 1 "yeller" must be true or false/);
    expect(() =>
      loadConfig({ ...minimalEnv, WOW_LISTENERS: JSON.stringify([{ account: "A", password: "p", character: "C", logNpcChat: 1 }]) }),
    ).toThrow(/entry 1 "logNpcChat" must be true or false/);
  });

  it("defaults the broadcast-dedup window to the buff window (120m) and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).broadcastDedupMs).toBe(120 * 60_000);
    expect(loadConfig({ ...minimalEnv, WOW_BROADCAST_DEDUP_MINUTES: "30" }).broadcastDedupMs).toBe(30 * 60_000);
  });

  it("defaults the buff cooldown to 0 (none) and reads a minutes override", () => {
    expect(loadConfig({ ...minimalEnv }).buffCooldownMs).toBe(0);
    expect(loadConfig({ ...minimalEnv, WOW_BUFF_COOLDOWN_MINUTES: "0" }).buffCooldownMs).toBe(0);
    expect(loadConfig({ ...minimalEnv, WOW_BUFF_COOLDOWN_MINUTES: "180" }).buffCooldownMs).toBe(180 * 60_000);
  });

  it("enables login by default and disables it on false/0/none", () => {
    expect(loadConfig({ ...minimalEnv }).loginEnabled).toBe(true);
    for (const value of ["false", "0", "none"]) {
      expect(loadConfig({ ...minimalEnv, WOW_LOGIN_ENABLED: value }).loginEnabled).toBe(false);
    }
    expect(loadConfig({ ...minimalEnv, WOW_LOGIN_ENABLED: "true" }).loginEnabled).toBe(true);
  });

  it("enables in-game whispers by default and disables them on false/0/none", () => {
    expect(loadConfig({ ...minimalEnv }).whispersEnabled).toBe(true);
    for (const value of ["false", "0", "none"]) {
      expect(loadConfig({ ...minimalEnv, WOW_WHISPERS: value }).whispersEnabled).toBe(false);
    }
  });

  it("defaults the whisper throttle and accepts an override", () => {
    expect(loadConfig({ ...minimalEnv }).whisperThrottleMs).toBe(1200);
    expect(loadConfig({ ...minimalEnv, WOW_WHISPER_THROTTLE_MS: "800" }).whisperThrottleMs).toBe(800);
  });

  it("defaults the Discord bot token to null and reads an override", () => {
    expect(loadConfig({ ...minimalEnv }).discordBotToken).toBeNull();
    expect(loadConfig({ ...minimalEnv, DISCORD_BOT_TOKEN: "bot.tok.en" }).discordBotToken).toBe("bot.tok.en");
  });

  it("defaults the guild/community settings and reads overrides", () => {
    const bare = loadConfig({ ...minimalEnv });
    expect(bare.guildName).toBe("Rage Quit");
    expect(bare.community).toBe("OctoWoW");
    expect(bare.discordFeedbackChannelId).toBeNull();
    expect(bare.discordOnyxiaChannelId).toBeNull();
    expect(bare.discordErrorsChannelId).toBeNull();
    expect(bare.discordServerStatusChannelId).toBeNull();
    expect(bare.statusWidgetRefreshMs).toBe(300_000);
    expect(bare.statusNoticeLingerMs).toBe(5_000);
    expect(bare.statusChannelRenameEnabled).toBe(false);
    expect(bare.statusChannelName).toBe("server-status");
    expect(bare.discordAllianceRoleId).toBeNull();
    expect(bare.discordHordeRoleId).toBeNull();
    const configured = loadConfig({
      ...minimalEnv,
      WOW_GUILD_NAME: "Late Night",
      WOW_COMMUNITY: "Turtle",
      DISCORD_FEEDBACK_CHANNEL_ID: "1543926066907844729",
      DISCORD_ONYXIA_CHANNEL_ID: "1544021433720635392",
      DISCORD_ERRORS_CHANNEL_ID: "1544243835771551794",
      DISCORD_SERVER_STATUS_CHANNEL_ID: "1547634262730088508",
      WOW_STATUS_REFRESH_SECONDS: "120",
      WOW_STATUS_NOTICE_LINGER_SECONDS: "0",
      WOW_STATUS_CHANNEL_RENAME: "true",
      WOW_STATUS_CHANNEL_NAME: "realm-status",
      DISCORD_ALLIANCE_ROLE_ID: "111",
      DISCORD_HORDE_ROLE_ID: "222",
    });
    expect(configured.guildName).toBe("Late Night");
    expect(configured.community).toBe("Turtle");
    expect(configured.discordFeedbackChannelId).toBe("1543926066907844729");
    expect(configured.discordOnyxiaChannelId).toBe("1544021433720635392");
    expect(configured.discordErrorsChannelId).toBe("1544243835771551794");
    expect(configured.discordServerStatusChannelId).toBe("1547634262730088508");
    expect(configured.statusWidgetRefreshMs).toBe(120_000);
    expect(configured.statusNoticeLingerMs).toBe(0);
    expect(configured.statusChannelRenameEnabled).toBe(true);
    expect(configured.statusChannelName).toBe("realm-status");
    expect(configured.discordAllianceRoleId).toBe("111");
    expect(configured.discordHordeRoleId).toBe("222");
  });

  it("defaults the Chronicle early-confirm on, and reads the disable overrides", () => {
    const bare = loadConfig({ ...minimalEnv });
    expect(bare.chronicleEnabled).toBe(true); // on by default (a no-op without Mongo)
    expect(loadConfig({ ...minimalEnv, CHRONICLE_ENABLED: "false" }).chronicleEnabled).toBe(false);
    expect(loadConfig({ ...minimalEnv, CHRONICLE_ENABLED: "none" }).chronicleEnabled).toBe(false);
  });

  it("defaults the Mongo settings and reads overrides", () => {
    const bare = loadConfig({ ...minimalEnv });
    expect(bare.mongodbUri).toBeNull();
    expect(bare.mongodbDb).toBe("onyxiabot");
    const configured = loadConfig({
      ...minimalEnv,
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB: "raids",
    });
    expect(configured.mongodbUri).toBe("mongodb://localhost:27017");
    expect(configured.mongodbDb).toBe("raids");
  });
});

describe("parseAddress", () => {
  it("splits host and port", () => {
    expect(parseAddress("51.15.0.1:8085")).toEqual({ host: "51.15.0.1", port: 8085 });
  });

  it("falls back to the default port when none is present", () => {
    expect(parseAddress("world.turtle-wow.org")).toEqual({
      host: "world.turtle-wow.org",
      port: 8085,
    });
  });

  it("falls back to the default port when the port is not a number", () => {
    expect(parseAddress("host:abc").port).toBe(8085);
  });
});


describe("loadConfig darkmoon corroboration", () => {
  it("defaults to requiring several distinct senders and a cooldown", () => {
    expect(loadConfig({ ...minimalEnv }).darkmoonCorroboration).toEqual({
      quorum: 3,
      changeCooldownMs: 12 * 3_600_000,
    });
  });

  it("can be relaxed to trust whoever spoke last", () => {
    const config = loadConfig({ ...minimalEnv, DARKMOON_QUORUM: "1", DARKMOON_CHANGE_COOLDOWN_HOURS: "0" });
    expect(config.darkmoonCorroboration).toEqual({ quorum: 1, changeCooldownMs: 0 });
  });

  it("rejects a cooldown that would block the faire real weekly move", () => {
    expect(() => loadConfig({ ...minimalEnv, DARKMOON_CHANGE_COOLDOWN_HOURS: "48" })).toThrow(
      /DARKMOON_CHANGE_COOLDOWN_HOURS must be 0-24/,
    );
    expect(() => loadConfig({ ...minimalEnv, DARKMOON_QUORUM: "99" })).toThrow(/DARKMOON_QUORUM must be 1-50/);
  });
});

describe("loadConfig darkmoon on-site watch", () => {
  it("is off unless the character is actually parked at a faire site", () => {
    expect(loadConfig({ ...minimalEnv }).darkmoonWatchLocation).toBeNull();
  });

  it("takes the site the character is parked at", () => {
    expect(loadConfig({ ...minimalEnv, DARKMOON_WATCH_LOCATION: "elwynn" }).darkmoonWatchLocation).toBe(
      "elwynn",
    );
    expect(loadConfig({ ...minimalEnv, DARKMOON_WATCH_LOCATION: " MULGORE " }).darkmoonWatchLocation).toBe(
      "mulgore",
    );
  });

  it("rejects a zone the faire never visits, rather than silently watching nowhere", () => {
    expect(() => loadConfig({ ...minimalEnv, DARKMOON_WATCH_LOCATION: "goldshire" })).toThrow(
      /DARKMOON_WATCH_LOCATION must be "elwynn" or "mulgore"/,
    );
  });
});

describe("loadConfig guild invites", () => {
  it("hands out no guild invites unless switched on", () => {
    expect(loadConfig({ ...minimalEnv }).guildInviteEnabled).toBe(false);
    expect(loadConfig({ ...minimalEnv, WOW_GUILD_INVITE: "false" }).guildInviteEnabled).toBe(false);
    for (const on of ["true", "1", "TRUE"]) {
      expect(loadConfig({ ...minimalEnv, WOW_GUILD_INVITE: on }).guildInviteEnabled).toBe(true);
    }
  });
});

describe("loadConfig wall of shame channel", () => {
  it("is off unless a channel is given", () => {
    expect(loadConfig({ ...minimalEnv }).discordWallOfShameChannelId).toBeNull();
  });

  it("takes the channel id", () => {
    expect(
      loadConfig({ ...minimalEnv, DISCORD_WALL_OF_SHAME_CHANNEL_ID: "1552341406356611206" })
        .discordWallOfShameChannelId,
    ).toBe("1552341406356611206");
  });

  it("rejects anything that is not a Discord snowflake", () => {
    expect(() => loadConfig({ ...minimalEnv, DISCORD_WALL_OF_SHAME_CHANNEL_ID: "#wall-of-shame" })).toThrow(
      /DISCORD_WALL_OF_SHAME_CHANNEL_ID must be a numeric Discord channel id/,
    );
  });
});

describe("loadConfig darkmoon board channel", () => {
  it("is off unless a channel is given", () => {
    expect(loadConfig({ ...minimalEnv }).discordDarkmoonChannelId).toBeNull();
  });

  it("takes the channel id", () => {
    expect(
      loadConfig({ ...minimalEnv, DISCORD_DARKMOON_CHANNEL_ID: "1550052958698479677" })
        .discordDarkmoonChannelId,
    ).toBe("1550052958698479677");
  });

  it("rejects anything that is not a Discord snowflake", () => {
    expect(() => loadConfig({ ...minimalEnv, DISCORD_DARKMOON_CHANNEL_ID: "#darkmoon-faire" })).toThrow(
      /DISCORD_DARKMOON_CHANNEL_ID must be a numeric Discord channel id/,
    );
  });
});

describe("loadConfig listener threats", () => {
  it("defaults to leaving for five minutes when a threat comes within 40 yards", () => {
    const config = loadConfig({ ...minimalEnv });
    expect(config.listenerThreatRadiusYd).toBe(40);
    expect(config.listenerStandDownMs).toBe(5 * 60_000);
  });

  it("takes overrides in yards and minutes", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_LISTENER_THREAT_RADIUS_YARDS: "25",
      WOW_LISTENER_STAND_DOWN_MINUTES: "10",
    });
    expect(config.listenerThreatRadiusYd).toBe(25);
    expect(config.listenerStandDownMs).toBe(10 * 60_000);
  });

  it("stays beside a player on the wall of shame unless told to flee them too", () => {
    expect(loadConfig({ ...minimalEnv }).listenerFleeShunnedPlayers).toBe(false);
    expect(loadConfig({ ...minimalEnv, WOW_LISTENER_FLEE_SHUNNED_PLAYERS: "true" }).listenerFleeShunnedPlayers).toBe(true);
  });

  it("rejects a radius too small to leave in time", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_LISTENER_THREAT_RADIUS_YARDS: "2" })).toThrow(
      /WOW_LISTENER_THREAT_RADIUS_YARDS must be an integer >= 5/,
    );
  });
});

describe("loadConfig listener silence", () => {
  it("defaults to reporting a listener that has heard nothing for six hours", () => {
    expect(loadConfig({ ...minimalEnv }).listenerSilenceMs).toBe(6 * 60 * 60_000);
  });

  it("takes an override in hours", () => {
    expect(loadConfig({ ...minimalEnv, WOW_LISTENER_SILENCE_HOURS: "2" }).listenerSilenceMs).toBe(
      2 * 60 * 60_000,
    );
  });
});

describe("loadConfig blackwing lair watch", () => {
  it("watches Blackwing Lair by default, with its own 40-man, hours-long defaults", () => {
    const bwl = loadConfig({ ...minimalEnv }).blackwingLair;
    expect(bwl).toMatchObject({
      areaId: 2677,
      areaName: "Blackwing Lair",
      pollIntervalMs: 60_000,
      minRaidSize: 20,
      raidClearSize: 6,
      raidStrengthSize: 20,
      raidLeftFloor: 20,
      raidDurationEstimateMs: 150 * 60_000,
      raidRosterCap: 45,
      raidMinClearMs: 30 * 60_000,
      raidDisbandMs: 60 * 60_000,
      raidFreshWindowMs: 40 * 60_000,
      raidLockoutMs: 4 * 3_600_000,
      raidMaxClearMs: 10 * 3_600_000,
    });
  });

  it("is off when switched off", () => {
    for (const off of ["false", "0", "none", "FALSE"]) {
      expect(loadConfig({ ...minimalEnv, WOW_BWL_ENABLED: off }).blackwingLair).toBeNull();
    }
  });

  it("takes its own knobs, apart from Onyxia's", () => {
    const config = loadConfig({
      ...minimalEnv,
      WOW_BWL_MIN_RAID_SIZE: "30",
      WOW_BWL_RAID_DURATION_MINUTES: "180",
      WOW_BWL_POLL_INTERVAL_SECONDS: "45",
      WOW_MIN_RAID_SIZE: "12",
    });
    expect(config.blackwingLair?.minRaidSize).toBe(30);
    expect(config.blackwingLair?.raidClearSize).toBe(10);
    expect(config.blackwingLair?.raidDurationEstimateMs).toBe(180 * 60_000);
    expect(config.blackwingLair?.pollIntervalMs).toBe(45_000);
    expect(config.minRaidSize).toBe(12);
  });

  it("rejects sizes that cannot read a raid", () => {
    expect(() => loadConfig({ ...minimalEnv, WOW_BWL_MIN_RAID_SIZE: "20", WOW_BWL_RAID_CLEAR_SIZE: "20" })).toThrow(
      /WOW_BWL_RAID_CLEAR_SIZE must be less than WOW_BWL_MIN_RAID_SIZE/,
    );
    expect(() => loadConfig({ ...minimalEnv, WOW_BWL_RAID_STRENGTH_SIZE: "10" })).toThrow(
      /WOW_BWL_RAID_STRENGTH_SIZE must be >= WOW_BWL_MIN_RAID_SIZE/,
    );
  });

  it("posts to its own channel when given one, else falls back", () => {
    expect(loadConfig({ ...minimalEnv }).discordBwlChannelId).toBeNull();
    expect(loadConfig({ ...minimalEnv, DISCORD_BWL_CHANNEL_ID: "1552723662099062835" }).discordBwlChannelId).toBe(
      "1552723662099062835",
    );
    expect(() => loadConfig({ ...minimalEnv, DISCORD_BWL_CHANNEL_ID: "#bwl" })).toThrow(
      /DISCORD_BWL_CHANNEL_ID must be a numeric Discord channel id/,
    );
  });
});

describe("onyxiaWatch", () => {
  it("gathers Onyxia's flat raid fields into a watch", () => {
    const config = loadConfig({ ...minimalEnv, WOW_MIN_RAID_SIZE: "12" });
    const watch = onyxiaWatch(config);
    expect(watch.areaId).toBe(config.watchAreaId);
    expect(watch.minRaidSize).toBe(12);
    expect(watch.pollIntervalMs).toBe(config.pollIntervalMs);
    expect(watch.raidMaxClearMs).toBe(ONYXIA_MAX_CLEAR_MS);
  });
});
