"""Eğitim videoları için UYDURMA örnek veri ve sahte Supabase arka ucu.
Gerçek sitenin arayüzü kullanılır; ama sitenin Supabase adresi Playwright'ta hayali bir adrese yönlendirilir ve
her istek buradan, bellekteki örnek veriyle cevaplanır. Gerçek veritabanına hiçbir istek gitmez, hiçbir şey yazılmaz.
Adlar uydurmadır (Marka A/B/C/D, Ürün 1/2...).
"""
import json, random, re, urllib.parse
from datetime import datetime, timedelta, timezone

FAKE = "https://ornek-veri.supabase.co"
NOW = datetime(2026, 11, 13, 9, 0, tzinfo=timezone.utc)
def iso(d): return d.strftime("%Y-%m-%dT%H:%M:%S.000000+00:00")

L = {
 "tr": dict(
  A="Marka A", B="Marka B", C="Marka C", D="Marka D", sector="Klinik / sağlık", city="Antalya",
  prompts=[("Antalya'da en iyi diş kliniği hangisi?", "local", None),
           ("Antalya'da implant için hangi kliniği önerirsin?", "purchase", "implant"),
           ("Antalya'da güvenilir bir diş kliniği arıyorum, hangisine gideyim?", "local", None),
           ("Antalya'da fiyat/performans açısından en iyi diş kliniği hangisi?", "comparison", "uygun fiyat"),
           ("Antalya'da diş beyazlatma için hangi klinik iyi?", "purchase", "estetik"),
           ("Diş kliniği seçerken nelere dikkat etmeliyim?", "informational", None)],
  reasons={"A": ["implant ve estetik tedavilerde deneyimli", "modern cihazları ve hızlı randevusuyla öne çıkıyor", "hasta yorumları olumlu"],
           "B": ["geniş uzman kadrosu var", "birçok rehber sitesinde ilk sıralarda", "yorumlarda en çok anılan klinik"],
           "C": ["merkezi konumda ve uygun fiyatlı", "taksit seçenekleri sunuyor"],
           "D": ["çocuk diş hekimliğinde bilinen bir klinik", "uzun çalışma saatleri var"]},
  intro="Antalya'da öne çıkan seçenekler şunlar:", tail="Randevu almadan önce güncel yorumları kontrol etmenizi öneririm.",
  traits=[("implant deneyimi", "implant ve estetik tedavilerde deneyimli"), ("modern ekipman", "modern cihazları"), ("olumlu yorumlar", "hasta yorumları olumlu"), ("fiyat bilgisi az", "fiyat bilgisine sitesinde ulaşmak zor")],
  facts="Pazartesi–Cumartesi 09:00–19:00 açık. İmplant ve diş beyazlatma yapılıyor. 12 hekim.",
 ),
 "en": dict(
  A="Brand A", B="Brand B", C="Brand C", D="Brand D", sector="Dentist / medical clinic", city="London",
  prompts=[("What is the best dental clinic in London?", "local", None),
           ("Which clinic in London would you recommend for dental implants?", "purchase", "implants"),
           ("I'm looking for a trustworthy dental clinic in London. Where should I go?", "local", None),
           ("What is the best value dental clinic in London?", "comparison", "budget"),
           ("Which clinic in London is good for teeth whitening?", "purchase", "cosmetic"),
           ("What should I look for when choosing a dental clinic?", "informational", None)],
  reasons={"A": ["experienced in implants and cosmetic treatment", "stands out for modern equipment and quick appointments", "patient reviews are positive"],
           "B": ["has a large team of specialists", "ranks first on several guide sites", "the clinic mentioned most in reviews"],
           "C": ["central location and affordable prices", "offers payment plans"],
           "D": ["known for children's dentistry", "long opening hours"]},
  intro="Here are the clinics that stand out in London:", tail="I'd suggest checking recent reviews before you book.",
  traits=[("implant experience", "experienced in implants and cosmetic treatment"), ("modern equipment", "modern equipment"), ("positive reviews", "patient reviews are positive"), ("little price info", "price information is hard to find on its site")],
  facts="Open Monday–Saturday 9:00–19:00. Implants and teeth whitening. 12 dentists.",
 ),
}

SOURCES = ["https://klinikrehberi.example.com/en-iyi-klinikler", "https://yorumlar.example.com/dis-klinikleri",
           "https://saglik-haber.example.com/klinik-secimi", "https://ornek-marka-b.example.com/hakkimizda",
           "https://forum.example.com/dis-klinigi-tavsiye", "https://marka-a.example.com/implant"]


