import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation", alternates: { canonical: "/conditions" } };

export default function Page() {
  return (
    <article className="container-page prose-legal max-w-3xl py-10">
      <h1 className="h1">Conditions d'utilisation</h1>
      <p className="mt-4 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
        Document de travail : ce texte est un modèle à faire relire et compléter par un juriste avant l'ouverture au public.
        Les mentions entre crochets restent à renseigner.
      </p>
      <h2>1. Objet</h2>
      <p>SamaKeur est une plateforme de mise en relation directe entre des personnes proposant un bien immobilier au Sénégal et des personnes recherchant un bien. SamaKeur n'est ni agent immobilier, ni partie aux contrats conclus entre utilisateurs, et ne perçoit aucune commission d'intermédiation.</p>
      <h2>2. Comptes</h2>
      <ul>
        <li>L'inscription est gratuite. Les informations fournies doivent être exactes.</li>
        <li>Chaque utilisateur est responsable de la confidentialité de son mot de passe.</li>
        <li>Un gestionnaire ne peut publier que des biens pour lesquels il détient un mandat écrit du propriétaire.</li>
      </ul>
      <h2>3. Annonces</h2>
      <ul>
        <li>L'annonceur garantit qu'il a le droit de proposer le bien et que la description, les photos et le prix sont sincères.</li>
        <li>Chaque annonce est relue avant publication. SamaKeur peut refuser, suspendre ou retirer une annonce contraire aux présentes conditions.</li>
        <li>Sont interdits : les annonces fictives, les prix d'appel trompeurs, les demandes de paiement avant visite et tout contenu discriminatoire ou illicite.</li>
      </ul>
      <h2>4. Vérification</h2>
      <p>Le badge « Vérifié » indique que des documents ont été contrôlés par un administrateur. Il ne constitue pas une garantie sur le bien ni sur l'issue de la transaction.</p>
      <h2>5. Signalement et suspension</h2>
      <p>Tout utilisateur peut signaler une annonce. En cas de fraude ou de manquement, le compte peut être suspendu ; les annonces associées sont alors retirées. Chaque décision de modération est consignée.</p>
      <h2>6. Responsabilité</h2>
      <p>Les utilisateurs restent seuls responsables de leurs échanges, visites, paiements et contrats. Il est fortement recommandé de ne rien payer avant d'avoir visité le bien et vérifié les documents.</p>
      <h2>7. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit sénégalais. [Juridiction compétente à préciser.]</p>
    </article>
  );
}
