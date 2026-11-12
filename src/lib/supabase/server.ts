import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

// Client Supabase côté serveur : agit TOUJOURS avec la session de
// l'utilisateur (cookies), donc soumis aux politiques RLS.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Appelé depuis un composant serveur : le rafraîchissement de
          // session est assuré par src/proxy.ts.
        }
      },
    },
  });
}
