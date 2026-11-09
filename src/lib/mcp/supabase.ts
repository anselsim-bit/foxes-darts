import { createClient } from '@supabase/supabase-js';
import { ToolError, type ToolContext } from '@lovable.dev/mcp-js';
import type { Database } from '@/integrations/supabase/types';
function env(name: string) { return process.env[name]?.trim(); }
function projectUrl() {
  const value = env('SUPABASE_URL') ?? env('VITE_SUPABASE_URL');
  if (!value) throw new ToolError('Connexion indisponible.');
  return value;
}
function publishableKey() {
  const direct = env('SUPABASE_PUBLISHABLE_KEY') ?? env('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (direct) return direct;
  try {
    const values: unknown = JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    if (values && typeof values === 'object' && !Array.isArray(values)) {
      const key = Object.values(values).find((v): v is string => typeof v === 'string' && v.startsWith('sb_publishable_'));
      if (key) return key;
    }
  } catch { /* Legacy key remains available. */ }
  const legacy = env('SUPABASE_ANON_KEY') ?? env('VITE_SUPABASE_ANON_KEY');
  if (!legacy) throw new ToolError('Connexion indisponible.');
  return legacy;
}
export function verifiedUserId(ctx: ToolContext) {
  const id = ctx.getUserId();
  if (!ctx.isAuthenticated() || !ctx.getToken() || !id) throw new ToolError('Connectez votre compte Foxes Darts.');
  return id;
}
export function supabaseForUser(ctx: ToolContext) {
  verifiedUserId(ctx);
  const token = ctx.getToken();
  if (!token) throw new ToolError('Connectez votre compte Foxes Darts.');
  return createClient<Database>(projectUrl(), publishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