def build(lang, seed=40):
    t = L[lang]; R = random.Random(seed)
    ws = dict(id="ws-ornek", name=t["A"], kind="business", plan="pro", status="active", paused_reason=None, paid_live_allowed=True)
    def brand(i, key, comp, site):
        return dict(id=i, workspace_id=ws["id"], name=t[key], aliases=[], website=site, sector=t["sector"] if not comp else None,
                    city=t["city"] if not comp else None, country=None, is_competitor=comp, owner_brand_id=None if not comp else "b-a",
                    data_origin="live_api", auto_weekly=True, audit_requested_at=None, reanalyze_requested_at=None,
                    fact_card=t["facts"] if not comp else None, fact_card_updated_at=iso(NOW - timedelta(days=9)) if not comp else None,
                    track_key="ornek", created_at=iso(NOW - timedelta(days=60)))
    brands = [brand("b-a", "A", False, "marka-a.example.com"), brand("b-b", "B", True, "ornek-marka-b.example.com"),
              brand("b-c", "C", True, "marka-c.example.com"), brand("b-d", "D", True, None)]
    prompts = [dict(id=f"p{i}", brand_id="b-a", text=q, intent=it, segment=sg, active=True, created_at=iso(NOW - timedelta(days=50, minutes=i)))
               for i, (q, it, sg) in enumerate(t["prompts"])]
    runs, responses, mentions = [], [], []
    weeks = 6
    for w in range(weeks):
        at = NOW - timedelta(days=7 * (weeks - 1 - w), hours=1)
        prog = w / (weeks - 1)  # zamanla iyileşme
        for kind, provs in (("live_search", ["openai", "claude"]), ("model_knowledge", ["gemini"])):
            rid = f"r{w}{kind[0]}"
            runs.append(dict(id=rid, brand_id="b-a", status="done", measurement_type=kind, provider=provs[0], model=None, stop_reason="completed",
                             error_class=None, error=None, calls_ok=len(prompts) * len(provs) * 3, calls_failed=0, prompts_total=len(prompts),
                             created_at=iso(at), finished_at=iso(at + timedelta(minutes=4)), trigger="weekly" if w else "manual"))
            for pv in provs:
                for p in prompts:
                    for rep in (1, 2, 3):
                        k = int(p["id"][1:])
                        # Marka A'nın önerilme şansı: soruya ve motora göre değişir, zamanla artar
                        base = {0: .45, 1: .7, 2: .4, 3: .15, 4: .55, 5: .1}[k] + (0.12 if pv == "claude" else -0.05 if pv == "gemini" else 0)
                        pa = min(.95, base * (0.55 + 0.6 * prog))
                        order = (["B"] if R.random() < .78 else []) + (["A"] if R.random() < pa else []) + R.sample(["C", "D"], k=R.choice([1, 1, 2]))
                        if "A" in order and R.random() < .45: order.remove("A"); order.insert(0, "A")
                        if k == 5: order = order[:2] if R.random() < .6 else []
                        mentioned_only = ["A"] if "A" not in order and R.random() < .25 else []
                        lines = [f"{i + 1}. {t[x]}: {R.choice(t['reasons'][x])}." for i, x in enumerate(order)]
                        extra = ({"tr": f" {t['A']} de anılıyor ama fiyat bilgisine sitesinde ulaşmak zor.", "en": f" {t['A']} also comes up, but price information is hard to find on its site."}[lang] if mentioned_only else "")
                        text = (t["intro"] + "\n" + "\n".join(lines) + "\n" + t["tail"] + extra) if order else t["tail"]
                        rsp = f"x{w}{kind[0]}{pv[0]}{k}{rep}"
                        cites = R.sample(SOURCES[:5], k=R.choice([2, 3])) if kind == "live_search" else []
                        if kind == "live_search" and "A" in order and R.random() < .2 + .3 * prog: cites.append(SOURCES[5])
                        responses.append(dict(id=rsp, run_id=rid, prompt_id=p["id"], repetition=rep, answer_text=text, model={"openai": "gpt", "claude": "claude", "gemini": "gemini"}[pv],
                                              provider=pv, cited_urls=cites, measurement_type=kind, created_at=iso(at)))
                        for x, bid in (("A", "b-a"), ("B", "b-b"), ("C", "b-c"), ("D", "b-d")):
                            rec = x in order; men = rec or x in mentioned_only
                            perc = None
                            if x == "A" and men and kind == "live_search":
                                tr_ = R.sample(t["traits"][:3], k=2) + ([t["traits"][3]] if mentioned_only else [])
                                perc = dict(sentiment="positive" if rec else "mixed", traits=[dict(trait=a, quote=b) for a, b in tr_])
                            mentions.append(dict(response_id=rsp, brand_id=bid, recommended=rec, mentioned=men, cited=(x == "A" and SOURCES[5] in cites) or (x == "B" and SOURCES[3] in cites),
                                                 rank=(order.index(x) + 1) if rec else None, perception=perc))
    actions = [dict(id="act1", brand_id="b-a", title={"tr": "İmplant sayfasına fiyat aralığı ve SSS eklendi", "en": "Added a price range and FAQ to the implants page"}[lang],
                    note=None, done_on=(NOW - timedelta(days=15)).strftime("%Y-%m-%d"), created_at=iso(NOW - timedelta(days=15)), rec_id=None, tasks=None)]
    return dict(workspaces=[ws], brands=brands, prompts=prompts, runs=runs, responses=responses, mentions=mentions,
                brand_actions=actions, products=[], product_checks=[], shopping_checks=[], site_audits=[AUDIT(lang)], truth_checks=[],
                engine_conflicts=[], ai_visits=[], ai_bot_hits=[], report_shares=[], workspace_invites=[], api_keys=[])


