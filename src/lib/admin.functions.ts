import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { tournamentRules, phaseRules } from "@/lib/dart-rules";
import { requireCentralManager, requireOrganizationPlayer, requirePlatformAdmin } from "@/lib/organization-access";

type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

async function requireAdmin(context: AdminContext) {
  return requireCentralManager(context);
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try { await requireAdmin(context); return ["admin"]; } catch { return [] as string[]; }
  });

export const getAdminOrganization = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ id: await requireAdmin(context) }));

async function centralPlayerIds(context: AdminContext, organizationId: string) {
  const { data, error } = await context.supabase.from("organization_players").select("user_id").eq("organization_id", organizationId);
  if (error) throw new Error("Impossible de charger les membres de Foxes Darts.");
  return (data ?? []).map((p) => p.user_id);
}

// ---------- Tournois ----------

export const adminUpsertTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      organizationId?: string;
      id?: string | undefined;
      title: string;
      event_date: string;
      start_time?: string | undefined;
      end_time?: string | undefined;
      format?: "solo" | "equipe" | undefined;
      max_participants?: number | undefined;
      team_size?: number | undefined;
      price_cents?: number | null | undefined;
      pool_count?: number | undefined;
      start_score: number;
      double_out: boolean;
      final_start_score?: number;
      final_double_out?: boolean;
      consolation_start_score?: number;
      consolation_double_out?: boolean;
      pool_double_limit?: boolean | undefined;
      consolation_double_limit?: boolean | undefined;
      consolation?: boolean | undefined;
      location?: string | undefined;
      description?: string | undefined;
      helloasso_url?: string | undefined;
      image_url?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const organizationId = data.organizationId ?? await requireAdmin(context);
    if (data.id) {
      const { data: allowed } = await context.supabase.rpc("can_manage_tournament", { _tournament_id: data.id });
      if (!allowed) throw new Error("Tournoi non autorisé.");
    } else {
      const { data: membership } = await context.supabase.from("organization_members").select("role").eq("organization_id", organizationId).eq("user_id", context.userId).maybeSingle();
      const { data: allowed } = await context.supabase.rpc("can_manage_organization", { _organization_id: organizationId });
      if (!allowed && membership?.role !== "TOURNAMENT_MANAGER") throw new Error("Organisation non autorisée.");
    }
    const rules = tournamentRules(data.start_score, data.double_out, "bracket", data.pool_double_limit ?? true);
    const finalRules = phaseRules(data, "bracket");
    const consolationRules = phaseRules(data, "consolation");
    const row = {
      title: data.title,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      format: data.format === "equipe" ? "equipe" : "solo",
      max_participants:
        data.max_participants && data.max_participants > 0 ? Math.floor(data.max_participants) : null,
      team_size: data.format === "equipe" ? 2 : 1,
      price_cents: typeof data.price_cents === "number" && Number.isFinite(data.price_cents) && data.price_cents >= 0 ? Math.min(100000, Math.round(data.price_cents)) : null,
      pool_count: Math.max(0, Math.floor(data.pool_count ?? 0)),
      start_score: rules.start,
      double_out: rules.doubleOut,
      final_start_score: finalRules.start,
      final_double_out: finalRules.doubleOut,
      consolation_start_score: consolationRules.start,
      consolation_double_out: consolationRules.doubleOut,
      pool_double_limit: data.pool_double_limit ?? true,
      consolation_double_limit: data.consolation_double_limit ?? data.pool_double_limit ?? true,
      consolation: data.consolation ?? true,
      location: data.location || null,
      description: data.description || null,
      helloasso_url: data.helloasso_url || null,
      image_url: data.image_url || null,
    };
    // On edit, an absent image keeps the current one.
    const { image_url, ...rest } = row;
    const query = data.id
      ? context.supabase.from("tournaments").update(data.image_url ? row : rest).eq("id", data.id)
      : context.supabase.from("tournaments").insert({ ...rest, image_url, organization_id: organizationId, created_by: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("can_manage_tournament", { _tournament_id: data.id });
    if (!allowed) throw new Error("Tournoi non autorisé.");
    const { error } = await context.supabase.from("tournaments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Photos ----------

export const adminAddPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { image_url: string; caption?: string | undefined; tournament_id?: string | undefined }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("photos").insert({
      image_url: data.image_url,
      caption: data.caption || null,
      tournament_id: data.tournament_id || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Classements ----------

export const adminUpsertStanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      season: string;
      rank: number;
      player_name: string;
      played: number;
      wins: number;
      losses: number;
      points: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const row = {
      season: data.season,
      rank: data.rank,
      player_name: data.player_name,
      played: data.played,
      wins: data.wins,
      losses: data.losses,
      points: data.points,
    };
    const query = data.id
      ? context.supabase.from("standings").update(row).eq("id", data.id)
      : context.supabase.from("standings").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStanding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("standings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Grandes actions ----------

export const adminUpsertHighlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      title: string;
      description?: string | undefined;
      media_url?: string | undefined;
      event_date?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const row = {
      title: data.title,
      description: data.description || null,
      media_url: data.media_url || null,
      event_date: data.event_date || null,
    };
    const query = data.id
      ? context.supabase.from("highlights").update(row).eq("id", data.id)
      : context.supabase.from("highlights").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteHighlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("highlights").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Inscriptions & stats joueurs ----------

export const adminListRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("registrations")
      .select("id, status, created_at, tournament_id, tournaments(title), profiles(display_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      tournament_title: (r.tournaments as { title: string } | null)?.title ?? "Tournoi",
      player_name: (r.profiles as { display_name: string | null } | null)?.display_name ?? "Joueur",
    }));
  });

export const adminDeleteRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("registrations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListHelloAsso = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("helloasso_registrations")
      .select(
        "id, first_name, last_name, email, amount_cents, tier_name, state, paid_at, partner_first_name, partner_last_name, tournaments(title)",
      )
      .order("paid_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || "Participant",
      partner: [r.partner_first_name, r.partner_last_name].filter(Boolean).join(" ") || null,
      email: r.email,
      amount_cents: r.amount_cents,
      tier_name: r.tier_name,
      state: r.state,
      paid_at: r.paid_at,
      tournament_title: (r.tournaments as { title: string } | null)?.title ?? "Tournoi",
    }));
  });

