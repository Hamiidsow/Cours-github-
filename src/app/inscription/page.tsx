import type { Metadata } from "next";
import Link from "next/link";
import { signup } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { SIGNUP_ROLES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";

export const metadata: Metadata = { title: "Inscription", robots: { index: false } };

export default function SignupPage() {
  const t = getDictionary();
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1">{t.auth.signupTitle}</h1>
      <ActionForm action={signup} submitLabel={t.auth.signup} submitClass="btn-primary w-full" className="card mt-6 grid gap-4 p-5">
        <fieldset>
          <legend className="label">{t.auth.role}</legend>
          <div className="grid gap-2">
            {SIGNUP_ROLES.map((r, i) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line px-3 has-checked:border-brand-700 has-checked:bg-brand-50">
                <input type="radio" name="role" value={r} defaultChecked={i === 0} required className="accent-brand-900" />
                <span className="text-sm font-medium">{t.roles[r]}</span>
              </label>
            ))}
          </div>
          <p className="hint">{t.verif.managerNote}</p>
        </fieldset>
        <div>
          <label className="label" htmlFor="display_name">{t.auth.name}</label>
          <input id="display_name" name="display_name" autoComplete="name" required minLength={2} maxLength={80} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">{t.auth.email}</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">{t.auth.phone}</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" required placeholder="+221 77 123 45 67" className="input" />
          <p className="hint">{t.auth.phoneHint}</p>
        </div>
        <div>
          <label className="label" htmlFor="password">{t.auth.password}</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} className="input" />
          <p className="hint">{t.auth.passwordHint}</p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-brand-900" />
          <span>
            {t.auth.acceptTerms}{" "}
            <Link href="/conditions" className="text-brand-700 underline">Conditions</Link> ·{" "}
            <Link href="/confidentialite" className="text-brand-700 underline">Confidentialité</Link>
          </span>
        </label>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-muted">
        {t.auth.hasAccount} <Link href="/connexion" className="font-semibold text-brand-700 underline">{t.nav.login}</Link>
      </p>
    </div>
  );
}
