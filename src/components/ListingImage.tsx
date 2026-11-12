import { imageUrl } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { IconHome } from "./Icons";

// Photo d'annonce (chargement différé) ou emplacement neutre s'il n'y en a pas.
export function ListingImage({
  path, alt, eager = false, className = "",
}: { path?: string; alt: string; eager?: boolean; className?: string }) {
  const t = getDictionary();
  if (!path) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-brand-50 text-brand-700/60 ${className}`}>
        <IconHome />
        <span className="text-xs">{t.listing.noPhoto}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl(path)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`bg-brand-50 object-cover ${className}`}
    />
  );
}
