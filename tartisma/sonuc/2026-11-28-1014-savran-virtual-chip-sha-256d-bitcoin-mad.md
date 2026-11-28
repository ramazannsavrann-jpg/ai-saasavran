# Tartışma: SAVRAN Virtual Chip: SHA-256d (Bitcoin) madenci çekirdeğini yapay zekâ destekli tasarımla nasıl "aynı süreçte dünyanın en iyisi" yaparız?

Tarih: 2026-11-28T10:14:50.042Z · Tavan: 0.15 $

## Konu

SAVRAN Virtual Chip: SHA-256d (Bitcoin) madenci çekirdeğini yapay zekâ destekli tasarımla nasıl "aynı süreçte dünyanın en iyisi" yaparız?

Proje: Yapay zekâyla yeni işlemci mimarileri keşfeden sanal çip Ar-Ge platformu. İlk kanıtlanabilir deney SHA-256d madenci çekirdeği. Hedef ölçüt: aynı süreçte (sky130, 130 nm) en düşük J/TH (nJ/hash) ve en yüksek TH/s/mm² (MH/s/mm²). Sonraki adımlar FPGA ve Tiny Tapeout gibi fiziksel kanıtlar. Madencilik geliri hedef değil; şimdilik tamamen tasarım.

Bugüne kadar ölçülenler (hepsi referans modelle bit bit doğrulandı):
- Saat başına 1 nonce çift SHA-256 yapan tam açık (unrolled) madenci çekirdeği: PNR:sky130 → 147 MHz, 3,85 mm², 2,20 W, ≈11,0 nJ/hash, 38,3 MH/s/mm². Gücün %43'ü flip-flop, %28'i saat ağacı.
- Aşama başına 2 tur (RPS=2, flip-flop yarıya iner): PNR:sky130 → 82 MHz, 2,77 mm², ≈8,03 nJ/hash (-%27), 29,6 MH/s/mm² (-%23). Kombinasyonel güç en büyük paya çıktı (%43). RPS=3/4 sentezde daha iyi görünüyor (RPS=4: enerji -%60 SYNTH), PNR yapılmadı.
- AsicBoost (BIP 310, aynı mesaj çizelgesini 4 versiyonla paylaşma): SYNTH:sky130 → RPS=2 N=4'te yoğunluk +%16,4.
- h+K+W ön toplamalı pipeline: SYNTH'te +%13–24; PNR'de alan başına +%10,8 ama döngü başına enerji +%8,6 kötü.
- Reddedilen denemeler: carry-save ifade birleştirme (-%7), iş sabitlerini flip-flop'tan çıkarma (gecikme +%11).
- Erken eleme (son 3 tur, ~%2) referans modelde kanıtlı; RTL + formal kanıt bekliyor.
- Sentez sayıları PNR'ye göre ~2 kat iyimser çıktı.
- Aynı süreç referansları: ASICMiner 130 nm silikon ≈7,58 nJ/hash @1,05 V (330 MH/s, 2,5 W); açık bir sky130 çekirdeği ≈39 nJ, ≈9,2 MH/s/mm² (türetilmiş). sky130 kütüphanesi 1,28 V altını modellemiyor.

Planda bekleyenler: Intel tur yeniden zamanlama (patent US10755242), latch tabanlı pipeline (Bonanza Mine, ISSCC 2022), RPS=2'yi eşit saat sıkılığında yeniden PNR, AsicBoost PNR, Optuna ile otomatik tasarım arama motoru (analitik model → simülasyon → sentez → PNR kademesi), Sklansky/Kogge-Stone toplayıcı mutasyonları, yarım tur pipeline.

Araçlar: Yosys 0.33, OpenROAD (Docker), Verilator. PNR bir kez ~1,5 saat, Hetzner bulutta ≈0,50 $.

Soru: Ne yapmalıyız, neyi atlamalıyız, sırası ne olmalı? Kurucuya hangi soruları sormalıyız?

