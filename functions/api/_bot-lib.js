// Yapay zekâ botlarını kullanıcı aracısı (user agent) metninden tanır ve yayımlanmış IP listeleriyle doğrular.
// Kaynaklar: OpenAI (platform.openai.com/docs/bots), Perplexity, Anthropic ve Cloudflare bot listeleri.
// kind: "search" = yapay zekâ aramasında görünürlük, "user" = kullanıcının isteğiyle anlık getirme, "training" = eğitim verisi.
export const BOTS = [
  { name: "OAI-SearchBot", owner: "OpenAI", kind: "search", re: /OAI-SearchBot/i, ips: ["https://openai.com/searchbot.json"] },
  { name: "ChatGPT-User", owner: "OpenAI", kind: "user", re: /ChatGPT-User/i, ips: ["https://openai.com/chatgpt-user.json"] },
  { name: "GPTBot", owner: "OpenAI", kind: "training", re: /GPTBot/i, ips: ["https://openai.com/gptbot.json"] },
  { name: "Claude-SearchBot", owner: "Anthropic", kind: "search", re: /Claude-SearchBot/i },
  { name: "Claude-User", owner: "Anthropic", kind: "user", re: /Claude-User/i },
  { name: "ClaudeBot", owner: "Anthropic", kind: "training", re: /ClaudeBot|anthropic-ai/i },
  { name: "PerplexityBot", owner: "Perplexity", kind: "search", re: /PerplexityBot/i, ips: ["https://www.perplexity.com/perplexitybot.json"] },
  { name: "Perplexity-User", owner: "Perplexity", kind: "user", re: /Perplexity-User/i, ips: ["https://www.perplexity.com/perplexity-user.json"] },
  { name: "Google-CloudVertexBot", owner: "Google", kind: "user", re: /Google-CloudVertexBot/i },
  { name: "Applebot", owner: "Apple", kind: "search", re: /Applebot/i },
  { name: "Bingbot", owner: "Microsoft", kind: "search", re: /bingbot/i },
  { name: "DuckAssistBot", owner: "DuckDuckGo", kind: "search", re: /DuckAssistBot/i },
  { name: "MistralAI-User", owner: "Mistral", kind: "user", re: /MistralAI-User/i },
  { name: "meta-externalfetcher", owner: "Meta", kind: "user", re: /meta-externalfetcher/i },
  { name: "meta-externalagent", owner: "Meta", kind: "training", re: /meta-externalagent/i },
  { name: "Amazonbot", owner: "Amazon", kind: "training", re: /Amazonbot/i },
  { name: "Bytespider", owner: "ByteDance", kind: "training", re: /Bytespider/i },
  { name: "CCBot", owner: "Common Crawl", kind: "training", re: /CCBot/i },
];

/** Kullanıcı aracısından bot; tanınmazsa null. Sıra önemli: "ChatGPT-User" GPTBot'tan, "Claude-User" ClaudeBot'tan önce. */
export function detectBot(ua) {
  const s = String(ua ?? "");
  if (!s) return null;
  return BOTS.find((b) => b.re.test(s)) ?? null;
}

function ipv4ToInt(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}
/** IPv4 CIDR eşleşmesi (IPv6 adresler için false; doğrulanamadı sayılır). */
export function inCidr(ip, cidr) {
  const [net, bitsS] = String(cidr).split("/");
  const bits = Number(bitsS), a = ipv4ToInt(String(ip)), n = ipv4ToInt(net);
  if (a === null || n === null || !(bits >= 0 && bits <= 32)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((a & mask) >>> 0) === ((n & mask) >>> 0);
}
/** Liste JSON'undaki bütün IPv4 CIDR'leri (biçimden bağımsız). */
export function cidrsFrom(json) {
  const out = [];
  const walk = (v) => { if (typeof v === "string") { if (/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(v)) out.push(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  walk(json);
  return out;
}

/** Botun IP'si yayımlanmış listede mi? Liste yoksa veya alınamazsa false (doğrulanamadı). */
export async function verifyBotIp(bot, ip, fetchFn = fetch) {
  if (!bot?.ips?.length || !ip) return false;
  for (const url of bot.ips) {
    try {
      const r = await fetchFn(url, { cf: { cacheTtl: 21600, cacheEverything: true }, signal: AbortSignal.timeout(3000) });
      if (!r.ok) continue;
      if (cidrsFrom(await r.json()).some((c) => inCidr(ip, c))) return true;
    } catch { /* doğrulanamadı */ }
  }
  return false;
}

export function cleanPath(p) {
  let s = String(p ?? "/").split(/[?#]/)[0].slice(0, 200);
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/[^/]*@[^/]*/g, "(gizli)").replace(/\d{6,}/g, "(sayı)").replace(/[0-9a-f]{24,}/gi, "(kimlik)");
}

export async function recordBot(env, key, bot, path, status, verified) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/record_ai_bot`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ p_key: key, p_bot: bot, p_path: cleanPath(path), p_status: status, p_verified: verified }),
    signal: AbortSignal.timeout(5000),
  });
}
