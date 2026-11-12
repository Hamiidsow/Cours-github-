import type {
  Availability, ListingStatus, PropertyType, Role, Transaction, VisitStatus,
} from "./constants";

// Ligne de la vue publique `listings_public`.
export type PublicListing = {
  id: string;
  title: string;
  description: string;
  transaction: Transaction;
  price_fcfa: number;
  charges_fcfa: number | null;
  deposit_months: number | null;
  advance_months: number | null;
  fees_note: string | null;
  conditions: string | null;
  availability: Availability;
  available_from: string | null;
  is_demo: boolean;
  published_at: string | null;
  property_type: PropertyType;
  city: string;
  neighborhood: string;
  surface_m2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  amenities: string[];
  owner_name: string;
  owner_role: Role;
  owner_verified: boolean;
  image_paths: string[];
};

export type Profile = {
  id: string;
  display_name: string;
  role: Role;
  account_status: "actif" | "suspendu";
  verification_status: "non_verifie" | "en_attente" | "verifie" | "rejete";
  locale: string;
  created_at: string;
};

export type OwnerListing = {
  id: string;
  title: string;
  status: ListingStatus;
  availability: Availability;
  price_fcfa: number;
  transaction: Transaction;
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
  properties: { type: PropertyType; city: string; neighborhood: string } | null;
  listing_images: { storage_path: string; position: number }[];
};

export type VisitRequest = {
  id: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  preferred_date: string;
  message: string | null;
  requester_phone: string;
  status: VisitStatus;
  created_at: string;
  listings: { title: string } | null;
};

export type SearchFilters = {
  ville?: string;
  quartier?: string;
  type?: PropertyType;
  transaction?: Transaction;
  prix_min?: number;
  prix_max?: number;
  chambres?: number;
  meuble?: boolean;
  equipements?: string[];
  tri?: "recent" | "prix_asc" | "prix_desc";
  page?: number;
};

export type ActionState = { error?: string; ok?: string } | null;
