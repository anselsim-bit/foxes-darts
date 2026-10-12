import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Trophy, Images, Zap, ArrowRight, Ticket } from "lucide-react";
import { listTournaments, listPhotos, listStandings, listHighlights } from "@/lib/public.functions";
import heroImg from "@/assets/hero-darts.jpg";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const [tournaments, photos, standings, highlights] = await Promise.all([
      listTournaments(),
      listPhotos(),
      listStandings(),
      listHighlights(),
    ]);
    return { tournaments, photos, standings, highlights };
  },
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  head: () => ({
    meta: [
      { title: "Foxes Darts — Association de fléchettes" },
      {
        name: "description",
        content:
          "Foxes Darts : tournois de fléchettes, billetterie HelloAsso, photos, classements et statistiques des joueurs.",
      },
      { property: "og:title", content: "Foxes Darts — Association de fléchettes" },
      {
        property: "og:description",
        content:
          "Tournois, billetterie HelloAsso, photos, classements et statistiques des joueurs de l'association Foxes Darts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Index() {
  const { data } = useSuspenseQuery(homeQuery);
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = data.tournaments.filter((t) => t.event_date >= now).slice(0, 3);
  const photos = data.photos.slice(0, 4);
  const topPlayers = data.standings.slice(0, 5);
  const highlights = data.highlights.slice(0, 3);

  return (
    <div>
      {/* Héro */}
      <section className="hero-texture relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">
              Association de fléchettes
            </p>
            <h1 className="mt-3 text-5xl leading-tight md:text-6xl">
              Foxes <span className="text-gradient-ember">Darts</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Tournois, convivialité et compétition. Rejoignez le club, inscrivez-vous aux tournois
              et suivez vos statistiques de jeu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/tournois"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Voir les tournois <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium transition-colors hover:border-primary"
              >
                Créer mon compte joueur
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroImg}
              alt="Fléchettes plantées dans le bullseye"
              width={1600}
              height={912}
              className="rounded-2xl border border-border object-cover shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Prochains tournois */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-3xl">
            <CalendarDays className="h-7 w-7 text-primary" /> Prochains tournois
          </h2>
          <Link to="/tournois" className="text-sm font-medium text-primary hover:underline">
            Tout voir
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            Les prochains tournois seront annoncés très bientôt.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {upcoming.map((t) => (
              <article
                key={t.id}
                className="card-hover overflow-hidden rounded-xl border border-border bg-card"
              >
                {t.image_url && (
                  <img
                    src={t.image_url}
                    alt={t.title}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <h3 className="text-lg">
                    <Link
                      to="/tournois/$id"
                      params={{ id: t.id }}
                      className="transition-colors hover:text-primary"
                    >
                      {t.title}
                    </Link>
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 text-primary" /> {formatDate(t.event_date)}{t.start_time ? ` · ${t.start_time.slice(0, 5).replace(":", "h")}${t.end_time ? ` – ${t.end_time.slice(0, 5).replace(":", "h")}` : ""}` : ""}
                  </p>
                  {t.location && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" /> {t.location}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {t.helloasso_url ? (
                      <a
                        href={t.helloasso_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Ticket className="h-4 w-4" /> HelloAsso
                      </a>
                    ) : (
                      <Link
                        to="/tournois/$id"
                        params={{ id: t.id }}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        S'inscrire
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Classement + Grandes actions */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <div className="flex items-end justify-between">
              <h2 className="flex items-center gap-2 text-3xl">
                <Trophy className="h-7 w-7 text-primary" /> Classement
              </h2>
              <Link to="/classements" className="text-sm font-medium text-primary hover:underline">
                Classement complet
              </Link>
            </div>
            {topPlayers.length === 0 ? (
              <p className="mt-6 text-muted-foreground">Le classement arrive bientôt.</p>
            ) : (
              <ol className="mt-6 space-y-2">
                {topPlayers.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-display text-xs">
                        {s.rank}
                      </span>
                      <span className="font-medium">{s.player_name}</span>
                    </span>
                    <span className="font-semibold text-primary">{s.points} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-3xl">
              <Zap className="h-7 w-7 text-primary" /> Grandes actions
            </h2>
            {highlights.length === 0 ? (
              <p className="mt-6 text-muted-foreground">
                Les temps forts de la saison seront publiés ici.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {highlights.map((h) => (
                  <article
                    key={h.id}
                    className="card-hover rounded-xl border border-border bg-card p-5"
                  >
                    <h3 className="text-base">{h.title}</h3>
                    {h.event_date && (
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(h.event_date)}</p>
                    )}
                    {h.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {h.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Galerie */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-3xl">
            <Images className="h-7 w-7 text-primary" /> Dernières photos
          </h2>
          <Link to="/galerie" className="text-sm font-medium text-primary hover:underline">
            Toute la galerie
          </Link>
        </div>
        {photos.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Les photos des tournois arrivent bientôt.</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {photos.map((p) => (
              <figure
                key={p.id}
                className="card-hover overflow-hidden rounded-xl border border-border bg-card"
              >
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={p.caption ?? "Photo de tournoi"}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                )}
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
