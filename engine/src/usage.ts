// Müşteri (workspace) başına kota ve maliyet kontrolü.
// Üretimde aynı kurallar Postgres fonksiyonlarıyla (reserve_engine_call / record_usage) uygulanır;
// bu bellek-içi sürüm motor testleri ve yerel çalıştırma içindir. İki sürüm aynı sözleşmeyi uygular.

import type { ProviderConfig, ProviderResult } from "./providers/types.ts";

export interface PlanLimits {
  monthlyEngineCalls: number;   // ay içinde toplam AI motoru çağrısı
  monthlyPaidCostCapUsd: number; // ay içinde ücretli API harcama tavanı (0 = ücretli kullanım yok)
}

export type Denial =
  | "workspace_paused"
  | "monthly_call_quota"
  | "monthly_cost_cap"
  | "provider_free_daily_limit"
  | "paid_not_allowed"
  | "global_paid_cap";

export interface Reservation { ok: true }
export interface Rejection { ok: false; reason: Denial; message: string }

export interface UsageGate {
  reserve(workspaceId: string, cfg: ProviderConfig, worstCasePaidUsd: number): Promise<Reservation | Rejection>;
  record(workspaceId: string, result: ProviderResult): Promise<void>;
}

interface WsState { month: string; calls: number; paidUsd: number; freeCalls: number; paused: Denial | null }

export class InMemoryUsageGate implements UsageGate {
  private ws = new Map<string, WsState>();
  private providerDay = new Map<string, number>(); // "gemini|2026-11-06" → çağrı
  private limits: (wsId: string) => PlanLimits;
  private now: () => Date;
  constructor(limits: (wsId: string) => PlanLimits, now: () => Date = () => new Date()) {
    this.limits = limits;
    this.now = now;
  }

  private state(id: string): WsState {
    const month = this.now().toISOString().slice(0, 7);
    let s = this.ws.get(id);
    if (!s || s.month !== month) { // yeni ayda sayaç sıfırlanır, bütçe duraklatması kalkar
      s = { month, calls: 0, paidUsd: 0, freeCalls: 0, paused: null };
      this.ws.set(id, s);
    }
    return s;
  }

  async reserve(id: string, cfg: ProviderConfig, worst: number): Promise<Reservation | Rejection> {
    const s = this.state(id);
    const lim = this.limits(id);
    if (s.paused) return { ok: false, reason: "workspace_paused", message: `Workspace durduruldu (${s.paused})` };
    if (s.calls >= lim.monthlyEngineCalls) {
      s.paused = "monthly_call_quota";
      return { ok: false, reason: "monthly_call_quota", message: `Aylık ${lim.monthlyEngineCalls} çağrı kotası doldu` };
    }
    if (cfg.billing === "paid" && s.paidUsd + worst > lim.monthlyPaidCostCapUsd) {
      s.paused = "monthly_cost_cap";
      return { ok: false, reason: "monthly_cost_cap", message: `Aylık ${lim.monthlyPaidCostCapUsd} $ maliyet tavanı aşılacaktı` };
    }
    if (cfg.billing === "free" && cfg.freeDailyCallLimit !== undefined) {
      const key = `${cfg.provider}|${this.now().toISOString().slice(0, 10)}`;
      const used = this.providerDay.get(key) ?? 0;
      if (used >= cfg.freeDailyCallLimit) {
        return { ok: false, reason: "provider_free_daily_limit", message: `${cfg.provider} ücretsiz günlük sınırı (${cfg.freeDailyCallLimit}) doldu` };
      }
      this.providerDay.set(key, used + 1); // rezervasyon anında sayılır: paralel işler sınırı aşamaz
    }
    s.calls++;
    return { ok: true };
  }

  async record(id: string, r: ProviderResult): Promise<void> {
    const s = this.state(id);
    if (r.billing === "paid") s.paidUsd += r.costUsd; else s.freeCalls++;
    if (s.paidUsd > this.limits(id).monthlyPaidCostCapUsd) s.paused = "monthly_cost_cap";
  }

  snapshot(id: string) { return { ...this.state(id) }; }
}
