import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BLUE_TICK_XP_THRESHOLD } from "@/lib/xp-system";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null });

  const dbUser = await prisma.user.findUnique({
    where: { supabase_id: user.id },
    select: {
      id:            true,
      username:      true,
      avatar_url:    true,
      xp_points:     true,
      streak_count:  true,
      is_admin:      true,
      is_blue_tick:  true,
    },
  });

  if (!dbUser) return NextResponse.json({ user: null });

  const shouldHaveTick = dbUser.xp_points >= BLUE_TICK_XP_THRESHOLD;
  if (shouldHaveTick !== dbUser.is_blue_tick) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data:  { is_blue_tick: shouldHaveTick },
    });
    dbUser.is_blue_tick = shouldHaveTick;
  }

  return NextResponse.json({ user: dbUser });
}
