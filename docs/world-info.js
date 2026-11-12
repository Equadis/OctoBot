/* OctoBot World Info MVP. Public observations only: never turn an inferred raid or a failed request into a confirmed event. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const METRICS_URL = 'https://octometrics.eqvoice.workers.dev/api/summary';
  const ERA_URL = 'https://edgeofmadnesscalendar.com/api/era';
  const MINUTE = 60_000;
  const FRESH_METRICS_MS = 5 * MINUTE;
  const FRESH_DMF_MS = 6 * 60 * MINUTE;
  const DAY = 86_400_000;
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
    buffs: { alliance: null, horde: null },
    dmf: null,
    era: null,
    calendarYear: 0,
    calendarMonth: 0,
    metricsFetchedAt: null
  };

  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
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
  function span(ms) {
    if (!Number.isFinite(ms)) return 'NO DATA';
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    return String(hours).padStart(2, '0') + 'h ' + String(minutes).padStart(2, '0') + 'm ' + String(secs).padStart(2, '0') + 's';
  }
  function spanWithDays(ms) {
    if (!Number.isFinite(ms)) return 'NO DATA';
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = seconds % 60;
    return days + 'd ' + String(hours).padStart(2, '0') + 'h ' + String(minutes).padStart(2, '0') + 'm ' + String(secs).padStart(2, '0') + 's';
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
  function raidSession(row) {
    if (!object(row)) return null;
    const startedAt = timeOf(row, 'startedAt', 'startAt', 'formedAt', 'start_time', 'started_at');
    const stateText = String(first(row.status, row.state, '')).toLowerCase();
    if (['ended', 'finished', 'cleared', 'cancelled'].includes(stateText) || row.active === false) return null;
    if (!validPast(startedAt)) return null;
    return { id: String(first(row.id, row.number, row.raidNumber, 'Raid')), startedAt, confidence: String(first(row.confidence, 'inferred')).toLowerCase() };
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
    const count = sessions.length ? sessions.length : (Number.isInteger(Number(explicitCount)) && Number(explicitCount) >= 0 ? Number(explicitCount) : null);
    return { stamp, sessions, lastFinishedAt, players: Number.isFinite(players) && players >= 0 ? players : null, active, count };
  }
  function renderRaid(key) {
    const raid = state.raids[key];
    const count = $(key + '-count');
    const activeNode = $(key + '-active');
    const evidence = $(key + '-evidence');
    const finished = $(key + '-finished');
    activeNode.replaceChildren();
    finished.textContent = raid && validPast(raid.lastFinishedAt)
      ? span(Date.now() - raid.lastFinishedAt) + ' AGO' : 'NO DATA';
    count.classList.toggle('no-data', !raid || !freshAt(raid.stamp));
    if (!raid || !freshAt(raid.stamp)) {
      count.textContent = 'NO DATA';
      labelState(key + '-state', raid ? 'STALE' : 'AWAITING DATA');
      evidence.textContent = raid ? 'Last /who reading is too old for a live raid status.' : 'Waiting for an in-game raid observation.';
      appendEmpty(activeNode, 'No current verified raid sessions.');
      return;
    }
    if (raid.sessions.length) {
      count.textContent = String(raid.sessions.length);
      const confirmed = raid.sessions.every(session => ['confirmed', 'verified'].includes(session.confidence));
      labelState(key + '-state', confirmed ? 'VERIFIED' : 'ESTIMATED', confirmed ? 'online' : 'estimated');
      for (const session of raid.sessions) {
        const line = document.createElement('div');
        line.className = 'timer-row';
        const title = document.createElement('span');
        title.textContent = 'Raid ' + session.id;
        const timer = document.createElement('strong');
        timer.className = 'mono';
        timer.textContent = span(Date.now() - session.startedAt);
        line.append(title, timer);
        activeNode.append(line);
      }
      evidence.textContent = 'Separate groups ' + (raid.sessions.every(session => ['confirmed', 'verified'].includes(session.confidence)) ? 'verified' : 'inferred') + ' from rosters · ' + (raid.players === null ? 'Roster observed' : raid.players + ' players observed in /who') + '. /who alone cannot prove instance IDs.';
    } else if (raid.count !== null) {
      count.textContent = raid.count === 0 ? 'NO RAID' : String(raid.count);
      labelState(key + '-state', raid.count ? 'ESTIMATED' : 'NO RAID', raid.count ? 'estimated' : 'unknown');
      appendEmpty(activeNode, raid.count ? 'Start timestamps not yet available.' : 'No raid currently detected.');
      evidence.textContent = raid.players !== null ? raid.players + ' players listed in the latest /who response.' : 'Latest roster observation received.';
    } else if (raid.active === true) {
      count.textContent = '1+';
      labelState(key + '-state', 'ESTIMATED', 'estimated');
      appendEmpty(activeNode, 'Raid activity detected; separate groups and start time not verified.');
      evidence.textContent = (raid.players === null ? 'Raid activity signal received.' : raid.players + ' players in the observed zone.') + ' Multiple raids cannot be counted from the current collector.';
    } else if (raid.active === false) {
      count.textContent = 'NO RAID';
      labelState(key + '-state', 'NO RAID', 'unknown');
      appendEmpty(activeNode, 'No raid detected in the latest scan.');
      evidence.textContent = (raid.players === null ? '' : raid.players + ' players listed. ') + 'No confirmed completed raid can be inferred from an empty zone.';
    } else {
      count.textContent = 'NO DATA';
      labelState(key + '-state', 'UNVERIFIED');
      appendEmpty(activeNode, 'Insufficient raid lifecycle information.');
      evidence.textContent = raid.players === null ? 'No usable observations available.' : raid.players + ' players listed; the raid state is unknown.';
    }
  }
  function appendEmpty(node, message) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = message;
    node.append(p);
  }

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
  function renderBuff(faction) {
    const buff = state.buffs[faction];
    const estimate = $(faction + '-estimate');
    const last = $(faction + '-last');
    const estimateNote = $(faction + '-estimate-note');
    const lastNote = $(faction + '-last-note');
    if (buff && validPast(buff.last)) {
      last.textContent = span(Date.now() - buff.last) + ' AGO';
      lastNote.textContent = 'Recorded ' + when(buff.last) + (buff.head ? ' · ' + (buff.head === 'bwl' ? 'Nefarian' : buff.head === 'onyxia' ? 'Onyxia' : String(buff.head)) : '');
    } else {
      last.textContent = 'NO DATA';
      lastNote.textContent = 'No confirmed announcement received';
    }
    if (buff && validPast(buff.estimate, Date.now() + 365 * DAY)) {
      const until = buff.estimate - Date.now();
      estimate.textContent = until > 0 ? span(until) : 'WINDOW PASSED';
      estimateNote.textContent = 'Estimated for ' + when(buff.estimate) + ' · not a guarantee';
    } else {
      estimate.textContent = 'NO DATA';
      estimateNote.textContent = 'No reliable prediction available';
    }
    labelState(faction + '-state', buff && validPast(buff.last) ? 'DROP RECORDED' : buff && validPast(buff.estimate, Date.now() + 365 * DAY) ? 'ESTIMATED' : 'AWAITING DATA', buff && (validPast(buff.last) || validPast(buff.estimate, Date.now() + 365 * DAY)) ? 'estimated' : 'unknown');
  }

  function findDmf(root) {
    const world = object(root.worldInfo) || object(root.world_info) || root;
    const dmf = object(first(world.dmf, world.darkmoonFaire, world.darkmoon, root.dmf)) || null;
    if (!dmf) return null;
    return { location: String(first(dmf.location, dmf.site, dmf.zone, '')).toLowerCase(), observedAt: timeOf(dmf, 'observedAt', 'lastSeenAt', 'seenAt', 'timestamp'), source: String(first(dmf.source, 'observation')) };
  }
  function renderDmf() {
    const dmf = state.dmf;
    const fresh = dmf && freshAt(dmf.observedAt, FRESH_DMF_MS);
    const sw = fresh && /^(sw|elwynn|stormwind|elwynn forest)$/.test(dmf.location);
    const tb = fresh && /^(tb|mulgore|thunder bluff)$/.test(dmf.location);
    const location = sw ? 'SW' : tb ? 'TB' : 'MIA';
    $('dmf-location').textContent = location;
    $('dmf-description').textContent = sw ? 'Elwynn Forest · near Goldshire' : tb ? 'Mulgore · below Thunder Bluff' : 'No currently verified Faire location';
    $('dmf-observed').textContent = fresh && (sw || tb)
      ? 'Last observed ' + span(Date.now() - dmf.observedAt) + ' ago · ' + dmf.source
      : dmf && validPast(dmf.observedAt)
        ? 'Last sighting is stale: ' + when(dmf.observedAt)
        : 'NPC / addon sighting integration pending';
    labelState('dmf-state', sw || tb ? 'CONFIRMED' : 'UNCONFIRMED', sw || tb ? 'online' : 'unknown');
  }

  async function loadMetrics() {
    try {
      const response = await fetch(METRICS_URL, { cache: 'no-store', headers: { 'Accept': 'application/json' } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const root = await response.json();
      if (!object(root)) throw new Error('Invalid summary');
      state.raids.ony = normaliseRaid(findRaid(root, 'ony'), root);
      state.raids.bwl = normaliseRaid(findRaid(root, 'bwl'), root);
      state.buffs.alliance = findBuff(root, 'alliance');
      state.buffs.horde = findBuff(root, 'horde');
      state.dmf = findDmf(root);
      state.metricsFetchedAt = Date.now();
      const source = $('source-status');
      source.textContent = 'OctoMetrics API connected · Raid lifecycle data is in development';
      source.className = 'source-label fresh';
    } catch (error) {
      const source = $('source-status');
      source.textContent = 'OctoMetrics API unavailable · Previously received data may be stale';
      source.className = 'source-label stale';
      // Retain the last successful response, subject to its original observation timestamps.
    }
    renderLive();
  }
  function renderLive() {
    renderRaid('ony');
    renderRaid('bwl');
    renderBuff('alliance');
    renderBuff('horde');
    renderDmf();
    renderMadnessCountdown();
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
    $('eom-current-until').textContent = 'Until ' + (rotation.end ? when(rotation.end) : 'unknown');
    $('eom-next-at').textContent = rotation.end ? 'From ' + when(rotation.end) : 'Start unknown';
    $('eom-countdown').textContent = rotation.end ? spanWithDays(rotation.end - Date.now()) : 'NO DATA';
    labelState('eom-source', rotation.api ? 'ERA API' : 'ERA REFERENCE', rotation.api ? 'estimated' : 'unknown');
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
    $('calendar-prev').addEventListener('click', () => changeMonth(-1));
    $('calendar-next').addEventListener('click', () => changeMonth(1));
    $('calendar-today').addEventListener('click', () => {
      const today = pacificDate(Date.now());
      state.calendarYear = today.year; state.calendarMonth = today.month;
      renderCalendar();
    });
    renderCalendar();
    renderLive();
    void loadMetrics();
    void loadEra();
    setInterval(renderLive, 1000);
    setInterval(() => { void loadMetrics(); }, MINUTE);
    setInterval(() => { void loadEra(); }, 15 * MINUTE);
  }
  init();
})();
