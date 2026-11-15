import { describe, expect, it } from "vitest";
import {
  applyScenario, compareFreight, computeLanded, DEFAULT_SHIFTS, findRate, irr, npv, paybackPeriod, roi,
  type LandedInput,
} from "@/lib/finance";
import { scoreCountries } from "@/lib/scoring";

// Cas de référence calculé à la main (valeurs volontairement rondes, sans rapport avec un marché réel).
const base: LandedInput = {
  incoterm: "FOB", unitPrice: 10, quantity: 1000, fxRate: 600,
  originCosts: 0, freight: 2000, freightFxRate: 600, insuranceRate: 0.005,
  dutyRate: 0.2, otherTaxesRate: 0.025, vatRate: 0.18, vatRecoverableShare: 1,
  transitFees: 150000, portHandling: 100000, inlandTransport: 50000, storage: 0, distribution: 0, otherCosts: 0,
  lossRate: 0.02, commissionRate: 0.03, salePrice: 12000, targetMarkRate: 0.25, fixedCosts: 500000,
  monthlyUnits: 490, customerDays: 30, supplierDays: 0, stockDays: 60,
};

describe("coût de revient rendu entrepôt", () => {
  const r = computeLanded(base);
  it("valeur CAF = FOB + fret + assurance", () => {
    expect(r.fobLocal).toBe(6_000_000);
    expect(r.freightLocal).toBe(1_200_000);
    expect(r.insuranceLocal).toBeCloseTo(36_000, 6);
    expect(r.cif).toBeCloseTo(7_236_000, 6);
  });
  it("droits et taxes assis sur la valeur CAF, TVA sur CAF + droits + taxes", () => {
    expect(r.duty).toBeCloseTo(1_447_200, 6);
    expect(r.otherTaxes).toBeCloseTo(180_900, 6);
    expect(r.vatPaid).toBeCloseTo((7_236_000 + 1_447_200 + 180_900) * 0.18, 6);
  });
  it("la TVA récupérable n'est pas un coût mais un décaissement", () => {
    expect(r.vatNonRecoverable).toBe(0);
    expect(r.landedTotal).toBeCloseTo(7_236_000 + 1_447_200 + 180_900 + 300_000, 6);
    expect(r.cashOutlay).toBeCloseTo(r.landedTotal + r.vatPaid, 6);
  });
  it("la TVA non récupérable devient un coût définitif", () => {
    const r2 = computeLanded({ ...base, vatRecoverableShare: 0 });
    expect(r2.landedTotal).toBeCloseTo(r.landedTotal + r.vatPaid, 6);
    expect(r2.cashOutlay).toBeCloseTo(r2.landedTotal, 6);
  });
  it("coût unitaire sur les unités vendables (pertes déduites)", () => {
    expect(r.sellableUnits).toBe(980);
    expect(r.unitCost).toBeCloseTo(9_164_100 / 980, 6);
  });
  it("marge brute, taux de marque, taux de marge, résultat net", () => {
    expect(r.revenue).toBe(11_760_000);
    expect(r.grossMargin).toBeCloseTo(11_760_000 - 9_164_100, 6);
    expect(r.markRate).toBeCloseTo(2_595_900 / 11_760_000, 9);
    expect(r.markupRate).toBeCloseTo(2_595_900 / 9_164_100, 9);
    expect(r.netResult).toBeCloseTo(2_595_900 - 352_800 - 500_000, 6);
  });
  it("seuil de rentabilité = charges fixes / contribution unitaire", () => {
    const contrib = 12000 * 0.97 - 9_164_100 / 980;
    expect(r.unitContribution).toBeCloseTo(contrib, 6);
    expect(r.breakEvenUnits).toBeCloseTo(500_000 / contrib, 6);
    expect(r.breakEvenRevenue).toBeCloseTo((500_000 / contrib) * 12000, 4);
  });
  it("prix suggéré : atteint exactement le taux de marque visé", () => {
    const s = computeLanded({ ...base, salePrice: null });
    expect(s.suggestedPrice).toBeCloseTo((9_164_100 / 980) / 0.75, 6);
    expect(s.markRate).toBeCloseTo(0.25, 9);
  });
  it("EXW ajoute les frais d'origine ; CIF ignore fret et assurance", () => {
    const exw = computeLanded({ ...base, incoterm: "EXW", originCosts: 500 });
    expect(exw.fobLocal).toBe(6_300_000);
    const cif = computeLanded({ ...base, incoterm: "CIF" });
    expect(cif.cif).toBe(6_000_000);
    expect(cif.freightLocal).toBe(0);
  });
  it("BFR = stock + créances TTC − dettes fournisseur", () => {
    const perDay = 490 / 30;
    expect(r.bfr!.stock).toBeCloseTo(60 * perDay * (9_164_100 / 980), 4);
    expect(r.bfr!.receivables).toBeCloseTo(30 * perDay * 12000 * 1.18, 4);
    expect(r.bfr!.payables).toBe(0);
    const withCredit = computeLanded({ ...base, supplierDays: 30 });
    expect(withCredit.bfr!.total).toBeCloseTo(r.bfr!.total - 30 * perDay * 6000, 4);
  });
  it("entrées vides ou nulles : pas de NaN, résultat 'non calculable'", () => {
    const z = computeLanded({ ...base, quantity: 0 });
    expect(z.unitCost).toBeNull();
    expect(z.suggestedPrice).toBeNull();
    expect(Number.isNaN(z.netResult)).toBe(false);
    expect(computeLanded({ ...base, salePrice: 1 }).breakEvenUnits).toBeNull(); // vente à perte : pas de seuil
  });
});

