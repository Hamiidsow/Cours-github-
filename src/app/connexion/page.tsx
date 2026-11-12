import type { Metadata } from "next";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { safeNext } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ suite?: string; erreur?: string }> }) {
  const t = getDictionary();
  const sp = await searchParams;
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1">{t.auth.loginTitle}</h1>
      {sp.erreur && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Le lien de confirmation est invalide ou expiré.</p>}
      <ActionForm action={login} submitLabel={t.auth.login} submitClass="btn-primary w-full" className="card mt-6 grid gap-4 p-5">
        <input type="hidden" name="suite" value={safeNext(sp.suite)} />
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="font-semibold text-brand-700 underline">Mot de passe oublié ?</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        {t.auth.noAccount} <Link href="/inscription" className="font-semibold text-brand-700 underline">{t.nav.signup}</Link>
      </p>
    </div>
  );
}
