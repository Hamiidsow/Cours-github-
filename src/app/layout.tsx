import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { siteUrl } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const t = getDictionary();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${t.brand} — ${t.tagline}`, template: `%s | ${t.brand}` },
  description: t.home.subtitle,
  openGraph: { siteName: t.brand, locale: "fr_SN", type: "website" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#0b3d2e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">
          Aller au contenu
        </a>
        {!isSupabaseConfigured() && (
          <p role="note" className="bg-gold-100 px-4 py-2 text-center text-xs font-medium text-gold-700 sm:text-sm">
            {t.demo.banner}
          </p>
        )}
        <Header />
        <main id="contenu" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
