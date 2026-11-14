# AI SaaSavran video düzeni (kalıcı)

Bu dal (`seslendirme`) videoların tek kaynağıdır. Yeni oturumda buradan devam edilir; sesler ve şablonlar her seferinde baştan aranmaz.

## Ses
- **Türkçe ve İngilizce (13 Kasım kararı):** Gemini TTS, ücretsiz AI Studio anahtarı (GEMINI_API_KEY, faturalandırma kapalı). Seçilen sesler: **Kore** (kadın, eğitim videoları) ve **Charon** (erkek, veri Shorts). Kullanılacak ses `video/ses-tr.txt` içinde. Çıktı `ses-tr.pcm` (24 kHz, 16 bit, mono) → `ffmpeg -f s16le -ar 24000 -ac 1 -i ses-tr.pcm`. Gemini olmazsa OpenAI ash'e düşer. Ücretsiz katmanda günlük istek sınırı var.
- **Yayın düzeni:** veri analizli Shorts günde 1; fazlası ileri tarihe planlanır (günde en fazla 1–2). Eğitim serisi ayrıca (plan: ücretsiz kontrol, hesap+marka+soru, rakipler, ilk ölçüm, rapor okuma, kayıp nedeni, kaynaklar, öneriler, ürünler, paylaşım/otomatik ölçüm).
- Motor: OpenAI TTS (`gpt-4o-mini-tts`), ses **ash**. Bu dala `video/narration-<dil>.txt` push edilince `.github/workflows/seslendirme.yml` mp3 üretir (artifact `seslendirme`).
- ElevenLabs (ses "Aras", PfUjY8BsgGYwLKokwLKi) ücretsiz katmanı hesapta kapalı ("unusual activity"); kullanılmıyor.
- Hız: indirildikten sonra Türkçe `atempo=1.24` (kullanıcı 13 Kasım: %24), İngilizce `atempo=1.2`. Video ≤ 58 sn olacak şekilde gerekirse 1.4'e kadar.
- Okunuş: metinde **"Ey Ay Saa, Savran"** yazılır (virgül, "Savran"ı yavaşlatır). İngilizcede "A I Saa Savran".
- Müzik: `sablon/music.py` (telifsiz, sentez). Ses altında sidechain ile kısılır (bkz. aşağıdaki ffmpeg).

## Görüntü
- 1080x1920, 30 fps, sahne başına ayrı mp4, concat + `-c:v copy` ile ses.
- İlk sahne kapak tasarımında: ChatGPT · Claude · Gemini etiketleri, büyük soru, sarı rozet (t.badge, ör. "Aynı mı söylüyorlar?"). İlk kare boş değil (fade-in yok); en altta ölçülen gerçek adlar ve tarih/örneklem notu; sonda aisaasavran.com.
- Etiketler ve açıklama hashtagleri: ölçülen marka/kanal adları.
- Eğitim videoları: `sablon/egitim.py <ayar.json>` (adım etiketi + açıklama + gerçek site ekranı kartı); ekranlar Playwright + Chrome ile 390x844, ölçek 2,77 (1080 genişlik), JPEG 92 (`egitim/ekran-cek-*.py`). Ses Kore, atempo 1.08.
- Şablon: `sablon/make.py <ayar.json>` (v2, 8 sahne: marka, motorlar, soru bazında kayıp, ürün, doğruluk+Shopping, kaynaklar, CTA; örnek ayarlar telefon videoları). `make.py <ayar> frames` önizleme, `make.py <ayar> s3 s4` yalnız o sahneler.
- Gerçek marka adları her sahnenin altında ("names" alanı).

## İçerik kuralları
- Sonuçlarda markalar **harfli**: Marka A/B/C…, ürünler Model 1/2…. Harfler rastgele atanır (alfabetik değil).
- Ölçülen markaların gerçek adları videonun altında **alfabetik liste** olarak yazılır; hangi harfin hangi marka olduğu verilmez.
- Her videoda: "Bunlar yapay zekânın cevaplarıdır" (kullanıcı: "bizim görüşümüz değildir" denmesin), tarih, örneklem, "tüm pazarı temsil etmez".
- Global video İngilizce, Türkiye videosu Türkçe; YouTube başlık/açıklama/etiketler iki dilli. Başlık ≤ 100 karakter.
- Kulaklık videosu formatı esas: marka oranı, motor karşılaştırması, soru bazında kayıp, rakip ürün, ürün doğruluğu, Google Shopping sırası, kaynaklar.

## Ses + müzik karışımı
```
ffmpeg -i v.mp4 -i voice.wav -i music.wav -filter_complex "[1:a]aresample=44100,volume=1.6,apad=whole_dur=$D,asplit=2[vo][sc];[2:a]volume=0.35,atrim=0:$D,afade=t=out:st=$(($D-1.5)):d=1.5[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k out.mp4
```

## Yükleme
- Dosya `videolar` dalına konur, raw.githubusercontent.com linki `vidiq_video_upload`'a verilir; YouTube kanalı @aisaasavran (UCHL4sdkEenxkpuP4_Hq1RZw).

