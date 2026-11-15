// Moteur de calcul SATIL — fonctions pures, sans dépendance, testées (tests/finance.test.ts).
// Tous les taux sont des fractions (0,18 = 18 %). Les montants "locaux" sont dans la devise de vente.

export type Incoterm = "EXW" | "FOB" | "CIF";

export interface LandedInput {
  incoterm: Incoterm;
  unitPrice: number;        // prix d'achat unitaire, devise d'achat
  quantity: number;         // unités achetées
  fxRate: number;           // 1 unité de devise d'achat = fxRate devise locale
  originCosts: number;      // EXW → FOB (pré-acheminement, frais export), devise d'achat ; ignoré hors EXW
  freight: number;          // fret principal total, devise du fret ; ignoré en CIF
  freightFxRate: number;    // 1 unité de devise du fret = freightFxRate devise locale
  insuranceRate: number;    // assurance, fraction de (FOB + fret) ; ignorée en CIF
  dutyRate: number;         // droit de douane, fraction de la valeur CAF
  otherTaxesRate: number;   // autres taxes NON récupérables, fraction de la valeur CAF
  vatRate: number;          // TVA à l'import, assise sur CAF + droits + autres taxes
  vatRecoverableShare: number; // part de TVA récupérable (1 = assujetti, 0 = TVA = coût définitif)
  transitFees: number;      // honoraires transitaire / dédouanement (local)
  portHandling: number;     // manutention, acconage, frais portuaires (local)
  inlandTransport: number;  // transport port → entrepôt (local)
  storage: number;          // stockage imputé à l'opération (local)
  distribution: number;     // distribution / livraison clients (local)
  otherCosts: number;       // autres frais locaux
  lossRate: number;         // casse, vol, invendus : fraction des unités
  commissionRate: number;   // commissions de vente, fraction du CA HT
  salePrice: number | null; // prix de vente unitaire HT (local) ; null = utiliser le prix suggéré
  targetMarkRate: number;   // taux de marque visé (marge / prix de vente HT), pour le prix suggéré
  fixedCosts: number;       // charges fixes imputées à l'opération (local)
  monthlyUnits: number;     // ventes mensuelles prévues (unités) — pour le BFR
  customerDays: number;     // délai de paiement clients (jours)
  supplierDays: number;     // délai de paiement fournisseur (jours)
  stockDays: number;        // rotation du stock (jours de vente en stock)
}

export interface LandedResult {
  goodsLocal: number;       // marchandise convertie
  fobLocal: number;         // valeur FOB (marchandise + frais d'origine)
  freightLocal: number;
  insuranceLocal: number;
  cif: number;              // valeur CAF = assiette douanière
  duty: number;
  otherTaxes: number;
  vatPaid: number;          // TVA décaissée à l'import
  vatRecoverable: number;   // avance de trésorerie, PAS un coût
  vatNonRecoverable: number;// coût définitif
  localCosts: number;
  landedTotal: number;      // coût de revient rendu entrepôt (hors TVA récupérable)
  cashOutlay: number;       // décaissement total, TVA récupérable incluse
  sellableUnits: number;
  unitCost: number | null;  // coût de revient par unité vendable
  suggestedPrice: number | null;
  price: number | null;     // prix retenu (saisi, sinon suggéré)
  revenue: number;
  commissions: number;
  grossMargin: number;      // CA HT − coût de revient
  markRate: number | null;  // taux de marque = marge / CA
  markupRate: number | null;// taux de marge = marge / coût de revient
  netResult: number;        // marge − commissions − charges fixes
  unitContribution: number | null;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  bfr: { stock: number; receivables: number; payables: number; total: number } | null;
}

const nz = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const div = (a: number, b: number): number | null => (b > 0 && Number.isFinite(a / b) ? a / b : null);

