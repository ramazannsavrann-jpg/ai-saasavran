"""Seslendirmedeki kelime zamanlarını çıkarır (Remotion şablonu için).

Kullanım:
  python3 kelime.py <voice.wav> <narration.txt> <yazi.txt|-> <dil> <cikti.json>

narration.txt : seslendirilen metin (okunuş yazımıyla, ör. "Şaomi", "Çet Ci Pi Ti").
yazi.txt      : ekranda görünecek yazım. Kelime sayısı narration ile BİREBİR aynı olmalı;
                birden fazla okunuş kelimesi tek kelimeye denk geliyorsa fazlalar "_" yazılır
                (ör. "Eyr Frayır" -> "airfryer _"). "-" verilirse okunuş metni kullanılır.
Çıktı: [{"w": yazım, "s": başlangıç sn, "e": bitiş sn, "c": cümle no}]
"""
import json, re, subprocess, sys, difflib
import numpy as np
from faster_whisper import WhisperModel

wav, nar, yazi, dil, out = sys.argv[1:6]
konus = open(nar, encoding="utf-8").read().split()
gorun = konus if yazi == "-" else open(yazi, encoding="utf-8").read().split()
if len(gorun) != len(konus):
    sys.exit(f"HATA: yazı ({len(gorun)}) ve anlatım ({len(konus)}) kelime sayısı farklı")

# Cümle numarası: anlatım metninde . ? ! ile biten kelimeden sonra yeni cümle
cumle, c = [], 0
for w in konus:
    cumle.append(c)
    if re.search(r"[.?!]$", w):
        c += 1

audio = np.frombuffer(
    subprocess.run(["ffmpeg", "-v", "error", "-i", wav, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout,
    np.float32,
)
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, language=dil, word_timestamps=True, vad_filter=False)
hyp = [w for s in segs for w in s.words]


def norm(w):
    return re.sub(r"[^\wçğıöşüâî]", "", w.lower())


# Eşleştirmede ekran yazımı kullanılır (Whisper "Şaomi"yi çoğu zaman "Xiaomi" yazar); "_" olanlarda okunuş
anahtar = [norm(k if g == "_" else g) for k, g in zip(konus, gorun)]
sm = difflib.SequenceMatcher(a=anahtar, b=[norm(w.word) for w in hyp], autojunk=False)
t = [None] * len(konus)
eslesen = 0
for a, b, n in sm.get_matching_blocks():
    eslesen += n
    for k in range(n):
        t[a + k] = (hyp[b + k].start, hyp[b + k].end)
i = 0
while i < len(konus):  # eşleşmeyenleri komşular arasında doğrusal dağıt
    if t[i] is None:
        j = i
        while j < len(konus) and t[j] is None:
            j += 1
        s = t[i - 1][1] if i > 0 else 0.0
        e = t[j][0] if j < len(konus) else hyp[-1].end
        step = (e - s) / (j - i)
        for k in range(i, j):
            t[k] = (s + step * (k - i), s + step * (k - i + 1))
        i = j
    else:
        i += 1

kel = []
for w, (a, b), cc in zip(gorun, t, cumle):
    if w == "_" and kel:  # önceki kelimeye kat
        kel[-1]["e"] = round(b, 3)
        continue
    kel.append({"w": w, "s": round(a, 3), "e": round(b, 3), "c": cc})
json.dump(kel, open(out, "w"), ensure_ascii=False, indent=0)
oran = eslesen / len(konus)
print(f"{len(kel)} kelime, {c} cümle, eşleşme %{oran*100:.0f}, son {kel[-1]['e']} sn")
if oran < 0.5:
    sys.exit("HATA: eşleşme düşük, ses ile metin uyuşmuyor olabilir")
