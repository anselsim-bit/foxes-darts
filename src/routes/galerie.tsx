import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listPhotos } from "@/lib/public.functions";

const photosQuery = queryOptions({
  queryKey: ["photos"],
  queryFn: () => listPhotos(),
});

export const Route = createFileRoute("/galerie")({
  loader: ({ context }) => context.queryClient.ensureQueryData(photosQuery),
  head: () => ({
    meta: [
      { title: "Galerie photos — Foxes Darts" },
      {
        name: "description",
        content: "Les photos des tournois et soirées de l'association Foxes Darts.",
      },
      { property: "og:title", content: "Galerie photos — Foxes Darts" },
      {
        property: "og:description",
        content: "Les photos des tournois et soirées de l'association Foxes Darts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GaleriePage,
});

function GaleriePage() {
  const { data: photos } = useSuspenseQuery(photosQuery);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">
        Galerie <span className="text-gradient-ember">photos</span>
      </h1>
      <p className="mt-3 text-muted-foreground">
        Les meilleurs moments de nos tournois, au fil de la saison.
      </p>

      {photos.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Aucune photo pour le moment.</p>
      ) : (
        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {photos.map((p) => (
            <figure
              key={p.id}
              className="card-hover mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card"
            >
              {p.image_url && (
                <img src={p.image_url} alt={p.caption ?? "Photo de tournoi"} className="w-full" loading="lazy" />
              )}
              {(p.caption || p.tournament_title) && (
                <figcaption className="p-3 text-sm text-muted-foreground">
                  {p.caption}
                  {p.tournament_title && (
                    <span className="mt-1 block text-xs text-primary">{p.tournament_title}</span>
                  )}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
