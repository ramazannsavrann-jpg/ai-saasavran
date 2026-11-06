# Teknik mimari

## Genel yapı

Tek dil (TypeScript), tek veritabanı (Supabase Postgres). Mikroservis yok.

```
[Next.js arayüz]  ──(Supabase Auth + RLS)──►  [Postgres]
                                                  ▲
[Zamanlanmış iş: haftalık ölçüm] ──service role───┘
        │
        └─► engine/pipeline ──► providers/{gemini, openai, perplexity}
```

Arayüz ve işçi yazıldı. Bulutta: Supabase (Auth + Postgres + PostgREST), arayüz statik dosya olarak (ör. Cloudflare Pages), işçi GitHub Actions'ta. Arayüz bağlantı bilgisini çalışma anında `/config.json`'dan okur.

## Veri türleri

| Tür | Kaynak | Grafikte |
|---|---|---|
| `live_search` | Sağlayıcı API'si, web araması açık | düz çizgi |
| `model_knowledge` | Sağlayıcı API'si, web araması kapalı | kesik çizgi |
| `simulated` | Demo Lab simülasyonu, dış çağrı yok | noktalı çizgi + taralı bant |

Tür, ölçüm isteğinde sunucu tarafından belirlenir (istemci seçemez). Rapor fonksiyonu türü zorunlu parametre olarak alır; türler aynı grafikte veya hesapta birleşemez. Veritabanı kısıtı, türün yöntem ve veri kaynağıyla tutarlı olmasını zorunlu kılar.

## Hata sınıfları

`unsupported_feature`, `quota_exceeded`, `auth_error`, `model_not_found`, `transient`, `invalid_request`. Yalnızca `transient` en fazla 2 kez tekrar denenir; diğerlerinde akış durur ya da soru atlanır. Arka arkaya 3 başarısız soruda akış durur. Ücretsiz katmanda hiçbir hata ücretli katmana geçişe yol açmaz.

## Test ortamı

`scripts/stack/stack.mjs` Docker olmadan gerçek Postgres 16, Supabase Auth (GoTrue) ve PostgREST ikililerini çalıştırır. Supabase bulutunun rol ve varsayılan yetkilerini (`anon`, `authenticated`, `service_role`, public şemada tüm tablolara erişim) birebir kopyalar; böylece testler en riskli varsayılanlar altında yapılır. Aynı betik CI'da da çalışır.

## Ölçüm akışı

Akış kodla yönetilir; LLM "orchestrator" kullanılmaz. Her çağrıdan önce sırayla:

1. **Önbellek** — aynı gün, aynı sağlayıcı/model/soru/tekrar → tekrar çağrılmaz.
2. **Ücretli API kilidi** — `ALLOW_PAID_API` kapalıysa ücretli sağlayıcı çalışmaz.
3. **Müşteri kotası** — workspace duraklatılmış mı, aylık çağrı kotası dolu mu, ücretli tavan aşılır mı.
4. **Ücretsiz sağlayıcı kotası** — Gemini ücretsiz katmanı için tüm müşteriler ortak günlük sınır (450).
5. **Görev bütçesi** — her run'ın kendi maliyet tavanı.
6. **Çağrı** — geçici hata (5xx) en fazla 2 kez tekrar denenir. Ücretsiz katmanda 429 → durur; ücretliye geçmez.
7. **Kayıt** — gerçek maliyet (ücretsizse 0) ve ücretli eşdeğeri ayrı yazılır; tavan aşıldıysa müşteri durdurulur.

## Sağlayıcı bağımsızlığı

Motor yalnızca `Provider` arayüzünü bilir (`providers/types.ts`). Her sağlayıcı bir `ProviderConfig` taşır: sağlayıcı, model, ücretsiz/ücretli, arama açık mı, fiyat kartı (kaynak ve kontrol tarihiyle), günlük ücretsiz sınır.

Model değiştirmek: ortam değişkeni (`GEMINI_MODEL`, `OPENAI_MODEL`). Yeni sağlayıcı eklemek: yeni adaptör dosyası + kayıt defterine bir satır. Metrik, kota ve rapor kodu değişmez.

| Sağlayıcı | Adaptör | Gerçek API testi | Ücret |
|---|---|---|---|
| Gemini | Yazıldı, birim testli | Anahtar eklenince CI'da çalışacak | Ücretsiz katman |
| OpenAI | Yazıldı, birim testli | Yok | Ücretli → kilitli |
| Perplexity | Bilinçli olarak yazılmadı | — | Ücretli → kilitli |

## Ölçüm yöntemi şeffaflığı

Her cevap şunlarla saklanır: sağlayıcı, model kimliği, yöntem (`api_with_search` / `api_no_search` / `simulation`), veri kaynağı (`live_api` / `simulated`), ücret katmanı, arama sorguları, kaynak URL'leri. Raporlar API sonuçlarının tüketici uygulamasıyla birebir aynı olmayabileceğini her zaman belirtir.

## Veritabanı

- **0001:** workspaces, workspace_members (owner/admin/editor/viewer), brands, prompts, runs, responses, mentions, cost_ledger. RLS ile izolasyon; simüle veri yalnızca `demo_lab`'e yazılabilir.
- **0002:** plans (kota ve tavanlar), workspace durumu (active/paused), ücret katmanı sütunları, `provider_daily_usage`, `workspace_monthly_usage` görünümü, `reserve_engine_call()` ve `record_engine_call()` (yalnızca sunucu çağırabilir).

## Bilinen sınırlar

- Gemini ücretsiz katman içeriği Google tarafından ürün geliştirmede kullanılır. Gizlilik metninde belirtilmeli; müşteri adına kişisel veri gönderilmemeli.
- Bellek-içi kota (`InMemoryUsageGate`) ile Postgres fonksiyonları aynı kuralları uygular ama iki ayrı koddur; DB bağlanınca tek kaynağa indirilecek.
- Marka eşleştirme kural tabanlı; belirsiz durumlar için LLM sınıflandırıcı henüz yok.
