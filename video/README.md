# AI SaaSavran video düzeni (kalıcı)

> **TEK KALEM (21 Kasım):** Shorts üretimi `video/uret.sh` ile tek komuttur; ses/müzik/kapak/yayın saati sabitleri yalnız `video/stil.json`'da. Ayrıntı: `video/STIL.md`.

## UYARILAR SESTE YOK, EKRANDA YAZI (22 Kasım, kullanıcı kuralı — KALICI, tüm videolar)
- "Bunlar yapay zekânın cevaplarıdır", "bağımsız ölçüm/araştırma", "yapay zekâ sorgusu" gibi uyarı ve yöntem cümleleri seslendirmede söylenmez; yalnız ekranda alt yazı/not olarak kalır (kapak sahnesindeki not, kapanıştaki küçük açıklama, YouTube açıklamasındaki bağımsızlık satırı).
- Türkçe okunuş: ChatGPT = "Çet Ci Pi Ti" (Çet Ge Pe Te değil); airfryer = "Eyr Frayır".
- (22 Kasım, kullanıcı kuralı — KALICI) **Önce görsel onayı:** her yeni videoda sahne görselleri (`make.py … frames` kareleri) seslendirme ve video üretiminden ÖNCE kullanıcıya gönderilir; onay gelmeden seslendirme/render yapılmaz.
- (22 Kasım) Ürün içeren veri videolarında **Google Shopping sırası ile yapay zekâ sırası** marka düzeyinde yan yana konur (kategori araması, ör. "airfryer"; GTA videosundaki gibi) ve **kaynak ağı** sahnesi kalır. Fiyat ekranda gösterilmez (kullanıcı istemedikçe).
- Türkçe Kasım içeriğinde seri adı "Kasım Fırsatları" ("indirim", "Black Friday" denmez).

## YÜKLEME: İKİ KANAL DA API İLE (21 Kasım, kullanıcı kararı — KALICI; aşağıdaki "Studio'dan / Chrome ile / vidIQ ile" yükleme satırlarının yerine geçer)
- TR kanalı (@AISaaSavran) ve EN kanalı (@AISaaSavranEN) artık GitHub Actions `youtube-yukle` ile yüklenir (`yt/yt_yukle.py`, ayrıntı main'de `yt/yukle/README.md`). EN izni bir kerelik alındı (`youtube-yetki`, anahtar Supabase `yt_channel_tokens`).
- Akış: mp4 + kapak `videolar` dalına → main'e iş dosyası `yt/yukle/<ad>-<dil>.json` (kanal, video, kapak, baslik, aciklama, etiketler, kategori 28, dil, yayin, listeler) → push → iş çalışır, video kimliği log'da. Sonra PAYLAŞIM KAYDI güncellenir.
- Haftalık uzun video görevi dahil tüm oturumlar EN videoyu da kendisi yükler; "EN: Studio'dan yüklenecek" diye bırakmaz. vidIQ yalnız yedek (TR kanalı). Kanal kuralı aynen sürer: EN içerik yalnız EN kanalına, TR yalnız TR kanalına.

## YAYIN SAATİ: PRIME'DAN 1 SAAT ÖNCE (21 Kasım, kullanıcı kuralı — KALICI, tüm videolar)
- Her video, hedef ülkenin prime saatinden 1 saat önce yayınlanır. TR: Shorts 18:00, uzun 20:00 (TSİ). ABD (EN): prime 19:00 ET → yayın 18:00 ET = 23:00Z = 02:00 TSİ (kış saati); ABD yaz saatinde 22:00Z = 01:00 TSİ.
- Aynı kanala aynı saate iki video konmaz; ikinci video ertesi güne veya uzun video saatine kayar.
- Toplu yükleme yapılmaz (EN kanalı 20 Kasım'da 18 Short'u bir günde aldı, izlenme 0–2). Kanal başına günde en fazla 1 veri Short'u.
- Kapak: her yüklemede s1 karesi JPEG ayrıca yüklenir ve Studio listesinde kontrol edilir (21 Kasım: YouTube EN gözlükte otomatik orta sahneyi seçmişti).
- (21 Kasım) API ile kapak 'yüklendi' dese bile Shorts'ta Studio'da otomatik kare kalabildi (EN GTA). Her yüklemeden sonra Studio'da kapak gözle kontrol edilir, gerekirse Studio'dan yüklenir. YouTube API günlük kotası iki kanal için ortak; günde ~2 yükleme sonrası doluyor (11:00 TSİ sıfırlanır).
- vidIQ ücretsiz planı günde 3 YouTube yüklemesi; dolarsa Studio + Chrome ile yüklenir.

## ANLATIMDA SİTE ADRESİ YOK (19 Kasım, kullanıcı kuralı — KESİN, tüm videolar)
- Seslendirmede site adresi/adı **hiç söylenmez**: "Site adresimiz…", "Ey Ay Saa Savran nokta com", "A. I. SaaS Savran dot com", "aisaasavran.com" gibi hiçbir cümle yok. Ekranda yazıyor, izleyen görüyor.
- Kapanış anlatımı "Ücretsiz kontrol edin." / "Check it free." ile biter.
- Eski kurallardaki "site adı ayrı cümle / okunuş" maddeleri geçersizdir.


## FİRMA ADLARI + SİTE ADI EKRANDA (20 Kasım, kullanıcı kararı — ÖNCELİKLİ; aşağıdaki harf etiketi kuralları bunun yerine geçer)
- Ölçülen gerçek firma adları (markalar, klinikler, hastaneler) grafiklerde, marka kartında ve açıklamada gerçek adlarıyla görünür. Marka A/B/C harf etiketi yalnız örnek (demo) veride kullanılır.
- Ürün adları da gerçek adlarla yazılır (Model 1/2 gibi etiketler artık kullanılmaz).
- Genel ilke (20 Kasım): ölçülen marka, firma, klinik, hastane ve ürünler gerçek adlarıyla gösterilir. Harf/numara etiketi yalnız örnek (demo) veride kalır.
- Site adı (aisaasavran.com) Shorts/Reels sonunda ekranda kalır, seslendirmede hiç okunmaz (yukarıdaki 19 Kasım kuralı aynen geçerli).
- Kapsam: 20 Kasım'dan sonra üretilen videolar. Yayınlanmış videolar değiştirilmez.


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
- İlk sahne kapak tasarımında: ChatGPT · Claude · Gemini etiketleri, büyük soru, sarı rozet (t.badge, ör. "Aynı mı söylüyorlar?"). İlk kare boş değil (fade-in yok); sonda aisaasavran.com. Ekranın en altına hiçbir şey yazılmaz (bkz. GÜVENLİ ALAN).
- Etiketler ve açıklama hashtagleri: ölçülen marka/kanal adları.
- Eğitim videoları: `sablon/egitim.py <ayar.json>` (adım etiketi + açıklama + gerçek site ekranı kartı); ekranlar Playwright + Chrome ile 390x844, ölçek 2,77 (1080 genişlik), JPEG 92 (`egitim/ekran-cek-*.py`). Ses Kore, atempo 1.08.
- Şablon: `sablon/make.py <ayar.json>` (v2, 8 sahne: marka, motorlar, soru bazında kayıp, ürün, doğruluk+Shopping, kaynaklar, CTA; örnek ayarlar telefon videoları). `make.py <ayar> frames` önizleme, `make.py <ayar> s3 s4` yalnız o sahneler.
- Gerçek marka adları **marka kartında** ("names" alanı), alt kısımda değil (bkz. MARKA KARTI).

## MARKA KARTI + GÜVENLİ ALAN (15 Kasım, kullanıcı kararı — tüm Shorts/Reels için kalıcı)
- **Sahne sırası:** 1) kanca (soru + motorlar + rozet) → 2) **marka kartı** → 3) sonuç sahneleri → kapanış.
- **Marka kartı:** ölçülen gerçek adlar ekranın ortasında büyük etiketler halinde (alfabetik), altında "Sonuçlarda gerçek adlarla gösterilir / Shown with real names in the results" ve yöntem/tarih notu (`footer`). `make.py` bu sahneyi (`names`) kancadan sonra kendisi ekler; `order` içine "names" yazılırsa oradaki yeri kullanılır. Anlatımda kart için kısa bir cümle olur ("Bu markaları sorduk." / "We asked about these brands.").
- **Güvenli alan:** Shorts/Reels arayüzü (başlık, kanal adı, beğen/yorum düğmeleri, "Videonuzu paylaşın") ekranın bazı yerlerini kapatır. Bu alanlara **hiçbir yazı, grafik, rakam** konmaz — hiçbir sahnede:
  - üst 160 px,
  - y > 1400 (alt kısım),
  - y > 1000 iken x > 900 (sağdaki düğme şeridi).
  İçerik x 80–880, y 160–1390 arasında kalır (`XR`, `YB`, `BLOCKED` sabitleri).
