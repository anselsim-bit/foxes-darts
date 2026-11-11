import { createFileRoute } from "@tanstack/react-router";
import { AccountForm } from "@/components/account-form";
import { oauthReturnPath } from "@/lib/oauth-return-path";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string"
      ? { redirect: oauthReturnPath(r) }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Connexion — Foxes Darts" },
      { name: "description", content: "Connectez-vous à votre compte joueur ou organisateur Foxes Darts." },
      { property: "og:title", content: "Connexion — Foxes Darts" },
      { property: "og:description", content: "Connectez-vous à votre compte joueur ou organisateur Foxes Darts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  return <AccountForm redirectTo={redirect} />;
}
