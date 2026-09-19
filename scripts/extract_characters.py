"""Crop portrait poses out of Imagens/ character sheets, key out the tan parchment background
(flood-fill from the crop edges so tan-ish pixels *inside* the character survive), save trimmed RGBA.
Usage: python scripts/extract_characters.py"""
import numpy as np
from PIL import Image
from scipy import ndimage

SHEET = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (7).png"
CROPS = {  # name: (x0, y0, x1, y1) on the sheet
    "lyra": (40, 262, 322, 552),
    "sir-boolean": (590, 262, 855, 552),
    "loopus": (40, 862, 312, 1125),
}
TARGET_H = 120

sheet = Image.open(SHEET).convert("RGB")
for name, box in CROPS.items():
    a = np.asarray(sheet.crop(box)).astype(np.int32)
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    near = np.abs(a - bg).sum(-1) < 90
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    bgmask = ndimage.binary_dilation(bgmask, iterations=1)
    alpha = np.where(bgmask, 0, 255).astype(np.uint8)
    rgba = np.dstack([a.astype(np.uint8), alpha])
    ys, xs = np.nonzero(alpha)
    im = Image.fromarray(rgba).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    w = round(im.width * TARGET_H / im.height)
    im = im.resize((w, TARGET_H), Image.LANCZOS)
    im.save(f"public/assets/characters/{name}.png", optimize=True)
    print(name, im.size)
