import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../lib/app";
import { Button, ErrorBox } from "./ui";
import { L, isEn } from "../lib/i18n";
import { PLAN_INFO, billingSummary, openCheckout, openPortal, paymentsEnabled, planName, type BillingSummary, type PaidPlan } from "../lib/billing";

const FEATURES: Record<PaidPlan, () => string> = {
  starter: () => L("1 marka, 25 soru, 5 rakip. ChatGPT canlı web araması + Gemini, her hafta.", "1 brand, 25 questions, 5 competitors. ChatGPT with live web search + Gemini, every week."),
  pro: () => L("5 marka, her biri 30 soru, marka başına 8 rakip.", "5 brands, 30 questions each, 8 competitors per brand."),
  agency: () => L("15 marka, her biri 30 soru, marka başına 10 rakip. Ajanslar için.", "15 brands, 30 questions each, 10 competitors per brand. For agencies."),
};
const ACTIVE = ["active", "trialing", "past_due"];

/** Hesap sayfası: paket ve ödeme. Ücretli pakete geçiş Paddle penceresiyle; abonelik yönetimi Paddle portalında. */
export function BillingPanel() {
  const { current, session, reload } = useApp();
  const [params, setParams] = useSearchParams();
  const [sum, setSum] = useState<BillingSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(params.get("paid") ? L("Ödemeniz alındı. Paketiniz birkaç saniye içinde güncellenir.", "Payment received. Your plan updates within a few seconds.") : null);
  const autoOpened = useRef(false);

  const refresh = async () => { if (current) setSum(await billingSummary(current.id)); };
  useEffect(() => { refresh(); }, [current?.id]);

  // Ödeme sonrası: bildirim gelene kadar kısa aralıklarla yenile
  useEffect(() => {
    if (!params.get("paid") || !current) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const s = await billingSummary(current.id);
      setSum(s);
      if ((s && ACTIVE.includes(s.subscription_status ?? "")) || n >= 15) { clearInterval(t); reload(); if (s && ACTIVE.includes(s.subscription_status ?? "")) setNotice(L(`${planName(s.plan)} paketiniz açıldı.`, `Your ${planName(s.plan)} plan is active.`)); }
    }, 2000);
    return () => clearInterval(t);
  }, [current?.id]);

  const customerWs = current && (current.kind === "business" || current.kind === "agency");
  const subscribed = !!sum && ACTIVE.includes(sum.subscription_status ?? "");

  async function upgrade(plan: PaidPlan) {
    if (!current) return;
    setBusy(plan); setErr(null);
    try {
      await openCheckout(plan, current.id, session?.user.email, (name) => {
        if (name === "checkout.completed") setNotice(L("Ödemeniz alındı. Paketiniz birkaç saniye içinde güncellenir.", "Payment received. Your plan updates within a few seconds."));
      });
    } catch { setErr(L("Ödeme penceresi açılamadı. Sayfayı yenileyip tekrar deneyin.", "Couldn't open the checkout. Refresh the page and try again.")); }
    setBusy(null);
  }
  async function manage() {
    if (!current) return;
    setBusy("portal"); setErr(null);
    try { await openPortal(current.id); }
    catch { setErr(L("Abonelik sayfası açılamadı. Birazdan tekrar deneyin ya da info@aisaasavran.com adresine yazın.", "Couldn't open the subscription page. Try again shortly or email info@aisaasavran.com.")); setBusy(null); }
  }

  // Fiyat sayfasından gelen ?plan=… ile pencereyi bir kez otomatik aç
  useEffect(() => {
    const p = params.get("plan") as PaidPlan | null;
    if (!p || !(p in PLAN_INFO) || autoOpened.current || !current || !customerWs || !sum || subscribed || !paymentsEnabled()) return;
    autoOpened.current = true;
    params.delete("plan"); setParams(params, { replace: true });
    upgrade(p);
  }, [current?.id, sum]);

  if (!current || !customerWs) return null;
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(isEn() ? "en-US" : "tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "");

  return (
    <section className="panel stack" id="paket">
      <h2>{L("Paket ve ödeme", "Plan and billing")}</h2>
      <p className="muted">{L("Çalışma alanı", "Workspace")}: <strong>{current.name}</strong>. {L("Şu anki paket", "Current plan")}: <strong>{planName(sum?.plan ?? current.plan)}</strong>
        {subscribed && sum?.current_period_end && <>. {sum.subscription_status === "past_due" ? L("Ödeme alınamadı; kart bilginizi güncelleyin.", "Payment failed; please update your card.") : L(`Sonraki yenileme: ${date(sum.current_period_end)}`, `Renews on ${date(sum.current_period_end)}`)}</>}
      </p>
      {notice && <p className="success-box">{notice}</p>}
      <ErrorBox message={err} />
      {subscribed ? (
        <div className="stack">
          <p className="muted">{L("Paket değiştirmek, kart bilgisini güncellemek, fatura indirmek ya da iptal etmek için abonelik sayfasını açın. İptal, ödenmiş dönemin sonunda geçerli olur.", "Open the subscription page to change plans, update your card, download invoices or cancel. Cancellation takes effect at the end of the paid period.")}</p>
          <Button variant="quiet" busy={busy === "portal"} onClick={manage}>{L("Aboneliği yönet", "Manage subscription")}</Button>
        </div>
      ) : !paymentsEnabled() ? (
        <p className="muted">{L("Ücretli paketler yakında açılacak.", "Paid plans open soon.")}</p>
      ) : (
        <div className="plan-pick">
          {(Object.keys(PLAN_INFO) as PaidPlan[]).map((p) => (
            <div key={p} className={`plan-opt${p === "starter" ? " plan-opt-main" : ""}`}>
              <h3>{PLAN_INFO[p].name} <span className="muted">${PLAN_INFO[p].price}{L("/ay", "/month")}</span></h3>
              <p className="muted">{FEATURES[p]()}</p>
              <Button variant={p === "starter" ? "primary" : "quiet"} busy={busy === p} onClick={() => upgrade(p)}>{L(`${PLAN_INFO[p].name}'a geç`, `Upgrade to ${PLAN_INFO[p].name}`)}</Button>
            </div>
          ))}
          <p className="small muted">{L("Aylık ödeme, istediğiniz zaman iptal. İlk ödemeden sonraki 14 gün içinde tam iade. Ödemeler yetkili satıcımız Paddle üzerinden alınır.", "Monthly billing, cancel anytime. Full refund within 14 days of your first payment. Payments are processed by our reseller, Paddle.")}</p>
        </div>
      )}
    </section>
  );
}
