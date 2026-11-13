# Eğitim 1 ekranları: gerçek arayüz, ÖRNEK veri (/api/check cevabı uydurma "Marka A" verisiyle değiştirilir; gerçek ölçüm yapılmaz).
import json, sys
from playwright.sync_api import sync_playwright
lang = sys.argv[1]; out = sys.argv[2]
L = {
 "tr": dict(home="https://aisaasavran.com/tr/", url="https://aisaasavran.com/tr/kontrol/", vals=("Marka A", "diş kliniği", "Antalya", ""),
   qs=[("Antalya'da en iyi diş kliniği hangileri?", True, True, "Antalya'da öne çıkan seçenekler: 1. Marka B: geniş uzman kadrosu. 2. Marka A: implant ve estetik diş hekimliğinde güçlü yorumlar. 3. Marka C: merkezi konum."),
       ("Bir diş kliniği arıyorum, Antalya'da. Hangisini önerirsin?", True, True, "Önceliğin estetik tedaviyse Marka A iyi bir seçenek olabilir. Uygun fiyat arıyorsan Marka C'ye de bakabilirsin."),
       ("Antalya'da en güvenilir diş kliniği seçenekleri neler? Kısa bir liste ver.", True, False, "Marka B, Marka D ve Marka A sık anılan klinikler arasında. Randevu öncesi yorumları kontrol et."),
       ("Antalya'da diş kliniği seçerken hangi firmalara bakmalıyım?", False, False, "Marka B ve Marka D'nin kurumsal klinikleri var; Marka C ise uzun çalışma saatleriyle öne çıkıyor."),
       ("Antalya'da fiyat/performans açısından en iyi diş kliniği hangisi?", False, False, "Fiyat/performans için Marka C ve Marka D öne çıkıyor.")]),
 "en": dict(home="https://aisaasavran.com/", url="https://aisaasavran.com/check/", vals=("Brand A", "dental clinic", "London", ""),
   qs=[("What are the best dental clinics in London?", True, True, "Popular options: 1. Brand B: large specialist team. 2. Brand A: strong reviews for implants and cosmetic dentistry. 3. Brand C: central location."),
       ("I'm looking for a dental clinic in London. Which one would you recommend?", True, True, "If cosmetic treatment is your priority, Brand A is a good choice. For lower prices, also look at Brand C."),
       ("What are the most trusted dental clinics in London? Give a short list.", True, False, "Brand B, Brand D and Brand A are among the clinics mentioned most often. Check recent reviews before booking."),
       ("Which companies should I look at when choosing a dental clinic in London?", False, False, "Brand B and Brand D run corporate clinics; Brand C stands out for long opening hours."),
       ("What is the best value dental clinic in London?", False, False, "For value, Brand C and Brand D stand out.")]),
}[lang]
body = dict(engine="Gemini (model knowledge, no live web search)", total=5, mentioned=3, recommended=2,
            questions=[dict(q=q, ok=True, mentioned=m, recommended=r, excerpt=e) for q, m, r, e in L["qs"]],
            others=(["Marka B", "Marka C", "Marka D"] if lang == "tr" else ["Brand B", "Brand C", "Brand D"]))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2.77, is_mobile=True, has_touch=True)
    pg.route("**/api/check", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(body)))
    pg.goto(L["home"], wait_until="networkidle", timeout=60000); pg.screenshot(path=f"{out}/a0_home.jpg", type="jpeg", quality=92)
    pg.goto(L["url"], wait_until="networkidle", timeout=60000); pg.screenshot(path=f"{out}/a1_form.jpg", type="jpeg", quality=92)
    k = 0
    for n, v in zip(["brand", "category", "city", "website"], L["vals"]):
        if not v: continue
        pg.click(f"input[name={n}]"); step = max(1, len(v) // 4)
        for i in range(step, len(v) + step, step):
            pg.fill(f"input[name={n}]", v[:i]); k += 1; pg.screenshot(path=f"{out}/a2_type{k:02d}.jpg", type="jpeg", quality=92)
    pg.locator("form button").last.click(); pg.wait_for_timeout(300); pg.screenshot(path=f"{out}/a3_wait.jpg", type="jpeg", quality=92)
    pg.wait_for_selector(".check-sum", timeout=30000); pg.wait_for_timeout(800)
    pg.evaluate("window.scrollTo(0, document.querySelector('.check-sum').getBoundingClientRect().top + window.scrollY - 40)"); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{out}/a4_result.jpg", type="jpeg", quality=92)
    d = pg.locator(".check-qs details").first; d.locator("summary").click(); pg.wait_for_timeout(400)
    pg.evaluate("window.scrollTo(0, document.querySelector('.check-qs li').getBoundingClientRect().top + window.scrollY - 40)"); pg.wait_for_timeout(400)
    pg.screenshot(path=f"{out}/a6_answer.jpg", type="jpeg", quality=92)
    print(k, pg.locator(".check-sum").inner_text()[:300])
    b.close()
