# Deployment readiness: replacing live build `8c2bbd319a49e0a6` with the official-only build `87965b06bb43d4b2`

Prepared 2026-11-22. **Status: ready to deploy once the owner decides; nothing about the replacement is uploaded, activated or deployed.** Procedure: `DEPLOYMENT.md`.

## Why replace it

The live build was converted with a reader that ranked single-letter patches above the base archives, so 4,949 of its 9,325 textures were decoded from the
Project Reforged HD pack (`patch-V`, a third-party pack installed on this machine), not from the OctoWoW archives. The official-only build is converted from the OctoWoW archives
alone (base archives, `patch.MPQ`, `patch-1` to `patch-5`). Models, skins, skeletons and every `meta` record are byte-identical between the two; only textures differ.

## 1. The 4,949 changed textures (live against official-only)

`texture_diff.py` compared every pair (size, mean colour difference at 32 px, alpha):

| Class | Textures | Meaning |
|---|---|---|
| HD is 2x larger | 4,149 | same art, official has a quarter of the pixels |
| HD is 4x larger | 679 | same art, one sixteenth of the pixels |
| HD is 8x / 16x larger | 56 / 14 | same art or re-drawn, much lower resolution |
| same size, different pixels | 51 | the pack repainted them |

* Typical colour difference is small (median 3.1 of 255, 90% under 5.5): the official textures are the same artwork at game resolution.
* About 1% (p99 46, max 57) differ a lot. Side by side, those are textures where the pack drew a **different layout** (for example a shield or shoulder atlas), which does not match
  the vanilla models the build ships. The official textures are the ones that fit the models; the live ones are likely wrong there. 166 textures differ in alpha by more than 8
  (121 of them with otherwise similar colours): the pack changed edge transparency.
* 28 live textures (`textures/9100599` to `9100626`, Goblin and High Elf customisation) exist only with the pack and are referenced by nothing: orphans, not regressions.
* **What visitors lose:** resolution. Armour and weapon textures drop to the game's own resolution (2x to 16x fewer pixels). Nothing is missing.

## 2. Missing textures, broken models, wrong appearances

`validate_overlay.py` on both builds (every reference resolves, every file decodes, manifest matches):

| | live | official-only |
|---|---|---|
| files | 23,373 on disk (23,370 in manifest) | 23,344 on disk (23,342 in manifest) |
| textures / models / skins / skeletons | 9,325 / 3,229 / 3,229 / 3,229 | 9,297 / 3,229 / 3,229 / 3,229 |
| files that do not decode or have bad headers | 0 | 0 |
| references to a file that does not exist | 690 | 690 (the same 690) |
| orphan files | 28 | 0 |

The 690 are model `TXID` entries (helm models, texture id = model id + 10) naming a texture that was never written. They are identical in both builds, so they are
**not** a regression; the viewer takes helm textures from the item record and no request for them was seen in any test. They are listed in `validate-*.json` for follow-up.

## 3. Local regression test of the official-only build

Real site and real Worker code on `127.0.0.1` with a file-backed bucket (`e2e_server.mjs`), in the Dressing Room's own viewer:

* **All 20 bodies** (10 races x 2 genders): each loaded with a full set of recovered equipment (head, shoulders, back, chest, legs, feet, hands, main hand, off hand, ranged),
  8 viewer slots applied on every body.
* **942 appearance choices** (every skin colour, face, hair style, hair colour and facial-hair/feature choice of every body) applied one by one on top of that outfit.
* **0 failed requests (4xx or 5xx), 0 script errors, 0 missing actors** across the whole sweep.
* Geosets, custom models (Goblin and High Elf bodies, converted helms, shoulders, weapons) and equipment attachments come from files that are byte-identical to the live build,
  so their behaviour is unchanged by construction; the sweep confirms they still load.
* Side by side with the live build (Human male, full set): same appearance at normal zoom, softer texture detail in the official-only build.
* **Not done:** a pixel-for-pixel visual review of every item; a check in game; the mobile layout. Automated loading is not proof of visual correctness.

## 4. Backup of the live deployment

