import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { doubletteName } from "./team-name";

export const registerForTournament = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tournamentId: string; teamName?: string | undefined; partnerFirstName?: string | undefined; partnerLastName?: string | undefined }) => ({
    tournamentId: String(input.tournamentId),
    teamName: String(input.teamName ?? "").trim().slice(0, 60),
    partnerFirstName: String(input.partnerFirstName ?? "").trim().slice(0, 60),
    partnerLastName: String(input.partnerLastName ?? "").trim().slice(0, 60),
  }))
  .handler(async ({ data, context }) => {
    let name = data.teamName;
    const { data: t } = await context.supabase.from("tournaments").select("format").eq("id", data.tournamentId).maybeSingle();
    if (t?.format === "equipe") {
      if (!data.partnerFirstName || !data.partnerLastName) return { ok: false, message: "Indiquez le prénom et le nom du second joueur." };
      if (!name) {
        const { data: me } = await context.supabase.from("profiles").select("first_name, last_name, display_name").eq("id", context.userId).maybeSingle();
        name = doubletteName(me?.first_name || me?.display_name || "Joueur", me?.last_name ?? "", data.partnerFirstName, data.partnerLastName);
      }
    }
    const { error } = await context.supabase.rpc("register_tournament_player", { _tournament_id: data.tournamentId, _name: name });
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

const NAME_RE = /^[\p{L}][\p{L}' .-]{0,59}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Validates a guest registration; exported for tests. */
export function validateGuest(input: { firstName: string; lastName: string; email: string; phone: string; partnerFirstName?: string | undefined; partnerLastName?: string | undefined; teamName?: string | undefined }) {
  const firstName = String(input.firstName ?? "").trim().replace(/\s+/g, " ");
  const lastName = String(input.lastName ?? "").trim().replace(/\s+/g, " ");
  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").replace(/[^\d+]/g, "");
  if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) throw new Error("Prénom et nom requis (lettres uniquement).");
  if (email.length > 255 || !EMAIL_RE.test(email)) throw new Error("Adresse e-mail invalide.");
  if (!/^\+?\d{9,15}$/.test(phone)) throw new Error("Numéro de téléphone invalide.");
  const partnerFirstName = String(input.partnerFirstName ?? "").trim().replace(/\s+/g, " ");
  const partnerLastName = String(input.partnerLastName ?? "").trim().replace(/\s+/g, " ");
  if ((partnerFirstName || partnerLastName) && (!NAME_RE.test(partnerFirstName) || !NAME_RE.test(partnerLastName))) throw new Error("Prénom et nom du second joueur requis (lettres uniquement).");
  const teamName = String(input.teamName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  return { firstName, lastName, email, phone, partnerFirstName, partnerLastName, teamName };
}

/** Public sign-up without an account: only first and last name are shown on the tournament; contact details stay organizer-only. */
export const registerGuestForTournament = createServerFn({ method: "POST" })
  .inputValidator((input: { tournamentId: string; firstName: string; lastName: string; email: string; phone: string; partnerFirstName?: string | undefined; partnerLastName?: string | undefined; teamName?: string | undefined }) => {
    if (!/^[0-9a-f-]{36}$/i.test(String(input.tournamentId))) throw new Error("Tournoi invalide.");
    return { tournamentId: input.tournamentId, ...validateGuest(input) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: t } = await supabaseAdmin.from("tournaments").select("status, helloasso_url, event_date, format").eq("id", data.tournamentId).maybeSingle();
    if (!t || t.status !== "open" || t.helloasso_url) return { ok: false, message: "Inscriptions fermées pour ce tournoi." };
    const { data: accepts } = await supabaseAdmin.rpc("tournament_accepts_registration", { _tournament_id: data.tournamentId });
    if (accepts === false) return { ok: false, message: "Inscriptions fermées pour ce tournoi." };
    const { data: dup } = await supabaseAdmin.from("tournament_guest_registrations").select("id").eq("tournament_id", data.tournamentId).eq("email", data.email).maybeSingle();
    if (dup) return { ok: false, message: "Cette adresse e-mail est déjà inscrite à ce tournoi." };
    const { data: existing } = await supabaseAdmin.from("tournament_teams").select("name").eq("tournament_id", data.tournamentId);
    const taken = new Set((existing ?? []).map((x) => x.name.toLowerCase()));
    const doublette = t.format === "equipe";
    if (doublette && (!data.partnerFirstName || !data.partnerLastName)) return { ok: false, message: "Indiquez le prénom et le nom du second joueur." };
    let name = doublette ? (data.teamName || doubletteName(data.firstName, data.lastName, data.partnerFirstName, data.partnerLastName)) : `${data.firstName} ${data.lastName}`;
    const base = name;
    for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base} (${i})`;
    const { data: team, error } = await supabaseAdmin.from("tournament_teams").insert({ tournament_id: data.tournamentId, name }).select("id").single();
    if (error || !team) {
      if (String(error?.message).includes("TOURNAMENT_FULL")) return { ok: false, message: "Le tournoi est complet." };
      return { ok: false, message: "Inscription impossible pour le moment." };
    }
    const { error: gErr } = await supabaseAdmin.from("tournament_guest_registrations").insert({ tournament_id: data.tournamentId, team_id: team.id, first_name: data.firstName, last_name: data.lastName, email: data.email, phone: data.phone, partner_first_name: doublette ? data.partnerFirstName : null, partner_last_name: doublette ? data.partnerLastName : null });
    if (gErr) {
      await supabaseAdmin.from("tournament_teams").delete().eq("id", team.id);
      return { ok: false, message: gErr.code === "23505" ? "Cette adresse e-mail est déjà inscrite à ce tournoi." : "Inscription impossible pour le moment." };
    }
    return { ok: true, message: `Inscription confirmée pour ${name} !` };
  });
