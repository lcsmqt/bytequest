"""Plan feet-accurate walking routes (QA + reachability proof) for a backdrop world.
Byte collides at his FEET (~30px below sprite centre, hitbox 27x15px), so BFS runs on the mask eroded by that
hitbox; a target counts as reached once Byte's centre is within `reach` px of it.
Usage: python scripts/plan_routes.py <name> <spawn x,y> "<label>:x,y;..." [reach=75]   -> JSON of centre-space waypoints"""
import json, sys
from collections import deque
import numpy as np
from scipy import ndimage

C, FEET = 16, 30
name = sys.argv[1]
spawn = tuple(map(int, sys.argv[2].split(",")))
targets = [(k, tuple(map(int, v.split(",")))) for k, v in (p.split(":") for p in sys.argv[3].split(";"))]
reach = int(sys.argv[4]) if len(sys.argv) > 4 else 75
g = np.array([[c == "#" for c in r] for r in open(f"src/game/maps/{name}.mask.txt").read().split("\n")])
free = ndimage.binary_erosion(~g, structure=np.ones((2, 2), bool))
H, W = g.shape

def route(cur, tgt):
    start = ((cur[1] + FEET) // C, cur[0] // C)
    prev = {start: None}
    q = deque([start])
    goal = None
    while q:
        c = q.popleft()
        cx, cy = c[1] * C + 8, c[0] * C + 8 - FEET
        if np.hypot(cx - tgt[0], cy - tgt[1]) < reach:
            goal = c
            break
        for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (c[0] + d[0], c[1] + d[1])
            if 0 <= n[0] < H and 0 <= n[1] < W and free[n] and n not in prev:
                prev[n] = c
                q.append(n)
    if goal is None:
        return None
    out, c = [], goal
    while c:
        out.append((c[1] * C + 8, c[0] * C + 8 - FEET))
        c = prev[c]
    return out[::-1][::2] + [out[0]]

cur, res = spawn, {}
for label, tgt in targets:
    r = route(cur, tgt)
    print(label, "OK" if r else "UNREACHABLE", len(r) if r else "")
    if r:
        res[label] = r
        cur = r[-1]
json.dump(res, open(sys.argv[5] if len(sys.argv) > 5 else "routes.json", "w"))
