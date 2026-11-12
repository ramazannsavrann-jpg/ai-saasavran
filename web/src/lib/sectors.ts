// Sektörler, hazır soru şablonları ve örnek rakipler.
// Şablonlar elle yazıldı (yapay zekâ ile üretilmedi). Örnek rakipler Türkiye'de bilinen markalardır; yalnızca öneridir,
// kullanıcı tek dokunuşla ekler ya da yok sayar.
//   local: true  → şehir/ilçe önemli (restoran, klinik...). Sorularda {where} = "Antalya'da", {city} = "Antalya".
//   local: false → ulusal markalar (banka, telekom...). Sorular "Türkiye'de" diye kurulur.

import type { Intent } from "./data";
import { isEn } from "./i18n";

export interface SectorDef {
  label: string;           // veritabanında saklanan değer (eski kayıtlarla uyumlu)
  local: boolean;
  questions: { text: string; intent: Intent }[];
  competitors: string[];
}

const Q = (text: string, intent: Intent) => ({ text, intent });

export const SECTOR_DEFS: SectorDef[] = [
  {
    label: "Restoran / döner-kebap", local: true, competitors: [],
    questions: [
      Q("{city} için en iyi döner ve kebap restoranları hangileri?", "local"),
      Q("{where} uygun fiyatlı ve lezzetli bir restoran önerir misin?", "comparison"),
      Q("{where} ailece gidilebilecek restoranlar hangileri?", "local"),
      Q("{where} gece geç saatte açık olan iyi bir dönerci var mı?", "purchase"),
      Q("İyi bir döner restoranını nasıl anlarım?", "informational"),
    ],
  },
  {
    label: "Kafe / pastane", local: true, competitors: [],
    questions: [
      Q("{where} kahvaltı için en iyi kafeler hangileri?", "local"),
      Q("{where} ders çalışmaya uygun sessiz bir kafe önerir misin?", "comparison"),
      Q("{where} doğum günü pastası için iyi bir pastane hangisi?", "purchase"),
    ],
  },
  {
    label: "Market", local: false,
    competitors: ["Migros", "BİM", "A101", "ŞOK", "CarrefourSA"],
    questions: [
      Q("Türkiye'de alışveriş için en uygun fiyatlı market zinciri hangisi?", "comparison"),
      Q("Online market siparişi için hangi marketi önerirsin?", "purchase"),
      Q("Taze meyve sebze için en iyi market hangisi?", "comparison"),
      Q("Market alışverişinde nasıl tasarruf ederim?", "informational"),
    ],
  },
  {
    label: "Akaryakıt istasyonu", local: false,
    competitors: ["Opet", "Shell", "Petrol Ofisi", "BP", "TotalEnergies"],
    questions: [
      Q("Türkiye'de en kaliteli yakıtı hangi akaryakıt istasyonu satıyor?", "comparison"),
      Q("Uzun yolda mola vermek için en iyi akaryakıt istasyonları hangileri?", "local"),
      Q("Akaryakıt alırken hangi istasyonun sadakat programı daha avantajlı?", "purchase"),
    ],
  },
  {
    label: "Otel / turizm", local: true, competitors: [],
    questions: [
      Q("{where} aileler için en iyi oteller hangileri?", "local"),
      Q("{where} uygun fiyatlı ve temiz bir otel önerir misin?", "comparison"),
      Q("{where} denize yakın butik otel arıyorum, hangisini önerirsin?", "purchase"),
      Q("Otel seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Mobilya mağazası", local: false,
    competitors: ["İstikbal", "Bellona", "Doğtaş", "Kelebek", "IKEA"],
    questions: [
      Q("Türkiye'de kaliteli ve uygun fiyatlı mobilya markası hangisi?", "comparison"),
      Q("Yeni ev için koltuk takımı almak istiyorum, hangi markayı önerirsin?", "purchase"),
      Q("{where} güvenilir mobilya mağazaları hangileri?", "local"),
      Q("Mobilya alırken kaliteyi nasıl anlarım?", "informational"),
    ],
  },
  {
    label: "Otomotiv", local: true, competitors: [],
    questions: [
      Q("{where} güvenilir oto servis önerir misin?", "local"),
      Q("{where} ikinci el araba almak için güvenilir galeriler hangileri?", "purchase"),
      Q("Araba bakımını yetkili serviste mi özel serviste mi yaptırmalıyım?", "informational"),
    ],
  },
  {
    label: "Emlak", local: true, competitors: [],
    questions: [
      Q("{where} güvenilir emlak ofisleri hangileri?", "local"),
      Q("{where} ev almak için hangi emlakçıyla çalışmalıyım?", "purchase"),
      Q("Ev alırken emlakçı seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Klinik / sağlık", local: true, competitors: [],
    questions: [
      Q("{where} en iyi diş klinikleri hangileri?", "local"),
      Q("{where} güvenilir bir göz doktoru önerir misin?", "comparison"),
      Q("{where} randevu almak için iyi bir özel klinik hangisi?", "purchase"),
    ],
  },
  {
    label: "Teknoloji / elektronik", local: false,
    competitors: ["Teknosa", "MediaMarkt", "Vatan Bilgisayar", "Hepsiburada", "Trendyol"],
    questions: [
      Q("Türkiye'de telefon ve bilgisayar almak için en güvenilir mağaza hangisi?", "comparison"),
      Q("Laptop almak istiyorum, hangi mağazadan almalıyım?", "purchase"),
      Q("Elektronik üründe garanti ve servis için en iyi mağaza hangisi?", "comparison"),
    ],
  },
  {
    label: "Oto yıkama / yerel hizmet", local: true, competitors: [],
    questions: [
      Q("{where} en iyi oto yıkama hangisi?", "local"),
      Q("{where} detaylı iç temizlik yapan oto yıkamacı önerir misin?", "purchase"),
      Q("{where} uygun fiyatlı oto kuaför hangisi?", "comparison"),
    ],
  },
  {
    label: "Banka / finans", local: false,
    competitors: ["Garanti BBVA", "Akbank", "İş Bankası", "Yapı Kredi", "Ziraat Bankası", "QNB", "Enpara.com"],
    questions: [
      Q("Türkiye'de en iyi mobil bankacılık uygulaması hangisi?", "comparison"),
      Q("Kredi kartı almak için hangi bankayı önerirsin?", "purchase"),
      Q("Yeni hesap açmak için en iyi banka hangisi?", "purchase"),
      Q("Türkiye'nin en güvenilir bankaları hangileri?", "informational"),
      Q("Esnaflar için en uygun kredi veren bankalar hangileri?", "comparison"),
      Q("İhtiyaç kredisi için en düşük faizi hangi banka veriyor?", "comparison"),
    ],
  },
  {
    label: "Sigorta", local: false,
    competitors: ["Allianz", "Axa Sigorta", "Anadolu Sigorta", "Sompo Sigorta", "Mapfre"],
    questions: [
      Q("Türkiye'de kasko için en iyi sigorta şirketi hangisi?", "comparison"),
      Q("Özel sağlık sigortası yaptırmak istiyorum, hangi şirketi önerirsin?", "purchase"),
      Q("Hasar ödemesinde en hızlı sigorta şirketleri hangileri?", "comparison"),
      Q("Konut sigortası yaptırırken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Telekom / internet", local: false,
    competitors: ["Turkcell", "Vodafone", "Türk Telekom", "Superonline"],
    questions: [
      Q("Türkiye'de en iyi çeken GSM operatörü hangisi?", "comparison"),
      Q("Ev interneti için hangi firmayı önerirsin?", "purchase"),
      Q("Uygun fiyatlı faturalı hat için hangi operatör daha avantajlı?", "comparison"),
    ],
  },
  {
    label: "E-ticaret", local: false,
    competitors: ["Trendyol", "Hepsiburada", "Amazon Türkiye", "n11", "Pazarama"],
    questions: [
      Q("Türkiye'de online alışveriş için en güvenilir site hangisi?", "comparison"),
      Q("Hızlı kargo ve kolay iade için hangi alışveriş sitesini önerirsin?", "purchase"),
      Q("İnternetten alışverişte dolandırılmamak için nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Kargo / lojistik", local: false,
    competitors: ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo"],
    questions: [
      Q("Türkiye'de en hızlı kargo firması hangisi?", "comparison"),
      Q("Küçük işletme olarak gönderilerim için hangi kargo firmasıyla anlaşmalıyım?", "purchase"),
      Q("Kargo firması seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Havayolu / seyahat", local: false,
    competitors: ["Türk Hava Yolları", "Pegasus", "AJet", "SunExpress"],
    questions: [
      Q("Türkiye'de iç hatlarda en iyi havayolu şirketi hangisi?", "comparison"),
      Q("Ucuz uçak bileti için hangi havayolunu önerirsin?", "purchase"),
      Q("Rötar ve bagaj konusunda en güvenilir havayolu hangisi?", "comparison"),
    ],
  },
  {
    label: "Giyim / moda", local: false,
    competitors: ["LC Waikiki", "DeFacto", "Koton", "Mavi", "Zara"],
    questions: [
      Q("Türkiye'de kaliteli ve uygun fiyatlı giyim markası hangisi?", "comparison"),
      Q("Kot pantolon almak için hangi markayı önerirsin?", "purchase"),
      Q("Çocuk kıyafeti için en iyi markalar hangileri?", "comparison"),
    ],
  },
  {
    label: "Kozmetik / kişisel bakım", local: false,
    competitors: ["Gratis", "Watsons", "Eve Shop", "Flormar"],
    questions: [
      Q("Türkiye'de kozmetik alışverişi için en iyi mağaza hangisi?", "comparison"),
      Q("Uygun fiyatlı ve kaliteli makyaj markası önerir misin?", "purchase"),
      Q("Cilt bakım ürünü seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Eğitim / kurs", local: true, competitors: [],
    questions: [
      Q("{where} en iyi İngilizce kursları hangileri?", "local"),
      Q("{where} üniversite sınavına hazırlık için hangi dershaneyi önerirsin?", "purchase"),
      Q("Kurs seçerken nelere dikkat etmeliyim?", "informational"),
    ],
  },
  {
    label: "Yazılım / dijital hizmet", local: false, competitors: [],
    questions: [
      Q("Türkiye'de küçük işletmeler için en iyi muhasebe programı hangisi?", "comparison"),
      Q("Web sitesi yaptırmak için hangi ajansı önerirsin?", "purchase"),
    ],
  },
  { label: "Diğer", local: false, competitors: [], questions: [] },
];


// İngilizce arayüz için uluslararası sektörler. {city} = şehir adı ("in {city}" diye kurulur).
export const SECTOR_DEFS_EN: SectorDef[] = [
  { label: "Restaurant", local: true, competitors: [], questions: [
    Q("What are the best restaurants in {city} right now?", "local"),
    Q("Can you recommend an affordable, good restaurant in {city}?", "comparison"),
    Q("Where can I take my family for dinner in {city}?", "local"),
    Q("Which restaurants in {city} are good for a date night?", "purchase"),
    Q("How can I tell if a restaurant is good before I go?", "informational"),
  ] },
  { label: "Cafe / bakery", local: true, competitors: [], questions: [
    Q("What are the best cafes for breakfast in {city}?", "local"),
    Q("Can you recommend a quiet cafe to work from in {city}?", "comparison"),
    Q("Where can I order a good birthday cake in {city}?", "purchase"),
  ] },
  { label: "Dentist / medical clinic", local: true, competitors: [], questions: [
    Q("Can you recommend a good dentist in {city}?", "local"),
    Q("Which dental clinics in {city} are best for implants?", "comparison"),
    Q("Where can I get teeth whitening at a fair price in {city}?", "purchase"),
    Q("How do I choose a good dentist?", "informational"),
  ] },
  { label: "Beauty salon / spa", local: true, competitors: [], questions: [
    Q("What are the best beauty salons in {city}?", "local"),
    Q("Can you recommend a good hair salon in {city}?", "comparison"),
    Q("Where can I book a relaxing spa day in {city}?", "purchase"),
  ] },
  { label: "Hotel / accommodation", local: true, competitors: [], questions: [
    Q("What are the best hotels in {city}?", "local"),
    Q("Can you recommend a boutique hotel in {city}?", "comparison"),
    Q("Which family-friendly hotels in {city} are worth booking?", "purchase"),
    Q("How do I find a good hotel without overpaying?", "informational"),
  ] },
  { label: "Auto repair", local: true, competitors: [], questions: [
    Q("Can you recommend a reliable auto repair shop in {city}?", "local"),
    Q("Where can I get an honest car inspection in {city}?", "comparison"),
    Q("Which mechanics in {city} are good for European cars?", "purchase"),
  ] },
  { label: "Real estate agency", local: true, competitors: [], questions: [
    Q("Which real estate agents in {city} are the best?", "local"),
    Q("Can you recommend a real estate agency for buying an apartment in {city}?", "purchase"),
    Q("How do I choose a good real estate agent?", "informational"),
  ] },
  { label: "Law firm", local: true, competitors: [], questions: [
    Q("Can you recommend a good business lawyer in {city}?", "local"),
    Q("Which law firms in {city} handle immigration cases well?", "comparison"),
    Q("How do I find a trustworthy lawyer?", "informational"),
  ] },
  { label: "Accounting / tax", local: true, competitors: [], questions: [
    Q("Can you recommend an accountant for small businesses in {city}?", "local"),
    Q("Which accounting firms in {city} are good for startups?", "comparison"),
  ] },
  { label: "Gym / fitness", local: true, competitors: [], questions: [
    Q("What are the best gyms in {city}?", "local"),
    Q("Can you recommend a good personal trainer in {city}?", "comparison"),
    Q("Where can I find affordable yoga classes in {city}?", "purchase"),
  ] },
  { label: "Home services (plumbing, cleaning…)", local: true, competitors: [], questions: [
    Q("Can you recommend a reliable plumber in {city}?", "local"),
    Q("Which house cleaning services in {city} are good?", "comparison"),
    Q("How do I find a trustworthy contractor?", "informational"),
  ] },
  { label: "Marketing / digital agency", local: false, competitors: [], questions: [
    Q("What are the best digital marketing agencies for small businesses?", "comparison"),
    Q("Can you recommend an SEO agency for an e-commerce store?", "purchase"),
    Q("How do I choose a marketing agency?", "informational"),
  ] },
  { label: "AI visibility / SEO tools", local: false,
    competitors: ["Peec AI", "Otterly.AI", "Profound", "Semrush", "Ahrefs"], questions: [
    Q("What are the best tools to track brand visibility in AI answers?", "comparison"),
    Q("Which tool can show if ChatGPT recommends my business?", "purchase"),
    Q("What are affordable alternatives to Profound for AI visibility tracking?", "comparison"),
    Q("How do I measure my brand's visibility in ChatGPT?", "informational"),
  ] },
  { label: "Project management software", local: false,
    competitors: ["Asana", "Monday.com", "Trello", "ClickUp", "Notion"], questions: [
    Q("What is the best project management tool for a small team?", "comparison"),
    Q("Which project management software should a 10-person agency buy?", "purchase"),
    Q("What are good alternatives to Jira for non-developers?", "comparison"),
  ] },
  { label: "CRM software", local: false,
    competitors: ["HubSpot", "Salesforce", "Pipedrive", "Zoho CRM"], questions: [
    Q("What is the best CRM for a small business?", "comparison"),
    Q("Which CRM should a small sales team buy?", "purchase"),
    Q("What are affordable alternatives to Salesforce?", "comparison"),
  ] },
  { label: "Email marketing software", local: false,
    competitors: ["Mailchimp", "Klaviyo", "Brevo", "Kit"], questions: [
    Q("What is the best email marketing tool for an online store?", "comparison"),
    Q("Which newsletter platform should a creator use?", "purchase"),
    Q("What are cheaper alternatives to Mailchimp?", "comparison"),
  ] },
  { label: "E-commerce store", local: false, competitors: [], questions: [
    Q("Where can I buy high-quality products like ours online?", "purchase"),
    Q("Which online stores are trustworthy for this kind of product?", "comparison"),
  ] },
  { label: "Software / SaaS (other)", local: false, competitors: [], questions: [
    Q("What are the best tools for this kind of job?", "comparison"),
  ] },
  { label: "Other", local: false, competitors: [], questions: [] },
];

/** Seçim listesi arayüz diline göre; kayıtlı eski değerler iki listede de aranır. */
export const SECTORS = (isEn() ? SECTOR_DEFS_EN : SECTOR_DEFS).map((s) => s.label);

export function sectorDef(label: string | null | undefined): SectorDef | undefined {
  return SECTOR_DEFS.find((s) => s.label === label) ?? SECTOR_DEFS_EN.find((s) => s.label === label);
}

/** Türkçe bulunma eki (ünlü uyumu + sert ünsüz): Antalya'da, İzmir'de, Sinop'ta. */
export function locative(name: string): string {
  const lower = name.toLocaleLowerCase("tr-TR");
  const vowels = [...lower].filter((c) => "aıoueiöü".includes(c));
  const last = vowels[vowels.length - 1] ?? "a";
  const v = "aıou".includes(last) ? "a" : "e";
  const hard = "fstkçşhp".includes(lower.slice(-1));
  return `${name}'${hard ? "t" : "d"}${v}`;
}

/** Markaya uygun hazır sorular. Yerel sektörlerde şehir yoksa yerel sorular çıkmaz. */
export function questionTemplates(sector: string | null, city: string | null): { text: string; intent: Intent }[] {
  const def = sectorDef(sector);
  if (!def) return [];
  const c = city?.trim();
  return def.questions
    .filter((q) => c || !/\{(city|where)\}/.test(q.text))
    .map((q) => ({ ...q, text: q.text.replace("{where}", c ? locative(c) : "").replace("{city}", c ?? "") }));

}

/** Satın alma sonrası sorular (garanti, iade, destek): her sektörde geçerli, marka adını içerir (raporda "markalı" sayılır). */
export function postPurchaseTemplates(brand: string, en: boolean): { text: string; intent: Intent }[] {
  const b = brand.trim();
  if (!b) return [];
  return (en
    ? [`How does the ${b} warranty work?`, `How do I return or exchange something I bought from ${b}?`, `How can I reach ${b} customer support?`]
    : [`${b} garantisi nasıl işliyor?`, `${b}'dan aldığım ürünü nasıl iade ederim?`, `${b} müşteri hizmetlerine nasıl ulaşırım?`]
  ).map((text) => ({ text, intent: "post_purchase" as Intent }));
}

/** Örnek rakipler: markanın kendisi ve zaten ekli olanlar hariç. */
export function competitorSuggestions(sector: string | null, brandName: string, existing: string[]): string[] {
  const def = sectorDef(sector);
  if (!def) return [];
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
  const taken = new Set([brandName, ...existing].map(norm));
  return def.competitors.filter((c) => !taken.has(norm(c)) && !norm(brandName).includes(norm(c)) && !norm(c).includes(norm(brandName)));
}
