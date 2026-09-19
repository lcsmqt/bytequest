"""Turn a world mockup into a game backdrop.
- paints out the characters baked into the mockup (the real sprites/NPCs are spawned by the game)
- resizes to 1344x1024 (pixelArt:true = nearest-neighbour, so we pre-resize with LANCZOS)

Usage: python scripts/prep_backdrop.py <src.png> <out-name> "<x0,y0,x1,y1[;x0,y0,x1,y1...]>" [diffuse|patch]
  boxes are native px around each baked-in character.
  diffuse (default): Laplace diffusion + borrowed noise — fine for one small patch on grass/dirt (blurry on patterns).
  patch: copies the best-matching same-size patch from the surroundings (edge colours must agree) and feathers the
         seam — keeps cobblestone / brick texture, use it on patterned floors.
  e.g. variable-valley "Imagens/...(3).png" 536,526,672,630
       academy (patch) "Imagens/...(1).png" "500,545,605,660;748,858,805,940;..." patch
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
OUT = f"public/assets/worlds/{sys.argv[2]}.png"
boxes = [tuple(map(int, b.split(","))) for b in sys.argv[3].split(";")]
MODE = sys.argv[4] if len(sys.argv) > 4 else "diffuse"
W, H = 1344, 1024  # 42x32 tiles of 32px

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(np.float32)
mask = np.zeros(a.shape[:2], bool)
for x0, y0, x1, y1 in boxes:
    mask[y0:y1, x0:x1] = True
mask = ndimage.binary_dilation(mask, iterations=3)


def diffuse(a, mask):
    out = a.copy()
    known = ~mask
    for c in range(3):
        ch = a[..., c].copy()
        ch[mask] = a[..., c][known].mean()
        for _ in range(1500):
            blur = ndimage.uniform_filter(ch, 3)
            ch[mask] = blur[mask]
        out[..., c] = ch
    ring = ndimage.binary_dilation(mask, iterations=14) & known
    hf = a - ndimage.uniform_filter(a, (5, 5, 1))
    std = hf[ring].std(axis=0)
    noise = ndimage.uniform_filter(np.random.default_rng(7).normal(0, 1, a.shape[:2]), 2) * 2.2
    for c in range(3):
        out[..., c][mask] += noise[mask] * std[c]
    return out


def patch_fill(a, mask, boxes, ring=10, reach=(300, 220), step=4):
    """For each box: find the source window whose surrounding ring best matches this box's ring, copy it in."""
    out = a.copy()
    H_, W_ = mask.shape
    for x0, y0, x1, y1 in boxes:
        x0, y0, x1, y1 = x0 - 3, y0 - 3, x1 + 3, y1 + 3  # same dilation as the mask
        w, h = x1 - x0, y1 - y0
        ex0, ey0, ex1, ey1 = x0 - ring, y0 - ring, x1 + ring, y1 + ring
        if ex0 < 0 or ey0 < 0 or ex1 > W_ or ey1 > H_:
            ex0, ey0, ex1, ey1 = max(ex0, 0), max(ey0, 0), min(ex1, W_), min(ey1, H_)
        target = a[ey0:ey1, ex0:ex1]
        tmask = mask[ey0:ey1, ex0:ex1]
        # ring pixels = extended window minus the hole, and only where they are real (unmasked) pixels
        hole = np.zeros(target.shape[:2], bool)
        hole[y0 - ey0 : y1 - ey0, x0 - ex0 : x1 - ex0] = True
        valid = (~hole) & (~tmask)
        ring_mean = target[valid].mean(0)
        ring_std = target[valid].std()
        lum = lambda v: v.mean(-1)
        r5, r95 = np.percentile(lum(target[valid]), [5, 95])
        best, best_score = None, 1e18
        for sy in range(max(0, y0 - reach[1]), min(H_ - (ey1 - ey0), y0 + reach[1]), step):
            for sx in range(max(0, x0 - reach[0]), min(W_ - (ex1 - ex0), x0 + reach[0]), step):
                if abs(sx - ex0) < w // 2 and abs(sy - ey0) < h // 2:
                    continue  # too close to the hole itself
                if mask[sy : sy + (ey1 - ey0), sx : sx + (ex1 - ex0)].any():
                    continue  # never copy from another character
                cand = a[sy : sy + (ey1 - ey0), sx : sx + (ex1 - ex0)]
                score = (((cand - target) ** 2).sum(-1) * valid).sum() / max(valid.sum(), 1)
                # the copied content itself must look like the surroundings (no windows/banners on the floor)
                inner = cand[y0 - ey0 : y1 - ey0, x0 - ex0 : x1 - ex0]
                score += 0.8 * ((inner.mean((0, 1)) - ring_mean) ** 2).sum() + 40 * (inner.std() - ring_std) ** 2
                i5, i95 = np.percentile(lum(inner), [5, 95])
                score += 1.5 * ((i5 - r5) ** 2 + (i95 - r95) ** 2)  # same tonal range: no dark statue outlines on cobble
                if score < best_score:
                    best, best_score = (sx, sy), score
        sx, sy = best
        src = a[sy + (y0 - ey0) : sy + (y0 - ey0) + h, sx + (x0 - ex0) : sx + (x0 - ex0) + w]
        # feather the seam: 1 inside, ramping to 0 over 5px at the box edge
        xs = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
        ys = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
        ramp = np.minimum(xs, ys)
        alpha = np.clip(ramp / 5.0, 0, 1)[..., None]
        out[y0:y1, x0:x1] = src * alpha + out[y0:y1, x0:x1] * (1 - alpha)
        print("patch", (x0, y0, x1, y1), "<- from", (sx, sy), "score", round(best_score))
    return out


out = patch_fill(a, mask, boxes) if MODE == "patch" else diffuse(a, mask)
out = np.clip(out, 0, 255).astype(np.uint8)
res = Image.fromarray(out).resize((W, H), Image.LANCZOS)
res.save(OUT, optimize=True)
print("saved", OUT, res.size)
