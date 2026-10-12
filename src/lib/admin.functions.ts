import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminContext = {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
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
      id?: string;
      title: string;
      event_date: string;
      location?: string;
      description?: string;
      helloasso_url?: string;
      image_url?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const row = {
      title: data.title,
      event_date: data.event_date,
      location: data.location || null,
      description: data.description || null,
      helloasso_url: data.helloasso_url || null,
      image_url: data.image_url || null,
    };
    const query = data.id
      ? context.supabase.from("tournaments").update(row).eq("id", data.id)
      : context.supabase.from("tournaments").insert(row);
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
    (input: { image_url: string; caption?: string; tournament_id?: string }) => input,
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
      id?: string;
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
      id?: string;
      title: string;
      description?: string;
      media_url?: string;
      event_date?: string;
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
