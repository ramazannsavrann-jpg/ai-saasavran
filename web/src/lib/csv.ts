// CSV dışa aktarma: Excel'de açılır (UTF-8 BOM). Türkçe Excel ayırıcı olarak ";" bekler.
// Hücre = + - @ ile başlıyorsa formül sayılmasın diye başına ' konur (CSV enjeksiyonu).
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = "'" + s;
  return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][], sep = ";"): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(sep)).join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, rows: unknown[][], sep = ";") {
  const url = URL.createObjectURL(new Blob([toCsv(rows, sep)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileSlug = (s: string) => s.replace(/ı/g, "i").replace(/İ/g, "i").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "rapor";
