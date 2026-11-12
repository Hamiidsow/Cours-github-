"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitVerification } from "@/app/actions/verification";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX = 5 * 1024 * 1024;

// Le document part directement du téléphone vers le bucket PRIVÉ : il ne
// transite pas par le serveur web et n'est jamais accessible publiquement.
export function VerificationForm({
  userId, labels,
}: { userId: string; labels: { docType: string; file: string; submit: string; types: Record<string, string> } }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("document") as File | null;
    if (!file || file.size === 0) return setMsg({ error: "Choisissez un fichier." });
    const ext = MIME[file.type];
    if (!ext) return setMsg({ error: "Format accepté : photo (JPEG, PNG, WebP) ou PDF." });
    if (file.size > MAX) return setMsg({ error: "Fichier trop lourd (5 Mo maximum)." });

    setBusy(true);
    setMsg(null);
    try {
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const up = await createClient().storage.from("identity-documents").upload(path, file, { contentType: file.type });
      if (up.error) return setMsg({ error: "L'envoi du fichier a échoué. Réessayez." });
      const r = await submitVerification(String(fd.get("document_type")), path);
      setMsg(r);
      if (r.ok) {
        form.reset();
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="grid gap-4">
      <div>
        <label className="label" htmlFor="document_type">{labels.docType}</label>
        <select id="document_type" name="document_type" required className="input">
          {DOCUMENT_TYPES.map((d) => <option key={d} value={d}>{labels.types[d]}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="document">{labels.file}</label>
        <input id="document" name="document" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="input py-2" />
      </div>
      {msg?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{msg.error}</p>}
      {msg?.ok && <p role="status" className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">{msg.ok}</p>}
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? "…" : labels.submit}</button>
    </form>
  );
}
