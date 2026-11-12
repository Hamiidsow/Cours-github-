import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { reportListing, requestVisit, toggleFavorite } from "@/app/actions/interactions";
import { ActionForm } from "@/components/ActionForm";
import { DemoTag, VerifiedBadge } from "@/components/Badges";
import { ContactBox } from "@/components/ContactBox";
import { IconCheck, IconHeart, IconPin, IconWhatsApp } from "@/components/Icons";
import { ListingImage } from "@/components/ListingImage";
import { getSession } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/constants";
import { getListing } from "@/lib/data/listings";
import { formatDate, formatFcfa, imageUrl, siteUrl, whatsappShareUrl } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = await getListing(id);
  if (!l) return { title: "Annonce introuvable", robots: { index: false } };
  const title = `${l.title} — ${formatFcfa(l.price_fcfa)}`;
  const description = l.description.slice(0, 160);
  return {
    title, description,
    alternates: { canonical: `/annonces/${l.id}` },
    robots: l.is_demo ? { index: false } : undefined,
    openGraph: { title, description, type: "article", images: l.image_paths[0] ? [imageUrl(l.image_paths[0])] : undefined },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const t = getDictionary();
  const [l, session] = await Promise.all([getListing(id), getSession()]);
  if (!l) notFound();

  const demoMode = !isSupabaseConfigured();
  let isFavorite = false;
  if (session) {
    const supabase = await createClient();
    const { data } = await supabase.from("favorites").select("listing_id").eq("listing_id", l.id).maybeSingle();
    isFavorite = !!data;
  }

  const url = `${siteUrl()}/annonces/${l.id}`;
  const shareText = `${l.title} — ${formatFcfa(l.price_fcfa)}${l.transaction === "location" ? " / mois" : ""} — ${l.neighborhood}, ${l.city}\n${url}`;
  const isRent = l.transaction === "location";
  const facts: [string, string | null][] = [
    [t.search.type, t.propertyTypes[l.property_type]],
    [t.listing.surface, l.surface_m2 ? `${l.surface_m2} m²` : null],
    [t.listing.rooms, l.rooms?.toString() ?? null],
    [t.listing.bedrooms, l.bedrooms?.toString() ?? null],
    [t.listing.bathrooms, l.bathrooms?.toString() ?? null],
    [t.listing.furnished, l.furnished ? t.listing.yes : t.listing.no],
    [t.listing.availableFrom, l.available_from ? formatDate(l.available_from) : null],
  ];
  const jsonLd = {
    "@context": "https://schema.org", "@type": "RealEstateListing", name: l.title, description: l.description, url,
    datePosted: l.published_at, image: l.image_paths.map(imageUrl),
    offers: { "@type": "Offer", price: l.price_fcfa, priceCurrency: "XOF",
      availability: l.availability === "disponible" ? "https://schema.org/InStock" : "https://schema.org/LimitedAvailability" },
    address: { "@type": "PostalAddress", addressLocality: l.city, addressRegion: l.neighborhood, addressCountry: "SN" },
  };

  return (
    <div className="container-page py-6">
      {!l.is_demo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      )}
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted">
        <Link href="/annonces" className="hover:underline">{t.nav.search}</Link> ›{" "}
        <Link href={`/annonces?ville=${encodeURIComponent(l.city)}`} className="hover:underline">{l.city}</Link>
      </nav>

      {/* Galerie : défilement horizontal natif, sans JavaScript */}
      <div className="mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl" tabIndex={0} aria-label={t.listing.photos(l.image_paths.length)}>
        {l.image_paths.length === 0 ? (
          <ListingImage alt="" className="aspect-[16/9] w-full rounded-xl" />
        ) : (
          l.image_paths.map((p, i) => (
            <ListingImage key={p} path={p} eager={i === 0} alt={`${l.title} — photo ${i + 1}`}
              className="aspect-[4/3] w-[88%] shrink-0 snap-center rounded-xl sm:w-[60%]" />
          ))
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-brand-900 text-white">{t.transactions[l.transaction]}</span>
            <span className="badge bg-brand-50 text-brand-900">{t.availabilities[l.availability]}</span>
            {l.is_demo && <DemoTag />}
          </div>
          <h1 className="h1 mt-3">{l.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-muted"><IconPin /> {l.neighborhood}, {l.city}</p>

          <section className="card mt-6 p-5">
            <h2 className="h2">{t.listing.feesTitle}</h2>
            <p className="mt-2 text-3xl font-bold text-brand-900">
              {formatFcfa(l.price_fcfa)}
              {isRent && <span className="text-base font-normal text-muted"> {t.listing.perMonth}</span>}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              {l.charges_fcfa != null && (<div><dt className="text-muted">{t.listing.charges}</dt><dd className="font-semibold">{formatFcfa(l.charges_fcfa)}</dd></div>)}
              {l.deposit_months != null && (<div><dt className="text-muted">{t.listing.deposit}</dt><dd className="font-semibold">{t.listing.months(l.deposit_months)}{isRent && ` (${formatFcfa(l.deposit_months * l.price_fcfa)})`}</dd></div>)}
              {l.advance_months != null && (<div><dt className="text-muted">{t.listing.advance}</dt><dd className="font-semibold">{t.listing.months(l.advance_months)}{isRent && ` (${formatFcfa(l.advance_months * l.price_fcfa)})`}</dd></div>)}
            </dl>
            {l.fees_note && <p className="mt-3 text-sm"><span className="text-muted">{t.listing.feesNote} : </span>{l.fees_note}</p>}
            <p className="mt-4 flex items-center gap-2 rounded-lg bg-gold-50 px-3 py-2 text-sm font-medium text-gold-700">
              <IconCheck /> {t.listing.noCommission}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="h2">{t.listing.features}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-brand-50 p-3">
                  <dt className="text-xs text-muted">{k}</dt><dd className="font-semibold text-brand-950">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-8">
            <h2 className="h2">{t.listing.description}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/90">{l.description}</p>
          </section>

          {l.amenities.length > 0 && (
            <section className="mt-8">
              <h2 className="h2">{t.listing.amenities}</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {l.amenities.map((a) => (
                  <li key={a} className="badge bg-white px-3 py-1.5 text-sm font-medium text-ink ring-1 ring-line">
                    {t.amenities[a as keyof typeof t.amenities] ?? a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {l.conditions && (
            <section className="mt-8">
              <h2 className="h2">{t.listing.conditions}</h2>
              <p className="mt-2 whitespace-pre-line text-ink/90">{l.conditions}</p>
            </section>
          )}
        </div>

        <aside className="grid content-start gap-4">
          <section className="card p-5">
            <h2 className="h2">{t.listing.contactTitle}</h2>
            <p className="mt-2 text-sm text-muted">{t.listing.owner}</p>
            <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-950">
              {l.owner_name} <VerifiedBadge verified={l.owner_verified} />
            </p>
            <p className="mt-1 text-xs text-muted">
              {t.roles[l.owner_role]} — {l.owner_verified ? t.listing.verifiedHelp : t.listing.notVerifiedHelp}
            </p>
            <div className="mt-4">
              <ContactBox listingId={l.id} loggedIn={!!session} demoMode={demoMode}
                labels={{ showContact: t.listing.showContact, loginToContact: t.listing.loginToContact, call: t.listing.call,
                  whatsapp: t.listing.whatsapp, demo: t.demo.unavailable, message: t.listing.whatsappMessage(l.title) }} />
            </div>
            <p className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-900">{t.listing.safety}</p>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <a href={whatsappShareUrl(shareText)} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <IconWhatsApp /> Partager
            </a>
            {session ? (
              <form action={toggleFavorite.bind(null, l.id, isFavorite)}>
                <button type="submit" className="btn-outline w-full" aria-pressed={isFavorite}>
                  <IconHeart filled={isFavorite} /> {isFavorite ? "Retirer" : "Favori"}
                </button>
              </form>
            ) : (
              <Link href={`/connexion?suite=/annonces/${l.id}`} className="btn-outline"><IconHeart /> Favori</Link>
            )}
          </div>

          {session && !demoMode && (
            <>
              <section className="card p-5">
                <h2 className="h2">{t.listing.visitTitle}</h2>
                <ActionForm action={requestVisit} submitLabel={t.listing.visitSubmit} className="mt-3 grid gap-3">
                  <input type="hidden" name="listing_id" value={l.id} />
                  <div>
                    <label className="label" htmlFor="v-date">{t.listing.visitDate}</label>
                    <input id="v-date" name="preferred_date" type="date" required className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="v-phone">{t.listing.visitPhone}</label>
                    <input id="v-phone" name="requester_phone" type="tel" required placeholder="+221 77 123 45 67" className="input" />
                  </div>
                  <div>
                    <label className="label" htmlFor="v-msg">{t.listing.visitMessage}</label>
                    <textarea id="v-msg" name="message" rows={2} maxLength={1000} className="input" />
                  </div>
                </ActionForm>
              </section>

              <details className="card p-5">
                <summary className="cursor-pointer text-sm font-semibold text-red-800">{t.listing.reportTitle}</summary>
                <ActionForm action={reportListing} submitLabel={t.listing.reportSubmit} submitClass="btn-danger" className="mt-3 grid gap-3">
                  <input type="hidden" name="listing_id" value={l.id} />
                  <div>
                    <label className="label" htmlFor="r-reason">{t.listing.reportReason}</label>
                    <select id="r-reason" name="reason" required className="input">
                      {REPORT_REASONS.map((r) => <option key={r} value={r}>{t.reportReasons[r]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="r-details">{t.listing.reportDetails}</label>
                    <textarea id="r-details" name="details" rows={2} maxLength={1000} className="input" />
                  </div>
                </ActionForm>
              </details>
            </>
          )}
          {!session && !demoMode && (
            <p className="text-center text-sm text-muted">
              <Link href={`/connexion?suite=/annonces/${l.id}`} className="font-semibold text-brand-700 underline">Connectez-vous</Link>{" "}
              pour demander une visite ou signaler cette annonce.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
