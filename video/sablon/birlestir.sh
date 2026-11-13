#!/bin/bash
# Kullanım: birlestir.sh <ayar.json> <çıktı.mp4>  (egitim.py render + voice.wav + music.wav karışımı)
set -e
cfg=$1; outmp4=$2; dir=$(dirname "$cfg")/$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['out'])" "$cfg")
python3 "$(dirname "$0")/egitim.py" "$cfg"
( cd "$dir" && ffmpeg -y -v error -f concat -safe 0 -i list.txt -c copy video.mp4 )
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$dir/video.mp4")
F=$(python3 -c "print(round($D-1.5,2))")
ffmpeg -y -v error -i "$dir/video.mp4" -i "$dir/voice.wav" -i "$(dirname "$cfg")/music.wav" -filter_complex "[1:a]aresample=44100,volume=1.6,apad=whole_dur=$D,asplit=2[vo][sc];[2:a]volume=0.35,atrim=0:$D,afade=t=out:st=$F:d=1.5[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -movflags +faststart "$outmp4"
echo "$outmp4 $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$outmp4") sn"
