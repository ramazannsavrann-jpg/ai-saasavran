"""Sahne sürelerini sesin kelime zamanlarına göre ayarlar (21 Kasım; sureler2 sessizlik tahmini EN gta'da 1. sahneyi erken kesti).
Kullanım: python3 hizala.py ayar.json anlatim.txt "0,1|2|..." dil   (voice.wav, ayar['out'] klasöründe olmalı)
Her grubun ilk cümlesinin ilk 2 kelimesi seste aranır; sahne sınırı o kelimenin 0,15 sn öncesidir. Toplam süre korunur."""
import json, os, re, sys, subprocess
import numpy as np
from faster_whisper import WhisperModel
cfgp, txt, groups, lang = sys.argv[1:5]
cfg = json.load(open(cfgp)); out = os.path.join(os.path.dirname(os.path.abspath(cfgp)), cfg["out"])
norm = lambda w: re.sub(r"[^\wçğıöşüâîû]", "", w.lower().replace("’", "'").split("'")[0])
sents = [x for x in re.split(r"(?<=[.!?])\s+", open(txt).read().strip()) if x]
G = [[int(i) for i in g.split(",")] for g in groups.split("|")]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(out, "voice.wav"), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
segs, _ = WhisperModel("small", device="cpu", compute_type="int8").transcribe(np.frombuffer(raw, np.float32), language=lang, word_timestamps=True)
W = [(w.start, norm(w.word)) for s in segs for w in s.words if norm(w.word)]
starts, pos = [], 0
for g in G[1:]:
    tam = [norm(x) for x in sents[g[0]].split()[:2] if norm(x)]
    for an in (tam, tam[:1]):   # sayılar sese rakamla yazılabilir (beş -> 5): 2 kelime olmazsa ilk kelime
        hit = next((i for i in range(pos, len(W) - len(an) + 1) if all(W[i + k][1][:5] == an[k][:5] for k in range(len(an)))), None)
        if hit is not None: starts.append(max(W[hit][0] - 0.15, 0.3)); pos = hit + 1; break
    else: sys.exit(f"HİZALAMA: '{' '.join(tam)}' seste bulunamadı; süreler sureler2'den kalır")
keys = list(cfg["dur"].keys()); tot = sum(cfg["dur"].values()); b = [0.0] + starts
yeni = [round(float(b[i + 1] - b[i]), 2) for i in range(len(b) - 1)] + [round(float(tot - b[-1]), 2)]
if min(yeni) < 1.0: sys.exit(f"HİZALAMA şüpheli {yeni}; süreler sureler2'den kalır")
fark = max(abs(a - c) for a, c in zip(yeni, cfg["dur"].values()))
cfg["dur"] = dict(zip(keys, yeni)); json.dump(cfg, open(cfgp, "w"), ensure_ascii=False, indent=1)
print(f"hizalandı (en büyük düzeltme {fark:.1f} sn): {yeni}")
