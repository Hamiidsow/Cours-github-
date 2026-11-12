import { notFound } from "next/navigation";
import { deleteImage } from "@/app/actions/listings";
import { StatusBadge } from "@/components/Badges";
import { ListingForm, type ListingFormValues } from "@/components/ListingForm";
import { ListingImage } from "@/components/ListingImage";
import { requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { listingFormLabels } from "@/lib/listing-form-labels";
import { createClient } from "@/lib/supabase/server";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getDictionary();
  const { userId } = await requireSession(`/espace/annonces/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*, properties(*), listing_images(id, storage_path, position)")
    .eq("id", id).eq("owner_id", userId).maybeSingle();
  if (!data || data.status === "suspendue") notFound();

  const { properties: p, listing_images, ...l } = data;
  const images = [...(listing_images ?? [])].sort((a, b) => a.position - b.position);
  const initial: ListingFormValues = { ...l, ...p };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h1">{t.dash.edit}</h1>
        <StatusBadge status={l.status} />
      </div>
      {images.length > 0 && (
        <ul className="mt-6 grid max-w-3xl grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="grid gap-1">
              <ListingImage path={img.storage_path} alt="" className="aspect-square w-full rounded-lg" />
              <form action={deleteImage.bind(null, img.id)}>
                <button type="submit" className="btn-ghost min-h-9 w-full text-xs text-red-800">{t.form.removePhoto}</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 max-w-3xl">
        <ListingForm key={images.length} userId={userId} listingId={id} initial={initial} existingCount={images.length} labels={listingFormLabels()} />
      </div>
    </>
  );
}
