// Ölçüm durumu ve hata sınıfları için kullanıcıya gösterilecek açıklamalar.
import { L } from "./i18n";
import type { Run } from "./data";

export const ERROR_CLASS_TEXT: Record<string, { title: string; body: string }> = {
  unsupported_feature: {
    title: L("Özellik bu katmanda yok", "Feature not available on this tier"),
    body: L("İstenen özellik (örneğin canlı web araması) kullandığımız ücretsiz katmanda desteklenmiyor. Ücretli kullanım kapalı olduğu için ölçüm durduruldu.", "The requested feature (for example live web search) isn't supported on the free tier we use. Paid usage is off, so the measurement stopped."),
  },
  quota_exceeded: {
    title: L("Sağlayıcı kotası doldu", "Provider quota reached"),
    body: L("Yapay zekâ sağlayıcısının ücretsiz kullanım sınırına ulaşıldı. Ücretli katmana geçilmedi; ölçüm daha sonra yeniden denenebilir.", "The AI provider's free usage limit was reached. We did not switch to a paid tier; try the measurement again later."),
  },
  auth_error: {
    title: L("Yetkilendirme hatası", "Authorization error"),
    body: L("Sağlayıcı API anahtarı geçersiz veya yetkisiz. Bu bir platform yapılandırma sorunudur; yöneticiye bildirildi.", "The provider API key is invalid or unauthorized. This is a platform configuration problem and has been reported."),
  },
  model_not_found: {
    title: L("Model bulunamadı", "Model not found"),
    body: L("Kullanılan yapay zekâ modeli artık erişilebilir değil. Platformun model ayarının güncellenmesi gerekiyor.", "The AI model in use is no longer available. The platform's model setting needs an update."),
  },
  transient: {
    title: L("Geçici bağlantı hatası", "Temporary connection error"),
    body: L("Sağlayıcıya ulaşılamadı. Sınırlı sayıda yeniden denendi; ölçümü daha sonra tekrar başlatabilirsiniz.", "Couldn't reach the provider after a few retries. You can start the measurement again later."),
  },
  invalid_request: {
    title: L("İstek reddedildi", "Request rejected"),
    body: L("Sağlayıcı bazı soruları işlemedi. Soruların metnini kontrol edin.", "The provider didn't process some questions. Check the question text."),
  },
};

export const STOP_TEXT: Record<string, string> = {
  completed: L("Tamamlandı", "Completed"),
  monthly_call_quota: L("Aylık ölçüm kotası doldu; çalışma alanı durduruldu", "Monthly quota reached; workspace paused"),
  monthly_cost_cap: L("Aylık maliyet tavanına ulaşıldı; çalışma alanı durduruldu", "Monthly cost cap reached; workspace paused"),
  workspace_paused: L("Çalışma alanı durdurulmuş", "Workspace is paused"),
  provider_free_daily_limit: L("Platformun günlük ücretsiz kotası doldu; yarın tekrar deneyin", "The platform's daily free quota is used up; try again tomorrow"),
  run_budget: L("Ölçüm başına maliyet tavanına ulaşıldı", "Per-measurement cost cap reached"),
  paid_api_blocked: L("Ücretli API kullanımı kapalı", "Paid API usage is off"),
  paid_not_allowed: L("Bu hesapta ücretli ölçüm kapalı", "Paid measurement is off for this account"),
  global_paid_cap: L("Toplam ücretli kullanım tavanına ulaşıldı; ölçüm durduruldu", "Total paid usage cap reached; measurement stopped"),
  too_many_failures: L("Arka arkaya çok fazla hata; ölçüm durduruldu", "Too many errors in a row; measurement stopped"),
  provider_not_configured: L("Ölçüm sağlayıcısı henüz yapılandırılmadı", "Measurement provider not configured yet"),
  worker_error: L("Beklenmeyen sistem hatası", "Unexpected system error"),
};

export function runStatusText(r: Run): string {
  switch (r.status) {
    case "queued": return L("Sırada", "Queued");
    case "running": return L("Çalışıyor", "Running");
    case "done": return r.stop_reason && r.stop_reason !== "completed" ? L("Kısmen tamamlandı", "Partly completed") : L("Tamamlandı", "Completed");
    case "failed": return L("Başarısız", "Failed");
    case "budget_blocked": return L("Kota nedeniyle durdu", "Stopped by quota");
  }
}

export const PAUSE_TEXT: Record<string, string> = {
  monthly_call_quota: L("Bu ayki ölçüm kotanız doldu. Yeni ölçümler gelecek ay başında açılır.", "You've used this month's measurement quota. New measurements open at the start of next month."),
  monthly_cost_cap: L("Bu ayki maliyet tavanına ulaşıldı. Yeni ölçümler gelecek ay başında açılır.", "This month's cost cap was reached. New measurements open at the start of next month."),
};
