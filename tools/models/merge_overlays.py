"""Merges the character overlay (build_overlay.py) and the item overlay (item_overlay.py build) into one upload folder.

    python tools/models/merge_overlays.py <character overlay> <item overlay> <out folder>

The bucket holds one set of files with one version fingerprint, so the two builds are combined into a single folder with a manifest in the
shape upload_overlay.mjs reads ({"files": {key: {bytes, sha256}}}) and a version.json computed the same way build_overlay.py does. A key present
in both builds must have identical content, otherwise this stops. If the character overlay has a .uploaded.json, it is copied across so the
upload sends only what is new. The out folder must be under tools/models/out or outside the repository (converted client files are never committed).
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


def walk(folder):
    for base, _, names in os.walk(folder):
        for name in names:
            path = os.path.join(base, name)
            yield os.path.relpath(path, folder).replace('\\', '/'), path


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 2
    characters, items, out = argv
    build_overlay.check_output_folder(out)
    if os.path.exists(out) and os.listdir(out):
        print('out folder is not empty')
        return 2
    skip = {'manifest.json', 'version.json', '.uploaded.json'}
    files, clashes = {}, []
    for folder in (characters, items):
        for key, path in walk(folder):
            if key in skip:
                continue
            data = open(path, 'rb').read()
            info = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
            if key in files:
                if files[key]['sha256'] != info['sha256']:
                    clashes.append(key)
                continue
            files[key] = info
            target = os.path.join(out, key)
            os.makedirs(os.path.dirname(target), exist_ok=True)
            shutil.copyfile(path, target)
    if clashes:
        print(f'{len(clashes)} keys differ between the two builds, for example {clashes[:5]}')
        return 1
    version = build_overlay.compute_version(files)
    version_bytes = json.dumps({'version': version, 'files': len(files)}).encode()
    open(os.path.join(out, 'version.json'), 'wb').write(version_bytes)
    files['version.json'] = {'bytes': len(version_bytes), 'sha256': hashlib.sha256(version_bytes).hexdigest()}
    json.dump({'version': version, 'files': files, 'totals': {'files': len(files), 'bytes': sum(f['bytes'] for f in files.values())}},
              open(os.path.join(out, 'manifest.json'), 'w'))
    state = os.path.join(characters, '.uploaded.json')
    if os.path.exists(state):
        done = json.load(open(state))
        json.dump({k: v for k, v in done.items() if k in files and files[k]['sha256'] == v and k != 'version.json'},
                  open(os.path.join(out, '.uploaded.json'), 'w'))
    print(f'{len(files)} files, version {version}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
