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
# ONLY: elle başlatmada virgülle video kimlikleri. Verilirse kapak ve video işlemleri yalnız bu videolara yapılır
# (yayın sonrası hızlı çalışma; kotayı korur). Gece çalışması ve push her zaman tam çalışır (kapak koruması sürer).
ONLY = {x.strip() for x in os.environ.get("ONLY", "").split(",") if x.strip()}
# PUBLISH_NOW: elle başlatmada virgülle video kimlikleri; zamanlanmış yayını beklemeden herkese açılır (eğitim videoları hariç)
PUBLISH_NOW = {x.strip() for x in os.environ.get("PUBLISH_NOW", "").split(",") if x.strip()}
# EXPORT=1: hiçbir şey değiştirmeden tüm videoların kimlik/başlık/açıklama/gizlilik bilgisini JSON olarak loga yazar (19 Kasım).
EXPORT = os.environ.get("EXPORT") == "1"
DRY = DRY or EXPORT  # dışa aktarmada hiçbir şey değiştirilmez
CFG = json.load(open(os.path.join(os.path.dirname(__file__), "ayar.json"), encoding="utf-8"))
quota = 0
tut_status = []  # (video, son gizlilik durumu, başlık): rapor sonunda özetlenir


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
        if ONLY and vid not in ONLY:
            continue
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
    if ONLY:
        vids = [v for v in vids if v in ONLY]
        print("Yalnız şu videolar:", ", ".join(sorted(ONLY)))
    print(f"{len(vids)} video, {len(pls)} liste:", sorted(pls))
    if EXPORT:
        out = []
        for k in range(0, len(vids), 50):
            r = call("GET", "videos", {"part": "snippet,status", "id": ",".join(vids[k:k + 50])}) or {}
            out += [{"id": v["id"], "title": v["snippet"]["title"], "privacy": v["status"]["privacyStatus"],
                     "published": v["snippet"]["publishedAt"], "description": v["snippet"].get("description", "")} for v in r.get("items", [])]
        print("EXPORT-BASLA")
        for o in out:
            print("EXP " + json.dumps(o, ensure_ascii=False))  # video başına bir satır: tek uzun satır GitHub günlüğünde kesiliyor
        print("EXPORT-BITTI")
        print(f"Kota (tahmini): {quota}")
        return
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
            # priv = bu çalışmadan sonraki gerçek durum. Sonraki adımlar eski st["privacyStatus"]'u değil bunu yazar;
            # aksi halde 2. adım gizliye alınan videoyu yeniden herkese açıyordu (17 Kasım hatası).
            priv = st["privacyStatus"]
            keep_private = is_tut and bool(CFG.get("tutorials_private"))
            # Zamanlanmış yayın (publishAt) da kaldırılır: yoksa gizli eğitim videosu o saatte kendiliğinden açılır.
            if keep_private and (priv != "private" or st.get("publishAt")) and not DRY:
                s0 = {"privacyStatus": "private", "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                      "embeddable": st.get("embeddable", True), "license": st.get("license", "youtube"),
                      "publicStatsViewable": st.get("publicStatsViewable", True), "containsSyntheticMedia": True}
                if call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s0}, cost=50) is not None:
                    priv = "private"
                    line += " · →gizli✓"
            # 0b) seri tamamlanınca eğitim videoları herkese açılır (kullanıcı kararı, 19 Kasım): tutorials_public
            if is_tut and not keep_private and CFG.get("tutorials_public") and priv != "public" and not DRY:
                s0 = {"privacyStatus": "public", "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                      "embeddable": True, "license": st.get("license", "youtube"),
                      "publicStatsViewable": st.get("publicStatsViewable", True), "containsSyntheticMedia": True}
                if call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s0}, cost=50) is not None:
                    priv = "public"
                    line += " · →herkese açık✓"
            # 0b) "hemen yayınla" (19 Kasım): PUBLISH_NOW içindeki videolar zamanlanmış yayını beklemeden herkese açılır.
            now_pub = vid in PUBLISH_NOW and not keep_private
            if now_pub and (priv != "public" or st.get("publishAt")) and not DRY:
                s1 = {"privacyStatus": "public", "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                      "embeddable": st.get("embeddable", True), "license": st.get("license", "youtube"),
                      "publicStatsViewable": st.get("publicStatsViewable", True), "containsSyntheticMedia": True}
                if call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s1}, cost=50) is not None:
                    priv = "public"; st = dict(st, publishAt=None, containsSyntheticMedia=True)
                    line += " · →herkese açık✓"
            if is_tut:
                line += " · listeler: " + ", ".join(n for n, pid in pls.items() if vid in members.get(pid, set()))
            # 1) dil + açıklama (snippet). ayar.json "descriptions": {video: metin} varsa açıklama ona çevrilir (19 Kasım: anahtar kelimeli açıklamalar)
            new_desc = CFG.get("descriptions", {}).get(vid, sn.get("description", ""))
            if sn.get("defaultLanguage") != lang or sn.get("defaultAudioLanguage") != lang or new_desc != sn.get("description", ""):
                body = {"id": vid, "snippet": {"title": sn["title"], "description": new_desc,
                        "tags": sn.get("tags", []), "categoryId": sn["categoryId"],
                        "defaultLanguage": lang, "defaultAudioLanguage": lang}}
                if not DRY and call("PUT", "videos", {"part": "snippet"}, body, cost=50) is not None:
                    line += " · dil✓" + (" · açıklama✓" if new_desc != sn.get("description", "") else "")
            # 2) yapay içerik + ücretli tanıtım yok (status)
            # YouTube bu alanı okumada geri döndürmüyor: sadece son 3 günde yüklenenlere (ve force listesine) uygula
            fresh = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00")) > datetime.now(timezone.utc) - timedelta(days=3)
            if (fresh or vid in CFG.get("force", [])) and not st.get("containsSyntheticMedia"):
                s = {"privacyStatus": "private" if keep_private else priv, "containsSyntheticMedia": True,
                     "selfDeclaredMadeForKids": st.get("selfDeclaredMadeForKids", False),
                     "embeddable": st.get("embeddable", True), "license": st.get("license", "youtube"),
                     "publicStatsViewable": st.get("publicStatsViewable", True)}
                if st.get("publishAt") and not keep_private:
                    s["publishAt"] = st["publishAt"]
                if not DRY and call("PUT", "videos", {"part": "status"}, {"id": vid, "status": s}, cost=50) is not None:
                    line += " · yapay✓"
            # 2b) marka iş birliği / ücretli tanıtım YOK açıkça işaretlenir (19 Kasım, kullanıcı isteği): yeni yüklenenlere
            if (v.get("paidProductPlacementDetails") or {}).get("hasPaidProductPlacement"):
                line += " · DİKKAT ücretli tanıtım işaretli"
            elif (fresh or vid in CFG.get("force", [])) and not DRY:
                if call("PUT", "videos", {"part": "paidProductPlacementDetails"},
                        {"id": vid, "paidProductPlacementDetails": {"hasPaidProductPlacement": False}}, cost=50) is not None:
                    line += " · işbirliği yok✓"
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
            if is_tut:
                line += f" · son durum: {priv}"
                tut_status.append((vid, priv, sn["title"]))
            rep.append(line)
            print(line)
            if quota > 9000:
                print("Kota sınırına yaklaşıldı, kalanlar yarın.")
                print_tutorials()
                return
    print_tutorials()
    print(f"Bitti. Kullanılan kota ≈ {quota}")


def print_tutorials():
    """Eğitim videolarının özeti: gizli olmayan varsa açıkça yazılır."""
    if not tut_status:
        return
    if CFG.get("tutorials_public"):
        not_pub = [t for t in tut_status if t[1] != "public"]
        print(f"EĞİTİM VİDEOLARI: {len(tut_status)} video, herkese açık olmayan {len(not_pub)}")
        for vid, priv, title in not_pub:
            print(f"  ! açık değil: {vid} {priv} {title}")
        return
    open_ = [t for t in tut_status if t[1] != "private"]
    print(f"EĞİTİM VİDEOLARI: {len(tut_status)} video, gizli olmayan {len(open_)}")
    for vid, priv, title in open_:
        print(f"  ! gizli değil: {vid} {priv} {title}")


if __name__ == "__main__":
    main()
