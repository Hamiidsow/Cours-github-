import Link from "next/link";
import { formatFcfa } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import type { PublicListing } from "@/lib/types";
import { DemoTag } from "./Badges";
import { IconPin, IconShield } from "./Icons";
import { ListingImage } from "./ListingImage";

export function ListingCard({ listing: l, eager = false }: { listing: PublicListing; eager?: boolean }) {
  const t = getDictionary();
  const facts = [
    t.propertyTypes[l.property_type],
    l.bedrooms ? `${l.bedrooms} ch.` : null,
    l.surface_m2 ? `${l.surface_m2} m²` : null,
    l.furnished ? t.listing.furnished : null,
  ].filter(Boolean);
  return (
    <article className="card group relative overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative">
        <ListingImage path={l.image_paths[0]} alt="" eager={eager} className="aspect-[4/3] w-full" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="badge bg-brand-900 text-white">{t.transactions[l.transaction]}</span>
          {l.is_demo && <DemoTag />}
          {l.availability !== "disponible" && (
            <span className="badge bg-white text-ink">{t.availabilities[l.availability]}</span>
          )}
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-lg font-bold text-brand-900">
          {formatFcfa(l.price_fcfa)}
          {l.transaction === "location" && <span className="text-sm font-normal text-muted"> {t.listing.perMonth}</span>}
        </p>
        <h3 className="mt-1 line-clamp-2 font-semibold leading-snug text-ink">
          <Link href={`/annonces/${l.id}`} className="after:absolute after:inset-0">{l.title}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted">
          <IconPin /> {l.neighborhood}, {l.city}
        </p>
        <p className="mt-2 text-sm text-muted">{facts.join(" · ")}</p>
        {l.owner_verified && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand-700">
            <IconShield /> {t.roles[l.owner_role]} {t.listing.verified.toLowerCase()}
          </p>
        )}
      </div>
    </article>
  );
}
