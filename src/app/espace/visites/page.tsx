import Link from "next/link";
import { updateVisitStatus } from "@/app/actions/interactions";
import { ActionForm } from "@/components/ActionForm";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { VisitRequest } from "@/lib/types";

export default async function VisitsPage() {
  const t = getDictionary();
  const { userId } = await requireSession("/espace/visites");
  const supabase = await createClient();
  const { data } = await supabase
    .from("visit_requests")
    .select("id, listing_id, requester_id, owner_id, preferred_date, message, requester_phone, status, created_at, listings(title)")
    .order("created_at", { ascending: false })
    .limit(100);
  const all = (data ?? []) as unknown as VisitRequest[];
  // Le demandeur n'a pas accès à la table brute des annonces : les titres
  // viennent de la vue publique.
  const ids = [...new Set(all.map((v) => v.listing_id))];
  const { data: pub } = ids.length
    ? await supabase.from("listings_public").select("id, title").in("id", ids)
    : { data: [] };
  const titles = new Map((pub ?? []).map((l) => [l.id, l.title]));
  const received = all.filter((v) => v.owner_id === userId);
  const sent = all.filter((v) => v.requester_id === userId);

  const item = (v: VisitRequest, mine: boolean) => (
    <li key={v.id} className="card grid gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge bg-brand-50 text-brand-900">{t.visitStatuses[v.status]}</span>
        <span className="text-sm text-muted">{t.listing.visitDate} : {formatDate(v.preferred_date)}</span>
      </div>
      <Link href={`/annonces/${v.listing_id}`} className="font-semibold text-brand-950 hover:underline">
        {v.listings?.title ?? titles.get(v.listing_id) ?? "Annonce (plus en ligne)"}
      </Link>
      {!mine && (
        <p className="text-sm">
          Téléphone du demandeur : <a href={`tel:${v.requester_phone.replace(/\s/g, "")}`} className="font-semibold text-brand-700 underline">{v.requester_phone}</a>
        </p>
      )}
      {v.message && <p className="text-sm text-ink/90">« {v.message} »</p>}
      {v.status === "en_attente" && (
        <div className="flex flex-wrap gap-2">
          {mine ? (
            <ActionForm action={updateVisitStatus.bind(null, v.id, "annulee")} submitLabel={t.dash.cancel} submitClass="btn-outline" className="grid gap-2" />
          ) : (
            <>
              <ActionForm action={updateVisitStatus.bind(null, v.id, "acceptee")} submitLabel={t.dash.accept} className="grid gap-2" />
              <ActionForm action={updateVisitStatus.bind(null, v.id, "refusee")} submitLabel={t.dash.refuse} submitClass="btn-outline" className="grid gap-2" />
            </>
          )}
        </div>
      )}
    </li>
  );

  return (
    <>
      <h1 className="h1">{t.dash.visits}</h1>
      <h2 className="h2 mt-6">{t.dash.received}</h2>
      {received.length === 0 ? <p className="card mt-3 p-5 text-muted">{t.dash.noVisits}</p>
        : <ul className="mt-3 grid gap-3">{received.map((v) => item(v, false))}</ul>}
      <h2 className="h2 mt-8">{t.dash.sent}</h2>
      {sent.length === 0 ? <p className="card mt-3 p-5 text-muted">{t.dash.noVisits}</p>
        : <ul className="mt-3 grid gap-3">{sent.map((v) => item(v, true))}</ul>}
    </>
  );
}
