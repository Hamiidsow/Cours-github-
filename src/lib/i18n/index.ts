import { fr } from "./fr";

// Architecture multilingue : le français est la langue de référence.
// Pour ajouter le wolof ou l'anglais : créer `wo.ts` / `en.ts` exportant un
// objet de type `Partial<Dictionary>` (les clés manquantes retombent sur le
// français), puis l'enregistrer dans `dictionaries` ci-dessous.
export type Dictionary = typeof fr;
export const LOCALES = ["fr", "wo", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

const dictionaries: Partial<Record<Locale, Partial<Dictionary>>> = { fr };

export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return { ...fr, ...(dictionaries[locale] ?? {}) };
}
