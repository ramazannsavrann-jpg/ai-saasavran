"""Airfryer TR v4 — hareketli 3B sahneler. Kullanım: python3 anim.py marks.json sahne çıktı.mp4"""
import sys, json, math, subprocess
sys.path.insert(0, "/tmp/v4")
from k import *
from data import B, Q, cum

GREEN = (24, 170, 120); AMBER = (240, 176, 0)
FPS = 30

def cl(x, a=0.0, b=1.0): return max(a, min(b, x))
def eo(x): x = cl(x); return 1 - (1 - x) ** 3              # ease-out
def eio(x): x = cl(x); return x * x * (3 - 2 * x)          # ease-in-out
def back(x):                                               # hafif taşma
    x = cl(x); c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
def ph(t, a, d): return cl((t - a) / d)                    # faz 0..1

def header(F, t, tag, title, sub=None, tagcol=INK, y=200):
    k = eo(ph(t, 0, 0.45)); dx = -70 * (1 - k)
    F.pill(80 + dx, y, tag, tagcol)
    yy = y + 86
    for i, line in enumerate(title.split("\n")):
        kk = eo(ph(t, 0.06 * (i + 1), 0.45))
        F.text((80 - 90 * (1 - kk), yy), line, f("Black", 76)); yy += 86
    if sub:
        kk = eo(ph(t, 0.2, 0.45))
        F.text((80 - 60 * (1 - kk), yy + 6), sub, f("SemiBold", 32, False), SUB)
    return yy

def big3d(F, xy, s, size, c, depth=14, anchor="mm"):
    ft = f("Black", size)
    for i in range(depth, 0, -1):
        F.text((xy[0] + i * 0.8, xy[1] + i), s, ft, shade(c, 0.55 + 0.02 * (depth - i)), anchor)
    F.text(xy, s, ft, c, anchor)

FOOT = "22 Kasım 2026 · Türkiye · Yapay zekâ cevapları, tavsiye değildir. Adlar sahiplerine aittir."

# ---------------- 1) Kanca ----------------
def s_hook(F, t, M, dur):
    F.pill(80, 200, "KASIM FIRSATLARI · AIRFRYER", bg=RED, size=26)
    lines = ["66 yapay zekâ cevabı.", "Fakir’in adı", "kaç kez geçti?"]
    sizes = [64, 64, 64]
    for i, s in enumerate(lines):
        k = eo(ph(t, 0.1 + i * 0.35, 0.4))
        F.text((80 - 100 * (1 - k), 300 + i * 80), s, f("Black", sizes[i]))
    tz = M["hic"] - M["s_hook"] - 0.15
    k = ph(t, tz, 0.5)
    kq = eo(ph(t, 1.2, 0.6))
    if kq > 0 and t < tz:
        bob = 14 * math.sin(t * 3.2)
        F.ellipse_shadow(480, 1170, 200 * kq, 32 * kq, alpha=70, blur=30)
        big3d(F, (480, 900 + bob + 300 * (1 - kq)), "?", int(520 * (0.7 + 0.3 * kq)), (170, 178, 205), depth=22)
    if k > 0:
        sc = back(k)
        F.ellipse_shadow(480, 1170, 260 * sc, 40 * sc, alpha=int(110 * cl(k * 2)), blur=30)
        y = 900 - 500 * (1 - eo(k))
        size = max(20, int(560 * (0.6 + 0.4 * sc)))
        sh = 6 * math.sin(t * 40) * cl(1 - (t - tz - 0.5) / 0.4) if t > tz + 0.5 else 0
        big3d(F, (480 + sh, y), "0", size, RED, depth=26)
    k2 = eo(ph(t, 0.5, 0.5))
    F.card((80, 1230 + 140 * (1 - k2), 880, 1340 + 140 * (1 - k2)), r=30)
    F.text((480, 1285 + 140 * (1 - k2)), "ChatGPT · Claude · Perplexity · Gemini", f("Bold", 34), INK, "mm")
    F.foot("22 Kasım 2026 · Türkiye · Türkçe sorular · yapay zekâ cevapları, tavsiye değildir")

