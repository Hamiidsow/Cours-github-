import { redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { canPublish, requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { listingFormLabels } from "@/lib/listing-form-labels";
import { createClient } from "@/lib/supabase/server";

export default async function NewListingPage() {
  const t = getDictionary();
  const { profile, userId } = await requireSession("/espace/annonces/nouvelle");
  if (!canPublish(profile)) redirect("/espace");
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("phone").eq("user_id", userId).maybeSingle();
  return (
    <>
      <h1 className="h1">{t.dash.newListing}</h1>
      <div className="mt-6 max-w-3xl">
        <ListingForm userId={userId} listingId={null} initial={{ contact_phone: priv?.phone ?? "" }} labels={listingFormLabels()} />
      </div>
    </>
  );
}
