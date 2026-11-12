import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import type { Profile } from "./types";

// Utilisateur connecté + profil (une seule lecture par requête).
export const getSession = cache(async (): Promise<{ userId: string; email: string; profile: Profile } | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, account_status, verification_status, locale, created_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;
  return { userId: data.user.id, email: data.user.email ?? "", profile: profile as Profile };
});

export async function requireSession(next = "/espace") {
  const session = await getSession();
  if (!session) redirect(`/connexion?suite=${encodeURIComponent(next)}`);
  return session;
}

export async function requireAdmin() {
  const session = await requireSession("/admin");
  if (session.profile.role !== "admin" || session.profile.account_status !== "actif") redirect("/espace");
  return session;
}

export function canPublish(profile: Profile): boolean {
  return profile.account_status === "actif" && ["proprietaire", "gestionnaire", "admin"].includes(profile.role);
}

// N'accepte qu'un chemin interne comme destination après connexion.
export function safeNext(value: string | null | undefined, fallback = "/espace"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
