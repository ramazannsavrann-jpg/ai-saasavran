// İlk 5 dakika rehberi: yeni müşteriyi marka → sorular → rakip → ilk ölçüm → rapor sırasıyla yürütür.
// Her adımın durumu gerçek veriden okunur (soru, rakip ve ölçüm sayısı); hiçbir şey varsayılmaz.
import { useEffect, useState, type ReactNode } from "react";
import { api, CHANGED, type Brand, type Run } from "../lib/data";
import { useLoad } from "../lib/app";
import { questionTemplates } from "../lib/sectors";
import { friendlyError } from "../lib/supabase";
import { L, isEn } from "../lib/i18n";
import { Button } from "./ui";

export const GUIDE_MIN_QUESTIONS = 3;
const offKey = (id: string) => `aisv-guide-off-${id}`;
const isOff = (id: string) => { try { return localStorage.getItem(offKey(id)) === "1"; } catch { return false; } };

export function StartGuide({ brand, runs, onRunsChange, goTab }: { brand: Brand; runs: Run[]; onRunsChange: () => void; goTab: (tab: "rapor" | "oneriler" | "rakipler" | "sorular") => void }) {
  const prompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const rivals = useLoad(() => api.competitors(brand.id), [brand.id]);
  const [off, setOff] = useState(() => isOff(brand.id));
  const [busy, setBusy] = useState<"q" | "run" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [skipRival, setSkipRival] = useState(false);

  useEffect(() => {
    const h = () => { prompts.reload(); rivals.reload(); };
    window.addEventListener(CHANGED, h);
    return () => window.removeEventListener(CHANGED, h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id]);

  if (off || !prompts.data || !rivals.data) return null;
  const doneRuns = runs.filter((r) => r.status === "done").length;
  // Eski müşteriler: birden fazla tamamlanmış ölçümü olan markada rehber gösterilmez
  if (doneRuns >= 2) return null;

  const active = prompts.data.filter((p) => p.active).length;
  const pending = runs.find((r) => r.status === "queued" || r.status === "running");
  const failedOnly = runs.length > 0 && !pending && doneRuns === 0;
  const steps = [
    { key: "marka", done: true },
    { key: "sorular", done: active >= GUIDE_MIN_QUESTIONS },
    { key: "rakip", done: rivals.data.length > 0 || skipRival || runs.length > 0 },
    { key: "olcum", done: !!pending || doneRuns > 0 },
    { key: "rapor", done: doneRuns > 0 },
  ] as const;
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done)?.key ?? null;
  const close = () => { try { localStorage.setItem(offKey(brand.id), "1"); } catch { /* yok say */ } setOff(true); };

  const existing = new Set(prompts.data.map((p) => p.text));
  const ideas = questionTemplates(brand.sector, brand.city).filter((q) => !existing.has(q.text));
  const need = Math.max(GUIDE_MIN_QUESTIONS - active, 0);
  async function addReady() {
    setBusy("q"); setErr(null);
    try { for (const q of ideas.slice(0, need)) await api.addPrompt({ workspace_id: brand.workspace_id, brand_id: brand.id, text: q.text, intent: q.intent }); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  async function start() {
    setBusy("run"); setErr(null);
    try { await api.requestRun(brand.id, false); onRunsChange(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(null); }
  }
  let fast = false;
  try { fast = sessionStorage.getItem("aisv-fast-run") === "1"; } catch { /* yok say */ }

  const row = (n: number, key: (typeof steps)[number]["key"], title: string, body: ReactNode) => {
    const s = steps.find((x) => x.key === key)!;
    const state = s.done ? "done" : next === key ? "now" : "todo";
    return (
      <li className={`guide-step guide-${state}`} aria-current={state === "now" ? "step" : undefined}>
        <span className="guide-mark" aria-hidden="true">{s.done ? "✓" : n}</span>
        <div>
          <p className="guide-title">{title}<span className="visually-hidden">{s.done ? L(" (tamamlandı)", " (done)") : ""}</span></p>
          {state === "now" && <div className="guide-body">{body}</div>}
        </div>
      </li>
    );
  };

  return (
    <section className="panel guide" aria-label={L("Başlangıç rehberi", "Getting started")}>
      <div className="panel-head">
        <h2>{doneCount === steps.length ? L("Kurulum tamam", "You're all set") : L("Başlangıç rehberi", "Getting started")}</h2>
        <button className="link-btn" onClick={close}>{L("Rehberi kapat", "Hide guide")}</button>
      </div>
      <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label={L("Kurulum ilerlemesi", "Setup progress")}>
        <div className="meter-fill" style={{ width: `${(100 * doneCount) / steps.length}%` }} />
      </div>
      <p className="muted guide-count">{isEn() ? `${doneCount} of ${steps.length} steps done` : `${steps.length} adımdan ${doneCount} tanesi tamam`}</p>
      {err && <p className="error-box" role="alert">{err}</p>}
      <ol className="guide-steps">
        {row(1, "marka", L("Markanızı eklediniz", "You added your brand"), null)}
        {row(2, "sorular", L("Müşterilerinizin soracağı soruları seçin", "Pick the questions your customers ask"), <>
          <p>{isEn()
            ? `We ask these questions to the AI and check whether your brand is in the answer. Add at least ${GUIDE_MIN_QUESTIONS}; you have ${active}.`
            : `Bu soruları yapay zekâya sorar, cevapta markanız geçiyor mu bakarız. En az ${GUIDE_MIN_QUESTIONS} soru ekleyin; şu an ${active} soru var.`}</p>
          <div className="guide-actions">
            {ideas.length >= need && need > 0 && <Button busy={busy === "q"} onClick={addReady}>{isEn() ? `Add ${need} ready-made question${need > 1 ? "s" : ""}` : `${need} hazır soruyu ekle`}</Button>}
            <button className="btn btn-quiet" onClick={() => goTab("sorular")}>{L("Soruları kendim seçeyim", "I'll choose them myself")}</button>
          </div>
        </>)}
        {row(3, "rakip", L("En az bir rakip ekleyin", "Add at least one competitor"), <>
          <p>{L("Rakip eklerseniz raporda yapay zekânın sizi mi onları mı önerdiğini yan yana görürsünüz.", "With competitors added, the report shows side by side whether the AI recommends you or them.")}</p>
          <div className="guide-actions"><button className="btn btn-primary" onClick={() => goTab("rakipler")}>{L("Rakip ekle", "Add a competitor")}</button>
            <button className="btn btn-quiet" onClick={() => setSkipRival(true)}>{L("Şimdilik geç", "Skip for now")}</button></div>
        </>)}
        {row(4, "olcum", L("İlk ölçümü başlatın", "Start your first measurement"), <>
          <p>{failedOnly
            ? L("Önceki ölçüm tamamlanamadı. Yeniden başlatabilirsiniz; nedeni Ölçümler sekmesinde yazar.", "The previous measurement didn't finish. You can start again; the reason is on the Runs tab.")
            : L("Sorularınızı yapay zekâya birkaç kez sorar, cevapları sayarız. Ücretsizdir.", "We ask your questions to the AI several times and count the answers. It's free.")}</p>
          <div className="guide-actions"><Button busy={busy === "run"} onClick={start}>{L("İlk ölçümü başlat", "Start first measurement")}</Button></div>
        </>)}
        {row(5, "rapor", L("Raporu okuyun", "Read your report"), <>
          <p>{fast
            ? L("Ölçüm başlatıldı. Genellikle birkaç dakikada biter; bu sayfa kendiliğinden güncellenir.", "Measurement started. It usually finishes in a few minutes; this page updates by itself.")
            : L("Ölçüm sırada. Ölçümler her saat 17 geçe işlenir (Türkiye saatiyle 08:17–23:17); bu sayfa kendiliğinden güncellenir. Sayfayı kapatabilirsiniz, sonuç kaybolmaz.", "Measurement queued. Measurements are processed at 17 past every hour (08:17–23:17 Turkey time); this page updates by itself. You can close the page, nothing is lost.")}</p>
          <p className="muted">{L("Beklerken: rakip ve soru eklemeye devam edebilirsiniz; sonraki ölçümde sayılırlar.", "While you wait: keep adding competitors and questions; they count in the next measurement.")}</p>
        </>)}
      </ol>
      {doneCount === steps.length && (
        <div className="guide-body guide-finish">
          <p>{L("İlk raporunuz hazır. Okurken şu üç şeye bakın:", "Your first report is ready. Look at these three things:")}</p>
          <ul>
            <li>{L("Önerilme oranı: yapay zekâ kaç cevapta sizi önerdi.", "Recommendation rate: in how many answers the AI recommended you.")}</li>
            <li>{L("Rakipler: sizin yerinize kim önerildi.", "Competitors: who was recommended instead of you.")}</li>
            <li>{L("Öneriler: bir sonraki ölçüme kadar ne yapmalısınız.", "Recommendations: what to do before the next measurement.")}</li>
          </ul>
          <div className="guide-actions">
            <button className="btn btn-primary" onClick={() => goTab("rapor")}>{L("Raporu aç", "Open the report")}</button>
            <button className="btn btn-quiet" onClick={() => goTab("oneriler")}>{L("Önerileri gör", "See recommendations")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
