import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // a confirmed member stays valid for 6h (one session of play)

async function hmac(payload: string): Promise<string> {
  const secret = process.env["GAME_TOKEN_SECRET"];
  if (!secret) throw new Error("Configuration manquante");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function makeToken(userId: string) {
  const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`;
  return `${payload}.${await hmac(payload)}`;
}

async function verifyToken(token: string, userId: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts as [string, string, string];
  if (id !== userId || Number(exp) < Date.now()) return false;
  return (await hmac(`${id}.${exp}`)) === sig;
}

// Find one member by exact player name or email (case-insensitive). Returns id + name only, never the email.
export const findMemberForGame = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const q = typeof input?.query === "string" ? input.query.trim().slice(0, 200) : "";
    if (!q) throw new Error("Entrez un nom de joueur ou un email");
    return { query: q };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.toLowerCase();
    let id: string | null = null;
    if (q.includes("@")) {
      for (let page = 1; page <= 20 && !id; page++) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw new Error(error.message);
        id = list.users.find((u) => u.email?.toLowerCase() === q)?.id ?? null;
        if (list.users.length < 1000) break;
      }
    } else {
      const escaped = data.query.replace(/[\\%_]/g, (c) => `\\${c}`);
      const { data: rows, error } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("display_name", escaped)
        .limit(2);
      if (error) throw new Error(error.message);
      if ((rows?.length ?? 0) > 1) throw new Error("Plusieurs joueurs portent ce nom : utilisez son email");
      id = rows?.[0]?.id ?? null;
    }
    if (!id) throw new Error("Ce joueur n'existe pas");
    const { data: p } = await supabaseAdmin.from("profiles").select("id, display_name").eq("id", id).maybeSingle();
    if (!p) throw new Error("Ce joueur n'existe pas");
    return { id: p.id, name: p.display_name ?? "Joueur" };
  });

// A chosen member proves it's them with their own password; returns a signed play token.
export const confirmMemberIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memberId: string; password: string }) => {
    if (typeof input?.memberId !== "string" || typeof input?.password !== "string" || !input.password) {
      throw new Error("Mot de passe requis");
    }
    return { memberId: input.memberId, password: input.password.slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.memberId);
    const email = u?.user?.email;
    if (!email) throw new Error("Membre introuvable");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: signed, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || signed.user?.id !== data.memberId) throw new Error("Mot de passe incorrect");
    await client.auth.signOut().catch(() => {});
    return { token: await makeToken(data.memberId) };
  });


type GameInput = {
  tournamentId?: string | null | undefined;
  startScore: number;
  doubleOut: boolean;
  players: { name: string; userId: string | null; token?: string | null | undefined; won: boolean; bestVisit: number }[];
};

// Records a finished game. Every member except the signed-in recorder must carry a valid play token.
export const saveGameResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GameInput) => {
    if (!Array.isArray(input?.players) || input.players.length < 1 || input.players.length > 8) {
      throw new Error("Partie invalide");
    }
    const players = input.players.map((p) => ({
      name: String(p.name ?? "Joueur").slice(0, 60),
      userId: typeof p.userId === "string" ? p.userId : null,
      token: typeof p.token === "string" ? p.token : null,
      won: Boolean(p.won),
      bestVisit: Math.max(0, Math.min(180, Math.floor(Number(p.bestVisit) || 0))),
    }));
    if (players.filter((p) => p.won).length !== 1) throw new Error("Une partie a un seul gagnant");
    const startScore = [301, 501, 701].includes(Number(input.startScore)) ? Number(input.startScore) : 501;
    return {
      players,
      startScore,
      doubleOut: Boolean(input.doubleOut),
      tournamentId: typeof input.tournamentId === "string" && input.tournamentId ? input.tournamentId : null,
    };
  })
  .handler(async ({ data, context }) => {
    const members = data.players.filter((p) => p.userId);
    const ids = members.map((p) => p.userId as string);
    if (new Set(ids).size !== ids.length) throw new Error("Un membre ne peut jouer qu'une fois");
    for (const m of members) {
      if (m.userId === context.userId) continue;
      if (!m.token || !(await verifyToken(m.token, m.userId as string))) {
        throw new Error(`${m.name} doit confirmer son identité avec son mot de passe.`);
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const winner = data.players.find((p) => p.won)!;
    const { error: gErr } = await supabaseAdmin.from("games").insert({
      tournament_id: data.tournamentId,
      start_score: data.startScore,
      double_out: data.doubleOut,
      winner_name: winner.name,
      recorded_by: context.userId,
      players: data.players.map((p) => ({ name: p.name, user_id: p.userId, won: p.won, best_visit: p.bestVisit })),
    });
    if (gErr) throw new Error(gErr.message);
    if (ids.length === 0) return { saved: 0 };
    const { data: existing } = await supabaseAdmin
      .from("player_stats")
      .select("user_id, matches_played, wins, losses, best_score")
      .in("user_id", ids);
    const solo = data.players.length === 1; // solo practice: no win/loss counted
    const rows = members.map((p) => {
      const cur = existing?.find((e) => e.user_id === p.userId);
      return {
        user_id: p.userId as string,
        matches_played: (cur?.matches_played ?? 0) + 1,
        wins: (cur?.wins ?? 0) + (!solo && p.won ? 1 : 0),
        losses: (cur?.losses ?? 0) + (!solo && !p.won ? 1 : 0),
        best_score: Math.max(cur?.best_score ?? 0, p.bestVisit),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabaseAdmin.from("player_stats").upsert(rows, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };
  });
