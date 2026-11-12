import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  buildBracket,
  buildPoolFinals,
  distributePools,
  nextSlot,
  poolStandings,
  roundRobin,
  shuffle,
  type MatchDraft,
} from "@/lib/bracket";
import { publicClient } from "@/lib/public.functions";
import { phaseRules, validateFinalLegs, validateLegWinners, validateLiveLegs, validateLiveLegWinners, type LegSide } from "@/lib/dart-rules";
import { canManageTournament, requireTournamentManager, requireTeamManager, requireCentralManager } from "@/lib/organization-access";
import { assertResultWritable } from "@/lib/tournament-result-access";
import { validateManualPlayers, type ManualPlayerInput } from "./manual-player-data";
import { teamIsPaid } from "./team-payment";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function isAdmin(ctx: Ctx) {
  try { await requireCentralManager(ctx); return true; } catch { return false; }
}

export const getTournamentBoard = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: teams }, { data: matches }] = await Promise.all([
      sb.from("tournament_teams").select("id, name, captain_id").eq("tournament_id", data.id).order("created_at"),
      sb
        .from("tournament_matches")
        .select("id, stage, pool_index, round, position, team_a, team_b, score_a, score_b, legs_a, legs_b, live_legs_a, live_legs_b, leg_winners, live_leg_winners, leg_rests, live_leg_rests, winner")
        .eq("tournament_id", data.id)
        .order("round")
        .order("position"),
    ]);
    return { teams: teams ?? [], matches: matches ?? [] };
  });

const toRow = (tournamentId: string) => (m: MatchDraft) => ({ ...m, tournament_id: tournamentId });

export const startTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; accessCode: string }) => ({ id: input.id, accessCode: normalizeCode(input.accessCode) }))
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.id);
    if (data.accessCode.length < 4) throw new Error("Le code d'accès doit contenir au moins 4 caractères.");
    const { data: t, error } = await context.supabase
      .from("tournaments")
      .select("status, max_participants, pool_count, revision")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    if (t.status !== "open") throw new Error("Le tournoi a déjà commencé.");
    const { data: teams } = await context.supabase.from("tournament_teams").select("id").eq("tournament_id", data.id);
    const ids = shuffle((teams ?? []).map((x) => x.id));
    if (t.max_participants && ids.length < t.max_participants)
      throw new Error("Le tournoi n'est pas encore complet.");
    if (ids.length < 2) throw new Error("Il faut au moins 2 participants.");
    let drafts: MatchDraft[];
    if (t.pool_count > 0) {
      if (ids.length < t.pool_count * 2) throw new Error("Pas assez de participants pour ce nombre de poules.");
      drafts = distributePools(ids, t.pool_count).flatMap((p, i) => roundRobin(p, i));
    } else {
      drafts = buildBracket(ids);
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: commitError } = await supabaseAdmin.rpc("commit_tournament_start", { _actor: context.userId, _tournament_id: data.id, _revision: t.revision, _team_ids: ids, _matches: drafts as unknown as import("@/integrations/supabase/types").Json, _code: data.accessCode });
    if (commitError) throw new Error("Le tournoi a changé ou a déjà commencé. Rechargez son tableau.");
    return { ok: true };
  });

/**
 * Génère le tableau final, la petite finale et la consolante à partir des poules.
 * Ne fait rien (renvoie false) si la phase finale existe déjà ou si des matchs de poule
 * ne sont pas terminés : sûre à appeler après chaque résultat de poule.
 */
async function generateFinalsIfPoolsDone(supabase: SupabaseClient<Database>, tournamentId: string): Promise<boolean> {
  const { data: t } = await supabase.from("tournaments").select("pool_count, consolation").eq("id", tournamentId).single();
  const { data: matches } = await supabase
    .from("tournament_matches")
    .select("stage, pool_index, team_a, team_b, score_a, score_b, winner")
    .eq("tournament_id", tournamentId);
  const all = matches ?? [];
  if (all.some((m) => m.stage === "bracket" || m.stage === "consolation" || m.stage === "small_final")) return false;
  const pool = all.filter((m) => m.stage === "pool");
  if (pool.length === 0 || pool.some((m) => !m.winner)) return false;
  const standings = Array.from({ length: t?.pool_count ?? 0 }, (_, i) => {
    const ms = pool.filter((m) => m.pool_index === i);
    const teams = [...new Set(ms.flatMap((m) => [m.team_a, m.team_b]).filter((id): id is string => id !== null))];
    return poolStandings(teams, ms);
  });
  const drafts = buildPoolFinals(standings, t?.consolation !== false);
  const { error } = await supabase.from("tournament_matches").insert(drafts.map(toRow(tournamentId)));
  // 23505 : un autre résultat simultané a déjà généré les phases finales (créneaux uniques) — rien à faire.
  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);
  return true;
}