# ---------------- 2) Sıralama yarışı ----------------
def race_schedule(M):
    s0 = M["s_race"]; tb, ty, ts, te = M["besinci"], M["yedinci"], M["sonuc"], M["s_cosori"]
    ends = []
    a, b = s0 + 1.0, tb + 0.5
    for i in range(5): ends.append(a + (b - a) * (i + 1) / 5)
    a, b = ty, ts - 0.2
    for i in range(2): ends.append(a + (b - a) * (i + 1) / 2)
    a, b = ts + 0.1, te - 0.9
    for i in range(4): ends.append(a + (b - a) * (i + 1) / 4)
    starts = [s0 + 0.6] + ends[:-1]
    return [(starts[i] - s0, ends[i] - s0) for i in range(11)]

def ranks(tot): return {b: i for i, b in enumerate(sorted(B, key=lambda b: (-tot[b], B.index(b))))}

def s_race(F, t, M, dur):
    F.series()
    header(F, t, "Sıralama yarışı", "Yapay zekâ kimi\nöneriyor?", "Soru soru, kaç cevapta adı geçti")
    sch = M["_sch"]
    # hangi adımdayız
    step, frac = 0, 0.0
    for i, (a, b) in enumerate(sch):
        if t >= a: step, frac = i, eio((t - a) / max(0.05, b - a))
    c0, c1 = cum(step), cum(step + 1)
    val = {b: c0[b] + (c1[b] - c0[b]) * frac for b in B}
    r0, r1 = ranks(c0), ranks(c1)
    if t < sch[0][0]: val = {b: 0 for b in B}; frac = 0
    # soru kartı
    k = eo(ph(t, 0.15, 0.45)); dy = 120 * (1 - k)
    F.card((80, 520 + dy, 880, 650 + dy), r=30)
    n = step + 1
    F.text((112, 552 + dy), f"SORU {n} / 11", f("ExtraBold", 26), RED)
    qk = eo(ph(t, sch[step][0], 0.25))
    F.text((112 + 40 * (1 - qk), 588 + dy), "“" + Q[step][0] + "”", f("Bold", 36), INK)
    for i in range(11):
        x0 = 112 + i * 64
        on = i < step or (i == step and frac > 0)
        F.d.rounded_rectangle(P(x0, 636 - 6 + dy, x0 + 52, 636 + dy), radius=3 * S, fill=(RED if on else (210, 214, 232)))
    # çubuklar
    top_y, stepy, bh = 704, 72, 44
    x0, maxlen = 270, 540
    lead = max(val.values())
    mx = max(lead, 6)
    for b in B:
        rk = r0[b] + (r1[b] - r0[b]) * frac
        ent = eo(ph(t, 0.2 + 0.05 * r0[b], 0.4))
        y = top_y + rk * stepy
        xo = -200 * (1 - ent)
        c = COL[b] if val[b] > 0 else (190, 196, 214)
        F.text((250 + xo, y + bh / 2 - 4), b, f("Bold", 32), INK, "rm")
        L = max(10, maxlen * val[b] / mx) * ent
        F.hbar(x0 + xo, y, L, bh, c)
        F.text((x0 + xo + L + 38, y + bh / 2 - 4), str(int(round(val[b]))), f("Black", 40), INK, "lm")
    yb = top_y + 7 * stepy + bh + 4
    t_end = sch[-1][1]
    tot = {b: int(round(val[b])) for b in B}
    order = sorted(B, key=lambda b: (-val[b], B.index(b)))
    if t > t_end:
        kk = eo(ph(t, t_end, 0.4))
        F.text((80 - 80 * (1 - kk), yb + 10), f"Philips 56 · Xiaomi 37  →  fark 19", f("ExtraBold", 40), INK)
        pulse = 1 + 0.06 * math.sin((t - t_end) * 9) * cl(1 - (t - t_end) / 2.0)
        F.text((80, yb + 56), "Fakir: 66 cevapta 0", f("ExtraBold", int(40 * pulse)), RED)
    elif t > sch[0][1]:
        a, b2 = order[0], order[1]
        txt = f"{a} önde: {tot[a]} – {tot[b2]}" if tot[a] != tot[b2] else f"Başa baş: {tot[a]} – {tot[b2]}"
        F.text((80, yb + 10), txt, f("ExtraBold", 40), INK)
    F.foot("ChatGPT + Claude + Perplexity · soru başına 6 canlı aramalı cevap · 22 Kas 2026 · Türkiye")

