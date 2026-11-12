import { describe, expect, it } from "vitest";
import { filterDemo } from "../src/lib/data/listings";
import { DEMO_LISTINGS } from "../src/lib/data/demo";
import { escapeLike, formatFcfa, toWhatsAppNumber } from "../src/lib/format";
import { safeNext } from "../src/lib/auth";
import { filtersToQuery, listingSchema, parseSearchParams, signupSchema } from "../src/lib/validation";

describe("format", () => {
  it("affiche les prix en FCFA", () => {
    expect(formatFcfa(250000)).toBe("250 000 FCFA");
    expect(formatFcfa(null)).toBe("—");
  });
  it("normalise les numéros pour WhatsApp", () => {
    expect(toWhatsAppNumber("77 123 45 67")).toBe("221771234567");
    expect(toWhatsAppNumber("+221 77 123 45 67")).toBe("221771234567");
  });
  it("échappe les jokers LIKE", () => {
    expect(escapeLike("100%_a")).toBe("100\\%\\_a");
  });
});

describe("sécurité des redirections", () => {
  it("refuse les destinations externes", () => {
    expect(safeNext("https://evil.example")).toBe("/espace");
    expect(safeNext("//evil.example")).toBe("/espace");
    expect(safeNext("/annonces/1")).toBe("/annonces/1");
  });
});

describe("validation", () => {
  const signup = { display_name: "Awa", email: "a@b.sn", phone: "+221 77 123 45 67", role: "proprietaire", password: "motdepasse12", terms: "on" };
  it("accepte une inscription valide", () => expect(signupSchema.safeParse(signup).success).toBe(true));
  it("refuse le rôle admin à l'inscription", () =>
    expect(signupSchema.safeParse({ ...signup, role: "admin" }).success).toBe(false));
  it("refuse un mot de passe faible", () =>
    expect(signupSchema.safeParse({ ...signup, password: "court1" }).success).toBe(false));
  it("refuse une annonce au prix nul ou au type inconnu", () => {
    const base = { type: "studio", city: "Dakar", neighborhood: "Fann", furnished: false, amenities: [], title: "Studio meublé à Fann",
      description: "Une description assez longue pour être acceptée.", transaction: "location", price_fcfa: "150000",
      availability: "disponible", contact_phone: "+221771234567" };
    expect(listingSchema.safeParse(base).success).toBe(true);
    expect(listingSchema.safeParse({ ...base, price_fcfa: "0" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, type: "chateau" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...base, amenities: ["<script>"] }).success).toBe(false);
  });
  it("ignore les filtres de recherche invalides", () => {
    const f = parseSearchParams({ ville: "Paris", type: "studio", prix_max: "abc", equipements: ["wifi", "x"], page: "-2" });
    expect(f.ville).toBeUndefined();
    expect(f.type).toBe("studio");
    expect(f.prix_max).toBeUndefined();
    expect(f.equipements).toEqual(["wifi"]);
    expect(f.page).toBe(1);
    expect(filtersToQuery(f)).toBe("type=studio&equipements=wifi");
  });
});

describe("données de démonstration", () => {
  it("sont toutes marquées fictives et jamais vérifiées", () => {
    expect(DEMO_LISTINGS.every((l) => l.is_demo && !l.owner_verified)).toBe(true);
  });
  it("se filtrent par ville, prix et équipements", () => {
    expect(filterDemo({ ville: "Thiès" })).toHaveLength(1);
    expect(filterDemo({ prix_max: 100000 }).map((l) => l.id)).toEqual(["demo-4"]);
    expect(filterDemo({ equipements: ["piscine"] })).toHaveLength(0);
  });
});
