"""Eğitim videosu şablonu (dikey 1080x1920, 30 fps).
Her sahne: üstte adım etiketi + kısa açıklama, ortada gerçek site ekranı (telefon kartı), altta seri adı.
Kullanım: python3 tut.py ayar.json [frames]
ayar.json: {"out": "...", "series": "...", "cover": {...}, "end": {...}, "scenes": [{"step": "...", "cap": "...", "imgs": ["a.jpg"], "top": 0, "dur": 5}, ...]}
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

CFG = json.load(open(sys.argv[1])); BASE = os.path.dirname(os.path.abspath(sys.argv[1]))
W, H, FPS = 1080, 1920, 30
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
def font(w, s): return ImageFont.truetype(F.format(w), s)
BG = (14, 26, 23); INK = (236, 244, 241); MUTED = (157, 178, 171); GREEN = (17, 112, 94); ACC = (60, 200, 160); GOLD = (240, 190, 70)
CARD_X, CARD_Y, CARD_W, CARD_H = 90, 560, 900, 1150

def wrap(d, t, f, mw):
    out, cur = [], ""
    for w in t.split():
        x = (cur + " " + w).strip()
        if d.textlength(x, font=f) <= mw: cur = x
        else: out.append(cur); cur = w
    out.append(cur); return out

def text_block(d, t, f, y, col, x=80, mw=W - 160, gap=1.18):
    for line in wrap(d, t, f, mw):
        d.text((x, y), line, font=f, fill=col); y += int(f.size * gap)
    return y

def logo(d, x, y, s):
    d.rounded_rectangle([x, y, x + s, y + s], radius=s // 4, fill=(15, 110, 92)); c = (x + s / 2, y + s / 2)
    r1 = s * 5 / 32; d.ellipse([c[0] - r1, c[1] - r1, c[0] + r1, c[1] + r1], fill=(244, 247, 245)); r2 = s * 10 / 32
    for i in range(0, 360, 36): d.arc([c[0] - r2, c[1] - r2, c[0] + r2, c[1] + r2], i, i + 18, fill=(244, 247, 245), width=max(2, s // 16))

def base():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    logo(d, 80, 80, 72); d.text((172, 84), "AI SaaSavran", font=font("Bold", 42), fill=INK)
    d.text((172, 132), "aisaasavran.com", font=font("Medium", 28), fill=MUTED)
    d.text((80, H - 120), CFG["series"], font=font("SemiBold", 32), fill=MUTED)
    d.rectangle([0, H - 20, W, H], fill=GREEN)
    return im, d

def chip(d, x, y, label, fill=GREEN, col=(255, 255, 255), size=34):
    f = font("Bold", size); w = d.textlength(label, font=f) + 48
    d.rounded_rectangle([x, y, x + w, y + size + 28], radius=(size + 28) // 2, fill=fill); d.text((x + 24, y + 12), label, font=f, fill=col)
    return x + w

def screen_frame(img_path, top):
    src = Image.open(os.path.join(BASE, img_path)).convert("RGB")
    sc = CARD_W / src.width; ch = int(CARD_H / sc)
    top = max(0, min(top, src.height - ch))
    crop = src.crop((0, top, src.width, top + ch)).resize((CARD_W, CARD_H), Image.LANCZOS)
    mask = Image.new("L", (CARD_W, CARD_H), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, CARD_W, CARD_H], radius=36, fill=255)
    return crop, mask

def scene_img(sc, img):
    im, d = base()
    chip(d, 80, 230, sc["step"])
    text_block(d, sc["cap"], font("ExtraBold", 58), 320, INK)
    d.rounded_rectangle([CARD_X - 10, CARD_Y - 10, CARD_X + CARD_W + 10, CARD_Y + CARD_H + 10], radius=44, fill=(40, 62, 55))
    crop, mask = screen_frame(img, sc.get("top", 0)); im.paste(crop, (CARD_X, CARD_Y), mask)
    return im

def cover_img(c):
    im, d = base()
    x = chip(d, 80, 300, c["badge"], fill=GOLD, col=BG, size=40)
    y = text_block(d, c["title"], font("Black", 112), 440, INK)
    y = text_block(d, c["sub"], font("SemiBold", 52), y + 40, ACC)
    return im

def end_img(e):
    im, d = base()
    y = text_block(d, e["title"], font("ExtraBold", 84), 470, INK)
    y = text_block(d, e["sub"], font("Medium", 46), y + 30, MUTED)
    by = y + 70; d.rounded_rectangle([80, by, W - 80, by + 150], radius=30, fill=GREEN)
    lab = "aisaasavran.com"; f = font("ExtraBold", 72); d.text(((W - d.textlength(lab, font=f)) / 2, by + 34), lab, font=f, fill=(255, 255, 255))
    if e.get("next"):
        chip(d, 80, by + 230, e["next_label"], fill=(40, 62, 55), col=ACC, size=34)
        text_block(d, e["next"], font("Bold", 52), by + 320, INK)
    return im

def encode(frames, name, fade_in=True):
    """frames: [(PIL image, seconds)] -> one mp4 per scene, crossfade-free, fades inside."""
    os.makedirs("tmp", exist_ok=True); lst = []
    for i, (im, dur) in enumerate(frames):
        p = f"tmp/{name}_{i:03d}.png"; im.save(p); lst.append((p, dur))
    with open(f"tmp/{name}.txt", "w") as fh:
        for p, dur in lst: fh.write(f"file '{os.path.abspath(p)}'\nduration {dur:.3f}\n")
        fh.write(f"file '{os.path.abspath(lst[-1][0])}'\n")
    total = sum(dur for _, dur in lst)
    vf = f"fps={FPS},format=yuv420p" + (f",fade=t=in:st=0:d=0.25" if fade_in else "") + f",fade=t=out:st={total - 0.25:.3f}:d=0.25"
    tmp = f"{name}.part.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"tmp/{name}.txt", "-vf", vf,
                    "-t", f"{total:.3f}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], check=True)
    os.replace(tmp, f"{name}.mp4")

if __name__ == "__main__":
    out = os.path.join(BASE, CFG["out"]); os.makedirs(out, exist_ok=True); os.chdir(out)
    items = [("p0", "cover", CFG["cover"])] + [(f"p{i+1}", "scene", s) for i, s in enumerate(CFG["scenes"])] + [(f"p{len(CFG['scenes'])+1}", "end", CFG["end"])]
    if len(sys.argv) > 2 and sys.argv[2] == "frames":
        for name, kind, s in items:
            im = cover_img(s) if kind == "cover" else end_img(s) if kind == "end" else scene_img(s, s["imgs"][-1])
            im.save(f"frame_{name}.png")
        sys.exit()
    names = []
    for name, kind, s in items:
        if kind == "cover": frames = [(cover_img(s), s["dur"])]
        elif kind == "end": frames = [(end_img(s), s["dur"])]
        else:
            imgs = s["imgs"]
            if len(imgs) == 1: frames = [(scene_img(s, imgs[0]), s["dur"])]
            else:
                hold = s.get("hold_last", 1.2); per = max(0.12, (s["dur"] - hold) / (len(imgs) - 1))
                frames = [(scene_img(s, p), per) for p in imgs[:-1]] + [(scene_img(s, imgs[-1]), s["dur"] - per * (len(imgs) - 1))]
        encode(frames, name, fade_in=(kind != "cover")); names.append(name)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n in names))
