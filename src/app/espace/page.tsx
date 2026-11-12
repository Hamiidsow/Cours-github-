import Link from "next/link";
import { VerifiedBadge } from "@/components/Badges";
import { canPublish, requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const t = getDictionary();
  const { profile, userId } = await requireSession();
  const supabase = await createClient();
  const owner = canPublish(profile);
  const head = { count: "exact" as const, head: true };

  const [published, pending, visits, favorites] = await Promise.all([
    supabase.from("listings").select("id", head).eq("owner_id", userId).eq("status", "publiee"),
    supabase.from("listings").select("id", head).eq("owner_id", userId).eq("status", "en_attente"),
    supabase.from("visit_requests").select("id", head).eq("owner_id", userId).eq("status", "en_attente"),
    supabase.from("favorites").select("listing_id", head).eq("user_id", userId),
  ]);

  const stats = owner
    ? [
        { label: t.dash.statPublished, value: published.count ?? 0, href: "/espace/annonces" },
        { label: t.dash.statPending, value: pending.count ?? 0, href: "/espace/annonces" },
        { label: t.dash.statVisits, value: visits.count ?? 0, href: "/espace/visites" },
        { label: t.dash.statFavorites, value: favorites.count ?? 0, href: "/espace/favoris" },
      ]
    : [{ label: t.dash.statFavorites, value: favorites.count ?? 0, href: "/espace/favoris" }];

  return (
    <>
      <h1 className="h1">{t.dash.hello(profile.display_name)}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        {t.roles[profile.role]}
        {owner && <VerifiedBadge verified={profile.verification_status === "verifie"} />}
        {owner && profile.verification_status !== "verifie" && (
          <Link href="/espace/verification" className="font-semibold text-brand-700 underline">
            {t.verificationStatuses[profile.verification_status]} — {t.dash.verification}
          </Link>
        )}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-brand-700">
            <p className="font-serif text-3xl font-bold text-brand-900">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {owner && <Link href="/espace/annonces/nouvelle" className="btn-gold">{t.dash.newListing}</Link>}
        <Link href="/annonces" className="btn-outline">{t.nav.search}</Link>
      </div>
    </>
  );
}
