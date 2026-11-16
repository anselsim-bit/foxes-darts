import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({ meta: [
    { title: "Mentions légales — Foxes Darts" },
    { name: "description", content: "Identité de l’association LES FOXES de Saint Léonard, éditeur de Foxes Darts, et contact." },
    { property: "og:title", content: "Mentions légales — Foxes Darts" },
    { property: "og:description", content: "Éditeur, responsable de publication et informations légales de Foxes Darts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: LegalPage,
});

function LegalPage() {
  return <article className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-foreground">
    <h1 className="text-3xl">Mentions légales</h1>
    <section className="space-y-3"><h2 className="text-xl">Éditeur du site</h2>
      <p>Association LES FOXES de Saint Léonard — sigle ALFDSL.</p>
      <p>Siège social : 21 Avenue Belle Isle, 62260 SAINT LEONARD, France.</p>
      <p>SIREN : 890892136<br />SIRET : 890 892 136 00015</p>
      <p>Responsable de publication : Simon Ansel.</p>
      <p>Contact : <a className="text-primary underline" href="mailto:simon.ansel@outlook.com">simon.ansel@outlook.com</a>.</p>
    </section>
    <section className="space-y-3"><h2 className="text-xl">Hébergement</h2>
      <p>Le site est hébergé via la plateforme Lovable. Informations sur le prestataire : <a className="text-primary underline" href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">politique de confidentialité de Lovable</a>.</p>
      <p className="text-muted-foreground">La raison sociale contractuelle, l’adresse postale et le numéro de téléphone de l’hébergeur restent à confirmer pour compléter cette rubrique.</p>
    </section>
    <section className="space-y-3"><h2 className="text-xl">Contenus et propriété intellectuelle</h2><p>Les textes, photographies, logos et autres contenus restent la propriété de leurs titulaires respectifs. Leur réutilisation nécessite l’autorisation du titulaire, sauf exceptions prévues par la loi.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Tournois et organisations</h2><p>Chaque organisateur est responsable des informations, conditions d’inscription et règles de ses tournois. Lorsque la billetterie est assurée par HelloAsso, le paiement et l’inscription sont réalisés sur cette plateforme.</p></section>
    <section className="space-y-3"><h2 className="text-xl">Données personnelles</h2><p>Consultez notre <Link className="text-primary underline" to="/confidentialite">politique de confidentialité</Link> pour connaître les données utilisées et exercer vos droits.</p></section>
  </article>;
}