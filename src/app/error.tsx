"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page py-20 text-center">
      <h1 className="h1">Une erreur est survenue</h1>
      <p className="mt-3 text-muted">Vérifiez votre connexion Internet puis réessayez.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Réessayer</button>
    </div>
  );
}
