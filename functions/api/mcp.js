// MCP sunucusu: https://aisaasavran.com/api/mcp  (Authorization: Bearer aisv_… — Pro ve Business)
import { UUID, authenticate, errorText, rpc, summarize } from "./_api-lib.js";
import { handleMessage } from "./_mcp-lib.js";

const H = { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id" };

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { ...H, "access-control-allow-methods": "POST, OPTIONS" } });
}
export async function onRequestGet() {
  // Sunucudan istemciye akış (SSE) yok: durumsuz, yalnız POST
  return new Response(JSON.stringify({ error: "Use POST (MCP Streamable HTTP, JSON responses)." }), { status: 405, headers: { ...H, allow: "POST" } });
}
export async function onRequestPost({ request, env }) {
  const a = await authenticate(request, env).catch(() => ({ error: "unavailable", status: 503 }));
  if (a.error) return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: errorText(a.error) } }), { status: a.status, headers: { ...H, "www-authenticate": 'Bearer realm="aisaasavran"' } });
  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }), { status: 400, headers: H }); }
  const deps = {
    listBrands: () => rpc(env, "api_brands", { p_workspace: a.workspace_id }),
    brandReport: async (id) => {
      if (!UUID.test(id)) return null;
      const rep = await rpc(env, "api_brand_report", { p_workspace: a.workspace_id, p_brand: id });
      return rep ? summarize(rep) : null;
    },
  };
  const msgs = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(msgs.map((m) => handleMessage(m, deps)))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202, headers: H });
  return new Response(JSON.stringify(Array.isArray(body) ? out : out[0]), { status: 200, headers: H });
}
