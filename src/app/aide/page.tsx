import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aide et sécurité",
  description: "Conseils pour chercher ou publier un bien en sécurité sur SamaKeur, et réponses aux questions fréquentes.",
  alternates: { canonical: "/aide" },
};

const faq: [string, string][] = [
  ["SamaKeur prend-elle une commission ?", "Non. La plateforme met en relation directe et ne prélève aucune commission d'intermédiation. Le loyer, la caution et l'avance se règlent entre vous et le propriétaire."],
  ["Comment contacter un propriétaire ?", "Créez un compte gratuit, ouvrez l'annonce puis touchez « Afficher le numéro ». Vous pouvez ensuite appeler ou écrire sur WhatsApp."],
  ["Que signifie le badge « Vérifié » ?", "Le titulaire du compte a envoyé une pièce d'identité ou un justificatif, contrôlé manuellement par un administrateur. Sans ce contrôle, le badge n'apparaît jamais. Il ne garantit pas le bien lui-même : visitez toujours."],
  ["Comment publier une annonce ?", "Inscrivez-vous comme propriétaire ou gestionnaire, remplissez le formulaire et ajoutez des photos. Un administrateur relit chaque annonce avant sa mise en ligne."],
  ["Pourquoi mon annonce est-elle « en attente » ?", "Toute nouvelle annonce, et toute modification d'une annonce publiée, est relue par la modération avant d'être visible."],
  ["Comment signaler une annonce suspecte ?", "Connectez-vous, ouvrez l'annonce et utilisez « Signaler cette annonce ». L'équipe de modération examine chaque signalement."],
];

export default function HelpPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="h1">Aide et sécurité</h1>

      <section className="mt-6 rounded-2xl bg-brand-50 p-5">
        <h2 className="h2">Les règles d'or contre les arnaques</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-ink/90">
          <li>Ne versez <strong>jamais</strong> d'argent (caution, avance, « frais de visite ») avant d'avoir visité le bien.</li>
          <li>Demandez à voir une pièce d'identité et un justificatif de propriété ou un mandat de gestion.</li>
          <li>Méfiez-vous d'un prix très inférieur au marché ou d'un interlocuteur pressé.</li>
          <li>Exigez un reçu pour tout paiement et, si possible, un contrat de bail écrit.</li>
          <li>Signalez toute annonce douteuse : cela protège les autres utilisateurs.</li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="h2">Questions fréquentes</h2>
        <div className="mt-3 grid gap-2">
          {faq.map(([q, a]) => (
            <details key={q} className="card p-4">
              <summary className="cursor-pointer font-semibold text-brand-950">{q}</summary>
              <p className="mt-2 text-[15px] text-ink/90">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h2">Nous contacter</h2>
        <p className="mt-2 text-[15px] text-ink/90">
          Le canal d'assistance (e-mail et téléphone) sera indiqué ici avant l'ouverture au public.
          En attendant, utilisez le bouton de signalement présent sur chaque annonce.
        </p>
      </section>
    </div>
  );
}
