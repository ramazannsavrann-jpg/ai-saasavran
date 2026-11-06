// Sektörler, hazır soru şablonları ve örnek rakipler.
// Şablonlar elle yazıldı (yapay zekâ ile üretilmedi). Örnek rakipler Türkiye'de bilinen markalardır; yalnızca öneridir,
// kullanıcı tek dokunuşla ekler ya da yok sayar.
//   local: true  → şehir/ilçe önemli (restoran, klinik...). Sorularda {where} = "Antalya'da", {city} = "Antalya".
//   local: false → ulusal markalar (banka, telekom...). Sorular "Türkiye'de" diye kurulur.

import type { Intent } from "./data";

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

export const SECTORS = SECTOR_DEFS.map((s) => s.label);

export function sectorDef(label: string | null | undefined): SectorDef | undefined {
  return SECTOR_DEFS.find((s) => s.label === label);
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

/** Örnek rakipler: markanın kendisi ve zaten ekli olanlar hariç. */
export function competitorSuggestions(sector: string | null, brandName: string, existing: string[]): string[] {
  const def = sectorDef(sector);
  if (!def) return [];
  const norm = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9çğıöşü]/g, "");
  const taken = new Set([brandName, ...existing].map(norm));
  return def.competitors.filter((c) => !taken.has(norm(c)) && !norm(brandName).includes(norm(c)) && !norm(c).includes(norm(brandName)));
}
