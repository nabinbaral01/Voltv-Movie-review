import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateHeatmap } from "@/lib/heatmap";
import { getCache, setCache, CacheKeys, TTL } from "@/lib/redis";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  let userId: string;

  if (username) {
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    userId = user.id;
  } else {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    userId = dbUser.id;
  }

  const cacheKey = CacheKeys.heatmap(userId);
  const cached   = await getCache(cacheKey);
  if (cached) return NextResponse.json({ data: cached });

  const heatmap = await generateHeatmap(userId);
  await setCache(cacheKey, heatmap, TTL.heatmap);

  return NextResponse.json({ data: heatmap });
}