- **Otomatik kontrol:** `make.py <ayar> frames` ve render, her sahnenin son karesini kontrol eder; kapalı bölgede içerik varsa "GÜVENLİ ALAN HATASI" verip durur. Uzun yazılar sığana kadar otomatik küçülür. Yeni sahne eklerken de bu sabitler kullanılır.

## İçerik kuralları
- (20 Kasım) Sonuçlarda markalar ve firmalar gerçek adlarıyla yazılır; Marka A/B/C harf etiketi gerçek videolarda kullanılmaz. Ürün adları da gerçek adlarla yazılır.
- Ölçülen markaların gerçek adları **kancadan sonraki marka kartında** alfabetik yazılır ve grafiklerde de aynı adlarla görünür.
- Her videoda ekranda (seste değil): "Bunlar yapay zekânın cevaplarıdır" (kullanıcı: "bizim görüşümüz değildir" denmesin), tarih, örneklem, "tüm pazarı temsil etmez".
- Global video İngilizce, Türkiye videosu Türkçe; YouTube başlık/açıklama/etiketler YALNIZ kanalın dilinde (bkz. KANAL KURALI). Başlık ≤ 100 karakter.
- Kulaklık videosu formatı esas: marka oranı, motor karşılaştırması, soru bazında kayıp, rakip ürün, ürün doğruluğu, Google Shopping sırası, kaynaklar.


