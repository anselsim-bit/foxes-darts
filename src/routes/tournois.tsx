import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { listTournaments } from "@/lib/public.functions";

const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: () => listTournaments(),
});

export const Route = createFileRoute("/tournois")({
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentsQuery),
  head: () => ({
    meta: [
      { title: "Tournois — Foxes Darts" },
      {
        name: "description",
        content:
          "Tous les tournois de fléchettes Foxes Darts : dates, lieux, inscriptions et billetterie HelloAsso.",
      },
      { property: "og:title", content: "Tournois — Foxes Darts" },
      {
        property: "og:description",
        content: "Dates, lieux, inscriptions et billetterie HelloAsso des tournois Foxes Darts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TournoisPage,
});

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TournoisPage() {
  const { data: tournaments } = useSuspenseQuery(tournamentsQuery);
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = tournaments.filter((t) => t.event_date >= now);
  const past = tournaments.filter((t) => t.event_date < now);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">
        Nos <span className="text-gradient-ember">tournois</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Inscrivez-vous directement sur le site ou via la billetterie HelloAsso. Créez un compte pour
        suivre vos inscriptions et vos statistiques.
      </p>

      <h2 className="mt-12 text-2xl">À venir</h2>
      {upcoming.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Aucun tournoi à venir pour le moment.</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-16 text-2xl">Tournois passés</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((t) => (
              <TournamentCard key={t.id} tournament={t} past />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TournamentCard({
  tournament,
  past = false,
}: {
  tournament: {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
    description: string | null;
    helloasso_url: string | null;
    image_url: string | null;
  };
  past?: boolean;
}) {
  return (
    <article className="card-hover overflow-hidden rounded-xl border border-border bg-card">
      {tournament.image_url && (
        <img
          src={tournament.image_url}
          alt={tournament.title}
          className="h-44 w-full object-cover"
          loading="lazy"
        />
      )}
      <div className="p-5">
        <h3 className="text-lg">{tournament.title}</h3>
        <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {formatDate(tournament.event_date)}
          </span>
          {tournament.location && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {tournament.location}
            </span>
          )}
        </div>
        {tournament.description && (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{tournament.description}</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {!past && (
            <Link
              to="/tournois/$id"
              params={{ id: tournament.id }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              S'inscrire
            </Link>
          )}
          {tournament.helloasso_url && (
            <a
              href={tournament.helloasso_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary"
            >
              <Ticket className="h-4 w-4" /> Billetterie HelloAsso
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
