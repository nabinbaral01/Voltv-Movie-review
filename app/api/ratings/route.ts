import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { z } from "zod";
import { getRatingWeight, updateMovieScores } from "@/utils/voltv-score";
import { awardXP } from "@/lib/xp-system";
import { computeUserSimilarity } from "@/lib/recommendation-engine";
import { checkAndAwardBadges } from "@/lib/badge-engine";
import { updateStreak } from "@/lib/heatmap";
import { rateLimit, deleteCache, CacheKeys } from "@/lib/redis";

const RatingSchema = z.object({
  movie_id:      z.string().min(1),
  story:         z.number().int().min(1).max(10),
  direction:     z.number().int().min(1).max(10),
  acting:        z.number().int().min(1).max(10),
  visuals:       z.number().int().min(1).max(10),
  rewatch:       z.number().int().min(1).max(10),
  voltv_verdict: z.enum(["skip", "timepass", "watchit", "masterpiece"]),
});

// ── GET — fetch user's rating for a movie ─────────────────────
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const movieId = req.nextUrl.searchParams.get("movie_id");
  if (!movieId) return NextResponse.json({ error: "movie_id required" }, { status: 400 });

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      select: { id: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const rating = await prisma.rating.findUnique({
      where: { user_id_movie_id: { user_id: dbUser.id, movie_id: movieId } },
    });

    return NextResponse.json({ data: rating });
  } catch {
    return NextResponse.json({ error: "Failed to fetch rating" }, { status: 500 });
  }
}

// ── POST — submit or update a rating ─────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 10 ratings per hour per user
  const { allowed } = await rateLimit(user.id, "rating", 10, 3600);
  if (!allowed) {
    return NextResponse.json({ error: "Rating limit reached. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = RatingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { movie_id, story, direction, acting, visuals, rewatch, voltv_verdict } = parsed.data;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (dbUser.is_banned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

    // Validate movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movie_id }, select: { id: true } });
    if (!movie) return NextResponse.json({ error: "Movie not found" }, { status: 404 });

    // Calculate weight based on account age + phone verification
    const weightApplied = getRatingWeight(dbUser);

    // Overall score = weighted avg of 5 dimensions
    const overall_score = parseFloat(
      ((story + direction + acting + visuals + rewatch) / 5).toFixed(2)
    );

    // Upsert rating (unique constraint: user_id + movie_id)
    const existingRating = await prisma.rating.findUnique({
      where: { user_id_movie_id: { user_id: dbUser.id, movie_id } },
    });

    const rating = await prisma.rating.upsert({
      where:  { user_id_movie_id: { user_id: dbUser.id, movie_id } },
      create: {
        user_id: dbUser.id, movie_id,
        story, direction, acting, visuals, rewatch,
        voltv_verdict, overall_score, weight_applied: weightApplied,
      },
      update: {
        story, direction, acting, visuals, rewatch,
        voltv_verdict, overall_score, weight_applied: weightApplied,
      },
    });

    // Async post-rating actions (don't block response)
    const isFirstRating = !existingRating;

    Promise.all([
      updateMovieScores(movie_id),
      isFirstRating ? awardXP(dbUser.id, "rate_movie") : Promise.resolve(),
      isFirstRating && updateStreak(dbUser.id),
      checkAndAwardBadges(dbUser.id),
      // Log activity
      isFirstRating && prisma.activityFeed.create({
        data: {
          user_id:      dbUser.id,
          activity_type:"rated_movie",
          movie_id,
          metadata:     { verdict: voltv_verdict, score: overall_score },
        },
      }),
      // Invalidate caches
      deleteCache(CacheKeys.movieTmdb(movie_id as unknown as number)),
      deleteCache(CacheKeys.heatmap(dbUser.id)),
      // Recompute user similarity for recommendations
      computeUserSimilarity(dbUser.id),
    ]).catch((e) => console.error("Post-rating actions failed:", e));

    return NextResponse.json({ data: rating, xp_gained: 5 }, { status: 200 });
  } catch (err) {
    console.error("[/api/ratings POST]", err);
    return NextResponse.json({ error: "Failed to submit rating" }, { status: 500 });
  }
}
