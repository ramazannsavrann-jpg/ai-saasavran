// Kural tabanlı iyileştirme önerileri. Yapay zekâ kullanmaz; ölçüm sonuçları ve site kontrolünden türetilir.
// Her önerinin "neden" alanı veriye dayanır; tahmin yürütülmez.

import type { AuditCheck } from "./audit.ts";

export interface PromptOutcome {
  prompt_text: string;
  answers: number;
  target_mentioned: number;
  target_recommended: number;
  top_competitor: string | null;
}
export interface RecInput {
  brandName: string;
  website: string | null;
  city: string | null;
  sector: string | null;
  aliases: string[];
  activePrompts: number;
  completedRuns: number;
  autoWeekly: boolean;
  measurementType: "live_search" | "model_knowledge" | "simulated";
  prompts: PromptOutcome[];
  audit: { status: "ok" | "unreachable"; checks: AuditCheck[] } | null;
  /** Arayüz dili; verilmezse Türkçe. */
  lang?: "tr" | "en";
}
export type Priority = "yüksek" | "orta" | "düşük";
export interface Recommendation { id: string; priority: Priority; title: string; why: string; action: string }

const ORDER: Record<Priority, number> = { yüksek: 0, orta: 1, düşük: 2 };

const AUDIT_ACTIONS: Record<string, { priority: Priority; title: string; action: string }> = {
  reachable: { priority: "yüksek", title: "Web siteniz açılmıyor", action: "Sitenin çalıştığını ve adresin doğru yazıldığını kontrol edin. Açılmayan bir site yapay zekâ cevaplarında kaynak olamaz." },
  ai_bots: { priority: "yüksek", title: "Yapay zekâ tarayıcılarının engelini kaldırın", action: "robots.txt dosyasında bu tarayıcılar için 'Disallow: /' satırlarını kaldırın veya 'Allow: /' ekleyin. Web sitenizi kim yönetiyorsa bu tek satırlık bir değişikliktir." },
  schema_org: { priority: "yüksek", title: "Sitenize işletme bilgisini makine okunur biçimde ekleyin", action: "Ana sayfaya schema.org Organization veya LocalBusiness (JSON-LD) ekleyin: resmi ad, adres, telefon, çalışma saatleri, sosyal medya hesapları. WordPress kullanıyorsanız Yoast/Rank Math gibi eklentiler bunu yapar." },
  schema_invalid: { priority: "orta", title: "Hatalı yapılandırılmış veriyi düzeltin", action: "Google'ın Zengin Sonuç Testi aracıyla JSON-LD bloklarını kontrol edip hatalarını giderin." },
  title: { priority: "orta", title: "Ana sayfa başlığını düzeltin", action: "Başlığı 10–70 karakter arasında, 'Marka adı – ne yaptığınız – şehir' biçiminde yazın." },
  brand_in_title: { priority: "orta", title: "Marka adınızı ana sayfa başlığına ekleyin", action: "Sayfa başlığında (title) marka adınız açıkça geçmeli." },
  meta_description: { priority: "orta", title: "Ana sayfaya açıklama ekleyin", action: "120–160 karakterlik, ne sunduğunuzu ve nerede olduğunuzu anlatan bir meta description yazın." },
  content: { priority: "orta", title: "Ana sayfaya okunabilir metin ekleyin", action: "Hizmetlerinizi, bölgenizi ve sizi farklı kılan şeyi anlatan düz metin ekleyin. Metin yalnızca görsellerde veya JavaScript ile geliyorsa tarayıcılar göremeyebilir." },
  faq: { priority: "düşük", title: "Sık sorulan sorular bölümü ekleyin", action: "Müşterilerin gerçekten sorduğu 5–10 soruyu cevaplayan bir SSS bölümü ekleyin ve FAQPage yapılandırılmış verisiyle işaretleyin." },
  https: { priority: "orta", title: "HTTPS'e geçin", action: "Barındırma firmanızdan ücretsiz SSL sertifikası (Let's Encrypt) açmasını isteyin." },
  sitemap: { priority: "düşük", title: "Site haritası ekleyin", action: "sitemap.xml oluşturup robots.txt içinde 'Sitemap:' satırıyla belirtin." },
  viewport: { priority: "düşük", title: "Siteyi mobil uyumlu yapın", action: "Sayfaya viewport meta etiketi ekleyin ve telefonda düzgün göründüğünü kontrol edin." },
  lang: { priority: "düşük", title: "Sayfa dilini belirtin", action: "html etiketine lang=\"tr\" ekleyin." },
};

