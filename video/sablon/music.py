# Telifsiz, burada sentezlenen hafif ve enerjik fon müziği (C-G-Am-F, 112 BPM): pad + arpej + hafif davul.
import numpy as np, wave
SR, BPM, DUR = 44100, 112, 60.0
beat = 60 / BPM; n = int(SR * DUR); t = np.arange(n) / SR
out = np.zeros(n)
def note(f): return 440 * 2 ** ((f - 69) / 12)
chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]  # C G Am F
bar = 4 * beat
def env(L, a=0.01, r=0.25):
    e = np.ones(L); A = int(a * SR); R = int(min(r * SR, L))
    e[:A] = np.linspace(0, 1, A); e[-R:] *= np.linspace(1, 0, R); return e
k = 0
while k * bar < DUR:
    ch = chords[k % 4]; s = int(k * bar * SR); L = min(int(bar * SR), n - s)
    tt = np.arange(L) / SR
    pad = sum(np.sin(2 * np.pi * note(m) * tt) + 0.3 * np.sin(2 * np.pi * note(m) * 2.003 * tt) for m in ch) / 6
    out[s:s + L] += 0.18 * pad * env(L, 0.3, 0.5)
    bass = np.sin(2 * np.pi * note(ch[0] - 24) * tt) * 0.25
    out[s:s + L] += bass * env(L, 0.02, 0.3)
    # arpej (sekizlik)
    for i in range(8):
        st = s + int(i * beat / 2 * SR); Ln = min(int(beat / 2 * SR), n - st)
        if Ln <= 0: break
        m = ch[[0, 1, 2, 1, 0, 2, 1, 2][i]] + 12
        x = np.arange(Ln) / SR
        tone = (np.sin(2 * np.pi * note(m) * x) + 0.4 * np.sin(2 * np.pi * note(m) * 2 * x)) * np.exp(-x * 9)
        out[st:st + Ln] += 0.10 * tone
    # davul: vuruşta kick, ara sekizliklerde hi-hat
    for b in range(4):
        st = s + int(b * beat * SR); Ln = min(int(0.25 * SR), n - st)
        if Ln > 0:
            x = np.arange(Ln) / SR
            out[st:st + Ln] += 0.35 * np.sin(2 * np.pi * (50 + 90 * np.exp(-x * 30)) * x) * np.exp(-x * 14)
        st2 = st + int(beat / 2 * SR); Lh = min(int(0.05 * SR), n - st2)
        if Lh > 0:
            out[st2:st2 + Lh] += 0.05 * np.random.default_rng(b + k).standard_normal(Lh) * np.exp(-np.arange(Lh) / SR * 80)
    k += 1
fade = int(2.5 * SR); out[-fade:] *= np.linspace(1, 0, fade); out[:int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR))
out = out / np.max(np.abs(out)) * 0.8
with wave.open("music.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
print("ok")