# ---------------- 3) Cosori ----------------
def s_cosori(F, t, M, dur):
    F.series()
    header(F, t, "Yapay zekâ karşılaştırması", "Cosori’yi kim\nanıyor?", "Cosori’nin önerildiği cevap sayısı")
    eng = [("ChatGPT", 0, 22), ("Claude", 10, 22), ("Perplexity", 0, 22), ("Gemini", 21, 30)]
    base, maxh = 1150, 470
    order_t = [0.9, 0.5, 0.9, 0.3]   # Gemini önce (anlatım sırası), sonra Claude, sonra sıfırlar
    tg = M["hic_anmadi"] - M["s_cosori"] - 0.5
    starts = {"Gemini": 0.35, "Claude": 0.75, "ChatGPT": tg, "Perplexity": tg + 0.15}
    for i, (e, v, n) in enumerate(eng):
        x = 100 + i * 196; w = 120
        k = eo(ph(t, starts[e], 0.7)); kb = eo(ph(t, starts[e], 0.3))
        h = max(10, maxh * v / n * k) if v else 10
        F.ellipse_shadow(x + w / 2 + 14, base + 6, (w / 2 + 20) * kb + 1, 12 * kb + 1, alpha=70, blur=10)
        if kb > 0:
            F.vbar(x, base, w, h, COL["Cosori"] if v else (205, 210, 228), depth=34)
            big3d(F, (x + w / 2 + 6, base - h - 70), str(int(round(v * k))), int(64 * (0.7 + 0.3 * back(kb))), INK if v else RED, depth=5)
            F.text((x + w / 2 + 10, base - h - 22), f"/{n}", f("Bold", 26, False), SUB, "mm")
        F.text((x + w / 2 + 14, base + 50), e, f("ExtraBold", 30), INK, "mm")
    k = eo(ph(t, tg + 0.3, 0.4)); dy = 160 * (1 - k)
    if k > 0:
      F.card((80, 1226 + dy, 880, 1340 + dy), r=28)
      F.text((112, 1262 + dy), "ChatGPT ve Perplexity: hiç anmadı", f("ExtraBold", 34), RED)
      F.text((112, 1308 + dy), "Gemini hafızadan cevap veriyor (30 cevap), diğerleri canlı arama (22)", f("Medium", 22, False), SUB)
    F.foot(FOOT)

# ---------------- 4) Soru bazında ----------------
def s_soru(F, t, M, dur):
    F.series()
    header(F, t, "Soru bazında", "Soru değişince\nkazanan değişiyor", "6 canlı cevapta adı geçme sayısı")
    rows = [("“Pencereli airfryer?”", [("Xiaomi", 5)]),
            ("“Garantisi, servisi iyi?”", [("Philips", 6), ("Tefal", 4)]),
            ("“Kalabalık aile için?”", [("Philips", 6), ("Ninja", 5)]),
            ("“Yerli mi yabancı mı?”", [("Karaca", 4), ("Arzum", 4), ("Xiaomi", 4)])]
    tp = M["pencereli"] - M["s_soru"] - 0.2; tgr = M["garanti"] - M["s_soru"] - 0.2
    st = [tp, tgr, tgr + 0.6, tgr + 1.1]
    y = 560
    for i, (q, ws) in enumerate(rows):
        k = eo(ph(t, st[i], 0.4))
        if k <= 0: y += 190; continue
        dx = 900 * (1 - k)
        F.card((80 + dx, y, 880 + dx, y + 168), r=30)
        F.text((112 + dx, y + 40), q, f("ExtraBold", 34), INK, "lm")
        x = 112 + dx
        for j, (b, v) in enumerate(ws):
            kk = back(ph(t, st[i] + 0.25 + j * 0.12, 0.35))
            if kk > 0: F.sphere(x + 30, y + 112, max(2, 28 * kk), COL[b])
            F.text((x + 70, y + 112), b, f("Bold", 30), INK, "lm")
            tw = F.tw(b, f("Bold", 30))
            F.text((x + 80 + tw, y + 112), f"{v}/6", f("Black", 30), COL[b], "lm")
            x += 70 + tw + 90 + 36
        y += 190
    F.foot(FOOT)

