# OctoBot: one-minute population telemetry

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

The census counter is attributed to N'Zoth as previously verified. The other
realms still need their own confirmed sources. Do not copy the N'Zoth value
into those realms or the All Realms total.

**Important:** Merely committing this Worker code does not activate it.
A real deployment to your Cloudflare account and the live endpoint setting
are required for one-minute tracking. No secrets are committed.