export function normalizeCode(code: string | undefined | null) {
  return String(code ?? "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 20);
}

/** Code d'accès du tournoi défini par l'admin (null si aucun). */
async function currentCode(tournamentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tournament_settings_codes")
    .select("code")
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  return data?.code ?? null;
}

/** Vérifie le code d'accès du tournoi. */
async function hasValidCode(tournamentId: string, code: string | undefined) {
  const c = normalizeCode(code);
  if (!c) return false;
  const { data: tournament } = await publicClient().from("tournaments").select("status, organizations(status)").eq("id", tournamentId).maybeSingle();
  if (tournament?.status !== "started" || tournament.organizations?.status !== "active") return false;
  return (await currentCode(tournamentId)) === c;
}

/** Enregistre le résultat d'un match. Admin, capitaine d'une des deux équipes, ou code d'accès actif. */
export const reportMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; legWinners?: LegSide[]; legRests?: number[]; code?: string | undefined }) => input)
  .handler(async ({ data, context }) => reportAuthorizedMatch(data, context));

/** Code-only entry point: does not grant member statistics or admin access. */
export const reportTournamentMatch = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; legWinners?: LegSide[]; legRests?: number[]; code: string }) => input)
  .handler(async ({ data }) => reportAuthorizedMatch(data));

async function reportAuthorizedMatch(data: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; legWinners?: LegSide[]; legRests?: number[]; code?: string | undefined }, context?: Ctx) {
    const { data: m, error } = await publicClient()
      .from("tournament_matches")
      .select("id, tournament_id, stage, round, position, team_a, team_b, winner")
      .eq("id", data.matchId)
      .single();
    if (error || !m) throw new Error("Match introuvable.");
    if (!m.team_a || !m.team_b) throw new Error("Les deux adversaires ne sont pas encore connus.");
    const manager = context ? await canManageTournament(context, m.tournament_id) : false;
    assertResultWritable(m.winner, manager);
    if (!manager && !(await hasValidCode(m.tournament_id, data.code))) {
      if (!context) throw new Error("Code d'accès invalide ou tournoi inactif.");
      const { data: playable } = await context.supabase.from("tournaments").select("status, organizations(status)").eq("id", m.tournament_id).maybeSingle();
      if (playable?.status !== "started" || playable.organizations?.status !== "active") throw new Error("Tournoi inactif.");
      const { data: caps } = await context.supabase.from("tournament_teams").select("captain_id").in("id", [m.team_a, m.team_b]);
      if (!(caps ?? []).some((c) => c.captain_id === context.userId))
        throw new Error("Seul un administrateur, un joueur du match ou un code d'accès actif permet de saisir le résultat.");
    }
    if (!Number.isFinite(data.scoreA) || !Number.isFinite(data.scoreB)) throw new Error("Scores invalides.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const a = Math.max(0, Math.floor(data.scoreA));
    const b = Math.max(0, Math.floor(data.scoreB));
    if (a === b) throw new Error("Il faut un vainqueur (scores différents).");
    const legs = m.stage !== "pool" ? validateFinalLegs(data.legsA, data.legsB) : null;
    if (legs && ((a < b) !== (legs.legsA > legs.legsB))) throw new Error("Le gagnant doit avoir remporté deux manches.");
    const legWinners = legs ? validateLegWinners(data.legWinners, legs.legsA, legs.legsB) : null;
    // Aux fléchettes, le vainqueur est celui qui a le moins de points restants (0).
    const winner = a < b ? m.team_a : m.team_b;
    // Deux derniers résultats de poule simultanés : la base sérialise et refuse celui qui n'a pas les phases finales ;
    // on reprend un instantané frais (3 essais max) pour générer les phases finales sans erreur côté joueur.
    let commitError: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      let finals: MatchDraft[] = [];
      if (m.stage === "pool") {
        const { data: settings } = await supabaseAdmin.from("tournaments").select("pool_count, consolation").eq("id", m.tournament_id).single();
        const { data: snapshot } = await supabaseAdmin.from("tournament_matches").select("id,stage,pool_index,team_a,team_b,score_a,score_b,winner").eq("tournament_id", m.tournament_id);
        const pool = (snapshot ?? []).filter(x => x.stage === "pool").map(x => x.id === m.id ? { ...x, score_a: a, score_b: b, winner } : x);
        if (pool.length && pool.every(x => x.winner) && !(snapshot ?? []).some(x => x.stage !== "pool")) {
          const standings = Array.from({ length: settings?.pool_count ?? 0 }, (_, i) => { const matches = pool.filter(x => x.pool_index === i); const ids = [...new Set(matches.flatMap(x => [x.team_a, x.team_b]).filter((id): id is string => !!id))]; return poolStandings(ids, matches); });
          finals = buildPoolFinals(standings, settings?.consolation !== false);
        }
      }
      const { error } = await supabaseAdmin.rpc("commit_tournament_result", { _actor: (context?.userId ?? null) as unknown as string, _match_id: m.id, _code: normalizeCode(data.code), _score_a: a, _score_b: b, _legs_a: (legs?.legsA ?? null) as unknown as number, _legs_b: (legs?.legsB ?? null) as unknown as number, _finals: finals as unknown as import("@/integrations/supabase/types").Json, _leg_winners: (legWinners ?? null) as unknown as import("@/integrations/supabase/types").Json });
      commitError = error;
      if (!error || !String(error.message).includes("Final drafts required")) break;
    }
    if (!commitError && legs) {
      const rests = cleanLegRests(data.legRests, (legs.legsA ?? 0) + (legs.legsB ?? 0));
      if (rests) await supabaseAdmin.from("tournament_matches").update({ leg_rests: rests }).eq("id", m.id);
    }
    if (commitError) throw new Error("Résultat non enregistré : le tableau a changé ou une correction touche un match déjà commencé. Réessayez après actualisation.");
    return { ok: true };
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId?: string } = {}) => input)
  .handler(async ({ data, context }) => ({ admin: data.tournamentId ? await canManageTournament(context, data.tournamentId) : await isAdmin(context), userId: context.userId }));

