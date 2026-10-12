import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, Flag, Trophy } from "lucide-react";
import { TournamentCard } from "@/components/tournament-card";
import { groupTournaments, tournamentSections } from "@/lib/tournament-display";
import { listTournaments } from "@/lib/public.functions";

const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: () => listTournaments(),
});

export const Route = createFileRoute("/tournois/")({
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

function TournoisPage() {
  const { data: tournaments } = useSuspenseQuery(tournamentsQuery);
  const groups = groupTournaments(tournaments, new Date().toISOString().slice(0, 10));
  const icons = { upcoming: CalendarDays, ongoing: Flag, finished: Trophy };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">Nos <span className="text-gradient-ember">tournois</span></h1>
      {tournamentSections.map(({ key, title, empty }) => {
        const Icon = icons[key];
        return (
          <section key={key} aria-label={title} className="mt-12 border-t border-border pt-8">
            <h2 className="flex items-start gap-3 text-2xl"><Icon className="mt-0.5 h-6 w-6 shrink-0 text-primary" />{title}</h2>
            {groups[key].length === 0 ? <p className="mt-4 text-muted-foreground">{empty}</p> : (
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {groups[key].map(t => <TournamentCard key={t.id} tournament={t} category={key} />)}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
