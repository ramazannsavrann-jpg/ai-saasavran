# Sonraki aşama planı (21 Kasım 2026)

Bu plan `docs/STATUS.md`'deki açık konulardan ve bugünkü İngilizce arayüz taramasından çıkarıldı.
Her iş ayrı dalda, testler geçince PR ile birleştirilir (CLAUDE.md kuralı).

## 1. Hemen (bu hafta)

| # | İş | Neden | Bitiş ölçütü |
|---|----|-------|--------------|
| 1 | İngilizce arayüz kapanışı (`en-ui-translation` dalı) | Tarama bitti; kalan Türkçe alanlar bilerek seçildi | Build, `test:all` ve Playwright yeşil; PR birleşti |
| 2 | Paddle uçtan uca ödeme doğrulaması (test ortamı) | STATUS'ta "kod hazır, gerçek ödeme doğrulanmadı" | Test ödemesi tamamlanır, abonelik paket olarak açılır ve kayıt düşer |
| 3 | Resend uçtan uca e-posta teslimi | Haftalık özet e-postası gerçek gelen kutusuna ulaşmadı | Gerçek adrese teslim doğrulanır, spam durumu not edilir |
| 4 | Search Console takibi | Sitemap 13 Kasımda gönderildi, 248/252 URL keşfedildi | Dizine alma ve performans raporu bir hafta sonra kontrol edilir; yeni dizine girmeyen sayfalar listelenir |

## 2. Kısa vadede (2–3 hafta)

- **Hukuki metinler:** Gizlilik ve Kullanım koşulları avukat tarafından incelenmeden İngilizceye çevrilmez. İnceleme sonrası iki dilli sürüm çıkarılır. (`Legal.tsx`, `UPDATED` tarihi 7 Kasım 2026.)
- **Ölçüm doğruluğu:** Ücretsiz (Gemini) ölçümlerde "önerildi" tespiti kural tabanlıdır. LLM doğrulaması yalnız ücretli ölçümlerde var. Örnek kümesiyle kural–LLM karşılaştırması yapılır.
- **Canlı arama kapasitesi:** Yalnız Growth Lab'de açık olan 3 $ tavanlı deneme, müşteri paketlerine açılmadan önce maliyet ve kota kontrolü yapılır (CLAUDE.md: ücretli API yalnız `ALLOW_PAID_API=true` ile).
- **Ürün kataloğu:** SKU/varyant ölçümü yok. Önce tek ürün sayfası ölçümü, sonra varyant.

## 3. Orta vadede (1–2 ay)

- Bölge kısıtı: şu an marka ülke koduna dayanıyor; kesin uygulama için sunucu tarafında kullanıcı ülkesi gerekir.
- Perplexity: motor kodu hazır, anahtar gelene kadar kapalı. Anahtar gelince ilk ölçüm yalnız "SİMÜLASYON" değil gerçek veriyle yapılır.
- İngilizce arayüz için kalan veri: `question-pool.ts` ve `sectors.ts` sınıflandırma verisi olarak kalır; yalnız kullanıcıya görünen metinler çevrilir.

## 4. Sahibinin akşam yapacağı işler (toplu)

Bu işler elle yapılır; Claude tek tek adımlarını ayrı satırlarda hazırlar:

1. Paddle test hesabı ve webhook bağlantısının panelde açılması (adres ve secret adı ayrı satırda verilecek).
2. Resend için gönderen alan adının onayı.
3. Gerekirse GitHub Secrets'ta `WORKER_DISPATCH_TOKEN` tanımı (ölçümü hemen başlatma için; yoksa ölçüm saatlik sırada işlenir).

Ödeme, başvuru veya şirket işlemleri sahibinin onayı olmadan yapılmaz.

## 5. Ölçüt

Her aşama sonunda `docs/STATUS.md` güncellenir, gerçek test sonucu yazılır ve "ne denendi, ne doğrulanmadı" ayrıca belirtilir.
