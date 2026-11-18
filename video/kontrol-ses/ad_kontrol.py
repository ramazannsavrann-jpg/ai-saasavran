"""Seslendirme kontrolü (19 Kasım): üretilen ses yazıya dökülür; anlatımda site adı varsa seste doğru okunmuş olmalı.
Kullanım: python3 ad_kontrol.py out/  -> her ses-*.pcm / *.mp3 ve bitmiş video <ad>.mp4 için out/<ad>-kontrol.txt yazar; hata varsa çıkış kodu 1.
Neden: 18 Kasım Seattle kahve videosunda TTS "AI sizin markanız nokta com" (TR) ve "AI Savram" (EN) dedi, kimse fark etmedi."""
import glob, os, re, subprocess, sys, wave
import numpy as np
from faster_whisper import WhisperModel

OUT = sys.argv[1]
ADI = re.compile(r"a[iı]sa+s*sav")  # "aisaasavran", "aisassavron" geçer; "aisavarin", "aisizinmarkaniz" geçmez
model = WhisperModel("small", device="cpu", compute_type="int8")
hata = 0
for f in sorted(glob.glob(f"{OUT}/ses-*.pcm") + glob.glob(f"{OUT}/ses-*.mp3") + glob.glob(f"{OUT}/*.mp4")):
    base = os.path.basename(f).rsplit(".", 1)[0]
    name = base[4:] if base.startswith("ses-") else base
    lang = name.rsplit("-", 1)[-1]
    if lang not in ("tr", "en"): continue
    np_ = f"video/narration-{name}.txt"
    metin = open(np_, encoding="utf-8").read() if os.path.exists(np_) else "Savran"  # bitmiş videoda kapanış hep site adı
    src = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", f] if f.endswith(".pcm") else ["-i", f]
    subprocess.run(["ffmpeg", "-v", "error", "-y", *src, "-ac", "1", "-ar", "16000", "k.wav"], check=True)
    w = wave.open("k.wav"); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    yazi = " ".join(s.text for s in model.transcribe(a, language=lang)[0]).strip()
    duz = re.sub(r"[^a-zçğıöşü]", "", yazi.lower())
    gerek = bool(re.search(r"savran", metin, re.I))
    ok = (not gerek) or bool(ADI.search(duz))
    sonuc = "TAMAM" if ok else "HATA: site adı seste doğru okunmadı, bu sesle video YAYINLANMAZ"
    open(f"{OUT}/{name}-kontrol.txt", "w", encoding="utf-8").write(f"{sonuc}\nseste duyulan: {yazi}\n")
    print(f"{name}: {sonuc}\n  {yazi[-160:]}")
    hata += 0 if ok else 1
sys.exit(1 if hata else 0)
