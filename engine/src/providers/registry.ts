// Sağlayıcı kayıt defteri: hangi sağlayıcının açık olduğuna ortam değişkenleri karar verir.
// Kural: ALLOW_PAID_API "true" değilse ücretli sağlayıcı hiçbir koşulda oluşturulmaz.

import { GeminiProvider, GEMINI_FREE_DEFAULT } from "./gemini.ts";
import { OpenAIProvider, OPENAI_DEFAULT } from "./openai.ts";
import { PerplexityProvider, PERPLEXITY_DEFAULT } from "./perplexity.ts";
import { ClaudeProvider, CLAUDE_DEFAULT } from "./claude.ts";
import type { FetchLike, Provider } from "./types.ts";

export class PaidApiBlocked extends Error {}

export interface RegistryStatus {
  provider: string;
  enabled: boolean;
  reason: string;
}

export function buildProviders(env: Record<string, string | undefined>, fetchFn?: FetchLike): {
  providers: Provider[];
  status: RegistryStatus[];
} {
  const allowPaid = env.ALLOW_PAID_API === "true";
  const providers: Provider[] = [];
  const status: RegistryStatus[] = [];

  // Gemini
  if (!env.GEMINI_API_KEY) {
    status.push({ provider: "gemini", enabled: false, reason: "GEMINI_API_KEY yok" });
  } else {
    const tier = env.GEMINI_TIER === "paid" ? "paid" : "free";
    if (tier === "paid" && !allowPaid) {
      status.push({ provider: "gemini", enabled: false, reason: "GEMINI_TIER=paid ama ALLOW_PAID_API kapalı" });
    } else {
      const cfg = {
        ...GEMINI_FREE_DEFAULT,
        billing: tier as "free" | "paid",
        model: env.GEMINI_MODEL || GEMINI_FREE_DEFAULT.model,
        useSearch: env.GEMINI_SEARCH !== "false",
      };
      providers.push(new GeminiProvider(env.GEMINI_API_KEY, cfg, fetchFn));
      status.push({ provider: "gemini", enabled: true, reason: `${cfg.model}, ${tier} katman, arama ${cfg.useSearch ? "açık" : "kapalı"}` });
    }
  }

  // Gemini canlı (ücretli ayrı proje "aisaasavran-canli", önden ödemeli, aylık 5 $ sınırlı; sahip onayı 24 Kasım 2026).
  // Yalnız arama istendiğinde ve ALLOW_PAID_API açıkken; ücretsiz anahtar (site, ücretsiz kontrol, ses) etkilenmez.
  // 24 Kasım (sahip kararı): varsayılan canlı sırada (müşteri ölçümleri dahil). Anahtar yoksa ya da Google sınırı dolarsa
  // Gemini çağrıları başarısız olur, diğer motorlar ölçüme devam eder.
  if (env.GEMINI_CANLI_API_KEY && env.GEMINI_SEARCH !== "false") {
    if (!allowPaid) status.push({ provider: "gemini", enabled: false, reason: "canlı Gemini ücretli; ALLOW_PAID_API kapalı" });
    else {
      const cfg = { ...GEMINI_FREE_DEFAULT, billing: "paid" as const, model: env.GEMINI_CANLI_MODEL || GEMINI_FREE_DEFAULT.model, useSearch: true };
      providers.push(new GeminiProvider(env.GEMINI_CANLI_API_KEY, cfg, fetchFn));
      status.push({ provider: "gemini", enabled: true, reason: `${cfg.model}, ücretli (canlı proje), Google araması açık` });
    }
  }

  // OpenAI — her zaman ücretli
  if (!env.OPENAI_API_KEY) status.push({ provider: "openai", enabled: false, reason: "OPENAI_API_KEY yok" });
  else if (!allowPaid) status.push({ provider: "openai", enabled: false, reason: "ücretli; ALLOW_PAID_API kapalı" });
  else {
    providers.push(new OpenAIProvider(env.OPENAI_API_KEY, { ...OPENAI_DEFAULT, model: env.OPENAI_MODEL || OPENAI_DEFAULT.model, searchCountry: env.SEARCH_COUNTRY }, fetchFn));
    status.push({ provider: "openai", enabled: true, reason: `${env.OPENAI_MODEL || OPENAI_DEFAULT.model}, ücretli, web araması açık` });
  }

  // Claude (Anthropic) — her zaman ücretli
  if (!env.ANTHROPIC_API_KEY) status.push({ provider: "claude", enabled: false, reason: "ANTHROPIC_API_KEY yok" });
  else if (!allowPaid) status.push({ provider: "claude", enabled: false, reason: "ücretli; ALLOW_PAID_API kapalı" });
  else {
    const model = env.CLAUDE_MODEL || CLAUDE_DEFAULT.model;
    const useSearch = env.CLAUDE_SEARCH !== "false";
    providers.push(new ClaudeProvider(env.ANTHROPIC_API_KEY, { ...CLAUDE_DEFAULT, model, useSearch, searchCountry: env.SEARCH_COUNTRY }, fetchFn));
    status.push({ provider: "claude", enabled: true, reason: `${model}, ücretli, web araması ${useSearch ? "açık" : "kapalı"}` });
  }

  // Perplexity (Agent API) — her zaman ücretli; yalnız anahtar ve ALLOW_PAID_API varken. Canlı aramada sıraya
  // LIVE_ENGINES="openai,claude,perplexity" ile eklenir (varsayılan sıra değişmez).
  if (!env.PERPLEXITY_API_KEY) status.push({ provider: "perplexity", enabled: false, reason: "PERPLEXITY_API_KEY yok" });
  else if (!allowPaid) status.push({ provider: "perplexity", enabled: false, reason: "ücretli; ALLOW_PAID_API kapalı" });
  else {
    const model = env.PERPLEXITY_MODEL || PERPLEXITY_DEFAULT.model;
    providers.push(new PerplexityProvider(env.PERPLEXITY_API_KEY, { ...PERPLEXITY_DEFAULT, model, searchCountry: env.SEARCH_COUNTRY }, fetchFn));
    status.push({ provider: "perplexity", enabled: true, reason: `${model}, ücretli, web araması açık` });
  }

  return { providers, status };
}

/** Çalışma anında ikinci savunma hattı: kayıt defteri atlansa bile ücretli çağrı engellenir. */
export function assertBillingAllowed(p: Provider, env: Record<string, string | undefined>) {
  if (p.config.billing === "paid" && p.config.provider !== "mock" && env.ALLOW_PAID_API !== "true") {
    throw new PaidApiBlocked(`${p.config.provider} ücretli; ALLOW_PAID_API kapalı`);
  }
}
