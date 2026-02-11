/// <reference types="@sveltejs/kit" />

declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient;
    getSession: () => Promise<import('@supabase/supabase-js').Session | null>;
  }

  interface PageData {
    session: import('@supabase/supabase-js').Session | null;
  }
}
