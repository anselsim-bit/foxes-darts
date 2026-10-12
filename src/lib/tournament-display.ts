export type TournamentCategory = "upcoming" | "ongoing" | "finished";

export type TournamentDisplay = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  format: string;
  max_participants: number | null;
  registrations_count: number;
  status: string;
  location: string | null;
  description: string | null;
  helloasso_url: string | null;
  image_url: string | null;
};

export function isTournamentFull(tournament: Pick<TournamentDisplay, "max_participants" | "registrations_count">) {
  return tournament.max_participants !== null && tournament.max_participants > 0 && tournament.registrations_count >= tournament.max_participants;
}

export function tournamentCategory(tournament: Pick<TournamentDisplay, "status" | "event_date">, today: string): TournamentCategory {
  if (tournament.status === "finished") return "finished";
  if (tournament.status === "started") return "ongoing";
  return tournament.event_date < today ? "finished" : "upcoming";
}

export function groupTournaments(tournaments: TournamentDisplay[], today: string) {
  const groups: Record<TournamentCategory, TournamentDisplay[]> = { upcoming: [], ongoing: [], finished: [] };
  for (const tournament of tournaments) groups[tournamentCategory(tournament, today)].push(tournament);
  groups.upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date));
  groups.finished.sort((a, b) => b.event_date.localeCompare(a.event_date));
  return groups;
}

export const tournamentSections = [
  { key: "upcoming", title: "Prochains tournois", empty: "Aucun tournoi à venir pour le moment." },
  { key: "ongoing", title: "Tournois en cours", empty: "Aucun tournoi en cours pour le moment." },
  { key: "finished", title: "Tournois terminés", empty: "Aucun tournoi terminé pour le moment." },
] as const;