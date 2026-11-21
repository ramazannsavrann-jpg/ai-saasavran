#!/bin/bash
# TEK KOMUT Short üretimi (21 Kasım). Bütün sabitler video/stil.json'dan okunur.
#
#   video/uret.sh hazirla <konu> <dil>          ses + model dosyalarını stil.json'dan yazar (push öncesi)
#   video/uret.sh yap <konu> <dil> <YYYY-MM-DD> sesi alır, videoyu + kapağı üretir, kontrol eder, yükleme işini yazar
#
# Dosyalar: video/<konu>/<konu>-<dil>.json (sahne ayarı, isteğe bağlı "gruplar" ve "yt": {baslik, aciklama, etiketler, listeler})
#           video/narration-<konu>-<dil>.txt (anlatım)   video/ses-out/ses-<konu>-<dil>.pcm (seslendirme işinin çıktısı)
# Çıktı:    cikti/shorts/<konu>-<dil>.mp4, cikti/kapak/<konu>-<dil>.jpg, cikti/yukle/<konu>-<dil>.json
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
S=video/stil.json
q() { python3 -c "import json,sys;d=json.load(open('$S'))
for k in sys.argv[1].split('.'): d=d[k]
print(d)" "$1"; }

adim=${1:?adım: hazirla | yap}; konu=${2:?konu}; dil=${3:?dil (tr|en)}; ad="$konu-$dil"
[ "$dil" = tr ] || [ "$dil" = en ] || { echo "dil tr veya en olmalı"; exit 1; }
cfg="video/$konu/$ad.json"; nar="video/narration-$ad.txt"

if [ "$adim" = hazirla ]; then
  [ -f "$nar" ] || { echo "HATA: $nar yok"; exit 1; }
  q "ses.$dil.ses" > "video/ses-$ad.txt"
  q "ses.$dil.model" > "video/tts-model-$ad.txt"
  rm -f "video/motor-$ad.txt"
  # Anlatım kuralı: site adı seslendirmede söylenmez
  if grep -qiE "aisaasavran|saasavran|savran nokta|dot com|nokta com" "$nar"; then echo "HATA: anlatımda site adı var (kural: söylenmez)"; exit 1; fi
  echo "Hazır: $ad ($(cat video/ses-$ad.txt), $(cat video/tts-model-$ad.txt)). Şimdi seslendirme dalına push edilir."
  exit 0
fi

[ "$adim" = yap ] || { echo "bilinmeyen adım: $adim"; exit 1; }
gun=${4:?yayın günü YYYY-MM-DD}
for f in "$cfg" "$nar"; do [ -f "$f" ] || { echo "HATA: $f yok"; exit 1; }; done
git fetch -q origin seslendirme && git checkout origin/seslendirme -- video/ses-out/ 2>/dev/null || true   # yalnız son sesler alınır
pcm="video/ses-out/ses-$ad.pcm"
[ -f "$pcm" ] || { echo "HATA: ses yok ($pcm). Önce: uret.sh hazirla $konu $dil, sonra push, iş bitince yeniden."; exit 2; }
# Ses tutarlılığı: üretilen ses stil.json'daki model + sesle mi?
beklenen="$(q ses.$dil.model) $(q ses.$dil.ses)"; gercek=$(cat "video/ses-out/ses-$ad-model.txt" 2>/dev/null || echo "?")
[ "$gercek" = "$beklenen" ] || { echo "HATA: ses farklı üretilmiş ($gercek ≠ $beklenen). hazirla + yeniden seslendir."; exit 1; }
# Site adı okunuş kontrolü (seslendirme işinin çıktısı)
if grep -qs HATA "video/ses-out/$ad-kontrol.txt"; then echo "HATA: ses kontrolü:"; cat "video/ses-out/$ad-kontrol.txt"; exit 1; fi

gruplar=$(python3 -c "import json;print(json.load(open('$cfg')).get('gruplar',''))"); [ -n "$gruplar" ] || gruplar=$(q gruplar_varsayilan)
out="video/$konu/$(python3 -c "import json;print(json.load(open('$cfg'))['out'])")"
# Süreler: sureler2 sesi sahnelere böler. Ayarda "dur_sabit": true ise elle düzeltilmiş süreler korunur.
eski_dur=$(python3 -c "import json;print(json.dumps(json.load(open('$cfg')).get('dur',{})))")
python3 video/sablon/sureler2.py "$cfg" "$pcm" "$nar" "$gruplar" "$(q ses.$dil.tempo)"
python3 - "$cfg" "$eski_dur" <<'P'
import json, sys
c = json.load(open(sys.argv[1]))
if c.get("dur_sabit"):
    c["dur"] = json.loads(sys.argv[2]); json.dump(c, open(sys.argv[1], "w"), ensure_ascii=False, indent=1); print("süreler elle (dur_sabit):", c["dur"])
P
# Konuşmaya göre hizala (sessizlik tahmini yanılabiliyor). dur_sabit ise atlanır; hata olursa sureler2 süreleri kalır.
if ! python3 -c "import json,sys;sys.exit(0 if json.load(open('$cfg')).get('dur_sabit') else 1)"; then
  python3 -c "import faster_whisper" 2>/dev/null || pip install -q --break-system-packages faster-whisper==1.1.1
  python3 video/sablon/hizala.py "$cfg" "$nar" "$gruplar" "$dil" || echo "UYARI: hizalama yapılamadı, sahne sınırlarını izleyerek kontrol et"
fi
[ -f "$(q muzik.dosya)" ] || ( cd "$(dirname "$(q muzik.dosya)")" && python3 sablon/music.py )
( cd "video/$konu" && python3 make.py "$ad.json" frames && python3 make.py "$ad.json" )   # güvenli alan kontrolü + render
( cd "$out" && ffmpeg -y -v error -f concat -safe 0 -i list.txt -c copy video.mp4 )

mkdir -p cikti/shorts cikti/kapak cikti/yukle
mp4="cikti/shorts/$ad.mp4"; jpg="cikti/kapak/$ad.jpg"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/video.mp4")
F=$(python3 -c "print(round($D-$(q muzik.son_fade_sn),2))")
ffmpeg -y -v error -i "$out/video.mp4" -i "$out/voice.wav" -i "$(q muzik.dosya)" -filter_complex \
 "[1:a]aresample=44100,volume=$(q muzik.ses_seviye),apad=whole_dur=$D,asplit=2[vo][sc];[2:a]volume=$(q muzik.seviye),atrim=0:$D,afade=t=out:st=$F:d=$(q muzik.son_fade_sn)[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$mp4"

# Kapak: her zaman s1 karesi (YouTube'un otomatik karesi kullanılmaz)
sahne=$(q kapak.kaynak_sahne); kq=$(python3 -c "print(max(2,round(31-29*$(q kapak.jpeg_kalite)/100)))")
ffmpeg -y -v error -i "$out/frame_$sahne.png" -vf "scale=$(q video.en):$(q video.boy)" -q:v "$kq" "$jpg"

# Son kontroller
sure=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$mp4")
boyut=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$mp4")
python3 - "$sure" "$(q video.azami_sn)" "$boyut" "$(q video.en),$(q video.boy)" <<'P'
import sys; s,m,b,e=float(sys.argv[1]),float(sys.argv[2]),sys.argv[3],sys.argv[4]
assert s<=m, f"HATA: video {s:.1f} sn > {m} sn"; assert b==e, f"HATA: boyut {b} ≠ {e}"
print(f"video {s:.1f} sn, {b}")
P

# Yükleme işi (yayın: stil.json saati, TSİ). Main'e yt/yukle/ altına eklenince yüklenir — sahip onayıyla.
python3 - "$cfg" "$S" "$dil" "$gun" "$ad" <<'P'
import json, sys
from datetime import datetime, timezone, timedelta
cfg, stil, dil, gun, ad = json.load(open(sys.argv[1])), json.load(open(sys.argv[2])), sys.argv[3], sys.argv[4], sys.argv[5]
y = stil["yayin"][dil]; yayin = f"{gun}T{y['saat']}:00+03:00"
if datetime.fromisoformat(yayin) <= datetime.now(timezone.utc) + timedelta(minutes=30): sys.exit(f"HATA: yayın zamanı çok yakın/geçmiş: {yayin}")
yt = cfg.get("yt", {})
iss = {"kanal": y["kanal"], "video": f"shorts/{ad}.mp4", "kapak": f"kapak/{ad}.jpg",
       "baslik": yt.get("baslik", ""), "aciklama": yt.get("aciklama", ""), "etiketler": yt.get("etiketler", []),
       "kategori": stil["youtube"]["kategori"], "dil": y["dil"], "yayin": yayin, "listeler": yt.get("listeler", [])}
eksik = [k for k in ("baslik", "aciklama") if not iss[k]]
if len(iss["baslik"]) > 100: eksik.append("baslik>100")
json.dump(iss, open(f"cikti/yukle/{ad}.json", "w"), ensure_ascii=False, indent=1)
print(f"yükleme işi: cikti/yukle/{ad}.json ({y['kanal']} kanalı, {yayin})" + (f"  EKSİK: {eksik}" if eksik else ""))
P
echo "TAMAM: $mp4  $jpg  — kapağı göz ile kontrol et, sonra videolar dalına + yt/yukle/ işine."
