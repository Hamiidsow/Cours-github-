import type { ListingStatus } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { IconShield } from "./Icons";

export function DemoTag() {
  const t = getDictionary();
  return <span className="badge bg-gold-100 text-gold-700 ring-1 ring-gold-500/40">{t.demo.tag}</span>;
}

// N'est rendu que si la base indique un contrôle admin réellement validé.
export function VerifiedBadge({ verified }: { verified: boolean }) {
  const t = getDictionary();
  if (!verified) return <span className="badge bg-stone-100 text-stone-600">{t.listing.notVerified}</span>;
  return (
    <span className="badge bg-brand-100 text-brand-900" title={t.listing.verifiedHelp}>
      <IconShield /> {t.listing.verified}
    </span>
  );
}

const statusStyle: Record<ListingStatus, string> = {
  brouillon: "bg-stone-100 text-stone-700",
  en_attente: "bg-gold-100 text-gold-700",
  publiee: "bg-brand-100 text-brand-900",
  rejetee: "bg-red-100 text-red-800",
  suspendue: "bg-red-100 text-red-800",
  archivee: "bg-stone-100 text-stone-500",
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  const t = getDictionary();
  return <span className={`badge ${statusStyle[status]}`}>{t.listingStatuses[status]}</span>;
}
