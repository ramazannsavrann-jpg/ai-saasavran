"""Veri Shorts (make.py, "order" düzeni) için sahne süreleri: ses + anlatım + cümle grupları -> voice.wav ve dur.pN.
Kullanım: python3 sureler2.py ayar.json ses.(pcm|mp3) anlatim.txt "0,1,2|3,4|5|6|7|8|9,10" atempo
"""
import json, re, subprocess, sys, os, math
cfgp, src, txt, groups, tempo = sys.argv[1:6]; tempo = float(tempo)
cfg = json.load(open(cfgp)); out = os.path.join(os.path.dirname(os.path.abspath(cfgp)), cfg["out"]); os.makedirs(out, exist_ok=True)
wav = os.path.join(out, "voice.wav")
inp = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", src] if src.endswith(".pcm") else ["-i", src]
subprocess.run(["ffmpeg", "-y", "-v", "error", *inp, "-af", f"silenceremove=start_periods=1:start_threshold=-45dB,atempo={tempo},aresample=44100", wav], check=True)
D = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]))
sents = [x for x in re.split(r"(?<=[.!?])\s+", open(txt).read().strip()) if x]
G = [[int(i) for i in g.split(",")] for g in groups.split("|")]
assert sum(len(g) for g in G) == len(sents), (len(sents), G)
assert len(G) == len(cfg["order"]), (len(G), len(cfg["order"]))
def silences(db, d):
    e = subprocess.run(["ffmpeg", "-hide_banner", "-i", wav, "-af", f"silencedetect=n={db}dB:d={d}", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [((float(a) + float(b)) / 2, float(b) - float(a)) for a, b in zip(re.findall(r"silence_start: ([\d.]+)", e), re.findall(r"silence_end: ([\d.]+)", e))]
need = len(sents) - 1
for db, d in ((-38, .12), (-34, .1), (-30, .09), (-27, .08), (-24, .07)):
    sil = silences(db, d)
    if len([1 for m, _ in sil if 0.4 < m < D - 0.3]) >= need * 1.3: break
cands = [(m, d) for m, d in sil if 0.4 < m < D - 0.3]
chars = [len(x) for x in sents]; tot = sum(chars); ends = []; acc = 0
for c in chars[:-1]: acc += c; ends.append(D * acc / tot)
K, N = len(ends), len(cands); INF = 1e18
cost = [[INF] * N for _ in range(K)]; back = [[-1] * N for _ in range(K)]
def c1(k, j): return abs(cands[j][0] - ends[k]) / 1.2 - 1.5 * math.log(max(cands[j][1], 0.05) / 0.1)
for j in range(N): cost[0][j] = c1(0, j)
for k in range(1, K):
    best, bj = INF, -1
    for j in range(N):
        if j > 0 and cost[k - 1][j - 1] < best: best, bj = cost[k - 1][j - 1], j - 1
        if bj >= 0: cost[k][j] = best + c1(k, j); back[k][j] = bj
j = min(range(N), key=lambda j: cost[K - 1][j]); pick = [0] * K
for k in range(K - 1, -1, -1): pick[k] = j; j = back[k][j]
bnd = [cands[j][0] for j in pick]
cut = []; idx = -1
for g in G[:-1]: idx += len(g); cut.append(bnd[idx])
durs = [cut[0]] + [b - a for a, b in zip(cut, cut[1:])] + [D - cut[-1] + 2.5]
cfg["dur"] = {f"p{i+1}": round(x, 2) for i, x in enumerate(durs)}
json.dump(cfg, open(cfgp, "w"), ensure_ascii=False, indent=1)
print(f"ses {D:.1f} sn, video {sum(durs):.1f} sn:", [round(x, 1) for x in durs])
