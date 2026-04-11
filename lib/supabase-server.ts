import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SESSION_COOKIE = "voltv_session";

// Server Client — reads our own session cookie to provide auth.getUser()
// This avoids depending on Supabase cookies for session management
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE)?.value || null;

  const client = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try { cookieStore.set({ name, value, ...options, secure: false }); } catch {}
      },
      remove(name: string, options: CookieOptions) {
        try { cookieStore.set({ name, value: "", ...options, secure: false }); } catch {}
      },
    },
  });

  // Override getUser to use our session cookie instead of Supabase JWT
  const originalAuth = client.auth;
  client.auth = {
    ...originalAuth,
    getUser: async () => {
      if (!sessionUserId) {
        return { data: { user: null }, error: null } as any;
      }
      return {
        data: {
          user: { id: sessionUserId, email: "", user_metadata: {} },
        },
        error: null,
      } as any;
    },
    // Keep signInWithPassword for legacy migration in login route
    signInWithPassword: originalAuth.signInWithPassword.bind(originalAuth),
  } as any;

  return client;
}

// Admin Client — server-only, uses SERVICE_ROLE_KEY
export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
