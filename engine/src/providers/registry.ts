// Sağlayıcı kayıt defteri: hangi sağlayıcının açık olduğuna ortam değişkenleri karar verir.
// Kural: ALLOW_PAID_API "true" değilse ücretli sağlayıcı hiçbir koşulda oluşturulmaz.

import { GeminiProvider, GEMINI_FREE_DEFAULT } from "./gemini.ts";
import { OpenAIProvider, OPENAI_DEFAULT } from "./openai.ts";
import { PerplexityProvider } from "./perplexity.ts";
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

  // OpenAI — her zaman ücretli
  if (!env.OPENAI_API_KEY) status.push({ provider: "openai", enabled: false, reason: "OPENAI_API_KEY yok" });
  else if (!allowPaid) status.push({ provider: "openai", enabled: false, reason: "ücretli; ALLOW_PAID_API kapalı" });
  else {
    providers.push(new OpenAIProvider(env.OPENAI_API_KEY, { ...OPENAI_DEFAULT, model: env.OPENAI_MODEL || OPENAI_DEFAULT.model }, fetchFn));
    status.push({ provider: "openai", enabled: true, reason: "ücretli, gerçek API ile test edilmedi" });
  }

  // Perplexity — adaptör henüz yok
  status.push({ provider: "perplexity", enabled: false, reason: "adaptör yok (Agent API şeması doğrulanmadı)" });
  void PerplexityProvider;

  return { providers, status };
}

/** Çalışma anında ikinci savunma hattı: kayıt defteri atlansa bile ücretli çağrı engellenir. */
export function assertBillingAllowed(p: Provider, env: Record<string, string | undefined>) {
  if (p.config.billing === "paid" && p.config.provider !== "mock" && env.ALLOW_PAID_API !== "true") {
    throw new PaidApiBlocked(`${p.config.provider} ücretli; ALLOW_PAID_API kapalı`);
  }
}
