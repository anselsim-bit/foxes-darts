import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  validateSearch: (search: Record<string, unknown>): { organisation?: string | undefined } => ({ organisation: typeof search["organisation"] === "string" ? search["organisation"] : undefined }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tournamentsQuery),
  head: () => ({
    meta: [
      { title: "Tournois — Foxes Darts" },
      {
        name: "description",
        content:
          "Tous les tournois de fléchettes de toutes les organisations : dates, lieux, inscriptions et billetterie HelloAsso.",
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
  const { data: all } = useSuspenseQuery(tournamentsQuery);
  const { organisation } = Route.useSearch();
  const navigate = useNavigate({ from: "/tournois/" });
  const organizations = [...new Map(all.filter((t) => t.organization_slug).map((t) => [t.organization_slug as string, t.organization_name ?? t.organization_slug])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "fr"));
  const tournaments = organisation ? all.filter((t) => t.organization_slug === organisation) : all;
  const groups = groupTournaments(tournaments, new Date().toISOString().slice(0, 10));
  const icons = { upcoming: CalendarDays, ongoing: Flag, finished: Trophy };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">Nos <span className="text-gradient-ember">tournois</span></h1>
      <label className="mt-6 flex max-w-sm flex-col gap-2 text-sm text-muted-foreground">
        Organisation
        <select
          value={organisation ?? ""}
          onChange={(e) => navigate({ search: { organisation: e.target.value || undefined } })}
          className="h-10 rounded-md border border-input bg-background px-3 text-foreground"
        >
          <option value="">Toutes les organisations</option>
          {organizations.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
        </select>
      </label>
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
