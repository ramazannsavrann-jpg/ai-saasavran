// /api/kick için saf mantık (test edilebilir).
const DEFAULT_REPO = "ramazannsavrann-jpg/ai-saasavran";
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

/** İşçi iş akışını tetikleyen GitHub adresi. Geçersiz depo adı verilirse varsayılana döner. */
export const WORKFLOW_URL = (repo) => `https://api.github.com/repos/${REPO.test(String(repo ?? "")) ? repo : DEFAULT_REPO}/actions/workflows/worker.yml/dispatches`;

/** Sırada ölçüm yoksa ya da anahtar tanımlı değilse işçi tetiklenmez. */
export function kickDecision({ queued, hasToken }) {
  if (!(queued > 0)) return { dispatch: false, reason: "nothing_queued" };
  if (!hasToken) return { dispatch: false, reason: "not_configured" };
  return { dispatch: true, reason: "ok" };
}