export function computeLanded(i: LandedInput): LandedResult {
  const goodsLocal = nz(i.unitPrice) * nz(i.quantity) * nz(i.fxRate);
  const origin = i.incoterm === "EXW" ? nz(i.originCosts) * nz(i.fxRate) : 0;
  const fobLocal = goodsLocal + origin;
  // En CIF, fret et assurance sont déjà dans le prix du fournisseur.
  const freightLocal = i.incoterm === "CIF" ? 0 : nz(i.freight) * nz(i.freightFxRate);
  const insuranceLocal = i.incoterm === "CIF" ? 0 : (fobLocal + freightLocal) * nz(i.insuranceRate);
  const cif = fobLocal + freightLocal + insuranceLocal;

  const duty = cif * nz(i.dutyRate);
  const otherTaxes = cif * nz(i.otherTaxesRate);
  const vatPaid = (cif + duty + otherTaxes) * nz(i.vatRate);
  const share = Math.min(1, Math.max(0, nz(i.vatRecoverableShare)));
  const vatRecoverable = vatPaid * share;
  const vatNonRecoverable = vatPaid - vatRecoverable;

  const localCosts = nz(i.transitFees) + nz(i.portHandling) + nz(i.inlandTransport) + nz(i.storage) + nz(i.distribution) + nz(i.otherCosts);
  const landedTotal = cif + duty + otherTaxes + vatNonRecoverable + localCosts;
  const cashOutlay = landedTotal + vatRecoverable;

  const sellableUnits = nz(i.quantity) * (1 - Math.min(1, Math.max(0, nz(i.lossRate))));
  const unitCost = div(landedTotal, sellableUnits);

  const denom = 1 - nz(i.targetMarkRate);
  const suggestedPrice = unitCost !== null && denom > 0 ? unitCost / denom : null;
  const price = i.salePrice !== null && nz(i.salePrice) > 0 ? nz(i.salePrice) : suggestedPrice;

  const revenue = price !== null ? price * sellableUnits : 0;
  const commissions = revenue * nz(i.commissionRate);
  const grossMargin = price !== null ? revenue - landedTotal : 0;
  const markRate = price !== null ? div(grossMargin, revenue) ?? (revenue > 0 ? grossMargin / revenue : null) : null;
  const markupRate = price !== null && landedTotal > 0 ? grossMargin / landedTotal : null;
  const netResult = grossMargin - commissions - nz(i.fixedCosts);

  const unitContribution = price !== null && unitCost !== null ? price * (1 - nz(i.commissionRate)) - unitCost : null;
  const breakEvenUnits = unitContribution !== null && unitContribution > 0 ? nz(i.fixedCosts) / unitContribution : null;
  const breakEvenRevenue = breakEvenUnits !== null && price !== null ? breakEvenUnits * price : null;

  let bfr: LandedResult["bfr"] = null;
  if (price !== null && unitCost !== null && nz(i.monthlyUnits) > 0) {
    const perDay = nz(i.monthlyUnits) / 30;
    const stock = nz(i.stockDays) * perDay * unitCost;
    // Créances clients TTC : le client doit la TVA collectée.
    const receivables = nz(i.customerDays) * perDay * price * (1 + nz(i.vatRate));
    // Dette fournisseur : sur la seule marchandise (le fret et la douane se paient comptant).
    const unitPurchaseLocal = nz(i.unitPrice) * nz(i.fxRate);
    const payables = nz(i.supplierDays) * perDay * unitPurchaseLocal;
    bfr = { stock, receivables, payables, total: stock + receivables - payables };
  }

  return {
    goodsLocal, fobLocal, freightLocal, insuranceLocal, cif, duty, otherTaxes, vatPaid, vatRecoverable,
    vatNonRecoverable, localCosts, landedTotal, cashOutlay, sellableUnits, unitCost, suggestedPrice, price,
    revenue, commissions, grossMargin, markRate: price !== null && revenue > 0 ? grossMargin / revenue : markRate,
    markupRate, netResult, unitContribution, breakEvenUnits, breakEvenRevenue, bfr,
  };
}

// ───────────── Scénarios ─────────────
export interface ScenarioShift {
  fxPct: number;       // variation du taux de change (positif = la devise locale se déprécie)
  freightPct: number;  // variation du fret
  pricePct: number;    // variation du prix de vente
  volumePct: number;   // variation des ventes mensuelles
  lossPts: number;     // points de pertes ajoutés (0,02 = +2 points)
}
export const DEFAULT_SHIFTS: Record<"pessimiste" | "central" | "optimiste", ScenarioShift> = {
  pessimiste: { fxPct: 0.1, freightPct: 0.25, pricePct: -0.1, volumePct: -0.2, lossPts: 0.02 },
  central: { fxPct: 0, freightPct: 0, pricePct: 0, volumePct: 0, lossPts: 0 },
  optimiste: { fxPct: -0.05, freightPct: -0.1, pricePct: 0.05, volumePct: 0.1, lossPts: 0 },
};

/** Applique un scénario. Le prix de référence est le prix du cas central (saisi ou suggéré). */
export function applyScenario(base: LandedInput, s: ScenarioShift): LandedInput {
  const central = computeLanded(base);
  return {
    ...base,
    fxRate: base.fxRate * (1 + s.fxPct),
    freightFxRate: base.freightFxRate * (1 + s.fxPct),
    freight: base.freight * (1 + s.freightPct),
    salePrice: central.price !== null ? central.price * (1 + s.pricePct) : null,
    monthlyUnits: base.monthlyUnits * (1 + s.volumePct),
    lossRate: Math.min(1, Math.max(0, base.lossRate + s.lossPts)),
  };
}

// ───────────── Groupage (LCL) contre conteneur complet (FCL) ─────────────
export type ContainerType = "20GP" | "40GP" | "40HQ";
/** Capacités NOMINALES usuelles (volume intérieur m³, charge utile kg). Indicatives et modifiables :
 *  la charge réelle dépend de l'armateur, du colisage et des limites routières du pays. */