export const adminAddTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    const name = data.name.trim();
    if (!name) throw new Error("Nom requis.");
    const { error } = await context.supabase.from("tournament_teams").insert({ tournament_id: data.tournamentId, name });
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const organizerAddPlayers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ManualPlayerInput) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    const { data: tournament, error: readError } = await context.supabase.from("tournaments").select("format,status").eq("id", data.tournamentId).single();
    if (readError || !tournament || tournament.status !== "open") throw new Error("Les inscriptions sont fermées.");
    const players = validateManualPlayers(data, tournament.format === "equipe");
    const { error } = await context.supabase.rpc("organizer_add_tournament_players", {
      _tournament_id: data.tournamentId, _first_name: players.firstName, _last_name: players.lastName,
      _email: players.email, _phone: players.phone, _partner_first_name: players.partnerFirstName,
      _partner_last_name: players.partnerLastName, _team_name: players.teamName,
    });
    if (error) {
      if (error.message.includes("TOURNAMENT_FULL")) throw new Error("Le tournoi est complet.");
      if (error.message.includes("ALREADY_REGISTERED") || error.code === "23505") throw new Error("Ce contact ou ce nom d’équipe est déjà inscrit.");
      throw new Error("Ajout impossible : vérifiez les coordonnées et les places disponibles.");
    }
    return { ok: true };
  });

export const getTeamPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    const { data: teams, error } = await context.supabase.from("tournament_teams")
      .select("id, helloasso_item_id, tournament_team_payments(paid)")
      .eq("tournament_id", data.tournamentId);
    if (error) throw new Error("Impossible de charger les paiements.");
    return (teams ?? []).map((team) => ({
      id: team.id,
      paid: teamIsPaid(team.helloasso_item_id, team.tournament_team_payments?.paid ?? false),
      helloasso: team.helloasso_item_id !== null,
    }));
  });

export const setTeamPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; paid: boolean }) => {
    if (typeof input.paid !== "boolean") throw new Error("Statut de paiement invalide.");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireTeamManager(context, data.id);
    const { data: team, error: readError } = await context.supabase.from("tournament_teams")
      .select("helloasso_item_id").eq("id", data.id).single();
    if (readError || !team) throw new Error("Équipe introuvable.");
    if (team.helloasso_item_id !== null) throw new Error("Les équipes HelloAsso sont automatiquement payées.");
    const { error } = await context.supabase.from("tournament_team_payments")
      .upsert({ team_id: data.id, paid: data.paid });
    if (error) throw new Error("Impossible d’enregistrer le paiement.");
    return { ok: true };
  });

