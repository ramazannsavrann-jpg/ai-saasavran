// Paddle katalogunu kurar (tekrar çalıştırmak güvenli): Plus / Pro / Business ürünleri ve aylık USD fiyatları.
// Fiyatlar migration 0007 ile aynı olmalı. Anahtar yazdırılmaz; yalnız ürün/fiyat kimlikleri (gizli değil) yazdırılır.
const KEY = process.env.PADDLE_API_KEY;
if (!KEY) { console.log("PADDLE_API_KEY yok; atlandı."); process.exit(0); }
const BASE = KEY.includes("_sdbx_") ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";
const PLANS = [
  { plan: "starter", name: "AI SaaSavran Plus", cents: 2000, description: "1 brand, 25 questions, 5 competitors. ChatGPT with live web search + Gemini, measured weekly." },
  { plan: "pro", name: "AI SaaSavran Pro", cents: 9900, description: "5 brands, 30 questions each, 8 competitors per brand. ChatGPT with live web search + Gemini, measured weekly." },
  { plan: "agency", name: "AI SaaSavran Business", cents: 24900, description: "15 brands, 30 questions each, 10 competitors per brand. For agencies managing client brands." },
];
async function api(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j?.error?.code ?? ""} ${j?.error?.detail ?? ""}`);
  return j;
}
const existing = (await api("GET", "/products?status=active&include=prices&per_page=100")).data;
const out = {};
for (const p of PLANS) {
  let prod = existing.find((x) => x.custom_data?.plan === p.plan);
  if (!prod) {
    prod = (await api("POST", "/products", { name: p.name, tax_category: "saas", description: p.description, custom_data: { plan: p.plan } })).data;
    prod.prices = [];
    console.log(`Ürün oluşturuldu: ${p.name}`);
  }
  let price = (prod.prices ?? []).find((x) => x.status === "active" && x.unit_price?.amount === String(p.cents) && x.unit_price?.currency_code === "USD" && x.billing_cycle?.interval === "month");
  if (!price) {
    price = (await api("POST", "/prices", { product_id: prod.id, name: "Monthly", description: `${p.name} monthly`, unit_price: { amount: String(p.cents), currency_code: "USD" }, billing_cycle: { interval: "month", frequency: 1 }, tax_mode: "account_setting", custom_data: { plan: p.plan } })).data;
    console.log(`Fiyat oluşturuldu: ${p.name} $${p.cents / 100}/ay`);
  }
  out[p.plan] = { product: prod.id, price: price.id };
}
console.log("PADDLE_CATALOG=" + JSON.stringify({ env: BASE.includes("sandbox") ? "sandbox" : "live", ...out }));
