// Paketler: uygulamada abonelik ve ek soru paketi (Google Play). Fiyatlar mağazadan, ülkenin parasıyla gelir.
// Elmas yalnız sitede. Sitede (Paddle) aboneliği olan hesap uygulamadan ikinci abonelik almaz; yönetim sitede.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api } from "../../lib/data";
import { SITE_ORIGIN } from "../../lib/env";
import { L } from "../../lib/i18n";
import { Err, Head, Spinner, goBack, haptic } from "../ui";
import { PACKS, STORE_AVAILABLE, SUBS, buyPack, buySubscription, loadPrices, manage, restore, resultText, type StorePrices } from "../store";

export function Plans() {
  const nav = useNavigate();
  const { current } = useApp();
  const bill = useLoad(() => (current ? api.billingState(current.id) : Promise.resolve(null)), [current?.id]);
  const quota = useLoad(() => (current ? api.quota(current.id) : Promise.resolve(null)), [current?.id]);
  const canPack = useLoad(() => (current ? api.canBuyQuotaPack(current.id) : Promise.resolve(false)), [current?.id]);
  const [prices, setPrices] = useState<StorePrices | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { void loadPrices().then(setPrices).catch(() => setPrices(null)); }, []);
  if (!current || bill.loading || !bill.data) return <Spinner />;
  const b = bill.data;
  const active = ["active", "trialing", "past_due"].includes(b.subscription_status ?? "");
  const onWeb = active && b.billing_source === "paddle";
  const onStore = active && b.billing_source === "google_play";
  const until = b.current_period_end ? new Date(b.current_period_end).toLocaleDateString(L("tr-TR", "en-US"), { day: "numeric", month: "long" }) : null;
  const reload = () => { bill.reload(); quota.reload(); canPack.reload(); };

  async function run(key: string, f: () => Promise<string>) {
    setBusy(key); setErr(null); setMsg(null); haptic.tap();
    try { const r = await f(); setMsg(resultText(r, L)); if (r === "ok" || r === "already_granted") haptic.done(); reload(); }
    catch (e) {
      const code = (e as Error).message ?? "";
      if (/cancel/i.test(code)) { setBusy(null); return; } // kullanıcı vazgeçti
      setErr(resultText(code, L));
    } finally { setBusy(null); }
  }

  return (
    <div className="screen">
      <Head title={L("Paket", "Plan")} back={() => goBack(nav)} />
      {onWeb ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{L("Aboneliğiniz sitede", "Your subscription is on the website")}</b>
          <span className="muted">{L("Paketinizi değiştirmek ya da iptal etmek için aisaasavran.com'a giriş yapın.", "To change or cancel your plan, sign in at aisaasavran.com.")}</span>
          <a className="btn btn-ghost" href={`${SITE_ORIGIN}/panel`} target="_blank" rel="noreferrer">{L("Siteyi aç", "Open the website")}</a>
        </div>
      ) : onStore ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{SUBS.find((s) => s.plan === b.plan) ? L(SUBS.find((s) => s.plan === b.plan)!.tr, SUBS.find((s) => s.plan === b.plan)!.en) : b.plan}</b>
          {until && <span className="muted">{b.subscription_status === "past_due" ? L(`Ödeme alınamadı; Google Play'de ödeme yönteminizi kontrol edin.`, `Payment failed; check your payment method in Google Play.`) : L(`Sonraki yenileme ya da bitiş: ${until}`, `Next renewal or end: ${until}`)}</span>}
          <button className="btn btn-ghost" onClick={() => void manage()}>{L("Google Play'de yönet", "Manage in Google Play")}</button>
          <span className="muted small">{L("İptal ederseniz ödediğiniz dönemin sonuna kadar kullanmaya devam edersiniz.", "If you cancel, you keep using it until the end of the period you paid for.")}</span>
        </div>
      ) : null}

      {quota.data?.hybrid && (canPack.data ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label">{L("Ek soru hakkı", "Extra question credits")}</h2>
          <p className="muted small" style={{ margin: 0 }}>{L("Bu ayki soru hakkınız bitti. Ek paket bu ayın sonuna kadar geçerlidir.", "This month's credits are used up. An extra pack is valid until the end of this month.")}</p>
          {PACKS.map((p) => { const pr = prices?.packs[p.id]; return (
            <button key={p.id} className="row card" disabled={!pr || !!busy} onClick={() => pr && run(p.id, () => buyPack(pr, current.id))} style={{ justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{L(`${p.credits} soru hakkı`, `${p.credits} credits`)}</span>
              <span>{busy === p.id ? L("Bekleyin…", "Wait…") : pr?.priceString ?? "–"}</span>
            </button>); })}
        </section>
      ) : <p className="muted small" style={{ margin: 0 }}>{L(`Bu ay ${quota.data.manual_left} soru hakkınız kaldı. Ek paket, hakkınız bitince alınabilir.`, `${quota.data.manual_left} credits left this month. Extra packs can be bought once they run out.`)}</p>)}

      {!onWeb && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label">{onStore ? L("Paket değiştir", "Change plan") : L("Paketler", "Plans")}</h2>
          {!STORE_AVAILABLE || prices === null ? (
            <p className="card" style={{ margin: 0 }}>{L("Uygulama içi ödeme şu an kullanılamıyor. Paketleri aisaasavran.com'dan alabilirsiniz.", "In-app payment isn't available right now. You can buy plans at aisaasavran.com.")}</p>
          ) : prices === undefined ? <Spinner /> : SUBS.map((s) => {
            const pr = prices.subs[s.id], mine = onStore && b.plan === s.plan;
            return (
              <article key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 18 }}>{L(s.tr, s.en)}</b><b>{pr ? `${pr.priceString} ${L("/ ay", "/ mo")}` : "–"}</b></span>
                <span className="muted small">{L(`${s.brands} marka, marka başına ${s.prompts} soru. ChatGPT, Claude, Perplexity (canlı arama) ve Gemini. Ayda ${s.calls.toLocaleString("tr-TR")} sorgu: %30 haftalık otomatik ölçüm, %70 soru hakkı.`, `${s.brands} brand(s), ${s.prompts} questions each. ChatGPT, Claude, Perplexity (live search) and Gemini. ${s.calls.toLocaleString("en-US")} queries a month: 30% weekly automatic, 70% question credits.`)}</span>
                {mine ? <span className="badge b-rec" style={{ alignSelf: "flex-start" }}>{L("Şu anki paketiniz", "Your current plan")}</span>
                  : <button className="btn btn-primary" disabled={!pr || !!busy} onClick={() => pr && run(s.id, () => buySubscription(pr, current.id))}>{busy === s.id ? L("Bekleyin…", "Wait…") : onStore ? L("Bu pakete geç", "Switch to this plan") : L("Abone ol", "Subscribe")}</button>}
              </article>
            );
          })}
          <p className="muted small" style={{ margin: 0 }}>{L("Ödeme Google Play hesabınızdan alınır ve her ay yenilenir. İstediğiniz zaman Google Play'den iptal edebilirsiniz; ödediğiniz dönemin sonuna kadar kullanırsınız. 15 markaya kadar kullanım (Elmas) yalnız aisaasavran.com'da.", "Payment is charged to your Google Play account and renews monthly. Cancel any time in Google Play; you keep access until the end of the paid period. Up to 15 brands (Diamond) is available only at aisaasavran.com.")}</p>
        </section>
      )}
      <Err msg={err} />
      {msg && <p className="ok" role="status">{msg}</p>}
      {STORE_AVAILABLE && !onWeb && <button className="btn btn-text" disabled={!!busy} onClick={() => run("restore", async () => { const n = await restore(current.id); return n > 0 ? "ok" : "none"; })}>{L("Satın almaları geri yükle", "Restore purchases")}</button>}
    </div>
  );
}
