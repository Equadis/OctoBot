# OctoWoW model conversion project

Goal: show OctoWoW's Goblin and High Elf (Blood Elf) character models in the Dressing Room. The site's 3D viewer is Zam's, and its Classic model library has Goblin but no Blood Elf. The OctoWoW client has both.

## Rules for this project

* **Extracted game files never go in this repository.** `tools/models/out/` is ignored. Only code and notes are committed.
* **Nothing derived from client files is published** (no converted models, textures or data tables) until the OctoWoW team has agreed. This includes Cloudflare R2 or any public host. Local use on your own machine is fine.
* The tools only read the client; they never modify it.

## What the client contains (verified 2026-11-15, `D:\Octowow\Data`)

| Model | Where | Format |
|---|---|---|
| Goblin male and female | `model.MPQ`, `patch.MPQ`, `patch-3/4/5.mpq` (newest in `patch-5.mpq`) | `MD20`, version 256 |
| Blood Elf male and female (High Elf) | `patch-3/4/5.mpq` (newest in `patch-5.mpq`) | `MD20`, version 256 |

No separate `HighElf` model files exist, so High Elves use the Blood Elf models. Later patches replace earlier ones, so `patch-5.mpq` wins.

## What the viewer needs

Loaded for a Goblin (captured from the Dressing Room, `?conv`): `meta/character/<id>.json`, `meta/charactercustomization/<id>.json`, `m2/<fileId>.m2`, `skin/<fileId>.skin`, `skel/<fileId>.skel` and `textures/<fileId>.webp`.

Zam's M2 is the modern chunked format: an `MD21` chunk holding an `MD20` of version 274, followed by `TXAC`, `LDV1`, `SKID` (skeleton file), `SFID` (skin files) and `TXID` (texture files). Bones, sequences and attachments live in the `.skel`, geometry views live in the `.skin`.

The client's models are the old single-file form: version 256 with embedded views and external `.anim` files. They must be converted.

## Plan

1. **Tools (done).** `octo_mpq.py` finds and extracts named files from the client archives.
2. **M2 reader.** Parse version 256 fully: vertices, bones and their tracks, sequences, textures, materials, texture units, attachments, and the external `.anim` files.
3. **Writer.** Emit the modern form: an `MD21` M2 (version 274) with `SFID`, `TXID` and `SKID` chunks, a `.skin`, and a `.skel` with bones, sequences and attachments.
4. **Textures.** Decode BLP and write WebP (with the skin, hair and face variants).
5. **Proof of concept.** Goblin male, default skin, rendered in the Zam viewer from a local asset folder.
6. **Customisation.** Build `charactercustomization` JSON (skin colour, face, hair, markings) from the client's `CharSections` tables.
7. **Equipment.** Armour needs the model's attachment points and texture regions to match what the viewer expects.
8. **Both bodies and High Elf.** Repeat for female and Blood Elf.
9. **Hosting.** Only with OctoWoW's agreement (see the rules above).

Steps 2, 3 and 6 are the hard ones. Expect weeks, not hours, to reach step 7.

## Cheaper alternative for High Elf

Zam's TBC library already has Blood Elf (`tbc/meta/character/19.json` and `20.json` exist). Supporting it needs only a small change to the appearance Worker so it can serve the TBC library, plus a deploy. It is the TBC Blood Elf model, which may not match OctoWoW's updated model exactly.

## Commands

```sh
# Which archives hold a file?
python tools/models/octo_mpq.py probe "D:/Octowow/Data" "Character\Goblin\Male\GoblinMale.m2"
# Extract to the ignored output folder
python tools/models/octo_mpq.py extract "D:/Octowow/Data/patch-5.mpq" tools/models/out "Character\Goblin\Male\GoblinMale.m2"
```
