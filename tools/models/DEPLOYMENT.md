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

## 5. The Character Skins release: exact sequence

OctoWoW has confirmed that the owner may use and redistribute the converted files and that no permission document is needed. A live upload still has to be deliberate: `upload_overlay.mjs` needs
`--owner-confirmed <the folder's exact build> --backup <folder>` (`publish_guard.mjs`), and a Worker deploy from an agent session needs `OCTOBOT_OWNER_CONFIRMED=<build>` in the command.

**Build versions after the blended-part fix (2026-11-22).** Models written before this date drew glows, flames, glass and flags as opaque black squares (`m2v274.write_skin` wrote shader id 0 for every batch). The official-only set rebuilt with the fix is `cfae21c1d3b5b2c0` (supersedes `87965b06bb43d4b2`: 972 `skin/*.skin` files differ, everything else is byte-identical) and the combined release set is `e073131f8ed6a1e9` (supersedes `99d527b265d60c45`). The live `8c2bbd319a49e0a6` has the same defect. The folders below are named `publish-official2` and `rc-combined2` for the rebuilt sets; the permission file, if the owner makes one, must name the version of the folder actually uploaded.

1. **Build the set** (client files under `D:\Octowow\Data`; the HD pack `patch-V` is skipped by default):
   `python tools/models/build_overlay.py <Data> out/official-chars`, `python tools/models/item_overlay.py build <Data> out/official-items`,
   `python tools/models/merge_overlays.py out/official-chars out/official-items out/publish-official`,
   `python tools/models/skins.py build <Data> <WDB>/itemcache.wdb out/skins`,
   `python tools/models/merge_overlays.py out/publish-official out/skins/overlay out/rc-combined` (stops on any key present in both with different content).
2. **Validate**: `python tools/models/validate_overlay.py out/rc-combined out/validate-rc.json` (no missing reference beyond the 690 known helm `TXID` ones, no unsound file, manifest matches);
   `node tools/models/ui_regression.mjs out/skins/overlay out/publish-official`; `node tools/models/skins_matrix.mjs out/skins/overlay out/publish-official`.
3. **Back up live** (section 0) and re-verify the backup against the live Worker. Prove the rollback on a staging bucket (section 1, step 6).
4. **Upload the bucket** (new keys and changed textures; `version.json` last, only if every file succeeded):
   `node tools/models/upload_overlay.mjs out/rc-combined2 octobot-models --backup <new backup folder> --owner-confirmed <build> --hold-version --rate 3` (everything except `version.json`), then, after the Worker is deployed and checked, the same command without `--hold-version` to activate the build. The old Worker ignores the `skins/` keys, so visitors see only the new
   official textures. Check `models-version` and re-verify every key through the Worker against `out/rc-combined2/manifest.json`.
5. **Deploy the Worker** from the release commit: `cd cloudflare/population` then `npx wrangler deploy` (note the previous version id first: `npx wrangler deployments list`). The Worker now adds skin choices to
   each body's customization and serves `/api/outfitter/skins`.
6. **Publish the site** by merging the release candidate into `main` (GitHub Pages). Until the catalogue exists the skin row is hidden, so the order of steps 5 and 6 does not matter for visitors.
7. **Live checks**: `curl .../api/outfitter/skins` lists 124 skins; open the Dressing Room, pick a skin on a Human, a Dwarf and a High Elf, switch sex (the skin must drop with a message), reload with the link,
   save and load an outfit; confirm no failed requests in the browser's network tab. `node tools/models/ui_regression.mjs` runs against local servers only, so it is not a live test.
8. **Roll back** (any step): Worker first (`npx wrangler rollback <previous id> -y`), then the bucket from the backup (`node tools/models/upload_overlay.mjs <backup> octobot-models --no-backup --force`).
   **The skins keys are new and a rollback does not delete them**: with the *new* Worker they would stay active even under the old `version.json`. Roll the Worker back first, or remove
   `skins/catalogue.json` (`npx wrangler r2 object delete octobot-models/skins/catalogue.json --remote`, owner only) to hide the feature at once.
