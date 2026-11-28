# Tartışma: SHA-256d madenci pipeline'ında Intel tur yeniden zamanlama (US10755242) — dilimde büyük, tam çipte küçük kazanç neden?

Tarih: 2026-11-28T10:48:00.546Z · Tavan: 0.15 $

## Konu

SHA-256d madenci pipeline'ında Intel tur yeniden zamanlama (US10755242) — dilimde büyük, tam çipte küçük kazanç neden?

Proje: SAVRAN Virtual Chip (sky130, 130 nm, açık akış Yosys 0.33 + ABC). Tam açık (unrolled) SHA-256d madenci, saat başına 1 nonce.
RPS=2 = pipeline aşaması başına 2 SHA-256 turu. Tüm varyantlar referans modelle bit bit doğrulandı (FUNCTIONAL).

Denenen tur aritmetiği varyantları (yalnız formüller, kod yok):
- Taban (DA=0): T1 = HKW + Σ1(e) + Ch(e,f,g) paylaşılıyor; e' = d + T1, a' = T1 + Σ0(a) + Maj(a,b,c). (HKW = h + K + W önceden toplanmış.)
- DA=1 (D ön-toplama): pipeline HKW yerine DHKW = d + h + K + W taşır (ek flip-flop yok).
  e' = DHKW + Σ1 + Ch (3 operand); a' = (DHKW − d) + Σ1 + Ch + Σ0 + Maj (tek düz toplam, paylaşılan T1 yok).
- DA=3 (yalnız düzleştirme): e' = d + HKW + Σ1 + Ch ; a' = HKW + Σ1 + Ch + Σ0 + Maj (paylaşılan T1 yok, ön-toplama yok).

Ölçümler (SYNTH:sky130 tt 1,80 V, kablosuz; gecikme = ABC map+buffer+stime):
- 4 aşamalı dilim, RPS=2: gecikme taban 8.529 ps → DA=1 6.459 ps (−%24), DA=3 6.660 ps (−%22); alan +%11,5 / +%9,6.
  Alan×gecikme: DA=1 −%16, DA=3 −%14 (yoğunluk ≈ +%18 / +%17).
- 4 aşamalı dilim, RPS=1: taban 3.845 ps → DA=1 3.247 ps (−%16), DA=3 3.720 ps (−%3); alan +%8 / +%6.
- Tam madenci, RPS=2: taban 2,029 mm², 121,6–125,7 MHz (iki ayrı koşu, ABC gürültüsü ~%3).
  DA=1: 2,300 mm² (+%13), 141,5 MHz. DA=3: 2,232 mm² (+%10), 140,7 MHz.
  Alan başına hız: taban 59,9–61,8 → DA=1 61,5, DA=3 63,0 M hash/s/mm² (yani tam çipte yalnız ≈ +%0–5).
- Kabul eşiğimiz: alan başına ≥ +%5 ve PNR'de fmax ≥ +%8, döngü başına enerji ≤ +%5.

