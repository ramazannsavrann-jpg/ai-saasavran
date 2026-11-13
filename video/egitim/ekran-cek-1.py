from playwright.sync_api import sync_playwright
vals=("AI SaaSavran","yapay zekâ görünürlük ölçüm aracı","Türkiye","aisaasavran.com")
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":390,"height":844},device_scale_factor=2.77,is_mobile=True,has_touch=True)
    pg.goto("https://aisaasavran.com/tr/",wait_until="networkidle",timeout=60000)
    pg.screenshot(path="a0_home.jpg",type="jpeg",quality=92)
    pg.goto("https://aisaasavran.com/tr/kontrol/",wait_until="networkidle",timeout=60000)
    pg.screenshot(path="a1_form.jpg",type="jpeg",quality=92)
    k=0
    for n,v in zip(["brand","category","city","website"],vals):
        pg.click(f"input[name={n}]")
        for i in range(0,len(v),max(1,len(v)//4)):
            pg.fill(f"input[name={n}]",v[:i+max(1,len(v)//4)]); k+=1
            pg.screenshot(path=f"a2_type{k:02d}.jpg",type="jpeg",quality=92)
    pg.locator("form button").last.click()
    pg.wait_for_timeout(1200); pg.screenshot(path="a3_wait.jpg",type="jpeg",quality=92)
    pg.wait_for_selector(".check-sum",timeout=120000); pg.wait_for_timeout(1500)
    el=pg.locator(".check-sum"); el.scroll_into_view_if_needed(); pg.evaluate("window.scrollBy(0,-120)"); pg.wait_for_timeout(400)
    pg.screenshot(path="a4_result.jpg",type="jpeg",quality=92)
    pg.locator(".check-qs").scroll_into_view_if_needed(); pg.wait_for_timeout(400)
    pg.screenshot(path="a5_qs.jpg",type="jpeg",quality=92)
    d=pg.locator(".check-qs details").first
    if d.count():
        d.locator("summary").click(); pg.wait_for_timeout(500); d.scroll_into_view_if_needed(); pg.evaluate("window.scrollBy(0,-160)")
        pg.screenshot(path="a6_answer.jpg",type="jpeg",quality=92)
    pg.evaluate("window.scrollTo(0,document.body.scrollHeight)"); pg.wait_for_timeout(400)
    pg.screenshot(path="a7_cta.jpg",type="jpeg",quality=92)
    print(pg.locator("#check-out, .check-sum").first.inner_text()[:800]); print(pg.locator(".check-qs").inner_text()[:1500])
    b.close()
