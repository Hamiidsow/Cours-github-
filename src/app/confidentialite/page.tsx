import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function Page() {
  return (
    <article className="container-page prose-legal max-w-3xl py-10">
      <h1 className="h1">Politique de confidentialité</h1>
      <p className="mt-4 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
        Document de travail : ce texte est un modèle à faire relire et compléter par un juriste avant l'ouverture au public.
        Les mentions entre crochets restent à renseigner.
      </p>
      <h2>1. Responsable du traitement</h2>
      <p>[Dénomination sociale, adresse et contact du responsable à renseigner.] Le traitement des données personnelles est soumis à la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel. [Référence de la déclaration auprès de la Commission de protection des données personnelles (CDP) à renseigner.]</p>
      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Compte :</strong> nom affiché, adresse e-mail, numéro de téléphone, rôle.</li>
        <li><strong>Annonces :</strong> description du bien, photos, prix, téléphone de contact, adresse précise (non publiée).</li>
        <li><strong>Vérification :</strong> pièce d'identité, titre de propriété ou mandat de gestion.</li>
        <li><strong>Usage :</strong> favoris, recherches enregistrées, demandes de visite, signalements, journal des consultations de numéros.</li>
      </ul>
      <h2>3. Qui voit quoi</h2>
      <ul>
        <li><strong>Public :</strong> le contenu de l'annonce publiée, le nom affiché de l'annonceur et son statut de vérification.</li>
        <li><strong>Utilisateurs connectés, sur demande :</strong> le téléphone de contact de l'annonce.</li>
        <li><strong>Annonceur concerné :</strong> le téléphone et le message d'une personne qui lui demande une visite.</li>
        <li><strong>Administrateurs uniquement :</strong> les documents de vérification, l'adresse précise et les signalements.</li>
      </ul>
      <p>Les documents d'identité sont conservés dans un espace de stockage privé, séparé des données publiques, et ne sont jamais affichés sur le site.</p>
      <h2>4. Finalités</h2>
      <p>Fournir le service, lutter contre la fraude, modérer les annonces et répondre aux obligations légales. Aucune donnée n'est vendue à des tiers.</p>
      <h2>5. Durée de conservation</h2>
      <p>[Durées à préciser : compte, annonces archivées, documents de vérification, journaux.]</p>
      <h2>6. Vos droits</h2>
      <p>Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données. [Adresse de contact à renseigner.]</p>
      <h2>7. Hébergement</h2>
      <p>[Hébergeurs et pays d'hébergement de l'application et de la base de données à renseigner.]</p>
    </article>
  );
}