Sorular:
1. US10755242'deki "1-cycle / 2-cycle deferred A" tam olarak nasıl çalışıyor? A hangi formülle, hangi turda hesaplanıyor; ertelenen A sonraki turun Σ0(A) ve Maj(A,B,C) girdisine nasıl yetişiyor? Patentte alan maliyeti veriliyor mu? (Lütfen patent metninden alıntıyla/paragraf numarasıyla.)
2. Dilimde −%24 gecikme tam çipte neden yalnız −%13–16 frekansa dönüşüyor olabilir? (Tam çipte kritik yolun başka yere — giriş aşaması, iki hash arası orta aşama, mesaj çizelgesi, yüksek fan-out — kayması mı, ABC'nin büyük ağdaki buffer/eşleme davranışı mı?) Bunu açık araçlarla (OpenSTA/ABC) nasıl ayırt ederiz?
3. Alan artışını (+%10–13) azaltmanın yayımlanmış yolları neler? (Σ1+Ch'yi e ve a için carry-save biçiminde paylaşmak, kısmi toplamları bir önceki aşamada hesaplamak, vb.) Kaynaklı yaz.
4. Bu sonuçla DA=3'ü (daha az alan, benzer hız) mi, DA=1'i mi PNR'ye götürmeliyiz, yoksa önce 2. sorudaki darboğazı mı çözmeliyiz?

## Maliyet (API kullanım verisinden)

| Motor | Model | Maliyet ($) |
|---|---|---|
| ChatGPT | gpt-6-luna | 0.00201 |
| Perplexity | perplexity/sonar | 0.01768 |
| Gemini | gemini-3.5-flash-lite | 0.00858 |
| **Toplam** | | **0.02827** |

## Tutanak

### Tur 1 — ChatGPT

- **Önce fiziksel darboğazı bulun; dilim sonucunu tam çipe taşımayın.** 4-aşamalı dilimdeki −%24 gecikme, tam çipte görülen −%13–16 frekans artışını garanti etmez. Her varyantı aynı OpenROAD yerleşim/yönlendirme akışında karşılaştırın; OpenSTA raporlarında kritik yolun başlangıç/bitiş register’larını, lojik derinliği, fan-out’u ve kablo gecikmesini kaydedin. **Beklenti:** yalnız darboğaz gerçekten SHA turuysa PNR fmax’te +%5–15; alan değişimi −%2…+%3. **Kabul:** mevcut eşiğiniz olan PNR fmax +%8 ve hash başına enerji ≤+%5.  
- **DA=3 ve DA=1’i PNR’de doğrudan yarıştırın.** Sentezde DA=3 daha az alanlı, DA=1 ise benzer frekanslı; henüz fiziksel kazanç kanıtlanmış değil. Aynı seed/kısıtlarla birden fazla PNR koşusu, OpenSTA gecikmesi ve OpenROAD güç tahmini (aynı VCD/aktivite varsayımlarıyla) alın. **Beklenti:** alan başına hızda −%2…+%5; enerji/hash yönü ölçülmeli. **Kabul:** alan başına ≥+%5, fmax ≥+%8, enerji ≤+%5.  
- **Σ1(e)+Ch(e,f,g) için carry-save paylaşımını araştırın.** İki tüketicide ortak kısmi toplam, toplamayı azaltabilir; ancak ayrı son taşıma yayılımları kazancı silebilir. Wallace, “A Suggestion for a Fast Multiplier” (1964) ve Dadda, “Some Schemes for Parallel Multipliers” (1965), carry-save ağaçları için kaynaklardır; SHA’ya uygulanmasının kazancı garanti değildir. **Beklenti:** alan −%2…−%8, gecikme −%0…−%8. **Ölçüm/kabul:** aynı SYNTH ve PNR akışında; fmax ve alan başına hız eşikleri korunmalı, enerji/hash artmamalı.  
- **Sabit ikinci-hash işini özelleştirin.** İkinci SHA-256’nın sabit padding/başlangıç değerleri ve sabit mesaj sözcükleri için sabit yayılımını inceleyin; genel hesaplama yerine sabitleri sentezde sadeleştirin. Dayanak: FIPS 180-4 SHA-256 tanımı. **Beklenti:** tasarıma bağlı olarak alan/anahtarlama −%1…−%10; Verilator VCD + Yosys/ABC ve PNR ile doğrulayın. **Kabul:** FUNCTIONAL bit eşitliği ve PPA eşiklerinin sağlanması.  
- **Saat/anahtarlama enerjisini ayrı hedef yapın.** Etkin olmayan register’larda clock-enable/operand izolasyonunu deneyin; sürekli çalışan hash boru hattında saat kapılama kazancı sınırlı olabilir. Kaynak: Benini, De Micheli, “Dynamic Power Management: Design Techniques and CAD Tools” (1999). **Beklenti:** enerji/hash −%0…−%10, alan +%0…+%3; VCD tabanlı güçte ölçün. **Kabul:** enerji düşüşü, fmax ve alan başına hız eşikleriyle birlikte.

**Önemli:** mevcut SYNTH sonuçları fiziksel performans veya enerji kanıtı değil. Önceliğim önce kritik yolu teşhis etmek, sonra DA=3/DA=1’i PNR’de karşılaştırmak olur.

**Kurucuya en önemli 3 soru**
1. Öncelik kesin olarak hash/saniye/mm² mi, yoksa joule/hash mi; iki hedefin ağırlığı nedir?
2. OpenROAD PNR’de gerçek hedef saat, kısıtlar ve güç/aktivite modeli nedir?
3. Güç ölçümünde gerçekçi nonce/veri aktivitesi ve sıcaklık/gerilim varsayımları belli mi?

### Tur 2 — Perplexity

- **Kısa sonuç:** Bulunan kaynaklar, SHA-256’da toplama zincirlerini kısaltmanın bilinen bir yön olduğunu destekliyor; fakat **US10755242’nin “1-cycle / 2-cycle deferred A” ayrıntılarını ve patentte alan maliyetini mevcut arama sonuçlarıyla doğrulayamadım**. Patent metni veya paragraf numarası görmeden formül/alıntı vermek uydurma olur; bu yüzden aşağıda patenti teyit edilmiş gibi anlatmıyorum.

- **Yakın literatür — gecikmiş hesaplama ve CSA**
  - *The Design of a High Speed ASIC Unit for the Hash Function SHA-256 (384, 512)* (DATE 2004), **0.18 µm HCMOS8**: Compressor hesabını bir saat çevrimi erteleyerek kritik yolun kısaltılmasını tartışıyor. Yayımlanan örnekte 66 çevrim/hash için 1,47 ns ve 1,30 ns/çevrim karşılaştırması var; alan ve gecikme, makalenin belirttiğine göre **Ch, Maj, Σ0/Σ1 ve register zamanlamaları hariç**. Dolayısıyla bu, tam madenciye veya sky130’a doğrudan taşınabilir bir PPA kıyası değil.
  - *Improving SHA-2 Hardware Implementations* (LNCS 4249, 2006): yeniden zamanlama ve kaynak paylaşımını tartışıyor; digest message’ın A/E son değerlerine CSA ile eklenmesini ve önceki pipeline aşamasında hesaplanabilmesini örnekliyor. Arama sonucunda bu özel fikre ait güvenilir, karşılaştırılabilir yüzde kazanç görünmüyor.
  - *Cryptographically Secure Pseudo-Random Number Generator IP-Core Based on SHA2 Algorithm* (Sensors, 2020): CSA ve retiming-pipelining kullanıyor; 45 nm ve 7 nm için CLA/CSA gecikme oranları bildiriyor. Bu teknolojiye özgü oranlar sky130 için tahmin sayılamaz.
  - *An optimized hardware implementation of SHA-256 round computation* (Computer Journal, 2025): 0,35 µm HSPICE benzetiminde kritik yolun 7,59 ns’den 2,73 ns’ye indiğini bildiriyor; bunun bir tur-döngüsü/katlama mimarisi olduğu ve çevrim sayısını artırdığı belirtiliyor. Bu sonuç, aynı throughput veya aynı pipeline yapısı için bire bir kıyas değil.

- **sky130 ve açık akış dayanağı**
  - *Custom ASIC Design for SHA-256 Using Open-Source Tools*: sky130 ve açık kaynak EDA ile 104.585 µm², 97,9 MHz bildiriyor. Çalışmanın kendi tasarımı ve akışı için yararlı bir kıyas noktası; **SAVRAN’ın tam açık, RPS=2 madencisiyle aynı mimari/koşullar değil**.
  - Aynı işin GitHub deposu OpenLane/sky130 örneği sunuyor. Arama ayrıca başka bir sky130 açık akış SHA-256 deposu buldu; ancak arama özeti güncel ve geleceğe tarihlenmiş sürüm bilgileri içerdiğinden, oradaki iddiaları bağımsız olarak doğrulanmış kanıt saymıyorum.
  - Bitcoin madenciliği bağlamında *Approximate Bitcoin Mining* (DAC 2016), SHA-256 donanımında carry-save ağaçlarının gereksiz carry propagation’ı önlemek için kullanıldığını ve alan–gecikme–hash hızı ödünleşimini açıklıyor; **SAVRAN’daki DA varyantları için ölçülmüş sonuç vermiyor**.

- **Sizin tasarımınıza aktarım ve karar**
  - Literatür CSA/retiming denemelerini gerekçelendiriyor; fakat bunların **Σ1+Ch’yi iki tüketici arasında paylaşarak alanı düşüreceğine dair doğrudan ölçülmüş kanıt bulamadım**. Bu, sentez ve PNR’de test edilmesi gereken bir tasarım hipotezi.
  - Verilerinizde DA=3, DA=1’e yakın tam çip frekansı ve daha az sentez alanı gösteriyor; fakat ikisi de henüz **PNR kanıtı değil**. Önce tam tasarımın OpenSTA kritik yol başlangıç/bitiş register’larını, hücre/kablo gecikmesini ve fan-out’unu çıkarın; ardından aynı PNR koşullarında DA=3 ve DA=1’i karşılaştırın.
  - Kabul eşiğiniz alan başına ≥%5, PNR fmax ≥%8 ve enerji ≤%5 artış olduğundan, **şu an kazanan seçmek yerine darboğazı ölçmek ve iki varyantı PNR’de yarıştırmak** en sağlam adım. Dilimdeki −%24 gecikme tek başına tam çip sonucu açıklamaz.
  - Önemli sınırlama: arama sonuçları, **US10755242’nin metnini/paragraflarını doğrulamaya yetmedi**; patent sorusuna alıntı veya “patentte alan maliyeti var/yok” hükmü vermiyorum.

### Tur 3 — Gemini

- **Önceki turlara eleştiri:** ChatGPT ve Perplexity, sentez ile PNR arasındaki uçurumu vurgulamakta haklı; ancak ikisi de OpenSTA/ABC kullanarak tam çipteki kritik yolun yerini somut komutlarla (örn. `report_timing -to [all_registers]`) nasıl izole edeceğini pratik olarak söylemedi. US10755242 patenti hakkında Perplexity'nin dürüstçe "doğrulayamadım" demesi iyi; çünkü uydurma alıntı üretmekten kaçındık. Ancak eksik olan, sky130'un 130 nm PDK özelliklerinde (yüksek RC dirençli metal katmanları) carry zincirlerinin ve yüksek fan-out’un tam çip frekansını nasıl baskıladığıdır (P: sky130 PDK dokümantasyonu). Dilimdeki −%24'lük kazancın tam çipte −%13'e düşmesi, büyük yerleşimlerde kablo gecikmelerinin (RC delay) lojik gecikmeyi domine etmesindendir.

- **Sorulara yanıt ve puanlama (10 üzerinden):**
  1. **US10755242 analizi:** Patent metnine bu oturumda tam olarak erişilemediği için emin değilim (uydurmamak gerekir). Puan: **0/10** (Veri eksik).
  2. **Dilim vs Tam Çip Farkı ve Teşhis:** Kritik yolun giriş/çıkış register'ları veya yüksek fan-out'a kayıp kayもちろん OpenSTA ile `report_critical_paths -n 5` komutuyla ölçülmelidir. Puan: **9/10** (En kritik adım).
  3. **Alan Artışını Azaltma (CSA/Retiming):** Wallace/Dadda ağaçları 130 nm standard cell kütüphanelerinde (sky130_fd_sc_hd) yerel buffer şişmelerine yol açabilir; kazanç belirsizdir. Puan: **6/10** (Yüksek risk, düşük getiri).
  4. **DA=3 vs DA=1 Kararı:** PNR'ye geçmeden önce darboğaz çözülmelidir; aksi takdirde alan maliyeti ödenir ama fmax hedefine (%8) ulaşılamaz. Puan: **8/10**.

- **Somut Eylem ve Kabul Ölçütü (SAVRAN Ar-Ge):**
  - **Ne yapılacak:** OpenROAD üzerinden DA=1 ve DA=3 için PNR koşuları tamamlanacak; `opensta` ile kritik yolun hücre gecikmesi (cell delay) ile kablo gecikmesi (net delay) oranı karşılaştırılacak.
  - **Ölçüm:** `report_timing` çıktısında `net delay` oranı %50'den büyükse sorun lojik değil yönlendirmedir.
  - **Kabul Ölçütü:** PNR fmax artışı ≥ +%8 ve alan başına hash hızı artışı ≥ +%5 kesin olarak sağlanmadıkça tape-out adayı kilitlenecektir (`SIM`, `SYNTH:sky130`, `PNR:sky130`).

### Tur 4 — ChatGPT

### Öncelikli deney planı

Maliyet tahmini için bulut fiyatı varsaymıyorum: **maliyet = tahmini bulut saat × sağlayıcının saatlik ücreti**. Süreler tek koşu içindir; PNR karşılaştırmalarında aynı ayarlar ve mümkünse birden fazla seed kullanın. Önce mevcut tasarımın tekrar üretilebilir referansını alın.

1. **Kritik yolu sınıflandırın**
   - **Hipotez:** Tam çipte frekansı sınırlayan yol, iyileştirilen SHA turu olmayabilir.
   - **Değişiklik:** Yok; taban tasarımı aynı kısıtlarla PNR’den geçirin.
   - **Seviye:** PNR:sky130; OpenSTA’da en kötü yolları, başlangıç/bitiş register’larını ve hücre/net gecikmelerini kaydedin.
   - **Kabul:** En kötü 20 yolun hangi mantık bölümünde olduğunu ve net gecikme payını belirlemek; henüz PPA kazancı şartı yok.
   - **Emek/bulut:** 2–4 saat; 2–4 bulut saati.

2. **DA=3’ü aynı akışta ölçün**
   - **Hipotez:** DA=3, DA=1’e yakın hızla daha az alan kullanır.
   - **Değişiklik:** Yalnız tur aritmetiğini DA=3 yapın.
   - **Seviye:** PNR:sky130; OpenSTA zamanlama, yerleşmiş alan ve aynı VCD/varsayımlarla enerji tahmini.
   - **Kabul:** PNR fmax ≥%8 artış, hash/saniye/mm² ≥%5 artış, enerji/hash ≤%5 artış.
   - **Emek/bulut:** 2–4 saat; 2–4 bulut saati.

3. **DA=1’i DA=3 ile doğrudan yarıştırın**
   - **Hipotez:** DA=1’in sentezdeki hız üstünlüğü PNR’de de sürerse ek alanı haklı çıkarır.
   - **Değişiklik:** Yalnız DA=1 kullanın; aynı kısıt, akış ve mümkünse 2–3 yerleşim seed’i.
   - **Seviye:** PNR:sky130.
   - **Kabul:** Aynı eşikler; DA=3’e göre sonuçları ve seed’ler arası değişimi raporlayın.
   - **Emek/bulut:** 4–10 saat; 4–10 bulut saati.

4. **Yol kaymasına göre hedefli deney**
   - **Hipotez:** Tur yolu artık kritik değilse tur aritmetiğini değiştirmek fmax’i az artırır.
   - **Değişiklik:** Yalnız raporlanan kritik bölümde fan-out/buffer veya yerleşim kaynaklı sorunu hedefleyin; aritmetiği değiştirmeyin.
   - **Seviye:** SYNTH:sky130 taraması, ardından başarılı aday için PNR:sky130.
   - **Kabul:** Kritik yolun iyileşmesi ve toplam fmax’in ≥%8 artması; alan başına hız ve enerji eşiklerinin korunması.
   - **Emek/bulut:** 3–8 saat; 3–8 bulut saati.

5. **Σ1+Ch için carry-save paylaşımını sınayın**
   - **Hipotez:** Ortak kısmi toplam alanı azaltabilir; kazanç garanti değildir.
   - **Değişiklik:** Yalnız bu toplamları carry-save biçiminde ifade eden bir varyant deneyin.
   - **Seviye:** Önce SIM ve SYNTH:sky130; geçerse PNR.
   - **Kabul:** Bit eşitliği; alan düşüşü veya alan×gecikme iyileşmesi ve nihai kabul eşiklerinin korunması. Dayanak: Wallace, *A Suggestion for a Fast Multiplier* (1964); Dadda, *Some Schemes for Parallel Multipliers* (1965).
   - **Emek/bulut:** 4–12 saat; 1–4 bulut saati.

6. **Kazananı enerji ve tekrar koşularıyla doğrulayın**
   - **Hipotez:** Tek koşudaki küçük farklar akış/seed gürültüsü olabilir.
   - **Değişiklik:** Taban ve en iyi aday için aynı aktiviteyle tekrarlı PNR.
   - **Seviye:** PNR:sky130.
   - **Kabul:** Ortanca sonuçta fmax ≥%8, alan başına hız ≥%5 ve enerji/hash ≤%5 artış.
   - **Emek/bulut:** 4–10 saat; 4–10 bulut saati.

### Tur 5 — Perplexity

- **Kısa sonuç:** Açık kaynaklarda SHA-256’yı aşamalara bölerek kritik yolu kısaltma örnekleri var; ancak bunlar SAVRAN’ın aynı *tam açık, RPS=2 madenci* mimarisinde yapılmış karşılaştırmalar değil. Sky130 için bulunan açık SHA-256 örnekleri de esasen genel hızlandırıcılar; **doğrudan rakip madenci kıyası sayılmaz**.

- **Deney 1 — taban tasarımın PNR kritik yolunu bulma**
  - *Improving SHA-2 Hardware Implementations* (LNCS 4249, 2006), tur hesabının bir bölümünü önceki çevrime taşıyarak kritik yolu kısaltmayı anlatıyor; bunun karşılığında SHA-256 için ek çevrim bildiriyor. Bu, yeniden zamanlamanın çevrim sayısı ve register sınırlarını değiştirebileceğini hatırlatıyor; sizin sabit throughput hedefinizle bire bir kıyas değil.
  - OpenROAD akışında yalnız “en kötü yol”a değil, en kötü birkaç yolun başlangıç/bitiş register’larına, mantık bölümüne, hücre ve net gecikmelerine bakın. STA sonucu, doğru saat ve net-RC kısıtlarına bağlıdır; hatalı/eksik RC tanımı iyimser rapor verebilir. Bu yüzden gecikme yüzdesini tek başına “kablolama baskın” diye yorumlamayın.
  - **Beklenen etki:** Bu teşhis deneyinde PPA kazancı hedeflenmez. **Kabul:** kritik yolların tur aritmetiği, giriş/çıkış, mesaj çizelgesi veya hashler arası aşama olarak sınıflandırılması; kullanılan kısıtların ve parasitiklerin açıkça kaydedilmesi.

- **Deney 2 — DA=3 PNR**
  - 2006 çalışmasının rescheduling yaklaşımı, önceki aşamada yalnız bağımlı olmayan hesapları öne alıp kritik yolu bölüyor; ek çevrim gerektirebildiği için SAVRAN’daki DA=3 ile aynı dönüşüm değil. 2025 tarihli *An optimized hardware implementation of SHA-256 round computation* da tur yolunu yeniden yapılandırıp sıkıştırıcı kullanıyor; yine farklı mimari ve iş yükü.
  - MDPI’deki *Custom ASIC Design for SHA-256 Using Open-Source Tools* (2024), SKY130/OpenLANE için 97,89 MHz ve 104.585 µm² bildiriyor. Makale, yapılandırma/sentez stratejisinin frekansı etkilediğini; saat hedefi değişikliğinin yaklaşık %3 frekans değişimi getirebildiğini belirtiyor. Mimari, SAVRAN’ın tam açık madencisi olmadığından rakamlar doğrudan kıyaslanamaz.
  - **Beklenen etki:** Elinizdeki SYNTH sonucu PNR kazancını garanti etmez. **Kabul:** aynı akışta PNR:sky130 fmax ≥%8, alan başına hız ≥%5, enerji/hash artışı ≤%5.

- **Deney 3 — DA=1’i DA=3 ile yarıştırma**
  - 2025 makalesindeki iki çevrimli A güncellemesi, A’yı ara toplam biçiminde taşıyıp Σ₀/Maj katkısını sonraki çevrimde birleştiriyor. Bu, “ertelenmiş A” fikrine yakın; ancak sizin DA=1 formülünüzün veya US10755242’nin bire bir açıklaması değildir.
  - **Tuzak:** farklı saat hedefi, sentez stratejisi, boru hattı gecikmesi ve başlangıç/sonlandırma çevrimleri sonucu değiştirebilir. Aynı PNR ayarları ve kısıtları kullanın; mümkünse birden fazla yerleşim tohumu ile ortanca ve aralığı raporlayın.
  - **Beklenen etki:** SYNTH’te DA=1’in alan maliyeti açık; PNR’de hız üstünlüğü belirsiz. **Kabul:** aynı eşikler ve ölçüm koşullarıyla DA=1’in DA=3’e karşı net üstünlüğü.

- **Sky130 madenci referansı:** Aramada bulunan *Custom ASIC Design for SHA-256* deposu 130 nm için 97,89 MHz ve 104.585 µm² bildiriyor; fakat genel SHA-256 hızlandırıcısıdır, açıkça tam açık Bitcoin madencisi/RPS=2 değildir. Başka bir depoda 66,7 MHz ve 56.437 µm² iddiaları var; sonuçlar depo beyanı ve farklı akışa dayalı, aynı mimari kıyas değil.

- **Karar:** Önce taban tasarımda kritik yolu ve STA kısıtlarını doğrulayın; ardından DA=3 ve DA=1’i aynı PNR akışında karşılaştırın. Mevcut SYNTH verisiyle ikisinden birini kazanan ilan etmek veya dilim kazancını tam çipe taşımak için yeterli kanıt yok.

### Tur 6 — Gemini

### 1. Gerçekçi Hedef ve Ölçüt
- **Hedef:** SAVRAN (sky130, unrolled SHA-256d, RPS=2) tam çip tasarımında, taban referansa kıyasla **PNR fmax ≥ +%8**, **alan başına hız (hash/s/mm²) ≥ +%5** ve **döngü başına enerji ≤ +%5** sağlamak.
- **Karşılaştırma Kriteri:** Dilim (slice) sentez sonuçları fiziksel kanıt değildir. Kazanan aday, yalnızca tam çip PNR (`PNR:sky130`) koşullarında, aynı seed ve kısıtlarla ölçüldüğünde bu eşikleri sağlarsa "en iyi" ilan edilebilir.

### 2. Öncelikli Deneyler
1. **Taban Kritik Yol Teşhisi (`PNR:sky130`):**
   - *Hipotez:* Tam çipte frekansı sınırlayan yol SHA turu değil, yönlendirme (routing/net delay) veya yüksek fan-out'tur.
   - *Kabul Ölçütü:* OpenSTA üzerinden en kötü yolların başlangıç/bitiş register’ları ve net gecikme oranının (`net delay / total delay`) çıkarılması; darboğazın netleşmesi.
2. **DA=3 PNR Koşusu (`PNR:sky130`):**
   - *Hipotez:* DA=3, DA=1’e yakın hız sunarken daha az alan harcar.
   - *Kabul Ölçütü:* PNR fmax ≥ +%8, alan başına hız ≥ +%5, enerji/hash ≤ +%5.
3. **DA=1 ve DA=3 Doğrudan Yarışması (`PNR:sky130`):**
   - *Hipotez:* Sentezde görülen hız farkı PNR’de DA=1 lehine ek alanı haklı çıkarır.
   - *Kabul Ölçütü:* Aynı koşullarda DA=3 ve DA=1’in PNR sonuçlarının seed ortalamasıyla karşılaştırılması.
4. **Yol Kaymasına Göre Hedefli Tamirat (`SYNTH/PNR:sky130`):**
   - *Hipotez:* Kritik yol SHA turu dışına kaydıysa aritmetiği değiştirmek yerine tamponlama (buffering) gereklidir.
   - *Kabul Ölçütü:* Kritik yolun iyileşmesi ve toplam fmax artışının ≥ +%8 olması.
5. **Carry-Save (CSA) Paylaşımı Deneyi (`SIM`, `SYNTH:sky130`):**
   - *Hipotez:* Σ1+Ch için kısmi toplam paylaşımı alanı azaltır (Wallace/Dadda yaklaşımı; kaynak: Wallace, 1964; Dadda, 1965).
   - *Kabul Ölçütü:* Bit eşitliği (`SIM`), alan düşüşü ve fmax/enerji eşiklerinin korunması.
6. **Tekrarlı Doğrulama ve Enerji Ölçümü (`PNR:sky130`):**
   - *Hipotez:* Tekil koşulardaki farklar akış gürültüsüdür.
   - *Kabul Ölçütü:* Ortanca sonuçta fmax ≥ +%8 ve enerji/hash ≤ +%5 artışın teyidi.

### 3. Altyapı ve Araç Eksikleri
- **Otomatik Arama/Optimizasyon Motoru:** PNR seed taramaları ve alan/frekans optimizasyonu için Python tabanlı betik otomasyonu eksik.
- **Formal Doğrulama:** Yosys `equiv_verilog` ile DA varyantlarının bit düzeyinde eşdeğerliği simülasyon dışında formal olarak taranmalı.
- **Güç/Aktivite Modellemesi:** VCD tabanlı gerçekçi nonce aktivitesi simülasyonu OpenROAD güç analizine tam entegre edilmeli.

### 4. Riskler
- **ABC/OpenROAD Gürültüsü:** Sentez/yerleşim gürültüsü (%3–5) küçük mimari kazançları maskeleyebilir.
- **Parazitik Çıkarım Yanılgısı:** OpenRCX eksik veya hatalı çalıştırılırsa net gecikmeleri iyimser raporlanabilir.
- **Yüksek Fan-Out:** Unrolled mimaride mesaj çizelgesi (W) hatlarının fan-out yükü PNR'de frekansı kısıtlayabilir.

### 5. Fiziksel Kanıta Giden Yol ve Maliyet
- **FPGA Doğrulaması:** Açık akışlı FPGA (Yosys + nextpnr + ECP5/Lattice dev kartı, örn. OrangeCrab veya ECP5 Evaluation Board) üzerinde test. *Tahmini maliyet:* ~50–100 USD (tek seferlik kart masrafı).
- **Silicon (Tapeout):** Tiny Tapeout (sky130) veya özelleştirilmiş SkyWater 130 nm shuttle projesi. *Tahmini maliyet:* Tiny Tapeout üzerinden ~2.000–3.000 USD veya açık kaynak akademik desteklerle sıfıra yakın (ancak bekleme süresi 6–12 ay).

### 6. Kurucuya Sorulacak Sorular
1. Önceliğimiz kesin olarak hash/saniye/mm² mi, yoksa joule/hash mi; bu iki hedefin ağırlığı nedir?
2. OpenROAD PNR akışında hedef saat, kısıtlar ve sıcaklık/gerilim corner varsayımları net mi?
3. Güç ölçümü için gerçekçi nonce aktivite dosyası (VCD) hazırlandı mı?
4. FPGA prototiplemesi için bütçe ve zaman kısıtı var mı, doğrudan ASIC shuttle'a mı gidilecek?

### 7. Tartışmada Uzlaşılamayan Noktalar
- **US10755242 Patenti:** Patentin metnine ulaşılamadığı ve paragraf/formül doğrulanamadığı için, "ertelenmiş A" mekanizmasının SAVRAN mimarisine birebir uygulanabilirliği ve alan maliyeti konusunda tam bir fikir birliği yoktur; hipotez düzeyindedir.
- **CSA/Retiming Getirisi:** Wallace/Dadda tarzı carry-save yaklaşımlarının sky130 standart hücre kütüphanesinde (`sky130_fd_sc_hd`) net bir kazanç sağlayıp sağlamayacağı, ek buffer maliyeti yüzünden tartışmalıdır.
