import { PAGE_SIZE } from "../constants";
import { escapeLike } from "../format";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import type { PublicListing, SearchFilters } from "../types";
import { DEMO_LISTINGS } from "./demo";

// Accès aux annonces PUBLIQUES. Lit la vue `listings_public` ; en mode
// démonstration (backend non connecté), retombe sur les données fictives.

export function filterDemo(f: SearchFilters): PublicListing[] {
  const rows = DEMO_LISTINGS.filter(
    (l) =>
      (!f.ville || l.city === f.ville) &&
      (!f.quartier || l.neighborhood.toLowerCase().includes(f.quartier.toLowerCase())) &&
      (!f.type || l.property_type === f.type) &&
      (!f.transaction || l.transaction === f.transaction) &&
      (f.prix_min == null || l.price_fcfa >= f.prix_min) &&
      (f.prix_max == null || l.price_fcfa <= f.prix_max) &&
      (!f.chambres || (l.bedrooms ?? 0) >= f.chambres) &&
      (!f.meuble || l.furnished) &&
      (f.equipements ?? []).every((a) => l.amenities.includes(a)),
  );
  if (f.tri === "prix_asc") rows.sort((a, b) => a.price_fcfa - b.price_fcfa);
  else if (f.tri === "prix_desc") rows.sort((a, b) => b.price_fcfa - a.price_fcfa);
  else rows.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  return rows;
}

export async function searchListings(
  f: SearchFilters,
): Promise<{ rows: PublicListing[]; total: number; error?: boolean }> {
  const page = f.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  if (!isSupabaseConfigured()) {
    const all = filterDemo(f);
    return { rows: all.slice(from, from + PAGE_SIZE), total: all.length };
  }

  const supabase = await createClient();
  let q = supabase.from("listings_public").select("*", { count: "exact" });
  if (f.ville) q = q.eq("city", f.ville);
  if (f.quartier) q = q.ilike("neighborhood", `%${escapeLike(f.quartier)}%`);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.transaction) q = q.eq("transaction", f.transaction);
  if (f.prix_min != null) q = q.gte("price_fcfa", f.prix_min);
  if (f.prix_max != null) q = q.lte("price_fcfa", f.prix_max);
  if (f.chambres) q = q.gte("bedrooms", f.chambres);
  if (f.meuble) q = q.eq("furnished", true);
  if (f.equipements?.length) q = q.contains("amenities", f.equipements);
  if (f.tri === "prix_asc") q = q.order("price_fcfa", { ascending: true });
  else if (f.tri === "prix_desc") q = q.order("price_fcfa", { ascending: false });
  else q = q.order("published_at", { ascending: false });

  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) return { rows: [], total: 0, error: true };
  return { rows: (data ?? []) as PublicListing[], total: count ?? 0 };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getListing(id: string): Promise<PublicListing | null> {
  if (!isSupabaseConfigured()) return DEMO_LISTINGS.find((l) => l.id === id) ?? null;
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("listings_public").select("*").eq("id", id).maybeSingle();
  return (data as PublicListing | null) ?? null;
}

export async function listPublishedIds(limit = 1000): Promise<{ id: string; published_at: string | null }[]> {
  if (!isSupabaseConfigured()) return DEMO_LISTINGS.map((l) => ({ id: l.id, published_at: l.published_at }));
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings_public")
    .select("id, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