def AUDIT(lang):
    C = [("https", True, "high", "HTTPS açık", "Site güvenli bağlantıyla açılıyor.", "HTTPS enabled", "The site loads over a secure connection."),
         ("robots", True, "high", "Yapay zekâ botları engellenmiyor", "robots.txt, yapay zekâ arama botlarına izin veriyor.", "AI bots are not blocked", "robots.txt allows AI search bots."),
         ("schema", False, "high", "Yapılandırılmış veri eksik", "Sayfada işletme bilgisi (LocalBusiness) işaretlemesi yok.", "Structured data missing", "No LocalBusiness markup on the page."),
         ("faq", False, "medium", "SSS bölümü yok", "Sık sorulan sorular, yapay zekânın alıntılayabileceği kısa cevaplar sağlar.", "No FAQ section", "FAQs give AI short answers it can quote."),
         ("title", True, "medium", "Başlık ve açıklama var", "Sayfa başlığı ve açıklaması dolu.", "Title and description set", "Page title and description are filled in."),
         ("price", False, "low", "Fiyat bilgisi bulunamadı", "Hizmet fiyat aralığı sitede yazılı değil.", "No price information", "No price range is listed on the site."),
         ("sitemap", True, "low", "Site haritası var", "sitemap.xml bulundu.", "Sitemap found", "sitemap.xml was found.")]
    return dict(id="au1", brand_id="b-a", url="https://marka-a.example.com", status="ok", created_at=iso(NOW - timedelta(days=2)),
                checks=[dict(id=a, ok=b, severity=c, title=d, detail=e, title_en=f, detail_en=g) for a, b, c, d, e, f, g in C])


# ---------- PostgREST benzeri sorgu ----------
def _match(row, k, v):
    op, _, val = v.partition(".")
    x = row.get(k)
    if op == "eq": return str(x).lower() == val.lower() if isinstance(x, bool) else str(x) == val
    if op == "neq": return str(x) != val
    if op == "is": return (x is None) if val == "null" else (x is (val == "true"))
    if op == "in": return str(x) in [s.strip('"') for s in val.strip("()").split(",")]
    if op in ("gte", "gt", "lte", "lt"):
        if x is None: return False
        return {"gte": x >= val, "gt": x > val, "lte": x <= val, "lt": x < val}[op]
    return True