export const CONTAINER_SPECS: Record<ContainerType, { cbm: number; payloadKg: number }> = {
  "20GP": { cbm: 33, payloadKg: 28000 },
  "40GP": { cbm: 67, payloadKg: 26500 },
  "40HQ": { cbm: 76, payloadKg: 26500 },
};

export interface FreightCompareInput {
  cbm: number;
  weightKg: number;
  lclRatePerWM: number | null;   // prix par unité payante (max de m³ et tonnes)
  lclMinimum: number;            // minimum de perception
  fclRates: Partial<Record<ContainerType, number | null>>; // prix par conteneur
  fillRate: number;              // taux de remplissage réaliste (0,85 par défaut)
  specs?: Record<ContainerType, { cbm: number; payloadKg: number }>;
}
export interface FreightOption {
  mode: "LCL" | ContainerType;
  count: number;          // nombre de conteneurs (1 pour LCL)
  cost: number;
  costPerCbm: number | null;
  utilization: number | null; // part du volume utile occupée
}
export function compareFreight(i: FreightCompareInput): { options: FreightOption[]; best: FreightOption | null } {
  const options: FreightOption[] = [];
  const cbm = nz(i.cbm), kg = nz(i.weightKg);
  if (cbm <= 0 && kg <= 0) return { options, best: null };
  if (i.lclRatePerWM !== null && nz(i.lclRatePerWM) > 0) {
    const wm = Math.max(cbm, kg / 1000);
    const cost = Math.max(wm * nz(i.lclRatePerWM), nz(i.lclMinimum));
    options.push({ mode: "LCL", count: 1, cost, costPerCbm: div(cost, cbm), utilization: null });
  }
  const specs = i.specs ?? CONTAINER_SPECS;
  const fill = i.fillRate > 0 && i.fillRate <= 1 ? i.fillRate : 0.85;
  (Object.keys(specs) as ContainerType[]).forEach((type) => {
    const rate = i.fclRates[type];
    if (rate === null || rate === undefined || !(rate > 0)) return;
    const usable = specs[type].cbm * fill;
    const count = Math.max(1, Math.ceil(Math.max(cbm / usable, kg / specs[type].payloadKg) - 1e-9));
    const cost = count * rate;
    options.push({ mode: type, count, cost, costPerCbm: div(cost, cbm), utilization: div(cbm, count * usable) });
  });
  const best = options.length ? options.reduce((a, b) => (b.cost < a.cost ? b : a)) : null;
  return { options, best };
}

// ───────────── Indicateurs d'investissement (module Business plan) ─────────────
/** VAN : flows[0] est le flux initial (souvent négatif), période 0. */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, f, t) => acc + f / Math.pow(1 + rate, t), 0);
}
/** TRI par dichotomie ; null s'il n'existe pas de changement de signe sur [-99 %, +1000 %]. */
export function irr(flows: number[]): number | null {
  let lo = -0.99, hi = 10;
  let fLo = npv(lo, flows), fHi = npv(hi, flows);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2, fMid = npv(mid, flows);
    if (Math.abs(fMid) < 1e-9) return mid;
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (lo + hi) / 2;
}
/** Délai de récupération (en périodes, interpolé) ; null si jamais récupéré. */
export function paybackPeriod(flows: number[]): number | null {
  let cum = 0;
  for (let t = 0; t < flows.length; t++) {
    const prev = cum;
    cum += flows[t];
    if (cum >= 0 && t > 0) return flows[t] !== 0 ? t - 1 + -prev / flows[t] : t;
    if (cum >= 0 && t === 0) return 0;
  }
  return null;
}
/** ROI simple = gain net / mise initiale. */
export function roi(totalGain: number, invested: number): number | null {
  return invested > 0 ? (totalGain - invested) / invested : null;
}

// ───────────── Conversion de devises à partir de taux datés ─────────────
export interface RateRow { base_currency: string; quote_currency: string; rate: number; rate_date: string; is_demo?: boolean; verification_status?: string }
export interface RateHit { rate: number; date: string; inverse: boolean; row: RateRow }
/** Taux le plus récent (direct ou inverse) à la date demandée. Ne triangule pas, n'invente rien. */
export function findRate(rates: RateRow[], from: string, to: string, onOrBefore?: string): RateHit | null {
  if (from === to) return { rate: 1, date: "", inverse: false, row: { base_currency: from, quote_currency: to, rate: 1, rate_date: "" } };
  let best: RateHit | null = null;
  for (const r of rates) {
    if (r.verification_status === "rejete") continue;
    if (onOrBefore && r.rate_date > onOrBefore) continue;
    let hit: RateHit | null = null;
    if (r.base_currency === from && r.quote_currency === to) hit = { rate: Number(r.rate), date: r.rate_date, inverse: false, row: r };
    else if (r.base_currency === to && r.quote_currency === from && Number(r.rate) > 0) hit = { rate: 1 / Number(r.rate), date: r.rate_date, inverse: true, row: r };
    if (hit && (!best || hit.date > best.date)) best = hit;
  }
  return best;
}
