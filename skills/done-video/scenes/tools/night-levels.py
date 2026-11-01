# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=2,<3", "pillow>=10"]
# ///
"""Make the raster levels that the NightMap scene reads, from a factory night raster.

Usage: uv run scenes/tools/night-levels.py <brightness_5120x2560.png> <out dir>

The source is 8-bit, log-encoded, equirectangular (lon -180..180, lat 90..-90):
    v = 255 * log10(1 + r) / log10(1 + 38.2)        r in nW/(cm2 sr), top-coded at 38.2
Writes, into <out dir>:
    night-L0.png   the source, copied byte for byte (14.2 px per degree)
    night-L1.png   half size, each pixel the MAX of its 2 x 2 block (7.1 px per degree)
    night-L2.png   quarter size, MAX of 4 x 4 (3.6 px per degree)
    night-levels.json   where it came from, a hash of the source, the encoding, and the command
    night-levels.py     a copy of this script, so the output carries its own recipe

Why max and not mean: a world view draws about 3 to 5 screen pixels per degree, so a city 2 source pixels wide would
average down below the 1.0 cut and vanish. The maximum keeps every lit place visible at world scale. The levels are
for display only: no number in a video is read from them, and a zoomed view uses L0 (a pixel there is 7.8 km).
The levels are never edited by hand: run this again.
"""
import hashlib, json, shutil, sys
from pathlib import Path

import numpy as np
from PIL import Image

ENCODING = "v = 255 * log10(1 + r) / log10(1 + 38.2); r clipped to 38.2"


def maxpool(a: np.ndarray, k: int) -> np.ndarray:
    h, w = a.shape
    assert h % k == 0 and w % k == 0, f"{w}x{h} does not divide by {k}"
    return a.reshape(h // k, k, w // k, k).max(axis=(1, 3))


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, out = Path(sys.argv[1]).expanduser(), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    im = Image.open(src)
    if im.mode != "L" or im.size != (5120, 2560):
        sys.exit(f"expected an 8-bit 5120x2560 grayscale PNG, got {im.mode} {im.size}")
    a = np.array(im)
    shutil.copyfile(src, out / "night-L0.png")
    for name, k in (("night-L1.png", 2), ("night-L2.png", 4)):
        Image.fromarray(maxpool(a, k), "L").save(out / name, optimize=True)
    manifest = {
        "source": str(src),
        "source_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
        "grid": "equirectangular, lon -180..180 left to right, lat 90..-90 top to bottom",
        "encoding": ENCODING,
        "levels": [
            {"file": "night-L0.png", "size": [5120, 2560], "reduce": "none (the source)"},
            {"file": "night-L1.png", "size": [2560, 1280], "reduce": "max of 2x2"},
            {"file": "night-L2.png", "size": [1280, 640], "reduce": "max of 4x4"},
        ],
        "command": "uv run scenes/tools/night-levels.py <source> <out dir>",
    }
    (out / "night-levels.json").write_text(json.dumps(manifest, indent=2) + "\n")
    shutil.copyfile(__file__, out / "night-levels.py")
    print(f"wrote {out}: night-L0.png night-L1.png night-L2.png night-levels.json night-levels.py")


main()
