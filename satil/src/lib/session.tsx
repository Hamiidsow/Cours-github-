import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { LocalStore, SupabaseStore, type Store } from "./store";
import type { Role } from "./permissions";
import { seedReference } from "./seed";

export interface Org { id: string; name: string; base_currency: string; role: Role; country_ids: string[] | null }
interface SessionCtx {
  mode: "supabase" | "local";
  loading: boolean;
  user: { id: string; email: string } | null;
  orgs: Org[];
  org: Org | null;
  role: Role | null;
  store: Store | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, fullName: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  createOrg(name: string, currency: string): Promise<void>;
  switchOrg(id: string): void;
}
const Ctx = createContext<SessionCtx | null>(null);
export const useSession = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("SessionProvider manquant");
  return c;
};

const LOCAL_ORG = "satil.local.org";
const CURRENT_ORG = "satil.current.org";

export function SessionProvider({ children }: { children: ReactNode }) {
  const mode: "supabase" | "local" = supabase ? "supabase" : "local";
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionCtx["user"]>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string | null>(() => localStorage.getItem(CURRENT_ORG));

  const loadOrgs = useCallback(async (uid: string) => {
    const { data, error } = await supabase!.from("memberships")
      .select("role, country_ids, organizations (id, name, base_currency)").eq("user_id", uid);
    if (error) throw new Error(error.message);
    const list: Org[] = (data ?? []).filter((m: any) => m.organizations).map((m: any) => ({
      id: m.organizations.id, name: m.organizations.name, base_currency: m.organizations.base_currency,
      role: m.role, country_ids: m.country_ids,
    }));
    setOrgs(list);
    return list;
  }, []);

  useEffect(() => {
    if (mode === "local") {
      const raw = localStorage.getItem(LOCAL_ORG);
      setUser({ id: "local", email: "" });
      if (raw) setOrgs([{ ...JSON.parse(raw), id: "local", role: "super_admin", country_ids: null }]);
      setLoading(false);
      return;
    }
    let alive = true;
    const apply = async (u: { id: string; email?: string } | null) => {
      if (!alive) return;
      if (!u) { setUser(null); setOrgs([]); setLoading(false); return; }
      setUser({ id: u.id, email: u.email ?? "" });
      try { await loadOrgs(u.id); } finally { if (alive) setLoading(false); }
    };
    supabase!.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase!.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => apply(s?.user ?? null), 0);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [mode, loadOrgs]);

  const org = useMemo(() => orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null, [orgs, orgId]);
  const store = useMemo<Store | null>(
    () => (!org ? null : mode === "local" ? new LocalStore() : new SupabaseStore(supabase!, org.id)),
    [org?.id, mode],
  );

  const value: SessionCtx = {
    mode, loading, user, orgs, org, role: org?.role ?? null, store,
    async signIn(email, password) {
      const { error } = await supabase!.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signUp(email, password, fullName) {
      const { data, error } = await supabase!.auth.signUp({
        email, password, options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      await supabase!.auth.signOut();
      qc.clear();
    },
    async createOrg(name, currency) {
      if (mode === "local") {
        localStorage.setItem(LOCAL_ORG, JSON.stringify({ name, base_currency: currency }));
        await seedReference(new LocalStore());
        setOrgs([{ id: "local", name, base_currency: currency, role: "super_admin", country_ids: null }]);
        return;
      }
      const { data, error } = await supabase!.rpc("create_organization", { p_name: name, p_base_currency: currency });
      if (error) throw new Error(error.message);
      await seedReference(new SupabaseStore(supabase!, data as string));
      localStorage.setItem(CURRENT_ORG, data as string);
      setOrgId(data as string);
      await loadOrgs(user!.id);
    },
    switchOrg(id) {
      localStorage.setItem(CURRENT_ORG, id);
      setOrgId(id);
      qc.clear();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
