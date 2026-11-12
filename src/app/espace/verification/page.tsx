import { redirect } from "next/navigation";
import { VerifiedBadge } from "@/components/Badges";
import { VerificationForm } from "@/components/VerificationForm";
import { canPublish, requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function VerificationPage() {
  const t = getDictionary();
  const { profile, userId } = await requireSession("/espace/verification");
  if (!canPublish(profile)) redirect("/espace");
  const supabase = await createClient();
  const { data: files } = await supabase
    .from("owner_verifications")
    .select("id, document_type, status, review_note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const status = profile.verification_status;

  return (
    <div className="max-w-2xl">
      <h1 className="h1">{t.verif.title}</h1>
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <VerifiedBadge verified={status === "verifie"} />
        <span className="text-sm text-muted">{t.verificationStatuses[status]}</span>
      </p>
      <p className="mt-4 text-ink/90">{t.verif.intro}</p>
      <p className="mt-2 text-sm text-muted">{t.verif.privacy}</p>
      {profile.role === "gestionnaire" && <p className="mt-2 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">{t.verif.managerNote}</p>}

      {status !== "verifie" && status !== "en_attente" && (
        <div className="card mt-6 p-5">
          <VerificationForm userId={userId} labels={{ docType: t.verif.docType, file: t.verif.file, submit: t.verif.submit, types: t.documentTypes }} />
        </div>
      )}

      <h2 className="h2 mt-8">{t.verif.history}</h2>
      {(files ?? []).length === 0 ? (
        <p className="card mt-3 p-5 text-muted">—</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {(files ?? []).map((f) => (
            <li key={f.id} className="card p-4 text-sm">
              <p className="font-semibold">{t.documentTypes[f.document_type as keyof typeof t.documentTypes]}</p>
              <p className="text-muted">{formatDate(f.created_at)} — {t.verificationStatuses[f.status as keyof typeof t.verificationStatuses]}</p>
              {f.review_note && <p className="mt-1">{t.dash.reason} : {f.review_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
