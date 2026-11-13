# Rapor eğitimleri (4-10) ekranları: gerçek arayüz + sahte arka uç (veri.py), ÖRNEK veri. Gerçek veritabanına istek gitmez.
import json, sys, os
from playwright.sync_api import sync_playwright
from veri import Backend, page
lang, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
be = Backend(lang); S = 2.77; offs = {}
FLAT = ".topbar{position:static!important}.bottomnav{display:none!important}"
JS = """() => [...document.querySelectorAll('h1,h2,h3,.loss-title,button,[role=tab]')].map(e => [e.tagName, (e.innerText||'').trim().slice(0,60), e.getBoundingClientRect().top + window.scrollY]).filter(x => x[1])"""
with sync_playwright() as p:
    b, pg = page(p, lang, be)
    def go(q):
        pg.goto(f"https://aisaasavran.com/marka/b-a?{q}", wait_until="networkidle"); pg.wait_for_timeout(1800)
    for name, q in [("rapor", "sekme=rapor&tur=canli"), ("rapor_aramasiz", "sekme=rapor&tur=aramasiz"), ("oneriler", "sekme=oneriler&tur=canli"),
                    ("rakipler", "sekme=rakipler"), ("olcumler", "sekme=olcumler"), ("sorular", "sekme=sorular")]:
        go(q); pg.screenshot(path=f"{out}/r_{name}.jpg", type="jpeg", quality=92)  # doğal görünüm (üst çubuk + alt menü)
        st = pg.add_style_tag(content=FLAT); pg.wait_for_timeout(300)
        offs[name] = [[t, x, round(y * S)] for t, x, y in pg.evaluate(JS)]
        pg.screenshot(path=f"{out}/r_{name}_tam.jpg", type="jpeg", quality=92, full_page=True)
    # motor seçimi: Claude
    go("sekme=rapor&tur=canli")
    btn = pg.get_by_role("button", name="Claude (Anthropic)")
    if btn.count():
        btn.first.click(); pg.wait_for_timeout(1200); pg.add_style_tag(content=FLAT)
        pg.screenshot(path=f"{out}/r_rapor_claude_tam.jpg", type="jpeg", quality=92, full_page=True)
        offs["rapor_claude"] = [[t, x, round(y * S)] for t, x, y in pg.evaluate(JS)]
    # ilk "Cevabı göster" açık hâli
    go("sekme=rapor&tur=canli"); pg.add_style_tag(content=FLAT)
    c = pg.get_by_role("button", name="Cevabı göster" if lang == "tr" else "Show answer")
    if c.count():
        c.first.click(); pg.wait_for_timeout(600)
        offs["rapor_cevap"] = [[t, x, round(y * S)] for t, x, y in pg.evaluate(JS)]
        pg.screenshot(path=f"{out}/r_rapor_cevap_tam.jpg", type="jpeg", quality=92, full_page=True)
    b.close()
json.dump(offs, open(f"{out}/ofset.json", "w"), ensure_ascii=False, indent=0)
print("eksik:", set(be.unhandled))
