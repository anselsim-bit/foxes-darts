import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { centralOrganizationId } from "@/lib/organization-access";
import { mediaBelongsToOrganization } from "@/lib/organization-media";

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
export async function signImageUrls(
  supabase: ReturnType<typeof publicClient>,
  paths: string[],
  organizationId?: string,
): Promise<Record<string, string>> {
  const centralId = await centralOrganizationId(supabase);
  const storagePaths = paths.filter((p) => p && !p.startsWith("http") && mediaBelongsToOrganization(p, organizationId ?? centralId, centralId));
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
  // Tous les tournois publics, toutes organisations confondues (RLS filtre les organisations privées).
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, title, event_date, start_time, end_time, format, max_participants, team_size, pool_count, start_score, double_out, final_start_score, final_double_out, consolation_start_score, consolation_double_out, pool_double_limit, consolation_double_limit, consolation, status, location, description, helloasso_url, image_url, organization_id, organizations(name, slug), tournament_teams(count)")
    .order("event_date", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const signed: Record<string, string> = {};
  for (const orgId of new Set(rows.map((t) => t.organization_id ?? ""))) {
    const paths = rows.filter((t) => (t.organization_id ?? "") === orgId).map((t) => t.image_url ?? "").filter(Boolean);
    if (paths.length) Object.assign(signed, await signImageUrls(supabase, paths, orgId || undefined));
  }
  return rows.map(({ tournament_teams, organizations, ...t }) => ({
    ...t,
    organization_name: (organizations as { name: string; slug: string } | null)?.name ?? null,
    organization_slug: (organizations as { name: string; slug: string } | null)?.slug ?? null,
    registrations_count: tournament_teams[0]?.count ?? 0,
    image_url: resolveImage(t.image_url, signed),
  }));
});

export const listPhotos = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, image_url, caption, created_at, tournament_id, tournaments!photos_tournament_id_fkey(title)")
    .eq("organization_id", await centralOrganizationId(supabase))
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
    .eq("organization_id", await centralOrganizationId(supabase))
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
    .eq("organization_id", await centralOrganizationId(supabase))
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
      .select("id, title, event_date, start_time, end_time, format, max_participants, team_size, pool_count, start_score, double_out, final_start_score, final_double_out, consolation_start_score, consolation_double_out, pool_double_limit, consolation_double_limit, consolation, status, location, description, helloasso_url, image_url, organization_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw notFound();
    const signed = await signImageUrls(supabase, t.image_url ? [t.image_url] : [], t.organization_id ?? undefined);
    const { count } = await supabase
      .from("tournament_teams")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", t.id);
    const { data: orgSettings } = t.organization_id
      ? await supabase.rpc("get_public_organization_settings", { _organization_id: t.organization_id })
      : { data: null };
    const theme = (orgSettings ?? null) as { primary_color?: string | null; secondary_color?: string | null; theme_colors?: Record<string, string> } | null;
    let organizer: { name: string; slug: string; logoUrl: string | null } | null = null;
    if (t.organization_id) {
      const { data: org } = await supabase.from("organizations").select("name, slug").eq("id", t.organization_id).maybeSingle();
      const logoPath = (orgSettings as { logo_path?: string | null } | null)?.logo_path ?? null;
      const signedLogo = logoPath ? await signImageUrls(supabase, [logoPath], t.organization_id) : {};
      if (org) organizer = { name: org.name, slug: org.slug, logoUrl: logoPath ? signedLogo[logoPath] ?? null : null };
    }
    return {
      ...t,
      organizer,
      primary_color: theme?.primary_color ?? null,
      theme: theme ? { primary_color: theme.primary_color ?? null, secondary_color: theme.secondary_color ?? null, theme_colors: theme.theme_colors ?? {} } : null,
      image_url: resolveImage(t.image_url, signed),
      registrations_count: count ?? 0,
    };
  });
