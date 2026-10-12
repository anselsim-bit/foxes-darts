import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  buildBracket,
  distributePools,
  nextSlot,
  poolStandings,
  qualifiersFromPools,
  roundRobin,
  shuffle,
  type MatchDraft,
} from "@/lib/bracket";
import { publicClient } from "@/lib/public.functions";

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
        .select("id, stage, pool_index, round, position, team_a, team_b, score_a, score_b, winner")
        .eq("tournament_id", data.id)
        .order("round")
        .order("position"),
    ]);
    return { teams: teams ?? [], matches: matches ?? [] };
  });

const toRow = (tournamentId: string) => (m: MatchDraft) => ({ ...m, tournament_id: tournamentId });

export const startTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
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
    return { ok: true };
  });

export const generateFinals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: t } = await context.supabase.from("tournaments").select("pool_count").eq("id", data.id).single();
    const { data: matches } = await context.supabase
      .from("tournament_matches")
      .select("stage, pool_index, team_a, team_b, score_a, score_b, winner")
      .eq("tournament_id", data.id);
    const all = matches ?? [];
    if (all.some((m) => m.stage === "bracket")) throw new Error("La phase finale existe déjà.");
    const pool = all.filter((m) => m.stage === "pool");
    if (pool.some((m) => !m.winner)) throw new Error("Tous les matchs de poule ne sont pas terminés.");
    const standings = Array.from({ length: t?.pool_count ?? 0 }, (_, i) => {
      const ms = pool.filter((m) => m.pool_index === i);
      const teams = [...new Set(ms.flatMap((m) => [m.team_a!, m.team_b!]))];
      return poolStandings(teams, ms);
    });
    const drafts = buildBracket(qualifiersFromPools(standings, 2));
    const { error } = await context.supabase.from("tournament_matches").insert(drafts.map(toRow(data.id)));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Vérifie qu'un code d'accès actif existe pour ce tournoi. */
async function hasValidCode(tournamentId: string, code: string | undefined) {
  if (!code) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("tournament_access_codes")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("code", code.trim().toUpperCase())
    .eq("active", true)
    .maybeSingle();
  return !!data;
}

/** Enregistre le résultat d'un match. Admin, capitaine d'une des deux équipes, ou code d'accès actif. */
export const reportMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { matchId: string; scoreA: number; scoreB: number; code?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: m, error } = await supabaseAdmin
      .from("tournament_matches")
      .select("id, tournament_id, stage, round, position, team_a, team_b")
      .eq("id", data.matchId)
      .single();
    if (error || !m) throw new Error("Match introuvable.");
    if (!m.team_a || !m.team_b) throw new Error("Les deux adversaires ne sont pas encore connus.");
    if (!(await isAdmin(context)) && !(await hasValidCode(m.tournament_id, data.code))) {
      const { data: caps } = await supabaseAdmin.from("tournament_teams").select("captain_id").in("id", [m.team_a, m.team_b]);
      if (!(caps ?? []).some((c) => c.captain_id === context.userId))
        throw new Error("Seul un administrateur, un joueur du match ou un code d'accès actif permet de saisir le résultat.");
    }
    const a = Math.max(0, Math.floor(data.scoreA));
    const b = Math.max(0, Math.floor(data.scoreB));
    if (a === b) throw new Error("Il faut un vainqueur (scores différents).");
    // Aux fléchettes, le vainqueur est celui qui a le moins de points restants (0).
    const winner = a < b ? m.team_a : m.team_b;
    await supabaseAdmin.from("tournament_matches").update({ score_a: a, score_b: b, winner }).eq("id", m.id);
    if (m.stage === "bracket") {
      const s = nextSlot(m.round, m.position);
      const { data: next } = await supabaseAdmin
        .from("tournament_matches")
        .select("id")
        .eq("tournament_id", m.tournament_id)
        .eq("stage", "bracket")
        .eq("round", s.round)
        .eq("position", s.position)
        .maybeSingle();
      if (next) await supabaseAdmin.from("tournament_matches").update(s.side === "team_a" ? { team_a: winner } : { team_b: winner }).eq("id", next.id);
      else await supabaseAdmin.from("tournaments").update({ status: "finished" }).eq("id", m.tournament_id);
    }
    return { ok: true };
  });

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
export const listPlayableMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const [{ data: teams }, { data: matches }, { data: t }] = await Promise.all([
      context.supabase.from("tournament_teams").select("id, name, name_locked").eq("tournament_id", data.tournamentId),
      context.supabase
        .from("tournament_matches")
        .select("id, stage, pool_index, round, team_a, team_b, winner")
        .eq("tournament_id", data.tournamentId)
        .is("winner", null)
        .not("team_a", "is", null)
        .not("team_b", "is", null)
        .order("round"),
      context.supabase.from("tournaments").select("team_size").eq("id", data.tournamentId).maybeSingle(),
    ]);
    const isTeam = (t?.team_size ?? 1) > 1;
    const name = new Map((teams ?? []).map((t) => [t.id, t.name]));
    const locked = new Map((teams ?? []).map((t) => [t.id, t.name_locked]));
    return (matches ?? []).map((m) => ({
      id: m.id,
      label: `${m.stage === "pool" ? `Poule ${String.fromCharCode(65 + (m.pool_index ?? 0))}` : `Tour ${m.round}`} — ${name.get(m.team_a!)} vs ${name.get(m.team_b!)}`,
      teamA: name.get(m.team_a!) ?? "Équipe A",
      teamB: name.get(m.team_b!) ?? "Équipe B",
      teamAId: m.team_a!,
      teamBId: m.team_b!,
      canNameA: isTeam && !locked.get(m.team_a!),
      canNameB: isTeam && !locked.get(m.team_b!),
    }));
  });

