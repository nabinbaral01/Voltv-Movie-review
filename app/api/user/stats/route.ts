import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

  const [watchStats, ratingStats, reviewCount, badges] = await Promise.all([
    prisma.watchHistory.findMany({
      where:  { user_id: userId, status: "watched" },
      select: { movie: { select: { runtime: true, genres: true, countries: true, release_date: true } } },
    }),
    prisma.rating.aggregate({
      where: { user_id: userId },
      _avg:  { overall_score: true },
      _count: true,
    }),
    prisma.review.count({ where: { user_id: userId } }),
    prisma.achievement.count({ where: { user_id: userId } }),
  ]);

  const totalMovies   = watchStats.length;
  const totalMinutes  = watchStats.reduce((s, w) => s + (w.movie.runtime ?? 90), 0);
  const countries     = new Set(watchStats.flatMap((w) => w.movie.countries)).size;
  const genres        = new Set(watchStats.flatMap((w) => w.movie.genres)).size;
  const decades       = new Set(
    watchStats
      .filter((w) => w.movie.release_date)
      .map((w) => Math.floor(new Date(w.movie.release_date!).getFullYear() / 10) * 10)
  ).size;

  return NextResponse.json({
    data: {
      total_movies:   totalMovies,
      total_hours:    Math.round(totalMinutes / 60),
      countries_count: countries,
      genres_count:   genres,
      decades_count:  decades,
      avg_rating:     Math.round((ratingStats._avg.overall_score ?? 0) * 10) / 10,
      total_ratings:  ratingStats._count,
      total_reviews:  reviewCount,
      total_badges:   badges,
    },
  });
}