export const adminRenameTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTeamManager(context, data.id);
    const name = data.name.trim();
    if (!name) throw new Error("Nom requis.");
    const { error } = await context.supabase.from("tournament_teams").update({ name }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTeamManager(context, data.id);
    const { error } = await context.supabase.from("tournament_teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Matchs jouables (adversaires connus, sans résultat) pour le compteur. */
export const listPlayableMatches = createServerFn({ method: "POST" })
  .inputValidator((input: { tournamentId: string; code: string }) => input)
  .handler(async ({ data }) => {
    if (!(await hasValidCode(data.tournamentId, data.code))) throw new Error("Code d'accès invalide ou tournoi inactif.");
    const sb = publicClient();
    const [{ data: tournament, error: tournamentError }, { data: teams }, { data: matches }, { data: allMatches }] = await Promise.all([
      sb.from("tournaments").select("start_score, double_out, final_start_score, final_double_out, consolation_start_score, consolation_double_out, pool_double_limit, consolation_double_limit").eq("id", data.tournamentId).single(),
      sb.from("tournament_teams").select("id, name").eq("tournament_id", data.tournamentId),
      sb
        .from("tournament_matches")
        .select("id, stage, pool_index, round, team_a, team_b, winner")
        .eq("tournament_id", data.tournamentId)
        .is("winner", null)
        .not("team_a", "is", null)
        .not("team_b", "is", null)
        .order("round"),
      sb.from("tournament_matches").select("stage, round").eq("tournament_id", data.tournamentId),
    ]);
    if (tournamentError || !tournament) throw new Error("Réglages du tournoi introuvables.");
    const name = new Map((teams ?? []).map((t) => [t.id, t.name]));
    const maxRound = new Map<string, number>();
    for (const m of allMatches ?? []) maxRound.set(m.stage, Math.max(maxRound.get(m.stage) ?? 0, m.round));
    const roundName = (stage: string, round: number) => {
      const left = (maxRound.get(stage) ?? round) - round;
      return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : left === 3 ? "Huitièmes de finale" : `Tour ${round}`;
    };
    return (matches ?? []).flatMap((m) => {
      if (!m.team_a || !m.team_b) return [];
      const stageLabel =
        m.stage === "pool"
          ? `Poule ${String.fromCharCode(65 + (m.pool_index ?? 0))}`
          : m.stage === "consolation"
            ? `Consolante — ${roundName(m.stage, m.round)}`
            : m.stage === "small_final"
              ? "Petite finale"
              : roundName(m.stage, m.round);
      return [{
      id: m.id,
      ...phaseRules(tournament, m.stage),
      label: `${stageLabel} — ${name.get(m.team_a)} vs ${name.get(m.team_b)}`,
      teamA: name.get(m.team_a) ?? "Équipe A",
      teamB: name.get(m.team_b) ?? "Équipe B",
      teamAId: m.team_a,
      teamBId: m.team_b,
      canNameA: false,
      canNameB: false,
    }];
    });
  });

/**
 * Envoie à chaque participant un email contenant uniquement le lien d'accès
 * au tournoi (le code d'accès est communiqué par l'organisateur).
 */
export const adminSendTournamentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { data: t } = await supabaseAdmin
      .from("tournaments")
      .select("title, event_date")
      .eq("id", data.tournamentId)
      .single();
    if (!t) throw new Error("Tournoi introuvable.");
    const recipients = new Map<string, string | null>();
    const { data: teams } = await supabaseAdmin
      .from("tournament_teams")
      .select("captain_id, name")
      .eq("tournament_id", data.tournamentId);
    for (const team of teams ?? []) {
      if (!team.captain_id) continue;
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(team.captain_id);
      if (u.user?.email) recipients.set(u.user.email, team.name);
    }
    const { data: ha } = await supabaseAdmin
      .from("helloasso_registrations")
      .select("email, first_name, last_name, partner_first_name, partner_last_name")
      .eq("tournament_id", data.tournamentId);
    for (const r of ha ?? []) {
      if (!r.email) continue;
      const holder = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
      const partner = `${r.partner_first_name ?? ""} ${r.partner_last_name ?? ""}`.trim();
      recipients.set(r.email, [holder, partner].filter(Boolean).join(" & ") || null);
    }
    if (recipients.size === 0) throw new Error("Aucun participant avec une adresse email.");
    const eventDate = t.event_date
      ? new Date(t.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : null;
    let sent = 0;
    let failed = 0;
    for (const [email, name] of recipients) {
      try {
        const res = await sendTemplateEmail("tournament-access-code", email, {
          templateData: {
            participantName: name,
            tournamentTitle: t.title,
            tournamentDate: eventDate,
            playUrl: `https://foxesdarts.com/tournois/${data.tournamentId}/jouer`,
          },
          idempotencyKey: `tournament-link-${data.tournamentId}-${email}-${Date.now()}`,
        });
        if (res.sent) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return { sent, failed, total: recipients.size };
  });

/** Modifie le code d'accès du tournoi (admin). */
export const adminSetTournamentCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; code: string }) => ({
    tournamentId: input.tournamentId,
    code: normalizeCode(input.code),
  }))
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    if (data.code.length < 4) throw new Error("Le code d'accès doit contenir au moins 4 caractères.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tournament_settings_codes")
      .upsert({ tournament_id: data.tournamentId, code: data.code, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { code: data.code };
  });

