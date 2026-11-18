// Beyaz ekran yerine: hata yakalanır, kaydedilir, kullanıcıya yenile düğmesi gösterilir (18 Kasım).
// Yeni yayından sonra eski sayfa artık olmayan bir parçayı (assets/*.js) isterse sayfa kendiliğinden bir kez yenilenir.
import { Component, type ReactNode } from "react";
import { sb } from "../lib/supabase";
import { L } from "../lib/i18n";

const CHUNK_RE = /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to fetch dynamically|ChunkLoadError|Loading chunk|Unable to preload CSS/i;
const RELOAD_KEY = "chunk-reload-at";

export const isChunkError = (e: unknown) => CHUNK_RE.test(String((e as Error)?.message ?? e));

/** Son 30 saniyede yenilenmediyse sayfayı bir kez yeniler; yenilediyse false döner (sonsuz döngü olmasın). */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* depolama yoksa yine de bir kez dene */ }
  location.reload();
  return true;
}

/** Hata kaydı (0057 client_errors): yalnız giriş yapmış kullanıcı yazabilir, okuyamaz. Hata olursa sessizce geçilir. */
export function logClientError(e: unknown, kind: string) {
  try {
    const err = e as Error;
    void sb().from("client_errors").insert({
      kind, path: location.pathname.slice(0, 200),
      message: String(err?.message ?? e).slice(0, 500),
      stack: String(err?.stack ?? "").slice(0, 2000),
      user_agent: navigator.userAgent.slice(0, 300),
    }).then(() => undefined, () => undefined);
  } catch { /* yok say */ }
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    if (isChunkError(error) && reloadOnce()) return;
    logClientError(error, isChunkError(error) ? "chunk" : "render");
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="content stack narrow" role="alert">
        <h1>{L("Bu sayfa açılırken bir sorun oldu", "Something went wrong opening this page")}</h1>
        <p>{isChunkError(error)
          ? L("Site az önce güncellendi. Sayfayı yenileyince yeni sürüm açılır.", "The site was just updated. Reload the page to open the new version.")
          : L("Hata kaydedildi, inceleyeceğiz. Sayfayı yenilemeyi deneyin.", "The error was recorded and we'll look into it. Try reloading the page.")}</p>
        <p className="muted" style={{ overflowWrap: "anywhere" }}>{String(error.message).slice(0, 200)}</p>
        <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={() => location.reload()}>{L("Sayfayı yenile", "Reload page")}</button>
          <a className="btn btn-quiet" href="/panel">{L("Panele dön", "Back to dashboard")}</a>
        </p>
      </main>
    );
  }
}
