// Web sitesi kontrolü: yapay zekâ asistanlarının siteyi okuyup doğru anlayabilmesi için temel kontroller.
// Yalnızca herkese açık sayfaları okur (ana sayfa, robots.txt, sitemap.xml, llms.txt). Giriş yapmaz, form doldurmaz.

import type { FetchLike } from "./providers/types.ts";

export type Severity = "high" | "medium" | "low" | "info";
export interface AuditCheck { id: string; ok: boolean; severity: Severity; title: string; detail: string; title_en?: string; detail_en?: string }
export interface AuditResult { url: string; status: "ok" | "unreachable"; checks: AuditCheck[] }

/** Yapay zekâ ile ilgili tarayıcılar ve sahipleri. */
export const AI_BOTS: { agent: string; owner: string }[] = [
  { agent: "GPTBot", owner: "OpenAI (eğitim)" },
  { agent: "OAI-SearchBot", owner: "OpenAI (ChatGPT arama)" },
  { agent: "ChatGPT-User", owner: "OpenAI (kullanıcı isteği)" },
  { agent: "Google-Extended", owner: "Google (Gemini)" },
  { agent: "PerplexityBot", owner: "Perplexity" },
  { agent: "ClaudeBot", owner: "Anthropic" },
  { agent: "CCBot", owner: "Common Crawl" },
];

export function normalizeUrl(website: string): string {
  const w = website.trim();
  const u = new URL(/^https?:\/\//i.test(w) ? w : `https://${w}`);
  return `${u.protocol}//${u.host}`;
}

/** robots.txt içinde bu bot için ana sayfa (/) yasaklı mı? Basit ama standarda uygun grup ayrıştırması. */
export function robotsBlocks(robots: string, agent: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(); const val = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else if (current && (key === "disallow" || key === "allow")) {
      if (val || key === "allow") current.rules.push({ allow: key === "allow", path: val });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  const a = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.includes(a));
  const applicable = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes("*"));
  // En uzun eşleşen kural kazanır; "/" için değerlendir
  let best: { allow: boolean; len: number } | null = null;
  for (const g of applicable) for (const r of g.rules) {
    if (r.path === "" ) continue;
    if ("/".startsWith(r.path) || r.path === "/") {
      const len = r.path.length;
      if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
    }
  }
  return !!best && !best.allow;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null;
}

export function analyzeHtml(html: string, brandNames: string[]) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const metaDesc = metas.map((t) => (attr(t, "name") ?? "").toLowerCase() === "description" ? attr(t, "content") : null).find((x) => x) ?? "";
  const viewport = metas.some((t) => (attr(t, "name") ?? "").toLowerCase() === "viewport");
  const lang = attr(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang") ?? "";
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const types = new Set<string>();
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") {
          const t = (v as Record<string, unknown>)["@type"];
          (Array.isArray(t) ? t : [t]).forEach((x) => typeof x === "string" && types.add(x));
          Object.values(v as object).forEach(walk);
        }
      };
      walk(JSON.parse(m[1].trim()));
    } catch { types.add("__invalid__"); }
  }
  const lower = (s: string) => s.toLocaleLowerCase("tr-TR");
  const nameInTitle = brandNames.some((n) => n && lower(title).includes(lower(n)));
  const textLen = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
  return { title, metaDesc, viewport, lang, h1, types, nameInTitle, textLen };
}

const ORG_TYPES = ["Organization", "LocalBusiness", "Corporation", "Restaurant", "Store", "Hotel", "MedicalBusiness", "Dentist", "AutoDealer", "AutoRepair", "RealEstateAgent", "FinancialService", "BankOrCreditUnion", "InsuranceAgency", "FoodEstablishment", "LodgingBusiness", "EducationalOrganization"];

