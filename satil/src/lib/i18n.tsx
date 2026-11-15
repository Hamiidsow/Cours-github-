import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICT } from "./dict";

export type Locale = "fr" | "en" | "zh";
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "fr", label: "Français" }, { code: "zh", label: "简体中文" }, { code: "en", label: "English" },
];
const IDX: Record<Locale, number> = { fr: 0, en: 1, zh: 2 };

/** Traduction hors React. « clé@en » force une langue. Clé inconnue → repli fourni, sinon la clé. */
export function translate(key: string, locale: Locale, fallback?: string): string {
  const at = key.lastIndexOf("@");
  if (at > 0) { locale = key.slice(at + 1) as Locale; key = key.slice(0, at); }
  const e = DICT[key];
  if (!e) return fallback ?? key;
  return e[IDX[locale]] || e[0];
}

interface I18n { locale: Locale; setLocale(l: Locale): void; t(key: string, fallback?: string): string }
const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("satil.locale") as Locale | null;
    if (saved && saved in IDX) return saved;
    const nav = navigator.language.slice(0, 2);
    return nav === "zh" ? "zh" : nav === "en" ? "en" : "fr";
  });
  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-CN" : locale; }, [locale]);
  const setLocale = useCallback((l: Locale) => { localStorage.setItem("satil.locale", l); setLocaleState(l); }, []);
  const value = useMemo<I18n>(() => ({ locale, setLocale, t: (k, f) => translate(k, locale, f) }), [locale, setLocale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("I18nProvider manquant");
  return c;
}
