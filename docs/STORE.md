# Uygulama içi ödeme (Google Play) — kurulum

Kod hazır (24 Kasım, `mobil-uygulama-temel` dalı). Ödeme açılmadan önce Play Console'da aşağıdakiler yapılır.
Kod tarafı: `web/src/mobile/store.ts` + `screens/Plans.tsx` (uygulama), `functions/api/store/` (sunucu doğrulama),
`supabase/migrations/0074_store_billing.sql` (veritabanı). Eklenti: `@capgo/native-purchases` (MPL-2.0, değiştirilmeden kullanılıyor; ağ çağrısı yok).

## Play Console ürünleri (kimlikler koddakiyle aynı olmalı)
Abonelikler (her birinde tek temel plan, aylık, otomatik yenilenen):
| Ürün kimliği | Temel plan | Fiyat (USD) | TL |
|---|---|---|---|
| `gumus` | `aylik` | 129.99 | 6.599 |
| `altin` | `aylik` | 249.99 | 12.599 |
| `platin` | `aylik` | 399.99 | 20.599 |

Tek seferlik (tüketilen) ürünler — ek soru paketi, yalnız hakkını bitiren abonelere, ay sonunda biter:
| Ürün kimliği | Hak | Fiyat (USD) |
|---|---|---|
| `ek_250` | 250 | 39.99 |
| `ek_500` | 500 | 69.99 |
| `ek_1000` | 1000 | 129.99 |

Elmas uygulamada satılmaz (yalnız site, Paddle).

## Ayarlar (GitHub Secrets; CI Cloudflare'e ve işçiye kendisi aktarır)
- `GOOGLE_SERVICE_ACCOUNT`: Firebase projesindeki hizmet hesabının JSON anahtarı. Tek hesap iki iş görür:
  telefon bildirimi (FCM) ve Google Play satın alma doğrulaması. Play Console → Kullanıcılar ve izinler'de bu hesabın
  e-postası davet edilir; izinler: "Finansal verileri, siparişleri ve iptal anketi yanıtlarını görüntüleme" ve
  "Siparişleri ve abonelikleri yönetme".
- `GOOGLE_SERVICES_JSON`: Firebase'deki Android uygulamasının `google-services.json` içeriği (bildirimleri derlemede açar).
- İsteğe bağlı `GOOGLE_PLAY_RTDN_KEY` + Pub/Sub (gerçek zamanlı bildirim). Kurulmazsa eşitleme her saat çalışır (gündüz işçi,
  gece `store-sync.yml`; `engine/src/store-sync.ts`): her abonelik 6 saatte bir, süresi geçen hemen, askıdaki 90 gün sorulur (0078).

## Akış
1. Uygulama fiyatları Google'dan okur (ülkenin parası). Satın alma çalışma alanı kimliğiyle işaretlenir (obfuscatedAccountId).
2. Uygulama satın alma anahtarını `/api/store/google`'a gönderir; sunucu Google'a sorar, alanın kimliğini karşılaştırır,
   veritabanına işler (`apply_store_subscription` / `grant_quota_pack`), sonra onaylar/tüketir. İşlenemeyen satın alma
   onaylanmaz; Google 3 gün içinde iade eder.
3. Yenileme, iptal, süre dolması RTDN ile gelir; iptalde paket ödenen dönemin sonuna kadar sürer.
4. Sitede (Paddle) aboneliği olan alan uygulamadan ikinci abonelik alamaz (`already_subscribed_web`).
