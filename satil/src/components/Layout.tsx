import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Anchor, BarChart3, Building2, Calculator, ClipboardList, Coins, Database, Factory, FileText, Globe2, HardDrive, Landmark, LayoutDashboard,
  LogOut, MapPin, Menu, Package, Receipt, Scale, ScrollText, Settings, Ship, Swords, Tags, TrendingUp, X, Hash, Save, ArrowLeftRight,
} from "lucide-react";
import { LOCALES, useI18n, type Locale } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { canSeeAudit } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Badge, Select } from "./ui";

interface Item { to: string; key: string; icon: ReactNode }
const NAV: { group: string; items: Item[] }[] = [
  { group: "nav.g.pilot", items: [{ to: "/", key: "nav.dashboard", icon: <LayoutDashboard /> }] },
  { group: "nav.g.market", items: [
    { to: "/comparateur", key: "nav.compare", icon: <Scale /> },
    { to: "/indicateurs", key: "t.market_indicators", icon: <BarChart3 /> },
    { to: "/prix", key: "t.price_observations", icon: <Tags /> },
    { to: "/enquetes", key: "t.field_surveys", icon: <ClipboardList /> },
    { to: "/concurrents", key: "t.competitors", icon: <Swords /> },
    { to: "/flux", key: "t.trade_flows", icon: <ArrowLeftRight /> },
    { to: "/sources", key: "t.data_sources", icon: <Database /> },
  ] },
  { group: "nav.g.sourcing", items: [
    { to: "/fournisseurs", key: "t.suppliers", icon: <Factory /> },
    { to: "/devis-fournisseurs", key: "t.supplier_quotes", icon: <FileText /> },
    { to: "/comparer-devis", key: "nav.quoteCompare", icon: <TrendingUp /> },
  ] },
  { group: "nav.g.profit", items: [
    { to: "/simulateur", key: "nav.simulator", icon: <Calculator /> },
    { to: "/simulations", key: "nav.simulations", icon: <Save /> },
    { to: "/douane", key: "t.customs_rules", icon: <Landmark /> },
    { to: "/fret", key: "t.freight_quotes", icon: <Ship /> },
    { to: "/taux", key: "t.exchange_rates", icon: <Coins /> },
  ] },
  { group: "nav.g.reference", items: [
    { to: "/pays", key: "t.countries", icon: <Globe2 /> },
    { to: "/villes", key: "t.cities", icon: <MapPin /> },
    { to: "/ports", key: "t.ports", icon: <Anchor /> },
    { to: "/produits", key: "t.products", icon: <Package /> },
    { to: "/categories", key: "t.product_categories", icon: <Receipt /> },
    { to: "/codes-hs", key: "t.hs_codes", icon: <Hash /> },
  ] },
  { group: "nav.g.admin", items: [
    { to: "/audit", key: "nav.audit", icon: <ScrollText /> },
    { to: "/parametres", key: "nav.settings", icon: <Settings /> },
  ] },
];

export function Logo({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icon.svg" alt="" className="size-9 rounded-lg shadow" />
      <div className="leading-tight">
        <p className={cn("text-lg font-black tracking-wide", light ? "text-white" : "text-navy-900")}>SATIL</p>
        <p className={cn("text-[9px] font-semibold uppercase tracking-[0.14em]", light ? "text-gold-300" : "text-brand-700")}>SinoAfrica Trade Intelligence</p>
      </div>
    </div>
  );
}
export function LocaleSwitch({ dark }: { dark?: boolean }) {
  const { locale, setLocale } = useI18n();
  return (
    <Select aria-label="Langue / 语言 / Language" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
      className={cn("h-9 w-auto py-0 text-xs font-semibold", dark && "border-white/20 bg-white/10 text-white [&>option]:text-slate-900")}>
      {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </Select>
  );
}

export function Layout() {
  const { t } = useI18n();
  const { org, orgs, role, mode, user, signOut, switchOrg } = useSession();
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  const nav = (
    <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-300/90">{t(g.group)}</p>
          <ul className="space-y-0.5">
            {g.items.filter((i) => i.to !== "/audit" || canSeeAudit(role)).map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.to === "/"} onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4 [&_svg]:shrink-0",
                    isActive ? "bg-brand-600 font-semibold text-white shadow" : "text-navy-100 hover:bg-white/10 hover:text-white",
                  )}>
                  {i.icon}<span className="truncate">{t(i.key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
  const foot = (
    <div className="border-t border-white/10 p-3 text-xs text-navy-200">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 shrink-0 text-gold-300" />
        {orgs.length > 1 ? (
          <Select value={org?.id} onChange={(e) => switchOrg(e.target.value)} className="h-8 border-white/20 bg-white/10 py-0 text-xs text-white [&>option]:text-slate-900">
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        ) : <span className="truncate font-semibold text-white">{org?.name}</span>}
      </div>
      <p className="mt-1.5 truncate">{role && t("role." + role)}{user?.email ? " · " + user.email : ""}</p>
      {mode === "supabase" && (
        <button onClick={signOut} className="mt-2 flex items-center gap-2 rounded-md px-2 py-1.5 font-semibold text-navy-100 hover:bg-white/10 hover:text-white">
          <LogOut className="size-4" />{t("auth.signOut")}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barre latérale (bureau) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-gradient-to-b from-navy-900 to-navy-950 lg:flex">
        <div className="border-b border-white/10 px-5 py-4"><Logo light /></div>
        {nav}{foot}
      </aside>
      {/* Tiroir (mobile) */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-navy-900 to-navy-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <Logo light />
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-md p-1.5 text-white hover:bg-white/10"><X className="size-5" /></button>
            </div>
            {nav}{foot}
          </aside>
        </div>
      )}
      <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-6">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="rounded-md p-2 text-navy-900 hover:bg-slate-100 lg:hidden"><Menu className="size-5" /></button>
        <div className="lg:hidden"><Logo /></div>
        <div className="flex-1" />
        {mode === "local" && <Badge tone="gold" className="hidden sm:inline-flex"><HardDrive className="size-3" />{t("mode.local")}</Badge>}
        <LocaleSwitch />
      </header>
      <div className="h-1 bg-gradient-to-r from-brand-500 via-gold-400 to-navy-700 no-print" />
      <main key={loc.pathname} className="mx-auto max-w-[1400px] px-3 py-5 sm:px-6 sm:py-7">
        <Outlet />
      </main>
    </div>
  );
}