## KAYNAK AĞI + GOOGLE SHOPPING (18 Kasım, kullanıcı kararı — tüm veri videoları için kalıcı)
- **Kaynak ağı sahnesi** (`"net"`, kodu `sablon/kaynak_agi.py`, `make.py` içinde kayıtlı): solda yapay zekânın kaynak gösterdiği siteler, sağda markalar/firmalar; çizgi kalınlığı = o siteyi kaynak gösterip o markayı anan cevap sayısı. Veri: canlı arama cevaplarının `cited_urls` alan adları × cevap metninde marka geçişi. Ayar: `CFG["net"] = {"left": [[site, cevap]], "right": [ad], "links": [[sol_i, sag_i, cevap]]}`, metin `tag_net`, `net`, `net_sub`, `net_note`. Veri videolarında kaynaklar sahnesi olarak bu kullanılır (`order` içinde `"net"`). Örnek: `video/nakliye/nakliye-tr.json`.
- **Google Shopping sırası:** belirli ürün/model içeren her videoda (telefon, kulaklık, TV, prezervatif gibi) Google Shopping sırası mutlaka konur (yukarıdaki "Google Shopping verisi" kuralı). Hizmet videolarında (nakliye gibi) Shopping olmaz; bu açıklamada yazılır, uydurulmaz.
- **Grafiklerde gerçek adlar (18 Kasım):** markalar/firmalar grafiklerde ve anlatımda gerçek adlarıyla gösterilir, harf (Marka A/B) kullanılmaz. Marka kartı kalır, altında "Alfabetik sırayla".
- **Gemini sütunu:** canlı arama yapmayan Gemini ayrı sütundur; üstünde Gemini renginde küçük rozet "Hafızadan" / "From memory" (`gemini_label`). Alta küçük not konmaz.
- **"Motor" denmez (18 Kasım):** ekranda ve anlatımda ChatGPT/Claude/Perplexity/Gemini için "yapay zekâ(lar)" / "AI(s)" denir: "Yapay zekâlar anlaşamıyor" / "The AIs disagree", etiket "Yapay zekâ karşılaştırması" / "AI comparison", "dört yapay zekânın hepsinde" / "all four AIs".
- **Kapak (18 Kasım):** her yüklemede kapak konur: s1'in son karesi (`frame_p1.png`) JPEG → `videolar` dalında `kapak/<ad>-<dil>.jpg`; video yüklenince `yt/ayar.json` "thumbnails" içine {videoId: dosya} eklenir ve `youtube-ayar` dalına push edilir (iş akışı anında çalışır, kapak yüklenir), ayrıca main'e PR.
- Yeni sahne/şablon değişikliği yapan oturum kodu **bu dala push eder**; yalnız yerel çalışma klasöründe bırakılmaz (prezervatif videosundaki kaynak ağı ve Shopping sahneleri kaydedilmediği için kayboldu).

## Ses + müzik karışımı
```
ffmpeg -i v.mp4 -i voice.wav -i music.wav -filter_complex "[1:a]aresample=44100,volume=1.6,apad=whole_dur=$D,asplit=2[vo][sc];[2:a]volume=0.35,atrim=0:$D,afade=t=out:st=$(($D-1.5)):d=1.5[mu];[mu][sc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck];[duck][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k out.mp4
```

## KANAL KURALI (20 Kasım) — HER SOHBET/OTURUM/HESAP İÇİN ZORUNLU; aşağıdaki "iki dilli" ve "@aisaasavran" ifadelerinin yerine geçer
- İngilizce video/Shorts YALNIZ **AI SaaSavran EN** kanalına: @AISaaSavranEN, `UCJ3mA2nPzsinfO9MgccFtdA`.
- Türkçe video/Shorts YALNIZ **AI SaaSavran** kanalına: @AISaaSavran, `UCHL4sdkEenxkpuP4_Hq1RZw`.
- Başlık, açıklama, etiket, hashtag her kanalda yalnız o kanalın dilinde (iki dilli metin YOK). Oynatma listeleri kendi kanalında, kendi dilinde; EN kanalında Türkiye/Türkçe adlı liste açılmaz.
- Eğitim videoları EN kanalına yüklenmez; TR kanalında liste dışı (yalnız siteden izlenir).
- EN kanalı vidIQ'ya bağlı değil (ikinci kanal ücretli): EN yüklemeleri YouTube Studio'dan (tarayıcı) yapılır. vidIQ'daki `UCHL4sdkEenxkpuP4_Hq1RZw` yalnız Türkçe içerik içindir.
- Her yüklemede: çocuklara yönelik değil, ücretli tanıtım yok, yapay içerik işareti, video dili, `kapak/<ad>-<dil>.jpg` kapağı.
- EN kanalı listeleri: "Black Friday AI Picks", "AI Picks: US Edition", "Which brand does AI recommend? All tests".

## Yükleme
- EN kanalına yükleme (20 Kasım): sahibinin bilgisayarındaki Chrome (Claude in Chrome) ile YouTube Studio'dan Claude yapar. Tarayıcı dosya yükleme sınırı 3,8 MB: video 720p'ye sıkıştırılır (`ffmpeg -vf scale=1280:720 -preset slower -crf 35 -tune stillimage -r 24 -c:a aac -b:a 48k -ac 1`), kapak `kapak/<ad>-en.jpg`. Ayarlar: çocuklara özel değil, ücretli tanıtım yok, yapay içerik Evet, dil + başlık/açıklama dili İngilizce (ABD), liste, etiketler.
- Dosya `videolar` dalına konur, raw.githubusercontent.com linki `vidiq_video_upload`'a verilir; YouTube kanalı: Türkçe → @aisaasavran (UCHL4sdkEenxkpuP4_Hq1RZw); İngilizce → @AISaaSavranEN (UCJ3mA2nPzsinfO9MgccFtdA, Studio'dan).

