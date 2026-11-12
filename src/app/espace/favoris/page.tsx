import Link from "next/link";
import { deleteSearch } from "@/app/actions/interactions";
import { ListingCard } from "@/components/ListingCard";
import { requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { PublicListing } from "@/lib/types";

export default async function FavoritesPage() {
  const t = getDictionary();
  const { userId } = await requireSession("/espace/favoris");
  const supabase = await createClient();
  const [{ data: favs }, { data: searches }] = await Promise.all([
    supabase.from("favorites").select("listing_id").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("saved_searches").select("id, label, criteria, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  const ids = (favs ?? []).map((f) => f.listing_id);
  // Seules les annonces encore publiées sont affichées.
  const { data: listings } = ids.length
    ? await supabase.from("listings_public").select("*").in("id", ids)
    : { data: [] };

  return (
    <>
      <h1 className="h1">{t.dash.favorites}</h1>
      {(listings ?? []).length === 0 ? (
        <p className="card mt-6 p-6 text-muted">{t.dash.noFavorites}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(listings as PublicListing[]).map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}

      <h2 className="h1 mt-10">{t.dash.alerts}</h2>
      <p className="mt-2 max-w-2xl rounded-lg bg-gold-50 p-3 text-sm text-gold-700">{t.dash.alertsNote}</p>
      {(searches ?? []).length === 0 ? (
        <p className="card mt-4 p-6 text-muted">{t.dash.noAlerts}</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {(searches ?? []).map((s) => (
            <li key={s.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="font-medium">{s.label}</span>
              <span className="flex gap-2">
                <Link href={`/annonces?${(s.criteria as { query?: string })?.query ?? ""}`} className="btn-outline">{t.dash.runSearch}</Link>
                <form action={deleteSearch.bind(null, s.id)}>
                  <button type="submit" className="btn-ghost text-red-800">{t.dash.delete}</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
