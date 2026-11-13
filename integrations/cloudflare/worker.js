// AI SaaSavran: Cloudflare Worker ile yapay zekâ botu sayacı. Sitenizin önüne bir Worker rotası olarak ekleyin
// ve SITE_KEY değerini raporunuzdaki site anahtarıyla değiştirin. Bot olmayan isteklere dokunmaz, cevabı geciktirmez.
const SITE_KEY = "BURAYA-SITE-ANAHTARINIZ";
const BOT_RE = /OAI-SearchBot|ChatGPT-User|GPTBot|Claude-SearchBot|Claude-User|ClaudeBot|anthropic-ai|PerplexityBot|Perplexity-User|Google-CloudVertexBot|Applebot|bingbot|DuckAssistBot|MistralAI-User|meta-external|Amazonbot|Bytespider|CCBot/i;

export default {
  async fetch(request, env, ctx) {
    const res = await fetch(request);
    const ua = request.headers.get("user-agent") || "";
    if (BOT_RE.test(ua)) {
      const url = new URL(request.url);
      ctx.waitUntil(fetch("https://aisaasavran.com/api/ai-bot", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ k: SITE_KEY, ua: ua.slice(0, 500), ip: request.headers.get("cf-connecting-ip") || "", path: url.pathname, status: res.status }),
      }).catch(() => {}));
    }
    return res;
  },
};