# ---------------- 5) Güven puanı ----------------
def s_guven(F, t, M, dur):
    F.series()
    header(F, t, "Güven puanı", "Bu sonuçlara\nne kadar güvenilir?", "Aynı 11 soruyu her motora iki kez sorduk")
    cx, cy, R, th = 480, 960, 300, 70
    segs = [(0, 40, RED), (40, 70, AMBER), (70, 100, GREEN)]
    ka = eo(ph(t, 0.2, 0.6))
    lim = 100 * ka
    for depth in range(18, 0, -2):
        for a0, a1, c in segs:
            if a0 < lim:
                F.d.arc(P(cx - R, cy - R + depth, cx + R, cy + R + depth), 180 + a0 * 1.8, 180 + min(a1, lim) * 1.8 - 0.6, fill=shade(c, 0.6), width=th * S)
    for a0, a1, c in segs:
        if a0 < lim:
            F.d.arc(P(cx - R, cy - R, cx + R, cy + R), 180 + a0 * 1.8, 180 + min(a1, lim) * 1.8 - 0.6, fill=c, width=th * S)
    tn = M["seksen"] - M["s_guven"]
    kn = eio(ph(t, tn - 1.4, 1.4))
    v = 84 * kn + (2 * math.sin((t - tn) * 12) * cl(1 - (t - tn) / 0.6) if t > tn else 0)
    ang = math.radians(180 + v * 1.8)
    nx, ny = cx + 150 * math.cos(ang), cy + 150 * math.sin(ang)
    F.d.line(P(cx + 4, cy + 8, nx + 4, ny + 8), fill=(40, 40, 90, 70), width=16 * S)
    F.d.line(P(cx, cy, nx, ny), fill=INK, width=14 * S)
    F.d.ellipse(P(cx - 30, cy - 30, cx + 30, cy + 30), fill=INK)
    big3d(F, (cx - 20, cy - 130), str(int(round(84 * kn))), 130, INK, depth=7)
    if t > tn: F.text((cx, cy + 62), "/100 · Yüksek", f("ExtraBold", 36), GREEN, "mm")
    else: F.text((cx, cy + 62), "/100", f("ExtraBold", 36), SUB, "mm")
    kc = eo(ph(t, 0.4, 0.4)); dy = 300 * (1 - kc)
    F.card((80, 1110 + dy, 880, 1340 + dy), r=30)
    tcl = M["claude"] - M["s_guven"] - 0.2
    items = [("Claude: cevabını hiç değiştirmedi", GREEN, tcl), ("ChatGPT: 3 soruda değiştirdi", AMBER, tcl + 0.5),
             ("Perplexity: 3 soruda değiştirdi", AMBER, tcl + 0.8)]
    for i, (s, c, ts) in enumerate(items):
        k = eo(ph(t, ts, 0.35))
        if k <= 0: continue
        yy = 1155 + i * 70 + dy
        F.d.ellipse(P(128 - 12 * k, yy - 12 * k, 128 + 12 * k, yy + 12 * k), fill=c)
        F.text((160 + 40 * (1 - k), yy), s, f("Bold", 34), INK, "lm")
    F.foot("Güven puanı: cevap sayısı + aynı soruda tutarlılık (66 canlı aramalı cevap)")

