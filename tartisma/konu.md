MOD: arge
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
