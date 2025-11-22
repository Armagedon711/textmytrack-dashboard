import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export const supabaseBrowserClient = () => createBrowserSupabaseClient();
export const supabaseServer = async (ctx) => createServerSupabaseClient(ctx);
