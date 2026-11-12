import { useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { t, L } from "../lib/i18n";
import type { MeasurementType } from "../lib/data";

export function Field({ label, hint, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = props.id ?? props.name;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} {...props} aria-invalid={!!error} />
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

export function Button({ busy, variant = "primary", children, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; variant?: "primary" | "quiet" | "danger" }) {
  return (
    <button {...props} className={`btn btn-${variant} ${props.className ?? ""}`} disabled={busy || props.disabled} aria-busy={busy}>
      {busy ? L("Lütfen bekleyin…", "Please wait…") : children}
    </button>
  );
}

export function ErrorBox({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="error-box" role="alert">{message}</p>;
}

export function Loading({ label = L("Yükleniyor…", "Loading…") }: { label?: string }) {
  return <p className="loading" role="status">{label}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

/** Veri türü rozeti: her sonuçta görünür. Desen, grafikteki çizgi stiliyle aynıdır. */
export function TypeBadge({ type }: { type: MeasurementType }) {
  return <span className={`type-badge type-${type}`}><i aria-hidden />{t(`type.${type}`)}</span>;
}

/** Canlı arama yapılmadığını / simülasyon olduğunu belirten zorunlu uyarı. */
export function DataNotice({ type }: { type: MeasurementType }) {
  if (type === "live_search") return (
    <aside className="notice notice-live" role="note">
      <strong>{L("Canlı web aramalı ölçüm", "Live web-search measurement")}</strong>
      <p>{L("Bu sonuçlar ChatGPT'ye (OpenAI API) internette arama açıkken sorulan sorulardan geliyor. Cevaplar aramanın yapıldığı ana göre değişebilir; tek ölçümü kesin sonuç gibi okumayın.", "These results come from questions asked to ChatGPT (OpenAI API) with web search on. Answers depend on when the search ran; don't read a single measurement as final.")}</p>
    </aside>
  );
  const sim = type === "simulated";
  return (
    <aside className={`notice ${sim ? "notice-sim" : "notice-nolive"}`} role="note">
      <strong>{t(sim ? "notice.sim.title" : "notice.noLive.title")}</strong>
      <p>{t(sim ? "notice.sim.body" : "notice.noLive.body")}</p>
      {!sim && <Link to="/durum">{L("Hangi özellikler çalışıyor?", "What works today?")}</Link>}
    </aside>
  );
}

export function Meter({ used, limit, label, warn = true }: { used: number; limit: number; label: string; warn?: boolean }) {
  const ratio = limit > 0 ? Math.min(used / limit, 1) : 0;
  return (
    <div className="meter">
      <div className="meter-head"><span>{label}</span><span className="num">{used} / {limit}</span></div>
      <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={label}>
        <div className={`meter-fill ${warn && ratio >= 0.9 ? "meter-warn" : ""}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

export function Confirm({ label, onConfirm, children }: { label: string; onConfirm: () => Promise<void>; children: ReactNode }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!ask) return <button className="link-btn danger" onClick={() => setAsk(true)}>{children}</button>;
  return (
    <span className="confirm">
      {label}
      <button className="link-btn danger" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setAsk(false); } }}>{L("Evet, sil", "Yes, delete")}</button>
      <button className="link-btn" onClick={() => setAsk(false)}>{L("Vazgeç", "Cancel")}</button>
    </span>
  );
}
