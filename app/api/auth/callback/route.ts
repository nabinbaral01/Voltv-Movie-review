import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code  = searchParams.get("code");
  const next  = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?error=no_code`);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(`${origin}/auth/error?error=exchange_failed`);
  }

  const supabaseUser = data.user;

  // Ensure user exists in our DB
  const existing = await prisma.user.findUnique({
    where: { supabase_id: supabaseUser.id },
  });

  if (!existing) {
    // Create user record
    const email    = supabaseUser.email ?? "";
    const username = generateUsername(email, supabaseUser.id);

    // Check if this is one of the first 1000 users (VOLTV OG)
    const userCount = await prisma.user.count();
    const isOG      = userCount < 1000;

    const newUser = await prisma.user.create({
      data: {
        supabase_id:      supabaseUser.id,
        username,
        email,
        avatar_url:       supabaseUser.user_metadata?.avatar_url ?? null,
        is_phone_verified:supabaseUser.phone ? !!supabaseUser.phone_confirmed_at : false,
        rating_weight:    0.1, // starts low, increases after 7 days + phone verify
      },
    });

    // Award VOLTV OG badge
    if (isOG) {
      await prisma.achievement.create({
        data: {
          user_id:    newUser.id,
          badge_id:   "voltv_og",
          badge_name: "VOLTV OG",
          badge_type: "legendary",
          badge_icon: "⚡",
          description:"One of the first 1000 VOLTV users — never available again",
        },
      });

      // Notification
      await prisma.notification.create({
        data: {
          user_id: newUser.id,
          type:    "badge_unlocked",
          message: "⚡ You earned the exclusive VOLTV OG badge! One of the first 1000 users.",
        },
      });
    }
  } else {
    // Update last_active
    await prisma.user.update({
      where: { id: existing.id },
      data:  { last_active: new Date() },
    });
  }

  return NextResponse.redirect(`${origin}${next}`);
}

function generateUsername(email: string, uid: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);
  const suffix = uid.slice(0, 4);
  return `${base}${suffix}`;
}
