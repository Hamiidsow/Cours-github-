"use server";

import { revalidatePath } from "next/cache";
import { actionContext, dbMessage } from "@/lib/action-utils";
import { VISIT_STATUSES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import type { ActionState } from "@/lib/types";
import {
  filtersToQuery, firstError, parseSearchParams, reportSchema, visitSchema,
} from "@/lib/validation";

const t = getDictionary();

export async function toggleFavorite(listingId: string, isFavorite: boolean): Promise<void> {
  const ctx = await actionContext();
  if ("error" in ctx) return;
  const { supabase, session } = ctx;
  if (isFavorite)
    await supabase.from("favorites").delete().eq("user_id", session.userId).eq("listing_id", listingId);
  else await supabase.from("favorites").insert({ user_id: session.userId, listing_id: listingId });
  revalidatePath(`/annonces/${listingId}`);
  revalidatePath("/espace/favoris");
}

// Révèle le numéro : contrôlé, limité et journalisé par la base (RPC).
export async function revealContact(
  listingId: string,
): Promise<{ phone: string; whatsapp: string | null } | { error: string }> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { data, error } = await ctx.supabase.rpc("reveal_listing_contact", { p_listing_id: listingId });
  if (error) return { error: dbMessage(error) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Contact indisponible." };
  return { phone: row.phone, whatsapp: row.whatsapp };
}

export async function requestVisit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const parsed = visitSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { error } = await ctx.supabase.from("visit_requests").insert({
    ...parsed.data,
    message: parsed.data.message ?? null,
    requester_id: ctx.session.userId,
    owner_id: ctx.session.userId, // remplacé par la base (déduit de l'annonce)
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/visites");
  return { ok: t.listing.visitSent };
}

export async function updateVisitStatus(id: string, status: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  if (!(VISIT_STATUSES as readonly string[]).includes(status)) return { error: "Valeur invalide." };
  const { error } = await ctx.supabase.from("visit_requests").update({ status }).eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/visites");
  return { ok: "Demande mise à jour." };
}

export async function reportListing(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const parsed = reportSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { error } = await ctx.supabase.from("reports").insert({
    ...parsed.data, details: parsed.data.details ?? null, reporter_id: ctx.session.userId,
  });
  if (error)
    return { error: error.code === "23505" ? "Vous avez déjà signalé cette annonce." : dbMessage(error) };
  return { ok: t.listing.reportSent };
}

export async function saveSearch(query: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  // Les critères sont re-validés : on ne stocke que des filtres connus.
  const sp: Record<string, string[]> = {};
  for (const [k, v] of new URLSearchParams(query)) (sp[k] ??= []).push(v);
  const filters = parseSearchParams(sp);
  const clean = filtersToQuery(filters, { page: 1 });
  const label =
    [filters.type && t.propertyTypes[filters.type], filters.quartier, filters.ville]
      .filter(Boolean).join(" · ") || "Toutes les annonces";
  const { error } = await ctx.supabase.from("saved_searches").insert({
    user_id: ctx.session.userId, label: label.slice(0, 80), criteria: { query: clean },
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/favoris");
  return { ok: "Recherche enregistrée dans « Favoris et alertes »." };
}

export async function deleteSearch(id: string): Promise<void> {
  const ctx = await actionContext();
  if ("error" in ctx) return;
  await ctx.supabase.from("saved_searches").delete().eq("id", id).eq("user_id", ctx.session.userId);
  revalidatePath("/espace/favoris");
}
