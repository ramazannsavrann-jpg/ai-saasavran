// Uygulama içi ödeme (Google Play; App Store sonra). Fiyatlar mağazadan okunur (ülkenin parasıyla).
// Satın alma sunucuda Google'a sorularak doğrulanır (/api/store/google); onay sunucuda yapılır.
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product } from "@capgo/native-purchases";
import { API_BASE } from "../lib/env";
import { sb } from "../lib/supabase";

export const STORE_AVAILABLE = Capacitor.getPlatform() === "android";
export const SUBS = [
  { id: "gumus", plan: "starter", tr: "Gümüş", en: "Silver", brands: 1, prompts: 25, calls: 760 },
  { id: "altin", plan: "altin", tr: "Altın", en: "Gold", brands: 3, prompts: 30, calls: 2520 },
  { id: "platin", plan: "pro", tr: "Platin", en: "Platinum", brands: 5, prompts: 30, calls: 4200 },
] as const;
export const PACKS = [{ id: "ek_250", credits: 250 }, { id: "ek_500", credits: 500 }, { id: "ek_1000", credits: 1000 }] as const;

export interface StorePrices { subs: Record<string, Product>; packs: Record<string, Product> }

export async function loadPrices(): Promise<StorePrices | null> {
  if (!STORE_AVAILABLE) return null;
  const ok = await NativePurchases.isBillingSupported().then((x) => x.isBillingSupported).catch(() => false);
  if (!ok) return null;
  const [s, p] = await Promise.all([
    NativePurchases.getProducts({ productIdentifiers: SUBS.map((x) => x.id), productType: PURCHASE_TYPE.SUBS }),
    NativePurchases.getProducts({ productIdentifiers: PACKS.map((x) => x.id), productType: PURCHASE_TYPE.INAPP }),
  ]);
  const subs: Record<string, Product> = {}, packs: Record<string, Product> = {};
  for (const x of s.products) { const id = x.planIdentifier ?? x.identifier; if (!subs[id]) subs[id] = x; }
  for (const x of p.products) if (!packs[x.identifier]) packs[x.identifier] = x;
  return { subs, packs };
}

async function verify(kind: "sub" | "pack", product: string, token: string, workspace: string): Promise<string> {
  const { data } = await sb().auth.getSession();
  const res = await CapacitorHttp.post({
    url: `${API_BASE}/api/store/google`,
    headers: { "content-type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    data: { kind, product, token, workspace },
  });
  let body: { ok?: boolean; result?: string; error?: string } = {};
  try { body = (typeof res.data === "string" ? JSON.parse(res.data || "{}") : res.data) ?? {}; } catch { /* boş/bozuk cevap */ }
  if (res.status >= 400 || !body.ok) throw new Error(body.result ?? body.error ?? `store_${res.status}`);
  return body.result ?? "ok";
}

/** Abonelik satın al. Satın alma bu çalışma alanı adına işaretlenir (sunucu bunu Google'dan kontrol eder). */
export async function buySubscription(product: Product, workspace: string): Promise<string> {
  const productId = product.planIdentifier ?? product.identifier;
  const t = await NativePurchases.purchaseProduct({
    productIdentifier: productId, planIdentifier: product.identifier, offerToken: product.offerToken,
    productType: PURCHASE_TYPE.SUBS, appAccountToken: workspace, autoAcknowledgePurchases: false,
  });
  return verify("sub", productId, t.purchaseToken ?? t.transactionId, workspace);
}

export async function buyPack(product: Product, workspace: string): Promise<string> {
  const t = await NativePurchases.purchaseProduct({
    productIdentifier: product.identifier, offerToken: product.offerToken, productType: PURCHASE_TYPE.INAPP,
    appAccountToken: workspace, autoAcknowledgePurchases: false, isConsumable: false,
  });
  return verify("pack", product.identifier, t.purchaseToken ?? t.transactionId, workspace);
}

/**
 * Satın almaları geri yükle: telefonda yarım kalan (sunucuya ulaşmamış) satın almaları yeniden doğrular.
 * silent: uygulama açılışında/Paketler ekranında sessizce çalışır, yalnız onaylanmamış olanlara bakar
 * (onaylanmayan satın almayı Google 3 gün sonra iade eder).
 */
export async function restore(workspace: string, silent = false): Promise<number> {
  if (!STORE_AVAILABLE) return 0;
  let n = 0;
  for (const [type, kind] of [[PURCHASE_TYPE.SUBS, "sub"], [PURCHASE_TYPE.INAPP, "pack"]] as const) {
    const { purchases } = await NativePurchases.getPurchases({ productType: type, appAccountToken: workspace });
    for (const p of purchases) {
      if (p.purchaseState !== undefined && p.purchaseState !== "1") continue; // ödemesi bekleyen: tamamlanınca işlenir
      if (silent && p.isAcknowledged) continue;
      const id = p.productIdentifier, tok = p.purchaseToken ?? p.transactionId;
      if (!id || !tok) continue;
      if (kind === "sub" && !SUBS.some((s) => s.id === id)) continue;
      if (kind === "pack" && !PACKS.some((s) => s.id === id)) continue;
      try { await verify(kind, id, tok, workspace); n++; } catch { /* başka alana ait ya da süresi dolmuş */ }
    }
  }
  return n;
}

export const manage = () => NativePurchases.manageSubscriptions();

/** Sunucu sonuç kodunu kullanıcıya anlatır. */
export function resultText(code: string, L: (tr: string, en: string) => string): string {
  const m: Record<string, [string, string]> = {
    ok: ["Aboneliğiniz açıldı.", "Your subscription is active."],
    pack_ok: ["Ek soru hakkınız eklendi.", "Your extra credits were added."],
    restored: ["Satın almalarınız geri yüklendi.", "Your purchases were restored."],
    pending: ["Ödemeniz bekleniyor. Ödeme tamamlanınca paketiniz kendiliğinden açılır.", "Your payment is pending. Your plan opens automatically once the payment completes."],
    already_subscribed_web: ["Bu hesabın başka bir platformda etkin aboneliği var. Google ödemeyi birkaç gün içinde iade eder.", "This account already has an active subscription on another platform. Google will refund the payment within a few days."],
    already_subscribed_store: ["Bu hesabın Google Play'de etkin aboneliği var. Paket değiştirmek için önce mevcut aboneliği Google Play'de iptal edin. Bu ödeme birkaç gün içinde iade edilir.", "This account already has an active Google Play subscription. To switch plans, cancel the current one in Google Play first. This payment will be refunded within a few days."],
    quota_not_exhausted: ["Ek paket, soru hakkınız bitince alınabilir. Ödeme birkaç gün içinde iade edilir.", "Extra packs can be bought once your credits run out. The payment will be refunded within a few days."],
    not_subscriber: ["Ek paket yalnız abonelere açık. Ödeme birkaç gün içinde iade edilir.", "Extra packs are for subscribers only. The payment will be refunded within a few days."],
    not_member: ["Bu hesapta ödeme yapma yetkiniz yok.", "You don't have permission to pay for this account."],
    none: ["Geri yüklenecek satın alma bulunamadı.", "No purchases to restore."],
    store_not_configured: ["Mağaza ödemesi henüz açılmadı.", "In-app payments aren't open yet."],
  };
  const t = m[code];
  return t ? L(t[0], t[1]) : L("Ödeme doğrulanamadı. Ücret alındıysa \"Satın almaları geri yükle\"ye dokunun ya da info@aisaasavran.com'a yazın.", "The payment couldn't be verified. If you were charged, tap \"Restore purchases\" or email info@aisaasavran.com.");
}
