"""Bir kanal için YouTube izni (tek seferlik).

1) KOD boş: izin bağlantısını yazar (log'da base64; GitHub sırları maskelediği için).
2) KOD dolu: kodu anahtara çevirir, kanalı doğrular, anahtarı Supabase yt_channel_tokens'a yazar.
Anahtar hiçbir zaman log'a yazılmaz.
"""
import base64, json, os, sys, urllib.parse, urllib.request, urllib.error

KANAL = {"tr": "UCHL4sdkEenxkpuP4_Hq1RZw", "en": "UCJ3mA2nPzsinfO9MgccFtdA"}
REDIRECT = "https://developers.google.com/oauthplayground"
SCOPES = "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload"

kanal = os.environ.get("KANAL", "en")
kod = (os.environ.get("KOD") or "").strip()
cid = os.environ["YT_CLIENT_ID"]

if not kod:
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid, "redirect_uri": REDIRECT, "response_type": "code", "scope": SCOPES,
        "access_type": "offline", "prompt": "consent select_account"})
    print("IZIN_URL_B64=" + base64.b64encode(url.encode()).decode())
    sys.exit(0)

data = urllib.parse.urlencode({"code": kod, "client_id": cid, "client_secret": os.environ["YT_CLIENT_SECRET"],
                               "redirect_uri": REDIRECT, "grant_type": "authorization_code"}).encode()
try:
    t = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data))
except urllib.error.HTTPError as e:
    sys.exit(f"HATA kod çevrilemedi: {e.read().decode()[:300]}")
if "refresh_token" not in t:
    sys.exit("HATA: refresh_token gelmedi (izin ekranında 'İzin ver' seçilmemiş olabilir)")

req = urllib.request.Request("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
                             headers={"Authorization": f"Bearer {t['access_token']}"})
items = json.load(urllib.request.urlopen(req)).get("items") or [{}]
got = items[0].get("id")
if got != KANAL[kanal]:
    sys.exit(f"HATA: izin {got} ({items[0].get('snippet', {}).get('title')}) kanalı için verildi; beklenen {KANAL[kanal]}. "
             "İzin ekranında doğru kanalı seçip tekrar deneyin. Kaydedilmedi.")

key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
req = urllib.request.Request(os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/yt_channel_tokens", method="POST",
                             data=json.dumps({"channel": kanal, "refresh_token": t["refresh_token"]}).encode(),
                             headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                      "Prefer": "resolution=merge-duplicates"})
urllib.request.urlopen(req)
print(f"TAMAM: {kanal} kanalı ({got}, {items[0]['snippet']['title']}) için izin kaydedildi.")
