"""Kulaklık: tüm özellikler videosu (dikey 1080x1920, 30 fps). Gerçek ölçüm: Growth Lab, 12 Kasım 2026.
Marka ve ürün adları gizli (Marka A–E, Ürün A1/B1/E1). Her sahne ayrı mp4; sonra birleştirilir."""
import json, sys as _s
CFG = json.load(open(_s.argv[1]))
OUT = CFG["out"]
import math, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
def font(w, s): return ImageFont.truetype(F.format(w), s)

BG = (14, 26, 23); INK = (236, 244, 241); MUTED = (157, 178, 171); GREEN = (17, 112, 94); ACC = (60, 200, 160)
BAR_BG = (36, 56, 50); GOLD = (240, 190, 70)

N = 8
RED = (230, 110, 100)

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

def logo(d, x, y, s=64):
    d.rounded_rectangle([x, y, x + s, y + s], radius=s // 4, fill=(15, 110, 92))
    c = (x + s / 2, y + s / 2)
    r1 = s * 5 / 32; d.ellipse([c[0] - r1, c[1] - r1, c[0] + r1, c[1] + r1], fill=(244, 247, 245))
    r2 = s * 10 / 32
    for i in range(0, 360, 36):
        d.arc([c[0] - r2, c[1] - r2, c[0] + r2, c[1] + r2], i, i + 18, fill=(244, 247, 245), width=max(2, s // 16))

def header(d):
    logo(d, 70, 90, 72)
    d.text((165, 98), "AI SaaSavran", font=font("Bold", 46), fill=INK)
    d.text((165, 150), "aisaasavran.com", font=font("Regular", 30), fill=MUTED)

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def text_block(d, text, f, y, fill=INK, alpha=1.0, gap=1.18, x=80, maxw=W - 160):
    col = tuple(int(BG[i] + (fill[i] - BG[i]) * alpha) for i in range(3))
    for line in wrap(d, text, f, maxw):
        d.text((x, y), line, font=f, fill=col); y += int(f.size * gap)
    return y

def base():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im); header(d)
    d.rectangle([0, H - 14, W, H], fill=GREEN)
    return im, d

def footer_note(d, a=1.0):
    text_block(d, CFG["footer"], font("Medium", 30), H - 120, MUTED, a)


def mix(c, a): return tuple(int(BG[k] + (c[k] - BG[k]) * a) for k in range(3))


def title(d, t, big, sub=None, y=400):
    y = text_block(d, big, font("ExtraBold", 84), y, INK, ease(t / 0.5))
    if sub: y = text_block(d, sub, font("Medium", 40), y + 10, MUTED, ease(t / 0.5))
    return y
def tag(d, t, label):
    a = ease(t / 0.4); f = font("Bold", 34); w = d.textlength(label, font=f) + 48
    d.rounded_rectangle([80, 300, 80 + w, 360], radius=30, fill=mix(GREEN, a)); d.text((104, 309), label, font=f, fill=mix((255, 255, 255), a))
def bar(d, x0, y, x1, frac, col, h=44):
    d.rounded_rectangle([x0, y, x1, y + h], radius=14, fill=BAR_BG)
    if frac * (x1 - x0) > 4: d.rounded_rectangle([x0, y, x0 + (x1 - x0) * frac, y + h], radius=14, fill=col)
T = CFG["t"]; N = CFG["n"]
def s1(t, dur):
    im, d = base()
    y = text_block(d, T["hook"], font("ExtraBold", 104), 500, INK, 1.0)
    y = text_block(d, T["hook2"], font("SemiBold", 52), y + 40, ACC, ease((t - 0.4) / 0.6))
    text_block(d, T["note"], font("Medium", 38), y + 60, MUTED, ease((t - 1.6) / 0.6))
    footer_note(d); return im
def s2(t, dur):
    im, d = base(); tag(d, t, T["tag_brands"])
    y = title(d, t, T["who"], T["who_sub"]) + 70
    for i, (name, k) in enumerate(CFG["brands"]):
        p = ease((t - 0.5 - i * 0.25) / 0.9)
        d.text((80, y), name, font=font("Bold", 54), fill=GOLD if i == 0 else INK)
        lab = f"{round(k * p)}/{N}"; d.text((W - 80 - d.textlength(lab, font=font("Bold", 54)), y), lab, font=font("Bold", 54), fill=INK)
        bar(d, 80, y + 78, W - 80, k / N * p, GOLD if i == 0 else ACC); y += 185
    footer_note(d); return im
def s3(t, dur):
    im, d = base(); tag(d, t, T["tag_q"])
    y = title(d, t, T["byq"]) + 50
    for i, (q, ans) in enumerate(CFG["questions"]):
        al = ease((t - 0.4 - i * 0.5) / 0.5)
        d.rounded_rectangle([80, y, W - 80, y + 172], radius=24, fill=mix((30, 48, 43), al))
        d.text((112, y + 22), q, font=font("Medium", 38), fill=mix(MUTED, al))
        d.text((112, y + 82), ans, font=font("Bold", 50), fill=mix(INK, al)); y += 196
    footer_note(d); return im
def s4(t, dur):
    im, d = base(); tag(d, t, T["tag_cmp"])
    y = title(d, t, T["cmp"], T["cmp_sub"]) + 70
    f = font("Bold", 40); d.text((560, y - 50), T["col_a"], font=f, fill=GOLD); d.text((820, y - 50), T["col_b"], font=f, fill=ACC)
    for i, (name, a_, b_) in enumerate(CFG["compare"]):
        al = ease((t - 0.5 - i * 0.3) / 0.5)
        d.text((80, y + 14), name, font=font("Bold", 52), fill=mix(INK, al))
        for x, v, col in ((560, a_, GOLD), (820, b_, ACC)):
            s = "–" if v is None else f"{v}/{N}"
            d.text((x, y + 8), s, font=font("ExtraBold", 60), fill=mix(col if v else MUTED, al))
        y += 130
    text_block(d, T["cmp_note"], font("Medium", 36), y + 30, MUTED, ease((t - 2.6) / 0.6))
    footer_note(d); return im
def s5(t, dur):
    im, d = base(); tag(d, t, T["tag_src"])
    y = title(d, t, T["src"], T["src_sub"]) + 70; mx = CFG["sources"][0][1]
    for i, (dom, n) in enumerate(CFG["sources"]):
        p = ease((t - 0.4 - i * 0.2) / 0.7)
        d.text((80, y), dom, font=font("Bold", 46), fill=INK); lab = f"{round(n * p)}"
        d.text((W - 80 - d.textlength(lab, font=font("Bold", 46)), y), lab, font=font("Bold", 46), fill=INK)
        bar(d, 80, y + 66, W - 80, n / mx * p, GOLD if i == 0 else ACC, 34); y += 150
    footer_note(d); return im
def s6(t, dur):
    im, d = base()
    y = text_block(d, T["cta"], font("ExtraBold", 96), 520, INK, ease(t / 0.5))
    y = text_block(d, T["cta2"], font("Medium", 50), y + 30, MUTED, ease((t - 0.3) / 0.5))
    a3 = ease((t - 0.7) / 0.5); by = y + 80
    d.rounded_rectangle([80, by, W - 80, by + 150], radius=30, fill=mix(GREEN, a3))
    lab = "aisaasavran.com"; f = font("ExtraBold", 72); d.text(((W - d.textlength(lab, font=f)) / 2, by + 34), lab, font=f, fill=mix((255, 255, 255), a3))
    s = T["free"]; text_block(d, s, font("SemiBold", 46), by + 185, ACC, a3, x=(W - d.textlength(s, font=font("SemiBold", 46))) / 2)
    logo(d, (W - 150) // 2, by + 290, 150)
    text_block(d, T["disc"], font("Medium", 32), H - 330, MUTED, a3)
    return im
FN = {"s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5, "s6": s6}
SCENES = [(k, FN[k], CFG["dur"][k]) for k in FN]
def render(name, fn, dur):
    tmp = f"{name}.tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-vf", (f"fade=t=out:st={dur - 0.25}:d=0.25" if name == "s1" else f"fade=t=in:st=0:d=0.25,fade=t=out:st={dur - 0.25}:d=0.25"),
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for i in range(int(round(dur * FPS))):
        p.stdin.write(fn(i / FPS, dur).tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, f"{name}.mp4")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True); os.chdir(OUT)
    if len(sys.argv) > 2 and sys.argv[2] == "frames":
        for name, fn, dur in SCENES: fn(dur - 0.1, dur).save(f"frame_{name}.png")
        s1(0, 5).save("frame_s0.png"); sys.exit()
    for name, fn, dur in SCENES: render(name, fn, dur)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n, _, _ in SCENES))
