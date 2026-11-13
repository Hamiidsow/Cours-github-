const nf = new Intl.NumberFormat("fr-FR");

// 250000 -> « 250 000 FCFA » (espaces normaux pour un rendu identique partout).
export function formatFcfa(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `${nf.format(amount).replace(/[  ]/g, " ")} FCFA`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

// Numéro au format international sans « + » ni espaces, pour wa.me.
// Un numéro sénégalais à 9 chiffres reçoit l'indicatif 221.
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `221${digits}`;
  return digits.replace(/^00/, "");
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function whatsappContactUrl(phone: string, text: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function siteUrl(): string {
  // Sur Vercel, l'adresse de production est fournie automatiquement.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

// Chemin de stockage -> URL affichable. Les chemins commençant par « / » sont
// des illustrations locales (données de démonstration).
export function imageUrl(path: string): string {
  if (path.startsWith("/") || path.startsWith("http")) return path;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/listing-images/${path}`;
}

// Échappe les jokers d'un motif LIKE saisi par l'utilisateur.
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
