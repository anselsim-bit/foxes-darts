import { defineTool, ToolError } from '@lovable.dev/mcp-js';
import { supabaseForUser, verifiedUserId } from '../supabase';
export default defineTool({
  name: 'get_my_player_profile', title: 'Mon profil et mes statistiques',
  description: 'Lire le nom de joueur et les statistiques globales du compte connecté uniquement.',
  inputSchema: {}, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_, ctx) => {
    const userId = verifiedUserId(ctx); const sb = supabaseForUser(ctx);
    const [profile, stats] = await Promise.all([
      sb.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
      sb.from('player_stats').select('matches_played,wins,losses,best_score').eq('user_id', userId).maybeSingle(),
    ]);
    if (profile.error || stats.error) throw new ToolError('Impossible de lire votre profil.');
    const result = { playerName: profile.data?.display_name ?? null, statistics: stats.data ? { matchesPlayed: stats.data.matches_played, wins: stats.data.wins, losses: stats.data.losses, bestVisit: stats.data.best_score } : null };
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  },
});
