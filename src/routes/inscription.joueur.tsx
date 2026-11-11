import { createFileRoute } from "@tanstack/react-router";
import { AccountForm } from "@/components/account-form";
import { oauthReturnPath } from "@/lib/oauth-return-path";
export const Route = createFileRoute("/inscription/joueur")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => typeof search["redirect"] === "string" ? { redirect: oauthReturnPath(search["redirect"]) } : {},
  head: () => ({ meta: [{ title: "Inscription joueur — Foxes Darts" }, { name: "description", content: "Créez votre compte joueur Foxes Darts et retrouvez vos inscriptions et statistiques." }, { property: "og:title", content: "Inscription joueur — Foxes Darts" }, { property: "og:description", content: "Créez votre compte joueur Foxes Darts et retrouvez vos inscriptions et statistiques." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Signup,
});
function Signup() { const { redirect } = Route.useSearch(); return <AccountForm kind="player" redirectTo={redirect} />; }
