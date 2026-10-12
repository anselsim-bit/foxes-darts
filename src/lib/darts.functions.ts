import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Members list for the scoreboard: only id + display name, signed-in users only.
export const listMembersForGame = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .order("display_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({ id: p.id, name: p.display_name ?? "Joueur" }));
  });

type GameResult = {
  players: { userId: string | null; won: boolean; bestVisit: number }[];
};

// Records a finished game into each member's stats. The caller must be one of the players.
export const saveGameResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GameResult) => {
    if (!Array.isArray(input?.players) || input.players.length < 1 || input.players.length > 8) {
      throw new Error("Partie invalide");
    }
    const players = input.players.map((p) => ({
      userId: typeof p.userId === "string" ? p.userId : null,
      won: Boolean(p.won),
      bestVisit: Math.max(0, Math.min(180, Math.floor(Number(p.bestVisit) || 0))),
    }));
    if (players.filter((p) => p.won).length !== 1) throw new Error("Une partie a un seul gagnant");
    return { players };
  })
  .handler(async ({ data, context }) => {
    const members = data.players.filter((p) => p.userId);
    const ids = members.map((p) => p.userId as string);
    if (new Set(ids).size !== ids.length) throw new Error("Un membre ne peut jouer qu'une fois");
    if (!ids.includes(context.userId)) {
      throw new Error("Vous devez faire partie des joueurs pour enregistrer la partie.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("player_stats")
      .select("user_id, matches_played, wins, losses, best_score")
      .in("user_id", ids);
    const rows = members.map((p) => {
      const cur = existing?.find((e) => e.user_id === p.userId);
      return {
        user_id: p.userId as string,
        matches_played: (cur?.matches_played ?? 0) + 1,
        wins: (cur?.wins ?? 0) + (p.won ? 1 : 0),
        losses: (cur?.losses ?? 0) + (p.won ? 0 : 1),
        best_score: Math.max(cur?.best_score ?? 0, p.bestVisit),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabaseAdmin.from("player_stats").upsert(rows, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { saved: rows.length };
  });
