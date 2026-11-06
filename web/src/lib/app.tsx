// Oturum ve seçili çalışma alanı durumu.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { sb } from "./supabase";
import { api, type Workspace } from "./data";

interface AppState {
  session: Session | null;
  loading: boolean;
  workspaces: Workspace[];
  current: Workspace | null;
  isAdmin: boolean;
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

  const reload = useCallback(async () => {
    const ws = await api.workspaces();
    setWorkspaces(ws);
    setIsAdmin(await api.isPlatformAdmin().catch(() => false));
  }, []);

  useEffect(() => {
    sb().auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await reload().catch(() => {});
      setLoading(false);
    });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) reload().catch(() => {}); else { setWorkspaces([]); setIsAdmin(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  // Müşteri çalışma alanları önce; Demo Lab yalnızca açıkça seçilince
  const customer = workspaces.filter((w) => w.kind !== "demo_lab");
  const current = workspaces.find((w) => w.id === currentId) ?? customer[0] ?? null;

  const select = (id: string) => { setCurrentId(id); writeKey(id); };
  return <Ctx.Provider value={{ session, loading, workspaces, current, isAdmin, select, reload }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AppProvider eksik");
  return c;
}

/** Basit veri yükleme kancası: yükleniyor / hata / veri + yeniden yükle. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try { setState({ data: await fn(), loading: false }); }
    catch (e) { setState({ error: (e as Error).message, loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
