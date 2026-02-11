import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/** Admin client with service role key — use only server-side */
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Creates a client scoped to a user's JWT for row-level security */
export function createUserClient(accessToken: string) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
