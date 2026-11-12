import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Rafraîchit la session et protège les espaces privés. (Le contrôle fin
// des droits est refait dans chaque page et, surtout, par la base.)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/espace") || pathname.startsWith("/admin");

  if (!isSupabaseConfigured()) {
    if (isPrivate) return NextResponse.redirect(new URL("/connexion", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  if (isPrivate && !data.user) {
    const url = new URL("/connexion", request.url);
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|demo/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
