// Yalnızca Demo Lab ve testler için. Çıktısı her zaman "simulated" işaretlidir.

import { type Provider, type ProviderConfig, type ProviderResult, estimateCost } from "./types.ts";

export const MOCK_CONFIG: ProviderConfig = {
  provider: "mock",
  model: "mock-v1",
  billing: "paid", // bütçe mantığını test edebilmek için ücretli varsayılır
  useSearch: false,
  price: { inputPerMTok: 1, outputPerMTok: 4, perCall: 0.01, source: "test", checkedOn: "2026-11-06" },
  worstCaseTokens: { input: 2000, output: 1000 },
};

export class MockProvider implements Provider {
  readonly config: ProviderConfig;
  calls = 0;
  private answers: Record<string, { text: string; urls?: string[] }>;
  constructor(answers: Record<string, { text: string; urls?: string[] }> = {}, config: ProviderConfig = MOCK_CONFIG) {
    this.answers = answers;
    this.config = config;
  }
  async ask(promptId: string): Promise<ProviderResult> {
    this.calls++;
    const a = this.answers[promptId] ?? { text: "Bu konuda bilgi bulunamadı." };
    const inputTokens = 300, outputTokens = 400;
    const cost = estimateCost(this.config.price, inputTokens, outputTokens);
    return {
      promptId, provider: "mock", model: this.config.model, method: "simulation",
      dataOrigin: "simulated", billing: this.config.billing,
      answerText: a.text, citedUrls: a.urls ?? [], searchQueries: [],
      inputTokens, outputTokens,
      costUsd: this.config.billing === "free" ? 0 : cost, paidEquivalentUsd: cost,
    };
  }
}
