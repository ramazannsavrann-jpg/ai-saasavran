# Yayına alma (0 $, telefondan)

Tüm testler geçtiğinde GitHub, `main` dalındaki her güncellemede otomatik olarak:
1. Supabase veritabanına yeni migration'ları uygular (`scripts/migrate.mjs`; her dosya bir kez, tek işlemde).
2. Arayüzü derler, `config.json` ve güvenlik başlıklarını yazar, Cloudflare Pages'e yayınlar.

Ayarlar eksikse bu adımlar hata vermeden atlanır.

## GitHub Secrets

Depo → Settings → Secrets and variables → Actions → New repository secret

| Ad | Nereden | Gizli mi? |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → Data API → Project URL | Hayır |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API Keys → **Publishable** key (`sb_publishable_…`) veya eski **anon** key | Hayır (tarayıcıya gider) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys → **Secret** key (`sb_secret_…`) veya eski **service_role** | **Evet** |
| `SUPABASE_DB_URL` | Supabase → üstteki **Connect** → **Session pooler** adresi, `[YOUR-PASSWORD]` yerine veritabanı şifresi | **Evet** |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers & Pages → sağdaki Account ID | Hayır |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → Custom → izin: *Account / Cloudflare Pages / Edit* | **Evet** |
| `GEMINI_API_KEY` | (zaten ekli) | **Evet** |

Koruma: `web-release.mjs` gizli anahtar yanlışlıkla `SUPABASE_ANON_KEY` alanına girilirse yayını durdurur. Gizli bilgi taraması her push'ta çalışır.

## İlk yayından sonra Supabase'de bir ayar

Authentication → URL Configuration → **Site URL** = Cloudflare'ın verdiği adres (ör. `https://ai-saasavran.pages.dev`). Doğrulama ve şifre sıfırlama e-postalarındaki bağlantılar buraya gider.

## Bilinen sınırlar (ücretsiz katmanlar)

- Supabase ücretsiz projesi 7 gün hiç kullanılmazsa duraklatılır; panelden tek tıkla açılır.
- Supabase'in yerleşik e-posta gönderimi saatte birkaç e-postayla sınırlıdır; gerçek müşteri öncesi özel SMTP gerekir.
- Ölçüm işçisi GitHub Actions'ta saatte bir çalışır (İstanbul 08–23); ölçüm sonucu en geç ~1 saatte gelir.
