"""Cut Byte's animation frames (idle x4, walk x4, cast x4, hurt, victory) and Pip's 4 poses out of the reference
sheets into two uniform-grid spritesheets, feet-aligned (torso-centred) and keyed against the parchment.
Frame order is the contract used by RoomScene: see BYTE_FRAMES / PIP_FRAMES there.
Usage: python scripts/extract_byte_sheet.py"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

BYTE_SHEET = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (5).png"
CHAR_SHEET = "Imagens/ChatGPT Image 17 de set. de 2026, 22_11_35 (7).png"
OUT = "public/assets/characters"

# (x0,y0,x1,y1, expected frame count, horizontal merge px[, manual x-splits in sheet px])
BYTE_BANDS = [
    (340, 238, 1050, 447, 4, 8),   # idle front/back/left/right
    (340, 543, 880, 708, 4, 8),    # walk 1-4
    (340, 806, 722, 1018, 3, 0, "cast"),  # cast: only 3 poses are drawn; frames overlap in x so region masks are hand-set
    (738, 838, 892, 1020, 1, 24),  # hurt (burst effect merges in)
    (915, 806, 1052, 1018, 1, 20), # victory
]
PIP_BAND = (585, 1138, 1085, 1282, 4, 0, [700, 830, 945])  # idle / happy / spin / excited


def key(a):
    bg = np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)
    near = np.abs(a.astype(int) - bg).sum(-1) < 80
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgm = ndimage.binary_dilation(np.isin(lab, list(edge)), iterations=1)
    # enclosed parchment (between body and staff, inside arms): stricter colour match so skin highlights survive
    tight = np.abs(a.astype(int) - bg).sum(-1) < 40
    tl, tk = ndimage.label(tight)
    for i in range(1, tk + 1):
        if (tl == i).sum() >= 12:
            bgm |= tl == i
    return np.where(bgm, 0, 255).astype(np.uint8)


def keep_main(alpha, reach):
    """Drop detached specks (panel borders, label text): keep what is within `reach` px of the largest blob."""
    lab, k = ndimage.label(ndimage.binary_dilation(alpha > 0, iterations=reach))
    if k <= 1:
        return alpha
    sizes = ndimage.sum(alpha > 0, lab, range(1, k + 1))
    return np.where(lab == 1 + int(np.argmax(sizes)), alpha, 0).astype(np.uint8)


def frames(sheet, band):
    x0, y0, x1, y1, n, merge, *rest = band
    a = np.asarray(sheet.crop((x0, y0, x1, y1)).convert("RGB"))
    alpha = key(a)
    if not rest:
        alpha = keep_main(alpha, 9) if n == 1 else alpha
    if rest:
        spec = rest[0]
        yy, xx = np.mgrid[0 : a.shape[0], 0 : a.shape[1]]
        xs_, ys_ = xx + x0, yy + y0  # sheet coordinates
        if spec == "cast":
            top = ys_ < 872
            regions = [
                (xs_ < 446) | ((xs_ < 484) & top),
                ((xs_ >= 446) & ~top & (xs_ < 600)) | ((xs_ >= 484) & top & (xs_ < 625)),
                ((xs_ >= 590) & ~top & (xs_ < 716)) | ((xs_ >= 625) & top & (xs_ < 716)),
            ]
            # frame 1 vs 2 overlap: anything already claimed by frame 1 is not frame 2's
            regions[1] &= ~regions[0]
            regions[2] &= ~(regions[0] | regions[1])
        else:  # x-splits
            cuts = [x0, *spec, x1]
            regions = [(xs_ >= lo) & (xs_ < hi) for lo, hi in zip(cuts, cuts[1:])]
        out = []
        for reg in regions:
            part = np.where(reg, alpha, 0).astype(np.uint8)
            part = keep_main(part, 9)
            ys, xs = np.nonzero(part)
            out.append(Image.fromarray(np.dstack([a, part])).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)))
        return out
    grown = ndimage.binary_dilation(alpha > 0, structure=np.ones((3, merge * 2 + 1)))
    lab, k = ndimage.label(grown)
    boxes = []
    for i in range(1, k + 1):
        ys, xs = np.nonzero((lab == i) & (alpha > 0))
        if len(xs) > 500:
            boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    boxes.sort()
    assert len(boxes) == n, f"band {band}: expected {n} frames, found {len(boxes)}: {boxes}"
    rgba = np.dstack([a, alpha])
    return [Image.fromarray(rgba).crop(b) for b in boxes]


def torso_x(im):
    a = np.asarray(im)[..., 3] > 0
    h = a.shape[0]
    cols = np.nonzero(a[int(h * 0.35) : int(h * 0.65)].any(axis=0))[0]
    return (cols.min() + cols.max()) / 2 if len(cols) else im.width / 2


def pack(frs, height_ref, target_h, name):
    s = target_h / height_ref
    scaled = [f.resize((max(1, round(f.width * s)), max(1, round(f.height * s))), Image.LANCZOS) for f in frs]
    left = max(torso_x(f) for f in scaled)
    right = max(f.width - torso_x(f) for f in scaled)
    W, H = int(np.ceil(left + right)) + 2, max(f.height for f in scaled) + 2
    sheet = Image.new("RGBA", (W * len(scaled), H), (0, 0, 0, 0))
    for i, f in enumerate(scaled):
        sheet.paste(f, (i * W + int(round(left - torso_x(f))) + 1, H - f.height - 1), f)
    sheet.save(f"{OUT}/{name}.png", optimize=True)
    return W, H, target_h


if __name__ == "__main__":
    byte = Image.open(BYTE_SHEET)
    bfr = [f for band in BYTE_BANDS for f in frames(byte, band)]
    assert len(bfr) == 13
    ref_h = bfr[0].height  # idle_front content height -> 84px
    W, H, ch = pack(bfr, ref_h, 84, "byte-sheet")
    print("byte-sheet frame", W, H, "content", ch)
    pip = frames(Image.open(CHAR_SHEET), PIP_BAND)
    pW, pH, _ = pack(pip, max(f.height for f in pip), 44, "pip-sheet")
    print("pip-sheet frame", pW, pH)
    json.dump({"byte": [W, H, ch], "pip": [pW, pH]}, open("scripts/sheet_sizes.json", "w"))
