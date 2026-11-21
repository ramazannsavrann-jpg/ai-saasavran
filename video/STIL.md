# TEK KALEM — Shorts stil ve üretim düzeni (21 Kasım)

Amaç: her Short'un kapağı, sesi, müziği, hızı ve yayın saati aynı olsun; hiçbir adım bir aracın günlük limitine bağlı kalmasın.
Bütün sabitler **`video/stil.json`** içindedir. Bir şey değişecekse yalnız o dosya değişir; elle sayı yazılmaz.

## Sabitler (stil.json)
| Konu | Değer |
|---|---|
| Ses | Gemini TTS, model `gemini-2.5-flash-preview-tts`, ses **Charon** (TR ve EN) |
| Hız | TR `atempo 1.24`, EN `1.2` |
| Müzik | `video/music.wav` (telifsiz, `sablon/music.py`), seviye 0.35, sesin altında sidechain, son 1,5 sn fade |
| Görüntü | 1080×1920, 30 fps, en fazla 58 sn, güvenli alan kontrolü (`make.py frames`) |
| Kapak | her zaman ilk sahnenin (`p1`) son karesi, JPEG; YouTube'un otomatik karesi kullanılmaz |
| Yayın | TR kanal 18:00 TSİ, EN kanal 02:00 TSİ (ABD 18:00 ET, kış; yazın 01:00) |
| Yükleme | YouTube API (`yt/yt_yukle.py`, main); vidIQ/Studio yalnız yedek |

## Akış (tek komut)
1. Ölçüm → `video/<konu>/<konu>-<dil>.json` (sahne verisi + `"yt": {"baslik","aciklama","etiketler","listeler"}`) ve `video/narration-<konu>-<dil>.txt`.
2. `video/uret.sh hazirla <konu> <dil>` → ses ve model dosyalarını stil.json'dan yazar, anlatımda site adı varsa durdurur. Sonra `seslendirme` dalına push → seslendirme işi sesi üretir ve `video/ses-out/`a kaydeder.
3. `video/uret.sh yap <konu> <dil> <YYYY-MM-DD>` → sesi alır; sesin stil.json'daki model+ses ile üretildiğini ve site adı kontrolünü doğrular; süreleri böler (ayarda `"dur_sabit": true` ise elle düzeltilmiş süreler korunur); güvenli alanı kontrol eder; videoyu, müziği ve kapağı üretir; süre/boyut kontrolü yapar; `cikti/yukle/<ad>.json` yükleme işini yazar (başlık/açıklama eksikse söyler).
4. Kapağa göz ile bakılır. Sahip onayıyla: mp4 → `videolar:shorts/`, jpg → `videolar:kapak/`, iş dosyası → `main:yt/yukle/` (eklenince yüklenir ve zamanlanır).

## Kurallar (değişmez)
- Kanal başına günde en fazla 1 veri Short'u; toplu yükleme yok.
- Seslendirmede site adı söylenmez; ekranda kalır.
- Sahne süreleri otomatik bölünür ama sonuç izlenerek kontrol edilir; yanlış bölünürse süreler elle düzeltilip `"dur_sabit": true` yazılır.
- Gemini ücretsiz katmanı dolarsa ses başka motora düşürülmez (ses değişmesin); ertesi gün yeniden çalıştırılır.