## Maliyet (API kullanım verisinden)

| Motor | Model | Maliyet ($) |
|---|---|---|
| ChatGPT | gpt-6-luna | 0.00190 |
| Perplexity | perplexity/sonar | 0.01626 |
| Gemini | gemini-3.5-flash-lite | 0.00892 |
| **Toplam** | | **0.02708** |

## Tutanak

### Tur 1 — ChatGPT

- **Önce ölçüm sözleşmesini düzeltin — araştırma değil, zorunlu kapı.** 2,20 W / 147 MHz = **15,0 nJ/hash** (her çevrimde bir hash varsayımıyla), verilen 11,0 nJ/hash değil. Benzer biçimde, pipeline’ın başlatma aralığı ve “hash” tanımı RPS sonuçlarını değiştirebilir. Güç, hash/çevrim, saat ve alan tanımlarını sabitleyin; aynı PNR raporundan tekrar hesaplayın. Bu düzelmeden başka sonuçları karşılaştırmayın.

- **1. PNR’de RPS taraması ve saat/throughput eşleştirmesi.** RPS=3/4’ü sentez kazancına göre değil, aynı kısıtlarla tam yerleştirme-yönlendirme ve saat ağacı sonrası değerlendirin. *Beklenti:* en iyi tasarıma kıyasla enerji/hash’te **%0–25**, yoğunlukta **%0–20** iyileşme; belirsizlik yüksek, kazanç çıkmaması da mümkün. Ölçüm: aynı köşe, kısıtlar ve hash/çevrim tanımıyla PNR. Kabul: referansa göre en az **%5** iyileşme ve doğrulama geçişi. Sentez sonuçlarını yalnız eleme için kullanın.

- **2. Saat gücü ve saat ağacını hedefleyin.** Saat ağacı + FF gücü toplamın büyük kısmı; fakat sürekli aktif, tamamen dolu bir çekirdekte clock-gating kazancı sınırlı olabilir. Boşta kalan/etkin olmayan kayıt gruplarında operand izolasyonu ve güvenli saat kapılama deneyin. *Beklenti:* toplam enerji/hash’te **%0–10**. Ölçüm: aktivite tabanlı güç, aynı PNR koşulları; kabul: hash başına **≥%5** azalma, frekans/alan hedefleri korunarak. Kaynak: *CMOS VLSI Design* (Weste & Harris), clock-gating/operand-isolation bölümleri.

- **3. AsicBoost’u fiziksel ölçün, sonra ölçekleyin.** N=4 sentez kazancı PNR kazancı değildir; alan ve yönlendirme maliyeti artabilir. *Beklenti:* yoğunlukta **%0–16**; enerji/hash’te iyileşme garanti değil. Ölçüm: aynı saat ve alan sınırında N=1/2/4 PNR; kabul: yoğunlukta **≥%5** artış, enerji/hash kötüleşmeden. Kaynak: BIP 310, *Reducing Hashing Power*.

- **4. Toplayıcıyı hedefli mutasyonlarla araştırın.** Rastgele arama yerine Brent–Kung, Sklansky ve Yosys/ABC’nin ürettiği yapıları kritik yola göre karşılaştırın. *Beklenti:* gecikme veya enerji/hash’te **%0–10**. Ölçüm: hücre haritası, kritik yol ve PNR; kabul: PPA’da **≥%5** kazanç, bit-bit eşdeğerlik. Kaynak: Brent & Kung (1982), *A Regular Layout for Parallel Adders*; Sklansky (1960), *Conditional-Sum Addition Logic*.

- **5. Arama motorunu çok hedefli yapın.** Optuna’yı doğrudan pahalı PNR’ye koşturmayın: önce formal/simülasyon, sonra sentez, en sonda PNR; Pareto cephesi enerji, yoğunluk ve frekansı birlikte tutsun. *Beklenti:* tek tasarımda doğrudan PPA kazancı öngörülemez; aynı bütçede **daha fazla adayın** PNR ile sınanması. Kabul: sabit bulut bütçesinde mevcut elle seçilmiş Pareto cephesini aşması.

