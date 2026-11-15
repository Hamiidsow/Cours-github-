import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, FileSpreadsheet, History, Pencil, Plus, Printer, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useInvalidate, useSave, useTable, useTables } from "@/lib/data";
import { canDelete, canSeeAudit, canWrite } from "@/lib/permissions";
import { dedupeKey, displayValue, exportCsv, exportXlsx, prepareImport, readFile, toMatrix, type ImportReport } from "@/lib/io";
import { fmtDate, fmtMoney, fmtNum } from "@/lib/format";
import type { AuditRow, Row } from "@/lib/store";
import { refLabel, type Field, type Resource } from "@/resources";
import { cn, today } from "@/lib/utils";
import { Badge, Button, Card, DemoBadge, Dialog, Empty, Input, Label, NA, Notice, PageHeader, Select, StatusBadge, Textarea, td, th } from "./ui";

const STATUS_KEYS = new Set(["verification_status", "confidence", "status", "pipeline_stage", "purchase_intent"]);

export function ResourcePage({ resource: res, icon, intro, rowAction }: {
  resource: Resource; icon?: ReactNode; intro?: ReactNode; rowAction?: (row: Row) => ReactNode;
}) {
  const { t, locale } = useI18n();
  const { role, org } = useSession();
  const refTables = useMemo(() => [...new Set(res.fields.filter((f) => f.type === "ref").map((f) => f.ref!))], [res]);
  const rowsQ = useTable(res.table);
  const refs = useTables(refTables).data;
  const rows = rowsQ.data ?? [];
  const writable = canWrite(role, res.group);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [history, setHistory] = useState<Row | null>(null);
  const hasCountry = res.fields.some((f) => f.key === "country_id");
  const listFields = res.fields.filter((f) => f.list);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (country && r.country_id !== country) return false;
      if (!q) return true;
      return res.fields.some((f) => String(displayValue(f, r, refs, t, locale)).toLowerCase().includes(q));
    });
  }, [rows, search, country, refs, res, t, locale]);

  const title = t("t." + res.table);
  const fileName = `satil-${res.path}-${today()}`;
  const doExport = async (kind: "csv" | "xlsx") => {
    const { header, body } = toMatrix(res, filtered, refs, t, locale);
    try {
      if (kind === "csv") await exportCsv(fileName, header, body);
      else await exportXlsx(fileName, title, header, body, [`SATIL — ${org?.name ?? ""} — ${title} — ${today()}`]);
    } catch (e) { toast.error((e as Error).message); }
  };

  const cell = (f: Field, r: Row) => {
    const v = r[f.key];
    if (v === null || v === undefined || v === "") return <NA short />;
    if (f.type === "sel" && STATUS_KEYS.has(f.key)) return <StatusBadge value={v} />;
    if (f.money) return <span className="tabular font-semibold text-navy-900">{fmtMoney(v, r[f.money], locale)}</span>;
    if (f.type === "num") return <span className="tabular">{fmtNum(v, locale, 4)}</span>;
    if (f.type === "date") return fmtDate(v, locale);
    if (f.type === "url") return <a className="text-brand-700 underline" href={v} target="_blank" rel="noreferrer noopener">{String(v).replace(/^https?:\/\//, "").slice(0, 32)}</a>;
    const s = String(displayValue(f, r, refs, t, locale));
    return s.length > 60 ? s.slice(0, 60) + "…" : s || <NA short />;
  };

  return (
    <div>
      <PageHeader
        icon={icon} title={title} subtitle={intro ?? t("d." + res.table, "")}
        actions={<>
          <Button variant="outline" size="sm" onClick={() => doExport("csv")}><Download />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => doExport("xlsx")}><FileSpreadsheet />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />PDF</Button>
          {writable && <Button variant="outline" size="sm" onClick={() => setImporting(true)}><Upload />{t("common.import")}</Button>}
          {writable && <Button onClick={() => setEditing("new")}><Plus />{t("common.add")}</Button>}
        </>}
      />
      <Card className="print-area overflow-hidden">
        <div className="no-print flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <Input className="pl-9" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {hasCountry && (
            <Select className="w-auto" value={country} onChange={(e) => setCountry(e.target.value)} aria-label={t("f.country_id")}>
              <option value="">{t("common.allCountries")}</option>
              {(refs.countries ?? []).map((c) => <option key={c.id} value={c.id}>{refLabel("countries", c, locale)}</option>)}
            </Select>
          )}
          <span className="text-xs font-semibold text-slate-500">{filtered.length} / {rows.length}</span>
        </div>
        <p className="hidden px-3 pt-3 text-xs text-slate-500 print:block">SATIL — {org?.name} — {title} — {today()}</p>

        {rowsQ.isLoading ? <Empty title={t("common.loading")} /> : rowsQ.error ? (
          <div className="p-4"><Notice tone="red">{(rowsQ.error as Error).message}</Notice></div>
        ) : filtered.length === 0 ? (
          <Empty title={rows.length ? t("common.noMatch") : t("common.empty")} hint={!rows.length && writable ? t("common.emptyHint") : undefined}
            action={!rows.length && writable ? <Button size="sm" onClick={() => setEditing("new")}><Plus />{t("common.add")}</Button> : undefined} />
        ) : (
          <>
            {/* Tableau (tablette et bureau, et impression) */}
            <div className="print-scroll scroll-thin hidden max-h-[70vh] overflow-auto sm:block print:block">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-navy-900">
                  <tr>
                    {listFields.map((f) => <th key={f.key} className={th}>{t("f." + f.key)}</th>)}
                    <th className={cn(th, "no-print text-right")}>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, k) => (
                    <tr key={r.id} className={cn("border-b border-slate-100 hover:bg-brand-50/50", k % 2 && "bg-slate-50/60", r.is_demo && "bg-violet-50/40")}>
                      {listFields.map((f, i) => (
                        <td key={f.key} className={cn(td, i === 0 && "font-semibold text-navy-900")}>
                          <span className="inline-flex flex-wrap items-center gap-1.5">{cell(f, r)}{i === 0 && r.is_demo && <DemoBadge />}</span>
                        </td>
                      ))}
                      <td className={cn(td, "no-print whitespace-nowrap text-right")}>
                        {rowAction?.(r)}
                        <RowButtons r={r} writable={writable} role={role} onEdit={() => setEditing(r)} onHistory={() => setHistory(r)} table={res.table} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cartes (mobile) */}
            <ul className="divide-y divide-slate-100 sm:hidden print:hidden">
              {filtered.map((r) => (
                <li key={r.id} className={cn("p-3", r.is_demo && "bg-violet-50/40")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-navy-900">{cell(listFields[0], r)}{r.is_demo && <DemoBadge />}</p>
                    <div className="shrink-0">{rowAction?.(r)}<RowButtons r={r} writable={writable} role={role} onEdit={() => setEditing(r)} onHistory={() => setHistory(r)} table={res.table} /></div>
                  </div>
                  <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                    {listFields.slice(1).map((f) => (
                      <div key={f.key} className="min-w-0">
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("f." + f.key)}</dt>
                        <dd className="truncate text-xs text-slate-700">{cell(f, r)}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && <FormDialog res={res} row={editing === "new" ? null : editing} rows={rows} refs={refs} onClose={() => setEditing(null)} />}
      {importing && <ImportDialog res={res} rows={rows} refs={refs} onClose={() => setImporting(false)} />}
      {history && <HistoryDialog table={res.table} row={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function RowButtons({ r, writable, role, onEdit, onHistory, table }: { r: Row; writable: boolean; role: any; onEdit(): void; onHistory(): void; table: string }) {
  const { t } = useI18n();
  const { store } = useSession();
  const inv = useInvalidate();
  const del = async () => {
    if (!window.confirm(t("common.confirmDelete"))) return;
    try { await store!.remove(table, r.id); toast.success(t("common.deleted")); inv(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <span className="inline-flex">
      {canSeeAudit(role) && <Button variant="ghost" size="icon" onClick={onHistory} title={t("common.history")} aria-label={t("common.history")}><History /></Button>}
      {writable && <Button variant="ghost" size="icon" onClick={onEdit} title={t("common.edit")} aria-label={t("common.edit")}><Pencil /></Button>}
      {canDelete(role) && <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50" onClick={del} title={t("common.delete")} aria-label={t("common.delete")}><Trash2 /></Button>}
    </span>
  );
}

function FormDialog({ res, row, rows, refs, onClose }: { res: Resource; row: Row | null; rows: Row[]; refs: Record<string, Row[]>; onClose(): void }) {
  const { t, locale } = useI18n();
  const save = useSave(res.table);
  const [v, setV] = useState<Record<string, any>>(() => {
    if (row) return { ...row };
    const init: Record<string, any> = {};
    for (const f of res.fields) {
      if (f.key === "confidence") init[f.key] = "moyen";
      else if (f.key === "verification_status" && res.sourced) init[f.key] = "non_verifie";
      else if (f.key === "collected_at") init[f.key] = today();
      else if (f.type === "bool") init[f.key] = false;
      else if (f.def) init[f.key] = f.def;
    }
    return init;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, val: any) => setV((p) => ({ ...p, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const out: Record<string, any> = {};
    for (const f of res.fields) {
      let val = v[f.key];
      if (typeof val === "string") val = val.trim();
      if (val === "" || val === undefined) val = null;
      if (f.type === "num" && val !== null) {
        val = Number(val);
        if (!Number.isFinite(val)) errs[f.key] = t("import.err.number");
        else if (val < 0 && f.key !== "value") errs[f.key] = t("form.err.negative");
      }
      if (f.type === "url" && val && !/^https?:\/\/\S+$/i.test(val)) errs[f.key] = t("form.err.url");
      if (f.type === "bool") val = !!val;
      if (f.required && val === null) errs[f.key] = t("import.err.required");
      out[f.key] = val;
    }
    if (res.table === "market_indicators" && out.value === null && !out.value_text) errs.value = t("form.err.valueOrText");
    if (res.sourced && out.verification_status === "verifie" && !out.source_id && !out.source_url) errs.source_id = t("form.err.verifiedNeedsSource");
    const key = dedupeKey(res, out);
    if (!Object.keys(errs).length && key && rows.some((r) => r.id !== row?.id && dedupeKey(res, r) === key)) {
      errs._form = t("form.err.duplicate") + " (" + res.dedupe!.map((k) => t("f." + k)).join(" + ") + ")";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      // À la création, un champ laissé vide n'est pas envoyé : la valeur par défaut de la base s'applique.
      const values = row ? out : Object.fromEntries(Object.entries(out).filter(([, x]) => x !== null));
      await save.mutateAsync({ id: row?.id, values });
      toast.success(t("common.saved"));
      onClose();
    } catch (err) { setErrors({ _form: (err as Error).message }); }
  };

  const input = (f: Field) => {
    const id = "fld-" + f.key;
    const common = { id, value: v[f.key] ?? "", onChange: (e: React.ChangeEvent<any>) => set(f.key, e.target.value) };
    if (f.type === "area") return <Textarea {...common} />;
    if (f.type === "bool") return (
      <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
        <input id={id} type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={!!v[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
        {t("common.yes")}
      </label>
    );
    if (f.type === "sel") return (
      <Select {...common}>
        <option value="">—</option>
        {f.options!.map((o) => <option key={o} value={o}>{f.raw ? o : t("o." + o, o)}</option>)}
      </Select>
    );
    if (f.type === "ref") {
      let list = refs[f.ref!] ?? [];
      if (f.byCountry && v.country_id) list = list.filter((r) => r.country_id === v.country_id);
      if (f.ref === res.table && row) list = list.filter((r) => r.id !== row.id);
      return (
        <Select {...common}>
          <option value="">—</option>
          {list.map((r) => <option key={r.id} value={r.id}>{refLabel(f.ref!, r, locale)}{r.is_demo ? " · DEMO" : ""}</option>)}
        </Select>
      );
    }
    return <Input {...common} type={f.type === "num" ? "number" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text"} step="any" inputMode={f.type === "num" ? "decimal" : undefined} />;
  };
  const block = (fields: Field[]) => (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={cn(f.type === "area" && "sm:col-span-2")}>
          <Label htmlFor={"fld-" + f.key} required={f.required}>{t("f." + f.key)}</Label>
          {input(f)}
          {errors[f.key] && <p className="mt-1 text-xs font-medium text-red-600">{errors[f.key]}</p>}
        </div>
      ))}
    </div>
  );
  const main = res.fields.filter((f) => !f.prov);
  const prov = res.fields.filter((f) => f.prov);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={(row ? t("common.edit") : t("common.add")) + " — " + t("t." + res.table)}
      description={row?.is_demo ? t("demo.rowWarning") : undefined}>
      <form onSubmit={submit} noValidate>
        {block(main)}
        {prov.length > 0 && (
          <fieldset className="mt-5 rounded-xl border border-gold-300 bg-gold-50/60 p-3 sm:p-4">
            <legend className="flex items-center gap-1.5 rounded-full bg-gold-400 px-3 py-0.5 text-xs font-bold text-navy-950"><ShieldCheck className="size-3.5" />{t("prov.title")}</legend>
            <p className="mb-3 text-xs text-gold-700">{t("prov.help")}</p>
            {block(prov)}
          </fieldset>
        )}
        {errors._form && <Notice tone="red" className="mt-4">{errors._form}</Notice>}
        <div className="sticky -bottom-4 -mx-5 mt-5 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ImportDialog({ res, rows, refs, onClose }: { res: Resource; rows: Row[]; refs: Record<string, Row[]>; onClose(): void }) {
  const { t } = useI18n();
  const { store } = useSession();
  const inv = useInvalidate();
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setError(""); setReport(null);
    try {
      const raw = await readFile(f);
      if (!raw.length) throw new Error(t("import.emptyFile"));
      if (raw.length > 5000) throw new Error(t("import.tooMany"));
      setReport(prepareImport(res, raw, rows, refs, t));
    } catch (e) { setError((e as Error).message); }
  };
  const run = async () => {
    if (!report?.valid.length) return;
    setBusy(true);
    try {
      await store!.insert(res.table, report.valid);
      toast.success(`${report.valid.length} ${t("import.done")}`);
      inv(); onClose();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const template = () => exportCsv(`satil-modele-${res.path}`, res.fields.map((f) => f.key), []);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("common.import") + " — " + t("t." + res.table)} description={t("import.subtitle")}>
      <div className="space-y-3">
        <Notice tone="navy">
          {t("import.help")}{" "}
          {res.dedupe && <><b>{t("import.dedupe")}</b> {res.dedupe.map((k) => t("f." + k)).join(" + ")}.</>}
        </Notice>
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="navy" onClick={() => file.current?.click()}><Upload />{t("import.choose")}</Button>
          <Button variant="outline" onClick={template}><Download />{t("import.template")}</Button>
        </div>
        {error && <Notice tone="red">{error}</Notice>}
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-brand-50 p-2"><p className="text-xl font-extrabold text-brand-700">{report.valid.length}</p><p className="text-[11px] font-semibold text-brand-800">{t("import.valid")}</p></div>
              <div className="rounded-lg bg-gold-50 p-2"><p className="text-xl font-extrabold text-gold-700">{report.duplicates}</p><p className="text-[11px] font-semibold text-gold-700">{t("import.duplicates")}</p></div>
              <div className="rounded-lg bg-red-50 p-2"><p className="text-xl font-extrabold text-red-700">{report.errors.length}</p><p className="text-[11px] font-semibold text-red-700">{t("import.errors")}</p></div>
            </div>
            {report.unknownColumns.length > 0 && <Notice>{t("import.unknownColumns")} {report.unknownColumns.join(", ")}</Notice>}
            {report.errors.length > 0 && (
              <ul className="scroll-thin max-h-40 space-y-1 overflow-auto rounded-lg border border-red-100 bg-red-50/50 p-2 text-xs text-red-800">
                {report.errors.slice(0, 50).map((e) => <li key={e.line}><b>{t("import.line")} {e.line}</b> — {e.message}</li>)}
              </ul>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
              <Button disabled={!report.valid.length || busy} onClick={run}>{t("import.run")} ({report.valid.length})</Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function HistoryDialog({ table, row, onClose }: { table: string; row: Row; onClose(): void }) {
  const { t, locale } = useI18n();
  const { store } = useSession();
  const [items, setItems] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { store!.audit({ table, rowId: row.id }).then(setItems).catch((e) => setError(e.message)); }, [table, row.id, store]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t("common.history")} description={t("audit.rowSubtitle")}>
      {error ? <Notice tone="red">{error}</Notice> : !items ? <Empty title={t("common.loading")} /> : items.length === 0 ? <Empty title={t("audit.none")} /> : (
        <ol className="space-y-3">
          {items.map((a) => <li key={a.id}><AuditEntry a={a} locale={locale} /></li>)}
        </ol>
      )}
    </Dialog>
  );
}

const SKIP = new Set(["updated_at", "created_at", "created_by", "org_id", "id"]);
export function auditChanges(a: AuditRow): { key: string; from: any; to: any }[] {
  const o = a.old_data ?? {}, n = a.new_data ?? {};
  return [...new Set([...Object.keys(o), ...Object.keys(n)])]
    .filter((k) => !SKIP.has(k) && JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? null))
    .map((k) => ({ key: k, from: o[k] ?? null, to: n[k] ?? null }));
}
export function AuditEntry({ a, locale }: { a: AuditRow; locale: any }) {
  const { t } = useI18n();
  const tone = a.action === "INSERT" ? "green" : a.action === "DELETE" ? "red" : "gold";
  const show = (x: any) => (x === null ? "∅" : typeof x === "object" ? JSON.stringify(x).slice(0, 80) : String(x).slice(0, 80));
  const ch = auditChanges(a);
  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone={tone}>{t("audit." + a.action)}</Badge>
        <span className="font-semibold text-slate-700">{fmtDate(a.at, locale)}</span>
        <span className="text-slate-400">{a.user_id ? String(a.user_id).slice(0, 8) : "—"}</span>
      </div>
      {a.action === "UPDATE" && (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {ch.map((c) => (
            <li key={c.key}><span className="font-semibold text-navy-800">{t("f." + c.key, c.key)}</span> : <span className="text-red-700 line-through">{show(c.from)}</span> → <span className="font-semibold text-brand-700">{show(c.to)}</span></li>
          ))}
          {ch.length === 0 && <li className="text-slate-400">{t("audit.noChange")}</li>}
        </ul>
      )}
    </div>
  );
}
