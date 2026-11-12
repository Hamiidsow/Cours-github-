import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  const t = getDictionary();
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1">Mot de passe oublié</h1>
      <p className="mt-3 text-sm text-muted">Indiquez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <ActionForm action={requestPasswordReset} submitLabel="Recevoir le lien" submitClass="btn-primary w-full" className="card mt-6 grid gap-4 p-5">
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/connexion" className="font-semibold text-brand-700 underline">Retour à la connexion</Link>
      </p>
    </div>
  );
}
