import { createFileRoute } from "@tanstack/react-router";
import { AccountForm } from "@/components/account-form";
import { oauthReturnPath } from "@/lib/oauth-return-path";
export const Route = createFileRoute("/inscription/organisateur")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => typeof search["redirect"] === "string" ? { redirect: oauthReturnPath(search["redirect"]) } : {},
  head: () => ({ meta: [{ title: "Inscription organisateur — Foxes Darts" }, { name: "description", content: "Inscrivez votre organisation sur Foxes Darts avec les coordonnées de son responsable." }, { property: "og:title", content: "Inscription organisateur — Foxes Darts" }, { property: "og:description", content: "Inscrivez votre organisation sur Foxes Darts avec les coordonnées de son responsable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Signup,
});
function Signup() { const { redirect } = Route.useSearch(); return <AccountForm kind="organizer" redirectTo={redirect} />; }
