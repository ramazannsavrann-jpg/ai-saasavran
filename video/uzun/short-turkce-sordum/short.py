"""Uzun 2'den Short: Türkçe sorularda bile yabancı siteler. Şablon: video/sablon/make.py yardımcıları.
Kullanım: python3 short.py [frames]"""
import json, os, sys, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
SABLON = sys.argv[1] if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]) else "/home/claude/ramazannsavrann-jpg/ai-saasavran/video/sablon"
MODE = sys.argv[-1]

T = {
    "hook": "Türkçe sordum, cevap yabancı siteden geldi",
    "badge": "Sadece %13'ü .tr",
    "hook2": "Yapay zekâ Türkçe cevap verirken hangi sitelere bakıyor?",
    "note": "ChatGPT, Claude ve Perplexity · canlı arama · Türkiye'den soruldu",
    "cta": "Sizin kategorinizde hangi siteler?",
    "cta2": "Tam analiz kanalda: Yapay Zekâ Hangi Sitelere Bakıyor?",
    "free": "Ücretsiz kontrol edin",
    "disc": "Bunlar yapay zekânın cevaplarıdır · 12–19 Kasım 2026 · Küçük örneklem, tüm pazarı temsil etmez · Bağımsız ölçüm",
}
cfg = {"out": os.path.join(HERE, "out"), "t": T, "engines": [["ChatGPT"], ["Claude"], ["Perplexity"]], "order": ["s1"], "dur": {"p1": 1}}
json.dump(cfg, open(os.path.join(HERE, "cfg.json"), "w"), ensure_ascii=False)
sys.argv = ["make.py", os.path.join(HERE, "cfg.json")]
sys.path.insert(0, SABLON)
import make as M
from make import font, ease, text_block, base, tag, bar, rtext, mix, INK, MUTED, ACC, GOLD, XR, YB

ROWS = [("techradar.com", 48, False), ("akakce.com", 39, True), ("tomsguide.com", 38, False), ("rtings.com", 24, False), ("donanimhaber.com", 20, True)]

def bars(t, dur, tr_hl=False):
    im, d = base()
    tag(d, t, "Türkçe sorular")
    y = text_block(d, "Türkçe sorularda en çok kaynak gösterilen siteler" if not tr_hl else "Öne çıkan Türk siteleri: fiyat ve forum",
                   font("ExtraBold", 60), 390, INK, ease(t / 0.5))
    y = text_block(d, "Kaynak gösterildiği cevap sayısı", font("Medium", 38), y + 10, MUTED, ease(t / 0.5)) + 70
    for i, (name, n, tr) in enumerate(ROWS):
        p = 1.0 if tr_hl else ease((t - 0.3 - i * 0.25) / 0.8)
        lit = (tr if tr_hl else True)
        col_txt = GOLD if (tr_hl and tr) else (INK if lit else MUTED)
        col_bar = GOLD if tr else ACC
        if tr_hl and not tr: col_bar = mix(ACC, 0.35)
        d.text((80, y), name, font=font("Bold", 44), fill=col_txt)
        rtext(d, XR, y, str(round(n * p)), font("Bold", 44), col_txt)
        bar(d, 80, y + 60, XR, n / 48 * p, col_bar, 30); y += 116
    lab = "Sarı: Türk siteleri" if tr_hl else "5 sitenin 3'ü İngilizce"
    text_block(d, lab, font("SemiBold", 42), y + 10, GOLD if tr_hl else ACC, ease((t - 1.6) / 0.6))
    return im

def stat(t, dur):
    im, d = base()
    tag(d, t, "Türkçe cevaplar")
    a = ease(t / 0.6); f = font("Black", 260)
    s = f"%{round(13 * ease(t / 1.0))}"
    d.text((80, 420), s, font=f, fill=mix(GOLD, a))
    y = text_block(d, "Türkçe cevaplardaki kaynakların yalnızca bu kadarı .tr uzantılı", font("ExtraBold", 62), 760, INK, a)
    text_block(d, "Geri kalanı çoğunlukla yabancı inceleme ve test siteleri", font("Medium", 44), y + 30, MUTED, ease((t - 0.8) / 0.6))
    return im

def takeaway(t, dur):
    im, d = base()
    tag(d, t, "Ne anlama geliyor?")
    y = text_block(d, "Türkiye'de satış yapan bir marka için bile", font("SemiBold", 54), 420, MUTED, ease(t / 0.5))
    y = text_block(d, "yabancı inceleme sitelerinde nasıl anlatıldığınız, Türkçe yapay zekâ cevaplarını belirliyor.", font("ExtraBold", 72), y + 20, INK, ease((t - 0.4) / 0.6))
    text_block(d, "Önce kendi kategorinizin hakem sitelerini bulun.", font("SemiBold", 46), y + 50, ACC, ease((t - 2.5) / 0.6))
    return im

# Süreler: seslendirme (atempo 1.15) cümle duraklarına göre
SCENES = [("p1", M.s1, 4.29), ("p2", lambda t, d: bars(t, d), 5.14), ("p3", stat, 4.87),
          ("p4", lambda t, d: bars(t, d, True), 4.71), ("p5", takeaway, 7.75), ("p6", M.s8, 3.6)]

if __name__ == "__main__":
    os.makedirs(cfg["out"], exist_ok=True); os.chdir(cfg["out"])
    ok = True
    for name, fn, dur in SCENES:
        im = fn(dur - 0.1, dur); im.save(f"frame_{name}.png"); ok &= M.guvenli_alan_kontrol(im, name)
    if not ok: sys.exit("Güvenli alan hatası")
    if MODE == "frames": sys.exit(0)
    for name, fn, dur in SCENES: M.render(name, fn, dur)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n, _, _ in SCENES))
    print("ok", sum(s[2] for s in SCENES))
