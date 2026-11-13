// Kendi sitemiz (aisaasavran.com): yapay zekâ botlarının isteklerini sayar. Bot olmayan isteklere dokunmaz;
// sayım cevabı geciktirmez (waitUntil). Statik dosyalar _routes.json ile hariç tutulur.
import { detectBot, recordBot, verifyBotIp } from "./api/_bot-lib.js";
const OWN_TRACK_KEY = "552ec134-8c6a-4ffe-a923-2697cd66bf65";

export async function onRequest(ctx) {
  const res = await ctx.next();
  try {
    const bot = detectBot(ctx.request.headers.get("user-agent"));
    if (bot && ctx.env.SUPABASE_URL && ctx.env.SUPABASE_SERVICE_ROLE_KEY) {
      const url = new URL(ctx.request.url);
      if (!url.pathname.startsWith("/api/")) {
        const ip = ctx.request.headers.get("cf-connecting-ip") || "";
        ctx.waitUntil(verifyBotIp(bot, ip).then((v) => recordBot(ctx.env, OWN_TRACK_KEY, bot.name, url.pathname, res.status, v)).catch(() => {}));
      }
    }
  } catch { /* sayım hiçbir zaman siteyi bozmaz */ }
  return res;
}
