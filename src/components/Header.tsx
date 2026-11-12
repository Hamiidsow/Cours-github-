import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { canPublish, getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { IconMenu } from "./Icons";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="SamaKeur — accueil">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
      <span className="font-serif text-xl font-semibold tracking-tight text-brand-950">
        Sama<span className="text-gold-600">Keur</span>
      </span>
    </Link>
  );
}

export async function Header() {
  const t = getDictionary();
  const session = await getSession();
  const publishHref = session ? "/espace/annonces/nouvelle" : "/inscription";
  const showPublish = !session || canPublish(session.profile);

  const links = (
    <>
      <Link href="/annonces" className="btn-ghost justify-start">{t.nav.search}</Link>
      <Link href="/aide" className="btn-ghost justify-start">{t.nav.help}</Link>
      {session ? (
        <>
          {session.profile.role === "admin" && (
            <Link href="/admin" className="btn-ghost justify-start">{t.nav.admin}</Link>
          )}
          <Link href="/espace" className="btn-ghost justify-start">{t.nav.dashboard}</Link>
          <form action={logout}>
            <button type="submit" className="btn-ghost w-full justify-start">{t.nav.logout}</button>
          </form>
        </>
      ) : (
        <>
          <Link href="/connexion" className="btn-ghost justify-start">{t.nav.login}</Link>
          <Link href="/inscription" className="btn-ghost justify-start">{t.nav.signup}</Link>
        </>
      )}
    </>
  );

  return (
    <header className="border-b border-line bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {links}
          {showPublish && <Link href={publishHref} className="btn-gold ml-2">{t.nav.publish}</Link>}
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          {showPublish && <Link href={publishHref} className="btn-gold px-3">Publier</Link>}
          <details className="relative">
            <summary className="btn-outline list-none px-3 [&::-webkit-details-marker]:hidden" aria-label="Menu">
              <IconMenu />
            </summary>
            <nav
              aria-label="Menu mobile"
              className="absolute right-0 z-20 mt-2 flex w-56 flex-col rounded-xl border border-line bg-white p-2 shadow-lg"
            >
              {links}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
