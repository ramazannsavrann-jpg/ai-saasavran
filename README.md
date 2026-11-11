# AI SaaSavran

Markaların ChatGPT, Gemini ve Perplexity cevaplarında ne kadar görünür olduğunu ölçen self-service SaaS. İlk pazar Türkiye; işletmeler ve ajanslar.

**Sürüm:** v0.6 (11 Kasım 2026) · **Durum:** canlıda (aisaasavran.com). Gemini aramasız ölçüm ücretsiz pakette; ChatGPT canlı aramalı ölçüm abonelerde. Ödeme (Paddle) kodu hazır, gerçek ödemeyle uçtan uca henüz denenmedi. Ayrıntı: [docs/STATUS.md](docs/STATUS.md)

## Temel kurallar (kodla zorlanır)

| Kural | Nerede |
|---|---|
| `ALLOW_PAID_API=true` olmadan hiçbir ücretli API çağrılmaz | `providers/registry.ts` + `pipeline.ts` (iki ayrı kontrol) |
| Her müşterinin aylık çağrı kotası ve ücretli maliyet tavanı var; aşılınca otomatik durur | `usage.ts`, `reserve_engine_call()` |
| Ücretsiz ve ücretli kullanım ayrı kaydedilir ve raporlanır | `cost_ledger.billing`, `workspace_monthly_usage` |
| Simüle sonuç yalnızca Demo Lab'e yazılabilir, raporda "SİMÜLASYON" etiketi taşır | DB tetikleyicisi + `report.ts` |
| Gerçek ve simüle sonuç aynı raporda karışamaz | `report.ts` |
| Müşteri verileri birbirinden izole | Postgres RLS |
| Sağlayıcılar bağımsız; yeni model = yeni adaptör, motor değişmez | `engine/src/providers/` |

## Klasörler

```
engine/src/metrics.ts        Anılma, öneri, kaynak, rakip payı, güven aralığı
engine/src/pipeline.ts       Ölçüm akışı (önbellek → kilit → kota → bütçe → çağrı)
engine/src/usage.ts          Müşteri kotası ve maliyet tavanı
engine/src/report.ts         Rapor etiketleme kuralları
engine/src/pricing.ts        Paket maliyet hesabı
engine/src/providers/        gemini, openai, claude, perplexity, simulated, mock, registry
engine/src/worker.ts         Ölçüm işçisi (kuyruk → sağlayıcı → kota → kayıt)
supabase/migrations/         0001–0012 (son: 0012 sağlamlaştırma)
engine/src/insights.ts       Kaynak egemenliği ve kayıp nedeni kanıtları (LLM yok)
web/                         Arayüz (Vite + React + Supabase JS), Türkçe, mobil öncelikli
scripts/stack/               Docker'sız test ortamı: Postgres 16 + Supabase Auth + PostgREST
e2e/                         Mobil uçtan uca testler (Playwright)
scripts/                     İşçi, DB testleri, gizli bilgi taraması, Gemini testi, fiyat raporu
docs/                        Mimari, fiyatlandırma, durum, yayına alma (DEPLOY.md)
```

## Testleri çalıştırma

```
npm ci
npm run test:all      # gizli bilgi + motor + DB + entegrasyon (gerçek yığın)
npx playwright test   # mobil uçtan uca (önce: npm run build --prefix web)
npm run stack         # test ortamını başlatır: http://127.0.0.1:54321
npm run pricing       # paket maliyet tablosu
npm run smoke:gemini  # gerçek Gemini çağrısı (GEMINI_API_KEY gerekir, 1 ücretsiz çağrı)
```

GitHub'da her push'ta CI otomatik çalışır.

## Gemini anahtarını ekleme (telefondan)

1. aistudio.google.com → **Get API key** → anahtar oluştur. Faturalandırma **açma** (ücretsiz katman).
2. GitHub'da bu depo → **Settings → Secrets and variables → Actions → New repository secret**
3. Ad: `GEMINI_API_KEY`, değer: anahtar. Kaydet.
4. Herhangi bir değişiklik push edildiğinde `gemini-smoke` işi gerçek bağlantıyı test eder.

Anahtarı asla dosyaya, sohbete veya commit'e yazmayın. `.env.example` yalnızca değişken adlarını gösterir.
