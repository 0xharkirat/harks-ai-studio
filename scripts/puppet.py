# /// script
# requires-python = ">=3.11"
# dependencies = ["psd-tools>=1.24,<2", "opencv-python-headless>=5,<6", "numpy>=2,<3"]
# ///
"""Turn a Character Animator style PSD into the layers the camera-box puppet draws.

Usage: uv run scripts/puppet.py <puppet.psd> <public/puppet dir> <src/puppet.json>

The PSD needs a "Head" group holding a "Mouth" group with one layer per mouth shape
(Character Animator names: Neutral, M, S, D, Ah, Oh, W-Oo, F, L, ...), and an optional "Body" group.
Eyes stay painted into the head art: the eye whites are found, and 3 lid stages are drawn over them for blinks.
Writes body.png, head.png, eyes_35/70/100.png and mouths/<name>.png, plus a manifest of where each sits.
"""
import json, sys
from pathlib import Path
import numpy as np, cv2
from psd_tools import PSDImage

# The mouth layers src/mouth.ts maps Rhubarb's shapes onto.
NEEDED = ['Neutral', 'M', 'S', 'D', 'Ah', 'Oh', 'W-Oo', 'F', 'L']
LIDS = (0.35, 0.7, 1.0)  # how far down each blink overlay brings the lid
LASH = np.array([0.11, 0.07, 0.06], np.float32)

psd_path, out, manifest_path = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
psd = PSDImage.open(psd_path)
W, H = psd.size

def group(name, root=psd):
    for layer in root.descendants():
        if layer.is_group() and layer.name == name:
            return layer
    return None

def fail(message):
    sys.exit(f'puppet.py: {psd_path.name}: {message}')

head_group, body_group = group('Head'), group('Body')
mouth_group = group('Mouth', head_group) if head_group else None
if head_group is None or mouth_group is None:
    fail('needs a "Head" group with a "Mouth" group inside it')
mouths = {l.name: l for l in mouth_group if not l.is_group()}
missing = [m for m in NEEDED if m not in mouths]
if missing:
    fail(f'the Mouth group lacks {", ".join(missing)}')

def flatten(layers):
    """Composite pixel layers bottom to top into a float RGBA canvas the size of the PSD."""
    canvas = np.zeros((H, W, 4), np.float32)
    for layer in layers:
        im = np.asarray(layer.topil().convert('RGBA'), np.float32) / 255
        # Exports often top out just under full alpha (253 here); stretch so solid paint is opaque,
        # and drop the faint haze a removed glow or background leaves behind.
        top = float(im[..., 3].max())
        a = np.clip(im[..., 3:4] / (top if top >= 0.95 else 1.0), 0, 1) * (layer.opacity / 255)
        a[a < 8 / 255] = 0
        dst = canvas[layer.top:layer.bottom, layer.left:layer.right]
        out_a = a + dst[..., 3:4] * (1 - a)
        rgb = (im[..., :3] * a + dst[..., :3] * dst[..., 3:4] * (1 - a)) / np.maximum(out_a, 1e-6)
        canvas[layer.top:layer.bottom, layer.left:layer.right] = np.concatenate([rgb, out_a], -1)
    return canvas

def pixels(root, skip=None):
    """Visible pixel layers under root, bottom to top, leaving out the skip group."""
    inside = {id(l) for l in skip.descendants()} if skip else set()
    return [l for l in root.descendants() if not l.is_group() and l.visible and id(l) not in inside and l.width and l.height]

