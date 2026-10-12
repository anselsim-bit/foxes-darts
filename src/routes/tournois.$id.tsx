import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import { getTournament } from "@/lib/public.functions";
import {
  registerForTournament,
  cancelRegistration,
  getMyRegistrationIds,
} from "@/lib/player.functions";
import { supabase } from "@/integrations/supabase/client";
import { TournamentBoard } from "@/components/tournament-board";
import { TournamentPlay } from "@/components/tournament-play";

const tournamentQuery = (id: string) =>
  queryOptions({
    queryKey: ["tournament", id],
    queryFn: () => getTournament({ data: { id } }),
  });

export const Route = createFileRoute("/tournois/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tournamentQuery(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Tournoi"} — Foxes Darts` },
      {
        name: "description",
        content: loaderData?.description ?? "Tournoi de fléchettes Foxes Darts.",
      },
      { property: "og:title", content: `${loaderData?.title ?? "Tournoi"} — Foxes Darts` },
      {
        property: "og:description",
        content: loaderData?.description ?? "Tournoi de fléchettes Foxes Darts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.image_url
        ? [
            { property: "og:image", content: loaderData.image_url },
            { name: "twitter:image", content: loaderData.image_url },
          ]
        : []),
    ],
  }),
  component: TournamentDetail,
});

function TournamentDetail() {
  const { id } = Route.useParams();
  const { data: tournament } = useSuspenseQuery(tournamentQuery(id));
  const [signedIn, setSignedIn] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [teamName, setTeamName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(!!user);
      if (user) {
        const ids = await getMyRegistrationIds();
        if (active) setRegistered(ids.includes(id));
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const isFull = !!tournament.max_participants && tournament.registrations_count >= tournament.max_participants;
  const isPast = tournament.event_date < new Date().toISOString().slice(0, 10);

  const toggleRegistration = async () => {
    setBusy(true);
    try {
      if (registered) {
        await cancelRegistration({ data: { tournamentId: id } });
        setRegistered(false);
        toast.success("Inscription annulée.");
      } else {
        const res = await registerForTournament({ data: { tournamentId: id, teamName: teamName || undefined } });
        if (res.ok) {
          setRegistered(true);
          toast.success(res.message);
        } else {
          toast.info(res.message);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      queryClient.invalidateQueries({ queryKey: ["board", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link to="/tournois" className="text-sm text-muted-foreground hover:text-foreground">
        ← Tous les tournois
      </Link>

      {tournament.image_url && (
        <img
          src={tournament.image_url}
          alt={tournament.title}
          className="mt-6 max-h-96 w-full rounded-2xl border border-border object-cover"
        />
      )}

      <h1 className="mt-8 text-4xl">{tournament.title}</h1>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          {new Date(tournament.event_date + "T00:00:00").toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {tournament.start_time ? ` · ${tournament.start_time.slice(0, 5).replace(":", "h")}${tournament.end_time ? ` – ${tournament.end_time.slice(0, 5).replace(":", "h")}` : ""}` : ""}
        </span>
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          {tournament.format === "equipe" ? "En équipe" : "Solo"}
          {tournament.max_participants ? ` · ${tournament.max_participants} ${tournament.format === "equipe" ? "équipes" : "participants"} max` : ""}
        </span>
        {tournament.location && (
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {tournament.location}
          </span>
        )}
        <span className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> {tournament.registrations_count}
          {tournament.max_participants ? ` / ${tournament.max_participants}` : ""}{" "}
          {tournament.format === "equipe" ? `équipe${tournament.registrations_count > 1 ? "s" : ""} de ${tournament.team_size}` : `inscrit${tournament.registrations_count > 1 ? "s" : ""}`}
        </span>
      </div>

      {tournament.description && (
        <p className="mt-6 whitespace-pre-line text-muted-foreground">{tournament.description}</p>
      )}

      {!isPast && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5">
          {tournament.status !== "open" ? (
            <span className="font-medium text-muted-foreground">Le tournoi a commencé — inscriptions closes.</span>
          ) : isFull && !registered ? (
            <span className="rounded-md border border-border px-6 py-3 font-semibold text-muted-foreground">Complet</span>
          ) : tournament.helloasso_url ? (
            <>
              {signedIn && registered && (
                <button
                  onClick={toggleRegistration}
                  disabled={busy}
                  className="rounded-md border border-border px-6 py-3 font-medium transition-colors hover:border-destructive hover:text-destructive"
                >
                  {busy ? "..." : "Annuler mon inscription"}
                </button>
              )}
              <a
                href={tournament.helloasso_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Ticket className="h-4 w-4" /> Billetterie HelloAsso
              </a>
            </>
          ) : signedIn ? (
            <>
            {tournament.format === "equipe" && !registered && (
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Nom de votre équipe"
                className="rounded-md border border-input bg-background px-3 py-3 text-sm"
              />
            )}
            <button
              onClick={toggleRegistration}
              disabled={busy}
              className={
                registered
                  ? "rounded-md border border-border px-6 py-3 font-medium transition-colors hover:border-destructive hover:text-destructive"
                  : "rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              }
            >
              {busy ? "..." : registered ? "Annuler mon inscription" : tournament.format === "equipe" ? "Inscrire mon équipe" : "Je m'inscris"}
            </button>
            </>
          ) : (
            <button
              onClick={() =>
                navigate({ to: "/auth", search: { redirect: `/tournois/${tournament.id}` } })
              }
              className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Connectez-vous pour vous inscrire
            </button>
          )}
        </div>
      )}

      {tournament.status === "started" && <TournamentPlay tournamentId={id} signedIn={signedIn} />}
      <TournamentBoard
        key={tournament.status}
        tournamentId={id}
        status={tournament.status}
        poolCount={tournament.pool_count}
        maxParticipants={tournament.max_participants}
        isTeam={tournament.format === "equipe"}
      />
    </div>
  );
}
