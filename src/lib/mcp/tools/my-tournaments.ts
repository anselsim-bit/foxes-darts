import { defineTool, ToolError } from '@lovable.dev/mcp-js';
import { supabaseForUser, verifiedUserId } from '../supabase';
export default defineTool({
  name: 'list_my_tournament_registrations', title: 'Mes inscriptions aux tournois',
  description: 'Lire les 50 dernières inscriptions du compte connecté sans exposer les autres participants ni les codes d’accès.',
  inputSchema: {}, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_, ctx) => {
    const id = verifiedUserId(ctx); const sb = supabaseForUser(ctx);
    const { data, error } = await sb.from('registrations').select('id,status,tournament_id,tournaments(title,event_date,status,organization_id)').eq('user_id', id).order('created_at', { ascending: false }).limit(50);
    if (error) throw new ToolError('Impossible de lire vos inscriptions.');
    const result = { registrations: (data ?? []).map(r => ({ id: r.id, status: r.status, tournamentId: r.tournament_id, tournament: r.tournaments ? { title: r.tournaments.title, date: r.tournaments.event_date, status: r.tournaments.status, organizationId: r.tournaments.organization_id } : null })) };
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  },
});
