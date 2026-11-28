# Tartışma: Türkiye'de 0 bütçeyle başlanabilecek, para kazandırabilecek yeni bir mobil uygulama (Android)

Tarih: 2026-11-28T10:07:17.404Z · Tavan: 0.15 $

## Konu

Türkiye'de 0 bütçeyle başlanabilecek, para kazandırabilecek yeni bir mobil uygulama (Android)
Sahibi Antalya'da yaşıyor; turizm, tarım (sera), yerel esnaf gibi yakın çevresindeki alanlar avantaj olabilir ama şart değil.
Uygulama tamamen Claude tarafından yazılacak ve Google Play'de yayınlanacak.

## Maliyet (API kullanım verisinden)

| Motor | Model | Maliyet ($) |
|---|---|---|
| ChatGPT | gpt-6-luna | 0.00102 |
| Perplexity | perplexity/sonar | 0.01274 |
| Gemini | gemini-3.5-flash-lite | 0.00538 |
| **Toplam** | | **0.01914** |

## Tutanak

### Tur 1 — ChatGPT

- **Sera Günlüğü** — *Kime:* Antalya ve çevresindeki küçük sera üreticilerine. *Sorun:* Sulama, gübreleme, ilaçlama ve hasat notları kâğıtta kayboluyor. *Ürün:* Telefonda çevrimdışı çalışan kayıt ve hatırlatma uygulaması. *Gelir:* Temel kullanım ücretsiz; gelişmiş raporlar veya birden fazla sera için ücretli sürüm. *Neden küçük ekip yapabilir:* Sunucu gerekmez; kayıtlar telefonda tutulur. Ziraat uzmanıyla içerik doğrulaması gerekir.

- **Antalya’da Kendi Kendine Gezi** — *Kime:* Antalya’yı gezen bağımsız turistlere. *Sorun:* Gezilecek yerlerle ilgili kısa, anlaşılır ve çevrimdışı bilgi bulmak zor olabilir. *Ürün:* Harita bağlantıları ve çok dilli kısa gezi anlatımları sunan uygulama. *Gelir:* Şehir veya rota paketlerini ücretli sunmak; yerel işletmelerden tanıtım ücreti almak. *Neden küçük ekip yapabilir:* İlk sürüm tek bir bölgede, sınırlı sayıda içerikle hazırlanabilir; içerik telefona indirilebilir.

- **Esnaf İçin WhatsApp Sipariş Defteri** — *Kime:* Siparişi WhatsApp’tan alan küçük esnafa. *Sorun:* Müşteri, ürün, teslimat tarihi ve ödeme bilgileri mesajlar arasında kayboluyor. *Ürün:* Siparişleri telefonda düzenleyen; müşteriye WhatsApp’tan hazır durum mesajı gönderen basit uygulama. *Gelir:* Ücretsiz temel sürüm; daha fazla sipariş kaydı, yedekleme veya raporlama için ücretli özellikler. *Neden küçük ekip yapabilir:* İlk sürüm çevrimdışı çalışabilir; mesaj gönderme için sunucu gerekmez.

**Önemli:** Google Play’de yeni geliştirici hesabı açmanın ücreti bulunduğunu biliyorum; bu nedenle “0 bütçeyle Play’de yayınlama” mümkün olmayabilir. Güncel koşulları Google Play Console’dan doğrulayın. Ayrıca gelir garantisi yoktur; her fikirde önce hedef kullanıcılarla talebi sınamak gerekir.

### Tur 2 — Perplexity

