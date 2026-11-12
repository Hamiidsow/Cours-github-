import type { Metadata } from "next";
import Link from "next/link";
import { saveSearch } from "@/app/actions/interactions";
import { ActionForm } from "@/components/ActionForm";
import { ListingCard } from "@/components/ListingCard";
import { SearchForm } from "@/components/SearchForm";
import { getSession } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/constants";
import { searchListings } from "@/lib/data/listings";
import { getDictionary } from "@/lib/i18n";
import { filtersToQuery, parseSearchParams } from "@/lib/validation";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = getDictionary();
  const f = parseSearchParams(await searchParams);
  const parts = [f.type ? t.propertyTypes[f.type] : "Annonces immobilières", f.transaction && `en ${f.transaction}`,
    f.quartier, f.ville ? `à ${f.ville}` : "au Sénégal"].filter(Boolean);
  const title = parts.join(" ");
  return {
    title,
    description: `${title} — contact direct avec le propriétaire, sans commission.`,
    alternates: { canonical: `/annonces${filtersToQuery(f) ? `?${filtersToQuery(f)}` : ""}` },
  };
}

export default async function ResultsPage({ searchParams }: Props) {
  const t = getDictionary();
  const filters = parseSearchParams(await searchParams);
  const [{ rows, total, error }, session] = await Promise.all([searchListings(filters), getSession()]);
  const page = filters.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/annonces?${filtersToQuery(filters, { page: p })}`;

  return (
    <div className="container-page py-6">
      <h1 className="h1">{t.nav.search}</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-[340px_1fr]">
        <aside>
          <details className="card group p-4 lg:hidden">
            <summary className="cursor-pointer font-semibold text-brand-900">{t.search.filters}</summary>
            <div className="mt-4"><SearchForm filters={filters} full /></div>
          </details>
          <div className="card hidden p-4 lg:block"><SearchForm filters={filters} full /></div>
        </aside>

        <section aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-brand-950">{t.search.results(total)}</p>
            {session && (
              <ActionForm action={saveSearch.bind(null, filtersToQuery(filters))} submitLabel={t.search.saveAlert}
                submitClass="btn-outline" className="flex flex-wrap items-center gap-2" />
            )}
          </div>
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-red-800">{t.auth.generic}</p>}
          {!error && rows.length === 0 && <p className="card mt-4 p-6 text-muted">{t.search.empty}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((l, i) => <ListingCard key={l.id} listing={l} eager={i < 2} />)}
          </div>
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              {page > 1 ? <Link href={link(page - 1)} className="btn-outline">{t.search.prev}</Link> : <span />}
              <span className="text-sm text-muted">{page} / {pages}</span>
              {page < pages ? <Link href={link(page + 1)} className="btn-outline">{t.search.next}</Link> : <span />}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
