// Güven puanı kartı: sonucun ne kadar sağlam olduğunu anlatır (markanın iyi/kötü olduğunu değil).
// Puan engine/src/metrics.ts confidenceScore() ile hesaplanır; girdiler veritabanındaki run_confidence() fonksiyonundan gelir.
import { confidenceScore, type ConfidenceInput } from "../../../engine/src/metrics.ts";
import { L, isEn } from "../lib/i18n";

const LEVEL = { high: () => L("Yüksek", "High"), medium: () => L("Orta", "Medium"), low: () => L("Düşük", "Low") };
const REASON: Record<string, () => string> = {
  few_questions: () => L("Az soru: 20'den az soru × motor ölçüldü. Soru ekledikçe puan artar.", "Few questions: fewer than 20 question × engine pairs were measured. Adding questions raises the score."),
  few_answers: () => L("Az cevap: sonuç az sayıda cevaba dayanıyor.", "Few answers: the result rests on a small number of answers."),
  no_repeats: () => L("Tekrar yok: her soru bir kez soruldu, tutarlılık ölçülemedi (ücretsiz pakette böyledir).", "No repeats: each question was asked once, so consistency could not be measured (this is how the free plan works)."),
  few_repeats: () => L("Az tekrar: 5'ten az soru tekrar soruldu.", "Few repeats: fewer than 5 questions were asked again."),
  inconsistent: () => L("Tutarsız cevaplar: aynı soru tekrar sorulunca yapay zekâ farklı sonuç verdi; oranlar haftadan haftaya oynayabilir.", "Inconsistent answers: asking the same question again gave a different result, so rates may move week to week."),
};

export function ConfidenceCard({ rows, provider }: { rows: ConfidenceInput[]; provider?: string | null }) {
  const c = confidenceScore(provider ? rows.filter((r) => r.provider === provider) : rows);
  if (!c) return null;
  const cons = c.consistency == null ? null : Math.round(c.consistency * 100);
  return (
    <div className={`confidence conf-${c.level}`}>
      <p className="conf-head">
        <span>{L("Güven puanı", "Confidence score")}</span>
        <strong className="num">{c.score}<span className="muted">/100</span></strong>
        <span className="conf-level">{LEVEL[c.level]()}</span>
      </p>
      <p className="src-sup muted">
        {isEn()
          ? `${c.clusters} question × engine pairs, ${c.answers} answers.` + (cons == null ? "" : ` When ${c.repeatGroups} questions were asked again, the result matched in ${cons}% of them.`)
          : `${c.clusters} soru × motor, ${c.answers} cevap.` + (cons == null ? "" : ` Tekrar sorulan sorularda aynı sonuç oranı: %${cons} (${c.repeatGroups} soru).`)}
      </p>
      {c.reasons.length > 0 && <ul className="conf-reasons">{c.reasons.map((r) => <li key={r}>{REASON[r]()}</li>)}</ul>}
      <p className="src-sup muted">{L("Puan, sonucun ne kadar sağlam olduğunu gösterir; markanızın iyi ya da kötü olduğunu değil.", "The score shows how solid the result is, not whether your brand is doing well.")}</p>
    </div>
  );
}
