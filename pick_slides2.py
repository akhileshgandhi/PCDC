import os, glob, shutil
from PIL import Image

SEQ = r"C:\Users\user\Downloads\Prestige\seq2"
OUT = r"C:\Users\user\Downloads\Prestige\slides2"
if os.path.isdir(OUT):
    pass
os.makedirs(OUT, exist_ok=True)

files = sorted(glob.glob(os.path.join(SEQ, "s_*.jpg")))

def features(path):
    im = Image.open(path).convert("L")
    small = im.resize((48, 27))   # keep aspect-ish, more detail
    px = list(small.get_flattened_data()) if hasattr(small, "get_flattened_data") else list(small.getdata())
    n = len(px)
    brightness = sum(px) / n
    dark_frac = sum(1 for p in px if p < 110) / n   # text / structured content
    return brightness, dark_frac, px

def diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)

kept = []
last_px = None
for i, f in enumerate(files):
    sec = i  # 1 fps
    b, dark, px = features(f)
    # slide = bright background AND some structured dark content (text), but not a dark photo
    is_slide = b > 140 and 0.015 < dark < 0.45
    if not is_slide:
        last_px = None
        continue
    if last_px is None or diff(px, last_px) > 6:
        kept.append((sec, f))
        last_px = px

print(f"Total frames: {len(files)}; distinct slide frames: {len(kept)}")
for idx, (sec, f) in enumerate(kept):
    mm, ss = divmod(sec, 60)
    dst = os.path.join(OUT, f"sl_{idx:02d}_{mm:02d}m{ss:02d}s.jpg")
    shutil.copy(f, dst)
    print(f"  {idx:02d}  @ {mm:02d}:{ss:02d}")
