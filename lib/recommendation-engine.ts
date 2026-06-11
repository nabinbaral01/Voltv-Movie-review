// ─────────────────────────────────────────────────────────────────────
// VOLTV — Hybrid Recommendation Engine
// 5 layers: Collaborative + Content-Based + ML Scoring + Deep Embedding + Ranking
// ─────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import { TV_TMDB_OFFSET } from "@/lib/media-kind";
import type { TasteDNA } from "@/types";

// ── Types ─────────────────────────────────────────────────────────

export interface RecommendedMovie {
  movie_id:       string;
  tmdb_id:        number;
  title:          string;
  poster_url:     string | null;
  release_date:   Date | null;
  genres:         string[];
  runtime:        number | null;
  voltv_score:    number | null;
  tmdb_rating:    number | null;
  final_score:    number;
  reason:         string;
  signals: {
    collaborative:  number;
    content:        number;
    popularity:     number;
    recency:        number;
    deep_match:     number;
  };
  confidence:     "low" | "medium" | "high";
}

// ── Genre → TasteDNA mapping ──────────────────────────────────────

const GENRE_KEY: Record<string, keyof TasteDNA> = {
  Action: "action", Adventure: "action",
  Drama: "drama",
  Horror: "horror",
  Thriller: "thriller",
  Comedy: "comedy",
  Romance: "romance",
  "Science Fiction": "scifi", Fantasy: "scifi",
  Animation: "anime",
};

const ALL_TASTE_KEYS: (keyof TasteDNA)[] = [
  "action", "drama", "horror", "comedy", "scifi", "romance", "thriller", "anime",
];

// ── Vector math (deep embedding proxy) ────────────────────────────

