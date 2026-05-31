import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/config/env";
import type { Database } from "@/types/database";

/**
 * Service-role client for trusted server-side operations only.
 * Never import this module in Client Components.
 */
export function createAdminClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations.");
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
