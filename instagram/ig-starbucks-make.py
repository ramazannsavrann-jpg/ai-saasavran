"""Starbucks / Seattle kahve karuseli (4 sayfa, 1080x1350). Veri: video/kahve-seattle/kahve-seattle-tr.json (18 Kas 2026)."""
import json, sys

d = json.load(open(sys.argv[1]))
CSS = """*{margin:0;box-sizing:border-box}
body{width:1080px;height:1350px;background:#0f1a18;font-family:Inter,sans-serif;color:#eaf3f0;position:relative;overflow:hidden}
.head{position:absolute;left:70px;top:25px;display:flex;align-items:center;gap:22px}
.logo{width:65px;height:65px;border-radius:14px;background:#14705e;display:flex;align-items:center;justify-content:center}
.brand{font-weight:700;font-size:38px;line-height:1.1}.url{font-size:26px;color:#9fb1ac;font-weight:500}
.pg{position:absolute;right:80px;top:44px;font-size:30px;color:#9fb1ac;font-weight:500}
.tag{position:absolute;left:80px;top:140px;background:#14705e;border-radius:40px;padding:10px 26px;font-size:32px;font-weight:700}
.h{position:absolute;left:80px;top:250px;width:930px;font-family:"Inter Display",Inter;font-weight:800;font-size:76px;line-height:1.1;letter-spacing:-1px}
.sub{font-family:Inter;font-weight:500;font-size:34px;color:#9fb1ac;letter-spacing:0;margin-top:16px;line-height:1.3}
.body{position:absolute;left:80px;right:80px;top:500px}
.row{margin-bottom:18px}.rl{display:flex;justify-content:space-between;font-size:40px;font-weight:700;margin-bottom:10px}
.tr{height:26px;border-radius:13px;background:#22332f}.fl{height:26px;border-radius:15px;background:#3ccba0}
.hl .rl{color:#f0c04a}.hl .fl{background:#f0c04a}
.card{background:#1e2e2a;border-radius:28px;padding:20px 30px;margin-bottom:16px}
.q{font-size:29px;color:#b7c6c1;font-weight:500;margin-bottom:4px}.w{font-size:40px;font-weight:800}
.w small{font-size:30px;font-weight:600;color:#b7c6c1;margin-left:10px}.sb{font-size:30px;font-weight:600;margin-top:6px}
.bad{color:#f07a6a}.gold{color:#f0c04a}.grn{color:#3ccba0}
table{width:100%;border-collapse:collapse;font-size:36px}th{font-size:28px;color:#9fb1ac;font-weight:600;text-align:right;padding:0 0 14px}
th:first-child,td:first-child{text-align:left}td{padding:14px 0;border-top:2px solid #22332f;text-align:right;font-weight:700}
.chips{position:absolute;left:80px;top:150px;display:flex;gap:18px;flex-wrap:wrap;width:930px}
.chip{border:3px solid;border-radius:40px;padding:10px 22px;font-size:34px;font-weight:600}
.cov{position:absolute;left:80px;top:330px;width:930px;font-family:"Inter Display",Inter;font-weight:900;font-size:88px;line-height:1.14;letter-spacing:-1px}
.en{color:#3ccba0;font-size:44px;font-weight:600;line-height:1.3;margin-top:28px;letter-spacing:0;font-family:Inter}
.meta{color:#b7c6c1;font-size:32px;font-weight:500;line-height:1.35;margin-top:40px;font-family:Inter;letter-spacing:0}
.foot{position:absolute;left:80px;right:80px;bottom:44px;font-size:22px;color:#9fb1ac;line-height:1.4}
.bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#14705e}"""
LOGO = '<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="17" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="5 4"/><circle cx="21" cy="21" r="10" fill="#fff"/></svg>'
FOOT = "Yapay zekânın cevaplarıdır · AI answers · Bağımsız ölçüm, hiçbir markayla iş birliğimiz yok · 18.11.2026"


