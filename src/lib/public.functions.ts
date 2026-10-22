import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Photos live in a private bucket: paths are turned into short-lived signed URLs.
// Signing uses the server-only admin client so the bucket needs no public read rule;
// only paths already referenced by published rows are signed.
async function signImageUrls(
  _supabase: ReturnType<typeof publicClient>,
  paths: string[],
): Promise<Record<string, string>> {
  const storagePaths = paths.filter((p) => p && !p.startsWith("http"));
  if (storagePaths.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from("tournament-photos")
    .createSignedUrls(storagePaths, 3600);
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  }
  return map;
}

function resolveImage(path: string | null, signed: Record<string, string>): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return signed[path] ?? null;
}

export const listTournaments = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title, event_date, start_time, end_time, format, max_participants, team_size, pool_count, start_score, double_out, status, location, description, helloasso_url, image_url, tournament_teams(count)")
    .order("event_date", { ascending: false });
  if (error) throw new Error(error.message);
  const signed = await signImageUrls(
    supabase,
    (data ?? []).map((t) => t.image_url ?? "").filter(Boolean),
  );
  return (data ?? []).map(({ tournament_teams, ...t }) => ({
    ...t,
    registrations_count: tournament_teams[0]?.count ?? 0,
    image_url: resolveImage(t.image_url, signed),
  }));
});

export const listPhotos = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, image_url, caption, created_at, tournament_id, tournaments(title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const signed = await signImageUrls(
    supabase,
    (data ?? []).map((p) => p.image_url).filter(Boolean),
  );
  return (data ?? []).map((p) => ({
    id: p.id,
    caption: p.caption,
    created_at: p.created_at,
    tournament_id: p.tournament_id,
    tournament_title: (p.tournaments as { title: string } | null)?.title ?? null,
    image_url: resolveImage(p.image_url, signed),
  }));
});

export const listStandings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("standings")
    .select("id, season, rank, player_name, played, wins, losses, points")
    .order("season", { ascending: false })
    .order("rank", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listHighlights = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("highlights")
    .select("id, title, description, media_url, event_date")
    .order("event_date", { ascending: false });
  if (error) throw new Error(error.message);
  const signed = await signImageUrls(
    supabase,
    (data ?? []).map((h) => h.media_url ?? "").filter(Boolean),
  );
  return (data ?? []).map((h) => ({ ...h, media_url: resolveImage(h.media_url, signed) }));
});

export const getTournament = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: t, error } = await supabase
      .from("tournaments")
      .select("id, title, event_date, start_time, end_time, format, max_participants, team_size, pool_count, start_score, double_out, status, location, description, helloasso_url, image_url")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const signed = await signImageUrls(supabase, t.image_url ? [t.image_url] : []);
    const { count } = await supabase
      .from("tournament_teams")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", t.id);
    return {
      ...t,
      image_url: resolveImage(t.image_url, signed),
      registrations_count: count ?? 0,
    };
  });
