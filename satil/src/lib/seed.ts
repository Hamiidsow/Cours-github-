// Données de RÉFÉRENCE (faits stables : noms, codes ISO, devises, ports) et jeu DEMO (fictif, marqué).
import type { Store, Row } from "./store";
import { today } from "./utils";

// Référentiel géographique du projet : 3 phases de déploiement.
const COUNTRIES = [
  { iso2: "SN", iso3: "SEN", name_fr: "Sénégal", name_en: "Senegal", name_zh: "塞内加尔", currency: "XOF", phase: 1, city: "Dakar", port: "Port autonome de Dakar", unlocode: "SNDKR" },
  { iso2: "CI", iso3: "CIV", name_fr: "Côte d'Ivoire", name_en: "Côte d'Ivoire", name_zh: "科特迪瓦", currency: "XOF", phase: 1, city: "Abidjan", port: "Port autonome d'Abidjan", unlocode: "CIABJ" },
  { iso2: "GN", iso3: "GIN", name_fr: "Guinée", name_en: "Guinea", name_zh: "几内亚", currency: "GNF", phase: 1, city: "Conakry", port: "Port autonome de Conakry", unlocode: "GNCKY" },
  { iso2: "GH", iso3: "GHA", name_fr: "Ghana", name_en: "Ghana", name_zh: "加纳", currency: "GHS", phase: 2, city: "Tema", port: "Port de Tema", unlocode: "GHTEM" },
  { iso2: "TG", iso3: "TGO", name_fr: "Togo", name_en: "Togo", name_zh: "多哥", currency: "XOF", phase: 2, city: "Lomé", port: "Port autonome de Lomé", unlocode: "TGLFW" },
  { iso2: "NG", iso3: "NGA", name_fr: "Nigeria", name_en: "Nigeria", name_zh: "尼日利亚", currency: "NGN", phase: 2, city: "Lagos", port: "Port de Lagos (Apapa)", unlocode: "NGAPP" },
  { iso2: "KE", iso3: "KEN", name_fr: "Kenya", name_en: "Kenya", name_zh: "肯尼亚", currency: "KES", phase: 3, city: "Mombasa", port: "Port de Mombasa", unlocode: "KEMBA" },
  { iso2: "ZA", iso3: "ZAF", name_fr: "Afrique du Sud", name_en: "South Africa", name_zh: "南非", currency: "ZAR", phase: 3, city: "Durban", port: "Port de Durban", unlocode: "ZADUR" },
  { iso2: "CG", iso3: "COG", name_fr: "Congo", name_en: "Congo", name_zh: "刚果（布）", currency: "XAF", phase: 3, city: "Pointe-Noire", port: "Port autonome de Pointe-Noire", unlocode: "CGPNR" },
];

export async function seedReference(store: Store) {
  if ((await store.list("countries")).length) return;
  const countries = await store.insert("countries", COUNTRIES.map(({ city, port, unlocode, ...c }) => c));
  const byIso = Object.fromEntries(countries.map((c) => [c.iso2, c.id]));
  const cities = await store.insert("cities", COUNTRIES.map((c) => ({ country_id: byIso[c.iso2], name: c.city, is_capital: ["Dakar", "Conakry", "Lomé"].includes(c.city) })));
  const cityBy = Object.fromEntries(cities.map((c) => [c.name, c.id]));
  await store.insert("ports", COUNTRIES.map((c) => ({ country_id: byIso[c.iso2], city_id: cityBy[c.city], name: c.port, unlocode: c.unlocode, port_type: "maritime" })));
  // Seul taux fourni d'office : la parité FIXE légale du franc CFA. Tous les autres taux sont à saisir, datés.
  const [src] = await store.insert("data_sources", [{
    name: "BCEAO — parité fixe du franc CFA", publisher: "Banque Centrale des États de l'Afrique de l'Ouest",
    source_type: "statistique_officielle", url: "https://www.bceao.int", notes: "1 EUR = 655,957 XOF depuis le 1er janvier 1999.",
  }]);
  await store.insert("exchange_rates", [{
    base_currency: "EUR", quote_currency: "XOF", rate: 655.957, rate_date: "1999-01-01", source_id: src.id,
    source_url: "https://www.bceao.int", method: "Parité fixe légale", confidence: "eleve", verification_status: "verifie",
    reference_period: "Depuis 1999", collected_at: today(),
  }]);
}

