import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageIdFor } from "@/lib/media-kind";

// GET /api/ratings/community?tmdb_id=X&media_kind=movie&limit=20
// Returns: { count, average, items: [{ username, avatar_url, score, verdict, created_at }] }
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tmdbId = Number(sp.get("tmdb_id"));
  const mediaKind = sp.get("media_kind") === "tv" ? "tv" : "movie";
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit")) || 20));

  if (!Number.isFinite(tmdbId)) {
    return NextResponse.json({ count: 0, average: null, items: [] });
  }

  const storageId = storageIdFor(tmdbId, mediaKind);
  const movie = await prisma.movie.findUnique({
    where: { tmdb_id: storageId }, select: { id: true },
  });
  if (!movie) {
    return NextResponse.json({ count: 0, average: null, items: [] });
  }

  const [agg, ratings] = await Promise.all([
    prisma.rating.aggregate({
      where: { movie_id: movie.id },
      _avg:  { overall_score: true },
      _count: { _all: true },
    }),
    prisma.rating.findMany({
      where:   { movie_id: movie.id },
      orderBy: { updated_at: "desc" },
      take:    limit,
      select: {
        overall_score: true,
        voltv_verdict: true,
        updated_at:    true,
        user: {
          select: { username: true, avatar_url: true, is_blue_tick: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    count:   agg._count._all,
    average: agg._avg.overall_score,
    items: ratings.map((r) => ({
      username:   r.user.username,
      avatar_url: r.user.avatar_url,
      blue_tick:  r.user.is_blue_tick,
      score:      r.overall_score,
      verdict:    r.voltv_verdict,
      updated_at: r.updated_at,
    })),
  });
}
