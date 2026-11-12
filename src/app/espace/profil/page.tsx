import Link from "next/link";
import { updateProfile } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { requireSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const t = getDictionary();
  const { profile, userId, email } = await requireSession("/espace/profil");
  const supabase = await createClient();
  const { data: priv } = await supabase.from("profile_private").select("phone").eq("user_id", userId).maybeSingle();
  return (
    <div className="max-w-md">
      <h1 className="h1">Mon profil</h1>
      <p className="mt-2 text-sm text-muted">{email} — {t.roles[profile.role]}</p>
      <ActionForm action={updateProfile} submitLabel="Enregistrer" className="card mt-6 grid gap-4 p-5">
        <div>
          <label className="label" htmlFor="display_name">{t.auth.name}</label>
          <input id="display_name" name="display_name" required minLength={2} maxLength={80} defaultValue={profile.display_name} className="input" />
          <p className="hint">Visible sur vos annonces.</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">{t.auth.phone}</label>
          <input id="phone" name="phone" type="tel" required defaultValue={priv?.phone ?? ""} placeholder="+221 77 123 45 67" className="input" />
          <p className="hint">{t.auth.phoneHint}</p>
        </div>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link href="/nouveau-mot-de-passe" className="font-semibold text-brand-700 underline">Changer mon mot de passe</Link>
      </p>
    </div>
  );
}