- **Esnaf için WhatsApp Sipariş Defteri — en güçlü aday, ama dar bir nişle.**  
  **Rakip göstergeleri:** SepetTakip restoran/kafe siparişlerini ve WhatsApp sipariş entegrasyonunu sunuyor; TR Cari sipariş takibiyle WhatsApp paylaşımını destekliyor. Bunlar talep alanının mevcut olduğuna işaret ediyor, fakat kapsamları basit bir kişisel sipariş defterinden daha geniş.  
  **Olası boşluk:** WhatsApp’tan sipariş alan, tam bir POS veya ön muhasebe sistemi istemeyen küçük yerel işletmelere yönelik, çevrimdışı ve çok basit kayıt aracı. Talep ve ödeme isteği kanıtlanmış değil: önce Antalya’da 10–15 esnafla görüşüp prototipi denemek gerekir.  
  **Kaynaklar:** [SepetTakip](https://sepettakip.com/), [TR Cari](https://www.trcari.com/siparis-takip-programi)

- **Antalya’da kendi kendine gezi — rakip yoğunluğu belirgin.**  
  Google Play’de Antalya Travel & Explore ve SmartGuide’ın Antalya rehberi var; çevrimdışı rehber, harita ve gezi içeriği sunduklarını belirtiyorlar. GoTürkiye de resmi bir seyahat rehberi. Bu, turist rehberlerine ilgi olduğunu gösterir; ancak indirme veya ödeme talebini tek başına kanıtlamaz. Genel gezi rehberi yapmak yerine belirli bir ihtiyaca—ör. çocuklu aileler için kısa rotalar veya belirli bir ilçenin yürüyüş rotaları—odaklanmak gerekir.  
  **Kaynaklar:** [Google Play: Antalya Travel & Explore](https://play.google.com/store/apps/details?id=com.eduven.cg.antalya), [Google Play: SmartGuide Antalya](https://play.google.com/store/apps/details?id=org.smart_guide.smartguide.antalya), [GoTürkiye](https://goturkiye.com/tr)

- **Sera Günlüğü — olası boşluk var, fakat bu aramada rekabet ve talep kanıtı yetersiz.**  
  Verilen arama sonuçları sera üreticilerine yönelik doğrudan bir rakip veya yerel talep ölçümü göstermedi. Bu, rakip olmadığı anlamına gelmez. Ürünü yazmadan önce Antalya’da sera üreticileriyle görüşüp hâlihazırda hangi kayıt yöntemlerini kullandıklarını ve böyle bir uygulama için ödeme yapıp yapmayacaklarını doğrulayın.

- **Sonuç:** İlk deneme için **WhatsApp Sipariş Defteri** daha gerçekçi görünüyor: basit, çevrimdışı ve sunucusuz sürüm yapılabilir. Ancak rekabet var; farkı, karmaşık işletme yazılımlarından daha kolay kullanılması olmalı. Bu araştırma üç fikrin de gerçek gelir sağlayacağını kanıtlamıyor. Google Play’de yayınlama ücretini ve güncel şartları ayrıca doğrulayın.

### Tur 3 — Gemini

Şeytanın avukatı olarak önceki turda sunulan fikirleri 0 $ bütçe, Antalya gerçekliği ve yasal riskler açısından masaya yatırıyorum:

*   **Teknik Risk & Veri Kaybı:** "Çevrimdışı ve sunucusuz" demek, kullanıcının telefonu bozulduğunda veya sıfırlandığında tüm verilerin uçması demektir. Esnaf veya çiftçi verisini kaybettiğinde uygulamayı ömür boyu siler. Claude'un ilk denemede hatasız yerel veritabanı (SQLite) kurması garanti değildir.
*   **Google Play & Yasal Risk (KVKK):** Google Play geliştirici hesabı açmak tek seferlik 25 $'dır (0 $ bütçeyle çelişir, kredi kartı gerekir). Ayrıca WhatsApp sipariş defteri veya sera uygulaması müşteri/üretici verisi (telefon numarası, isim, finansal not) tutar. KVKK uyumsuzluğu veya veri sızıntısında, yazılımcı olarak başınız belaya girebilir.
*   **Para Kazanma Zorluğu:** Antalya'daki küçük esnaf veya sera sahibi, dijital bir araca asla para ödemez; kağıt kalem veya ücretsiz WhatsApp kullanmaya devam eder. 0 $ bütçeyle reklam koysanız bile, yeterli indirme sayısı olmadan gelir sıfır kalır.

**Fikirlerin Değerlendirmesi (10 üzerinden):**

1.  **Esnaf İçin WhatsApp Sipariş Defteri — Puan: 4/10**
    *   *Artı:* İhtiyaca yakın.
    *   *Eksi:* "SepetTakip" gibi ücretsiz/freemium yerli rakipler var. Esnaf alışkanlık değiştirmek istemez. Veri güvenliği riski yüksek.
2.  **Antalya’da Kendi Kendine Gezi — Puan: 2/10**
    *   *Artı:* Turizm bölgesi.
    *   *Eksi:* Pazar dev rakiplerle (TripAdvisor, Google Maps, SmartGuide) dolu. 0 bütçeyle güncel, kaliteli içerik üretmek ve öne çıkmak imkansıza yakın. Sıfır gelir potansiyeli.
3.  **Sera Günlüğü — Puan: 5/10**
    *   *Artı:* Antalya için niş ve mantıklı bir alan.
    *   *Eksi:* Ziraat bilgisi hatalı olursa mahsul zarar görür, sorumluluk doğar. Çiftçiyi uygulamaya adapte etmek çok zor; bizzat sahaya (örneğin Aksu veya Kumluca'daki seralara) gidip ikna etmek gerekir.

**Sonuç:** 0 $ bütçe ve yeni başlayan biri için bu fikirlerin hiçbiri "kolay para" getirmez. En yüksek potansiyel Sera Günlüğü'nde ancak teknik ve yasal riskler göz ardı edilmemelidir. Google Play 25$ ücreti de çözülmeli.

### Tur 4 — ChatGPT

## Seçim: Seralar için **iş ve hatırlatma günlüğü**

Sera Günlüğü fikrini daraltırdım: Uygulama **ziraat tavsiyesi vermesin**; üreticinin kendi yaptığı işleri kaydetmesine ve hatırlatıcı kurmasına yarasın. Böylece hatalı ilaçlama veya gübreleme önerisi verme riski azalır. İnternetsiz ve telefonda çalışan tasarım sunucu masrafını önler; ancak telefon bozulursa veri kaybı riski vardır. Bu yüzden yedek olarak dosyaya dışa aktarma gerekir.

Talep ve ödeme isteği henüz kanıtlanmış değil. “Çiftçi uygulamaya para ödemez” demek de doğrulanmış bir bilgi değil; bunu sahada sınamak gerekir.

### İlk sürüm (en fazla 6 özellik)

1. Sera/bölüm ekleme.
2. Sulama, gübreleme, ilaçlama ve hasat gibi işleri tarihli kaydetme.
3. Kullanıcının belirlediği tarih ve notlarla yerel hatırlatıcı kurma.
4. Kayıtları tarihe veya sera bölümüne göre listeleme.
5. Verileri telefonda saklama; yedek için dosyaya dışa aktarma ve geri yükleme.
6. Basit Türkçe arayüz; **ürün dozu, ilaçlama veya yetiştirme tavsiyesi vermeme**.

### İlk 100 kullanıcıyı bulma

- Önce Aksu, Kumluca veya yakın çevredeki üreticilerle ve tarım malzemesi satan dükkânlarla yüz yüze konuşun. Hangi kayıtları tuttuklarını ve bu uygulamayı deneyip denemeyeceklerini sorun.
- İlk olarak 10 üreticiye prototipi kullandırın; uygulamayı onların telefonu üzerinde gözlemleyip sorunları düzeltin. Memnun kalanlardan başka üreticilere önermelerini isteyin.
- Yerel üretici WhatsApp/Facebook gruplarında izin alarak kısa tanıtım ve deneme bağlantısı paylaşın. 100 kullanıcı hedefi garanti değildir; indirme değil, düzenli kullanım ölçülmeli.

**Bütçe notu:** Google Play geliştirici hesabı ücretliyse, 0 $ ile Play’de yayınlamak mümkün olmayabilir. Güncel ücreti ve şartları doğrulayın. Önce ücretsiz prototiple talebi sınayın; yayın ücreti için ortak, destekçi veya bütçe bulunmadan yayın sözü vermeyin.

### Tur 5 — Perplexity

- **Kısa sonuç:** Canlı arama sonuçları, “sera iş ve hatırlatma günlüğü” için doğrudan ve birebir üç Android rakibini, Google Play yorumlarındaki şikâyetleri ve karşılaştırılabilir fiyatları doğrulamaya yetmiyor. Bu yüzden yorum şikâyeti uydurmak veya üç rakip varmış gibi göstermek doğru olmaz.

- **Yakın ürünler ve görünen fiyat bilgileri:**
  1. **Cylopiq Sertech** — sera operasyonu, görev, ekip ve kayıt yönetimi sunuyor. Ücretsiz planında bir sera ve sınırlı çalışan kullanımı listelenmiş; Pro fiyatı arama sonucunda **199 ABD doları/ay** olarak görünüyor. [Kaynak](https://www.cylopiq.com/)
  2. **SERA Gelir Gider Takip** — sera üreticisinin gelir-gider takibine odaklı; App Store sayfasında **49,99 TL** görünüyor. Bu, Android/Google Play rakibi olduğunu kanıtlamaz. [Kaynak](https://apps.apple.com/tr/app/sera-geli-r-gi-der-taki-p/id6818547150)
  3. **SmartMoles** — sera sulama sistemlerini uzaktan kontrol ve analiz etmeye yönelik; sayfada fiyat belirtilmiyor. Basit iş günlüğüyle aynı ürün değil. [Kaynak](https://smartmoles.com/mobil-uygulama)

- **Kullanıcı şikâyetleri:** Bulunan sonuçlarda bu ürünlere ait güvenilir, incelenebilir Google Play yorumları ve tekrar eden şikâyetler çıkmadı. Dolayısıyla “kullanıcılar şu özelliği eleştiriyor” diyemem. Kaynak olarak görünen Google Play yorum analiz rehberi, belirli uygulamaların yorumlarını vermiyor. [Google Play Console rehberi](https://support.google.com/googleplay/android-developer/answer/138230?hl=en)

- **Ayıracak tek şey:** **İnternetsiz çalışan, sadece üreticinin kendi iş kayıtlarını ve hatırlatmalarını tutan, ziraat tavsiyesi vermeyen yalın günlük.** Bu konumlandırma, otomasyon/analiz veya işletme yönetimi sunan ürünlerden farklı; fakat henüz kullanıcı talebi kanıtı değil.

- **Önce 10 üreticiyle prototip testi yapın.** Google Play’de yayınlamadan önce yorum ve ödeme isteğini sahada doğrulayın; mevcut arama sonuçları gelir potansiyelini kanıtlamıyor.

### Tur 6 — Gemini

Hakem olarak tartışmayı özetliyor ve Claude’un Android uygulamasını kodlaması için gereken **Yazılım Şartnamesi**ni sunuyorum:

1. **Ürün Adı Önerisi ve Tanım**
   - *Seçenek A:* Sera Günlüğüm
   - *Seçenek B:* Tarlam Cepte
   - *Tanım:* Antalya'daki üreticilerin internet gerektirmeden sulama, ilaçlama ve hasat gibi kendi işlerini telefonlarında kaydedip hatırlatıcı kurdukları yalın günlük uygulaması.

2. **Hedef Kullanıcı**
   - Antalya (Aksu, Kumluca vb.) çevresindeki küçük ölçekli sera üreticileri.

3. **MVP Özellikleri (Öncelik Sırasıyla)**
   - Sera / Bölüm ekleme (İsim ve açıklama ile).
   - İş türü seçerek tarihli kayıt ekleme (Sulama, Gübreleme, İlaçlama, Hasat, Diğer).
   - Kullanıcının belirlediği saat için yerel hatırlatıcı (Alarm/Bildirim) kurma.
   - Kayıtları tarihe veya sera bölümüne göre listeleme ve filtreleme.
   - Verileri telefonda saklama; olası veri kaybına karşı JSON/CSV formatında cihaza yedekleme (Export) ve geri yükleme (Import).
   - **Asla ziraat tavsiyesi, ürün dozu veya reçete vermeme** (Sadece kullanıcının kendi yazdığı notu saklar).

4. **Ekranlar**
   - *Giriş/Ana Ekran:* Seraların listesi ve hızlı iş ekleme butonu.
   - *Sera Detay Ekranı:* Seçilen seranın geçmiş iş kayıtları ve hatırlatıcıları.
   - *Yeni İş/Hatırlatıcı Ekleme Ekranı:* Tarih, iş türü ve metin girişi.
   - *Ayarlar/Yedekleme Ekranı:* Verileri dışa aktarma (yedekleme) ve geri yükleme.

5. **Veri ve Teknik Tercih**
   - **Veri:** Tamamen cihazda (SQLite veya Room veritabanı).
   - **Sunucu:** Gerekmiyor (0 $ masraf).
   - **Ücretsiz Servis:** Android yerel bildirim API'leri (AlarmManager/Notification).

6. **Para Kazanma Modeli**
   - İlk sürüm tamamen ücretsiz ve reklamsız (Bölgesel güven kazanmak için). İleride çoklu sera yönetimi veya gelişmiş raporlama eklenirse ücretli sürüme geçilebilir.

7. **Riskler ve Çözümleri**
   - *Risk 1 (Veri Kaybı):* Telefon bozulursa veriler uçar. -> *Çözüm:* 5. maddedeki yedekleme/dosyaya aktarma özelliği ile kullanıcı kendi yedeğini alır.
   - *Risk 2 (Google Play 25$ Ücreti):* 0 bütçeyle çelişir. -> *Çözüm:* Play Store'a hemen yüklemek yerine, APK dosyası doğrudan WhatsApp ile ilk 10 üreticiye test ettirilir; bütçe bulununca mağazaya yüklenir.
   - *Risk 3 (Yasal Sorumluluk):* Yanlış gübreleme önerisi mahsulü yakabilir. -> *Çözüm:* Uygulama asla öneri sunmaz, sadece kullanıcının defterini dijitalleştirir.

8. **Tartışmada Uzlaşılamayan Noktalar (Claude ve Sahibi Karar Verecek)**
   - **Google Play Ücreti:** 25 dolarlık geliştirici hesabı açma maliyetinin nasıl karşılanacağı (ortak, destekçi veya yerel esnaf desteği aranıp aranmayacağı).
   - **Kullanıcı Alışkanlığı:** Çiftçinin kağıt-kalem alışkanlığını bırakıp uygulamayı açarak veri gireceğine sahada ikna olup olmama durumu.
