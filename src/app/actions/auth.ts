"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth";
import { siteUrl } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { actionContext, dbMessage } from "@/lib/action-utils";
import {
  emailOnlySchema, firstError, loginSchema, newPasswordSchema, profileSchema, signupSchema,
} from "@/lib/validation";

const t = getDictionary();

export async function signup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: t.demo.unavailable };
  const parsed = signupSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password, display_name, role, phone } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Le rôle est re-filtré par la base : « admin » y est impossible.
      data: { display_name, role, phone },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { error: t.auth.passwordHint };
    if (error.status === 429) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    return { error: t.auth.generic };
  }
  if (data.session) redirect("/espace");
  return { ok: t.auth.checkEmail };
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: t.demo.unavailable };
  const parsed = loginSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed")
      return { error: "Confirmez d'abord votre adresse e-mail (lien reçu à l'inscription)." };
    if (error.status === 429) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
    return { error: t.auth.invalid };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("suite")?.toString()));
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

// Réinitialisation : la réponse est identique que le compte existe ou non,
// pour ne pas révéler quelles adresses sont inscrites.
export async function requestPasswordReset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: t.demo.unavailable };
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?suite=/nouveau-mot-de-passe`,
  });
  if (error?.status === 429) return { error: "Trop de tentatives. Réessayez dans quelques minutes." };
  return { ok: "Si un compte existe pour cette adresse, un e-mail contenant un lien de réinitialisation vient d'être envoyé." };
}

export async function updatePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { error: t.demo.unavailable };
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Lien expiré. Recommencez la demande de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Choisissez un mot de passe différent de l'ancien." };
    if (error.code === "weak_password") return { error: t.auth.passwordHint };
    return { error: t.auth.generic };
  }
  return { ok: "Mot de passe modifié." };
}

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const parsed = profileSchema.safeParse(Object.fromEntries(fd.entries()));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase, session } = ctx;
  // Seuls le nom et le téléphone sont modifiables : la base refuse toute
  // autre colonne (rôle, statut, vérification).
  const a = await supabase.from("profiles").update({ display_name: parsed.data.display_name }).eq("id", session.userId);
  if (a.error) return { error: dbMessage(a.error) };
  const b = await supabase.from("profile_private").update({ phone: parsed.data.phone }).eq("user_id", session.userId);
  if (b.error) return { error: dbMessage(b.error) };
  revalidatePath("/", "layout");
  return { ok: "Profil mis à jour." };
}
