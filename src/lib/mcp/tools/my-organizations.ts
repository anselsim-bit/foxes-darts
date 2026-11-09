import { defineTool, ToolError } from '@lovable.dev/mcp-js';
import { supabaseForUser, verifiedUserId } from '../supabase';
export default defineTool({
  name: 'list_my_organizations', title: 'Mes organisations',
  description: 'Lister jusqu’à 100 organisations auxquelles le compte connecté appartient, avec son rôle.',
  inputSchema: {}, annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_, ctx) => {
    const id = verifiedUserId(ctx); const sb = supabaseForUser(ctx);
    const [members, players] = await Promise.all([
      sb.from('organization_members').select('organization_id,role,organizations(name,slug,status)').eq('user_id', id).order('organization_id').limit(100),
      sb.from('organization_players').select('organization_id,organizations(name,slug,status)').eq('user_id', id).order('organization_id').limit(100),
    ]);
    if (members.error || players.error) throw new ToolError('Impossible de lire vos organisations.');
    const rows = new Map<string, { id: string; name: string; slug: string; status: string; role: string }>();
    for (const p of players.data ?? []) if (p.organizations) rows.set(p.organization_id, { id: p.organization_id, ...p.organizations, role: 'PLAYER' });
    for (const m of members.data ?? []) if (m.organizations) rows.set(m.organization_id, { id: m.organization_id, ...m.organizations, role: m.role });
    const result = { organizations: [...rows.values()].slice(0, 100) };
    return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
  },
});