def page(n, inner, foot=FOOT):
    return (f'<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{CSS}</style></head><body>'
            f'<div class="head"><div class="logo">{LOGO}</div><div><div class="brand">AI SaaSavran</div><div class="url">aisaasavran.com</div></div></div>'
            f'<div class="pg">{n}/4</div>{inner}<div class="foot">{foot}</div><div class="bar"></div></body></html>')


# 1) Kapak
cover = page(1, """<div class="chips"><span class="chip" style="color:#f0c04a;border-color:#f0c04a">ChatGPT</span><span class="chip" style="color:#3ccba0;border-color:#3ccba0">Claude</span><span class="chip" style="color:#9aa8f0;border-color:#9aa8f0">Perplexity</span><span class="chip" style="color:#e7a2d3;border-color:#e7a2d3">Gemini</span></div>
<div class="cov">Starbucks'ın şehrinde yapay zekâ hangi kahveciyi öneriyor?
<div class="en">In Starbucks' hometown, which coffee shop does AI recommend?</div>
<div class="meta">Seattle · 7 kafe · 8 soru · 48 canlı aramalı cevap + 14 Gemini cevabı<br>7 cafés · 8 questions · 48 live-search answers + 14 Gemini answers</div></div>""")

# 2) Kim öne çıktı
mx = 48
rows = "".join(
    f'<div class="row{" hl" if n == "Starbucks" else ""}"><div class="rl"><span>{n}</span><span>{k}/48</span></div>'
    f'<div class="tr"><div class="fl" style="width:{k / mx * 100:.1f}%"></div></div></div>' for n, k in d["brands"])
p2 = page(2, f'<div class="tag">Kaç cevapta geçti?</div><div class="h">Kim öne çıktı?<div class="sub">ChatGPT + Claude + Perplexity, ABD\'den canlı arama, 48 cevap</div></div><div class="body" style="top:500px">{rows}</div>')

# 3) Soru bazında
cards = ""
for q, items in d["questions"]:
    top = items[0]
    sb = next(i for i in items if i[0] == "Starbucks")
    cls = "bad" if sb[1].startswith("0") else "gold"
    cards += (f'<div class="card"><div class="q">{q}</div><div class="w">{top[0]}<small>{top[1]}</small></div>'
              f'<div class="sb {cls}">Starbucks: {sb[1]}</div></div>')
p3 = page(3, f'<div class="tag">Soru bazında</div><div class="h">Soru değişince kazanan değişiyor<div class="sub">8 sorudan 4\'ü · soru başına 6 cevap (canlı arama)</div></div><div class="body" style="top:500px">{cards}</div>')

# 4) Motorlar + kaynaklar
eng = {r[0]: r[1:] for r in d["eng_rows"]}
trs = ""
for name in ["Starbucks", "Anchorhead", "Milstead", "Espresso Vivace"]:
    v = eng[name]
    cells = "".join(f'<td class="{"bad" if x == 0 else ("gold" if (i == 3 and x >= 10) else "")}">{x}</td>' for i, x in enumerate(v))
    trs += f"<tr><td>{name}</td>{cells}</tr>"
src = ", ".join(s for s, _ in d["net"]["left"][:4])
p4 = page(4, f"""<div class="tag">Yapay zekâ karşılaştırması</div><div class="h">Yapay zekâlar anlaşamıyor<div class="sub">Kafenin geçtiği cevap sayısı</div></div>
<div class="body" style="top:520px"><div class="card"><table><tr><th></th><th>ChatGPT<br>/16</th><th>Claude<br>/16</th><th>Perplexity<br>/16</th><th>Gemini*<br>/14</th></tr>{trs}</table></div>
<div class="card"><div class="q">Yapay zekâ nereye baktı?</div><div class="w" style="font-size:36px;line-height:1.3">{src}</div></div>
<div class="sub" style="font-size:28px">* Gemini internete bakmadan, kendi bilgisiyle cevap verdi. Markanızı ücretsiz ölçün: <b class="grn">aisaasavran.com</b></div></div>""")

for i, html in enumerate([cover, p2, p3, p4]):
    open(f"sb-{i}.html", "w").write(html)
print("ok")
