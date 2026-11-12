import { AMENITIES, CITIES, NEIGHBORHOOD_SUGGESTIONS, PROPERTY_TYPES, TRANSACTIONS } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import type { SearchFilters } from "@/lib/types";

// Formulaire de recherche en GET : fonctionne sans JavaScript et produit
// des adresses partageables (/annonces?ville=Dakar&type=studio…).
export function SearchForm({ filters = {}, full = false }: { filters?: SearchFilters; full?: boolean }) {
  const t = getDictionary();
  return (
    <form action="/annonces" method="get" className="grid gap-3">
      <div className={`grid gap-3 ${full ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <div>
          <label className="label" htmlFor="f-ville">{t.search.city}</label>
          <select id="f-ville" name="ville" defaultValue={filters.ville ?? ""} className="input">
            <option value="">{t.search.allCities}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-quartier">{t.search.neighborhood}</label>
          <input id="f-quartier" name="quartier" defaultValue={filters.quartier ?? ""} placeholder={t.search.neighborhoodPh}
            list="quartiers" maxLength={80} className="input" />
          <datalist id="quartiers">{NEIGHBORHOOD_SUGGESTIONS.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div>
          <label className="label" htmlFor="f-type">{t.search.type}</label>
          <select id="f-type" name="type" defaultValue={filters.type ?? ""} className="input">
            <option value="">{t.search.allTypes}</option>
            {PROPERTY_TYPES.map((p) => <option key={p} value={p}>{t.propertyTypes[p]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-prix-max">{t.search.priceMax}</label>
          <input id="f-prix-max" name="prix_max" type="number" inputMode="numeric" min={0} step={5000}
            defaultValue={filters.prix_max ?? ""} placeholder="300000" className="input" />
        </div>
        {full && (
          <>
            <div>
              <label className="label" htmlFor="f-prix-min">{t.search.priceMin}</label>
              <input id="f-prix-min" name="prix_min" type="number" inputMode="numeric" min={0} step={5000}
                defaultValue={filters.prix_min ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="f-transaction">{t.search.transaction}</label>
              <select id="f-transaction" name="transaction" defaultValue={filters.transaction ?? ""} className="input">
                <option value="">{t.search.all}</option>
                {TRANSACTIONS.map((x) => <option key={x} value={x}>{t.transactions[x]}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-chambres">{t.search.bedrooms}</label>
              <select id="f-chambres" name="chambres" defaultValue={filters.chambres ?? ""} className="input">
                <option value="">—</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="f-tri">{t.search.sort}</label>
              <select id="f-tri" name="tri" defaultValue={filters.tri ?? "recent"} className="input">
                <option value="recent">{t.search.sortRecent}</option>
                <option value="prix_asc">{t.search.sortPriceAsc}</option>
                <option value="prix_desc">{t.search.sortPriceDesc}</option>
              </select>
            </div>
          </>
        )}
      </div>
      {full && (
        <fieldset>
          <legend className="label">{t.search.amenities}</legend>
          <div className="flex flex-wrap gap-2">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 text-sm has-checked:border-brand-700 has-checked:bg-brand-50">
              <input type="checkbox" name="meuble" value="1" defaultChecked={!!filters.meuble} className="accent-brand-900" />
              {t.search.furnished}
            </label>
            {AMENITIES.map((a) => (
              <label key={a} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 text-sm has-checked:border-brand-700 has-checked:bg-brand-50">
                <input type="checkbox" name="equipements" value={a} defaultChecked={filters.equipements?.includes(a)} className="accent-brand-900" />
                {t.amenities[a]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex gap-2">
        <button type="submit" className={`${full ? "btn-primary" : "btn-gold"} flex-1 sm:flex-none sm:px-8`}>{t.search.submit}</button>
        {full && <a href="/annonces" className="btn-ghost">{t.search.reset}</a>}
      </div>
    </form>
  );
}