/** Code d'accès actuel du tournoi (admin). */
export const getTournamentCodeAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.tournamentId);
    return { code: await currentCode(data.tournamentId) };
  });

/** Vérification accessible sans compte, sans exposer le code enregistré. */
export const validateTournamentCode = createServerFn({ method: "POST" })
  .inputValidator((input: { tournamentId: string; code: string }) => input)
  .handler(async ({ data }) => {
    const valid = await hasValidCode(data.tournamentId, data.code);
    return { valid, active: valid, participantName: null as string | null };
  });

/** Vérifie et mémorise le code pour le membre connecté uniquement. */
export const rememberTournamentCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; code: string }) => input)
  .handler(async ({ data, context }) => {
    const code = normalizeCode(data.code);
    const valid = await hasValidCode(data.tournamentId, code);
    if (valid) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("tournament_code_claims")
        .upsert({ tournament_id: data.tournamentId, user_id: context.userId, code });
    }
    return { valid, active: valid, participantName: null as string | null };
  });

/** Code déjà saisi par le membre connecté, s'il est toujours le code actuel du tournoi. */
export const getMyTournamentCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tournament_code_claims")
      .select("code")
      .eq("tournament_id", data.tournamentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return { code: null as string | null };
    return { code: (await currentCode(data.tournamentId)) === row.code ? row.code : null };
  });

export function friendly(msg: string) {
  if (msg.includes("TOURNAMENT_FULL")) return "Le tournoi est complet.";
  if (msg.includes("TOURNAMENT_STARTED")) return "Le tournoi a déjà commencé, les inscriptions sont closes.";
  return msg;
}

/** Provisional scores only: current code required, never advances the bracket. */
export const updateTournamentLiveLegs = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; code: string; legsA: number; legsB: number; legWinners?: LegSide[]; legRests?: number[] }) => input)
  .handler(async ({ data }) => {
    const live = validateLiveLegs(data.legsA, data.legsB);
    const liveWinners = validateLiveLegWinners(data.legWinners, data.legsA, data.legsB);
    const { data: match } = await publicClient().from("tournament_matches")
      .select("id, tournament_id, stage, team_a, team_b, winner").eq("id", data.matchId).maybeSingle();
    if (!match || match.stage === "pool" || !match.team_a || !match.team_b || match.winner) throw new Error("Match indisponible.");
    if (!(await hasValidCode(match.tournament_id, data.code))) throw new Error("Code d'accès invalide ou tournoi inactif.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tournament_matches")
      .update({ ...live, live_leg_winners: liveWinners, live_leg_rests: cleanLegRests(data.legRests, data.legsA + data.legsB) }).eq("id", match.id).is("winner", null);
    if (error) throw new Error("Impossible d'actualiser les manches.");
    return { ok: true };
  });

/** Keeps only plausible per-leg loser remainders (0–1001), one per played leg; anything else is dropped. */
function cleanLegRests(raw: unknown, played: number): number[] | null {
  if (!Array.isArray(raw) || raw.length !== played) return null;
  const out = raw.map((v) => Math.floor(Number(v)));
  return out.every((v) => Number.isFinite(v) && v >= 0 && v <= 1001) ? out : null;
}
