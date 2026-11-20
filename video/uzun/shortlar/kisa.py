"""Uzun videolardan Shorts (1080x1920). make.py yardımcılarını kullanır.
Kullanım: python3 kisa.py <ayar.json> [frames]
Ayar: name, voice_pcm, atempo, engines, footer, names_list, t (s1/s8 metinleri), scenes: [{type, from(cümle no), ...}]
Sahne süreleri: seslendirmedeki cümle duraklarından (en uzun N-1 sessizlik = N cümle sınırı)."""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SABLON = os.path.join(HERE, "..", "..", "sablon")
CFGP = os.path.abspath(sys.argv[1]); MODE = sys.argv[2] if len(sys.argv) > 2 else "render"
C = json.load(open(CFGP))
OUT = os.path.join(os.path.dirname(CFGP), "out-" + C["name"])
tmp = {"out": OUT, "t": C["t"], "engines": [[e] for e in C["engines"]], "names_list": C.get("names_list", []),
       "names": "x:" + ",".join(C.get("names_list", [])), "footer": C.get("footer", ""), "lang": C.get("lang", "tr"), "order": ["s1"], "dur": {"p1": 1}}
os.makedirs(OUT, exist_ok=True); json.dump(tmp, open(os.path.join(OUT, "_make.json"), "w"), ensure_ascii=False)
sys.argv = ["make.py", os.path.join(OUT, "_make.json")]; sys.path.insert(0, SABLON)
import make as M
from make import font, ease, text_block, base, tag, bar, rtext, mix, INK, MUTED, ACC, GOLD, RED, XR, YB, W
COL = {"acc": ACC, "gold": GOLD, "red": RED, "muted": MUTED}

def sc_bars(s):
    def f(t, dur):
        im, d = base(); tag(d, t, s["tag"])
        y = text_block(d, s["title"], font("ExtraBold", s.get("title_size", 60)), 390, INK, ease(t / 0.5))
        y = text_block(d, s["sub"], font("Medium", 38), y + 10, MUTED, ease(t / 0.5)) + 60
        big = len(s["rows"]) <= 3; step = 190 if big else 116; fs = 56 if big else 44; bh = 44 if big else 30
        mx = s["max"]
        for i, r in enumerate(s["rows"]):
            name, v, col, lab = r[0], r[1], COL[r[2]], r[3]
            dim = r[4] if len(r) > 4 else False
            p = 1.0 if s.get("static") else ease((t - 0.3 - i * 0.25) / 0.8)
            tc = MUTED if dim else (col if col in (GOLD, RED) else INK)
            d.text((80, y), name, font=font("Bold", fs), fill=tc)
            shown = lab.replace(str(v), str(round(v * p)), 1) if lab.startswith(str(v)) else lab
            rtext(d, XR, y, shown, font("Bold", fs), tc)
            bar(d, 80, y + fs + 16, XR, v / mx * p, mix(col, 0.35) if dim else col, bh); y += step
        if s.get("note"):
            text_block(d, s["note"], font("SemiBold", 40), y + 10, COL[s.get("note_col", "acc")], ease((t - 1.6) / 0.6))
        return im
    return f

def sc_stat(s):
    def f(t, dur):
        im, d = base(); tag(d, t, s["tag"]); a = ease(t / 0.6)
        n = s["value"]; d.text((80, 420), s["fmt"].format(round(n * ease(t / 1.0))), font=font("Black", 260), fill=mix(GOLD, a))
        y = text_block(d, s["title"], font("ExtraBold", 62), 760, INK, a)
        text_block(d, s["sub"], font("Medium", 42), y + 30, MUTED, ease((t - 0.8) / 0.6))
        return im
    return f

def sc_text(s):
    def f(t, dur):
        im, d = base(); tag(d, t, s["tag"])
        y = text_block(d, s["lead"], font("SemiBold", 54), 420, MUTED, ease(t / 0.5))
        y = text_block(d, s["main"], font("ExtraBold", 70), y + 20, INK, ease((t - 0.4) / 0.6))
        y = text_block(d, s["tip"], font("SemiBold", 44), y + 50, ACC, ease((t - 2.0) / 0.6))
        if s.get("small"): text_block(d, s["small"], font("Medium", 34), y + 30, MUTED, ease((t - 2.5) / 0.6))
        return im
    return f

