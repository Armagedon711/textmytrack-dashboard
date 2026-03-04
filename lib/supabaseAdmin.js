import { createClient } from "@supabase/supabase-js";

let instance = null;

export function getSupabaseAdmin() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    if (!instance) {
      instance = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }
    return instance;
  }
  return null;
}
