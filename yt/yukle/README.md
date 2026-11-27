# YouTube yükleme işleri

Her video için bir iş dosyası: `yt/yukle/<ad>-<dil>.json`. Dosya `main`'e eklenince `youtube-yukle` işi
videoyu ilgili kanala yükler, kapağı koyar, listelere ekler ve `yayin` saatine zamanlar.
Elle: Actions → youtube-yukle → Run workflow → `is` = dosya yolu.

Örnek:
```json
{"kanal": "en", "video": "shorts/gozluk-en.mp4", "kapak": "kapak/gozluk-en.jpg",
 "baslik": "...", "aciklama": "...", "etiketler": ["..."], "kategori": 28, "dil": "en",
 "yayin": "2026-11-23T02:00:00+03:00", "listeler": ["PL..."]}
```
Kurallar: `video/README.md` (seslendirme dalı). Yayın saati prime'dan 1 saat önce (TR Shorts 18:00, EN 02:00 TSİ).
EN kanalı için bir kerelik izin: Actions → youtube-yetki (anahtar Supabase `yt_channel_tokens` tablosunda, log'a yazılmaz).
