import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Trophy, Medal } from "lucide-react";
import { listStandings } from "@/lib/public.functions";

const standingsQuery = queryOptions({
  queryKey: ["standings"],
  queryFn: () => listStandings(),
});

export const Route = createFileRoute("/classements")({
  loader: ({ context }) => context.queryClient.ensureQueryData(standingsQuery),
  head: () => ({
    meta: [
      { title: "Classements — Foxes Darts" },
      {
        name: "description",
        content: "Classements des joueurs de l'association Foxes Darts, saison par saison.",
      },
      { property: "og:title", content: "Classements — Foxes Darts" },
      {
        property: "og:description",
        content: "Classements des joueurs de l'association Foxes Darts, saison par saison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassementsPage,
});

function ClassementsPage() {
  const { data: standings } = useSuspenseQuery(standingsQuery);
  const seasons = [...new Set(standings.map((s) => s.season))];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl">
        <span className="text-gradient-ember">Classements</span>
      </h1>
      <p className="mt-3 text-muted-foreground">Le classement général des joueurs du club.</p>

      {standings.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Aucun classement publié pour le moment.</p>
      ) : (
        seasons.map((season) => (
          <section key={season} className="mt-10">
            <h2 className="flex items-center gap-2 text-2xl">
              <Trophy className="h-6 w-6 text-primary" /> Saison {season}
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Joueur</th>
                    <th className="px-4 py-3 text-center font-medium">J</th>
                    <th className="px-4 py-3 text-center font-medium">V</th>
                    <th className="px-4 py-3 text-center font-medium">D</th>
                    <th className="px-4 py-3 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standings
                    .filter((s) => s.season === season)
                    .map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            {s.rank <= 3 && (
                              <Medal
                                className={
                                  s.rank === 1
                                    ? "h-4 w-4 text-primary"
                                    : "h-4 w-4 text-muted-foreground"
                                }
                              />
                            )}
                            {s.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{s.player_name}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{s.played}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{s.wins}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{s.losses}</td>
                        <td className="px-4 py-3 text-right font-semibold text-primary">
                          {s.points}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
