import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ success: true });
  res.cookies.delete("voltv_session");
  return res;
}
