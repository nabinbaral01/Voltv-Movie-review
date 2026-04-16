// ─────────────────────────────────────
// VOLTV — Prediction Model (Level 1)
// Genre-weighted score, zero API cost
// ─────────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface PredictionResult {
  predicted_score: number;
  confidence: "low" | "medium" | "high";
  method: "genre_weighted" | "collaborative" | "community_avg";
  similar_users_count?: number;
}

// Level 1: Genre-Weighted Score
// predicted = (voltv_score × 0.6) + (user_genre_avg × 0.4)
export async function predictForUser(userId: string, movieId: string): Promise<PredictionResult> {
  const [movie, userRatings] = await Promise.all([
    prisma.movie.findUnique({
      where:  { id: movieId },
      select: { genres: true, voltv_score: true, tmdb_rating: true },
    }),
    prisma.rating.findMany({
      where:  { user_id: userId },
      select: { overall_score: true, movie: { select: { genres: true } } },
      orderBy: { created_at: "desc" },
      take:   200,
    }),
  ]);

  if (!movie) throw new Error("Movie not found");

  // If movie has no VOLTV score yet, fall back to TMDB
  const community_score = movie.voltv_score ?? (movie.tmdb_rating ? movie.tmdb_rating : null);

  if (!community_score) {
    return { predicted_score: 7.0, confidence: "low", method: "community_avg" };
  }

  if (userRatings.length < 5) {
    // Not enough data — return community score directly
    return {
      predicted_score: Math.round(community_score * 10) / 10,
      confidence: "low",
      method: "community_avg",
    };
  }

  // Calculate user's average score for movies in the same genres
  const movieGenres = new Set(movie.genres);
  const genreRatings = userRatings.filter((r: { overall_score: number; movie: { genres: string[] } }) =>
    r.movie.genres.some((g: string) => movieGenres.has(g))
  );

  const genre_avg =
    genreRatings.length > 0
      ? genreRatings.reduce((s: number, r: { overall_score: number }) => s + r.overall_score, 0) / genreRatings.length
      : userRatings.reduce((s: number, r: { overall_score: number }) => s + r.overall_score, 0) / userRatings.length;

  const predicted = community_score * 0.6 + genre_avg * 0.4;
  const confidence = genreRatings.length >= 10 ? "high" : genreRatings.length >= 3 ? "medium" : "low";

  return {
    predicted_score: Math.round(Math.min(10, Math.max(0, predicted)) * 10) / 10,
    confidence,
    method: "genre_weighted",
  };
}

// Resolve predictions for a movie after it has been rated enough
export async function resolvePredictions(movieId: string): Promise<void> {
  const movie = await prisma.movie.findUnique({
    where:  { id: movieId },
    select: { voltv_score: true, total_ratings_count: true },
  });

  // Only resolve when there are 10+ ratings (enough to be reliable)
  if (!movie?.voltv_score || movie.total_ratings_count < 10) return;

  const pending = await prisma.predictions.findMany({
    where: { movie_id: movieId, status: "pending" },
  });

  for (const prediction of pending) {
    const accuracy = 100 - Math.abs(prediction.predicted_score - movie.voltv_score) * 10;
    await prisma.predictions.update({
      where: { id: prediction.id },
      data: {
        actual_score:  movie.voltv_score,
        accuracy_pct:  Math.max(0, Math.round(accuracy)),
        status:        "resolved",
        resolved_at:   new Date(),
      },
    });
  }
}
