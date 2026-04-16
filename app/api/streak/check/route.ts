import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(_req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { streak_count: true, streak_last_date: true, streak_shields: true },
  });

  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check if streak is at risk (last log was 6+ days ago)
  const lastDate    = dbUser.streak_last_date ? new Date(dbUser.streak_last_date) : null;
  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  const streak_at_risk = dbUser.streak_count > 0 && daysSinceLast >= 6;

  return NextResponse.json({
    data: {
      streak_count:   dbUser.streak_count,
      streak_at_risk,
      shields:        dbUser.streak_shields,
    },
  });
}