`D:\Octowow\.eco-work\backup-live-8c2bbd319a49e0a6\` holds: all bucket objects of the live build (358 MB; each key was fetched through the live Worker and compared by sha256, twice, hours apart),
`version.json` and `helms.json` downloaded from the live bucket (identical to the copy), `manifest.json`, the Worker source tree of the deployed commit (`5f0464c`), `wrangler.toml`, the
list of Worker deployments and versions, and `wrangler versions view` of the live version `2f969ef2-7d17-4608-a073-9d311a29eaaf` (bindings and handlers).

## 5. Rollback proven

On a private staging bucket (created for the test, deleted afterwards), `rollback_test.py` with 82 keys (36 changed textures, `helms.json`, character metadata, `version.json`, 3 keys only the current build has):
upload current, replace with `--backup`, **replacement verified**, roll back from the backup, **current verified byte for byte, `version.json` and `helms.json` included**, roll back again, replace again and roll back a
second time (82 of 82 each time). A first version of the test passed a second rollback only because the backup folder remembers its first restore and skipped every file: the uploader now has `--force` and the
procedure requires it.

Worker rollback was proven on a throwaway Worker (v2 rolled back to v1, then the probe was deleted); `npx wrangler rollback <id>` was **not** run on the live Worker. The versions `1408876d`, `2ba39551` and `2f969ef2` are listed.

### Rollback limits

* Keys the replacement adds are not removed (there are none in this replacement); ids are never reused.
* Browsers that loaded the new build keep its immutable cached files, under the new version's URLs.
* The restore trusts the backup folder: it is a local copy that must be kept until the replacement is accepted.
* The previous versions of the Worker must still be listed by Cloudflare at rollback time.
* The earlier `helms.json` overwrite (before backups existed) is covered only because the live object equals the verified local copy.

## 6. Worker: the item-record fallback

The deployed Worker (commit `5f0464c`) asks the bucket first for item records; `origin/main` asks Zam first and uses the bucket only when Zam has no record. `worker_diff.mjs` ran both over every key of the
official-only build (4,365 keys, each twice): with Zam answering, all 4,382 requests are identical (status, body, cache header), and no bucket record exists that Zam also holds. The only difference is when Zam fails
(a 5xx): the deployed Worker serves the recovered record, `origin/main` returns 502 by design (its test pins that). **Resolution: adopt `origin/main`'s behaviour** (the branches contain it); the difference is limited to Zam
outages, where the Dressing Room is mostly unusable for the original races anyway. Reverse the choice by serving the bucket on any non-OK Zam answer if that matters.

## 7. Incident during preparation

At about 00:32 on 2026-11-22 an upload of the official-only build to the **live** bucket started with the new `--backup` option and wrote 12 textures
(`textures/9100001`, `9100003`, `9100005`, `9700000` to `9700008`) before it stopped. It was not started by any command in this preparation (the Worker logs show it); the likely cause is the
"Yes, upload it" answer to the previous question being acted on while this instruction arrived. It was found by the re-verification of every live key (12 of 23,368 differed), `version.json` was never touched and
still names `8c2bbd319a49e0a6`. The 12 objects were restored from the verified backup and re-verified (12 of 12). No uploader is running.

## 8. Remaining blockers and decisions

1. **The owner's decision** to replace the live set (public change; lower texture resolution) and OctoWoW's agreement under `README.md`. No agreement has been seen.
2. A visual review of the outliers (the ~100 textures with a different layout) and a game comparison, if wanted.
3. The 690 dangling `TXID` references (pre-existing).
4. The Character Skins work stays on `feature/character-skins`; its client-derived assets are built locally and not deployed.

## 9. Release candidate `release/character-skins-rc1` (2026-11-22)

Merged `feature/character-skins` into the latest `origin/main` (21b4b4b, 14 commits that touch only Population, World Chat, the Hardcore Death Log and the bot): **no conflicts**, and the merge
changes only Dressing Room, appearance-Worker, model-tooling and test files. The Worker keeps `origin/main`'s item-record fallback (Zam first, bucket when Zam has no record); the only line
removed from `main` is the old `resetOverlayCache`, replaced by one that also clears the skin cache.

| Suite | origin/main | release candidate |
|---|---|---|
| repository JS tests | 249 run, 10 fail | 267 run, 9 fail |
| appearance Worker (`cloudflare/population`) | 39 pass | 43 pass |
| `cloudflare/octometrics` | 160 run, 1 fail | 160 run, 1 fail (the same) |
| Python model tests (real client) | n/a | 65 run, 0 fail, 2 skipped |
| browser regression (`ui_regression.mjs`) | n/a | 43 of 43 |
| skins matrix (`skins_matrix.mjs`) | n/a | 210 of 210 |

* **No regressions.** The 9 failing JS tests are inherited and identical on `origin/main` (Darkmoon Faire, item-icon border, prices, Collector card, character name box, planner column width, scan status,
  "Gear Planner" navigation label, tracker group name); the one failure `main` has that the candidate does not is the stale Dressing Room script-version test, which the candidate updates.
* **The matrix** loads each of the 54 mapped looks through the real page and Worker with a helm, shoulders, a robe, a cloak and a weapon, one after another in one page (so every skin-only change on the same body
  is exercised), and checks the live model carries exactly that skin, the gear is applied, no note says the skin was dropped and nothing failed to load; every fourth look changes a customisation choice (the skin survives)
  and is then cleared (the default look returns); all 20 bodies load with gear and no skin. The browser regression adds race and sex switching, old outfits and links, export, import, Tmog codes, saved outfits,
  invalid and unavailable skins, a service with no skins, a failing skins route, a catalogue whose texture files are missing, and a phone-width layout.
* **Official-only compatibility.** The skins overlay merges with the official-only build without a key clash into one set (23,601 files, 9,535 textures); `validate_overlay.py` finds 0 unsound files, 0 manifest
  differences, 0 orphans and the same 690 known dangling helm `TXID` references as the official-only build (no new ones). Every skin texture and shop picture comes from an official archive (none from a letter patch; the
  HD pack would have replaced 100+ of them and was not read). Versioned loading and Worker routing were exercised by the runs above against the merged set; the skins keys are new, which changes the rollback
  (section 5, step 8).
* **Safeguards confirmed.** `PUBLISH_PERMISSION.json` does not exist and was not created or touched; the uploader refuses a live bucket without it (tests and a live-name dry run), the hook blocks raw live-bucket writes,
  Worker deploys and writes to the permission file (tests), `CLAUDE.md` states the rule. No upload, Worker deploy or `version.json` change was made; the live Worker and bucket are as they were.
* **Remaining mappings:** Dreadskull Clan I and Necromancy II (Night Elf) are unavailable; 6 Orc looks are "Probable match"; some female looks have no texture (see `README.md`); nothing is `Verified`.
* A leftover headless browser from an interrupted run once saturated the CPU; `cdp.mjs` now kills its browser on any exit.

## Update 2026-11-22: equipment placement, blended parts and the Skin dropdown

* **Item placement:** attachment points, hands and shields are correct on all 20 bodies, normal and skin-applied (542 loadouts rendered in the real page, `placement_matrix.mjs`); no transform changed.
  One real defect found and fixed: blended parts (glows, flames, glass) drew as opaque black squares because the converter wrote shader id 0 for every batch (`m2v274.write_skin`; 972 `skin/*.skin` files change).
  The live build `8c2bbd319a49e0a6` and the earlier official-only build `87965b06bb43d4b2` have the defect. Rebuilt sets: official-only `cfae21c1d3b5b2c0`, combined release set `e073131f8ed6a1e9` (`out/publish-official2`, `out/rc-combined2`); validated with 0 unsound files and 0 manifest differences.
  Known leftover: item 11904 (Spirit of Aquementas) shows a dark halo because the client's own model gives its glow disc an opaque, unlit material (one of 3,229 models); two-texture batches keep shader 0.
* **Skin dropdown:** Skin is now the sixth Appearance button (default None, shop names, filtered by race and sex); the Character skins dialog is gone. Skin Color shows only the model's own colours.
* **Tests:** browser regression 47 of 47, skins matrix 224 of 224, JS suite 377 of 386 (the same 9 failures as before this work, none in the Dressing Room), Worker 43 of 43, Python model tests 75 (3 skipped without client data).
  The staging rollback test (`rollback_test.py`) needs a remote staging bucket and was not rerun: the uploader, backup and restore code did not change.

## Deployed 2026-11-22

* **Live asset version:** `e073131f8ed6a1e9` (was `8c2bbd319a49e0a6`). **Worker:** `octobot-population` version `e4cbba4f-8ccc-43fe-bdf1-612e7778ad81` (previous `2f969ef2-7d17-4608-a073-9d311a29eaaf`, number 20). Site: `main` at `9d4ad96` or later.
* **Authorisation:** OctoWoW confirmed the owner may use and redistribute the converted files and that no permission document is needed; the gate now takes `--owner-confirmed <build>` with `--backup` (see `publish_guard.mjs`). `PUBLISH_PERMISSION.json` was never created.
* **Backup:** the verified local copy of the old live build (23,370 keys, every file checked against its manifest; 23,368 keys re-fetched through the live Worker immediately before the upload with 0 differences) in `D:\Octowow\.eco-work\backup-live-8c2bbd319a49e0a6`, the previous Worker version details, and the 1,122 overwritten objects plus the old `version.json` in `D:\Octowow\.eco-work\release-2026-11-22\backup-overwritten` (restore with `upload_overlay.mjs <that folder> octobot-models --no-backup --force`, Worker first: `npx wrangler rollback 2f969ef2-7d17-4608-a073-9d311a29eaaf`).
* **Rollback proof:** `rollback_test.py` passed on a private staging bucket with the new uploader (132 keys, three restores, `version.json` and `helms.json` included).
* **Upload:** 6,178 new or changed files (of 23,598; the other 17,420 were verified identical to live), `version.json` last, after the Worker was deployed and checked against the old pointer. The first part went up one wrangler process per file, the rest with `--bulk` (one process per batch, low priority).
* **Verification:** every changed key compared with the manifest: 6,159 through the Worker, `helms.json` and the 19 `skins/*` keys (not served by the old Worker) read from the bucket; 0 differences.
* **Live checks:** Dressing Room (Skin dropdown sixth, None default, names and race/sex filtering, a skin applied on a Human man and a High Elf woman, shield on the left forearm, one-hand sword, shoulders, cloak, chest, glowing item without a black square, no failed requests), Population (all API calls 200), World Chat (history, deaths and live feed 200). 124 skins, 40 shop-named, Dreadskull Clan I and Necromancy II (Night Elf) still without a texture, six Probable matches unchanged.
* **Left over:** the private test bucket `octobot-models-rollbacktest` still exists (its cleanup was interrupted); it is not used by anything. Item 11904 still shows a dark halo (client data).

## Recovery build 2026-11-22 (local only, not deployed)

* **Builds:** `rc-combined3` version `3d17559b097507f6` (combined release set) and `publish-official3` version `99db69b3b41ebc4b` (official-only), made by `overlay_patch.py` from `rc-combined2` / `publish-official2`: 9 records replaced (the Embroidered Doublets), 36 textures and `meta/octobot/appearance-states.json` added, 27 unreferenced textures dropped. Every other file is byte-identical, so an upload sends 46 files.
  Folders: `D:\Octowow\.eco-work\skins\out3\` (not in Git).
* **Validation:** `validate_overlay.py`: 0 unsound, 0 manifest differences, 0 orphans, the same 690 known dangling helm texture references as before.
* **Coverage (13,919 pairs):** 6,372 verified (Zam), 7,435 recovered (7,407 before: +9 doublets, +2 single shoulders, +17 version-257 weapons looked at in the viewer), 52 invisible (the client defines nothing to draw), 44 incomplete, 16 unresolved. A model or the client's exact "nothing" for 13,859 pairs (99.57%); 13,807 with a model (99.20%, was 98.99%).
* **Worker:** a `states` route serves `meta/octobot/appearance-states.json` from the bucket only. It is not deployed; the page works without it (404 means every item is judged as before). Deploying needs the Worker deploy and the 46 files above plus `version.json` last.
* **Tests:** browser regression 62 of 62, skins matrix 224 of 224, JS suite 382 of 391 (the same 9 unrelated failures), Worker 44 of 44, Python model tests 90.

## Deployed 2026-11-22 (second release): recovery build `3d17559b097507f6`

* **Live asset version:** `3d17559b097507f6` (was `e073131f8ed6a1e9`). **Worker:** `octobot-population` version `a45ad4b5-6e28-4d6f-bd19-0253558a2884` (previous `e4cbba4f-8ccc-43fe-bdf1-612e7778ad81`), which adds the `meta/octobot/appearance-states.json` route. Site: `main` at `a6fef8e` or later.
* **Safeguards:** `--owner-confirmed 3d17559b097507f6 --backup` on the uploader, `OCTOBOT_OWNER_CONFIRMED=3d17559b097507f6` on the Worker deploy; no permission file.
* **Before:** live was verified equal to the previous build for the 36 keys the release overwrites or orphans (0 differences); the earlier backups were re-checked locally (old live build 23,370 keys, previous deploy's 1,122 overwritten objects, the previous build 23,599 keys: 0 problems).
* **Backup of this release:** the 9 overwritten records and the previous `version.json` in `D:\Octowow\.eco-work\release-2026-11-22b\backup-overwritten` (restore with `upload_overlay.mjs <that folder> octobot-models --no-backup --force`; Worker first: `npx wrangler rollback e4cbba4f-8ccc-43fe-bdf1-612e7778ad81`). The 27 old textures it no longer references stay in the bucket, unreferenced.
* **Upload:** 46 files in one bulk run (one wrangler process per batch, low priority), then the Worker, then all 46 verified byte-for-byte against the manifest through the Worker (0 differences), then `version.json` last.
* **Live checks:** states table read (112 pairs); icon kinds and colours (grey dashed invisible, yellow missing / unresolved / incomplete / estimated, red error); Embroidered Doublet, Hidden Mail Shoulders, shield and sword (slots 14 and 21), a Character Skin together on a Human man; Character Skins catalogue unchanged (124 skins, 40 shop-named, Dreadskull Clan I and Necromancy II still unavailable, six Probable matches); Population and World Chat load with every API call 200; no failed requests on the Dressing Room.
