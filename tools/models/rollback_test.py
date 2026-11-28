"""Proves that a replacement upload can be undone, against a PRIVATE STAGING BUCKET (never the live one).

    python tools/models/rollback_test.py <current build folder> <replacement build folder> <staging bucket> <work folder> [--keys N]

Builds two small folders from the two builds (the files that differ between them, a spread of unchanged files, the character metadata, helms.json and
version.json, plus a few files only the current build has), then, with upload_overlay.mjs and wrangler against <staging bucket>:
  1. uploads the current subset (the staging bucket now looks like the live bucket did),
  2. uploads the replacement subset with --backup (what a real replacement would do),
  3. checks every key now holds the replacement bytes,
  4. restores from the backup folder (the documented rollback) and checks every key holds the CURRENT bytes again, version.json included,
  5. restores a second time (harmless), replaces again and restores a third time (--force, because the backup folder remembers its first restore).
It refuses a bucket named like the live one. The staging bucket must exist; delete it afterwards (npx wrangler r2 bucket delete <name>).
Nothing here touches the Worker: the Worker rolls back with `npx wrangler rollback <version id>` (see tools/models/README.md).
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
WRANGLER_DIR = os.path.join(REPO, 'cloudflare', 'population')
LIVE_BUCKET = 'octobot-models'


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def walk(folder):
    for base, _, names in os.walk(folder):
        for name in names:
            path = os.path.join(base, name)
            yield os.path.relpath(path, folder).replace('\\', '/'), path


def pick(current, replacement, count):
    cur, rep = dict(walk(current)), dict(walk(replacement))
    skip = {'manifest.json', '.uploaded.json'}
    changed = sorted(k for k in cur if k in rep and k not in skip and sha(cur[k]) != sha(rep[k]))
    only_current = sorted(k for k in cur if k not in rep and k not in skip)
    same = sorted(k for k in cur if k in rep and k not in skip and k not in changed)
    always = [k for k in same + changed if k in ('helms.json', 'version.json') or k.startswith(('meta/character/', 'meta/charactercustomization/'))]
    keys = list(dict.fromkeys(always + changed[:count] + only_current[:3] + same[::max(1, len(same) // count)][:count]))
    return keys, cur, rep, changed, only_current


def build_folder(out, keys, source):
    shutil.rmtree(out, ignore_errors=True)
    files = {}
    for key in keys:
        if key not in source:
            continue
        target = os.path.join(out, key)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        shutil.copyfile(source[key], target)
        files[key] = {'bytes': os.path.getsize(target), 'sha256': sha(target)}
    json.dump({'files': files}, open(os.path.join(out, 'manifest.json'), 'w'))
    return files


def node(*args):
    result = subprocess.run(['node', os.path.join(HERE, 'upload_overlay.mjs'), *args], capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=REPO)
    print(result.stdout.strip().splitlines()[-1] if result.stdout.strip() else result.stderr.strip()[-300:], flush=True)
    return result.returncode


def fetch(bucket, key, target):
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if os.path.exists(target):
        os.remove(target)
    r = subprocess.run(f'npx --yes wrangler r2 object get "{bucket}/{key}" --file "{target}" --remote', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=WRANGLER_DIR)
    return sha(target) if os.path.exists(target) else None


def check(bucket, expected, work, label):
    scratch = os.path.join(work, 'check-' + label)
    shutil.rmtree(scratch, ignore_errors=True)
    wrong = [k for k, info in expected.items() if fetch(bucket, k, os.path.join(scratch, k)) != info['sha256']]
    print(f'  {label}: {len(expected) - len(wrong)} of {len(expected)} keys hold the expected bytes' + (f'; WRONG: {wrong[:5]}' if wrong else ''))
    return not wrong


def main(argv):
    skip = {argv.index('--keys') + 1} if '--keys' in argv else set()
    args = [a for i, a in enumerate(argv) if not a.startswith('--') and i not in skip]
    if len(args) != 4:
        print(__doc__)
        return 2
    current, replacement, bucket, work = args
    count = int(argv[argv.index('--keys') + 1]) if '--keys' in argv else 40
    if bucket == LIVE_BUCKET or not bucket.endswith(('test', 'staging', 'rollbacktest')):
        print('refusing: use a private staging bucket whose name ends in test or staging, never the live bucket')
        return 2
    keys, cur, rep, changed, only_current = pick(current, replacement, count)
    print(f'{len(keys)} keys: {len([k for k in keys if k in changed])} changed, {len([k for k in keys if k in only_current])} only in the current build')
    a_dir, b_dir, backup = (os.path.join(work, n) for n in ('A-current', 'B-replacement', 'backup'))
    shutil.rmtree(backup, ignore_errors=True)
    a_files = build_folder(a_dir, keys, cur)
    b_files = build_folder(b_dir, keys, rep)
    ok = True
    print('1. upload the current subset'); ok &= node(a_dir, bucket, '--no-backup', '--rate', '3') == 0
    ok &= check(bucket, a_files, work, 'staging equals current')
    print('2. upload the replacement subset with --backup'); ok &= node(b_dir, bucket, '--backup', backup, '--rate', '3') == 0
    expected_b = dict(a_files)
    expected_b.update(b_files)                         # keys only the current build has stay as they were
    ok &= check(bucket, expected_b, work, 'staging equals replacement')
    saved = json.load(open(os.path.join(backup, 'manifest.json')))['files']
    print(f'   backup holds {len(saved)} objects; every changed key in it: {all(k in saved for k in keys if k in changed)}')
    print('3. roll back from the backup'); ok &= node(backup, bucket, '--no-backup', '--rate', '3') == 0
    ok &= check(bucket, a_files, work, 'after rollback equals current')
    print('4. roll back again with nothing to undo (harmless)'); ok &= node(backup, bucket, '--no-backup', '--force', '--rate', '3') == 0
    ok &= check(bucket, a_files, work, 'after second rollback equals current')
    print('5. replace again, then roll back a second time from the same backup (needs --force: the backup folder remembers its first restore)')
    ok &= node(b_dir, bucket, '--no-backup', '--force', '--rate', '3') == 0
    ok &= check(bucket, expected_b, work, 'staging equals replacement again')
    ok &= node(backup, bucket, '--no-backup', '--force', '--rate', '3') == 0
    ok &= check(bucket, a_files, work, 'after the second real rollback equals current')
    print('RESULT:', 'rollback restores the current build, version.json and helms.json included' if ok else 'ROLLBACK FAILED')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
