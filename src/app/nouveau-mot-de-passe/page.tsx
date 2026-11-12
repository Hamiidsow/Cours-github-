import type { Metadata } from "next";
import Link from "next/link";
import { updatePassword } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewPasswordPage() {
  const t = getDictionary();
  await requireSession("/nouveau-mot-de-passe");
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1">Nouveau mot de passe</h1>
      <ActionForm action={updatePassword} submitLabel="Enregistrer" submitClass="btn-primary w-full" className="card mt-6 grid gap-4 p-5">
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} className="input" />
          <p className="hint">{t.auth.passwordHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirmer le mot de passe</label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={72} className="input" />
        </div>
      </ActionForm>
      <p className="mt-4 text-center text-sm">
        <Link href="/espace" className="font-semibold text-brand-700 underline">{t.nav.dashboard}</Link>
      </p>
    </div>
  );
}
