import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { computeUserSimilarity } from "@/lib/recommendation-engine";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where:  { supabase_id: user.id },
    select: { id: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await computeUserSimilarity(dbUser.id);

  const count = await prisma.userSimilarity.count({
    where: { user_a_id: dbUser.id },
  });

  return NextResponse.json({ ok: true, similar_users: count });
}
