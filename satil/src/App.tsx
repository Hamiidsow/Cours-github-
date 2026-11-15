import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  Anchor, ArrowLeftRight, BarChart3, ClipboardList, Coins, Database, Factory, FileText, Globe2, Hash, Landmark, MapPin, Package, Receipt, Ship, Swords, Tags,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { isInternal } from "@/lib/permissions";
import { RESOURCES } from "@/resources";
import { Layout } from "@/components/Layout";
import { ResourcePage } from "@/components/ResourcePage";
import { Empty, Notice } from "@/components/ui";
import { AuthPage, OnboardingPage } from "@/pages/Auth";
import { DashboardPage } from "@/pages/Dashboard";
import { MarketComparePage } from "@/pages/MarketCompare";
import { QuoteComparePage } from "@/pages/QuoteCompare";
import { SimulatorPage } from "@/pages/Simulator";
import { SimulationsPage } from "@/pages/Simulations";
import { AuditLogPage } from "@/pages/AuditLog";
import { SettingsPage } from "@/pages/Settings";

const ICONS: Record<string, ReactNode> = {
  countries: <Globe2 />, cities: <MapPin />, ports: <Anchor />, product_categories: <Receipt />, hs_codes: <Hash />, products: <Package />,
  suppliers: <Factory />, supplier_quotes: <FileText />, data_sources: <Database />, market_indicators: <BarChart3 />, price_observations: <Tags />,
  field_surveys: <ClipboardList />, competitors: <Swords />, trade_flows: <ArrowLeftRight />, customs_rules: <Landmark />, freight_quotes: <Ship />, exchange_rates: <Coins />,
};

export default function App() {
  const { loading, user, org, role, mode, signOut } = useSession();
  const { t } = useI18n();
  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Empty title={t("common.loading")} /></div>;
  if (mode === "supabase" && !user) return <AuthPage />;
  if (!org) return <OnboardingPage />;
  if (!isInternal(role)) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Notice tone="navy">{t("portal.soon")}</Notice>
        <button className="mt-4 text-sm font-semibold text-brand-700 underline" onClick={signOut}>{t("auth.signOut")}</button>
      </div>
    );
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="comparateur" element={<MarketComparePage />} />
          <Route path="comparer-devis" element={<QuoteComparePage />} />
          <Route path="simulateur" element={<SimulatorPage />} />
          <Route path="simulations" element={<SimulationsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="parametres" element={<SettingsPage />} />
          {Object.values(RESOURCES).map((r) => (
            <Route key={r.table} path={r.path} element={<ResourcePage key={r.table} resource={r} icon={ICONS[r.table]} />} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
