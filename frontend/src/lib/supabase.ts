import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

if (!PUBLIC_SUPABASE_URL.startsWith('http')) {
  throw new Error(
    `Invalid PUBLIC_SUPABASE_URL: "${PUBLIC_SUPABASE_URL}". Must be a valid HTTPS URL.`
  );
}

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
