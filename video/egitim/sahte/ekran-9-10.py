# Eğitim 9 (Ürünler) ve 10 (Paylaşım / haftalık otomatik ölçüm) ekranları.
# Gerçek arayüz (yerel derleme) + sahte arka uç (veri.py), ÖRNEK veri. Gerçek veritabanına ya da siteye istek gitmez.
# Kullanım: python3 cek910.py <tr|en> <çıktı klasörü> <sahte klasörü> <web/dist>
import json, os, sys, mimetypes
from datetime import timedelta
lang, out, sahte, dist = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
sys.path.insert(0, sahte)
from playwright.sync_api import sync_playwright
import veri
from veri import Backend, page, iso, NOW
os.makedirs(out, exist_ok=True)
S = 2.77; offs = {}
FLAT = ".topbar{position:static!important}.bottomnav{display:none!important}"
JS = """() => [...document.querySelectorAll('h1,h2,h3,.loss-title,.src-head,button,[role=tab],.field-label,.weekly-note')].map(e => [e.tagName, (e.innerText||'').trim().slice(0,60), e.getBoundingClientRect().top + window.scrollY]).filter(x => x[1])"""
en = lang == "en"
T = (lambda tr, e: e if en else tr)

be = Backend(lang); db = be.db
own = dict(id="pr1", brand_id="b-a", name=T("Marka A Beyazlatma Seti", "Brand A Whitening Kit"), price=T("1.450 TL", "£89"),
           facts=T("Evde kullanılan diş beyazlatma seti. 14 günlük kullanım. Peroksit içermez. Hekim kontrolünde kullanılır.",
                   "At-home teeth whitening kit. 14-day course. Peroxide-free. Used under a dentist's supervision."),
           rival_of=None, rival_brand=None, check_requested_at=None, shopping_query=None, shopping_requested_at=None, created_at=iso(NOW - timedelta(days=20)))
rival = dict(own, id="pr2", name=T("Beyazlatma Kiti", "Whitening Kit"), price=None, facts="", rival_of="pr1", rival_brand="b-b", created_at=iso(NOW - timedelta(days=19)))
rival["rival_brand"] = T("Marka B", "Brand B")
db["products"] = [own, rival]
# Ürün görünürlüğü: beyazlatma sorusunun (p4) cevaplarının bir kısmında ürün adları geçer
import random as _r
_R = _r.Random(7)
for r in db["responses"]:
    if r["prompt_id"] == "p4" and r["measurement_type"] == "live_search":
        x = _R.random()
        if x < .45: r["answer_text"] += "\n" + T(f"Evde kullanım için {own['name']} ve {rival['name']} sık öneriliyor.", f"For home use, the {own['name']} and the {rival['name']} are often recommended.")
        elif x < .8: r["answer_text"] += "\n" + T(f"Evde kullanım için {rival['name']} öne çıkıyor.", f"For home use, the {rival['name']} stands out.")
db["product_checks"] = [dict(id="pc1", product_id="pr1", model="gpt", question=T("Marka A Beyazlatma Seti hakkında bilgi verir misin?", "Can you tell me about the Brand A Whitening Kit?"),
    answer_text=T("Marka A Beyazlatma Seti evde kullanılan bir diş beyazlatma setidir. 7 günlük kullanım için tasarlanmıştır ve peroksit içermez. Kullanmadan önce diş hekiminize danışmanız önerilir.",
                  "The Brand A Whitening Kit is an at-home teeth whitening kit. It's designed for a 7-day course and is peroxide-free. It's best to check with your dentist before use."),
    cited_urls=["https://marka-a.example.com/beyazlatma", "https://yorumlar.example.com/beyazlatma-setleri"], recognized=True, judge="gpt",
    claims=[dict(claim=T("7 günlük kullanım için tasarlanmış", "Designed for a 7-day course"), status="wrong", fact=T("14 günlük kullanım", "14-day course")),
            dict(claim=T("Peroksit içermez", "Peroxide-free"), status="correct", fact=T("Peroksit içermez", "Peroxide-free")),
            dict(claim=T("Kullanmadan önce diş hekimine danışılmalı", "Check with a dentist before use"), status="correct", fact=T("Hekim kontrolünde kullanılır", "Used under a dentist's supervision"))],
    created_at=iso(NOW - timedelta(days=3)))]
db["shopping_checks"] = [dict(id="sc1", product_id="pr1", query=T("diş beyazlatma seti", "teeth whitening kit"), country=T("TR", "GB"), own_position=4, own_price=T("1.450 TL", "£89"),
    own_seller="marka-a.example.com", own_count=1, rivals=[dict(id="pr2", position=1, price=T("1.290 TL", "£79"), seller="pazaryeri.example.com")],
    items=[dict(position=i + 1, title=t, source=s, price=pr, link=None, match=m) for i, (t, s, pr, m) in enumerate([
        (rival["name"], "pazaryeri.example.com", T("1.290 TL", "£79"), dict(id="pr2", kind="rival")),
        (T("Beyazlatma Kalemi 3'lü", "Whitening Pen 3-pack"), "magaza.example.com", T("399 TL", "£19"), None),
        (T("LED'li Beyazlatma Seti", "LED Whitening Kit"), "pazaryeri.example.com", T("899 TL", "£49"), None),
        (own["name"], "marka-a.example.com", T("1.450 TL", "£89"), dict(id="pr1", kind="own")),
        (T("Beyazlatma Bandı 28'li", "Whitening Strips 28-pack"), "eczane.example.com", T("649 TL", "£35"), None)])],
    created_at=iso(NOW - timedelta(days=1)))]
