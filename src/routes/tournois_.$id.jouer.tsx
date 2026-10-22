import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getTournament } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { TournamentPlay } from "@/components/tournament-play";

const tournamentQuery = (id: string) =>
  queryOptions({
    queryKey: ["tournament", id],
    queryFn: () => getTournament({ data: { id } }),
  });

export const Route = createFileRoute("/tournois_/$id/jouer")({
  validateSearch: (search: Record<string, unknown>): { code?: string } =>
    typeof search["code"] === "string" ? { code: search["code"] } : {},
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tournamentQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `Participer — ${loaderData?.title ?? "Tournoi"} — Foxes Darts` },
      {
        name: "description",
        content: "Saisissez votre code d'accès et jouez votre match de tournoi Foxes Darts.",
      },
      { property: "og:title", content: `Participer — ${loaderData?.title ?? "Tournoi"} — Foxes Darts` },
      {
        property: "og:description",
        content: "Saisissez votre code d'accès et jouez votre match de tournoi Foxes Darts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl">Tournoi introuvable</h1>
      <p className="mt-3 text-muted-foreground">Ce tournoi n'existe plus ou a été supprimé.</p>
      <Link to="/tournois" className="mt-6 inline-block text-primary">Voir les tournois</Link>
    </div>
  ),
  component: TournamentPlayPage,
});

function TournamentPlayPage() {
  const { id } = Route.useParams();
  const { code: qrCode } = Route.useSearch();
  const { data: tournament } = useSuspenseQuery(tournamentQuery(id));
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setSignedIn(!!user);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link to="/tournois/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour au tournoi
      </Link>
      <h1 className="mt-6 text-4xl">{tournament.title}</h1>
      <p className="mt-2 text-muted-foreground">Participez au tournoi : code d'accès, choix du match, puis compteur de fléchettes.</p>
      {tournament.status !== "started" ? (
        <p className="mt-8 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Le tournoi n'a pas encore commencé. Revenez une fois qu'il sera lancé par l'organisateur.
        </p>
      ) : (
        <TournamentPlay key={id} tournamentId={id} signedIn={signedIn} qrCode={qrCode} />
      )}
    </div>
  );
}
