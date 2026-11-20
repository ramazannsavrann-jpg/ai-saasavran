"""Rakip YouTube araştırması (20 Kasım 2026): vidIQ kredisi harcamadan, kendi YouTube Data API yetkimizle.

Rakip araçların ve "AI visibility / GEO" konusundaki videoların başlık, kanal, tarih, izlenme, süre ve TAM
açıklamalarını (bölümler, "öne çıkanlar", özellik listeleri) toplar; geo-veri gibi ayrı bir dala (rakip-veri)
markdown olarak yazar. Haftalık piyasa raporu ve Claude oturumları bu dosyayı okur.
Yalnız OKUR: hiçbir videoya, kanala dokunmaz. Başkalarının altyazıları resmî API ile indirilemez; açıklamalar kullanılır.
Kota: search.list 100 birim/arama (~12 arama = ~1.200), videos.list 1 birim/50 video. Günlük sınır 10.000
(youtube-ayar ile paylaşılır).
Anahtarlar yalnız ortam değişkenlerinden: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
"""
import json, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

API = "https://www.googleapis.com/youtube/v3"
OUT = os.environ.get("OUT_DIR", "rakip-data")
DAYS = int(os.environ.get("DAYS", "120"))

# Rakip araçlar + konu aramaları. Yeni rakip çıkınca buraya eklenir.
QUERIES = [
    "Peec AI", "Profound AI visibility", "Otterly AI", "AthenaHQ AI search", "Scrunch AI visibility",
    "Rankscale AI", "Semrush AI visibility toolkit", "Ahrefs Brand Radar",
    "AI visibility tool review", "generative engine optimization tool", "track brand mentions ChatGPT",
    "ChatGPT shopping product recommendations",
]


def token():
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", data) as r:
        return json.load(r)["access_token"]


TOK = token()
quota = 0


def get(path, params, cost):
    global quota
    quota += cost
    req = urllib.request.Request(f"{API}/{path}?" + urllib.parse.urlencode(params), headers={"Authorization": f"Bearer {TOK}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def dur(iso):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return "?"
    h, mi, s = (int(x or 0) for x in m.groups())
    return f"{h}:{mi:02d}:{s:02d}" if h else f"{mi}:{s:02d}"


after = (datetime.now(timezone.utc) - timedelta(days=DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")
found = {}  # video id -> hangi aramalarda çıktı
for q in QUERIES:
    try:
        res = get("search", {"part": "id", "q": q, "type": "video", "maxResults": 12, "order": "relevance",
                             "publishedAfter": after, "relevanceLanguage": "en"}, 100)
    except Exception as e:  # tek arama düşerse diğerleri sürsün
        print(f"arama hatası '{q}': {e}", file=sys.stderr)
        continue
    for it in res.get("items", []):
        vid = it["id"].get("videoId")
        if vid:
            found.setdefault(vid, []).append(q)

ids = list(found)
videos = []
for i in range(0, len(ids), 50):
    res = get("videos", {"part": "snippet,statistics,contentDetails", "id": ",".join(ids[i:i + 50])}, 1)
    videos += res.get("items", [])

rows = []
for v in videos:
    sn, st = v["snippet"], v.get("statistics", {})
    rows.append({
        "id": v["id"], "title": sn["title"], "channel": sn["channelTitle"], "channelId": sn["channelId"],
        "published": sn["publishedAt"][:10], "views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)),
        "duration": dur(v["contentDetails"].get("duration")), "queries": found[v["id"]],
        "description": sn.get("description", ""),
    })
rows.sort(key=lambda r: r["views"], reverse=True)

today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
os.makedirs(os.path.join(OUT, "youtube"), exist_ok=True)
json.dump({"date": today, "days": DAYS, "quota": quota, "videos": rows}, open(os.path.join(OUT, "youtube", "latest.json"), "w"), ensure_ascii=False, indent=1)

md = [f"# Rakip YouTube araştırması — {today}", "",
      f"Son {DAYS} günde yayınlanan {len(rows)} video, {len(QUERIES)} arama. Kota: ~{quota} birim. Sıra: izlenme.", "",
      "Yalnız açıklamalar (başkalarının altyazıları resmî API ile alınamaz). Bilgiyi kullanmadan önce rakibin resmî sayfasından doğrula.", ""]
for r in rows:
    desc = r["description"].strip()
    if len(desc) > 3000:
        desc = desc[:3000] + " …"
    md += [f"## {r['title']}", "",
           f"- Kanal: {r['channel']} · Tarih: {r['published']} · İzlenme: {r['views']:,} · Süre: {r['duration']}",
           f"- https://www.youtube.com/watch?v={r['id']}", f"- Bulunduğu aramalar: {', '.join(r['queries'])}", "",
           "```", desc, "```", ""]
open(os.path.join(OUT, "youtube", "latest.md"), "w").write("\n".join(md))
open(os.path.join(OUT, "youtube", f"{today}.md"), "w").write("\n".join(md))
print(f"{len(rows)} video yazıldı, kota ~{quota}")
