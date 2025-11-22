"use client";

import {
  createBrowserSupabaseClient,
} from "@supabase/auth-helpers-nextjs";

import {
  createServerSupabaseClient,
} from "@supabase/auth-helpers-nextjs";

/**
 * Browser-side Supabase client
 * Used inside client components (like your dashboard).
 */
export const supabaseBrowserClient = () => {
  return createBrowserSupabaseClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
};

/**
 * Server-side Supabase client
 * Used inside server components, API routes, or layouts.
 * 
 * Usage:
 * const supabase = await supabaseServer(cookies);
 */
export const supabaseServer = async (ctx) => {
  return createServerSupabaseClient({
    cookies: ctx,
  });
};
