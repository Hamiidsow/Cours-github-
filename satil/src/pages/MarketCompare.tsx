import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Printer, Scale, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useI18n } from "@/lib/i18n";
import { useTables } from "@/lib/data";
import { exportXlsx } from "@/lib/io";
import { fmtNum, fmtPct } from "@/lib/format";
import { scoreCountries, type Criterion } from "@/lib/scoring";
import { INDICATORS, refLabel } from "@/resources";
import type { Row } from "@/lib/store";
import { cn, today } from "@/lib/utils";
import { Badge, Button, Card, CardHeader, DemoBadge, Empty, Input, NA, Notice, PageHeader, Select, StatusBadge, td, th } from "@/components/ui";

interface Saved { countries: string[] | null; criteria: Record<string, { on: boolean; weight: number; direction: "max" | "min" }>; hyp: boolean; demo: boolean }
const KEY = "satil.compare.v1";

export function MarketComparePage() {
  const { t, locale } = useI18n();
  const { data, loading } = useTables(["countries", "market_indicators", "data_sources"]);
  const countries = useMemo(() => [...data.countries].sort((a, b) => (a.phase ?? 9) - (b.phase ?? 9)), [data.countries]);
  const [cfg, setCfg] = useState<Saved>(() => {
    try { return { countries: null, criteria: {}, hyp: true, demo: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
    catch { return { countries: null, criteria: {}, hyp: true, demo: true }; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(cfg)); }, [cfg]);

  const selected = useMemo(() => {
    const ids = cfg.countries ?? countries.filter((c) => c.phase === 1).map((c) => c.id);
    return countries.filter((c) => ids.includes(c.id));
  }, [cfg.countries, countries]);

  // Dernière valeur retenue par pays et par indicateur. Les données rejetées sont toujours exclues.
  const latest = useMemo(() => {
    const m: Record<string, Record<string, Row>> = {};
    const stamp = (r: Row) => `${r.reference_period ?? ""}|${r.collected_at ?? ""}|${r.created_at ?? ""}`;
    for (const r of data.market_indicators) {
      if (r.value === null || r.value === undefined) continue;
      if (r.city_id || r.product_id || r.category_id) continue; // seules les valeurs nationales sont comparées
      if (r.verification_status === "rejete") continue;
      if (!cfg.hyp && r.verification_status === "hypothese") continue;
      if (!cfg.demo && r.is_demo) continue;
      const cur = m[r.country_id]?.[r.indicator_code];
      if (!cur || stamp(r) > stamp(cur)) (m[r.country_id] ??= {})[r.indicator_code] = r;
    }
    return m;
  }, [data.market_indicators, cfg.hyp, cfg.demo]);

  const codes = useMemo(() => {
    const present = new Set(data.market_indicators.map((r) => r.indicator_code));
    return INDICATORS.filter((i) => present.has(i.code));
  }, [data.market_indicators]);
  const crit = (code: string) => cfg.criteria[code] ?? { on: true, weight: 1, direction: INDICATORS.find((i) => i.code === code)!.direction };
  const setCrit = (code: string, patch: Partial<Saved["criteria"][string]>) =>
    setCfg((p) => ({ ...p, criteria: { ...p.criteria, [code]: { ...crit(code), ...patch } } }));
  const criteria: Criterion[] = codes.filter((c) => crit(c.code).on).map((c) => ({ code: c.code, weight: crit(c.code).weight, direction: crit(c.code).direction }));

  const values = useMemo(() => Object.fromEntries(selected.map((c) => [c.id, Object.fromEntries(Object.entries(latest[c.id] ?? {}).map(([k, r]) => [k, Number(r.value)]))])), [selected, latest]);
  const scores = useMemo(() => scoreCountries(selected.map((c) => c.id), criteria, values), [selected, criteria, values]);
  const ranked = [...scores].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const name = (id: string) => refLabel("countries", countries.find((c) => c.id === id), locale);
  const totalW = criteria.reduce((s, c) => s + c.weight, 0);
  const usesDemo = selected.some((c) => Object.values(latest[c.id] ?? {}).some((r) => r.is_demo));
  const usesHyp = selected.some((c) => Object.values(latest[c.id] ?? {}).some((r) => r.verification_status !== "verifie"));

  const toggleCountry = (id: string) => setCfg((p) => {
    const cur = p.countries ?? selected.map((c) => c.id);
    return { ...p, countries: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
  });
  const doExport = () => exportXlsx(`satil-comparaison-pays-${today()}`, t("nav.compare"),
    [t("cmp.criterion"), t("cmp.weight"), t("cmp.direction"), ...selected.flatMap((c) => [name(c.id), name(c.id) + " — " + t("f.verification_status")])],
    [
      ...criteria.map((c) => [t("ind." + c.code), c.weight, t("cmp." + c.direction), ...selected.flatMap((s) => {
        const r = latest[s.id]?.[c.code];
        return [r ? Number(r.value) : t("common.na"), r ? t("o." + r.verification_status) + (r.is_demo ? " (DEMO)" : "") : ""];
      })]),
      [t("cmp.score"), "", "", ...selected.flatMap((s) => { const x = scores.find((y) => y.countryId === s.id)!; return [x.score === null ? t("common.na") : Math.round(x.score * 10) / 10, ""]; })],
      [t("cmp.coverage"), "", "", ...selected.flatMap((s) => [Math.round(scores.find((y) => y.countryId === s.id)!.coverage * 100) + " %", ""])],
    ], [t("cmp.method")]).catch(() => undefined);

  return (
    <div>
      <PageHeader icon={<Scale />} title={t("nav.compare")} subtitle={t("cmp.subtitle")}
        actions={<><Button variant="outline" size="sm" onClick={doExport}><FileSpreadsheet />Excel</Button><Button variant="outline" size="sm" onClick={() => window.print()}><Printer />PDF</Button></>} />

      <Card className="no-print mb-5 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t("cmp.countries")}</p>
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => {
            const on = selected.some((s) => s.id === c.id);
            return (
              <button key={c.id} onClick={() => toggleCountry(c.id)} aria-pressed={on}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-brand-400")}>
                {refLabel("countries", c, locale)} · P{c.phase ?? "?"}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--color-gold-500)]" checked={cfg.hyp} onChange={(e) => setCfg({ ...cfg, hyp: e.target.checked })} />{t("cmp.includeHyp")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-violet-600" checked={cfg.demo} onChange={(e) => setCfg({ ...cfg, demo: e.target.checked })} />{t("demo.include")}</label>
        </div>
      </Card>

      {loading ? <Empty title={t("common.loading")} /> : codes.length === 0 ? (
        <Card><Empty title={t("cmp.noData")} hint={t("cmp.noDataHint")} action={<Link to="/indicateurs"><Button size="sm">{t("t.market_indicators")}</Button></Link>} /></Card>
      ) : selected.length < 2 ? <Card><Empty title={t("cmp.need2")} /></Card> : (
        <>
          {usesDemo && <Notice tone="violet" className="mb-3"><b>DEMO</b> — {t("cmp.demoWarn")}</Notice>}
          {!usesDemo && usesHyp && <Notice className="mb-3">{t("cmp.hypWarn")}</Notice>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((s) => {
              const first = s.rank === 1;
              return (
                <Card key={s.countryId} className={cn("keyline overflow-hidden p-4 pl-5", first && "bg-gradient-to-br from-gold-50 to-white ring-2 ring-gold-300")}
                  style={{ ["--kl" as any]: first ? "var(--color-gold-400)" : "var(--color-navy-600)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.rank ? `#${s.rank}` : "—"}</p>
                      <p className="text-lg font-extrabold text-navy-900">{name(s.countryId)}</p>
                    </div>
                    {first && <Trophy className="size-6 text-gold-500" />}
                  </div>
                  <p className="tabular mt-1 text-3xl font-black text-navy-900">{s.score === null ? <NA /> : <>{fmtNum(s.score, locale, 1)}<span className="text-base font-bold text-slate-400"> / 100</span></>}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-200"><div className={cn("h-1.5 rounded-full", s.coverage >= 0.6 ? "bg-brand-500" : "bg-red-500")} style={{ width: `${s.coverage * 100}%` }} /></div>
                    <span className="font-semibold text-slate-600">{t("cmp.coverage")} {fmtPct(s.coverage, locale, 0)}</span>
                  </div>
                  {s.coverage < 0.6 && <p className="mt-1.5 text-[11px] font-semibold text-red-600">{t("cmp.lowCoverage")}</p>}
                </Card>
              );
            })}
          </div>

          <Card className="mt-5">
            <CardHeader title={t("cmp.chart")} />
            <div className="h-56 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ranked.filter((s) => s.score !== null).map((s) => ({ name: name(s.countryId), score: Math.round((s.score as number) * 10) / 10, first: s.rank === 1 }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} fontSize={11} /><Tooltip />
                  <Bar dataKey="score" name={t("cmp.score")} radius={[6, 6, 0, 0]}>
                    {ranked.filter((s) => s.score !== null).map((s) => <Cell key={s.countryId} fill={s.rank === 1 ? "#f8b01f" : "#284878"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="print-area mt-5 overflow-hidden">
            <CardHeader title={t("cmp.detail")} subtitle={t("cmp.detailHelp")} />
            <div className="print-scroll scroll-thin overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-navy-900">
                  <tr>
                    <th className={th}>{t("cmp.criterion")}</th><th className={th}>{t("cmp.weight")}</th><th className={th}>{t("cmp.direction")}</th>
                    {selected.map((c) => <th key={c.id} className={th}>{name(c.id)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => {
                    const cr = crit(c.code);
                    return (
                      <tr key={c.code} className={cn("border-b border-slate-100", !cr.on && "opacity-45")}>
                        <td className={td}>
                          <label className="flex items-center gap-2 font-semibold text-navy-900">
                            <input type="checkbox" className="no-print size-4 accent-[var(--color-brand-600)]" checked={cr.on} onChange={(e) => setCrit(c.code, { on: e.target.checked })} />
                            {t("ind." + c.code)}
                          </label>
                          <span className="text-[11px] text-slate-400">{totalW > 0 && cr.on ? fmtPct(cr.weight / totalW, locale, 0) + " " + t("cmp.ofScore") : ""}</span>
                        </td>
                        <td className={td}><Input type="number" min={0} max={10} step={1} className="h-8 w-16" value={cr.weight} onChange={(e) => setCrit(c.code, { weight: Math.max(0, Number(e.target.value) || 0) })} aria-label={t("cmp.weight")} /></td>
                        <td className={td}>
                          <Select className="h-8 w-auto py-0 text-xs" value={cr.direction} onChange={(e) => setCrit(c.code, { direction: e.target.value as "max" | "min" })} aria-label={t("cmp.direction")}>
                            <option value="max">{t("cmp.max")}</option><option value="min">{t("cmp.min")}</option>
                          </Select>
                        </td>
                        {selected.map((s) => {
                          const r = latest[s.id]?.[c.code];
                          const cellScore = scores.find((x) => x.countryId === s.id)?.cells[c.code];
                          if (!r) return <td key={s.id} className={cn(td, "bg-red-50/40")}><NA /></td>;
                          return (
                            <td key={s.id} className={td}>
                              <p className="tabular font-bold text-navy-900">{fmtNum(r.value, locale, 2)} <span className="text-[11px] font-normal text-slate-500">{r.unit ?? c.unit}</span></p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1"><StatusBadge value={r.verification_status} />{r.is_demo && <DemoBadge />}</div>
                              {cellScore?.normalized !== null && cellScore?.normalized !== undefined && cr.on && (
                                <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-200" title={t("cmp.normalized") + " " + fmtNum(cellScore.normalized, locale, 2)}>
                                  <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${cellScore.normalized * 100}%` }} />
                                </div>
                              )}
                              <p className="mt-0.5 text-[10px] text-slate-400">{[r.reference_period, data.data_sources.find((d) => d.id === r.source_id)?.name].filter(Boolean).join(" · ") || t("cmp.noSource")}</p>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="bg-navy-50">
                    <td className={cn(td, "font-extrabold text-navy-900")} colSpan={3}>{t("cmp.score")}</td>
                    {selected.map((s) => { const x = scores.find((y) => y.countryId === s.id)!; return <td key={s.id} className={cn(td, "tabular text-base font-black text-navy-900")}>{x.score === null ? <NA /> : fmtNum(x.score, locale, 1)}{x.rank === 1 && <Badge tone="gold" className="ml-2">#1</Badge>}</td>; })}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          <Notice tone="navy" className="mt-4"><b>{t("cmp.methodTitle")}</b> {t("cmp.method")}</Notice>
        </>
      )}
    </div>
  );
}