export const adminSyncHelloAsso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const organizationId = await requireAdmin(context);
    if (data.tournamentId) {
      const { data: tournament, error } = await context.supabase.from("tournaments")
        .select("id").eq("id", data.tournamentId).eq("organization_id", organizationId).maybeSingle();
      if (error || !tournament) throw new Error("Ce tournoi n’est pas disponible dans votre organisation.");
    }
    const { syncHelloAsso } = await import("./helloasso.server");
    // L'admin garde la main : le bouton rafraîchit même un tournoi complet.
    return syncHelloAsso({ force: true, organizationId, tournamentId: data.tournamentId });
  });

export const adminListPlayerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const organizationId = await requireAdmin(context);
    const ids = await centralPlayerIds(context, organizationId);
    const { data, error } = await context.supabase
      .from("player_stats")
      .select("id, user_id, matches_played, wins, losses, best_score, profiles(display_name)")
      .in("user_id", ids)
      .order("wins", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      id: s.id,
      user_id: s.user_id,
      matches_played: s.matches_played,
      wins: s.wins,
      losses: s.losses,
      best_score: s.best_score,
      player_name: (s.profiles as { display_name: string | null } | null)?.display_name ?? "Joueur",
    }));
  });

export const adminListPlayers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const organizationId = await requireAdmin(context);
    const ids = await centralPlayerIds(context, organizationId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids)
      .order("display_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertPlayerStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      user_id: string;
      matches_played: number;
      wins: number;
      losses: number;
      best_score: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const organizationId = await requireAdmin(context);
    await requirePlatformAdmin(context);
    await requireOrganizationPlayer(context, organizationId, data.user_id);
    const { error } = await context.supabase.from("player_stats").upsert(
      {
        user_id: data.user_id,
        matches_played: data.matches_played,
        wins: data.wins,
        losses: data.losses,
        best_score: data.best_score,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Droits des membres ----------

export const adminListMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const organizationId = await requireAdmin(context);
    const ids = await centralPlayerIds(context, organizationId);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids)
      .order("display_name");
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins } = await context.supabase.from("organization_members").select("user_id").eq("organization_id", organizationId).in("role", ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"]);
    const adminIds = new Set((admins ?? []).map((r) => r.user_id));
    const emails = new Map<string, string>();
    for (const profile of profiles ?? []) {
      const { data: account, error: accountError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (accountError) throw new Error("Impossible de charger l'adresse du membre.");
      if (account.user?.email) emails.set(profile.id, account.user.email);
    }
    return (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.display_name ?? "Joueur",
      email: emails.get(p.id) ?? "",
      admin: adminIds.has(p.id),
      self: p.id === context.userId,
    }));
  });

export const adminSetMemberAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; admin: boolean }) => {
    if (typeof input.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.userId)) throw new Error("Membre invalide.");
    return { userId: input.userId, admin: input.admin === true };
  })
  .handler(async ({ data, context }) => {
    const organizationId = await requireAdmin(context);
    if (data.userId === context.userId && !data.admin)
      throw new Error("Vous ne pouvez pas retirer vos propres droits d'administrateur.");
    await requireOrganizationPlayer(context, organizationId, data.userId);
    const { data: membership, error: memberError } = await context.supabase.from("organization_members").select("role").eq("organization_id", organizationId).eq("user_id", data.userId).maybeSingle();
    if (memberError) throw new Error("Impossible de vérifier les droits du membre.");
    if (membership?.role === "ORGANIZATION_OWNER") throw new Error("Les droits du propriétaire ne peuvent pas être modifiés ici.");
    const { error } = await context.supabase.rpc("set_central_member_admin", { _user_id: data.userId, _admin: data.admin });
    if (error) throw new Error("Impossible de modifier les droits Foxes Darts.");
    return { ok: true };
  });

const ALLOWED_ORIGIN = /^(https:\/\/([a-z0-9-]+\.)*(foxesdarts\.com|lovable\.app|lovableproject\.com)|http:\/\/localhost(:\d+)?)$/i;

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; origin: string }) => {
    if (typeof input.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.userId)) throw new Error("Membre invalide.");
    const origin = typeof input.origin === "string" && ALLOWED_ORIGIN.test(input.origin) ? input.origin : "https://foxesdarts.com";
    return { userId: input.userId, origin };
  })
  .handler(async ({ data, context }) => {
    const organizationId = await requireAdmin(context);
    await requireOrganizationPlayer(context, organizationId, data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !u.user?.email) throw new Error("Adresse e-mail introuvable pour ce membre.");
    const { error: sendError } = await supabaseAdmin.auth.resetPasswordForEmail(u.user.email, {
      redirectTo: `${data.origin}/reset-password`,
    });
    if (sendError) throw new Error(sendError.message);
    return { ok: true };
  });
