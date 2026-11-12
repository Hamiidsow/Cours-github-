"use server";

import { revalidatePath } from "next/cache";
import { actionContext, dbMessage } from "@/lib/action-utils";
import { canPublish } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { verificationSchema } from "@/lib/validation";

const t = getDictionary();

// Le fichier est déjà dans le bucket PRIVÉ (envoi direct depuis le
// navigateur) ; on enregistre ici le dossier à contrôler.
export async function submitVerification(
  documentType: string,
  path: string,
): Promise<{ ok?: string; error?: string }> {
  const ctx = await actionContext();
  if ("error" in ctx) return { error: ctx.error };
  const { supabase, session } = ctx;
  if (!canPublish(session.profile)) return { error: t.form.roleRequired };
  const parsed = verificationSchema.safeParse({ document_type: documentType });
  if (!parsed.success) return { error: "Type de document invalide." };
  if (!path.startsWith(`${session.userId}/`) || path.includes("..")) return { error: "Fichier invalide." };

  const { error } = await supabase.from("owner_verifications").insert({
    user_id: session.userId, document_type: parsed.data.document_type, document_path: path,
  });
  if (error)
    return { error: error.code === "23505" ? "Un dossier est déjà en cours de contrôle." : dbMessage(error) };
  revalidatePath("/espace/verification");
  return { ok: t.verif.sent };
}
