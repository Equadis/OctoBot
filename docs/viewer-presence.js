/* Shared, anonymous site-wide viewer count for all OctoBot dashboard pages.
 * The existing Worker presence endpoint uses the legacy 'population' database
 * bucket; every dashboard page heartbeats to that same bucket, not a page-specific
 * one. Reuse the same session per tab when navigating between pages.
 */
(() => {
  'use strict';
  const status = document.getElementById('viewer-status');
  const count = document.getElementById('viewer-count');
  if (!status || !count) return;

  const configurationUrl = new URL('telemetry.json', document.currentScript.src);
  let endpoint = '';
  let sessionId = null;
  let inFlight = false;

  function viewerId() {
    if (sessionId) return sessionId;
    const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    try {
      const previous = sessionStorage.getItem('octobot-active-viewer');
      sessionId = previous && valid.test(previous) ? previous : crypto.randomUUID();
      sessionStorage.setItem('octobot-active-viewer', sessionId);
    } catch (_) {
      sessionId = crypto.randomUUID();
    }
    return sessionId;
  }

  function unavailable() {
    count.textContent = '—';
    status.classList.add('is-offline');
    status.title = 'Site-wide viewer count temporarily unavailable';
  }

  async function heartbeat() {
    if (!endpoint || document.visibilityState === 'hidden' || inFlight) return;
    inFlight = true;
    try {
      const response = await fetch(endpoint + '/api/presence/heartbeat', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: viewerId() })
      });
      if (!response.ok) throw Error('Presence HTTP ' + response.status);
      const result = await response.json();
      if (!Number.isInteger(result.viewers) || result.viewers < 0) throw Error('Invalid presence count');
      count.textContent = result.viewers.toLocaleString('en-GB');
      status.classList.remove('is-offline');
      status.title = result.viewers + ' active dashboard viewers across Population, Server Status and DPS Sim (last 90 seconds)';
    } catch (error) {
      console.warn('Site-wide viewer count unavailable', error);
      unavailable();
    } finally {
      inFlight = false;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') heartbeat();
  });

  (async () => {
    try {
      const response = await fetch(configurationUrl.href, { cache: 'no-store' });
      if (!response.ok) throw Error('Missing telemetry configuration');
      const config = await response.json();
      const value = String(config.endpoint || '').trim().replace(/\/$/, '');
      const url = new URL(value);
      if (url.protocol !== 'https:') throw Error('Invalid telemetry endpoint');
      endpoint = url.href.replace(/\/$/, '');
      await heartbeat();
      setInterval(heartbeat, 30000);
    } catch (error) {
      console.warn('Viewer telemetry unavailable', error);
      unavailable();
    }
  })();
})();
