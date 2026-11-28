MOD: arge
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
