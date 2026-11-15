// Import et export de fichiers. ExcelJS et PapaParse sont chargés à la demande.
import type { Field, Resource } from "@/resources";
import { refAliases, refLabel } from "@/resources";
import type { Locale } from "./i18n";
import type { Row } from "./store";

export type Refs = Record<string, Row[]>;
type T = (key: string, fallback?: string) => string;

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Valeur lisible d'une cellule (libellés traduits, références résolues). */
export function displayValue(f: Field, row: Record<string, any>, refs: Refs, t: T, locale: Locale): string | number {
  const v = row[f.key];
  if (v === null || v === undefined || v === "") return "";
  if (f.type === "ref") return refLabel(f.ref!, refs[f.ref!]?.find((r) => r.id === v), locale) || "";
  if (f.type === "sel") return f.raw ? String(v) : t("o." + v, String(v));
  if (f.type === "bool") return v ? t("common.yes") : t("common.no");
  if (f.type === "num") return Number(v);
  return String(v);
}

export function toMatrix(res: Resource, rows: Row[], refs: Refs, t: T, locale: Locale) {
  const header = [...res.fields.map((f) => t("f." + f.key, f.key)), "DEMO"];
  const body = rows.map((r) => [...res.fields.map((f) => displayValue(f, r, refs, t, locale)), r.is_demo ? "DEMO" : ""]);
  return { header, body };
}

export async function exportCsv(name: string, header: string[], body: (string | number)[][]) {
  const Papa = (await import("papaparse")).default;
  const csv = Papa.unparse({ fields: header, data: body }, { delimiter: ";" });
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), name + ".csv");
}
export async function exportXlsx(name: string, sheet: string, header: string[], body: (string | number)[][], meta?: string[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet.slice(0, 30).replace(/[\\/*?:[\]]/g, " "));
  (meta ?? []).forEach((m) => ws.addRow([m]).font = { italic: true, color: { argb: "FF64748B" } });
  const h = ws.addRow(header);
  h.font = { bold: true, color: { argb: "FFFFFFFF" } };
  h.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F3A" } }; });
  body.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c, k) => { c.width = Math.min(40, Math.max(12, String(header[k] ?? "").length + 4)); });
  ws.views = [{ state: "frozen", ySplit: (meta?.length ?? 0) + 1 }];
  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), name + ".xlsx");
}

/** Lit un fichier CSV ou XLSX → lignes d'objets indexés par l'en-tête. */
export async function readFile(file: File): Promise<Record<string, any>[]> {
  if (/\.xlsx$/i.test(file.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const cell = (v: any): any => {
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      if (typeof v === "object") return v.result ?? v.text ?? (v.richText ? v.richText.map((x: any) => x.text).join("") : "");
      return v;
    };
    const rows: any[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => { rows.push((row.values as any[]).slice(1).map(cell)); });
    const [head, ...rest] = rows;
    return rest.map((r) => Object.fromEntries((head ?? []).map((h, k) => [String(h).trim(), r[k] ?? ""])));
  }
  if (!/\.(csv|txt)$/i.test(file.name)) throw new Error("Format non pris en charge : utilisez .csv ou .xlsx");
  const Papa = (await import("papaparse")).default;
  const text = (await file.text()).replace(/^﻿/, "");
  const out = Papa.parse<Record<string, any>>(text, { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  return out.data;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
function parseDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
function parseNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  return s !== "" && /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export interface ImportReport {
  valid: Record<string, any>[];
  duplicates: number;
  errors: { line: number; message: string }[];
  unknownColumns: string[];
}
export const dedupeKey = (res: Resource, row: Record<string, any>) =>
  res.dedupe ? res.dedupe.map((k) => norm(row[k])).join("|") : null;

/** Valide et convertit des lignes importées. Rien n'est écrit ici. */
export function prepareImport(res: Resource, raw: Record<string, any>[], existing: Row[], refs: Refs, t: T): ImportReport {
  const byHeader = new Map<string, Field>();
  for (const f of res.fields) {
    byHeader.set(norm(f.key), f);
    for (const loc of ["fr", "en", "zh"] as const) byHeader.set(norm(t(`f.${f.key}@${loc}`, f.key)), f);
  }
  const headers = raw.length ? Object.keys(raw[0]) : [];
  const unknownColumns = headers.filter((h) => !byHeader.has(norm(h)) && norm(h) !== "demo");
  const seen = new Set(existing.map((r) => dedupeKey(res, r)).filter(Boolean) as string[]);
  const report: ImportReport = { valid: [], duplicates: 0, errors: [], unknownColumns };

  raw.forEach((src, idx) => {
    const line = idx + 2;
    const row: Record<string, any> = {};
    const errs: string[] = [];
    const failed = new Set<string>();
    for (const h of headers) {
      const f = byHeader.get(norm(h));
      if (!f) continue;
      const v = src[h];
      if (v === "" || v === null || v === undefined) continue;
      const label = t("f." + f.key, f.key);
      const before = errs.length;
      if (f.type === "num") {
        const n = parseNum(v);
        if (n === null) errs.push(`${label} : ${t("import.err.number")} (« ${v} »)`); else row[f.key] = n;
      } else if (f.type === "date") {
        const d = parseDate(v);
        if (!d) errs.push(`${label} : ${t("import.err.date")} (« ${v} »)`); else row[f.key] = d;
      } else if (f.type === "bool") {
        row[f.key] = ["1", "true", "oui", "yes", "vrai", "是", "x"].includes(norm(v));
      } else if (f.type === "sel") {
        const hit = f.options!.find((o) => norm(o) === norm(v) || (["fr", "en", "zh"] as const).some((l) => norm(t(`o.${o}@${l}`, o)) === norm(v)));
        if (!hit) errs.push(`${label} : ${t("import.err.option")} (« ${v} »)`); else row[f.key] = hit;
      } else if (f.type === "ref") {
        const hit = (refs[f.ref!] ?? []).find((r) => refAliases(f.ref!, r).includes(norm(v)));
        if (!hit) errs.push(`${label} : ${t("import.err.ref")} (« ${v} »)`); else row[f.key] = hit.id;
      } else row[f.key] = String(v).trim();
      if (errs.length > before) failed.add(f.key);
    }
    for (const f of res.fields) {
      if (f.required && !failed.has(f.key) && (row[f.key] === undefined || row[f.key] === "")) {
        if (f.key === "confidence") row[f.key] = "moyen";
        else if (f.key === "verification_status") row[f.key] = "non_verifie";
        else errs.push(`${t("f." + f.key, f.key)} : ${t("import.err.required")}`);
      }
    }
    if (errs.length) { report.errors.push({ line, message: errs.join(" ; ") }); return; }
    const key = dedupeKey(res, row);
    if (key && seen.has(key)) { report.duplicates++; return; }
    if (key) seen.add(key);
    report.valid.push(row);
  });
  return report;
}