describe("scénarios", () => {
  it("le scénario central ne change rien", () => {
    const c = computeLanded(applyScenario(base, DEFAULT_SHIFTS.central));
    expect(c.netResult).toBeCloseTo(computeLanded(base).netResult, 6);
  });
  it("pessimiste < central < optimiste", () => {
    const p = computeLanded(applyScenario(base, DEFAULT_SHIFTS.pessimiste)).netResult;
    const c = computeLanded(base).netResult;
    const o = computeLanded(applyScenario(base, DEFAULT_SHIFTS.optimiste)).netResult;
    expect(p).toBeLessThan(c);
    expect(c).toBeLessThan(o);
  });
  it("une dépréciation de 10 % renchérit marchandise et fret de 10 %", () => {
    const d = computeLanded(applyScenario(base, { fxPct: 0.1, freightPct: 0, pricePct: 0, volumePct: 0, lossPts: 0 }));
    expect(d.cif).toBeCloseTo(7_236_000 * 1.1, 4);
  });
});

describe("groupage contre conteneur complet", () => {
  const rates = { "20GP": 2000, "40GP": 3500, "40HQ": 3700 };
  it("petit volume : le groupage est moins cher", () => {
    const { best, options } = compareFreight({ cbm: 5, weightKg: 1500, lclRatePerWM: 90, lclMinimum: 100, fclRates: rates, fillRate: 0.85 });
    expect(options.find((o) => o.mode === "LCL")!.cost).toBe(450);
    expect(best!.mode).toBe("LCL");
  });
  it("le groupage facture l'unité payante (tonne si plus lourd que volumineux)", () => {
    const { options } = compareFreight({ cbm: 2, weightKg: 6000, lclRatePerWM: 100, lclMinimum: 0, fclRates: {}, fillRate: 0.85 });
    expect(options[0].cost).toBe(600);
  });
  it("nombre de conteneurs selon le volume utile et la charge utile", () => {
    const { options, best } = compareFreight({ cbm: 60, weightKg: 12000, lclRatePerWM: 90, lclMinimum: 0, fclRates: rates, fillRate: 0.85 });
    expect(options.find((o) => o.mode === "20GP")!.count).toBe(3);  // 60 / (33 × 0,85) = 2,14
    expect(options.find((o) => o.mode === "40HQ")!.count).toBe(1);  // 60 / 64,6
    expect(options.find((o) => o.mode === "40GP")!.count).toBe(2);  // 60 / 56,95
    expect(best!.mode).toBe("40HQ");
    const heavy = compareFreight({ cbm: 10, weightKg: 60000, lclRatePerWM: null, lclMinimum: 0, fclRates: { "20GP": 2000 }, fillRate: 0.85 });
    expect(heavy.options[0].count).toBe(3); // 60 t / 28 t
  });
  it("aucun tarif saisi : aucune option, rien d'inventé", () => {
    expect(compareFreight({ cbm: 10, weightKg: 100, lclRatePerWM: null, lclMinimum: 0, fclRates: {}, fillRate: 0.85 }).best).toBeNull();
  });
});

