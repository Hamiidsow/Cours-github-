// Miroir, côté interface, de la fonction SQL can_write (supabase/migrations/0002_security.sql).
// L'interface masque les boutons ; la base de données, elle, REFUSE réellement.
export type Role =
  | "super_admin" | "associe_investisseur" | "directeur_pays" | "analyste" | "acheteur"
  | "logisticien" | "comptable" | "commercial" | "client_grossiste" | "fournisseur";
export type WriteGroup = "reference" | "market" | "sourcing" | "freight" | "finance" | "logistics" | "crm" | "payments" | "risk";

export const ROLES: Role[] = [
  "super_admin", "associe_investisseur", "directeur_pays", "analyste", "acheteur",
  "logisticien", "comptable", "commercial", "client_grossiste", "fournisseur",
];
const MATRIX: Record<WriteGroup, Role[]> = {
  reference: ["super_admin", "directeur_pays", "analyste"],
  market: ["super_admin", "directeur_pays", "analyste", "commercial"],
  sourcing: ["super_admin", "directeur_pays", "acheteur"],
  freight: ["super_admin", "directeur_pays", "acheteur", "logisticien"],
  finance: ["super_admin", "directeur_pays", "analyste", "comptable"],
  logistics: ["super_admin", "directeur_pays", "logisticien"],
  crm: ["super_admin", "directeur_pays", "commercial"],
  payments: ["super_admin", "comptable"],
  risk: ["super_admin", "directeur_pays", "analyste"],
};
export const canWrite = (role: Role | null, group: WriteGroup) => !!role && MATRIX[group].includes(role);
export const canDelete = (role: Role | null) => role === "super_admin" || role === "directeur_pays";
export const canSeeAudit = (role: Role | null) =>
  !!role && ["super_admin", "directeur_pays", "associe_investisseur", "comptable"].includes(role);
export const isInternal = (role: Role | null) => !!role && role !== "client_grossiste" && role !== "fournisseur";
