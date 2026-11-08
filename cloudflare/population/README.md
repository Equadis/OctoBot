# OctoBot: one-minute population telemetry

## One-minute Server Status monitoring

The same existing Cloudflare Cron Worker now independently records the official
realm labels, login TCP reachability and a credential-free WoW authentication
challenge into `status_readings` in D1. It never uses real accounts, and
a failed/blocked probe is **unknown**, not fabricated downtime. Consecutive
explicit official offline readings are required before recording an offline
realm; a transient unsuccessful website request cannot declare a realm down.

**One-time update required** after pulling the repository:

```sh
cd cloudflare/population
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

Then open these public read-only endpoints:

- `https://octobot-population.eqvoice.workers.dev/api/status/health` — last
  reading timestamp and freshness.
- `https://octobot-population.eqvoice.workers.dev/api/status/latest` — most
  recent recorded official and credential-free login checks.
- `https://octobot-population.eqvoice.workers.dev/api/status/history?since=0` —
  chronological readings with `has_more` and `next_since` pagination.

The Server Status webpage fetches new results every minute, merges them with
the independent GitHub JSON fallback, and retains the 90-day browsing window.
The original imported Discord-bot history is unaffected.

Cloudflare supports outgoing TCP sockets, but some destinations may reject
Cloudflare connections. If the WoW login endpoint cannot be reached from the
Worker, its authentication state remains `unknown`; the GitHub monitor
remains a fallback. An explicitly confirmed outage is never hidden just
to make uptime look perfect. No scheduled system can guarantee that
every minute will contain a successful external observation.


The GitHub-hosted site itself is static. Its existing GitHub Actions workflow cannot
reliably collect a new observation once per minute (GitHub's minimum is five minutes
and scheduled jobs may be delayed or skipped).

This Cloudflare Worker has its own `* * * * *` Cron Trigger. Each minute it fetches
the official OctoWoW census, validates the online counter, and stores the **real
timestamp and count** in Cloudflare D1. The read-only JSON API provides a
live latest-reading endpoint and a paginated history endpoint. Failed fetches
record **nothing** (not zero); the website marks the last observation as stale.

## One-time deployment

From this directory, after signing in to the same Cloudflare account as your
existing Workers:

```sh
npx wrangler login
npx wrangler d1 create octobot-population
```

Copy the D1 database UUID returned by Cloudflare into `database_id` in
`wrangler.toml`.

```sh
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

Copy the deployed HTTPS URL (for example,
`https://octobot-population.<your-subdomain>.workers.dev`) into
`docs/telemetry.json` as `endpoint` and commit that configuration.

Then check:

```sh
curl https://<your-worker-host>/api/health
curl https://<your-worker-host>/api/latest
```

Cron deployment/propagation can take a few minutes. The dashboard polls
`/api/latest` every 60 seconds and retrieves new `/api/history` observations
every five minutes, merging them with your imported GitHub history.

The website-wide census counter is now recorded as **All Realms**. It is
never treated as a N'Zoth reading and is never summed with individual realm
counts. N'Zoth, Y'Shaarj and C'Thun require their own verified feeds.

**Important:** Merely committing this Worker code does not activate it.
A real deployment to your Cloudflare account and the live endpoint setting
are required for one-minute tracking. No secrets are committed.

## Update: anonymous live viewers, cursor-anchored scroll and three-realm support

The dashboard now has continuous mouse-wheel zoom (about 30% per typical notch)
centred on the exact time under the pointer, with a ten-minute minimum.

The active-viewer counter uses an anonymous session ID per browser tab and
a 30-second heartbeat to Cloudflare D1. The counter includes sessions seen in
the last 90 seconds; a red dot pulses slowly. No IP, name or Discord ID is
saved. It requires a **one-time database migration and Worker redeployment**:

```sh
git pull origin main
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

Run those from the Codespaces directory `cloudflare/population`.

Three optional Worker environment variables allow separate Normal, PvP and Hardcore
population feeds **when you have independently confirmed realm-specific URLs**:

```toml
[vars]
POPULATION_NZOTH_URL = "https://REAL_VERIFIED_NORMAL_JSON_ENDPOINT"
POPULATION_YSHAARJ_URL = "https://REAL_VERIFIED_PVP_JSON_ENDPOINT"
POPULATION_CTHUN_URL = "https://REAL_VERIFIED_HC_JSON_ENDPOINT"
```

Each HTTPS URL must return JSON `{"online":123}` for **that realm only**.
The website-wide count is always stored under `all`; N'Zoth, Y'Shaarj
and C'Thun show NO DATA until separately verified feeds exist. Never
sum the website-wide count with individual realm values.

## Public feed audit (6 November 2026)

An inspection of the official `/player-census` HTML and its public JavaScript found
**one** Livewire `onlineNow` value, displayed as `OctoWoW Players online now`.
The three realm tabs use a separately generated character census (`combos` and
historic character totals), not independently exposed current online numbers.
The public homepage lists realm **online/offline status**, not online population.
No verified, realm-specific once-per-minute PvP or Hardcore feed was identified.

**Population attribution:** The website does not explicitly break its
`onlineNow` figure down by realm. In accordance with the requested change,
OctoBot displays this website-wide headline as **All Realms** while leaving
the three individual realms unpopulated. The headline's exact scope remains
unverified without developer confirmation.

The most reliable solution is for OctoWoW developers to publish or confirm
read-only JSON endpoints with timestamped per-realm online counts (ideally all
three in one response). The existing Worker supports separately configured
verified per-realm JSON feeds but cannot invent missing sources.

## Move legacy census history to All Realms

Apply `0004_census_all_realms.sql` to the remote D1 database, then redeploy
the Worker:

```sh
git pull origin main
cd cloudflare/population
npx wrangler d1 migrations apply octobot-population --remote
npx wrangler deploy
```

This copies the existing official-census N'Zoth readings to `all` with
their exact timestamps and player counts, then removes the wrongly labelled
N'Zoth census rows. Separately verified N'Zoth data, if any, is preserved.
The website works with the older Worker until this migration is deployed,
but the Worker will keep writing its old classification until redeployment.
