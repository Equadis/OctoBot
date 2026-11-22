"""Compares every texture that differs between two overlay folders (for example the live build and an official-only rebuild).

    python tools/models/texture_diff.py <current folder> <replacement folder> <out.json>

For each textures/<id>.webp whose bytes differ it records both sizes and the mean colour difference of the two images shrunk to 32 by 32 (0 = identical,
about 3 = the same art at another resolution, 40 or more = different art or a different layout), and the alpha difference. Prints the size classes and
the largest outliers; textures present only in the current folder are listed as `gone`. Nothing is judged here: look at the outliers (pairsheet) before deciding.
"""
import collections
import hashlib
import json
import os
import sys
from PIL import Image
from PIL import ImageChops, ImageStat

live, off, OUT = sys.argv[1].rstrip("/") + "/", sys.argv[2].rstrip("/") + "/", sys.argv[3]
live_m = json.load(open(live + "manifest.json"))["files"]
off_files = {}
for base, _, names in os.walk(off):
    for n in names:
        rel = os.path.relpath(os.path.join(base, n), off).replace(chr(92), "/")
        off_files[rel] = 1
changed = [k for k in live_m if k.startswith("textures/") and k in off_files and k != "version.json"]
# only those whose bytes differ
diff = []
for k in changed:
    a = hashlib.sha256(open(live + k, "rb").read()).hexdigest()
    b = hashlib.sha256(open(off + k, "rb").read()).hexdigest()
    if a != b:
        diff.append(k)
gone = [k for k in live_m if k.startswith("textures/") and k not in off_files]
print("textures that differ:", len(diff), "only live (gone):", len(gone))


def load(path):
    im = Image.open(path)
    im.load()
    return im.convert("RGBA")


rows = []
cls = collections.Counter()
for k in diff:
    a, b = load(live + k), load(off + k)
    sa, sb = a.resize((32, 32), Image.BOX), b.resize((32, 32), Image.BOX)
    mad = sum(ImageStat.Stat(ImageChops.difference(sa.convert("RGB"), sb.convert("RGB"))).mean) / 3
    alpha_diff = ImageStat.Stat(ImageChops.difference(sa.getchannel("A"), sb.getchannel("A"))).mean[0]
    ratio = a.width / b.width if b.width else 0
    kind = "same-size-different-pixels" if a.size == b.size else ("HD is %gx larger" % ratio if a.width > b.width else "official larger")
    rows.append({"key": k, "live": a.size, "official": b.size, "mad": round(mad, 2), "alpha": round(alpha_diff, 2), "kind": kind})
    cls[kind] += 1
print(cls.most_common())
mads = sorted(r["mad"] for r in rows)
pc = lambda p: mads[min(len(mads) - 1, int(len(mads) * p))]
print("mean abs colour difference at 32px: median %.1f  p90 %.1f  p99 %.1f  max %.1f" % (pc(.5), pc(.9), pc(.99), mads[-1]))
outl = sorted(rows, key=lambda r: -r["mad"])[:40]
alpha_bad = [r for r in rows if r["alpha"] > 8]
print("alpha channel differs by >8:", len(alpha_bad))
json.dump({"differing": rows, "gone": gone}, open(OUT, "w"))
for r in outl[:25]:
    print(r)