def save(arr, path):
    img = cv2.cvtColor((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), cv2.COLOR_RGBA2BGRA)
    ys, xs = np.nonzero(img[..., 3])
    if len(xs) == 0:
        fail(f'{path.name} came out empty')
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    cv2.imwrite(str(path), img[y0:y1, x0:x1])
    return {'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}

(out / 'mouths').mkdir(parents=True, exist_ok=True)
manifest = {'canvas': {'w': W, 'h': H}}
if body_group is not None and pixels(body_group):
    manifest['body'] = save(flatten(pixels(body_group)), out / 'body.png')
head = flatten(pixels(head_group, skip=mouth_group))
manifest['head'] = save(head, out / 'head.png')

# Frame the camera box on the head, and pivot the head sway near the neck.
hx, hy, hw, hh = (manifest['head'][k] for k in 'xywh')
size = round(hh * 1.14)
manifest['frame'] = {'x': round(hx + hw / 2 - size / 2), 'y': round(hy - hh * 0.05), 'size': size}
manifest['pivot'] = {'x': round(hx + hw / 2), 'y': round(hy + hh * 0.98)}

# Eyes: the two biggest near-white blobs side by side in the head art are the eye whites.
# The iris splits each eye white in two, so bridge small horizontal gaps before counting blobs.
rgb8 = (head[..., :3] * 255).astype(np.uint8)
alpha = head[..., 3] > 0.5
white = (alpha & (rgb8.min(-1) > 200) & (rgb8.max(-1).astype(int) - rgb8.min(-1) < 45)).astype(np.uint8)
bridged = cv2.morphologyEx(white, cv2.MORPH_CLOSE, np.ones((1, max(3, round(hw * 0.1))), np.uint8))
n, lab, stats, cent = cv2.connectedComponentsWithStats(bridged, connectivity=8)
blobs = sorted(range(1, n), key=lambda i: -stats[i, cv2.CC_STAT_AREA])[:6]
pair = next(((a, b) for i, a in enumerate(blobs) for b in blobs[i + 1:]
             if abs(cent[a][1] - cent[b][1]) < hh * 0.06 and abs(cent[a][0] - cent[b][0]) > hw * 0.12), None)
lab_img = cv2.cvtColor(rgb8, cv2.COLOR_RGB2LAB).astype(np.float32)

def eye_mask(i):
    """The eye (white, iris, lash line): the non-skin region around one eye white, skin sampled from the cheek below."""
    x, y, w, h = (int(stats[i, k]) for k in (cv2.CC_STAT_LEFT, cv2.CC_STAT_TOP, cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT))
    cy0, cy1 = y + h + h // 2, y + 2 * h + h // 2
    skin = np.median(lab_img[cy0:cy1, x:x + w][alpha[cy0:cy1, x:x + w]].reshape(-1, 3), 0)
    x0, x1, y0, y1 = max(0, x - w // 3), min(W, x + w + w // 3), max(0, y - h), min(H, y + 2 * h)
    other = (np.linalg.norm(lab_img[y0:y1, x0:x1] - skin, axis=-1) > 30).astype(np.uint8)
    _, comp = cv2.connectedComponents(other, connectivity=4)
    sy, sx = np.argwhere((lab[y0:y1, x0:x1] == i) & (white[y0:y1, x0:x1] > 0))[0]  # a real white pixel as the seed
    m = np.zeros((H, W), np.uint8)
    m[y0:y1, x0:x1] = comp == comp[sy, sx]
    if m.sum() > 4 * stats[i, cv2.CC_STAT_AREA]:
        return None  # leaked into hair or brows: no safe lid
    return m

eyes = [m for m in (eye_mask(i) for i in pair) if m is not None] if pair else []
manifest['eyes'] = []
if len(eyes) != 2:
    print(f'puppet.py: no clean pair of eyes found in {psd_path.name}; the puppet will not blink', file=sys.stderr)
else:
    grown = [cv2.dilate(m, np.ones((3, 3), np.uint8)) for m in eyes]
    skinned = cv2.inpaint(rgb8, grown[0] | grown[1], 6, cv2.INPAINT_TELEA).astype(np.float32) / 255
    ss = 4  # supersample the lash line so it is smooth
    for k in LIDS:
        ov = np.zeros((H, W, 4), np.float32)
        for m in grown:
            ys, xs = np.nonzero(m)
            x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            cols = [(x, *np.nonzero(m[:, x])[0][[0, -1]]) for x in range(x0, x1)]
            px = np.array([c[0] for c in cols], float)
            # Smooth lid and lower-lid curves: cubic fits of the raw per-column edges.
            top = np.array([c[1] for c in cols], float); bot = np.array([c[2] for c in cols], float)
            lid = np.polyval(np.polyfit(px, top + k * (bot - top), 3), px)
            low = np.polyval(np.polyfit(px, bot, 3), px)
            for (x, _, _), y in zip(cols, lid):
                cover = (np.arange(H) <= y) & (m[:, x] > 0)
                ov[cover, x, :3] = skinned[cover, x]; ov[cover, x, 3] = 1
            # The lash line: thick in the middle, thin at the corners.
            big = np.zeros(((y1 - y0 + 8) * ss, (x1 - x0 + 8) * ss), np.uint8)
            r = 1.9 * (0.4 + 0.6 * np.sin(np.pi * np.linspace(0, 1, len(px))))
            cy = np.minimum(lid, low - 1)
            sx = (px + 0.5 - x0 + 4) * ss
            edge = np.concatenate([np.stack([sx, (cy - r - y0 + 4) * ss], 1), np.stack([sx, (cy + r - y0 + 4) * ss], 1)[::-1]])
            cv2.fillPoly(big, [np.round(edge * 16).astype(np.int32)], 255, cv2.LINE_AA, shift=4)
            a = cv2.resize(big, (x1 - x0 + 8, y1 - y0 + 8), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
            reg = ov[y0 - 4:y1 + 4, x0 - 4:x1 + 4]
            reg[..., :3] = reg[..., :3] * (1 - a) + LASH * a
            reg[..., 3:] = np.maximum(reg[..., 3:], a)
        manifest['eyes'].append({'k': k, 'src': f'eyes_{round(k * 100)}.png', **save(ov, out / f'eyes_{round(k * 100)}.png')})

# Every mouth layer, cut to the Mouth group's box so they all stack on one spot.
mx0 = min(l.left for l in mouths.values()); my0 = min(l.top for l in mouths.values())
mx1 = max(l.right for l in mouths.values()); my1 = max(l.bottom for l in mouths.values())
manifest['mouth'] = {'x': mx0, 'y': my0, 'w': mx1 - mx0, 'h': my1 - my0, 'shapes': sorted(mouths)}
for name, layer in mouths.items():
    m = (np.clip(flatten([layer]), 0, 1) * 255 + 0.5).astype(np.uint8)[my0:my1, mx0:mx1]
    cv2.imwrite(str(out / 'mouths' / f'{name}.png'), cv2.cvtColor(m, cv2.COLOR_RGBA2BGRA))

manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'puppet: {len(mouths)} mouths, {"blinks" if manifest["eyes"] else "no blinks"}, from {psd_path.name}')
