"""World-map thumbnails (4:3, 240x180) from the backdrops in public/assets/worlds (w0 = academy, w1 = valley, ...).
Usage: python scripts/make_map_thumbs.py"""
from PIL import Image

OUT = "public/assets/map"
SRC = {
    0: ("public/assets/worlds/academy.png", None),
    1: ("public/assets/worlds/variable-valley.png", None),
    2: ("public/assets/worlds/function-forge.png", None),
    3: ("public/assets/worlds/caves-of-condition.png", None),
    4: ("public/assets/worlds/forest-of-loops.png", None),
}
for i, (path, box) in SRC.items():
    im = Image.open(path).convert("RGB")
    if box:
        im = im.crop(box)
    else:  # 1344x1024 -> 4:3 by trimming the top/bottom
        w, h = im.size
        nh = round(w * 3 / 4)
        top = (h - nh) // 2
        im = im.crop((0, max(0, top), w, max(0, top) + min(nh, h)))
    im = im.resize((240, 180), Image.LANCZOS)
    im.save(f"{OUT}/w{i}.png", optimize=True)
    print(i, im.size)
