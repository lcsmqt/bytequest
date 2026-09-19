"""Apply hand-cleared walkable rects to a generated mask, BFS-check reachability from spawn, and write
src/game/maps/<name>.mask.txt (+ a preview: dimmed = blocked, blue tint = walkable but unreachable).
Usage: python scripts/fix_mask.py <name> <spawn x,y> "<label>:x,y;..." "<x0,y0,x1,y1;...>" (clear rects) ["<x0,y0,x1,y1;...>" (block rects, applied after clearing)]"""
import sys
from collections import deque
import numpy as np
from PIL import Image
from scipy import ndimage

C = 16
name = sys.argv[1]
spawn = tuple(map(int, sys.argv[2].split(",")))
pts = {k: tuple(map(int, v.split(","))) for k, v in (p.split(":") for p in sys.argv[3].split(";"))}
rects = [tuple(map(int, r.split(","))) for r in sys.argv[4].split(";") if r]
blocks = [tuple(map(int, r.split(","))) for r in (sys.argv[5] if len(sys.argv) > 5 else "").split(";") if r]
rows = open(f"public/assets/worlds/{name}.mask.txt").read().split("\n")
g = np.array([[c == "#" for c in r] for r in rows])
for x0, y0, x1, y1 in rects:
    g[y0 // C : y1 // C + 1, x0 // C : x1 // C + 1] = False
for x0, y0, x1, y1 in blocks:
    g[y0 // C : y1 // C + 1, x0 // C : x1 // C + 1] = True
cell = lambda x, y: (y // C, x // C)
seen = np.zeros_like(g)
q = deque([cell(*spawn)])
seen[cell(*spawn)] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < g.shape[0] and 0 <= nx < g.shape[1] and not g[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True
            q.append((ny, nx))
ys, xs = np.nonzero(seen)
print("reachable", seen.sum(), "of", (~g).sum())
for k, (x, y) in pts.items():
    print(k, (x, y), "blocked" if g[cell(x, y)] else "open", "nearest reachable px:", round(np.hypot(xs * C + 8 - x, ys * C + 8 - y).min()))
open(f"src/game/maps/{name}.mask.txt", "w").write("\n".join("".join("#" if c else "." for c in r) for r in g))
im = np.asarray(Image.open(f"public/assets/worlds/{name}.png").convert("RGB")).copy()
big = lambda m: np.kron(m, np.ones((C, C), bool))
un = big((~g) & (~seen))
im[un] = (im[un] * 0.4 + np.array([0, 80, 255]) * 0.6).astype(np.uint8)
im[big(g)] = (im[big(g)] * 0.55).astype(np.uint8)
Image.fromarray(im).save(f"public/assets/worlds/{name}.maskpreview.png")
