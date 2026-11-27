// Oturum ve seçili çalışma alanı durumu.
import { createContext, useRef, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { sb } from "./supabase";
import { api, type Workspace } from "./data";

interface AppState {
  session: Session | null;
  loading: boolean;
  workspaces: Workspace[];
  current: Workspace | null;
  isAdmin: boolean;
  /** Çalışma alanları yüklenemedi (bağlantı/sunucu hatası): "hiç alan yok" ile karıştırılmasın */
  wsError: boolean;
  select: (id: string) => void;
  reload: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);
const KEY = "saasavran-ws";
const readKey = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeKey = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* özel pencere */ } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(readKey());
  const [isAdmin, setIsAdmin] = useState(false);
  const [wsError, setWsError] = useState(false);
  // Girişten hemen sonra oturum gelir ama çalışma alanları henüz yüklenmemiştir: bu arada "alan yok" sanılıp
  // kurulum ekranına gidilmesin (24 Kasım, Google ile giriş). Yalnız kullanıcı değişince beklenir; token yenilemede değil.
  const [wsPending, setWsPending] = useState(false);
  const userRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    let ws: Workspace[];
    try { ws = await api.workspaces(); } catch (e) { setWsError(true); throw e; }
    setWsError(false);
    setWorkspaces(ws);
    setIsAdmin(await api.isPlatformAdmin().catch(() => false));
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      userRef.current = data.session?.user.id ?? null;
      if (data.session) await reload().catch(() => {});
      setLoading(false);
    });
    const { data: sub } = sb().auth.onAuthStateChange((e, s) => {
      // Şifre sıfırlama bağlantısıyla gelindi: hesap sayfası "yeni şifre belirle" uyarısını göstersin
      if (e === "PASSWORD_RECOVERY") { try { sessionStorage.setItem("recovery", "1"); } catch { /* yok say */ } }
      const uid = s?.user.id ?? null;
      const changed = uid !== userRef.current;
      userRef.current = uid;
      if (s && changed) setWsPending(true);
      setSession(s);
      if (s) reload().catch(() => {}).finally(() => { if (changed) setWsPending(false); });
      else { setWorkspaces([]); setIsAdmin(false); setWsPending(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  // Müşteri çalışma alanları önce; Demo Lab yalnızca açıkça seçilince
  const customer = workspaces.filter((w) => w.kind !== "demo_lab");
  const current = workspaces.find((w) => w.id === currentId) ?? customer[0] ?? null;

  const select = (id: string) => { setCurrentId(id); writeKey(id); };
  return <Ctx.Provider value={{ session, loading: loading || wsPending, workspaces, current, isAdmin, wsError, select, reload }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AppProvider eksik");
  return c;
}

const sameDeps = (a: readonly unknown[] | undefined, b: readonly unknown[]) => !!a && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

export interface LoadOptions {
  /** true iken fn çağrılmaz; veri yok, "yükleniyor" sayılır (ör. bağlı olduğu veri henüz gelmedi). */
  skip?: boolean;
  /** Yeniden yüklemede (aynı deps) hata olursa eski veri silinmez; hata ayrıca bildirilir (ör. ölçüm beklerken yoklama). */
  keepOnError?: boolean;
}

/** Basit veri yükleme kancası: yükleniyor / hata / veri + yeniden yükle.
 *  - Yalnız en son isteğin cevabı uygulanır (eski, geç gelen cevap yenisinin üstüne yazmaz).
 *  - deps değişince eski veri hemen gizlenir (başka markanın/türün verisi bir an bile gösterilmez).
 *  - reload() aynı deps'te eski veriyi yenisi gelene kadar gösterir. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], opts: LoadOptions = {}) {
  const skip = !!opts.skip;
  const allDeps = [...deps, skip];
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean; deps?: unknown[] }>({ loading: true });
  const reqId = useRef(0);
  const keepRef = useRef(!!opts.keepOnError);
  keepRef.current = !!opts.keepOnError;
  const run = useCallback(async () => {
    const id = ++reqId.current;
    const key = allDeps;
    if (skip) { setState({ loading: true, deps: key }); return; }
    // Aynı deps'te yeniden yükleme: eski veri kalır; deps değiştiyse veri temizlenir
    setState((s) => (sameDeps(s.deps, key) ? { ...s, loading: true } : { loading: true, deps: key }));
    try {
      const data = await fn();
      if (id === reqId.current) setState({ data, loading: false, deps: key });
    } catch (e) {
      if (id !== reqId.current) return;
      const error = (e as Error)?.message || "error"; // boş mesaj da hata sayılır
      setState((s) => (keepRef.current && sameDeps(s.deps, key) && s.data !== undefined ? { data: s.data, error, loading: false, deps: key } : { error, loading: false, deps: key }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, allDeps);
  useEffect(() => { void run(); return () => { reqId.current++; }; }, [run]); // ayrılınca/deps değişince bekleyen cevap yok sayılır
  // deps bu çizimde değiştiyse (etki henüz çalışmadı) eski veriyi gösterme
  if (!sameDeps(state.deps, allDeps)) return { data: undefined as T | undefined, error: undefined as string | undefined, loading: true, reload: run };
  return { data: state.data, error: state.error, loading: state.loading, reload: run };
}
