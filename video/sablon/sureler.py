"""Seslendirmeyi cümlelere böler, sahne sürelerini ayar dosyasına yazar.
Kullanım: python3 sureler.py ayar.json ses.pcm anlatim.txt "0|1,2|3,4|..." atempo
Gruplar: kapak, sahneler..., kapanış (cümle indeksleri, 0'dan). Çıktı: <out>/voice.wav ve ayar.json'da dur alanları.
"""
import json, re, subprocess, sys, os
cfgp, pcm, txt, groups, tempo = sys.argv[1:6]; tempo = float(tempo)
cfg = json.load(open(cfgp)); base = os.path.dirname(os.path.abspath(cfgp)); out = os.path.join(base, cfg["out"]); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, "voice.wav")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", pcm, "-af", f"atempo={tempo},aresample=44100", wav], check=True)
D = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]))
def silences(db, d):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"silencedetect=n={db}dB:d={d}", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [((float(a) + float(b)) / 2, float(b) - float(a)) for a, b in zip(re.findall(r"silence_start: ([\d.]+)", e), re.findall(r"silence_end: ([\d.]+)", e))]
need = len([x for x in re.split(r"(?<=[.!?])\s+", open(txt).read().strip()) if x]) - 1
for db, d in ((-38, .12), (-34, .1), (-30, .09), (-27, .08), (-24, .07)):
    sil = silences(db, d)
    if len([1 for m, _ in sil if 0.5 < m < D - 0.3]) >= need * 1.4: break
sents = [x for x in re.split(r"(?<=[.!?])\s+", open(txt).read().strip()) if x]
G = [[int(i) for i in g.split(",")] for g in groups.split("|")]
assert sum(len(g) for g in G) == len(sents), (len(sents), G)
assert len(G) == len(cfg["scenes"]) + 2, (len(G), len(cfg["scenes"]))
lead = sil[0][0] * 2 if sil and sil[0][0] < 0.6 else 0  # baştaki sessizlik
speech_start = sil[0][0] + sil[0][1] / 2 if sil and sil[0][0] < 0.6 else 0
chars = [len(x) for x in sents]; tot = sum(chars)
cands = [(m, d) for m, d in sil if speech_start + 0.3 < m < D - 0.3 and d >= 0.1]
ends = []; acc = 0
for c in chars[:-1]: acc += c; ends.append(speech_start + (D - speech_start) * acc / tot)
# DP: her cümle sonuna sırayla bir sessizlik ata; hem beklenen konuma yakınlık hem uzun sessizlik ödüllenir.
import math
K, N = len(ends), len(cands); INF = 1e18
cost = [[INF] * N for _ in range(K)]; back = [[-1] * N for _ in range(K)]
def c1(k, j): return abs(cands[j][0] - ends[k]) / 1.2 - 1.5 * math.log(cands[j][1] / 0.1)
for j in range(N): cost[0][j] = c1(0, j)
for k in range(1, K):
    best, bj = INF, -1
    for j in range(N):
        if j > 0 and cost[k - 1][j - 1] < best: best, bj = cost[k - 1][j - 1], j - 1
        if bj >= 0: cost[k][j] = best + c1(k, j); back[k][j] = bj
j = min(range(N), key=lambda j: cost[K - 1][j]); pick = [0] * K
for k in range(K - 1, -1, -1): pick[k] = j; j = back[k][j]
bnd = [cands[j][0] for j in pick]
print("cümle sınırları:", [(round(cands[j][0], 2), round(cands[j][1], 2)) for j in pick])
cut = []; idx = -1
for g in G[:-1]: idx += len(g); cut.append(bnd[idx])
durs = [cut[0]] + [b - a for a, b in zip(cut, cut[1:])] + [D - cut[-1] + 2.6]
cfg["cover"]["dur"] = round(durs[0], 2)
for s, d in zip(cfg["scenes"], durs[1:-1]): s["dur"] = round(d, 2)
cfg["end"]["dur"] = round(durs[-1], 2)
json.dump(cfg, open(cfgp, "w"), ensure_ascii=False, indent=1)
print(f"ses {D:.1f} sn, toplam {sum(durs):.1f} sn:", [round(x, 1) for x in durs])
