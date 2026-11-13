"""Sektör videosu şablonu v2 (kulaklık formatı, 8 sahne): marka, motorlar, soru bazında kayıp, ürün, doğruluk+Shopping, kaynaklar, CTA.\nKullanım: python3 make.py ayar.json [frames | s1 s3 ...]"""
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
    text_block(d, CFG["names"], font("SemiBold", 28), H - 200, INK, a, gap=1.25)
    text_block(d, CFG["footer"], font("Medium", 28), H - 110, MUTED, a)


def mix(c, a): return tuple(int(BG[k] + (c[k] - BG[k]) * a) for k in range(3))



def title(d, t, big, sub=None, y=400):
    y = text_block(d, big, font("ExtraBold", 80), y, INK, ease(t / 0.5))
    if sub: y = text_block(d, sub, font("Medium", 40), y + 10, MUTED, ease(t / 0.5))
    return y
def tag(d, t, label):
    a = ease(t / 0.4); f = font("Bold", 34); w = d.textlength(label, font=f) + 48
    d.rounded_rectangle([80, 290, 80 + w, 350], radius=30, fill=mix(GREEN, a)); d.text((104, 299), label, font=f, fill=mix((255, 255, 255), a))
def bar(d, x0, y, x1, frac, col, h=40):
    d.rounded_rectangle([x0, y, x1, y + h], radius=14, fill=BAR_BG)
    if frac * (x1 - x0) > 4: d.rounded_rectangle([x0, y, x0 + (x1 - x0) * frac, y + h], radius=14, fill=col)
def rtext(d, x, y, s, f, col): d.text((x - d.textlength(s, font=f), y), s, font=f, fill=col)
T = CFG["t"]
def s1(t, dur):
    im, d = base()
    y = text_block(d, T["hook"], font("ExtraBold", 100), 480, INK, 1.0)
    y = text_block(d, T["hook2"], font("SemiBold", 50), y + 40, ACC, ease((t - 0.4) / 0.6))
    text_block(d, T["note"], font("Medium", 38), y + 60, MUTED, ease((t - 1.4) / 0.6))
    footer_note(d); return im
def s2(t, dur):
    im, d = base(); tag(d, t, T["tag_brands"]); y = title(d, t, T["who"], T["who_sub"]) + 60; n = CFG["n2"]
    for i, (name, k) in enumerate(CFG["brands"]):
        p = ease((t - 0.5 - i * 0.25) / 0.9); col = GOLD if i == 0 else ACC
        d.text((80, y), name, font=font("Bold", 52), fill=GOLD if i == 0 else INK)
        rtext(d, W - 80, y, f"{round(k * p)}/{n}", font("Bold", 52), INK)
        bar(d, 80, y + 74, W - 80, k / n * p, col); y += 170
    footer_note(d); return im
def s3(t, dur):
    im, d = base(); tag(d, t, T["tag_eng"]); y = title(d, t, T["eng"], T["eng_sub"]) + 90
    xs = [600, 790, 980]; cols = [GOLD, ACC, (150, 170, 240)]
    for (lab, sub), x, c in zip(CFG["engines"], xs, cols):
        rtext(d, x, y - 80, lab, font("Bold", 36), c); rtext(d, x, y - 36, sub, font("Medium", 28), MUTED)
    y += 20
    for i, row in enumerate(CFG["eng_rows"]):
        al = ease((t - 0.5 - i * 0.3) / 0.5); hl = row[0] in CFG["eng_hl"]
        if hl: d.rounded_rectangle([60, y - 14, W - 60, y + 92], radius=20, fill=mix((40, 62, 55), al))
        d.text((80, y + 8), row[0], font=font("Bold", 50), fill=mix(INK, al))
        for v, x, c in zip(row[1:], xs, cols): rtext(d, x, y, str(v), font("ExtraBold", 64), mix(c if v else RED, al))
        y += 125
    text_block(d, T["eng_note"], font("SemiBold", 40), y + 30, ACC, ease((t - 2.4) / 0.6))
    footer_note(d); return im
