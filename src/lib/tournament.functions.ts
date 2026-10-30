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
import { tournamentRules, validateFinalLegs } from "@/lib/dart-rules";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function isAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  return !!data;
}
async function requireAdmin(ctx: Ctx) {
  if (!(await isAdmin(ctx))) throw new Error("Accès réservé aux administrateurs.");
}

export const getTournamentBoard = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: teams }, { data: matches }] = await Promise.all([
      sb.from("tournament_teams").select("id, name, captain_id").eq("tournament_id", data.id).order("created_at"),
      sb
        .from("tournament_matches")
        .select("id, stage, pool_index, round, position, team_a, team_b, score_a, score_b, legs_a, legs_b, winner")
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
    await requireAdmin(context);
    if (data.accessCode.length < 4) throw new Error("Le code d'accès doit contenir au moins 4 caractères.");
    const { data: t, error } = await context.supabase
      .from("tournaments")
      .select("status, max_participants, pool_count")
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
    const { error: e2 } = await context.supabase.from("tournament_matches").insert(drafts.map(toRow(data.id)));
    if (e2) throw new Error(e2.message);
    await context.supabase.from("tournaments").update({ status: "started" }).eq("id", data.id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("tournament_settings_codes")
      .upsert({ tournament_id: data.id, code: data.accessCode, updated_at: new Date().toISOString() });
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
  const { data: tournament } = await publicClient().from("tournaments").select("status").eq("id", tournamentId).maybeSingle();
  if (tournament?.status !== "started") return false;
  return (await currentCode(tournamentId)) === c;
}

/** Enregistre le résultat d'un match. Admin, capitaine d'une des deux équipes, ou code d'accès actif. */
export const reportMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; code?: string | undefined }) => input)
  .handler(async ({ data, context }) => reportAuthorizedMatch(data, context));

/** Code-only entry point: does not grant member statistics or admin access. */
export const reportTournamentMatch = createServerFn({ method: "POST" })
  .inputValidator((input: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; code: string }) => input)
  .handler(async ({ data }) => reportAuthorizedMatch(data));

