import { z } from "zod";
import {
  AMENITIES, AVAILABILITIES, CITIES, DOCUMENT_TYPES, PHONE_REGEX, PROPERTY_TYPES,
  REPORT_REASONS, SIGNUP_ROLES, TRANSACTIONS,
} from "./constants";
import type { SearchFilters } from "./types";

// Validation côté serveur de toutes les saisies. La base applique en plus
// ses propres contraintes (CHECK, RLS, triggers) : double barrière.

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optInt = (min: number, max: number) =>
  z.preprocess(emptyToUndef, z.coerce.number().int().min(min).max(max).optional());
const optText = (max: number) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const phone = z.string().trim().regex(PHONE_REGEX, "Numéro de téléphone invalide.");

export const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Nom trop court.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  phone,
  role: z.enum(SIGNUP_ROLES),
  password: z
    .string()
    .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
    .max(72)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre."),
  terms: z.literal("on", { error: "Vous devez accepter les conditions d'utilisation." }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis.").max(72),
});

export const listingSchema = z.object({
  type: z.enum(PROPERTY_TYPES),
  city: z.enum(CITIES),
  neighborhood: z.string().trim().min(2, "Quartier requis.").max(80),
  address_private: optText(200),
  surface_m2: optInt(1, 1_000_000),
  rooms: optInt(0, 100),
  bedrooms: optInt(0, 100),
  bathrooms: optInt(0, 100),
  furnished: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)).max(30),
  title: z.string().trim().min(10, "Titre : 10 caractères minimum.").max(120),
  description: z.string().trim().min(30, "Description : 30 caractères minimum.").max(4000),
  transaction: z.enum(TRANSACTIONS),
  price_fcfa: z.coerce.number().int().min(1, "Prix requis.").max(99_999_999_999),
  charges_fcfa: optInt(0, 99_999_999_999),
  deposit_months: optInt(0, 24),
  advance_months: optInt(0, 24),
  fees_note: optText(500),
  conditions: optText(2000),
  availability: z.enum(AVAILABILITIES),
  available_from: z.preprocess(emptyToUndef, z.iso.date().optional()),
  contact_phone: phone,
  contact_whatsapp: z.preprocess(emptyToUndef, phone.optional()),
});
export type ListingInput = z.infer<typeof listingSchema>;

export function listingFromFormData(fd: FormData) {
  return listingSchema.safeParse({
    ...Object.fromEntries(fd.entries()),
    furnished: fd.get("furnished") === "on",
    amenities: fd.getAll("amenities"),
  });
}

export const visitSchema = z.object({
  listing_id: z.uuid(),
  preferred_date: z.iso.date().refine(
    (d) => d >= new Date().toISOString().slice(0, 10),
    "La date doit être aujourd'hui ou plus tard.",
  ),
  requester_phone: phone,
  message: optText(1000),
});

export const reportSchema = z.object({
  listing_id: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: optText(1000),
});

export const verificationSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
});

export const VERIFICATION_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const VERIFICATION_MAX_BYTES = 5 * 1024 * 1024;

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Saisie invalide.";
}

// Lecture tolérante des filtres de recherche depuis l'URL : toute valeur
// invalide est simplement ignorée.
export function parseSearchParams(
  sp: Record<string, string | string[] | undefined>,
): SearchFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const many = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v : v ? [v] : []).filter(Boolean);
  };
  const int = (k: string, min: number, max: number) => {
    const n = Number(one(k));
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const pick = <T extends string>(k: string, allowed: readonly T[]) => {
    const v = one(k);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
  };
  return {
    ville: pick("ville", CITIES),
    quartier: one("quartier")?.slice(0, 80),
    type: pick("type", PROPERTY_TYPES),
    transaction: pick("transaction", TRANSACTIONS),
    prix_min: int("prix_min", 0, 99_999_999_999),
    prix_max: int("prix_max", 0, 99_999_999_999),
    chambres: int("chambres", 1, 20),
    meuble: one("meuble") === "1" ? true : undefined,
    equipements: many("equipements").filter((a) => (AMENITIES as readonly string[]).includes(a)),
    tri: pick("tri", ["recent", "prix_asc", "prix_desc"] as const) ?? "recent",
    page: int("page", 1, 500) ?? 1,
  };
}

export function filtersToQuery(f: SearchFilters, overrides: Partial<SearchFilters> = {}): string {
  const m = { ...f, ...overrides };
  const q = new URLSearchParams();
  if (m.ville) q.set("ville", m.ville);
  if (m.quartier) q.set("quartier", m.quartier);
  if (m.type) q.set("type", m.type);
  if (m.transaction) q.set("transaction", m.transaction);
  if (m.prix_min != null) q.set("prix_min", String(m.prix_min));
  if (m.prix_max != null) q.set("prix_max", String(m.prix_max));
  if (m.chambres) q.set("chambres", String(m.chambres));
  if (m.meuble) q.set("meuble", "1");
  for (const a of m.equipements ?? []) q.append("equipements", a);
  if (m.tri && m.tri !== "recent") q.set("tri", m.tri);
  if (m.page && m.page > 1) q.set("page", String(m.page));
  return q.toString();
}

const passwordRule = z
  .string()
  .min(10, "Le mot de passe doit contenir au moins 10 caractères.")
  .max(72)
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.");

export const emailOnlySchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

export const newPasswordSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((d) => d.password === d.confirm, "Les deux mots de passe ne sont pas identiques.");

export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Nom trop court.").max(80),
  phone,
});
