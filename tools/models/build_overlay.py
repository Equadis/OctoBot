"""Builds the whole overlay of converted Goblin and Blood Elf files in one command (README step 9).

    python tools/models/build_overlay.py <Data folder> <out folder> [--no-helms] [--only 9:0,10:1] [--limit-helms N]
                                         [--custom-helms ids.json] [--custom-only]

Writes, under the out folder:
    m2/ skin/ skel/ textures/            converted files, named by invented file ids (bodies from 9,000,000, customisation textures from
                                         9,100,000, helm models from 9,500,000)
    meta/character/<id>.json             Goblin 17 (male) and 18 (female), Blood Elf 19 and 20, in the shape Zam's viewer reads
    meta/charactercustomization/<id>.json
    helms.json                           Classic helm display id -> {"race:gender": model file id}; for the Worker to merge into Zam's own
                                         helm item data (Zam has helm models for races 1 to 8 only)
    meta/armor/1/<id>.json               (with --custom-helms) complete item records for OctoWoW helm looks Zam has none for, with their models
                                         from 9,700,000 and textures from 9,900,000 (see custom_helms.py); --custom-only builds just these
    version.json                         {"version": a fingerprint of every file}; the Worker reports it and the site puts it in asset URLs, so a
                                         rebuilt model set can never be served from an old browser cache
    manifest.json                        every file with its size and sha256, plus counts, missing textures and verification results

Ids are assigned in sorted order, so a rerun on the same client files gives the same ids. The out folder must be OUTSIDE the repository
(or under tools/models/out, which git ignores): converted game files must never be committed. Nothing is uploaded; uploading is a manual
step that needs OctoWoW's agreement (see the rules in README.md).
"""
import hashlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blp  # noqa: E402
import customisation  # noqa: E402
import custom_helms  # noqa: E402
import helms  # noqa: E402
import m2v274  # noqa: E402
import octo_mpq  # noqa: E402

REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
BODIES = {   # (race, gender): (client model path, viewer character id)
    (9, 0): ('Character/Goblin/Male/GoblinMale.m2', 17), (9, 1): ('Character/Goblin/Female/GoblinFemale.m2', 18),
    (10, 0): ('Character/BloodElf/Male/BloodElfMale.m2', 19), (10, 1): ('Character/BloodElf/Female/BloodElfFemale.m2', 20),
}
BODY_FIRST_ID = 9000000
BODY_STRIDE = 100
# Zam's own Goblin character record, which the viewer accepts as a template (RaceFlags and ChrModelFlags copied from it).
CHARACTER_TEMPLATE = {'Textures': None, 'Textures2': None, 'TextureFiles': None, 'ModelFiles': None, 'Item': None, 'Creature': None,
                      'ItemEffects': None, 'Equipment': None, 'ComponentTextures': None, 'ComponentModels': None, 'StateKits': None,
                      'Decor': None, 'Scale': 1}


class UnsafeOutput(Exception):
    pass


def is_within(path, folder):
    """True when path is the folder or inside it. A path on another drive (Windows) is never inside."""
    try:
        return os.path.commonpath([os.path.abspath(path), os.path.abspath(folder)]) == os.path.abspath(folder)
    except ValueError:
        return False


def check_output_folder(path):
    """Refuses a folder inside the repository unless it is the git-ignored tools/models/out."""
    out = os.path.abspath(path)
    inside = is_within(out, REPO)
    ignored = is_within(out, os.path.join(REPO, 'tools', 'models', 'out'))
    if inside and not ignored:
        raise UnsafeOutput(f'{out} is inside the repository; converted game files must not be committed. Use a folder outside it or tools/models/out.')
    return out


