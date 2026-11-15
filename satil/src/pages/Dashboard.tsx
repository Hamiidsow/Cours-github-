import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BarChart3, Calculator, CheckCircle2, ClipboardList, Factory, FileText, Globe2, LayoutDashboard, Package, ShieldCheck, Tags } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useTables } from "@/lib/data";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { refLabel } from "@/resources";
import { cn, today } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, DemoBadge, Empty, Kpi, NA, Notice, PageHeader, td, th } from "@/components/ui";

const TABLES = ["countries", "products", "suppliers", "supplier_quotes", "price_observations", "field_surveys", "data_sources",
  "market_indicators", "financial_scenarios", "customs_rules", "freight_quotes", "exchange_rates", "competitors", "ports"];
const SOURCED = ["market_indicators", "price_observations", "field_surveys", "customs_rules", "freight_quotes", "exchange_rates", "competitors"];
const STAGES = ["prospection", "verification", "echantillon", "negociation", "commande", "inspection", "expedition"];

export function DashboardPage() {
  const { t, locale } = useI18n();
  const { org } = useSession();
  const { data: all, loading } = useTables(TABLES);
  const hasDemo = TABLES.some((tb) => all[tb].some((r) => r.is_demo));
  const [withDemo, setWithDemo] = useState(true);
  const d = useMemo(() => Object.fromEntries(TABLES.map((tb) => [tb, withDemo ? all[tb] : all[tb].filter((r) => !r.is_demo)])), [all, withDemo]);

  const sourcedRows = SOURCED.flatMap((tb) => d[tb]);
  const verified = sourcedRows.filter((r) => r.verification_status === "verifie").length;
  const verifiedShare = sourcedRows.length ? verified / sourcedRows.length : null;
  const suppliersVerified = d.suppliers.filter((s) => s.verification_status === "verifie").length;

  const quality = SOURCED.map((tb) => ({
    name: t("t." + tb),
    verifie: d[tb].filter((r) => r.verification_status === "verifie").length,
    non_verifie: d[tb].filter((r) => r.verification_status === "non_verifie").length,
    hypothese: d[tb].filter((r) => r.verification_status === "hypothese").length,
    rejete: d[tb].filter((r) => r.verification_status === "rejete").length,
  })).filter((q) => q.verifie + q.non_verifie + q.hypothese + q.rejete > 0);
  const pipeline = STAGES.map((s) => ({ name: t("o." + s), n: d.suppliers.filter((x) => x.pipeline_stage === s).length }));

  // Couverture des données par pays : met en évidence les trous avant toute décision d'implantation.
  const countries = [...d.countries].sort((a, b) => (a.phase ?? 9) - (b.phase ?? 9));
  const portCountry = Object.fromEntries(d.ports.map((p) => [p.id, p.country_id]));
  const coverage = countries.map((c) => ({
    c,
    cells: [
      d.market_indicators.filter((r) => r.country_id === c.id).length,
      d.price_observations.filter((r) => r.country_id === c.id).length,
      d.field_surveys.filter((r) => r.country_id === c.id).length,
      d.customs_rules.filter((r) => r.country_id === c.id).length,
      d.freight_quotes.filter((r) => portCountry[r.destination_port_id] === c.id).length,
      d.competitors.filter((r) => r.country_id === c.id).length,
    ],
  }));
  const covHead = ["market_indicators", "price_observations", "field_surveys", "customs_rules", "freight_quotes", "competitors"];

  // Alertes calculées sur les données réellement enregistrées
  const alerts: { tone: "red" | "gold"; text: string; to: string }[] = [];
  const expired = d.supplier_quotes.filter((q) => q.valid_until && q.valid_until < today()).length;
  if (expired) alerts.push({ tone: "red", text: `${expired} ${t("dash.a.expired")}`, to: "/devis-fournisseurs" });
  const perProduct: Record<string, number> = {};
  d.supplier_quotes.forEach((q) => { perProduct[q.product_id] = (perProduct[q.product_id] ?? 0) + 1; });
  const few = Object.values(perProduct).filter((n) => n < 3).length;
  if (few) alerts.push({ tone: "gold", text: `${few} ${t("dash.a.fewQuotes")}`, to: "/comparer-devis" });
  const noQuote = d.products.filter((p) => !perProduct[p.id]).length;
  if (noQuote) alerts.push({ tone: "gold", text: `${noQuote} ${t("dash.a.noQuote")}`, to: "/produits" });
  const hyp = sourcedRows.filter((r) => r.verification_status === "hypothese").length;
  if (hyp) alerts.push({ tone: "gold", text: `${hyp} ${t("dash.a.hypotheses")}`, to: "/indicateurs" });
  const unver = sourcedRows.filter((r) => r.verification_status === "non_verifie").length;
  if (unver) alerts.push({ tone: "gold", text: `${unver} ${t("dash.a.unverified")}`, to: "/indicateurs" });
  const p1Empty = coverage.filter((x) => x.c.phase === 1 && x.cells.every((n) => n === 0)).length;
  if (p1Empty) alerts.push({ tone: "red", text: `${p1Empty} ${t("dash.a.noData")}`, to: "/indicateurs" });

  const sims = d.financial_scenarios.slice(0, 6);

  return (
    <div>
      <PageHeader icon={<LayoutDashboard />} title={t("nav.dashboard")} subtitle={`${org?.name} — ${t("dash.subtitle")}`}
        actions={<><Link to="/simulateur"><Button variant="gold"><Calculator />{t("nav.simulator")}</Button></Link><Link to="/comparateur"><Button variant="navy"><BarChart3 />{t("nav.compare")}</Button></Link></>} />

      {hasDemo && (
        <Notice tone="violet" className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span><b>DEMO</b> — {t("demo.banner")}</span>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={withDemo} onChange={(e) => setWithDemo(e.target.checked)} className="size-4 accent-violet-600" />{t("demo.include")}</label>
        </Notice>
      )}
      {loading && <Empty title={t("common.loading")} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi tone="navy" icon={<Globe2 />} label={t("t.countries")} value={d.countries.length} hint={`${d.countries.filter((c) => c.phase === 1).length} ${t("dash.phase1")}`} />
        <Kpi tone="green" icon={<Package />} label={t("t.products")} value={d.products.length} hint={`${d.products.filter((p) => p.status === "retenu").length} ${t("dash.retained")}`} />
        <Kpi tone="gold" icon={<Factory />} label={t("t.suppliers")} value={d.suppliers.length} hint={`${suppliersVerified} ${t("dash.verified")}`} />
        <Kpi tone="navy" icon={<FileText />} label={t("t.supplier_quotes")} value={d.supplier_quotes.length} />
        <Kpi tone="green" icon={<Tags />} label={t("t.price_observations")} value={d.price_observations.length} />
        <Kpi tone="gold" icon={<ClipboardList />} label={t("t.field_surveys")} value={d.field_surveys.length} />
        <Kpi tone={verifiedShare !== null && verifiedShare >= 0.6 ? "green" : "red"} icon={<ShieldCheck />} label={t("dash.quality")}
          value={verifiedShare === null ? <NA /> : fmtPct(verifiedShare, locale, 0)} hint={`${verified} / ${sourcedRows.length} ${t("dash.verifiedData")}`} />
        <Kpi tone="violet" icon={<Calculator />} label={t("nav.simulations")} value={d.financial_scenarios.length} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={t("dash.coverage")} subtitle={t("dash.coverageHelp")} />
          {countries.length === 0 ? <Empty title={t("common.empty")} /> : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-navy-900"><tr><th className={th}>{t("f.country_id")}</th>{covHead.map((h) => <th key={h} className={cn(th, "text-center")}>{t("t." + h)}</th>)}</tr></thead>
                <tbody>
                  {coverage.map(({ c, cells }) => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className={cn(td, "whitespace-nowrap font-semibold text-navy-900")}>{refLabel("countries", c, locale)} <Badge tone={c.phase === 1 ? "green" : "slate"}>P{c.phase ?? "?"}</Badge></td>
                      {cells.map((n, k) => (
                        <td key={k} className="p-1 text-center">
                          <span className={cn("tabular inline-block min-w-10 rounded-md px-2 py-1 text-xs font-bold",
                            n === 0 ? "bg-red-50 text-red-600" : n < 3 ? "bg-gold-100 text-gold-700" : "bg-brand-100 text-brand-800")}>{n}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="flex flex-wrap gap-3 px-4 py-2.5 text-[11px] text-slate-500">
            <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-red-200" />{t("dash.cov0")}</span>
            <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-gold-200" />{t("dash.cov1")}</span>
            <span><i className="mr-1 inline-block size-2.5 rounded-sm bg-brand-200" />{t("dash.cov3")}</span>
          </p>
        </Card>

        <Card>
          <CardHeader title={t("dash.alerts")} subtitle={t("dash.alertsHelp")} />
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 p-4 text-sm text-brand-700"><CheckCircle2 className="size-5" />{t("dash.noAlert")}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a, k) => (
                <li key={k}>
                  <Link to={a.to} className="flex items-start gap-2.5 px-4 py-2.5 text-sm hover:bg-slate-50">
                    <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", a.tone === "red" ? "text-red-600" : "text-gold-500")} />
                    <span className="text-slate-700">{a.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title={t("dash.qualityChart")} subtitle={t("dash.qualityHelp")} />
          {quality.length === 0 ? <Empty title={t("common.empty")} /> : (
            <div className="h-72 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quality} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                  <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="verifie" stackId="a" name={t("o.verifie")} fill="#0fb187" />
                  <Bar dataKey="non_verifie" stackId="a" name={t("o.non_verifie")} fill="#94a3b8" />
                  <Bar dataKey="hypothese" stackId="a" name={t("o.hypothese")} fill="#f8b01f" />
                  <Bar dataKey="rejete" stackId="a" name={t("o.rejete")} fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t("dash.pipeline")} subtitle={t("dash.pipelineHelp")} />
          {d.suppliers.length === 0 ? <Empty title={t("common.empty")} /> : (
            <ul className="space-y-2 p-4">
              {pipeline.map((p, k) => {
                const max = Math.max(1, ...pipeline.map((x) => x.n));
                return (
                  <li key={k} className="text-xs">
                    <div className="mb-0.5 flex justify-between font-semibold text-slate-600"><span>{k + 1}. {p.name}</span><span className="tabular text-navy-900">{p.n}</span></div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-navy-700 to-brand-500" style={{ width: `${(p.n / max) * 100}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader title={t("dash.lastSims")} action={<Link to="/simulations" className="text-xs font-semibold text-brand-700 hover:underline">{t("common.seeAll")}</Link>} />
          {sims.length === 0 ? <Empty title={t("dash.noSim")} action={<Link to="/simulateur"><Button size="sm"><Calculator />{t("nav.simulator")}</Button></Link>} /> : (
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-navy-900"><tr>{["f.name", "sim.unitCost", "sim.price", "sim.markRate", "sim.netResult"].map((h) => <th key={h} className={th}>{t(h)}</th>)}</tr></thead>
                <tbody>
                  {sims.map((s) => {
                    const r = s.results ?? {}; const cur = s.inputs?.localCurrency;
                    return (
                      <tr key={s.id} className="border-b border-slate-100">
                        <td className={cn(td, "font-semibold")}><Link className="text-navy-900 hover:underline" to={`/simulateur?id=${s.id}`}>{s.name}</Link> {s.is_demo && <DemoBadge />}</td>
                        <td className={cn(td, "tabular")}>{fmtMoney(r.unitCost, cur, locale) ?? <NA />}</td>
                        <td className={cn(td, "tabular")}>{fmtMoney(r.price, cur, locale) ?? <NA />}</td>
                        <td className={cn(td, "tabular")}>{fmtPct(r.markRate, locale) ?? <NA />}</td>
                        <td className={cn(td, "tabular font-bold", (r.netResult ?? 0) >= 0 ? "text-brand-700" : "text-red-600")}>{fmtMoney(r.netResult, cur, locale) ?? <NA />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      <p className="mt-4 text-xs text-slate-400">{t("dash.footer")} {fmtNum(sourcedRows.length, locale)} {t("dash.footer2")}</p>
    </div>
  );
}
