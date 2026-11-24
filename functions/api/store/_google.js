// Google Play satın alma doğrulaması (mobil uygulama, 24 Kasım). Satın alma her zaman Google'a sorulur;
// uygulamanın gönderdiği bilgiye güvenilmez. Hizmet hesabı yalnız Cloudflare ortam değişkeninde: GOOGLE_PLAY_SERVICE_ACCOUNT (JSON).
export const PACKAGE = "com.aisaasavran.app";
export const SUB_PRODUCTS = ["gumus", "altin", "platin"];
export const PACK_PRODUCTS = ["ek_250", "ek_500", "ek_1000"];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = (s) => b64u(new TextEncoder().encode(s));

/** Hizmet hesabıyla kısa ömürlü erişim anahtarı (RS256 JWT → OAuth). */
export async function accessToken(sa, fetchFn = fetch, now = Date.now()) {
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const iat = Math.floor(now / 1000);
  const unsigned = `${b64uStr(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64uStr(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 }))}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const r = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64u(sig)}` }).toString(),
  });
  if (!r.ok) throw new Error(`google_token_${r.status}`);
  return (await r.json()).access_token;
}

const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases`;

/** Abonelik (subscriptionsv2): durum, bitiş, ürün, alan kimliği (obfuscatedExternalAccountId = çalışma alanı). */
export async function getSubscription(at, token, fetchFn = fetch) {
  const r = await fetchFn(`${API}/subscriptionsv2/tokens/${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${at}` } });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new Error(`google_sub_${r.status}`);
  return r.json();
}

/** subscriptionsv2 cevabını veritabanı alanlarına çevirir. */
export function subscriptionFields(s) {
  const item = (s?.lineItems ?? []).find((li) => SUB_PRODUCTS.includes(li?.productId)) ?? s?.lineItems?.[0] ?? {};
  return {
    product: item.productId ?? null,
    state: s?.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED",
    expiry: item.expiryTime ?? null,
    auto: item.autoRenewingPlan ? item.autoRenewingPlan.autoRenewEnabled !== false : false,
    order: s?.latestOrderId ?? null,
    linked: s?.linkedPurchaseToken ?? null,
    account: s?.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    acknowledged: s?.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
    test: !!s?.testPurchase,
  };
}

export async function ackSubscription(at, product, token, fetchFn = fetch) {
  const r = await fetchFn(`${API}/subscriptions/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}:acknowledge`, {
    method: "POST", headers: { Authorization: `Bearer ${at}`, "content-type": "application/json" }, body: "{}",
  });
  if (!r.ok && r.status !== 400) throw new Error(`google_ack_${r.status}`); // 400: zaten onaylı
}

/** Tek seferlik ürün (ek soru paketi): purchaseState 0 = ödendi. */
export async function getProduct(at, product, token, fetchFn = fetch) {
  const r = await fetchFn(`${API}/products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}`, { headers: { Authorization: `Bearer ${at}` } });
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw new Error(`google_product_${r.status}`);
  return r.json();
}

export async function consumeProduct(at, product, token, fetchFn = fetch) {
  const r = await fetchFn(`${API}/products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}:consume`, {
    method: "POST", headers: { Authorization: `Bearer ${at}` },
  });
  if (!r.ok && r.status !== 400) throw new Error(`google_consume_${r.status}`);
}

/** Sunucu yetkisiyle veritabanı fonksiyonu. */
export async function serviceRpc(env, fn, args, fetchFn = fetch) {
  const r = await fetchFn(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`db_${fn}_${r.status}`);
  return r.json();
}

/** Giriş yapmış kullanıcının kimliği (Supabase oturum anahtarı Supabase'e sorularak doğrulanır). */
export async function currentUser(request, env, fetchFn = fetch) {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetchFn(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth } });
  if (!r.ok) return null;
  const u = await r.json();
  return UUID.test(String(u?.id ?? "")) ? u.id : null;
}

/**
 * Uygulamadan gelen satın almayı doğrular ve uygular.
 * input: { kind: "sub"|"pack", product, token, workspace }. Dönen: { result } (veritabanı sonucu) ya da { error }.
 */
export async function verifyPurchase({ env, user, input, fetchFn = fetch }) {
  const { kind, product, token, workspace } = input ?? {};
  if (!UUID.test(String(workspace ?? "")) || typeof token !== "string" || token.length < 10 || token.length > 4096) return { error: "bad_input", status: 400 };
  if (kind === "sub" ? !SUB_PRODUCTS.includes(product) : kind === "pack" ? !PACK_PRODUCTS.includes(product) : true) return { error: "bad_product", status: 400 };
  if (!env.GOOGLE_PLAY_SERVICE_ACCOUNT) return { error: "store_not_configured", status: 503 };
  const at = await accessToken(JSON.parse(env.GOOGLE_PLAY_SERVICE_ACCOUNT), fetchFn);
  if (kind === "sub") {
    const s = await getSubscription(at, token, fetchFn);
    if (!s) return { error: "not_found", status: 404 };
    const f = subscriptionFields(s);
    if (f.product !== product) return { error: "product_mismatch", status: 400 };
    // Satın alma uygulamada bu çalışma alanı adına başlatıldı mı (obfuscatedAccountId = alan kimliği)
    if (f.account && f.account !== workspace) return { error: "account_mismatch", status: 403 };
    const result = await serviceRpc(env, "apply_store_subscription", {
      p_platform: "google_play", p_token: token, p_workspace: workspace, p_user: user, p_product: f.product, p_state: f.state,
      p_expiry: f.expiry, p_auto: f.auto, p_order: f.order, p_linked: f.linked,
    }, fetchFn);
    // Onay (3 gün içinde yapılmazsa Google parayı iade eder): yalnız veritabanına işlendiyse
    if (result === "ok" && !f.acknowledged) await ackSubscription(at, f.product, token, fetchFn);
    return { result };
  }
  const p = await getProduct(at, product, token, fetchFn);
  if (!p) return { error: "not_found", status: 404 };
  if (p.purchaseState !== 0) return { error: "not_paid", status: 402 };
  if (p.obfuscatedExternalAccountId && p.obfuscatedExternalAccountId !== workspace) return { error: "account_mismatch", status: 403 };
  const result = await serviceRpc(env, "grant_quota_pack", { p_platform: "google_play", p_token: token, p_workspace: workspace, p_user: user, p_product: product }, fetchFn);
  // Paket verildiyse ya da zaten verildiyse tüket (tekrar alınabilsin). Verilemediyse tüketme: Google 3 gün sonra iade eder.
  if (result === "ok" || result === "already_granted") await consumeProduct(at, product, token, fetchFn);
  return { result };
}