class Backend:
    def __init__(self, lang):
        self.lang = lang; self.db = build(lang); self.unhandled = []

    def rpc(self, fn, a):
        db = self.db
        if fn == "is_platform_admin": return False
        if fn in ("my_invites", "workspace_team"): return [] if fn == "my_invites" else [dict(user_id="u1", email="ornek@example.com", role="owner", joined_at=iso(NOW), is_me=True)]
        if fn == "workspace_usage":
            return [dict(plan_id="pro", plan_name="Pro", status="active", paused_reason=None, engine_calls=180, engine_call_limit=3000, free_calls=60,
                         paid_cost_usd=1.2, paid_cap_usd=40, brands_used=1, brand_limit=10, prompt_limit=60, competitor_limit=10, live_search_enabled=True)]
        if fn == "paid_budget": return [dict(allowed=True, cap_usd=40, spent_usd=1.2)]
        if fn == "brand_visibility":
            out = {}
            names = {b["id"]: b["name"] for b in db["brands"]}
            for r in db["runs"]:
                if r["brand_id"] != a["p_brand"] or r["measurement_type"] != a["p_type"]: continue
                rs = {x["id"]: x for x in db["responses"] if x["run_id"] == r["id"]}
                for m in db["mentions"]:
                    x = rs.get(m["response_id"])
                    if not x: continue
                    key = (r["id"], x["provider"], m["brand_id"])
                    o = out.setdefault(key, dict(run_id=r["id"], run_at=r["finished_at"], provider=x["provider"], model=x["model"], brand_id=m["brand_id"],
                                                 brand_name=names[m["brand_id"]], is_target=m["brand_id"] == a["p_brand"], n=0, mentioned=0, recommended=0, cited=0))
                    o["n"] += 1; o["mentioned"] += m["mentioned"]; o["recommended"] += m["recommended"]
            return sorted(out.values(), key=lambda o: (o["run_at"], o["brand_name"]))
        if fn == "run_prompt_results":
            rs = [x for x in db["responses"] if x["run_id"] == a["p_run"] and (not a.get("p_provider") or x["provider"] == a["p_provider"])]
            names = {b["id"]: b["name"] for b in db["brands"]}; out = []
            for p in db["prompts"]:
                pr = [x for x in rs if x["prompt_id"] == p["id"]]
                if not pr: continue
                ids = {x["id"] for x in pr}; ms = [m for m in db["mentions"] if m["response_id"] in ids]
                tm = [m for m in ms if m["brand_id"] == "b-a"]
                comp = {}
                for m in ms:
                    if m["brand_id"] != "b-a" and m["recommended"]: comp[m["brand_id"]] = comp.get(m["brand_id"], 0) + 1
                top = max(comp.items(), key=lambda kv: kv[1]) if comp else (None, 0)
                ranks = [m["rank"] for m in tm if m["rank"]]
                out.append(dict(prompt_id=p["id"], prompt_text=p["text"], intent=p["intent"], answers=len(pr), target_mentioned=sum(m["mentioned"] for m in tm),
                                target_recommended=sum(m["recommended"] for m in tm), best_rank=min(ranks) if ranks else None,
                                top_competitor=names.get(top[0]), top_competitor_recs=top[1]))
            return out
        if fn in ("request_run", "request_site_audit", "request_product_check", "request_shopping_check"): return None
        self.unhandled.append(("rpc", fn)); return []

    def rest(self, table, query, single):
        rows = self.db.get(table)
        if rows is None: self.unhandled.append(("rest", table)); rows = []
        q = urllib.parse.parse_qsl(query, keep_blank_values=True)
        order, limit = None, None
        for k, v in q:
            if k == "select": continue
            if k == "order": order = v; continue
            if k == "limit": limit = int(v); continue
            if k == "offset": continue
            rows = [r for r in rows if _match(r, k, v)]
        if order:
            for part in reversed(order.split(",")):
                f, *mods = part.split(".")
                rows = sorted(rows, key=lambda r: (r.get(f) is None, r.get(f) or ""), reverse="desc" in mods)
        if limit: rows = rows[:limit]
        if single: return rows[0] if rows else None
        return rows

    def handle(self, route):
        r = route.request; u = r.url[len(FAKE):]; path, _, query = u.partition("?")
        if path.startswith("/auth/v1/user"):
            return route.fulfill(json=dict(id="u1", email="ornek@example.com", aud="authenticated", role="authenticated", user_metadata=dict(lang=self.lang), app_metadata={}))
        if path.startswith("/auth/v1/settings"): return route.fulfill(json=dict(external=dict(google=False)))
        if path.startswith("/auth/"): return route.fulfill(json={})
        if path.startswith("/rest/v1/rpc/"):
            fn = path.split("/")[-1]; a = json.loads(r.post_data or "{}")
            return route.fulfill(json=self.rpc(fn, a))
        if path.startswith("/rest/v1/"):
            table = path.split("/")[-1]
            if r.method != "GET": return route.fulfill(status=201, json=[])
            single = "vnd.pgrst.object" in (r.headers.get("accept") or "")
            res = self.rest(table, query, single)
            if single and res is None: return route.fulfill(status=406, json=dict(code="PGRST116", message="no rows"))
            return route.fulfill(json=res)
        self.unhandled.append(("other", path)); return route.fulfill(json={})


def page(p, lang, backend):
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2.77, is_mobile=True, has_touch=True, bypass_csp=True, locale="tr-TR" if lang == "tr" else "en-GB")
    pg = ctx.new_page()
    pg.route("**/config.json", lambda r: r.fulfill(json=dict(supabaseUrl=FAKE, supabaseAnonKey="ornek", environment="production")))
    pg.route(FAKE + "/**", backend.handle)
    sess = dict(access_token="ornek.ornek.ornek", token_type="bearer", expires_in=360000, expires_at=2000000000, refresh_token="ornek",
                user=dict(id="u1", email="ornek@example.com", aud="authenticated", role="authenticated", user_metadata={}, app_metadata={}))
    pg.add_init_script(f"localStorage.setItem('saasavran-auth', {json.dumps(json.dumps(sess))}); localStorage.setItem('lang', '{lang}'); localStorage.setItem('ws', 'ws-ornek');")
    return b, pg
