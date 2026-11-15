import type { Locale } from "./i18n";

const TAG: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", zh: "zh-CN" };

/** Nombre formaté ; null/NaN → null (l'appelant affiche « non disponible »). */
export function fmtNum(v: unknown, locale: Locale, digits = 0): string | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return new Intl.NumberFormat(TAG[locale], { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}
export function fmtMoney(v: unknown, currency: string | null | undefined, locale: Locale, digits?: number): string | null {
  const d = digits ?? (currency === "XOF" || currency === "GNF" || currency === "XAF" ? 0 : 2);
  const s = fmtNum(v, locale, d);
  return s === null ? null : currency ? `${s} ${currency}` : s;
}
export function fmtPct(v: unknown, locale: Locale, digits = 1): string | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return new Intl.NumberFormat(TAG[locale], { style: "percent", maximumFractionDigits: digits }).format(v);
}
export function fmtDate(v: unknown, locale: Locale): string | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v.length <= 10 ? v + "T00:00:00" : v);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(TAG[locale], v.length <= 10 ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" }).format(d);
}
