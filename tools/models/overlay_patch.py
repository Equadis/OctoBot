"""Applies a small overlay on top of a finished upload folder and writes a new one: the base files unchanged, the patch's files added or replaced.

    python tools/models/overlay_patch.py <base folder> <patch folder> <out folder>

Used for a second pass over a build (item_overlay.py extra, the appearance states table): the base keeps every id and every file name it had, so only
the patched keys differ from it. A `.remove.json` in the patch folder (a list of keys) drops files from the base: the ones a replaced record no longer uses. The out folder gets a manifest.json and version.json computed the way merge_overlays.py does, and a report of what
changed (added, replaced) is printed. The out folder must be under tools/models/out or outside the repository (converted client files are never committed).
Nothing is uploaded here.
"""
import hashlib
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_overlay  # noqa: E402

SKIP = {'manifest.json', 'version.json', '.uploaded.json'}


def walk(folder):
    for base, _, names in os.walk(folder):
        for name in names:
            path = os.path.join(base, name)
            yield os.path.relpath(path, folder).replace('\\', '/'), path


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    base, patch, out = argv
    build_overlay.check_output_folder(out)
    if os.path.exists(out) and os.listdir(out):
        print('out folder is not empty')
        return 2
    remove_file = os.path.join(patch, '.remove.json')
    remove = set(json.load(open(remove_file))) if os.path.exists(remove_file) else set()
    files = {}
    for key, path in walk(base):
        if key in SKIP or key in remove:
            continue
        target = os.path.join(out, key)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(path, target)
        data = open(path, 'rb').read()
        files[key] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    added, replaced, same = [], [], 0
    for key, path in walk(patch):
        if key in SKIP or key == '.remove.json':
            continue
        data = open(path, 'rb').read()
        info = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        if key in files and files[key]['sha256'] == info['sha256']:
            same += 1
            continue
        (replaced if key in files else added).append(key)
        target = os.path.join(out, key)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(path, target)
        files[key] = info
    version = build_overlay.compute_version(files)
    version_bytes = json.dumps({'version': version, 'files': len(files)}).encode()
    open(os.path.join(out, 'version.json'), 'wb').write(version_bytes)
    files['version.json'] = {'bytes': len(version_bytes), 'sha256': hashlib.sha256(version_bytes).hexdigest()}
    json.dump({'version': version, 'files': files, 'totals': {'files': len(files), 'bytes': sum(f['bytes'] for f in files.values())}},
              open(os.path.join(out, 'manifest.json'), 'w'))
    print(f'{len(files)} files, version {version}: {len(added)} added, {len(replaced)} replaced, {len(remove)} dropped, {same} identical in the patch')
    for key in replaced[:20]:
        print('  replaced', key)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