// ───────────────────────── Jeu DEMO ─────────────────────────
// Toutes les valeurs ci-dessous sont FICTIVES. Elles servent à découvrir l'outil, jamais à décider.
const D = "[DEMO] ";
const prov = (source_id: string, extra: Record<string, any> = {}) => ({
  is_demo: true, source_id, collected_at: today(), method: "Valeur fictive de démonstration",
  confidence: "faible", verification_status: "hypothese", ...extra,
});

export async function loadDemo(store: Store) {
  const countries = await store.list("countries");
  const c = (iso: string) => countries.find((x) => x.iso2 === iso)?.id;
  const [sn, ci, gn] = [c("SN"), c("CI"), c("GN")];
  if (!sn || !ci || !gn) throw new Error("Les pays SN, CI et GN doivent exister pour charger le jeu DEMO");
  const ports = await store.list("ports");
  const port = (id: string) => ports.find((p) => p.country_id === id)?.id;
  const demo = { is_demo: true };

  const [src] = await store.insert("data_sources", [{ ...demo, name: D + "Source fictive", publisher: "Aucune — exemple", source_type: "autre", notes: "Source inventée pour la démonstration. Ne correspond à aucune publication réelle." }]);
  const cats = await store.insert("product_categories", [
    { ...demo, name_fr: D + "Petit électroménager", name_en: D + "Small appliances", name_zh: D + "小家电" },
    { ...demo, name_fr: D + "Matériaux et quincaillerie", name_en: D + "Hardware", name_zh: D + "五金建材" },
  ]);
  const [hs1, hs2] = await store.insert("hs_codes", [
    { ...demo, code: "999901", description: D + "Code fictif n° 1" },
    { ...demo, code: "999902", description: D + "Code fictif n° 2" },
  ]);
  const prods = await store.insert("products", [
    { ...demo, sku: "DEMO-VENT-16", name_fr: D + "Ventilateur sur pied 16 pouces", name_en: D + "16-inch stand fan", name_zh: D + "16寸落地扇", category_id: cats[0].id, hs_code_id: hs1.id, unit: "pièce", unit_weight_kg: 5.5, unit_cbm: 0.06, status: "etude" },
    { ...demo, sku: "DEMO-BOUIL-18", name_fr: D + "Bouilloire électrique 1,8 L", name_en: D + "1.8 L electric kettle", name_zh: D + "1.8升电热水壶", category_id: cats[0].id, hs_code_id: hs1.id, unit: "pièce", unit_weight_kg: 0.9, unit_cbm: 0.008, status: "etude" },
    { ...demo, sku: "DEMO-CADEN-50", name_fr: D + "Cadenas laiton 50 mm", name_en: D + "50 mm brass padlock", name_zh: D + "50毫米铜挂锁", category_id: cats[1].id, hs_code_id: hs2.id, unit: "pièce", unit_weight_kg: 0.25, unit_cbm: 0.0004, status: "etude" },
  ]);
  const [fan, kettle, lock] = prods;

  const sups = await store.insert("suppliers", [
    { ...demo, name_en: D + "Fournisseur A (fictif)", name_zh: D + "示例供应商A", supplier_type: "usine", city: "Foshan", province: "Guangdong", pipeline_stage: "negociation", verification_status: "en_cours", categories: "Ventilateurs" },
    { ...demo, name_en: D + "Fournisseur B (fictif)", name_zh: D + "示例供应商B", supplier_type: "usine", city: "Shenzhen", province: "Guangdong", pipeline_stage: "echantillon", verification_status: "non_verifie", categories: "Petit électroménager" },
    { ...demo, name_en: D + "Fournisseur C (fictif)", name_zh: D + "示例供应商C", supplier_type: "trading", city: "Guangzhou", province: "Guangdong", pipeline_stage: "verification", verification_status: "non_verifie", categories: "Divers" },
    { ...demo, name_en: D + "Fournisseur D (fictif)", name_zh: D + "示例供应商D", supplier_type: "usine", city: "Linyi", province: "Shandong", pipeline_stage: "prospection", verification_status: "non_verifie", categories: "Quincaillerie" },
    { ...demo, name_en: D + "Fournisseur E (fictif)", name_zh: D + "示例供应商E", supplier_type: "usine", city: "Qingdao", province: "Shandong", pipeline_stage: "commande", verification_status: "verifie", verified_on: today(), categories: "Ventilateurs" },
  ]);
  const q = (s: number, p: Row, price: number, cur: string, inc: string, moq: number, lead: number) => ({
    ...demo, supplier_id: sups[s].id, product_id: p.id, quote_date: today(), incoterm: inc, incoterm_place: inc === "EXW" ? "Usine" : "Port chinois",
    unit_price: price, currency: cur, moq, lead_time_days: lead, sample_available: true, status: "recu", notes: "Devis fictif",
  });
  await store.insert("supplier_quotes", [
    q(0, fan, 11.2, "USD", "FOB", 500, 30), q(1, fan, 78, "CNY", "EXW", 300, 25), q(2, fan, 12.5, "USD", "FOB", 200, 20), q(4, fan, 10.6, "USD", "FOB", 1000, 35),
    q(1, kettle, 4.1, "USD", "FOB", 1000, 25), q(2, kettle, 4.6, "USD", "FOB", 500, 20), q(0, kettle, 27, "CNY", "EXW", 800, 30),
    q(3, lock, 1.15, "USD", "FOB", 5000, 30), q(2, lock, 1.4, "USD", "FOB", 2000, 15), q(4, lock, 7.4, "CNY", "EXW", 3000, 30),
  ]);

  const ind = (country_id: string, indicator_code: string, value: number, unit: string) =>
    ({ country_id, indicator_code, value, ...prov(src.id, { unit, reference_period: "DEMO" }) });
  await store.insert("market_indicators", [
    ind(sn, "population", 15_000_000, "hab."), ind(ci, "population", 25_000_000, "hab."), ind(gn, "population", 12_000_000, "hab."),
    ind(sn, "gdp_per_capita_usd", 1500, "USD"), ind(ci, "gdp_per_capita_usd", 2200, "USD"), ind(gn, "gdp_per_capita_usd", 1100, "USD"),
    ind(sn, "avg_duty_pct", 20, "%"), ind(ci, "avg_duty_pct", 20, "%"), ind(gn, "avg_duty_pct", 22, "%"),
    ind(sn, "port_dwell_days", 9, "jours"), ind(ci, "port_dwell_days", 11, "jours"), ind(gn, "port_dwell_days", 15, "jours"),
    ind(sn, "warehouse_rent_m2_month", 3500, "XOF/m²/mois"), ind(ci, "warehouse_rent_m2_month", 4000, "XOF/m²/mois"),
    ind(sn, "freight_40hq_usd", 3900, "USD"), ind(ci, "freight_40hq_usd", 3600, "USD"), ind(gn, "freight_40hq_usd", 4300, "USD"),
  ]);

  const obs = (country_id: string, p: Row, type: string, price: number, currency: string, days: number) => ({
    country_id, product_id: p.id, observed_on: new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), price_type: type, price,
    seller_name: D + "Commerçant fictif", location: D + "Marché fictif", ...prov(src.id, { currency, unit: "pièce" }),
  });
  await store.insert("price_observations", [
    obs(sn, fan, "gros", 14500, "XOF", 20), obs(sn, fan, "detail", 19000, "XOF", 20), obs(ci, fan, "gros", 15500, "XOF", 12), obs(ci, fan, "detail", 21000, "XOF", 12),
    obs(gn, fan, "gros", 215000, "GNF", 30), obs(gn, fan, "detail", 280000, "GNF", 30),
    obs(sn, kettle, "gros", 5200, "XOF", 18), obs(sn, kettle, "detail", 7500, "XOF", 18), obs(ci, kettle, "gros", 5600, "XOF", 9), obs(ci, kettle, "detail", 8000, "XOF", 9),
    obs(sn, lock, "gros", 1400, "XOF", 25), obs(ci, lock, "gros", 1550, "XOF", 14), obs(ci, lock, "detail", 2500, "XOF", 14),
  ]);

  const sv = (country_id: string, type: string, p: Row, vol: number, buy: number, sell: number, cur: string, intent: string, diff: string) => ({
    country_id, product_id: p.id, survey_date: today(), location: D + "Marché fictif", surveyor: D + "Enquêteur fictif",
    respondent_name: D + "Répondant fictif", respondent_type: type, consent_given: true, monthly_volume: vol, volume_unit: "pièce",
    buy_price: buy, sell_price: sell, current_supplier: D + "Importateur local fictif", difficulties: diff, purchase_intent: intent,
    ...prov(src.id, { currency: cur }),
  });
  await store.insert("field_surveys", [
    sv(sn, "grossiste", fan, 400, 14500, 16500, "XOF", "oui", "Ruptures fréquentes en saison chaude (exemple)"),
    sv(sn, "detaillant", kettle, 60, 5400, 7500, "XOF", "peut_etre", "Qualité irrégulière (exemple)"),
    sv(ci, "grossiste", fan, 650, 15500, 17800, "XOF", "oui", "Délais d'approvisionnement de 60 à 90 jours (exemple)"),
    sv(gn, "grossiste", lock, 3000, 16000, 20000, "GNF", "non", "Paiement comptant exigé par l'importateur (exemple)"),
  ]);
  await store.insert("competitors", [
    { country_id: sn, name: D + "Importateur fictif Alpha", competitor_type: "importateur", categories: "Électroménager", strengths: "Stock local (exemple)", weaknesses: "Prix élevés (exemple)", price_positioning: "Haut", ...prov(src.id) },
    { country_id: ci, name: D + "Grossiste fictif Bêta", competitor_type: "grossiste", categories: "Quincaillerie", strengths: "Réseau (exemple)", weaknesses: "Ruptures (exemple)", price_positioning: "Moyen", ...prov(src.id) },
  ]);
  await store.insert("customs_rules", [sn, ci, gn].map((country_id) => ({
    country_id, hs_code_id: hs1.id, duty_rate: 20, other_taxes_rate: 2.5, other_taxes_detail: "Taxes fictives regroupées", vat_rate: 18,
    legal_reference: D + "Référence fictive — à remplacer par le tarif douanier officiel", ...prov(src.id, { unit: "%" }),
  })));
  const fq = (country_id: string, mode: string, price: number, days: number) => ({
    origin_port: "Guangzhou (Nansha)", destination_port_id: port(country_id), mode, price, transit_days: days, carrier: D + "Transitaire fictif",
    quote_date: today(), ...prov(src.id, { currency: "USD", unit: mode === "LCL" ? "USD/m³" : "USD/conteneur" }),
  });
  await store.insert("freight_quotes", [
    fq(sn, "LCL", 95, 45), fq(sn, "20GP", 2300, 40), fq(sn, "40HQ", 3900, 40),
    fq(ci, "LCL", 90, 42), fq(ci, "20GP", 2100, 38), fq(ci, "40HQ", 3600, 38),
    fq(gn, "LCL", 110, 50), fq(gn, "40HQ", 4300, 45),
  ]);
  await store.insert("exchange_rates", [
    { base_currency: "USD", quote_currency: "XOF", rate: 600, rate_date: today(), ...prov(src.id) },
    { base_currency: "CNY", quote_currency: "XOF", rate: 83, rate_date: today(), ...prov(src.id) },
    { base_currency: "USD", quote_currency: "GNF", rate: 8600, rate_date: today(), ...prov(src.id) },
  ]);
}

/** Tables contenant potentiellement des lignes DEMO, dans l'ordre de suppression (enfants d'abord). */
export const DEMO_TABLES = [
  "financial_scenarios", "exchange_rates", "freight_quotes", "customs_rules", "competitors", "field_surveys",
  "price_observations", "market_indicators", "trade_flows", "supplier_quotes", "suppliers", "products", "hs_codes",
  "product_categories", "data_sources",
];
export async function purgeDemo(store: Store) {
  let n = 0;
  for (const t of DEMO_TABLES) {
    for (const r of (await store.list(t)).filter((x) => x.is_demo)) { await store.remove(t, r.id); n++; }
  }
  return n;
}
