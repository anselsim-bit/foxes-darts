import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const registerForTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; teamName?: string | undefined }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("register_tournament_player", { _tournament_id: data.tournamentId, _name: data.teamName ?? "" });
    if (error) {
      if (error.message.includes("TOURNAMENT_FULL")) return { ok: false, message: "Le tournoi est complet." };
      if (error.message.includes("SCHEDULE_CONFLICT")) return { ok: false, message: "Vous êtes déjà inscrit à un autre tournoi qui se déroule en même temps." };
      if (error.message.includes("ALREADY_REGISTERED")) return { ok: false, message: "Vous êtes déjà inscrit." };
      throw new Error("Inscription impossible : tournoi fermé ou indisponible.");
    }
    return { ok: true, message: "Inscription confirmée !" };
  });

export const cancelRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("cancel_tournament_registration", { _tournament_id: data.tournamentId });
    if (error) throw new Error("Le tournoi a commencé ou l'annulation est indisponible.");
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
      .select("display_name, first_name, last_name, avatar_path, tournament_announcements")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      display_name: data?.display_name ?? "",
      first_name: data?.first_name ?? "",
      last_name: data?.last_name ?? "",
      avatar_url: data?.avatar_path ? (await context.supabase.storage.from("tournament-photos").createSignedUrl(data.avatar_path, 3600)).data?.signedUrl ?? null : null,
      tournament_announcements: data?.tournament_announcements ?? true,
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { displayName: string; firstName?: string; lastName?: string }) => input)
  .handler(async ({ data, context }) => {
    const displayName = data.displayName.trim().slice(0, 60);
    if (displayName.length < 2) throw new Error("Nom de joueur trop court.");
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: displayName, ...(data.firstName !== undefined ? { first_name: data.firstName.trim().slice(0, 60) || null } : {}), ...(data.lastName !== undefined ? { last_name: data.lastName.trim().slice(0, 60) || null } : {}) })
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

/** Photo de profil : le fichier est déjà envoyé dans avatars/<id>/ par le membre ; on n'accepte que son propre dossier. */
export const setMyAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string | null }) => input)
  .handler(async ({ data, context }) => {
    const path = data.path;
    if (path !== null && !new RegExp(`^avatars/${context.userId}/[A-Za-z0-9-]+\\.(png|jpe?g|webp)$`, "i").test(path)) throw new Error("Image invalide.");
    const { error } = await context.supabase.from("profiles").update({ avatar_path: path }).eq("id", context.userId);
    if (error) throw new Error("Photo non enregistrée.");
    return { ok: true };
  });