def write(out, rel, data, manifest):
    path = os.path.join(out, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as handle:
        handle.write(data)
    manifest['files'][rel.replace('\\', '/')] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def compute_version(files):
    """A short fingerprint of every file in the build (key and sha256, sorted), version.json itself excluded. The site puts it in asset URLs, so
    it changes exactly when any file changes and never otherwise."""
    lines = [f'{key}:{info["sha256"]}' for key, info in sorted(files.items()) if key != 'version.json']
    return hashlib.sha256('\n'.join(lines).encode()).hexdigest()[:16]


def character_record(model_id, race, gender, chr_model_id):
    return dict(CHARACTER_TEMPLATE, Model=model_id,
                Character={'RaceFlags': 1, 'ChrModelFlags': 0, 'Race': race, 'Gender': gender, 'ChrModelId': chr_model_id})


def build(data_folder, out, only=None, with_helms=True, helm_limit=None, log=print, custom_ids=None, bodies=True):
    out = check_output_folder(out)
    client = octo_mpq.Client(data_folder)
    manifest = {'files': {}, 'bodies': {}, 'missing_textures': [], 'verification': {}, 'helms': {}}
    textures = {}                      # client texture path (upper case) -> file id, shared by every body
    started = time.time()
    for k, ((race, gender), (path, chr_id)) in enumerate(sorted(BODIES.items())):
        if not bodies or (only and (race, gender) not in only):
            continue
        data = client.read(path)
        if data is None:
            raise FileNotFoundError(f'{path} not found in the client')
        files, ids = m2v274.convert(data, BODY_FIRST_ID + BODY_STRIDE * k)
        ok, bad = m2v274.verify(data, files)
        manifest['verification'][f'{race}:{gender}'] = {'passed': len(ok), 'failed': bad}
        if bad:
            raise RuntimeError(f'{path}: verification failed: {bad}')
        for rel, blob in files.items():
            write(out, rel, blob, manifest)
        for tex_path, tex_id in ids['textures'].items():
            textures[tex_path] = tex_id          # file textures the model itself names
        builder = customisation.Builder(client, textures)
        cust = builder.build(race, gender)
        for path_ in builder.missing:
            if path_ not in manifest['missing_textures']:
                manifest['missing_textures'].append(path_)
        write(out, f'meta/charactercustomization/{chr_id}.json', json.dumps(cust).encode(), manifest)
        write(out, f'meta/character/{chr_id}.json', json.dumps(character_record(ids['model'], race, gender, chr_id)).encode(), manifest)
        manifest['bodies'][f'{race}:{gender}'] = {'character_id': chr_id, 'model_file_id': ids['model'], 'skin_file_id': ids['skin'], 'skel_file_id': ids['skel'],
                                                   'options': {o['Name']: len(o['Choices']) for o in cust['Options']}}
        log(f'body {race}:{gender} {path}: {len(files)} files, {sum(len(o["Choices"]) for o in cust["Options"])} choices')
    for tex_path, tex_id in sorted(textures.items(), key=lambda kv: kv[1]):
        data = client.read(tex_path)
        if data is None:
            manifest['missing_textures'].append(tex_path)
            continue
        write(out, f'textures/{tex_id}.webp', blp.blp_to_webp(data)[0], manifest)
    if bodies:
        log(f'textures: {len(textures) - len(manifest["missing_textures"])} written, {len(manifest["missing_textures"])} missing')
    if with_helms and bodies:
        converter = helms.HelmConverter(client)
        wanted = sorted(d for d in converter.info.rows if (converter.info.model(d) or '').lower().startswith('helm'))
        if helm_limit:
            wanted = wanted[:helm_limit]
        table = {}
        for display_id in wanted:
            found, files = converter.convert(display_id)
            if found:
                # models: which converted file each body wears; hide: the geoset groups the client says this helm hides on each body. The Worker
                # replaces Zam's rows for races 9 and 10 with these, because for the Goblin group 1 is the head itself.
                table[str(display_id)] = {'models': found, 'hide': {k: v for k, v in converter.hide(display_id).items() if k in found}}
            for rel, blob in files.items():
                if rel not in manifest['files']:
                    write(out, rel, blob, manifest)
        write(out, 'helms.json', json.dumps(table, sort_keys=True).encode(), manifest)
        manifest['helms'] = {'display_ids': len(table), 'models': sum(1 for v in converter.done.values() if v), 'failed': converter.failed}
        log(f'helms: {len(table)} display ids, {manifest["helms"]["models"]} models, {len(converter.failed)} unusable')
    if custom_ids:
        manifest['custom_helms'] = custom_helms.build_all(client, custom_ids, lambda rel, blob: write(out, rel, blob, manifest), log=log)
    version = compute_version(manifest['files'])
    write(out, 'version.json', json.dumps({'version': version, 'files': len(manifest['files'])}).encode(), manifest)
    manifest['version'] = version
    manifest['seconds'] = round(time.time() - started, 1)
    manifest['totals'] = {'files': len(manifest['files']), 'bytes': sum(f['bytes'] for f in manifest['files'].values())}
    with open(os.path.join(out, 'manifest.json'), 'w') as handle:
        json.dump(manifest, handle, indent=1, sort_keys=True)
    log(f'version {version}')
    log(f'done: {manifest["totals"]["files"]} files, {manifest["totals"]["bytes"] / 1e6:.1f} MB, {manifest["seconds"]} s -> {out}')
    return manifest


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if len(args) < 2:
        print(__doc__)
        return 2
    only, limit, custom_ids = None, None, None
    for i, a in enumerate(argv):
        if a == '--only':
            only = {tuple(int(x) for x in p.split(':')) for p in argv[i + 1].split(',')}
            args = [x for x in args if x != argv[i + 1]]
        if a == '--limit-helms':
            limit = int(argv[i + 1])
            args = [x for x in args if x != argv[i + 1]]
        if a == '--custom-helms':
            with open(argv[i + 1]) as handle:
                custom_ids = [int(x) for x in json.load(handle)]
            args = [x for x in args if x != argv[i + 1]]
    try:
        build(args[0], args[1], only=only, with_helms='--no-helms' not in argv, helm_limit=limit,
              custom_ids=custom_ids, bodies='--custom-only' not in argv)
    except UnsafeOutput as error:
        print('refused:', error)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
