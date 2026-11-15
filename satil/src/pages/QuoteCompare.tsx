import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useTables } from "@/lib/data";
import { findRate } from "@/lib/finance";
import { fmtDate, fmtMoney, fmtNum } from "@/lib/format";
import { refLabel } from "@/resources";
import { cn, today } from "@/lib/utils";
import { Badge, Button, Card, DemoBadge, Empty, Label, NA, Notice, PageHeader, Select, StatusBadge, td, th } from "@/components/ui";

export function QuoteComparePage() {
  const { t, locale } = useI18n();
  const { org } = useSession();
  const { data, loading } = useTables(["products", "suppliers", "supplier_quotes", "exchange_rates"]);
  const base = org?.base_currency ?? "XOF";
  const withQuotes = useMemo(() => data.products.filter((p) => data.supplier_quotes.some((q) => q.product_id === p.id)), [data]);
  const [pid, setPid] = useState("");
  const productId = pid || withQuotes[0]?.id || "";
  const product = data.products.find((p) => p.id === productId);

  const rows = useMemo(() => data.supplier_quotes.filter((q) => q.product_id === productId).map((q) => {
    const rate = findRate(data.exchange_rates as any, q.currency, base);
    return { q, sup: data.suppliers.find((s) => s.id === q.supplier_id), rate, converted: rate ? Number(q.unit_price) * rate.rate : null,
      expired: !!q.valid_until && q.valid_until < today() };
  }).sort((a, b) => a.q.incoterm.localeCompare(b.q.incoterm) || (a.converted ?? Infinity) - (b.converted ?? Infinity)), [data, productId, base]);
  // Le meilleur prix n'a de sens qu'à incoterm identique.
  const best: Record<string, number> = {};
  rows.forEach((r) => { if (r.converted !== null && !r.expired && r.q.status !== "rejete") best[r.q.incoterm] = Math.min(best[r.q.incoterm] ?? Infinity, r.converted); });

  return (
    <div>
      <PageHeader icon={<TrendingUp />} title={t("nav.quoteCompare")} subtitle={t("qc.subtitle")} />
      {loading ? <Empty title={t("common.loading")} /> : withQuotes.length === 0 ? (
        <Card><Empty title={t("qc.none")} hint={t("qc.noneHint")} action={<Link to="/devis-fournisseurs"><Button size="sm">{t("t.supplier_quotes")}</Button></Link>} /></Card>
      ) : (
        <>
          <Card className="no-print mb-4 p-4">
            <Label htmlFor="qc-p">{t("f.product_id")}</Label>
            <Select id="qc-p" className="max-w-md" value={productId} onChange={(e) => setPid(e.target.value)}>
              {withQuotes.map((p) => <option key={p.id} value={p.id}>{refLabel("products", p, locale)} ({data.supplier_quotes.filter((q) => q.product_id === p.id).length})</option>)}
            </Select>
          </Card>
          {rows.length < 3 && <Notice className="mb-3">{t("qc.few")} ({rows.length})</Notice>}
          {rows.length > 5 && <Notice tone="navy" className="mb-3">{t("qc.many")}</Notice>}
          {rows.some((r) => !r.rate) && <Notice tone="red" className="mb-3">{t("qc.noRate")} <Link className="font-bold underline" to="/taux">{t("t.exchange_rates")}</Link></Notice>}
          <Card className="print-area overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3"><p className="text-sm font-bold text-navy-900">{refLabel("products", product, locale)} {product?.is_demo && <DemoBadge />}</p></div>
            <div className="print-scroll scroll-thin overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-navy-900"><tr>
                  {["f.supplier_id", "f.incoterm", "f.unit_price", "qc.converted", "f.moq", "f.lead_time_days", "f.valid_until", "f.status", ""].map((h) => <th key={h} className={th}>{h && (h === "qc.converted" ? `${t(h)} (${base})` : t(h))}</th>)}
                </tr></thead>
                <tbody>
                  {rows.map(({ q, sup, rate, converted, expired }) => {
                    const isBest = converted !== null && converted === best[q.incoterm] && !expired && q.status !== "rejete";
                    return (
                      <tr key={q.id} className={cn("border-b border-slate-100", isBest && "bg-gold-50", expired && "opacity-60")}>
                        <td className={cn(td, "font-semibold text-navy-900")}>
                          {refLabel("suppliers", sup, locale) || <NA />} {q.is_demo && <DemoBadge />}
                          <p className="text-[11px] font-normal text-slate-500">{[sup?.city, sup?.province].filter(Boolean).join(", ")} {sup && <StatusBadge value={sup.verification_status} />}</p>
                        </td>
                        <td className={td}><Badge tone="navy">{q.incoterm}</Badge> <span className="text-[11px] text-slate-500">{q.incoterm_place}</span></td>
                        <td className={cn(td, "tabular whitespace-nowrap")}>{fmtMoney(q.unit_price, q.currency, locale)}</td>
                        <td className={cn(td, "tabular whitespace-nowrap font-bold text-navy-900")}>
                          {converted === null ? <NA /> : fmtMoney(converted, base, locale)} {isBest && <Badge tone="gold">{t("qc.best")} {q.incoterm}</Badge>}
                          {rate && rate.date && <p className="text-[10px] font-normal text-slate-400">{t("qc.rateOf")} {fmtDate(rate.date, locale)} {rate.row.is_demo && "· DEMO"}</p>}
                        </td>
                        <td className={cn(td, "tabular")}>{fmtNum(q.moq, locale) ?? <NA short />}</td>
                        <td className={cn(td, "tabular")}>{q.lead_time_days ?? <NA short />}</td>
                        <td className={td}>{fmtDate(q.valid_until, locale) ?? <NA short />} {expired && <Badge tone="red">{t("o.expire")}</Badge>}</td>
                        <td className={td}><StatusBadge value={q.status} /></td>
                        <td className={cn(td, "no-print text-right")}><Link to={`/simulateur?quote=${q.id}`}><Button size="sm" variant="outline"><Calculator />{t("qc.simulate")}</Button></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Notice tone="navy" className="mt-4">{t("qc.note")}</Notice>
        </>
      )}
    </div>
  );
}