describe("VAN, TRI, délai de récupération, ROI", () => {
  it("VAN", () => {
    expect(npv(0.1, [-1000, 500, 500, 500])).toBeCloseTo(243.426, 3);
    expect(npv(0, [-100, 60, 60])).toBe(20);
  });
  it("TRI : annule la VAN", () => {
    const r = irr([-1000, 500, 500, 500])!;
    expect(r).toBeCloseTo(0.2337, 3);
    expect(npv(r, [-1000, 500, 500, 500])).toBeCloseTo(0, 5);
    expect(irr([-100, 110])).toBeCloseTo(0.1, 6);
    expect(irr([100, 100])).toBeNull();
  });
  it("délai de récupération interpolé", () => {
    expect(paybackPeriod([-1000, 400, 400, 400])).toBeCloseTo(2.5, 9);
    expect(paybackPeriod([-1000, 100, 100])).toBeNull();
  });
  it("ROI", () => {
    expect(roi(1500, 1000)).toBe(0.5);
    expect(roi(100, 0)).toBeNull();
  });
});

describe("taux de change datés", () => {
  const rates = [
    { base_currency: "USD", quote_currency: "XOF", rate: 600, rate_date: "2026-01-01" },
    { base_currency: "USD", quote_currency: "XOF", rate: 610, rate_date: "2026-03-01" },
    { base_currency: "EUR", quote_currency: "XOF", rate: 655.957, rate_date: "1999-01-01" },
  ];
  it("prend le taux le plus récent, direct ou inverse, sans trianguler", () => {
    expect(findRate(rates, "USD", "XOF")!.rate).toBe(610);
    expect(findRate(rates, "USD", "XOF", "2026-02-01")!.rate).toBe(600);
    expect(findRate(rates, "XOF", "EUR")!.rate).toBeCloseTo(1 / 655.957, 9);
    expect(findRate(rates, "CNY", "XOF")).toBeNull();
    expect(findRate(rates, "XOF", "XOF")!.rate).toBe(1);
  });
});

describe("score d'attractivité", () => {
  const crit = [
    { code: "pop", weight: 2, direction: "max" as const },
    { code: "cout", weight: 1, direction: "min" as const },
  ];
  it("normalise entre pays et pondère", () => {
    const s = scoreCountries(["a", "b", "c"], crit, { a: { pop: 10, cout: 5 }, b: { pop: 20, cout: 10 }, c: { pop: 15, cout: 5 } });
    const by = Object.fromEntries(s.map((x) => [x.countryId, x]));
    expect(by.a.score).toBeCloseTo(((0 * 2 + 1 * 1) / 3) * 100, 6);
    expect(by.b.score).toBeCloseTo(((1 * 2 + 0 * 1) / 3) * 100, 6);
    expect(by.c.score).toBeCloseTo(((0.5 * 2 + 1 * 1) / 3) * 100, 6);
    expect(by.b.rank).toBe(1);
    expect(by.c.rank).toBe(1);
  });
  it("une donnée absente n'est pas imputée : couverture réduite", () => {
    const s = scoreCountries(["a", "b", "c"], crit, { a: { pop: 10, cout: 5 }, b: { pop: 20 }, c: { pop: 15, cout: 8 } });
    const b = s.find((x) => x.countryId === "b")!;
    expect(b.cells.cout.value).toBeNull();
    expect(b.coverage).toBeCloseTo(2 / 3, 9);
    expect(b.score).toBe(100);
  });
  it("un seul pays renseigné : critère non comparable ; aucun critère : pas de score", () => {
    const s = scoreCountries(["a", "b"], crit, { a: { pop: 10 }, b: {} });
    expect(s[0].score).toBeNull();
    expect(s[0].coverage).toBe(0);
    expect(s[0].rank).toBeNull();
  });
});
