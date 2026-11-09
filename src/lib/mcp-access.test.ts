import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ToolContext } from '@lovable.dev/mcp-js';
import { verifiedUserId } from './mcp/supabase';
const { filters, reads, sb } = vi.hoisted(() => {
  const filters: unknown[][] = []; const reads: string[] = [];
  const chain = { select: (columns: string) => { reads.push(columns); return chain; }, eq: (column: string, value: unknown) => { filters.push([column, value]); return chain; }, order: () => chain, limit: async () => ({ data: [], error: null }), maybeSingle: async () => ({ data: null, error: null }) };
  return { filters, reads, sb: { from: () => chain } };
});
vi.mock('./mcp/supabase', async (original) => ({ ...await original<typeof import('./mcp/supabase')>(), supabaseForUser: () => sb }));
import profile from './mcp/tools/my-player-profile';
import organizations from './mcp/tools/my-organizations';
import tournaments from './mcp/tools/my-tournaments';
const context = (authenticated = true, token: string | null = 'test-token', id: string | null = 'verified-user') => ({ isAuthenticated: () => authenticated, getToken: () => token, getUserId: () => id }) as unknown as ToolContext;
describe('MCP caller boundaries', () => {
  beforeEach(() => { filters.length = 0; reads.length = 0; });
  it.each([context(false), context(true, null), context(true, 'test-token', null)])('refuses an unverified caller', ctx => expect(() => verifiedUserId(ctx)).toThrow());
  it('profile and statistics use only verified caller identity', async () => {
    await profile.handler({}, context());
    expect(filters).toEqual([['id', 'verified-user'], ['user_id', 'verified-user']]);
    expect(reads).toEqual(['display_name', 'matches_played,wins,losses,best_score']);
  });
  it('memberships and player affiliations use only verified caller identity', async () => {
    await organizations.handler({}, context());
    expect(filters).toEqual([['user_id', 'verified-user'], ['user_id', 'verified-user']]);
  });
  it('registrations use only verified caller identity and exclude access codes and participants', async () => {
    await tournaments.handler({}, context());
    expect(filters).toEqual([['user_id', 'verified-user']]);
    expect(reads).toEqual(['id,status,tournament_id,tournaments(title,event_date,status,organization_id)']);
  });
});