/** Choix définitif du nom d'équipe (tournoi par équipe, code d'accès actif, une seule fois). */
export const setTeamNameWithCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { teamId: string; name: string; code: string }) => {
    const name = String(input.name ?? "").trim().slice(0, 40);
    if (name.length < 2) throw new Error("Le nom d'équipe doit contenir au moins 2 caractères.");
    return { teamId: String(input.teamId), code: String(input.code ?? ""), name };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: team } = await supabaseAdmin
      .from("tournament_teams")
      .select("id, tournament_id, name_locked")
      .eq("id", data.teamId)
      .maybeSingle();
    if (!team) throw new Error("Équipe introuvable.");
    if (team.name_locked) throw new Error("Le nom de cette équipe est déjà définitif.");
    const { data: t } = await supabaseAdmin.from("tournaments").select("team_size").eq("id", team.tournament_id).single();
    if ((t?.team_size ?? 1) <= 1) throw new Error("Ce tournoi ne se joue pas en équipe.");
    if (!(await hasValidCode(team.tournament_id, data.code))) throw new Error("Code d'accès invalide ou inactif.");
    const { data: dup } = await supabaseAdmin
      .from("tournament_teams")
      .select("id")
      .eq("tournament_id", team.tournament_id)
      .ilike("name", data.name)
      .neq("id", team.id)
      .limit(1);
    if (dup && dup.length) throw new Error("Ce nom est déjà pris par une autre équipe.");
    const { data: upd } = await supabaseAdmin
      .from("tournament_teams")
      .update({ name: data.name, name_locked: true })
      .eq("id", team.id)
      .eq("name_locked", false)
      .select("id");
    if (!upd || !upd.length) throw new Error("Le nom de cette équipe est déjà définitif.");
    return { name: data.name };
  });

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/**
 * Génère et envoie un code d'accès par email à chaque participant du tournoi
 * (capitaines des équipes inscrites sur le site + inscrits HelloAsso).
 * Les codes restent inactifs jusqu'à adminSetCodesActive.
 */
export const adminSendAccessCodes = createServerFn({ method: "POST" })
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

    // Participants : capitaines des équipes du site + inscrits HelloAsso.
    const recipients = new Map<string, string | null>(); // email -> nom
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
      .select("email, first_name, last_name")
      .eq("tournament_id", data.tournamentId);
    for (const r of ha ?? []) {
      if (r.email) recipients.set(r.email, `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || null);
    }
    if (recipients.size === 0) throw new Error("Aucun participant avec une adresse email.");

    const eventDate = t.event_date
      ? new Date(t.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      : null;
    let sent = 0;
    let failed = 0;
    for (const [email, name] of recipients) {
      // Réutilise le code existant ou en crée un nouveau.
      const { data: existing } = await supabaseAdmin
        .from("tournament_access_codes")
        .select("code")
        .eq("tournament_id", data.tournamentId)
        .eq("email", email)
        .maybeSingle();
      let code = existing?.code;
      if (!code) {
        code = generateCode();
        const { error } = await supabaseAdmin.from("tournament_access_codes").insert({
          tournament_id: data.tournamentId,
          email,
          participant_name: name,
          code,
        });
        if (error) {
          failed++;
          continue;
        }
      }
      try {
        const res = await sendTemplateEmail("tournament-access-code", email, {
          templateData: { participantName: name, tournamentTitle: t.title, tournamentDate: eventDate, code },
          idempotencyKey: `access-code-${data.tournamentId}-${email}`,
        });
        if (res.sent) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }
    return { sent, failed, total: recipients.size };
  });

/** Active ou désactive les codes d'accès d'un tournoi (jour J). */
export const adminSetCodesActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tournament_access_codes")
      .update({ active: data.active })
      .eq("tournament_id", data.tournamentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Statut des codes d'un tournoi (admin) : combien envoyés, actifs ou non. */
export const getAccessCodesStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: codes } = await context.supabase
      .from("tournament_access_codes")
      .select("id, active")
      .eq("tournament_id", data.tournamentId);
    const all = codes ?? [];
    return { count: all.length, active: all.length > 0 && all.every((c) => c.active) };
  });

/** Vérifie un code d'accès pour le compteur. Renvoie si le code est valide et actif. */
export const validateTournamentCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; code: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tournament_access_codes")
      .select("active, participant_name")
      .eq("tournament_id", data.tournamentId)
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (!row) return { valid: false, active: false, participantName: null as string | null };
    if (row.active) {
      // Mémorise le code pour ce membre : plus besoin de le ressaisir pendant le tournoi.
      await supabaseAdmin
        .from("tournament_access_codes")
        .update({ claimed_by: context.userId })
        .eq("tournament_id", data.tournamentId)
        .eq("code", data.code.trim().toUpperCase());
    }
    return { valid: true, active: row.active, participantName: row.participant_name };
  });

/** Code d'accès actif déjà saisi par le membre connecté pour ce tournoi. */
export const getMyTournamentCode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tournament_access_codes")
      .select("code")
      .eq("tournament_id", data.tournamentId)
      .eq("claimed_by", context.userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    return { code: row?.code ?? null };
  });

export function friendly(msg: string) {
  if (msg.includes("TOURNAMENT_FULL")) return "Le tournoi est complet.";
  if (msg.includes("TOURNAMENT_STARTED")) return "Le tournoi a déjà commencé, les inscriptions sont closes.";
  return msg;
}
