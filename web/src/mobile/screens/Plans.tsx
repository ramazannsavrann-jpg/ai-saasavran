// Paketler: uygulamada abonelik ve ek soru paketi (Google Play). Fiyatlar mağazadan, ülkenin parasıyla gelir.
// Elmas yalnız sitede (uygulamada anılmaz). Sitede (Paddle) aboneliği olan hesap uygulamadan ikinci abonelik almaz.
// Google Play kuralı: uygulamada başka ödeme yoluna (site) yönlendiren bağlantı/metin yok.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoad } from "../../lib/app";
import { api } from "../../lib/data";
import { L } from "../../lib/i18n";
import { Err, Head, LoadError, Spinner, goBack, haptic } from "../ui";
import { PACKS, STORE_AVAILABLE, SUBS, buyPack, buySubscription, loadPrices, manage, refreshStoreSubs, restore, resultText, storeSubState, type StorePrices } from "../store";

export function Plans() {
  const nav = useNavigate();
  const { current, reload: reloadApp } = useApp();
  const bill = useLoad(() => (current ? api.billingState(current.id) : Promise.resolve(null)), [current?.id]);
  const quota = useLoad(() => (current ? api.quota(current.id) : Promise.resolve(null)), [current?.id]);
  const canPack = useLoad(() => (current ? api.canBuyQuotaPack(current.id) : Promise.resolve(false)), [current?.id]);
  const [prices, setPrices] = useState<StorePrices | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  // Yenilenecek (askıdaki/duraklatılmış dahil) Google Play aboneliği varken yeni abonelik alınmaz (çift ücret olur)
  const renewing = useLoad(() => (current ? storeSubState(current.id) : Promise.resolve(null)), [current?.id]);
  // Ekran açılınca mevcut abonelik Google'a yeniden sorulur: Google Play'de yapılan iptal/ödeme düzeltmesi hemen yansır
  const refreshed = useRef<string | null>(null);
  useEffect(() => {
    const rows = renewing.data?.rows;
    if (!current || !STORE_AVAILABLE || !rows?.length || refreshed.current === current.id) return;
    refreshed.current = current.id;
    void refreshStoreSubs(current.id, rows).then((n) => { if (n > 0) { bill.reload(); renewing.reload(); void reloadApp().catch(() => {}); } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, renewing.data]);
  const fetchPrices = () => { setPrices(undefined); void loadPrices().then(setPrices).catch(() => setPrices(null)); };
  useEffect(fetchPrices, []);
  // Yarım kalmış (sunucuya ulaşmamış) satın almalar sessizce tamamlanır; yoksa Google 3 gün sonra iade eder
  useEffect(() => {
    if (!current || !STORE_AVAILABLE) return;
    void restore(current.id, true).then((n) => { if (n > 0) { bill.reload(); quota.reload(); canPack.reload(); renewing.reload(); } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  if (!current) return <Spinner />;
  if (bill.error) return <LoadError full retry={bill.reload} />;
  if (bill.loading || !bill.data) return <Spinner />;
  const b = bill.data;
  const active = ["active", "trialing", "past_due"].includes(b.subscription_status ?? "");
  const onWeb = active && b.billing_source === "paddle";
  const onStore = active && b.billing_source === "google_play";
  const until = b.current_period_end ? new Date(b.current_period_end).toLocaleDateString(L("tr-TR", "en-US"), { day: "numeric", month: "long" }) : null;
  const reload = () => { bill.reload(); quota.reload(); canPack.reload(); renewing.reload(); void reloadApp().catch(() => {}); };
  const st = renewing.data;
  const hold = st?.hold ?? null;
  // Bilinmiyorsa (yükleniyor/hata) Google Play ile ödeyen alanda satış kapalı
  const lockedByStore = st ? st.renewing || !!hold : b.billing_source === "google_play";

  async function run(key: string, f: () => Promise<string>) {
    setBusy(key); setErr(null); setMsg(null); haptic.tap();
    try { const r = await f(); setMsg(resultText(r, L)); if (["ok", "pack_ok", "restored", "already_granted"].includes(r)) haptic.done(); reload(); }
    catch (e) {
      const nativeCode = String((e as { code?: unknown }).code ?? "");
      const code = (e as Error).message ?? "";
      if (nativeCode === "USER_CANCELED" || /cancel/i.test(code)) return; // kullanıcı vazgeçti (eklenti "Purchase is not purchased" + USER_CANCELED döner)
      if (nativeCode === "ITEM_ALREADY_OWNED") {
        // Zaten satın alınmış (ör. önceki doğrulama yarım kaldı): geri yükle ve sonucunu göster
        try { const n = await restore(current!.id); setMsg(resultText(n > 0 ? "restored" : "none", L)); if (n > 0) haptic.done(); reload(); }
        catch { setErr(resultText("", L)); }
        return;
      }
      setErr(resultText(code, L));
    } finally { setBusy(null); }
  }

  return (
    <div className="screen">
      <Head title={L("Paket", "Plan")} back={() => goBack(nav)} />
      {onWeb ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{L("Aboneliğiniz etkin", "Your subscription is active")}</b>
          <span className="muted">{L("Bu abonelik başka bir platformdan alındı; değişiklik ve iptal de oradan yapılır.", "This subscription was purchased on another platform; changes and cancellation are made there.")}</span>
        </div>
      ) : onStore ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{SUBS.find((s) => s.plan === b.plan) ? L(SUBS.find((s) => s.plan === b.plan)!.tr, SUBS.find((s) => s.plan === b.plan)!.en) : b.plan}</b>
          {until && <span className="muted">{b.subscription_status === "past_due" ? L(`Ödeme alınamadı; Google Play'de ödeme yönteminizi kontrol edin.`, `Payment failed; check your payment method in Google Play.`) : L(`Sonraki yenileme ya da bitiş: ${until}`, `Next renewal or end: ${until}`)}</span>}
          <button className="btn btn-ghost" onClick={() => void manage()}>{L("Google Play'de yönet", "Manage in Google Play")}</button>
          <span className="muted small">{L("İptal ederseniz ödediğiniz dönemin sonuna kadar kullanmaya devam edersiniz.", "If you cancel, you keep using it until the end of the period you paid for.")}</span>
        </div>
      ) : hold ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <b>{hold === "paused" ? L("Aboneliğiniz duraklatıldı", "Your subscription is paused") : L("Ödeme alınamadı", "Payment failed")}</b>
          <span className="muted">{hold === "paused"
            ? L("Google Play aboneliğiniz duraklatılmış. Devam ettirmek için Google Play'de yönetin; devam edince paketiniz kendiliğinden açılır. Yeni abonelik almayın, iki kez ücretlendirilirsiniz.", "Your Google Play subscription is paused. Resume it in Google Play; your plan reopens automatically. Don't buy a new subscription, or you'll be charged twice.")
            : L("Google Play aboneliğinizin ödemesi alınamadı. Google Play'de ödeme yönteminizi güncelleyin; ödeme alınınca paketiniz kendiliğinden açılır. Yeni abonelik almayın, iki kez ücretlendirilirsiniz.", "Google Play couldn't charge your subscription. Update your payment method in Google Play; your plan reopens automatically once payment goes through. Don't buy a new subscription, or you'll be charged twice.")}</span>
          <button className="btn btn-ghost" onClick={() => void manage()}>{L("Google Play'de yönet", "Manage in Google Play")}</button>
        </div>
      ) : null}

      {quota.data?.hybrid && (canPack.data ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label">{L("Ek soru hakkı", "Extra question credits")}</h2>
          <p className="muted small" style={{ margin: 0 }}>{L("Bu ayki soru hakkınız bitti. Ek paket bu ayın sonuna kadar geçerlidir.", "This month's credits are used up. An extra pack is valid until the end of this month.")}</p>
          {PACKS.map((p) => { const pr = prices?.packs[p.id]; return (
            <button key={p.id} className="row card" disabled={!pr || !!busy} onClick={() => pr && run(p.id, async () => { const r = await buyPack(pr, current.id); return r === "ok" ? "pack_ok" : r; })} style={{ justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{L(`${p.credits} soru hakkı`, `${p.credits} credits`)}</span>
              <span>{busy === p.id ? L("Bekleyin…", "Wait…") : pr?.priceString ?? "–"}</span>
            </button>); })}
        </section>
      ) : <p className="muted small" style={{ margin: 0 }}>{L(`Bu ay ${quota.data.manual_left} soru hakkınız kaldı. Ek paket, hakkınız bitince alınabilir.`, `${quota.data.manual_left} credits left this month. Extra packs can be bought once they run out.`)}</p>)}

      {!onWeb && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="label">{onStore ? L("Diğer paketler", "Other plans") : L("Paketler", "Plans")}</h2>
          {lockedByStore && !hold && <p className="muted small" style={{ margin: 0 }}>{L("Paket değiştirmek için önce mevcut aboneliğinizi Google Play'de iptal edin. İptal ettiğiniz paket dönem sonuna kadar açık kalır. Yeni paketi şimdi alırsanız hemen başlar ve ücreti hemen alınır.", "To switch plans, first cancel your current subscription in Google Play. The canceled plan stays active until its period ends. A new plan bought now starts right away and is charged right away.")}</p>}
          {!STORE_AVAILABLE || prices === null ? (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span>{L("Paketler şu an yüklenemedi. Biraz sonra tekrar deneyin.", "Plans couldn't be loaded right now. Please try again later.")}</span>
              {STORE_AVAILABLE && <button className="btn btn-ghost" onClick={fetchPrices}>{L("Tekrar dene", "Try again")}</button>}
            </div>
          ) : prices === undefined ? <Spinner /> : SUBS.map((s) => {
            const pr = prices.subs[s.id], mine = onStore && b.plan === s.plan;
            return (
              <article key={s.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b style={{ fontSize: 18 }}>{L(s.tr, s.en)}</b><b>{pr ? `${pr.priceString} ${L("/ ay", "/ mo")}` : "–"}</b></span>
                <span className="muted small">{L(`${s.brands} marka, marka başına ${s.prompts} soru. ChatGPT, Gemini, Claude ve Perplexity, canlı web aramasıyla. Ayda ${s.calls.toLocaleString("tr-TR")} sorgu: %30 haftalık otomatik ölçüm, %70 soru hakkı.`, `${s.brands} brand(s), ${s.prompts} questions each. ChatGPT, Gemini, Claude and Perplexity, with live web search. ${s.calls.toLocaleString("en-US")} queries a month: 30% weekly automatic, 70% question credits.`)}</span>
                {mine ? <span className="badge b-rec" style={{ alignSelf: "flex-start" }}>{L("Şu anki paketiniz", "Your current plan")}</span>
                  : lockedByStore ? null
                  : <button className="btn btn-primary" disabled={!pr || !!busy} onClick={() => pr && run(s.id, () => buySubscription(pr, current.id))}>{busy === s.id ? L("Bekleyin…", "Wait…") : L("Abone ol", "Subscribe")}</button>}
              </article>
            );
          })}
          <p className="muted small" style={{ margin: 0 }}>{L("Ödeme Google Play hesabınızdan alınır ve her ay yenilenir. İstediğiniz zaman Google Play'den iptal edebilirsiniz; ödediğiniz dönemin sonuna kadar kullanırsınız.", "Payment is charged to your Google Play account and renews monthly. Cancel any time in Google Play; you keep access until the end of the paid period.")}</p>
        </section>
      )}
      <Err msg={err} />
      {msg && <p className="ok" role="status">{msg}</p>}
      {STORE_AVAILABLE && !onWeb && <button className="btn btn-text" disabled={!!busy} onClick={() => run("restore", async () => { const n = await restore(current.id); return n > 0 ? "restored" : "none"; })}>{L("Satın almaları geri yükle", "Restore purchases")}</button>}
    </div>
  );
}