FN = {"hook": lambda s: M.s1, "names": lambda s: M.s_names, "cta": lambda s: M.s8, "bars": sc_bars, "stat": sc_stat, "text": sc_text}

def voice():
    w = os.path.join(OUT, "voice.wav")
    src = C["voice_pcm"]; inp = ["-i", src] if src.endswith(".mp3") else ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", src]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-af", f"atempo={C['atempo']}", w], check=True)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", w]))
    log = subprocess.run(["ffmpeg", "-i", w, "-af", "silencedetect=n=-32dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
    sil = [(float(a), float(b)) for a, b in re.findall(r"silence_start: ([\d.]+).*?\n.*?silence_end: ([\d.]+)", log)]
    sil = [(a, b) for a, b in sil if a < dur - 0.3]
    txt = open(re.sub(r"\.(pcm|mp3)$", ".txt", C["voice_pcm"].replace("ses-out/ses-", "narration-"))).read().strip()
    sents = [x for x in re.split(r"(?<=[.?!])\s+", txt) if x]
    if len(sents) != C["sentences"]: sys.exit(f"Cümle sayısı {len(sents)} != {C['sentences']}")
    speech0 = sil[0][1] if sil and sil[0][0] < 0.6 else 0.0
    tot = sum(len(x) for x in sents); acc = 0; bounds = [0.0]
    mids = [((a + b) / 2, b - a) for a, b in sil]
    for x in sents[:-1]:
        acc += len(x); exp = acc / tot * dur
        cand = [m for m in mids if abs(m[0] - exp) < 1.5 and m[0] > bounds[-1] + 0.8]
        best = max(cand, key=lambda m: m[1] - abs(m[0] - exp) * 0.25) if cand else (exp, 0)
        bounds.append(round(best[0], 2))
    return w, dur, bounds, sil

if __name__ == "__main__":
    w, vdur, bounds, sil = voice()
    if len(bounds) != C["sentences"]: sys.exit(f"Cümle sınırı bulunamadı: {len(bounds)} / {C['sentences']}")
    if any(b2 <= b1 for b1, b2 in zip(bounds, bounds[1:])) and not C.get("starts"): sys.exit(f"Cümle başları sırasız: {bounds} → ayara 'starts' yaz")
    starts = C.get("starts") or [bounds[s["from"]] for s in C["scenes"]]; end = vdur + 1.6
    SC = [(f"p{i+1}", FN[s["type"]](s), round((starts[i + 1] if i + 1 < len(starts) else end) - starts[i], 2)) for i, s in enumerate(C["scenes"])]
    print("ses", round(vdur, 1), "sn · cümle başları", bounds); print("sahneler", [(n, d) for n, _, d in SC], "toplam", round(sum(d for *_, d in SC), 1))
    os.chdir(OUT); ok = True
    for name, fn, dur in SC:
        im = fn(dur - 0.1, dur); im.save(f"frame_{name}.png"); ok &= M.guvenli_alan_kontrol(im, name)
    if not ok: sys.exit("Güvenli alan hatası")
    if MODE == "frames": sys.exit(0)
    for name, fn, dur in SC: M.render(name, fn, dur)
    open("list.txt", "w").write("".join(f"file '{n}.mp4'\n" for n, _, _ in SC))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "v.mp4"], check=True)
    subprocess.run([sys.executable, os.path.join(SABLON, "music.py")], check=True, capture_output=True)
    D = int(end) + 1
    fc = (f"[1:a]aresample=44100,volume=1.6,apad=whole_dur={D},asplit=2[vo][sc];[2:a]volume=0.30,atrim=0:{D},afade=t=out:st={D-2}:d=1.5[mu];"
          "[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "v.mp4", "-i", "voice.wav", "-i", "music.wav", "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", f"{C['name']}.mp4"], check=True)
    print("ok", os.path.join(OUT, C["name"] + ".mp4"))
