"""Enemy sheets from the reference "ENEMY SPRITE SHEET": 3 poses each (idle / move / attack-or-hurt), packed like Byte's
(feet on the bottom row, idle pose = 84px), plus a portrait per monster for the dialogue box.
Writes public/assets/enemies/<name>-sheet.png, public/assets/enemies/<name>-portrait.png, src/game/enemySheets.json.
Usage: python scripts/extract_enemy_sheets.py"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, "scripts")
import extract_byte_sheet as ebs  # noqa: E402  (helpers only; main guarded)

SRC = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (8).png"
OUT = "public/assets/enemies"
os.makedirs(OUT, exist_ok=True)
ebs.OUT = OUT  # pack() writes here

# name: (x0, y0, x1, y1, frames, merge, [x splits between poses]) — poses overlap in x, so splits are hand-set
BANDS = {
    "slime": (40, 335, 545, 520, 3, 0, [195, 355]),
    "wraith": (40, 685, 545, 890, 3, 0, [195, 350]),
    "goblin": (590, 715, 1095, 890, 3, 0, [738, 895]),
    "bat": (28, 1075, 555, 1245, 3, 0, [205, 375]),
    "imp": (590, 1040, 1095, 1245, 3, 0, [735, 930]),
}

sheet = Image.open(SRC)
sizes = {}
for name, band in BANDS.items():
    frs = ebs.frames(sheet, band)
    ref = max(f.height for f in frs)  # the tallest pose = 84px, so every pose keeps its proportions
    W, H, _ = ebs.pack(frs, ref, 84, f"{name}-sheet")
    sizes[name] = {"w": W, "h": H, "idleH": round(frs[0].height * 84 / ref)}
    # portrait: idle pose, tight crop, 96px tall
    p = frs[0]
    p = p.resize((max(1, round(p.width * 96 / p.height)), 96), Image.LANCZOS)
    p.save(f"{OUT}/{name}-portrait.png", optimize=True)
    print(name, sizes[name])
json.dump(sizes, open("src/game/enemySheets.json", "w"), indent=2)
