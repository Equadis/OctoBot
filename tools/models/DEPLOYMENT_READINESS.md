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
