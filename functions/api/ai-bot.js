// Müşteri sunucusundan (WordPress eklentisi, Cloudflare kodu) bot isteği bildirimi. Bot adı sunucuda kullanıcı aracısından
// yeniden belirlenir (gönderilen ada güvenilmez); IP yalnız doğrulamada kullanılır, saklanmaz.
import { detectBot, recordBot, verifyBotIp } from "./_bot-lib.js";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function onRequestPost({ request, env }) {
  const no = (s = 204) => new Response(null, { status: s });
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return no(503);
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 4000)); } catch { return no(400); }
  const key = String(b?.k ?? "");
  if (!UUID.test(key)) return no(400);
  const bot = detectBot(String(b?.ua ?? "").slice(0, 500));
  if (!bot) return no(204);
  const status = Number.isInteger(b?.status) ? b.status : 200;
  const verified = await verifyBotIp(bot, String(b?.ip ?? "").slice(0, 64));
  try { await recordBot(env, key, bot.name, b?.path, status, verified); } catch { /* sayılamadı */ }
  return no(204);
}
