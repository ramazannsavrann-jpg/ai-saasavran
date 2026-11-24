// İyileştirme rehberi verisi: sitedeki Öneriler sekmesi, rapordaki "Bu hafta yapılacak iş" kartı ve mobil uygulama aynı hesabı kullanır.
// (Brand.tsx'ten taşındı; davranış aynı.)
import { useEffect } from "react";
import { useLoad } from "./app";
import { api, type Brand, type MeasurementType, type Run } from "./data";
import { isEn } from "./i18n";
import { sourceOpportunities } from "./report";
import { engineComparison, ownedSourceShare } from "../../../engine/src/insights.ts";
import { buildRecommendations, previousSameTypeRun, type RecInput } from "../../../engine/src/recommendations.ts";
import { truthSummary } from "../../../engine/src/truth.ts";

/** İyileştirme rehberi girdisi ve önerileri: Öneriler sekmesi ve rapordaki "Bu hafta yapılacak iş" kartı aynı hesabı kullanır. */
export function useRecommendations(brand: Brand, type: MeasurementType, runs: Run[]) {
  const audit = useLoad(() => api.latestAudit(brand.id), [brand.id, brand.audit_requested_at]);
  const prompts = useLoad(() => api.prompts(brand.id), [brand.id]);
  const lastRun = runs.find((r) => r.status === "done" && r.measurement_type === type);
  const results = useLoad(() => (lastRun ? api.promptResults(lastRun.id) : Promise.resolve([])), [lastRun?.id]);
  // İyileştirme rehberi için kanıtlar (ek API çağrısı yok): önceki ölçüm, motor farkı, kaynak fırsatları, ürün doğruluğu, Shopping
  const prevRun = previousSameTypeRun(runs, type);
  const prevResults = useLoad(() => (prevRun ? api.promptResults(prevRun.id) : Promise.resolve([])), [prevRun?.id]);
  const evidence = useLoad(async () => {
    if (!lastRun || brand.data_origin === "simulated") return null;
    const live = type === "live_search";
    const [vis, comps, prods] = await Promise.all([api.visibility(brand.id, type), api.competitors(brand.id), api.products(brand.id)]);
    const rows = vis.filter((r) => r.run_id === lastRun.id);
    const me = engineComparison(rows).find((c) => c.isTarget);
    const engineGap = me && me.high ? { ignoredBy: me.ignoredBy, high: me.high, highK: me.byEngine[me.high].k, highN: me.byEngine[me.high].n, level: me.level } : null;
    let opportunitySites: { domain: string; count: number }[] = [];
    let ownShare: { own: number; total: number; competitor: number } | null = null;
    if (live) {
      const ans = await api.answers(lastRun.id);
      const ments = ans.length ? await api.mentionsFor(ans.map((a) => a.id)) : [];
      const host = (w: string | null) => (w ? w.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase() : "");
      opportunitySites = sourceOpportunities(ans, ments, brand.id, [brand.website, ...comps.map((c) => c.website)].map(host).filter(Boolean)).filter((d) => !d.own);
      const o = ownedSourceShare(ans, [{ id: brand.id, name: brand.name, website: brand.website, isTarget: true }, ...comps.map((c) => ({ id: c.id, name: c.name, website: c.website, isTarget: false }))]);
      ownShare = { own: o.own, total: o.total, competitor: o.competitor };
    }
    const own = prods.filter((p) => !p.rival_of);
    const ids = prods.map((p) => p.id);
    const [checks, shops] = ids.length ? await Promise.all([api.productChecks(own.map((p) => p.id)), api.shoppingChecks(own.map((p) => p.id))]) : [[], []];
    const latest = <T extends { product_id: string; created_at: string }>(xs: T[]) => [...new Map([...xs].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((x) => [x.product_id, x])).values()];
    const name = (id: string) => prods.find((p) => p.id === id)?.name ?? "";
    const wrongClaims = latest(checks).flatMap((c) => c.claims.filter((x) => x.status === "wrong").map((x) => ({ product: name(c.product_id), claim: x.claim, fact: x.fact })));
    const shoppingBehind = latest(shops).flatMap((sc) => sc.rivals.filter((r) => sc.own_position == null || r.position < sc.own_position).slice(0, 1)
      .map((r) => ({ product: name(sc.product_id), ownPos: sc.own_position, rival: name(r.id), rivalPos: r.position })));
    const tc = brand.fact_card ? await api.truthChecks(brand.id).catch(() => []) : [];
    const wrongBrandClaims = truthSummary(tc).wrongClaims.slice(0, 5).map((w) => ({ claim: w.claim, fact: w.fact }));
    return { engineGap, opportunitySites, wrongClaims, shoppingBehind, ownShare, wrongBrandClaims };
  }, [brand.id, type, lastRun?.id]);
  const loading = audit.loading || prompts.loading || results.loading || prevResults.loading || evidence.loading;
  const sim = brand.data_origin === "simulated";
  const recInput = loading ? null : ({
    brandName: brand.name, website: brand.website, city: brand.city, sector: brand.sector, aliases: brand.aliases,
    activePrompts: (prompts.data ?? []).filter((p) => p.active).length,
    completedRuns: runs.filter((r) => r.status === "done").length,
    autoWeekly: brand.auto_weekly || sim, measurementType: type,
    prompts: results.data ?? [],
    audit: sim ? null : audit.data ? { status: audit.data.status, checks: audit.data.checks } : null,
    lang: (isEn() ? "en" : "tr") as "en" | "tr",
    previousPrompts: prevResults.data ?? [],
    ...(evidence.data ?? {}),
  } satisfies RecInput as RecInput);
  const recs = recInput ? buildRecommendations(recInput).filter((r) => !(sim && r.id === "no_website")) : [];
  // Paylaşılan rapor "en önemli 3 iş"i buradan alır (0054): yalnız değişince yazılır; izin yoksa (izleyici) sessizce geçilir
  // id ve dil de yazılır: uygulama ana sayfası rakip içeren önerileri ve başka dilde yazılmışları gizler
  const top3 = JSON.stringify(recs.slice(0, 3).map((r) => ({ title: r.title, action: r.action, id: r.id, lang: isEn() ? "en" : "tr" })));
  useEffect(() => {
    if (loading || sim || !recs.length || top3 === JSON.stringify(brand.top_actions ?? null)) return;
    api.updateBrand(brand.id, { top_actions: JSON.parse(top3), top_actions_at: new Date().toISOString() }).catch(() => {});
  }, [loading, sim, top3, brand.id]);
  const error = !!(prompts.error || results.error || prevResults.error || evidence.error);
  return { audit, prompts, lastRun, results, prevResults, evidence, loading, error, recInput, recs };
}

