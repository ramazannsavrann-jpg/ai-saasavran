// GET /api/v1/brands/:id — marka raporu özeti (son ölçümler, rakipler, sorular, kaynak siteler).
import { UUID, authenticate, errorText, rpc, summarize } from "../../_api-lib.js";
const json = (b, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" } });

export async function onRequestGet({ request, env, params }) {
  const a = await authenticate(request, env).catch(() => ({ error: "unavailable", status: 503 }));
  if (a.error) return json({ error: a.error, message: errorText(a.error) }, a.status);
  if (!UUID.test(String(params.id))) return json({ error: "not_found", message: errorText("not_found") }, 404);
  const rep = await rpc(env, "api_brand_report", { p_workspace: a.workspace_id, p_brand: params.id });
  return rep ? json(summarize(rep)) : json({ error: "not_found", message: errorText("not_found") }, 404);
}
