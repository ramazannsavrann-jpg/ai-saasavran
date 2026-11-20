"""Uzun video şablonu (16:9, 1920x1080) — 19 Kasım. Bölüm başına ayrı ses (narration-<ad>-cNN-<dil>.txt).
Kullanım:
  python3 uzun.py ayar.json narr      -> bölüm anlatımlarını video/narration-<ad>-cNN-<dil>.txt olarak yazar (TTS iş akışı için)
  python3 uzun.py ayar.json frames    -> her bölümün son karesi (önizleme)
  python3 uzun.py ayar.json render    -> ses-out/ses-<ad>-cNN-<dil>.(pcm|mp3) ile bölüm videoları + birleştirme + müzik
Sahne türleri: title, stats, bars, table, net, boxes, cta. Ayrıntı: README "UZUN VİDEO".
"""
import json, os, re, subprocess, sys, math
from PIL import Image, ImageDraw, ImageFont

CFG = json.load(open(sys.argv[1])); MODE = sys.argv[2] if len(sys.argv) > 2 else "frames"
HERE = os.path.dirname(os.path.abspath(sys.argv[1])); VIDEO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
NAME, LANG = CFG["name"], CFG["lang"]; OUT = os.path.join(HERE, f"{NAME}-{LANG}")
W, H, FPS = 1920, 1080, 30
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
def font(w, s): return ImageFont.truetype(F.format(w), s)
BG = (14, 26, 23); INK = (236, 244, 241); MUTED = (157, 178, 171); GREEN = (17, 112, 94); ACC = (60, 200, 160)
BAR_BG = (36, 56, 50); GOLD = (240, 190, 70); RED = (230, 110, 100); BLUE = (150, 170, 240); PINK = (230, 160, 210); CARD = (26, 44, 39)
COLS = {"gold": GOLD, "acc": ACC, "red": RED, "blue": BLUE, "pink": PINK, "ink": INK, "muted": MUTED}
X0, XR = 90, W - 90
def ease(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3
def mix(c, a): return tuple(int(BG[k] + (c[k] - BG[k]) * a) for k in range(3))
def col(c): return COLS.get(c, INK) if isinstance(c, str) else (tuple(c) if c else INK)
def wrap(d, text, f, maxw):
    out = []
    for para in str(text).split("\n"):
        line = ""
        for w_ in para.split():
            t = (line + " " + w_).strip()
            if d.textlength(t, font=f) <= maxw: line = t
            else: out.append(line); line = w_
        out.append(line)
    return out
def text(d, s, f, x, y, fill, maxw=None, gap=1.2):
    for ln in (wrap(d, s, f, maxw) if maxw else [s]):
        d.text((x, y), ln, font=f, fill=fill); y += int(f.size * gap)
    return y
def rtext(d, x, y, s, f, c): d.text((x - d.textlength(s, font=f), y), s, font=f, fill=c)
def fit(d, s, w, size, maxw, low=22):
    while size > low and d.textlength(s, font=font(w, size)) > maxw: size -= 2
    return font(w, size)
def base(sc, t):
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    d.rounded_rectangle([X0, 44, X0 + 48, 92], radius=12, fill=GREEN)
    d.ellipse([X0 + 13, 57, X0 + 35, 79], outline=(255, 255, 255), width=4)
    d.text((X0 + 64, 48), "AI SaaSavran", font=font("Bold", 34), fill=INK)
    rtext(d, XR, 54, "aisaasavran.com", font("Medium", 28), MUTED)
    y = 140
    if sc.get("tag"):
        a = ease(t / 0.4); f = font("Bold", 26); tw = d.textlength(sc["tag"], font=f)
        d.rounded_rectangle([X0, y, X0 + tw + 36, y + 46], radius=23, fill=mix(GREEN, a)); d.text((X0 + 18, y + 8), sc["tag"], font=f, fill=mix(INK, a)); y += 70
    if sc.get("title"):
        a = ease((t - 0.1) / 0.5); y = text(d, sc["title"], font("ExtraBold", 66), X0, y, mix(INK, a), XR - X0, 1.15) + 6
    if sc.get("sub"):
        a = ease((t - 0.25) / 0.5); y = text(d, sc["sub"], font("Medium", 34), X0, y, mix(MUTED, a), XR - X0) + 10
    ft = CFG.get("footer", "")
    if ft: d.text((X0, H - 58), ft, font=font("Medium", 22), fill=MUTED)
    d.rectangle([0, H - 8, int(W * ease(t / max(sc["_dur"], 0.1))), H], fill=GREEN)
    return im, d, y + 20

def s_title(sc, t):
    im, d, y = base(sc, t)
    if sc.get("kicker"): pass
    for i, (lab, val, c) in enumerate(sc.get("bars", [])):
        a = ease((t - 0.8 - i * 0.3) / 0.6); mx = sc.get("max", 1); yy = y + 60 + i * 80
        d.text((X0, yy), lab, font=font("Bold", 38), fill=mix(col(c), a))
        d.rounded_rectangle([X0 + 260, yy + 8, X0 + 1100, yy + 40], radius=16, fill=BAR_BG)
        if val: d.rounded_rectangle([X0 + 260, yy + 8, X0 + 260 + int(840 * val / mx * a), yy + 40], radius=16, fill=col(c))
        d.text((X0 + 1130, yy), f"{val}{sc.get('unit', '')}", font=font("Bold", 38), fill=mix(INK, a))
    return im
def s_stats(sc, t):
    im, d, y = base(sc, t); items = sc["items"]; n = len(items); w = (XR - X0) / n; y += 60
    for i, it in enumerate(items):
        a = ease((t - 0.5 - i * 0.35) / 0.6); x = X0 + i * w
        d.text((x, y), it[0], font=font("ExtraBold", 110), fill=mix(col(it[2] if len(it) > 2 else "acc"), a))
        text(d, it[1], font("Medium", 32), x, y + 140, mix(MUTED, a), w - 40)
    if sc.get("note"): text(d, sc["note"], font("SemiBold", 36), X0, y + 300, mix(ACC, ease((t - 2.2) / 0.6)), XR - X0)
    return im
def s_bars(sc, t):
    im, d, y = base(sc, t); rows = sc["rows"]; mx = sc.get("max") or max(r[1] for r in rows) or 1
    end = H - 120 - (70 if sc.get("note") else 0); step = min(86, (end - y) / max(len(rows), 1)); fs = int(min(40, step * 0.5)); bh = int(min(30, step * 0.36))
    lw = sc.get("labelw", 520)
    for i, r in enumerate(rows):
        lab, val = r[0], r[1]; c = col(r[2]) if len(r) > 2 and r[2] else (GOLD if i == 0 else ACC)
        a = ease((t - 0.5 - i * 0.18) / 0.6); yy = y + i * step
        d.text((X0, yy), lab, font=fit(d, lab, "Bold", fs, lw - 30), fill=mix(INK, a))
        bx0, bx1 = X0 + lw, XR - 170
        d.rounded_rectangle([bx0, yy + 6, bx1, yy + 6 + bh], radius=bh // 2, fill=BAR_BG)
        if val > 0: d.rounded_rectangle([bx0, yy + 6, bx0 + max(bh, int((bx1 - bx0) * val / mx * a)), yy + 6 + bh], radius=bh // 2, fill=c)
        lab2 = r[3] if len(r) > 3 else f"{round(val * a, sc.get('dec', 0)) if sc.get('dec') else round(val * a)}{sc.get('unit', '')}"
        rtext(d, XR, yy - 2, lab2, font("Bold", fs), INK)
    if sc.get("note"): text(d, sc["note"], font("SemiBold", 36), X0, H - 175, mix(ACC, ease((t - 2.0) / 0.6)), XR - X0)
    return im
def s_table(sc, t):
    im, d, y = base(sc, t); cols = sc["cols"]; ws = sc["widths"]; xs = [X0]
    for w_ in ws[:-1]: xs.append(xs[-1] + w_)
    for c_, x in zip(cols, xs): d.text((x + 20, y), c_, font=font("Bold", 28), fill=MUTED)
    y += 50; end = H - 120 - (70 if sc.get("note") else 0); step = min(84, (end - y) / len(sc["rows"]))
    for i, row in enumerate(sc["rows"]):
        a = ease((t - 0.5 - i * 0.25) / 0.5); yy = y + i * step
        d.rounded_rectangle([X0, yy, XR, yy + step - 12], radius=14, fill=mix(CARD, a))
        for j, (cell, x) in enumerate(zip(row, xs)):
            f = fit(d, str(cell), "Bold" if j == 0 else "SemiBold", 34, ws[j] - 40)
            d.text((x + 20, yy + (step - 12 - f.size) / 2 - 2), str(cell), font=f, fill=mix(GOLD if j == 1 else INK, a))
    if sc.get("note"): text(d, sc["note"], font("SemiBold", 36), X0, H - 175, mix(ACC, ease((t - 2.0) / 0.6)), XR - X0)
    return im
def s_net(sc, t):
    im, d, y0 = base(sc, t); L, R, links = sc["left"], sc["right"], sc["links"]; y1 = H - 160 - (90 if sc.get("note") else 0)
    ly = [y0 + 20 + (y1 - y0 - 20) * i / max(len(L) - 1, 1) for i in range(len(L))]
    ry = [y0 + 20 + (y1 - y0 - 20) * i / max(len(R) - 1, 1) for i in range(len(R))]
    xl, xr = 760, 1160; mx = max(w for _, _, w in links) or 1
    for li, ri, w in sorted(links, key=lambda k: k[2]):
        a = ease((t - 0.8 - li * 0.15) / 0.8) * (0.35 + 0.65 * w / mx)
        d.line([(xl, ly[li] + 22), (xr, ry[ri] + 22)], fill=mix(GOLD if ri == 0 else ACC, a), width=max(2, round(16 * w / mx)))
    for i, (dom, n) in enumerate(L):
        a = ease((t - 0.3 - i * 0.1) / 0.5); s = f"{dom}  {n}"
        rtext(d, xl - 26, ly[i], s, fit(d, s, "Bold", 38, xl - X0 - 30), mix(INK, a)); d.ellipse([xl - 10, ly[i] + 12, xl + 10, ly[i] + 32], fill=mix(ACC, a))
    for i, nm in enumerate(R):
        a = ease((t - 0.3 - i * 0.1) / 0.5); c = GOLD if i == 0 else INK
        d.ellipse([xr - 10, ly[0] * 0 + ry[i] + 12, xr + 10, ry[i] + 32], fill=mix(c, a)); d.text((xr + 26, ry[i]), nm, font=fit(d, nm, "Bold", 40, XR - xr - 30), fill=mix(c, a))
    if sc.get("note"): text(d, sc["note"], font("SemiBold", 36), X0, H - 175, mix(ACC, ease((t - 2.4) / 0.6)), XR - X0)
    return im
def s_boxes(sc, t):
    im, d, y = base(sc, t); bs = sc["boxes"]; ncol = sc.get("ncol", 2); gap = 28
    w = (XR - X0 - gap * (ncol - 1)) / ncol; rows = math.ceil(len(bs) / ncol); h = min(190, (H - 130 - y - gap * (rows - 1)) / rows)
    for i, b in enumerate(bs):
        a = ease((t - 0.5 - i * 0.45) / 0.5); x = X0 + (i % ncol) * (w + gap); yy = y + (i // ncol) * (h + gap)
        d.rounded_rectangle([x, yy, x + w, yy + h], radius=20, fill=mix(CARD, a)); d.rectangle([x + 22, yy + 26, x + 30, yy + h - 26], fill=mix(col(b.get("c", "acc")), a))
        d.text((x + 56, yy + 24), b["t"], font=fit(d, b["t"], "Bold", 40, w - 80), fill=mix(INK, a))
        text(d, b["d"], font("Medium", 28), x + 56, yy + 82, mix(MUTED, a), w - 90)
    return im
def s_cta(sc, t):
    im, d, y = base(sc, t); y += 30
    a = ease((t - 0.6) / 0.5); bw = 900; bx = (W - bw) / 2
    d.rounded_rectangle([bx, y, bx + bw, y + 150], radius=30, fill=mix(GREEN, a)); f = font("ExtraBold", 72); s = "aisaasavran.com"
    d.text(((W - d.textlength(s, font=f)) / 2, y + 34), s, font=f, fill=mix((255, 255, 255), a))
    s2 = sc.get("free", ""); f2 = font("SemiBold", 40); d.text(((W - d.textlength(s2, font=f2)) / 2, y + 180), s2, font=f2, fill=mix(ACC, a))
    if sc.get("disc"): text(d, sc["disc"], font("Medium", 26), X0, H - 170, mix(MUTED, ease((t - 1.0) / 0.5)), XR - X0)
    return im
def s_loss(sc, t):
    """Kayıp Nedeni Kartı (uygulamadaki LossCardView düzeni): soru, hedef sonucu, kanıt satırları, alt not."""
    im, d, y = base(sc, t); x1 = XR; a0 = ease((t - 0.3) / 0.5)
    d.rounded_rectangle([X0, y, x1, H - 110], radius=24, fill=mix(CARD, a0)); d.rectangle([X0, y, X0 + 10, H - 110], fill=mix(RED, a0))
    yy = y + 26; d.text((X0 + 40, yy), sc["card_title"], font=font("Bold", 38), fill=mix(RED, a0)); yy += 56
    d.text((X0 + 40, yy), sc["q"], font=fit(d, sc["q"], "SemiBold", 34, x1 - X0 - 80), fill=mix(INK, a0)); yy += 58
    for i, ln in enumerate(sc["lines"]):
        a = ease((t - 0.9 - i * 0.5) / 0.5); c = col(ln[1]) if len(ln) > 1 else INK
        d.ellipse([X0 + 44, yy + 14, X0 + 58, yy + 28], fill=mix(c, a))
        yy = text(d, ln[0], font("Medium", 31), X0 + 76, yy, mix(INK, a), x1 - X0 - 120, 1.25) + 12
    if sc.get("note"): text(d, sc["note"], font("Medium", 26), X0 + 40, H - 170, mix(MUTED, ease((t - 2.6) / 0.5)), x1 - X0 - 80)
    return im
FN = {"title": s_title, "stats": s_stats, "bars": s_bars, "table": s_table, "net": s_net, "boxes": s_boxes, "cta": s_cta, "loss": s_loss}

def audio(i):
    for ext in ("pcm", "mp3"):
        p = os.path.join(VIDEO, "ses-out", f"ses-{NAME}-c{i:02d}-{LANG}.{ext}")
        if os.path.exists(p): return p
    return None
def render_scene(i, sc, dur, path):
    p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                          "-vf", f"fade=t=in:st=0:d=0.3,fade=t=out:st={dur - 0.3}:d=0.3", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for k in range(int(round(dur * FPS))): p.stdin.write(FN[sc["type"]](sc, k / FPS).tobytes())
    p.stdin.close(); p.wait()

if __name__ == "__main__":
    S = CFG["scenes"]; os.makedirs(OUT, exist_ok=True)
    if MODE == "narr":
        for i, sc in enumerate(S, 1):
            open(os.path.join(VIDEO, f"narration-{NAME}-c{i:02d}-{LANG}.txt"), "w").write(sc["say"].strip() + "\n")
            open(os.path.join(VIDEO, f"ses-{NAME}-c{i:02d}-{LANG}.txt"), "w").write(CFG.get("voice", "Charon") + "\n")
        print(len(S), "anlatım yazıldı"); sys.exit()
    if MODE == "frames":
        for i, sc in enumerate(S, 1):
            sc["_dur"] = 8; FN[sc["type"]](sc, 7.9).save(os.path.join(OUT, f"frame_c{i:02d}.png"))
        sys.exit()
    tempo = CFG.get("atempo", 1.05); parts = []; total = 0
    for i, sc in enumerate(S, 1):
        src = audio(i)
        if not src: sys.exit(f"ses yok: bölüm {i}")
        wav = os.path.join(OUT, f"v{i:02d}.wav"); inp = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", src] if src.endswith(".pcm") else ["-i", src]
        subprocess.run(["ffmpeg", "-y", "-v", "error", *inp, "-af", f"silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo={tempo},aresample=44100,apad=pad_dur=0.9", wav], check=True)
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav])) + 0.3
        sc["_dur"] = dur; mp4 = os.path.join(OUT, f"c{i:02d}.mp4")
        if not os.path.exists(mp4) or "--force" in sys.argv: render_scene(i, sc, dur, mp4)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp4, "-i", wav, "-af", "apad", "-shortest", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", os.path.join(OUT, f"a{i:02d}.mp4")], check=True)
        parts.append(f"a{i:02d}.mp4"); total += dur; print(f"bölüm {i}: {dur:.1f} sn")
    open(os.path.join(OUT, "list.txt"), "w").write("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "voice_video.mp4"], cwd=OUT, check=True)
    music = os.path.join(HERE, "music.wav"); final = os.path.join(HERE, f"{NAME}-{LANG}.mp4")
    if not os.path.exists(music): subprocess.run(["python3", os.path.join(VIDEO, "sablon", "music.py")], cwd=HERE, check=True)
    D = total
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(OUT, "voice_video.mp4"), "-stream_loop", "-1", "-i", music, "-filter_complex",
                    f"[0:a]asplit=2[vo][sc];[1:a]volume={CFG.get("music_vol", 0.18)},atrim=0:{D},afade=t=out:st={D - 2}:d=2[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", final], check=True)
    print(f"{final}: {D/60:.1f} dk")
