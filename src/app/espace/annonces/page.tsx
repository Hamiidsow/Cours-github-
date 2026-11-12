import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveListing, deleteListing, setAvailability, submitForReviewAction } from "@/app/actions/listings";
import { ActionForm } from "@/components/ActionForm";
import { StatusBadge } from "@/components/Badges";
import { ListingImage } from "@/components/ListingImage";
import { canPublish, requireSession } from "@/lib/auth";
import { AVAILABILITIES } from "@/lib/constants";
import { formatDate, formatFcfa } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { OwnerListing } from "@/lib/types";

export default async function MyListingsPage() {
  const t = getDictionary();
  const { profile, userId } = await requireSession("/espace/annonces");
  if (!canPublish(profile)) redirect("/espace");
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, status, availability, price_fcfa, transaction, rejection_reason, created_at, published_at, properties(type, city, neighborhood), listing_images(storage_path, position)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  const listings = (data ?? []) as unknown as OwnerListing[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h1">{t.dash.myListings}</h1>
        <Link href="/espace/annonces/nouvelle" className="btn-gold">{t.dash.newListing}</Link>
      </div>
      {listings.length === 0 && <p className="card mt-6 p-6 text-muted">{t.dash.noListings}</p>}
      <ul className="mt-6 grid gap-4">
        {listings.map((l) => {
          const cover = [...l.listing_images].sort((a, b) => a.position - b.position)[0]?.storage_path;
          return (
            <li key={l.id} className="card grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
              <ListingImage path={cover} alt="" className="aspect-[4/3] w-full rounded-lg" />
              <div className="grid content-start gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={l.status} />
                  <span className="text-xs text-muted">{formatDate(l.created_at)}</span>
                </div>
                <h2 className="font-semibold text-brand-950">{l.title}</h2>
                <p className="text-sm text-muted">
                  {l.properties && `${t.propertyTypes[l.properties.type]} · ${l.properties.neighborhood}, ${l.properties.city} · `}
                  {formatFcfa(l.price_fcfa)}
                </p>
                {l.rejection_reason && (
                  <p className="rounded-lg bg-red-50 p-2 text-sm text-red-800">{t.dash.reason} : {l.rejection_reason}</p>
                )}
                <div className="flex flex-wrap items-start gap-2">
                  {l.status !== "suspendue" && <Link href={`/espace/annonces/${l.id}`} className="btn-outline">{t.dash.edit}</Link>}
                  {l.status === "publiee" && <Link href={`/annonces/${l.id}`} className="btn-ghost">{t.dash.view}</Link>}
                  {(l.status === "brouillon" || l.status === "rejetee" || l.status === "archivee") && (
                    <ActionForm action={submitForReviewAction.bind(null, l.id)} submitLabel={t.dash.submitReview} className="grid gap-2" />
                  )}
                  {(l.status === "publiee" || l.status === "en_attente") && (
                    <ActionForm action={archiveListing.bind(null, l.id)} submitLabel={t.dash.archive} submitClass="btn-ghost" className="grid gap-2" />
                  )}
                  <ActionForm action={deleteListing.bind(null, l.id)} submitLabel={t.dash.delete} submitClass="btn-danger" className="grid gap-2"
                    confirm="Supprimer définitivement cette annonce et ses photos ?" />
                </div>
                {l.status === "publiee" && (
                  <ActionForm action={setAvailability.bind(null, l.id)} submitLabel="OK" submitClass="btn-outline" className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-muted" htmlFor={`av-${l.id}`}>Disponibilité</label>
                    <select id={`av-${l.id}`} name="availability" defaultValue={l.availability} className="input w-auto">
                      {AVAILABILITIES.map((a) => <option key={a} value={a}>{t.availabilities[a]}</option>)}
                    </select>
                  </ActionForm>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
