"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/types";

// Formulaire relié à une action serveur : affiche l'erreur ou la
// confirmation renvoyée, et désactive le bouton pendant l'envoi.
export function ActionForm({
  action, children, submitLabel, submitClass = "btn-primary", className, confirm,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  submitClass?: string;
  className?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">{state.ok}</p>
      )}
      <button type="submit" className={submitClass} disabled={pending}>
        {pending ? "…" : submitLabel}
      </button>
    </form>
  );
}
