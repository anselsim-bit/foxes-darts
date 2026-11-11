import { createFileRoute, redirect } from "@tanstack/react-router";
// Ancienne adresse des pages publiques : redirige vers /nom-organisation.
export const Route = createFileRoute("/o/$slug")({
  beforeLoad: ({ params }) => { throw redirect({ to: "/$slug", params: { slug: params.slug }, statusCode: 301 }); },
});
