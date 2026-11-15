"""YouTube kanal ayarları: dil, yapay içerik işareti, ücretli tanıtım yok, oynatma listeleri.

Anahtarlar yalnızca ortam değişkenlerinden (GitHub Secrets) okunur:
YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
Kota: videos.update ve playlistItems.insert 50'şer birim (günlük 10.000).
Her şey idempotent: zaten doğru olan video/liste tekrar güncellenmez.
"""
import json, os, re, sys, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

API = "https://www.googleapis.com/youtube/v3"
DRY = os.environ.get("DRY_RUN") == "1"
CFG = json.load(open(os.path.join(os.path.dirname(__file__), "ayar.json"), encoding="utf-8"))
quota = 0


def token():
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": os.environ["YT_REFRESH_TOKEN"], "grant_type": "refresh_token"}).encode()
    with urllib.request.urlopen("https://oauth2.googleapis.com/token", data) as r:
        return json.load(r)["access_token"]


TOK = token()


def call(method, path, params=None, body=None, cost=1):
    global quota
    quota += cost
    url = f"{API}/{path}?" + urllib.parse.urlencode(params or {})
    req = urllib.request.Request(url, method=method, headers={"Authorization": f"Bearer {TOK}", "Content-Type": "application/json"},
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else {}
    except urllib.error.HTTPError as e:
        print(f"  ! HTTP {e.code} {method} {path}: {e.read().decode()[:400]}")
        return None


def paged(path, params, cost=1):
    out, tok = [], None
    while True:
        p = dict(params, maxResults=50)
        if tok:
            p["pageToken"] = tok
        r = call("GET", path, p, cost=cost) or {}
        out += r.get("items", [])
        tok = r.get("nextPageToken")
        if not tok:
            return out


def norm(t):
    t = t.lower().replace("â", "a").replace("–", "-").replace("—", "-")
    return re.sub(r"[^a-z0-9çğıöşü]+", " ", t).strip()


TR_CHARS = re.compile(r"[çğıöşüâÇĞİÖŞÜ]")


def guess(title):
    """Listede olmayan videolar için başlık kuralı."""
    head = title.split("|")[0]
    lang = "tr" if TR_CHARS.search(head) or re.search(r"\b(Eğitim|yapay|nasıl)\b", head, re.I) else "en"
    t = title.lower()
    lists = ["AI SaaSavran – Türkçe İçerikler" if lang == "tr" else "AI SaaSavran – English Content"]
    if "eğitim" in t and lang == "tr":
        lists.append("AI SaaSavran | Kullanım ve Eğitim Rehberi")
    elif "tutorial" in t and lang == "en":
        lists.append("AI SaaSavran | Tutorials & User Guide")
    elif "kasım fırsatları" in t:
        lists.append("Kasım Fırsatları")
    elif "black friday ai picks" in t:
        lists.append("Black Friday AI Picks")
    return {"lang": lang, "lists": lists, "guessed": True}


def channel_settings():
    """Kanal açıklaması (iki dilli) ve banner. Açıklama farklıysa güncellenir; banner yalnız banner_apply true iken yüklenir."""
    c = CFG.get("channel") or {}
    if not c:
        return
    r = call("GET", "channels", {"part": "brandingSettings", "mine": "true"})
    if not r or not r.get("items"):
        return
    item = r["items"][0]
    bs = item.get("brandingSettings", {})
    changed = False
    desc = c.get("description")
    if desc and bs.get("channel", {}).get("description") != desc:
        bs.setdefault("channel", {})["description"] = desc
        changed = True
        print("· kanal açıklaması güncellenecek")
    if c.get("banner_apply") and c.get("banner"):
        path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), c["banner"])
        print("· banner yükleniyor:", c["banner"])
        if not DRY:
            global quota
            quota += 50
            req = urllib.request.Request("https://www.googleapis.com/upload/youtube/v3/channelBanners/insert?uploadType=media",
                                         method="POST", data=open(path, "rb").read(),
                                         headers={"Authorization": f"Bearer {TOK}", "Content-Type": "image/jpeg"})
            try:
                with urllib.request.urlopen(req) as resp:
                    url = json.load(resp).get("url")
                if url:
                    bs.setdefault("image", {})["bannerExternalUrl"] = url
                    changed = True
            except urllib.error.HTTPError as e:
                print(f"  ! banner HTTP {e.code}: {e.read().decode()[:400]}")
    if changed and not DRY:
        body = {"id": item["id"], "brandingSettings": {k: v for k, v in bs.items() if k in ("channel", "image")}}
        if call("PUT", "channels", {"part": "brandingSettings"}, body, cost=50) is not None:
            print("· kanal ayarları kaydedildi ✓")


def set_thumbnails():
    """thumbnails: {videoId: kapak dosya adı (videolar dalı kapak/)} — her biri bir kez yüklenir, sonra listeden çıkarılır."""
    global quota
    base = "https://raw.githubusercontent.com/ramazannsavrann-jpg/ai-saasavran/videolar/kapak/"
    for vid, name in (CFG.get("thumbnails") or {}).items():
        if quota > 9000:
            print("! kota sınırı, kapaklar yarına"); return
        print("· kapak:", vid, name)
        if DRY:
            continue
        try:
            img = urllib.request.urlopen(base + name).read()
            quota += 50
            req = urllib.request.Request(f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}&uploadType=media",
                                         method="POST", data=img, headers={"Authorization": f"Bearer {TOK}", "Content-Type": "image/jpeg"})
            urllib.request.urlopen(req).read()
            print("  ✓")
        except urllib.error.HTTPError as e:
            print(f"  ! HTTP {e.code}: {e.read().decode()[:300]}")