**Kurucuya en önemli 3 soru**
1. “Hash”, nonce başına mı, yoksa çift SHA-256 başına mı; enerji hangi güç bileşenlerini içeriyor?
2. Birincil hedef hangisi: enerji/hash mi, MH/s/mm² mi; alan ve saat sınırları nedir?
3. PNR güç hesabı aktivite tabanlı mı, hangi köşe/gerilim/saat kısıtı kullanılıyor; tekrar üretilebilir mi?

### Tur 2 — Perplexity

- **Bonanza Mine (latch tabanlı pipeline):** Suresh ve ark., *“Bonanza Mine: an Ultra-Low-Voltage Energy-Efficient Bitcoin Mining ASIC,”* ISSCC 2022, s. 354–356. Bulabildiğim sunum özetlerinde 3 fazlı latch saatlemenin sıralı devre ve saat gücünü **%50’ye kadar** azalttığı; yarım frekanslı zamanlayıcının enerji verimliliğine **%10** katkı verdiği aktarılıyor. Bunlar Intel’in kendi tasarımına ait; sky130’a doğrudan taşınmış ölçüm değil. sky130 kütüphanesindeki latch hücreleri, saat fazları, zamanlama ve OpenROAD desteği belirleyici. Düşük riskli ilk deney: latch yaklaşımını ayrı dalda PNR ile sınamak; Intel yüzdelerini beklenen sky130 kazancı diye kullanmamak.  
  Kaynak: [ISSCC kaydı](https://dblp1.uni-trier.de/pid/316/3682.html); teknik özet [WikiChip](https://fuse.wikichip.org/news/6603/intel-unveils-bonanzamine-a-bitcoin-accelerator-asic/).

- **Tur yeniden zamanlama:** Intel **US10755242** için verilen başlığa/tekniğe yönelik doğrulanabilir patent sayfası veya ölçülmüş kazanç bu arama sonuçlarında çıkmadı. **Emin değilim**: patentin tam iddiası ve sizin RTL’ye uygulanabilirliği doğrulanmadan öncelik vermeyin. Patentteki adımın adı, bağımsız istemi ve SHA-256 turlarına uygulanışını bulup, ardından RTL eşdeğerliği ve PNR karşılaştırması yapın. Patentteki teorik fikir, fiziksel PPA kazancı kanıtı değildir.

- **AsicBoost:** Hanke, *“AsicBoost: A Speedup for Bitcoin Mining,”* arXiv:1604.00575. Makale yaklaşık **%20 hızlanma** bildiriyor; bu, iş öğelerinin/ön işlemenin paylaşılmasına dayanan yöntem için genel iddia, sizin RPS=2/N=4 RTL’nizde ölçülmüş kazanç değil. Çekirdeğinizde ilk doğrulama zaten **SYNTH:sky130 +%16,4 yoğunluk**; bir sonraki kanıt **PNR:sky130** olmalı. N=1/2/4’ü aynı kısıt ve iş tanımıyla karşılaştırın.  
  Kaynak: [arXiv PDF](https://arxiv.org/pdf/1604.00575).

- **Açık sky130 referansları:** [LDFranck/SHA-256](https://github.com/LDFranck/SHA-256), *“Custom ASIC Design for SHA-256 Using Open-Source Tools”*: OpenLANE/sky130, yayımlanan özetinde **97,89 MHz** ve **104.585 µm²**; Bitcoin SHA-256d madenci çekirdeğiyle doğrudan karşılaştırılabilir olmayabilir. [CDragon123-code/SHA-256](https://github.com/CDragon123-code/SHA-256) de sky130 RTL→GDSII iddiası ve PPA tabloları sunuyor; bağımsız doğrulanmış sonuç muamelesi yapmayın. Her ikisi de sizin hash/çevrim, çift SHA ve güç tanımınızla eşleştirilmeden “daha iyi” kıyas değildir.

- **Önerilen sıra:** ölçüm sözleşmesi → mevcut RPS adaylarını eşit kısıtlarla PNR → AsicBoost PNR → latch prototipi → patent incelemesi ve ancak somut RTL dönüşümü varsa deney. Kıyaslarda **SIM / SYNTH:sky130 / PNR:sky130** etiketlerini ayrı tutun; bu kaynaklarda sizin tasarımınız için yeni bir **PNR:sky130** kazancı kanıtlanmış değil.

### Tur 3 — Gemini

- **Sert Denetim ve Puanlama:**
  - *ChatGPT ve Perplexity'nin "Ölçüm Sözleşmesi" / Güç-Alan Tanımları:* **10/10**. Sentez iyimserliğini yakalamak ve güç/hash birliğini sağlamak kritik. Atlanırsa tüm Ar-Ge hayal olur.
  - *RPS=3/4 ve AsicBoost PNR Doğrulaması:* **8/10**. Sentezden PNR'ye geçişte routing patlaması riski yüksek; ancak OpenROAD ile hemen test edilebilir, düşük maliyetli.
  - *Intel Patentleri (US10755242) ve Bonanza Mine Latch Tasarımı:* **3/10**. 130 nm açık kütüphanede (sky130_fd_sc_hd) resmi latch- tabanlı clock gating ve özel timing closure zorlukları OpenROAD'u tıkar. Şu an zaman kaybettirir.
  - *Optuna Otomatik Arama Motoru:* **5/10**. PNR döngüsü 1.5 saat sürerken Optuna'yı doğrudan PNR'ye bağlamak bulut bütçesini tüketir; sadece sentez/simülasyon katmanında kalmalı.

- **Neyi Atlamalıyız?**
  - Intel patentleri ve 3 fazlı latch mimarilerini *SKY130 süreçinde* denemeyi derhal bırakın. Açık kaynak araç zinciri ve SkyWater 130 nm PDK bu karmaşıklığı hatasız kapatacak olgunlukta değil.

- **Gerçekçi Sıralama:**
  1. *SIM/SYNTH:* Hash ve enerji birim tanımını sabitleyin (Tur 1 şartı).
  2. *PNR:sky130:* Mevcut RPS=2 ve AsicBoost N=4 tasarımlarını eşit saat kısıtlarıyla koşturun.
  3. *PNR:sky130:* Toplayıcı mutasyonları (Brent-Kung vs.).

- **Dünyanın En İyisi İçin Kesin Ölçüt:**
  - *Kabul Ölçütü:* `PNR:sky130` seviyesinde **< 7,50 nJ/hash** ve **> 45 MH/s/mm²**. 
  - *Nasıl Ölçülecek:* OpenROAD `sta` ve `power` raporları (VCD tabanlı aktivite ile), aynı 1.28 V sky130 kütüphane köşesinde.

- **Kurucuya Sorular:**
  1. "1,5 saatlik PNR süresi ve 0,50$ maliyet göz önüne alındığında, Optuna'yı PNR döngüsüne sokmadan önce hangi Python tabanlı analitik modelle filtreleyeceksiniz?"
  2. "Açık kütüphanedeki flip-flop güç yüzdesini (%43) düşürmek için OpenROAD üzerinde clock-gating ekleme bütçemiz nedir?"

### Tur 4 — ChatGPT

- **Önce ortak değerlendirme sözleşmesini sabitleyin.** “Hash”i bir **çift SHA-256** olarak tanımlayın; her tasarım için doğrulanmış başlatma aralığından hash/s hesaplayın ve `enerji/hash = toplam güç ÷ hash/s` kullanın. Böylece verilen 2,20 W ve 147 MHz, her çevrimde bir hash varsayımıyla **15,0 nJ/hash** eder; **11,0** sonucu farklı bir throughput veya güç tanımı gerektiriyor. Güç kapsamını, köşe/gerilimi, saat kısıtlarını ve yerleşim alanı tanımını da sabitleyin.  
  **Kabul:** Referans raporları aynı verilerle yeniden hesaplanabilir; RTL bit-bit doğrulanır. **Seviye:** SIM + mevcut PNR raporlarının denetimi. **Emek/maliyet:** 2–4 saat; bulut $0.

- **1. RPS taraması — önce mevcut adaylar.** **Hipotez:** RPS=3/4, flip-flop ve saat yükünü azaltarak RPS=2’ye göre enerji/hash’i iyileştirebilir; sentez kazancı PNR kazancı olmayabilir. **Değiştirilecek:** RPS=2/3/4; aynı kısıtlarla önce SYNTH, sonra yalnız en umut verici adayları PNR. **Beklenti:** PNR’de enerji/hash **%0–25**, yoğunluk **%0–20** iyileşme; garanti değil. **Kabul:** Doğrulama geçsin, enerji/hash en az **%5** düşsün ve yoğunlukta kabul edilemez kayıp olmasın. **Emek/maliyet:** 4–8 saat; PNR adayı başına yaklaşık 1,5 saat ve **$0,50**.

- **2. AsicBoost PNR.** **Hipotez:** Mesaj çizelgesini paylaşmak N=4’teki sentez yoğunluğu kazanımının en az bir kısmını korur. **Değiştirilecek:** RPS=2’de N=1/2/4; aynı PNR koşulları. **Beklenti:** yoğunluk **%0–16**, enerji/hash etkisi belirsiz. **Kabul:** N=4, en az **%5** yoğunluk artışı sağlasın; enerji/hash kötüleşmesin. **Seviye:** SIM/SYNTH elemesi → PNR. **Emek/maliyet:** 4–8 saat; PNR başına **$0,50**. Kaynak: Hanke, *AsicBoost: A Speedup for Bitcoin Mining* (2016).

- **3. Erken eleme RTL deneyi.** **Hipotez:** Son üç turu atlamak iş miktarını azaltır; uç durumlar bit-bit doğrulanabilir. **Değiştirilecek:** yalnız ilgili RTL kontrolü. **Kabul:** formal/eşdeğerlik ve referans vektörleri geçsin; PNR’de **≥%2** enerji/hash iyileşsin. **Seviye:** SIM/formal → PNR. **Emek/maliyet:** 3–6 saat; PNR **$0,50**.

- **4. Toplayıcı mutasyonu.** Sklansky ve Kogge–Stone seçeneklerini kritik yoldaki toplamada karşılaştırın; sonuç çıkmazsa Brent–Kung ekleyin. **Beklenti:** gecikme veya enerji/hash **%0–10**. **Kabul:** PNR’de **≥%5** kazanç, doğrulama geçişi. Kaynaklar: Sklansky (1960), *Conditional-Sum Addition Logic*; Kogge & Stone (1973), *A Parallel Algorithm for the Efficient Solution of a General Class of Recurrence Equations*. **Emek/maliyet:** 6–10 saat; PNR başına **$0,50**.

- **5. Otomatik arama; 6. tur yeniden zamanlama/latch şimdilik beklesin.** Arama motorunu yalnız ilk dört deneyden sonra, SIM/SYNTH elemesi ve sabit bütçeli PNR ile kurun; **kabul**, aynı PNR bütçesinde mevcut Pareto cephesini aşmasıdır. Patent **US10755242** için uygulanabilir RTL dönüşümü doğrulanmadan, latch deneyi için de sky130 saatleme akışı gösterilmeden öncelik vermeyin. **Emek/maliyet:** arama prototipi 8–16 saat, bulut $0; sonraki PNR’ler yaklaşık **$0,50**/aday.

### Tur 5 — Perplexity

- **Canlı arama sonucu — SHA-256 madenciliğiyle ilgili önceki çalışmalar:** İlgili teknikler literatürde ve patentlerde var; ancak bulduğum sonuçlar bunların sizin **RPS=2/3/4 sky130 RTL’nizde PNR ile ölçülmüş** olduğunu göstermiyor.
  - **AsicBoost:** Timo Hanke, *AsicBoost: A Speedup for Bitcoin Mining* (2016), mesaj çizelgesini ortak mesaj parçasına sahip iş öğeleri arasında paylaşmayı açıklıyor ve yaklaşık %20 hızlanma iddiasında bulunuyor. Bu, belirli bir tasarımınızın PPA sonucu değil. Paylaşılan çizelge/mantık ve ek iş öğelerinin alan, yönlendirme ve güç maliyeti ayrıca ölçülmeli. Kaynak: [arXiv](https://arxiv.org/pdf/1604.00575).
  - **Kısmi sabitleme ve erken tur hesabını azaltma:** Intel’in *Optimized SHA-256 datapath for energy-efficient high-performance…* patent başvurusu (US20180006808A1), sabit SHA-256 parametrelerini donanıma bağlama ve tekrarlanan ilk turları azaltma/kapılama fikirlerini anlatıyor; yaklaşık %15 iddiası patentteki tasarım bağlamına ait. Bu, “son üç turu atlama” fikrinin doğruluğunu veya genel PPA kazancını kanıtlamıyor. Kaynak: [Google Patents](https://patents.google.com/patent/US20180006808A1/en).
  - **Pipeline:** Bulunan açık akademik tasarım raporu, SHA-256 donanımında farklı pipeline yaklaşımlarını karşılaştırıyor; fakat aynı hash tanımı ve sky130 koşullarında sizin RPS deneylerinizle karşılaştırılabilir bir sonuç değil. Kaynak: [ASIC Design for Bitcoin Mining](https://zwtaoumich.github.io/paper/EECS570_Final_Report.pdf).

- **Açık sky130 SHA-256 referansı var; doğrulanmış açık Bitcoin madencisi bulamadım.** LDFranck’in *Custom ASIC Design for SHA-256 Using Open-Source Tools* çalışması sky130/OpenLANE için 97,9 MHz, 104.585 µm² ve güç tablosu bildiriyor. Bu, genel SHA-256 hızlandırıcısı; özetindeki iş yükü ve çevrim sayısı Bitcoin SHA-256d madenci çekirdeğiyle aynı değil. Dolayısıyla doğrudan rakip ya da J/hash karşılaştırması saymayın. Kaynak: [makale](https://repositorio.usp.br/directbitstream/bdf8c290-38cc-4ec7-8785-631b4434a5a0/computers-13-00009-v2.pdf), [kod deposu](https://github.com/LDFranck/SHA-256).

- **İlk üç deney için son sıra:**
  1. **Ölçüm sözleşmesini kapatın**; verilen 2,20 W / 147 MHz, çevrim başına bir çift hash ise 15,0 nJ/hash eder. Güç ve throughput tanımları uzlaşmadan PPA kıyası kabul etmeyin.
  2. **RPS taramasını PNR’ye taşıyın:** RPS=2/3/4’ü aynı saat, köşe ve alan tanımıyla kıyaslayın. SYNTH kazancını yalnız eleme için kullanın; RPS=4’ün PNR sonucu yok.
  3. **AsicBoost N=1/2/4 PNR:** Aynı koşullarda önce yoğunluğu, sonra nJ/hash’i karşılaştırın. Sentezdeki +%16,4’ü PNR kazancı diye sunmayın.

- **Erken eleme** bu ilk üç içinde değil: Son üç turu atlamanın referans modelde doğrulanması, RTL’nin doğru olduğu anlamına gelmez. Önce bit-bit/formal eşdeğerlik; ayrıca kabul testinde gerçek hash/çevrim ve PNR güç farkı aranmalı.

- **Kaynakların sınırı:** Aramada, açıkça sky130’da PNR yapılmış SHA-256d Bitcoin madencisi veya RPS=2/3/4’ü karşılaştıran bağımsız bir açık çalışma bulamadım. Bu yüzden “dünyanın en iyisi” iddiası için henüz sağlam, eşdeğer bir açık sky130 referansı yok.

### Tur 6 — Gemini

### 1. Gerçekçi Hedef ve Ölçüt
- **Hedef:** SkyWater sky130 (130 nm) sürecinde, aynı mimari kategorisindeki açık kaynaklı referanslara karşı en düşük $nJ/hash$ ve en yüksek $MH/s/mm^2$ değerine ulaşmak.
- **Kime Karşı:** Açık kaynaklı `LDFranck/SHA-256` (OpenLANE/sky130: 97,9 MHz, 104.585 µm²) ve bilinen akademik sky130 türevleri. ASICMiner 130 nm ticari silikon verisi (~7,58 nJ/hash) nihai ticari üst sınır referansıdır.
- **Kabul Kriteri:** PNR aşamasında **< 7,50 nJ/hash** ve **> 45 MH/s/mm²** sağlandığında "sky130 sürecinin en iyisi" iddiası kurulabilir. Sentez (SYNTH) sayıları fiziksel performans olarak sunulamaz.

---

### 2. Öncelikli Deneyler (Sırasıyla)
1. **Ölçüm Sözleşmesinin Sabitlenmesi:** 
   - *Hipotez:* $Hash$ birimi çift SHA-256 (nonce başına) olarak tanımlanmalıdır. 2,20 W / 147 MHz hesabı düzeltilmeli; güç, alan, gerilim (1.28 V) ve throughput tanımları OpenROAD `power`/`sta` raporlarından netleştirilmelidir.
   - *Kabul:* Tüm ekip ve referans modeller arasında hesap tutarlılığı ($SIM + PNR$).
2. **RPS Taraması PNR Doğrulaması (RPS=2/3/4):**
   - *Hipotez:* RPS=3/4 sentez kazancı (enerji -%60) PNR'de yönlendirme yoğunluğu nedeniyle törpülense bile enerji/hash'i iyileştirir.
   - *Kabul:* Aynı kısıtlarla `PNR:sky130` sonucunda enerji/hash'te $\ge \%5$ düşüş, yoğunlukta kabul edilemez kayıp olmaması.
3. **AsicBoost PNR (N=1/2/4):**
   - *Hipotez:* BIP 310 mesaj paylaşımı, PNR aşamasında alan yoğunluğunu $\ge \%16$ artırır.
   - *Kabul:* Yoğunlukta $\ge \%5$ artış, enerji/hash oranının bozulmaması (`PNR:sky130`). Kaynak: Hanke, *AsicBoost* (arXiv:1604.00575).
4. **Toplayıcı Mutasyonları (Brent-Kung / Sklansky):**
   - *Hipotez:* Kritik yoldaki toplayıcı mimarisi değiştirilerek gecikme azaltılabilir.
   - *Kabul:* `PNR:sky130` aşamasında PPA'da $\ge \%5$ kazanç, bit-bit eşdeğerlik. Kaynak: Brent & Kung (1982).
5. **Erken Tur Eleme Deneyi:**
   - *Hipotez:* Son 3 turun referans modeldeki atlanması RTL seviyesinde mantıksal olarak güvenlidir.
   - *Kabul:* Formal doğrulama ve referans vektör testlerinden geçiş, `PNR`'de $\ge \%2$ enerji/hash iyileşmesi.
6. **Optuna Otomatik Tasarım Arama Motoru:**
   - *Hipotez:* Çok hedefli Pareto optimizasyonu (enerji, yoğunluk, frekans), manuel seçimden daha iyi bir tasarım noktası bulur.
   - *Kabul:* Sabit bulut bütçesinde ($0,50/koşu) mevcut elle seçilmiş Pareto cephesinin aşılması.

---

### 3. Altyapı ve Araç Eksikleri
- **Otomatik Arama Kademesi:** Optuna doğrudan 1,5 saatlik PNR döngülerine bağlanmamalı; önce Python tabanlı analitik model ve Yosys/ABC senteziyle filtrelenmeli, yalnızca filtreyi geçen adaylar OpenROAD PNR'ye gönderilmelidir.
- **Formal Doğrulama:** Erken tur eleme ve toplayıcı mutasyonları için Yosys `sby` (SymbiYosys) tabanlı eşdeğerlik denetimi entç edilmelidir.
- **PNR Otomasyonu:** OpenROAD Docker konteynerinde TCL betikleriyle metrik toplama otomatikleştirilmelidir.

---

### 4. Riskler ve Yanıltıcı Tuzaklar
- **Sentez İyimserliği:** Sentez sonuçları PNR'ye göre ~2 kat iyimserdir; yönlendirme (routing) tıkanıklığı alan ve gecikmeyi patlatabilir.
- **Güç Hesaplama Hatası:** Aktivite (VCD) dosyası olmadan yapılan güç tahminleri yanıltıcıdır; PNR güç raporları gerçekçi anahtarlama aktivitesiyle alınmalıdır.
- **Kütüphane Sınırı:** sky130 kütüphanesinin 1.28 V altında modellenmemesi nedeniyle voltaj düşürme (voltage scaling) deneyleri simülasyonda kalmalı, silikon dışı aşırı iyimser iddialardan kaçınılmalıdır.

---

### 5. Fiziksel Kanıta Giden Yol ve Maliyeti
- **FPGA Prototipleme:** RTL, bir açık kaynak FPGA akışıyla (Yosys + nextpnr + ECP5/Artix-7) doğrulanmalı; gerçek donanım saat frekansı ve akım tüketimi gözlemlenmelidir. *Tahmini Maliyet:* ~$50-100 (Geliştirme kartı).
- **Tiny Tapeout / Silikon:** Tasarım Tiny Tapeout (SkyWater 130 nm shuttle) üzerinden silikona gönderilebilir. *Tahmini Maliyet:* Shuttle katılım ücreti (~$2.000 - $10.000 arası, proje modeline bağlı).

---

### 6. Kurucuya Sorulacak Sorular
1. "Hash" tanımınız tam olarak nonce başına mı, yoksa çift SHA-256 başına mı? Güç hangi bileşenleri kapsıyor?
2. 1,5 saatlik PNR süresi ve $0,50 bulut maliyeti göz önüne alındığında, Optuna'yı PNR döngüsüne sokmadan önce hangi Python tabanlı analitik modelle filtreleyeceksiniz?
3. Güç tüketiminin %43'ünü oluşturan flip-flop oranını düşürmek için OpenROAD üzerinde clock-gating veya register bank optimizasyonu bütçeniz nedir?
4. Intel patentleri (US10755242) ve 3 fazlı latch mimarilerini SkyWater 130 nm açık kütüphanesinde denemek yerine neden kanıtlanmış RPS ve AsicBoost PNR optimizasyonlarına öncelik vermiyoruz?
5. PNR güç hesabı aktivite tabanlı (VCD) mi yapılıyor, yoksa varsayılan anahtarlama faktörlerine mi dayanıyor?

---

### 7. Tartışmada Uzlaşılamayan Noktalar
- **Intel Patentleri ve Latch Mimarileri:** ChatGPT ve Gemini, sky130 açık kütüphanesinin ve OpenROAD'un karmaşık latch tabanlı saatleme/zamanlama kapatma (timing closure) zorluklarını kaldıramayacağını, bunun zaman kaybettireceğini savunurken; proje planında bu konu hâlâ bekleyen bir başlık olarak durmaktadır. Uzlaşma, bu tekniklerin SkyWater 130 nm için henüz olgunlaşmadığı yönündedir.
