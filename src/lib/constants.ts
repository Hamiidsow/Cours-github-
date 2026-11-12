// Valeurs de référence partagées (identiques aux types énumérés de la base).
export const PROPERTY_TYPES = [
  "appartement", "studio", "chambre", "maison", "villa", "magasin",
  "bureau", "depot", "entrepot", "terrain", "local_commercial",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const TRANSACTIONS = ["location", "vente"] as const;
export type Transaction = (typeof TRANSACTIONS)[number];

export const LISTING_STATUSES = [
  "brouillon", "en_attente", "publiee", "rejetee", "suspendue", "archivee",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const AVAILABILITIES = ["disponible", "reserve", "indisponible"] as const;
export type Availability = (typeof AVAILABILITIES)[number];

export const ROLES = ["locataire", "proprietaire", "gestionnaire", "admin"] as const;
export type Role = (typeof ROLES)[number];
export const SIGNUP_ROLES = ["locataire", "proprietaire", "gestionnaire"] as const;

export const VISIT_STATUSES = ["en_attente", "acceptee", "refusee", "annulee"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const REPORT_REASONS = [
  "fraude", "faux_prix", "bien_inexistant", "doublon", "contenu_inapproprie", "autre",
] as const;

export const DOCUMENT_TYPES = ["cni", "passeport", "titre_propriete", "mandat_gestion"] as const;

export const AMENITIES = [
  "eau", "electricite", "toilettes_internes", "cuisine_equipee", "climatisation",
  "wifi", "parking", "gardien", "balcon", "terrasse", "jardin", "piscine",
  "ascenseur", "groupe_electrogene", "forage", "titre_foncier",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const CITIES = [
  "Dakar", "Pikine", "Guédiawaye", "Rufisque", "Diamniadio", "Thiès", "Mbour",
  "Saly", "Saint-Louis", "Touba", "Kaolack", "Ziguinchor", "Diourbel", "Louga",
  "Tambacounda", "Kolda", "Richard-Toll",
] as const;

// Suggestions de quartiers (saisie libre autorisée).
export const NEIGHBORHOOD_SUGGESTIONS = [
  "Almadies", "Ngor", "Ouakam", "Mermoz", "Sacré-Cœur", "Point E", "Fann", "Plateau",
  "Médina", "Liberté 6", "Sicap Baobab", "Grand Yoff", "Parcelles Assainies", "Yoff",
  "Keur Massar", "Hann Maristes", "Mamelles", "Cité Keur Gorgui", "HLM", "Castors",
];

export const MAX_PHOTOS = 8;
export const PAGE_SIZE = 12;
export const PHONE_REGEX = /^\+?[0-9 ]{7,20}$/;
