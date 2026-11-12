import type { MetadataRoute } from "next";
import { CITIES } from "@/lib/constants";
import { listPublishedIds } from "@/lib/data/listings";
import { siteUrl } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/annonces", "/aide", "/conditions", "/confidentialite", "/mentions-legales"].map((p) => ({ url: `${base}${p}` }));
  const cities = CITIES.map((c) => ({ url: `${base}/annonces?ville=${encodeURIComponent(c)}` }));
  // Les annonces fictives ne sont jamais référencées.
  const listings = isSupabaseConfigured()
    ? (await listPublishedIds()).map((l) => ({ url: `${base}/annonces/${l.id}`, lastModified: l.published_at ?? undefined }))
    : [];
  return [...pages, ...cities, ...listings];
}
