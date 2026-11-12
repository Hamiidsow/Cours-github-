import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales", alternates: { canonical: "/mentions-legales" } };

export default function Page() {
  return (
    <article className="container-page prose-legal max-w-3xl py-10">
      <h1 className="h1">Mentions légales</h1>
      <p className="mt-4 rounded-lg bg-gold-50 p-3 text-sm text-gold-700">
        Document de travail : ce texte est un modèle à faire relire et compléter par un juriste avant l'ouverture au public.
        Les mentions entre crochets restent à renseigner.
      </p>
      <h2>Éditeur du site</h2>
      <p>[Dénomination sociale, forme juridique, capital, siège social, NINEA, RCCM.]</p>
      <p>[Directeur de la publication.] [Adresse e-mail et téléphone de contact.]</p>
      <h2>Hébergement</h2>
      <p>[Nom et adresse de l'hébergeur de l'application et de la base de données.]</p>
      <h2>Propriété intellectuelle</h2>
      <p>La marque, le logo et l'interface de SamaKeur sont protégés. Les textes et photos des annonces restent la propriété de leurs auteurs, qui autorisent leur affichage sur la plateforme.</p>
      <h2>Annonces de démonstration</h2>
      <p>Les annonces portant l'étiquette « Annonce fictive » sont des exemples sans existence réelle, destinés uniquement à présenter le fonctionnement du site.</p>
    </article>
  );
}
