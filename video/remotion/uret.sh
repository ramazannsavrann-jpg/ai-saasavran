#!/usr/bin/env bash
# Remotion veri Shorts'u (24 Kasım standardı). Kullanım (repo kökünden):
#   bash video/remotion/uret.sh <konu> <dil>            -> cikti/shorts/<ad>.mp4 + cikti/kapak/<ad>.jpg
#   bash video/remotion/uret.sh <konu> <dil> kart       -> ayrıca cikti/instagram/ig-<konu>-<dil>-1..N.jpg
# Gerekenler: video/<konu>/<ad>.json (order, gruplar, t, rm…), video/narration-<ad>.txt (okunuş),
# video/narration-<ad>.yazi.txt (ekran yazımı, kelime sayısı aynı; "_" = önceki kelimeye kat),
# video/ses-out/ses-<ad>.pcm (seslendirme dalı üretir: önce `bash video/uret.sh hazirla <konu> <dil>` + push).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
konu=${1:?konu}; dil=${2:?dil}; ad="$konu-$dil"; ek=${3:-}
S=video/stil.json; R=video/remotion; P=$R/public/$ad
q() { python3 -c "import json,sys;d=json.load(open('$S'))
for k in sys.argv[1].split('.'): d=d[k]
print(d)" "$1"; }
cfg=video/$konu/$ad.json; nar=video/narration-$ad.txt; yazi=video/narration-$ad.yazi.txt; pcm=video/ses-out/ses-$ad.pcm
for f in "$cfg" "$nar" "$pcm"; do [ -f "$f" ] || { echo "HATA: $f yok"; exit 1; }; done
[ -f "$yazi" ] || yazi=-
if grep -qs HATA "video/ses-out/$ad-kontrol.txt"; then echo "HATA: ses kontrolü:"; cat "video/ses-out/$ad-kontrol.txt"; exit 1; fi
mkdir -p "$P" cikti/shorts cikti/kapak cikti/instagram
cp "$cfg" "$P/ayar.json"
for w in Medium SemiBold Bold ExtraBold Black; do [ -f "$R/public/Inter-$w.otf" ] || cp "/usr/share/fonts/opentype/inter/Inter-$w.otf" "$R/public/"; done

# 1) Ses: sessizliği kırp + tempo (stil.json)
ffmpeg -y -v error -f s16le -ar 24000 -ac 1 -i "$pcm" -af "silenceremove=start_periods=1:start_threshold=-45dB,atempo=$(q ses.$dil.tempo),aresample=44100" "$P/voice.wav"
# 2) Kelime zamanları
python3 -c "import faster_whisper" 2>/dev/null || pip install -q --break-system-packages faster-whisper==1.1.1
python3 "$R/kelime.py" "$P/voice.wav" "$nar" "$yazi" "$dil" "$P/kelimeler.json"
D=$(python3 -c "import json;k=json.load(open('$P/kelimeler.json'));print(round(k[-1]['e']+2.6,1))")
python3 -c "import sys;sys.exit(0 if $D <= $(q video.azami_sn) else 1)" || { echo "HATA: süre $D sn > $(q video.azami_sn)"; exit 1; }
# 3) Müzik + ses karışımı (eski hatla aynı ayarlar)
[ -f "$(q muzik.dosya)" ] || ( cd video && python3 sablon/music.py )
F=$(python3 -c "print(round($D-$(q muzik.son_fade_sn),2))")
ffmpeg -y -v error -i "$P/voice.wav" -i "$(q muzik.dosya)" -filter_complex \
 "[0:a]volume=$(q muzik.ses_seviye),apad=whole_dur=$D,asplit=2[vo][sc];[1:a]volume=$(q muzik.seviye),atrim=0:$D,afade=t=out:st=$F:d=$(q muzik.son_fade_sn)[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95,atrim=0:$D[a]" \
 -map "[a]" -c:a pcm_s16le "$P/ses.wav"
# 4) Çizim
cd "$R"; [ -d node_modules ] || npm ci --silent
B=$(command -v google-chrome || command -v chromium || true); BO=${B:+--browser-executable=$B}
props="{\"ad\":\"$ad\",\"dil\":\"$dil\"}"
npx remotion render Short "../../cikti/shorts/$ad.mp4" --props="$props" --codec=h264 --crf=18 $BO --log=error
npx remotion still Kapak "../../cikti/kapak/$ad.png" --props="$props" $BO --log=error
cd ../..
python3 -c "from PIL import Image;Image.open('cikti/kapak/$ad.png').convert('RGB').save('cikti/kapak/$ad.jpg',quality=$(q kapak.jpeg_kalite));import os;os.remove('cikti/kapak/$ad.png')"
if [ "$ek" = kart ]; then
  n=$(python3 -c "import json;print(len(json.load(open('$cfg')).get('rm',{}).get('kart',['s1','s2','s3','shop','net'])))")
  for s in $(seq 1 "$n"); do
    ( cd "$R" && npx remotion still Kart "../../cikti/instagram/ig-$ad-$s.png" --props="{\"ad\":\"$ad\",\"dil\":\"$dil\",\"sayfa\":$s}" $BO --log=error )
    python3 -c "from PIL import Image;Image.open('cikti/instagram/ig-$ad-$s.png').convert('RGB').save('cikti/instagram/ig-$ad-$s.jpg',quality=92);import os;os.remove('cikti/instagram/ig-$ad-$s.png')"
  done
fi
echo "TAMAM: cikti/shorts/$ad.mp4 ($D sn), cikti/kapak/$ad.jpg"
