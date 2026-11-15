import { useEffect, useRef, useState } from "react";
import { Building2, Database, Download, FlaskConical, HardDrive, Map, Settings, ShieldCheck, Trash2, Upload, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useInvalidate, useTable } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { LocalStore } from "@/lib/store";
import { loadDemo, purgeDemo } from "@/lib/seed";
import { ROLES, type Role } from "@/lib/permissions";
import { refLabel } from "@/resources";
import { today } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, Input, Label, Notice, PageHeader, Select, td, th } from "@/components/ui";

const ROADMAP: { v: string; k: string; state: "done" | "next" | "later" }[] = [
  { v: "V1", k: "road.v1", state: "done" }, { v: "V2", k: "road.v2", state: "next" }, { v: "V3", k: "road.v3", state: "later" },
  { v: "V4", k: "road.v4", state: "later" }, { v: "V5", k: "road.v5", state: "later" },
];

export function SettingsPage() {
  const { t, locale } = useI18n();
  const { org, role, mode, store, user } = useSession();
  const inv = useInvalidate();
  const [busy, setBusy] = useState(false);
  const admin = role === "super_admin";
  const file = useRef<HTMLInputElement>(null);

  const demo = async (load: boolean) => {
    if (!load && !window.confirm(t("demo.confirmPurge"))) return;
    setBusy(true);
    try {
      if (load) { await loadDemo(store!); toast.success(t("demo.loaded")); }
      else { const k = await purgeDemo(store!); toast.success(`${k} ${t("demo.purged")}`); }
      inv();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const backup = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([LocalStore.exportAll()], { type: "application/json" }));
    a.download = `satil-sauvegarde-${today()}.json`; a.click();
  };
  const restore = async (f?: File) => {
    if (!f || !window.confirm(t("local.confirmRestore"))) return;
    try { LocalStore.importAll(await f.text()); inv(); toast.success(t("local.restored")); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div>
      <PageHeader icon={<Settings />} title={t("nav.settings")} subtitle={t("set.subtitle")} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Building2 className="size-4 text-brand-700" />{t("set.org")}</span>} />
          <dl className="grid grid-cols-2 gap-3 p-4 text-sm">
            <div><dt className="text-xs font-semibold text-slate-500">{t("onb.orgName")}</dt><dd className="font-bold text-navy-900">{org?.name}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">{t("onb.currency")}</dt><dd className="font-bold text-navy-900">{org?.base_currency}</dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">{t("set.myRole")}</dt><dd><Badge tone="green">{role && t("role." + role)}</Badge></dd></div>
            <div><dt className="text-xs font-semibold text-slate-500">{t("set.storage")}</dt><dd><Badge tone={mode === "local" ? "gold" : "navy"}>{mode === "local" ? t("mode.local") : "Supabase · PostgreSQL + RLS"}</Badge></dd></div>
          </dl>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><FlaskConical className="size-4 text-violet-600" />{t("demo.title")}</span>} subtitle={t("demo.help")} />
          <div className="flex flex-wrap gap-2 p-4">
            <Button variant="navy" disabled={busy || !(admin || role === "directeur_pays")} onClick={() => demo(true)}><Database />{t("demo.load")}</Button>
            <Button variant="outline" disabled={busy || !(admin || role === "directeur_pays")} onClick={() => demo(false)}><Trash2 />{t("demo.purge")}</Button>
          </div>
        </Card>

        {mode === "local" ? (
          <Card className="lg:col-span-2">
            <CardHeader title={<span className="flex items-center gap-2"><HardDrive className="size-4 text-gold-600" />{t("mode.local")}</span>} />
            <div className="space-y-3 p-4">
              <Notice>{t("mode.localLong")}</Notice>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={backup}><Download />{t("local.backup")}</Button>
                <input ref={file} type="file" accept=".json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
                <Button variant="outline" onClick={() => file.current?.click()}><Upload />{t("local.restore")}</Button>
              </div>
              <p className="text-xs text-slate-500">{t("local.toSupabase")}</p>
            </div>
          </Card>
        ) : admin || role === "directeur_pays" ? <Members /> : null}

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-700" />{t("sec.title")}</span>} />
          <ul className="list-disc space-y-1.5 p-4 pl-8 text-sm text-slate-700">
            {["sec.1", "sec.2", "sec.3", "sec.4", "sec.5"].map((k) => <li key={k}>{t(k)}</li>)}
          </ul>
          {mode === "supabase" && <p className="px-4 pb-4 text-xs text-slate-500">{user?.email}</p>}
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Map className="size-4 text-navy-700" />{t("road.title")}</span>} subtitle={t("road.help")} />
          <ol className="divide-y divide-slate-100">
            {ROADMAP.map((r) => (
              <li key={r.v} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <Badge tone={r.state === "done" ? "green" : r.state === "next" ? "gold" : "slate"}>{r.v} · {t("road." + r.state)}</Badge>
                <span className="text-slate-700">{t(r.k)}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
      <p className="mt-4 text-xs text-slate-400">SATIL 0.1.0 · {locale.toUpperCase()}</p>
    </div>
  );
}

function Members() {
  const { t, locale } = useI18n();
  const { org, role, user } = useSession();
  const countries = useTable("countries").data ?? [];
  const [rows, setRows] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("analyste");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const admin = role === "super_admin";
  const load = () => supabase!.rpc("list_members", { p_org: org!.id }).then(({ data, error }) => { if (error) setError(error.message); else setRows(data ?? []); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org?.id]);
  const run = async (p: PromiseLike<{ error: any }>) => { setError(""); const { error } = await p; if (error) setError(error.message); else { toast.success(t("common.saved")); load(); } };
  return (
    <Card className="lg:col-span-2">
      <CardHeader title={<span className="flex items-center gap-2"><Users className="size-4 text-brand-700" />{t("mem.title")}</span>} subtitle={t("mem.help")} />
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-navy-900"><tr>{["auth.email", "auth.fullName", "mem.role", "mem.countries", ""].map((h) => <th key={h} className={th}>{h && t(h)}</th>)}</tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-slate-100">
                <td className={td}>{m.email}</td><td className={td}>{m.full_name ?? "—"}</td>
                <td className={td}>{admin && m.user_id !== user?.id ? (
                  <Select className="h-8 w-auto py-0 text-xs" value={m.role} onChange={(e) => run(supabase!.from("memberships").update({ role: e.target.value }).eq("id", m.id))}>
                    {ROLES.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}
                  </Select>) : <Badge tone="green">{t("role." + m.role)}</Badge>}</td>
                <td className={td}>{m.country_ids ? m.country_ids.map((id: string) => refLabel("countries", countries.find((c) => c.id === id), locale)).join(", ") : t("common.allCountries")}</td>
                <td className={td + " text-right"}>{admin && m.user_id !== user?.id && <Button variant="ghost" size="icon" className="text-red-600" aria-label={t("common.delete")}
                  onClick={() => window.confirm(t("common.confirmDelete")) && run(supabase!.from("memberships").delete().eq("id", m.id))}><Trash2 /></Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {admin && (
        <form className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); run(supabase!.rpc("add_member", { p_org: org!.id, p_email: email, p_role: newRole, p_country_ids: country ? [country] : null })).then(() => setEmail("")); }}>
          <div><Label htmlFor="m-email" required>{t("auth.email")}</Label><Input id="m-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label htmlFor="m-role">{t("mem.role")}</Label><Select id="m-role" value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{t("role." + r)}</option>)}</Select></div>
          <div><Label htmlFor="m-c">{t("mem.countries")}</Label><Select id="m-c" value={country} onChange={(e) => setCountry(e.target.value)}><option value="">{t("common.allCountries")}</option>{countries.map((c) => <option key={c.id} value={c.id}>{refLabel("countries", c, locale)}</option>)}</Select></div>
          <div className="flex items-end"><Button type="submit" className="w-full"><UserPlus />{t("mem.add")}</Button></div>
        </form>
      )}
      {error && <div className="px-4 pb-4"><Notice tone="red">{error}</Notice></div>}
    </Card>
  );
}
