# OctoBot World Buff Tracker (N'Zoth)

This service is an authorised copy of [GeneralA6/octo-wow-world-buff-status](https://github.com/GeneralA6/octo-wow-world-buff-status), pinned to upstream commit [`eb9f559`](https://github.com/GeneralA6/octo-wow-world-buff-status/commit/eb9f55952c4e75e2e9f7e38469895b1253c9e49c). Original authorship remains credited. This integration does not imply a general licence for third-party redistribution.

## Scope

- **World Buff Tracker realm:** N'Zoth only. Separate `.server info`-only OctoMetrics collectors retain one Y'Shaarj and one C'Thun account; they are outside this service.
- **World Buff Tracker characters:** Two dedicated N'Zoth accounts, one parked at the Elwynn Forest Darkmoon Faire site and the other at Mulgore.
- **Raids:** Onyxia's Lair and Blackwing Lair tracked separately; the Onyxia/Nefarian head cooldown is shared.
- **Site output:** OctoBot's future World Buffs dashboard is the main destination. Keep confirmed buff drops distinct from raid-based predictions and stale observations.
- **No automated in-game broadcasting** from the OctoBot integration.

## Integration boundaries

The full advanced World Buff Tracker supports a primary and secondary Faire watcher with
NPC-name detection at both sites, but its original Discord/in-game notification workflows
are not the OctoMetrics feed. Use the separate DMF-only start command described below
for the new authenticated Cloudflare telemetry. The Worker API and the website display
are independent deployment steps; a running Railway process does not mean the site UI
has been updated.

## Deployment design

Host as a **separate Railway service** from the existing OctoMetrics proof-of-concept, even though both sources live in the OctoBot GitHub repository. Configure the Railway service's root directory as `services/world-buff-tracker`, use Node.js 20+, build with `npm ci && npm run build`, and start with `npm start`. The source's `railway.json` is a legacy upstream file; configure commands explicitly in Railway rather than depending on it.

Example **non-secret** variable names (enter values privately in Railway):

```dotenv
WOW_REALM=N'Zoth
WOW_ACCOUNT=<primary-username>
WOW_PASSWORD=<primary-password>
WOW_CHARACTER=<primary-character>
DARKMOON_WATCH_LOCATION=elwynn
WOW_BWL_ENABLED=true
WOW_WHO_MIN_GAP_SECONDS=31
WOW_LISTENERS=[{"account":"<secondary-username>","password":"<secondary-password>","character":"<secondary-character>","onLogin":"none","yeller":false,"darkmoonWatchLocation":"mulgore"}]
```

Secondary DMF observation is implemented in this integration branch. Configure the secondary listener with `darkmoonWatchLocation: "mulgore"` in the private `WOW_LISTENERS` JSON.

Avoid duplicate logins: the currently running `OBPVESW` OctoMetrics test uses a separate account and remains untouched until the replacement is verified. Any other service using either new account must be stopped before enabling it here.

## Source import

The GitHub Actions workflow `.github/workflows/import-world-buff-tracker.yml` copies the full pinned upstream source and tests into this directory on the feature branch. Re-run tests after port changes, and merge only after the website integration and second Faire-site observation are validated.

## Complementary PvP/HC collector

A separate metrics-only OctoMetrics Railway worker handles only `OBPVPSW` and `OBHCSW`, with `/who` and NPC buff monitoring disabled and `.server info` collected once a minute for each realm. It uses the existing Cloudflare D1 receiver. Total target: **four accounts, two new monitoring services**. Do not mistake a code branch or successful build for a production deployment; the existing N'Zoth test is still running independently.

## Relationship to the deployed collector (14 November 2026)

The live Railway service `octobot-metrics-tracker` runs the separate OctoMetrics collector (`start.mjs`), not this program. The learned-clear-duration method from this tracker has been ported into the OctoMetrics Worker (`cloudflare/octometrics`), working from events the collector already stores. Roster-cohort clear detection and Chronicle kill confirmation are **not** ported. See `cloudflare/octometrics/README.md` for the audit.


## Dedicated DMF-only Railway service (two N'Zoth characters)

Deploy a **separate** service in the existing Railway project using this repository,
root directory `services/world-buff-tracker`, one replica, build command
`npm ci && npm run build`, start command `npm run start:dmf`.

The DMF start command runs **only** the existing game-client object-update
and NPC-name detection. It does not run the raid /who pollers, guild,
chat, whispers, public yells, Discord alerts or the main tracker scheduler.
The existing four-account `octobot-metrics-tracker` service remains unchanged.

Add the following private Railway variables (replace passwords and character names;
do not commit them to GitHub):

```dotenv
WOW_REALM=N'Zoth
WOW_ACCOUNT=<actual-alliance-login-account>
WOW_PASSWORD=<private-alliance-password>
WOW_CHARACTER=OBPVEDMFA
DARKMOON_WATCH_LOCATION=elwynn
WOW_LISTENERS=[{"account":"<actual-horde-login-account>","password":"<private-horde-password>","character":"OBPVEDMFH","darkmoonWatchLocation":"mulgore","onLogin":"none","yeller":false}]
METRICS_PUSH_TOKEN=<same-private-token-as-Cloudflare-OctoMetrics-Worker>
METRICS_PUSH_URL=https://octometrics.eqvoice.workers.dev/api/ingest
```

Set `WOW_ACCOUNT` and the secondary `WOW_LISTENERS[].account` to the **actual game login accounts**, not automatically to the character names. The in-game characters are `OBPVEDMFA` and `OBPVEDMFH` and the Worker telemetry identifiers remain stable. Railway OAuth hides credential values, so verify both configured login account names in Railway if the logs report `auth: unknown account`. Characters must be parked at their respective Faire grounds within NPC visibility.

The observer issues creature-name queries **once per newly encountered NPC entry
per connection**, using the existing `NpcWatch` guard and `isFaireNpc` roster.
This is the headless equivalent of checking the nearby names **Sayge**, **Silas Darkmoon**
and **Gelvas Grimegate** with `/target`; headless clients do not execute player macros.
A still-visible confirmed NPC refreshes the positive sighting every minute;
objects that leave range or despawn are excluded. No sighting does not establish absence.
It emits direct positive `dmf_sighting` events and `dmf_status` connection
heartbeats approximately every minute. No named NPC means **unknown**,
not confirmation of absence. A short network outage means **stale**, not absence.

**Deployment order:** deploy the changed OctoMetrics Cloudflare Worker **first**,
then start the new Railway DMF-only service. Check the logs for two successful
world logins and the Cloudflare `/api/summary` response for
`darkmoon.sites.elwynn` / `darkmoon.sites.mulgore`. Confirm
`lastConfirmedAt` only after an actual NPC match. No new D1 migration is
required. The website UI must be connected to these fields separately.

Use `WOW_LOGIN_ENABLED=false` if you need both DMF characters freed for
manual login; do not run them simultaneously in another Railway service.


## Raid session telemetry (authoritative raid ids and timers)

Set `METRICS_PUSH_TOKEN` (and optionally `METRICS_PUSH_URL`) on the main tracker service to push per-raid sessions (id, formation time, aggregate guild composition, concurrent raids) to OctoMetrics. Off without the token. Deploy the Worker first. Full design, env variables, staleness rules and limitations: [docs/RAID-SESSIONS.md](../../docs/RAID-SESSIONS.md).
