/* OctoBot World Info MVP. Public observations only: never turn an inferred raid or a failed request into a confirmed event. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const METRICS_URL = 'https://octometrics.eqvoice.workers.dev/api/summary';
  const ERA_URL = 'https://edgeofmadnesscalendar.com/api/era';
  const MINUTE = 60_000;
  const FRESH_METRICS_MS = 5 * MINUTE;
  // Raid /who scans land roughly every 15-25 minutes in the live feed; older readings are shown as stale.
  const FRESH_RAID_MS = 30 * MINUTE;
  // The Bufftracker reports every ~2 minutes; older than this its raids are shown as last known, flagged stale.
  const TRACKER_FRESH_MS = 3 * MINUTE;
  const FRESH_DMF_MS = 6 * 60 * MINUTE;
  const DMF_MOVING_GAP_MS = 3 * MINUTE;
  const DMF_HEARTBEAT_MS = 3 * MINUTE;
  const DAY = 86_400_000;
  // The three-day anchor comes from OctoTimers. OctoWoW synchronised Onyxia across realms on 31 August.
  const RAID_RESETS = [
    { anchor: Date.UTC(2026, 9, 3, 2), days: 3, raids: ['zul-gurub'] },
    { anchor: Date.UTC(2026, 7, 31, 2), days: 5, raids: ['onyxias-lair', 'lower-karazhan-halls'] },
    { anchor: Date.UTC(2026, 9, 7, 2), days: 7, raids: ['molten-core', 'blackwing-lair'] }
  ];
  const resetDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const resetCycles = RAID_RESETS.map(({ anchor, days, raids }) => ({
    anchor, period: days * DAY, next: 0,
    cards: raids.map(raid => ({
      date: $('raid-reset-' + raid + '-date'),
      countdown: $('raid-reset-' + raid + '-countdown')
    }))
  }));
  const BOSSES = [
    { id: 'grilek', name: "Gri'lek" },
    { id: 'hazzarah', name: "Hazza'rah" },
    { id: 'renataki', name: 'Renataki' },
    { id: 'wushoolay', name: 'Wushoolay' }
  ];
  // Reference calendar: Pacific local dates; never assume OctoWoW follows Classic Era.
  const ERA_ANCHOR = Date.UTC(2025, 4, 6);
  const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
  const offsetParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset' });
  const state = {
    raids: { ony: null, bwl: null },
    // The Bufftracker raid sessions per lair (authoritative), when it has reported.
    auth: { ony: null, bwl: null },
    heads: { onyxia: null, nefarian: null },
    buffs: { alliance: null, horde: null },
    dmf: null,
    // What the monitoring itself is doing: the last fetch worked or not, whether the collector is reporting, and each capital's listener.
    apiOk: null,
    monitoring: null,
    listeners: null,
    // The Worker's clock minus this browser's at the last fetch, so elapsed times and "in the future" checks use the server's time.
    clockOffsetMs: 0,
    era: null,
    calendarYear: 0,
    calendarMonth: 0,
    metricsFetchedAt: null
  };

  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
  // The tracker names an unaffiliated group "PUG"; show it in proper case.
  function groupLabel(name) { return String(name).trim().toUpperCase() === 'PUG' ? 'Pug' : name; }
  // Real guilds appear as <Guild Name>; unaffiliated Pugs and unknown rosters are not guilds.
  function raidGroupLabel(name) {
    const label = String(groupLabel(name) ?? '').trim();
    if (!label || /^(pug|unknown)$/i.test(label)) return label;
    const led = /^(.+?)-led PUG$/i.exec(label);
    if (led) return '<' + led[1].trim().replace(/^<|>$/g, '') + '>-led PUG';
    return '<' + label.replace(/^<|>$/g, '') + '>';
  }
  // Build raid labels with text nodes, not HTML, because guild names come from roster data.
  function setRaidTitle(node, label, guild) {
    node.textContent = label;
    if (!guild) return;
    const name = raidGroupLabel(guild);
    node.append(document.createTextNode(' \u2013 '));
    if (name.startsWith('<')) {
      const bold = document.createElement('strong');
      bold.className = 'raid-guild';
      bold.textContent = name;
      node.append(bold);
    } else {
      node.append(document.createTextNode(name));
    }
  }
  function first(...values) { return values.find(v => v !== undefined && v !== null) ?? null; }
  function time(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value <= 0) return null;
      return value < 1e11 ? value * 1000 : value;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function timeOf(row, ...keys) {
    if (!object(row)) return null;
    return time(first(...keys.map(k => row[k])));
  }
  function validPast(value, now = Date.now()) { return Number.isFinite(value) && value > 0 && value <= now + MINUTE; }
  function freshAt(value, windowMs = FRESH_METRICS_MS) {
    return validPast(value) && Date.now() - value <= windowMs;
  }
  // Largest non-zero unit leads unpadded ("1h 05m 03s", "59m 03s", "12s"); later units stay two digits.
  function units(parts) {
    const names = ['d', 'h', 'm', 's'];
    const first = parts.findIndex((v, i) => v > 0 || i === parts.length - 1);
    return parts.slice(first).map((v, i) => (i ? String(v).padStart(2, '0') : String(v)) + names[names.length - parts.length + first + i]).join(' ');
  }
  function span(ms) {
    if (!Number.isFinite(ms)) return 'No data';
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return units([Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]);
  }
  function spanWithDays(ms) {
    if (!Number.isFinite(ms)) return 'No data';
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    return units([Math.floor(seconds / 86400), Math.floor(seconds % 86400 / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]);
  }
  function when(ms) {
    if (!validPast(ms, Date.now() + 365 * DAY)) return 'Unknown';
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)) + ' UTC';
  }
  function labelState(id, label, cls = 'unknown') {
    const node = $(id);
    node.textContent = label;
    node.className = 'state-tag ' + cls;
  }
  function freshRoot(root) {
    return timeOf(root, 'observedAt', 'lastUpdatedAt', 'updatedAt', 'timestamp', 'time');
  }


  // The live OctoMetrics summary lists realms; raids are keyed by watcher site and buffs by "name:faction".
  function realmView(root) {
    if (!object(root) || !Array.isArray(root.realms)) return root;
    const realm = root.realms.find(r => object(r) && /n.?zoth/i.test(String(r.realm || '')));
    if (!realm) return root;
    const raids = {};
    for (const raw of Object.values(object(realm.raids) || {})) {
      if (!object(raw)) continue;
      const zone = String(raw.zone || '');
      const key = /onyxia/i.test(zone) ? 'onyxia' : /blackwing/i.test(zone) ? 'bwl' : null;
      if (!key) continue;
      const at = time(raw.at), start = time(raw.activityStart), end = time(raw.activityEnd);
      const players = Number(raw.players);
      const present = Number.isFinite(players) && players > 0;
      raids[key] = {
        observedAt: at, players: Number.isFinite(players) ? players : null,
        active: raw.active === true || raw.active === false ? raw.active : (Number.isFinite(players) ? present : null),
        // Headcount activity cannot identify a raid or its start (back-to-back raids merge), so it never becomes a numbered session.
        sessions: [],
        // An activityEnd older than the current activityStart belongs to the previous raid; it is not a confirmed clear.
        lastFinishedAt: validPast(end) && (!validPast(start) || end < start || !present) ? end : null,
        clearConfirmed: raw.clearConfirmed === true
      };
    }
    const buffs = {};
    // Candidates: the per-faction last drop (both heads count) and any Rallying Cry entry. Only an announced city yell confirms a drop (the Worker
    // applies the same rule), and the NEWEST candidate wins by its own timestamp, never by position in the response.
    const candidates = [];
    for (const faction of ['alliance', 'horde']) {
      const drop = object(realm.lastDrops) && object(realm.lastDrops[faction]);
      if (drop) candidates.push({ faction, raw: drop });
    }
    for (const [name, raw] of Object.entries(object(realm.buffs) || {})) {
      if (!object(raw) || !/rallying cry/i.test(String(raw.buff || name))) continue;
      const faction = String(raw.faction || name.split(':').pop()).toLowerCase();
      if (faction === 'alliance' || faction === 'horde') candidates.push({ faction, raw });
    }
    for (const { faction, raw } of candidates) {
      if (raw.source !== 'npc_yell' || raw.confirmed === false) continue;
      const at = time(raw.at);
      if (!Number.isFinite(at) || at <= 0) continue;
      const held = buffs[faction];
      if (!held || at > held.atMs) buffs[faction] = { confirmedLastDropAt: raw.at, atMs: at, ...(raw.head ? { lastHead: raw.head } : {}) };
    }
    return { raids, buffs, heads: object(realm.heads) || null, listeners: object(realm.listeners) || null, monitoring: object(realm.monitoring) || null, darkmoon: object(realm.darkmoon) || null, observedAt: root.generated_at };
  }

  function findRaid(root, key) {
    const world = object(root.worldInfo) || object(root.world_info) || root;
    const raids = first(world.raids, root.raids) || {};
    if (Array.isArray(raids)) return raids.find(r => key === 'ony' ? /onyxia|2159/i.test(String(r.zoneName || r.zone || '')) : /blackwing|2677/i.test(String(r.zoneName || r.zone || ''))) || null;
    const direct = key === 'ony'
      ? first(raids.onyxia, raids.ony, raids.onxyia, raids.sw, world.onyxia)
      : first(raids.bwl, raids.blackwingLair, raids.blackwing_lair, raids.org, world.bwl);
    if (object(direct)) return direct;
    if (object(root.raid_activity)) {
      const r = root.raid_activity;
      return key === 'ony' ? first(r.onyxia, r.ony) : first(r.bwl, r.blackwingLair);
    }
    return null;
  }
  // Who is in the raid: a guild when at least half of the players belong to it, otherwise PUG. Needs per-guild counts from the tracker
  // (raid.guilds as [{name, count}] or {name: count}); without them nothing is shown, because the guild is never guessed.
  function guildLabel(raw, players) {
    const list = raw && first(raw.guilds, raw.guildCounts, raw.guild_counts);
    if (!list || typeof list !== 'object') return null;
    const entries = (Array.isArray(list) ? list.map(entry => [first(entry.name, entry.guild, ''), Number(first(entry.count, entry.players, entry.members))]) : Object.entries(list).map(([name, count]) => [name, Number(count)]))
      .filter(([, count]) => Number.isFinite(count) && count > 0);
    const listed = entries.reduce((sum, [, count]) => sum + count, 0);
    const total = Number.isFinite(players) && players > 0 ? players : listed;
    if (!entries.length || !total) return null;
    const top = entries.filter(([name]) => String(name).trim()).sort((a, b) => b[1] - a[1])[0];
    return top && top[1] * 2 >= total ? { name: String(top[0]).trim(), pug: false } : { name: 'Pug', pug: true };
  }
  function raidSession(row) {
    if (!object(row)) return null;
    const startedAt = timeOf(row, 'startedAt', 'startAt', 'formedAt', 'start_time', 'started_at');
    const stateText = String(first(row.status, row.state, '')).toLowerCase();
    if (['ended', 'finished', 'cleared', 'cancelled'].includes(stateText) || row.active === false) return null;
    if (!validPast(startedAt)) return null;
    const rawId = Number(first(row.id, row.number, row.raidNumber));
    return { id: Number.isInteger(rawId) && rawId > 0 ? rawId : null, startedAt, confidence: String(first(row.confidence, 'inferred')).toLowerCase(), guild: object(row.guild) && row.guild.name ? row.guild : guildLabel(row, Number(first(row.players, row.playerCount))) };
  }
  function normaliseRaid(raw, root) {
    if (!object(raw)) return null;
    const stamp = first(timeOf(raw, 'observedAt', 'lastSeenAt', 'timestamp', 'updatedAt', 'time'), freshRoot(root));
    const sessions = (Array.isArray(raw.sessions) ? raw.sessions : Array.isArray(raw.activeRaids) ? raw.activeRaids : [])
      .map(raidSession).filter(Boolean);
    const lastFinishedAt = timeOf(raw, 'lastFinishedAt', 'lastClearAt', 'lastEndedAt', 'last_finished_at', 'finishedAt');
    const players = Number(first(raw.players, raw.playersListed, raw.online));
    const active = typeof raw.active === 'boolean' ? raw.active : null;
    const explicitCount = first(raw.activeRaidCount, raw.raidCount, raw.active_count);
    const count = sessions.length ? sessions.length : (explicitCount !== null && Number.isInteger(Number(explicitCount)) && Number(explicitCount) >= 0 ? Number(explicitCount) : null);
    return { stamp, sessions, lastFinishedAt, players: Number.isFinite(players) && players >= 0 ? players : null, active, count };
  }
  // The Bufftracker lifecycle for one lair, as the Worker publishes it (heads.<head>.authoritative). Rendered, never re-derived.
  function authView(head) {
    const a = head && object(head.authoritative);
    if (!a) return null;
    const sessions = (Array.isArray(a.sessions) ? a.sessions : []).map(row => {
      if (!object(row)) return null;
      const startedAt = time(row.startedAt), id = Number(row.id);
      if (!validPast(startedAt, serverNow())) return null;
      return {
        id: Number.isInteger(id) && id > 0 ? id : null, key: String(row.key || ''), startedAt,
        confidence: String(row.confidence || 'tentative'), status: String(row.status || 'in_progress'),
        guild: object(row.guild) ? row.guild : null, players: Number(row.players), resumed: row.resumed === true,
        estimate: object(row.estimate) || null
      };
    }).filter(Boolean);
    const last = object(a.lastFinished);
    return {
      observedAt: time(a.observedAt), stale: a.stale === true, expired: a.expired === true, sessions,
      lair: object(a.lair) || {},
      lastFinished: last && validPast(time(last.at), serverNow()) ? { at: time(last.at), id: Number.isInteger(Number(last.id)) && Number(last.id) > 0 ? Number(last.id) : null, key: typeof last.key === 'string' ? last.key : null, killConfirmed: last.killConfirmed === true, endReason: String(last.endReason || '') } : null
    };
  }
  function renderAuthRaid(key, auth) {
    const count = $(key + '-count'), activeNode = $(key + '-active'), evidence = $(key + '-evidence'), finished = $(key + '-finished');
    // Raid start times are the tracker's (server) clock, so elapsed time is measured on the server clock too: a browser clock that is a few minutes off
    // must not shift one raid's timer relative to the in-game report.
    const now = serverNow();
    const age = validPast(auth.observedAt, now) ? now - auth.observedAt : Infinity;
    const stale = auth.expired || auth.stale || age > TRACKER_FRESH_MS || !state.metricsFetchedAt || Date.now() - state.metricsFetchedAt > TRACKER_FRESH_MS * 2;
    const sessions = auth.expired ? [] : auth.sessions;
    const n = sessions.length, ambiguity = object(auth.lair.ambiguity);
    activeNode.replaceChildren();
    $(key + '-count-label').textContent = (n >= 2 ? 'Raids in progress' : 'Raid in progress') + ':';
    // With activity hidden by ambiguity the number is a lower bound ("2+"), never an exact count.
    count.textContent = n === 0 ? (stale ? 'No data' : 'No raid') : String(n) + (ambiguity ? '+' : '');
    count.classList.toggle('no-data', stale && n === 0);
    const allHigh = sessions.every(session => ['high', 'confirmed'].includes(session.confidence));
    if (stale) labelState(key + '-state', 'Stale');
    else if (n === 0) labelState(key + '-state', 'No raid', 'unknown');
    else if (allHigh && !ambiguity) labelState(key + '-state', 'Tracked', 'online');
    else labelState(key + '-state', 'Estimated', 'estimated');
    if (n === 0) appendEmpty(activeNode, stale ? 'Tracker is not reporting; the current raid state is unknown.' : 'No raid currently detected.');
    for (const session of sessions) {
      const line = document.createElement('div');
      line.className = 'timer-row';
      const title = document.createElement('span');
      const guild = session.guild && session.guild.label ? session.guild.label : null;
      setRaidTitle(title, session.id !== null ? 'Raid #' + session.id : 'Raid in progress', guild);
      title.title = session.confidence === 'tentative'
        ? 'Separated from another raid by arrival timing only. /who has no instance IDs, so this grouping is an estimate.'
        : guild === 'Unknown' ? 'Not enough roster information to name a guild or PUG.' : 'Grouped from the roster by the Bufftracker; not verified instance membership.';
      const timer = document.createElement('strong');
      timer.className = 'mono';
      // One stable start time per raid: elapsed is always now minus the tracker formation time.
      timer.textContent = span(now - session.startedAt);
      line.append(title, timer);
      const notes = [];
      if (Number.isFinite(session.players)) notes.push(session.players + (auth.lair.complete === true ? '' : '+') + ' players attributed to this raid');
      notes.push(session.confidence === 'tentative' ? 'Estimated group' : session.confidence === 'confirmed' ? 'Confirmed' : 'Tracked');
      if (session.status === 'leaving') notes.push('Roster leaving');
      if (stale) notes.push('Last known');
      if (session.resumed) notes.push('Resumed after a wipe');
      if (n >= 2 && !stale && session.estimate && session.estimate.status === 'estimated' && Number.isFinite(time(session.estimate.estimatedAt))) notes.push('Est. clear in ' + span(time(session.estimate.estimatedAt) - now));
      if (notes.length) {
        const small = document.createElement('small');
        small.textContent = notes.join(' \u00b7 ');
        line.append(small);
      }
      activeNode.append(line);
    }
    if (auth.lastFinished) {
      finished.textContent = span(now - auth.lastFinished.at) + ' ago';
      finished.title = (auth.lastFinished.id !== null ? 'Raid #' + auth.lastFinished.id + ' \u00b7 ' : '') + (auth.lastFinished.killConfirmed ? 'Boss kill confirmed by Chronicle.' : auth.lastFinished.endReason === 'disbanded' ? 'Group disbanded early; no kill.' : 'Roster left the zone; a boss kill is not confirmed.');
    } else {
      finished.textContent = 'No data';
      finished.title = '';
    }
    const present = Number(auth.lair.present);
    const roster = Number.isFinite(present) ? present + (auth.lair.complete === true ? '' : '+') + (present === 1 && auth.lair.complete === true ? ' player' : ' players') + ' detected in the lair. ' : '';
    if (stale) evidence.textContent = (roster ? 'Last known: ' + roster : '') + 'Tracker data is ' + (Number.isFinite(age) ? span(age) : 'unknown time') + ' old \u2013 showing the last known raids; they may have changed.';
    else evidence.textContent = roster + 'Raids come from Bufftracker roster tracking; /who has no instance IDs, so groups are inferred.' + (ambiguity ? ' ' + ambiguity.players + ' more players could not be separated into a raid.' : '');
  }
  function playerCount(n) { return n + (n === 1 ? ' player' : ' players'); }
  function renderRaid(key) {
    const authRaid = state.auth[key];
    if (authRaid) { renderAuthRaid(key, authRaid); return; }
    const raid = state.raids[key];
    const count = $(key + '-count');
    const activeNode = $(key + '-active');
    const evidence = $(key + '-evidence');
    const finished = $(key + '-finished');
    activeNode.replaceChildren();
    // "Raid in progress" for none or one, "Raids in progress" for two or more.
    const raidTotal = raid ? (raid.sessions.length || raid.count || 0) : 0;
    const raidLabel = (raidTotal >= 2 ? 'Raids in progress' : 'Raid in progress') + ':';
    $(key + '-count-label').textContent = raidLabel;
    finished.textContent = raid && validPast(raid.lastFinishedAt)
      ? span(Date.now() - raid.lastFinishedAt) + ' ago' : 'No data';
    finished.title = raid && validPast(raid.lastFinishedAt) && raid.clearConfirmed !== true ? 'Roster left the zone; a boss clear is not confirmed.' : '';
    count.classList.toggle('no-data', !raid || !freshAt(raid.stamp, FRESH_RAID_MS));
    if (!raid || !freshAt(raid.stamp, FRESH_RAID_MS)) {
      count.textContent = 'No data';
      labelState(key + '-state', raid ? 'Stale' : 'Awaiting data');
      evidence.textContent = raid ? 'Last /who reading is too old for a live raid status.' : '';
      appendEmpty(activeNode, 'No current verified raid sessions.');
      return;
    }
    if (raid.sessions.length) {
      count.textContent = String(raid.sessions.length);
      const confirmed = raid.sessions.every(session => ['confirmed', 'verified'].includes(session.confidence));
      labelState(key + '-state', confirmed ? 'Verified' : 'Estimated', confirmed ? 'online' : 'estimated');
      for (const session of raid.sessions) {
        const line = document.createElement('div');
        line.className = 'timer-row';
        const title = document.createElement('span');
        setRaidTitle(title, session.id !== null ? 'Raid #' + session.id : 'Raid in progress', session.guild?.name);
        const timer = document.createElement('strong');
        timer.className = 'mono';
        timer.textContent = span(Date.now() - session.startedAt);
        line.append(title, timer);
        activeNode.append(line);
      }
      evidence.textContent = 'Separate groups ' + (raid.sessions.every(session => ['confirmed', 'verified'].includes(session.confidence)) ? 'verified' : 'inferred') + ' from rosters · ' + (raid.players === null ? 'Roster observed' : playerCount(raid.players) + ' observed in /who') + '. /who alone cannot prove instance IDs.';
    } else if (raid.count !== null) {
      count.textContent = raid.count === 0 ? 'No raid' : String(raid.count);
      labelState(key + '-state', raid.count ? 'Estimated' : 'No raid', raid.count ? 'estimated' : 'unknown');
      appendEmpty(activeNode, raid.count ? 'Start timestamps not yet available.' : 'No raid currently detected.');
      evidence.textContent = raid.players !== null ? playerCount(raid.players) + ' listed in the latest /who response.' : 'Latest roster observation received.';
    } else if (raid.active === true) {
      count.textContent = '1+';
      labelState(key + '-state', 'Estimated', 'estimated');
      appendEmpty(activeNode, 'Raid activity detected; separate groups and start time not verified.');
      evidence.textContent = (raid.players === null ? 'Raid activity signal received.' : playerCount(raid.players) + ' in the observed zone.') + ' Multiple raids cannot be counted from the current collector.';
    } else if (raid.active === false) {
      count.textContent = 'No raid';
      labelState(key + '-state', 'No raid', 'unknown');
      appendEmpty(activeNode, 'No raid detected in the latest scan.');
      evidence.textContent = (raid.players === null ? '' : playerCount(raid.players) + ' listed. ') + 'No confirmed completed raid can be inferred from an empty zone.';
    } else {
      count.textContent = 'No data';
      labelState(key + '-state', 'Unverified');
      appendEmpty(activeNode, 'Insufficient raid lifecycle information.');
      evidence.textContent = raid.players === null ? 'No usable observations available.' : playerCount(raid.players) + ' listed; the raid state is unknown.';
    }
  }
  function appendEmpty(node, message) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = message;
    node.append(p);
  }

  function headName(head) { return head === 'bwl' || head === 'nefarian' ? 'Nefarian' : head === 'onyxia' ? 'Onyxia' : String(head); }
  function findBuff(root, faction) {
    const world = object(root.worldInfo) || object(root.world_info) || root;
    const buffs = object(world.buffs) || object(world.worldBuffs) || object(root.buffs) || {};
    const factionData = object(buffs[faction]) || object(buffs[faction === 'alliance' ? 'sw' : 'org']) || null;
    if (!factionData) return null;
    const last = timeOf(factionData, 'confirmedLastDropAt', 'lastDropAt', 'last_drop_at');
    const estimate = timeOf(factionData, 'estimatedNextDropAt', 'predictedDropAt', 'nextDropEstimateAt', 'estimated_next_drop_at');
    const lastDrop = object(factionData.lastDrop);
    return {
      last: first(last, timeOf(lastDrop, 'appliedAt', 'confirmedAt', 'timestamp')),
      estimate,
      head: first(factionData.lastHead, lastDrop && lastDrop.head)
    };
  }
  // The Worker's time, so a small difference between this browser's clock and the server's never hides or invents a drop.
  function serverNow() { return Date.now() + (Number.isFinite(state.clockOffsetMs) ? state.clockOffsetMs : 0); }
  // Why the live feed cannot be trusted right now, or null. A last known drop is still shown, but labelled as last known.
  function monitoringConcern(faction) {
    if (state.apiOk === false) return { stale: true, note: 'OctoMetrics is unavailable \u2013 showing the last known drop, not live monitoring.' };
    const m = object(state.monitoring);
    if (m && m.collectorFresh === false) return { stale: true, note: 'The collector has stopped reporting \u2013 showing the last known drop; a newer one may be missing.' };
    const l = object(state.listeners) && object(state.listeners[faction === 'alliance' ? 'sw' : 'org']);
    const city = faction === 'alliance' ? 'Stormwind' : 'Orgrimmar';
    if (l && l.status === 'offline') return { stale: true, note: 'The ' + city + ' listener is offline \u2013 a newer drop may be missing.' };
    if (l && l.status === 'silent') return { stale: false, note: 'The ' + city + ' listener has heard nothing for a long time (possibly out of range) \u2013 a newer drop may be missing.' };
    if (l && l.status === 'degraded') return { stale: false, note: 'Drops from ' + city + ' are not being delivered reliably right now \u2013 a newer drop may be missing.' };
    return null;
  }
  function renderBuff(faction) {
    const buff = state.buffs[faction];
    const last = $(faction + '-last');
    const lastNote = $(faction + '-last-note');
    const now = serverNow();
    const known = buff && validPast(buff.last, now);
    const concern = monitoringConcern(faction);
    if (known) {
      last.textContent = span(now - buff.last) + ' ago';
      lastNote.textContent = (concern && concern.stale ? 'Last known: ' : 'Recorded ') + when(buff.last) + (buff.head ? ' \u00b7 ' + headName(buff.head) + ' head' : '') + (concern ? ' \u00b7 ' + concern.note : '');
    } else {
      last.textContent = 'No data';
      lastNote.textContent = buff && Number.isFinite(buff.last) ? 'The recorded drop time is not valid.' : concern ? concern.note : '';
    }
    if (known && concern && concern.stale) labelState(faction + '-state', 'Last known', 'estimated');
    else labelState(faction + '-state', known ? 'Drop recorded' : 'Awaiting data', known ? 'online' : 'unknown');
  }


  // ---- Onyxia / Nefarian: estimated clears and confirmed drops, separately per head.
  const MIN_SAMPLES_FALLBACK = 5;
  function dropLine(label, drop) {
    const at = drop && drop.confirmed === true ? time(drop.at) : null;
    return label + ' · ' + (validPast(at) ? span(Date.now() - at) + ' ago' : 'No data');
  }
  // Low confidence is red, medium yellow, high green.
  function colourConfidence(note, level) {
    const text = note.textContent, word = level + ' confidence', at = text.indexOf(word);
    if (at < 0 || !['low', 'medium', 'high'].includes(level) || typeof note.replaceChildren !== 'function') return;
    const mark = document.createElement('span');
    mark.className = 'conf conf-' + level;
    mark.textContent = word;
    note.replaceChildren(document.createTextNode(text.slice(0, at)), mark, document.createTextNode(text.slice(at + word.length)));
  }
  function renderHead(prefix, headKey) {
    const head = state.heads[headKey];
    const stale = !state.metricsFetchedAt || Date.now() - state.metricsFetchedAt > FRESH_RAID_MS;
    $(prefix + '-drop-alliance').textContent = dropLine('Alliance', head && head.drops && head.drops.alliance);
    $(prefix + '-drop-horde').textContent = dropLine('Horde', head && head.drops && head.drops.horde);
    const out = $(prefix + '-clear'), note = $(prefix + '-clear-note'), tag = $(prefix + '-clear-tag');
    const clear = head && head.clear;
    tag.hidden = true;
    // With no raid there is nothing to estimate: N/A in red.
    const idle = $(prefix + '-count').textContent === 'No raid' || (clear && clear.status === 'idle');
    out.classList.toggle('na', Boolean(idle));
    out.classList.remove('dots');
    if (idle) { out.textContent = 'N/A'; note.textContent = ''; return; }
    if (!clear || stale) {
      out.textContent = 'No data';
      note.textContent = stale && clear ? 'The latest estimate is too old to show.' : '';
      return;
    }
    if (clear.status === 'stale') { out.textContent = 'Stale'; note.textContent = 'Bufftracker data is out of date; no estimate is shown and no clear is assumed.'; return; }
    if (clear.status === 'leaving') { out.textContent = 'Leaving'; out.classList.add('dots'); note.textContent = 'The roster is leaving the lair; a boss kill is not confirmed.'; return; }
    const need = Number.isInteger(clear.minSamples) ? clear.minSamples : MIN_SAMPLES_FALLBACK;
    if (clear.status === 'learning') {
      out.textContent = 'Learning'; out.classList.add('dots');
      note.textContent = 'Needs ' + need + ' past raids to estimate · ' + (clear.samples || 0) + ' observed so far.';
      return;
    }
    const estimatedAt = time(clear.estimatedAt), latestAt = time(clear.latestAt), earliestAt = time(clear.earliestAt);
    if (!Number.isFinite(estimatedAt)) { out.textContent = 'No data'; note.textContent = ''; return; }
    const now = Date.now();
    const range = Number.isFinite(earliestAt) && Number.isFinite(latestAt) ? ' · likely between ' + hhmm(earliestAt) + ' and ' + hhmm(latestAt) + ' UTC' : '';
    const basis = (clear.confidence || 'low') + ' confidence from ' + (clear.samples || 0) + ' past raids' + range + (clear.source === 'legacy_headcount' ? ' \u00b7 headcount-based, unverified' : '') + '.';
    tag.hidden = true;
    const level = clear.confidence || 'low';
    if (now <= estimatedAt) { out.textContent = span(estimatedAt - now); note.textContent = 'Estimated clear · ' + basis; }
    else if (!Number.isFinite(latestAt) || now <= latestAt) { out.textContent = 'Soon'; { const tm = document.createElement('sup'); tm.className = 'tm'; tm.textContent = '™'; if (out.append) out.append(tm); } note.textContent = 'Past the typical clear time, still unconfirmed · ' + basis; }
    else { out.textContent = 'Overdue'; out.classList.add('dots'); note.textContent = 'Running longer than past raids; no clear has been confirmed · ' + basis; }
    colourConfidence(note, level);
  }
  function hhmm(ms) { return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)); }

  // Only verified on-site sightings from the N'Zoth DMF collectors can identify a location.
  // An online collector with no sighting does not establish that the Faire is absent.
  function findDmf(root) {
    const dmf = object(root.darkmoon);
    if (!dmf) return null;
    const found = object(dmf.latestConfirmed);
    const observedAt = found ? time(found.at) : null;
    const location = found && (found.site === 'elwynn' || found.site === 'mulgore') ? found.site : '';
    const sites = object(dmf.sites) || {};
    return { location, observedAt, npc: found && typeof found.npc === 'string' ? found.npc : '',
      sites, confirmed: found && found.fresh === true };
  }
  // A relocation is inferred, not a directly verified event. Require a known previous
  // location and fresh post-sighting heartbeats from BOTH independent observers.
  function dmfMoving(dmf, now, apiOk) {
    if (!apiOk || !dmf || !validPast(dmf.observedAt, now) || now - dmf.observedAt < DMF_MOVING_GAP_MS) return false;
    return ['elwynn', 'mulgore'].every(key => {
      const site = object(dmf.sites && dmf.sites[key]);
      const heartbeat = site && time(site.lastHeartbeatAt);
      return Boolean(site && site.collectorStatus === 'online' && validPast(heartbeat, now) &&
        heartbeat > dmf.observedAt && now - heartbeat <= DMF_HEARTBEAT_MS &&
        heartbeat - dmf.observedAt >= 2 * MINUTE);
    });
  }
  function renderDmf() {
    const dmf = state.dmf, latest = dmf && dmf.observedAt;
    const moving = dmfMoving(dmf, Date.now(), state.apiOk);
    const fresh = !moving && dmf && dmf.confirmed && validPast(latest) && freshAt(latest, FRESH_DMF_MS);
    const sw = Boolean(fresh && dmf.location === 'elwynn');
    const tb = Boolean(fresh && dmf.location === 'mulgore');
    $('dmf-heading').textContent = sw ? 'Elwynn Forest · Goldshire' : tb ? 'Mulgore · Thunder Bluff' : moving ? 'Moving' : 'Location unconfirmed';
    const icon = $('dmf-icon');
    icon.hidden = !(sw || tb);
    if (sw || tb) icon.src = sw ? '../img/alliance-crest.png' : '../img/horde-crest.png';
    const description = $('dmf-description');
    description.hidden = Boolean(sw || tb);
    description.textContent = moving ? 'Both observers are online; no Faire NPC has been seen recently. Relocation inferred, not confirmed.' : 'Awaiting a confirmed on-site Darkmoon Faire NPC sighting.';
    const sites = dmf && dmf.sites || {};
    const status = key => {
      const site = object(sites[key]), value = String(site && site.collectorStatus || 'unknown');
      return value === 'online' ? 'online' : value === 'offline' ? 'offline' : value === 'stale' ? 'stale' : 'no data';
    };
    const observers = 'Elwynn observer: ' + status('elwynn') + ' · Mulgore observer: ' + status('mulgore');
    $('dmf-observed').textContent = sw || tb
      ? 'Confirmed ' + span(Date.now() - latest) + ' ago · ' + dmf.npc + ' · ' + observers
      : moving
        ? 'Last confirmed ' + when(latest) + ' · ' + observers
        : validPast(latest)
        ? 'Last confirmed ' + when(latest) + ' (now stale) · ' + observers
        : 'No confirmed Faire sighting yet · ' + observers;
    const panel = $('dmf-panel');
    panel.classList.toggle('faction-alliance', sw);
    panel.classList.toggle('faction-horde', tb);
    panel.classList.toggle('faction-moving', moving);
    labelState('dmf-state', sw || tb ? 'Confirmed' : moving ? 'Moving' : 'Unconfirmed', sw || tb ? 'online' : moving ? 'estimated' : 'unknown');
  }

  async function loadMetrics() {
    try {
      const response = await fetch(METRICS_URL, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const root = realmView(await response.json());
      if (!object(root)) throw new Error('Invalid summary');
      state.raids.ony = normaliseRaid(findRaid(root, 'ony'), root);
      state.raids.bwl = normaliseRaid(findRaid(root, 'bwl'), root);
      const heads = object(root.heads) || {};
      const generated = time(root.observedAt);
      state.clockOffsetMs = Number.isFinite(generated) && Math.abs(generated - Date.now()) < 6 * 3_600_000 ? generated - Date.now() : 0;
      state.auth.ony = authView(object(heads.onyxia)) || state.auth.ony;
      state.auth.bwl = authView(object(heads.nefarian)) || state.auth.bwl;
      state.heads.onyxia = object(heads.onyxia);
      state.heads.nefarian = object(heads.nefarian);
      // A response must never replace a newer drop with an older one (a stale edge copy, a late response), so the newer timestamp wins.
      for (const faction of ['alliance', 'horde']) {
        const next = findBuff(root, faction), held = state.buffs[faction];
        state.buffs[faction] = held && Number.isFinite(held.last) && (!next || !Number.isFinite(next.last) || held.last > next.last) ? held : next;
      }
      state.monitoring = object(root.monitoring);
      state.listeners = object(root.listeners);

      state.apiOk = true;
      state.dmf = findDmf(root);
      state.metricsFetchedAt = Date.now();
      watchSounds(true);
      const source = $('source-status');
      source.textContent = (state.auth.ony || state.auth.bwl) ? 'OctoMetrics API connected \u00b7 Raid sessions from the Bufftracker' : 'OctoMetrics API connected \u00b7 Aggregate raid activity only; raid sessions unavailable';
      source.className = 'source-label fresh';
    } catch (error) {
      state.apiOk = false;
      const source = $('source-status');
      source.textContent = 'OctoMetrics API unavailable · Previously received data may be stale';
      source.className = 'source-label stale';
      // Retain the last successful response, subject to its original observation timestamps.
    }
    renderLive();
  }
  // ---- Sound alerts: edges only (something new since the last look), never on first load. Nothing plays unless the visitor turned alerts on.
  const sound = { baselined: false, finished: {}, finishedKeys: {}, drop: {}, soon: {} };
  const sounds = () => (typeof window !== 'undefined' && window.RaidSounds) || null;
  function watchSounds(fromData) {
    const player = sounds();
    if (!player) return;
    const keys = [['ony', 'onyxia'], ['bwl', 'nefarian']];
    player.setAvailability('soon', keys.some(([, headKey]) => { const c = state.heads[headKey] && state.heads[headKey].clear; return Boolean(c && ['medium', 'high'].includes(String(c.confidence))); }));
    for (const [raidKey, headKey] of keys) {
      const raid = state.raids[raidKey], head = state.heads[headKey], clear = head && head.clear;
      if (fromData) {
        const authFinished = state.auth[raidKey] && state.auth[raidKey].lastFinished ? state.auth[raidKey].lastFinished.at : null;
        const finishedAt = state.auth[raidKey] ? (validPast(authFinished, serverNow()) ? authFinished : null) : raid && validPast(raid.lastFinishedAt) ? raid.lastFinishedAt : null;
        const finished = state.auth[raidKey] && state.auth[raidKey].lastFinished;
        const identity = finished && (finished.key || (finished.id ? 'raid:' + finished.id : null));
        const seen = sound.finishedKeys[raidKey] || (sound.finishedKeys[raidKey] = new Set());
        if (finishedAt) {
          if (sound.baselined && finishedAt > (sound.finished[raidKey] || 0) && (!identity || !seen.has(identity))) player.notify('finished');
          if (identity) { seen.add(identity); if (seen.size > 200) seen.delete(seen.values().next().value); }
          sound.finished[raidKey] = Math.max(finishedAt, sound.finished[raidKey] || 0);
        }
      }
      // The ending-soon alert waits for a medium or high confidence estimate; a low-confidence estimate stays silent.
      const trusted = Boolean(clear && ['medium', 'high'].includes(String(clear.confidence)));
      const estimatedAt = clear && clear.status === 'estimated' && trusted ? time(clear.estimatedAt) : null;
      if (!Number.isFinite(estimatedAt)) { sound.soon[raidKey] = null; continue; }
      const lead = 5 * MINUTE;   // fixed: the alert fires when about five minutes remain
      if (estimatedAt - Date.now() <= lead && sound.soon[raidKey] !== estimatedAt) {
        // An estimate that is already close when the page opens is recorded, not announced.
        if (sound.baselined) player.notify('soon');
        sound.soon[raidKey] = estimatedAt;
      }
    }
    if (fromData) {
      for (const faction of ['alliance', 'horde']) {
        const buff = state.buffs[faction], at = buff && validPast(buff.last) ? buff.last : null;
        if (sound.baselined && at && at > (sound.drop[faction] || 0)) player.notify(faction + 'Drop');
        if (at) sound.drop[faction] = at;
      }
      sound.baselined = true;
    }
  }
  function renderRaidResets(now = Date.now()) {
    for (const cycle of resetCycles) {
      const { anchor, period, cards } = cycle;
      if (now >= cycle.next || now < cycle.next - period) {
        cycle.next = anchor + (Math.floor((now - anchor) / period) + 1) * period;
        const timestamp = new Date(cycle.next).toISOString();
        const label = resetDate.format(cycle.next) + ' UTC';
        for (const { date } of cards) {
          date.dateTime = timestamp;
          date.textContent = label;
        }
      }
      const remaining = spanWithDays(Math.ceil((cycle.next - now) / 1000) * 1000);
      for (const { countdown } of cards) countdown.textContent = remaining;
    }
  }
  function renderLive() {
    renderRaid('ony');
    renderRaid('bwl');
    // "No raid" already says it, so the "Raid in progress" label only shows beside a count.
    for (const key of ['ony', 'bwl']) $(key + '-count-label').hidden = !/^\d/.test($(key + '-count').textContent || '');
    renderHead('ony', 'onyxia');
    renderHead('bwl', 'nefarian');
    renderBuff('alliance');
    renderBuff('horde');
    renderDmf();
    renderRaidResets();
    renderMadnessCountdown();
    watchSounds(false);
  }

  function pacificDate(ms) {
    const entries = Object.fromEntries(dateParts.formatToParts(new Date(ms)).map(part => [part.type, part.value]));
    return { year: Number(entries.year), month: Number(entries.month), day: Number(entries.day) };
  }
  function localSerial(year, month, day) { return Date.UTC(year, month - 1, day); }
  function bossOn(year, month, day) {
    const elapsedDays = Math.floor((localSerial(year, month, day) - ERA_ANCHOR) / DAY);
    const period = Math.floor(elapsedDays / 14);
    return BOSSES[((period % BOSSES.length) + BOSSES.length) % BOSSES.length];
  }
  function pacificMidnightUtc(year, month, day) {
    const noonUtc = Date.UTC(year, month - 1, day, 12);
    const label = offsetParts.formatToParts(new Date(noonUtc)).find(p => p.type === 'timeZoneName')?.value || '';
    const parts = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(label);
    if (!parts) return null;
    const sign = parts[1] === '+' ? 1 : -1;
    const offset = sign * (Number(parts[2]) * 60 + Number(parts[3] || 0));
    return localSerial(year, month, day) - offset * MINUTE;
  }
  function computedRotation() {
    const today = pacificDate(Date.now());
    const serial = localSerial(today.year, today.month, today.day);
    const days = Math.floor((serial - ERA_ANCHOR) / DAY);
    const period = Math.floor(days / 14);
    const nextSerial = ERA_ANCHOR + (period + 1) * 14 * DAY;
    const date = new Date(nextSerial);
    const end = pacificMidnightUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const index = ((period % BOSSES.length) + BOSSES.length) % BOSSES.length;
    return { current: BOSSES[index].name, next: BOSSES[(index + 1) % BOSSES.length].name, end };
  }
  function currentRotation() {
    const computed = computedRotation();
    const api = state.era && object(state.era.rotation) ? state.era.rotation : null;
    const cur = api && object(api.current);
    const next = api && object(api.next);
    const start = cur ? time(cur.start) : null, end = cur ? time(cur.end) : null;
    if (api && cur && next && validPast(start) && end && end > Date.now() && end < Date.now() + 16 * DAY) {
      return { current: String(cur.bossName || computed.current), next: String(next.bossName || computed.next), end, api: true };
    }
    return { ...computed, api: false };
  }
  function renderMadnessCountdown() {
    const rotation = currentRotation();
    $('eom-current').textContent = rotation.current;
    $('eom-next').textContent = rotation.next;
    // Colour each boss name to match its calendar colour.
    for (const [id, name] of [['eom-current', rotation.current], ['eom-next', rotation.next]]) {
      const boss = BOSSES.find(entry => entry.name === name);
      if (boss) $(id).dataset.boss = boss.id; else delete $(id).dataset.boss;
    }
    $('eom-current-until').textContent = 'Until ' + (rotation.end ? when(rotation.end) : 'unknown');
    $('eom-next-at').textContent = rotation.end ? 'From ' + when(rotation.end) : 'Start unknown';
    const countdown = $('eom-countdown');
    const timeLeft = rotation.end ? rotation.end - Date.now() : null;
    countdown.textContent = timeLeft === null ? 'No data' : spanWithDays(timeLeft);
    // 7 days or more: green; 1-7 days: yellow; less than a day: red.
    // Recompute on the existing one-second timer so colours switch at the actual boundary.
    countdown.classList.remove('rotation-safe', 'rotation-week', 'rotation-soon');
    if (Number.isFinite(timeLeft) && timeLeft > 0) {
      countdown.classList.add(timeLeft >= 7 * DAY ? 'rotation-safe' : timeLeft >= DAY ? 'rotation-week' : 'rotation-soon');
    }
    labelState('eom-source', rotation.api ? 'Era API' : 'Era reference', rotation.api ? 'estimated' : 'unknown');
  }
  async function loadEra() {
    try {
      const response = await fetch(ERA_URL, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const doc = await response.json();
      if (!object(doc) || !object(doc.rotation) || !object(doc.rotation.current)) throw new Error('Invalid rotation');
      state.era = doc;
    } catch {
      state.era = null; // Offline fallback: compute from the published Classic Era Pacific anchor.
    }
    renderMadnessCountdown();
    renderCalendar();
  }
  function weekdayLabel(label) {
    const n = document.createElement('div');
    n.className = 'weekday';
    n.textContent = label;
    return n;
  }
  function renderCalendar() {
    const y = state.calendarYear, m = state.calendarMonth;
    $('calendar-month').textContent = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
    const container = $('madness-calendar');
    container.replaceChildren();
    for (const label of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) container.append(weekdayLabel(label));
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const startPadding = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < startPadding; i++) {
      const blank = document.createElement('div');
      blank.className = 'day other-month';
      blank.setAttribute('aria-hidden', 'true');
      container.append(blank);
    }
    const today = pacificDate(Date.now());
    for (let d = 1; d <= daysInMonth; d++) {
      const boss = bossOn(y, m, d);
      const prev = bossOn(y, m, d - 1);
      const isChange = boss.id !== prev.id;
      const day = document.createElement('div');
      day.className = 'day' + (isChange ? ' is-change' : '') + (today.year === y && today.month === m && today.day === d ? ' is-today' : '');
      day.dataset.boss = boss.id;
      day.setAttribute('aria-label', d + ' ' + $('calendar-month').textContent + ': ' + boss.name + (isChange ? ' begins' : ''));
      day.title = boss.name + (isChange ? ' · rotation begins' : '');
      const number = document.createElement('span');
      number.className = 'day-number';
      number.textContent = String(d);
      day.append(number);
      if (isChange) {
        const name = document.createElement('span');
        name.className = 'day-boss';
        name.textContent = boss.name;
        day.append(name);
      }
      container.append(day);
    }
    const key = $('rotation-key');
    key.replaceChildren();
    for (const boss of BOSSES) {
      const spanNode = document.createElement('span');
      const dot = document.createElement('i');
      dot.className = boss.id;
      dot.setAttribute('aria-hidden', 'true');
      spanNode.append(dot, document.createTextNode(boss.name));
      key.append(spanNode);
    }
  }
  function changeMonth(offset) {
    const date = new Date(Date.UTC(state.calendarYear, state.calendarMonth - 1 + offset, 1));
    state.calendarYear = date.getUTCFullYear();
    state.calendarMonth = date.getUTCMonth() + 1;
    renderCalendar();
  }
  function init() {
    const pacificToday = pacificDate(Date.now());
    state.calendarYear = pacificToday.year;
    state.calendarMonth = pacificToday.month;
    // The calendar lives inside the Edge of Madness panel and opens with the arrow in its heading.
    $('calendar-toggle').addEventListener('click', () => {
      const body = $('calendar-body'), toggle = $('calendar-toggle');
      body.hidden = !body.hidden;
      toggle.setAttribute('aria-expanded', String(!body.hidden));
      const label = body.hidden ? 'Show the Edge of Madness calendar' : 'Hide the Edge of Madness calendar';
      toggle.setAttribute('aria-label', label);
      toggle.title = body.hidden ? 'Show calendar' : 'Hide calendar';
    });
    $('calendar-prev').addEventListener('click', () => changeMonth(-1));
    $('calendar-next').addEventListener('click', () => changeMonth(1));
    $('calendar-today').addEventListener('click', () => {
      const today = pacificDate(Date.now());
      state.calendarYear = today.year; state.calendarMonth = today.month;
      renderCalendar();
    });
    renderCalendar();
    if (sounds() && $('sound-toggle')) sounds().mount($('sound-toggle'), $('sound-panel'), $('sound-state'));
    renderLive();
    void loadMetrics();
    void loadEra();
    setInterval(renderLive, 1000);
    // Keep drop timers within five seconds of a fresh NPC-yell event while viewed.
    // Background tabs use the original minute cadence to limit Worker/D1 reads.
    let metricsInFlight = false;
    let nextMetricsAt = Date.now() + 5_000;
    const refreshMetrics = async () => {
      if (metricsInFlight) return;
      metricsInFlight = true;
      try { await loadMetrics(); }
      finally { metricsInFlight = false; nextMetricsAt = Date.now() + (document.hidden ? MINUTE : 5_000); }
    };
    setInterval(() => {
      if (Date.now() >= nextMetricsAt) void refreshMetrics();
    }, 1_000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { nextMetricsAt = Date.now(); void refreshMetrics(); }
      else nextMetricsAt = Date.now() + MINUTE;
    });
    setInterval(() => { void loadEra(); }, 15 * MINUTE);
  }
  init();
})();