def s4(t, dur):
    im, d = base(); tag(d, t, T["tag_q"]); y = title(d, t, T["byq"], T["byq_sub"]) + 50
    for i, (q, parts) in enumerate(CFG["questions"]):
        al = ease((t - 0.4 - i * 0.6) / 0.5)
        d.rounded_rectangle([80, y, W - 80, y + 200], radius=24, fill=mix((30, 48, 43), al))
        d.text((112, y + 22), q, font=font("Medium", 38), fill=mix(MUTED, al)); x = 112
        for name, val, bad in parts:
            s = f"{name} {val}"; f = font("Bold", 42)
            d.text((x, y + 100), s, font=f, fill=mix(RED if bad else INK, al)); x += d.textlength(s, font=f) + 44
        y += 225
    footer_note(d); return im
def s5(t, dur):
    im, d = base(); tag(d, t, T["tag_prod"]); y = title(d, t, T["prod"], T["prod_sub"]) + 70; n = CFG["n"]
    for i, (name, a, b) in enumerate(CFG["products"]):
        p = ease((t - 0.5 - i * 0.3) / 0.8)
        d.text((80, y), name, font=font("Bold", 52), fill=GOLD if i == 0 else INK)
        for j, (lab, v, c) in enumerate(((CFG["engines"][0][0], a, GOLD), (CFG["engines"][1][0], b, ACC))):
            yy = y + 78 + j * 62; d.text((80, yy), lab, font=font("Medium", 32), fill=MUTED)
            bar(d, 300, yy + 2, W - 200, v / n * p, c, 34); rtext(d, W - 80, yy - 4, f"{round(v * p)}/{n}", font("Bold", 40), INK)
        y += 250
    footer_note(d); return im
def s6(t, dur):
    im, d = base(); tag(d, t, T["tag_acc"]); y = title(d, t, T["acc"]) + 60
    a1 = ease((t - 0.4) / 0.5); d.rounded_rectangle([80, y, W - 80, y + 360], radius=28, fill=mix((30, 48, 43), a1))
    d.text((112, y + 26), T["acc_box"], font=font("Medium", 38), fill=mix(MUTED, a1))
    for j, (lab, v, c) in enumerate(CFG["accuracy"]):
        x = 112 + j * 290; d.text((x, y + 100), str(v), font=font("ExtraBold", 110), fill=mix(c and tuple(c) or INK, a1))
        d.text((x, y + 240), lab, font=font("SemiBold", 36), fill=mix(INK, a1))
    y += 400; a2 = ease((t - 1.6) / 0.5)
    d.rounded_rectangle([80, y, W - 80, y + 300], radius=28, fill=mix((30, 48, 43), a2))
    d.text((112, y + 26), T["shop_box"], font=font("Medium", 38), fill=mix(MUTED, a2))
    d.text((112, y + 90), T["shop_big"], font=font("ExtraBold", 96), fill=mix(GOLD, a2))
    d.text((112, y + 215), T["shop_sub"], font=font("SemiBold", 36), fill=mix(INK, a2))
    footer_note(d); return im
def s7(t, dur):
    im, d = base(); tag(d, t, T["tag_src"]); y = title(d, t, T["src"], T["src_sub"]) + 60; mx = CFG["sources"][0][1]
    for i, (dom, n) in enumerate(CFG["sources"]):
        p = ease((t - 0.4 - i * 0.2) / 0.7)
        d.text((80, y), dom, font=font("Bold", 46), fill=INK); rtext(d, W - 80, y, f"{round(n * p)}", font("Bold", 46), INK)
        bar(d, 80, y + 64, W - 80, n / mx * p, GOLD if i == 0 else ACC, 32); y += 140
    text_block(d, T["src_note"], font("SemiBold", 40), y + 20, ACC, ease((t - 2.0) / 0.6))
    footer_note(d); return im
