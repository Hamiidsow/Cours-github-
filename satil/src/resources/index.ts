// Définition déclarative des ressources en CRUD. Une ressource = une table + ses champs.
// La page générique (components/ResourcePage.tsx) en déduit liste, formulaire, import, export, historique.
import type { WriteGroup } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";
import { CURRENCIES } from "@/lib/utils";

export type FieldType = "text" | "area" | "num" | "date" | "sel" | "ref" | "bool" | "url";
export interface Field {
  key: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  raw?: boolean;       // options affichées telles quelles (devises, incoterms)
  ref?: string;        // table référencée
  list?: boolean;      // colonne visible dans la liste
  money?: string;      // nom de la colonne devise associée
  byCountry?: boolean; // liste de référence filtrée par le pays choisi
  prov?: boolean;      // champ de provenance
  def?: string;        // valeur initiale à la création
}
export interface Resource {
  table: string;
  path: string;
  group: WriteGroup;
  fields: Field[];
  dedupe?: string[];   // clés du contrôle de doublons à l'import et à la saisie
  sourced?: boolean;   // donnée devant être sourcée (colonnes de provenance)
}

const t = (key: string, o: Partial<Field> = {}): Field => ({ key, type: "text", ...o });
const area = (key: string, o: Partial<Field> = {}): Field => ({ key, type: "area", ...o });
const num = (key: string, o: Partial<Field> = {}): Field => ({ key, type: "num", ...o });
const date = (key: string, o: Partial<Field> = {}): Field => ({ key, type: "date", ...o });
const sel = (key: string, options: readonly string[], o: Partial<Field> = {}): Field => ({ key, type: "sel", options, ...o });
const ref = (key: string, table: string, o: Partial<Field> = {}): Field => ({ key, type: "ref", ref: table, ...o });
const bool = (key: string, o: Partial<Field> = {}): Field => ({ key, type: "bool", ...o });
const cur = (key = "currency", o: Partial<Field> = {}): Field => sel(key, CURRENCIES, { raw: true, ...o });
const L = { list: true };
const R = { required: true, list: true };

export const CONFIDENCE = ["faible", "moyen", "eleve"] as const;
export const VERIFICATION = ["non_verifie", "verifie", "hypothese", "rejete"] as const;
export const INCOTERMS = ["EXW", "FOB", "CIF"] as const;
export const ORIGIN_PORTS = ["Qingdao", "Guangzhou (Nansha)", "Shenzhen (Yantian)", "Shanghai", "Ningbo", "Tianjin", "Xiamen"] as const;

/** Indicateurs proposés pour la comparaison de pays : code, unité habituelle, sens par défaut. */
export const INDICATORS: { code: string; unit: string; direction: "max" | "min" }[] = [
  { code: "population", unit: "hab.", direction: "max" },
  { code: "urban_population_pct", unit: "%", direction: "max" },
  { code: "gdp_usd", unit: "USD", direction: "max" },
  { code: "gdp_per_capita_usd", unit: "USD", direction: "max" },
  { code: "gdp_growth_pct", unit: "%", direction: "max" },
  { code: "inflation_pct", unit: "%", direction: "min" },
  { code: "imports_from_china_usd", unit: "USD", direction: "max" },
  { code: "import_market_usd", unit: "USD", direction: "max" },
  { code: "avg_duty_pct", unit: "%", direction: "min" },
  { code: "vat_pct", unit: "%", direction: "min" },
  { code: "port_dwell_days", unit: "jours", direction: "min" },
  { code: "customs_clearance_days", unit: "jours", direction: "min" },
  { code: "freight_40hq_usd", unit: "USD", direction: "min" },
  { code: "sea_transit_days", unit: "jours", direction: "min" },
  { code: "warehouse_rent_m2_month", unit: "devise/m²/mois", direction: "min" },
  { code: "fx_volatility_pct", unit: "%", direction: "min" },
  { code: "competition_intensity", unit: "1–5", direction: "min" },
  { code: "demand_score_survey", unit: "1–5", direction: "max" },
  { code: "regulatory_ease_score", unit: "1–5", direction: "max" },
  { code: "security_score", unit: "1–5", direction: "max" },
];

const PROV: Field[] = [
  ref("source_id", "data_sources", { prov: true }),
  t("source_url", { type: "url", prov: true }),
  date("collected_at", { prov: true }),
  t("reference_period", { prov: true }),
  t("method", { prov: true }),
  sel("confidence", CONFIDENCE, { prov: true, required: true }),
  sel("verification_status", VERIFICATION, { prov: true, required: true, list: true }),
];

