import type { Metadata } from "next";
import Link from "next/link";
import { canPublish, requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mon espace", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SpaceLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary();
  const { profile } = await requireSession();
  const owner = canPublish(profile);
  const items = [
    { href: "/espace", label: t.dash.overview },
    ...(owner ? [{ href: "/espace/annonces", label: t.dash.myListings }] : []),
    { href: "/espace/visites", label: t.dash.visits },
    { href: "/espace/favoris", label: t.dash.favorites },
    ...(owner ? [{ href: "/espace/verification", label: t.dash.verification }] : []),
    { href: "/espace/profil", label: "Mon profil" },
  ];
  return (
    <div className="container-page py-6">
      {profile.account_status === "suspendu" && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800">{t.auth.suspended}</p>
      )}
      <nav aria-label="Mon espace" className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 pb-2 sm:mx-0 sm:px-0">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="btn-ghost shrink-0 whitespace-nowrap">{i.label}</Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
