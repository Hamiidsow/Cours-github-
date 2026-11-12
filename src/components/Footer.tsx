import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export function Footer() {
  const t = getDictionary();
  return (
    <footer className="mt-16 border-t border-line bg-brand-950 text-brand-100">
      <div className="container-page grid gap-6 py-10 sm:grid-cols-2">
        <div>
          <p className="font-serif text-xl font-semibold text-white">
            Sama<span className="text-gold-500">Keur</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-brand-100/80">{t.footer.rights}</p>
        </div>
        <nav aria-label="Liens utiles" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/aide" className="hover:text-white hover:underline">{t.footer.help}</Link>
          <Link href="/conditions" className="hover:text-white hover:underline">{t.footer.terms}</Link>
          <Link href="/confidentialite" className="hover:text-white hover:underline">{t.footer.privacy}</Link>
          <Link href="/mentions-legales" className="hover:text-white hover:underline">{t.footer.legal}</Link>
        </nav>
      </div>
    </footer>
  );
}