def s8(t, dur):
    im, d = base()
    y = text_block(d, T["cta"], font("ExtraBold", 92), 470, INK, ease(t / 0.5))
    y = text_block(d, T["cta2"], font("Medium", 48), y + 30, MUTED, ease((t - 0.3) / 0.5))
    a3 = ease((t - 0.7) / 0.5); by = y + 70
    d.rounded_rectangle([80, by, W - 80, by + 150], radius=30, fill=mix(GREEN, a3))
    lab = "aisaasavran.com"; f = font("ExtraBold", 72); d.text(((W - d.textlength(lab, font=f)) / 2, by + 34), lab, font=f, fill=mix((255, 255, 255), a3))
    s = T["free"]; text_block(d, s, font("SemiBold", 46), by + 180, ACC, a3, x=(W - d.textlength(s, font=font("SemiBold", 46))) / 2)
    text_block(d, T["disc"], font("Medium", 30), H - 420, MUTED, a3)
    footer_note(d, a3); return im

def s_subs(t, dur):
    im, d = base(); tag(d, t, T["tag_subs"]); y = title(d, t, T["subs"], T["subs_sub"]) + 100; n = CFG["n2"]
    rtext(d, W - 80, y - 54, T["col_ai"], font("Bold", 34), ACC); d.text((80, y - 54), T["col_subs"], font=font("Bold", 34), fill=MUTED)
    for i, (name, subs, k) in enumerate(CFG["subs_rows"]):
        p = ease((t - 0.5 - i * 0.25) / 0.9); hl = name in CFG.get("subs_hl", [])
        d.text((80, y), name, font=font("Bold", 50), fill=GOLD if hl else INK)
        d.text((360, y + 6), subs, font=font("Medium", 40), fill=MUTED)
        rtext(d, W - 80, y, f"{round(k * p)}/{n}", font("Bold", 50), RED if k == 0 else INK)
        bar(d, 80, y + 72, W - 80, k / n * p, GOLD if hl else ACC, 34); y += 160
    text_block(d, T["subs_note"], font("SemiBold", 40), y + 20, ACC, ease((t - 2.2) / 0.6))
    footer_note(d); return im
def s_boxes(t, dur):
    im, d = base(); tag(d, t, T["tag_box"]); y = title(d, t, T["box"]) + 50
    for i, b in enumerate(CFG["boxes"]):
        a = ease((t - 0.4 - i * 1.0) / 0.5); h = 110 + 66 * len(b["lines"])
        d.rounded_rectangle([80, y, W - 80, y + h], radius=28, fill=mix((30, 48, 43), a))
        d.text((112, y + 26), b["title"], font=font("Medium", 36), fill=mix(MUTED, a)); yy = y + 92
        for txt, kind in b["lines"]:
            col = {"good": ACC, "bad": RED, "gold": GOLD}.get(kind, INK)
            d.text((112, yy), txt, font=font("Bold", 42), fill=mix(col, a)); yy += 66
        y += h + 30
    footer_note(d); return im

FN = {"s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5, "s6": s6, "s7": s7, "s8": s8, "subs": s_subs, "boxes": s_boxes}
ORDER = CFG.get("order", ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"])
SCENES = [(f"p{i+1}", FN[k], CFG["dur"][f"p{i+1}"] if "order" in CFG else CFG["dur"][k]) for i, k in enumerate(ORDER)]
def render(name, fn, dur):
    tmp = f"{name}.tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-vf", (f"fade=t=out:st={dur - 0.25}:d=0.25" if name in ("s1", "p1") else f"fade=t=in:st=0:d=0.25,fade=t=out:st={dur - 0.25}:d=0.25"),
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for i in range(int(round(dur * FPS))):
        p.stdin.write(fn(i / FPS, dur).tobytes())
    p.stdin.close()
    if p.wait() == 0: os.replace(tmp, f"{name}.mp4")



if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True); os.chdir(OUT)
    if len(sys.argv) > 2 and sys.argv[2] == "frames":
        for name, fn, dur in SCENES: fn(dur - 0.1, dur).save(f"frame_{name}.png")
        sys.exit()
    only = sys.argv[2:] or [n for n, _, _ in SCENES]
    for name, fn, dur in SCENES:
        if name in only: render(name, fn, dur)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n, _, _ in SCENES))
