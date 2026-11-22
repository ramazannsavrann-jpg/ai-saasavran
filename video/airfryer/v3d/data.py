# 22 Kasım 2026 ölçümü, run 4c0c6d53: ChatGPT+Claude+Perplexity, soru başına 6 canlı cevap
# Değer = markanın adının geçtiği cevap sayısı (mentions.mentioned)
B = ["Philips", "Xiaomi", "Ninja", "Karaca", "Tefal", "Arzum", "Cosori", "Fakir"]
Q = [  # yarış sırası (gösterim için seçildi; toplamlar sıradan bağımsız)
    ("Fiyat performans en iyisi?",   dict(Philips=4, Xiaomi=5, Ninja=1, Karaca=2, Tefal=1, Arzum=2, Cosori=2, Fakir=0)),
    ("Pencereli airfryer?",          dict(Philips=3, Xiaomi=5, Ninja=0, Karaca=3, Tefal=2, Arzum=0, Cosori=0, Fakir=0)),
    ("Kasım'da hangi model?",        dict(Philips=6, Xiaomi=5, Ninja=2, Karaca=1, Tefal=0, Arzum=0, Cosori=0, Fakir=0)),
    ("Uygun fiyatlı ama kaliteli?",  dict(Philips=5, Xiaomi=4, Ninja=1, Karaca=0, Tefal=0, Arzum=2, Cosori=1, Fakir=0)),
    ("1-2 kişilik ev için?",         dict(Philips=5, Xiaomi=5, Ninja=2, Karaca=3, Tefal=3, Arzum=2, Cosori=1, Fakir=0)),
    ("Telefondan kontrol?",          dict(Philips=6, Xiaomi=5, Ninja=2, Karaca=0, Tefal=0, Arzum=0, Cosori=2, Fakir=0)),
    ("Çift hazneli?",                dict(Philips=6, Xiaomi=0, Ninja=4, Karaca=2, Tefal=3, Arzum=0, Cosori=0, Fakir=0)),
    ("Kalabalık aile için?",         dict(Philips=6, Xiaomi=0, Ninja=5, Karaca=1, Tefal=1, Arzum=0, Cosori=2, Fakir=0)),
    ("Türkiye'de en iyisi?",         dict(Philips=6, Xiaomi=3, Ninja=3, Karaca=1, Tefal=0, Arzum=0, Cosori=1, Fakir=0)),
    ("Garantisi, servisi iyi?",      dict(Philips=6, Xiaomi=1, Ninja=0, Karaca=1, Tefal=4, Arzum=2, Cosori=0, Fakir=0)),
    ("Yerli mi yabancı mı?",         dict(Philips=3, Xiaomi=4, Ninja=1, Karaca=4, Tefal=3, Arzum=4, Cosori=1, Fakir=0)),
]
def cum(n):
    t = {b: 0 for b in B}
    for _, d in Q[:n]:
        for b in B: t[b] += d[b]
    return t
assert cum(11) == dict(Philips=56, Xiaomi=37, Ninja=21, Karaca=18, Tefal=17, Arzum=12, Cosori=10, Fakir=0)
