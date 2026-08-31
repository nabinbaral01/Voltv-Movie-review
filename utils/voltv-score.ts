// ─────────────────────────────────────
// VOLTV Score Calculation Engine
// Anti-manipulation weighted scoring
// ─────────────────────────────────────

import { prisma } from "@/lib/prisma";

export interface VoltVScoreResult {
  voltv_score: number;
  skip_pct: number;
  timepass_pct: number;
  watchit_pct: number;
  masterpiece_pct: number;
  total_ratings: number;
  dimension_avgs: {
    story: number;
    direction: number;
    acting: number;
    visuals: number;
    rewatch: number;
  };
}

// Verdict → numeric value for score calculation
const VERDICT_VALUES = {
  skip:        0,
  timepass:    4,
  watchit:     7,
  masterpiece: 10,
} as const;

// Dimension weights (must sum to 1.0)
const DIMENSION_WEIGHTS = {
  story:     0.30,
  direction: 0.25,
  acting:    0.20,
  visuals:   0.15,
  rewatch:   0.10,
};

export async function recalculateVoltVScore(movieId: string): Promise<VoltVScoreResult> {
  const ratings = await prisma.rating.findMany({
    where: { movie_id: movieId },
    select: {
      story:         true,
      direction:     true,
      acting:        true,
      visuals:       true,
      rewatch:       true,
      voltv_verdict: true,
      weight_applied:true,
    },
  });

  if (ratings.length === 0) {
    return {
      voltv_score: 0,
      skip_pct: 0,
      timepass_pct: 0,
      watchit_pct: 0,
      masterpiece_pct: 0,
      total_ratings: 0,
      dimension_avgs: { story: 0, direction: 0, acting: 0, visuals: 0, rewatch: 0 },
    };
  }

  // Weighted totals
  let total_weight = 0;
  let weighted_score = 0;
  let verdict_counts = { skip: 0, timepass: 0, watchit: 0, masterpiece: 0 };
  let dim_sums = { story: 0, direction: 0, acting: 0, visuals: 0, rewatch: 0 };

  for (const r of ratings) {
    const w = r.weight_applied;
    total_weight += w;

    // 70% dimension score + 30% verdict signal
    const dim_score =
      r.story     * DIMENSION_WEIGHTS.story     +
      r.direction * DIMENSION_WEIGHTS.direction +
      r.acting    * DIMENSION_WEIGHTS.acting    +
      r.visuals   * DIMENSION_WEIGHTS.visuals   +
      r.rewatch   * DIMENSION_WEIGHTS.rewatch;

    const verdict_score = VERDICT_VALUES[r.voltv_verdict as keyof typeof VERDICT_VALUES];
    const composite = dim_score * 0.7 + verdict_score * 0.3;

    weighted_score += composite * w;

    verdict_counts[r.voltv_verdict as keyof typeof verdict_counts]++;

    dim_sums.story     += r.story;
    dim_sums.direction += r.direction;
    dim_sums.acting    += r.acting;
    dim_sums.visuals   += r.visuals;
    dim_sums.rewatch   += r.rewatch;
  }

  const n = ratings.length;
  const voltv_score = total_weight > 0
    ? Math.round((weighted_score / total_weight) * 10) / 10
    : 0;

  // n is 0 once the last rating is removed — divide through it and every
  // percentage becomes NaN, which then fails to persist.
  const pct = (count: number) => (n > 0 ? Math.round((count / n) * 100) : 0);
  const avg = (sum: number) => (n > 0 ? Math.round((sum / n) * 10) / 10 : 0);

  return {
    voltv_score: Math.min(10, Math.max(0, voltv_score)),
    skip_pct:        pct(verdict_counts.skip),
    timepass_pct:    pct(verdict_counts.timepass),
    watchit_pct:     pct(verdict_counts.watchit),
    masterpiece_pct: pct(verdict_counts.masterpiece),
    total_ratings: n,
    dimension_avgs: {
      story:     avg(dim_sums.story),
      direction: avg(dim_sums.direction),
      acting:    avg(dim_sums.acting),
      visuals:   avg(dim_sums.visuals),
      rewatch:   avg(dim_sums.rewatch),
    },
  };
}

// Update the movie row with newly computed scores
export async function updateMovieScores(movieId: string): Promise<void> {
  const result = await recalculateVoltVScore(movieId);

  await prisma.movie.update({
    where: { id: movieId },
    data: {
      voltv_score:           result.voltv_score,
      voltv_skip_pct:        result.skip_pct,
      voltv_timepass_pct:    result.timepass_pct,
      voltv_watchit_pct:     result.watchit_pct,
      voltv_masterpiece_pct: result.masterpiece_pct,
      total_ratings_count:   result.total_ratings,
    },
  });
}

// Determines the rating weight for a user at submission time
export function getRatingWeight(user: {
  is_phone_verified: boolean;
  created_at: Date | string;
}): number {
  const ageThresholdDays = Number(process.env.ACCOUNT_AGE_THRESHOLD_DAYS ?? 7);
  const createdAt = new Date(user.created_at);
  const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (!user.is_phone_verified || ageDays < ageThresholdDays) {
    return Number(process.env.RATING_WEIGHT_NEW_ACCOUNT ?? 0.1);
  }
  return Number(process.env.RATING_WEIGHT_VERIFIED ?? 1.0);
}