const AUDIT_ACTIONS_EN: Record<string, { title: string; action: string }> = {
  reachable: { title: "Your website doesn't load", action: "Check that the site is up and the address is correct. A site that doesn't load can't be a source in AI answers." },
  ai_bots: { title: "Unblock AI crawlers", action: "Remove the 'Disallow: /' lines for these crawlers in robots.txt, or add 'Allow: /'. Whoever manages your site can do this in one line." },
  schema_org: { title: "Add machine-readable business details", action: "Add schema.org Organization or LocalBusiness (JSON-LD) to the home page: legal name, address, phone, hours, social profiles. SEO plugins like Yoast or Rank Math can do this on WordPress." },
  schema_invalid: { title: "Fix invalid structured data", action: "Check your JSON-LD blocks with Google's Rich Results Test and fix the errors." },
  title: { title: "Fix the home page title", action: "Write a 10–70 character title like 'Brand – what you do – city'." },
  brand_in_title: { title: "Put your brand name in the home page title", action: "Your brand name should appear clearly in the page title." },
  meta_description: { title: "Add a home page description", action: "Write a 120–160 character meta description that says what you offer and where." },
  content: { title: "Add readable text to the home page", action: "Add plain text about your services, area and what sets you apart. Text that only appears in images or via JavaScript may be invisible to crawlers." },
  faq: { title: "Add an FAQ section", action: "Answer 5–10 questions customers really ask, and mark them up with FAQPage structured data." },
  https: { title: "Switch to HTTPS", action: "Ask your host to enable a free SSL certificate (Let's Encrypt)." },
  sitemap: { title: "Add a sitemap", action: "Create sitemap.xml and reference it in robots.txt with a 'Sitemap:' line." },
  viewport: { title: "Make the site mobile-friendly", action: "Add a viewport meta tag and check that the site looks right on a phone." },
  lang: { title: "Declare the page language", action: "Add a lang attribute to the html tag, e.g. lang=\"en\"." },
};

