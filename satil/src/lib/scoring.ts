// Score d'attractivité multi-pays — transparent et sans imputation.
// Chaque critère est normalisé min–max ENTRE les pays comparés (0 = le moins bon, 1 = le meilleur).
// Une donnée absente n'est jamais remplacée : le critère est exclu pour ce pays et la couverture le signale.

export interface Criterion {
  code: string;
  weight: number;               // poids relatif (≥ 0)
  direction: "max" | "min";     // max = plus c'est élevé, mieux c'est ; min = l'inverse
}
export interface CellScore { value: number | null; normalized: number | null; contribution: number | null }
export interface CountryScore {
  countryId: string;
  cells: Record<string, CellScore>;
  score: number | null;     // 0–100, sur les seuls critères disponibles
  coverage: number;         // part du poids total réellement couverte par des données (0–1)
  rank: number | null;
}

export function scoreCountries(
  countryIds: string[],
  criteria: Criterion[],
  values: Record<string, Record<string, number | null | undefined>>,
): CountryScore[] {
  const active = criteria.filter((c) => c.weight > 0);
  const totalWeight = active.reduce((s, c) => s + c.weight, 0);

  const range: Record<string, { min: number; max: number; n: number }> = {};
  for (const c of active) {
    const vs = countryIds.map((id) => values[id]?.[c.code]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    range[c.code] = { min: Math.min(...vs), max: Math.max(...vs), n: vs.length };
  }

  const out: CountryScore[] = countryIds.map((id) => {
    const cells: Record<string, CellScore> = {};
    let sum = 0, covered = 0;
    for (const c of criteria) {
      const raw = values[id]?.[c.code];
      const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      let normalized: number | null = null;
      const r = range[c.code];
      // Il faut au moins deux pays renseignés pour comparer.
      if (value !== null && r && r.n >= 2 && c.weight > 0) {
        if (r.max === r.min) normalized = 1;
        else normalized = c.direction === "max" ? (value - r.min) / (r.max - r.min) : (r.max - value) / (r.max - r.min);
        sum += normalized * c.weight;
        covered += c.weight;
      }
      cells[c.code] = { value, normalized, contribution: normalized !== null && totalWeight > 0 ? (normalized * c.weight) / totalWeight * 100 : null };
    }
    return {
      countryId: id, cells,
      score: covered > 0 ? (sum / covered) * 100 : null,
      coverage: totalWeight > 0 ? covered / totalWeight : 0,
      rank: null,
    };
  });

  const ranked = out.filter((o) => o.score !== null).sort((a, b) => (b.score as number) - (a.score as number));
  ranked.forEach((o, k) => { o.rank = k > 0 && ranked[k - 1].score === o.score ? ranked[k - 1].rank : k + 1; });
  return out;
}
