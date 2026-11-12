// MCP (Model Context Protocol) sunucusu: durumsuz "Streamable HTTP", yalnız JSON cevap. Ağ yok; test edilebilir.
export const PROTOCOL = "2025-06-18";
export const TOOLS = [
  {
    name: "list_brands",
    title: "List brands",
    description: "List the brands tracked in this AI SaaSavran workspace, with sector, city, country and last measurement time.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_brand_report",
    title: "Get AI visibility report",
    description: "Get the latest AI visibility report for one brand: how often ChatGPT, Claude and Gemini mention and recommend it versus competitors, trend over time, per-question results and the websites the AI cited.",
    inputSchema: { type: "object", properties: { brand_id: { type: "string", description: "Brand id from list_brands" } }, required: ["brand_id"], additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
];

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

/**
 * Tek bir JSON-RPC mesajını işler. deps: { listBrands(), brandReport(id) } (çağıranın yetkisiyle).
 * Bildirimler (id'siz) için null döner.
 */
export async function handleMessage(msg, deps) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return err(msg?.id ?? null, -32600, "Invalid Request");
  const isNote = msg.id === undefined || msg.id === null;
  switch (msg.method) {
    case "initialize":
      return ok(msg.id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "aisaasavran", title: "AI SaaSavran", version: "1.0.0" },
        instructions: "Read-only access to AI visibility measurements. Call list_brands first, then get_brand_report with a brand id.",
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: TOOLS });
    case "tools/call": {
      const name = msg.params?.name, args = msg.params?.arguments ?? {};
      try {
        if (name === "list_brands") {
          const brands = await deps.listBrands();
          return ok(msg.id, { content: [{ type: "text", text: JSON.stringify(brands) }], structuredContent: { brands } });
        }
        if (name === "get_brand_report") {
          if (typeof args.brand_id !== "string") return ok(msg.id, { content: [{ type: "text", text: "brand_id is required" }], isError: true });
          const rep = await deps.brandReport(args.brand_id);
          if (!rep) return ok(msg.id, { content: [{ type: "text", text: "Brand not found in this workspace." }], isError: true });
          return ok(msg.id, { content: [{ type: "text", text: JSON.stringify(rep) }], structuredContent: rep });
        }
        return err(msg.id, -32602, `Unknown tool: ${name}`);
      } catch {
        return ok(msg.id, { content: [{ type: "text", text: "Temporary error, try again." }], isError: true });
      }
    }
    default:
      return isNote ? null : err(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