## Eğitim videoları kuralı (13 Kasım)
- **14 Kasım kararı: eğitim videoları YouTube'a GİZLİ (private) yüklenir**, herkese açık yapılmaz (kullanıcı isteği). Veri Shorts herkese açık devam eder.
- Kendi markamız gösterilmez. Gerçek arayüz + uydurma ÖRNEK veri (Marka A/B…, Ürün 1/2…), ekranda "Örnek veri / Sample data" etiketi. Ekran çekerken API cevapları Playwright ile örnek veriyle değiştirilir; gerçek ölçüm yapılmaz.
- Anlatımda eskiyecek bilgi yok: fiyat, kota sayısı, tarih, motor sürümü söylenmez; "yapay zekâ" denir. Böylece videolar ileride güncelleme gerektirmez.

## Kasım Fırsatları / Black Friday AI Picks serisi (14 Kasım)
- TR adı "Kasım Fırsatları" (TR içerikte Black Friday denmez), EN adı "Black Friday AI Picks". Sıra: robot süpürge (yayında), kahve makinesi, spor ayakkabı, parfüm, gaming laptop, televizyon.
- Her kategori: TR (sahip marka country=TR) + global (US) ayrı ölçüm; 8 soru, marka adı geçmez; ChatGPT+Claude canlı arama, Gemini aramasız. Sıralamada harfler rastgele, gerçek isimler altta alfabetik. Fiyat/indirim sadece güncel kaynakla doğrulanırsa.
- Robot süpürge ayarları: `video/kasim/robot-tr.json`, `robot-en.json`; metin `narration-robot-*.txt`. Sahne kesimleri silencedetect ile gerçek duraklardan.
- Durum (14 Kasım): robot süpürge TR+EN (14 Kasım 18:00), kahve makinesi TR+EN (15 Kasım 18:00), spor ayakkabı yalnız TR (16 Kasım 19:00) yayın planında. OpenAI bakiyesi bitti → global spor ayakkabı ölçümünde ChatGPT eksik (run 1e75387f: Claude 16, ChatGPT 1). Kullanıcı kararı: seri bakiye gelene kadar DURDU. Devamında: US ayakkabı için yalnız ChatGPT'yi yeniden ölç, sonra parfüm, gaming laptop, TV.
- Yeni yayın saatleri: TR 19:00 (16:00Z), EN 23:00 (20:00Z). Kapak: s1 karesi JPEG → vidiq_upload_image → taslakta thumbnailImageId (doğrulama bitene kadar YouTube reddeder, video yine yüklenir).

## Sağlık serisi (14 Kasım): özel hastane + saç ekimi
- Ölçüm: Growth Lab 2, Acıbadem (hastane) ve Asmed (saç) ana marka, TR + US, 8 soru, 7 marka. Ayarlar `video/saglik/*.json` (`_map` alanı = harf↔marka eşlemesi, yayına girmez), `gen.py`.
- Sahne süreleri: `sablon/sureler2.py` ("order" düzenli veri Shorts için). Sağlıkta "tıbbi tavsiye değildir" notu ve hastane kaynaklarında hastanelerin kendi siteleri hariç.
- Yayın (14 Kasım ~19:40): YouTube hastane TR pPq8JNj07DQ, EN CWF4g0gvaXA; saç TR k6xkaHFZARY, EN dFep9TRYwPU; Instagram Reels dördü de.
- Dikkat: başka oturum işçiyi `live_engines=claude` ile çalıştırırsa sıradaki ölçümler yalnız Claude ile yapılır; eksik motor için ayrı run + `live_engines=openai`.

## Bağımsızlık notu (14 Kasım, kullanıcı onayı)
Tüm veri/ölçüm videolarının açıklamasına (CTA'dan önce) şu satır eklenir:
- TR: "Bu video bağımsız bir ölçümdür. Hiçbir markayla reklam veya iş birliğimiz yoktur."
- EN: "Independent measurement. We have no sponsorship or partnership with any brand shown."
YouTube "ücretli tanıtım" kutusu kapalı kalır. Daha önce yüklenen videolara vidIQ kredisi yenilenince (10 Aralık) eklenecek.

## Uzun video serisi planı (14 Kasım)
Yatay 16:9, 6–8 dk, TR + EN ayrı. Veri tek videoda harcanmaz; her video bir soruya odaklanır:
1. Motor farkları (robot süpürge, kahve, parfüm)  2. Yapay zekâ hangi sitelere bakıyor (kaynaklar)
3. Dev markalar neden görünmüyor  4. Soruyu değiştir, kazanan değişsin (niyet)  5. Türkiye vs dünya
Derslerde marka gerçek adıyla anılabilir; tam sıralama tablolarında harf kuralı sürer. Haftada 1 uzun video.
- Durum güncellemesi (14 Kasım akşam): Kasım Fırsatları / Black Friday AI Picks 6 kategori TR+EN TAMAM ve planlandı: 14 robot süpürge, 15 kahve (18:00), 16 spor ayakkabı, 17 parfüm, 18 gaming laptop, 19 TV (TR 19:00, EN 23:00). Parfüm/laptop/TV ölçümleri Growth Lab 2 (fd1b32d1) içinde. Ayarlar video/kasim/*.json.

## INSTAGRAM KURALI (14 Kasım, tüm sohbetler için)
- Izgarada her satır = 2 video (Reels) + 1 ayrı gönderi. Paylaşım hep 3'lü set: önce TR Reels, sonra EN Reels, sonra ayrı gönderi (görsel/karusel). Set yarım bırakılmaz, aynı anda toplu paylaşılmaz (sıra karışır), her biri bir öncekinin yayınlandığı doğrulanınca atılır.
- Üstte 3 sabitlenmiş gönderi var; onlar ayrı satır, sayılmaz.
