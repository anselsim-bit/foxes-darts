import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, MapPin, Trophy, Target, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getMyRegistrations,
  getMyStats,
  getMyProfile,
  updateMyProfile,
  cancelRegistration,
} from "@/lib/player.functions";

const mySpaceQuery = queryOptions({
  queryKey: ["my-space"],
  queryFn: async () => {
    const [registrations, stats, profile] = await Promise.all([
      getMyRegistrations(),
      getMyStats(),
      getMyProfile(),
    ]);
    return { registrations, stats, profile };
  },
});

export const Route = createFileRoute("/_authenticated/mon-espace")({
  loader: ({ context }) => context.queryClient.ensureQueryData(mySpaceQuery),
  head: () => ({
    meta: [
      { title: "Mon espace — Foxes Darts" },
      { name: "description", content: "Vos inscriptions aux tournois et vos statistiques de jeu." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MonEspace,
});

function MonEspace() {
  const { data } = useSuspenseQuery(mySpaceQuery);
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(data.profile.display_name);
  const [saving, setSaving] = useState(false);
  const { stats } = data;
  const winRate =
    stats.matches_played > 0 ? Math.round((stats.wins / stats.matches_played) * 100) : 0;

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateMyProfile({ data: { displayName } });
      toast.success("Profil mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["my-space"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (tournamentId: string) => {
    try {
      await cancelRegistration({ data: { tournamentId } });
      toast.success("Inscription annulée.");
      queryClient.invalidateQueries({ queryKey: ["my-space"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl">
        Mon <span className="text-gradient-ember">espace</span>
      </h1>

      {/* Profil */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl">Mon profil</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-52">
            <label className="mb-1 block text-sm font-medium" htmlFor="displayName">
              Nom de joueur
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "..." : "Enregistrer"}
          </button>
        </div>
      </section>

      {/* Statistiques */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-2xl">
          <Trophy className="h-6 w-6 text-primary" /> Mes statistiques
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Matchs joués", value: stats.matches_played },
            { label: "Victoires", value: stats.wins },
            { label: "Défaites", value: stats.losses },
            { label: "Meilleur score", value: stats.best_score },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-card p-5 text-center"
            >
              <p className="font-display text-3xl text-primary">{s.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
        {stats.matches_played > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Taux de victoire : <span className="font-semibold text-primary">{winRate} %</span>
          </p>
        )}
      </section>

      {/* Inscriptions */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-2xl">
          <Target className="h-6 w-6 text-primary" /> Mes inscriptions
        </h2>
        {data.registrations.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Vous n'êtes inscrit à aucun tournoi.{" "}
            <Link to="/tournois" className="text-primary hover:underline">
              Découvrir les tournois
            </Link>
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.registrations.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{r.tournament_title}</p>
                  <p className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {r.event_date && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        {new Date(r.event_date + "T00:00:00").toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    {r.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" /> {r.location}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => cancel(r.tournament_id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" /> Annuler
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
