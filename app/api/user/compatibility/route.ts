import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { computeCompatibility, compatibilityLabel } from "@/utils/personality";
import { getCache, setCache, CacheKeys, TTL } from "@/lib/redis";
import type { TasteDNA } from "@/types";

export async function GET(req: NextRequest) {
  const targetUsername = req.nextUrl.searchParams.get("username");
  if (!targetUsername) return NextResponse.json({ error: "username required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [me, them] = await Promise.all([
    prisma.user.findUnique({ where: { supabase_id: user.id }, select: { id: true, taste_dna: true } }),
    prisma.user.findUnique({ where: { username: targetUsername }, select: { id: true, taste_dna: true } }),
  ]);

  if (!me || !them) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cacheKey = CacheKeys.compatibility(me.id, them.id);
  const cached   = await getCache(cacheKey);
  if (cached) return NextResponse.json({ data: cached });

  // Get shared ratings for correlation
  const myRatings   = await prisma.rating.findMany({ where: { user_id: me.id   }, select: { movie_id: true, overall_score: true } });
  const theirRatings= await prisma.rating.findMany({ where: { user_id: them.id }, select: { movie_id: true, overall_score: true } });

  const theirMap    = new Map(theirRatings.map((r) => [r.movie_id, r.overall_score]));
  const sharedRatings = myRatings
    .filter((r) => theirMap.has(r.movie_id))
    .map((r) => ({ scoreA: r.overall_score, scoreB: theirMap.get(r.movie_id)! }));

  const emptyDNA: TasteDNA = { action: 0, drama: 0, horror: 0, comedy: 0, scifi: 0, romance: 0, thriller: 0, anime: 0 };
  const dnaA = (me.taste_dna as TasteDNA | null) ?? emptyDNA;
  const dnaB = (them.taste_dna as TasteDNA | null) ?? emptyDNA;

  const score  = computeCompatibility(dnaA, dnaB, sharedRatings);
  const result = {
    score,
    label:         compatibilityLabel(score),
    common_movies: sharedRatings.length,
  };

  await setCache(cacheKey, result, TTL.compatibility);
  return NextResponse.json({ data: result });
}
