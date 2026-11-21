"""YouTube'a tek komutla yükleme (TR ve EN kanalı).

Kullanım: python3 yt/yt_yukle.py yt/yukle/<ad>.json
İş dosyası (json):
  kanal       "tr" (AI SaaSavran) | "en" (AI SaaSavran EN)
  video       videolar dalındaki mp4 yolu (ör. shorts/serum-tr.mp4)
  kapak       videolar dalındaki jpg yolu (ör. kapak/serum-tr.jpg) — her yüklemede ZORUNLU
  baslik, aciklama, etiketler[], kategori (28), dil ("tr"|"en")
  yayin       ISO tarih (+03:00 ile), ör. 2026-11-23T02:00:00+03:00 — gelecekte olmalı
  listeler    oynatma listesi kimlikleri
Kurallar (video/README.md): çocuklara özel değil, ücretli tanıtım yok, yapay içerik Evet,
kapak s1 karesi, yayın saati prime'dan 1 saat önce, kanal dili dışında metin yok.
Anahtarlar: TR -> YT_REFRESH_TOKEN (secret). EN -> Supabase yt_channel_tokens (youtube-yetki işi yazar).
"""
import json, os, sys, urllib.parse, urllib.request, urllib.error
from datetime import datetime, timezone

RAW = "https://raw.githubusercontent.com/ramazannsavrann-jpg/ai-saasavran/videolar/"
KANAL = {"tr": "UCHL4sdkEenxkpuP4_Hq1RZw", "en": "UCJ3mA2nPzsinfO9MgccFtdA"}
API = "https://www.googleapis.com/youtube/v3"


def refresh_token(kanal):
    if kanal == "tr":
        return os.environ["YT_REFRESH_TOKEN"]
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/yt_channel_tokens?select=refresh_token&channel=eq." + kanal
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
    rows = json.load(urllib.request.urlopen(req))
    if not rows:
        sys.exit(f"HATA: '{kanal}' kanalı için izin yok. Önce youtube-yetki işini çalıştırın.")
    return rows[0]["refresh_token"]


def access_token(kanal):
    data = urllib.parse.urlencode({
        "client_id": os.environ["YT_CLIENT_ID"], "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": refresh_token(kanal), "grant_type": "refresh_token"}).encode()
    return json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data))["access_token"]


def istek(tok, method, url, body=None, ctype="application/json", raw=None, zorunlu=True):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, method=method, data=data,
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": ctype})
    try:
        r = urllib.request.urlopen(req, timeout=600)
        txt = r.read().decode()
        return r, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        msg = f"HATA {e.code} {method} {url.split('?')[0]}: {e.read().decode()[:500]}"
        if zorunlu: sys.exit(msg)
        print("UYARI (zorunlu değil) " + msg); return None, {}


def indir(yol):
    with urllib.request.urlopen(RAW + yol, timeout=300) as r:
        return r.read()


def kapak_koy(tok, vid, kapak):
    r, _ = istek(tok, "POST", f"https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={vid}&uploadType=media",
                 raw=kapak, ctype="image/jpeg", zorunlu=False)
    if r is None:
        sys.exit(f"KAPAK KONAMADI {vid}: iş dosyasına \"video_id\": \"{vid}\" ekleyip kota açılınca (11:00 TSİ) yeniden çalıştırın ya da Studio'dan koyun.")
    print("kapak yüklendi")


def main(is_dosyasi):
    j = json.load(open(is_dosyasi, encoding="utf-8"))
    kanal = j["kanal"]
    for k in ("video", "kapak", "baslik", "aciklama", "dil", "yayin"):
        if not j.get(k):
            sys.exit(f"HATA: iş dosyasında '{k}' yok")
    if len(j["baslik"]) > 100:
        sys.exit("HATA: başlık 100 karakteri aşıyor")
    yayin = datetime.fromisoformat(j["yayin"])
    if yayin <= datetime.now(timezone.utc) and not j.get("video_id"):
        sys.exit(f"HATA: yayın zamanı geçmişte: {j['yayin']}")
    tok = access_token(kanal)
    if j.get("video_id"):  # yalnız kapak (ör. kota dolup kapak konamadıysa ertesi gün)
        kapak_koy(tok, j["video_id"], indir(j["kapak"])); return

    # Doğru kanal mı? (yanlış kanala yükleme olmasın)
    _, ch = istek(tok, "GET", f"{API}/channels?part=id&mine=true")
    cid = (ch.get("items") or [{}])[0].get("id")
    if cid != KANAL[kanal]:
        sys.exit(f"HATA: anahtar {cid} kanalına ait, beklenen {KANAL[kanal]} ({kanal}). Yükleme yapılmadı.")

    video = indir(j["video"])
    kapak = indir(j["kapak"])
    print(f"video {len(video)//1024} KB, kapak {len(kapak)//1024} KB")

    meta = {
        "snippet": {"title": j["baslik"], "description": j["aciklama"], "tags": j.get("etiketler", []),
                    "categoryId": str(j.get("kategori", 28)), "defaultLanguage": j["dil"],
                    "defaultAudioLanguage": j["dil"]},
        "status": {"privacyStatus": "private", "publishAt": yayin.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                   "selfDeclaredMadeForKids": False, "containsSyntheticMedia": True},
    }
    r, _ = istek(tok, "POST", "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                 meta, ctype="application/json; charset=UTF-8")
    yer = r.headers["Location"]
    _, v = istek(tok, "PUT", yer, raw=video, ctype="video/mp4")
    vid = v["id"]
    print(f"YÜKLENDİ {vid} ({kanal}) yayın {j['yayin']}")

    # Kapak önce (21 Kasım: kota ücretli tanıtım adımında dolunca kapak hiç konmadı)
    kapak_koy(tok, vid, kapak)
    # Ücretli tanıtım yok (varsayılan zaten "yok"; kota dolarsa yükleme bozulmasın)
    istek(tok, "PUT", f"{API}/videos?part=paidProductPlacementDetails",
          {"id": vid, "paidProductPlacementDetails": {"hasPaidProductPlacement": False}}, zorunlu=False)
    for pl in j.get("listeler", []):
        istek(tok, "POST", f"{API}/playlistItems?part=snippet",
              {"snippet": {"playlistId": pl, "resourceId": {"kind": "youtube#video", "videoId": vid}}}, zorunlu=False)
        print(f"listeye eklendi {pl}")
    print(f"TAMAM https://youtube.com/shorts/{vid}")


if __name__ == "__main__":
    main(sys.argv[1])