# ---------------- 6) Yapay zekâ ve Shopping ----------------
def s_shop(F, t, M, dur):
    F.series()
    header(F, t, "Google Shopping", "Yapay zekâ ile\nShopping aynı mı?", "Arama: “airfryer” · her markanın ilk ilanı")
    L = [("Philips", "1."), ("Xiaomi", "2."), ("Ninja", "3."), ("Karaca", "4."), ("Arzum", "6."), ("Fakir", "yok")]
    Rr = [("Xiaomi", "1."), ("Philips", "2."), ("Fakir", "10."), ("Karaca", "13."), ("Arzum", "17."), ("Ninja", "yok")]
    F.text((210, 580), "YAPAY ZEKÂ", f("ExtraBold", 28), SUB, "mm")
    F.text((750, 580), "SHOPPING", f("ExtraBold", 28), SUB, "mm")
    ys = [650 + i * 106 for i in range(6)]
    ly = {b: ys[i] for i, (b, _) in enumerate(L)}; ry = {b: ys[i] for i, (b, _) in enumerate(Rr)}
    tl = 1.2; tf = M["fakir2"] - M["s_shop"] - 0.3
    kl = eio(ph(t, tl, 1.0))
    for b in ly:
        c = COL[b]; hot = b in ("Fakir", "Ninja")
        a = 255 if hot else 120; w = 10 if hot else 6
        x0, x1, y0, y1 = 350, 610, ly[b] + 38, ry[b] + 38
        kk = kl if not hot else eio(ph(t, min(tf, tl + 0.4), 0.8))
        n = max(2, int(41 * kk))
        pts = []
        for i in range(n):
            tt = i / 40; ss = tt * tt * (3 - 2 * tt)
            pts.append(((x0 + (x1 - x0) * tt) * S, (y0 + (y1 - y0) * ss) * S))
        if kk > 0.02: F.d.line(pts, fill=c + (a,), width=w * S, joint="curve")
    for side, data, x, t0 in [("L", L, 80, 0.4), ("R", Rr, 610, 0.8)]:
        for i, (b, r) in enumerate(data):
            k = eo(ph(t, t0 + i * 0.06, 0.35))
            if k <= 0: continue
            xo = (-300 if side == "L" else 300) * (1 - k)
            y = ys[i]; c = COL[b]; miss = r == "yok"
            F.shadow((x + xo, y, x + xo + 270, y + 76), r=20, blur=12, alpha=50, dy=8)
            F.d.rounded_rectangle(P(x + xo, y, x + xo + 270, y + 76), radius=20 * S, fill=(255, 255, 255) if not miss else (255, 236, 238))
            F.d.rounded_rectangle(P(x + xo, y, x + xo + 12, y + 76), radius=6 * S, fill=c)
            F.text((x + xo + 34, y + 38), b, f("ExtraBold", 32), INK, "lm")
            F.text((x + xo + 250, y + 38), r, f("Black", 32), RED if miss else c, "rm")
    k = eo(ph(t, tf, 0.4))
    if k > 0: F.text((80 - 80 * (1 - k), 1300), "Fakir Shopping’de 10. ama yapay zekâda yok.", f("ExtraBold", 32), RED)
    F.foot("Google Shopping Türkiye · 22 Kas 2026 · yalnız takip edilen 8 marka gösterildi")

# ---------------- 7) Kaynak ağı ----------------
LEFT = [("havafritozu.com", 12), ("oneriburada.com", 11), ("philips.com.tr", 10), ("enrehber.com", 10), ("eniyilerden.com", 9), ("mi.com", 6)]
RIGHT = ["Philips", "Xiaomi", "Ninja", "Tefal", "Karaca"]
LINKS = [[0,0,12],[0,1,8],[0,2,6],[0,3,4],[0,4,3],[1,0,9],[1,1,9],[1,2,7],[1,3,5],[1,4,3],[2,0,10],[2,1,4],[2,2,1],[2,3,2],[2,4,3],
         [3,0,7],[3,1,7],[3,2,5],[3,3,7],[3,4,4],[4,0,6],[4,1,6],[4,2,5],[4,3,6],[4,4,4],[5,0,4],[5,1,6],[5,3,1],[5,4,1]]
def s_net(F, t, M, dur):
    F.series()
    header(F, t, "Kaynak ağı", "Yapay zekâ\nnereye bakıyor?", "Çizgi kalınlığı = siteyi gösterip markayı anan cevap")
    lys = [600 + i * 120 for i in range(6)]; rys = [640 + i * 140 for i in range(5)]
    tm = M["encok"] - M["s_net"] - 0.2
    kl = eio(ph(t, 0.9, 1.2))
    for a, b, v in sorted(LINKS, key=lambda z: z[2]):
        c = COL[RIGHT[b]]
        x0, y0, x1, y1 = 420, lys[a] + 40, 720, rys[b]
        hl = (a == 0 and t > tm)
        n = max(2, int(41 * kl))
        pts = []
        for i in range(n):
            tt = i / 40; mt = 1 - tt
            x = mt**3 * x0 + 3 * mt**2 * tt * (x0 + 140) + 3 * mt * tt**2 * (x1 - 140) + tt**3 * x1
            y = mt**3 * y0 + 3 * mt**2 * tt * y0 + 3 * mt * tt**2 * y1 + tt**3 * y1
            pts.append((x * S, y * S))
        al = 70 + v * 14
        if t > tm and a != 0: al = int(al * 0.35)
        if kl > 0.02: F.d.line(pts, fill=c + (min(255, al + (60 if hl else 0)),), width=int(1.6 * v * S), joint="curve")
    for i, (s, n) in enumerate(LEFT):
        k = eo(ph(t, 0.3 + i * 0.07, 0.35))
        if k <= 0: continue
        y = lys[i]; xo = -360 * (1 - k)
        F.shadow((80 + xo, y, 420 + xo, y + 80), r=20, blur=12, alpha=50, dy=8)
        hot = i == 0 and t > tm
        F.d.rounded_rectangle(P(80 + xo, y, 420 + xo, y + 80), radius=20 * S, fill=(255, 236, 238) if hot else (255, 255, 255),
                              outline=RED if hot else None, width=3 * S)
        F.text((104 + xo, y + 40), s, f("Bold", 27, False), INK, "lm")
        F.text((400 + xo, y + 40), str(n), f("Black", 30), RED if i == 0 else SUB, "rm")
    for j, b in enumerate(RIGHT):
        k = back(ph(t, 0.6 + j * 0.08, 0.4))
        if k <= 0: continue
        F.sphere(770, rys[j], max(2, 46 * k), COL[b])
        if k > 0.6: F.text((770, rys[j]), b, f("ExtraBold", 19), (255, 255, 255), "mm")
    k = eo(ph(t, tm, 0.4))
    if k > 0: F.text((80 - 80 * (1 - k), 1336), "En çok gösterilen: havafritozu.com (12 cevap)", f("ExtraBold", 30), INK)
    F.foot("Sağdaki sayı = siteyi kaynak gösteren cevap · 66 canlı aramalı cevap")

