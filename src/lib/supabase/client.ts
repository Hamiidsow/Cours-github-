import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

// Client navigateur (utilisé uniquement pour l'envoi direct des fichiers).
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
