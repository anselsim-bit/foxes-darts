import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type OrganizationContext = { supabase: SupabaseClient<Database>; userId: string };

/** Resolve the historical site through its persisted identity, never a browser-selected role. */
export async function centralOrganizationId(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from("organizations").select("id").eq("slug", "foxes-darts").maybeSingle();
  if (error || !data) throw new Error("Organisation Foxes Darts indisponible.");
  return data.id;
}

export async function canManageTournament(context: OrganizationContext, tournamentId: string) {
  const { data, error } = await context.supabase.rpc("can_manage_tournament", { _tournament_id: tournamentId });
  return !error && data === true;
}

export async function requireTournamentManager(context: OrganizationContext, tournamentId: string) {
  if (!(await canManageTournament(context, tournamentId))) throw new Error("Accès réservé aux administrateurs de ce tournoi.");
}

export async function requireCentralManager(context: OrganizationContext) {
  const id = await centralOrganizationId(context.supabase);
  const { data, error } = await context.supabase.rpc("can_manage_organization", { _organization_id: id });
  if (error || data !== true) throw new Error("Accès réservé aux administrateurs de Foxes Darts.");
  return id;
}

export async function requireTeamManager(context: OrganizationContext, teamId: string) {
  const { data, error } = await context.supabase.from("tournament_teams").select("tournament_id").eq("id", teamId).maybeSingle();
  if (error || !data) throw new Error("Équipe introuvable.");
  await requireTournamentManager(context, data.tournament_id);
}

export async function requireOrganizationPlayer(context: OrganizationContext, organizationId: string, userId: string) {
  const { data, error } = await context.supabase.from("organization_players").select("user_id").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  if (error || !data) throw new Error("Ce joueur n'appartient pas à cette organisation.");
}

export async function requirePlatformAdmin(context: OrganizationContext) {
  const { data, error } = await context.supabase.rpc("is_platform_admin");
  if (error || data !== true) throw new Error("La modification des statistiques globales est réservée à l'administration centrale.");
}