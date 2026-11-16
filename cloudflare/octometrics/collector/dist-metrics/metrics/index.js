/**
 * OctoMetrics: headless, observation-only OctoWoW collector.
 * Reuses the starter project's verified SRP6 + WoW 1.12 world client.
 * Does NOT run the source bot's guild/outreach/broadcast services.
 * Whispers receive one short, rate-limited informational reply per sender.
 */
import { connect } from "node:net";
import { AuthClient } from "../net/auth-client.js";
import { WorldClient } from "../net/world-client.js";
import { resolveBuild } from "../net/client-resolver.js";
import { DEFAULT_INTEGRITY_CHECKSUM } from "../crypto/integrity.js";
import { describeError, FatalError, VersionMismatchError } from "../errors.js";
import { createLogger, prefixed } from "../logger.js";
import { createDropPipeline, DEFAULT_DEDUPE_MS } from "./drop-pipeline.js";
import { ListenerHealth } from "./listener-health.js";
import { loadMetricsConfig } from "./config.js";
import { EventPublisher } from "./events.js";
import { RaidActivity } from "./raid-state.js";
import { nextSlot, scheduleSlot } from "./schedule.js";
import { parsePopulation, ServerInfoWindow } from "./server-info.js";
import { WhisperAutoResponder } from "./whisper-replies.js";
const logger = createLogger("info");
const config = loadMetricsConfig(process.env);
const globallyInfoOnly = process.env.METRICS_INFO_ONLY === "true";
const infoOnlyFor = account => globallyInfoOnly || account.realmKey !== "pve";
const serverInfoSlot = account => ({ "OBPVESW": 0, "OBPVEORG": 15, "OBPVPSW": 30 })[account.account] ?? (account.realmKey === "hc" ? 45 : account.serverInfoSecond);
const raidWhoSlot = account => account.role === "org" ? 38 : 8;
const publisher = new EventPublisher(config.dataFile, config.pushUrl, config.pushToken);
let stopping = false;
const sessions = new Set();
let currentBuild = config.build;
const raidState = new Map(config.accounts.map(a => [a.account, new RaidActivity(a.minActivity)]));
// Buff announcements: matched, deduplicated per realm + faction + buff + head, published with a stable event id. Every stage logs one DROPFLOW line.
const pipeline = createDropPipeline({
    publish: event => publisher.publish(event),
    windowMs: Number(process.env.OCTO_DROP_DEDUPE_MS) || DEFAULT_DEDUPE_MS,
    log: line => console.log(`DROPFLOW ${JSON.stringify(line)}`),
});
// Keep greeting cooldowns through reconnects; one namespace per character/account.
const whisperReplyHistory = new Map();
function emit(account, type, details) {
    publisher.publish({ type, time: new Date().toISOString(), realm: account.realmName, account: account.account, role: account.role, ...details });
}
function openSocket(host, port) {
    return new Promise((resolve, reject) => {
        const socket = connect({ host, port });
        const timer = setTimeout(() => { socket.destroy(); finish(new Error(`connection timed out: ${host}:${port}`)); }, 15000);
        const onConnect = () => finish();
        const onError = (err) => finish(err);
        const finish = (error) => {
            clearTimeout(timer);
            socket.off("connect", onConnect);
            socket.off("error", onError);
            if (error) {
                socket.destroy();
                reject(error);
            }
            else
                resolve(socket);
        };
        socket.once("connect", onConnect);
        socket.once("error", onError);
    });
}
function parseWorldAddress(address) {
    // Server advertises host:port. Bracketed IPv6 also works.
    if (address.startsWith("[")) {
        const m = address.match(/^\[([^\]]+)\](?::(\d+))?$/);
        if (!m)
            throw new Error("invalid bracketed realm address");
        return { host: m[1], port: m[2] ? Number(m[2]) : 8085 };
    }
    const i = address.lastIndexOf(":");
    if (i < 0)
        return { host: address, port: 8085 };
    const host = address.slice(0, i), port = Number(address.slice(i + 1));
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error("invalid realm address");
    return { host, port };
}
async function runSession(account) {
    const log = prefixed(logger, `${account.realmName}/${account.character}`);
    const { sessionKey, realms } = await new AuthClient(log).login({
        host: config.authHost, port: config.authPort, username: account.account, password: account.password,
        integrityChecksum: Buffer.from(DEFAULT_INTEGRITY_CHECKSUM, "hex"), build: currentBuild,
    });
    const realm = realms.find(r => r.name.toLowerCase() === account.realmName.toLowerCase());
    if (!realm)
        throw new FatalError(`realm ${account.realmName} missing from server realm list`);
    const target = config.worldHost ? { host: config.worldHost, port: config.worldPort ?? 8085 } : parseWorldAddress(realm.address);
    const socket = await openSocket(target.host, target.port);
    let world = null;
    const health = new ListenerHealth(account);
    const whisperResponder = new WhisperAutoResponder({
        account: account.account,
        ownNames: config.accounts.map(a => a.character),
        history: whisperReplyHistory,
        ready: () => Boolean(world?.isReady),
        send: (sender, message) => world.whisper(sender, message),
        warn: message => log.warn(message),
    });
    try {
        await new Promise((resolve, reject) => {
            let ended = false;
            let wasReady = false;
            let whoBusy = false;
            const infoWindow = new ServerInfoWindow(6000);
            const stopJobs = [];
            const readyTimer = setTimeout(() => finish(new Error("world login did not complete in 30 seconds")), 30000);
            const clean = () => {
                clearTimeout(readyTimer);
                for (const stop of stopJobs)
                    stop();
                infoWindow.clear();
                whisperResponder.stop();
                if (world) {
                    world.close();
                    sessions.delete(world);
                }
            };
            const finish = (error) => {
                if (ended)
                    return;
                ended = true;
                if (wasReady) {
                    health.disconnected(Date.now(), error ? describeError(error) : "connection closed");
                    emit(account, "session_offline", { reason: error ? describeError(error) : "connection closed" });
                    emit(account, "listener_health", health.snapshot(Date.now(), publisher.stats()));
                }
                clean();
                if (error)
                    reject(error);
                else
                    resolve();
            };
            world = new WorldClient({
                socket, account: account.account, sessionKey, characterName: account.character, build: config.worldBuild, logger: log,
                handlers: {
                    onReady: () => {
                        wasReady = true;
                        health.connected(Date.now());
                        clearTimeout(readyTimer);
                        const infoOnly = infoOnlyFor(account);
                        const infoSecond = serverInfoSlot(account);
                        const whoSecond = raidWhoSlot(account);
                        log.info(infoOnly ? `in world; .server info at :${String(infoSecond).padStart(2, "0")}; raid polling disabled` : `in world; .server info at :${String(infoSecond).padStart(2, "0")}; /who ${account.zoneName} at :${String(whoSecond).padStart(2, "0")} once/minute`);
                        emit(account, "session_online", { zone: account.zoneName });
                        // Facts about what this listener has actually heard, not just whether it is logged in (see listener-health.js).
                        stopJobs.push(scheduleSlot(22, 60, () => {
                            if (!world?.isReady)
                                return;
                            emit(account, "listener_health", health.snapshot(Date.now(), publisher.stats()));
                        }));
                        stopJobs.push(scheduleSlot(infoSecond, 60, () => {
                            if (!config.pollEnabled || !world?.isReady)
                                return;
                            if (!infoWindow.begin(lines => {
                                const parsed = parsePopulation(lines);
                                emit(account, "server_info", { lines, population: parsed, source: "server_info", valid: lines.length > 0 });
                                if (!lines.length)
                                    log.warn(".server info returned no system-chat lines; check protocol/command permissions");
                            }))
                                return;
                            try {
                                world.say(".server info");
                            }
                            catch (e) {
                                infoWindow.clear();
                                log.warn(`.server info failed: ${describeError(e)}`);
                            }
                        }));
                        if (!infoOnly) stopJobs.push(scheduleSlot(whoSecond, 60, () => {
                            if (!config.pollEnabled || !world?.isReady || whoBusy)
                                return;
                            whoBusy = true;
                            void world.whoOnce({ zoneIds: [account.zone] }, 8000).then(result => {
                                const at = new Date().toISOString();
                                const observed = result.players.filter(p => p.areaId === account.zone).length;
                                const transition = raidState.get(account.account).observe(observed, at);
                                emit(account, "raid_who", {
                                    zone: account.zone, zoneName: account.zoneName, playersListed: observed,
                                    serverWhoOnline: result.onlineCount, listCapped: result.players.length >= 49,
                                    activity: transition.active, activityStart: transition.startedAt, activityEnd: transition.lastEndedAt, activityChange: transition.change,
                                    observationOnly: true, clearConfirmed: false,
                                });
                            }).catch(e => log.warn(`/who failed: ${describeError(e)}`)).finally(() => { whoBusy = false; });
                        }));
                    },
                    // Every session replies to player whispers, including PvP and Hardcore
                    // information-only characters. There are no in-game command handlers.
                    onWhisper: (sender, _text) => {
                        whisperResponder.answer(sender);
                    },
                    onSystemMessage: line => {
                        if (line)
                            infoWindow.receive(line);
                    },
                    onMonsterYell: (sender, text) => {
                        // Any monster yell proves the listener is in earshot of the world, whatever it says.
                        health.heardYell(Date.now());
                        if (infoOnlyFor(account)) return;
                        const result = pipeline.handleYell(account, sender, text, health);
                        if (result.outcome !== "ignored")
                            return;
                        if (account.role === "bb" && /zandalar|hakkar|heart of hakkar|spirit of zandalar/i.test(text)) {
                            emit(account, "zg_buff_candidate", { sender, text, confirmed: false, source: "npc_yell" });
                        }
                        // Log other NPC yells (needed to validate OctoWoW-specific ZG announcement text).
                        else
                            log.debug(`npc yell from ${sender}: ${text}`);
                    },
                    onClose: () => finish(),
                    onError: e => finish(e),
                    onWarden: () => log.warn("warden packet observed; follow server rules and check compatibility"),
                }
            });
            sessions.add(world);
            world.start();
        });
    }
    finally {
        socket.destroy();
    }
}
async function runSupervisor(account) {
    const log = prefixed(logger, account.account);
    let fails = 0;
    // Small phase shift between initial auth handshakes; no 9-connection login burst.
    await new Promise(r => setTimeout(r, (account.whoSecond % 30) * 500));
    while (!stopping) {
        try {
            await runSession(account);
            fails = 0;
        }
        catch (e) {
            fails++;
            if (e instanceof VersionMismatchError && config.autoResolveBuild) {
                try {
                    currentBuild = await resolveBuild("https://dl.octowow.st/client/latest");
                    log.info(`resolved client build ${currentBuild}`);
                }
                catch (err) {
                    log.warn(`client build lookup failed: ${describeError(err)}`);
                }
            }
            else if (e instanceof FatalError) {
                log.error(`fatal login error; not retrying: ${describeError(e)}`);
                emit(account, "session_error", { fatal: true, reason: describeError(e) });
                return;
            }
            else
                log.warn(`session ended: ${describeError(e)}`);
            emit(account, "session_error", { fatal: false, reason: describeError(e) });
        }
        if (stopping)
            break;
        const backoff = Math.min(60000, 1000 * 2 ** Math.min(fails, 6));
        log.info(`reconnect in ${backoff}ms`);
        await new Promise(r => setTimeout(r, backoff));
    }
}
async function shutdown(signal) {
    if (stopping)
        return;
    stopping = true;
    logger.info(`shutting down (${signal})`);
    for (const session of sessions) {
        session.close();
    }
    await publisher.close();
    process.exit(0);
}
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
logger.info(`OctoMetrics starting ${config.accounts.length} monitoring connections. Push ${config.pushUrl ? "enabled" : "not configured"}.`);
logger.info(`First scheduled .server info slot: ${new Date(nextSlot(Date.now(), 0, 60)).toISOString()}`);
await Promise.all(config.accounts.map(runSupervisor));
//# sourceMappingURL=index.js.map