export const RESOURCES: Record<string, Resource> = {
  countries: {
    table: "countries", path: "pays", group: "reference", dedupe: ["iso2"],
    fields: [t("name_fr", R), t("name_en", L), t("name_zh", L), t("iso2", L), t("iso3"), cur("currency", L), num("phase", L), area("notes")],
  },
  cities: {
    table: "cities", path: "villes", group: "reference", dedupe: ["country_id", "name"],
    fields: [ref("country_id", "countries", R), t("name", R), bool("is_capital", L), area("catchment_notes", L)],
  },
  ports: {
    table: "ports", path: "ports", group: "reference", dedupe: ["country_id", "name"],
    fields: [ref("country_id", "countries", R), ref("city_id", "cities", { byCountry: true, list: true }), t("name", R), t("unlocode", L),
      sel("port_type", ["maritime", "sec", "aeroport"], { ...R, def: "maritime" }), area("notes")],
  },
  product_categories: {
    table: "product_categories", path: "categories", group: "reference", dedupe: ["name_fr"],
    fields: [t("name_fr", R), t("name_en", L), t("name_zh", L), ref("parent_id", "product_categories", L)],
  },
  hs_codes: {
    table: "hs_codes", path: "codes-hs", group: "reference", dedupe: ["code"],
    fields: [t("code", R), area("description", L)],
  },
  products: {
    table: "products", path: "produits", group: "reference", dedupe: ["sku"],
    fields: [t("sku", L), t("name_fr", R), t("name_en"), t("name_zh", L), ref("category_id", "product_categories", L), ref("hs_code_id", "hs_codes", L),
      t("unit", { required: true, def: "pièce" }), num("unit_weight_kg"), num("unit_cbm"), sel("status", ["etude", "retenu", "ecarte"], { ...R, def: "etude" }), area("description")],
  },
  suppliers: {
    table: "suppliers", path: "fournisseurs", group: "sourcing", dedupe: ["name_en"],
    fields: [t("name_en", R), t("name_zh", L), sel("supplier_type", ["usine", "trading", "grossiste", "agent"], { ...R, def: "usine" }), t("city", L), t("province", L),
      sel("pipeline_stage", ["prospection", "verification", "echantillon", "negociation", "commande", "inspection", "expedition", "ecarte"], { ...R, def: "prospection" }),
      sel("verification_status", ["non_verifie", "en_cours", "verifie", "rejete"], { ...R, def: "non_verifie" }), date("verified_on"),
      t("contact_name"), t("contact_email"), t("contact_phone"), t("wechat"), t("website", { type: "url" }),
      t("business_license"), t("certifications"), t("categories"), t("capacity"), area("notes")],
  },
  supplier_quotes: {
    table: "supplier_quotes", path: "devis-fournisseurs", group: "sourcing", dedupe: ["supplier_id", "product_id", "quote_date", "incoterm"],
    fields: [ref("supplier_id", "suppliers", R), ref("product_id", "products", R), date("quote_date", R), date("valid_until"),
      sel("incoterm", INCOTERMS, { raw: true, required: true, list: true }), t("incoterm_place"), num("unit_price", { required: true, list: true, money: "currency" }),
      cur("currency", { required: true }), num("moq", L), num("lead_time_days", L), bool("sample_available"), num("sample_cost"), t("payment_terms"),
      sel("status", ["recu", "retenu", "rejete", "expire"], { ...R, def: "recu" }), area("notes")],
  },
  data_sources: {
    table: "data_sources", path: "sources", group: "market", dedupe: ["name"],
    fields: [t("name", R), t("publisher", L),
      sel("source_type", ["statistique_officielle", "douane", "organisation_internationale", "enquete_terrain", "fournisseur", "transitaire", "presse", "interne", "autre"], { ...R, def: "autre" }),
      t("url", { type: "url", list: true }), t("license"), area("notes")],
  },
  market_indicators: {
    table: "market_indicators", path: "indicateurs", group: "market", sourced: true, dedupe: ["country_id", "indicator_code", "reference_period"],
    fields: [ref("country_id", "countries", R), sel("indicator_code", INDICATORS.map((i) => i.code), R), num("value", L), t("unit", L), t("value_text"),
      ref("city_id", "cities", { byCountry: true }), ref("category_id", "product_categories"), ref("product_id", "products"), area("notes"),
      ...PROV.map((f) => (f.key === "reference_period" ? { ...f, list: true } : f))],
  },
  price_observations: {
    table: "price_observations", path: "prix", group: "market", sourced: true, dedupe: ["country_id", "product_id", "observed_on", "price_type", "seller_name"],
    fields: [ref("country_id", "countries", R), ref("city_id", "cities", { byCountry: true }), ref("product_id", "products", R), date("observed_on", R),
      sel("price_type", ["gros", "detail"], R), num("price", { required: true, list: true, money: "currency" }), cur("currency", { required: true }), t("unit"),
      t("seller_name"), t("location"), area("notes"), ...PROV],
  },
  field_surveys: {
    table: "field_surveys", path: "enquetes", group: "market", sourced: true, dedupe: ["country_id", "survey_date", "respondent_name", "product_id"],
    fields: [ref("country_id", "countries", R), ref("city_id", "cities", { byCountry: true }), date("survey_date", R), t("location", L), t("surveyor"),
      t("respondent_name", L), sel("respondent_type", ["grossiste", "detaillant", "autre"], R), t("respondent_contact"), bool("consent_given"),
      ref("category_id", "product_categories"), ref("product_id", "products", L), num("monthly_volume", L), t("volume_unit"),
      num("buy_price", { money: "currency" }), num("sell_price", { money: "currency" }), cur(), t("current_supplier"), area("difficulties"),
      sel("purchase_intent", ["oui", "peut_etre", "non"], L), area("notes"), ...PROV],
  },
  competitors: {
    table: "competitors", path: "concurrents", group: "market", sourced: true, dedupe: ["country_id", "name"],
    fields: [ref("country_id", "countries", R), ref("city_id", "cities", { byCountry: true }), t("name", R),
      sel("competitor_type", ["importateur", "grossiste", "distributeur", "plateforme", "autre"], L), t("categories", L), area("strengths"), area("weaknesses"),
      t("price_positioning", L), area("notes"), ...PROV],
  },
  trade_flows: {
    table: "trade_flows", path: "flux", group: "market", sourced: true, dedupe: ["country_id", "hs_code_id", "partner", "flow", "year"],
    fields: [ref("country_id", "countries", R), ref("hs_code_id", "hs_codes", L), t("partner", { ...R, def: "Chine" }), sel("flow", ["import", "export"], { ...R, def: "import" }), num("year", R),
      num("value_usd", L), num("quantity", L), t("unit"), area("notes"), ...PROV],
  },
  customs_rules: {
    table: "customs_rules", path: "douane", group: "market", sourced: true, dedupe: ["country_id", "hs_code_id", "valid_from"],
    fields: [ref("country_id", "countries", R), ref("hs_code_id", "hs_codes", L), num("duty_rate", L), num("other_taxes_rate", L), t("other_taxes_detail"),
      num("vat_rate", L), date("valid_from"), date("valid_to"), t("legal_reference", L), area("notes"), ...PROV],
  },
  freight_quotes: {
    table: "freight_quotes", path: "fret", group: "freight", sourced: true, dedupe: ["origin_port", "destination_port_id", "mode", "quote_date", "carrier"],
    fields: [sel("origin_port", ORIGIN_PORTS, { raw: true, required: true, list: true }), ref("destination_port_id", "ports", R),
      sel("mode", ["LCL", "20GP", "40GP", "40HQ", "AIR"], { raw: true, required: true, list: true }), num("price", { required: true, list: true, money: "currency" }),
      cur("currency", { required: true }), t("unit"), num("transit_days", L), t("carrier"), date("quote_date", R), date("valid_until"), area("notes"), ...PROV],
  },
  exchange_rates: {
    table: "exchange_rates", path: "taux", group: "finance", sourced: true, dedupe: ["base_currency", "quote_currency", "rate_date"],
    fields: [cur("base_currency", R), cur("quote_currency", R), num("rate", R), date("rate_date", R), area("notes"), ...PROV],
  },
};

/** Libellé d'une ligne référencée. */
export function refLabel(table: string, row: Record<string, any> | undefined, locale: Locale): string {
  if (!row) return "";
  const loc = row["name_" + locale] || row.name_fr || row.name_en;
  switch (table) {
    case "countries": case "product_categories": return loc ?? "";
    case "products": return loc ?? "";
    case "hs_codes": return row.code + (row.description ? " — " + String(row.description).slice(0, 40) : "");
    case "suppliers": return row.name_en + (row.name_zh ? ` (${row.name_zh})` : "");
    default: return row.name ?? row.reference ?? row.id;
  }
}
/** Autres valeurs acceptées à l'import pour désigner une ligne référencée (ISO, SKU, code HS…). */
export function refAliases(table: string, row: Record<string, any>): string[] {
  return [row.id, row.name, row.name_fr, row.name_en, row.name_zh, row.iso2, row.iso3, row.sku, row.code, row.unlocode]
    .filter((v) => typeof v === "string" && v).map((v) => String(v).trim().toLowerCase());
}
