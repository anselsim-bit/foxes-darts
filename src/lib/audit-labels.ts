/** Turns technical activity codes into readable French sentences for organization dashboards. */
export type AuditMatch = { tournament: string; stage: string; teamA: string; teamB: string; winner: string | null; scoreA: number | null; scoreB: number | null; legsA: number | null; legsB: number | null };

const STAGES: Record<string, string> = { pool: "poule", bracket: "phase finale", small_final: "petite finale", consolation: "consolante" };

export function describeAudit(action: string, details: Record<string, unknown> | null | undefined, match?: AuditMatch | null): string {
  const d = details ?? {};
  switch (action) {
    case "tournament.result_recorded": {
      if (!match) return "Résultat de match enregistré";
      const stage = STAGES[match.stage] ?? match.stage;
      const loser = match.winner === match.teamA ? match.teamB : match.teamA;
      const legs = match.legsA != null && match.legsB != null && match.stage !== "pool" ? ` (${Math.max(match.legsA, match.legsB)}–${Math.min(match.legsA, match.legsB)})` : "";
      const rest = match.winner === match.teamA ? match.scoreB : match.scoreA;
      return `${match.tournament} · ${stage} : ${match.winner ?? "?"} bat ${loser}${legs}${rest != null ? `, ${loser} finit avec ${rest} points restants` : ""}`;
    }
    case "tournament.started": return "Tournoi lancé";
    case "organization.created": return "Organisation créée";
    case "organization.settings_changed": return "Paramètres de l’organisation modifiés";
    case "organization.status_changed": return d["status"] === "suspended" ? "Organisation suspendue" : "Organisation réactivée";
    case "invitation.created": return "Invitation d’un collaborateur envoyée";
    case "tournament_limit_changed": return d["limit"] == null ? "Nombre de tournois rendu illimité" : `Nombre maximum de tournois fixé à ${String(d["limit"])}`;
    case "organization_onboarding_opened": return "Création d’organisations ouverte";
    case "organization_onboarding_closed": return "Création d’organisations fermée";
    case "initial_migration_roles": return "Rôles initiaux attribués";
    default: return action.replace(/[._]/g, " ");
  }
}
