import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerForTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("registrations").insert({
      tournament_id: data.tournamentId,
      user_id: context.userId,
    });
    if (error) {
      if (error.code === "23505") return { ok: false, message: "Vous êtes déjà inscrit à ce tournoi." };
      throw new Error(error.message);
    }
    return { ok: true, message: "Inscription confirmée !" };
  });

export const cancelRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("registrations")
      .delete()
      .eq("tournament_id", data.tournamentId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyRegistrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("registrations")
      .select("id, status, created_at, tournament_id, tournaments(title, event_date, location)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      tournament_id: r.tournament_id,
      tournament_title: (r.tournaments as { title: string; event_date: string; location: string | null } | null)
        ?.title ?? "Tournoi",
      event_date: (r.tournaments as { event_date: string } | null)?.event_date ?? null,
      location: (r.tournaments as { location: string | null } | null)?.location ?? null,
    }));
  });

export const getMyRegistrationIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("registrations")
      .select("tournament_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.tournament_id);
  });

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("player_stats")
      .select("matches_played, wins, losses, best_score")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { matches_played: 0, wins: 0, losses: 0, best_score: 0 };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name, tournament_announcements")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      display_name: data?.display_name ?? "",
      tournament_announcements: data?.tournament_announcements ?? true,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Number of tournaments published since the member last opened the tournaments page.
export const getNewTournamentsCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("tournament_announcements, tournaments_seen_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile || !profile.tournament_announcements) return { count: 0 };
    const { count } = await context.supabase
      .from("tournaments")
      .select("id", { count: "exact", head: true })
      .gt("created_at", profile.tournaments_seen_at);
    return { count: count ?? 0 };
  });

export const markTournamentsSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("profiles")
      .update({ tournaments_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true };
  });

export const setTournamentAnnouncements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled: boolean }) => ({ enabled: Boolean(input.enabled) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ tournament_announcements: data.enabled })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