export async function auditSite(website: string, brandNames: string[], fetchFn: FetchLike = fetch): Promise<AuditResult> {
  const base = normalizeUrl(website);
  const get = async (path: string) => {
    try {
      const r = await fetchFn(base + path, { headers: { "user-agent": "AI-SaaSavran-SiteCheck/1.0 (+https://aisaasavran.com)" }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
      return { status: r.status, text: r.status < 400 ? (await r.text()).slice(0, 2_000_000) : "", finalUrl: r.url || base + path };
    } catch { return { status: 0, text: "", finalUrl: base + path }; }
  };
  const home = await get("/");
  if (home.status === 0 || home.status >= 400) {
    return { url: base, status: "unreachable", checks: [{ id: "reachable", ok: false, severity: "high", title: "Siteye ulaşılamadı", detail: home.status ? `Sunucu ${home.status} hatası döndü.` : "Bağlantı kurulamadı veya zaman aşımı oldu.", title_en: "Site unreachable", detail_en: home.status ? `The server returned error ${home.status}.` : "Couldn't connect, or the request timed out." }] };
  }
  const [robots, sitemap, llms] = await Promise.all([get("/robots.txt"), get("/sitemap.xml"), get("/llms.txt")]);
  const h = analyzeHtml(home.text, brandNames);
  const checks: AuditCheck[] = [];
  const add = (c: AuditCheck) => checks.push(c);

  add({ id: "https", ok: home.finalUrl.startsWith("https://"), severity: "medium", title: "Güvenli bağlantı (HTTPS)", detail: home.finalUrl.startsWith("https://") ? "Site HTTPS ile açılıyor." : "Site HTTPS kullanmıyor; tarayıcılar ve arama sistemleri güvensiz sayabilir.",
    title_en: "Secure connection (HTTPS)", detail_en: home.finalUrl.startsWith("https://") ? "The site loads over HTTPS." : "The site doesn't use HTTPS; browsers and search systems may treat it as insecure." });

  const blocked = robots.text ? AI_BOTS.filter((b) => robotsBlocks(robots.text, b.agent)) : [];
  add({ id: "ai_bots", ok: blocked.length === 0, severity: "high", title: "Yapay zekâ tarayıcılarına izin",
    detail: blocked.length === 0 ? "robots.txt yapay zekâ tarayıcılarını engellemiyor." : `robots.txt şu tarayıcıları engelliyor: ${blocked.map((b) => `${b.agent} (${b.owner})`).join(", ")}. Bu asistanlar sitenizi okuyamaz.`,
    title_en: "AI crawlers allowed", detail_en: blocked.length === 0 ? "robots.txt doesn't block AI crawlers." : `robots.txt blocks: ${blocked.map((b) => `${b.agent} (${b.owner})`).join(", ")}. These assistants can't read your site.` });

  add({ id: "title", ok: h.title.length >= 10 && h.title.length <= 70, severity: "medium", title: "Sayfa başlığı",
    detail: h.title ? `"${h.title.slice(0, 80)}" (${h.title.length} karakter${h.title.length > 70 ? ", uzun" : h.title.length < 10 ? ", çok kısa" : ""})` : "Ana sayfada başlık (title) yok.",
    title_en: "Page title", detail_en: h.title ? `"${h.title.slice(0, 80)}" (${h.title.length} characters${h.title.length > 70 ? ", long" : h.title.length < 10 ? ", too short" : ""})` : "The home page has no title." });
  add({ id: "brand_in_title", ok: h.nameInTitle, severity: "medium", title: "Marka adı başlıkta", detail: h.nameInTitle ? "Marka adı sayfa başlığında geçiyor." : "Marka adınız ana sayfa başlığında geçmiyor.",
    title_en: "Brand name in title", detail_en: h.nameInTitle ? "Your brand name appears in the page title." : "Your brand name isn't in the home page title." });
  add({ id: "meta_description", ok: h.metaDesc.length >= 50, severity: "medium", title: "Sayfa açıklaması (meta description)",
    detail: h.metaDesc ? `${h.metaDesc.length} karakter${h.metaDesc.length < 50 ? " (kısa)" : ""}.` : "Ana sayfada açıklama yok. Yapay zekâ ve arama sistemleri işinizi bu kısa özetten anlar.",
    title_en: "Meta description", detail_en: h.metaDesc ? `${h.metaDesc.length} characters${h.metaDesc.length < 50 ? " (short)" : ""}.` : "No description on the home page. AI and search systems use this short summary to understand your business." });

  const hasOrg = ORG_TYPES.some((t) => h.types.has(t));
  add({ id: "schema_org", ok: hasOrg, severity: "high", title: "İşletme bilgisi (yapılandırılmış veri)",
    detail: hasOrg ? `Bulunan türler: ${[...h.types].filter((t) => !t.startsWith("__")).slice(0, 6).join(", ")}.` : "Sitede schema.org işletme bilgisi (Organization / LocalBusiness) yok. Ad, adres, telefon, çalışma saatleri makinelerin okuyabileceği biçimde verilmeli.",
    title_en: "Business details (structured data)", detail_en: hasOrg ? `Types found: ${[...h.types].filter((t) => !t.startsWith("__")).slice(0, 6).join(", ")}.` : "No schema.org business details (Organization / LocalBusiness). Name, address, phone and hours should be machine-readable." });
  if (h.types.has("__invalid__")) add({ id: "schema_invalid", ok: false, severity: "medium", title: "Hatalı yapılandırılmış veri", detail: "Sitedeki JSON-LD bloklarından en az biri okunamıyor (geçersiz JSON).", title_en: "Invalid structured data", detail_en: "At least one JSON-LD block on the site can't be parsed (invalid JSON)." });
  add({ id: "faq", ok: h.types.has("FAQPage"), severity: "low", title: "Sık sorulan sorular (FAQ)",
    detail: h.types.has("FAQPage") ? "Ana sayfada FAQ yapılandırılmış verisi var." : "Ana sayfada FAQ yapılandırılmış verisi bulunamadı. Müşterilerin sorduğu soruları cevaplayan bir SSS bölümü yapay zekâ cevaplarında kaynak olarak kullanılabilir.",
    title_en: "FAQ", detail_en: h.types.has("FAQPage") ? "The home page has FAQ structured data." : "No FAQ structured data on the home page. An FAQ that answers real customer questions can be used as a source in AI answers." });

  const sitemapOk = sitemap.status > 0 && sitemap.status < 400 && /<(urlset|sitemapindex)/i.test(sitemap.text) || /^sitemap:/im.test(robots.text);
  add({ id: "sitemap", ok: sitemapOk, severity: "low", title: "Site haritası (sitemap.xml)", detail: sitemapOk ? "Site haritası bulundu." : "Site haritası bulunamadı.", title_en: "Sitemap (sitemap.xml)", detail_en: sitemapOk ? "Sitemap found." : "No sitemap found." });
  add({ id: "viewport", ok: h.viewport, severity: "low", title: "Mobil uyum etiketi", detail: h.viewport ? "Mobil görünüm etiketi var." : "viewport etiketi yok; site telefonda bozuk görünebilir.", title_en: "Mobile viewport tag", detail_en: h.viewport ? "Viewport tag present." : "No viewport tag; the site may look broken on phones." });
  add({ id: "lang", ok: !!h.lang, severity: "low", title: "Sayfa dili", detail: h.lang ? `Dil: ${h.lang}` : "Sayfa dili belirtilmemiş (html lang).", title_en: "Page language", detail_en: h.lang ? `Language: ${h.lang}` : "Page language not set (html lang)." });
  add({ id: "content", ok: h.textLen >= 800, severity: "medium", title: "Ana sayfadaki metin", detail: h.textLen >= 800 ? "Ana sayfada yeterli metin var." : `Ana sayfada çok az okunabilir metin var (~${h.textLen} karakter). İçerik yalnızca JavaScript ile yükleniyorsa bazı yapay zekâ tarayıcıları göremez.`,
    title_en: "Text on the home page", detail_en: h.textLen >= 800 ? "Enough readable text on the home page." : `Very little readable text on the home page (~${h.textLen} characters). If content loads only via JavaScript, some AI crawlers can't see it.` });
  add({ id: "llms_txt", ok: llms.status > 0 && llms.status < 400 && llms.text.length > 20, severity: "info", title: "llms.txt dosyası",
    detail: llms.status > 0 && llms.status < 400 && llms.text.length > 20 ? "llms.txt bulundu." : "llms.txt yok. Yeni bir öneri; henüz tüm asistanlar kullanmıyor, etkisi kanıtlanmış değil.",
    title_en: "llms.txt file", detail_en: llms.status > 0 && llms.status < 400 && llms.text.length > 20 ? "llms.txt found." : "No llms.txt. A new proposal; not all assistants use it yet and its effect isn't proven." });

  return { url: base, status: "ok", checks };
}
