import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { canSeeAudit } from "@/lib/permissions";
import type { AuditRow } from "@/lib/store";
import { RESOURCES } from "@/resources";
import { AuditEntry } from "@/components/ResourcePage";
import { Badge, Card, Empty, Notice, PageHeader, Select } from "@/components/ui";

export function AuditLogPage() {
  const { t, locale } = useI18n();
  const { store, role } = useSession();
  const [table, setTable] = useState("");
  const [items, setItems] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setItems(null);
    store?.audit({ table: table || undefined, limit: 300 }).then(setItems).catch((e) => setError(e.message));
  }, [store, table]);
  if (!canSeeAudit(role)) return <Notice tone="red">{t("audit.forbidden")}</Notice>;
  const tables = [...Object.keys(RESOURCES), "financial_scenarios"];
  const label = (a: AuditRow) => { const d = a.new_data ?? a.old_data ?? {}; return d.name ?? d.name_fr ?? d.name_en ?? d.code ?? d.indicator_code ?? d.reference ?? ""; };
  return (
    <div>
      <PageHeader icon={<ScrollText />} title={t("nav.audit")} subtitle={t("audit.subtitle")}
        actions={<Select className="w-auto" value={table} onChange={(e) => setTable(e.target.value)} aria-label={t("audit.table")}>
          <option value="">{t("audit.allTables")}</option>{tables.map((x) => <option key={x} value={x}>{t("t." + x, x)}</option>)}
        </Select>} />
      <Card className="p-3 sm:p-4">
        {error ? <Notice tone="red">{error}</Notice> : !items ? <Empty title={t("common.loading")} /> : items.length === 0 ? <Empty title={t("audit.none")} /> : (
          <ol className="space-y-2">
            {items.map((a) => (
              <li key={a.id}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs"><Badge tone="navy">{t("t." + a.table_name, a.table_name)}</Badge><span className="font-semibold text-navy-900">{String(label(a)).slice(0, 80)}</span></div>
                <AuditEntry a={a} locale={locale} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
