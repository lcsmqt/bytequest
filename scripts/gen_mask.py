"""Auto-classify a backdrop into a walkable grid (16px cells): water, cliff/rock and dense trees block.
Writes <out>.txt ('#' blocked, '.' walkable) and a red-overlay preview PNG for eyeballing.
Usage: python scripts/gen_mask.py public/assets/worlds/<name>.png [valley|cave|forest|blank]   (blank = all blocked; carve walkable rects with fix_mask.py)"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

CELL = 16
src = sys.argv[1]
im = Image.open(src).convert("RGB")
a = np.asarray(im).astype(np.int32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
v = a.max(-1)
sat = v - a.min(-1)

mode = sys.argv[2] if len(sys.argv) > 2 else "valley"
if mode == "blank":
    blocked_px = np.ones_like(v, bool)
elif mode == "forest":
    # canopies are as bright as the grass, so key on the dirt path (and wood bridges) and pad it by ~1 cell
    path = (r > g + 12) & (g > b + 28) & (v > 125)
    walk = ndimage.binary_dilation(path, iterations=CELL + 6)
    blocked_px = ~walk
elif mode == "cave":
    water = (b > r + 45) & (b > 120) & (sat > 70)       # glowing chasm / waterfalls / crystals
    lava = (r > 190) & (g < 150) & (b < 90)              # molten rock
    dark = v < 78                                        # unlit rock walls, stalagmites, void
    blocked_px = water | lava | dark
else:
    water = (b > r + 40) & (b > 110)
    rock = (sat < 38) & (v > 70) & (v < 190)          # grey stone / cliff faces
    tree = (g > r) & (g >= b) & (v < 105)              # dark foliage
    blocked_px = water | rock | tree

H, W = blocked_px.shape
gh, gw = H // CELL, W // CELL
frac = blocked_px[: gh * CELL, : gw * CELL].reshape(gh, CELL, gw, CELL).mean(axis=(1, 3))
grid = frac > 0.38
open(src.rsplit(".", 1)[0] + ".mask.txt", "w").write("\n".join("".join("#" if c else "." for c in row) for row in grid))

ov = np.asarray(im).copy()
big = np.kron(grid, np.ones((CELL, CELL), bool))
ov[: gh * CELL, : gw * CELL][big] = (ov[: gh * CELL, : gw * CELL][big] * 0.4 + np.array([255, 0, 0]) * 0.6).astype(np.uint8)
Image.fromarray(ov).save(src.rsplit(".", 1)[0] + ".maskpreview.png")
print(gw, gh, "blocked", grid.mean().round(2))
