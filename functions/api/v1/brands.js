// GET /api/v1/brands — çalışma alanındaki markalar (Bearer aisv_… anahtarı).
import { authenticate, errorText, rpc } from "../_api-lib.js";
const json = (b, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } });

export async function onRequestGet({ request, env }) {
  const a = await authenticate(request, env).catch(() => ({ error: "unavailable", status: 503 }));
  if (a.error) return json({ error: a.error, message: errorText(a.error) }, a.status);
  return json({ workspace: a.workspace, brands: await rpc(env, "api_brands", { p_workspace: a.workspace_id }) });
}
