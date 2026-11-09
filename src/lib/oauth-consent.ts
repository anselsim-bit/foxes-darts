import { supabase } from '@/integrations/supabase/client';
export type AuthorizationDetails = {
  client?: { name?: string; client_name?: string }; redirect_uri?: string;
  scope?: string; scopes?: string[]; redirect_url?: string; redirect_to?: string;
};
export function authorizationRedirect(data: AuthorizationDetails | null) {
  return data?.redirect_url ?? data?.redirect_to;
}
export const oauth = supabase.auth.oauth;
