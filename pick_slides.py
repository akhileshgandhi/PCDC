import os, glob, shutil
from PIL import Image

SEQ = r"C:\Users\user\Downloads\Prestige\seq"
OUT = r"C:\Users\user\Downloads\Prestige\slides"
os.makedirs(OUT, exist_ok=True)

files = sorted(glob.glob(os.path.join(SEQ, "s_*.jpg")))

def features(path):
    im = Image.open(path).convert("L")
    small = im.resize((32, 32))
    px = list(small.getdata())
    brightness = sum(px) / len(px)
    return brightness, px

def diff(a, b):
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)

BRIGHT_THRESH = 120   # slides have white background
DIFF_THRESH = 10      # how different to count as a new slide

kept = []
last_px = None
for i, f in enumerate(files):
    sec = i * 3
    b, px = features(f)
    is_slide = b > BRIGHT_THRESH
    if not is_slide:
        last_px = None  # reset so a slide after gallery is always kept
        continue
    if last_px is None or diff(px, last_px) > DIFF_THRESH:
        kept.append((sec, f))
        last_px = px

print(f"Total frames: {len(files)}; distinct slide frames: {len(kept)}")
for idx, (sec, f) in enumerate(kept):
    mm, ss = divmod(sec, 60)
    dst = os.path.join(OUT, f"slide_{idx:02d}_{mm:02d}m{ss:02d}s.jpg")
    shutil.copy(f, dst)
    print(f"  {idx:02d}  @ {mm:02d}:{ss:02d}  -> {os.path.basename(dst)}")