## İngilizce strateji: ABD odaklı (15 Kasım, kullanıcı kararı)
- İngilizce içerik tutana kadar ABD hedefli: ABD markaları/ürünleri, ABD'den ölçüm (marka country=US → canlı arama konumu ABD; worker SEARCH_COUNTRY'yi marka ülkesinden alır). Başlık/etiket ABD aramalarına göre ("US edition", yerel marka adları).
- İngilizce yayın saati: ABD akşamı 19:00 ET = 00:00Z = Türkiye 03:00 (kış saati; Mart'ta yaz saatine geçince 23:00Z). Shorts ve uzun videoların EN sürümü bu saatte. TR sürümler Türkiye prime saatinde kalır (Shorts 19:00, uzun 21:00).
- Tutarsa sonra İngiltere (22:00 TR), Kanada, Avustralya.
- Yeni ölçüm = harcama: bütçe limiti yükseltmek için kullanıcı onayı şart.
- 15 Kasım: limit 25 $ (kullanıcı onayı). Growth Lab 2'de ABD ölçümleri: Walmart (perakende/Black Friday), Verizon (operatör), McDonald's (fast food); 8 soru, ChatGPT+Claude+Perplexity canlı arama (ABD), 48 cevap. Gemini ücretsiz kotası dolduğu için Gemini koşuları başarısız/sırada (videolarda Gemini yok).
- Yayında (EN, 00:00Z): perakende I1zstVDBJXo (21 Kas), operatör gFYospqVPZo (22 Kas), fast food y8o15ib5g9A (23 Kas). Liste "AI Picks: US Edition". Çalışma klasörleri /home/claude/us1-3, `render.sh`. Şablon 3–4 motor destekli (engines listesinden kapak etiketleri).

## Google Shopping verisi (15 Kasım, kullanıcı kuralı)
- Ürün karşılaştırmalı videolarda (telefon, kulaklık, robot süpürge, TV, laptop, parfüm, ayakkabı gibi belirli ürün/model içeren her video) Google Shopping verisi de konur: aynı aramada Google Shopping sırası, fiyat/satıcı ve yapay zekâ önerisiyle farkı ("AI 1. öneriyor, Shopping'de 7. sırada" gibi).
- Kaynak: `shopping_checks` tablosu (ürün başına; worker SerpAPI ile doldurur, ülke TR/US). Ölçümde ürünler (products) tanımlı değilse önce ürünleri ekleyip Shopping kontrolünü çalıştır; veri yoksa uydurma, sahneyi koyma ve açıklamada belirtme.
- Mağaza/operatör/restoran gibi ürün olmayan kategorilerde Shopping sahnesi yok.

## Perplexity (15 Kasım)
- AI SaaSavran artık Perplexity'yi de ölçüyor (tüm paketlerde). Bundan sonraki TÜM videolarda (Shorts, uzun, eğitim) ve açıklamalarda motor adları: ChatGPT, Gemini, Claude ve Perplexity. Perplexity'ye ait sayı/sıralama yalnız gerçek Perplexity ölçümü varsa gösterilir; yoksa "Perplexity de ölçülüyor" denir, rakam uydurulmaz. Kanal açıklamasında da Perplexity var.

## Eğitim videoları kuralı (13 Kasım)
- **14 Kasım kararı: eğitim videoları YouTube'a GİZLİ (private) yüklenir**, herkese açık yapılmaz (kullanıcı isteği). Veri Shorts herkese açık devam eder.
- **15 Kasım kararı:** eğitim videolarının TAMAMI bitip YouTube'a yüklenene ve ilgili oynatma listelerine ("AI SaaSavran | Kullanım ve Eğitim Rehberi" / "AI SaaSavran | Tutorials & User Guide" + dil listesi) alınana kadar hepsi GİZLİ kalır; tek tek açılmaz. Hepsi tamamlanınca: videolar herkese açık yapılır, `web/src/lib/tutorial-videos.json` içine kimlikler yazılır ve `"public": true` yapılır → site /tr/egitim/, /tutorials/ ve /kayit (kayıt videosu = Eğitim 2) YouTube'dan gömülü oynatır (video siteye yüklenmez). Her yeni eğitim videosunun kimliği yüklenince bu dosyaya eklenir (public false kalarak).
- Durum (20 Kasım): Eğitim 1–10 TR+EN TAMAM (9: beRz2exSg90/jzWe2ZejO_w, 10: Y9LNvWFlF6E/NgsNPe2PpOA), hepsi LİSTE DIŞI. Önceki durum (18 Kasım): Eğitim 1–8 TR+EN TAMAM, 16 video YouTube'da GİZLİ, listelerde, kapaklı. 6: TR kn7IEveF7dI / EN HgQXnVSZvHY; 7: TR GIdlPj6Q_sw / EN N50X-1JfGJA; 8: TR 2PtipsC0Bm4 / EN tesgSylSO-U. Kimlikler web/src/lib/tutorial-videos.json'da, "public": false. Herkese açma kararı sahibinde.
- Kendi markamız gösterilmez. Gerçek arayüz + uydurma ÖRNEK veri (Marka A/B…, Ürün 1/2…), ekranda "Örnek veri / Sample data" etiketi. Ekran çekerken API cevapları Playwright ile örnek veriyle değiştirilir; gerçek ölçüm yapılmaz.
- Anlatımda eskiyecek bilgi yok: fiyat, kota sayısı, tarih, motor sürümü söylenmez; "yapay zekâ" denir. Böylece videolar ileride güncelleme gerektirmez.

## Kasım Fırsatları / Black Friday AI Picks serisi (14 Kasım)
- TR adı "Kasım Fırsatları" (TR içerikte Black Friday denmez), EN adı "Black Friday AI Picks". Sıra: robot süpürge (yayında), kahve makinesi, spor ayakkabı, parfüm, gaming laptop, televizyon.
- Her kategori: TR (sahip marka country=TR) + global (US) ayrı ölçüm; 8 soru, marka adı geçmez; ChatGPT+Claude canlı arama, Gemini aramasız. Sıralamada gerçek firma adları kullanılır (20 Kasım). Fiyat/indirim sadece güncel kaynakla doğrulanırsa.
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
Derslerde marka gerçek adıyla anılabilir; tam sıralama tablolarında da gerçek firma adları kullanılır (20 Kasım). Haftada 1 uzun video.
- Durum güncellemesi (14 Kasım akşam): Kasım Fırsatları / Black Friday AI Picks 6 kategori TR+EN TAMAM ve planlandı: 14 robot süpürge, 15 kahve (18:00), 16 spor ayakkabı, 17 parfüm, 18 gaming laptop, 19 TV (TR 19:00, EN 23:00). Parfüm/laptop/TV ölçümleri Growth Lab 2 (fd1b32d1) içinde. Ayarlar video/kasim/*.json.


## PAYLAŞIM KURALLARI (YouTube + Instagram) — 14 Kasım, HANGİ SOHBETTEN OLURSA OLSUN GEÇERLİ
### YouTube (@aisaasavran)
- Veri/ölçüm Shorts: herkese açık. Eğitim videoları: GİZLİ (private).
- Başlık, açıklama, etiketler yalnız kanalın dilinde (KANAL KURALI); başlık ≤ 100 karakter. Kapak: sorunun kendisi + motorların aynı şeyi söylemeyebileceği.
- Grafiklerde markalar gerçek adlarıyla gösterilir (20 Kasım; harf etiketi yok). Gerçek adlar kancadan sonraki marka kartında alfabetik de yazılır. Adlar etiketlerde ve açıklamada hashtag olarak.
- Notlar: "Bunlar yapay zekânın cevaplarıdır" ("bizim görüşümüz değildir" DENMEZ). Sağlıkta ek olarak "tıbbi tavsiye değildir".
- Her ölçüm videosu açıklamasına: "Bu video bağımsız bir ölçümdür. Hiçbir markayla reklam veya iş birliğimiz yoktur." / "Independent measurement. We have no sponsorship or partnership with any brand shown."
- Süre ≤ 58 sn (tek Instagram hikâyesine sığsın). TR seslendirme atempo 1.24, EN 1.2. "Ey Ay Saa, Savran".
- Tempo: veri Shorts günde 1, fazlası ileri tarihe (günde 1–2). Saatler TR 19:00, EN 23:00 (TSİ). Kullanıcı "hemen yayınla" derse hemen.
- Her yüklemede: yapay zekâ ile değiştirilmiş içerik işareti, ücretli tanıtım kapalı, video dili (TR/EN), doğru oynatma listesi.
### Ölçüm hemen başlar (18 Kasım, kullanıcı kuralı)
- Video için ölçüm istenince saatlik işçi beklenmez: ölçüm kuyruğa eklenir eklenmez işçi elle başlatılır: `gh api -X POST repos/ramazannsavrann-jpg/ai-saasavran/actions/workflows/worker.yml/dispatches -f ref=main` (tek motor gerekirse `-f "inputs[live_engines]=claude"`). Canlı arama ~8 dk, Gemini (aramasız) ~7 dk daha; beklerken kullanıcıya kısa durum verilir.
- Örnek kurulum (Growth Lab 3): ana marka `<Konu> Study (video)` country=US + 8 soru (marka adı geçmez) + iki run (live_search tavan 1 $, model_knowledge tavan 0,1 $). Adlar cevap metninden sayılır.

### Hızlı yayın akışı (18 Kasım, kullanıcı isteği: yayın sonrası bekleme olmasın)
1. Video `videolar` dalına (commit'e sabit raw link) → `vidiq_video_upload` → `vidiq_social_post_draft_create` (YouTube, public, başlık/açıklama/etiketler) → kullanıcı onayı → `vidiq_social_post_publish`. Ücretli tanıtım bu yolla kapalı yüklenir.
2. Yayın biter bitmez: `gh api -X POST repos/ramazannsavrann-jpg/ai-saasavran/actions/workflows/youtube-ayar.yml/dispatches -f ref=main -f "inputs[only]=<id1>,<id2>"` (`only` = yalnız yeni videolar; kota korunur. Gece çalışması tam kalır, kapak/gizli koruması sürer. `youtube-ayar` dalına push TAM çalışma başlatır, kotayı yer — kullanma) → dil, "yapay içerik" işareti ve dil listesi başlık kuralıyla 1–2 dk içinde uygulanır (ayar.json'da kayıt beklemeden). Kullanıcıya bu bitince haber verilir.
3. Konu listesi (ör. "AI Picks: US Edition") için `yt/ayar.json` kaydı ayrı PR ile eklenir; kullanıcı bunu beklemez, testler geçince birleştirilir ve gece çalışmasında da uygulanır.

### Seste site adı kontrolü (19 Kasım, kullanıcı: "böyle hatalar asla olmasın") — ZORUNLU
- Seattle kahve videosunda TTS site adını "AI sizin markanız nokta com" (TR) ve "AI Savram" (EN) diye okudu, yayına çıktı, silindi.
- Seslendirme iş akışı her sesi yazıya döker (`video/kontrol-ses/ad_kontrol.py`, faster-whisper small); site adı yanlışsa iş KIRMIZI olur, `ses-out/<ad>-kontrol.txt` "HATA" yazar. HATA'lı sesle video yapılmaz.
- Bitmiş videoyu da yayından önce kontrol et: mp4'leri bir klasöre koy, `python3 video/kontrol-ses/ad_kontrol.py <klasör>` → hepsi TAMAM olmadan YouTube/Instagram'a yükleme yok.
- (GEÇERSİZ, 19 Kasım: anlatımda site adresi hiç söylenmez) Eski kural: site adı ayrı cümle: TR "Site adresimiz: Ey Ay Saa, Savran, nokta com." EN "Our website is: A. I. Saa, Savran, dot com." Önüne "sizin markanız" gibi cümle bitiştirme.

### YouTube açıklama ve işaretler (19 Kasım, kullanıcı kuralı)
- Açıklamanın ilk satırı arama ifadeleri (anahtar kelimeli; ör. "Best smart ring for Black Friday according to AI: … Oura vs RingConn …"). Açıklamalar `yt/ayar.json` "descriptions" içine yazılır, otomasyon uygular.
- **İngilizce videoların açıklamasında Türkçe satır yok** (bağımsızlık notu da yalnız İngilizce). Türkçe videolar Türkçe (+ kısa EN özet olabilir).
- Marka iş birliği / ücretli tanıtım YOK açıkça işaretlenir: `yt_ayar.py` yeni yüklenen videolarda `hasPaidProductPlacement=false` yazar.
- Hemen yayın: `youtube-ayar.yml` girdisi `publish_now=<id>` zamanlanmış videoyu hemen herkese açar.

### Instagram (@aisaasavran)
- Sadece marka/ürün/YouTuber/sektör ölçüm içerikleri; eğitim videoları Instagram'a gitmez.
- Açıklama ve etiketler hem TR hem EN; ölçüm açıklamasına bağımsızlık satırı.
- IZGARA: her satır = 2 video + 1 ayrı gönderi. Hep 3'lü set: önce TR Reels, sonra EN Reels, sonra ayrı gönderi (görsel/karusel, blog gibi). Teker teker, bir önceki yayına girdikten sonra. Toplu/aynı anda paylaşım YOK, set yarım bırakılmaz.
- Üstte 3 sabitlenmiş gönderi ayrı satırdır, sayılmaz.
- Prezervatif konusu Instagram'da paylaşılmaz (19 Kasım, kullanıcı kararı).

### PAYLAŞMADAN ÖNCE KONTROL LİSTESİ (19 Kasım, kullanıcı kuralı — ZORUNLU, her sohbet)
Sebep: 19 Kasım'da yalnız vidIQ paylaşım listesine bakılıp Seattle seti "eksik" sanıldı; Reels'ler vidIQ dışından paylaşılmıştı. Aynı anda birden çok sohbet paylaşım yapıyor.
1. Bu bölümü (PAYLAŞIM KURALLARI) baştan sona oku.
2. Aşağıdaki **PAYLAŞIM KAYDI**'na bak: konu zaten paylaşılmış mı?
3. Gerçek profile/kanala bak, yalnız paylaşım listesine değil: Instagram için profil ızgarası (`vidiq_ig_profile_reels` ya da kullanıcının ekran görüntüsü), YouTube için kanal yükleme listesi. vidIQ `social_post_list` yalnız vidIQ'dan yapılanları gösterir.
4. Kullanıcıya "eksik / yok / paylaşılmamış" demeden önce en az İKİ kaynakla doğrula. Doğrulayamadıysan "doğrulayamadım" de.
5. Video kuralları: süre ≤ 58 sn, `ad_kontrol.py` TAMAM, mantık kontrolü. Site adı seslendirmede HİÇ söylenmez (19 Kasım kuralı; ekranda yazar).
6. Taslağı kullanıcıya göster, onaydan sonra yayınla; set sırasını (TR → EN → gönderi) bozma.
7. Yayından sonra PAYLAŞIM KAYDI'na satır ekle ve bu dala push et.

### PAYLAŞIM KAYDI (her paylaşımdan sonra güncellenir; en yeni üstte)
| Konu | YouTube TR | YouTube EN | Instagram seti | Not |
|---|---|---|---|---|
| GTA 6 konsol (ABD ölçümü, 21 Kas) | F14GSPnX0lA (21 Kas 19:55, Türkçe okunuş) | KjmT8x6XgG4 (EN kanalı, 21 Kas 19:50) | TAMAM 21 Kas ~20:05–20:13 (TR DgAt5TdDMW-, EN DgAuV31E14_, karusel DgAurUlFnI_) | Kapaklar Studio'dan elle (API kapağı tutmadı/kota doldu); karusel `videolar` dalı `instagram/ig-gta-1..5.jpg`; TruthGuard veri seti PR #139 |
| EN kanalı yeniden dağıtım (21 Kas): 20 Kas'ta toplu yüklenen 19 Short gizli + her gece 02:00 TSİ biri açılacak şekilde Studio'da PLANLANDI | – | 22 Kas DrdF475gU6M yüzük, 23 GoAtFl-W7Fk BF alışveriş, 24 ok41Do2SKcU kahve, 25 ltVgyJQMRl0 robot, 26 VnuIMU_3EyA saat, 27 GsJnrvhxyzA kamera, 28 Vts_aaKTvRA TV, 29 13S1CUBv2RE laptop, 30 qPQksOrxQTc ayakkabı, 1 Ara 5dS1gkTeqFE parfüm, 2 BivrCJ0BBik telefon, 3 nLkcMvNELvk Seattle, 4 pjlp8IyqtwY NYC, 5 q6ZBNRIzC_E fast food, 6 2jxT1DSPxXM operatör, 7 11cfGMmBfrU tech YouTuber, 8 oAOXyKLESQs hastane, 9 Pv1yanw29_4 saç, 10 dF9Sda3gBNA 10 özellik | – | Yeni EN videoları bu tarihlerde aynı saate konmaz (günde en fazla 2 EN Short) |
| Yüz serumu (TR) + AI gözlük TR (ABD verisi) | serum P9-ViSfAbvQ (21 Kas 18:00), gözlük jCnP-_8Uqqw (21 Kas 20:00); Studio+Chrome, kapaklar s1 | (gözlük EN üst satırda) | – | vidIQ günlük 3 yükleme dolmuştu; vidIQ'da yayınlanmamış 2 taslak kaldı (ba98d54a…, 84a53939…) — YAYINLAMA, mükerrer olur |
| AI gözlük (ABD verisi) | (TR: 21 Kas planlanacak, onay bekliyor) | Rtafh3WSaLY (EN kanalı, Studio+Chrome, 21 Kas 03:00 TSİ planlı; kapak s1 karesi elle yüklendi — YouTube otomatik olarak orta sahneyi seçmişti) | – | Yüz serumu TR hazır, yayın onayı bekliyor |
| Eğitim 9 Ürünler + Eğitim 10 Paylaşım/haftalık ölçüm (20 Kas) | TR kanalı, liste dışı: 9 TR beRz2exSg90, 9 EN jzWe2ZejO_w, 10 TR Y9LNvWFlF6E, 10 EN NgsNPe2PpOA | EN kanalına konmaz (eğitim) | gönderilmez (eğitim) | Studio'dan yüklendi; İngilizce eğitimler TR kanalında liste dışı (20 Kas istisnası) |
| TEMİZLİK 20 Kas: EN kanalına taşınan 18 İngilizce Shorts + 1 uzun video (V76gSO6nEME) TR kanalından kalıcı silindi | – | EN kanalında: 18 Shorts + 1 uzun video | – | Bu tablodaki YouTube EN sütunundaki eski kimlikler (ör. Zk1eQF5wk4o, Zz8biHgxQzc, 3SmvBaQspGU, Uw56ankOGhQ, kLKaNZCQcI8) artık TR kanalında YOK; karşılıkları EN kanalında |
| Uzun 3 v2: Dev markalar | n1mIYpg8Xlw (20 Kas 21:00 planlı) | qde8_Cj8i0o (EN kanalı, 20 Kas 15:40 TSİ herkese açık; Chrome+Studio ile, 720p) | gönderilmez (uzun video) | |
| Akıllı yüzük | oKNVNscsGi8 | Zz8biHgxQzc | TAMAM 19 Kas 22:15–22:20 (TR Df7zyEwiicv, EN Df7z-0xkZqd, karusel Df70MDyiX2n) | karusel `videolar` dalı `instagram/ig-yuzuk-1..5.jpg` |
| Uzun 2: Kaynaklar | gjH-oaMvKuI | IZ7fzbcTzrE | gönderilmez (uzun video) | |
| Seattle kahve | 85rcRRxKwkw | Zk1eQF5wk4o | TAMAM (TR Reels, EN Reels, karusel) | Reels vidIQ dışından paylaşıldı |
| NYC nakliye | Ilxb0FZK1go | 3SmvBaQspGU | yok (vidIQ listesinde yok; profilde doğrulanmadı) | |
| Prezervatif (ABD) | LePjz0EEfgM | tFF4JG7ncN0 | paylaşılmaz (kullanıcı kararı) | |
| Akıllı saat (ABD) | l4AQgjOEzgw | Uw56ankOGhQ | TAMAM | |
| Güvenlik kamerası (ABD) | o-D7BHM7iKA | kLKaNZCQcI8 | yok (vidIQ listesinde yok; profilde doğrulanmadı) | |
| Saç ekimi / özel hastane | – | – | TAMAM (14 Kas) | |

## YouTube API otomasyonu (14 Kasım)
Dil (TR/EN), "yapay içerik" işareti ve oynatma listeleri artık otomatik: `yt/yt_ayar.py` + `yt/ayar.json` + `.github/workflows/youtube-ayar.yml` (PR #70; birleşince main'de her gece 00:30 TR çalışır). Anahtarlar Secrets'ta: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN (Google projesi "My First Project", OAuth client "youtube-playground").
Yeni video yükleyince ID'sini `yt/ayar.json`'a {lang, lists} ile ekle ve push et (anında çalışır). Eklenmeyenler başlık kuralıyla işlenir. Kota 10.000/gün; güncelleme başına 50.


## UZUN VİDEO (16:9) — 19 Kasım
- Şablon: `video/uzun/uzun.py` (1920x1080). Ayar: `video/uzun/<konu>-<dil>.json` → `scenes` listesi; her sahnede `type` (title, stats, bars, table, net, boxes, cta), ekran metinleri ve `say` (o bölümün anlatımı).
- Akış: `python3 uzun.py ayar.json frames` (önizleme) → `narr` (narration-<ad>-cNN-<dil>.txt yazar; push = TTS) → ses-out'ta hepsi TAMAM olunca `render --force` → `<ad>-<dil>.mp4` (bölüm süresi = o bölümün sesi; müzik sidechain).
- (GEÇERSİZ, 19 Kasım akşamı) Anlatımda site adı/adresi HİÇ söylenmez; kapanış "Ücretsiz kontrol edin." / "Check it free." ile biter (en üstteki kural).
- Kapak: `video/uzun/kapak.py "başlık" "rozet" "alt satır" çıktı.jpg` ile sade 1280x720 (başlık + sarı bulgu rozeti). Açıklamada bölüm zaman damgaları (a01..aNN süreleri toplanarak).
- **Uzun 3 (v2), 20 Kasım — "Dev markalar neden görünmüyor?"** (`uzun/devmarka3b-*.json`, ad `uzun3b-devmarka`, haftalık görev). İlk Uzun 3 (19 Kasım render, `uzun/dev-markalar-tr.mp4`) hiç yüklenmemişti; kapanışta site adı vardı, özellik bölümü yoktu → yeniden yapıldı, 10 bölüm, ~4:54.
  - TR: `n1mIYpg8Xlw` (vidIQ, gizli, 20 Kasım 21:00 TSİ = 18:00Z planlı), video `videolar` dalı `uzun/dev-markalar-v2-tr.mp4`, kapak `kapak/uzun3b-tr.jpg`.
  - EN: `uzun/big-brands-v2-en.mp4` + `kapak/uzun3b-en.jpg` HAZIR; EN kanalı vidIQ'ya bağlı olmadığı için (KANAL KURALI) EN kanalında yayında: qde8_Cj8i0o (başka oturum, Studio ile).
  - **Özellik bölümü: Kayıp Nedeni Kartı** (`engine/src/insights.ts` lossCards + `Brand.tsx` LossCardView). Gerçek örnek: Growth Lab 1, Nike TR ölçümü, soru "En kaliteli ve uzun ömürlü spor ayakkabı markası hangisi?", 4 canlı cevap (ChatGPT 2, Claude 2, 14 Kasım): hedef 0/4, yerine Asics/Hoka/New Balance 3/4 (videoda Marka A/C/F, hedef Marka X), hedef sitesi hiç kaynak değil, runrepeat.com 4/4. Yeni sahne türü `loss` (`uzun.py`).
  - Kullanılan veri: Nespresso/Tom Ford/Armani/iRobot/Philips (global, canlı vs Gemini), Roborock–Philips, Lenovo–Dell, De'Longhi–Siemens (uzman marka), Xiaomi/MSI/Liv Hospital (ChatGPT vs Claude), Philips/Arzum/Fakir, Samsung/Vestel (Türkiye yerli). KULLANILMADI (sonraki bölümlere): soru bazında düşüş (Oura pil/abonelik, Starbucks Pike Place) → Uzun 4; Türkiye vs dünya karşılaştırması → Uzun 5.
  - Özellik rotasyonu kaydı: Uzun 2 = (özellik bölümü yoktu; kaynak analizi anlatıldı) · Uzun 3 = Kayıp Nedeni Kartı. Sonraki bölüm bunu KULLANMAZ (öneri: Uzun 4 = Koşullu Görünürlük Haritası / soru türü, Uzun 5 = ülke-dil karşılaştırması).
  - `ad_kontrol.py` güncellendi: bitmiş videoda site adı beklenmez (19 Kasım kuralı), bozuk okunmuş ad yine HATA. Gemini TTS ücretsiz günlük kotası ~12–15 istek; 20 bölüm iki güne/kota sıfırlanmasına (08:00Z) bölünmeli. Müzik `music_vol` 0.22.
- Yayında (19 Kasım): Uzun 2 "Yapay zekâ hangi sitelere bakıyor?" TR/EN (`uzun/kaynak-*.json`, videolar dalı `uzun/kaynaklar-tr.mp4`, `uzun/sources-en.mp4`). Sıradaki: 3) Dev markalar neden görünmüyor 4) Soruyu değiştir, kazanan değişsin 5) Yapay zekâ vs Google Shopping.


## MANTIK KONTROLÜ (19 Kasım, kullanıcı kuralı — tüm veri videoları, kısa ve uzun)
Yayından önce, rakam kontrolüne ek olarak:
1. **Gözlem ≠ neden.** Veri yalnız farkı gösterir. Neden–sonuç cümleleri "olası neden", "yorumumuz", "bununla açıklanabilir" diye kurulur; "bu yüzden", "bundan kaynaklanıyor" denmez.
2. **Küçük örneklem söylenir.** 16'dan az cevaplı oranlar (özellikle Gemini) ekranda ya da anlatımda "küçük örneklem" notuyla verilir; tek başına büyük sonuç çıkarılmaz.
3. **Paydalar tutarlı.** Bir tabloda farklı yapay zekâ setleri (ör. + Perplexity) karışıyorsa dipnotta yazılır. Eksik cevaplar paydaya katılmaz, açıklamada "X cevap alınamadı" yazılır.
4. **Yaklaşık ölçüler belirtilir.** Sezgisel sınıflama (ör. "alan adında marka adı geçen site = marka sitesi") "yaklaşık" diye anılır, yöntem açıklamaya yazılır.
5. **"Hiç anmadı" iddiası** cevap metinlerinde arama ile doğrulanır (kısa adlar başka kelimenin içinde geçebilir: "evie" ⊂ "review").
6. Ölçülen her rakam veritabanından yeniden sorgulanır; ekrandaki sayı ile anlatımdaki sayı aynı olmalı.


## SESLENDİRME TALİMAT SIZINTISI (19 Kasım, yayına çıkan hata)
- Gemini TTS'e metnin başına "Read this like a … YouTube host" / "Türk YouTube sunucusu gibi oku" talimatı ekleniyordu; gemini-3.8 bunu sesli okudu (Uzun 2 EN yayına çıktı, kullanıcı sildi). Bölümler farklı modellerle üretildiği için ses tonu da bölüm bölüm değişti.
- Düzeltme: talimat metne eklenmez; tek model sabit (`gemini-2.5-flash-preview-tts`, istenirse `video/tts-model-<ad>.txt`); 429'da aynı modelle beklenip yeniden denenir, başka modele/OpenAI'ye düşülmez.
- `ad_kontrol.py` artık üç şeye bakar: site adı, talimat sızıntısı (read this / YouTube host / sunucu / … kelimeleri), seste metinde olmayan fazla konuşma (kelime sayısı %25+ fazla). Herhangi biri HATA ise video yayınlanmaz.
- Yayından önce her bölümün `seste duyulan` dökümü baştan sona okunur.

- (GEÇERSİZ) Site adı anlatımda hiç söylenmez; bkz. en üstteki kural.

## Shorts 20–21 Kasım (uzun videolardan + Dyson ölçümü) — yayında
- Şablon: `video/uzun/shortlar/kisa.py` + `*.json`. Rakamlar DB'den yeniden doğrulandı. Ses dökümü baştan sona okunur; sahne başları duraklama listesiyle kontrol edilir (gerekirse `starts`).
- TR (@aisaasavran): Dyson mı Shark mı 7XHLLC06glA · Türkçe sordum jmTA4jmeebM · Yerli marka KxyvTAH0fFE (vidIQ) · Philips robot süpürge 5Q7IXb-87cU (Chrome+Studio; vidIQ taslağı 4258aa45 YAYINLANMAZ, kopya olur).
- EN (@AISaaSavranEN, Chrome+Studio): Dyson vs Shark fnSArtFRENQ · Philips robot vacuums lHRr61V4ruI.
- Dyson ölçümü: Growth Lab 3, marka `Hair Styler Study (video)` (811abfff), ABD, 8 soru, 20 Kasım, 0,52 $. "İlk önerilen" = cevapta tüm markalar arasında ilk geçen (örneklerle doğrulandı). Canlı: Shark 32/48, Dyson 9; 200 $ sorusu hariç 26/42; Gemini hafızadan Dyson 13/16.
- vidIQ ücretsiz planda günde 3 YouTube yüklemesi; fazlası Chrome+Studio ile (sohbet otomatik onay modunda olmalı, dosya ≤3,8 MB).
- OpenAI TR sesinde "örneklem küçüktür" dökümde bozuk duyuldu (kütüktür/tüçüktür): sonraki anlatımlarda "örneklem sınırlıdır" yaz.