def main():
    if not call("GET", "channels", {"part": "id", "mine": "true"}):
        print("YouTube API erişilemedi (kota dolu olabilir); hiçbir şey yapılmadı.")
        return
    channel_settings()
    set_thumbnails()
    ch = call("GET", "channels", {"part": "contentDetails,snippet", "mine": "true"})["items"][0]
    print("Kanal:", ch["snippet"]["title"])
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]

    pls = {norm(p["snippet"]["title"]): p["id"] for p in paged("playlists", {"part": "snippet", "mine": "true"})}
    for name, lang in CFG.get("create_playlists", {}).items():
        if pls and norm(name) not in pls:  # liste okunamadıysa (pls boş) asla yeni liste açma: çift liste olmasın
            print("+ liste oluştur:", name)
            if not DRY:
                r = call("POST", "playlists", {"part": "snippet,status"},
                         {"snippet": {"title": name, "defaultLanguage": lang}, "status": {"privacyStatus": "public"}}, cost=50)
                if r:
                    pls[norm(name)] = r["id"]
    members = {}
    for name, pid in pls.items():
        members[pid] = {i["contentDetails"]["videoId"] for i in paged("playlistItems", {"part": "contentDetails", "playlistId": pid})}

    for vid in CFG.get("delete", []):
        print("- sil (eski sürüm):", vid)
        if not DRY:
            call("DELETE", "videos", {"id": vid}, cost=50)
    vids = [i["contentDetails"]["videoId"] for i in paged("playlistItems", {"part": "contentDetails", "playlistId": uploads})]
    print(f"{len(vids)} video, {len(pls)} liste:", sorted(pls))
    rep = []
    for k in range(0, len(vids), 50):
        r = call("GET", "videos", {"part": "snippet,status,paidProductPlacementDetails", "id": ",".join(vids[k:k + 50])}) or {}
        for v in r.get("items", []):
            vid, sn, st = v["id"], v["snippet"], v["status"]
            rule = CFG["videos"].get(vid) or guess(sn["title"])
            lang = rule["lang"]
            if lang == "en":
                lang = "en-US"  # İngilizce içerik ABD hedefli (15 Kasım kararı)
            is_tut = bool(re.search(r"\b(eğitim|tutorial)\b", sn["title"], re.I))
            line = f"{vid} [{lang}{'?' if rule.get('guessed') else ''}] {st['privacyStatus']} {sn['title'] if is_tut else sn['title'][:60]}"
            # 0) eğitim videoları seri bitene kadar gizli kalır (kullanıcı kuralı, 15 Kasım)
            if is_tut and CFG.get("tutorials_private") and st["privacyStatus"] != "private" and not DRY:
                s0 = {"privacyStatus": "private", "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                      "embeddable": st.get("embeddable", True), "license": st.get("license", "youtube"),
                      "publicStatsViewable": st.get("publicStatsViewable", True), "containsSyntheticMedia": True}
                if call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s0}, cost=50) is not None:
                    line += " · →gizli✓"
            if is_tut:
                line += " · listeler: " + ", ".join(n for n, pid in pls.items() if vid in members.get(pid, set()))
            # 1) dil (snippet)
            if sn.get("defaultLanguage") != lang or sn.get("defaultAudioLanguage") != lang:
                body = {"id": vid, "snippet": {"title": sn["title"], "description": sn.get("description", ""),
                        "tags": sn.get("tags", []), "categoryId": sn["categoryId"],
                        "defaultLanguage": lang, "defaultAudioLanguage": lang}}
                if not DRY and call("PUT", "videos", {"part": "snippet"}, body, cost=50) is not None:
                    line += " · dil✓"
            # 2) yapay içerik + ücretli tanıtım yok (status)
            # YouTube bu alanı okumada geri döndürmüyor: sadece son 3 günde yüklenenlere (ve force listesine) uygula
            fresh = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")) > datetime.now(timezone.utc) - timedelta(days=3)
            if (fresh or vid in CFG.get("force", [])) and not st.get("containsSyntheticMedia"):
                s = {"privacyStatus": st["privacyStatus"], "containsSyntheticMedia": True,
                     "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                     "embeddable": st.get("embeddable", True), "license": st.get("license", "youtube"),
                     "publicStatsViewable": st.get("publicStatsViewable", True)}
                if st.get("publishAt"):
                    s["publishAt"] = st["publishAt"]
                if not DRY and call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s}, cost=50) is not None:
                    line += " · yapay✓"
            if (v.get("paidProductPlacementDetails") or {}).get("hasPaidProductPlacement"):
                line += " · DİKKAT ücretli tanıtım işaretli"
            # 3) oynatma listeleri
            for name in rule["lists"]:
                pid = pls.get(norm(name))
                if not pid:
                    line += f" · liste yok:{name}"
                    continue
                if vid not in members[pid]:
                    if not DRY and call("POST", "playlistItems", {"part": "snippet"},
                                        {"snippet": {"playlistId": pid, "resourceId": {"kind": "youtube#video", "videoId": vid}}},
                                        cost=50) is not None:
                        members[pid].add(vid)
                        line += f" · +{name[:22]}"
            rep.append(line)
            print(line)
            if quota > 9000:
                print("Kota sınırına yaklaşıldı, kalanlar yarın.")
                return
    print(f"Bitti. Kullanılan kota ≈ {quota}")


if __name__ == "__main__":
    main()
