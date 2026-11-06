// Ölçüm durumu ve hata sınıfları için kullanıcıya gösterilecek açıklamalar.
import type { Run } from "./data";

export const ERROR_CLASS_TEXT: Record<string, { title: string; body: string }> = {
  unsupported_feature: {
    title: "Özellik bu katmanda yok",
    body: "İstenen özellik (örneğin canlı web araması) kullandığımız ücretsiz katmanda desteklenmiyor. Ücretli kullanım kapalı olduğu için ölçüm durduruldu.",
  },
  quota_exceeded: {
    title: "Sağlayıcı kotası doldu",
    body: "Yapay zekâ sağlayıcısının ücretsiz kullanım sınırına ulaşıldı. Ücretli katmana geçilmedi; ölçüm daha sonra yeniden denenebilir.",
  },
  auth_error: {
    title: "Yetkilendirme hatası",
    body: "Sağlayıcı API anahtarı geçersiz veya yetkisiz. Bu bir platform yapılandırma sorunudur; yöneticiye bildirildi.",
  },
  model_not_found: {
    title: "Model bulunamadı",
    body: "Kullanılan yapay zekâ modeli artık erişilebilir değil. Platformun model ayarının güncellenmesi gerekiyor.",
  },
  transient: {
    title: "Geçici bağlantı hatası",
    body: "Sağlayıcıya ulaşılamadı. Sınırlı sayıda yeniden denendi; ölçümü daha sonra tekrar başlatabilirsiniz.",
  },
  invalid_request: {
    title: "İstek reddedildi",
    body: "Sağlayıcı bazı soruları işlemedi. Soruların metnini kontrol edin.",
  },
};

export const STOP_TEXT: Record<string, string> = {
  completed: "Tamamlandı",
  monthly_call_quota: "Aylık ölçüm kotası doldu; çalışma alanı durduruldu",
  monthly_cost_cap: "Aylık maliyet tavanına ulaşıldı; çalışma alanı durduruldu",
  workspace_paused: "Çalışma alanı durdurulmuş",
  provider_free_daily_limit: "Platformun günlük ücretsiz kotası doldu; yarın tekrar deneyin",
  run_budget: "Ölçüm başına maliyet tavanına ulaşıldı",
  paid_api_blocked: "Ücretli API kullanımı kapalı",
  paid_not_allowed: "Bu hesapta ücretli ölçüm kapalı",
  global_paid_cap: "Toplam ücretli kullanım tavanına ulaşıldı; ölçüm durduruldu",
  too_many_failures: "Arka arkaya çok fazla hata; ölçüm durduruldu",
  provider_not_configured: "Ölçüm sağlayıcısı henüz yapılandırılmadı",
  worker_error: "Beklenmeyen sistem hatası",
};

export function runStatusText(r: Run): string {
  switch (r.status) {
    case "queued": return "Sırada";
    case "running": return "Çalışıyor";
    case "done": return r.stop_reason && r.stop_reason !== "completed" ? "Kısmen tamamlandı" : "Tamamlandı";
    case "failed": return "Başarısız";
    case "budget_blocked": return "Kota nedeniyle durdu";
  }
}

export const PAUSE_TEXT: Record<string, string> = {
  monthly_call_quota: "Bu ayki ölçüm kotanız doldu. Yeni ölçümler gelecek ay başında açılır.",
  monthly_cost_cap: "Bu ayki maliyet tavanına ulaşıldı. Yeni ölçümler gelecek ay başında açılır.",
};
