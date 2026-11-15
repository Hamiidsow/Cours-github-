import { useState } from "react";
import { BarChart3, Calculator, Factory, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { CURRENCIES } from "@/lib/utils";
import { Button, Card, Input, Label, Notice, Select } from "@/components/ui";
import { LocaleSwitch, Logo } from "@/components/Layout";

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const points = [
    { icon: <BarChart3 />, k: "auth.p1" }, { icon: <Factory />, k: "auth.p2" },
    { icon: <Calculator />, k: "auth.p3" }, { icon: <ShieldCheck />, k: "auth.p4" },
  ];
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-brand-800 p-10 text-white lg:flex">
        <Logo light />
        <div>
          <h1 className="max-w-md text-3xl font-black leading-tight">{t("auth.heroTitle")}</h1>
          <p className="mt-3 max-w-md text-sm text-navy-100">{t("auth.heroText")}</p>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p.k} className="flex items-center gap-3 text-sm">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 text-gold-300 [&_svg]:size-4">{p.icon}</span>{t(p.k)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-navy-200">Dakar · Abidjan · Conakry · Tema · Lomé · Lagos · Mombasa · Durban · Pointe-Noire</p>
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-gold-400/10" />
      </div>
      <div className="flex flex-col bg-slate-50">
        <div className="flex items-center justify-between p-4"><div className="lg:invisible"><Logo /></div><LocaleSwitch /></div>
        <div className="flex flex-1 items-center justify-center p-4 pb-16">
          <Card className="w-full max-w-md border-t-4 border-t-brand-500 p-6">{children}</Card>
        </div>
      </div>
    </div>
  );
}

export function AuthPage() {
  const { t } = useI18n();
  const { signIn, signUp } = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setInfo(""); setBusy(true);
    try {
      if (mode === "in") await signIn(email.trim(), password);
      else {
        if (password.length < 10) throw new Error(t("auth.pwRule"));
        const r = await signUp(email.trim(), password, name.trim());
        if (r.needsConfirmation) { setInfo(t("auth.confirmSent")); setMode("in"); }
      }
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Shell>
      <h2 className="text-xl font-extrabold text-navy-900">{t(mode === "in" ? "auth.signIn" : "auth.signUp")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("auth.subtitle")}</p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "up" && <div><Label htmlFor="name" required>{t("auth.fullName")}</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>}
        <div><Label htmlFor="email" required>{t("auth.email")}</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div>
          <Label htmlFor="pw" required>{t("auth.password")}</Label>
          <Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          {mode === "up" && <p className="mt-1 text-xs text-slate-500">{t("auth.pwRule")}</p>}
        </div>
        {error && <Notice tone="red">{error}</Notice>}
        {info && <Notice tone="green">{info}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{t(mode === "in" ? "auth.signIn" : "auth.signUp")}</Button>
      </form>
      <button className="mt-4 w-full text-center text-sm font-semibold text-brand-700 hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
        {t(mode === "in" ? "auth.toSignUp" : "auth.toSignIn")}
      </button>
    </Shell>
  );
}

export function OnboardingPage() {
  const { t } = useI18n();
  const { createOrg, mode, signOut } = useSession();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await createOrg(name.trim(), currency); } catch (err) { setError((err as Error).message); setBusy(false); }
  };
  return (
    <Shell>
      <h2 className="text-xl font-extrabold text-navy-900">{t("onb.title")}</h2>
      <p className="mt-1 text-sm text-slate-500">{t("onb.text")}</p>
      {mode === "local" && <Notice className="mt-4">{t("mode.localLong")}</Notice>}
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div><Label htmlFor="org" required>{t("onb.orgName")}</Label><Input id="org" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div>
          <Label htmlFor="cur" required>{t("onb.currency")}</Label>
          <Select id="cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
          <p className="mt-1 text-xs text-slate-500">{t("onb.currencyHelp")}</p>
        </div>
        {error && <Notice tone="red">{error}</Notice>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || name.trim().length < 2}>{busy ? t("common.saving") : t("onb.create")}</Button>
      </form>
      {mode === "supabase" && <button className="mt-4 w-full text-center text-sm text-slate-500 hover:underline" onClick={signOut}>{t("auth.signOut")}</button>}
      <p className="mt-4 text-xs text-slate-400">{t("onb.memberHint")}</p>
    </Shell>
  );
}
