"""YouTube kanal ayarları: dil, yapay içerik işareti, ücretli tanıtım yok, oynatma listeleri.

Anahtarlar yalnızca ortam değişkenlerinden (GitHub Secrets) okunur:
YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
Kota: videos.update ve playlistItems.insert 50'şer birim (günlük 10.000).
Her şey idempotent: zaten doğru olan video/liste tekrar güncellenmez.
"""
import json, os, re, sys, urllib.parse, urllib.request, urllib.error

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


def main():
    ch = call("GET", "channels", {"part": "contentDetails,snippet", "mine": "true"})["items"][0]
    print("Kanal:", ch["snippet"]["title"])
    uploads = ch["contentDetails"]["relatedPlaylists"]["uploads"]

    pls = {norm(p["snippet"]["title"]): p["id"] for p in paged("playlists", {"part": "snippet", "mine": "true"})}
    for name, lang in CFG.get("create_playlists", {}).items():
        if norm(name) not in pls:
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
            line = f"{vid} [{lang}{'?' if rule.get('guessed') else ''}] {sn['title'][:60]}"
            # 1) dil (snippet)
            if sn.get("defaultLanguage") != lang or sn.get("defaultAudioLanguage") != lang:
                body = {"id": vid, "snippet": {"title": sn["title"], "description": sn.get("description", ""),
                        "tags": sn.get("tags", []), "categoryId": sn["categoryId"],
                        "defaultLanguage": lang, "defaultAudioLanguage": lang}}
                if not DRY and call("PUT", "videos", {"part": "snippet"}, body, cost=50) is not None:
                    line += " · dil✓"
            # 2) yapay içerik + ücretli tanıtım yok (status)
            if not st.get("containsSyntheticMedia"):
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