function toVector(dna: TasteDNA): number[] {
  return ALL_TASTE_KEYS.map((k) => dna[k] ?? 0);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function movieToVector(genres: string[]): number[] {
  const dna: TasteDNA = { action: 0, drama: 0, horror: 0, comedy: 0, scifi: 0, romance: 0, thriller: 0, anime: 0 };
  for (const g of genres) {
    const key = GENRE_KEY[g];
    if (key) dna[key] = 100;
  }
  return toVector(dna);
}

// ── Layer 1: Collaborative Filtering ──────────────────────────────
// Find users similar to you → what they rated highly that you haven't seen

async function collaborativeScore(
  userId: string,
  movieId: string,
  similarUsers: { user_id: string; similarity: number }[],
): Promise<number> {
  if (similarUsers.length === 0) return 0;

  const ratings = await prisma.rating.findMany({
    where: {
      movie_id: movieId,
      user_id:  { in: similarUsers.map((u) => u.user_id) },
    },
    select: { user_id: true, overall_score: true },
  });

  if (ratings.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;
  for (const r of ratings) {
    const sim = similarUsers.find((u) => u.user_id === r.user_id)?.similarity ?? 0;
    weightedSum += r.overall_score * sim;
    weightTotal += sim;
  }

  return weightTotal > 0 ? (weightedSum / weightTotal) / 10 : 0;
}

// ── Layer 2: Content-Based Filtering ──────────────────────────────
// Match movie genres against user's taste DNA profile

function contentScore(userDNA: TasteDNA, movieGenres: string[]): number {
  const userVec  = toVector(userDNA);
  const movieVec = movieToVector(movieGenres);
  return cosineSimilarity(userVec, movieVec);
}

// ── Layer 3: ML Feature Scoring ───────────────────────────────────
// Multi-feature weighted model combining community signals

function mlFeatureScore(movie: {
  voltv_score: number | null;
  tmdb_rating: number | null;
  tmdb_popularity: number | null;
  total_ratings_count: number;
  total_reviews_count: number;
  voltv_masterpiece_pct: number;
  editors_pick: boolean;
}): number {
  const voltvNorm     = (movie.voltv_score ?? 5) / 10;
  const tmdbNorm      = (movie.tmdb_rating ?? 5) / 10;
  const popNorm       = Math.min(1, (movie.tmdb_popularity ?? 0) / 200);
  const engageNorm    = Math.min(1, (movie.total_ratings_count + movie.total_reviews_count) / 100);
  const masterpieceW  = movie.voltv_masterpiece_pct / 100;
  const editorBoost   = movie.editors_pick ? 0.1 : 0;

  return (
    voltvNorm     * 0.30 +
    tmdbNorm      * 0.20 +
    popNorm       * 0.10 +
    engageNorm    * 0.10 +
    masterpieceW  * 0.20 +
    editorBoost   +
    0 // pad
  );
}

// ── Layer 4: Deep Embedding Match ─────────────────────────────────
// Cosine similarity between user taste vector and movie genre vector
// + bonus from users with highest similarity who loved this movie

async function deepMatchScore(
  userDNA: TasteDNA,
  movieGenres: string[],
  movieId: string,
  similarUsers: { user_id: string; similarity: number }[],
): Promise<number> {
  const vectorMatch = cosineSimilarity(toVector(userDNA), movieToVector(movieGenres));

  const topFans = similarUsers.slice(0, 5);
  if (topFans.length === 0) return vectorMatch;

  const loveSignals = await prisma.rating.findMany({
    where: {
      movie_id: movieId,
      user_id: { in: topFans.map((u) => u.user_id) },
      voltv_verdict: "masterpiece",
    },
    select: { user_id: true },
  });

  const fanBoost = loveSignals.length * 0.05;
  return Math.min(1, vectorMatch * 0.7 + fanBoost * 0.3);
}

// ── Layer 5: Ranking — combine all signals ────────────────────────

const WEIGHTS = {
  collaborative: 0.30,
  content:       0.25,
  ml_features:   0.20,
  deep_match:    0.15,
  recency:       0.10,
};

function recencyScore(releaseDate: Date | null): number {
  if (!releaseDate) return 0.5;
  const ageYears = (Date.now() - releaseDate.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears < 0.5) return 1.0;
  if (ageYears < 1)   return 0.9;
  if (ageYears < 3)   return 0.7;
  if (ageYears < 10)  return 0.5;
  return 0.3;
}

function pickReason(signals: RecommendedMovie["signals"], genres: string[]): string {
  const top = Object.entries(signals).sort((a, b) => b[1] - a[1])[0];
  const genreStr = genres.slice(0, 2).join(" & ");
  switch (top[0]) {
    case "collaborative":  return "People with your taste loved this";
    case "content":        return `Matches your love for ${genreStr}`;
    case "popularity":     return "Trending with high ratings";
    case "deep_match":     return `Deep match — fits your ${genreStr} profile`;
    case "recency":        return "Fresh release you might enjoy";
    default:               return "Recommended for you";
  }
}

// ── Main Engine ───────────────────────────────────────────────────

export async function getRecommendations(
  userId: string,
  limit: number = 20,
): Promise<RecommendedMovie[]> {
  // 1. Load user profile
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { taste_dna: true },
  });
  if (!user) return [];

  const userDNA: TasteDNA = (user.taste_dna as TasteDNA | null) ?? {
    action: 50, drama: 50, horror: 50, comedy: 50,
    scifi: 50, romance: 50, thriller: 50, anime: 50,
  };

  // 2. Build live taste DNA from ratings if available
  const userRatings = await prisma.rating.findMany({
    where:  { user_id: userId },
    select: { overall_score: true, movie: { select: { genres: true } } },
    take:   500,
  });

  if (userRatings.length >= 3) {
    for (const key of ALL_TASTE_KEYS) userDNA[key] = 0;
    const counts: Record<string, number> = {};
    for (const r of userRatings) {
      for (const g of r.movie.genres) {
        const key = GENRE_KEY[g];
        if (key) {
          userDNA[key] = (userDNA[key] || 0) + r.overall_score;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    for (const key of ALL_TASTE_KEYS) {
      userDNA[key] = counts[key] ? Math.round((userDNA[key] / counts[key]) * 10) : 0;
    }
  }

  // 3. Get movies user already watched/rated (exclude from results)
  const [watchedIds, ratedIds] = await Promise.all([
    prisma.watchHistory.findMany({
      where:  { user_id: userId },
      select: { movie_id: true },
    }),
    prisma.rating.findMany({
      where:  { user_id: userId },
      select: { movie_id: true },
    }),
  ]);
  const seenSet = new Set([
    ...watchedIds.map((w) => w.movie_id),
    ...ratedIds.map((r) => r.movie_id),
  ]);

  // 4. Find similar users (collaborative filtering prep)
  const similarities = await prisma.userSimilarity.findMany({
    where:   { user_a_id: userId, similarity_score: { gte: 0.3 } },
    orderBy: { similarity_score: "desc" },
    take:    30,
    select:  { user_b_id: true, similarity_score: true },
  });
  const similarUsers = similarities.map((s) => ({
    user_id: s.user_b_id, similarity: s.similarity_score,
  }));

  // 4b. Extra signals: liked reviews & bookmarked movies → boost similar movies
  const [likedReviewMovieRows, bookmarkedRows] = await Promise.all([
    prisma.reviewLike.findMany({
      where:  { user_id: userId },
      select: { review: { select: { movie_id: true } } },
      take:   200,
    }),
    prisma.bookmark.findMany({
      where:  { user_id: userId },
      select: { review: { select: { movie_id: true } } },
      take:   200,
    }),
  ]);
  const interestedMovieIds = new Set<string>([
    ...likedReviewMovieRows.map((r) => r.review.movie_id).filter((x): x is string => !!x),
    ...bookmarkedRows.map((b) => b.review.movie_id).filter((x): x is string => !!x),
  ]);

  // 5. Get candidate movies (pool of potential recommendations)
  // Split the pool by media kind so TV shows (and anime TV) aren't crowded out by movies'
  // generally higher tmdb_popularity. TV is stored in the same table with tmdb_id >= TV_TMDB_OFFSET.
  const candidateSelect = {
    id: true, tmdb_id: true, title: true, poster_url: true,
    release_date: true, genres: true, runtime: true,
    voltv_score: true, tmdb_rating: true, tmdb_popularity: true,
    total_ratings_count: true, total_reviews_count: true,
    voltv_masterpiece_pct: true, editors_pick: true,
  } as const;

  const [movieCandidates, tvCandidates] = await Promise.all([
    prisma.movie.findMany({
      where:   { id: { notIn: [...seenSet] }, is_upcoming: false, tmdb_id: { lt: TV_TMDB_OFFSET } },
      orderBy: [{ tmdb_popularity: "desc" }],
      take:    250,
      select:  candidateSelect,
    }),
    prisma.movie.findMany({
      where:   { id: { notIn: [...seenSet] }, is_upcoming: false, tmdb_id: { gte: TV_TMDB_OFFSET } },
      orderBy: [{ tmdb_popularity: "desc" }],
      take:    150,
      select:  candidateSelect,
    }),
  ]);
  const candidates = [...movieCandidates, ...tvCandidates];

  // 6. Score each candidate through all 5 layers
  const scored: RecommendedMovie[] = [];

  for (const movie of candidates) {
    const content     = contentScore(userDNA, movie.genres);
    const ml          = mlFeatureScore(movie);
    const recency     = recencyScore(movie.release_date);

    // Batch collaborative + deep match (these hit DB — optimize with parallel)
    const [collab, deep] = await Promise.all([
      collaborativeScore(userId, movie.id, similarUsers),
      deepMatchScore(userDNA, movie.genres, movie.id, similarUsers),
    ]);

    // Boost for genre overlap with movies user liked/bookmarked (post likes + bookmarks)
    let interestBoost = 0;
    if (interestedMovieIds.size > 0) {
      const sharedGenreHits = movie.genres.filter((g) => {
        const key = GENRE_KEY[g];
        return key && userDNA[key] > 50;
      }).length;
      interestBoost = Math.min(0.1, sharedGenreHits * 0.03);
    }

    const signals = {
      collaborative: collab,
      content,
      popularity:    ml,
      recency,
      deep_match:    deep,
    };

    const final =
      signals.collaborative * WEIGHTS.collaborative +
      signals.content       * WEIGHTS.content +
      signals.popularity    * WEIGHTS.ml_features +
      signals.deep_match    * WEIGHTS.deep_match +
      signals.recency       * WEIGHTS.recency +
      interestBoost;

    const ratedByN = similarUsers.length;
    const confidence =
      ratedByN >= 10 && userRatings.length >= 10 ? "high" :
      ratedByN >= 3  || userRatings.length >= 5  ? "medium" : "low";

    scored.push({
      movie_id:     movie.id,
      tmdb_id:      movie.tmdb_id,
      title:        movie.title,
      poster_url:   movie.poster_url,
      release_date: movie.release_date,
      genres:       movie.genres,
      runtime:      movie.runtime,
      voltv_score:  movie.voltv_score,
      tmdb_rating:  movie.tmdb_rating,
      final_score:  Math.round(final * 1000) / 1000,
      reason:       pickReason(signals, movie.genres),
      signals,
      confidence,
    });
  }

  // 7. Rank by final score, diversify genres
  scored.sort((a, b) => b.final_score - a.final_score);

  // Soft genre diversity: cap at 8 per primary genre so deep preferences still surface
  const diverse: RecommendedMovie[] = [];
  const genreCounts: Record<string, number> = {};
  for (const m of scored) {
    const mainGenre = m.genres[0] ?? "Other";
    if ((genreCounts[mainGenre] ?? 0) >= 8) continue;
    genreCounts[mainGenre] = (genreCounts[mainGenre] ?? 0) + 1;
    diverse.push(m);
    if (diverse.length >= limit) break;
  }

  // Fallback fill — if diversity cap left us short, top up from remaining scored
  if (diverse.length < limit) {
    const seen = new Set(diverse.map((d) => d.movie_id));
    for (const m of scored) {
      if (seen.has(m.movie_id)) continue;
      diverse.push(m);
      if (diverse.length >= limit) break;
    }
  }

  return diverse;
}

// ── User Similarity Computation ───────────────────────────────────
// Call periodically (cron job / after rating) to update collaborative graph

export async function computeUserSimilarity(userId: string): Promise<void> {
  const myRatings = await prisma.rating.findMany({
    where:  { user_id: userId },
    select: { movie_id: true, overall_score: true },
  });
  if (myRatings.length < 3) return;

  const myMap = new Map(myRatings.map((r) => [r.movie_id, r.overall_score]));
  const movieIds = [...myMap.keys()];

  // Find all users who rated the same movies
  const otherRatings = await prisma.rating.findMany({
    where: {
      movie_id: { in: movieIds },
      user_id:  { not: userId },
    },
    select: { user_id: true, movie_id: true, overall_score: true },
  });

  // Group by user
  const userRatingsMap = new Map<string, Map<string, number>>();
  for (const r of otherRatings) {
    if (!userRatingsMap.has(r.user_id)) userRatingsMap.set(r.user_id, new Map());
    userRatingsMap.get(r.user_id)!.set(r.movie_id, r.overall_score);
  }

  // Compute Pearson correlation for each user pair
  const upserts: { userId2: string; score: number; common: number }[] = [];

  for (const [otherId, otherMap] of userRatingsMap) {
    const commonMovies = movieIds.filter((id) => otherMap.has(id));
    if (commonMovies.length < 2) continue;

    const myScores    = commonMovies.map((id) => myMap.get(id)!);
    const otherScores = commonMovies.map((id) => otherMap.get(id)!);

    const myMean    = myScores.reduce((a, b) => a + b, 0) / myScores.length;
    const otherMean = otherScores.reduce((a, b) => a + b, 0) / otherScores.length;

    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < commonMovies.length; i++) {
      const a = myScores[i] - myMean;
      const b = otherScores[i] - otherMean;
      num  += a * b;
      denA += a * a;
      denB += b * b;
    }

    const denom = Math.sqrt(denA) * Math.sqrt(denB);
    const pearson = denom === 0 ? 0 : num / denom;

    // Also compute taste DNA cosine similarity if available
    const otherUser = await prisma.user.findUnique({
      where: { id: otherId }, select: { taste_dna: true },
    });
    const otherDNA = otherUser?.taste_dna as TasteDNA | null;
    const myUser = await prisma.user.findUnique({
      where: { id: userId }, select: { taste_dna: true },
    });
    const myDNA = (myUser?.taste_dna as TasteDNA | null) ?? {
      action: 50, drama: 50, horror: 50, comedy: 50,
      scifi: 50, romance: 50, thriller: 50, anime: 50,
    };

    let dnaScore = 0;
    if (otherDNA) {
      dnaScore = cosineSimilarity(toVector(myDNA), toVector(otherDNA));
    }

    // Blend: 60% Pearson rating correlation + 40% taste DNA cosine
    const blended = pearson * 0.6 + dnaScore * 0.4;

    if (blended > 0.1) {
      upserts.push({ userId2: otherId, score: Math.round(blended * 1000) / 1000, common: commonMovies.length });
    }
  }

  // Batch upsert similarities
  for (const u of upserts) {
    await prisma.userSimilarity.upsert({
      where:  { user_a_id_user_b_id: { user_a_id: userId, user_b_id: u.userId2 } },
      create: { user_a_id: userId, user_b_id: u.userId2, similarity_score: u.score, common_movies_count: u.common },
      update: { similarity_score: u.score, common_movies_count: u.common, last_calculated: new Date() },
    });
  }
}

// ── Quick recommendations (no DB similarity, content-based only) ──
// For new users or fast fallback

export async function getQuickRecommendations(
  userDNA: TasteDNA,
  excludeIds: string[],
  limit: number = 10,
): Promise<RecommendedMovie[]> {
  const quickSelect = {
    id: true, tmdb_id: true, title: true, poster_url: true,
    release_date: true, genres: true, runtime: true,
    voltv_score: true, tmdb_rating: true, tmdb_popularity: true,
    total_ratings_count: true, total_reviews_count: true,
    voltv_masterpiece_pct: true, editors_pick: true,
  } as const;

  const [movieRows, tvRows] = await Promise.all([
    prisma.movie.findMany({
      where:   { id: { notIn: excludeIds }, is_upcoming: false, tmdb_rating: { gte: 6 }, tmdb_id: { lt: TV_TMDB_OFFSET } },
      orderBy: { tmdb_popularity: "desc" },
      take:    70,
      select:  quickSelect,
    }),
    prisma.movie.findMany({
      where:   { id: { notIn: excludeIds }, is_upcoming: false, tmdb_rating: { gte: 6 }, tmdb_id: { gte: TV_TMDB_OFFSET } },
      orderBy: { tmdb_popularity: "desc" },
      take:    40,
      select:  quickSelect,
    }),
  ]);
  const candidates = [...movieRows, ...tvRows];

  return candidates
    .map((movie) => {
      const content = contentScore(userDNA, movie.genres);
      const ml      = mlFeatureScore(movie);
      const recency = recencyScore(movie.release_date);
      const final   = content * 0.45 + ml * 0.35 + recency * 0.20;
      const signals = { collaborative: 0, content, popularity: ml, recency, deep_match: content };
      return {
        movie_id: movie.id, tmdb_id: movie.tmdb_id, title: movie.title,
        poster_url: movie.poster_url, release_date: movie.release_date,
        genres: movie.genres, runtime: movie.runtime,
        voltv_score: movie.voltv_score, tmdb_rating: movie.tmdb_rating,
        final_score: Math.round(final * 1000) / 1000,
        reason: pickReason(signals, movie.genres),
        signals, confidence: "low" as const,
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, limit);
}

// ── Categorized Recommendations ───────────────────────────────────
// Groups results into engaging sections for the recommendations page

export interface RecSection {
  id:       string;
  title:    string;
  subtitle: string;
  gradient: string;
  icon:     string;
  movies:   RecommendedMovie[];
  layout:   "hero" | "row" | "grid" | "spotlight";
}

export async function getCategorizedRecommendations(userId: string): Promise<{
  sections: RecSection[];
  topGenres: { genre: string; score: number }[];
  similarUsersCount: number;
  totalRated: number;
}> {
  const all = await getRecommendations(userId, 150);

  // User stats + signals beyond just genre averages
  const [similarCount, ratedCount, userRatings, topRated] = await Promise.all([
    prisma.userSimilarity.count({ where: { user_a_id: userId } }),
    prisma.rating.count({ where: { user_id: userId } }),
    prisma.rating.findMany({
      where: { user_id: userId },
      select: { overall_score: true, movie: { select: { title: true, genres: true } } },
      take: 500,
    }),
    prisma.rating.findMany({
      where:   { user_id: userId, overall_score: { gte: 8 } },
      orderBy: { overall_score: "desc" },
      take:    1,
      select:  { movie: { select: { title: true, genres: true } } },
    }),
  ]);

  // Compute top genres from ratings
  const genreScores: Record<string, { total: number; count: number }> = {};
  for (const r of userRatings) {
    for (const g of r.movie.genres) {
      if (!genreScores[g]) genreScores[g] = { total: 0, count: 0 };
      genreScores[g].total += r.overall_score;
      genreScores[g].count += 1;
    }
  }
  const topGenres = Object.entries(genreScores)
    .map(([genre, { total, count }]) => ({ genre, score: total / count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const usedIds = new Set<string>();
  function take(filter: (m: RecommendedMovie) => boolean, n: number): RecommendedMovie[] {
    const result: RecommendedMovie[] = [];
    for (const m of all) {
      if (usedIds.has(m.movie_id)) continue;
      if (!filter(m)) continue;
      result.push(m);
      usedIds.add(m.movie_id);
      if (result.length >= n) break;
    }
    return result;
  }

  const sections: RecSection[] = [];

  // 1. Top Pick — single best match as hero
  const topPick = take(() => true, 1);
  if (topPick.length) {
    sections.push({
      id: "top-pick", title: "Your #1 Pick Tonight",
      subtitle: topPick[0].reason,
      gradient: "from-[#E50914] to-[#8B5CF6]",
      icon: "crown", movies: topPick, layout: "hero",
    });
  }

  // 2. "Because you rated X highly" — cloned from user's best-rated title
  if (topRated[0]?.movie) {
    const anchor = topRated[0].movie;
    const anchorGenres = new Set(anchor.genres);
    const similar = take(
      (m) => m.genres.some((g) => anchorGenres.has(g)) && m.title !== anchor.title,
      12,
    );
    if (similar.length >= 3) {
      sections.push({
        id: "because-rated", title: `Because you loved ${anchor.title}`,
        subtitle: "Movies that share its genre DNA",
        gradient: "from-[#F59E0B] to-[#E50914]",
        icon: "heart", movies: similar, layout: "row",
      });
    }
  }

  // 3. "Because you love [top genre]"
  if (topGenres.length > 0) {
    const g = topGenres[0].genre;
    const genreMovies = take((m) => m.genres.includes(g), 14);
    if (genreMovies.length >= 3) {
      sections.push({
        id: "top-genre", title: `Because You Love ${g}`,
        subtitle: `Your avg ${g} rating: ${topGenres[0].score.toFixed(1)}/10`,
        gradient: "from-[#8B5CF6] to-[#3B82F6]",
        icon: "heart", movies: genreMovies, layout: "row",
      });
    }
  }

  // 4. Hidden Gems — high content match + low popularity
  const gems = take((m) => m.signals.content > 0.5 && m.signals.popularity < 0.3, 10);
  if (gems.length >= 2) {
    sections.push({
      id: "hidden-gems", title: "Hidden Gems For You",
      subtitle: "High match, low hype — discover something special",
      gradient: "from-[#22C55E] to-[#059669]",
      icon: "gem", movies: gems, layout: "grid",
    });
  }

  // 5. People Like You Watched — high collaborative score
  const social = take((m) => m.signals.collaborative > 0.1, 12);
  if (social.length >= 2) {
    sections.push({
      id: "collaborative", title: "People Like You Watched",
      subtitle: `Based on ${similarCount} users with similar taste`,
      gradient: "from-[#F59E0B] to-[#EF4444]",
      icon: "users", movies: social, layout: "row",
    });
  }

  // 6. "Because you love [2nd genre]"
  if (topGenres.length > 1) {
    const g = topGenres[1].genre;
    const genreMovies = take((m) => m.genres.includes(g), 12);
    if (genreMovies.length >= 2) {
      sections.push({
        id: "genre-2", title: `More ${g} For You`,
        subtitle: `You rated ${g} movies ${topGenres[1].score.toFixed(1)}/10 on average`,
        gradient: "from-[#EC4899] to-[#8B5CF6]",
        icon: "sparkles", movies: genreMovies, layout: "row",
      });
    }
  }

  // 7. Anime Picks — only when user actually leans into animation
  const animeGenre = topGenres.find((g) => g.genre === "Animation");
  if (animeGenre && animeGenre.score >= 6) {
    const anime = take((m) => m.genres.includes("Animation"), 10);
    if (anime.length >= 3) {
      sections.push({
        id: "anime", title: "Top Anime & Animation Picks",
        subtitle: `You rate animation ${animeGenre.score.toFixed(1)}/10`,
        gradient: "from-[#F5A623] to-[#E50914]",
        icon: "sparkles", movies: anime, layout: "row",
      });
    }
  }

  // 8. Fresh & Hot — high recency score
  const fresh = take((m) => m.signals.recency >= 0.8, 12);
  if (fresh.length >= 2) {
    sections.push({
      id: "fresh", title: "Fresh Releases You'll Love",
      subtitle: "New movies that match your taste",
      gradient: "from-[#3B82F6] to-[#06B6D4]",
      icon: "flame", movies: fresh, layout: "row",
    });
  }

  // 9. Critically Acclaimed — top voltv_score / tmdb rating regardless of genre
  const acclaimed = take(
    (m) => (m.voltv_score ?? 0) >= 7.5 || (m.tmdb_rating ?? 0) >= 7.8,
    12,
  );
  if (acclaimed.length >= 3) {
    sections.push({
      id: "acclaimed", title: "Critically Acclaimed",
      subtitle: "Top-rated movies you haven't seen yet",
      gradient: "from-[#F59E0B] to-[#FCD34D]",
      icon: "crown", movies: acclaimed, layout: "row",
    });
  }

  // 10. Deep Match — highest deep_match scores
  const deep = take((m) => m.signals.deep_match > 0.4, 10);
  if (deep.length >= 2) {
    sections.push({
      id: "deep-match", title: "Deep Taste Match",
      subtitle: "Movies that fit your personality profile perfectly",
      gradient: "from-[#6366F1] to-[#A855F7]",
      icon: "brain", movies: deep, layout: "grid",
    });
  }

  // 11. Spotlight — next best overall picks
  const spotlight = take(() => true, 4);
  if (spotlight.length) {
    sections.push({
      id: "spotlight", title: "Also Worth Your Time",
      subtitle: "Strong all-round picks across every signal",
      gradient: "from-[#0EA5E9] to-[#8B5CF6]",
      icon: "star", movies: spotlight, layout: "spotlight",
    });
  }

  // 12. Keep Exploring — remaining
  const remaining = take(() => true, 24);
  if (remaining.length >= 2) {
    sections.push({
      id: "explore", title: "Keep Exploring",
      subtitle: "More movies our algorithm thinks you'll enjoy",
      gradient: "from-[#505060] to-[#1E1E2E]",
      icon: "compass", movies: remaining, layout: "grid",
    });
  }

  return { sections, topGenres, similarUsersCount: similarCount, totalRated: ratedCount };
}
