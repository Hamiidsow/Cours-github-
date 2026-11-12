import Link from "next/link";
import { IconCheck } from "@/components/Icons";
import { ListingCard } from "@/components/ListingCard";
import { SearchForm } from "@/components/SearchForm";
import { PROPERTY_TYPES } from "@/lib/constants";
import { searchListings } from "@/lib/data/listings";
import { getDictionary } from "@/lib/i18n";

export default async function HomePage() {
  const t = getDictionary();
  const { rows } = await searchListings({ page: 1 });
  const latest = rows.slice(0, 6);

  return (
    <>
      <section className="bg-brand-900 text-white">
        <div className="container-page py-10 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-500">{t.tagline}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">{t.home.title}</h1>
          <p className="mt-4 max-w-2xl text-brand-100">{t.home.subtitle}</p>
          <div className="mt-8 rounded-2xl bg-white p-4 text-ink shadow-xl sm:p-6">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="h1">{t.home.latest}</h2>
          <Link href="/annonces" className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
            {t.home.seeAll}
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="card mt-6 p-6 text-muted">{t.search.empty}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latest.map((l, i) => <ListingCard key={l.id} listing={l} eager={i < 2} />)}
          </div>
        )}
      </section>

      <section className="container-page py-6">
        <h2 className="h2">{t.home.byType}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((p) => (
            <Link key={p} href={`/annonces?type=${p}`}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-brand-900 hover:border-brand-700 hover:bg-brand-50">
              {t.propertyTypes[p]}
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="h1">{t.home.howTitle}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {t.home.how.map((s, i) => (
            <li key={s.t} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-100 font-serif text-lg font-bold text-gold-700">{i + 1}</span>
              <h3 className="mt-3 font-semibold text-brand-950">{s.t}</h3>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-6">
        <div className="grid gap-6 rounded-2xl bg-brand-50 p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="h1">{t.home.ownerTitle}</h2>
            <p className="mt-3 text-muted">{t.home.ownerText}</p>
            <Link href="/inscription" className="btn-primary mt-5">{t.nav.publish}</Link>
          </div>
          <ul className="grid gap-4">
            {t.home.trust.map((x) => (
              <li key={x.t} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-900 text-white"><IconCheck /></span>
                <span><strong className="block text-brand-950">{x.t}</strong><span className="text-sm text-muted">{x.d}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
