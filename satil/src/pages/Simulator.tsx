import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calculator, FileSpreadsheet, Printer, RotateCcw, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useInvalidate, useTables } from "@/lib/data";
import { canWrite } from "@/lib/permissions";
import { exportXlsx } from "@/lib/io";
import {
  applyScenario, compareFreight, computeLanded, DEFAULT_SHIFTS, findRate, type Incoterm, type LandedInput, type LandedResult, type ScenarioShift,
} from "@/lib/finance";
import { fmtDate, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { INCOTERMS, refLabel } from "@/resources";
import type { Row } from "@/lib/store";
import { cn, CURRENCIES, today } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, DemoBadge, Input, Label, NA, Notice, PageHeader, Select, StatusBadge, td, th } from "@/components/ui";

type Scen = "pessimiste" | "central" | "optimiste";
interface Origin { text: string; status?: string; demo?: boolean }
export interface SimState {
  name: string; productId: string; countryId: string; quoteId: string;
  purchaseCurrency: string; localCurrency: string; freightCurrency: string;
  incoterm: Incoterm; unitPrice: number | ""; quantity: number | ""; fxRate: number | ""; originCosts: number | "";
  totalCbm: number | ""; totalWeightKg: number | ""; lclRate: number | ""; lclMin: number | ""; fcl20: number | ""; fcl40: number | ""; fcl40hq: number | ""; fillPct: number | "";
  freightMode: string; freight: number | ""; freightFxRate: number | ""; insurancePct: number | "";
  dutyPct: number | ""; otherTaxesPct: number | ""; vatPct: number | ""; vatRecoverablePct: number | "";
  transitFees: number | ""; portHandling: number | ""; inlandTransport: number | ""; storage: number | ""; distribution: number | ""; otherCosts: number | "";
  salePrice: number | ""; targetMarkPct: number | ""; commissionPct: number | ""; lossPct: number | ""; fixedCosts: number | "";
  monthlyUnits: number | ""; customerDays: number | ""; supplierDays: number | ""; stockDays: number | "";
  shifts: Record<Scen, ScenarioShift>;
  origins: Record<string, Origin>;
  notes: string;
}
const blank = (localCurrency: string): SimState => ({
  name: "", productId: "", countryId: "", quoteId: "", purchaseCurrency: "USD", localCurrency, freightCurrency: "USD",
  incoterm: "FOB", unitPrice: "", quantity: "", fxRate: "", originCosts: "",
  totalCbm: "", totalWeightKg: "", lclRate: "", lclMin: "", fcl20: "", fcl40: "", fcl40hq: "", fillPct: 85,
  freightMode: "", freight: "", freightFxRate: "", insurancePct: "",
  dutyPct: "", otherTaxesPct: "", vatPct: "", vatRecoverablePct: 100,
  transitFees: "", portHandling: "", inlandTransport: "", storage: "", distribution: "", otherCosts: "",
  salePrice: "", targetMarkPct: 20, commissionPct: "", lossPct: "", fixedCosts: "",
  monthlyUnits: "", customerDays: "", supplierDays: "", stockDays: "",
  shifts: structuredClone(DEFAULT_SHIFTS), origins: {}, notes: "",
});
/** Libellé lisible de chaque valeur reprise de la base (section « Hypothèses et sources »). */
const ORIGIN_LABEL: Record<string, string> = {
  unitPrice: "f.unit_price", incoterm: "f.incoterm", fxRate: "t.exchange_rates", totalCbm: "sim.totalCbm", totalWeightKg: "sim.totalWeight",
  lclRate: "sim.lclRate", fcl20: "20GP", fcl40: "40GP", fcl40hq: "40HQ", freight: "sim.freightTotal", freightFxRate: "sim.freightCurrency",
  dutyPct: "f.duty_rate", otherTaxesPct: "f.other_taxes_rate", vatPct: "f.vat_rate",
};
const n = (v: number | "" | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function toInput(s: SimState): LandedInput {
  return {
    incoterm: s.incoterm, unitPrice: n(s.unitPrice), quantity: n(s.quantity), fxRate: n(s.fxRate), originCosts: n(s.originCosts),
    freight: n(s.freight), freightFxRate: s.freightCurrency === s.localCurrency ? 1 : n(s.freightFxRate), insuranceRate: n(s.insurancePct) / 100,
    dutyRate: n(s.dutyPct) / 100, otherTaxesRate: n(s.otherTaxesPct) / 100, vatRate: n(s.vatPct) / 100, vatRecoverableShare: n(s.vatRecoverablePct) / 100,
    transitFees: n(s.transitFees), portHandling: n(s.portHandling), inlandTransport: n(s.inlandTransport), storage: n(s.storage),
    distribution: n(s.distribution), otherCosts: n(s.otherCosts), lossRate: n(s.lossPct) / 100, commissionRate: n(s.commissionPct) / 100,
    salePrice: s.salePrice === "" ? null : n(s.salePrice), targetMarkRate: n(s.targetMarkPct) / 100, fixedCosts: n(s.fixedCosts),
    monthlyUnits: n(s.monthlyUnits), customerDays: n(s.customerDays), supplierDays: n(s.supplierDays), stockDays: n(s.stockDays),
  };
}

// ───── Petits composants de saisie (hors de la page : identité stable, le focus n'est jamais perdu) ─────
const SimCtx = createContext<{ s: SimState; set: (k: any, v: any) => void } | null>(null);
function F({ k, label, suffix, help }: { k: keyof SimState; label: string; suffix?: string; help?: string }) {
  const { s, set } = useContext(SimCtx)!;
  const o = s.origins[k as string];
  return (
    <div>
      <Label htmlFor={"s-" + k}>{label}</Label>
      <div className="relative">
        <Input id={"s-" + k} type="number" step="any" min={0} inputMode="decimal" className={cn("tabular", suffix && "pr-14")} value={s[k] as number | ""}
          onChange={(e) => set(k, e.target.value === "" ? "" : Number(e.target.value))} />
        {suffix && <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-semibold text-slate-400">{suffix}</span>}
      </div>
      {o && <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">{o.demo && <DemoBadge />}{o.status && o.status !== "devis" && <StatusBadge value={o.status} />}<span className="truncate">{o.text}</span></p>}
      {help && !o && <p className="mt-0.5 text-[10px] text-slate-400">{help}</p>}
    </div>
  );
}
function Cur({ k, label }: { k: "purchaseCurrency" | "localCurrency" | "freightCurrency"; label: string }) {
  const { s, set } = useContext(SimCtx)!;
  return <div><Label htmlFor={"s-" + k}>{label}</Label><Select id={"s-" + k} value={s[k]} onChange={(e) => set(k, e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select></div>;
}
function Section({ no, title, color, children, hint }: { no: number; title: string; color: string; children: ReactNode; hint?: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2.5">
        <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-black text-white", color)}>{no}</span>
        <h2 className="text-sm font-bold text-navy-900">{title}</h2>
        {hint && <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">{hint}</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 p-4 md:grid-cols-3">{children}</div>
    </Card>
  );
}
function Suggest({ label, value, row, onApply }: { label: string; value: ReactNode; row?: Row | null; onApply?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="col-span-2 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 text-xs md:col-span-3">
      <Wand2 className="size-3.5 shrink-0 text-brand-700" />
      <span className="font-semibold text-navy-900">{label}</span>
      <span className="tabular text-slate-700">{value}</span>
      {row?.verification_status && <StatusBadge value={row.verification_status} />}{row?.is_demo && <DemoBadge />}
      {onApply && <Button size="sm" variant="outline" className="ml-auto h-7" onClick={onApply}>{t("sim.apply")}</Button>}
    </div>
  );
}

export function SimulatorPage() {
  const { t, locale } = useI18n();
  const { org, role, store } = useSession();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const inv = useInvalidate();
  const { data, loading } = useTables(["products", "countries", "suppliers", "supplier_quotes", "customs_rules", "freight_quotes", "exchange_rates", "ports", "financial_scenarios"]);
  const base = org?.base_currency ?? "XOF";
  const [s, setS] = useState<SimState>(() => blank(base));
  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SimState>(k: K, v: SimState[K]) => setS((p) => ({ ...p, [k]: v, origins: k in p.origins ? { ...p.origins, [k]: { text: t("sim.manual") } } : p.origins }));
  const apply = (patch: Partial<SimState>, origin: Origin) => setS((p) => ({
    ...p, ...patch, origins: { ...p.origins, ...Object.fromEntries(Object.keys(patch).map((k) => [k, origin])) },
  }));

  // Chargement d'une simulation enregistrée, ou pré-remplissage depuis un devis
  const id = params.get("id"), quoteParam = params.get("quote");
  useEffect(() => {
    if (loading) return;
    if (id && id !== savedId) {
      const row = data.financial_scenarios.find((r) => r.id === id);
      if (row) { setS({ ...blank(base), ...row.inputs, name: row.name }); setSavedId(row.id); }
    } else if (quoteParam && s.quoteId !== quoteParam) {
      const q = data.supplier_quotes.find((r) => r.id === quoteParam);
      if (q) { setS((p) => ({ ...p, productId: q.product_id, quoteId: q.id })); pickQuote(q); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, quoteParam, loading]);

  const product = data.products.find((p) => p.id === s.productId);
  const country = data.countries.find((c) => c.id === s.countryId);
  const quotes = data.supplier_quotes.filter((q) => q.product_id === s.productId);
  const supName = (q: Row) => refLabel("suppliers", data.suppliers.find((x) => x.id === q.supplier_id), locale);
  const prov = (r: Row, what: string): Origin => ({ text: what, status: r.verification_status, demo: !!r.is_demo });

  function pickQuote(q: Row) {
    apply({ quoteId: q.id, incoterm: q.incoterm, unitPrice: Number(q.unit_price), purchaseCurrency: q.currency },
      { text: `${t("t.supplier_quotes")} — ${supName(q)} — ${fmtDate(q.quote_date, locale)}`, status: "devis", demo: !!q.is_demo });
  }

  // Données disponibles dans la base pour le contexte choisi (jamais appliquées sans action de l'utilisateur)
  const fx = s.purchaseCurrency !== s.localCurrency ? findRate(data.exchange_rates as any, s.purchaseCurrency, s.localCurrency) : null;
  const fxFreight = s.freightCurrency !== s.localCurrency ? findRate(data.exchange_rates as any, s.freightCurrency, s.localCurrency) : null;
  const rule = useMemo(() => {
    const rs = data.customs_rules.filter((r) => r.country_id === s.countryId && r.verification_status !== "rejete");
    return rs.find((r) => product?.hs_code_id && r.hs_code_id === product.hs_code_id) ?? rs.find((r) => !r.hs_code_id) ?? null;
  }, [data.customs_rules, s.countryId, product]);
  const freightQuotes = useMemo(() => {
    const portIds = data.ports.filter((p) => p.country_id === s.countryId).map((p) => p.id);
    const out: Record<string, Row> = {};
    for (const q of data.freight_quotes) {
      if (!portIds.includes(q.destination_port_id) || q.verification_status === "rejete") continue;
      if (!out[q.mode] || q.quote_date > out[q.mode].quote_date) out[q.mode] = q;
    }
    return out;
  }, [data.freight_quotes, data.ports, s.countryId]);

  const input = toInput(s);
  const res = computeLanded(input);
  const scen: Record<Scen, LandedResult> = {
    pessimiste: computeLanded(applyScenario(input, s.shifts.pessimiste)),
    central: res,
    optimiste: computeLanded(applyScenario(input, s.shifts.optimiste)),
  };
  const fr = compareFreight({
    cbm: n(s.totalCbm), weightKg: n(s.totalWeightKg), lclRatePerWM: s.lclRate === "" ? null : n(s.lclRate), lclMinimum: n(s.lclMin),
    fclRates: { "20GP": s.fcl20 === "" ? null : n(s.fcl20), "40GP": s.fcl40 === "" ? null : n(s.fcl40), "40HQ": s.fcl40hq === "" ? null : n(s.fcl40hq) },
    fillRate: n(s.fillPct) / 100,
  });
  const L = s.localCurrency;
  const money = (v: number | null | undefined, cur = L) => fmtMoney(v, cur, locale) ?? <NA />;
  const pct = (v: number | null | undefined) => fmtPct(v ?? NaN, locale) ?? <NA />;
  const ready = n(s.unitPrice) > 0 && n(s.quantity) > 0 && n(s.fxRate) > 0;
  const anyDemo = Object.values(s.origins).some((o) => o.demo);
  const writable = canWrite(role, "finance");

  const save = async () => {
    if (!s.name.trim()) { toast.error(t("sim.needName")); return; }
    setBusy(true);
    const pick = (r: LandedResult) => ({ unitCost: r.unitCost, price: r.price, landedTotal: r.landedTotal, grossMargin: r.grossMargin, markRate: r.markRate, markupRate: r.markupRate, netResult: r.netResult, breakEvenUnits: r.breakEvenUnits, bfr: r.bfr?.total ?? null });
    const values = {
      name: s.name.trim(), scenario_type: "cout_rendu", product_id: s.productId || null, country_id: s.countryId || null, is_demo: anyDemo,
      inputs: s, results: { ...pick(res), cif: res.cif, cashOutlay: res.cashOutlay, scenarios: { pessimiste: pick(scen.pessimiste), optimiste: pick(scen.optimiste) }, computedAt: new Date().toISOString() },
    };
    try {
      if (savedId) await store!.update("financial_scenarios", savedId, values);
      else { const [row] = await store!.insert("financial_scenarios", [values]); setSavedId(row.id); setParams({ id: row.id }, { replace: true }); }
      inv("financial_scenarios"); toast.success(t("common.saved"));
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const reset = () => { setS(blank(base)); setSavedId(null); nav("/simulateur", { replace: true }); };

  const lines: { k: string; v: number | null; cur?: string; kind?: "sub" | "total" | "key" | "cash" | "pos"; pctv?: boolean; units?: boolean }[] = [
    { k: "sim.goods", v: res.goodsLocal },
    ...(s.incoterm === "EXW" ? [{ k: "sim.origin", v: res.fobLocal - res.goodsLocal }] : []),
    ...(s.incoterm !== "CIF" ? [{ k: "sim.freight", v: res.freightLocal }, { k: "sim.insurance", v: res.insuranceLocal }] : []),
    { k: "sim.cif", v: res.cif, kind: "sub" },
    { k: "sim.duty", v: res.duty }, { k: "sim.otherTaxes", v: res.otherTaxes }, { k: "sim.vatNonRec", v: res.vatNonRecoverable },
    { k: "sim.localCosts", v: res.localCosts },
    { k: "sim.landedTotal", v: res.landedTotal, kind: "total" },
    { k: "sim.sellable", v: res.sellableUnits, units: true },
    { k: "sim.unitCost", v: res.unitCost, kind: "key" },
    { k: "sim.vatRec", v: res.vatRecoverable, kind: "cash" }, { k: "sim.cashOutlay", v: res.cashOutlay, kind: "cash" },
    { k: s.salePrice === "" ? "sim.priceSuggested" : "sim.price", v: res.price },
    { k: "sim.revenue", v: res.revenue }, { k: "sim.grossMargin", v: res.grossMargin, kind: "sub" },
    { k: "sim.markRate", v: res.markRate, pctv: true }, { k: "sim.markupRate", v: res.markupRate, pctv: true },
    { k: "sim.commissions", v: -res.commissions }, { k: "sim.fixed", v: -n(s.fixedCosts) },
    { k: "sim.netResult", v: res.netResult, kind: "pos" },
    { k: "sim.breakEvenUnits", v: res.breakEvenUnits, units: true }, { k: "sim.breakEvenRevenue", v: res.breakEvenRevenue },
  ];
  const doExport = () => exportXlsx(`satil-simulation-${today()}`, t("nav.simulator"), [t("sim.line"), t("o.pessimiste"), t("o.central"), t("o.optimiste"), t("f.currency")],
    [
      ...(["cif", "duty", "otherTaxes", "vatNonRecoverable", "localCosts", "landedTotal", "unitCost", "vatRecoverable", "cashOutlay", "price", "revenue", "grossMargin", "markRate", "markupRate", "netResult", "breakEvenUnits"] as const)
        .map((k) => [k, ...(["pessimiste", "central", "optimiste"] as Scen[]).map((x) => (scen[x][k] === null ? t("common.na") : Math.round((scen[x][k] as number) * 10000) / 10000)), L]),
      [], [t("sim.assumptions")],
      ...Object.entries(s).filter(([, v]) => typeof v !== "object").map(([k, v]) => [k, String(v)]),
      ...Object.entries(s.origins).filter(([k]) => k in ORIGIN_LABEL).map(([k, o]) => [t("sim.originOf") + " " + t(ORIGIN_LABEL[k], ORIGIN_LABEL[k]), o.text + (o.demo ? " (DEMO)" : "") + (o.status ? ` [${o.status}]` : "")]),
    ], [`SATIL — ${s.name || t("nav.simulator")} — ${today()}${anyDemo ? " — DEMO" : ""}`]).catch((e) => toast.error(e.message));

  return (
    <SimCtx.Provider value={{ s, set }}>
    <div>
      <PageHeader icon={<Calculator />} title={t("nav.simulator")} subtitle={t("sim.subtitle")}
        actions={<>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw />{t("sim.new")}</Button>
          <Button variant="outline" size="sm" onClick={doExport}><FileSpreadsheet />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />PDF</Button>
          {writable && <Button onClick={save} disabled={busy}><Save />{savedId ? t("sim.update") : t("common.save")}</Button>}
        </>} />
      {anyDemo && <Notice tone="violet" className="mb-4"><b>DEMO</b> — {t("sim.demoWarn")}</Notice>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className="no-print min-w-0 space-y-4">
          <Section no={1} title={t("sim.s.context")} color="bg-navy-800">
            <div className="col-span-2 md:col-span-3"><Label htmlFor="s-name" required>{t("sim.name")}</Label><Input id="s-name" value={s.name} onChange={(e) => set("name", e.target.value)} placeholder={t("sim.namePh")} /></div>
            <div><Label htmlFor="s-prod">{t("f.product_id")}</Label>
              <Select id="s-prod" value={s.productId} onChange={(e) => setS((p) => ({ ...p, productId: e.target.value, quoteId: "" }))}>
                <option value="">—</option>{data.products.map((p) => <option key={p.id} value={p.id}>{refLabel("products", p, locale)}</option>)}
              </Select></div>
            <div><Label htmlFor="s-country">{t("sim.destCountry")}</Label>
              <Select id="s-country" value={s.countryId} onChange={(e) => { const c = data.countries.find((x) => x.id === e.target.value); setS((p) => ({ ...p, countryId: e.target.value, localCurrency: c?.currency && CURRENCIES.includes(c.currency) ? c.currency : p.localCurrency })); }}>
                <option value="">—</option>{data.countries.map((c) => <option key={c.id} value={c.id}>{refLabel("countries", c, locale)}</option>)}
              </Select></div>
            <Cur k="localCurrency" label={t("sim.localCurrency")} />
            {s.productId && (quotes.length === 0 ? <Suggest label={t("t.supplier_quotes")} value={t("common.na")} /> : quotes.slice(0, 5).map((q) => (
              <Suggest key={q.id} label={supName(q)} row={q} value={`${q.incoterm} ${fmtMoney(q.unit_price, q.currency, locale)} · MOQ ${fmtNum(q.moq, locale) ?? "—"}`} onApply={() => pickQuote(q)} />
            )))}
          </Section>

          <Section no={2} title={t("sim.s.purchase")} color="bg-brand-600" hint={t("sim.h.purchase")}>
            <div><Label htmlFor="s-inc">{t("f.incoterm")}</Label><Select id="s-inc" value={s.incoterm} onChange={(e) => set("incoterm", e.target.value as Incoterm)}>{INCOTERMS.map((i) => <option key={i}>{i}</option>)}</Select></div>
            <F k="unitPrice" label={t("f.unit_price")} suffix={s.purchaseCurrency} />
            <Cur k="purchaseCurrency" label={t("sim.purchaseCurrency")} />
            <F k="quantity" label={t("sim.quantity")} suffix={product?.unit ?? ""} />
            <F k="fxRate" label={`1 ${s.purchaseCurrency} = ? ${L}`} suffix={L} />
            {s.incoterm === "EXW" && <F k="originCosts" label={t("sim.originCosts")} suffix={s.purchaseCurrency} />}
            {s.purchaseCurrency !== L && (fx
              ? <Suggest label={t("t.exchange_rates")} row={fx.row as any} value={`1 ${s.purchaseCurrency} = ${fmtNum(fx.rate, locale, 4)} ${L} (${fmtDate(fx.date, locale) ?? "—"}${fx.inverse ? ", " + t("sim.inverse") : ""})`}
                  onApply={() => apply({ fxRate: Math.round(fx.rate * 1e6) / 1e6 }, prov(fx.row as any, `${t("t.exchange_rates")} ${fmtDate(fx.date, locale) ?? ""}`))} />
              : <Suggest label={t("t.exchange_rates")} value={`${s.purchaseCurrency}/${L} : ${t("sim.noRate")}`} />)}
          </Section>

          <Section no={3} title={t("sim.s.freight")} color="bg-navy-600" hint={s.incoterm === "CIF" ? t("sim.h.cif") : undefined}>
            <F k="totalCbm" label={t("sim.totalCbm")} suffix="m³" /><F k="totalWeightKg" label={t("sim.totalWeight")} suffix="kg" />
            {product && (product.unit_cbm || product.unit_weight_kg) && n(s.quantity) > 0 &&
              <Suggest label={t("sim.fromProduct")} row={product} value={`${fmtNum(n(s.quantity) * Number(product.unit_cbm ?? 0), locale, 2)} m³ · ${fmtNum(n(s.quantity) * Number(product.unit_weight_kg ?? 0), locale, 0)} kg`}
                onApply={() => apply({ totalCbm: Math.round(n(s.quantity) * Number(product.unit_cbm ?? 0) * 1000) / 1000, totalWeightKg: Math.round(n(s.quantity) * Number(product.unit_weight_kg ?? 0) * 10) / 10 }, { text: t("sim.fromProduct"), demo: !!product.is_demo })} />}
            <Cur k="freightCurrency" label={t("sim.freightCurrency")} />
            <F k="lclRate" label={t("sim.lclRate")} suffix={s.freightCurrency} /><F k="lclMin" label={t("sim.lclMin")} suffix={s.freightCurrency} /><F k="fillPct" label={t("sim.fill")} suffix="%" />
            <F k="fcl20" label="20GP" suffix={s.freightCurrency} /><F k="fcl40" label="40GP" suffix={s.freightCurrency} /><F k="fcl40hq" label="40HQ" suffix={s.freightCurrency} />
            {s.countryId && (Object.keys(freightQuotes).length === 0 ? <Suggest label={t("t.freight_quotes")} value={t("common.na")} /> : (
              <Suggest label={t("t.freight_quotes")} row={Object.values(freightQuotes)[0]}
                value={Object.values(freightQuotes).map((q) => `${q.mode} ${fmtMoney(q.price, q.currency, locale)}`).join(" · ")}
                onApply={() => { const q = freightQuotes; const any = Object.values(q)[0];
                  apply({ ...(q.LCL && { lclRate: Number(q.LCL.price) }), ...(q["20GP"] && { fcl20: Number(q["20GP"].price) }), ...(q["40GP"] && { fcl40: Number(q["40GP"].price) }), ...(q["40HQ"] && { fcl40hq: Number(q["40HQ"].price) }), freightCurrency: any.currency ?? s.freightCurrency },
                    prov(any, `${t("t.freight_quotes")} ${any.origin_port} — ${fmtDate(any.quote_date, locale)}`)); }} />
            ))}
            {fr.options.length > 0 && (
              <div className="col-span-2 overflow-hidden rounded-lg border border-slate-200 md:col-span-3">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-navy-900"><tr>{["sim.mode", "sim.count", "sim.cost", "sim.costCbm", "sim.util", ""].map((h) => <th key={h} className={th}>{h && t(h)}</th>)}</tr></thead>
                  <tbody>{fr.options.map((o) => (
                    <tr key={o.mode} className={cn("border-b border-slate-100", fr.best?.mode === o.mode && "bg-gold-50")}>
                      <td className="px-3 py-1.5 font-bold text-navy-900">{o.mode === "LCL" ? t("sim.lcl") : o.mode} {fr.best?.mode === o.mode && <Badge tone="gold">{t("sim.cheapest")}</Badge>}</td>
                      <td className="tabular px-3 py-1.5">{o.mode === "LCL" ? "—" : o.count}</td>
                      <td className="tabular px-3 py-1.5 font-semibold">{fmtMoney(o.cost, s.freightCurrency, locale)}</td>
                      <td className="tabular px-3 py-1.5">{fmtMoney(o.costPerCbm, s.freightCurrency, locale) ?? "—"}</td>
                      <td className="tabular px-3 py-1.5">{o.utilization === null ? "—" : fmtPct(o.utilization, locale, 0)}</td>
                      <td className="px-2 py-1 text-right"><Button size="sm" variant="outline" className="h-7" onClick={() => apply({ freight: Math.round(o.cost * 100) / 100, freightMode: o.mode === "LCL" ? "LCL" : `${o.count} × ${o.mode}` }, { text: `${t("sim.fromCompare")} : ${o.mode === "LCL" ? t("sim.lcl") : `${o.count} × ${o.mode}`}`, demo: !!(s.origins.lclRate?.demo || s.origins.fcl40hq?.demo) })}>{t("sim.use")}</Button></td>
                    </tr>))}</tbody>
                </table>
                <p className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">{t("sim.containerNote")}</p>
              </div>
            )}
            <F k="freight" label={t("sim.freightTotal")} suffix={s.freightCurrency} help={s.freightMode || undefined} />
            {s.freightCurrency !== L && <F k="freightFxRate" label={`1 ${s.freightCurrency} = ? ${L}`} suffix={L} />}
            <F k="insurancePct" label={t("sim.insurance")} suffix="%" help={t("sim.h.insurance")} />
            {s.freightCurrency !== L && fxFreight && n(s.freightFxRate) === 0 &&
              <Suggest label={t("t.exchange_rates")} row={fxFreight.row as any} value={`1 ${s.freightCurrency} = ${fmtNum(fxFreight.rate, locale, 4)} ${L}`}
                onApply={() => apply({ freightFxRate: Math.round(fxFreight.rate * 1e6) / 1e6 }, prov(fxFreight.row as any, `${t("t.exchange_rates")} ${fmtDate(fxFreight.date, locale) ?? ""}`))} />}
          </Section>

          <Section no={4} title={t("sim.s.customs")} color="bg-gold-500" hint={t("sim.h.customs")}>
            <F k="dutyPct" label={t("f.duty_rate")} suffix="%" /><F k="otherTaxesPct" label={t("f.other_taxes_rate")} suffix="%" />
            <F k="vatPct" label={t("f.vat_rate")} suffix="%" /><F k="vatRecoverablePct" label={t("sim.vatRecShare")} suffix="%" help={t("sim.h.vat")} />
            {s.countryId && (rule
              ? <Suggest label={t("t.customs_rules")} row={rule} value={`${t("f.duty_rate")} ${fmtNum(rule.duty_rate, locale, 2) ?? "—"} % · ${t("f.other_taxes_rate")} ${fmtNum(rule.other_taxes_rate, locale, 2) ?? "—"} % · ${t("f.vat_rate")} ${fmtNum(rule.vat_rate, locale, 2) ?? "—"} %`}
                  onApply={() => apply({ dutyPct: Number(rule.duty_rate ?? 0), otherTaxesPct: Number(rule.other_taxes_rate ?? 0), vatPct: Number(rule.vat_rate ?? 0) }, prov(rule, `${t("t.customs_rules")} — ${rule.legal_reference ?? refLabel("countries", country, locale)}`))} />
              : <Suggest label={t("t.customs_rules")} value={t("sim.noRule")} />)}
          </Section>

          <Section no={5} title={t("sim.s.local")} color="bg-brand-700" hint={L}>
            <F k="transitFees" label={t("sim.transit")} suffix={L} /><F k="portHandling" label={t("sim.port")} suffix={L} /><F k="inlandTransport" label={t("sim.inland")} suffix={L} />
            <F k="storage" label={t("sim.storage")} suffix={L} /><F k="distribution" label={t("sim.distribution")} suffix={L} /><F k="otherCosts" label={t("sim.other")} suffix={L} />
          </Section>

          <Section no={6} title={t("sim.s.sale")} color="bg-navy-800">
            <F k="salePrice" label={t("sim.salePrice")} suffix={L} help={t("sim.h.salePrice")} /><F k="targetMarkPct" label={t("sim.targetMark")} suffix="%" />
            <F k="commissionPct" label={t("sim.commission")} suffix="%" /><F k="lossPct" label={t("sim.loss")} suffix="%" /><F k="fixedCosts" label={t("sim.fixedCosts")} suffix={L} />
          </Section>

          <Section no={7} title={t("sim.s.cash")} color="bg-brand-600" hint={t("sim.h.cash")}>
            <F k="monthlyUnits" label={t("sim.monthlyUnits")} /><F k="stockDays" label={t("sim.stockDays")} suffix={t("sim.days")} />
            <F k="customerDays" label={t("sim.customerDays")} suffix={t("sim.days")} /><F k="supplierDays" label={t("sim.supplierDays")} suffix={t("sim.days")} />
          </Section>

          <Card className="overflow-hidden">
            <CardHeader title={`8. ${t("sim.s.scenarios")}`} subtitle={t("sim.h.scenarios")} />
            <div className="scroll-thin overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead><tr><th className="p-1 text-left font-semibold text-slate-500">{t("sim.shift")}</th><th className="p-1 font-bold text-red-700">{t("o.pessimiste")}</th><th className="p-1 font-bold text-brand-700">{t("o.optimiste")}</th></tr></thead>
                <tbody>
                  {(["fxPct", "freightPct", "pricePct", "volumePct", "lossPts"] as (keyof ScenarioShift)[]).map((k) => (
                    <tr key={k}>
                      <td className="p-1 font-semibold text-slate-700">{t("sim.sh." + k)}</td>
                      {(["pessimiste", "optimiste"] as Scen[]).map((sc) => (
                        <td key={sc} className="p-1"><div className="relative"><Input type="number" step="any" className="h-8 pr-7 text-right tabular" aria-label={`${t("sim.sh." + k)} ${t("o." + sc)}`}
                          value={Math.round(s.shifts[sc][k] * 10000) / 100} onChange={(e) => setS((p) => ({ ...p, shifts: { ...p.shifts, [sc]: { ...p.shifts[sc], [k]: (Number(e.target.value) || 0) / 100 } } }))} /><span className="absolute right-2 top-2 text-slate-400">%</span></div></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ───── Résultats ───── */}
        <div className="print-area min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <p className="hidden text-sm font-bold print:block">SATIL — {s.name} — {today()}</p>
          {!ready && <Notice tone="navy">{t("sim.needInputs")}</Notice>}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gradient-to-br from-gold-300 to-gold-400 p-4 text-navy-950 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider">{t("sim.unitCost")}</p>
              <p className="tabular mt-1 text-xl font-black sm:text-2xl">{ready ? money(res.unitCost) : <NA />}</p>
            </div>
            <div className={cn("rounded-xl p-4 text-white shadow-card", !ready ? "bg-slate-400" : res.netResult >= 0 ? "bg-gradient-to-br from-brand-600 to-brand-800" : "bg-gradient-to-br from-red-600 to-red-800")}>
              <p className="text-[11px] font-bold uppercase tracking-wider">{t("sim.netResult")}</p>
              <p className="tabular mt-1 text-xl font-black sm:text-2xl">{ready ? money(res.netResult) : "—"}</p>
            </div>
            <div className="rounded-xl bg-navy-900 p-4 text-white shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gold-300">{t(s.salePrice === "" ? "sim.priceSuggested" : "sim.price")}</p>
              <p className="tabular mt-1 text-lg font-black">{ready ? money(res.price) : "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t("sim.markRate")} / {t("sim.markupRate")}</p>
              <p className="tabular mt-1 text-lg font-black text-navy-900">{ready ? <>{pct(res.markRate)} <span className="text-slate-300">/</span> {pct(res.markupRate)}</> : "—"}</p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader title={t("sim.breakdown")} subtitle={`${t("sim.in")} ${L}`} />
            <table className="w-full border-collapse text-sm">
              <tbody>
                {lines.map((l) => (
                  <tr key={l.k} className={cn("border-b border-slate-100",
                    l.kind === "sub" && "bg-navy-50 font-bold text-navy-900",
                    l.kind === "total" && "bg-navy-900 font-bold text-white",
                    l.kind === "key" && "bg-gold-100 font-extrabold text-navy-950",
                    l.kind === "cash" && "bg-sky-50 text-sky-900",
                    l.kind === "pos" && (res.netResult >= 0 ? "bg-brand-100 font-extrabold text-brand-900" : "bg-red-100 font-extrabold text-red-800"))}>
                    <td className="px-4 py-1.5">{t(l.k)}{l.kind === "cash" && <span className="ml-1.5 rounded bg-sky-200 px-1 text-[9px] font-bold uppercase text-sky-900">{t("sim.treasury")}</span>}</td>
                    <td className="tabular whitespace-nowrap px-4 py-1.5 text-right">{!ready ? "—" : l.pctv ? pct(l.v) : l.units ? (fmtNum(l.v, locale, 0) ?? <NA short />) : money(l.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[11px] leading-relaxed text-slate-500">{t("sim.vatNote")}</p>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t("sim.s.scenarios")} />
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="bg-navy-900"><tr><th className={th} /><th className={cn(th, "text-right")}>{t("o.pessimiste")}</th><th className={cn(th, "text-right text-gold-300")}>{t("o.central")}</th><th className={cn(th, "text-right")}>{t("o.optimiste")}</th></tr></thead>
                <tbody>
                  {([["sim.unitCost", "unitCost"], ["sim.price", "price"], ["sim.grossMargin", "grossMargin"], ["sim.markRate", "markRate"], ["sim.netResult", "netResult"], ["sim.breakEvenUnits", "breakEvenUnits"]] as [string, keyof LandedResult][]).map(([label, k]) => (
                    <tr key={k} className={cn("border-b border-slate-100", k === "netResult" && "font-extrabold")}>
                      <td className="px-3 py-1.5 font-semibold text-slate-700">{t(label)}</td>
                      {(["pessimiste", "central", "optimiste"] as Scen[]).map((sc) => {
                        const v = scen[sc][k] as number | null;
                        return <td key={sc} className={cn("tabular whitespace-nowrap px-3 py-1.5 text-right", sc === "central" && "bg-gold-50", k === "netResult" && ready && (n(v) >= 0 ? "text-brand-700" : "text-red-600"))}>
                          {!ready ? "—" : k === "markRate" ? pct(v) : k === "breakEvenUnits" ? (fmtNum(v, locale, 0) ?? <NA short />) : money(v)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t("sim.bfr")} subtitle={t("sim.bfrHelp")} />
            {!res.bfr || !ready ? <p className="p-4 text-xs text-slate-500">{t("sim.bfrNeed")}</p> : (
              <table className="w-full text-sm"><tbody>
                <tr className="border-b border-slate-100"><td className="px-4 py-1.5">{t("sim.bfrStock")}</td><td className="tabular px-4 py-1.5 text-right">{money(res.bfr.stock)}</td></tr>
                <tr className="border-b border-slate-100"><td className="px-4 py-1.5">+ {t("sim.bfrRecv")}</td><td className="tabular px-4 py-1.5 text-right">{money(res.bfr.receivables)}</td></tr>
                <tr className="border-b border-slate-100"><td className="px-4 py-1.5">− {t("sim.bfrPay")}</td><td className="tabular px-4 py-1.5 text-right">{money(res.bfr.payables)}</td></tr>
                <tr className="bg-sky-100 font-extrabold text-sky-950"><td className="px-4 py-2">= {t("sim.bfr")}</td><td className="tabular px-4 py-2 text-right">{money(res.bfr.total)}</td></tr>
              </tbody></table>
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title={t("sim.assumptions")} subtitle={t("sim.assumptionsHelp")} />
            <ul className="divide-y divide-slate-100 text-xs">
              {!Object.keys(s.origins).some((k) => k in ORIGIN_LABEL) && <li className="px-4 py-2.5 text-slate-500">{t("sim.allManual")}</li>}
              {Object.entries(s.origins).filter(([k]) => k in ORIGIN_LABEL).map(([k, o]) => (
                <li key={k} className="flex flex-wrap items-center gap-1.5 px-4 py-1.5"><span className="font-semibold text-navy-900">{t(ORIGIN_LABEL[k], ORIGIN_LABEL[k])}</span><span className="text-slate-600">{o.text}</span>{o.status && o.status !== "devis" && <StatusBadge value={o.status} />}{o.demo && <DemoBadge />}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
    </SimCtx.Provider>
  );
}
