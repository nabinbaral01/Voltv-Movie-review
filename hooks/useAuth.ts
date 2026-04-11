"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user:    User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}

export function useSignIn() {
  const supabase = createClient();

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  async function signInWithPhone(phone: string) {
    return supabase.auth.signInWithOtp({ phone });
  }

  async function verifyOTP(phone: string, token: string) {
    return supabase.auth.verifyOtp({ phone, token, type: "sms" });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  return { signInWithGoogle, signInWithPhone, verifyOTP, signOut };
}
