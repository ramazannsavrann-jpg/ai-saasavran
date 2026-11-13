import sys
from playwright.sync_api import sync_playwright
from veri import Backend, page
lang=sys.argv[1]; be=Backend(lang); errs=[]
with sync_playwright() as p:
    b,pg=page(p,lang,be); pg.on("console",lambda m: errs.append(m.text[:200]) if m.type=="error" else None)
    for t in ["rapor","oneriler","rakipler","urunler","olcumler"]:
        pg.goto(f"https://aisaasavran.com/marka/b-a?sekme={t}&tur=canli",wait_until="networkidle"); pg.wait_for_timeout(1500)
        pg.screenshot(path=f"d_{lang}_{t}.jpg",type="jpeg",quality=80,full_page=True)
    b.close()
print("unhandled",set(be.unhandled)); print("errs",errs[:10])
