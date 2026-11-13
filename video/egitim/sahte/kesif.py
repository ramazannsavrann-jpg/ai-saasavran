import json, sys
from playwright.sync_api import sync_playwright
FAKE="https://ornek-veri.supabase.co"
log=[]
def handle(route):
    r=route.request; u=r.url.replace(FAKE,""); log.append((r.method,u,r.post_data))
    if "/auth/v1/user" in u: return route.fulfill(json={"id":"u1","email":"ornek@example.com","aud":"authenticated","role":"authenticated","user_metadata":{"lang":"tr"},"app_metadata":{}})
    if "/auth/v1/settings" in u: return route.fulfill(json={"external":{"google":False}})
    route.fulfill(json=[])
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=b.new_page(viewport={"width":390,"height":844},bypass_csp=True)
    pg.route("**/config.json",lambda r:r.fulfill(json={"supabaseUrl":FAKE,"supabaseAnonKey":"ornek","environment":"production"}))
    pg.route(FAKE+"/**",handle)
    sess={"access_token":"x.y.z","token_type":"bearer","expires_in":360000,"expires_at":2000000000,"refresh_token":"r","user":{"id":"u1","email":"ornek@example.com","aud":"authenticated","role":"authenticated","user_metadata":{},"app_metadata":{}}}
    pg.add_init_script(f"localStorage.setItem('saasavran-auth', {json.dumps(json.dumps(sess))}); localStorage.setItem('lang','tr');")
    pg.on("console",lambda m: log.append(("console",m.type,m.text[:200])))
    pg.goto("https://aisaasavran.com/panel",wait_until="networkidle"); pg.wait_for_timeout(1500)
    pg.screenshot(path="k1.jpg",type="jpeg")
    pg.goto("https://aisaasavran.com/marka/b1",wait_until="networkidle"); pg.wait_for_timeout(1500)
    pg.screenshot(path="k2.jpg",type="jpeg")
    b.close()
for l in log: print(l)
