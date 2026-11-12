"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionContext, dbMessage } from "@/lib/action-utils";
import { canPublish } from "@/lib/auth";
import { AVAILABILITIES, MAX_PHOTOS } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import type { ActionState } from "@/lib/types";
import { firstError, listingFromFormData } from "@/lib/validation";

const t = getDictionary();
const UUID = /^[0-9a-f-]{36}$/i;

// Crée (toujours en brouillon) ou met à jour une annonce et son bien.
export async function saveListing(
  listingId: string | null,
  fd: FormData,
): Promise<{ id: string } | { error: string }> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, session } = ctx;
  if (!canPublish(session.profile)) return { error: t.form.roleRequired };

  const parsed = listingFromFormData(fd);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const property = {
    type: d.type, city: d.city, neighborhood: d.neighborhood,
    address_private: d.address_private ?? null, surface_m2: d.surface_m2 ?? null,
    rooms: d.rooms ?? null, bedrooms: d.bedrooms ?? null, bathrooms: d.bathrooms ?? null,
    furnished: d.furnished, amenities: d.amenities,
  };
  const listing = {
    title: d.title, description: d.description, transaction: d.transaction,
    price_fcfa: d.price_fcfa, charges_fcfa: d.charges_fcfa ?? null,
    deposit_months: d.deposit_months ?? null, advance_months: d.advance_months ?? null,
    fees_note: d.fees_note ?? null, conditions: d.conditions ?? null,
    availability: d.availability, available_from: d.available_from ?? null,
    contact_phone: d.contact_phone, contact_whatsapp: d.contact_whatsapp ?? null,
  };

  if (listingId) {
    if (!UUID.test(listingId)) return { error: "Annonce introuvable." };
    const { data: existing } = await supabase
      .from("listings").select("id, property_id").eq("id", listingId).eq("owner_id", session.userId).maybeSingle();
    if (!existing) return { error: "Annonce introuvable." };
    const p = await supabase.from("properties").update(property).eq("id", existing.property_id);
    if (p.error) return { error: dbMessage(p.error) };
    const l = await supabase.from("listings").update(listing).eq("id", listingId);
    if (l.error) return { error: dbMessage(l.error) };
    revalidatePath("/espace/annonces");
    return { id: listingId };
  }

  const p = await supabase
    .from("properties").insert({ ...property, owner_id: session.userId }).select("id").single();
  if (p.error) return { error: dbMessage(p.error) };
  const l = await supabase
    .from("listings")
    .insert({ ...listing, property_id: p.data.id, owner_id: session.userId, status: "brouillon" })
    .select("id").single();
  if (l.error) {
    await supabase.from("properties").delete().eq("id", p.data.id);
    return { error: dbMessage(l.error) };
  }
  revalidatePath("/espace/annonces");
  return { id: l.data.id };
}

// Enregistre en base les photos déjà envoyées dans le stockage.
export async function addImages(listingId: string, paths: string[]): Promise<{ error?: string }> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, session } = ctx;
  if (!UUID.test(listingId)) return { error: "Annonce introuvable." };
  const prefix = `${session.userId}/${listingId}/`;
  if (paths.length === 0 || paths.some((p) => !p.startsWith(prefix) || !/\.jpg$/.test(p) || p.includes("..")))
    return { error: "Photo invalide." };
  const { count } = await supabase
    .from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  const start = count ?? 0;
  if (start + paths.length > MAX_PHOTOS) return { error: `Maximum ${MAX_PHOTOS} photos par annonce.` };
  const { error } = await supabase.from("listing_images").insert(
    paths.map((storage_path, i) => ({
      listing_id: listingId, owner_id: session.userId, storage_path, position: start + i,
    })),
  );
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/annonces");
  return {};
}

export async function deleteImage(imageId: string): Promise<void> {
  const ctx = await actionContext();
  if ("error" in ctx) return;
  const { supabase, session } = ctx;
  const { data: img } = await supabase
    .from("listing_images").select("id, storage_path, listing_id").eq("id", imageId).eq("owner_id", session.userId).maybeSingle();
  if (!img) return;
  await supabase.from("listing_images").delete().eq("id", img.id);
  await supabase.storage.from("listing-images").remove([img.storage_path]);
  revalidatePath(`/espace/annonces/${img.listing_id}`);
}

export async function submitForReview(listingId: string): Promise<{ error?: string }> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, session } = ctx;
  const { count } = await supabase
    .from("listing_images").select("id", { count: "exact", head: true })
    .eq("listing_id", listingId).eq("owner_id", session.userId);
  if (!count) return { error: t.form.needPhoto };
  const { error } = await supabase
    .from("listings").update({ status: "en_attente" }).eq("id", listingId).eq("owner_id", session.userId);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/annonces");
  return {};
}

export async function submitForReviewAction(listingId: string, _prev: ActionState): Promise<ActionState> {
  const r = await submitForReview(listingId);
  return r.error ? { error: r.error } : { ok: "Annonce envoyée en validation." };
}

export async function archiveListing(listingId: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("listings").update({ status: "archivee" }).eq("id", listingId).eq("owner_id", ctx.session.userId);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/annonces");
  return { ok: "Annonce archivée." };
}

export async function setAvailability(listingId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const value = fd.get("availability")?.toString() ?? "";
  if (!(AVAILABILITIES as readonly string[]).includes(value)) return { error: "Valeur invalide." };
  const { error } = await ctx.supabase
    .from("listings").update({ availability: value }).eq("id", listingId).eq("owner_id", ctx.session.userId);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/espace/annonces");
  return { ok: "Disponibilité mise à jour." };
}

// Suppression définitive : annonce, bien, lignes d'images et fichiers.
export async function deleteListing(listingId: string, _prev: ActionState): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, session } = ctx;
  const { data: listing } = await supabase
    .from("listings").select("id, property_id, listing_images(storage_path)")
    .eq("id", listingId).eq("owner_id", session.userId).maybeSingle();
  if (!listing) return { error: "Annonce introuvable." };
  const paths = (listing.listing_images ?? []).map((i: { storage_path: string }) => i.storage_path);
  const { error } = await supabase.from("properties").delete().eq("id", listing.property_id);
  if (error) return { error: dbMessage(error) };
  if (paths.length) await supabase.storage.from("listing-images").remove(paths);
  revalidatePath("/espace/annonces");
  redirect("/espace/annonces");
}
