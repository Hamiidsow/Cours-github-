import { Link } from "react-router-dom";
import { Calculator, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useInvalidate, useTables } from "@/lib/data";
import { canDelete } from "@/lib/permissions";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { refLabel } from "@/resources";
import { cn } from "@/lib/utils";
import { Button, Card, DemoBadge, Empty, NA, PageHeader, td, th } from "@/components/ui";

export function SimulationsPage() {
  const { t, locale } = useI18n();
  const { store, role } = useSession();
  const inv = useInvalidate();
  const { data, loading } = useTables(["financial_scenarios", "products", "countries"]);
  const del = async (id: string) => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try { await store!.remove("financial_scenarios", id); inv("financial_scenarios"); toast.success(t("common.deleted")); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div>
      <PageHeader icon={<Save />} title={t("nav.simulations")} subtitle={t("sims.subtitle")}
        actions={<Link to="/simulateur"><Button><Calculator />{t("sim.new")}</Button></Link>} />
      <Card className="print-area overflow-hidden">
        {loading ? <Empty title={t("common.loading")} /> : data.financial_scenarios.length === 0 ? <Empty title={t("dash.noSim")} /> : (
          <div className="print-scroll scroll-thin overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-navy-900"><tr>{["f.name", "f.product_id", "f.country_id", "sim.unitCost", "sim.price", "sim.markRate", "sim.netResult", "sims.pessimistic", "sims.updated", ""].map((h) => <th key={h} className={th}>{h && t(h)}</th>)}</tr></thead>
              <tbody>
                {data.financial_scenarios.map((s) => {
                  const r = s.results ?? {}; const cur = s.inputs?.localCurrency;
                  const pes = r.scenarios?.pessimiste?.netResult;
                  return (
                    <tr key={s.id} className={cn("border-b border-slate-100 hover:bg-brand-50/50", s.is_demo && "bg-violet-50/40")}>
                      <td className={cn(td, "font-semibold")}><Link to={`/simulateur?id=${s.id}`} className="text-navy-900 underline decoration-brand-400 underline-offset-2">{s.name}</Link> {s.is_demo && <DemoBadge />}</td>
                      <td className={td}>{refLabel("products", data.products.find((p) => p.id === s.product_id), locale) || <NA short />}</td>
                      <td className={td}>{refLabel("countries", data.countries.find((c) => c.id === s.country_id), locale) || <NA short />}</td>
                      <td className={cn(td, "tabular whitespace-nowrap bg-gold-50 font-bold text-navy-900")}>{fmtMoney(r.unitCost, cur, locale) ?? <NA />}</td>
                      <td className={cn(td, "tabular whitespace-nowrap")}>{fmtMoney(r.price, cur, locale) ?? <NA />}</td>
                      <td className={cn(td, "tabular")}>{fmtPct(r.markRate, locale) ?? <NA />}</td>
                      <td className={cn(td, "tabular whitespace-nowrap font-bold", (r.netResult ?? 0) >= 0 ? "text-brand-700" : "text-red-600")}>{fmtMoney(r.netResult, cur, locale) ?? <NA />}</td>
                      <td className={cn(td, "tabular whitespace-nowrap", (pes ?? 0) >= 0 ? "text-brand-700" : "text-red-600")}>{fmtMoney(pes, cur, locale) ?? <NA />}</td>
                      <td className={cn(td, "whitespace-nowrap text-xs")}>{fmtDate(s.updated_at, locale)}</td>
                      <td className={cn(td, "no-print text-right")}>{canDelete(role) && <Button variant="ghost" size="icon" className="text-red-600" onClick={() => del(s.id)} aria-label={t("common.delete")}><Trash2 /></Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
