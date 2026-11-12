"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { safeNext } from "@/lib/auth";
import { siteUrl } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";
import { firstError, loginSchema, signupSchema } from "@/lib/validation";

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
