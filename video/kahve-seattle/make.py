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

# GÜVENLİ ALAN (Shorts arayüzü): üst 160px, alt 1400px sonrası ve y>1000 iken x>900 boş kalır.
# Tüm içerik x 80..XR, y 160..YB arasında. Kontrol: guvenli_alan_kontrol().
XR, YB = 880, 1390
BLOCKED = [(0, 0, W, 160), (0, 1400, W, H), (900, 1000, W, H)]

def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

def logo(d, x, y, s=64):
    d.rounded_rectangle([x, y, x + s, y + s], radius=s // 4, fill=(15, 110, 92))
    c = (x + s / 2, y + s / 2)
    r1 = s * 5 / 32; d.ellipse([c[0] - r1, c[1] - r1, c[0] + r1, c[1] + r1], fill=(244, 247, 245))
    r2 = s * 10 / 32
    for i in range(0, 360, 36):
        d.arc([c[0] - r2, c[1] - r2, c[0] + r2, c[1] + r2], i, i + 18, fill=(244, 247, 245), width=max(2, s // 16))

def header(d):
    logo(d, 70, 175, 64)
    d.text((155, 172), "AI SaaSavran", font=font("Bold", 40), fill=INK)
    d.text((155, 220), "aisaasavran.com", font=font("Regular", 26), fill=MUTED)

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def text_block(d, text, f, y, fill=INK, alpha=1.0, gap=1.18, x=80, maxw=XR - 80):
    col = tuple(int(BG[i] + (fill[i] - BG[i]) * alpha) for i in range(3))
    for line in wrap(d, text, f, maxw):
        d.text((x, y), line, font=f, fill=col); y += int(f.size * gap)
    return y

def base():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im); header(d)
    return im, d

def footer_note(d, a=1.0):
    pass  # Eskiden en altta adlar vardı; Shorts arayüzü kapattığı için kaldırıldı -> s_names kartı

def fit(d, text, weight, size, maxw, low=26):
    """Yazı XR'yi aşmasın: sığana kadar küçült."""
    while size > low and d.textlength(text, font=font(weight, size)) > maxw: size -= 2
    return font(weight, size)

def rows_step(y, n, want, end=YB - 60):
    """Satır aralığı: YB'yi aşmayacak şekilde küçült."""
    return max(60, min(want, (end - y) / max(n, 1)))


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
    x = 80; y = 320
    for e, c in zip([x[0] for x in CFG.get("engines", [])] or ["ChatGPT", "Claude", "Gemini"], (GOLD, ACC, (150, 170, 240), (230, 160, 210))):
        f = font("Bold", 38); w = d.textlength(e, font=f) + 44
        d.rounded_rectangle([x, y, x + w, y + 72], radius=36, outline=c, width=4); d.text((x + 22, y + 12), e, font=f, fill=c); x += w + 18
    fb0, fh2 = font("ExtraBold", 64), font("SemiBold", 50)
    for sz in (104, 96, 88, 80, 72):  # kanca YB'yi aşmasın: sığana kadar küçült
        fh = font("Black", sz)
        end = (480 + len(wrap(d, T["hook"], fh, XR - 80)) * int(sz * 1.18) + (200 if T.get("badge") else 0)
               + 40 + len(wrap(d, T["hook2"], fh2, XR - 80)) * 59 + 40 + len(wrap(d, T["note"], font("Medium", 38), XR - 80)) * 45)
        if end <= YB: break
    y = text_block(d, T["hook"], fh, 480, INK, 1.0)
    b = T.get("badge")
    if b:
        a = ease((t - 0.3) / 0.5); fb = font("ExtraBold", 64); w = d.textlength(b, font=fb) + 80
        d.rounded_rectangle([80, y + 40, 80 + w, y + 160], radius=30, fill=mix(GOLD, a)); d.text((120, y + 62), b, font=fb, fill=BG if a > 0.5 else mix(GOLD, a)); y += 200
    y = text_block(d, T["hook2"], font("SemiBold", 50), y + 40, ACC, ease((t - 0.6) / 0.6))
    text_block(d, T["note"], font("Medium", 38), y + 40, MUTED, ease((t - 1.4) / 0.6))
    footer_note(d); return im
def s2(t, dur):
    im, d = base(); tag(d, t, T["tag_brands"]); y = title(d, t, T["who"], T["who_sub"]) + 60; n = CFG["n2"]
    step = rows_step(y, len(CFG["brands"]), 170)
    for i, (name, k) in enumerate(CFG["brands"]):
        p = ease((t - 0.5 - i * 0.25) / 0.9); col = GOLD if i == 0 else ACC
        fs = int(min(52, step * 0.42)); bh = int(min(40, step * 0.26))
        d.text((80, y), name, font=font("Bold", fs), fill=GOLD if i == 0 else INK)
        rtext(d, XR, y, f"{round(k * p)}/{n}", font("Bold", fs), INK)
        bar(d, 80, y + fs + 14, XR, k / n * p, col, bh); y += step
    footer_note(d); return im
def s3(t, dur):
    im, d = base(); tag(d, t, T["tag_eng"]); y = title(d, t, T["eng"], T["eng_sub"]) + (140 if len(CFG["engines"]) >= 4 else 90)
    four = len(CFG["engines"]) >= 4 or any(len(e[0]) > 8 for e in CFG["engines"])
    xs = [470, 605, 742, 880] if len(CFG["engines"]) >= 4 else ([560, 720, 880] if four else [540, 710, 880]); cols = [GOLD, ACC, (150, 170, 240), (230, 160, 210)]
    for (lab, sub), x, c in zip(CFG["engines"], xs, cols):
        rtext(d, x, y - 80, lab, font("Bold", 26 if four else 36), c); rtext(d, x, y - 36, sub, font("Medium", 26 if four else 28), MUTED)
        if lab == "Gemini" and CFG.get("gemini_label"):
            fl = font("Bold", 24); gl = CFG["gemini_label"]; pw = d.textlength(gl, font=fl) + 28
            d.rounded_rectangle([x - pw, y - 132, x, y - 96], radius=18, fill=mix(c, 0.22), outline=c, width=2)
            d.text((x - pw + 14, y - 127), gl, font=fl, fill=c)
    y += 20; step = rows_step(y, len(CFG["eng_rows"]), 125, YB - 120)
    for i, row in enumerate(CFG["eng_rows"]):
        al = ease((t - 0.5 - i * 0.3) / 0.5); hl = row[0] in CFG["eng_hl"]
        if hl: d.rounded_rectangle([60, y - 14, XR + 10, y + 92], radius=20, fill=mix((40, 62, 55), al))
        d.text((80, y + 14), row[0], font=fit(d, row[0], "Bold", 40 if four else 50, xs[0] - 80 - 75, 26), fill=mix(INK, al))
        for v, x, c in zip(row[1:], xs, cols): rtext(d, x, y, str(v), font("ExtraBold", 56 if four else 64), mix(c if v else RED, al))
        y += step
    text_block(d, T["eng_note"], font("SemiBold", 40), y + 30, ACC, ease((t - 2.4) / 0.6))
    footer_note(d); return im
def s4(t, dur):
    im, d = base(); tag(d, t, T["tag_q"]); y = title(d, t, T["byq"], T["byq_sub"]) + 50
    step = rows_step(y, len(CFG["questions"]), 225, YB + 25); bh = step - 25
    for i, (q, parts) in enumerate(CFG["questions"]):
        al = ease((t - 0.4 - i * 0.6) / 0.5)
        d.rounded_rectangle([80, y, XR, y + bh], radius=24, fill=mix((30, 48, 43), al))
        d.text((112, y + 22), q, font=fit(d, q, "Medium", 38, XR - 144), fill=mix(MUTED, al)); x = 112
        joined = "    ".join(f"{a} {b}" for a, b, _ in parts); f = fit(d, joined, "Bold", 42, XR - 144, 24)
        for name, val, bad in parts:
            s = f"{name} {val}"
            d.text((x, y + bh / 2), s, font=f, fill=mix(RED if bad else INK, al)); x += d.textlength(s, font=f) + d.textlength("    ", font=f)
        y += step
    footer_note(d); return im
def s5(t, dur):
    im, d = base(); tag(d, t, T["tag_prod"]); y = title(d, t, T["prod"], T["prod_sub"]) + 70; n = CFG["n"]
    for i, (name, a, b) in enumerate(CFG["products"]):
        p = ease((t - 0.5 - i * 0.3) / 0.8)
        d.text((80, y), name, font=font("Bold", 52), fill=GOLD if i == 0 else INK)
        for j, (lab, v, c) in enumerate(((CFG["engines"][0][0], a, GOLD), (CFG["engines"][1][0], b, ACC))):
            yy = y + 78 + j * 62; d.text((80, yy), lab, font=font("Medium", 32), fill=MUTED)
            bar(d, 300, yy + 2, XR - 140, v / n * p, c, 34); rtext(d, XR, yy - 4, f"{round(v * p)}/{n}", font("Bold", 40), INK)
        y += 250
    footer_note(d); return im
def s6(t, dur):
    im, d = base(); tag(d, t, T["tag_acc"]); y = title(d, t, T["acc"]) + 60
    a1 = ease((t - 0.4) / 0.5); d.rounded_rectangle([80, y, XR, y + 360], radius=28, fill=mix((30, 48, 43), a1))
    d.text((112, y + 26), T["acc_box"], font=font("Medium", 38), fill=mix(MUTED, a1))
    for j, (lab, v, c) in enumerate(CFG["accuracy"]):
        x = 112 + j * 250; d.text((x, y + 100), str(v), font=font("ExtraBold", 110), fill=mix(c and tuple(c) or INK, a1))
        d.text((x, y + 240), lab, font=font("SemiBold", 36), fill=mix(INK, a1))
    y += 400; a2 = ease((t - 1.6) / 0.5)
    d.rounded_rectangle([80, y, XR, y + 300], radius=28, fill=mix((30, 48, 43), a2))
    d.text((112, y + 26), T["shop_box"], font=font("Medium", 38), fill=mix(MUTED, a2))
    d.text((112, y + 90), T["shop_big"], font=font("ExtraBold", 96), fill=mix(GOLD, a2))
    d.text((112, y + 215), T["shop_sub"], font=font("SemiBold", 36), fill=mix(INK, a2))
    footer_note(d); return im
def s7(t, dur):
    im, d = base(); tag(d, t, T["tag_src"]); y = title(d, t, T["src"], T["src_sub"]) + 60; mx = CFG["sources"][0][1]
    step = rows_step(y, len(CFG["sources"]), 140, YB - 120)
    for i, (dom, n) in enumerate(CFG["sources"]):
        p = ease((t - 0.4 - i * 0.2) / 0.7)
        d.text((80, y), dom, font=font("Bold", 46), fill=INK); rtext(d, XR, y, f"{round(n * p)}", font("Bold", 46), INK)
        bar(d, 80, y + 64, XR, n / mx * p, GOLD if i == 0 else ACC, 32); y += step
    text_block(d, T["src_note"], font("SemiBold", 40), y + 20, ACC, ease((t - 2.0) / 0.6))
    footer_note(d); return im
def s8(t, dur):
    im, d = base()
    y = text_block(d, T["cta"], font("ExtraBold", 92), 470, INK, ease(t / 0.5))
    y = text_block(d, T["cta2"], font("Medium", 48), y + 30, MUTED, ease((t - 0.3) / 0.5))
    a3 = ease((t - 0.7) / 0.5); by = y + 70
    d.rounded_rectangle([80, by, XR, by + 150], radius=30, fill=mix(GREEN, a3))
    lab = "aisaasavran.com"; f = font("ExtraBold", 68); d.text(((80 + XR - d.textlength(lab, font=f)) / 2, by + 36), lab, font=f, fill=mix((255, 255, 255), a3))
    s = T["free"]; y = text_block(d, s, font("SemiBold", 46), by + 180, ACC, a3, x=(80 + XR - d.textlength(s, font=font("SemiBold", 46))) / 2)
    for sz in (28, 26, 24, 22):
        fd = font("Medium", sz); hgt = len(wrap(d, T["disc"], fd, XR - 80)) * int(sz * 1.18)
        if y + 30 + hgt <= YB: break
    text_block(d, T["disc"], fd, min(max(y + 40, 1150), YB - hgt), MUTED, a3)
    footer_note(d, a3); return im

def s_subs(t, dur):
    im, d = base(); tag(d, t, T["tag_subs"]); y = title(d, t, T["subs"], T["subs_sub"]) + 100; n = CFG["n2"]
    rtext(d, XR, y - 54, T["col_ai"], font("Bold", 34), ACC); d.text((80, y - 54), T["col_subs"], font=font("Bold", 34), fill=MUTED)
    step = rows_step(y, len(CFG["subs_rows"]), 160, YB - 120)
    for i, (name, subs, k) in enumerate(CFG["subs_rows"]):
        p = ease((t - 0.5 - i * 0.25) / 0.9); hl = name in CFG.get("subs_hl", [])
        d.text((80, y), name, font=font("Bold", 50), fill=GOLD if hl else INK)
        d.text((360, y + 6), subs, font=font("Medium", 40), fill=MUTED)
        rtext(d, XR, y, f"{round(k * p)}/{n}", font("Bold", 50), RED if k == 0 else INK)
        bar(d, 80, y + 72, XR, k / n * p, GOLD if hl else ACC, 34); y += step
    text_block(d, T["subs_note"], font("SemiBold", 40), y + 20, ACC, ease((t - 2.2) / 0.6))
    footer_note(d); return im
def s_boxes(t, dur):
    im, d = base(); tag(d, t, T["tag_box"]); y = title(d, t, T["box"]) + 50
    for i, b in enumerate(CFG["boxes"]):
        a = ease((t - 0.4 - i * 1.0) / 0.5); h = 110 + 66 * len(b["lines"])
        d.rounded_rectangle([80, y, XR, y + h], radius=28, fill=mix((30, 48, 43), a))
        d.text((112, y + 26), b["title"], font=fit(d, b["title"], "Medium", 36, XR - 144), fill=mix(MUTED, a)); yy = y + 92
        for txt, kind in b["lines"]:
            col = {"good": ACC, "bad": RED, "gold": GOLD}.get(kind, INK)
            d.text((112, yy), txt, font=fit(d, txt, "Bold", 42, XR - 144), fill=mix(col, a)); yy += 66
        y += h + 30
    footer_note(d); return im

def _names():
    if CFG.get("names_list"): return CFG["names_list"]
    return [x.strip() for x in CFG["names"].split(":", 1)[-1].split(",") if x.strip()]
LANG = CFG.get("lang") or ("tr" if any(c in json.dumps(T, ensure_ascii=False) for c in "çğıöşüÇĞİÖŞÜ") else "en")
def s_names(t, dur):
    """Kancadan hemen sonra: ölçülen gerçek adlar ortada, büyük etiketler (alfabetik, harf eşlemesi yok)."""
    im, d = base(); names = _names()
    head = T.get("names_title") or CFG["names"].split(":", 1)[0]
    f1 = font("ExtraBold", 66); y = 400
    for ln in wrap(d, head, f1, XR - 80):
        d.text(((W - d.textlength(ln, font=f1)) / 2, y), ln, font=f1, fill=INK); y += 80
    f = font("Bold", 42); gap = 14; h = 76; rows, row, w = [], [], 0
    for n in names:
        tw = d.textlength(n, font=f) + 64
        if row and w + gap + tw > 760: rows.append(row); row, w = [], 0
        row.append((n, tw)); w += (gap if w else 0) + tw
    rows.append(row); y += 50; k = 0
    for r in rows:
        x = (W - (sum(a for _, a in r) + gap * (len(r) - 1))) / 2
        for n, tw in r:
            a = ease((t - 0.15 - k * 0.1) / 0.3); k += 1
            if a > 0:
                yy = y + (1 - a) * 30
                d.rounded_rectangle([x, yy, x + tw, yy + h], radius=h // 2, outline=mix(ACC, a), width=5, fill=mix((22, 44, 39), a))
                d.text((x + 32, yy + 13), n, font=f, fill=mix(INK, a))
            x += tw + gap
        y += h + gap
    a2 = ease((t - 0.8) / 0.4)
    sub = T.get("names_sub") or ("Sonuçlarda harflerle gösterilir" if LANG == "tr" else "Shown as letters in the results")
    fs = font("SemiBold", 36); d.text(((W - d.textlength(sub, font=fs)) / 2, y + 30), sub, font=fs, fill=mix(MUTED, a2))
    ff = font("Medium", 28); yy = y + 100
    for ln in wrap(d, CFG.get("footer", ""), ff, 660):
        d.text(((W - d.textlength(ln, font=ff)) / 2, yy), ln, font=ff, fill=mix(MUTED, a2)); yy += 34
    return im

def guvenli_alan_kontrol(im, ad):
    """Shorts arayüzünün kapattığı alanlarda yazı/grafik varsa hata ver."""
    px = im.load(); hata = []
    for x0, y0, x1, y1 in BLOCKED:
        for yy in range(y0, y1, 4):
            for xx in range(x0, x1, 4):
                if max(abs(px[xx, yy][i] - BG[i]) for i in range(3)) > 12: hata.append((xx, yy)); break
            if hata: break
    if hata: print(f"GÜVENLİ ALAN HATASI: {ad} -> {hata[0]} (kapalı bölgede içerik var)")
    return not hata

_HERE = os.path.dirname(os.path.abspath(__file__))
def s_net(t, dur):
    """Kaynak ağı sahnesi: kodu sablon/kaynak_agi.py içinde."""
    import importlib.util
    p = os.path.join(_HERE, "kaynak_agi.py")
    if not os.path.exists(p): p = os.path.join(_HERE, "..", "sablon", "kaynak_agi.py")
    sp = importlib.util.spec_from_file_location("kaynak_agi", p); mod = importlib.util.module_from_spec(sp); sp.loader.exec_module(mod)
    return mod.scene(sys.modules[__name__], t, dur)

FN = {"s1": s1, "s2": s2, "s3": s3, "s4": s4, "s5": s5, "s6": s6, "s7": s7, "s8": s8, "subs": s_subs, "boxes": s_boxes, "names": s_names, "net": s_net}
ORDER = CFG.get("order", ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"])
# Marka kartı her zaman kancadan (ilk sahne) hemen sonra gelir. order'da "names" yoksa eklenir.
# Süresi: order'da yazılıysa sureler2'nin verdiği pN; değilse dur["names"] (yoksa 2.5 sn) — anlatımda kart için bir cümle olmalı.
_auto = "names" not in ORDER
SCENES = [(f"p{i+1}", FN[k], CFG["dur"][f"p{i+1}"] if "order" in CFG else CFG["dur"][k]) for i, k in enumerate(ORDER)]
if _auto: SCENES.insert(1, ("names", s_names, CFG.get("dur", {}).get("names", 2.5)))
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
        ok = True
        for name, fn, dur in SCENES:
            im = fn(dur - 0.1, dur); im.save(f"frame_{name}.png"); ok &= guvenli_alan_kontrol(im, name)
        sys.exit(0 if ok else 1)
    for name, fn, dur in SCENES:  # render öncesi her sahnenin son karesini kontrol et
        if not guvenli_alan_kontrol(fn(dur - 0.1, dur), name): sys.exit("Güvenli alan hatası: sahneyi düzelt, sonra render et.")
    only = sys.argv[2:] or [n for n, _, _ in SCENES]
    for name, fn, dur in SCENES:
        if name in only: render(name, fn, dur)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n, _, _ in SCENES))