async function reportAuthorizedMatch(data: { matchId: string; scoreA: number; scoreB: number; legsA?: number; legsB?: number; code?: string | undefined }, context?: Ctx) {
    const { data: m, error } = await publicClient()
      .from("tournament_matches")
      .select("id, tournament_id, stage, round, position, team_a, team_b")
      .eq("id", data.matchId)
      .single();
    if (error || !m) throw new Error("Match introuvable.");
    if (!m.team_a || !m.team_b) throw new Error("Les deux adversaires ne sont pas encore connus.");
    if (!(context && await isAdmin(context)) && !(await hasValidCode(m.tournament_id, data.code))) {
      if (!context) throw new Error("Code d'accès invalide ou tournoi inactif.");
      const { data: caps } = await context.supabase.from("tournament_teams").select("captain_id").in("id", [m.team_a, m.team_b]);
      if (!(caps ?? []).some((c) => c.captain_id === context.userId))
        throw new Error("Seul un administrateur, un joueur du match ou un code d'accès actif permet de saisir le résultat.");
    }
    if (!Number.isFinite(data.scoreA) || !Number.isFinite(data.scoreB)) throw new Error("Scores invalides.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const a = Math.max(0, Math.floor(data.scoreA));
    const b = Math.max(0, Math.floor(data.scoreB));
    if (a === b) throw new Error("Il faut un vainqueur (scores différents).");
    const legs = m.stage === "bracket" ? validateFinalLegs(data.legsA, data.legsB) : null;
    if (legs && ((a < b) !== (legs.legsA > legs.legsB))) throw new Error("Le gagnant doit avoir remporté deux manches.");
    // Aux fléchettes, le vainqueur est celui qui a le moins de points restants (0).
    const winner = a < b ? m.team_a : m.team_b;
    const { error: saveError } = await supabaseAdmin.from("tournament_matches").update({ score_a: a, score_b: b, legs_a: legs?.legsA ?? null, legs_b: legs?.legsB ?? null, winner }).eq("id", m.id);
    if (saveError) throw new Error("Impossible d'enregistrer le résultat.");
    // Dès que le dernier match de poule est enregistré, le tableau final, la petite finale
    // et la consolante sont générés automatiquement (sans action de l'admin).
    if (m.stage === "pool") await generateFinalsIfPoolsDone(supabaseAdmin, m.tournament_id);
    if (m.stage === "bracket" || m.stage === "consolation") {
      const s = nextSlot(m.round, m.position);
      const { data: next } = await supabaseAdmin
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", m.tournament_id)
        .eq("stage", m.stage)
        .eq("round", s.round)
        .eq("position", s.position)
        .maybeSingle();
      if (next) await supabaseAdmin.from("tournament_matches").update(s.side === "team_a" ? { team_a: winner } : { team_b: winner }).eq("id", next.id);
      else if (m.stage === "bracket") await supabaseAdmin.from("tournaments").update({ status: "finished" }).eq("id", m.tournament_id);
      // Petite finale : le perdant d'une demi-finale du tableau principal y prend place.
      if (m.stage === "bracket") {
        const { data: lastRound } = await supabaseAdmin
          .from("tournament_matches")
          .select("round")
          .eq("tournament_id", m.tournament_id)
          .eq("stage", "bracket")
          .order("round", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastRound && m.round === lastRound.round - 1) {
          const loser = winner === m.team_a ? m.team_b : m.team_a;
          const { data: smallFinal } = await supabaseAdmin
            .from("tournament_matches")
            .select("id")
            .eq("tournament_id", m.tournament_id)
            .eq("stage", "small_final")
            .maybeSingle();
          if (smallFinal)
            await supabaseAdmin
              .from("tournament_matches")
              .update(m.position % 2 === 0 ? { team_a: loser } : { team_b: loser })
              .eq("id", smallFinal.id);
        }
      }
    }
    return { ok: true };
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ admin: await isAdmin(context), userId: context.userId }));

export const adminAddTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const name = data.name.trim();
    if (!name) throw new Error("Nom requis.");
    const { error } = await context.supabase.from("tournament_teams").insert({ tournament_id: data.tournamentId, name });
    if (error) throw new Error(friendly(error.message));
    return { ok: true };
  });

export const adminRenameTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
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
    await requireAdmin(context);
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
    const [{ data: tournament, error: tournamentError }, { data: teams }, { data: matches }] = await Promise.all([
      sb.from("tournaments").select("start_score, double_out, pool_double_limit").eq("id", data.tournamentId).single(),
      sb.from("tournament_teams").select("id, name").eq("tournament_id", data.tournamentId),
      sb
        .from("tournament_matches")
        .select("id, stage, pool_index, round, team_a, team_b, winner")
        .eq("tournament_id", data.tournamentId)
        .is("winner", null)
        .not("team_a", "is", null)
        .not("team_b", "is", null)
        .order("round"),
    ]);
    if (tournamentError || !tournament) throw new Error("Réglages du tournoi introuvables.");
    const name = new Map((teams ?? []).map((t) => [t.id, t.name]));
    return (matches ?? []).flatMap((m) => {
      if (!m.team_a || !m.team_b) return [];
      const stageLabel =
        m.stage === "pool"
          ? `Poule ${String.fromCharCode(65 + (m.pool_index ?? 0))}`
          : m.stage === "consolation"
            ? `Consolante — Tour ${m.round}`
            : m.stage === "small_final"
              ? "Petite finale"
              : `Tour ${m.round}`;
      return [{
      id: m.id,
      ...tournamentRules(tournament.start_score, tournament.double_out, m.stage, tournament.pool_double_limit ?? true),
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
    await requireAdmin(context);
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
    await requireAdmin(context);
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
    await requireAdmin(context);
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
