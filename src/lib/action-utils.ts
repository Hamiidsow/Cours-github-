import { getDictionary } from "./i18n";
import { getSession } from "./auth";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

const t = getDictionary();

// Les messages levés volontairement par la base (RAISE EXCEPTION, code P0001)
// sont rédigés pour l'utilisateur ; tout le reste est masqué.
export function dbMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return t.auth.generic;
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "23505") return "Cette action a déjà été effectuée.";
  if (error.code === "42501") return "Action non autorisée pour votre compte.";
  console.error("[db]", error.code, error.message);
  return t.auth.generic;
}

// Contexte commun des actions : backend connecté + utilisateur actif.
type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
type Client = Awaited<ReturnType<typeof createClient>>;

export async function actionContext(): Promise<{ error: string } | { session: Session; supabase: Client }> {
  if (!isSupabaseConfigured()) return { error: t.demo.unavailable };
  const session = await getSession();
  if (!session) return { error: "Connectez-vous pour continuer." };
  if (session.profile.account_status !== "actif") return { error: t.auth.suspended };
  return { session, supabase: await createClient() };
}
