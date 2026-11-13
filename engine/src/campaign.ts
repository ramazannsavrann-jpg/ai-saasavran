// Kazanma kampanyası: iyileştirme rehberindeki bir maddeyi somut görev listesine çevirir. Yapay zekâ kullanmaz;
// görevler yalnız ölçümde bulunan veriden (sorular, siteler, iddialar) üretilir. Ayar maddeleri (soru ekle, haftalık ölçüm…) kampanya değildir.
import type { RecInput } from "./recommendations.ts";

export interface CampaignTask { t: string; done: boolean }
const MAX = 8;
const prov = (p: string) => (p === "openai" ? "ChatGPT" : p === "claude" ? "Claude" : p === "gemini" ? "Gemini" : p);

/** Madde kimliği için görev listesi; kampanyaya uygun değilse null. */
export function campaignTasks(recId: string, i: RecInput): string[] | null {
  const en = i.lang === "en";
  const measured = i.prompts.filter((p) => p.answers > 0);
  const out: string[] = [];
  switch (recId) {
    case "absent_prompts": {
      const absent = measured.filter((p) => p.target_mentioned === 0);
      if (!absent.length) return null;
      for (const p of absent.slice(0, 5)) out.push(en ? `Publish a page or FAQ entry titled "${p.prompt_text}" with a clear answer in the first paragraph` : `"${p.prompt_text}" sorusunu başlık yapan bir sayfa veya SSS maddesi yayınlayın; ilk paragrafta net cevap verin`);
      out.push(en ? "Mark up the FAQ with FAQPage structured data" : "SSS bölümünü FAQPage yapılandırılmış verisiyle işaretleyin");
      const comps = [...new Set(absent.map((p) => p.top_competitor).filter(Boolean))].slice(0, 2) as string[];
      if (comps.length) out.push(en ? `Check which sites are cited where ${comps.join(" and ")} lead (Report → Source opportunities)` : `${comps.join(" ve ")} öne çıktığı cevaplarda hangi sitelerin kaynak gösterildiğine bakın (Rapor → Kaynak fırsatları)`);
      break;
    }
    case "mentioned_not_recommended": {
      const only = measured.filter((p) => p.target_mentioned > 0 && p.target_recommended === 0);
      if (!only.length) return null;
      for (const p of only.slice(0, 3)) out.push(en ? `For "${p.prompt_text}": write on your site the concrete fact that makes you the better choice` : `"${p.prompt_text}" için sizi daha iyi seçenek yapan somut bilgiyi sitenize yazın`);
      out.push(en ? "Add price range, specialties, service area and proof (awards, customer count) to your site" : "Fiyat aralığı, uzmanlık, hizmet bölgesi ve kanıtları (ödül, müşteri sayısı) sitenize ekleyin");
      out.push(en ? "Update the same facts on your business profiles and directory listings" : "Aynı bilgileri işletme profillerinizde ve rehber sitelerindeki kayıtlarınızda güncelleyin");
      break;
    }
    case "engine_gap": {
      const g = i.engineGap;
      if (!g || !g.ignoredBy.length) return null;
      const names = g.ignoredBy.map(prov).join(", ");
      out.push(en ? `List the sites only ${names} reads (Report → Engine comparison)` : `Yalnız ${names} motorunun baktığı siteleri listeleyin (Rapor → Motor karşılaştırması)`);
      out.push(en ? "Contact at least two of these sites to get featured" : "Bu sitelerden en az ikisinde yer almak için iletişime geçin");
      out.push(en ? `Check that robots.txt doesn't block ${names}'s crawler` : `robots.txt dosyasının ${names} botunu engellemediğini kontrol edin`);
      break;
    }
    case "source_sites": {
      const s = i.opportunitySites ?? [];
      if (!s.length) return null;
      for (const d of s.slice(0, 4)) out.push(en ? `Contact ${d.domain} to get into its reviews or lists (cited ${d.count}×)` : `${d.domain} ile iletişime geçin; inceleme veya listelerine girin (${d.count} kez kaynak)`);
      out.push(en ? "Make sure your details on these sites are complete and current" : "Bu sitelerdeki bilgilerinizin eksiksiz ve güncel olduğunu kontrol edin");
      break;
    }
    case "wrong_claims": {
      const w = i.wrongClaims ?? [];
      if (!w.length) return null;
      for (const c of w.slice(0, 5)) out.push(en ? `${c.product}: correct "${c.claim}" to "${c.fact}" on your product page` : `${c.product}: ürün sayfanızda "${c.claim}" bilgisini "${c.fact}" olarak düzeltin`);
      out.push(en ? "Update marketplace listings with the same facts" : "Pazar yeri ilanlarını aynı bilgilerle güncelleyin");
      out.push(en ? "Update Product/Offer structured data" : "Product/Offer yapılandırılmış verisini güncelleyin");
      break;
    }
    case "truth_wrong": {
      const w = i.wrongBrandClaims ?? [];
      if (!w.length) return null;
      for (const c of w.slice(0, 5)) out.push(en ? `Correct on your site: "${c.claim}" → ${c.fact}` : `Sitenizde düzeltin: "${c.claim}" → ${c.fact}`);
      out.push(en ? "Update your business profiles (Google, maps, directories) with the same facts" : "İşletme profillerinizi (Google, haritalar, rehberler) aynı bilgilerle güncelleyin");
      out.push(en ? "Find and ask other sites that repeat the wrong information to update it" : "Yanlış bilgiyi tekrarlayan diğer siteleri bulup güncellemelerini isteyin");
      break;
    }
    case "shopping_behind": {
      const s = i.shoppingBehind ?? [];
      if (!s.length) return null;
      for (const x of s.slice(0, 3)) out.push(en ? `Merchant Center: put the exact model name in the title of ${x.product}` : `Merchant Center: ${x.product} başlığına tam model adını yazın`);
      out.push(en ? "Check price, stock, images and reviews in the feed" : "Akıştaki fiyat, stok, görsel ve yorumları kontrol edin");
      out.push(en ? "List the product on major marketplaces too" : "Ürünü büyük pazar yerlerinde de listeleyin");
      break;
    }
    case "own_source_low":
      out.push(...(en
        ? ["Add an FAQ page that answers your customers' real questions", "Add a comparison page (you vs. alternatives)", "Add a clear pricing page", "Add structured data (Organization, FAQPage, Product)", "Make sure AI crawlers are allowed in robots.txt"]
        : ["Müşterilerinizin gerçek sorularını cevaplayan bir SSS sayfası ekleyin", "Bir karşılaştırma sayfası ekleyin (siz ve alternatifler)", "Net bir fiyat sayfası ekleyin", "Yapılandırılmış veri ekleyin (Organization, FAQPage, Product)", "robots.txt'de yapay zekâ botlarına izin verildiğini kontrol edin"]));
      break;
    default:
      return null; // site kontrolü maddeleri auditCampaign ile; ayar maddeleri kampanya değildir
  }
  return out.slice(0, MAX);
}

/** Site kontrolü maddesi için tek görev ve doğrulama görevi. */
export function auditCampaign(action: string, lang: "tr" | "en" = "tr"): string[] {
  return [action, lang === "en" ? "Run 'Check site' again to confirm it's fixed" : "Düzeldiğini doğrulamak için 'Siteyi kontrol et'e yeniden basın"];
}

export function taskProgress(tasks: CampaignTask[] | null | undefined): { done: number; total: number } {
  const t = tasks ?? [];
  return { done: t.filter((x) => x.done).length, total: t.length };
}

/** Rehber maddesi için görevler: veri maddeleri campaignTasks, site kontrolü maddeleri auditCampaign; diğerleri null. */
export function campaignFor(rec: { id: string; action: string }, i: RecInput): string[] | null {
  if (rec.id.startsWith("audit_")) return auditCampaign(rec.action, i.lang ?? "tr");
  return campaignTasks(rec.id, i);
}
