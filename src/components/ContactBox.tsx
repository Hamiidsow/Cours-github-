"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { revealContact } from "@/app/actions/interactions";
import { whatsappContactUrl } from "@/lib/format";
import { IconWhatsApp } from "./Icons";

type Labels = {
  showContact: string; loginToContact: string; call: string; whatsapp: string;
  demo: string; message: string;
};

// Le numéro n'est jamais dans la page : il est demandé au serveur au clic,
// uniquement pour un utilisateur connecté (accès limité et journalisé).
export function ContactBox({
  listingId, loggedIn, demoMode, labels,
}: { listingId: string; loggedIn: boolean; demoMode: boolean; labels: Labels }) {
  const [contact, setContact] = useState<{ phone: string; whatsapp: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (demoMode) return <p className="rounded-lg bg-gold-50 p-3 text-sm text-gold-700">{labels.demo}</p>;
  if (!loggedIn)
    return (
      <Link href={`/connexion?suite=/annonces/${listingId}`} className="btn-primary w-full">
        {labels.loginToContact}
      </Link>
    );

  if (contact) {
    return (
      <div className="grid gap-2">
        <p className="text-center text-xl font-bold tracking-wide text-brand-950">{contact.phone}</p>
        <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-primary w-full">{labels.call}</a>
        <a
          href={whatsappContactUrl(contact.whatsapp ?? contact.phone, labels.message)}
          target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#1f8f4e] text-white hover:bg-[#17753f]"
        >
          <IconWhatsApp /> {labels.whatsapp}
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <button
        type="button" className="btn-primary w-full" disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await revealContact(listingId);
            if ("error" in r) setError(r.error);
            else setContact(r);
          })
        }
      >
        {pending ? "…" : labels.showContact}
      </button>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>
  );
}
