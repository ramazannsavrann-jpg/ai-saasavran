// API ve MCP: yapay zekâ ajanlarının (Claude, ChatGPT, kendi araçlarınız) raporlarınızı okuması için anahtarlar.
import { useState, type FormEvent } from "react";
import { useApp, useLoad } from "../lib/app";
import { api } from "../lib/data";
import { friendlyError } from "../lib/supabase";
import { L, isEn } from "../lib/i18n";
import { formatDate, formatDateTime } from "../lib/report";
import { Button, Confirm, ErrorBox, Field } from "./ui";

export function ApiPanel() {
  const { current } = useApp();
  const ws = current!;
  const team = useLoad(() => api.team(ws.id), [ws.id]);
  const me = (team.data ?? []).find((m) => m.is_me);
  const isAdmin = me?.role === "owner" || me?.role === "admin";
  const keys = useLoad(() => (isAdmin ? api.apiKeys(ws.id) : Promise.resolve([])), [ws.id, isAdmin]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  if (ws.kind !== "business" && ws.kind !== "agency") return null;
  const eligible = ws.plan === "pro" || ws.plan === "agency";
  const origin = location.origin;
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name") || "").trim() || "API";
    setBusy(true); setErr(null); setCopied(false);
    try { setFresh(await api.createApiKey(ws.id, name)); form.reset(); keys.reload(); }
    catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
  }
  return (
    <section className="panel stack" id="api">
      <h2>{L("API ve MCP (yapay zekâ ajanları)", "API and MCP (AI agents)")}</h2>
      <p className="muted">{L("Claude, ChatGPT ya da kendi araçlarınız raporlarınızı okuyabilsin: markalar, son ölçümler, rakipler, sorular ve kaynak siteler. Salt okunur; ölçüm başlatmaz, ücret doğurmaz. Anahtar başına günde 1000 istek.", "Let Claude, ChatGPT or your own tools read your reports: brands, latest measurements, competitors, questions and sources. Read-only; it doesn't start measurements or cost anything. 1000 requests per key per day.")}</p>
      {!eligible ? <p className="caution">{L("API ve MCP erişimi Pro ve Business paketlerinde var.", "API and MCP access is available on Pro and Business.")}</p> : !isAdmin ? <p className="muted">{L("Anahtarları sahip ya da yönetici oluşturur.", "Owners and admins create keys.")}</p> : (
        <>
          <form className="row-form" onSubmit={create} aria-label={L("API anahtarı oluştur", "Create API key")}>
            <Field label={L("Anahtar adı", "Key name")} name="name" maxLength={60} placeholder={L("Örn. Claude", "e.g. Claude")} />
            <Button type="submit" busy={busy}>{L("Anahtar oluştur", "Create key")}</Button>
          </form>
          <ErrorBox message={err} />
          {fresh && (
            <div className="success-box stack" role="status">
              <strong>{L("Anahtarınız (yalnız şimdi gösterilir, saklayın):", "Your key (shown only now, keep it safe):")}</strong>
              <code className="key-box">{fresh}</code>
              <button className="link-btn" onClick={async () => { try { await navigator.clipboard.writeText(fresh); setCopied(true); } catch { /* yok say */ } }}>{copied ? L("Kopyalandı", "Copied") : L("Kopyala", "Copy")}</button>
            </div>
          )}
          {(keys.data ?? []).length > 0 && (
            <ul className="rows">{(keys.data ?? []).map((k) => (
              <li key={k.id}>
                <span><strong>{k.name}</strong><span className="q-meta"><code>{k.prefix}…</code> · {isEn() ? `created ${formatDate(k.created_at)}` : `${formatDate(k.created_at)} oluşturuldu`} · {k.last_used_at ? (isEn() ? `last used ${formatDateTime(k.last_used_at)}` : `son kullanım ${formatDateTime(k.last_used_at)}`) : L("hiç kullanılmadı", "never used")}</span></span>
                <Confirm label={L("Anahtar iptal edilsin mi?", "Revoke key?")} onConfirm={async () => { await api.revokeApiKey(k.id); keys.reload(); }}>{L("İptal et", "Revoke")}</Confirm>
              </li>
            ))}</ul>
          )}
          <details>
            <summary>{L("Nasıl bağlanır?", "How to connect")}</summary>
            <div className="stack small">
              <p><strong>MCP</strong> {L("(Claude Desktop, Claude Code, Cursor ve MCP destekleyen diğer araçlar):", "(Claude Desktop, Claude Code, Cursor and other MCP clients):")}</p>
              <pre className="code">{`URL: ${origin}/api/mcp\nHeader: Authorization: Bearer aisv_...`}</pre>
              <p>{L("Claude Code örneği:", "Claude Code example:")}</p>
              <pre className="code">{`claude mcp add --transport http aisaasavran ${origin}/api/mcp --header "Authorization: Bearer aisv_..."`}</pre>
              <p>{L("Araçlar: list_brands (markalar), get_brand_report (marka raporu).", "Tools: list_brands, get_brand_report.")}</p>
              <p><strong>REST API</strong></p>
              <pre className="code">{`GET ${origin}/api/v1/brands\nGET ${origin}/api/v1/brands/<brand_id>\nAuthorization: Bearer aisv_...`}</pre>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
