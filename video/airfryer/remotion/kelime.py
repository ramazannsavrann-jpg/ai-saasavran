"""Seslendirmeden kelime zamanlarını çıkarır, anlatım metniyle eşler, yazılı biçimde altyazı üretir.
Kullanım: python3 kelime.py voice.wav narration.txt cikti.json
"""
import json, re, sys, difflib
from faster_whisper import WhisperModel

wav, nar, out = sys.argv[1:4]
# Seslendirmede Türkçe okunuş için yazılan kelimeler -> ekranda doğru yazım
YAZIM = {
    "Eyr Frayır": "airfryer", "Çet Ci Pi Ti": "ChatGPT", "Şaomi": "Xiaomi", "Şaomi,": "Xiaomi,",
    "Gugıl Şopingde": "Google Shopping'de", "Şopingde": "Shopping'de",
    "Altmış altı": "66", "on bir": "11", "Beşinci": "5.", "Yedinci": "7.", "elli altı,": "56,",
    "otuz yedi.": "37.", "yirmi bir": "21", "yüz üzerinden seksen dört.": "100 üzerinden 84.", "onuncu.": "10.",
    "Fakir'in": "Fakir'in",
}
text = open(nar, encoding="utf-8").read().strip()
for k, v in YAZIM.items():
    text = text.replace(k, v)
ref = text.split()

m = WhisperModel("small", device="cpu", compute_type="int8")
import subprocess, numpy as np
audio = np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",wav,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout, np.float32)
segs, _ = m.transcribe(audio, language="tr", word_timestamps=True, vad_filter=False)
hyp = [w for s in segs for w in s.words]

def norm(w):
    w = w.lower()
    w = re.sub(r"[^\wçğıöşü]", "", w)
    return w

sm = difflib.SequenceMatcher(a=[norm(w) for w in ref], b=[norm(w.word) for w in hyp], autojunk=False)
t = [None] * len(ref)
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        t[a + k] = (hyp[b + k].start, hyp[b + k].end)
# Eşleşmeyen kelimeler: komşu eşleşmeler arasında doğrusal dağıt
i = 0
while i < len(ref):
    if t[i] is None:
        j = i
        while j < len(ref) and t[j] is None:
            j += 1
        s = t[i - 1][1] if i > 0 else 0.0
        e = t[j][0] if j < len(ref) else hyp[-1].end
        step = (e - s) / (j - i)
        for k in range(i, j):
            t[k] = (s + step * (k - i), s + step * (k - i + 1))
        i = j
    else:
        i += 1
words = [{"w": w, "s": round(a, 3), "e": round(b, 3)} for w, (a, b) in zip(ref, t)]
json.dump(words, open(out, "w"), ensure_ascii=False, indent=0)
print(len(words), "kelime;", sum(n for *_, n in sm.get_matching_blocks()), "eşleşti; son", words[-1])