# ---------------- 8) Kapanış ----------------
def s_close(F, t, M, dur):
    F.pill(80, 200, "KASIM FIRSATLARI", bg=RED, size=26)
    for i, s in enumerate(["Peki senin markan", "yapay zekâda", "kaç kez geçiyor?"]):
        k = eo(ph(t, 0.05 + i * 0.15, 0.4))
        F.text((80 - 100 * (1 - k), 300 + i * 84), s, f("Black", 70))
    for i, (b, v) in enumerate([("Philips", 56), ("Xiaomi", 37), ("Ninja", 21)]):
        k = back(ph(t, 0.3 + i * 0.15, 0.45))
        if k <= 0: continue
        r = (60 + 70 * math.sqrt(v / 56)) * k
        x = [320, 600, 780][i]; y = [860, 900, 1000][i] + 8 * math.sin(t * 2.4 + i)
        F.sphere(x, y, max(2, r), COL[b])
        if k > 0.7:
            F.text((x, y - 8), b, f("ExtraBold", 30 if r > 90 else 22), (255, 255, 255), "mm")
            F.text((x, y + 28), str(v), f("Black", 32 if r > 90 else 24), (255, 255, 255), "mm")
    k = back(ph(t, 0.8, 0.4))
    if k > 0:
        F.sphere(150, 1010, max(2, 30 * k), COL["Fakir"]); F.text((150, 1010), "0", f("Black", 26), (255, 255, 255), "mm")
        F.text((150, 1072), "Fakir", f("Bold", 24), RED, "mm")
    k = eo(ph(t, 0.9, 0.45)); dy = 220 * (1 - k)
    F.card((80, 1150 + dy, 880, 1330 + dy), r=30)
    F.text((480, 1206 + dy), "ChatGPT · Gemini · Claude · Perplexity", f("ExtraBold", 32), INK, "mm")
    F.text((480, 1270 + dy), "Ücretsiz kontrol, kayıt gerekmez", f("Bold", 32), GREEN, "mm")
    F.foot(FOOT)

SCENES = {"hook": s_hook, "race": s_race, "cosori": s_cosori, "soru": s_soru, "guven": s_guven,
          "shop": s_shop, "net": s_net, "close": s_close}
ORDER = ["hook", "race", "cosori", "soru", "guven", "shop", "net", "close"]

def render(M, name, out, still=None):
    i = ORDER.index(name)
    t0 = M["s_" + name]; t1 = M["s_" + ORDER[i + 1]] if i + 1 < len(ORDER) else M["end"]
    dur = t1 - t0
    M["_sch"] = race_schedule(M)
    fn = SCENES[name]
    if still is not None:
        F = Frame(); fn(F, still, M, dur); F.save(out); return
    nfr = int(round(t1 * FPS)) - int(round(t0 * FPS))
    tmp = out[:-4] + ".tmp.mp4"
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", tmp], stdin=subprocess.PIPE)
    for k in range(nfr):
        F = Frame(); fn(F, k / FPS, M, dur); p.stdin.write(F.out())
    p.stdin.close(); assert p.wait() == 0
    import os; os.replace(tmp, out)

if __name__ == "__main__":
    M = json.load(open(sys.argv[1]))
    still = float(sys.argv[4]) if len(sys.argv) > 4 else None
    render(M, sys.argv[2], sys.argv[3], still)
