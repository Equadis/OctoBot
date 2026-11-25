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
npx wrangler deploy
npx wrangler d1 migrations apply octobot-population --remote
```

This copies the existing official-census N'Zoth readings to `all` with
their exact timestamps and player counts, then removes the wrongly labelled
N'Zoth census rows. Separately verified N'Zoth data, if any, is preserved.
The website works with the older Worker until this migration is deployed,
but the Worker will keep writing its old classification until redeployment.

## OctoWoW model overlay (optional, not deployed)

The appearance route (`/api/outfitter/assets/...`) normally proxies Zam's Classic model library. Zam has no Blood Elf, a Goblin unlike the client's, and no helm models for either race. `tools/models/` converts the client's own models (see its README); this Worker can serve those files from a **private R2 bucket** bound as `MODELS`. With no binding nothing changes.

What the bucket is used for (exact keys only, built from validated paths; the bucket is never listed, never public, and this Worker never writes to it):

| Request path | Source |
|---|---|
| `m2/N.m2`, `skin/N.skin`, `skel/N.skel`, `textures/N.webp` with N from 9,000,000 | bucket only; a missing object is a 404 and Zam is not asked |
| `meta/character/17..20.json`, `meta/charactercustomization/17..20.json` (Goblin 17, 18; Blood Elf 19, 20) | bucket first, Zam if the bucket has no such object |
| `meta/armor/1/<display id>.json` (helms) | Zam's data, with the Goblin and Blood Elf models from `helms.json` in the bucket merged in (cached for 10 minutes). A missing or unreadable table leaves Zam's data unchanged |
| everything else | Zam, as before |

Cache lifetime for bucket responses is one hour (Zam proxy responses keep a week), so a re-upload shows up quickly.

### Helm hide rules

`helms.json` maps a Classic helm display id to `{"models": {"race:gender": file id}, "hide": {"race:gender": [geoset groups]}}`. For the converted races the Worker replaces Zam's `HideGeosetMale/Female` rows with the client's (`hide`), because the viewer hides `100 x group` to `100 x group + 99` and on the converted Goblin group 1 is the head. A table in the older flat shape still works and hides nothing for the converted races. Races 1 to 8 are never touched.

### Versioned URLs, cache lifetimes and no fallback

The converted Goblin and High Elf use character ids 17 to 20, the same URLs Zam's Goblin used (served here with a seven-day lifetime). A browser that had cached the old answer therefore kept showing Zam's Goblin after the overlay was deployed. The fix is in three parts:

* **Versioned URLs.** `build_overlay.py` writes `version.json` (a fingerprint of every file). `GET /api/outfitter/models-version` returns `{"version": "<16 hex>"}` (or `null` with no bucket), and the Dressing Room puts it in every asset URL: `/api/outfitter/assets/v<version>/meta/character/17.json`. A new build means new URLs, so no browser can serve an old model. A versioned URL naming the build in the bucket is cached for a year (`immutable`); one naming any other version is answered but sent `no-store`; unversioned URLs (old pages) get `max-age=60` for everything the overlay can change. Zam-only paths keep their seven days.
* **No silent fallback.** Character and customisation records for ids 17 to 20 and files with ids from 9,000,000 are read only from the bucket. If the bucket is not bound or the object is missing, the Worker answers `503 {"error":"models_unavailable"}` (a missing individual file is `404 model_file_missing`) and the page shows that message. Zam's Goblin is never substituted. The eight original races are unchanged.
* **Upload order.** `upload_overlay.mjs` uploads `version.json` last, so the site only switches to a build once every file of it is in the bucket.

Deploy order for a model update: rebuild, upload (version.json goes last), done; the Worker needs redeploying only when its code changes.

To enable it (manual, needs OctoWoW's agreement first; the converted files must not be published without it):

1. `python tools/models/build_overlay.py <client Data folder> <folder outside the repo>`
2. Create a private bucket and upload the folder's contents under the same keys it uses (`m2/...`, `skin/...`, `skel/...`, `textures/...`, `meta/...`, `helms.json`).
3. The `MODELS` binding is now in `wrangler.toml`; deploy with `npx wrangler deploy` from this folder. Uploading can be done with `node tools/models/upload_overlay.mjs <overlay folder> octobot-models` (resumable, uses your own wrangler login).

The binding is in `wrangler.toml` but the deploy has to be run by you; it fails until the bucket exists. The tests (`tests/overlay.test.mjs`) use a fake bucket.

## Character skins (appearance service)

With the `MODELS` bucket bound, `skins/catalogue.json` (the skin list) and `skins/choices/<body>.json` (extra Skin Color choices for one body, body = race * 2 - 1 + gender) are
read from the bucket. `/api/outfitter/skins` returns the catalogue (`{"version":1,"skins":[]}` when there is none). `meta/charactercustomization/<body>.json` has the body's choices
appended to its Skin Color option; only ids in the invented ranges (choices from 9,950,000, resources from 9,970,000, textures from 9,900,000) are accepted, so a bad file cannot
shadow a library choice, and any failure falls back to the unmerged answer. A body with no skins, or no bucket, behaves exactly as before. Tests: `tests/overlay.test.mjs`.

## Launcher snapshot: `GET /api/snapshot`

One small read-only object for desktop launchers (EqUpdater 3), instead of two requests:

```json
{"schema":1,"source":"cloudflare-minute","cadence_s":60,
 "population":{"all":{"timestamp":"...","online":1234,"source":"official census"},"nzoth":{...}},
 "status":{"timestamp":"...","website":"available","realms":{"nzoth":"online",...},"tcp":"reachable","auth":"responsive","latency_ms":812,"source_error":null}}
```

`population` is exactly what `/api/latest` returns and `status` is exactly `/api/status/latest`'s `sample` (or `null`), each
with its own timestamp, so a client decides for itself what is stale and never mistakes "I could not fetch" for "the server is down".

**Additive and free of new infrastructure.** No migration, binding, cron, bucket or secret; the existing endpoints and the
Worker's public contract are untouched (their tests still pass). It does the same two `SELECT`s the existing endpoints do.
Aggregates only: no player identifier.

**Cost, honestly.** A Worker invocation is billed per request wherever it is answered, and `workers.dev` cannot cache Worker
output at the edge (see Cloudflare's Cache API notes), so this does not make the request count flat. What it does:
one request replaces two; a conditional request (`If-None-Match`) that is still current is answered `304` from isolate
memory without touching D1; and within an isolate D1 is read at most once per 15 s however many requests arrive. A launcher
asks once a minute while it is focused and not at all while minimised. A truly flat cost needs the same JSON served as a
cached static object (a custom domain in front of a public R2 object, or Workers static assets), which is new infrastructure
and was deliberately not added here.

Deploy with the usual `npx wrangler deploy` when you choose to; until then a launcher gets a 404 and falls back to the GitHub
Pages files (`live.json`, `status/latest.json`), which GitHub refreshes only when its scheduler runs.