db["report_shares"] = [dict(id="rs1", brand_id="b-a", token="ornek-rapor", created_at=iso(NOW - timedelta(hours=2)), expires_at=iso(NOW + timedelta(days=30)), revoked_at=None)]

_rpc = be.rpc
def rpc(fn, a):
    if fn == "my_email_prefs": return [dict(weekly=True)]
    if fn in ("my_drop_alerts",): return True
    if fn in ("set_email_prefs", "set_drop_alerts"): return None
    return _rpc(fn, a)
be.rpc = rpc

def shared():
    vis = {t: rpc("brand_visibility", dict(p_brand="b-a", p_type=t)) for t in ("live_search", "model_knowledge")}
    last = [r for r in db["runs"] if r["measurement_type"] == "live_search"][-1]["id"]
    qs = [dict(text=q["prompt_text"], answers=q["answers"], recommended=q["target_recommended"], mentioned=q["target_mentioned"], top_competitor=q["top_competitor"])
          for q in rpc("run_prompt_results", dict(p_run=last))]
    cnt = {}
    for r in db["responses"]:
        if r["run_id"] == last:
            for u in r["cited_urls"]: d = u.split("/")[2]; cnt[d] = cnt.get(d, 0) + 1
    return dict(brand=dict(name=T("Marka A", "Brand A"), sector=T("Klinik / sağlık", "Dentist / medical clinic"), city=T("Antalya", "London"), country=T("TR", "GB")),
                expires_at=iso(NOW + timedelta(days=30)), branding=None, vis=vis, questions=qs,
                sources=[dict(domain=d, count=c) for d, c in sorted(cnt.items(), key=lambda x: -x[1])], actions=None)

APP = ("/giris", "/kayit", "/panel", "/hesap", "/marka/", "/rapor/", "/calisma-alani/")
def site(route):
    path = route.request.url.split("aisaasavran.com", 1)[1].split("?")[0]
    if path.startswith("/api/report"): return route.fulfill(json=shared())
    if path == "/config.json": return route.fulfill(json=dict(supabaseUrl=veri.FAKE, supabaseAnonKey="ornek", environment="production"))
    f = os.path.join(dist, path.lstrip("/"))
    if any(path.startswith(a) for a in APP) or not os.path.isfile(f):
        if os.path.isdir(f) and os.path.isfile(os.path.join(f, "index.html")) and not any(path.startswith(a) for a in APP): f = os.path.join(f, "index.html")
        elif not os.path.isfile(f): f = os.path.join(dist, "app", "index.html")
        else: f = os.path.join(dist, "app", "index.html")
    route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or "text/html")

with sync_playwright() as p:
    b, pg = page(p, lang, be)
    pg.clock.set_fixed_time("2026-11-14T10:00:00+03:00")
    pg.route("https://aisaasavran.com/**", site)
    def go(path):
        pg.goto(f"https://aisaasavran.com{path}", wait_until="networkidle"); pg.wait_for_timeout(1800)
    def snap(name, path):
        go(path); pg.screenshot(path=f"{out}/{name}.jpg", type="jpeg", quality=92)
        pg.add_style_tag(content=FLAT); pg.wait_for_timeout(300)
        offs[name] = [[t, x, round(y * S)] for t, x, y in pg.evaluate(JS)]
        pg.screenshot(path=f"{out}/{name}_tam.jpg", type="jpeg", quality=92, full_page=True)
    snap("u_urunler", "/marka/b-a?sekme=urunler")
    go("/marka/b-a?sekme=urunler"); pg.add_style_tag(content=FLAT)
    c = pg.get_by_role("button", name=T("Cevabı göster", "Show answer"))
    if c.count():
        c.first.click(); pg.wait_for_timeout(600)
        offs["u_cevap"] = [[t, x, round(y * S)] for t, x, y in pg.evaluate(JS)]
        pg.screenshot(path=f"{out}/u_cevap_tam.jpg", type="jpeg", quality=92, full_page=True)
    snap("p_rapor", "/marka/b-a?sekme=rapor&tur=canli")
    snap("p_paylasilan", "/rapor/ornek-rapor")
    snap("p_hesap", "/hesap")
    b.close()
json.dump(offs, open(f"{out}/ofset.json", "w"), ensure_ascii=False, indent=0)
print("eksik:", set(be.unhandled))
