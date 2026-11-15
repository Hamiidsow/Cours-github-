import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Seule la clé PUBLIQUE est utilisée ici ; les droits réels sont appliqués par les politiques RLS.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
