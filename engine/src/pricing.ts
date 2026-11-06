// Paket maliyet hesabı. Rakamlar provider fiyat kartlarından gelir; varsayımlar açıkça adlandırılır.

import { GEMINI_FREE_DEFAULT } from "./providers/gemini.ts";
import { OPENAI_DEFAULT } from "./providers/openai.ts";
import { PERPLEXITY_DEFAULT } from "./providers/perplexity.ts";
import { estimateCost, type ProviderConfig } from "./providers/types.ts";

export const WEEKS_PER_MONTH = 52 / 12; // 4,33

export interface PlanSpec {
  name: string;
  priceUsd: number;
  brands: number;
  promptsPerBrand: number;
  repetitions: number;
  runsPerMonth: number; // haftalık = 4,33
  engines: ("gemini" | "openai" | "perplexity")[];
}

/** Tipik çağrı varsayımları (gerçek ölçümle güncellenecek). */
export interface CallAssumption { inputTokens: number; outputTokens: number; searchCalls: number }

export interface Scenario {
  name: string;
  geminiGroundingCharged: boolean; // false = ücretsiz/ücretli katmanın bedava dayanak kotası içinde
  calls: Record<"gemini" | "openai" | "perplexity", CallAssumption>;
  overheadPerBrandUsd: number;     // sınıflandırma + öneri üretimi (LLM)
  infraPerCustomerUsd: number;     // barındırma payı
  paymentFeeRate: number;          // ödeme sağlayıcısı komisyonu (varsayım)
}

const CARDS: Record<"gemini" | "openai" | "perplexity", ProviderConfig> = {
  gemini: GEMINI_FREE_DEFAULT,
  openai: OPENAI_DEFAULT,
  perplexity: PERPLEXITY_DEFAULT,
};

export function costPerCall(engine: keyof typeof CARDS, a: CallAssumption, s: Scenario): number {
  const p = CARDS[engine].price;
  let perCall = p.perCall * a.searchCalls;
  if (engine === "gemini" && !s.geminiGroundingCharged) perCall = 0;
  return estimateCost({ ...p, perCall }, a.inputTokens, a.outputTokens);
}

export interface PlanCost {
  plan: string;
  priceUsd: number;
  engineCallsPerMonth: number;
  apiUsd: number;
  overheadUsd: number;
  infraUsd: number;
  paymentFeeUsd: number;
  totalCostUsd: number;
  grossMarginPct: number;
  perEngineUsd: Record<string, number>;
}

export function planCost(plan: PlanSpec, s: Scenario): PlanCost {
  const callsPerEngine = plan.brands * plan.promptsPerBrand * plan.repetitions * plan.runsPerMonth;
  const perEngineUsd: Record<string, number> = {};
  let apiUsd = 0;
  for (const e of plan.engines) {
    const c = callsPerEngine * costPerCall(e, s.calls[e], s);
    perEngineUsd[e] = c;
    apiUsd += c;
  }
  const overheadUsd = plan.brands * s.overheadPerBrandUsd;
  const paymentFeeUsd = plan.priceUsd * s.paymentFeeRate;
  const totalCostUsd = apiUsd + overheadUsd + s.infraPerCustomerUsd + paymentFeeUsd;
  return {
    plan: plan.name,
    priceUsd: plan.priceUsd,
    engineCallsPerMonth: Math.round(callsPerEngine * plan.engines.length),
    apiUsd, overheadUsd, infraUsd: s.infraPerCustomerUsd, paymentFeeUsd, totalCostUsd,
    grossMarginPct: plan.priceUsd > 0 ? ((plan.priceUsd - totalCostUsd) / plan.priceUsd) * 100 : -Infinity,
    perEngineUsd,
  };
}

/** Ücretsiz Gemini kotasıyla kaç marka aynı anda izlenebilir? */
export function freeTierCapacity(plan: PlanSpec, dailyLimit = GEMINI_FREE_DEFAULT.freeDailyCallLimit!): number {
  const callsPerBrandPerMonth = plan.promptsPerBrand * plan.repetitions * plan.runsPerMonth;
  return Math.floor((dailyLimit * 30) / callsPerBrandPerMonth);
}

// ---- Varsayılan paketler ve senaryolar ----
const typical = {
  gemini: { inputTokens: 150, outputTokens: 700, searchCalls: 1 },
  // GERÇEK ÖLÇÜM (7 Kasım 2026, 30 canlı cevap, gpt-6-luna): ort. 17.400 girdi / 670 çıktı token, ~1,7 arama → 0,0194 $/cevap
  openai: { inputTokens: 17_400, outputTokens: 670, searchCalls: 1.7 },
  perplexity: { inputTokens: 150, outputTokens: 700, searchCalls: 1 },
};

export const SCENARIOS: Scenario[] = [
  {
    name: "Tipik", geminiGroundingCharged: false, calls: typical,
    overheadPerBrandUsd: 0.5, infraPerCustomerUsd: 1.25, paymentFeeRate: 0.04,
  },
  {
    name: "Kötü durum", geminiGroundingCharged: true,
    calls: { ...typical, openai: { inputTokens: 40_000, outputTokens: 3_000, searchCalls: 2 } },
    overheadPerBrandUsd: 1.0, infraPerCustomerUsd: 2.5, paymentFeeRate: 0.04,
  },
];

export const PLANS: PlanSpec[] = [
  { name: "Starter (eski öneri: 50 soru, 3 tekrar)", priceUsd: 29, brands: 1, promptsPerBrand: 50, repetitions: 3, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai", "perplexity"] },
  { name: "Starter (yeni: 25 soru, 2 tekrar)", priceUsd: 29, brands: 1, promptsPerBrand: 25, repetitions: 2, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai", "perplexity"] },
  { name: "Starter önerisi (ChatGPT + Gemini, 20 soru, 2 tekrar)", priceUsd: 29, brands: 1, promptsPerBrand: 20, repetitions: 2, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai"] },
  { name: "Starter — sadece Gemini (bugünkü durum)", priceUsd: 29, brands: 1, promptsPerBrand: 25, repetitions: 2, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini"] },
  { name: "Pro (eski: 3 marka, 50 soru, 3 tekrar)", priceUsd: 79, brands: 3, promptsPerBrand: 50, repetitions: 3, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai", "perplexity"] },
  { name: "Pro (yeni: 3 marka, 30 soru, 2 tekrar)", priceUsd: 79, brands: 3, promptsPerBrand: 30, repetitions: 2, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai", "perplexity"] },
  { name: "Agency (yeni: 10 marka, 30 soru, 2 tekrar)", priceUsd: 199, brands: 10, promptsPerBrand: 30, repetitions: 2, runsPerMonth: WEEKS_PER_MONTH, engines: ["gemini", "openai", "perplexity"] },
];
