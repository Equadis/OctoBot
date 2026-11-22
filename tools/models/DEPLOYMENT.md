# Replacing the live model set: backup, deploy, verify, roll back

For replacing the files in the private R2 bucket `octobot-models` (and the Worker that reads it). Nothing here runs by itself: every step that changes the live
bucket or Worker is a command you run. The rules in `README.md` (OctoWoW's agreement before publishing client-derived files) apply first.

## 0. What counts as "the live deployment"

| Part | Where it lives | How it is backed up |
|---|---|---|
| Bucket objects (models, skins, skeletons, textures, `meta/*`, `helms.json`) | R2 `octobot-models` | a verified local copy of the build (`tools/models/out/publish`, each file checked against the live Worker by sha256) copied to a backup folder |
| Version pointer | `version.json` in the bucket | downloaded from the bucket into the backup folder (`wrangler r2 object get`) |
| Manifest | `manifest.json` of the build | in the backup folder |
| Worker code | Cloudflare version id | its id (`npx wrangler deployments list`) and the source tree of the commit it was deployed from (`git archive <commit> cloudflare/population`) |
| Worker config | `wrangler.toml` bindings, cron | `npx wrangler versions view <id> --json` saved beside the source |

Restoring `version.json` alone is **not** a rollback: keys such as `helms.json` and the textures keep their names when the build changes, so the old pointer would
sit over new bytes. A rollback restores every overwritten object and the pointer, last.

## 1. Before touching the live bucket

1. Build the replacement and validate it: `python tools/models/validate_overlay.py <build folder> report.json` (every reference resolves, every file decodes, manifest
   matches the files; a reference missing from the replacement but present in the live build is a regression).
2. Compare what changes: `texdiff`-style comparison of every key whose sha256 differs between the two manifests (see the readiness report for the method).
3. Run the Worker differential if the Worker changes: `node tools/models/worker_diff.mjs <deployed outfitter.js> <candidate outfitter.js> <build folder> zam-presence.json`.
4. Test locally: `node tools/models/e2e_server.mjs <build folder> 8091` serves the real site and the real Worker code against that folder. Nothing is uploaded.
5. Back up the live deployment (section 0). Confirm the backup still equals live right now: re-verify every key through the Worker (`verify_remote.py`-style: fetch
   `/api/outfitter/assets/<key>`, compare sha256 with the manifest).
6. Prove the rollback on a private staging bucket: `npx wrangler r2 bucket create octobot-models-rollbacktest`, then
   `python tools/models/rollback_test.py <current build folder> <replacement build folder> octobot-models-rollbacktest <work folder>`, then delete the bucket.
   The Worker side is `npx wrangler rollback <version id> --message "..." -y`; try it on a throwaway Worker, never on the live one.

## 2. Replace

```powershell
node tools/models/upload_overlay.mjs <replacement folder> octobot-models --backup <new backup folder> --rate 3
```

`--backup` saves each object the bucket already holds under a key before overwriting it (a key that is not there yet has nothing to save; any other failure leaves that
file un-overwritten and is reported). `version.json` is sent last, only if every file succeeded, so the site and Worker switch to the new build only when it is complete.
If the run is interrupted, rerun the same command (it resumes). Then deploy the Worker if it changed (`npx wrangler deploy` from `cloudflare/population`).

## 3. Verify

* `curl https://octobot-population.eqvoice.workers.dev/api/outfitter/models-version` names the new version.
* Re-verify every key through the Worker against the replacement manifest.
* Open the Dressing Room and check a Human, a Goblin and a High Elf with gear.

## 4. Roll back

```powershell
npx wrangler rollback <previous Worker version id> --message "rollback" -y     # only if the Worker was deployed
node tools/models/upload_overlay.mjs <backup folder> octobot-models --no-backup --force --rate 3
```

`--force` is required: a backup folder remembers its own earlier restore in `.uploaded.json`, and without `--force` a second rollback would skip every file. The restore
sends `version.json` last. Check `models-version` and re-verify against the *old* manifest.

### Limits of a rollback

* A key the replacement **added** (it did not exist before) is not removed. It is unreferenced once the old pointer is back, so it is harmless, and ids are never reused.
* Browsers that loaded the new build keep it cached for the new version's URLs (immutable, by design); the old pointer sends them to different URLs, so they do not mix.
* Unversioned URLs and Zam-backed paths have short or long (7 day) lifetimes set by the Worker; see `cloudflare/population/README.md`.
* The live build `8c2bbd319a49e0a6` was deployed before `--backup` existed. Its backup is the verified local copy described in section 0, which is complete for the bucket.
  Its original `helms.json` was overwritten in an earlier step and is the copy in that backup (checked against the live object).
* Cloudflare keeps a limited number of Worker versions; a rollback needs the target version still listed by `npx wrangler versions list`.
