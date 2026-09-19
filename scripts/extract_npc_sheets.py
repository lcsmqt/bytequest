"""NPC animation sheets from the reference sheets: Pyron (idle x4, walk x4, cast x4, mentor pose) and the small
poses of Lyra / Sir Boolean / Loopus (idle, walk, back, cast|attack). Same packing as Byte's sheet (feet on the
bottom row, torso-centred, idle pose = 84px). Writes public/assets/characters/<name>-sheet.png and
src/game/npcSheets.json (cell size per sheet) which src/game/sprites.ts reads.
Usage: python scripts/extract_npc_sheets.py"""
import json
import sys

from PIL import Image

sys.path.insert(0, "scripts")
import extract_byte_sheet as ebs  # noqa: E402  (helpers only; main guarded)

PYRON = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (6).png"
CHARS = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (7).png"

# (x0,y0,x1,y1, count, merge px)
SHEETS = {
    "pyron": (
        PYRON,
        [(372, 212, 1058, 448, 4, 8), (326, 555, 1058, 720, 4, 8), (42, 810, 738, 1018, 4, 6), (775, 800, 1040, 1018, 1, 20)],
    ),
    "lyra": (CHARS, [(40, 556, 538, 712, 4, 8)]),
    "sir-boolean": (CHARS, [(580, 556, 1090, 712, 4, 0, [703, 820, 930])]),
    "loopus": (CHARS, [(40, 1130, 548, 1290, 4, 8)]),
}

sizes = {}
for name, (src, bands) in SHEETS.items():
    sheet = Image.open(src)
    frs = [f for band in bands for f in ebs.frames(sheet, band)]
    ref_h = frs[0].height  # idle pose -> 84px content
    W, H, ch = ebs.pack(frs, ref_h, 84, f"{name}-sheet")
    sizes[name] = {"w": W, "h": H, "content": ch, "frames": len(frs)}
    print(name, W, H, len(frs))
json.dump(sizes, open("src/game/npcSheets.json", "w"), indent=2)