export function buildRecommendations(i: RecInput): Recommendation[] {
  const en = i.lang === "en";
  const recs: Recommendation[] = [];
  const add = (r: Recommendation) => recs.push(r);

  // --- Site
  if (!i.website) {
    add(en
      ? { id: "no_website", priority: "yüksek", title: "Add a website to the brand", why: "No website is set, so we can't check your site.", action: "Edit the brand, enter the website address, then tap 'Check site'." }
      : { id: "no_website", priority: "yüksek", title: "Markaya web sitesi ekleyin", why: "Web sitesi tanımlı değil; sitenizi kontrol edemiyoruz.", action: "Markayı düzenleyip web sitesi adresini girin, sonra 'Siteyi kontrol et'e basın." });
  } else if (i.audit) {
    for (const c of i.audit.checks) {
      if (c.ok || c.severity === "info") continue;
      const a = AUDIT_ACTIONS[c.id];
      const ae = AUDIT_ACTIONS_EN[c.id];
      if (a) add({ id: `audit_${c.id}`, priority: a.priority, title: en && ae ? ae.title : a.title, why: en ? (c.detail_en ?? c.detail) : c.detail, action: en && ae ? ae.action : a.action });
    }
  }

  // --- Ölçüm sonuçları
  const measured = i.prompts.filter((p) => p.answers > 0);
  const absent = measured.filter((p) => p.target_mentioned === 0);
  const mentionedOnly = measured.filter((p) => p.target_mentioned > 0 && p.target_recommended === 0);
  if (absent.length > 0) {
    const comps = [...new Set(absent.map((p) => p.top_competitor).filter(Boolean))] as string[];
    add({
      id: "absent_prompts", priority: absent.length >= measured.length / 2 ? "yüksek" : "orta",
      title: en ? `Not mentioned at all in ${absent.length} questions` : `${absent.length} soruda hiç anılmıyorsunuz`,
      why: en
        ? `You're missing from the answers to: ${absent.slice(0, 4).map((p) => `"${p.prompt_text}"`).join(", ")}${absent.length > 4 ? " and more" : ""}.${comps.length ? ` Leading in these: ${comps.slice(0, 3).join(", ")}.` : ""}`
        : `Şu sorularda cevapta yoksunuz: ${absent.slice(0, 4).map((p) => `"${p.prompt_text}"`).join(", ")}${absent.length > 4 ? " ve diğerleri" : ""}.${comps.length ? ` Bu sorularda öne çıkanlar: ${comps.slice(0, 3).join(", ")}.` : ""}`,
      action: en
        ? "Publish pages or FAQ entries on your site that answer these questions directly. Use the question as the heading and give a clear answer in the first paragraph. Being featured on trusted outside sources (local guides, news sites, industry lists) also helps."
        : "Sitenizde bu soruları doğrudan cevaplayan sayfalar veya SSS maddeleri hazırlayın. Soru cümlesini başlık olarak kullanın ve ilk paragrafta net bir cevap verin. Güvenilir dış kaynaklarda (yerel rehberler, haber siteleri, sektör listeleri) yer almak da etkilidir.",
    });
  }
  if (mentionedOnly.length > 0) {
    add({
      id: "mentioned_not_recommended", priority: "orta",
      title: en ? `Mentioned but not recommended in ${mentionedOnly.length} questions` : `${mentionedOnly.length} soruda anılıyor ama önerilmiyorsunuz`,
      why: en ? `Example: "${mentionedOnly[0].prompt_text}". Your name appears, but not on the recommended list.` : `Örnek: "${mentionedOnly[0].prompt_text}". Adınız geçiyor ama öneri listesinde değilsiniz.`,
      action: en
        ? "State the concrete facts that set you apart (price range, specialties, service area, awards, number of customers) on your site and business profiles. AI recommendations rely on comparable information."
        : "Sizi rakiplerden ayıran somut bilgileri (fiyat aralığı, uzmanlık, hizmet bölgesi, ödüller, müşteri sayısı) sitenizde ve işletme profillerinizde açıkça yazın. Yapay zekâ öneri yaparken karşılaştırılabilir bilgilere dayanır.",
    });
  }

  // --- Ölçüm kalitesi
  if (i.activePrompts < 10) {
    add(en
      ? { id: "more_prompts", priority: "orta", title: "Add more questions", why: `You have ${i.activePrompts} active questions; read results with wide ranges.`, action: "Add at least 10 questions across the customer journey (research, comparison, purchase). Keep most unbranded: 'What's the best X?' rather than 'Is X good?'." }
      : { id: "more_prompts", priority: "orta", title: "Daha fazla soru ekleyin", why: `Şu an ${i.activePrompts} aktif soru var; sonuçlar geniş aralıklarla okunmalı.`, action: "Müşteri yolculuğunun her aşamasından (bilgi arama, karşılaştırma, satın alma) en az 10 soru ekleyin. Çoğu markasız olsun: 'X iyi mi?' yerine 'En iyi X hangisi?'." });
  }
  if (i.aliases.length === 0) {
    add(en
      ? { id: "aliases", priority: "düşük", title: "Add other spellings of your brand", why: "No abbreviations or alternate spellings are set; some mentions may be missed.", action: "Edit the brand and add abbreviations and common spellings under 'Other spellings'." }
      : { id: "aliases", priority: "düşük", title: "Markanızın diğer yazılışlarını ekleyin", why: "Kısaltmalar veya farklı yazılışlar tanımlı değil; bazı anılmalar kaçabilir.", action: "Markayı düzenleyip 'Diğer yazılışlar' alanına kısaltmaları ve yaygın yazım biçimlerini ekleyin." });
  }
  if (!i.autoWeekly) {
    add(en
      ? { id: "weekly", priority: "düşük", title: "Turn on weekly measurement", why: "Regular measurement is needed to see the effect of changes.", action: "Edit the brand and turn on 'Measure automatically every week'." }
      : { id: "weekly", priority: "düşük", title: "Haftalık otomatik ölçümü açın", why: "Değişikliklerin etkisini görmek için düzenli ölçüm gerekir.", action: "Markayı düzenleyip 'Her hafta otomatik ölç' seçeneğini açın." });
  }
  if (i.measurementType === "model_knowledge" && measured.length > 0) {
    add(en
      ? { id: "model_knowledge_note", priority: "düşük", title: "Changes can take time to show",
        why: "These measurements were made without live web search; model knowledge only updates with new training.",
        action: "Improvements to your site show up first in assistants that search the web. In no-search measurement, change can take weeks or months; that's normal." }
      : { id: "model_knowledge_note", priority: "düşük", title: "Değişikliklerin etkisi zaman alabilir",
        why: "Bu ölçümler canlı web araması olmadan yapıldı; modelin bilgisi ancak yeni eğitimlerle güncellenir.",
        action: "Sitenizde yaptığınız iyileştirmeler önce canlı arama yapan asistanlarda etkisini gösterir. Aramasız ölçümde değişim haftalar veya aylar sürebilir; bu normaldir." });
  }

  return recs.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
}
