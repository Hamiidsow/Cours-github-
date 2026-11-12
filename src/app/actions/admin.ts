"use server";

import { revalidatePath } from "next/cache";
import { actionContext, dbMessage } from "@/lib/action-utils";
import type { ActionState } from "@/lib/types";

// Toutes les actions d'administration passent par des fonctions RPC : c'est
// la BASE qui vérifie le rôle admin et qui écrit le journal de modération.
async function callRpc(fn: string, args: Record<string, unknown>, ok: string): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { error } = await ctx.supabase.rpc(fn, args);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/admin");
  return { ok };
}

const note = (fd: FormData) => fd.get("note")?.toString().trim().slice(0, 500) || null;

export async function moderateListing(
  id: string, status: "publiee" | "rejetee" | "suspendue", _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  return callRpc("admin_moderate_listing", { p_listing_id: id, p_status: status, p_note: note(fd) }, "Décision enregistrée.");
}

export async function reviewVerification(
  id: string, approve: boolean, _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  return callRpc("admin_review_verification", { p_verification_id: id, p_approve: approve, p_note: note(fd) }, "Décision enregistrée.");
}

export async function setAccountStatus(
  userId: string, status: "actif" | "suspendu", _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  return callRpc("admin_set_account_status", { p_user_id: userId, p_status: status, p_note: note(fd) }, "Compte mis à jour.");
}

export async function resolveReport(
  id: string, status: "traite" | "rejete", _prev: ActionState, fd: FormData,
): Promise<ActionState> {
  return callRpc("admin_resolve_report", { p_report_id: id, p_status: status, p_note: note(fd) }, "Signalement mis à jour.");
}
