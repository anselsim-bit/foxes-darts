import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { tournamentRules } from "@/lib/dart-rules";

type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

async function requireAdmin(context: AdminContext) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Accès réservé aux administrateurs.");
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) return [] as string[];
    return (data ?? []).map((r) => r.role as string);
  });

// ---------- Tournois ----------

export const adminUpsertTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      title: string;
      event_date: string;
      start_time?: string | undefined;
      end_time?: string | undefined;
      format?: "solo" | "equipe" | undefined;
      max_participants?: number | undefined;
      team_size?: number | undefined;
      pool_count?: number | undefined;
      start_score: number;
      double_out: boolean;
      pool_double_limit?: boolean | undefined;
      consolation?: boolean | undefined;
      location?: string | undefined;
      description?: string | undefined;
      helloasso_url?: string | undefined;
      image_url?: string | undefined;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const rules = tournamentRules(data.start_score, data.double_out, "bracket", data.pool_double_limit ?? true);
    const row = {
      title: data.title,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      format: data.format === "equipe" ? "equipe" : "solo",
      max_participants:
        data.max_participants && data.max_participants > 0 ? Math.floor(data.max_participants) : null,
      team_size: Math.max(1, Math.floor(data.team_size ?? 1)),
      pool_count: Math.max(0, Math.floor(data.pool_count ?? 0)),
      start_score: rules.start,
      double_out: rules.doubleOut,
      pool_double_limit: data.pool_double_limit ?? true,
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
      : context.supabase.from("tournaments").insert({ ...rest, image_url });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
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
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { syncHelloAsso } = await import("./helloasso.server");
    // L'admin garde la main : le bouton rafraîchit même un tournoi complet.
    return syncHelloAsso({ force: true });
  });

export const adminListPlayerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("player_stats")
      .select("id, user_id, matches_played, wins, losses, best_score, profiles(display_name)")
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
    await requireAdmin(context);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, display_name")
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
    await requireAdmin(context);
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
    await requireAdmin(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name");
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = new Set((admins ?? []).map((r) => r.user_id));
    const emails = new Map<string, string>();
    for (let page = 1; page <= 20; page++) {
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (listError) throw new Error(listError.message);
      for (const u of list.users) if (u.email) emails.set(u.id, u.email);
      if (list.users.length < 1000) break;
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
    await requireAdmin(context);
    if (data.userId === context.userId && !data.admin)
      throw new Error("Vous ne pouvez pas retirer vos propres droits d'administrateur.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { data: existing } = await supabaseAdmin
        .from("user_roles").select("id").eq("user_id", data.userId).eq("role", "admin").maybeSingle();
      if (!existing) {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: "admin" });
        if (error) throw new Error(error.message);
      }
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
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
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error || !u.user?.email) throw new Error("Adresse e-mail introuvable pour ce membre.");
    const { error: sendError } = await supabaseAdmin.auth.resetPasswordForEmail(u.user.email, {
      redirectTo: `${data.origin}/reset-password`,
    });
    if (sendError) throw new Error(sendError.message);
    return { ok: true };
  });
